<template>
  <div class="version-view">
    <div class="version-view__sidebar">
      <el-card shadow="never" class="sidebar-card">
        <template #header>
          <div class="card-header">
            <el-icon><clock /></el-icon>
            <span>版本选择</span>
          </div>
        </template>

        <version-selector
          :document-id="documentId"
          @select="handleVersionSelect"
        />
      </el-card>

      <!-- Diff 对比区 -->
      <el-card shadow="never" class="sidebar-card diff-config">
        <template #header>
          <div class="card-header">
            <el-icon><files /></el-icon>
            <span>版本对比</span>
          </div>
        </template>

        <div class="diff-form">
          <div class="diff-form-item">
            <span class="diff-label">基准版本（旧）</span>
            <el-select
              v-model="diffFromId"
              placeholder="选择旧版本"
              filterable
              clearable
              size="small"
              :loading="store.versionsLoading"
            >
              <el-option
                v-for="v in store.versions"
                :key="v.versionId"
                :label="`v${v.versionNumber}`"
                :value="v.versionId"
              />
            </el-select>
          </div>

          <div class="diff-form-item">
            <span class="diff-label">目标版本（新）</span>
            <el-select
              v-model="diffToId"
              placeholder="选择新版本"
              filterable
              clearable
              size="small"
              :loading="store.versionsLoading"
            >
              <el-option
                v-for="v in store.versions"
                :key="v.versionId"
                :label="`v${v.versionNumber}`"
                :value="v.versionId"
              />
            </el-select>
          </div>

          <el-button
            type="primary"
            size="small"
            :loading="store.diffLoading"
            :disabled="!diffFromId || !diffToId"
            style="width: 100%"
            @click="handleDiffCompare"
          >
            开始对比
          </el-button>

          <el-button
            v-if="store.diffResult"
            size="small"
            style="width: 100%; margin-top: 4px"
            @click="store.clearDiff"
          >
            清除对比
          </el-button>
        </div>
      </el-card>
    </div>

    <div class="version-view__main">
      <!-- 修订 Diff 视图（优先展示） -->
      <template v-if="store.diffResult || store.diffLoading">
        <div class="main-section-title">
          <el-icon><files /></el-icon>
          版本修订对比
        </div>
        <revision-viewer />
      </template>

      <!-- 指定版本文档预览 -->
      <template v-else-if="store.selectedVersionId">
        <div class="main-section-title">
          <el-icon><document /></el-icon>
          文档预览
          <el-tag v-if="store.selectedVersionNumber" size="small" type="primary" style="margin-left: 8px">
            v{{ store.selectedVersionNumber }}
          </el-tag>

          <!-- 下载按钮 -->
          <el-button
            size="small"
            :icon="Download"
            style="margin-left: auto"
            @click="handleDownload"
          >
            下载此版本
          </el-button>
        </div>

        <!-- 渲染模式切换 -->
        <div class="preview-mode-switch">
          <el-radio-group v-model="previewMode" size="small">
            <el-radio-button value="text">段落模式</el-radio-button>
            <el-radio-button value="docx">Word 渲染</el-radio-button>
          </el-radio-group>
        </div>

        <word-preview
          :mode="previewMode"
          :content="previewMode === 'text' ? store.selectedVersionContent : null"
          :blob-url="previewMode === 'docx' ? docxBlobUrl : null"
          :loading="store.contentLoading || docxLoading"
          :error="previewError"
          @retry="retryPreview"
        />
      </template>

      <!-- 初始引导 -->
      <div v-else class="main-placeholder">
        <el-empty description="请在左侧选择一个版本查看文档，或选择两个版本进行对比" :image-size="120" />
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { Clock, Files, Document, Download } from '@element-plus/icons-vue'
import VersionSelector from '@/components/VersionSelector.vue'
import WordPreview from '@/components/WordPreview.vue'
import RevisionViewer from '@/components/RevisionViewer.vue'
import { useDocumentStore } from '@/store/document.js'

const props = defineProps({
  documentId: {
    type: [String, Number],
    required: true,
  },
})

const store = useDocumentStore()
const previewMode = ref('text')
const docxBlobUrl = ref(null)
const docxLoading = ref(false)
const previewError = ref(null)

const diffFromId = ref(null)
const diffToId = ref(null)

const BLOB_URL_CLEANUP_DELAY = 10000 // 10 seconds, enough for browser download to start

// Word 渲染模式切换时加载 blob
watch(previewMode, async (mode) => {
  if (mode === 'docx' && store.selectedVersionId) {
    await loadDocxBlob(store.selectedVersionId)
  }
})

async function handleVersionSelect(versionId) {
  previewError.value = null
  // 如果当前是 docx 渲染模式，同时加载 blob
  if (previewMode.value === 'docx') {
    await loadDocxBlob(versionId)
  }
}

async function loadDocxBlob(versionId) {
  docxLoading.value = true
  try {
    if (docxBlobUrl.value) {
      URL.revokeObjectURL(docxBlobUrl.value)
      docxBlobUrl.value = null
    }
    const url = await store.getVersionFileUrl(versionId)
    docxBlobUrl.value = url
  } catch (err) {
    previewError.value = err.message || '加载 Word 文件失败'
  } finally {
    docxLoading.value = false
  }
}

async function retryPreview() {
  previewError.value = null
  if (store.selectedVersionId) {
    if (previewMode.value === 'docx') {
      await loadDocxBlob(store.selectedVersionId)
    } else {
      await store.selectVersion(store.selectedVersionId)
    }
  }
}

async function handleDiffCompare() {
  if (!diffFromId.value || !diffToId.value) return
  if (diffFromId.value === diffToId.value) {
    ElMessage.warning('请选择不同的两个版本进行对比')
    return
  }
  try {
    await store.loadDiff(diffFromId.value, diffToId.value)
  } catch (err) {
    ElMessage.error(err.message || '加载版本差异失败')
  }
}

async function handleDownload() {
  if (!store.selectedVersionId) return
  try {
    const url = await store.getVersionFileUrl(store.selectedVersionId)
    const a = document.createElement('a')
    a.href = url
    a.download = `document_v${store.selectedVersionNumber}.docx`
    a.click()
    setTimeout(() => URL.revokeObjectURL(url), BLOB_URL_CLEANUP_DELAY)
  } catch (err) {
    ElMessage.error(err.message || '下载失败')
  }
}
</script>

<style scoped>
.version-view {
  display: flex;
  gap: 20px;
  padding: 20px 24px;
  min-height: calc(100vh - 60px);
  background: var(--el-fill-color-blank);
}

.version-view__sidebar {
  width: 300px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.sidebar-card :deep(.el-card__body) {
  padding: 16px;
}

.version-view__main {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.card-header {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 14px;
  font-weight: 600;
}

.main-section-title {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 15px;
  font-weight: 600;
  color: var(--el-text-color-primary);
  padding-bottom: 8px;
  border-bottom: 1px solid var(--el-border-color-lighter);
}

.preview-mode-switch {
  display: flex;
  justify-content: flex-end;
  margin-bottom: 4px;
}

.main-placeholder {
  display: flex;
  justify-content: center;
  align-items: center;
  flex: 1;
  border: 1px dashed var(--el-border-color);
  border-radius: 8px;
  background: var(--el-fill-color-extra-light);
  padding: 48px;
}

.diff-form {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.diff-form-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.diff-label {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}
</style>
