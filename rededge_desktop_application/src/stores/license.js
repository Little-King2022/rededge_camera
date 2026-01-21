import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useLicenseStore = defineStore('license', () => {
  const licenseInfo = ref(null)
  const isLoading = ref(false)
  const error = ref(null)

  // Getters
  const isActivated = computed(() => licenseInfo.value?.status === 'activated')
  const isTrial = computed(() => licenseInfo.value?.status === 'trial')
  const isExpired = computed(() => licenseInfo.value?.status === 'expired')
  const trialDaysRemaining = computed(() => licenseInfo.value?.trial_days_remaining || 0)

  // Load license info
  async function loadLicenseInfo() {
    try {
      isLoading.value = true
      error.value = null
      licenseInfo.value = await window.electronAPI.license.getInfo()
    } catch (err) {
      error.value = err.message
      console.error('Failed to load license info:', err)
    } finally {
      isLoading.value = false
    }
  }

  // Activate license
  async function activate(activationCode) {
    try {
      isLoading.value = true
      error.value = null
      // Ensure activationCode is a plain string
      const code = String(activationCode)
      const result = await window.electronAPI.license.activate(code)
      await loadLicenseInfo()
      return result
    } catch (err) {
      error.value = err.message
      throw err
    } finally {
      isLoading.value = false
    }
  }

  // Validate license
  async function validate() {
    try {
      isLoading.value = true
      error.value = null
      const result = await window.electronAPI.license.validate()
      await loadLicenseInfo()
      return result
    } catch (err) {
      error.value = err.message
      throw err
    } finally {
      isLoading.value = false
    }
  }

  return {
    licenseInfo,
    isLoading,
    error,
    isActivated,
    isTrial,
    isExpired,
    trialDaysRemaining,
    loadLicenseInfo,
    activate,
    validate
  }
})
