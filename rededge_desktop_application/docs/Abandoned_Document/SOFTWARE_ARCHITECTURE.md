# RedEdge Monitor 软件架构文档

## 1. 项目概述

### 1.1 产品简介

RedEdge Monitor 是一款基于 Electron + Vue3 开发的桌面应用程序，专为 RedEdge-M 多光谱相机设计，提供远程控制、实时预览、数据管理和图像处理等功能。该应用主要用于农田遥感监测场景，支持通过 4G 路由器和 FRP 内网穿透实现远程访问。

### 1.2 技术栈

- **桌面框架**: Electron 28
- **前端框架**: Vue 3.4 + Vite 5
- **UI 组件库**: Ant Design Vue 4
- **状态管理**: Pinia
- **路由**: Vue Router 4
- **本地存储**: electron-store (基于 SQLite 的键值存储)
- **HTTP 客户端**: axios
- **国际化**: vue-i18n
- **3D/图像处理**: three.js, utif

### 1.3 项目结构

```
rededge_desktop_application/
├── electron/                          # Main 进程代码
│   ├── main.js                        # 应用入口（窗口创建、生命周期管理）
│   ├── preload.cjs                    # 预加载脚本（IPC 通信桥梁）
│   ├── services/                      # 核心服务层
│   │   ├── database.js                # 数据存储服务（electron-store）
│   │   ├── camera-api.js              # 相机 HTTP API 客户端
│   │   ├── license.js                 # 授权管理服务
│   │   ├── download.js                # 下载队列管理服务
│   │   ├── admin-client.js            # 管理服务器通信服务
│   │   ├── python-service.js          # Python 服务管理
│   │   ├── proxy-agent.js             # 代理配置服务
│   │   └── delete.js                  # 文件删除服务
│   └── ipc/
│       └── handlers.js                # IPC 事件处理器
├── src/                               # Renderer 进程代码
│   ├── main.js                        # Vue 应用入口
│   ├── App.vue                        # 根组件（主布局和导航）
│   ├── router/index.js                # 路由配置
│   ├── stores/                        # Pinia 状态管理
│   │   ├── camera.js                  # 相机 profile 管理
│   │   ├── license.js                 # 授权状态管理
│   │   ├── download.js                # 下载队列状态
│   │   └── alignment.js               # 配准任务状态
│   ├── views/                         # 页面组件
│   │   ├── ConnectView.vue            # 连接管理页面
│   │   ├── PreviewView.vue            # 实时预览页面
│   │   ├── CaptureView.vue            # 拍照控制页面
│   │   ├── StatusView.vue             # 状态监控页面
│   │   ├── FilesView.vue              # 文件管理页面
│   │   ├── CalibrationView.vue        # 辐射定标页面
│   │   ├── AlignmentView.vue          # 图像配准页面
│   │   ├── SettingsView.vue           # 应用设置页面
│   │   └── AnalysisView.vue           # 数据分析页面
│   ├── components/                    # 公共组件
│   │   ├── StatusBar.vue              # 状态栏组件
│   │   ├── BandVisualization.vue      # 波段可视化组件
│   │   ├── HelpWindow.vue             # 帮助窗口
│   │   ├── WorkflowInfo.vue           # 工作流信息
│   │   ├── alignment/                 # 配准相关组件
│   │   └── calibration/               # 定标相关组件
│   └── i18n/                          # 国际化配置
├── database/
│   └── schema.sql                     # 数据库表结构（参考）
├── public/                            # 静态资源
├── dist/                              # 构建输出目录
├── dist-electron/                     # Electron 构建输出
├── package.json                       # 项目配置
└── vite.config.js                     # Vite 构建配置
```

---

## 2. 系统架构

### 2.1 整体架构图

