/**
 * Python Service Manager
 * 管理Python Flask服务的生命周期
 */
import { spawn, exec } from 'child_process'
import http from 'http'
import fs from 'fs'
import path from 'path'
import { app } from 'electron'
import { fileURLToPath } from 'url'

const PYTHON_SERVICE_PORT = 5000
const HEALTH_CHECK_INTERVAL = 5000
const MAX_STARTUP_RETRIES = 30
const STARTUP_CHECK_INTERVAL = 500

class PythonServiceManager {
  constructor() {
    this.process = null
    this.isRunning = false
    this.healthCheckTimer = null
    this.baseUrl = `http://127.0.0.1:${PYTHON_SERVICE_PORT}`
  }

  /**
   * 获取Python服务目录路径
   */
  getPythonServicePath() {
    if (app.isPackaged) {
      // 生产环境：使用打包的可执行文件
      return path.join(process.resourcesPath, 'python_service')
    } else {
      // 开发环境：使用源码目录
      const envOverride = process.env.REDEDGE_PYTHON_SERVICE_PATH
      if (envOverride && fs.existsSync(envOverride)) {
        return envOverride
      }

      const appPathCandidate = path.resolve(app.getAppPath(), '..', '..', 'python_service')
      if (fs.existsSync(appPathCandidate)) {
        return appPathCandidate
      }

      const cwd = process.cwd()
      const cwdSibling = path.resolve(cwd, '..', 'python_service')
      if (fs.existsSync(cwdSibling)) {
        return cwdSibling
      }

      const cwdChild = path.resolve(cwd, 'python_service')
      if (fs.existsSync(cwdChild)) {
        return cwdChild
      }

      const currentDir = path.dirname(fileURLToPath(import.meta.url))
      const relativeCandidate = path.resolve(currentDir, '..', '..', '..', 'python_service')
      if (fs.existsSync(relativeCandidate)) {
        return relativeCandidate
      }

      return appPathCandidate
    }
  }

  /**
   * 获取Conda路径
   */
  getCondaPath() {
    const envCandidates = [
      process.env.REDEDGE_CONDA_EXE,
      process.env.CONDA_EXE,
      process.env.CONDA
    ]

    for (const candidate of envCandidates) {
      if (candidate && fs.existsSync(candidate)) {
        return candidate
      }
    }

    const condaFromPath = this.findExecutableOnPath(
      process.platform === 'win32'
        ? ['conda.exe', 'conda.bat', 'conda.cmd', 'conda']
        : ['conda']
    )
    if (condaFromPath) {
      return condaFromPath
    }

    if (process.platform === 'win32') {
      // Windows下常见的conda安装路径
      const possiblePaths = [
        'D:\\anaconda3\\Scripts\\conda.exe',
        'C:\\ProgramData\\Anaconda3\\Scripts\\conda.exe',
        'C:\\Users\\' + process.env.USERNAME + '\\anaconda3\\Scripts\\conda.exe',
        'C:\\Users\\' + process.env.USERNAME + '\\miniconda3\\Scripts\\conda.exe'
      ]

      // 优先使用找到的路径
      for (const condaPath of possiblePaths) {
        if (fs.existsSync(condaPath)) {
          return condaPath
        }
      }
    }

    return null
  }

  /**
   * 获取Python解释器路径
   */
  getPythonExecutable() {
    if (app.isPackaged) {
      // 生产环境：使用打包的Python可执行文件
      const platform = process.platform
      if (platform === 'win32') {
        return path.join(this.getPythonServicePath(), 'dist', 'app', 'app.exe')
      } else {
        return path.join(this.getPythonServicePath(), 'dist', 'app', 'app')
      }
    } else {
      const override = process.env.REDEDGE_PYTHON_EXE || process.env.PYTHON_EXE
      if (override) {
        return override
      }
      // 开发环境：使用系统Python
      return process.platform === 'win32' ? 'python' : 'python3'
    }
  }

