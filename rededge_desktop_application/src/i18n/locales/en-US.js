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
      captureInitiatedToast: 'Capture initiated',
      captureFailed: 'Capture failed: {error}',
      timerNotSupported: 'Timer mode not supported by camera',
      timerStarted: 'Timer started successfully',
      timerStartFailed: 'Failed to start timer: {error}',
      timerStopped: 'Timer stopped successfully',
      timerStopFailed: 'Failed to stop timer: {error}',
      selectedDeleted: 'Selected captures deleted',
      exportCanceled: 'Export canceled',
      exportSuccess: 'PNG preview exported to: {directory}, TIF raw images need to be downloaded from the Files page',
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
      proxyUrlInvalid: 'Please enter a valid HTTP/HTTPS proxy URL',
      adminServerTitle: 'Management Server',
      adminServerUrl: 'Server URL',
      adminServerUrlPlaceholder: 'http://localhost:5000/api'
    },
    update: {
      title: 'System Update',
      checkUpdate: 'Check for Updates',
      downloadUpdate: 'Download Update',
      installUpdate: 'Install Update',
      openDownloadFolder: 'Open Download Folder',
      checking: 'Checking for updates...',
      upToDate: 'Up to date',
      updateAvailable: 'Update Available',
      releaseNotes: 'Release Notes',
      messages: {
        checkSuccess: 'Update check completed',
        checkFailed: 'Update check failed: {error}',
        upToDate: 'You are using the latest version v{version}',
        newVersionAvailable: 'New version available: v{version}',
        downloadSuccess: 'Download completed',
        downloadFailed: 'Download failed: {error}'
      }
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
      revokedTitle: 'License Revoked',
      revokedDesc: 'Your license was revoked by the server. Please contact support or activate again.',
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
      revoked: 'License Revoked',
      trial: 'Trial Version',
      unknown: 'Unknown Status'
    },
    statusDesc: {
      activated: 'Your license is active and valid',
      expired: 'Your license has expired. Please activate to continue.',
      revoked: 'Your license has been revoked by the server.',
      trial: 'You are using the trial version. {days} days remaining.',
      unknown: ''
    },
    languageOptions: {
      en: 'English',
      zh: '简体中文'
    }
  },
  analysis: {
    title: 'Image Analysis',
    menu: {
      fieldManager: 'Field Manager',
      spectralCalculator: 'Spectral Calculator',
      aiModel: 'Shennong AI Model'
    },
    pythonServiceNotRunning: 'Python processing service is not running',
    startService: 'Start Service',
    serviceStarted: 'Python service started successfully',
    serviceStartFailed: 'Failed to start Python service',
    fieldManager: {
      fieldList: 'Field List',
      fieldCreate: 'Create Field',
    },
    field: {
      drawPolygon: 'Draw Field',
      stopDraw: 'Stop Drawing',
      importFile: 'Import File',
      clearAll: 'Clear All',
      polygonCount: '{count} field(s) drawn',
      fieldIndex: 'Field #{index}',
      fieldNumber: 'Field Number',
      fieldNumberPlaceholder: 'e.g. F001',
      fieldName: 'Field Name',
      fieldNamePlaceholder: 'Enter field name',
      cropType: 'Crop Type',
      cropTypePlaceholder: 'e.g. Rice',
      cropVariety: 'Crop Variety',
      cropVarietyPlaceholder: 'e.g. Hybrid Rice',
      notes: 'Notes',
      notesPlaceholder: 'Optional notes',
      saveAll: 'Save All ({count} fields)',
      saveSuccess: 'Successfully saved {count} field(s)',
      saveFailed: 'Save failed',
      drawTip: 'Draw field polygons on the map, or import Shapefile / GeoJSON files',
      mapLoadFailed: 'Map loading failed',
      importFailed: 'File import failed',
      importSuccess: 'Successfully imported {count} field(s)',
      noPolygonsFound: 'No polygon data found',
      fieldListTitle: 'Field Preview',
      emptyList: 'No fields yet. Please create fields first.',
      unnamed: 'Unnamed Field',
      finishEdit: 'Finish Edit',
      editAttributes: 'Edit Field Attributes',
      coordsUpdated: 'Field coordinates updated',
      attrUpdated: 'Field attributes updated',
      updateFailed: 'Update failed',
      deleteConfirm: 'Delete this field?',
      deleteSuccess: 'Field deleted',
      searchPlaceholder: 'Search location',
      drawHint: 'Click to add vertices, double-click or right-click to finish',
      editHint: 'Drag vertices to adjust field shape',
      editVertices: 'Edit Vertices',
      convertSuccess: 'Successfully converted {count} field(s)',
      convertFailed: 'Coordinate conversion failed',
      satelliteMap: 'Satellite',
      normalMap: 'Normal Map',
    },
    spectral: {
      title: 'Spectral Calculator',
      description: 'Calculate spectral indices from multispectral images and output TIF results with PNG visualizations',
      inputSection: 'Input Image',
      selectTif: 'Select 5-Band TIF',
      tifPlaceholder: 'Select a 5-band TIF image (radiometrically calibrated and band-registered)',
      tifTip: 'Input must be a 5-band TIF (Blue/Green/Red/RedEdge/NIR), already radiometrically calibrated and band-registered.',
      indexSection: 'Index Settings',
      indexType: 'Index Type',
      presetIndex: 'Preset Index',
      customIndex: 'Custom Index',
      selectPreset: 'Select preset index',
      customFormula: 'Custom Index',
      formulaPlaceholder: 'e.g. (nir - red) / (nir + red)',
      formulaHelp: 'Available variables: blue, green, red, rededge, nir (case insensitive). Supports arithmetic and numpy functions (np.sqrt, np.log, etc.)',
      outputSection: 'Output Settings',
      outputDir: 'Output Directory',
      selectOutputDir: 'Select Directory',
      outputBasename: 'Filename (without extension)',
      outputBasenamePlaceholder: 'Leave empty to auto-generate',
      submitJob: 'Submit Analysis Job',
      presets: {
        ndvi: 'NDVI - Normalized Difference Vegetation Index',
        ndre: 'NDRE - Normalized Difference Red Edge Index',
        gndvi: 'GNDVI - Green Normalized Difference Vegetation Index',
        exg: 'ExG - Excess Green Index',
        evi: 'EVI - Enhanced Vegetation Index',
        savi: 'SAVI - Soil Adjusted Vegetation Index',
        ccci: 'CCCI - Canopy Chlorophyll Content Index'
      }
    },
    jobs: {
      title: 'Job Queue',
      empty: 'No analysis jobs yet',
      columns: {
        index: 'Index',
        inputFile: 'Input File',
        status: 'Status',
        progress: 'Progress',
        createdAt: 'Submitted',
        actions: 'Actions'
      },
      status: {
        pending: 'Pending',
        running: 'Running',
        completed: 'Completed',
        failed: 'Failed',
        cancelled: 'Cancelled'
      },
      actions: {
        viewPng: 'Preview PNG',
        openTif: 'Open TIF',
        showFolder: 'Show in Folder',
        cancel: 'Cancel',
        delete: 'Delete'
      },
      result: {
        title: 'Analysis Result Preview',
        stats: 'Statistics',
        min: 'Min',
        max: 'Max',
        mean: 'Mean',
        std: 'Std Dev',
        validPixels: 'Valid Pixels',
        totalPixels: 'Total Pixels',
        outputTif: 'Output TIF',
        outputPng: 'Output PNG'
      }
    },
    aiModel: {
      title: 'Shennong AI Model',
      comingSoon: 'This feature is under development',
      description: 'Cloud-based AI analysis powered by the Shennong Agriculture AI Model, providing crop disease detection, yield prediction, and growth assessment.',
      loadModels: 'Loading models',
      loadFailed: 'Failed to load model list',
      retry: 'Retry',
      empty: 'No models available',
      totalModels: '{count} models',
      allTypes: 'All',
      searchPlaceholder: 'Search model name or description...',
      modelCode: 'Model Code',
      modelVersion: 'Version',
      modelType: 'Model Type',
      inputFormat: 'Input Format',
      outputFormat: 'Output Format',
      callCount: 'Call Count',
      lastCallTime: 'Last Called',
      noLastCall: 'Never called',
      modelDescription: 'Description',
      runModel: 'Run Model',
      runModelTip: 'This feature is under development, stay tuned...',
      selectModelTip: 'Select a model from the list to view details',
      types: {
        classic: 'Classic',
        'DL Model': 'Deep Learning',
        detection: 'Detection'
      }
    },
    messages: {
      submitSuccess: 'Analysis job submitted',
      submitFailed: 'Failed to submit job: {error}',
      cancelSuccess: 'Job cancelled',
      cancelFailed: 'Failed to cancel job',
      deleteConfirm: 'Delete this job record?',
      deleteSuccess: 'Job record deleted',
      selectTifFirst: 'Please select a TIF image file first',
      selectOutputFirst: 'Please select an output directory first',
      selectIndexFirst: 'Please select a spectral index',
      enterFormulaFirst: 'Please enter a custom formula',
      fileNotFound: 'Output file not found, processing may not be complete yet'
    }
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
        content: '<p>Image alignment page is used for multi-band image alignment.</p><ul><li>Generate warp matrices</li><li>Single image alignment</li><li>Batch image alignment</li><li>Manage warp matrices and job records</li></ul><p>Alignment should be performed on radiometrically calibrated reflectance images for better results.</p><p><strong>Band alignment workflow:</strong></p><ol><li>Go to “Image Alignment” -> “Generate Warp Matrices”.</li><li>Select the 5-band reflectance TIFs generated after radiometric calibration (same capture set).</li><li>Method suggestion: RedEdge-M/MX use “opencv (ECC)”; RedEdge-P/Altum-PT can use “sift”.</li><li>Reference band: Red/RedEdge is recommended (default is OK).</li><li>Click “Compute Warp Matrices” and wait for completion.</li><li>In “Records”, set the new warp matrix as “Active”.</li><li>Go to “Batch Alignment”, choose input/output folders.</li><li>Select the active warp matrix and start.</li></ol>'
      },
      analysis: {
        title: 'Image Analysis',
        content: '<p>The Image Analysis page provides analysis tools for multispectral remote sensing imagery.</p>' +
          '<h4>Spectral Calculator</h4>' +
          '<p>Calculate various spectral vegetation indices from 5-band TIF images, outputting result TIF and visualization PNG files.</p>' +
          '<p><strong>Workflow:</strong></p>' +
          '<ol>' +
            '<li>Select “Spectral Calculator” from the left menu.</li>' +
            '<li>Click “Browse” to select a 5-band TIF image that has been radiometrically calibrated and band-registered.</li>' +
            '<li>Choose index type:' +
              '<ul>' +
                '<li><b>Preset Index</b>: Select NDVI, NDRE, GNDVI, ExG, EVI, SAVI, or CCCI from the dropdown.</li>' +
                '<li><b>Custom Formula</b>: Use the calculator panel to input a formula. Available variables: <code>blue</code> (475nm), <code>green</code> (560nm), <code>red</code> (668nm), <code>rededge</code> (717nm), <code>nir</code> (840nm) (case-insensitive). Supports <code>+</code> <code>-</code> <code>*</code> <code>/</code> <code>**</code> operators and functions like <code>np.sqrt()</code>, <code>np.log()</code>, <code>abs()</code>.</li>' +
              '</ul>' +
            '</li>' +
            '<li>Select an output directory and specify a filename (leave blank for auto-generation).</li>' +
            '<li>Click “Submit Analysis Job”. The task will be queued in the right panel for async processing.</li>' +
          '</ol>' +
          '<p><strong>Job Queue:</strong></p>' +
          '<ul>' +
            '<li>The right panel shows all analysis jobs with real-time status and progress.</li>' +
            '<li>Once complete, you can preview the PNG result (with legend and statistics), open the TIF file, or reveal it in a folder.</li>' +
            '<li>You can cancel queued jobs or delete completed records.</li>' +
            '<li>The panel can be collapsed/expanded via the arrow button.</li>' +
          '</ul>' +
          '<h4>Preset Index Reference</h4>' +
          '<table style=”width:100%;border-collapse:collapse;font-size:13px;margin-top:4px;”>' +
            '<tr style=”background:#fafafa;”><th style=”text-align:left;padding:4px 8px;border-bottom:1px solid #eee;”>Index</th><th style=”text-align:left;padding:4px 8px;border-bottom:1px solid #eee;”>Formula</th><th style=”text-align:left;padding:4px 8px;border-bottom:1px solid #eee;”>Use Case</th></tr>' +
            '<tr><td style=”padding:4px 8px;”>NDVI</td><td style=”padding:4px 8px;”><code>(NIR−Red)/(NIR+Red)</code></td><td style=”padding:4px 8px;”>Vegetation cover & health</td></tr>' +
            '<tr><td style=”padding:4px 8px;”>NDRE</td><td style=”padding:4px 8px;”><code>(NIR−RE)/(NIR+RE)</code></td><td style=”padding:4px 8px;”>Chlorophyll content, more sensitive in dense canopy</td></tr>' +
            '<tr><td style=”padding:4px 8px;”>GNDVI</td><td style=”padding:4px 8px;”><code>(NIR−Green)/(NIR+Green)</code></td><td style=”padding:4px 8px;”>Chlorophyll concentration, complements NDVI</td></tr>' +
            '<tr><td style=”padding:4px 8px;”>ExG</td><td style=”padding:4px 8px;”><code>2G−R−B</code></td><td style=”padding:4px 8px;”>Green vegetation segmentation, weed detection</td></tr>' +
            '<tr><td style=”padding:4px 8px;”>EVI</td><td style=”padding:4px 8px;”><code>2.5(NIR−R)/(NIR+6R−7.5B+1)</code></td><td style=”padding:4px 8px;”>Dense vegetation, reduced atmospheric interference</td></tr>' +
            '<tr><td style=”padding:4px 8px;”>SAVI</td><td style=”padding:4px 8px;”><code>1.5(NIR−R)/(NIR+R+0.5)</code></td><td style=”padding:4px 8px;”>Vegetation analysis in high bare-soil areas</td></tr>' +
            '<tr><td style=”padding:4px 8px;”>CCCI</td><td style=”padding:4px 8px;”><code>NDRE/NDVI</code></td><td style=”padding:4px 8px;”>Canopy chlorophyll estimation, nitrogen management</td></tr>' +
          '</table>' +
          '<h4>Shennong AI Model</h4>' +
          '<p>Cloud-based AI analysis powered by the Shennong Agriculture AI Model, providing crop disease detection, yield prediction, and growth assessment. This feature is under development.</p>'
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