```
┌─────────────────────────────────────────────────────────────────┐
│                        用户界面层 (Renderer)                      │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │                     Vue 3 + Router + Pinia                  │  │
│  │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐          │  │
│  │  │ Views   │ │Components│ │ Stores  │ │ i18n    │          │  │
│  │  │(10 pages)│ │         │ │(4 stores)│ │         │          │  │
│  │  └─────────┘ └─────────┘ └─────────┘ └─────────┘          │  │
│  └───────────────────────────────────────────────────────────┘  │
│                            │                                     │
│                    contextBridge IPC                             │
└────────────────────────────┼─────────────────────────────────────┘
│
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                     预加载层 (Preload)                           │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │                   electronAPI                              │  │
│  │  camera.* | preview.* | download.* | license.* | admin.* │  │
│  └───────────────────────────────────────────────────────────┘  │
└────────────────────────────┼─────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                        主进程层 (Main)                           │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │                  Electron BrowserWindow                    │  │
│  │  ┌─────────────────────────────────────────────────────┐  │  │
│  │  │                  IPC Handlers                        │  │  │
│  │  │  camera.* | preview.* | download.* | license.*      │  │  │
│  │  │  calibration.* | alignment.* | batch.* | admin.*    │  │  │
│  │  └─────────────────────────────────────────────────────┘  │  │
│  └───────────────────────────────────────────────────────────┘  │
│                            │                                     │
│  ┌─────────────────────────┴─────────────────────────┐         │
│  │                    服务层                          │         │
│  │  ┌───────────┐ ┌───────────┐ ┌───────────┐        │         │
│  │  │CameraApi  │ │License    │ │Download   │        │         │
│  │  │Client     │ │Service    │ │Service    │        │         │
│  │  └───────────┘ └───────────┘ └───────────┘        │         │
│  │  ┌───────────┐ ┌───────────┐ ┌───────────┐        │         │
│  │  │Admin      │ │Python     │ │Database   │        │         │
│  │  │Client     │ │Service    │ │Service    │        │         │
│  │  └───────────┘ └───────────┘└───────────┘        │         │
│  └─────────────────────────┬─────────────────────────┘         │
└────────────────────────────┼─────────────────────────────────────┘
                             │
           ┌─────────────────┼─────────────────┐
           │                 │                 │
           ▼                 ▼                 ▼
    ┌────────────┐   ┌──────────────┐   ┌──────────────┐
    │RedEdge-M   │   │管理服务器    │   │Python Flask  │
    │Camera API  │   │Admin Server  │   │Service       │
    │(HTTP)      │   │(HTTP)        │   │(本地进程)    │
    └────────────┘   └──────────────┘   └──────────────┘
```

### 2.2 进程模型

本应用采用 **Main-Renderer 双进程架构**，所有底层操作均在 Main 进程完成，Renderer 进程仅负责 UI 渲染。

#### Main 进程职责

- 窗口创建与管理
- 系统级 API 调用（文件系统、对话框等）
- HTTP 网络请求（相机 API、管理服务器）
- 长期任务执行（下载队列、Python 服务管理）
- 本地数据持久化
- 授权验证与心跳上报

#### Renderer 进程职责

- UI 组件渲染
- 用户交互响应
- 页面路由管理
- 状态管理（Pinia）
- 临时数据缓存

#### IPC 通信机制

所有 Main 进程功能通过 IPC 暴露给 Renderer：

1. **Preload 脚本** (`preload.cjs`): 使用 `contextBridge` 安全地暴露 API
2. **IPC Handler** (`handlers.js`): 处理 Renderer 发来的请求
3. **服务层**: 实现具体业务逻辑

### 2.3 分层架构

```
┌─────────────────────────────────────────────────────────────┐
│                    表示层 (Presentation Layer)              │
│  Vue 组件 + Ant Design Vue + 路由 + i18n                    │
├─────────────────────────────────────────────────────────────┤
│                    应用层 (Application Layer)               │
│  Pinia Stores + 业务逻辑                                     │
├─────────────────────────────────────────────────────────────┤
│                    领域层 (Domain Layer)                    │
│  相机操作 + 授权管理 + 下载队列 + Python 服务                 │
├─────────────────────────────────────────────────────────────┤
│                    基础设施层 (Infrastructure Layer)        │
│  HTTP 客户端 + 数据存储 + 文件系统 + 进程管理                 │
└─────────────────────────────────────────────────────────────┘
```

---

## 3. 核心组件详解

### 3.1 相机 API 客户端 (CameraApiClient)

