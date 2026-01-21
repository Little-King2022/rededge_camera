/**
 * Python Service Manager
 * 管理Python Flask服务的生命周期
 */
import { spawn, exec } from 'child_process'
import path from 'path'
import { app } from 'electron'

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
      return path.join(app.getAppPath(), '..', '..', 'python_service')
    }
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
        // 开发环境：运行Python脚本
        const appPath = path.join(servicePath, 'app.py')
        this.process = spawn(pythonExe, [appPath], {
          cwd: servicePath,
          env: {
            ...process.env,
            PYTHON_SERVICE_PORT: String(PYTHON_SERVICE_PORT),
            FLASK_DEBUG: 'false'
          },
          stdio: ['ignore', 'pipe', 'pipe']
        })
      }

      // 监听输出
      this.process.stdout.on('data', (data) => {
        console.log(`[PythonService] ${data.toString().trim()}`)
      })

      this.process.stderr.on('data', (data) => {
        console.error(`[PythonService] ${data.toString().trim()}`)
      })

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
        exec(`taskkill /pid ${this.process.pid} /T /F`, (err) => {
          if (err) {
            console.error('[PythonService] Failed to kill process:', err)
          }
        })
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
      const response = await fetch(`${this.baseUrl}/api/health`, {
        timeout: 2000
      })

      if (response.ok) {
        const data = await response.json()
        this.isRunning = true
        return data.status === 'ok'
      }
      return false
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
   * 发送HTTP请求到Python服务
   */
  async request(endpoint, options = {}) {
    if (!this.isRunning) {
      throw new Error('Python service is not running')
    }

    const url = `${this.baseUrl}${endpoint}`

    const fetchOptions = {
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      timeout: options.timeout || 60000
    }

    if (options.body) {
      fetchOptions.body = JSON.stringify(options.body)
    }

    const response = await fetch(url, fetchOptions)

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Python service error: ${response.status} - ${errorText}`)
    }

    return response.json()
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
      timeout: 120000 // 配准可能需要较长时间
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
   * 检查TIF文件波段数
   */
  async checkTifBands(filePath) {
    return this.request('/api/alignment/check-tif-bands', {
      method: 'POST',
      body: { file_path: filePath }
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
