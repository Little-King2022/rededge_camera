import { ipcMain, app, dialog, shell, BrowserWindow } from 'electron'
import fs from 'fs/promises'
import path from 'path'
import os from 'os'
import { fileURLToPath, pathToFileURL } from 'url'
import database from '../services/database.js'
import CameraApiClient from '../services/camera-api.js'
import licenseService from '../services/license.js'
import downloadService from '../services/download.js'
import deleteService from '../services/delete.js'
import pythonService from '../services/python-service.js'
import { getAdminClient } from '../services/admin-client.js'

/**
 * Register all IPC handlers
 */
export function registerIPCHandlers() {
  console.log('[IPC] Registering IPC handlers...')

  const getSettings = () => database.getAllSettings()

  // Cache CameraApiClient instance per profile to maintain streaming state
  let cachedCameraApi = null
  let cachedProfileId = null

  const getActiveCameraApi = () => {
    const profile = database.getActiveProfile()
    if (!profile) {
      throw new Error('No active profile')
    }

    // Return cached instance if profile hasn't changed
    if (cachedCameraApi && cachedProfileId === profile.id) {
      return cachedCameraApi
    }

    // Create new instance and cache it
    cachedProfileId = profile.id
    cachedCameraApi = new CameraApiClient(profile, getSettings())
    return cachedCameraApi
  }

  // Clear cache when profile changes
  const clearCameraApiCache = () => {
    cachedCameraApi = null
    cachedProfileId = null
  }

  const previewDir = path.join(app.getPath('userData'), 'capture-previews')

  const ensurePreviewDir = async () => {
    await fs.mkdir(previewDir, { recursive: true })
  }

  const normalizeCaptureId = (captureId) => String(captureId || 'unknown').replace(/[^a-zA-Z0-9_-]/g, '_')

  const parseDataUrl = (dataUrl) => {
    if (typeof dataUrl !== 'string') return null
    const match = dataUrl.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/)
    if (!match) return null
    const mime = match[1]
    const base64 = match[2]
    const ext = mime.split('/')[1] || 'png'
    return { buffer: Buffer.from(base64, 'base64'), ext }
  }

  const savePreviewDataUrl = async (captureId, index, dataUrl) => {
    const parsed = parseDataUrl(dataUrl)
    if (!parsed) return null
    await ensurePreviewDir()
    const safeId = normalizeCaptureId(captureId)
    const filename = `${safeId}_${index + 1}.${parsed.ext}`
    const filePath = path.join(previewDir, filename)

    try {
      await fs.access(filePath)
      return filename
    } catch {
      await fs.writeFile(filePath, parsed.buffer)
      return filename
    }
  }

  const normalizeRelativePath = (relativePath) => {
    if (!relativePath) return ''
    return relativePath.replace(/\\/g, '/')
  }

  const fileUrlToRelativePath = (fileUrl) => {
    if (typeof fileUrl !== 'string' || !fileUrl.startsWith('file://')) return null
    try {
      const filePath = fileURLToPath(fileUrl)
      if (filePath.startsWith(previewDir)) {
        return normalizeRelativePath(path.relative(previewDir, filePath))
      }
    } catch (error) {
      console.warn('[CaptureHistory] Failed to parse file URL:', error)
    }
    return null
  }

  const toFileUrl = (relativePath) => {
    if (!relativePath) return null
    const normalized = normalizeRelativePath(relativePath)
    return `preview://${encodeURIComponent(normalized)}`
  }

  const deletePreviewFiles = async (relativePaths) => {
    if (!Array.isArray(relativePaths) || relativePaths.length === 0) return
    await ensurePreviewDir()
    await Promise.all(relativePaths.map(async (relativePath) => {
      if (!relativePath) return
      const filePath = path.join(previewDir, relativePath)
      try {
        await fs.unlink(filePath)
      } catch (error) {
        if (error.code !== 'ENOENT') {
          console.warn('[CaptureHistory] Failed to delete preview file:', error)
        }
      }
    }))
  }

  // ========== Camera Profile Handlers ==========

  ipcMain.handle('camera:getAllProfiles', async () => {
    return database.getAllProfiles()
  })

  ipcMain.handle('camera:getActiveProfile', async () => {
    return database.getActiveProfile()
  })

  ipcMain.handle('camera:createProfile', async (event, profile) => {
    const id = database.createProfile(profile)
    return { id }
  })

  ipcMain.handle('camera:updateProfile', async (event, { id, profile }) => {
    database.updateProfile(id, profile)
    return { success: true }
  })

  ipcMain.handle('camera:deleteProfile', async (event, id) => {
    database.deleteProfile(id)
    return { success: true }
  })

  ipcMain.handle('camera:setActiveProfile', async (event, id) => {
    database.setActiveProfile(id)
    clearCameraApiCache() // Clear cache when switching profiles
    return { success: true }
  })

  // ========== Camera API Handlers ==========

  ipcMain.handle('camera:testConnection', async (event, profileId) => {
    try {
      const profile = database.getProfile(profileId)
      if (!profile) {
        throw new Error('Profile not found')
      }

      const cameraApi = new CameraApiClient(profile, getSettings())
      const status = await cameraApi.getStatus()

      // Update profile with successful connection
      database.updateProfile(profileId, {
        last_ok_at: new Date().toISOString(),
        consecutive_failures: 0
      })

      return { success: true, status }
    } catch (error) {
      // Update profile with failure
      const profile = database.getProfile(profileId)
      if (profile) {
        database.updateProfile(profileId, {
          consecutive_failures: (profile.consecutive_failures || 0) + 1
        })
      }

      return { success: false, error: error.message }
    }
  })

  ipcMain.handle('camera:getStatus', async () => {
    const cameraApi = getActiveCameraApi()
    return await cameraApi.getStatus()
  })

  ipcMain.handle('camera:capture', async () => {
    const cameraApi = getActiveCameraApi()
    return await cameraApi.capture()
  })

  ipcMain.handle('camera:getCaptureStatus', async (event, captureId) => {
    const cameraApi = getActiveCameraApi()
    return await cameraApi.getCaptureStatus(captureId)
  })

  ipcMain.handle('camera:getConfig', async () => {
    const cameraApi = getActiveCameraApi()
    return await cameraApi.getConfig()
  })

  ipcMain.handle('camera:setConfig', async (event, config) => {
    const cameraApi = getActiveCameraApi()
    return await cameraApi.setConfig(config)
  })

  ipcMain.handle('camera:startTimer', async (event, intervalSec) => {
    const cameraApi = getActiveCameraApi()
    await cameraApi.startCameraTimer(intervalSec)
    return { success: true }
  })

  ipcMain.handle('camera:stopTimer', async () => {
    const cameraApi = getActiveCameraApi()
    await cameraApi.stopCameraTimer()
    return { success: true }
  })

  // ========== App Utilities ==========

  ipcMain.handle('app:openExternal', async (event, url) => {
    try {
      const parsed = new URL(String(url))
      if (!['http:', 'https:', 'mailto:', 'tel:'].includes(parsed.protocol)) {
        return { success: false, error: 'Unsupported protocol' }
      }
      await shell.openExternal(parsed.toString())
      return { success: true }
    } catch (error) {
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle('app:openPath', async (event, pathString) => {
    try {
      const error = await shell.openPath(pathString)
      if (error) {
        return { success: false, error }
      }
      return { success: true }
    } catch (error) {
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle('app:showItemInFolder', async (event, pathString) => {
    try {
      shell.showItemInFolder(pathString)
      return { success: true }
    } catch (error) {
      return { success: false, error: error.message }
    }
  })

  const getActiveWindow = () => {
    return BrowserWindow.getFocusedWindow() || BrowserWindow.getAllWindows()[0]
  }

  ipcMain.handle('window:minimize', async () => {
    const win = getActiveWindow()
    if (!win) return { success: false }
    win.minimize()
    return { success: true }
  })

  ipcMain.handle('window:toggleMaximize', async () => {
    const win = getActiveWindow()
    if (!win) return { success: false }
    if (win.isMaximized()) {
      win.unmaximize()
    } else {
      win.maximize()
    }
    return { success: true, isMaximized: win.isMaximized() }
  })

  ipcMain.handle('window:close', async () => {
    const win = getActiveWindow()
    if (!win) return { success: false }
    win.close()
    return { success: true }
  })

  ipcMain.handle('camera:probeCapabilities', async () => {
    const cameraApi = getActiveCameraApi()
    return await cameraApi.probeCapabilities()
  })

  ipcMain.handle('camera:getDlsImu', async () => {
    const cameraApi = getActiveCameraApi()
    return await cameraApi.getDlsImu()
  })

  ipcMain.handle('camera:getVersion', async () => {
    const cameraApi = getActiveCameraApi()
    return await cameraApi.getVersion()
  })

  ipcMain.handle('camera:getCameraInfo', async () => {
    const cameraApi = getActiveCameraApi()
    return await cameraApi.getCameraInfo()
  })

  // ========== Preview Handlers ==========

  ipcMain.handle('preview:getFrame', async () => {
    const cameraApi = getActiveCameraApi()
    return await cameraApi.getOneTimePreviewFrame()
  })

  ipcMain.handle('preview:stopStream', async () => {
    const cameraApi = getActiveCameraApi()
    return await cameraApi.stopPreviewStreaming()
  })

  // ========== File Management Handlers ==========

  ipcMain.handle('camera:listFiles', async (event, remotePath) => {
    const cameraApi = getActiveCameraApi()
    return await cameraApi.listFiles(remotePath)
  })

  ipcMain.handle('camera:deleteFile', async (event, remotePath) => {
    const cameraApi = getActiveCameraApi()
    return await cameraApi.deleteFile(remotePath)
  })

  ipcMain.handle('camera:deletePaths', async (event, items) => {
    const cameraApi = getActiveCameraApi()
    const safeItems = Array.isArray(items) ? items : []
    return await deleteService.startDelete(cameraApi, safeItems)
  })

  ipcMain.handle('camera:getDeleteTask', async (event, taskId) => {
    return deleteService.getTask(taskId)
  })

  ipcMain.handle('camera:getActiveDeleteTask', async () => {
    return deleteService.getActiveTask()
  })

  ipcMain.handle('camera:formatSDCard', async () => {
    const cameraApi = getActiveCameraApi()
    return await cameraApi.formatSDCard()
  })

  // ========== Download Handlers ==========

  ipcMain.handle('download:addToQueue', async (event, files) => {
    const profile = database.getActiveProfile()
    if (!profile) {
      throw new Error('No active profile')
    }

    return await downloadService.addToQueue(profile.id, files)
  })

  ipcMain.handle('download:getAll', async () => {
    return downloadService.getAllDownloads()
  })

  ipcMain.handle('download:pause', async (event, downloadId) => {
    downloadService.pauseDownload(downloadId)
    return { success: true }
  })

  ipcMain.handle('download:resume', async (event, downloadId) => {
    downloadService.resumeDownload(downloadId)
    return { success: true }
  })

  ipcMain.handle('download:retry', async (event, downloadId) => {
    downloadService.retryDownload(downloadId)
    return { success: true }
  })

  ipcMain.handle('download:delete', async (event, downloadId) => {
    downloadService.deleteDownload(downloadId)
    return { success: true }
  })

  ipcMain.handle('download:clearCompleted', async () => {
    return downloadService.clearCompleted()
  })

  ipcMain.handle('download:openDirectory', async () => {
    const downloadDir = database.getSetting('download_directory')
      || path.join(app.getPath('downloads'), 'RedEdgeDownloads')

    await fs.mkdir(downloadDir, { recursive: true })
    const error = await shell.openPath(downloadDir)
    if (error) {
      return { success: false, error }
    }
    return { success: true, path: downloadDir }
  })

  // ========== Settings Handlers ==========

  ipcMain.handle('settings:get', async (event, key) => {
    return database.getSetting(key)
  })

  ipcMain.handle('settings:set', async (event, { key, value }) => {
    database.setSetting(key, value)
    return { success: true }
  })

  ipcMain.handle('settings:getAll', async () => {
    return database.getAllSettings()
  })

  // ========== Capture History Handlers ==========

  ipcMain.handle('captureHistory:get', async () => {
    const captures = Array.isArray(database.getRecentCaptures()) ? database.getRecentCaptures() : []
    let needsPersist = false

    const normalized = captures.map((capture) => {
      const existingPreviewFiles = Array.isArray(capture.previewFiles) ? capture.previewFiles : []
      let previewFiles = [...existingPreviewFiles]

      if (previewFiles.length === 0 && Array.isArray(capture.previewUrls)) {
        for (const url of capture.previewUrls) {
          const relativePath = fileUrlToRelativePath(url)
          if (relativePath) {
            previewFiles.push(relativePath)
          }
        }

        if (previewFiles.length > 0) {
          needsPersist = true
        }
      }

      const previewUrls = previewFiles.map(toFileUrl).filter(Boolean)
      return {
        ...capture,
        previewFiles,
        previewUrls
      }
    })

    if (needsPersist) {
      const persisted = normalized.map((capture) => ({
        capture_id: capture.capture_id,
        type: capture.type,
        status: capture.status,
        timestamp: capture.timestamp,
        previewFiles: Array.isArray(capture.previewFiles) ? capture.previewFiles : []
      }))
      database.setRecentCaptures(persisted)
    }

    return normalized
  })

  ipcMain.handle('captureHistory:set', async (event, captures) => {
    const safeCaptures = Array.isArray(captures) ? captures : []
    const existing = database.getRecentCaptures()
    const existingMap = new Map((Array.isArray(existing) ? existing : []).map((entry) => [String(entry.capture_id), entry]))
    const savedIds = new Set()
    const normalized = []

    for (const capture of safeCaptures) {
      if (!capture) continue
      const captureId = String(capture.capture_id || 'unknown')
      savedIds.add(captureId)

      const previewUrls = Array.isArray(capture.previewUrls) ? capture.previewUrls : []
      const previewFilesFromPayload = Array.isArray(capture.previewFiles) ? capture.previewFiles : []
      const previewFiles = []

      for (let i = 0; i < previewUrls.length; i += 1) {
        const url = previewUrls[i]
        if (typeof url !== 'string') continue

        if (url.startsWith('data:image/')) {
          const filename = await savePreviewDataUrl(captureId, i, url)
          if (filename) previewFiles.push(filename)
          continue
        }

        if (url.startsWith('file://')) {
          const relativePath = fileUrlToRelativePath(url)
          if (relativePath) previewFiles.push(relativePath)
        }
      }

      if (previewFiles.length === 0 && previewFilesFromPayload.length > 0) {
        previewFiles.push(...previewFilesFromPayload)
      }

      const existingEntry = existingMap.get(captureId)
      if (existingEntry?.previewFiles) {
        const existingFiles = Array.isArray(existingEntry.previewFiles) ? existingEntry.previewFiles : []
        const filesToRemove = existingFiles.filter((file) => !previewFiles.includes(file))
        await deletePreviewFiles(filesToRemove)
      }

      normalized.push({
        capture_id: capture.capture_id,
        type: capture.type,
        status: capture.status,
        timestamp: capture.timestamp,
        previewFiles
      })
    }

    const removed = (Array.isArray(existing) ? existing : []).filter((entry) => !savedIds.has(String(entry.capture_id)))
    for (const entry of removed) {
      await deletePreviewFiles(entry.previewFiles)
    }

    database.setRecentCaptures(normalized)
    return { success: true }
  })

  ipcMain.handle('captureHistory:export', async (event, payload = {}) => {
    const captureIds = Array.isArray(payload.captureIds) ? payload.captureIds.map(String) : []

    let targetDirectory = typeof payload.directory === 'string' ? payload.directory : ''
    if (!targetDirectory) {
      const result = await dialog.showOpenDialog({
        properties: ['openDirectory', 'createDirectory'],
        title: 'Select export folder'
      })
      if (result.canceled || result.filePaths.length === 0) {
        return { success: false, canceled: true }
      }
      targetDirectory = result.filePaths[0]
    }

    const captures = database.getRecentCaptures()
    const lookup = new Map((Array.isArray(captures) ? captures : []).map((entry) => [String(entry.capture_id), entry]))
    const exported = []

    await fs.mkdir(targetDirectory, { recursive: true })

    for (const captureId of captureIds) {
      const entry = lookup.get(String(captureId))
      if (!entry) continue

      const folderName = `capture_${normalizeCaptureId(entry.capture_id)}`
      const captureDir = path.join(targetDirectory, folderName)
      await fs.mkdir(captureDir, { recursive: true })

      const previewFiles = Array.isArray(entry.previewFiles) ? entry.previewFiles : []
      const copied = []

      for (const relativePath of previewFiles) {
        if (!relativePath) continue
        const sourcePath = path.join(previewDir, relativePath)
        const targetPath = path.join(captureDir, relativePath)
        await fs.mkdir(path.dirname(targetPath), { recursive: true })
        try {
          await fs.copyFile(sourcePath, targetPath)
          copied.push(relativePath)
        } catch (error) {
          console.warn('[CaptureHistory] Failed to copy preview file:', error)
        }
      }

      const metadata = {
        capture_id: entry.capture_id,
        type: entry.type,
        status: entry.status,
        timestamp: entry.timestamp,
        preview_files: copied
      }
      await fs.writeFile(path.join(captureDir, 'metadata.json'), JSON.stringify(metadata, null, 2), 'utf8')
      exported.push({ capture_id: entry.capture_id, files: copied.length })
    }

    return { success: true, directory: targetDirectory, exported }
  })

  // ========== License Handlers ==========

  ipcMain.handle('license:getInfo', async () => {
    return licenseService.getLicenseInfo()
  })

  ipcMain.handle('license:activate', async (event, activationCode) => {
    return await licenseService.activate(activationCode)
  })

  ipcMain.handle('license:validate', async () => {
    return await licenseService.validateLocal()
  })

  // ========== Python Service Handlers ==========

  ipcMain.handle('python:getStatus', async () => {
    return await pythonService.getStatus()
  })

  ipcMain.handle('python:start', async () => {
    return await pythonService.start()
  })

  ipcMain.handle('python:stop', async () => {
    pythonService.stop()
    return { success: true }
  })

  // ========== Calibration Handlers ==========

  ipcMain.handle('calibration:scanQR', async (event, imageBase64) => {
    return await pythonService.detectQR(imageBase64)
  })

  ipcMain.handle('calibration:detectFromFiles', async (event, panelImagePaths) => {
    return await pythonService.detectPanelFromFiles(panelImagePaths)
  })

  ipcMain.handle('calibration:calculateIrradiance', async (event, { panelImagePaths, reflectances }) => {
    return await pythonService.calculateIrradiance(panelImagePaths, reflectances)
  })

  ipcMain.handle('calibration:parseSerial', async (event, serial) => {
    return await pythonService.parseSerial(serial)
  })

  ipcMain.handle('calibration:save', async (event, record) => {
    const id = database.createCalibrationRecord(record)
    return { success: true, id }
  })

  ipcMain.handle('calibration:getAll', async () => {
    return database.getAllCalibrationRecords()
  })

  ipcMain.handle('calibration:get', async (event, id) => {
    return database.getCalibrationRecord(id)
  })

  ipcMain.handle('calibration:getActive', async () => {
    return database.getActiveCalibrationRecord()
  })

  ipcMain.handle('calibration:setActive', async (event, id) => {
    database.setActiveCalibrationRecord(id)
    return { success: true }
  })

  ipcMain.handle('calibration:delete', async (event, id) => {
    database.deleteCalibrationRecord(id)
    return { success: true }
  })

  ipcMain.handle('calibration:selectPanelImages', async () => {
    const result = await dialog.showOpenDialog({
      title: 'Select Panel Images (5 bands)',
      filters: [
        { name: 'TIFF Images', extensions: ['tif', 'tiff'] }
      ],
      properties: ['openFile', 'multiSelections']
    })

    if (result.canceled || result.filePaths.length === 0) {
      return { success: false, canceled: true }
    }

    return { success: true, filePaths: result.filePaths }
  })

  // ========== Alignment Handlers ==========

  ipcMain.handle('alignment:selectImages', async () => {
    const result = await dialog.showOpenDialog({
      title: 'Select 5-band Images',
      filters: [
        { name: 'TIFF Images', extensions: ['tif', 'tiff'] }
      ],
      properties: ['openFile', 'multiSelections']
    })

    if (result.canceled || result.filePaths.length === 0) {
      return { success: false, canceled: true }
    }

    return { success: true, filePaths: result.filePaths }
  })

  ipcMain.handle('alignment:getCameraInfo', async (event, imagePaths) => {
    return await pythonService.getCameraInfo(imagePaths)
  })

  ipcMain.handle('alignment:computeWarpMatrices', async (event, { imagePaths, options }) => {
    // 生成保存路径
    const warpMatricesDir = path.join(app.getPath('userData'), 'warp_matrices')
    await fs.mkdir(warpMatricesDir, { recursive: true })

    const timestamp = Date.now()
    const outputPath = path.join(warpMatricesDir, `warp_matrices_${timestamp}.npy`)

    const result = await pythonService.startComputeWarpMatrices(imagePaths, {
      ...options,
      outputPath
    })

    if (result.success && result.job_id) {
      database.createWarpMatrixJob({
        job_id: result.job_id,
        status: result.status || 'pending',
        progress: 0,
        message: 'queued',
        output_path: outputPath,
        image_paths: imagePaths,
        options: { ...options }
      })
    }

    return result
  })

  ipcMain.handle('alignment:getComputeWarpMatricesStatus', async (event, jobId) => {
    try {
      const result = await pythonService.getComputeWarpMatricesStatus(jobId)
      const jobRecord = database.getWarpMatrixJobByJobId(jobId)

      if (result?.success) {
        database.updateWarpMatrixJob(jobId, {
          status: result.status,
          progress: result.progress,
          message: result.message,
          error_message: result.error_message || null,
          started_at: result.started_at || jobRecord?.started_at,
          completed_at: result.completed_at || jobRecord?.completed_at
        })
      }

      if (result?.success && result.status === 'completed' && result.result) {
        if (jobRecord?.record_id) {
          result.record_id = jobRecord.record_id
        } else {
          const recordId = database.createWarpMatricesRecord({
            camera_serial: result.result.camera_serial,
            camera_model: result.result.camera_model,
            alignment_method: result.result.method,
            reference_band: result.result.reference_band,
            warp_matrices_path: result.result.warp_matrices_path || jobRecord?.output_path,
            source_image_path: jobRecord?.image_paths?.[0],
            alignment_quality: result.result.alignment_quality || 95,
            cropped_dimensions: result.result.cropped_dimensions
          })

          database.updateWarpMatrixJob(jobId, {
            status: 'completed',
            progress: 100,
            message: 'completed',
            completed_at: result.completed_at || new Date().toISOString(),
            record_id: recordId
          })

          result.record_id = recordId
        }
      }

      return result
    } catch (error) {
      const message = error.message || 'Job not found'
      database.updateWarpMatrixJob(jobId, {
        status: 'failed',
        progress: 100,
        message: 'failed',
        error_message: message,
        completed_at: new Date().toISOString()
      })
      return { success: false, error: message, status: 'failed' }
    }
  })

  ipcMain.handle('alignment:getWarpMatrixJobs', async () => {
    return database.getAllWarpMatrixJobs()
  })

  ipcMain.handle('alignment:deleteWarpMatrixJob', async (event, jobId) => {
    database.deleteWarpMatrixJob(jobId)
    return { success: true }
  })

  ipcMain.handle('alignment:getWarpMatrices', async () => {
    return database.getAllWarpMatricesRecords()
  })

  ipcMain.handle('alignment:getWarpMatricesByCamera', async (event, cameraSerial) => {
    return database.getWarpMatricesRecordsByCameraSerial(cameraSerial)
  })

  ipcMain.handle('alignment:getActiveMatrix', async (event, cameraSerial) => {
    return database.getActiveWarpMatricesRecord(cameraSerial)
  })

  ipcMain.handle('alignment:setActiveMatrix', async (event, id) => {
    database.setActiveWarpMatricesRecord(id)
    return { success: true }
  })

  ipcMain.handle('alignment:deleteMatrix', async (event, id) => {
    const record = database.getWarpMatricesRecord(id)
    if (record && record.warp_matrices_path) {
      try {
        await fs.unlink(record.warp_matrices_path)
      } catch (e) {
        console.warn('[Alignment] Failed to delete warp matrices file:', e)
      }
    }
    database.deleteWarpMatricesRecord(id)
    return { success: true }
  })

  ipcMain.handle('alignment:alignSingle', async (event, { imagePaths, warpMatrixId, outputPath, options }) => {
    const record = database.getWarpMatricesRecord(warpMatrixId)
    if (!record) {
      return { success: false, error: 'Warp matrix record not found' }
    }

    const mergedOptions = { ...(options || {}) }
    if (mergedOptions.reference_band == null) {
      mergedOptions.reference_band = record.reference_band
    }

    return await pythonService.alignSingle(imagePaths, record.warp_matrices_path, outputPath, mergedOptions)
  })

  ipcMain.handle('alignment:alignBatch', async (event, { inputDirectory, outputDirectory, warpMatrixId, options }) => {
    const record = database.getWarpMatricesRecord(warpMatrixId)
    if (!record) {
      return { success: false, error: 'Warp matrix record not found' }
    }

    const mergedOptions = { ...(options || {}) }
    if (mergedOptions.reference_band == null) {
      mergedOptions.reference_band = record.reference_band
    }

    const result = await pythonService.alignBatch(inputDirectory, outputDirectory, record.warp_matrices_path, mergedOptions)

    if (result.success) {
      // 创建任务记录
      const jobId = database.createAlignmentJob({
        job_type: 'batch',
        warp_matrix_id: warpMatrixId,
        input_path: inputDirectory,
        output_directory: outputDirectory,
        total_captures: result.total_captures,
        options
      })

      result.local_job_id = jobId
    }

    return result
  })

  ipcMain.handle('alignment:getJobStatus', async (event, jobId) => {
    return await pythonService.getAlignmentJobStatus(jobId)
  })

  ipcMain.handle('alignment:cancelJob', async (event, jobId) => {
    return await pythonService.cancelAlignmentJob(jobId)
  })

  ipcMain.handle('alignment:getJobHistory', async (event, limit = 20) => {
    return database.getRecentAlignmentJobs(limit)
  })

  ipcMain.handle('alignment:selectOutputDirectory', async () => {
    const result = await dialog.showOpenDialog({
      title: 'Select Output Directory',
      properties: ['openDirectory', 'createDirectory']
    })

    if (result.canceled || result.filePaths.length === 0) {
      return { success: false, canceled: true }
    }

    return { success: true, directory: result.filePaths[0] }
  })

  ipcMain.handle('alignment:selectInputDirectory', async () => {
    const result = await dialog.showOpenDialog({
      title: 'Select Input Directory',
      properties: ['openDirectory']
    })

    if (result.canceled || result.filePaths.length === 0) {
      return { success: false, canceled: true }
    }

    return { success: true, directory: result.filePaths[0] }
  })

  // ========== Batch Processing Handlers ==========

  ipcMain.handle('batch:selectInputDirectory', async () => {
    const result = await dialog.showOpenDialog({
      title: 'Select Input Directory',
      properties: ['openDirectory']
    })

    if (result.canceled || result.filePaths.length === 0) {
      return { success: false, canceled: true }
    }

    return { success: true, directory: result.filePaths[0] }
  })

  ipcMain.handle('batch:selectOutputDirectory', async () => {
    const result = await dialog.showOpenDialog({
      title: 'Select Output Directory',
      properties: ['openDirectory', 'createDirectory']
    })

    if (result.canceled || result.filePaths.length === 0) {
      return { success: false, canceled: true }
    }

    return { success: true, directory: result.filePaths[0] }
  })

  ipcMain.handle('batch:start', async (event, config) => {
    const result = await pythonService.startProcessing(
      config.inputDirectory,
      config.outputDirectory,
      {
        panelImagePaths: config.panelImagePaths,
        panelReflectances: config.panelReflectances,
        warpMatricesPath: config.warpMatricesPath,
        processingOptions: config.options
      }
    )

    if (result.success) {
      // 创建任务记录
      const jobId = database.createBatchJob({
        calibration_id: config.calibrationId,
        input_directory: config.inputDirectory,
        output_directory: config.outputDirectory,
        total_captures: result.total_captures,
        options: config.options
      })

      result.local_job_id = jobId
    }

    return result
  })

  ipcMain.handle('batch:getStatus', async (event, jobId) => {
    return await pythonService.getProcessingStatus(jobId)
  })

  ipcMain.handle('batch:cancel', async (event, jobId) => {
    return await pythonService.cancelProcessing(jobId)
  })

  ipcMain.handle('batch:getJobHistory', async (event, limit = 20) => {
    return database.getRecentBatchJobs(limit)
  })

  // ========== System Info Handlers ==========

  // CPU使用率计算（需要在两次调用之间计算差值）
  let lastCpuInfo = null

  ipcMain.handle('system:getInfo', async () => {
    const totalMem = os.totalmem()
    const freeMem = os.freemem()
    const usedMem = totalMem - freeMem

    // CPU使用率计算
    const cpus = os.cpus()
    const currentCpuInfo = cpus.map(cpu => ({
      idle: cpu.times.idle,
      total: Object.values(cpu.times).reduce((a, b) => a + b, 0)
    }))

    let cpuUsage = 0
    if (lastCpuInfo) {
      let totalIdle = 0
      let totalTick = 0
      for (let i = 0; i < currentCpuInfo.length; i++) {
        const idle = currentCpuInfo[i].idle - lastCpuInfo[i].idle
        const total = currentCpuInfo[i].total - lastCpuInfo[i].total
        totalIdle += idle
        totalTick += total
      }
      cpuUsage = 100 - (100 * totalIdle / totalTick)
    }

    lastCpuInfo = currentCpuInfo

    return {
      memory: {
        total: totalMem,
        used: usedMem,
        free: freeMem,
        usagePercent: (usedMem / totalMem) * 100
      },
      cpu: {
        usage: cpuUsage,
        cores: cpus.length
      }
    }
  })

  ipcMain.handle('system:getVersion', async () => {
    return app.getVersion()
  })

  // ===== Admin Client Handlers =====

  ipcMain.handle('admin:getSettings', async () => {
    return database.getAdminSettings()
  })

  ipcMain.handle('admin:updateSettings', async (event, settings) => {
    const adminClient = getAdminClient()
    if (adminClient) {
      adminClient.updateSettings(settings)
    } else {
      database.updateAdminSettings(settings)
    }
    return { success: true }
  })

  ipcMain.handle('admin:checkConnection', async () => {
    const adminClient = getAdminClient()
    if (!adminClient) {
      return { success: false, error: 'Admin client not initialized' }
    }

    try {
      // 尝试获取公钥来测试连接
      await adminClient.getPublicKey()
      return { success: true }
    } catch (error) {
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle('admin:activateLicense', async (event, activationCode) => {
    const adminClient = getAdminClient()
    if (!adminClient) {
      return { success: false, error: 'Admin client not initialized' }
    }

    return await adminClient.activateLicense(activationCode)
  })

  ipcMain.handle('admin:validateLicense', async () => {
    const adminClient = getAdminClient()
    if (!adminClient) {
      return { valid: false, error: 'Admin client not initialized' }
    }

    return await adminClient.validateLicense()
  })

  ipcMain.handle('admin:checkUpdates', async () => {
    const adminClient = getAdminClient()
    if (!adminClient) {
      return { success: false, error: 'Admin client not initialized' }
    }

    return await adminClient.checkForUpdates()
  })

  ipcMain.handle('admin:downloadUpdate', async (event, versionId) => {
    const adminClient = getAdminClient()
    if (!adminClient) {
      return { success: false, error: 'Admin client not initialized' }
    }

    const savePath = path.join(app.getPath('downloads'), 'rededge-updates', `update-${versionId}.exe`)
    return await adminClient.downloadUpdate(versionId, savePath)
  })

  ipcMain.handle('admin:syncCameraConfigs', async () => {
    const adminClient = getAdminClient()
    if (!adminClient) {
      return { success: false, error: 'Admin client not initialized' }
    }

    return await adminClient.syncCameraConfigs()
  })

  ipcMain.handle('admin:getHeartbeatStatus', async () => {
    const settings = database.getAdminSettings()
    return {
      enabled: settings.admin_server_enabled === 'true',
      last_heartbeat_at: settings.last_heartbeat_at
    }
  })

  ipcMain.handle('admin:getOfflineMode', async () => {
    const license = database.getLicenseState()
    return {
      offline_mode: license.offline_mode || false
    }
  })

  console.log('[IPC] IPC handlers registered successfully')
}