#### 功能概述

`camera-api.js` 是与 RedEdge-M 相机通信的核心模块，负责封装所有 HTTP API 调用。

#### 核心类结构

```javascript
class CameraApiClient {
  constructor(profile, settings)
  getBaseUrl()
  request(method, path, query, body, options)
  requestJson(method, path, query, body, options)
  requestBinary(method, path, query, options)
  
  // 预览功能（最重要）
  getOneTimePreviewFrame()    // 两步拉取机制
  stopPreviewStreaming()
  
  // 相机状态
  getStatus()
  getDlsImu()
  getVersion()
  getCameraInfo()
  
  // 拍照控制
  capture()
  getCaptureStatus(captureId)
  getConfig()
  setConfig(config)
  controlTimer(enable)
  startCameraTimer(intervalSec)
  stopCameraTimer()
  
  // 文件管理
  listFiles(remotePath)
  downloadFile(remotePath, options)
  deleteFile(remotePath)
  formatSDCard()
  
  // 能力探测
  probeCapabilities()
}
```

#### 关键实现：预览图两步拉取

这是最重要的功能实现，确保预览图正确获取：

```javascript
async getOneTimePreviewFrame() {
  // Step 0: 确保流式传输已启用
  if (!this.streamingEnabled) {
    await this.requestJson('POST', '/config', null, 
      { streaming_enable: 'true' }, { form: true }
    )
    this.streamingEnabled = true
  }

  // Step 1: 获取一次性 JPEG URL
  const { jpeg_url } = await this.requestJson('GET', '/jpeg_url')
  
  // Step 2: 立即拉取 JPEG 二进制（链接只能用一次！）
  const jpegBuffer = await this.requestBinary('GET', jpeg_url, null, {
    timeout: 10000
  })

  // Step 3: 转为 base64 dataURL
  const dataURL = `data:image/jpeg;base64,${jpegBuffer.toString('base64')}`

  return { dataURL, timestamp: Date.now(), size: jpegBuffer.length }
}
```

#### 相机 API 端点映射

| 功能 | 端点 | 方法 | 说明 |
|------|------|------|------|
| 预览图 | `/jpeg_url` | GET | 获取一次性预览链接 |
| 相机状态 | `/status` | GET | 获取完整状态信息 |
| 手动拍照 | `/capture` | POST/GET | 触发拍照 |
| 拍照状态 | `/capture/:id` | GET | 查询拍照结果 |
| 配置读取 | `/config` | GET | 获取相机配置 |
| 配置写入 | `/config` | POST | 设置相机参数 |
| 定时控制 | `/timer` | GET | 启用/禁用定时拍照 |
| 文件列表 | `/files/<path>` | GET | 列出目录内容 |
| 文件下载 | `/files/<path>` | GET | 下载文件二进制 |
| 文件删除 | `/deletefile/<path>` | GET | 删除文件/目录 |
| 格式化 SD | `/reformatsdcard` | POST | 格式化存储卡 |

### 3.2 授权服务 (LicenseService)

#### 功能概述

`license.js` 管理软件的授权状态，支持试用模式和激活模式。

#### 授权流程

```
启动 → 本地验证 → (在线模式) → 服务器验证 → 返回结果
         ↓
    试用期检查 → 过期处理
```

#### 核心方法

```javascript
class LicenseService {
  initialize()                           // 初始化，生成设备指纹
  validateLocal()                        // 本地验证
  activate(activationCode)               // 激活授权
  getLicenseInfo()                       // 获取授权信息
  getTrialDaysRemaining(licenseState)    // 计算剩余试用天数
}
```

#### 设备指纹生成

```javascript
function buildDeviceFingerprint() {
  const osInfo = `${os.platform()}|${os.release()}|${os.arch()}`
  const cpuModel = os.cpus()[0]?.model || 'unknown'
  const machineId = os.hostname() || 'unknown'
  const mac = getPrimaryMacAddress()
  const raw = `${osInfo}|${cpuModel}|${machineId}|${mac}|${FINGERPRINT_SALT}`
  return crypto.createHash('sha256').update(raw).digest('hex')
}
```

