<template>
  <div class="word-uploader">
    <el-upload
      class="upload-area"
      drag
      :auto-upload="false"
      :limit="1"
      :on-change="handleFileChange"
      :on-exceed="handleExceed"
      :before-remove="handleBeforeRemove"
      accept=".doc,.docx"
      :file-list="fileList"
    >
      <el-icon class="upload-icon"><upload-filled /></el-icon>
      <div class="upload-text">
        <p class="primary-text">将文件拖到此处，或<em>点击上传</em></p>
        <p class="hint-text">支持 .doc / .docx 格式</p>
      </div>
    </el-upload>

    <el-progress
      v-if="store.uploadLoading"
      :percentage="store.uploadProgress"
      :status="store.uploadProgress === 100 ? 'success' : undefined"
      class="upload-progress"
    />

    <el-alert
      v-if="store.uploadError"
      :title="store.uploadError"
      type="error"
      show-icon
      class="upload-error"
    />

    <el-button
      type="primary"
      :loading="store.uploadLoading"
      :disabled="!selectedFile"
      class="upload-btn"
      size="large"
      @click="handleUpload"
    >
      {{ store.uploadLoading ? '上传中...' : '开始上传' }}
    </el-button>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { ElMessage } from 'element-plus'
import { UploadFilled } from '@element-plus/icons-vue'
import { useDocumentStore } from '@/store/document.js'

const emit = defineEmits(['uploaded'])
const store = useDocumentStore()

const fileList = ref([])
const selectedFile = ref(null)

const ALLOWED_TYPES = [
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]
const ALLOWED_EXT = /\.(doc|docx)$/i
const MAX_FILE_SIZE = 50 * 1024 * 1024 // 50 MB

function validateFile(file) {
  const validType = ALLOWED_TYPES.includes(file.type) || ALLOWED_EXT.test(file.name)
  if (!validType) {
    ElMessage.error('只支持 .doc / .docx 格式文件')
    return false
  }
  if (file.size > MAX_FILE_SIZE) {
    ElMessage.error('文件大小不能超过 50 MB')
    return false
  }
  return true
}

function handleFileChange(uploadFile) {
  if (!validateFile(uploadFile.raw)) {
    fileList.value = []
    selectedFile.value = null
    return
  }
  selectedFile.value = uploadFile.raw
}

function handleExceed() {
  ElMessage.warning('每次只能上传一个文件，请先删除已选文件')
}

function handleBeforeRemove() {
  selectedFile.value = null
  return true
}

async function handleUpload() {
  if (!selectedFile.value) return
  try {
    const result = await store.uploadFile(selectedFile.value)
    ElMessage.success(`上传成功，版本号：${result.versionNumber}`)
    fileList.value = []
    selectedFile.value = null
    emit('uploaded', result)
  } catch {
    // error already set in store
  }
}
</script>

<style scoped>
.word-uploader {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.upload-area {
  width: 100%;
}

.upload-area :deep(.el-upload-dragger) {
  padding: 40px 20px;
  border-radius: 8px;
}

.upload-icon {
  font-size: 60px;
  color: var(--el-color-primary);
  margin-bottom: 12px;
}

.upload-text .primary-text {
  font-size: 16px;
  color: var(--el-text-color-primary);
  margin: 0 0 6px;
}

.upload-text .primary-text em {
  color: var(--el-color-primary);
  font-style: normal;
}

.upload-text .hint-text {
  font-size: 12px;
  color: var(--el-text-color-secondary);
  margin: 0;
}

.upload-progress {
  margin-top: 4px;
}

.upload-btn {
  width: 100%;
}
</style>
