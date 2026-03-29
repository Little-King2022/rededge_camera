import { app, BrowserWindow, crashReporter, dialog, protocol, shell } from 'electron'
import path from 'path'
import { fileURLToPath } from 'url'
import database from './services/database.js'
import licenseService from './services/license.js'
import { createAdminClient } from './services/admin-client.js'
import { registerIPCHandlers } from './ipc/handlers.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const isDev = Boolean(process.env.VITE_DEV_SERVER_URL || process.env.NODE_ENV === 'development')

let mainWindow = null
let rendererRestartAttempts = 0
let lastRendererRestartAt = 0
let pendingRendererRestart = null
let restartInProgress = false
let crashDialogOpen = false
let rendererRestarting = false
let rendererRestartResetTimer = null

protocol.registerSchemesAsPrivileged([
  {
    scheme: 'preview',
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true
    }
  }
])

if (process.env.REDEDGE_DISABLE_HW_ACCELERATION === '1') {
  app.disableHardwareAcceleration()
  app.commandLine.appendSwitch('disable-gpu')
  app.commandLine.appendSwitch('disable-gpu-compositing')
  console.log('[Main] Hardware acceleration disabled')
} else {
  // Optimize WebGL performance for map controls
  app.commandLine.appendSwitch('ignore-gpu-blocklist')
  app.commandLine.appendSwitch('enable-gpu-rasterization')
  app.commandLine.appendSwitch('disable-gpu-driver-bug-workarounds')
}

const crashDumpsDir = path.join(app.getPath('userData'), 'crashDumps')
app.setPath('crashDumps', crashDumpsDir)
crashReporter.start({
  submitURL: '',
  uploadToServer: false,
  compress: true
})
console.log('[Main] Crash dumps directory:', crashDumpsDir)

/**
 * Create main application window
 */
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1000,
    minHeight: 700,
    frame: false,
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    },
    title: 'RedEdge Monitor',
    show: false
  })

  mainWindow.setMenuBarVisibility(false)

  // Load the app
  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL)
    mainWindow.webContents.openDevTools()
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'))
  }

  // Show window when ready
  mainWindow.once('ready-to-show', () => {
    mainWindow.show()
    if (rendererRestarting) {
      setRendererRestarting(false)
    }
  })

  mainWindow.webContents.on('render-process-gone', (event, details) => {
    console.error('[Main] Renderer process gone:', details)
    scheduleRendererRestart(details)
  })

  mainWindow.webContents.on('unresponsive', () => {
    console.warn('[Main] Renderer is unresponsive')
  })

  mainWindow.webContents.on('responsive', () => {
    console.info('[Main] Renderer is responsive')
  })

  mainWindow.on('closed', () => {
    mainWindow = null
  })

  console.log('[Main] Window created')
}

function scheduleRendererRestart(details) {
  const now = Date.now()
  if (now - lastRendererRestartAt > 60000) {
    rendererRestartAttempts = 0
  }
  rendererRestartAttempts += 1
  lastRendererRestartAt = now

  const autoRestartAllowed = rendererRestartAttempts <= 3
  if (!autoRestartAllowed) {
    console.error('[Main] Renderer restart suppressed after repeated crashes')
  }

  if (autoRestartAllowed && !pendingRendererRestart) {
    console.warn(`[Main] Scheduling renderer restart (attempt ${rendererRestartAttempts})`, details)
    pendingRendererRestart = setTimeout(() => {
      pendingRendererRestart = null
      restartRenderer('auto')
    }, 2000)
  }

  showRendererCrashDialog(details, autoRestartAllowed).catch((error) => {
    console.error('[Main] Failed to show crash dialog:', error)
  })
}

function restartRenderer(reason) {
  if (restartInProgress) {
    return
  }

  setRendererRestarting(true)
  restartInProgress = true
  console.warn(`[Main] Restarting renderer (${reason})`)
  try {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.destroy()
      mainWindow = null
    }
    createWindow()
  } finally {
    restartInProgress = false
  }
}

