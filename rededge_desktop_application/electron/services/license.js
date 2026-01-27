import database from './database.js'
import { getAdminClient } from './admin-client.js'

// License configuration
const LICENSE_CONFIG = {
  TRIAL_DAYS: 7
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
      // Fingerprint generation is handled by database initialization now, 
      // but we ensure it here just in case, or rely on admin-client which uses it.
      // Actually database.js _initialize handles it.
      console.log('[LicenseService] Device fingerprint check: ', licenseState.device_fingerprint)
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
   * Validate license locally (check expiry, trial period, etc.)
   * Delegates server validation to AdminClient if needed
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

    const normalizedStatus = String(licenseState.status || '').toLowerCase()
    const shouldValidateWithServer = !licenseState.offline_mode && normalizedStatus && normalizedStatus !== 'trial'

    if (shouldValidateWithServer) {
      const adminClient = getAdminClient()
      if (!adminClient) {
        return {
          valid: false,
          status: licenseState.status,
          reason: 'Admin client not initialized',
          expiry_at: licenseState.expiry_at
        }
      }

      const result = await adminClient.validateLicense()
      if (!result.valid) {
        const latestState = database.getLicenseState()
        return {
          valid: false,
          status: latestState.status,
          reason: result.reason || 'License validation failed',
          expiry_at: latestState.expiry_at
        }
      }
    }

    const latestState = database.getLicenseState()
    const latestStatus = String(latestState.status || '').toLowerCase()
    if (latestStatus && latestStatus !== 'trial' && latestStatus !== 'activated') {
      return {
        valid: false,
        status: latestState.status,
        reason: 'License not activated',
        expiry_at: latestState.expiry_at
      }
    }

    // License is valid
    return {
      valid: true,
      status: latestState.status,
      expiry_at: latestState.expiry_at,
      user: latestState.user_json ? JSON.parse(latestState.user_json) : null,
      trial_days_remaining: this.getTrialDaysRemaining(latestState)
    }
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
    console.log('[LicenseService] Activating with code...')

    const adminClient = getAdminClient()
    if (!adminClient) {
      throw new Error('Admin client not initialized')
    }

    // Delegate to AdminClient
    const result = await adminClient.activateLicense(activationCode)

    if (result.success) {
       // Database is already updated by adminClient
       const licenseState = database.getLicenseState()
       return {
         success: true,
         expiry_at: licenseState.expiry_at,
         user: licenseState.user_json ? JSON.parse(licenseState.user_json) : null
       }
    } else {
      throw new Error(result.error || 'Activation failed')
    }
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
