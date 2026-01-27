/**
 * 认证相关工具函数
 */

/**
 * 保存 Token
 */
export function setToken(token) {
  localStorage.setItem('access_token', token)
}

/**
 * 获取 Token
 */
export function getToken() {
  return localStorage.getItem('access_token')
}

/**
 * 移除 Token
 */
export function removeToken() {
  localStorage.removeItem('access_token')
}

/**
 * 保存用户信息
 */
export function setUserInfo(userInfo) {
  localStorage.setItem('user_info', JSON.stringify(userInfo))
}

/**
 * 获取用户信息
 */
export function getUserInfo() {
  const userInfo = localStorage.getItem('user_info')
  return userInfo ? JSON.parse(userInfo) : null
}

/**
 * 移除用户信息
 */
export function removeUserInfo() {
  localStorage.removeItem('user_info')
}

/**
 * 清除所有认证信息
 */
export function clearAuth() {
  removeToken()
  removeUserInfo()
}

/**
 * 检查是否已登录
 */
export function isLoggedIn() {
  return !!getToken()
}
