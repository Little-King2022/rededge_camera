import { defineStore } from 'pinia'
import { ref, computed, toRaw } from 'vue'

export const useCalibrationStore = defineStore('calibration', () => {
  // State
  const records = ref([])
  const activeRecord = ref(null)
  const isLoading = ref(false)
  const error = ref(null)

  // Python service state
  const pythonServiceStatus = ref({
    isRunning: false,
    isHealthy: false
  })

  // Current scan/detection state
  const currentDetection = ref(null)
  const isScanning = ref(false)
  const scanError = ref(null)

  // Computed
  const hasActiveRecord = computed(() => activeRecord.value !== null)

  const sortedRecords = computed(() => {
    return [...records.value].sort((a, b) =>
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
      console.error('[CalibrationStore] Failed to check Python service:', e)
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
      console.error('[CalibrationStore] Failed to start Python service:', e)
      error.value = e.message
      return false
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Load all calibration records
   */
  async function loadRecords() {
    try {
      isLoading.value = true
      error.value = null
      records.value = await window.electronAPI.calibration.getAll()
      activeRecord.value = await window.electronAPI.calibration.getActive()
    } catch (e) {
      console.error('[CalibrationStore] Failed to load records:', e)
      error.value = e.message
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Scan QR code from base64 image
   */
  async function scanQR(imageBase64) {
    try {
      isScanning.value = true
      scanError.value = null
      currentDetection.value = null

      const result = await window.electronAPI.calibration.scanQR(imageBase64)

      if (result.success) {
        currentDetection.value = result
      } else {
        scanError.value = result.error || 'QR code not found'
      }

      return result
    } catch (e) {
      console.error('[CalibrationStore] Failed to scan QR:', e)
      scanError.value = e.message
      return { success: false, error: e.message }
    } finally {
      isScanning.value = false
    }
  }

  /**
   * Detect panel from TIF files
   */
  async function detectFromFiles(filePaths) {
    try {
      isScanning.value = true
      scanError.value = null
      currentDetection.value = null

      const result = await window.electronAPI.calibration.detectFromFiles(filePaths)

      if (result.success) {
        currentDetection.value = result
      } else {
        scanError.value = result.error || 'Panel detection failed'
      }

      return result
    } catch (e) {
      console.error('[CalibrationStore] Failed to detect from files:', e)
      scanError.value = e.message
      return { success: false, error: e.message }
    } finally {
      isScanning.value = false
    }
  }

  /**
   * Select panel images via file dialog
   */
  async function selectPanelImages() {
    try {
      const result = await window.electronAPI.calibration.selectPanelImages()
      return result
    } catch (e) {
      console.error('[CalibrationStore] Failed to select panel images:', e)
      return { success: false, error: e.message }
    }
  }

  /**
   * Parse serial number
   */
  async function parseSerial(serial) {
    try {
      return await window.electronAPI.calibration.parseSerial(serial)
    } catch (e) {
      console.error('[CalibrationStore] Failed to parse serial:', e)
      return { success: false, error: e.message }
    }
  }

  /**
   * Save calibration record
   */
  async function saveRecord(record) {
    try {
      isLoading.value = true
      error.value = null

      // 使用 toRaw 移除 Vue 响应式包装，然后通过 JSON 确保完全可序列化
      const rawRecord = toRaw(record)
      const serializedRecord = JSON.parse(JSON.stringify(rawRecord))

      console.log('[CalibrationStore] Saving record:', serializedRecord)

      const result = await window.electronAPI.calibration.save(serializedRecord)

      if (result.success) {
        await loadRecords()
        currentDetection.value = null
      }

      return result
    } catch (e) {
      console.error('[CalibrationStore] Failed to save record:', e)
      error.value = e.message
      return { success: false, error: e.message }
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Set active calibration record
   */
  async function setActive(id) {
    try {
      isLoading.value = true
      error.value = null

      await window.electronAPI.calibration.setActive(id)
      await loadRecords()

      return { success: true }
    } catch (e) {
      console.error('[CalibrationStore] Failed to set active:', e)
      error.value = e.message
      return { success: false, error: e.message }
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Delete calibration record
   */
  async function deleteRecord(id) {
    try {
      isLoading.value = true
      error.value = null

      await window.electronAPI.calibration.delete(id)
      await loadRecords()

      return { success: true }
    } catch (e) {
      console.error('[CalibrationStore] Failed to delete record:', e)
      error.value = e.message
      return { success: false, error: e.message }
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Clear current detection
   */
  function clearDetection() {
    currentDetection.value = null
    scanError.value = null
  }

  return {
    // State
    records,
    activeRecord,
    isLoading,
    error,
    pythonServiceStatus,
    currentDetection,
    isScanning,
    scanError,

    // Computed
    hasActiveRecord,
    sortedRecords,

    // Actions
    checkPythonService,
    startPythonService,
    loadRecords,
    scanQR,
    detectFromFiles,
    selectPanelImages,
    parseSerial,
    saveRecord,
    setActive,
    deleteRecord,
    clearDetection
  }
})
