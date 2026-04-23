<template>
  <div class="upload-view">
    <el-card class="upload-card" shadow="hover">
      <template #header>
        <div class="card-header">
          <el-icon><document /></el-icon>
          <span>上传 Word 文档</span>
        </div>
      </template>

      <p class="upload-desc">
        上传 <strong>.doc</strong> 或 <strong>.docx</strong> 文件，系统将自动保存版本记录。
        上传完成后可在版本展示页查看任意版本的文档内容及修订对比。
      </p>

      <word-uploader @uploaded="handleUploaded" />
    </el-card>
  </div>
</template>

<script setup>
import { useRouter } from 'vue-router'
import { Document } from '@element-plus/icons-vue'
import WordUploader from '@/components/WordUploader.vue'

const router = useRouter()

function handleUploaded(result) {
  router.push({ name: 'version', params: { documentId: result.documentId } })
}
</script>

<style scoped>
.upload-view {
  display: flex;
  justify-content: center;
  align-items: flex-start;
  padding: 48px 24px;
  min-height: calc(100vh - 60px);
  background: var(--el-fill-color-blank);
}

.upload-card {
  width: 100%;
  max-width: 600px;
}

.card-header {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 16px;
  font-weight: 600;
}

.upload-desc {
  font-size: 13px;
  color: var(--el-text-color-secondary);
  margin: 0 0 20px;
  line-height: 1.7;
}
</style>
