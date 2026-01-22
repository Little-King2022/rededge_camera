import fs from 'fs'
import path from 'path'
import http from 'http'
import https from 'https'
import { app } from 'electron'
import database from './database.js'
import CameraApiClient from './camera-api.js'

class DownloadService {
  constructor() {
    this.activeDownloads = new Map() // downloadId -> controller
    this.maxConcurrent = 1
    this.isProcessing = false
  }

  updateMaxConcurrentFromSettings() {
    const rawValue = database.getSetting('download_max_concurrent')
    const parsed = parseInt(rawValue || '1', 10)
    const clamped = Number.isFinite(parsed) ? Math.min(Math.max(parsed, 1), 5) : 1
    this.maxConcurrent = clamped
  }

  /**
   * Get default download directory
   */
  getDefaultDownloadDir() {
    const downloadsPath = app.getPath('downloads')
    return path.join(downloadsPath, 'RedEdgeDownloads')
  }

  /**
   * Ensure download directory exists
   */
  ensureDownloadDir(dir) {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
      console.log('[DownloadService] Created download directory:', dir)
    }
  }

  normalizeRemotePath(remotePath) {
    if (!remotePath) return '/'
    const normalized = remotePath.startsWith('/') ? remotePath : `/${remotePath}`
    const collapsed = normalized.replace(/\/+/g, '/')
    if (collapsed.length > 1 && collapsed.endsWith('/')) {
      return collapsed.slice(0, -1)
    }
    return collapsed
  }

  joinRemotePath(basePath, name) {
    return `${basePath.replace(/\/$/, '')}/${name}`.replace(/\/+/g, '/')
  }

  parseListResponse(result) {
    const directories = []
    const files = []

    if (Array.isArray(result)) {
      for (const item of result) {
        if (typeof item === 'string') {
          if (item.includes('.')) {
            files.push({ name: item })
          } else {
            directories.push(item)
          }
        } else if (item && typeof item === 'object') {
          const name = item.name || item.filename || item.path || ''
          const type = item.type || (item.is_dir ? 'directory' : 'file')
          if (!name) continue
          if (type === 'directory') {
            directories.push(name)
          } else {
            files.push({ name, size: item.size || 0 })
          }
        }
      }
      return { directories, files }
    }

    if (result && (Array.isArray(result.directories) || Array.isArray(result.files))) {
      const dirNames = (result.directories || []).map(dir => (typeof dir === 'string' ? dir : dir.name || dir.path))
      directories.push(...dirNames.filter(Boolean))

      for (const file of result.files || []) {
        if (typeof file === 'string') {
          files.push({ name: file })
        } else if (file && typeof file === 'object') {
          const name = file.name || file.filename || file.path || ''
          if (!name) continue
          files.push({ name, size: file.size || 0 })
        }
      }
    }

    return { directories, files }
  }

  async listFilesRecursive(cameraApi, remotePath) {
    const normalizedPath = this.normalizeRemotePath(remotePath)
    const result = await cameraApi.listFiles(normalizedPath)
    const { directories, files } = this.parseListResponse(result)

    let allFiles = files.map(file => ({
      remote_path: this.joinRemotePath(normalizedPath, file.name),
      size: file.size || 0
    }))

    for (const dirName of directories) {
      const childPath = this.joinRemotePath(normalizedPath, dirName)
      const childFiles = await this.listFilesRecursive(cameraApi, childPath)
      allFiles = allFiles.concat(childFiles)
    }

    return allFiles
  }

  /**
   * Add file(s)/folder(s) to download queue
   */
  async addToQueue(cameraProfileId, items) {
    const downloadDir = database.getSetting('download_directory') || this.getDefaultDownloadDir()
    this.ensureDownloadDir(downloadDir)

    const downloadIds = []
    const needsListing = items.some(item => item.type === 'directory' || item.is_dir === true)

    let cameraApi = null
    if (needsListing) {
      const profile = database.getProfile(cameraProfileId)
      if (!profile) {
        throw new Error('Camera profile not found')
      }
      const settings = database.getAllSettings()
      cameraApi = new CameraApiClient(profile, settings)
    }

    for (const item of items) {
      const remotePath = this.normalizeRemotePath(item.remote_path)
      const type = item.type || (item.is_dir ? 'directory' : 'file')

      if (type === 'directory') {
        const allFiles = cameraApi ? await this.listFilesRecursive(cameraApi, remotePath) : []
        const totalBytes = allFiles.reduce((sum, f) => sum + (f.size || 0), 0)
        const totalFiles = allFiles.length
        const localDir = path.join(downloadDir, remotePath.replace(/^\/+/, ''))
        this.ensureDownloadDir(localDir)

        const downloadId = database.createDownload({
          camera_profile_id: cameraProfileId,
          remote_path: remotePath,
          local_path: localDir,
          status: totalFiles === 0 ? 'completed' : 'pending',
          total_bytes: totalBytes,
          downloaded_bytes: 0,
          type: 'folder',
          total_files: totalFiles,
          completed_files: 0,
          pending_files: allFiles,
          all_files: allFiles
        })

        downloadIds.push(downloadId)
        console.log('[DownloadService] Added folder to queue:', remotePath)
        continue
      }

      // File download
      const fileName = path.basename(remotePath)
      const localPath = path.join(downloadDir, fileName)

      const downloadId = database.createDownload({
        camera_profile_id: cameraProfileId,
        remote_path: remotePath,
        local_path: localPath,
        status: 'pending',
        total_bytes: item.size || 0,
        downloaded_bytes: 0,
        type: 'file',
        total_files: 1,
        completed_files: 0
      })

      downloadIds.push(downloadId)
      console.log('[DownloadService] Added to queue:', remotePath)
    }

    // Start processing queue
    this.processQueue()

    return downloadIds
  }

  /**
   * Process download queue
   */
  async processQueue() {
    if (this.isProcessing) {
      return
    }

    this.isProcessing = true

    try {
      this.updateMaxConcurrentFromSettings()
      while (true) {
        this.updateMaxConcurrentFromSettings()
        // Check how many downloads are active
        const activeCount = this.activeDownloads.size

        if (activeCount >= this.maxConcurrent) {
          // Wait for a slot to free up
          await new Promise(resolve => setTimeout(resolve, 1000))
          continue
        }

        // Get next pending download
        const pendingDownloads = database.getPendingDownloads()
        const nextDownload = pendingDownloads.find(d =>
          d.status === 'pending' && !this.activeDownloads.has(d.id)
        )

        if (!nextDownload) {
          // No more pending downloads
          break
        }

        // Start download
        this.startDownload(nextDownload)
      }
    } finally {
      this.isProcessing = false
    }
  }

  /**
   * Start individual download
   */
  async startDownload(download) {
    const controller = new AbortController()
    this.activeDownloads.set(download.id, controller)

    console.log('[DownloadService] Starting download:', download.remote_path)

    try {
      // Update status to downloading
      database.updateDownload(download.id, {
        status: 'downloading',
        error_message: null
      })

      // Get camera profile
      const profile = database.getProfile(download.camera_profile_id)
      if (!profile) {
        throw new Error('Camera profile not found')
      }

      const settings = database.getAllSettings()

      // Create camera API client
      const cameraApi = new CameraApiClient(profile, settings)

      const latestDownload = database.getDownload(download.id)
      if (!latestDownload) {
        return
      }

      if (latestDownload.type === 'folder') {
        await this.downloadFolder(cameraApi, latestDownload, controller.signal)
        console.log('[DownloadService] Folder download completed:', latestDownload.remote_path)
      } else {
        // Download file with progress tracking
        const buffer = await this.downloadWithProgress(
          cameraApi,
          latestDownload.remote_path,
          latestDownload.id,
          controller.signal
        )

        // Write to local file
        await fs.promises.writeFile(latestDownload.local_path, buffer)

        // Update status to completed
        database.updateDownload(latestDownload.id, {
          status: 'completed',
          downloaded_bytes: buffer.length,
          total_bytes: buffer.length,
          completed_files: 1
        })

        console.log('[DownloadService] Download completed:', latestDownload.remote_path)
      }
    } catch (error) {
      console.error('[DownloadService] Download failed:', error.message)

      const latestDownload = database.getDownload(download.id)
      if (!latestDownload) {
        return
      }

      if (latestDownload.status === 'paused') {
        return
      }

      // Update status to failed
      database.updateDownload(download.id, {
        status: 'failed',
        error_message: error.message
      })
    } finally {
      this.activeDownloads.delete(download.id)

      // Continue processing queue
      this.processQueue()
    }
  }

  /**
   * Download folder contents with progress tracking
   */
  async downloadFolder(cameraApi, download, signal) {
    const downloadDir = database.getSetting('download_directory') || this.getDefaultDownloadDir()
    this.ensureDownloadDir(downloadDir)

    let pendingFiles = Array.isArray(download.pending_files) ? [...download.pending_files] : []
    let allFiles = Array.isArray(download.all_files) ? download.all_files : []

    if (pendingFiles.length === 0 && download.status !== 'completed') {
      allFiles = await this.listFilesRecursive(cameraApi, download.remote_path)
      pendingFiles = [...allFiles]

      const totalBytes = allFiles.reduce((sum, f) => sum + (f.size || 0), 0)
      database.updateDownload(download.id, {
        total_bytes: totalBytes,
        total_files: allFiles.length,
        pending_files: pendingFiles,
        all_files: allFiles,
        completed_files: 0,
        downloaded_bytes: 0
      })
    }

    const totalBytes = download.total_bytes || allFiles.reduce((sum, f) => sum + (f.size || 0), 0)
    if (download.total_bytes !== totalBytes) {
      database.updateDownload(download.id, { total_bytes: totalBytes })
    }

    let downloadedBytesBase = download.downloaded_bytes || 0
    const totalFiles = download.total_files || allFiles.length || pendingFiles.length
    let completedFiles = download.completed_files || Math.max(totalFiles - pendingFiles.length, 0)

    while (pendingFiles.length > 0) {
      const currentFile = pendingFiles[0]

      if (signal.aborted) {
        throw new Error('Download aborted')
      }

      const localPath = path.join(downloadDir, currentFile.remote_path.replace(/^\/+/, ''))
      this.ensureDownloadDir(path.dirname(localPath))

      try {
        let currentFileBytes = 0
        const buffer = await this.downloadWithProgress(
          cameraApi,
          currentFile.remote_path,
          null,
          signal,
          (downloadedBytes) => {
            currentFileBytes = downloadedBytes
            database.updateDownload(download.id, {
              downloaded_bytes: downloadedBytesBase + currentFileBytes
            })
          }
        )

        await fs.promises.writeFile(localPath, buffer)

        downloadedBytesBase += buffer.length
        completedFiles += 1
        pendingFiles.shift()

        database.updateDownload(download.id, {
          downloaded_bytes: downloadedBytesBase,
          completed_files: completedFiles,
          pending_files: pendingFiles
        })
      } catch (error) {
        database.updateDownload(download.id, {
          downloaded_bytes: downloadedBytesBase
        })
        throw error
      }
    }

    database.updateDownload(download.id, {
      status: 'completed',
      downloaded_bytes: downloadedBytesBase,
      completed_files: completedFiles,
      pending_files: []
    })
  }

  /**
   * Download file with progress tracking
   */
  async downloadWithProgress(cameraApi, remotePath, downloadId, signal, progressCallback = null) {
    return new Promise((resolve, reject) => {
      const url = new URL(`/files${remotePath}`, cameraApi.getBaseUrl())

      const httpModule = url.protocol === 'https:' ? https : http

      const reqOptions = {
        signal,
        timeout: cameraApi.timeout
      }

      const proxyAgent = cameraApi.getProxyAgentForUrl(url)
      if (proxyAgent) {
        reqOptions.agent = proxyAgent
      }

      let settled = false
      let onAbort = null
      const finish = (error, buffer) => {
        if (settled) {
          return
        }
        settled = true
        if (signal && onAbort) {
          signal.removeEventListener('abort', onAbort)
        }
        if (error) {
          reject(error)
        } else {
          resolve(buffer)
        }
      }

      if (signal?.aborted) {
        finish(new Error('Download aborted'))
        return
      }

      const req = httpModule.request(url, reqOptions, (res) => {
        if (res.statusCode < 200 || res.statusCode >= 300) {
          finish(new Error(`HTTP ${res.statusCode}`))
          return
        }

        const totalBytes = parseInt(res.headers['content-length'] || '0', 10)
        let downloadedBytes = 0
        const chunks = []

        // Update total bytes in database
        if (downloadId && totalBytes > 0) {
          database.updateDownload(downloadId, {
            total_bytes: totalBytes
          })
        }

        res.on('data', (chunk) => {
          chunks.push(chunk)
          downloadedBytes += chunk.length

          // Update progress every 100KB
          if (downloadId && downloadedBytes % (100 * 1024) < chunk.length) {
            database.updateDownload(downloadId, {
              downloaded_bytes: downloadedBytes
            })
          }

          if (progressCallback) {
            progressCallback(downloadedBytes, totalBytes)
          }
        })

        res.on('end', () => {
          const buffer = Buffer.concat(chunks)

          // Final progress update
          if (downloadId) {
            database.updateDownload(downloadId, {
              downloaded_bytes: buffer.length
            })
          }

          if (progressCallback) {
            progressCallback(buffer.length, totalBytes, true)
          }

          finish(null, buffer)
        })
      })

      req.on('error', (error) => {
        if (signal?.aborted) {
          finish(new Error('Download aborted'))
          return
        }
        finish(error)
      })

      req.on('timeout', () => {
        req.destroy()
        finish(new Error('Request timeout'))
      })

      onAbort = signal ? () => {
        req.destroy()
        finish(new Error('Download aborted'))
      } : null

      if (signal && onAbort) {
        signal.addEventListener('abort', onAbort)
      }

      req.end()
    })
  }

  /**
   * Pause download
   */
  pauseDownload(downloadId) {
    const controller = this.activeDownloads.get(downloadId)
    if (controller) {
      controller.abort()
      this.activeDownloads.delete(downloadId)
    }

    database.updateDownload(downloadId, {
      status: 'paused',
      error_message: null
    })

    console.log('[DownloadService] Download paused:', downloadId)
  }

  /**
   * Resume download
   */
  resumeDownload(downloadId) {
    database.updateDownload(downloadId, {
      status: 'pending',
      error_message: null
    })

    console.log('[DownloadService] Download resumed:', downloadId)

    // Process queue
    this.processQueue()
  }

  /**
   * Retry failed download
   */
  retryDownload(downloadId) {
    const download = database.getDownload(downloadId)
    if (!download) return

    if (download.type === 'folder') {
      const allFiles = Array.isArray(download.all_files) ? download.all_files : []
      database.updateDownload(downloadId, {
        status: 'pending',
        error_message: null,
        downloaded_bytes: 0,
        completed_files: 0,
        pending_files: allFiles
      })
    } else {
      database.updateDownload(downloadId, {
        status: 'pending',
        error_message: null,
        downloaded_bytes: 0,
        completed_files: 0
      })
    }

    console.log('[DownloadService] Download retry:', downloadId)

    // Process queue
    this.processQueue()
  }

  /**
   * Cancel and delete download
   */
  deleteDownload(downloadId) {
    // Stop active download
    const controller = this.activeDownloads.get(downloadId)
    if (controller) {
      controller.abort()
      this.activeDownloads.delete(downloadId)
    }

    // Get download info
    const download = database.getDownload(downloadId)

    // Delete local file/folder if exists
    if (download && download.local_path && fs.existsSync(download.local_path)) {
      try {
        const stats = fs.statSync(download.local_path)
        if (stats.isDirectory()) {
          fs.rmSync(download.local_path, { recursive: true, force: true })
        } else {
          fs.unlinkSync(download.local_path)
        }
      } catch (error) {
        console.error('[DownloadService] Failed to delete local path:', error.message)
      }
    }

    // Delete from database
    database.deleteDownload(downloadId)

    console.log('[DownloadService] Download deleted:', downloadId)
  }

  /**
   * Get all downloads
   */
  getAllDownloads() {
    return database.getAllDownloads()
  }

  /**
   * Get download by ID
   */
  getDownload(downloadId) {
    return database.getDownload(downloadId)
  }

  /**
   * Clear completed downloads
   */
  clearCompleted() {
    const downloads = database.getAllDownloads()
    const completed = downloads.filter(d => d.status === 'completed')

    for (const download of completed) {
      database.deleteDownload(download.id)
    }

    console.log('[DownloadService] Cleared completed downloads:', completed.length)

    return completed.length
  }
}

export default new DownloadService()
