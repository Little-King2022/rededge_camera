/**
 * 系统设置相关 API
 */
import request from '@/utils/request'

/**
 * 获取所有系统设置
 */
export function getSystemSettings() {
  return request({
    url: '/system/settings',
    method: 'get'
  })
}

/**
 * 批量更新设置
 */
export function updateSystemSettings(data) {
  return request({
    url: '/system/settings',
    method: 'put',
    data
  })
}

/**
 * 获取系统统计数据
 */
export function getSystemStats() {
  return request({
    url: '/system/stats',
    method: 'get'
  })
}

/**
 * 获取审计日志
 */
export function getAuditLogs(params) {
  return request({
    url: '/system/logs',
    method: 'get',
    params
  })
}

/**
 * 获取全局使用统计
 */
export function getUsageStats(params) {
  return request({
    url: '/system/usage-stats',
    method: 'get',
    params
  })
}

/**
 * 获取仪表盘数据
 */
export function getDashboardData() {
  return request({
    url: '/system/dashboard',
    method: 'get'
  })
}
