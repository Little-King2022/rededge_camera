export default {
  app: {
    title: 'RedEdge Monitoring Console',
    windowControls: {
      exitConfirmTitle: 'Confirm Exit',
      exitConfirmContent: 'Are you sure you want to exit the application?',
      exitConfirmOk: 'Exit',
      exitConfirmCancel: 'Cancel'
    }
  },
  nav: {
    connection: 'Connection',
    preview: 'Preview',
    capture: 'Capture',
    files: 'Files',
    status: 'Status',
    calibration: 'Calibration',
    alignment: 'Alignment',
    analysis: 'Analysis',
    settings: 'Settings'
  },
  common: {
    refresh: 'Refresh',
    reset: 'Reset',
    save: 'Save',
    saveSettings: 'Save Settings',
    cancel: 'Cancel',
    confirm: 'Confirm',
    delete: 'Delete',
    edit: 'Edit',
    activate: 'Activate',
    test: 'Test',
    actions: 'Actions',
    status: 'Status',
    active: 'Active',
    inactive: 'Inactive',
    never: 'Never',
    running: 'Running',
    stopped: 'Stopped',
    retry: 'Retry',
    loading: 'Loading...',
    start: 'Start',
    stop: 'Stop',
    on: 'ON',
    off: 'OFF',
    yes: 'Yes',
    no: 'No',
    none: 'None',
    unknown: 'Unknown',
    days: 'days',
    browse: 'Browse',
    clear: 'Clear'
  },
  connect: {
    title: 'Camera Connection Management',
    activeCamera: 'Active Camera: {name}',
    noActiveTitle: 'No Active Profile',
    noActiveDesc: 'Please create and activate a camera profile',
    addProfile: 'Add Camera Profile',
    columns: {
      name: 'Name',
      baseUrl: 'Base URL',
      status: 'Status',
      lastOk: 'Last OK',
      actions: 'Actions'
    },
    status: {
      active: 'Active',
      inactive: 'Inactive',
      failures: '{count} failures'
    },
    lastOk: {
      never: 'Never'
    },
    actions: {
      test: 'Test',
      activate: 'Activate',
      edit: 'Edit',
      delete: 'Delete'
    },
    confirmDelete: 'Delete this profile?',
    modal: {
      addTitle: 'Add Camera Profile',
      editTitle: 'Edit Camera Profile'
    },
    form: {
      nameLabel: 'Camera Profile Name',
      namePlaceholder: 'e.g., Field Camera 1',
      protocolLabel: 'Protocol',
      hostLabel: 'Host / IP Address',
      hostPlaceholder: 'e.g., 1.1.1.1',
      portLabel: 'Port',
      pathPrefixLabel: 'Path Prefix (optional)',
      pathPrefixPlaceholder: 'e.g., /api'
    },
    messages: {
      requiredFields: 'Please fill in all required fields',
      profileUpdated: 'Profile updated successfully',
      profileCreated: 'Profile created successfully',
      saveFailed: 'Failed to save profile: {error}',
      testSuccess: 'Connection test successful',
      testFailed: 'Connection failed: {error}',
      testFailedGeneric: 'Connection test failed: {error}',
      activated: 'Profile activated',
      activateFailed: 'Failed to activate profile: {error}',
      deleted: 'Profile deleted',
      deleteFailed: 'Failed to delete profile: {error}'
    }
  },
  preview: {
    title: 'Live Preview',
    start: 'Start Preview',
    stop: 'Stop Preview',
    noActiveTitle: 'No Active Camera Profile',
    noActiveDesc: 'Please go to Connection page and activate a camera profile first.',
    settingsTitle: 'Settings',
    refreshRate: 'Refresh Rate (Hz)',
    statsTitle: 'Preview Statistics',
    bandvisualization_title: 'Band Visualization',
    statusLabel: 'Status',
    currentRate: 'Current Rate',
    frameTimestamp: 'Frame Timestamp',
    lastSuccess: 'Last Success',
    consecutiveFailures: 'Consecutive Failures',
    frameSize: 'Frame Size',
    statusRunning: 'Running',
    statusStopped: 'Stopped',
    errorTitle: 'Preview Error',
    retry: 'Retry',
    empty: 'No preview image. Click Start Preview to begin.',
    loading: 'Loading preview...',
    imageAlt: 'Camera Preview',
    messages: {
      noActiveProfile: 'No active camera profile'
    }
  },
  capture: {
    manualTitle: 'Manual Capture',
    noActiveTitle: 'No Active Camera Profile',
    captureNow: 'Capture Now',
    captureInitiated: 'Capture Initiated',
    captureId: 'Capture ID: {id}',
    polling: 'Polling',
    complete: 'Complete',
    pending: 'Pending',
    timerTitle: 'Camera-Side Timer Capture',
    timerNotSupported: 'Timer Not Supported',
    timerNotSupportedDesc: 'Camera firmware does not support timer mode',
    interval: 'Interval',
    seconds: 'Seconds',
    minutes: 'Minutes',
    startTimer: 'Start Timer',
    stopTimer: 'Stop Timer',
    timerRunning: 'Timer Running',
    timerRunningDesc: 'Capturing every {interval} {unit}',
    recentTitle: 'Recent Captures',
    selectAll: 'Select All',
    unselectAll: 'Unselect All',
    saveSelected: 'Save Selected',
    deleteSelected: 'Delete Selected',
    noRecent: 'No recent captures',
    item: {
      captureIdTitle: 'Capture ID: {id}',
      description: 'Type: {type}\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0Status: {status}\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0Time: {time}'
    },
    bandName: 'Band {index}\u00A0\u00A0{name}',
    bandPreviewAlt: 'Band {index} Preview',
    type: {
      manual: 'Manual'
    },
    status: {
      pending: 'Pending',
      complete: 'Complete',
      failed: 'Failed',
      timeout: 'Timeout',
      downloading: 'Downloading'
    },
    messages: {
      noActiveProfile: 'No active camera profile',
      captureInitiatedToast: 'Capture initiated: {id}',
      captureFailed: 'Capture failed: {error}',
      timerNotSupported: 'Timer mode not supported by camera',
      timerStarted: 'Timer started successfully',
      timerStartFailed: 'Failed to start timer: {error}',
      timerStopped: 'Timer stopped successfully',
      timerStopFailed: 'Failed to stop timer: {error}',
      selectedDeleted: 'Selected captures deleted',
      exportCanceled: 'Export canceled',
      exportSuccess: 'Exported to: {directory}',
      exportFailed: 'Export failed',
      exportFailedDetail: 'Export failed: {error}',
      invalidTiff: 'Invalid TIFF data',
      canvasNotAvailable: 'Canvas context not available',
      captureFailedGeneric: 'Capture failed',
      pollingError: 'Polling error: {error}',
      pollingTimeout: 'Polling timeout'
    }
  },
  status: {
    title: 'Camera Status',
    updated: 'Updated: {time}',
    autoRefreshOn: 'Auto Refresh: ON',
    autoRefreshOff: 'Auto Refresh: OFF',
    refresh: 'Refresh',
    noActiveTitle: 'No Active Camera Profile',
    connectedTo: 'Connected to: {name}',
    statusFetchFailed: 'Status Fetch Failed ({count} failures)',
    storage: 'Storage',
    noStorage: 'No Storage',
    gpsSatellites: 'GPS Satellites',
    usedVisible: 'Used / Visible',
    dlsStatus: 'DLS Status',
    timeInfo: 'Time Information',
    utcTime: 'UTC Time',
    gpsTime: 'GPS Time',
    timeSource: 'Time Source',
    location: 'Location',
    latitude: 'Latitude',
    longitude: 'Longitude',
    positionAccuracy: 'Position Accuracy',
    altitudeMsl: 'Altitude MSL',
    altitudeAgl: 'Altitude AGL',
    speed2d: 'Speed (2D)',
    captureConfig: 'Capture Configuration',
    autoCaptureActive: 'Auto Capture Active',
    busVoltage: 'Bus Voltage',
    heading: 'Heading',
    cameraVersion: 'Camera Version',
    serialNumber: 'Serial Number',
    softwareVersion: 'Software Version',
    imuTitle: 'DLS IMU Sensor Data',
    accelerometer: 'Accelerometer (m/s²)',
    gyroscope: 'Gyroscope (rad/s)',
    magnetometer: 'Magnetometer (T)',
    pitch: 'Pitch',
    roll: 'Roll',
    yaw: 'Yaw',
    bandInfo: 'Camera Band Information',
    bandTitle: 'Band {key}: {name}',
    bandType: 'Type',
    bandCenter: 'Center',
    bandBandwidth: 'Bandwidth',
    bandResolution: 'Resolution',
    bandFocalLength: 'Focal Length',
    imuModalTitle: 'DLS IMU 3D Visualization',
    bandModalTitle: 'Camera Band Spectral Response',
    sensorsLayout: 'Camera Sensors Layout',
    bandCapturePreview: 'Band Capture Preview',
    spectralCurves: 'Spectral Response Curves',
    messages: {
      noActiveProfile: 'No active camera profile'
    }
  },
  files: {
    cameraFiles: 'Camera Files',
    refresh: 'Refresh',
    downloadSelected: 'Download Selected ({count})',
    deleteSelected: 'Delete Selected ({count})',
    confirmDeleteSelected: 'Delete selected items?',
    formatSdTitle: 'Format SD Card? This will ERASE ALL DATA!',
    formatSdButton: 'Format SD Card',
    noActiveProfile: 'No Active Camera Profile',
    deleting: 'Deleting {completed}/{total}',
    errorLabel: 'Error: {error}',
    root: 'Root',
    columns: {
      name: 'Name',
      size: 'Size',
      actions: 'Actions'
    },
    download: 'Download',
    deleteFile: 'Delete',
    confirmDeleteFolder: 'Delete this folder and its contents?',
    confirmDeleteFile: 'Delete this file?',
    downloadQueue: 'Download Queue',
    openDownloadFolder: 'Open Downloads Folder',
    clearCompleted: 'Clear Completed',
    emptyDownloads: 'No downloads in queue',
    pause: 'Pause',
    resume: 'Resume',
    retry: 'Retry',
    remove: 'Remove',
    status: {
      pending: 'Pending',
      downloading: 'Downloading',
      paused: 'Paused',
      completed: 'Completed',
      failed: 'Failed'
    },
    formatModal: {
      title: '⚠️ Format SD Card - DANGER',
      okText: 'Format',
      alertTitle: 'THIS WILL ERASE ALL DATA ON THE SD CARD!',
      alertDesc: 'This action cannot be undone. All photos and data will be permanently deleted.',
      confirmLabel: 'Type "ERASE" to confirm',
      placeholder: 'ERASE'
    },
    messages: {
      noActiveProfile: 'No active camera profile',
      listFailed: 'Failed to list files: {error}',
      itemAdded: 'Item added to download queue',
      itemsAdded: '{count} item(s) added to download queue',
      addQueueFailed: 'Failed to add to queue: {error}',
      noItemsSelected: 'No items selected',
      deleteTaskRunning: 'A delete task is already running',
      deleteTaskStartFailed: 'Failed to start delete task',
      deleteTaskStarted: 'Delete task started',
      deleteCompleted: 'Delete completed',
      deleteFailed: 'Delete failed: {error}',
      confirmErase: 'Please type "ERASE" to confirm',
      formatSuccess: 'SD card formatted successfully',
      formatFailed: 'Failed to format SD card: {error}',
      clearCompleted: 'Cleared {count} completed download(s)',
      clearCompletedFailed: 'Failed to clear completed: {error}',
      openFolderFailed: 'Failed to open folder: {error}'
    }
  },
  settings: {
    sidebarTitle: 'Settings',
    menu: {
      general: 'General Settings',
      network: 'Network Settings',
      license: 'Software Activation',
      about: 'About & Help'
    },
    appSettingsTitle: 'Application Settings',
    general: {
      downloadTitle: 'Download Settings',
      downloadDir: 'Download Directory',
      downloadDirPlaceholder: 'Default: Downloads/RedEdgeDownloads',
      downloadDirExtra: 'Leave empty to use default system Downloads folder',
      concurrent: 'Concurrent Downloads (1-5)',
      concurrentExtra: 'Default: 1',
      previewTitle: 'Preview Settings',
      previewRate: 'Preview Refresh Rate (Hz)',
      previewExtra: 'Default: 0.5 Hz (1 frame every 2 seconds)',
      statusTitle: 'Status Monitoring Settings',
      statusRate: 'Status Refresh Rate (seconds)',
      statusExtra: 'Default: 3 seconds',
      loggingTitle: 'Logging Settings',
      enableLogging: 'Enable Logging',
      loggingExtra: 'Enable detailed logging for troubleshooting',
      languageTitle: 'Language',
      languageLabel: 'Display Language'
    },
    network: {
      title: 'Network Settings',
      timeout: 'Request Timeout (milliseconds)',
      timeoutExtra: 'Default: 30000ms (30 seconds)',
      proxyTitle: 'Proxy Settings',
      enableProxy: 'Enable Camera API Proxy',
      proxyExtra: 'Use HTTP/HTTPS proxy for all camera API requests',
      proxyUrl: 'Camera API Proxy URL',
      proxyPlaceholder: 'Please enter a valid HTTP/HTTPS proxy URL',
      proxyUrlExtra: 'Supports http/https proxies, e.g., {example}',
      proxyUrlInvalid: 'Please enter a valid HTTP/HTTPS proxy URL'
    },
    license: {
      currentStatus: 'Current Status',
      trialDays: 'Trial Days Remaining',
      licenseInfo: 'License Information',
      licenseStatus: 'License Status',
      expiryDate: 'Expiry Date',
      userInfo: 'User Information',
      name: 'Name',
      org: 'Organization',
      contact: 'Contact',
      activateTitle: 'Activate License',
      trialAlert: 'Trial period: {days} days remaining',
      trialDesc: 'Enter your activation code to unlock the full version',
      expiredTitle: 'License Expired',
      expiredDesc: 'Please enter a valid activation code to continue using the software',
      activationCode: 'Activation Code',
      activationPlaceholder: 'Enter your activation code',
      activateButton: 'Activate',
      validateButton: 'Validate License'
    },
    about: {
      versionTitle: 'Software Version',
      appVersion: 'App Version',
      build: 'Build',
      helpTitle: 'Help',
      documentationLabel: 'Documentation:',
      supportLabel: 'Support:',
      tips: 'Tips: Check connection, proxy settings, and camera power.',
      companyName: 'Shennong Intelligent Agriculture Research Institute Nanjing Co., Ltd.',
      companyEmailLabel: 'Contact Email:',
      companyPhoneLabel: 'Contact Phone:',
      companyAddressLabel: 'Address:',
      companyAddressLine1: 'No. 9, Chaxing Road, Baima Town, Lishui District, Nanjing, Jiangsu, China',
      companyAddressLine2: '2/F, Building 2, Nanjing Agricultural Bio-High-Tech Incubation Center, No. 4 Tongwei Road, Xuanwu District, Nanjing, Jiangsu, China',
      companyWebsiteLabel: 'Official Website:'
    },
    messages: {
      loadFailed: 'Failed to load settings: {error}',
      saveSuccess: 'Settings saved successfully',
      saveFailed: 'Failed to save settings: {error}',
      enterActivation: 'Please enter an activation code',
      activationSuccess: 'License activated successfully!',
      activationFailed: 'Activation failed',
      activationFailedDetail: 'Activation failed: {error}',
      validateSuccess: 'License validated successfully',
      validateFailed: 'Validation failed: {error}'
    },
    status: {
      activated: 'License Activated',
      expired: 'License Expired',
      trial: 'Trial Version',
      unknown: 'Unknown Status'
    },
    statusDesc: {
      activated: 'Your license is active and valid',
      expired: 'Your license has expired. Please activate to continue.',
      trial: 'You are using the trial version. {days} days remaining.',
      unknown: ''
    },
    languageOptions: {
      en: 'English',
      zh: '简体中文'
    }
  },
  analysis: {
    title: 'Analysis View',
    placeholder: 'This is where analysis features will be implemented.'
  },
  calibration: {
    pythonServiceNotRunning: 'Python processing service is not running',
    startService: 'Start Service',
    serviceStarted: 'Python service started successfully',
    serviceStartFailed: 'Failed to start Python service',
    tabs: {
      calibration: 'Radiometric Calibration',
      records: 'Calibration Records',
      batch: 'Batch Processing'
    },
    detection: {
      title: 'Panel Detection',
      fromFile: 'Load from TIF Files',
      orManualInput: 'Or Manual Input',
      serialPlaceholder: 'Enter panel serial number (e.g., RP06-1234567-SC...)',
      parse: 'Parse'
    },
    result: {
      title: 'Detection Result',
      empty: 'No detection result. Please scan a QR code or load panel images.',
      serial: 'Serial Number',
      version: 'Panel Version',
      cameraModel: 'Camera Model',
      wavelengthRange: 'Wavelength Range',
      reflectanceRange: 'Reflectance Range',
      bandReflectances: 'Band Reflectances',
      band: 'Band',
      wavelength: 'Wavelength',
      reflectance: 'Reflectance',
      irradiance: 'Irradiance',
      saveRecord: 'Save Calibration'
    },
    save: {
      title: 'Save Calibration Record',
      serial: 'Serial Number',
      notes: 'Notes',
      notesPlaceholder: 'Optional notes about this calibration...',
      setAsActive: 'Set as active calibration'
    },
    records: {
      serial: 'Serial Number',
      version: 'Version',
      reflectance: 'Reflectance',
      status: 'Status',
      createdAt: 'Created At',
      active: 'Active',
      inactive: 'Inactive',
      activate: 'Activate',
      view: 'View',
      empty: 'No calibration records'
    },
    details: {
      title: 'Calibration Details',
      serial: 'Serial Number',
      version: 'Panel Version',
      status: 'Status',
      active: 'Active',
      inactive: 'Inactive',
      minWavelength: 'Min Wavelength',
      maxWavelength: 'Max Wavelength',
      minReflectance: 'Min Reflectance',
      maxReflectance: 'Max Reflectance',
      createdAt: 'Created At',
      notes: 'Notes',
      bandReflectances: 'Band Reflectances',
      band: 'Band',
      wavelength: 'Wavelength',
      reflectance: 'Reflectance',
      irradiance: 'Irradiance',
      noRecord: 'No record selected'
    },
    batch: {
      config: {
        title: 'Batch Processing Configuration',
        inputDirectory: 'Input Directory',
        selectInputDir: 'Select input directory...',
        outputDirectory: 'Output Directory',
        selectOutputDir: 'Select output directory...',
        calibration: 'Calibration Record',
        selectCalibration: 'Select a calibration record',
        active: 'Active',
        panelImages: 'Panel Images (Optional)',
        selectPanelImages: 'Select panel images...',
        panelImagesHint: 'If provided, will recalculate irradiance from these images',
        filesSelected: 'files selected',
        options: 'Processing Options',
        generateThumbnails: 'Generate thumbnails',
        generateRgbPreview: 'Generate RGB preview images',
        generateNdvi: 'Generate NDVI images',
        start: 'Start Batch Processing'
      },
      progress: {
        title: 'Processing Progress',
        status: 'Status',
        processed: 'Processed',
        progress: 'Progress',
        currentCapture: 'Current',
        cancel: 'Cancel',
        noJob: 'No job running',
        statusText: {
          pending: 'Pending',
          running: 'Running',
          completed: 'Completed',
          failed: 'Failed',
          cancelled: 'Cancelled'
        }
      },
      started: 'Batch processing started',
      startFailed: 'Failed to start batch processing',
      completed: 'Batch processing completed',
      failed: 'Batch processing failed',
      cancelled: 'Batch processing cancelled'
    },
    selectFailed: 'Failed to select files',
    needFiveBands: 'Please select 5 band images',
    detectionSuccess: 'Panel detected successfully',
    parseSuccess: 'Serial number parsed successfully',
    parseFailed: 'Failed to parse serial number',
    saveSuccess: 'Calibration record saved',
    saveFailed: 'Failed to save calibration record',
    activateSuccess: 'Calibration record activated',
    deleteConfirm: {
      title: 'Delete Calibration Record',
      content: 'Are you sure you want to delete this calibration record?'
    },
    deleteSuccess: 'Calibration record deleted'
  },
  alignment: {
    pythonServiceNotRunning: 'Python processing service is not running',
    startService: 'Start Service',
    serviceStarted: 'Python service started successfully',
    serviceStartFailed: 'Failed to start Python service',
    workflow: {
      title: 'Image Alignment Workflow',
      step1: '1. First perform radiometric calibration to convert raw images to reflectance',
      step2: '2. Then use the calibrated reflectance images for alignment',
      note: 'Note: Alignment should be performed on radiometrically calibrated (reflectance) images, not raw images. This ensures better feature matching and more accurate results.'
    },
    warning: {
      title: 'Input Image Warning',
      useRawImages: 'The selected images do not appear to be radiometrically calibrated. For best results, please use reflectance images from the calibration step. Do you want to continue anyway?'
    },
    tabs: {
      generate: 'Generate Warp Matrices',
      single: 'Single Alignment',
      batch: 'Batch Alignment',
      records: 'Records'
    },
    generate: {
      title: 'Generate Warp Matrices',
      selectImages: 'Select 5-Band Images',
      info: 'Camera Information',
      cameraModel: 'Camera Model',
      cameraSerial: 'Camera Serial',
      recommendedMethod: 'Recommended Method',
      bands: 'Number of Bands',
      bandInfo: 'Band Information',
      bandName: 'Band Name',
      wavelength: 'Wavelength',
      selectImagesFirst: 'Select images to view camera information',
      method: 'Alignment Method',
      opencvHint: 'Best for RedEdge-M/MX, Altum (ECC-based)',
      siftHint: 'Best for RedEdge-P, Altum-PT (feature-based)',
      referenceBand: 'Reference Band',
      maxIterations: 'Max Iterations',
      maxIterationsHint: 'Higher values can improve alignment but take longer.',
      pyramidLevels: 'Pyramid Levels',
      pyramidLevelsHint: '0 disables pyramid; higher values can improve robustness but take longer.',
      compute: 'Compute Warp Matrices'
    },
    single: {
      title: 'Single Capture Alignment',
      selectImages: 'Input Images',
      selectImagesPlaceholder: 'Select 5 band images...',
      filesSelected: 'files selected',
      warpMatrix: 'Warp Matrix',
      selectWarpMatrix: 'Select a warp matrix',
      active: 'Active',
      outputPath: 'Output Path',
      outputPathPlaceholder: 'Select output file path...',
      options: 'Output Options',
      sortByWavelength: 'Sort bands by wavelength',
      generateRgbPreview: 'Generate RGB preview',
      generateNdvi: 'Generate NDVI',
      align: 'Align Images'
    },
    batch: {
      title: 'Batch Alignment',
      inputDirectory: 'Input Directory',
      selectInputDir: 'Select input directory...',
      outputDirectory: 'Output Directory',
      selectOutputDir: 'Select output directory...',
      warpMatrix: 'Warp Matrix',
      selectWarpMatrix: 'Select a warp matrix',
      active: 'Active',
      options: 'Output Options',
      sortByWavelength: 'Sort bands by wavelength',
      generateRgbPreview: 'Generate RGB preview',
      generateNdvi: 'Generate NDVI',
      start: 'Start Batch Alignment'
    },
    progress: {
      title: 'Alignment Progress',
      status: 'Status',
      processed: 'Processed',
      progress: 'Progress',
      currentCapture: 'Current',
      cancel: 'Cancel',
      noJob: 'No alignment job running',
      statusText: {
        pending: 'Pending',
        running: 'Running',
        completed: 'Completed',
        failed: 'Failed',
        cancelled: 'Cancelled'
      }
    },
    preview: {
      title: 'Alignment Result',
      success: 'Alignment completed successfully',
      outputPath: 'Output Path',
      dimensions: 'Dimensions',
      rgbPreview: 'RGB Preview',
      ndviPath: 'NDVI Path',
      openFolder: 'Open Output Folder',
      openFolderFailed: 'Failed to open folder',
      noResult: 'No alignment result. Run alignment to see the result.'
    },
    records: {
      matrices: 'Warp Matrices',
      jobs: 'Job History',
      camera: 'Camera',
      method: 'Method',
      quality: 'Quality',
      status: 'Status',
      createdAt: 'Created At',
      active: 'Active',
      inactive: 'Inactive',
      activate: 'Activate',
      emptyMatrices: 'No warp matrices'
    },
    jobs: {
      id: 'ID',
      type: 'Type',
      batch: 'Batch',
      single: 'Single',
      captures: 'Captures',
      statusCol: 'Status',
      createdAt: 'Created At',
      duration: 'Duration',
      empty: 'No job history',
      status: {
        pending: 'Pending',
        running: 'Running',
        completed: 'Completed',
        failed: 'Failed',
        cancelled: 'Cancelled'
      }
    },
    selectFailed: 'Failed to select files',
    needFiveBands: 'Please select 5 band images',
    currentBands: 'Current bands',
    getCameraInfoFailed: 'Failed to get camera information',
    computeSuccess: 'Warp matrices computed successfully',
    computeFailed: 'Failed to compute warp matrices',
    alignSuccess: 'Alignment completed successfully',
    alignFailed: 'Alignment failed',
    batchStarted: 'Batch alignment started',
    batchStartFailed: 'Failed to start batch alignment',
    batchCompleted: 'Batch alignment completed',
    batchFailed: 'Batch alignment failed',
    batchCancelled: 'Batch alignment cancelled',
    activateSuccess: 'Warp matrix activated',
    deleteConfirm: {
      title: 'Delete Warp Matrix',
      content: 'Are you sure you want to delete this warp matrix?'
    },
    deleteSuccess: 'Warp matrix deleted'
  },
  statusBar: {
    version: 'Version',
    licenseStatus: 'License Status',
    notActivated: 'Not Activated',
    messages: {
      title: 'System Messages',
      empty: 'No messages',
      welcome: 'Welcome',
      welcomeContent: 'Welcome to RedEdge Monitor. Start your multispectral image acquisition and processing work.',
      systemUpdate: 'System Update',
      systemUpdateContent: 'System has been updated to the latest version. Check the changelog for new features.',
      markAllRead: 'Mark All as Read'
    },
    help: {
      title: 'Help Documentation',
      connect: {
        title: 'Connection Management',
        content: '<p>Connection management page is used to configure and manage camera connections.</p><ul><li>Create new camera profiles</li><li>Test camera connection status</li><li>Activate camera profile to use</li><li>Manage multiple camera profiles</li></ul><p>Please ensure the camera is powered on and on the same network as your computer before use.</p>'
      },
      preview: {
        title: 'Live Preview',
        content: '<p>Live preview page displays real-time camera feed.</p><ul><li>View real-time camera images</li><li>Adjust preview refresh rate</li><li>View preview statistics</li><li>Support band visualization</li></ul><p>Preview function requires an active camera profile.</p>'
      },
      capture: {
        title: 'Capture Control',
        content: '<p>Capture control page is used to trigger and manage capture tasks.</p><ul><li>Manually trigger single capture</li><li>Set up timer capture tasks</li><li>View recent capture records</li><li>Download or export captured images</li></ul><p>Captured images are saved to the camera SD card and can be downloaded from the Files page.</p>'
      },
      files: {
        title: 'File Management',
        content: '<p>File management page is used to browse and manage camera files.</p><ul><li>Browse camera SD card files</li><li>Download files to local storage</li><li>Delete camera files</li><li>Manage download queue</li><li>Format SD card</li></ul><p>Downloaded files are saved to the download directory specified in settings.</p>'
      },
      status: {
        title: 'Status Monitoring',
        content: '<p>Status monitoring page displays detailed camera status information.</p><ul><li>View storage space usage</li><li>View GPS location information</li><li>View DLS light sensor data</li><li>View IMU attitude data</li><li>View camera version and band information</li></ul><p>Status information is automatically refreshed periodically.</p>'
      },
      calibration: {
        title: 'Radiometric Calibration',
        content: '<p>Radiometric calibration page is used for radiometric calibration processing.</p><ul><li>Detect calibration panel and parse parameters</li><li>Calculate radiometric calibration coefficients</li><li>Save and manage calibration records</li><li>Batch process image calibration</li></ul><p>Calibration requires images taken with a calibration panel and uses Python service for processing.</p>'
      },
      alignment: {
        title: 'Image Alignment',
        content: '<p>Image alignment page is used for multi-band image alignment.</p><ul><li>Generate warp matrices</li><li>Single image alignment</li><li>Batch image alignment</li><li>Manage warp matrices and job records</li></ul><p>Alignment should be performed on radiometrically calibrated reflectance images for better results.</p>'
      },
      settings: {
        title: 'Settings',
        content: '<p>Settings page is used to configure application parameters.</p><ul><li>Configure download and preview parameters</li><li>Configure network and proxy settings</li><li>Manage software license</li><li>View software version and help information</li></ul><p>After modifying settings, click the save button to apply changes.</p>'
      },
      default: {
        title: 'Help Documentation',
        content: '<p>This is the help documentation for RedEdge Monitor.</p><p>Please view detailed instructions for each function on different pages.</p>'
      }
    }
  }
}
