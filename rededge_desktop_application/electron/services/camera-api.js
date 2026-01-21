import https from 'https'
import http from 'http'
import { HttpProxyAgent } from 'http-proxy-agent'
import { HttpsProxyAgent } from 'https-proxy-agent'

class CameraApiClient {
  constructor(profile, settings = {}) {
    this.profile = profile
    this.settings = settings || {}
    const timeoutValue = parseInt(this.settings.request_timeout || '30000', 10)
    this.timeout = Number.isFinite(timeoutValue) ? timeoutValue : 30000 // Default 30s timeout
    this.maxRetries = 3
    this.proxyEnabled = this.settings.camera_proxy_enabled === true || this.settings.camera_proxy_enabled === 'true'
    this.proxyUrl = (this.settings.camera_proxy_url || '').trim()
    this.proxyAgentCache = new Map()
    this.streamingEnabled = false // Track if streaming has been enabled
  }

  getBaseUrl() {
    const { protocol, host, port, path_prefix } = this.profile
    const prefix = path_prefix && path_prefix.startsWith('/') ? path_prefix : `/${path_prefix || ''}`
    return `${protocol}://${host}:${port}${prefix}`.replace(/\/$/, '')
  }

  /**
   * Get proxy agent for a target URL
   * @param {URL} url - target URL
   */
  getProxyAgentForUrl(url) {
    if (!this.proxyEnabled || !this.proxyUrl) {
      return null
    }

    try {
      // Validate proxy URL
      new URL(this.proxyUrl)
    } catch (error) {
      console.warn('[CameraApiClient] Invalid proxy URL, ignoring proxy:', this.proxyUrl)
      return null
    }

    const cacheKey = url.protocol === 'https:' ? 'https' : 'http'
    if (this.proxyAgentCache.has(cacheKey)) {
      return this.proxyAgentCache.get(cacheKey)
    }

    const agent = url.protocol === 'https:'
      ? new HttpsProxyAgent(this.proxyUrl)
      : new HttpProxyAgent(this.proxyUrl)

    this.proxyAgentCache.set(cacheKey, agent)
    return agent
  }

  /**
   * Make HTTP request with timeout and retry support
   * @param {string} method - HTTP method
   * @param {string} path - API path
   * @param {object} query - Query parameters
   * @param {object} body - Request body (for POST/PUT)
   * @param {object} options - Additional options (retries, timeout, expectBinary)
   */
  async request(method, path, query = null, body = null, options = {}) {
    const {
      retries = 0,
      timeout = this.timeout,
      expectBinary = false,
      headers: extraHeaders = {},
      form = false,
      rawBody = false
    } = options

    const url = new URL(path, this.getBaseUrl())

    // Add query parameters
    if (query) {
      Object.entries(query).forEach(([key, value]) => {
        url.searchParams.append(key, value)
      })
    }

    const httpModule = url.protocol === 'https:' ? https : http

    return new Promise((resolve, reject) => {
      let bodyPayload
      const reqOptions = {
        method,
        timeout,
        headers: {
          'User-Agent': 'RedEdge-Desktop/1.0',
          ...extraHeaders
        }
      }

      const proxyAgent = this.getProxyAgentForUrl(url)
      if (proxyAgent) {
        reqOptions.agent = proxyAgent
      }

      // Add body for POST/PUT
      if (body && (method === 'POST' || method === 'PUT')) {
        if (rawBody) {
          bodyPayload = body
        } else if (form) {
          const params = new URLSearchParams()
          Object.entries(body).forEach(([key, value]) => {
            params.append(key, value == null ? '' : String(value))
          })
          bodyPayload = params.toString()
          if (!reqOptions.headers['Content-Type']) {
            reqOptions.headers['Content-Type'] = 'application/x-www-form-urlencoded; charset=UTF-8'
          }
        } else {
          bodyPayload = JSON.stringify(body)
          if (!reqOptions.headers['Content-Type']) {
            reqOptions.headers['Content-Type'] = 'application/json'
          }
        }

        if (bodyPayload != null && !reqOptions.headers['Content-Length']) {
          reqOptions.headers['Content-Length'] = Buffer.byteLength(bodyPayload)
        }

      }

      const req = httpModule.request(url, reqOptions, (res) => {
        const chunks = []

        res.on('data', (chunk) => {
          chunks.push(chunk)
        })

        res.on('end', () => {
          const buffer = Buffer.concat(chunks)

          // Handle non-2xx status codes
          if (res.statusCode < 200 || res.statusCode >= 300) {
            const error = new Error(`HTTP ${res.statusCode}: ${buffer.toString()}`)
            error.statusCode = res.statusCode
            error.response = buffer.toString()
            return reject(error)
          }

          // Return binary data
          if (expectBinary) {
            return resolve(buffer)
          }

          // Parse JSON
          try {
            const text = buffer.toString()
            const data = text ? JSON.parse(text) : {}
            resolve(data)
          } catch (err) {
            reject(new Error(`Failed to parse JSON response: ${err.message}`))
          }
        })
      })

      req.on('error', (err) => {
        // Retry on network errors for GET requests
        if (retries < this.maxRetries && method === 'GET') {
          console.log(`[CameraApiClient] Retry ${retries + 1}/${this.maxRetries} for ${method} ${path}`)
          setTimeout(() => {
            this.request(method, path, query, body, { ...options, retries: retries + 1 })
              .then(resolve)
              .catch(reject)
          }, 1000 * (retries + 1)) // Exponential backoff
        } else {
          reject(err)
        }
      })

      req.on('timeout', () => {
        req.destroy()
        reject(new Error('Request timeout'))
      })

      // Write body
      if (bodyPayload != null && (method === 'POST' || method === 'PUT')) {
        req.write(bodyPayload)
      }

      req.end()
    })
  }

