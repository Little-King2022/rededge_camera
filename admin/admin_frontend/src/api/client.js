/**
 * 客户端管理相关 API
 */
import request from '@/utils/request'

/**
 * 获取客户端列表
 */
export function getClientList(params) {
  return request({
    url: '/clients',
    method: 'get',
    params
  })
}

/**
 * 获取客户端详情
 */
export function getClientDetail(id) {
  return request({
    url: `/clients/${id}`,
    method: 'get'
  })
}

/**
 * 获取客户端使用统计
 */
export function getClientStats(id, params) {
  return request({
    url: `/clients/${id}/stats`,
    method: 'get',
    params
  })
}

/**
 * 更新客户端信息
 */
export function updateClient(id, data) {
  return request({
    url: `/clients/${id}`,
    method: 'put',
    data
  })
}

/**
 * 分配相机配置
 */
export function assignCamera(id, data) {
  return request({
    url: `/clients/${id}/assign-camera`,
    method: 'post',
    data
  })
}

/**
 * 分配授权码
 */
export function assignLicense(id, data) {
  return request({
    url: `/clients/${id}/assign-license`,
    method: 'post',
    data
  })
}

/**
 * 吊销授权
 */
export function revokeLicense(id) {
  return request({
    url: `/clients/${id}/revoke-license`,
    method: 'post'
  })
}
