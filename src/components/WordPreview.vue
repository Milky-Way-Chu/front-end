<template>
  <div class="word-preview">
    <div v-if="loading" class="preview-loading">
      <el-skeleton :rows="10" animated />
    </div>

    <div v-else-if="error" class="preview-error">
      <el-result icon="error" :title="error">
        <template #extra>
          <el-button type="primary" @click="emit('retry')">重试</el-button>
        </template>
      </el-result>
    </div>

    <template v-else-if="mode === 'docx' && blobUrl">
      <!-- docx-preview 渲染模式（后端返回 .docx 文件） -->
      <div ref="previewContainer" class="docx-container" />
    </template>

    <template v-else-if="mode === 'text' && content">
      <!-- 结构化段落渲染模式（后端返回 JSON 段落） -->
      <div class="text-container">
        <div
          v-for="para in content.paragraphs"
          :key="para.index"
          class="paragraph"
          :class="getParagraphClass(para.style)"
        >
          {{ para.text }}
        </div>
      </div>
    </template>

    <div v-else class="preview-empty">
      <el-empty description="请选择一个版本以预览文档" />
    </div>
  </div>
</template>

<script setup>
import { ref, watch, onUnmounted, nextTick } from 'vue'
import { renderAsync } from 'docx-preview'

const props = defineProps({
  /**
   * 渲染模式：
   *   'docx'  - 传入 blobUrl，使用 docx-preview 渲染
   *   'text'  - 传入 content（结构化 JSON 段落），使用纯文本渲染
   */
  mode: {
    type: String,
    default: 'text',
    validator: (v) => ['docx', 'text'].includes(v),
  },
  /** docx 模式：Blob URL（由 URL.createObjectURL 生成） */
  blobUrl: {
    type: String,
    default: null,
  },
  /** text 模式：{ versionId, versionNumber, paragraphs: [{index, text, style}] } */
  content: {
    type: Object,
    default: null,
  },
  loading: {
    type: Boolean,
    default: false,
  },
  error: {
    type: String,
    default: null,
  },
})

const emit = defineEmits(['retry'])
const previewContainer = ref(null)
let currentBlobUrl = null

// 监听 blobUrl 变化，重新渲染 docx
watch(
  () => props.blobUrl,
  async (url) => {
    if (props.mode !== 'docx' || !url) return
    await nextTick()
    if (!previewContainer.value) return
    try {
      const response = await fetch(url)
      const arrayBuffer = await response.arrayBuffer()
      previewContainer.value.innerHTML = ''
      await renderAsync(arrayBuffer, previewContainer.value, undefined, {
        className: 'docx-body',
        inWrapper: true,
        ignoreWidth: false,
        ignoreHeight: false,
        ignoreFonts: false,
        breakPages: true,
        renderHeaders: true,
        renderFooters: true,
        renderFootnotes: true,
        useBase64URL: true,
      })
      currentBlobUrl = url
    } catch (e) {
      console.error('docx-preview 渲染失败', e)
    }
  },
)

onUnmounted(() => {
  if (currentBlobUrl) URL.revokeObjectURL(currentBlobUrl)
})

const HEADING_STYLES = ['Heading1', 'Heading2', 'Heading3', 'heading1', 'heading2', 'heading3']

function getParagraphClass(style) {
  if (!style) return 'para-normal'
  if (HEADING_STYLES.includes(style)) {
    const level = style.replace(/[^0-9]/g, '') || '1'
    return `para-heading para-heading-${level}`
  }
  if (style === 'ListParagraph') return 'para-list'
  return 'para-normal'
}
</script>

<style scoped>
.word-preview {
  min-height: 300px;
}

.preview-loading,
.preview-empty,
.preview-error {
  padding: 24px;
}

/* docx-preview 容器 */
.docx-container {
  background: #fff;
  border-radius: 4px;
  overflow: auto;
  max-height: 75vh;
  padding: 0;
}

.docx-container :deep(.docx-body) {
  font-family: '微软雅黑', 'Microsoft YaHei', sans-serif;
}

/* 纯文本渲染 */
.text-container {
  padding: 24px 32px;
  background: #fff;
  border-radius: 4px;
  max-height: 75vh;
  overflow-y: auto;
  line-height: 1.8;
}

.paragraph {
  margin: 0 0 8px;
}

.para-heading {
  font-weight: 700;
  color: var(--el-text-color-primary);
}

.para-heading-1 {
  font-size: 22px;
  margin: 16px 0 10px;
  border-bottom: 1px solid var(--el-border-color-lighter);
  padding-bottom: 6px;
}

.para-heading-2 {
  font-size: 18px;
  margin: 14px 0 8px;
}

.para-heading-3 {
  font-size: 16px;
  margin: 10px 0 6px;
}

.para-list {
  padding-left: 24px;
  list-style: disc;
}

.para-normal {
  font-size: 14px;
  color: var(--el-text-color-regular);
}
</style>
