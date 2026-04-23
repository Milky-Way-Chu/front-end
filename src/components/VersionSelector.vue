<template>
  <div class="version-selector">
    <div class="selector-header">
      <span class="label">选择版本</span>
      <el-tooltip content="输入版本号直接跳转，或从下拉列表选择" placement="top">
        <el-icon class="tip-icon"><question-filled /></el-icon>
      </el-tooltip>
    </div>

    <div class="selector-row">
      <!-- 版本号直接输入 -->
      <el-input
        v-model="inputVersion"
        placeholder="输入版本号（如 1.0.0）"
        clearable
        class="version-input"
        @keyup.enter="handleInputConfirm"
      >
        <template #prepend>v</template>
      </el-input>
      <el-button type="primary" :loading="loading" @click="handleInputConfirm">
        查看
      </el-button>
    </div>

    <!-- 版本列表下拉 -->
    <div v-if="versions.length" class="version-list-row">
      <span class="list-label">已有版本：</span>
      <el-select
        v-model="selectedId"
        placeholder="从列表选择版本"
        filterable
        class="version-select"
        :loading="versionsLoading"
        @change="handleSelectChange"
      >
        <el-option
          v-for="v in sortedVersions"
          :key="v.versionId"
          :label="`v${v.versionNumber}${v.description ? '  —  ' + v.description : ''}`"
          :value="v.versionId"
        >
          <div class="option-content">
            <span class="option-version">v{{ v.versionNumber }}</span>
            <span v-if="v.description" class="option-desc">{{ v.description }}</span>
            <span class="option-date">{{ formatDate(v.createdAt) }}</span>
          </div>
        </el-option>
      </el-select>
    </div>

    <el-empty
      v-else-if="!versionsLoading && documentId"
      description="暂无历史版本"
      :image-size="60"
    />
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { QuestionFilled } from '@element-plus/icons-vue'
import { useDocumentStore } from '@/store/document.js'

const props = defineProps({
  documentId: {
    type: [String, Number],
    default: null,
  },
})

const emit = defineEmits(['select'])

const store = useDocumentStore()
const inputVersion = ref('')
const selectedId = ref(null)
const loading = ref(false)

const versions = computed(() => store.versions)
const versionsLoading = computed(() => store.versionsLoading)

// 版本列表按版本号降序排列（最新在前）
const sortedVersions = computed(() =>
  [...versions.value].sort((a, b) => {
    const pa = a.versionNumber.split('.').map(Number)
    const pb = b.versionNumber.split('.').map(Number)
    for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
      const diff = (pb[i] ?? 0) - (pa[i] ?? 0)
      if (diff !== 0) return diff
    }
    return 0
  }),
)

// documentId 变化时自动加载版本列表
watch(
  () => props.documentId,
  async (id) => {
    if (id) {
      await store.loadVersions(id)
    }
  },
  { immediate: true },
)

function formatDate(dateStr) {
  if (!dateStr) return ''
  return new Date(dateStr).toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
}

async function handleInputConfirm() {
  const vNum = inputVersion.value.trim()
  if (!vNum) {
    ElMessage.warning('请输入版本号')
    return
  }
  // 从已有版本列表中匹配
  const matched = versions.value.find((v) => v.versionNumber === vNum)
  if (matched) {
    selectedId.value = matched.versionId
    await doSelect(matched.versionId)
  } else {
    ElMessage.error(`未找到版本 v${vNum}，请从列表中选择`)
  }
}

async function handleSelectChange(versionId) {
  await doSelect(versionId)
}

async function doSelect(versionId) {
  loading.value = true
  try {
    await store.selectVersion(versionId)
    emit('select', versionId)
  } catch (err) {
    ElMessage.error(err.message || '加载版本内容失败')
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.version-selector {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.selector-header {
  display: flex;
  align-items: center;
  gap: 6px;
  font-weight: 600;
  font-size: 14px;
  color: var(--el-text-color-primary);
}

.tip-icon {
  color: var(--el-text-color-secondary);
  cursor: pointer;
  font-size: 16px;
}

.selector-row {
  display: flex;
  gap: 8px;
}

.version-input {
  flex: 1;
}

.version-list-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.list-label {
  font-size: 13px;
  color: var(--el-text-color-secondary);
  white-space: nowrap;
}

.version-select {
  flex: 1;
}

.option-content {
  display: flex;
  align-items: center;
  gap: 8px;
}

.option-version {
  font-weight: 600;
  min-width: 64px;
}

.option-desc {
  flex: 1;
  color: var(--el-text-color-secondary);
  font-size: 12px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.option-date {
  font-size: 12px;
  color: var(--el-text-color-placeholder);
  margin-left: auto;
}
</style>
