import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useAlignmentStore = defineStore('alignment', () => {
  // State
  const warpMatricesRecords = ref([])
  const alignmentJobs = ref([])
  const isLoading = ref(false)
  const error = ref(null)

  // Current operation state
  const isComputing = ref(false)
  const currentCameraInfo = ref(null)
  const computeProgress = ref(null)

  // Python service state
  const pythonServiceStatus = ref({
    isRunning: false,
    isHealthy: false
  })

  // Computed
  const sortedWarpMatrices = computed(() => {
    return [...warpMatricesRecords.value].sort((a, b) =>
      new Date(b.created_at) - new Date(a.created_at)
    )
  })

  const activeMatricesByCamera = computed(() => {
    const map = {}
    for (const record of warpMatricesRecords.value) {
      if (record.is_active) {
        map[record.camera_serial] = record
      }
    }
    return map
  })

  const sortedJobs = computed(() => {
    return [...alignmentJobs.value].sort((a, b) =>
      new Date(b.created_at) - new Date(a.created_at)
    )
  })

  // Actions

  /**
   * Check Python service status
   */
  async function checkPythonService() {
    try {
      const status = await window.electronAPI.python.getStatus()
      pythonServiceStatus.value = status
      return status
    } catch (e) {
      console.error('[AlignmentStore] Failed to check Python service:', e)
      pythonServiceStatus.value = { isRunning: false, isHealthy: false }
      return pythonServiceStatus.value
    }
  }

  /**
   * Start Python service
   */
  async function startPythonService() {
    try {
      isLoading.value = true
      const success = await window.electronAPI.python.start()
      if (success) {
        pythonServiceStatus.value = { isRunning: true, isHealthy: true }
      }
      return success
    } catch (e) {
      console.error('[AlignmentStore] Failed to start Python service:', e)
      error.value = e.message
      return false
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Load all warp matrices records
   */
  async function loadWarpMatrices() {
    try {
      isLoading.value = true
      error.value = null
      warpMatricesRecords.value = await window.electronAPI.alignment.getWarpMatrices()
    } catch (e) {
      console.error('[AlignmentStore] Failed to load warp matrices:', e)
      error.value = e.message
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Load alignment job history
   */
  async function loadJobHistory(limit = 20) {
    try {
      alignmentJobs.value = await window.electronAPI.alignment.getJobHistory(limit)
    } catch (e) {
      console.error('[AlignmentStore] Failed to load job history:', e)
    }
  }

  /**
   * Select images via file dialog
   */
  async function selectImages() {
    try {
      return await window.electronAPI.alignment.selectImages()
    } catch (e) {
      console.error('[AlignmentStore] Failed to select images:', e)
      return { success: false, error: e.message }
    }
  }

  /**
   * Get camera info from images
   */
  async function getCameraInfo(imagePaths) {
    try {
      isLoading.value = true
      // 转换为普通数组以避免IPC序列化问题
      const plainPaths = Array.isArray(imagePaths) ? Array.from(imagePaths) : [imagePaths]
      const result = await window.electronAPI.alignment.getCameraInfo(plainPaths)
      if (result.success) {
        currentCameraInfo.value = result
      }
      return result
    } catch (e) {
      console.error('[AlignmentStore] Failed to get camera info:', e)
      return { success: false, error: e.message }
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Compute warp matrices
   */
  async function computeWarpMatrices(imagePaths, options = {}) {
    try {
      isComputing.value = true
      computeProgress.value = { status: 'computing', message: 'Computing warp matrices...' }
      error.value = null

      // 转换为普通数组和普通对象以避免IPC序列化问题
      const plainPaths = Array.isArray(imagePaths) ? Array.from(imagePaths) : [imagePaths]
      const plainOptions = JSON.parse(JSON.stringify(options))

      const result = await window.electronAPI.alignment.computeWarpMatrices(plainPaths, plainOptions)

      if (result.success) {
        await loadWarpMatrices()
        computeProgress.value = { status: 'completed', message: 'Warp matrices computed successfully' }
      } else {
        computeProgress.value = { status: 'failed', message: result.error }
      }

      return result
    } catch (e) {
      console.error('[AlignmentStore] Failed to compute warp matrices:', e)
      error.value = e.message
      computeProgress.value = { status: 'failed', message: e.message }
      return { success: false, error: e.message }
    } finally {
      isComputing.value = false
    }
  }

  /**
   * Set active warp matrix
   */
  async function setActiveMatrix(id) {
    try {
      isLoading.value = true
      await window.electronAPI.alignment.setActiveMatrix(id)
      await loadWarpMatrices()
      return { success: true }
    } catch (e) {
      console.error('[AlignmentStore] Failed to set active matrix:', e)
      error.value = e.message
      return { success: false, error: e.message }
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Delete warp matrix record
   */
  async function deleteMatrix(id) {
    try {
      isLoading.value = true
      await window.electronAPI.alignment.deleteMatrix(id)
      await loadWarpMatrices()
      return { success: true }
    } catch (e) {
      console.error('[AlignmentStore] Failed to delete matrix:', e)
      error.value = e.message
      return { success: false, error: e.message }
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Align single capture
   */
  async function alignSingle(imagePaths, warpMatrixId, outputPath, options = {}) {
    try {
      isLoading.value = true
      error.value = null

      // 转换为普通数据以避免IPC序列化问题
      const plainPaths = Array.isArray(imagePaths) ? Array.from(imagePaths) : [imagePaths]
      const plainOptions = JSON.parse(JSON.stringify(options))

      const result = await window.electronAPI.alignment.alignSingle(
        plainPaths,
        warpMatrixId,
        outputPath,
        plainOptions
      )

      return result
    } catch (e) {
      console.error('[AlignmentStore] Failed to align single:', e)
      error.value = e.message
      return { success: false, error: e.message }
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Start batch alignment
   */
  async function alignBatch(inputDirectory, outputDirectory, warpMatrixId, options = {}) {
    try {
      // 转换为普通对象以避免IPC序列化问题
      const plainOptions = JSON.parse(JSON.stringify(options))

      const result = await window.electronAPI.alignment.alignBatch(
        inputDirectory,
        outputDirectory,
        warpMatrixId,
        plainOptions
      )

      if (result.success) {
        await loadJobHistory()
      }

      return result
    } catch (e) {
      console.error('[AlignmentStore] Failed to start batch alignment:', e)
      return { success: false, error: e.message }
    }
  }

  /**
   * Get job status
   */
  async function getJobStatus(jobId) {
    try {
      return await window.electronAPI.alignment.getJobStatus(jobId)
    } catch (e) {
      console.error('[AlignmentStore] Failed to get job status:', e)
      return { success: false, error: e.message }
    }
  }

  /**
   * Cancel job
   */
  async function cancelJob(jobId) {
    try {
      return await window.electronAPI.alignment.cancelJob(jobId)
    } catch (e) {
      console.error('[AlignmentStore] Failed to cancel job:', e)
      return { success: false, error: e.message }
    }
  }

  /**
   * Select output directory
   */
  async function selectOutputDirectory() {
    try {
      return await window.electronAPI.alignment.selectOutputDirectory()
    } catch (e) {
      return { success: false, error: e.message }
    }
  }

  /**
   * Select input directory
   */
  async function selectInputDirectory() {
    try {
      return await window.electronAPI.alignment.selectInputDirectory()
    } catch (e) {
      return { success: false, error: e.message }
    }
  }

  /**
   * Clear current camera info
   */
  function clearCameraInfo() {
    currentCameraInfo.value = null
    computeProgress.value = null
  }

  return {
    // State
    warpMatricesRecords,
    alignmentJobs,
    isLoading,
    error,
    isComputing,
    currentCameraInfo,
    computeProgress,
    pythonServiceStatus,

    // Computed
    sortedWarpMatrices,
    activeMatricesByCamera,
    sortedJobs,

    // Actions
    checkPythonService,
    startPythonService,
    loadWarpMatrices,
    loadJobHistory,
    selectImages,
    getCameraInfo,
    computeWarpMatrices,
    setActiveMatrix,
    deleteMatrix,
    alignSingle,
    alignBatch,
    getJobStatus,
    cancelJob,
    selectOutputDirectory,
    selectInputDirectory,
    clearCameraInfo
  }
})