function setRendererRestarting(active) {
  rendererRestarting = active
  if (rendererRestartResetTimer) {
    clearTimeout(rendererRestartResetTimer)
    rendererRestartResetTimer = null
  }
  if (active) {
    rendererRestartResetTimer = setTimeout(() => {
      rendererRestarting = false
      rendererRestartResetTimer = null
    }, 10000)
  }
}

async function showRendererCrashDialog(details, autoRestartAllowed) {
  if (crashDialogOpen) {
    return
  }

  crashDialogOpen = true
  const detailLines = [
    `Reason: ${details.reason}`,
    `Exit code: ${details.exitCode}`,
    `Crash dumps: ${crashDumpsDir}`,
    `Time: ${new Date().toLocaleString()}`
  ]
  const message = autoRestartAllowed
    ? 'The renderer process crashed. The app will restart automatically.'
    : 'The renderer process crashed repeatedly. Auto-restart has been paused.'

  // different buttons based on whether auto-restart is allowed
  const buttons = autoRestartAllowed ? ['OK', 'Open Crash Dumps', 'Quit Application'] : ['Restart Now', 'Open Crash Dumps', 'Quit Application']

  const { response } = await dialog.showMessageBox({
    type: 'error',
    title: 'Renderer Crashed',
    message,
    detail: detailLines.join('\n'),
    buttons,
    defaultId: 0,
    cancelId: 2,
    noLink: true
  })

  crashDialogOpen = false

  if (response === 1) {
    await shell.openPath(crashDumpsDir)
    return
  }

  if (response === 2) {
    if (pendingRendererRestart) {
      clearTimeout(pendingRendererRestart)
      pendingRendererRestart = null
    }
    app.quit()
    return
  }

  if (response === 0) {
    if (autoRestartAllowed) {
      return
    }
    restartRenderer('manual')
    return
  }
}

/**
 * Initialize application
 */
async function initialize() {
  console.log('[Main] Initializing application...')

  try {
    // Initialize database
    database.initialize()
    console.log('[Main] Database initialized')

    // Initialize license service
    const licenseStatus = await licenseService.initialize()
    console.log('[Main] License status:', licenseStatus)

    // Initialize admin client service
    const adminClient = createAdminClient(database)
    await adminClient.initialize()
    console.log('[Main] Admin client initialized')

    // Register IPC handlers
    registerIPCHandlers()

    console.log('[Main] Application initialized successfully')
  } catch (error) {
    console.error('[Main] Initialization failed:', error)
    app.quit()
  }
}

/**
 * App lifecycle events
 */

app.whenReady().then(async () => {
  app.on('render-process-gone', (event, webContents, details) => {
    console.error('[Main] App render-process-gone:', details)
  })

  app.on('child-process-gone', (event, details) => {
    if (details.type === 'GPU') {
      console.error('[Main] GPU process gone:', details)
    }
  })

  const previewDir = path.join(app.getPath('userData'), 'capture-previews')
  protocol.registerFileProtocol('preview', (request, callback) => {
    try {
      const url = new URL(request.url)
      const rawPath = `${url.hostname || ''}${url.pathname || ''}`
      const decoded = decodeURIComponent(rawPath.replace(/^\//, ''))
      const relativePath = decoded.replace(/\/+$/, '')
      const safePath = path.normalize(relativePath)
      const resolvedPath = path.join(previewDir, safePath)
      if (!resolvedPath.startsWith(previewDir)) {
        callback({ error: -10 })
        return
      }
      callback({ path: resolvedPath })
    } catch (error) {
      console.warn('[Main] Failed to resolve preview URL:', error)
      callback({ error: -2 })
    }
  })

  await initialize()
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (rendererRestarting) {
    console.warn('[Main] Skipping app quit during renderer restart')
    return
  }
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('before-quit', () => {
  console.log('[Main] Application shutting down...')

  // Close database
  database.close()
})

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('[Main] Uncaught exception:', error)
})

process.on('unhandledRejection', (reason, promise) => {
  console.error('[Main] Unhandled rejection at:', promise, 'reason:', reason)
})

console.log('[Main] Electron main process started')