  /**
   * Request JSON response
   */
  async requestJson(method, path, query = null, body = null, options = {}) {
    return this.request(method, path, query, body, { ...options, expectBinary: false })
  }

  /**
   * Request binary response
   */
  async requestBinary(method, path, query = null, options = {}) {
    return this.request(method, path, query, null, { ...options, expectBinary: true })
  }

  /**
   * CRITICAL: Get one-time preview frame using two-step fetch
   *
   * This is the MOST IMPORTANT method for preview functionality.
   * The /jpeg_url endpoint returns a one-time-use URL that MUST be fetched immediately.
   *
   * Flow:
   * 0. POST /config with"streaming_enable=true" to enable streaming (if not already enabled), content-type=application/x-www-form-urlencoded; charset=UTF-8
   * 1. GET /jpeg_url -> { jpeg_url: "/previews/preview00001.jpg?31041561000" }
   * 2. Immediately GET {jpeg_url} -> binary JPEG data
   * 3. Convert to base64 dataURL for Renderer
   *
   * DO NOT reuse the jpeg_url - it's invalidated after first access!
   */
  async getOneTimePreviewFrame() {
    try {
      // Step 0: Ensure streaming is enabled (only once per client instance)
      if (!this.streamingEnabled) {
        try {
          await this.requestJson(
            'POST',
            '/config',
            null,
            { streaming_enable: 'true' },
            {
              form: true,
              timeout: 5000,
              headers: {
                // Some cameras are picky about charset when enabling streaming
                'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8'
              }
            }
          )
          this.streamingEnabled = true
          console.log('[CameraApiClient] Streaming enabled successfully')
        } catch (error) {
          // If streaming is already enabled or endpoint differs, preview may still work.
          // Only treat unexpected failures as fatal if Step 1/2 fails later.
          console.warn('[CameraApiClient] Failed to enable streaming via /config:', error.message)
          // Mark as enabled anyway to avoid retrying on every frame
          this.streamingEnabled = true
        }
      }

      // Step 1: Get the one-time JPEG URL
      const { jpeg_url } = await this.requestJson('GET', '/jpeg_url')

      if (!jpeg_url) {
        throw new Error('No jpeg_url in response')
      }

      // Step 2: Immediately fetch the JPEG binary
      const jpegBuffer = await this.requestBinary('GET', jpeg_url, null, {
        timeout: 10000 // Shorter timeout for preview frames
      })

      // Step 3: Convert to base64 dataURL
      const dataURL = `data:image/jpeg;base64,${jpegBuffer.toString('base64')}`

      return {
        dataURL,
        timestamp: Date.now(),
        size: jpegBuffer.length
      }
    } catch (error) {
      console.error('[CameraApiClient] Failed to fetch preview frame:', error.message)
      throw error
    }
  }

