import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useDownloadStore = defineStore('download', () => {
  const downloads = ref([])
  const isLoading = ref(false)
  const error = ref(null)
  const autoRefreshTimer = ref(null)
  const autoRefreshIntervalMs = 200

  function hasActiveDownloads(list) {
    return list.some(d => d.status === 'downloading' || d.status === 'pending')
  }

  function stopAutoRefresh() {
    if (autoRefreshTimer.value) {
      clearInterval(autoRefreshTimer.value)
      autoRefreshTimer.value = null
    }
  }

  function startAutoRefresh() {
    if (autoRefreshTimer.value) return
    autoRefreshTimer.value = setInterval(async () => {
      try {
        const latest = await window.electronAPI.download.getAll()
        downloads.value = latest
        if (!hasActiveDownloads(latest)) {
          stopAutoRefresh()
        }
      } catch (err) {
        console.error('Failed to auto-refresh downloads:', err)
      }
    }, autoRefreshIntervalMs)
  }

  // Load all downloads
  async function loadDownloads() {
    try {
      isLoading.value = true
      error.value = null
      downloads.value = await window.electronAPI.download.getAll()
      if (hasActiveDownloads(downloads.value)) {
        startAutoRefresh()
      } else {
        stopAutoRefresh()
      }
    } catch (err) {
      error.value = err.message
      console.error('Failed to load downloads:', err)
    } finally {
      isLoading.value = false
    }
  }

  // Add files to download queue
  async function addToQueue(files) {
    try {
      isLoading.value = true
      error.value = null
      // Convert to plain array to avoid cloning issues
      const plainFiles = JSON.parse(JSON.stringify(files))
      const downloadIds = await window.electronAPI.download.addToQueue(plainFiles)
      await loadDownloads()
      return downloadIds
    } catch (err) {
      error.value = err.message
      throw err
    } finally {
      isLoading.value = false
    }
  }

  // Pause download
  async function pauseDownload(downloadId) {
    try {
      await window.electronAPI.download.pause(downloadId)
      await loadDownloads()
    } catch (err) {
      error.value = err.message
      throw err
    }
  }

  // Resume download
  async function resumeDownload(downloadId) {
    try {
      await window.electronAPI.download.resume(downloadId)
      await loadDownloads()
    } catch (err) {
      error.value = err.message
      throw err
    }
  }

  // Retry download
  async function retryDownload(downloadId) {
    try {
      await window.electronAPI.download.retry(downloadId)
      await loadDownloads()
    } catch (err) {
      error.value = err.message
      throw err
    }
  }

  // Delete download
  async function deleteDownload(downloadId) {
    try {
      await window.electronAPI.download.delete(downloadId)
      await loadDownloads()
    } catch (err) {
      error.value = err.message
      throw err
    }
  }

  // Clear completed downloads
  async function clearCompleted() {
    try {
      const count = await window.electronAPI.download.clearCompleted()
      await loadDownloads()
      return count
    } catch (err) {
      error.value = err.message
      throw err
    }
  }

  async function openDownloadDirectory() {
    try {
      return await window.electronAPI.download.openDirectory()
    } catch (err) {
      error.value = err.message
      throw err
    }
  }

  return {
    downloads,
    isLoading,
    error,
    loadDownloads,
    addToQueue,
    pauseDownload,
    resumeDownload,
    retryDownload,
    deleteDownload,
    clearCompleted,
    openDownloadDirectory,
    startAutoRefresh,
    stopAutoRefresh
  }
})