#### 授权状态流转

```
trial (试用) → activated (已激活) → expired (过期)
                          ↓
                   revoked/invalid ( revoked/invalid )
```

### 3.3 下载服务 (DownloadService)

#### 功能概述

`download.js` 管理文件下载队列，支持断点续传、失败重试、并发控制。

#### 核心类结构

```javascript
class DownloadService {
  activeDownloads          // Map<downloadId, AbortController>
  maxConcurrent            // 最大并发数（默认1）
  
  // 队列管理
  addToQueue(cameraProfileId, items)
  processQueue()
  
  // 下载控制
  startDownload(download)
  pauseDownload(downloadId)
  resumeDownload(downloadId)
  retryDownload(downloadId)
  deleteDownload(downloadId)
  
  // 文件夹下载
  downloadFolder(cameraApi, download, signal)
  listFilesRecursive(cameraApi, remotePath)
  
  // 进度追踪
  downloadWithProgress(cameraApi, remotePath, downloadId, signal, callback)
}
```

#### 下载状态流转

```
pending → downloading → completed
              ↓
         paused → pending (恢复后)
              ↓
         failed → pending (重试后)
```

#### 配置项

| 配置项 | 默认值 | 说明 |
|--------|--------|------|
| `download_directory` | `~/Downloads/RedEdgeDownloads` | 下载目录 |
| `download_max_concurrent` | `1` | 最大并发下载数 |

### 3.4 管理服务器客户端 (AdminClientService)

#### 功能概述

`admin-client.js` 与 RedEdge 后台管理系统通信，处理授权、更新、同步等功能。

#### 核心功能

```javascript
class AdminClientService {
  // 客户端管理
  registerClient()              // 注册客户端
  reportHeartbeat()             // 上报心跳
  
  // 授权管理
  activateLicense(code)         // 激活授权
  validateLicense()             // 验证授权
  validateWithServer()          // 服务器验证
  
  // 更新管理
  checkForUpdates()             // 检查更新
  downloadUpdate(versionId, path) // 下载更新包
  
  // 配置同步
  syncCameraConfigs()           // 同步相机配置
}
```

#### 心跳机制

- 间隔：默认 5 分钟（可配置）
- 内容：系统信息、使用统计
- 目的：在线验证、远程监控

#### RSA 加密

激活码使用 RSA 公钥加密传输：

```javascript
async rsaEncrypt(plainText) {
  const publicKey = await this.getPublicKey()
  const buffer = Buffer.from(plainText, 'utf8')
  const encrypted = crypto.publicEncrypt(
    { key: publicKey, padding: crypto.constants.RSA_PKCS1_PADDING },
    buffer
  )
  return encrypted.toString('base64')
}
```

### 3.5 Python 服务管理器 (PythonServiceManager)

#### 功能概述

`python-service.js` 管理本地 Python Flask 服务，提供辐射定标和图像配准功能。

#### 服务架构

```
Electron Main Process
         │
         ▼
Python Service Manager (Node.js)
         │
         ▼
Python Flask Service (端口 5001)
         │
         ▼
图像处理模块 (NumPy/OpenCV/PyTorch)
```

#### 核心方法

```javascript
class PythonServiceManager {
  // 生命周期管理
  start()                        // 启动服务
  stop()                         // 停止服务
  checkHealth()                  // 健康检查
  
  // 辐射定标 API
  detectQR(imageBase64)          // QR码检测
  detectPanelFromFiles(paths)    // 定标板检测
  calculateIrradiance(paths, reflectances)  // 照度计算
  parseSerial(serial)            // 序列号解析
  
  // 图像配准 API
  startComputeWarpMatrices(imagePaths, options)  // 开始计算
  getComputeWarpMatricesStatus(jobId)           // 查询状态
  alignSingle(imagePaths, matrixPath, output, options)  // 单张配准
  alignBatch(inputDir, outputDir, matrixPath, options)  // 批量配准
  
  // 批处理 API
  startProcessing(input, output, options)
  getProcessingStatus(jobId)
  cancelProcessing(jobId)
}
```

#### 环境检测

