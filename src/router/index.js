import { createRouter, createWebHistory } from 'vue-router'

const routes = [
  {
    path: '/',
    redirect: '/upload',
  },
  {
    path: '/upload',
    name: 'upload',
    component: () => import('@/views/UploadView.vue'),
    meta: { title: '上传文档' },
  },
  {
    path: '/version/:documentId',
    name: 'version',
    component: () => import('@/views/VersionView.vue'),
    props: true,
    meta: { title: '版本展示' },
  },
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
})

router.afterEach((to) => {
  document.title = to.meta.title ? `${to.meta.title} - Word 版本管理` : 'Word 版本管理'
})

export default router
