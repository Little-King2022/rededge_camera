/**
 * 相机配置相关 API
 */
import request from '@/utils/request'

/**
 * 获取相机配置列表
 */
export function getCameraList(params) {
  return request({
    url: '/cameras',
    method: 'get',
    params
  })
}

/**
 * 获取单个相机配置
 */
export function getCameraDetail(id) {
  return request({
    url: `/cameras/${id}`,
    method: 'get'
  })
}

/**
 * 创建相机配置
 */
export function createCamera(data) {
  return request({
    url: '/cameras',
    method: 'post',
    data
  })
}

/**
 * 更新相机配置
 */
export function updateCamera(id, data) {
  return request({
    url: `/cameras/${id}`,
    method: 'put',
    data
  })
}

/**
 * 删除相机配置
 */
export function deleteCamera(id) {
  return request({
    url: `/cameras/${id}`,
    method: 'delete'
  })
}

/**
 * 激活相机配置
 */
export function activateCamera(id) {
  return request({
    url: `/cameras/${id}/activate`,
    method: 'post'
  })
}