```javascript
getPythonExecutable() {
  if (app.isPackaged) {
    // 生产环境：使用打包的 Python 可执行文件
    return path.join(this.getPythonServicePath(), 'dist', 'app', 'app.exe')
  } else {
    // 开发环境：使用 Conda 环境
    return "D:\\anaconda3\\Scripts\\conda.exe"
  }
}
```

### 3.6 数据存储服务 (DatabaseService)

#### 技术选型

使用 `electron-store` 实现本地数据持久化，基于 SQLite 语义。

#### 数据模型

```javascript
// 相机连接配置
camera_profiles: [{
  id, name, protocol, host, port, path_prefix,
  is_active, last_ok_at, consecutive_failures,
  created_at, updated_at
}]

// 应用设置
app_settings: { key: value }

// 下载队列
download_queue: [{
  id, camera_profile_id, remote_path, local_path,
  status, total_bytes, downloaded_bytes,
  error_message, created_at, updated_at
}]

// 拍照任务历史
capture_jobs: [{
  id, type, interval_sec, status, last_capture_id,
  created_at, updated_at
}]

// 授权状态（单行表）
license_state: [{
  id: 1, status, activation_code, device_fingerprint,
  last_check_at, expiry_at, user_json, raw_payload,
  created_at, updated_at
}]

// 辐射定标记录
calibration_records: [{
  id, serial, panel_version, min_wavelength, min_reflectance,
  max_wavelength, max_reflectance, band_reflectances,
  panel_irradiance, is_active, notes, created_at
}]

// 配准矩阵记录
warp_matrices_records: [{
  id, camera_serial, camera_model, alignment_method,
  reference_band, warp_matrices_path, is_active,
  alignment_quality, cropped_dimensions, notes,
  created_at, updated_at
}]

// 配准矩阵计算任务
warp_matrix_jobs: [{
  id, job_id, status, progress, message, output_path,
  image_paths, options, record_id, error_message,
  started_at, completed_at, created_at, updated_at
}]

// 配准任务记录
alignment_jobs: [{
  id, job_type, warp_matrix_id, input_path, output_directory,
  status, total_captures, processed_captures, options,
  error_message, started_at, completed_at, created_at
}]

// 批处理任务记录
batch_jobs: [{
  id, calibration_id, input_directory, output_directory,
  status, total_captures, processed_captures, options,
  error_message, started_at, completed_at, created_at
}]
```

#### 管理服务器配置（固定）

```javascript
const FORCED_ADMIN_SERVER_URL = 'http://rededge.littleking.site/api'
const FORCED_ADMIN_SERVER_ENABLED = 'true'
```

### 3.7 IPC 处理器 (IPCHandlers)

#### 事件注册

所有 IPC handler 在 `registerIPCHandlers()` 函数中注册：

```javascript
// 相机 profile 管理
camera:getAllProfiles
camera:getActiveProfile
camera:createProfile
camera:updateProfile
camera:deleteProfile
camera:setActiveProfile

// 相机 API 操作
camera:testConnection
camera:getStatus
camera:capture
camera:getConfig / camera:setConfig
camera:startTimer / camera:stopTimer
camera:probeCapabilities

// 预览功能
preview:getFrame
preview:stopStream

// 文件管理
camera:listFiles
camera:deleteFile / camera:deletePaths
camera:formatSDCard

// 下载管理
download:addToQueue
download:pause / download:resume / download:retry
download:delete / download:clearCompleted

// 设置管理
settings:get / settings:set / settings:getAll

// 授权管理
license:getInfo / license:activate / license:validate

// Python 服务
python:getStatus / python:start / python:stop

// 辐射定标
calibration:scanQR / calibration:detectFromFiles
calibration:calculateIrradiance / calibration:parseSerial
calibration:save / calibration:getAll / calibration:setActive

// 图像配准
alignment:computeWarpMatrices / alignment:getJobStatus
alignment:alignSingle / alignment:alignBatch

// 批处理
batch:start / batch:getStatus / batch:cancel

// 管理服务器
admin:getSettings / admin:checkConnection
admin:activateLicense / admin:validateLicense
admin:checkUpdates / admin:downloadUpdate
```

