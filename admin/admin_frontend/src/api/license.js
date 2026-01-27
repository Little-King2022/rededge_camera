/**
 * 授权管理相关 API
 */
import request from '@/utils/request'

/**
 * 获取授权码列表
 */
export function getLicenseList(params) {
  return request({
    url: '/licenses',
    method: 'get',
    params
  })
}

/**
 * 批量生成授权码
 */
export function generateLicenses(data) {
  return request({
    url: '/licenses/generate',
    method: 'post',
    data
  })
}

/**
 * 查询授权码详情
 */
export function getLicenseDetail(code) {
  return request({
    url: `/licenses/${code}`,
    method: 'get'
  })
}

/**
 * 更新授权码
 */
export function updateLicense(id, data) {
  return request({
    url: `/licenses/${id}`,
    method: 'put',
    data
  })
}

/**
 * 删除授权码
 */
export function deleteLicense(id) {
  return request({
    url: `/licenses/${id}`,
    method: 'delete'
  })
}

/**
 * 吊销授权码
 */
export function revokeLicense(id) {
  return request({
    url: `/licenses/${id}/revoke`,
    method: 'post'
  })
}

/**
 * 导出授权码
 */
export function exportLicenses(params) {
  return request({
    url: '/licenses/export',
    method: 'get',
    params,
    responseType: 'blob'
  })
}
