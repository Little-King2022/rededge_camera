import { app, BrowserWindow, protocol } from 'electron'
import path from 'path'
import { fileURLToPath } from 'url'
import database from './services/database.js'
import licenseService from './services/license.js'
import { registerIPCHandlers } from './ipc/handlers.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

let mainWindow = null

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
  })

  mainWindow.on('closed', () => {
    mainWindow = null
  })

  console.log('[Main] Window created')
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