---

## 4. 页面路由

### 4.1 路由配置

```javascript
const routes = [
  { path: '/', redirect: '/connect' },
  { path: '/connect', name: 'Connect', component: ConnectView.vue },
  { path: '/preview', name: 'Preview', component: PreviewView.vue },
  { path: '/capture', name: 'Capture', component: CaptureView.vue },
  { path: '/status', name: 'Status', component: StatusView.vue },
  { path: '/files', name: 'Files', component: FilesView.vue },
  { path: '/calibration', name: 'Calibration', component: CalibrationView.vue },
  { path: '/alignment', name: 'Alignment', component: AlignmentView.vue },
  { path: '/settings', name: 'Settings', component: SettingsView.vue },
  { path: '/analysis', name: 'Analysis', component: AnalysisView.vue }
]
```

### 4.2 页面功能映射

| 页面 | 功能 | 核心 IPC 调用 |
|------|------|---------------|
| ConnectView | 连接配置管理 | camera:*Profile* |
| PreviewView | 实时预览 | preview:getFrame |
| CaptureView | 拍照控制 | camera:capture, camera:startTimer |
| StatusView | 状态监控 | camera:getStatus |
| FilesView | 文件管理 | camera:listFiles, download:* |
| CalibrationView | 辐射定标 | calibration:* |
| AlignmentView | 图像配准 | alignment:* |
| SettingsView | 应用设置 | settings:* |
| AnalysisView | 数据分析 | python:* |

---

## 5. 状态管理

### 5.1 Pinia Stores

#### Camera Store (`stores/camera.js`)

- 管理相机连接配置
- 处理 profile CRUD 操作
- 缓存当前激活的 profile

#### License Store (`stores/license.js`)

```javascript
export const useLicenseStore = defineStore('license', () => {
  const licenseInfo = ref(null)
  const isLoading = ref(false)
  const error = ref(null)
  
  // Getters
  const isActivated = computed(() => licenseInfo.value?.status === 'activated')
  const isTrial = computed(() => licenseInfo.value?.status === 'trial')
  const isExpired = computed(() => licenseInfo.value?.status === 'expired')
  const trialDaysRemaining = computed(() => ...)
  
  // Actions
  async function loadLicenseInfo()
  async function activate(activationCode)
  async function validate()
  
  return { ... }
})
```

#### Download Store

- 管理下载队列状态
- 处理下载操作的 UI 响应
- 同步下载进度

#### Alignment Store

- 管理配准任务状态
- 处理异步任务查询

### 5.2 状态流转

```
┌─────────────────────────────────────────────────────────────┐
│                    相机连接状态机                            │
│                                                             │
│  disconnected ──→ connecting ──→ connected                 │
│         ↑                              │                   │
│         └────────── errors ────────────┘                   │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                    授权状态机                                │
│                                                             │
│  trial (试用) ──→ activated (激活) ──→ expired (过期)      │
│         ↑                              │                    │
│         └──── revoked/invalid ─────────┘                    │
└─────────────────────────────────────────────────────────────┘
```

---

## 6. UI 设计规范

### 6.1 主题配置

```javascript
const themeConfig = {
  token: {
    colorPrimary: '#52796f',      // 主色调（深绿）
    colorSuccess: '#6b9080',      // 成功状态
    colorWarning: '#c88719',      // 警告状态
    colorError: '#a44a3f',        // 错误状态
    colorInfo: '#5b7c99',         // 信息状态
    borderRadius: 4,              // 圆角
    fontSize: 16                  // 字号
  }
}
```

### 6.2 设计风格

- **克制配色**：低饱和度配色方案
- **农业/科研场景**：专业、简洁的视觉风格
- **响应式布局**：适配不同屏幕尺寸

---

## 7. 部署架构

### 7.1 开发环境

```
┌──────────────────┐
│  Vue 3 + Vite    │  → localhost:5173
└────────┬─────────┘
         │
         ▼ dev server
┌──────────────────┐
│ Electron Main    │  → 独立窗口
└────────┬─────────┘
         │
         ▼ IPC
┌──────────────────┐
│ Electron Renderer│  → localhost:5173
└──────────────────┘
```

