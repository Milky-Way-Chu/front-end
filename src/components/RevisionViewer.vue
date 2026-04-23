<template>
  <div class="revision-viewer">
    <!-- 加载态 -->
    <div v-if="loading" class="rv-loading">
      <el-skeleton :rows="8" animated />
    </div>

    <!-- 无数据 -->
    <el-empty
      v-else-if="!diffResult"
      description="请选择两个版本进行对比"
      :image-size="80"
    />

    <template v-else>
      <!-- 摘要栏 -->
      <div class="rv-summary">
        <span class="version-badge from">v{{ diffResult.fromVersion }}</span>
        <el-icon class="arrow"><arrow-right /></el-icon>
        <span class="version-badge to">v{{ diffResult.toVersion }}</span>

        <div class="summary-stats">
          <span class="stat addition">
            <el-icon><plus /></el-icon>
            {{ diffResult.summary.additions }} 新增
          </span>
          <span class="stat deletion">
            <el-icon><minus /></el-icon>
            {{ diffResult.summary.deletions }} 删除
          </span>
          <span class="stat modification">
            <el-icon><edit /></el-icon>
            {{ diffResult.summary.modifications }} 修改
          </span>
        </div>

        <!-- 视图切换 -->
        <el-radio-group v-model="viewMode" class="view-toggle" size="small">
          <el-radio-button value="unified">合并视图</el-radio-button>
          <el-radio-button value="split">分屏视图</el-radio-button>
          <el-radio-button value="changes-only">仅显示修改</el-radio-button>
        </el-radio-group>
      </div>

      <!-- 过滤器 -->
      <div class="rv-filters">
        <el-checkbox v-model="showAdditions" label="新增" class="filter-addition" />
        <el-checkbox v-model="showDeletions" label="删除" class="filter-deletion" />
        <el-checkbox v-model="showModifications" label="修改" class="filter-modification" />
      </div>

      <!-- 合并视图 / 仅修改视图 -->
      <div v-if="viewMode !== 'split'" class="rv-unified">
        <div
          v-for="line in unifiedLines"
          :key="line.key"
          class="diff-line"
          :class="line.className"
        >
          <span class="line-gutter">{{ line.lineNum }}</span>
          <span class="line-marker">{{ line.marker }}</span>
          <span class="line-content" v-html="line.html" />
        </div>
      </div>

      <!-- 分屏视图 -->
      <div v-else class="rv-split">
        <div class="split-pane split-left">
          <div class="pane-header">
            <span>v{{ diffResult.fromVersion }}（旧版本）</span>
          </div>
          <div
            v-for="line in splitLeft"
            :key="line.key"
            class="diff-line"
            :class="line.className"
          >
            <span class="line-gutter">{{ line.lineNum }}</span>
            <span class="line-marker">{{ line.marker }}</span>
            <span class="line-content" v-html="line.html" />
          </div>
        </div>
        <div class="split-pane split-right">
          <div class="pane-header">
            <span>v{{ diffResult.toVersion }}（新版本）</span>
          </div>
          <div
            v-for="line in splitRight"
            :key="line.key"
            class="diff-line"
            :class="line.className"
          >
            <span class="line-gutter">{{ line.lineNum }}</span>
            <span class="line-marker">{{ line.marker }}</span>
            <span class="line-content" v-html="line.html" />
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { ArrowRight, Plus, Minus, Edit } from '@element-plus/icons-vue'
import { useDocumentStore } from '@/store/document.js'

const store = useDocumentStore()

const viewMode = ref('unified')
const showAdditions = ref(true)
const showDeletions = ref(true)
const showModifications = ref(true)

const diffResult = computed(() => store.diffResult)
const loading = computed(() => store.diffLoading)

/** 对修改内容做字符级 diff 高亮（简单版：整段高亮） */
function highlight(text, type) {
  if (!text) return ''
  // 转义 HTML 特殊字符
  const escaped = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
  return escaped
}

/** 过滤后的修订列表 */
const filteredRevisions = computed(() => {
  if (!diffResult.value) return []
  return diffResult.value.revisions.filter((r) => {
    if (r.type === 'addition') return showAdditions.value
    if (r.type === 'deletion') return showDeletions.value
    if (r.type === 'modification') return showModifications.value
    return true
  })
})