  /**
   * Get camera status
   */
  async getStatus() {
    return this.requestJson('GET', '/status')
  }

  /**
   * Get DLS IMU data (accelerometer, gyroscope, magnetometer, and orientation)
   */
  async getDlsImu() {
    return this.requestJson('GET', '/dls_imu')
  }

  /**
   * Get camera version information
   */
  async getVersion() {
    return this.requestJson('GET', '/version')
  }

  /**
   * Get camera band information
   */
  async getCameraInfo() {
    return this.requestJson('GET', '/camera_info')
  }

  /**
   * Manual capture
   */
  async capture() {
    // Try POST first, fallback to GET
    try {
      return await this.requestJson('POST', '/capture')
    } catch (error) {
      if (error.statusCode === 404 || error.statusCode === 405) {
        return await this.requestJson('GET', '/capture')
      }
      throw error
    }
  }

  /**
   * Get capture status by ID
   */
  async getCaptureStatus(captureId) {
    return this.requestJson('GET', `/capture/${captureId}`)
  }

  /**
   * Get/Set camera config
   */
  async getConfig() {
    return this.requestJson('GET', '/config')
  }

  async setConfig(config) {
    // Try POST with JSON body first
    try {
      return await this.requestJson('POST', '/config', null, config)
    } catch (error) {
      // Fallback to GET with query parameters
      if (error.statusCode === 404 || error.statusCode === 405) {
        return await this.requestJson('GET', '/config', config)
      }
      throw error
    }
  }

  /**
   * Control camera timer
   */
  async controlTimer(enable) {
    return this.requestJson('GET', '/timer', { enable: enable ? 'true' : 'false' })
  }

  /**
   * Start camera-side timer capture
   */
  async startCameraTimer(intervalSec) {
    // Step 1: Set config for timer mode
    await this.setConfig({
      auto_cap_mode: 'timer',
      timer_period: intervalSec
    })

    // Step 2: Enable timer
    await this.controlTimer(true)
  }

  /**
   * Stop camera-side timer capture
   */
  async stopCameraTimer() {
    await this.controlTimer(false)
  }

  /**
   * List files in directory
   */
  async listFiles(remotePath = '/') {
    return this.requestJson('GET', `/files${remotePath}`)
  }

  /**
   * Download file binary
   */
  async downloadFile(remotePath, options = {}) {
    return this.requestBinary('GET', `/files${remotePath}`, null, options)
  }

  /**
   * Delete file
   */
  async deleteFile(remotePath) {
    return this.requestJson('GET', `/deletefile${remotePath}`)
  }

  /**
   * Format SD card (DANGEROUS!)
   */
  async formatSDCard() {
    return this.requestJson('POST', '/reformatsdcard', null, {
      erase_all_data: true
    })
  }

  /**
   * Probe camera capabilities (timer support, etc.)
   */
  async probeCapabilities() {
    const capabilities = {
      timer: false,
      config: false,
      capture: false,
      files: false
    }

    try {
      // Test /timer endpoint
      await this.requestJson('GET', '/timer', { enable: 'false' })
      capabilities.timer = true
      capabilities.config = true
      capabilities.capture = true
      capabilities.files = true
    } catch (error) {
      console.log('[CameraApiClient] /timer not supported')
    }

    return capabilities
  }
}

export default CameraApiClient