### 7.2 生产环境

```
┌────────────────────────────────────────┐
│           RedEdge Monitor App          │
│  ┌──────────────────────────────────┐  │
│  │         BrowserWindow            │  │
│  │  ┌────────────────────────────┐  │  │
│  │  │     Vue 3 Renderer         │  │  │
│  │  │     (dist/index.html)      │  │  │
│  │  └────────────────────────────┘  │  │
│  └──────────────────────────────────┘  │
│                                        │
│  ┌──────────────────────────────────┐  │
│  │        Main Process              │  │
│  │  - IPC Handlers                  │  │
│  │  - Services                      │  │
│  │  - electron-store                │  │
│  └──────────────────────────────────┘  │
│                                        │
│  ┌──────────────────────────────────┐  │
│  │     Python Service (打包)        │  │
│  │  - 辐射定标                      │  │
│  │  - 图像配准                      │  │
│  └──────────────────────────────────┘  │
└────────────────────────────────────────┘
         │
         ├──→ RedEdge-M Camera (HTTP)
         │
         ├──→ Admin Server (HTTP)
         │
         └──→ Local Filesystem
```

### 7.3 构建配置

```json
{
  "build": {
    "appId": "com.rededge.desktop",
    "productName": "RedEdge Monitor",
    "directories": { "output": "dist-electron" },
    "files": ["dist/**/*", "electron/**/*"],
    "extraResources": [
      { "from": "../python_service/dist/app", "to": "python_service/dist/app" }
    ],
    "win": { "target": "nsis" },
    "mac": { "target": "dmg" },
    "linux": { "target": "AppImage" }
  }
}
```

---

## 8. 关键业务流程

### 8.1 预览流程

```
用户点击"开始预览"
         │
         ▼
Renderer: preview.getFrame()
         │
         ▼
IPC: preview:getFrame
         │
         ▼
Main: getActiveCameraApi().getOneTimePreviewFrame()
         │
         ├──→ Step 1: POST /config (streaming_enable=true)
         │
         ├──→ Step 2: GET /jpeg_url → { jpeg_url }
         │
         ├──→ Step 3: GET {jpeg_url} → binary JPEG
         │
         └──→ Step 4: Convert to base64 dataURL
                   │
                   ▼
         返回 dataURL 给 Renderer
                   │
                   ▼
Renderer: 更新预览图片
```

### 8.2 拍照流程

```
用户点击"拍照"
         │
         ▼
Renderer: camera.capture()
         │
         ▼
IPC: camera:capture
         │
         ▼
Main: getActiveCameraApi().capture()
         │
         ├──→ POST /capture
         │
         └──→ 返回 capture_id
                   │
                   ▼
         保存到 capture_jobs
         显示拍照成功
```

### 8.3 授权激活流程

```
用户输入激活码
         │
         ▼
Renderer: license.activate(code)
         │
         ▼
IPC: license:activate
         │
         ▼
LicenseService.activate(code)
         │
         ├──→ AdminClient.activateLicense(encryptedCode)
         │
         │    ├──→ RSA 加密激活码
         │    │
         │    ├──→ POST /licenses/activate
         │    │
         │    └──→ 返回授权结果
         │
         └──→ 更新 license_state 表
                   │
                   ▼
         返回激活结果
```

### 8.4 辐射定标流程

```
选择5波段定标板图像
         │
         ├──→ Python: detectPanelFromFiles() ──→ 检测定标板
         │
         ├──→ Python: scanQR() ──→ 解析序列号
         │
         └──→ Python: calculateIrradiance() ──→ 计算辐照度
                   │
                   ▼
         保存 calibration_record
```

### 8.5 图像配准流程

```
选择5波段图像
         │
         ├──→ Python: getCameraInfo() ──→ 获取相机信息
         │
         ├──→ Python: startComputeWarpMatrices() ──→ 开始计算
         │         │
         │         └──→ 返回 job_id
         │
         └──→ 轮询 getComputeWarpMatricesStatus(job_id)
                   │
                   ├──→ pending → running → completed
                   │
                   └──→ 创建 warp_matrices_record
                            │
                            ▼
                   保存配准矩阵
```