/** 合并视图行列表 */
const unifiedLines = computed(() => {
  if (!diffResult.value) return []
  const revisionMap = buildRevisionMap()
  const paragraphs = diffResult.value.paragraphs ?? []
  const lines = []
  let lineNum = 0

  // 如果后端没有返回 paragraphs，直接从 revisions 生成行
  if (!paragraphs.length) {
    return buildLinesFromRevisions()
  }

  for (let i = 0; i < paragraphs.length; i++) {
    const para = paragraphs[i]
    const rev = revisionMap[i]

    if (viewMode.value === 'changes-only' && !rev) continue

    if (!rev) {
      lineNum++
      lines.push({
        key: `ctx-${i}`,
        lineNum,
        marker: ' ',
        className: 'line-context',
        html: highlight(para.text),
      })
    } else if (rev.type === 'deletion' && showDeletions.value) {
      lineNum++
      lines.push({
        key: `del-${i}`,
        lineNum,
        marker: '-',
        className: 'line-deleted',
        html: highlight(rev.oldContent, 'deletion'),
      })
    } else if (rev.type === 'addition' && showAdditions.value) {
      lineNum++
      lines.push({
        key: `add-${i}`,
        lineNum,
        marker: '+',
        className: 'line-added',
        html: highlight(rev.newContent, 'addition'),
      })
    } else if (rev.type === 'modification') {
      if (showModifications.value) {
        if (showDeletions.value) {
          lineNum++
          lines.push({
            key: `mod-old-${i}`,
            lineNum,
            marker: '-',
            className: 'line-deleted',
            html: highlight(rev.oldContent, 'deletion'),
          })
        }
        if (showAdditions.value) {
          lineNum++
          lines.push({
            key: `mod-new-${i}`,
            lineNum,
            marker: '+',
            className: 'line-added',
            html: highlight(rev.newContent, 'addition'),
          })
        }
      }
    }
  }
  return lines
})

/** 分屏视图 - 左侧（旧版本） */
const splitLeft = computed(() => {
  if (!diffResult.value) return []
  const revisionMap = buildRevisionMap()
  const paragraphs = diffResult.value.paragraphs ?? []
  if (!paragraphs.length) return buildSplitFromRevisions('left')

  const lines = []
  let lineNum = 0
  for (let i = 0; i < paragraphs.length; i++) {
    const para = paragraphs[i]
    const rev = revisionMap[i]
    if (!rev) {
      lineNum++
      lines.push({ key: `l-ctx-${i}`, lineNum, marker: ' ', className: 'line-context', html: highlight(para.text) })
    } else if (rev.type === 'deletion' && showDeletions.value) {
      lineNum++
      lines.push({ key: `l-del-${i}`, lineNum, marker: '-', className: 'line-deleted', html: highlight(rev.oldContent) })
    } else if (rev.type === 'addition' && showAdditions.value) {
      lines.push({ key: `l-add-${i}`, lineNum: '', marker: '', className: 'line-empty', html: '' })
    } else if (rev.type === 'modification' && showModifications.value) {
      lineNum++
      lines.push({ key: `l-mod-${i}`, lineNum, marker: '-', className: 'line-deleted', html: highlight(rev.oldContent) })
    }
  }
  return lines
})

/** 分屏视图 - 右侧（新版本） */
const splitRight = computed(() => {
  if (!diffResult.value) return []
  const revisionMap = buildRevisionMap()
  const paragraphs = diffResult.value.paragraphs ?? []
  if (!paragraphs.length) return buildSplitFromRevisions('right')

  const lines = []
  let lineNum = 0
  for (let i = 0; i < paragraphs.length; i++) {
    const para = paragraphs[i]
    const rev = revisionMap[i]
    if (!rev) {
      lineNum++
      lines.push({ key: `r-ctx-${i}`, lineNum, marker: ' ', className: 'line-context', html: highlight(para.text) })
    } else if (rev.type === 'deletion' && showDeletions.value) {
      lines.push({ key: `r-del-${i}`, lineNum: '', marker: '', className: 'line-empty', html: '' })
    } else if (rev.type === 'addition' && showAdditions.value) {
      lineNum++
      lines.push({ key: `r-add-${i}`, lineNum, marker: '+', className: 'line-added', html: highlight(rev.newContent) })
    } else if (rev.type === 'modification' && showModifications.value) {
      lineNum++
      lines.push({ key: `r-mod-${i}`, lineNum, marker: '+', className: 'line-added', html: highlight(rev.newContent) })
    }
  }
  return lines
})

function buildRevisionMap() {
  const map = {}
  for (const rev of filteredRevisions.value) {
    map[rev.paragraphIndex] = rev
  }
  return map
}

/** 当后端只返回 revisions 不含 paragraphs 时，直接从 revisions 构建行 */
function buildLinesFromRevisions() {
  const lines = []
  let lineNum = 0
  const sorted = [...filteredRevisions.value].sort((a, b) => a.paragraphIndex - b.paragraphIndex)
  for (const rev of sorted) {
    if (rev.type === 'deletion' && showDeletions.value) {
      lineNum++
      lines.push({ key: `del-${rev.id}`, lineNum, marker: '-', className: 'line-deleted', html: highlight(rev.oldContent) })
    } else if (rev.type === 'addition' && showAdditions.value) {
      lineNum++
      lines.push({ key: `add-${rev.id}`, lineNum, marker: '+', className: 'line-added', html: highlight(rev.newContent) })
    } else if (rev.type === 'modification' && showModifications.value) {
      if (showDeletions.value) {
        lineNum++
        lines.push({ key: `mod-old-${rev.id}`, lineNum, marker: '-', className: 'line-deleted', html: highlight(rev.oldContent) })
      }
      if (showAdditions.value) {
        lineNum++
        lines.push({ key: `mod-new-${rev.id}`, lineNum, marker: '+', className: 'line-added', html: highlight(rev.newContent) })
      }
    }
  }
  return lines
}

