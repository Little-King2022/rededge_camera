/**
 * 后台管理服务客户端
 * 负责与 RedEdge 后台管理系统通信
 */
import axios from 'axios'
import os from 'os'
import { networkInterfaces } from 'os'
import crypto from 'crypto'
import { createRequire } from 'module'
import { getProxyAgents } from './proxy-agent.js'

const require = createRequire(import.meta.url)
const APP_VERSION_FALLBACK = '0.0.0'

function getAppVersion() {
  try {
    return require('../../package.json').version || APP_VERSION_FALLBACK
  } catch (error) {
    console.warn('[AdminClient] Unable to read app version:', error.message)
    return APP_VERSION_FALLBACK
  }
}

class AdminClientService {
  constructor(database) {
    this.database = database
    this.httpClient = null
    this.heartbeatTimer = null
    this.appStartTime = new Date()
    this.publicKey = null
  }

  /**
   * 初始化服务
   */
  async initialize() {
    console.log('[AdminClient] Initializing admin client service...')

    const settings = this.database.getAllSettings()

    if (!settings.admin_server_enabled || settings.admin_server_enabled === 'false') {
      console.log('[AdminClient] Admin server connection disabled')
      return
    }

    // 创建 HTTP 客户端
    this.createHttpClient(settings)

    // 如果未注册，先注册客户端
    if (settings.client_registered !== 'true') {
      await this.registerClient()
    }

    // 启动心跳（仅在线模式）
    const license = this.database.getLicenseState()
    if (!license.offline_mode) {
      this.startHeartbeat()
    }

    console.log('[AdminClient] Admin client service initialized')
  }

  /**
   * 获取管理服务器设置
   */
  getSettings() {
    return this.database.getAdminSettings()
  }

  /**
   * 更新管理服务器设置
   */
  updateSettings(settings) {
    this.database.updateAdminSettings(settings)

    // 如果启用状态或 URL 改变，重新初始化
    if (settings.admin_server_enabled !== undefined || settings.admin_server_url) {
      this.stopHeartbeat()
      this.initialize()
    }
  }

  ensureHttpClient() {
    if (this.httpClient) {
      return true
    }

    const settings = this.database?.getAllSettings?.() || this.database?.getAdminSettings?.()
    this.createHttpClient(settings)
    return true
  }

  createHttpClient(settings = {}) {
    const baseURL = settings.admin_server_url || 'http://localhost:5000/api'
    const proxyAgents = getProxyAgents(settings)
    const config = {
      baseURL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json'
      }
    }

    if (proxyAgents) {
      config.httpAgent = proxyAgents.httpAgent
      config.httpsAgent = proxyAgents.httpsAgent
      config.proxy = false
    }

