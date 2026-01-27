/**
 * 格式化工具函数
 */

/**
 * 格式化文件大小
 */
export function formatFileSize(bytes) {
  if (!bytes || bytes === 0) return '0 B'

  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))

  return (bytes / Math.pow(k, i)).toFixed(2) + ' ' + sizes[i]
}

/**
 * 格式化时长（秒转为可读格式）
 */
export function formatDuration(seconds) {
  if (!seconds || seconds === 0) return '0秒'

  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = seconds % 60

  const parts = []
  if (hours > 0) parts.push(`${hours}小时`)
  if (minutes > 0) parts.push(`${minutes}分钟`)
  if (secs > 0) parts.push(`${secs}秒`)

  return parts.join('')
}

/**
 * 格式化日期时间
 */
export function formatDateTime(dateString, format = 'YYYY-MM-DD HH:mm:ss') {
  if (!dateString) return '-'

  const date = new Date(dateString)

  if (format === 'YYYY-MM-DD HH:mm:ss') {
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    }).replace(/\//g, '-')
  }

  if (format === 'YYYY-MM-DD') {
    return date.toLocaleDateString('zh-CN').replace(/\//g, '-')
  }

  return dateString
}

/**
 * 格式化授权状态
 */
export function formatLicenseStatus(status) {
  const statusMap = {
    trial: '试用',
    unactivated: '未激活',
    activated: '已激活',
    expired: '已过期',
    revoked: '已吊销'
  }
  return statusMap[status] || status
}

/**
 * 格式化授权类型
 */
export function formatLicenseType(type) {
  const typeMap = {
    trial: '试用版',
    standard: '标准版',
    professional: '专业版',
    enterprise: '企业版'
  }
  return typeMap[type] || type
}

/**
 * 格式化平台
 */
export function formatPlatform(platform) {
  const platformMap = {
    win32: 'Windows',
    darwin: 'macOS',
    linux: 'Linux'
  }
  return platformMap[platform] || platform
}

/**
 * 格式化架构
 */
export function formatArch(arch) {
  const archMap = {
    x64: '64位',
    arm64: 'ARM64'
  }
  return archMap[arch] || arch
}

/**
 * 格式化用户角色
 */
export function formatRole(role) {
  const roleMap = {
    super_admin: '超级管理员',
    admin: '管理员',
    operator: '操作员'
  }
  return roleMap[role] || role
}