function buildSplitFromRevisions(side) {
  const lines = []
  let lineNum = 0
  const sorted = [...filteredRevisions.value].sort((a, b) => a.paragraphIndex - b.paragraphIndex)
  for (const rev of sorted) {
    if (rev.type === 'deletion') {
      if (side === 'left' && showDeletions.value) {
        lineNum++
        lines.push({ key: `l-del-${rev.id}`, lineNum, marker: '-', className: 'line-deleted', html: highlight(rev.oldContent) })
      } else if (side === 'right') {
        lines.push({ key: `r-del-${rev.id}`, lineNum: '', marker: '', className: 'line-empty', html: '' })
      }
    } else if (rev.type === 'addition') {
      if (side === 'left') {
        lines.push({ key: `l-add-${rev.id}`, lineNum: '', marker: '', className: 'line-empty', html: '' })
      } else if (side === 'right' && showAdditions.value) {
        lineNum++
        lines.push({ key: `r-add-${rev.id}`, lineNum, marker: '+', className: 'line-added', html: highlight(rev.newContent) })
      }
    } else if (rev.type === 'modification' && showModifications.value) {
      if (side === 'left' && showDeletions.value) {
        lineNum++
        lines.push({ key: `l-mod-${rev.id}`, lineNum, marker: '-', className: 'line-deleted', html: highlight(rev.oldContent) })
      } else if (side === 'right' && showAdditions.value) {
        lineNum++
        lines.push({ key: `r-mod-${rev.id}`, lineNum, marker: '+', className: 'line-added', html: highlight(rev.newContent) })
      }
    }
  }
  return lines
}
</script>

<style scoped>
.revision-viewer {
  font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
  font-size: 13px;
  border: 1px solid var(--el-border-color);
  border-radius: 6px;
  overflow: hidden;
}

/* 摘要栏 */
.rv-summary {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 16px;
  background: var(--el-fill-color-light);
  border-bottom: 1px solid var(--el-border-color);
  flex-wrap: wrap;
}

.version-badge {
  padding: 2px 10px;
  border-radius: 12px;
  font-weight: 600;
  font-size: 13px;
}

.version-badge.from {
  background: var(--el-color-info-light-7);
  color: var(--el-color-info);
}

.version-badge.to {
  background: var(--el-color-primary-light-7);
  color: var(--el-color-primary);
}

.arrow {
  color: var(--el-text-color-secondary);
}

.summary-stats {
  display: flex;
  gap: 12px;
  margin-left: 8px;
}

.stat {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 13px;
}

.stat.addition {
  color: #22863a;
}

.stat.deletion {
  color: #cb2431;
}

.stat.modification {
  color: #b08800;
}

.view-toggle {
  margin-left: auto;
}

/* 过滤器 */
.rv-filters {
  display: flex;
  gap: 16px;
  padding: 8px 16px;
  background: var(--el-fill-color-extra-light);
  border-bottom: 1px solid var(--el-border-color-lighter);
}

.filter-addition :deep(.el-checkbox__label) { color: #22863a; }
.filter-deletion :deep(.el-checkbox__label) { color: #cb2431; }
.filter-modification :deep(.el-checkbox__label) { color: #b08800; }

/* 合并视图 */
.rv-unified {
  max-height: 60vh;
  overflow-y: auto;
  background: #fff;
}

/* 分屏视图 */
.rv-split {
  display: flex;
  max-height: 60vh;
  overflow: hidden;
}

.split-pane {
  flex: 1;
  overflow-y: auto;
  border-right: 1px solid var(--el-border-color);
}

.split-pane:last-child {
  border-right: none;
}

.pane-header {
  position: sticky;
  top: 0;
  z-index: 1;
  padding: 6px 16px;
  font-size: 12px;
  font-weight: 600;
  background: var(--el-fill-color-light);
  border-bottom: 1px solid var(--el-border-color-lighter);
  color: var(--el-text-color-secondary);
}

/* diff 行 */
.diff-line {
  display: flex;
  align-items: baseline;
  min-height: 22px;
  line-height: 22px;
}

.diff-line:hover {
  filter: brightness(0.97);
}

.line-gutter {
  min-width: 48px;
  padding: 0 8px;
  text-align: right;
  color: var(--el-text-color-placeholder);
  font-size: 11px;
  user-select: none;
  border-right: 1px solid var(--el-border-color-lighter);
}

.line-marker {
  min-width: 20px;
  text-align: center;
  font-weight: 700;
  user-select: none;
  padding: 0 4px;
}

.line-content {
  flex: 1;
  padding: 0 12px;
  white-space: pre-wrap;
  word-break: break-all;
}

/* 行类型样式 */
.line-added {
  background: #e6ffed;
}

.line-added .line-marker {
  color: #22863a;
}

.line-deleted {
  background: #ffeef0;
}

.line-deleted .line-marker {
  color: #cb2431;
}

.line-context {
  background: #fff;
}

.line-empty {
  background: #f8f8f8;
}

.rv-loading,
.rv-empty {
  padding: 24px;
}
</style>
