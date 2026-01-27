/**
 * 认证相关 API
 */
import request from '@/utils/request'
import { encryptLoginCredentials } from '@/utils/rsa'

/**
 * 登录
 */
export async function login(data) {
  // RSA 加密密码
  const encryptedData = await encryptLoginCredentials(data.username, data.password)

  return request({
    url: '/auth/login',
    method: 'post',
    data: encryptedData
  })
}

/**
 * 登出
 */
export function logout() {
  return request({
    url: '/auth/logout',
    method: 'post'
  })
}

/**
 * 获取当前用户信息
 */
export function getProfile() {
  return request({
    url: '/auth/profile',
    method: 'get'
  })
}

/**
 * 更新当前用户信息
 */
export function updateProfile(data) {
  return request({
    url: '/auth/profile',
    method: 'put',
    data
  })
}

/**
 * 刷新 Token
 */
export function refreshToken() {
  return request({
    url: '/auth/refresh',
    method: 'post'
  })
}
