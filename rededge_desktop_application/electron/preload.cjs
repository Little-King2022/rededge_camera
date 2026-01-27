const { contextBridge, ipcRenderer } = require('electron')

/**
 * Preload script - exposes safe IPC APIs to Renderer process
 * MUST use CommonJS format (.cjs) for Electron compatibility
 */

contextBridge.exposeInMainWorld('electronAPI', {
  // Camera Profile APIs
  camera: {
    getAllProfiles: () => ipcRenderer.invoke('camera:getAllProfiles'),
    getActiveProfile: () => ipcRenderer.invoke('camera:getActiveProfile'),
    createProfile: (profile) => ipcRenderer.invoke('camera:createProfile', profile),
    updateProfile: (id, profile) => ipcRenderer.invoke('camera:updateProfile', { id, profile }),
    deleteProfile: (id) => ipcRenderer.invoke('camera:deleteProfile', id),
    setActiveProfile: (id) => ipcRenderer.invoke('camera:setActiveProfile', id),

    // Camera API operations
    testConnection: (profileId) => ipcRenderer.invoke('camera:testConnection', profileId),
    getStatus: () => ipcRenderer.invoke('camera:getStatus'),
    getDlsImu: () => ipcRenderer.invoke('camera:getDlsImu'),
    getVersion: () => ipcRenderer.invoke('camera:getVersion'),
    getCameraInfo: () => ipcRenderer.invoke('camera:getCameraInfo'),
    capture: () => ipcRenderer.invoke('camera:capture'),
    getCaptureStatus: (captureId) => ipcRenderer.invoke('camera:getCaptureStatus', captureId),
    getConfig: () => ipcRenderer.invoke('camera:getConfig'),
    setConfig: (config) => ipcRenderer.invoke('camera:setConfig', config),
    startTimer: (intervalSec) => ipcRenderer.invoke('camera:startTimer', intervalSec),
    stopTimer: () => ipcRenderer.invoke('camera:stopTimer'),
    probeCapabilities: () => ipcRenderer.invoke('camera:probeCapabilities'),

    // File management
    listFiles: (remotePath) => ipcRenderer.invoke('camera:listFiles', remotePath),
    deleteFile: (remotePath) => ipcRenderer.invoke('camera:deleteFile', remotePath),
    deletePaths: (items) => ipcRenderer.invoke('camera:deletePaths', items),
    getDeleteTask: (taskId) => ipcRenderer.invoke('camera:getDeleteTask', taskId),
    getActiveDeleteTask: () => ipcRenderer.invoke('camera:getActiveDeleteTask'),
    formatSDCard: () => ipcRenderer.invoke('camera:formatSDCard')
  },

  // Preview APIs
  preview: {
    getFrame: () => ipcRenderer.invoke('preview:getFrame'),
    stopStream: () => ipcRenderer.invoke('preview:stopStream')
  },

  // Download APIs
  download: {
    addToQueue: (files) => ipcRenderer.invoke('download:addToQueue', files),
    getAll: () => ipcRenderer.invoke('download:getAll'),
    pause: (downloadId) => ipcRenderer.invoke('download:pause', downloadId),
    resume: (downloadId) => ipcRenderer.invoke('download:resume', downloadId),
    retry: (downloadId) => ipcRenderer.invoke('download:retry', downloadId),
    delete: (downloadId) => ipcRenderer.invoke('download:delete', downloadId),
    clearCompleted: () => ipcRenderer.invoke('download:clearCompleted'),
    openDirectory: () => ipcRenderer.invoke('download:openDirectory')
  },

  // Settings APIs
  settings: {
    get: (key) => ipcRenderer.invoke('settings:get', key),
    set: (key, value) => ipcRenderer.invoke('settings:set', { key, value }),
    getAll: () => ipcRenderer.invoke('settings:getAll')
  },

  // Capture history APIs
  captureHistory: {
    get: () => ipcRenderer.invoke('captureHistory:get'),
    set: (captures) => ipcRenderer.invoke('captureHistory:set', captures),
    export: (payload) => ipcRenderer.invoke('captureHistory:export', payload)
  },

  // License APIs
  license: {
    getInfo: () => ipcRenderer.invoke('license:getInfo'),
    activate: (activationCode) => ipcRenderer.invoke('license:activate', activationCode),
    validate: () => ipcRenderer.invoke('license:validate')
  },

  // App utilities
  app: {
    openExternal: (url) => ipcRenderer.invoke('app:openExternal', url),
    openPath: (path) => ipcRenderer.invoke('app:openPath', path),
    showItemInFolder: (path) => ipcRenderer.invoke('app:showItemInFolder', path)
  },

  window: {
    minimize: () => ipcRenderer.invoke('window:minimize'),
    toggleMaximize: () => ipcRenderer.invoke('window:toggleMaximize'),
    close: () => ipcRenderer.invoke('window:close')
  },

  // Python Service APIs
  python: {
    getStatus: () => ipcRenderer.invoke('python:getStatus'),
    start: () => ipcRenderer.invoke('python:start'),
    stop: () => ipcRenderer.invoke('python:stop')
  },

  // Calibration APIs
  calibration: {
    // QR码识别
    scanQR: (imageBase64) => ipcRenderer.invoke('calibration:scanQR', imageBase64),
    // 从文件检测定标板
    detectFromFiles: (panelImagePaths) => ipcRenderer.invoke('calibration:detectFromFiles', panelImagePaths),
    // 计算照度
    calculateIrradiance: (panelImagePaths, reflectances) => ipcRenderer.invoke('calibration:calculateIrradiance', { panelImagePaths, reflectances }),
    // 解析序列号
    parseSerial: (serial) => ipcRenderer.invoke('calibration:parseSerial', serial),
    // 保存定标记录
    save: (record) => ipcRenderer.invoke('calibration:save', record),
    // 获取所有定标记录
    getAll: () => ipcRenderer.invoke('calibration:getAll'),
    // 获取单个定标记录
    get: (id) => ipcRenderer.invoke('calibration:get', id),
    // 获取当前激活的定标记录
    getActive: () => ipcRenderer.invoke('calibration:getActive'),
    // 设置激活的定标记录
    setActive: (id) => ipcRenderer.invoke('calibration:setActive', id),
    // 删除定标记录
    delete: (id) => ipcRenderer.invoke('calibration:delete', id),
    // 选择定标板图像
    selectPanelImages: () => ipcRenderer.invoke('calibration:selectPanelImages')
  },

  // Alignment APIs
  alignment: {
    // 选择5波段图像
    selectImages: () => ipcRenderer.invoke('alignment:selectImages'),
    // 获取相机信息
    getCameraInfo: (imagePaths) => ipcRenderer.invoke('alignment:getCameraInfo', imagePaths),
    // 计算配准矩阵
    computeWarpMatrices: (imagePaths, options) => ipcRenderer.invoke('alignment:computeWarpMatrices', { imagePaths, options }),
    // 获取配准矩阵计算状态
    getComputeWarpMatricesStatus: (jobId) => ipcRenderer.invoke('alignment:getComputeWarpMatricesStatus', jobId),
    // 获取配准矩阵计算任务
    getWarpMatrixJobs: () => ipcRenderer.invoke('alignment:getWarpMatrixJobs'),
    // 删除配准矩阵计算任务
    deleteWarpMatrixJob: (jobId) => ipcRenderer.invoke('alignment:deleteWarpMatrixJob', jobId),
    // 获取所有配准矩阵记录
    getWarpMatrices: () => ipcRenderer.invoke('alignment:getWarpMatrices'),
    // 获取指定相机的配准矩阵记录
    getWarpMatricesByCamera: (cameraSerial) => ipcRenderer.invoke('alignment:getWarpMatricesByCamera', cameraSerial),
    // 获取当前激活的配准矩阵
    getActiveMatrix: (cameraSerial) => ipcRenderer.invoke('alignment:getActiveMatrix', cameraSerial),
    // 设置激活的配准矩阵
    setActiveMatrix: (id) => ipcRenderer.invoke('alignment:setActiveMatrix', id),
    // 删除配准矩阵记录
    deleteMatrix: (id) => ipcRenderer.invoke('alignment:deleteMatrix', id),
    // 单张配准
    alignSingle: (imagePaths, warpMatrixId, outputPath, options) => ipcRenderer.invoke('alignment:alignSingle', { imagePaths, warpMatrixId, outputPath, options }),
    // 批量配准
    alignBatch: (inputDirectory, outputDirectory, warpMatrixId, options) => ipcRenderer.invoke('alignment:alignBatch', { inputDirectory, outputDirectory, warpMatrixId, options }),
    // 获取配准任务状态
    getJobStatus: (jobId) => ipcRenderer.invoke('alignment:getJobStatus', jobId),
    // 取消配准任务
    cancelJob: (jobId) => ipcRenderer.invoke('alignment:cancelJob', jobId),
    // 获取任务历史
    getJobHistory: (limit) => ipcRenderer.invoke('alignment:getJobHistory', limit),
    // 选择输出目录
    selectOutputDirectory: () => ipcRenderer.invoke('alignment:selectOutputDirectory'),
    // 选择输入目录
    selectInputDirectory: () => ipcRenderer.invoke('alignment:selectInputDirectory')
  },

  // Batch Processing APIs
  batch: {
    // 选择输入目录
    selectInputDirectory: () => ipcRenderer.invoke('batch:selectInputDirectory'),
    // 选择输出目录
    selectOutputDirectory: () => ipcRenderer.invoke('batch:selectOutputDirectory'),
    // 启动批处理
    start: (config) => ipcRenderer.invoke('batch:start', config),
    // 获取任务状态
    getStatus: (jobId) => ipcRenderer.invoke('batch:getStatus', jobId),
    // 取消任务
    cancel: (jobId) => ipcRenderer.invoke('batch:cancel', jobId),
    // 获取任务历史
    getJobHistory: (limit) => ipcRenderer.invoke('batch:getJobHistory', limit)
  },

  // System Info APIs
  system: {
    getInfo: () => ipcRenderer.invoke('system:getInfo'),
    getVersion: () => ipcRenderer.invoke('system:getVersion')
  },

  // Admin Client APIs
  admin: {
    getSettings: () => ipcRenderer.invoke('admin:getSettings'),
    updateSettings: (settings) => ipcRenderer.invoke('admin:updateSettings', settings),
    checkConnection: () => ipcRenderer.invoke('admin:checkConnection'),
    activateLicense: (activationCode) => ipcRenderer.invoke('admin:activateLicense', activationCode),
    validateLicense: () => ipcRenderer.invoke('admin:validateLicense'),
    checkUpdates: () => ipcRenderer.invoke('admin:checkUpdates'),
    downloadUpdate: (versionId) => ipcRenderer.invoke('admin:downloadUpdate', versionId),
    syncCameraConfigs: () => ipcRenderer.invoke('admin:syncCameraConfigs'),
    getHeartbeatStatus: () => ipcRenderer.invoke('admin:getHeartbeatStatus'),
    getOfflineMode: () => ipcRenderer.invoke('admin:getOfflineMode')
  }
})

console.log('[Preload] Context bridge established')
