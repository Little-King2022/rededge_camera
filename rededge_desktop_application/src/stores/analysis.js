import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useAnalysisStore = defineStore('analysis', () => {
  // State
  const jobs = ref([])
  const presets = ref({})
  const isLoading = ref(false)
  const error = ref(null)

  // AI model state
  const models = ref([])
  const modelsLoading = ref(false)
  const modelsError = ref(null)
  const selectedModel = ref(null)

  // Python service state
  const pythonServiceStatus = ref({
    isRunning: false,
    isHealthy: false
  })

  // Computed
  const sortedJobs = computed(() => {
    return [...jobs.value].sort((a, b) =>
      new Date(b.created_at) - new Date(a.created_at)
    )
  })

  const pendingJobs = computed(() =>
    jobs.value.filter(j => j.status === 'pending' || j.status === 'running')
  )

  // Actions

  async function checkPythonService() {
    try {
      const status = await window.electronAPI.python.getStatus()
      pythonServiceStatus.value = status
      return status
    } catch (e) {
      console.error('[AnalysisStore] Failed to check Python service:', e)
      pythonServiceStatus.value = { isRunning: false, isHealthy: false }
      return pythonServiceStatus.value
    }
  }

  async function startPythonService() {
    try {
      isLoading.value = true
      const success = await window.electronAPI.python.start()
      if (success) {
        pythonServiceStatus.value = { isRunning: true, isHealthy: true }
      }
      return success
    } catch (e) {
      console.error('[AnalysisStore] Failed to start Python service:', e)
      error.value = e.message
      return false
    } finally {
      isLoading.value = false
    }
  }

  async function loadPresets() {
    try {
      const result = await window.electronAPI.analysis.getPresets()
      if (result?.success) {
        presets.value = result.presets || {}
      }
    } catch (e) {
      console.error('[AnalysisStore] Failed to load presets:', e)
    }
  }

  async function loadJobs() {
    try {
      isLoading.value = true
      error.value = null
      const result = await window.electronAPI.analysis.getJobs(50)
      jobs.value = Array.isArray(result) ? result : []
    } catch (e) {
      console.error('[AnalysisStore] Failed to load jobs:', e)
      error.value = e.message
    } finally {
      isLoading.value = false
    }
  }

  async function submitJob(params) {
    const result = await window.electronAPI.analysis.submitJob(params)
    if (result.success) {
      await loadJobs()
    }
    return result
  }

  async function pollJobStatus(jobId) {
    const result = await window.electronAPI.analysis.getJobStatus(jobId)
    if (result?.success) {
      const idx = jobs.value.findIndex(j => j.job_id === jobId)
      if (idx !== -1) {
        const updated = { ...jobs.value[idx] }
        if (result.status) updated.status = result.status
        if (result.progress !== undefined) updated.progress = result.progress
        if (result.message) updated.message = result.message
        if (result.result) updated.result = result.result
        if (result.error_message) updated.error_message = result.error_message
        jobs.value[idx] = updated
      }
    }
    return result
  }

  async function cancelJob(jobId) {
    const result = await window.electronAPI.analysis.cancelJob(jobId)
    if (result.success) {
      const idx = jobs.value.findIndex(j => j.job_id === jobId)
      if (idx !== -1) {
        jobs.value[idx] = { ...jobs.value[idx], status: 'cancelled', message: '已取消' }
      }
    }
    return result
  }

  async function deleteJob(localJobId, jobId) {
    const result = await window.electronAPI.analysis.deleteJob(localJobId)
    if (result.success) {
      jobs.value = jobs.value.filter(j => j.id !== localJobId)
    }
    return result
  }

  async function loadModels() {
    try {
      modelsLoading.value = true
      modelsError.value = null
      const result = await window.electronAPI.analysis.getModelList()
      if (result.success) {
        models.value = result.models || []
      } else {
        modelsError.value = result.error
      }
    } catch (e) {
      console.error('[AnalysisStore] Failed to load models:', e)
      modelsError.value = e.message
    } finally {
      modelsLoading.value = false
    }
  }

  function selectModel(model) {
    selectedModel.value = model
  }

  async function openOutputFile(filePath) {
    return window.electronAPI.analysis.openOutputFile(filePath)
  }

  async function showInFolder(filePath) {
    return window.electronAPI.analysis.showInFolder(filePath)
  }

  return {
    jobs,
    presets,
    isLoading,
    error,
    models,
    modelsLoading,
    modelsError,
    selectedModel,
    pythonServiceStatus,
    sortedJobs,
    pendingJobs,
    checkPythonService,
    startPythonService,
    loadPresets,
    loadJobs,
    submitJob,
    pollJobStatus,
    cancelJob,
    deleteJob,
    loadModels,
    selectModel,
    openOutputFile,
    showInFolder
  }
})
