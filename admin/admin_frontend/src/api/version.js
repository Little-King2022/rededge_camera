/**
 * 版本管理相关 API
 */
import request from '@/utils/request'

/**
 * 获取版本列表
 */
export function getVersionList(params) {
  return request({
    url: '/versions',
    method: 'get',
    params
  })
}

/**
 * 上传安装包
 */
export function uploadVersion(data, onProgress) {
  return request({
    url: '/versions/upload',
    method: 'post',
    data,
    onUploadProgress: onProgress
  })
}

/**
 * 获取版本详情
 */
export function getVersionDetail(id) {
  return request({
    url: `/versions/${id}`,
    method: 'get'
  })
}

/**
 * 更新版本信息
 */
export function updateVersion(id, data) {
  return request({
    url: `/versions/${id}`,
    method: 'put',
    data
  })
}

/**
 * 删除版本
 */
export function deleteVersion(id) {
  return request({
    url: `/versions/${id}`,
    method: 'delete'
  })
}

/**
 * 设为最新版本
 */
export function setLatestVersion(id) {
  return request({
    url: `/versions/${id}/set-latest`,
    method: 'post'
  })
}

/**
 * 获取下载链接
 */
export function getDownloadUrl(id) {
  return `/api/versions/${id}/download`
}
