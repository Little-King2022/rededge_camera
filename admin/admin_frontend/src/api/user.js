/**
 * 用户管理相关 API
 */
import request from '@/utils/request'

/**
 * 获取后台用户列表
 */
export function getUserList(params) {
  return request({
    url: '/users',
    method: 'get',
    params
  })
}

/**
 * 创建后台用户
 */
export function createUser(data) {
  return request({
    url: '/users',
    method: 'post',
    data
  })
}

/**
 * 更新用户
 */
export function updateUser(id, data) {
  return request({
    url: `/users/${id}`,
    method: 'put',
    data
  })
}

/**
 * 删除用户
 */
export function deleteUser(id) {
  return request({
    url: `/users/${id}`,
    method: 'delete'
  })
}

/**
 * 重置密码
 */
export function resetPassword(id, data) {
  return request({
    url: `/users/${id}/reset-password`,
    method: 'put',
    data
  })
}