  /**
   * 启动Python服务
   */
  async start() {
    if (this.isRunning) {
      console.log('[PythonService] Service already running')
      return true
    }

    console.log('[PythonService] Starting Python service...')

    try {
      const servicePath = this.getPythonServicePath()
      const pythonExe = this.getPythonExecutable()
      if (!fs.existsSync(servicePath)) {
        console.warn(`[PythonService] Service path not found: ${servicePath}`)
      }

      if (app.isPackaged) {
        // 生产环境：直接运行可执行文件
        this.process = spawn(pythonExe, [], {
          cwd: servicePath,
          env: {
            ...process.env,
            PYTHON_SERVICE_PORT: String(PYTHON_SERVICE_PORT)
          },
          stdio: ['ignore', 'pipe', 'pipe']
        })
      } else {
        // 开发环境：使用conda环境运行Python脚本
        const appPath = path.join(servicePath, 'app.py')
        const condaPath = this.getCondaPath()
        const condaEnv = process.env.REDEDGE_CONDA_ENV || 'micasense'

        if (condaPath) {
          const condaLower = condaPath.toLowerCase()
          const needsShell = condaLower.endsWith('.bat') || condaLower.endsWith('.cmd')
          console.log(`[PythonService] Using conda: ${condaPath} (env: ${condaEnv})`)

          // 使用 conda run 命令（跨平台兼容）
          this.process = spawn(condaPath, ['run', '-n', condaEnv, '--no-capture-output', 'python', appPath], {
            cwd: servicePath,
            env: {
              ...process.env,
              PYTHON_SERVICE_PORT: String(PYTHON_SERVICE_PORT),
              FLASK_DEBUG: 'false'
            },
            stdio: ['ignore', 'pipe', 'pipe'],
            windowsHide: true,
            shell: needsShell
          })
        } else {
          console.warn('[PythonService] Conda not found, falling back to Python:', pythonExe)
          this.process = spawn(pythonExe, [appPath], {
            cwd: servicePath,
            env: {
              ...process.env,
              PYTHON_SERVICE_PORT: String(PYTHON_SERVICE_PORT),
              FLASK_DEBUG: 'false'
            },
            stdio: ['ignore', 'pipe', 'pipe'],
            windowsHide: true
          })
        }
      }

      // 监听输出
      if (this.process.stdout) {
        this.process.stdout.on('data', (data) => {
          console.log(`[PythonService] ${data.toString().trim()}`)
        })
      }

      if (this.process.stderr) {
        this.process.stderr.on('data', (data) => {
          console.error(`[PythonService] ${data.toString().trim()}`)
        })
      }

      this.process.on('error', (err) => {
        console.error('[PythonService] Process error:', err)
        this.isRunning = false
      })

      this.process.on('exit', (code, signal) => {
        console.log(`[PythonService] Process exited with code ${code}, signal ${signal}`)
        this.isRunning = false
        this.process = null
      })

      // 等待服务启动
      const started = await this.waitForStartup()

      if (started) {
        this.isRunning = true
        this.startHealthCheck()
        console.log('[PythonService] Service started successfully')
        return true
      } else {
        this.stop()
        throw new Error('Service failed to start within timeout')
      }

    } catch (error) {
      console.error('[PythonService] Failed to start:', error)
      this.isRunning = false
      return false
    }
  }

  /**
   * 等待服务启动
   */
  async waitForStartup() {
    for (let i = 0; i < MAX_STARTUP_RETRIES; i++) {
      try {
        const healthy = await this.checkHealth()
        if (healthy) {
          return true
        }
      } catch (e) {
        // 忽略，继续重试
      }
      await new Promise(resolve => setTimeout(resolve, STARTUP_CHECK_INTERVAL))
    }
    return false
  }

  /**
   * 停止Python服务
   */
  stop() {
    console.log('[PythonService] Stopping Python service...')

    this.stopHealthCheck()

    if (this.process) {
      if (process.platform === 'win32') {
        // Windows需要特殊处理
        if (this.process.pid) {
          exec(`taskkill /pid ${this.process.pid} /T /F`, (err) => {
            if (err) {
              console.error('[PythonService] Failed to kill process:', err)
            }
          })
        }
      } else {
        this.process.kill('SIGTERM')
      }
      this.process = null
    }

    this.isRunning = false
    console.log('[PythonService] Service stopped')
  }

