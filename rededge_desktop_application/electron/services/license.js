import crypto from 'crypto'
import os from 'os'
import https from 'https'
import http from 'http'
import database from './database.js'

// License server configuration (placeholder URLs)
const LICENSE_CONFIG = {
  SERVER_BASE_URL: process.env.LICENSE_SERVER_BASE_URL || '<LICENSE_SERVER_BASE_URL>',
  ACTIVATE_PATH: process.env.LICENSE_API_ACTIVATE_PATH || '<LICENSE_API_ACTIVATE_PATH>',
  VALIDATE_PATH: process.env.LICENSE_API_VALIDATE_PATH || '<LICENSE_API_VALIDATE_PATH>',
  TRIAL_DAYS: 7,
  OFFLINE_GRACE_DAYS: 3,
  APP_SALT: 'rededge-desktop-2024'
}

class LicenseService {
  constructor() {
    this.initialized = false
  }

  /**
   * Initialize license service
   * - Generate device fingerprint
   * - Check trial/activation status
   */
  async initialize() {
    console.log('[LicenseService] Initializing...')

    // Get or create license state
    let licenseState = database.getLicenseState()

    // Generate device fingerprint if not exists
    if (!licenseState.device_fingerprint) {
      const fingerprint = this.generateDeviceFingerprint()
      database.updateLicenseState({
        device_fingerprint: fingerprint
      })
      licenseState = database.getLicenseState()
      console.log('[LicenseService] Device fingerprint generated:', fingerprint)
    }

    // Set trial expiry if in trial mode and no expiry set
    if (licenseState.status === 'trial' && !licenseState.expiry_at) {
      const expiryDate = new Date()
      expiryDate.setDate(expiryDate.getDate() + LICENSE_CONFIG.TRIAL_DAYS)
      database.updateLicenseState({
        expiry_at: expiryDate.toISOString()
      })
      console.log('[LicenseService] Trial period set:', LICENSE_CONFIG.TRIAL_DAYS, 'days')
    }

    this.initialized = true

    // Check if license is valid
    const validation = await this.validateLocal()
    console.log('[LicenseService] License status:', validation)

    return validation
  }

  /**
   * Generate device fingerprint
   * Uses: OS info + CPU model + machine ID + app salt
   */
  generateDeviceFingerprint() {
    const cpus = os.cpus()
    const cpuModel = cpus.length > 0 ? cpus[0].model : 'unknown'
    const platform = os.platform()
    const arch = os.arch()
    const hostname = os.hostname()

    // Combine unique system identifiers
    const data = `${platform}-${arch}-${cpuModel}-${hostname}-${LICENSE_CONFIG.APP_SALT}`

    // Hash to create fingerprint
    return crypto.createHash('sha256').update(data).digest('hex')
  }

  /**
   * Validate license locally (check expiry, trial period, etc.)
   */
  async validateLocal() {
    const licenseState = database.getLicenseState()
    const now = new Date()

    // Check expiry
    if (licenseState.expiry_at) {
      const expiryDate = new Date(licenseState.expiry_at)

      if (now > expiryDate) {
        // License expired
        database.updateLicenseState({
          status: 'expired'
        })

        return {
          valid: false,
          status: 'expired',
          reason: 'License expired',
          expiry_at: licenseState.expiry_at
        }
      }
    }

    // Check if we need to validate with server (offline grace period)
    const needsServerValidation = this.needsServerValidation(licenseState)

    if (needsServerValidation && licenseState.status === 'activated') {
      console.log('[LicenseService] Needs server validation')
      try {
        await this.validateWithServer()
      } catch (error) {
        console.error('[LicenseService] Server validation failed:', error.message)
        // Continue with offline validation during grace period
      }
    }

    // License is valid
    return {
      valid: true,
      status: licenseState.status,
      expiry_at: licenseState.expiry_at,
      user: licenseState.user_json ? JSON.parse(licenseState.user_json) : null,
      trial_days_remaining: this.getTrialDaysRemaining(licenseState)
    }
  }

  /**
   * Check if server validation is needed
   */
  needsServerValidation(licenseState) {
    if (!licenseState.last_check_at) {
      return true
    }

    const lastCheck = new Date(licenseState.last_check_at)
    const now = new Date()
    const daysSinceCheck = (now - lastCheck) / (1000 * 60 * 60 * 24)

    return daysSinceCheck > LICENSE_CONFIG.OFFLINE_GRACE_DAYS
  }

  /**
   * Get remaining trial days
   */
  getTrialDaysRemaining(licenseState) {
    if (licenseState.status !== 'trial' || !licenseState.expiry_at) {
      return null
    }

    const now = new Date()
    const expiryDate = new Date(licenseState.expiry_at)
    const daysRemaining = Math.ceil((expiryDate - now) / (1000 * 60 * 60 * 24))

    return Math.max(0, daysRemaining)
  }

