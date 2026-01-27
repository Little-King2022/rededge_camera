export default {
  app: {
    title: 'RedEdge监测终端',
    windowControls: {
      exitConfirmTitle: '确认退出',
      exitConfirmContent: '确定要退出程序吗？',
      exitConfirmOk: '退出',
      exitConfirmCancel: '取消'
    }
  },
  nav: {
    connection: '连接',
    preview: '预览',
    capture: '拍照',
    files: '文件',
    status: '状态',
    calibration: '定标',
    alignment: '配准',
    analysis: '分析',
    settings: '设置'
  },
  common: {
    refresh: '刷新',
    reset: '重置',
    save: '保存',
    saveSettings: '保存设置',
    cancel: '取消',
    confirm: '确认',
    delete: '删除',
    edit: '编辑',
    activate: '激活',
    test: '测试',
    actions: '操作',
    status: '状态',
    active: '启用',
    inactive: '未启用',
    never: '从未',
    running: '运行中',
    stopped: '已停止',
    retry: '重试',
    loading: '加载中...',
    start: '开始',
    stop: '停止',
    on: '开启',
    off: '关闭',
    yes: '是',
    no: '否',
    none: '无',
    unknown: '未知',
    days: '天',
    browse: '浏览',
    clear: '清除'
  },
  connect: {
    title: '相机连接管理',
    activeCamera: '当前相机：{name}',
    noActiveTitle: '没有激活的配置',
    noActiveDesc: '请创建并激活一个相机配置',
    addProfile: '添加相机配置',
    columns: {
      name: '名称',
      baseUrl: '基础地址',
      status: '状态',
      lastOk: '最近正常',
      actions: '操作'
    },
    status: {
      active: '已激活',
      inactive: '未激活',
      failures: '{count} 次失败'
    },
    lastOk: {
      never: '从未'
    },
    actions: {
      test: '测试',
      activate: '激活',
      edit: '编辑',
      delete: '删除'
    },
    confirmDelete: '确认删除此配置？',
    modal: {
      addTitle: '添加相机配置',
      editTitle: '编辑相机配置'
    },
    form: {
      nameLabel: '相机配置名称',
      namePlaceholder: '例如：田间相机1',
      protocolLabel: '协议',
      hostLabel: '主机 / IP 地址',
      hostPlaceholder: '例如：1.1.1.1',
      portLabel: '端口',
      pathPrefixLabel: '路径前缀（可选）',
      pathPrefixPlaceholder: '例如：/api'
    },
    messages: {
      requiredFields: '请填写所有必填项',
      profileUpdated: '配置更新成功',
      profileCreated: '配置创建成功',
      saveFailed: '保存配置失败：{error}',
      testSuccess: '连接测试成功',
      testFailed: '连接失败：{error}',
      testFailedGeneric: '连接测试失败：{error}',
      activated: '配置已激活',
      activateFailed: '激活配置失败：{error}',
      deleted: '配置已删除',
      deleteFailed: '删除配置失败：{error}'
    }
  },
  preview: {
    title: '实时预览',
    start: '开始预览',
    stop: '停止预览',
    noActiveTitle: '没有激活的相机配置',
    noActiveDesc: '请先在连接页面激活相机配置。',
    settingsTitle: '设置',
    refreshRate: '刷新频率 (Hz)',
    statsTitle: '预览统计',
    bandvisualization_title: '波段可视化',
    statusLabel: '状态',
    currentRate: '当前速率',
    frameTimestamp: '帧时间',
    lastSuccess: '最近成功',
    consecutiveFailures: '连续失败次数',
    frameSize: '帧大小',
    statusRunning: '运行中',
    statusStopped: '已停止',
    errorTitle: '预览错误',
    retry: '重试',
    empty: '暂无预览图像，点击“开始预览”启动。',
    loading: '正在加载预览...',
    imageAlt: '相机预览',
    messages: {
      noActiveProfile: '未激活相机配置'
    }
  },
  capture: {
    manualTitle: '手动拍照',
    noActiveTitle: '没有激活的相机配置',
    captureNow: '立即拍照',
    captureInitiated: '拍照已触发',
    captureId: '拍照 ID：{id}',
    polling: '轮询中',
    complete: '完成',
    pending: '待处理',
    timerTitle: '相机端定时拍照',
    timerNotSupported: '不支持定时',
    timerNotSupportedDesc: '相机固件不支持定时模式',
    interval: '间隔',
    seconds: '秒',
    minutes: '分钟',
    startTimer: '开始定时',
    stopTimer: '停止定时',
    timerRunning: '定时运行中',
    timerRunningDesc: '每 {interval} {unit} 拍照一次',
    recentTitle: '最近拍照',
    selectAll: '全选',
    unselectAll: '取消全选',
    saveSelected: '保存已选',
    deleteSelected: '删除已选',
    noRecent: '暂无拍照记录',
    item: {
      captureIdTitle: 'ID：{id}',
      description: '类型：{type}\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0状态：{status}\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0时间：{time}'
    },
    bandName: '波段 {index}\u00A0\u00A0{name}',
    bandPreviewAlt: '波段 {index} 预览',
    type: {
      manual: '手动'
    },
    status: {
      pending: '待处理',
      complete: '完成',
      failed: '失败',
      timeout: '超时',
      downloading: '下载中'
    },
    messages: {
      noActiveProfile: '未激活相机配置',
      captureInitiatedToast: '拍照已触发',
      captureFailed: '拍照失败：{error}',
      timerNotSupported: '相机不支持定时模式',
      timerStarted: '定时启动成功',
      timerStartFailed: '启动定时失败：{error}',
      timerStopped: '定时已停止',
      timerStopFailed: '停止定时失败：{error}',
      selectedDeleted: '已删除所选拍照记录',
      exportCanceled: '导出已取消',
      exportSuccess: 'PNG预览图像已导出到：{directory}，TIF原始图像需从文件页面下载',
      exportFailed: '导出失败',
      exportFailedDetail: '导出失败：{error}',
      invalidTiff: '无效的 TIFF 数据',
      canvasNotAvailable: 'Canvas 上下文不可用',
      captureFailedGeneric: '拍照失败',
      pollingError: '轮询错误：{error}',
      pollingTimeout: '轮询超时'
    }
  },
  status: {
    title: '相机状态',
    updated: '更新时间：{time}',
    autoRefreshOn: '自动刷新：开启',
    autoRefreshOff: '自动刷新：关闭',
    refresh: '刷新',
    noActiveTitle: '没有激活的相机配置',
    connectedTo: '已连接：{name}',
    statusFetchFailed: '状态获取失败（{count} 次）',
    storage: '存储',
    noStorage: '无存储',
    gpsSatellites: 'GPS 卫星',
    usedVisible: '已用 / 可见',
    dlsStatus: 'DLS 状态',
    timeInfo: '时间信息',
    utcTime: 'UTC 时间',
    gpsTime: 'GPS 时间',
    timeSource: '时间来源',
    location: '位置',
    latitude: '纬度',
    longitude: '经度',
    positionAccuracy: '定位精度',
    altitudeMsl: '海拔 MSL',
    altitudeAgl: '海拔 AGL',
    speed2d: '速度 (2D)',
    captureConfig: '拍照配置',
    autoCaptureActive: '自动拍照启用',
    busVoltage: '总线电压',
    heading: '航向',
    cameraVersion: '相机版本',
    serialNumber: '序列号',
    softwareVersion: '软件版本',
    imuTitle: 'DLS IMU 传感器数据',
    accelerometer: '加速度计 (m/s²)',
    gyroscope: '陀螺仪 (rad/s)',
    magnetometer: '磁力计 (T)',
    pitch: '俯仰',
    roll: '横滚',
    yaw: '偏航',
    bandInfo: '相机波段信息',
    bandTitle: '波段 {key}：{name}',
    bandType: '类型',
    bandCenter: '中心',
    bandBandwidth: '带宽',
    bandResolution: '分辨率',
    bandFocalLength: '焦距',
    imuModalTitle: 'DLS IMU 3D 可视化',
    bandModalTitle: '相机波段光谱响应',
    sensorsLayout: '相机传感器布局',
    bandCapturePreview: '波段拍摄预览',
    spectralCurves: '光谱响应曲线',
    messages: {
      noActiveProfile: '未激活相机配置'
    }
  },
  files: {
    cameraFiles: '相机文件',
    refresh: '刷新',
    downloadSelected: '下载已选（{count}）',
    deleteSelected: '删除已选（{count}）',
    confirmDeleteSelected: '删除所选项目？',
    formatSdTitle: '格式化 SD 卡？这将清空所有数据！',
    formatSdButton: '格式化 SD 卡',
    noActiveProfile: '未激活相机配置',
    deleting: '正在删除 {completed}/{total}',
    errorLabel: '错误：{error}',
    root: '根目录',
    columns: {
      name: '名称',
      size: '大小',
      actions: '操作'
    },
    download: '下载',
    deleteFile: '删除',
    confirmDeleteFolder: '删除该文件夹及其内容？',
    confirmDeleteFile: '删除该文件？',
    downloadQueue: '下载队列',
    openDownloadFolder: '打开下载目录',
    clearCompleted: '清除已完成',
    emptyDownloads: '下载队列为空',
    pause: '暂停',
    resume: '继续',
    retry: '重试',
    remove: '移除',
    status: {
      pending: '等待中',
      downloading: '下载中',
      paused: '已暂停',
      completed: '已完成',
      failed: '失败'
    },
    formatModal: {
      title: '⚠️ 格式化 SD 卡 - 高危操作',
      okText: '格式化',
      alertTitle: '此操作将清空 SD 卡上的所有数据！',
      alertDesc: '该操作无法撤销，所有照片和数据将永久删除。',
      confirmLabel: '输入 "ERASE" 以确认',
      placeholder: 'ERASE'
    },
    messages: {
      noActiveProfile: '未激活相机配置',
      listFailed: '获取文件列表失败：{error}',
      itemAdded: '已加入下载队列',
      itemsAdded: '已加入下载队列（{count} 项）',
      addQueueFailed: '加入队列失败：{error}',
      noItemsSelected: '未选择任何项目',
      deleteTaskRunning: '已有删除任务正在运行',
      deleteTaskStartFailed: '启动删除任务失败',
      deleteTaskStarted: '删除任务已启动',
      deleteCompleted: '删除完成',
      deleteFailed: '删除失败：{error}',
      confirmErase: '请输入 "ERASE" 以确认',
      formatSuccess: 'SD 卡格式化成功',
      formatFailed: '格式化 SD 卡失败：{error}',
      clearCompleted: '已清除 {count} 个已完成下载',
      clearCompletedFailed: '清除已完成失败：{error}',
      openFolderFailed: '打开目录失败：{error}'
    }
  },
  settings: {
    sidebarTitle: '设置',
    menu: {
      general: '通用设置',
      network: '网络设置',
      license: '软件授权',
      about: '更新与帮助'
    },
    appSettingsTitle: '应用设置',
    general: {
      downloadTitle: '下载设置',
      downloadDir: '下载目录',
      downloadDirPlaceholder: '默认：Downloads/RedEdgeDownloads',
      downloadDirExtra: '留空使用系统默认下载目录',
      concurrent: '并发下载（1-5）',
      concurrentExtra: '默认：1',
      previewTitle: '预览设置',
      previewRate: '预览刷新频率 (Hz)',
      previewExtra: '默认：0.5 Hz（每 2 秒 1 帧）',
      statusTitle: '状态监控设置',
      statusRate: '状态刷新频率（秒）',
      statusExtra: '默认：3 秒',
      loggingTitle: '日志设置',
      enableLogging: '启用日志',
      loggingExtra: '启用详细日志用于排查问题',
      languageTitle: '语言',
      languageLabel: '界面语言'
    },
    network: {
      title: '网络设置',
      timeout: '请求超时（毫秒）',
      timeoutExtra: '默认：30000ms（30 秒）',
      proxyTitle: '代理设置',
      enableProxy: '启用相机 API 代理',
      proxyExtra: '为所有相机 API 请求使用 HTTP/HTTPS 代理',
      proxyUrl: '相机 API 代理地址',
      proxyPlaceholder: '请输入有效的 HTTP/HTTPS 代理地址',
      proxyUrlExtra: '支持 http/https 代理，例如：{example}',
      proxyUrlInvalid: '请输入有效的 HTTP/HTTPS 代理地址',
      adminServerTitle: '管理服务器',
      adminServerUrl: '服务器地址',
      adminServerUrlPlaceholder: 'http://localhost:5000/api'
    },
    update: {
      title: '系统更新',
      checkUpdate: '检查更新',
      downloadUpdate: '下载更新包',
      installUpdate: '安装更新',
      openDownloadFolder: '打开下载目录',
      checking: '正在检查更新...',
      upToDate: '已是最新版本',
      updateAvailable: '发现新版本',
      releaseNotes: '更新日志',
      messages: {
        checkSuccess: '检查更新完成',
        checkFailed: '检查更新失败：{error}',
        upToDate: '当前已是最新版本 v{version}',
        newVersionAvailable: '发现新版本 v{version}',
        downloadSuccess: '下载完成',
        downloadFailed: '下载失败：{error}'
      }
    },
    license: {
      currentStatus: '当前状态',
      trialDays: '试用剩余天数',
      licenseInfo: '授权信息',
      licenseStatus: '授权状态',
      expiryDate: '到期时间',
      userInfo: '用户信息',
      name: '姓名',
      org: '组织',
      contact: '联系方式',
      activateTitle: '激活授权',
      trialAlert: '试用剩余：{days} 天',
      trialDesc: '请输入激活码解锁完整版',
      expiredTitle: '授权已过期',
      expiredDesc: '请输入有效激活码继续使用软件',
      revokedTitle: '授权已吊销',
      revokedDesc: '授权已被服务器吊销，请联系支持或重新激活。',
      activationCode: '激活码',
      activationPlaceholder: '请输入激活码',
      activateButton: '激活',
      validateButton: '验证授权'
    },
    about: {
      versionTitle: '软件版本',
      appVersion: '应用版本',
      build: '构建版本',
      helpTitle: '帮助',
      documentationLabel: '文档：',
      supportLabel: '支持：',
      tips: '提示：检查连接、代理设置与相机电源。',
      companyName: '神农智慧农业研究院南京有限公司',
      companyEmailLabel: '联系邮箱：',
      companyPhoneLabel: '联系电话：',
      companyAddressLabel: '公司地址：',
      companyAddressLine1: '江苏省南京市溧水区白马镇茶兴路9号',
      companyAddressLine2: '江苏省南京市玄武区童卫路4号南京农业生物高新技术创业中心2号楼2楼',
      companyWebsiteLabel: '官方网站：'
    },
    messages: {
      loadFailed: '加载设置失败：{error}',
      saveSuccess: '设置保存成功',
      saveFailed: '保存设置失败：{error}',
      enterActivation: '请输入激活码',
      activationSuccess: '授权激活成功！',
      activationFailed: '激活失败',
      activationFailedDetail: '激活失败：{error}',
      validateSuccess: '授权验证成功',
      validateFailed: '验证失败：{error}'
    },
    status: {
      activated: '已激活',
      expired: '已过期',
      revoked: '已吊销',
      trial: '试用版',
      unknown: '未知状态'
    },
    statusDesc: {
      activated: '授权有效且可用',
      expired: '授权已过期，请激活后继续使用。',
      revoked: '授权已被服务器吊销。',
      trial: '正在使用试用版，剩余 {days} 天。',
      unknown: ''
    },
    languageOptions: {
      en: 'English',
      zh: '简体中文'
    }
  },
  analysis: {
    title: '分析视图',
    placeholder: '这里将实现遥感分析功能。'
  },
  calibration: {
    pythonServiceNotRunning: 'Python 处理服务未运行',
    startService: '启动服务',
    serviceStarted: 'Python 服务启动成功',
    serviceStartFailed: 'Python 服务启动失败',
    tabs: {
      calibration: '辐射定标',
      records: '定标记录',
      batch: '批量处理'
    },
    detection: {
      title: '定标板检测',
      fromFile: '从 TIF 文件加载',
      orManualInput: '或手动输入',
      serialPlaceholder: '输入定标板序列号（例如 RP06-1234567-SC...）',
      parse: '解析'
    },
    result: {
      title: '检测结果',
      empty: '暂无检测结果，请扫码或加载定标板图像。',
      serial: '序列号',
      version: '版本',
      cameraModel: '相机型号',
      wavelengthRange: '波长范围',
      reflectanceRange: '反射率范围',
      bandReflectances: '波段反射率',
      band: '波段',
      wavelength: '波长',
      reflectance: '反射率',
      irradiance: '照度',
      saveRecord: '保存定标'
    },
    save: {
      title: '保存定标记录',
      serial: '序列号',
      notes: '备注',
      notesPlaceholder: '可选，填写定标说明...',
      setAsActive: '设为当前激活定标'
    },
    records: {
      serial: '序列号',
      version: '版本',
      reflectance: '反射率',
      status: '状态',
      createdAt: '创建时间',
      active: '已激活',
      inactive: '未激活',
      activate: '激活',
      view: '查看',
      empty: '暂无定标记录'
    },
    details: {
      title: '定标详情',
      serial: '序列号',
      version: '定标板版本',
      status: '状态',
      active: '已激活',
      inactive: '未激活',
      minWavelength: '最小波长',
      maxWavelength: '最大波长',
      minReflectance: '最小反射率',
      maxReflectance: '最大反射率',
      createdAt: '创建时间',
      notes: '备注',
      bandReflectances: '波段反射率',
      band: '波段',
      wavelength: '波长',
      reflectance: '反射率',
      irradiance: '照度',
      noRecord: '未选择记录'
    },
    batch: {
      config: {
        title: '批量处理配置',
        inputDirectory: '输入目录',
        selectInputDir: '选择输入目录...',
        outputDirectory: '输出目录',
        selectOutputDir: '选择输出目录...',
        calibration: '定标记录',
        selectCalibration: '选择定标记录',
        active: '已激活',
        panelImages: '定标板图像（可选）',
        selectPanelImages: '选择定标板图像...',
        panelImagesHint: '若提供，将使用这些图像重新计算照度',
        filesSelected: '个文件已选择',
        options: '处理选项',
        generateThumbnails: '生成缩略图',
        generateRgbPreview: '生成 RGB 预览图',
        generateNdvi: '生成 NDVI 图',
        start: '开始批量处理'
      },
      progress: {
        title: '处理进度',
        status: '状态',
        processed: '已处理',
        progress: '进度',
        currentCapture: '当前',
        cancel: '取消',
        noJob: '暂无运行中的任务',
        statusText: {
          pending: '等待中',
          running: '运行中',
          completed: '已完成',
          failed: '失败',
          cancelled: '已取消'
        }
      },
      started: '批量处理已开始',
      startFailed: '启动批量处理失败',
      completed: '批量处理完成',
      failed: '批量处理失败',
      cancelled: '批量处理已取消'
    },
    selectFailed: '选择文件失败',
    needFiveBands: '请选择 5 波段图像',
    detectionSuccess: '定标板检测成功',
    parseSuccess: '序列号解析成功',
    parseFailed: '序列号解析失败',
    saveSuccess: '定标记录保存成功',
    saveFailed: '保存定标记录失败',
    activateSuccess: '定标记录已激活',
    deleteConfirm: {
      title: '删除定标记录',
      content: '确定要删除该定标记录吗？'
    },
    deleteSuccess: '定标记录已删除'
  },
  alignment: {
    pythonServiceNotRunning: 'Python 处理服务未运行',
    startService: '启动服务',
    serviceStarted: 'Python 服务启动成功',
    serviceStartFailed: 'Python 服务启动失败',
    workflow: {
      title: '影像配准流程',
      step1: '1. 先进行辐射定标，将原始影像转换为反射率影像',
      step2: '2. 使用定标后的反射率影像进行配准',
      note: '注意：配准应基于辐射定标后的反射率影像，而不是原始影像，以获得更好的特征匹配与精度。'
    },
    warning: {
      title: '输入影像警告',
      useRawImages: '所选影像似乎不是辐射定标后的影像。为获得最佳效果，请使用定标步骤输出的反射率影像。是否继续？'
    },
    tabs: {
      generate: '生成配准矩阵',
      single: '单张配准',
      batch: '批量配准',
      records: '记录'
    },
    generate: {
      title: '生成配准矩阵',
      selectImages: '选择 5 波段图像',
      info: '相机信息',
      cameraModel: '相机型号',
      cameraSerial: '相机序列号',
      recommendedMethod: '推荐方法',
      bands: '波段数',
      bandInfo: '波段信息',
      bandName: '波段名称',
      wavelength: '波长',
      selectImagesFirst: '请先选择图像以查看相机信息',
      method: '配准方法',
      opencvHint: '适用于 RedEdge-M/MX、Altum（基于 ECC）',
      siftHint: '适用于 RedEdge-P、Altum-PT（基于特征）',
      referenceBand: '参考波段',
      maxIterations: '最大迭代次数',
      maxIterationsHint: '数值越大越精确，但耗时更长。',
      pyramidLevels: '金字塔层级',
      pyramidLevelsHint: '0 表示禁用，层级越多越稳健但更慢。',
      compute: '计算配准矩阵'
    },
    single: {
      title: '单张配准',
      selectImages: '输入图像',
      selectImagesPlaceholder: '选择 5 波段图像...',
      filesSelected: '个文件已选择',
      warpMatrix: '配准矩阵',
      selectWarpMatrix: '选择配准矩阵',
      active: '当前',
      outputPath: '输出路径',
      outputPathPlaceholder: '选择输出文件路径...',
      options: '输出选项',
      sortByWavelength: '按波长排序',
      generateRgbPreview: '生成 RGB 预览',
      generateNdvi: '生成 NDVI',
      align: '执行配准'
    },
    batch: {
      title: '批量配准',
      inputDirectory: '输入目录',
      selectInputDir: '选择输入目录...',
      outputDirectory: '输出目录',
      selectOutputDir: '选择输出目录...',
      warpMatrix: '配准矩阵',
      selectWarpMatrix: '选择配准矩阵',
      active: '当前',
      options: '输出选项',
      sortByWavelength: '按波长排序',
      generateRgbPreview: '生成 RGB 预览',
      generateNdvi: '生成 NDVI',
      start: '开始批量配准'
    },
    progress: {
      title: '配准进度',
      status: '状态',
      processed: '已处理',
      progress: '进度',
      currentCapture: '当前',
      cancel: '取消',
      noJob: '暂无运行中的配准任务',
      statusText: {
        pending: '等待中',
        running: '运行中',
        completed: '已完成',
        failed: '失败',
        cancelled: '已取消'
      }
    },
    preview: {
      title: '配准结果',
      success: '配准完成',
      outputPath: '输出路径',
      dimensions: '尺寸',
      rgbPreview: 'RGB 预览',
      ndviPath: 'NDVI 路径',
      openFolder: '打开输出文件夹',
      openFolderFailed: '打开文件夹失败',
      noResult: '暂无配准结果，执行配准后查看。'
    },
    records: {
      matrices: '配准矩阵',
      jobs: '任务历史',
      camera: '相机',
      method: '方法',
      quality: '质量',
      status: '状态',
      createdAt: '创建时间',
      active: '当前',
      inactive: '未激活',
      activate: '激活',
      emptyMatrices: '暂无配准矩阵'
    },
    jobs: {
      id: 'ID',
      type: '类型',
      batch: '批量',
      single: '单张',
      captures: '拍摄数',
      statusCol: '状态',
      createdAt: '创建时间',
      duration: '耗时',
      empty: '暂无任务历史',
      status: {
        pending: '等待中',
        running: '运行中',
        completed: '已完成',
        failed: '失败',
        cancelled: '已取消'
      }
    },
    selectFailed: '选择文件失败',
    needFiveBands: '请选择 5 波段图像',
    currentBands: '当前波段数',
    getCameraInfoFailed: '获取相机信息失败',
    computeSuccess: '配准矩阵计算成功',
    computeFailed: '配准矩阵计算失败',
    alignSuccess: '配准完成',
    alignFailed: '配准失败',
    batchStarted: '批量配准已开始',
    batchStartFailed: '启动批量配准失败',
    batchCompleted: '批量配准完成',
    batchFailed: '批量配准失败',
    batchCancelled: '批量配准已取消',
    activateSuccess: '配准矩阵已激活',
    deleteConfirm: {
      title: '删除配准矩阵',
      content: '确定要删除该配准矩阵吗？'
    },
    deleteSuccess: '配准矩阵已删除'
  },
  statusBar: {
    version: '系统版本',
    licenseStatus: '授权状态',
    activated: '已激活',
    notActivated: '未激活',
    messages: {
      title: '系统消息',
      empty: '暂无消息',
      welcome: '欢迎使用',
      welcomeContent: '欢迎使用 RedEdge 监测终端，开始您的多光谱影像采集与处理工作。',
      systemUpdate: '系统更新',
      systemUpdateContent: '系统已更新到最新版本，请查看更新日志了解新功能。',
      markAllRead: '全部标记为已读'
    },
    help: {
      title: '帮助文档',
      connect: {
        title: '连接管理',
        content: '<p>连接管理页面用于配置和管理相机连接。</p><ul><li>创建新的相机配置文件</li><li>测试相机连接状态</li><li>激活要使用的相机配置</li><li>管理多个相机配置</li></ul><p>使用前请确保相机已开机并与计算机在同一网络。</p>'
      },
      preview: {
        title: '实时预览',
        content: '<p>实时预览页面显示相机实时画面。</p><ul><li>查看相机实时拍摄画面</li><li>调整预览刷新频率</li><li>查看预览统计信息</li><li>支持波段可视化</li></ul><p>预览功能需要先激活相机配置。</p>'
      },
      capture: {
        title: '拍照控制',
        content: '<p>拍照控制页面用于触发和管理拍照任务。</p><ul><li>手动触发单次拍照</li><li>设置定时拍照任务</li><li>查看最近的拍照记录</li><li>下载或导出拍照图像</li></ul><p>拍照后图像会保存在相机 SD 卡中，可在文件页面下载。</p>'
      },
      files: {
        title: '文件管理',
        content: '<p>文件管理页面用于浏览和管理相机文件。</p><ul><li>浏览相机 SD 卡文件</li><li>下载文件到本地</li><li>删除相机文件</li><li>管理下载队列</li><li>格式化 SD 卡</li></ul><p>下载的文件会保存在设置中指定的下载目录。</p>'
      },
      status: {
        title: '状态监控',
        content: '<p>状态监控页面显示相机详细状态信息。</p><ul><li>查看存储空间使用情况</li><li>查看 GPS 定位信息</li><li>查看 DLS 光照传感器数据</li><li>查看 IMU 姿态数据</li><li>查看相机版本和波段信息</li></ul><p>状态信息会定时自动刷新。</p>'
      },
      calibration: {
        title: '辐射定标',
        content: '<p>辐射定标页面用于进行辐射定标处理。</p><ul><li>检测定标板并解析参数</li><li>计算辐射定标系数</li><li>保存和管理定标记录</li><li>批量处理图像定标</li></ul><p>定标前需要使用定标板拍摄图像，并使用 Python 服务进行处理。</p>'
      },
      alignment: {
        title: '影像配准',
        content: '<p>影像配准页面用于多波段影像配准。</p><ul><li>生成配准矩阵</li><li>单张影像配准</li><li>批量影像配准</li><li>管理配准矩阵和任务记录</li></ul><p>配准应基于辐射定标后的反射率影像进行，以获得更好的效果。</p><p><strong>波段配准流程：</strong></p><ol><li>进入“影像配准” -> “生成配准矩阵”。</li><li>选择辐射定标后输出的 5 波段反射率 TIF（例如 output 目录下的同一组）。</li><li>对齐方法建议：RedEdge-M/MX 选 “opencv( ECC )”；RedEdge-P/Altum-PT 可选 “sift”。</li><li>参考波段建议选 Red/RedEdge（默认即可）。</li><li>点击“计算配准矩阵”，等待完成。</li><li>在“配准记录”中将该矩阵设为“激活”。</li><li>进入“批量配准”，选择输入目录（定标后的输出目录）与输出目录。</li><li>选择已激活的配准矩阵，点击开始。</li></ol>'
      },
      settings: {
        title: '设置',
        content: '<p>设置页面用于配置应用程序参数。</p><ul><li>配置下载和预览参数</li><li>配置网络和代理设置</li><li>管理软件授权</li><li>查看软件版本和帮助信息</li></ul><p>修改设置后需要点击保存按钮使设置生效。</p>'
      },
      default: {
        title: '帮助文档',
        content: '<p>这是 RedEdge 监测终端的帮助文档。</p><p>请在不同页面查看对应功能的详细说明。</p>'
      }
    }
  }
}
