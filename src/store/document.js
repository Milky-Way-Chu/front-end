import { defineStore } from 'pinia'
import {
  uploadDocument,
  fetchVersionList,
  fetchVersionContent,
  downloadVersionFile,
  fetchRevisionDiff,
} from '@/api/index.js'

export const useDocumentStore = defineStore('document', {
  state: () => ({
    // 当前操作的文档 ID
    documentId: null,

    // 版本列表
    versions: [],
    versionsLoading: false,

    // 当前选中的版本（用于"展示"）
    selectedVersionId: null,
    selectedVersionContent: null,
    contentLoading: false,

    // 比较的源版本（diff 功能）
    compareFromVersionId: null,
    compareToVersionId: null,
    diffResult: null,
    diffLoading: false,

    // 上传状态
    uploadProgress: 0,
    uploadLoading: false,
    uploadError: null,
  }),

  getters: {
    // 当前选中版本的版本号
    selectedVersionNumber: (state) => {
      const v = state.versions.find((v) => v.versionId === state.selectedVersionId)
      return v?.versionNumber ?? null
    },

    // 修订摘要
    diffSummary: (state) => state.diffResult?.summary ?? null,

    // 按类型分组的修订列表
    additionRevisions: (state) =>
      (state.diffResult?.revisions ?? []).filter((r) => r.type === 'addition'),
    deletionRevisions: (state) =>
      (state.diffResult?.revisions ?? []).filter((r) => r.type === 'deletion'),
    modificationRevisions: (state) =>
      (state.diffResult?.revisions ?? []).filter((r) => r.type === 'modification'),
  },

  actions: {
    /** 上传文件并初始化 documentId */
    async uploadFile(file, onProgress) {
      this.uploadLoading = true
      this.uploadProgress = 0
      this.uploadError = null
      try {
        const result = await uploadDocument(file, (p) => {
          this.uploadProgress = p
          onProgress?.(p)
        })
        this.documentId = result.documentId
        // 上传后立刻拉取版本列表
        await this.loadVersions()
        return result
      } catch (err) {
        this.uploadError = err.message
        throw err
      } finally {
        this.uploadLoading = false
      }
    },

    /** 加载版本列表 */
    async loadVersions(documentId) {
      const id = documentId ?? this.documentId
      if (!id) return
      this.versionsLoading = true
      try {
        const list = await fetchVersionList(id)
        this.versions = list
        this.documentId = id
      } finally {
        this.versionsLoading = false
      }
    },

    /** 根据版本号选择并加载文档内容 */
    async selectVersion(versionId) {
      this.selectedVersionId = versionId
      this.selectedVersionContent = null
      this.contentLoading = true
      try {
        const content = await fetchVersionContent(versionId)
        this.selectedVersionContent = content
      } finally {
        this.contentLoading = false
      }
    },

    /** 下载指定版本文件（返回可用于预览的 Blob URL） */
    async getVersionFileUrl(versionId) {
      const blob = await downloadVersionFile(versionId)
      return URL.createObjectURL(blob)
    },

    /** 加载两个版本的差异 */
    async loadDiff(fromVersionId, toVersionId) {
      this.compareFromVersionId = fromVersionId
      this.compareToVersionId = toVersionId
      this.diffResult = null
      this.diffLoading = true
      try {
        const diff = await fetchRevisionDiff(fromVersionId, toVersionId)
        this.diffResult = diff
      } finally {
        this.diffLoading = false
      }
    },

    /** 清空 diff 结果 */
    clearDiff() {
      this.diffResult = null
      this.compareFromVersionId = null
      this.compareToVersionId = null
    },
  },
})
