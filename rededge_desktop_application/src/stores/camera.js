import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useCameraStore = defineStore('camera', () => {
  const profiles = ref([])
  const activeProfile = ref(null)
  const isLoading = ref(false)
  const error = ref(null)

  // Getters
  const hasActiveProfile = computed(() => activeProfile.value !== null)

  // Load all profiles
  async function loadProfiles() {
    try {
      isLoading.value = true
      error.value = null
      profiles.value = await window.electronAPI.camera.getAllProfiles()
    } catch (err) {
      error.value = err.message
      console.error('Failed to load profiles:', err)
    } finally {
      isLoading.value = false
    }
  }

  // Load active profile
  async function loadActiveProfile() {
    try {
      activeProfile.value = await window.electronAPI.camera.getActiveProfile()
    } catch (err) {
      console.error('Failed to load active profile:', err)
    }
  }

  // Create profile
  async function createProfile(profile) {
    try {
      isLoading.value = true
      error.value = null
      // Convert to plain object to avoid cloning issues with Vue reactive proxies
      const plainProfile = JSON.parse(JSON.stringify(profile))
      const result = await window.electronAPI.camera.createProfile(plainProfile)
      await loadProfiles()
      return result
    } catch (err) {
      error.value = err.message
      throw err
    } finally {
      isLoading.value = false
    }
  }

  // Update profile
  async function updateProfile(id, profile) {
    try {
      isLoading.value = true
      error.value = null
      // Convert to plain object to avoid cloning issues with Vue reactive proxies
      const plainProfile = JSON.parse(JSON.stringify(profile))
      await window.electronAPI.camera.updateProfile(id, plainProfile)
      await loadProfiles()
      if (activeProfile.value?.id === id) {
        await loadActiveProfile()
      }
    } catch (err) {
      error.value = err.message
      throw err
    } finally {
      isLoading.value = false
    }
  }

  // Delete profile
  async function deleteProfile(id) {
    try {
      isLoading.value = true
      error.value = null
      await window.electronAPI.camera.deleteProfile(id)
      await loadProfiles()
      if (activeProfile.value?.id === id) {
        activeProfile.value = null
      }
    } catch (err) {
      error.value = err.message
      throw err
    } finally {
      isLoading.value = false
    }
  }

  // Set active profile
  async function setActiveProfile(id) {
    try {
      isLoading.value = true
      error.value = null
      await window.electronAPI.camera.setActiveProfile(id)
      await loadActiveProfile()
    } catch (err) {
      error.value = err.message
      throw err
    } finally {
      isLoading.value = false
    }
  }

  // Test connection
  async function testConnection(profileId) {
    try {
      const result = await window.electronAPI.camera.testConnection(profileId)
      await loadProfiles() // Reload to get updated connection status
      return result
    } catch (err) {
      throw err
    }
  }

  return {
    profiles,
    activeProfile,
    isLoading,
    error,
    hasActiveProfile,
    loadProfiles,
    loadActiveProfile,
    createProfile,
    updateProfile,
    deleteProfile,
    setActiveProfile,
    testConnection
  }
})