    this.httpClient = axios.create(config)
  }

  /**
   * 收集系统扩展信息
   */
  collectSystemInfo() {
    return {
      hostname: os.hostname(),
      platform: os.platform(),
      arch: os.arch(),
      cpu_model: os.cpus()[0]?.model || 'Unknown',
      total_memory: os.totalmem(),
      ip_address: this.getLocalIP(),
      mac_address: this.getMACAddress()
    }
  }

  /**
   * 获取本地 IP 地址
   */
  getLocalIP() {
    const nets = networkInterfaces()

    for (const name of Object.keys(nets)) {
      for (const net of nets[name]) {
        // 跳过内部地址和非 IPv4 地址
        if (net.family === 'IPv4' && !net.internal) {
          return net.address
        }
      }
    }

    return '127.0.0.1'
  }

  /**
   * 获取 MAC 地址
   */
  getMACAddress() {
    const nets = networkInterfaces()

    for (const name of Object.keys(nets)) {
      for (const net of nets[name]) {
        if (net.family === 'IPv4' && !net.internal) {
          return net.mac
        }
      }
    }

    return '00:00:00:00:00:00'
  }

  /**
   * 收集使用统计数据
   */
  collectUsageStats() {
    const now = new Date()
    const today = now.toISOString().split('T')[0]
    const uptime = Math.floor((now - this.appStartTime) / 1000) // 秒

    return {
      stat_date: today,
      app_start_count: 1,
      total_usage_seconds: uptime,
      last_start_at: this.appStartTime.toISOString()
    }
  }

  /**
   * 注册客户端
   */
  async registerClient() {
    if (!this.httpClient) return

    try {
      console.log('[AdminClient] Registering client...')

      const license = this.database.getLicenseState()
      const systemInfo = this.collectSystemInfo()
      const appVersion = getAppVersion()

      const response = await this.httpClient.post('/clients/register', {
        device_fingerprint: license.device_fingerprint,
        ...systemInfo,
        app_version: appVersion
      })

      if (response.data.success) {
        console.log('[AdminClient] Client registered successfully')

        // 标记为已注册
        this.database.updateAdminSettings({
          client_registered: 'true'
        })

        return { success: true }
      } else {
        console.error('[AdminClient] Client registration failed:', response.data.error)
        return { success: false, error: response.data.error }
      }
    } catch (error) {
      console.error('[AdminClient] Client registration error:', error.message)
      return { success: false, error: error.message }
    }
  }

  /**
   * 启动心跳定时器
   */
  startHeartbeat() {
    const settings = this.getSettings()
    const interval = parseInt(settings.admin_heartbeat_interval) || 300000 // 默认 5 分钟

    console.log(`[AdminClient] Starting heartbeat with interval ${interval}ms`)

    // 立即发送一次心跳
    this.reportHeartbeat()

    // 启动定时器
    this.heartbeatTimer = setInterval(() => {
      this.reportHeartbeat()
    }, interval)
  }

  /**
   * 停止心跳定时器
   */
  stopHeartbeat() {
    if (this.heartbeatTimer) {
      console.log('[AdminClient] Stopping heartbeat')
      clearInterval(this.heartbeatTimer)
      this.heartbeatTimer = null
    }
  }

  /**
   * 上报心跳
   */
  async reportHeartbeat() {
    if (!this.httpClient) return

    try {
      const license = this.database.getLicenseState()

      // 离线模式不上报心跳
      if (license.offline_mode) {
        console.log('[AdminClient] Offline mode, skipping heartbeat')
        return
      }

      const systemInfo = this.collectSystemInfo()
      const usageStats = this.collectUsageStats()

      const response = await this.httpClient.post('/clients/heartbeat', {
        device_fingerprint: license.device_fingerprint,
        ...systemInfo,
        usage_stats: usageStats
      })

      if (response.data.success) {
        console.log('[AdminClient] Heartbeat sent successfully')

        // 更新最后心跳时间
        this.database.updateAdminSettings({
          last_heartbeat_at: new Date().toISOString()
        })

        return { success: true }
      } else {
        console.error('[AdminClient] Heartbeat failed:', response.data.error)
        return { success: false, error: response.data.error }
      }
    } catch (error) {
      console.error('[AdminClient] Heartbeat error:', error.message)
      return { success: false, error: error.message }
    }
  }

  /**
   * 获取 RSA 公钥
   */
  async getPublicKey() {
    if (this.publicKey) {
      return this.publicKey
    }

    if (!this.httpClient) {
      throw new Error('Admin client not initialized')
    }

    try {
      const response = await this.httpClient.get('/auth/public-key')

      if (response.data.success) {
        this.publicKey = response.data.data.public_key
        return this.publicKey
      } else {
        throw new Error(response.data.error || '获取公钥失败')
      }
    } catch (error) {
      console.error('[AdminClient] Get public key error:', error.message)
      throw error
    }
  }

  /**
   * RSA 加密
   */
  async rsaEncrypt(plainText) {
    const publicKey = await this.getPublicKey()

    // 使用 Node.js crypto 模块进行 RSA 加密
    const buffer = Buffer.from(plainText, 'utf8')
    const encrypted = crypto.publicEncrypt(
      {
        key: publicKey,
        padding: crypto.constants.RSA_PKCS1_PADDING
      },
      buffer
    )

    return encrypted.toString('base64')
  }

  /**
   * 激活授权码
   */
  async activateLicense(activationCode, options = {}) {
    if (!this.httpClient) {
      return { success: false, error: 'Admin client not initialized' }
    }

    try {
      console.log('[AdminClient] Activating license...')

      const license = this.database.getLicenseState()

      // RSA 加密激活码
      const encryptedCode = await this.rsaEncrypt(activationCode)

      const response = await this.httpClient.post('/licenses/activate', {
        device_fingerprint: license.device_fingerprint,
        activation_code: encryptedCode
      })

      if (response.data.success) {
        console.log('[AdminClient] License activated successfully')

        const data = response.data.data

        // 更新本地授权状态
        this.database.updateLicenseState({
          status: 'activated',
          activation_code: activationCode,
          license_type: data.license_type,
          offline_mode: data.offline_mode,
          expiry_at: data.expires_at,
          last_check_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })

        // 如果是离线模式，停止心跳
        if (data.offline_mode) {
          this.stopHeartbeat()
        } else {
          // 在线模式，启动心跳
          this.startHeartbeat()
        }

        return { success: true, data }
      } else {
        console.error('[AdminClient] License activation failed:', response.data.error)
        return { success: false, error: response.data.error }
      }
    } catch (error) {
      const allowRegisterRetry = options.allowRegisterRetry !== false
      const status = error?.response?.status
      const serverError = error?.response?.data?.error
      if (allowRegisterRetry && status === 404 && serverError === '客户端未注册') {
        const registerResult = await this.registerClient()
        if (registerResult?.success) {
          return await this.activateLicense(activationCode, { allowRegisterRetry: false })
        }
      }
      console.error('[AdminClient] License activation error:', error.message)
      return { success: false, error: error.message }
    }
  }

  /**
   * 验证授权
   */
  async validateLicense() {
    const license = this.database.getLicenseState()

    // 检查是否过期
    if (license.expiry_at && new Date() > new Date(license.expiry_at)) {
      return { valid: false, reason: 'expired' }
    }

    // 离线模式：仅本地验证
    if (license.offline_mode) {
      console.log('[AdminClient] Offline mode, local validation only')
      return { valid: true, mode: 'offline' }
    }

    // 在线模式：必须进行服务器验证
    this.ensureHttpClient()
    return await this.validateWithServer()
  }

  /**
   * 向服务器验证授权
   */
  async validateWithServer() {
    if (!this.httpClient) {
      console.warn('[AdminClient] Admin client not initialized, skipping server validation')
      return { valid: false, reason: 'Admin client not initialized' }
    }

    try {
      const license = this.database.getLicenseState()

      const response = await this.httpClient.post('/licenses/validate', {
        device_fingerprint: license.device_fingerprint
      })

      if (response.data.success) {
        const data = response.data.data

        // 更新本地授权状态
        this.database.updateLicenseState({
          status: data.license_status,
          last_check_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })

        const valid = data.license_status === 'activated'

        return {
          valid,
          mode: 'online',
          status: data.license_status,
          expires_at: data.expires_at
        }
      } else {
        const reason = response.data.reason || response.data.message || response.data.error || 'Server validation failed'
        const status = response.data.reason || 'invalid'
        console.error('[AdminClient] Server validation failed:', reason)
        this.database.updateLicenseState({
          status,
          updated_at: new Date().toISOString()
        })
        return { valid: false, reason, status, mode: 'online' }
      }
    } catch (error) {
      console.error('[AdminClient] Server validation error:', error.message)
      const serverStatus = error?.response?.data?.data?.license_status
        || error?.response?.data?.license_status
      const status = serverStatus || 'invalid'
      this.database.updateLicenseState({
        status,
        updated_at: new Date().toISOString()
      })
      return {
        valid: false,
        mode: 'online',
        reason: error?.response?.data?.error || error.message || 'Server validation failed'
      }
    }
  }

  /**
   * 检查软件更新
   */
  async checkForUpdates() {
    if (!this.ensureHttpClient()) {
      return { success: false, error: 'Admin client not initialized' }
    }

    try {
      console.log('[AdminClient] Checking for updates...')

      const systemInfo = this.collectSystemInfo()
      const appVersion = getAppVersion()

      const response = await this.httpClient.post('/versions/check-update', {
        platform: systemInfo.platform,
        arch: systemInfo.arch,
        current_version: appVersion
      })

      if (response.data.success) {
        const payload = response.data?.data || response.data || {}
        const latest = payload.latest_version || payload.latestVersion || null
        const hasUpdate = Boolean(payload.has_update ?? payload.hasUpdate)
        return {
          success: true,
          has_update: hasUpdate,
          latest_version: latest,
          download_url: payload.download_url || latest?.download_url,
          is_mandatory: payload.is_mandatory ?? latest?.is_mandatory ?? false,
          release_notes: payload.release_notes || latest?.release_notes || ''
        }
      } else {
        return { success: false, error: response.data.error }
      }
    } catch (error) {
      console.error('[AdminClient] Check updates error:', error.message)
      return { success: false, error: error.message }
    }
  }

  /**
   * 下载更新安装包
   */
  async downloadUpdate(versionId, savePath) {
    if (!this.httpClient) {
      return { success: false, error: 'Admin client not initialized' }
    }

    try {
      console.log(`[AdminClient] Downloading update ${versionId} to ${savePath}`)

      const response = await this.httpClient.get(`/versions/${versionId}/download`, {
        responseType: 'stream'
      })

      const fs = require('fs')
      const path = require('path')

      // 确保目录存在
      const dir = path.dirname(savePath)
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true })
      }

      const writer = fs.createWriteStream(savePath)

      response.data.pipe(writer)

      return new Promise((resolve, reject) => {
        writer.on('finish', () => {
          console.log('[AdminClient] Update downloaded successfully')
          resolve({ success: true, path: savePath })
        })
        writer.on('error', (error) => {
          console.error('[AdminClient] Download error:', error.message)
          reject({ success: false, error: error.message })
        })
      })
    } catch (error) {
      console.error('[AdminClient] Download update error:', error.message)
      return { success: false, error: error.message }
    }
  }

  /**
   * 同步相机配置
   */
  async syncCameraConfigs() {
    if (!this.httpClient) {
      return { success: false, error: 'Admin client not initialized' }
    }

    try {
      console.log('[AdminClient] Syncing camera configs...')

      const license = this.database.getLicenseState()

      // 获取客户端详情（包含分配的相机配置）
      const response = await this.httpClient.get(`/clients/${license.device_fingerprint}`)

      if (response.data.success) {
        const client = response.data.data

        if (client.camera_config) {
          // 检查本地是否已有此配置
          const existingProfile = this.database.getAllProfiles()
            .find(p => p.name === client.camera_config.name)

          if (!existingProfile) {
            // 创建新配置
            this.database.createProfile({
              name: client.camera_config.name,
              protocol: client.camera_config.protocol,
              host: client.camera_config.host,
              port: client.camera_config.port,
              path_prefix: client.camera_config.path_prefix || ''
            })

            console.log('[AdminClient] Camera config synced successfully')
          }

          return { success: true, config: client.camera_config }
        } else {
          return { success: true, config: null }
        }
      } else {
        return { success: false, error: response.data.error }
      }
    } catch (error) {
      console.error('[AdminClient] Sync camera configs error:', error.message)
      return { success: false, error: error.message }
    }
  }

  /**
   * 清理资源
   */
  cleanup() {
    console.log('[AdminClient] Cleaning up admin client service...')
    this.stopHeartbeat()
  }
}

// 导出单例
let adminClientInstance = null

export function createAdminClient(database) {
  if (!adminClientInstance) {
    adminClientInstance = new AdminClientService(database)
  }
  return adminClientInstance
}

export function getAdminClient() {
  return adminClientInstance
}
