import axios from 'axios'

const http = axios.create({
  baseURL: '/api',
  timeout: 60000,
})

http.interceptors.response.use(
  (res) => res.data,
  (err) => {
    const msg = err.response?.data?.message || err.message || '请求失败'
    return Promise.reject(new Error(msg))
  },
)

/**
 * 上传 Word 文档（doc / docx）
 * @param {File} file
 * @param {Function} onProgress  (percent: number) => void
 * @returns {{ documentId, versionId, versionNumber }}
 */
export function uploadDocument(file, onProgress) {
  const form = new FormData()
  form.append('file', file)
  return http.post('/document/upload', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress: (e) => {
      if (e.total) onProgress?.(Math.round((e.loaded / e.total) * 100))
    },
  })
}

/**
 * 查询某文档的所有版本列表
 * @param {string|number} documentId
 * @returns {Array<{ versionId, versionNumber, createdAt, description }>}
 */
export function fetchVersionList(documentId) {
  return http.get('/document/versions', { params: { documentId } })
}

/**
 * 根据版本号获取文档内容（原始 docx 文件流或结构化段落）
 * 后端可按 Accept 头区分：
 *   Accept: application/json  → 返回段落结构
 *   Accept: application/octet-stream → 返回 .docx 文件
 * @param {string|number} versionId
 * @returns {{ versionId, versionNumber, paragraphs: Array<{index, text, style}> }}
 */
export function fetchVersionContent(versionId) {
  return http.get(`/document/version/${versionId}`)
}

/**
 * 下载指定版本的原始 Word 文件（Blob）
 * @param {string|number} versionId
 * @returns {Blob}
 */
export function downloadVersionFile(versionId) {
  return http.get(`/document/version/${versionId}/file`, {
    responseType: 'blob',
  })
}

/**
 * 获取两个版本间的修订差异
 * @param {string|number} fromVersionId
 * @param {string|number} toVersionId
 * @returns {{
 *   fromVersion: string,
 *   toVersion: string,
 *   revisions: Array<{
 *     id, type: 'addition'|'deletion'|'modification',
 *     paragraphIndex, oldContent, newContent
 *   }>,
 *   summary: { additions, deletions, modifications }
 * }}
 */
export function fetchRevisionDiff(fromVersionId, toVersionId) {
  return http.get('/document/diff', {
    params: { fromVersionId, toVersionId },
  })
}