---

## 9. 错误处理

### 9.1 错误分类

| 错误类型 | 处理方式 | 示例 |
|----------|----------|------|
| 网络错误 | 指数退避重试 | 相机连接超时 |
| 参数错误 | 输入验证 | 无效的 profile 配置 |
| 权限错误 | 用户提示 | 授权过期 |
| 系统错误 | 崩溃恢复 | Renderer 进程崩溃 |

### 9.2 崩溃恢复机制

```javascript
// main.js
mainWindow.webContents.on('render-process-gone', (event, details) => {
  scheduleRendererRestart(details)
})

function scheduleRendererRestart(details) {
  // 自动重启（最多3次）
  if (rendererRestartAttempts <= 3) {
    restartRenderer('auto')
  } else {
    showRendererCrashDialog(details)
  }
}
```

### 9.3 用户反馈

- **成功**: Notification 通知
- **错误**: Toast 消息 + 详情展开
- **危险操作**: 二次确认对话框

---

## 10. 性能优化

### 10.1 预览性能

- **两步拉取**：避免一次性链接失效
- **缓存控制**：Main 进程缓存 CameraApiClient 实例
- **错误退避**：连续失败时自动降频

### 10.2 下载性能

- **并发控制**：最多 3 个并行下载
- **进度节流**：每 100KB 更新一次 UI
- **内存管理**：流式写入文件

### 10.3 内存优化

- **预览图清理**：自动清理旧的预览文件
- **列表虚拟化**：大列表使用虚拟滚动
- **事件清理**：组件卸载时移除事件监听

---

## 11. 扩展点

### 11.1 新增相机支持

1. 实现 `CameraApiClient` 接口
2. 添加 profile 字段
3. 更新 UI 表单

### 11.2 新增处理模块

1. 在 Python 服务添加 API
2. 在 IPC handlers 注册
3. 添加对应的 Store 和 View

### 11.3 第三方集成

- **云存储**: 添加 S3/OSS 下载目标
- **分析平台**: 添加 API 对接
- **数据导出**: 添加 CSV/Excel 导出

---

## 12. 安全考虑

### 12.1 IPC 安全

- **contextBridge**: 仅暴露必要 API
- **参数验证**: 所有输入进行校验
- **错误脱敏**: 不向 UI 暴露敏感信息

### 12.2 数据安全

- **授权加密**: 激活码使用 RSA 加密
- **本地存储**: 敏感数据加密存储
- **设备绑定**: 授权与设备指纹绑定

### 12.3 网络安全

- **HTTPS 支持**: 相机 API 支持 HTTPS
- **代理支持**: 支持 HTTP/SOCKS 代理
- **证书验证**: 可配置的证书验证

---

## 13. 版本信息

- **当前版本**: 1.1.0
- **构建时间**: 2026-01-27
- **Electron**: 28.x
- **Node.js**: 18+

---

## 附录

### A. 术语表

| 术语 | 说明 |
|------|------|
| Main Process | Electron 主进程 |
| Renderer Process | Electron 渲染进程 |
| IPC | 进程间通信 (Inter-Process Communication) |
| contextBridge | Electron 安全 IPC 机制 |
| RedEdge-M | MicaSense 多光谱相机 |
| DLS | Downwelling Light Sensor |
| FRP | 快速反向代理 (内网穿透工具) |

### B. 参考文档

1. [RedEdge-M HTTP API](https://micasense.github.io/rededge-api/api/http.html)
2. [Ant Design Vue](https://ant.design/components/)
3. [Electron Docs](https://www.electronjs.org/docs)
4. [Vue 3 Docs](https://vuejs.org/guide/)
5. [Pinia Docs](https://pinia.vuejs.org/)

### C. 文件统计

| 分类 | 文件数 | 代码行数 |
|------|--------|----------|
| Main 进程 | 11 | ~5,000 |
| Renderer 组件 | 50+ | ~8,000 |
| 服务层 | 6 | ~3,000 |
| 总计 | 70+ | ~16,000 |