  /**
   * Activate license with activation code
   */
  async activate(activationCode) {
    console.log('[LicenseService] Activating with code:', activationCode)

    const licenseState = database.getLicenseState()

    // Check if server URL is configured
    if (LICENSE_CONFIG.SERVER_BASE_URL.startsWith('<')) {
      console.warn('[LicenseService] License server not configured, using mock activation')
      return this.mockActivate(activationCode, licenseState)
    }

    try {
      // Call activation API
      const response = await this.callLicenseServer('POST', LICENSE_CONFIG.ACTIVATE_PATH, {
        activation_code: activationCode,
        device_fingerprint: licenseState.device_fingerprint
      })

      // Update license state with response
      const expiryAt = response.expiry_at || response.expires_at
      const userJson = response.user ? JSON.stringify(response.user) : null

      database.updateLicenseState({
        status: 'activated',
        activation_code: activationCode,
        expiry_at: expiryAt,
        user_json: userJson,
        raw_payload: JSON.stringify(response),
        last_check_at: new Date().toISOString()
      })

      console.log('[LicenseService] Activation successful')

      return {
        success: true,
        expiry_at: expiryAt,
        user: response.user
      }
    } catch (error) {
      console.error('[LicenseService] Activation failed:', error.message)
      throw new Error(`Activation failed: ${error.message}`)
    }
  }

  /**
   * Mock activation (for development/testing)
   */
  mockActivate(activationCode, licenseState) {
    console.log('[LicenseService] Mock activation')

    // Generate mock expiry (1 year from now)
    const expiryDate = new Date()
    expiryDate.setFullYear(expiryDate.getFullYear() + 1)

    const mockUser = {
      user_id: 'mock-user-001',
      name: 'Mock User',
      org: 'Mock Organization',
      contact: 'mock@example.com'
    }

    database.updateLicenseState({
      status: 'activated',
      activation_code: activationCode,
      expiry_at: expiryDate.toISOString(),
      user_json: JSON.stringify(mockUser),
      raw_payload: JSON.stringify({ mock: true }),
      last_check_at: new Date().toISOString()
    })

    return {
      success: true,
      expiry_at: expiryDate.toISOString(),
      user: mockUser,
      mock: true
    }
  }

  /**
   * Validate with license server
   */
  async validateWithServer() {
    const licenseState = database.getLicenseState()

    // Check if server URL is configured
    if (LICENSE_CONFIG.SERVER_BASE_URL.startsWith('<')) {
      console.warn('[LicenseService] License server not configured')
      return
    }

    try {
      const response = await this.callLicenseServer('POST', LICENSE_CONFIG.VALIDATE_PATH, {
        activation_code: licenseState.activation_code,
        device_fingerprint: licenseState.device_fingerprint
      })

      // Update last check time
      database.updateLicenseState({
        last_check_at: new Date().toISOString()
      })

      console.log('[LicenseService] Server validation successful')

      return response
    } catch (error) {
      console.error('[LicenseService] Server validation failed:', error.message)
      throw error
    }
  }

  /**
   * Call license server API
   */
  async callLicenseServer(method, path, body) {
    return new Promise((resolve, reject) => {
      const url = new URL(path, LICENSE_CONFIG.SERVER_BASE_URL)
      const httpModule = url.protocol === 'https:' ? https : http

      const bodyStr = JSON.stringify(body)

      const options = {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(bodyStr),
          'User-Agent': 'RedEdge-Desktop/1.0'
        },
        timeout: 10000
      }

      const req = httpModule.request(url, options, (res) => {
        const chunks = []

        res.on('data', (chunk) => {
          chunks.push(chunk)
        })

        res.on('end', () => {
          const buffer = Buffer.concat(chunks)
          const text = buffer.toString()

          if (res.statusCode < 200 || res.statusCode >= 300) {
            return reject(new Error(`HTTP ${res.statusCode}: ${text}`))
          }

          try {
            const data = JSON.parse(text)
            resolve(data)
          } catch (err) {
            reject(new Error('Failed to parse JSON response'))
          }
        })
      })

      req.on('error', reject)
      req.on('timeout', () => {
        req.destroy()
        reject(new Error('Request timeout'))
      })

      req.write(bodyStr)
      req.end()
    })
  }

  /**
   * Get current license info
   */
  getLicenseInfo() {
    const licenseState = database.getLicenseState()

    return {
      status: licenseState.status,
      expiry_at: licenseState.expiry_at,
      user: licenseState.user_json ? JSON.parse(licenseState.user_json) : null,
      device_fingerprint: licenseState.device_fingerprint,
      last_check_at: licenseState.last_check_at,
      trial_days_remaining: this.getTrialDaysRemaining(licenseState)
    }
  }
}

export default new LicenseService()
