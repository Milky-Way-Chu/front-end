<template>
  <el-container class="app-container">
    <!-- 顶部导航 -->
    <el-header class="app-header" height="60px">
      <div class="header-logo" @click="router.push('/')">
        <el-icon size="22"><document /></el-icon>
        <span class="logo-text">Word 版本管理</span>
      </div>

      <el-menu
        :default-active="activeMenu"
        mode="horizontal"
        class="header-nav"
        :ellipsis="false"
        router
      >
        <el-menu-item index="/upload">
          <el-icon><upload-filled /></el-icon>
          上传文档
        </el-menu-item>
        <el-menu-item
          v-if="store.documentId"
          :index="`/version/${store.documentId}`"
        >
          <el-icon><document-copy /></el-icon>
          版本展示
        </el-menu-item>
      </el-menu>
    </el-header>

    <el-main class="app-main">
      <router-view />
    </el-main>
  </el-container>
</template>

<script setup>
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Document, UploadFilled, DocumentCopy } from '@element-plus/icons-vue'
import { useDocumentStore } from '@/store/document.js'

const route = useRoute()
const router = useRouter()
const store = useDocumentStore()

const activeMenu = computed(() => route.path)
</script>

<style scoped>
.app-container {
  min-height: 100vh;
  background: var(--el-fill-color-blank);
}

.app-header {
  display: flex;
  align-items: center;
  background: #fff;
  border-bottom: 1px solid var(--el-border-color-lighter);
  padding: 0 24px;
  gap: 24px;
  position: sticky;
  top: 0;
  z-index: 100;
}

.header-logo {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  user-select: none;
  color: var(--el-color-primary);
  flex-shrink: 0;
}

.logo-text {
  font-size: 17px;
  font-weight: 700;
  color: var(--el-text-color-primary);
  white-space: nowrap;
}

.header-nav {
  flex: 1;
  border-bottom: none !important;
}

.app-main {
  padding: 0;
}
</style>