  /**
   * 检查服务健康状态
   */
  async checkHealth() {
    try {
      const data = await this.request('/api/health', {
        allowWhenStopped: true,
        timeout: 2000
      })
      this.isRunning = true
      return data.status === 'ok'
    } catch (error) {
      return false
    }
  }

  /**
   * 启动健康检查定时器
   */
  startHealthCheck() {
    this.stopHealthCheck()

    this.healthCheckTimer = setInterval(async () => {
      const healthy = await this.checkHealth()
      if (!healthy && this.isRunning) {
        console.warn('[PythonService] Health check failed, service may be down')
        // 可以在这里添加重启逻辑
      }
    }, HEALTH_CHECK_INTERVAL)
  }

  /**
   * 停止健康检查定时器
   */
  stopHealthCheck() {
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer)
      this.healthCheckTimer = null
    }
  }

  /**
   * 获取服务状态
   */
  async getStatus() {
    const healthy = await this.checkHealth()

    return {
      isRunning: this.isRunning,
      isHealthy: healthy,
      baseUrl: this.baseUrl,
      pid: this.process?.pid || null
    }
  }

  /**
   * Find an executable in PATH.
   */
  findExecutableOnPath(names) {
    const pathValue = process.env.PATH || ''
    if (!pathValue) {
      return null
    }

    const dirs = pathValue.split(path.delimiter)
    for (const dir of dirs) {
      if (!dir) {
        continue
      }
      const normalizedDir = dir.replace(/^"(.*)"$/, '$1')
      for (const name of names) {
        const candidate = path.join(normalizedDir, name)
        if (fs.existsSync(candidate)) {
          return candidate
        }
      }
    }

    return null
  }

  /**
   * 发送HTTP请求到Python服务
   */
  async request(endpoint, options = {}) {
    const allowWhenStopped = options.allowWhenStopped === true
    if (!allowWhenStopped && !this.isRunning) {
      throw new Error('Python service is not running')
    }

    const url = new URL(endpoint, this.baseUrl)
    const method = options.method || 'GET'
    const timeoutMs = options.timeout || 60000

    const headers = {
      'Content-Type': 'application/json',
      ...options.headers
    }

    let bodyPayload = null
    if (options.body) {
      bodyPayload = JSON.stringify(options.body)
      if (!headers['Content-Length']) {
        headers['Content-Length'] = Buffer.byteLength(bodyPayload)
      }
    }

    return new Promise((resolve, reject) => {
      const req = http.request(url, { method, headers }, (res) => {
        const chunks = []

        res.on('data', (chunk) => {
          chunks.push(chunk)
        })

        res.on('end', () => {
          const buffer = Buffer.concat(chunks)
          const text = buffer.toString()

          if (res.statusCode < 200 || res.statusCode >= 300) {
            const error = new Error(`Python service error: ${res.statusCode} - ${text}`)
            error.statusCode = res.statusCode
            return reject(error)
          }

          if (!text) {
            return resolve({})
          }

          try {
            return resolve(JSON.parse(text))
          } catch (err) {
            return reject(new Error(`Failed to parse JSON response: ${err.message}`))
          }
        })
      })

      req.setTimeout(timeoutMs)

      req.on('timeout', () => {
        req.destroy(new Error(`Request timeout after ${timeoutMs}ms`))
      })

      req.on('error', (err) => {
        if (err && (err.code === 'ECONNREFUSED' || err.code === 'ECONNRESET')) {
          this.isRunning = false
        }
        reject(err)
      })

      if (bodyPayload) {
        req.write(bodyPayload)
      }

      req.end()
    })
  }

  // API 便捷方法

  /**
   * 检测QR码
   */
  async detectQR(imageBase64) {
    return this.request('/api/calibration/detect-qr', {
      method: 'POST',
      body: { image: imageBase64 }
    })
  }

  /**
   * 从文件检测定标板
   */
  async detectPanelFromFiles(panelImagePaths) {
    return this.request('/api/calibration/detect-from-files', {
      method: 'POST',
      body: { panel_image_paths: panelImagePaths }
    })
  }

  /**
   * 计算照度
   */
  async calculateIrradiance(panelImagePaths, reflectances = null) {
    return this.request('/api/calibration/calculate-irradiance', {
      method: 'POST',
      body: {
        panel_image_paths: panelImagePaths,
        reflectances
      }
    })
  }

  /**
   * 解析序列号
   */
  async parseSerial(serial) {
    return this.request('/api/calibration/parse-serial', {
      method: 'POST',
      body: { serial }
    })
  }

  /**
   * 计算配准矩阵
   */
  async computeWarpMatrices(imagePaths, options = {}) {
    return this.request('/api/alignment/compute-warp-matrices', {
      method: 'POST',
      body: {
        image_paths: imagePaths,
        method: options.method || 'opencv',
        reference_band: options.referenceBand || 1,
        output_path: options.outputPath
      },
      timeout: 300000 // Alignment can take several minutes on large captures.
    })
  }

  /**
   * 异步计算配准矩阵
   */
  async startComputeWarpMatrices(imagePaths, options = {}) {
    return this.request('/api/alignment/compute-warp-matrices-async', {
      method: 'POST',
      body: {
        image_paths: imagePaths,
        method: options.method || 'opencv',
        reference_band: options.referenceBand || 1,
        output_path: options.outputPath,
        max_iterations: options.maxIterations,
        pyramid_levels: options.pyramidLevels
      },
      timeout: 10000
    })
  }

  /**
   * 获取异步配准任务状态
   */
  async getComputeWarpMatricesStatus(jobId) {
    return this.request(`/api/alignment/compute-warp-matrices-status/${jobId}`, {
      timeout: 10000
    })
  }

  /**
   * 单张图像配准
   */
  async alignSingle(imagePaths, warpMatricesPath, outputPath, options = {}) {
    return this.request('/api/alignment/align-single', {
      method: 'POST',
      body: {
        image_paths: imagePaths,
        warp_matrices_path: warpMatricesPath,
        output_path: outputPath,
        options
      },
      timeout: 60000
    })
  }

  /**
   * 批量图像配准
   */
  async alignBatch(inputDirectory, outputDirectory, warpMatricesPath, options = {}) {
    return this.request('/api/alignment/align-batch', {
      method: 'POST',
      body: {
        input_directory: inputDirectory,
        output_directory: outputDirectory,
        warp_matrices_path: warpMatricesPath,
        options
      }
    })
  }

  /**
   * 获取配准任务状态
   */
  async getAlignmentJobStatus(jobId) {
    return this.request(`/api/alignment/job-status/${jobId}`)
  }

  /**
   * 取消配准任务
   */
  async cancelAlignmentJob(jobId) {
    return this.request(`/api/alignment/cancel-job/${jobId}`, {
      method: 'POST'
    })
  }

  /**
   * 获取相机信息
   */
  async getCameraInfo(imagePaths) {
    return this.request('/api/alignment/get-camera-info', {
      method: 'POST',
      body: { image_paths: imagePaths }
    })
  }

  /**
   * 启动批处理任务
   */
  async startProcessing(inputDirectory, outputDirectory, options = {}) {
    return this.request('/api/processing/start', {
      method: 'POST',
      body: {
        input_directory: inputDirectory,
        output_directory: outputDirectory,
        panel_image_paths: options.panelImagePaths,
        panel_reflectances: options.panelReflectances,
        warp_matrices_path: options.warpMatricesPath,
        options: options.processingOptions
      }
    })
  }

  /**
   * 获取批处理任务状态
   */
  async getProcessingStatus(jobId) {
    return this.request(`/api/processing/status/${jobId}`)
  }

  /**
   * 取消批处理任务
   */
  async cancelProcessing(jobId) {
    return this.request(`/api/processing/cancel/${jobId}`, {
      method: 'POST'
    })
  }
}

// 导出单例
const pythonService = new PythonServiceManager()
export default pythonService
