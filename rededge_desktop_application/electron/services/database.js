import Store from 'electron-store'

// Initialize electron-store with schema
const store = new Store({
  defaults: {
    camera_profiles: [],
    app_settings: {
      download_directory: '',
      download_max_concurrent: '1',
      preview_refresh_rate: '0.5',
      status_refresh_rate: '3',
      request_timeout: '30000',
      enable_logging: 'true',
      camera_proxy_enabled: 'false',
      camera_proxy_url: ''
    },
    recent_captures: [],
    download_queue: [],
    capture_jobs: [],
    license_state: {
      id: 1,
      status: 'trial',
      device_fingerprint: '',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    // 辐射定标记录
    calibration_records: [],
    // 配准矩阵记录
    warp_matrices_records: [],
    // 配准矩阵计算任务
    warp_matrix_jobs: [],
    // 配准任务记录
    alignment_jobs: [],
    // 批处理任务记录
    batch_jobs: []
  }
})

class DatabaseService {
  constructor() {
    this.store = store
  }

  initialize() {
    console.log('[DatabaseService] Initializing electron-store...')

    // Ensure license state has device fingerprint initialized
    const license = this.getLicenseState()
    if (!license.device_fingerprint) {
      this.updateLicenseState({
        device_fingerprint: '',
        created_at: new Date().toISOString()
      })
    }

    console.log('[DatabaseService] Database initialized successfully')
  }

  // Helper: Generate auto-increment ID
  _getNextId(arrayKey) {
    const items = this.store.get(arrayKey, [])
    if (items.length === 0) return 1
    return Math.max(...items.map(item => item.id)) + 1
  }

  // Camera Profiles Repository
  getAllProfiles() {
    return this.store.get('camera_profiles', [])
  }

  getActiveProfile() {
    const profiles = this.getAllProfiles()
    return profiles.find(p => p.is_active === 1) || null
  }

  getProfile(id) {
    const profiles = this.getAllProfiles()
    return profiles.find(p => p.id === id) || null
  }

  createProfile(profile) {
    const profiles = this.getAllProfiles()
    const now = new Date().toISOString()
    const id = this._getNextId('camera_profiles')

    const newProfile = {
      id,
      name: profile.name,
      protocol: profile.protocol || 'http',
      host: profile.host,
      port: profile.port,
      path_prefix: profile.path_prefix || '',
      is_active: 0,
      last_ok_at: null,
      consecutive_failures: 0,
      created_at: now,
      updated_at: now
    }

    profiles.push(newProfile)
    this.store.set('camera_profiles', profiles)
    return id
  }

  updateProfile(id, updates) {
    const profiles = this.getAllProfiles()
    const index = profiles.findIndex(p => p.id === id)

    if (index === -1) return

    const now = new Date().toISOString()
    profiles[index] = {
      ...profiles[index],
      ...updates,
      updated_at: now
    }

    this.store.set('camera_profiles', profiles)
  }

  deleteProfile(id) {
    const profiles = this.getAllProfiles()
    const filtered = profiles.filter(p => p.id !== id)
    this.store.set('camera_profiles', filtered)
  }

  setActiveProfile(id) {
    const profiles = this.getAllProfiles()
    const updated = profiles.map(p => ({
      ...p,
      is_active: p.id === id ? 1 : 0
    }))
    this.store.set('camera_profiles', updated)
  }

  // Settings Repository
  getSetting(key) {
    const settings = this.store.get('app_settings', {})
    return settings[key] || null
  }

  setSetting(key, value) {
    const settings = this.store.get('app_settings', {})
    settings[key] = value
    this.store.set('app_settings', settings)
  }

  getAllSettings() {
    return this.store.get('app_settings', {})
  }

  // Recent Captures Repository
  getRecentCaptures() {
    return this.store.get('recent_captures', [])
  }

  setRecentCaptures(captures) {
    const safeCaptures = Array.isArray(captures) ? captures : []
    this.store.set('recent_captures', safeCaptures)
  }

  // Download Queue Repository
  getAllDownloads() {
    return this.store.get('download_queue', [])
  }

  getPendingDownloads() {
    const downloads = this.getAllDownloads()
    return downloads.filter(d => d.status === 'pending' || d.status === 'downloading')
  }

  getDownload(id) {
    const downloads = this.getAllDownloads()
    return downloads.find(d => d.id === id) || null
  }

  createDownload(download) {
    const downloads = this.getAllDownloads()
    const now = new Date().toISOString()
    const id = this._getNextId('download_queue')

    const newDownload = {
      id,
      camera_profile_id: download.camera_profile_id,
      remote_path: download.remote_path,
      local_path: download.local_path,
      status: download.status || 'pending',
      total_bytes: download.total_bytes || 0,
      downloaded_bytes: download.downloaded_bytes || 0,
      type: download.type || 'file',
      total_files: download.total_files || (download.type === 'folder' ? 0 : 1),
      completed_files: download.completed_files || 0,
      pending_files: download.pending_files || [],
      all_files: download.all_files || [],
      error_message: null,
      created_at: now,
      updated_at: now
    }

    downloads.push(newDownload)
    this.store.set('download_queue', downloads)
    return id
  }

  updateDownload(id, updates) {
    const downloads = this.getAllDownloads()
    const index = downloads.findIndex(d => d.id === id)

    if (index === -1) return

    const now = new Date().toISOString()
    downloads[index] = {
      ...downloads[index],
      ...updates,
      updated_at: now
    }

    this.store.set('download_queue', downloads)
  }

  deleteDownload(id) {
    const downloads = this.getAllDownloads()
    const filtered = downloads.filter(d => d.id !== id)
    this.store.set('download_queue', filtered)
  }

  // Capture Jobs Repository
  createCaptureJob(job) {
    const jobs = this.store.get('capture_jobs', [])
    const now = new Date().toISOString()
    const id = this._getNextId('capture_jobs')

    const newJob = {
      id,
      type: job.type,
      interval_sec: job.interval_sec,
      status: job.status,
      last_capture_id: null,
      created_at: now,
      updated_at: now
    }

    jobs.push(newJob)
    this.store.set('capture_jobs', jobs)
    return id
  }

  updateCaptureJob(id, updates) {
    const jobs = this.store.get('capture_jobs', [])
    const index = jobs.findIndex(j => j.id === id)

    if (index === -1) return

    const now = new Date().toISOString()
    jobs[index] = {
      ...jobs[index],
      ...updates,
      updated_at: now
    }

    this.store.set('capture_jobs', jobs)
  }

  getRecentCaptureJobs(limit = 10) {
    const jobs = this.store.get('capture_jobs', [])
    return jobs.slice(-limit).reverse()
  }

  // License Repository
  getLicenseState() {
    return this.store.get('license_state', {
      id: 1,
      status: 'trial',
      device_fingerprint: '',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
  }

  updateLicenseState(updates) {
    const current = this.getLicenseState()
    const now = new Date().toISOString()

    const updated = {
      ...current,
      ...updates,
      id: 1, // Always keep id as 1
      updated_at: now
    }

    this.store.set('license_state', updated)
  }

  // Calibration Records Repository
  getAllCalibrationRecords() {
    return this.store.get('calibration_records', [])
  }

  getCalibrationRecord(id) {
    const records = this.getAllCalibrationRecords()
    return records.find(r => r.id === id) || null
  }

  getActiveCalibrationRecord() {
    const records = this.getAllCalibrationRecords()
    return records.find(r => r.is_active === true) || null
  }

  createCalibrationRecord(record) {
    const records = this.getAllCalibrationRecords()
    const now = new Date().toISOString()
    const id = this._getNextId('calibration_records')

    const newRecord = {
      id,
      serial: record.serial,
      panel_version: record.panel_version,
      min_wavelength: record.min_wavelength,
      min_reflectance: record.min_reflectance,
      max_wavelength: record.max_wavelength,
      max_reflectance: record.max_reflectance,
      band_reflectances: record.band_reflectances || {},
      panel_irradiance: record.panel_irradiance || [],
      is_active: false,
      notes: record.notes || '',
      created_at: now
    }

    records.push(newRecord)
    this.store.set('calibration_records', records)
    return id
  }

  updateCalibrationRecord(id, updates) {
    const records = this.getAllCalibrationRecords()
    const index = records.findIndex(r => r.id === id)

    if (index === -1) return

    records[index] = {
      ...records[index],
      ...updates
    }

    this.store.set('calibration_records', records)
  }

  setActiveCalibrationRecord(id) {
    const records = this.getAllCalibrationRecords()
    const updated = records.map(r => ({
      ...r,
      is_active: r.id === id
    }))
    this.store.set('calibration_records', updated)
  }

  deleteCalibrationRecord(id) {
    const records = this.getAllCalibrationRecords()
    const filtered = records.filter(r => r.id !== id)
    this.store.set('calibration_records', filtered)
  }

  // Warp Matrices Records Repository
  getAllWarpMatricesRecords() {
    return this.store.get('warp_matrices_records', [])
  }

  getWarpMatricesRecord(id) {
    const records = this.getAllWarpMatricesRecords()
    return records.find(r => r.id === id) || null
  }

  getActiveWarpMatricesRecord(cameraSerial = null) {
    const records = this.getAllWarpMatricesRecords()
    if (cameraSerial) {
      return records.find(r => r.camera_serial === cameraSerial && r.is_active === true) || null
    }
    return records.find(r => r.is_active === true) || null
  }

  getWarpMatricesRecordsByCameraSerial(cameraSerial) {
    const records = this.getAllWarpMatricesRecords()
    return records.filter(r => r.camera_serial === cameraSerial)
  }

  createWarpMatricesRecord(record) {
    const records = this.getAllWarpMatricesRecords()
    const now = new Date().toISOString()
    const id = this._getNextId('warp_matrices_records')

    const newRecord = {
      id,
      camera_serial: record.camera_serial,
      camera_model: record.camera_model,
      alignment_method: record.alignment_method,
      reference_band: record.reference_band,
      warp_matrices_path: record.warp_matrices_path,
      source_capture_id: record.source_capture_id || null,
      source_image_path: record.source_image_path || null,
      is_active: false,
      alignment_quality: record.alignment_quality || 0,
      cropped_dimensions: record.cropped_dimensions || null,
      notes: record.notes || '',
      created_at: now,
      updated_at: now
    }

    records.push(newRecord)
    this.store.set('warp_matrices_records', records)
    return id
  }

  updateWarpMatricesRecord(id, updates) {
    const records = this.getAllWarpMatricesRecords()
    const index = records.findIndex(r => r.id === id)

    if (index === -1) return

    const now = new Date().toISOString()
    records[index] = {
      ...records[index],
      ...updates,
      updated_at: now
    }

    this.store.set('warp_matrices_records', records)
  }

  setActiveWarpMatricesRecord(id) {
    const records = this.getAllWarpMatricesRecords()
    const targetRecord = records.find(r => r.id === id)
    if (!targetRecord) return

    // 只取消同一相机的其他记录的激活状态
    const updated = records.map(r => ({
      ...r,
      is_active: r.id === id ? true : (r.camera_serial === targetRecord.camera_serial ? false : r.is_active)
    }))
    this.store.set('warp_matrices_records', updated)
  }

  deleteWarpMatricesRecord(id) {
    const records = this.getAllWarpMatricesRecords()
    const filtered = records.filter(r => r.id !== id)
    this.store.set('warp_matrices_records', filtered)
  }

  // Warp Matrix Jobs Repository
  getAllWarpMatrixJobs() {
    return this.store.get('warp_matrix_jobs', [])
  }

  getWarpMatrixJobByJobId(jobId) {
    const jobs = this.getAllWarpMatrixJobs()
    return jobs.find(j => j.job_id === jobId) || null
  }

  getActiveWarpMatrixJob() {
    const jobs = this.getAllWarpMatrixJobs()
    return jobs.find(j => j.status === 'pending' || j.status === 'running') || null
  }

  createWarpMatrixJob(job) {
    const jobs = this.getAllWarpMatrixJobs()
    const now = new Date().toISOString()
    const id = this._getNextId('warp_matrix_jobs')

    const newJob = {
      id,
      job_id: job.job_id,
      status: job.status || 'pending',
      progress: job.progress || 0,
      message: job.message || 'queued',
      output_path: job.output_path || null,
      image_paths: job.image_paths || [],
      options: job.options || {},
      record_id: null,
      error_message: null,
      started_at: null,
      completed_at: null,
      created_at: now,
      updated_at: now
    }

    jobs.push(newJob)
    this.store.set('warp_matrix_jobs', jobs)
    return id
  }

  updateWarpMatrixJob(jobId, updates) {
    const jobs = this.getAllWarpMatrixJobs()
    const index = jobs.findIndex(j => j.job_id === jobId)

    if (index === -1) return

    const now = new Date().toISOString()
    jobs[index] = {
      ...jobs[index],
      ...updates,
      updated_at: now
    }

    this.store.set('warp_matrix_jobs', jobs)
  }

  deleteWarpMatrixJob(jobId) {
    const jobs = this.getAllWarpMatrixJobs()
    const filtered = jobs.filter(j => j.job_id !== jobId)
    this.store.set('warp_matrix_jobs', filtered)
  }

  // Alignment Jobs Repository
  getAllAlignmentJobs() {
    return this.store.get('alignment_jobs', [])
  }

  getAlignmentJob(id) {
    const jobs = this.getAllAlignmentJobs()
    return jobs.find(j => j.id === id) || null
  }

  createAlignmentJob(job) {
    const jobs = this.getAllAlignmentJobs()
    const now = new Date().toISOString()
    const id = this._getNextId('alignment_jobs')

    const newJob = {
      id,
      job_type: job.job_type, // 'single' | 'batch'
      warp_matrix_id: job.warp_matrix_id,
      input_path: job.input_path,
      output_directory: job.output_directory,
      status: 'pending',
      total_captures: job.total_captures || 1,
      processed_captures: 0,
      options: job.options || {},
      error_message: null,
      started_at: null,
      completed_at: null,
      created_at: now
    }

    jobs.push(newJob)
    this.store.set('alignment_jobs', jobs)
    return id
  }

  updateAlignmentJob(id, updates) {
    const jobs = this.getAllAlignmentJobs()
    const index = jobs.findIndex(j => j.id === id)

    if (index === -1) return

    jobs[index] = {
      ...jobs[index],
      ...updates
    }

    this.store.set('alignment_jobs', jobs)
  }

  getRecentAlignmentJobs(limit = 20) {
    const jobs = this.getAllAlignmentJobs()
    return jobs.slice(-limit).reverse()
  }

  deleteAlignmentJob(id) {
    const jobs = this.getAllAlignmentJobs()
    const filtered = jobs.filter(j => j.id !== id)
    this.store.set('alignment_jobs', filtered)
  }

  // Batch Jobs Repository
  getAllBatchJobs() {
    return this.store.get('batch_jobs', [])
  }

  getBatchJob(id) {
    const jobs = this.getAllBatchJobs()
    return jobs.find(j => j.id === id) || null
  }

  createBatchJob(job) {
    const jobs = this.getAllBatchJobs()
    const now = new Date().toISOString()
    const id = this._getNextId('batch_jobs')

    const newJob = {
      id,
      calibration_id: job.calibration_id,
      input_directory: job.input_directory,
      output_directory: job.output_directory,
      status: 'pending',
      total_captures: job.total_captures || 0,
      processed_captures: 0,
      options: job.options || {},
      error_message: null,
      started_at: null,
      completed_at: null,
      created_at: now
    }

    jobs.push(newJob)
    this.store.set('batch_jobs', jobs)
    return id
  }

  updateBatchJob(id, updates) {
    const jobs = this.getAllBatchJobs()
    const index = jobs.findIndex(j => j.id === id)

    if (index === -1) return

    jobs[index] = {
      ...jobs[index],
      ...updates
    }

    this.store.set('batch_jobs', jobs)
  }

  getRecentBatchJobs(limit = 20) {
    const jobs = this.getAllBatchJobs()
    return jobs.slice(-limit).reverse()
  }

  deleteBatchJob(id) {
    const jobs = this.getAllBatchJobs()
    const filtered = jobs.filter(j => j.id !== id)
    this.store.set('batch_jobs', filtered)
  }

  close() {
    console.log('[DatabaseService] Closing database (electron-store auto-saves)')
  }
}

export default new DatabaseService()
