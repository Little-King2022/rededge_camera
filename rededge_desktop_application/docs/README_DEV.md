# RedEdge-M Desktop Application

农田遥感监测桌面软件 - 用于控制和管理 RedEdge-M 多光谱相机

## 技术栈

- **Electron** - 跨平台桌面应用框架
- **Vue 3** - 渐进式前端框架
- **Vite** - 现代化构建工具
- **Ant Design Vue** - 企业级 UI 组件库
- **Pinia** - Vue 状态管理
- **SQLite** - 本地数据库
- **better-sqlite3** - 高性能 SQLite 绑定

## 环境要求

- Node.js >= 16.0.0
- npm >= 8.0.0
- Python 3 (用于编译 better-sqlite3 原生模块)
- C++ 构建工具

### Windows 环境配置

由于 better-sqlite3 需要编译原生模块，Windows 用户需要安装构建工具：

**方法一：自动安装（推荐）**

使用管理员权限打开 PowerShell 或命令提示符，运行：

```bash
npm install --global windows-build-tools
```

**方法二：手动安装**

1. 安装 Python 3.x：https://www.python.org/downloads/
   - 勾选 "Add Python to PATH"
2. 安装 Visual Studio Build Tools：
   - 下载：https://visualstudio.microsoft.com/downloads/
   - 选择 "Desktop development with C++"

**方法三：使用 chocolatey**

```bash
choco install python visualstudio2019-workload-vctools
```

### macOS 环境配置

```bash
xcode-select --install
```

### Linux 环境配置

```bash
# Ubuntu/Debian
sudo apt-get install build-essential python3

# CentOS/RHEL
sudo yum install gcc-c++ make python3
```

## 安装依赖

配置好构建环境后，安装项目依赖：

```bash
cd rededge_desktop_application
npm install
```

**注意**：首次安装可能需要较长时间，因为需要编译 better-sqlite3 原生模块。

### 安装问题排查

如果安装失败，可以尝试：

1. 清理缓存重新安装：
```bash
npm cache clean --force
rm -rf node_modules package-lock.json
npm install
```

2. 指定 Python 路径（如果系统有多个 Python 版本）：
```bash
npm config set python /path/to/python3
npm install
```

3. 使用 --verbose 查看详细错误信息：
```bash
npm install --verbose
```

## 开发模式运行

```bash
# 启动开发服务器（Vite + Electron 热重载）
npm run app:dev
```

或分别运行：

```bash
# Terminal 1: 启动 Vite 开发服务器
npm run dev

# Terminal 2: 启动 Electron
npm run electron:dev
```

## 构建打包

```bash
# 构建生产版本
npm run app:build
```

打包后的文件位于 `dist-electron/` 目录。

## 项目结构

```
rededge_desktop_application/
├── electron/                   # Electron Main 进程
│   ├── main.js                # 主进程入口
│   ├── preload.js             # Preload 脚本（IPC 桥接）
│   ├── services/              # 核心服务
│   │   ├── camera-api.js      # 相机 HTTP API 客户端
│   │   ├── database.js        # SQLite 数据库封装
│   │   ├── license.js         # 授权服务
│   │   └── download.js        # 下载队列管理
│   └── ipc/
│       └── handlers.js        # IPC 事件处理器
├── src/                       # Vue 应用（Renderer 进程）
│   ├── main.js               # Vue 入口
│   ├── App.vue               # 根组件
│   ├── router/               # 路由配置
│   ├── stores/               # Pinia 状态管理
│   ├── views/                # 页面组件
│   │   ├── ConnectView.vue   # 连接管理
│   │   ├── PreviewView.vue   # 实时预览
│   │   ├── CaptureView.vue   # 拍照控制
│   │   ├── StatusView.vue    # 状态监控
│   │   ├── FilesView.vue     # 文件管理
│   │   ├── LicenseView.vue   # 授权激活
│   │   └── SettingsView.vue  # 设置
│   └── components/           # 可复用组件
├── database/
│   └── schema.sql            # 数据库表结构
├── package.json
├── vite.config.js
└── index.html
```

## 核心功能

### 1. 相机连接管理 (`/connect`)

- 配置多个相机连接 profile
- 测试连接状态
- 切换活动 profile

### 2. 实时预览 (`/preview`)

**关键实现：两步拉取机制**

相机的 `/jpeg_url` 端点返回一次性预览图链接，必须立即拉取：

1. Main 进程调用 `GET /jpeg_url` 获取 `{ jpeg_url: "/previews/preview00001.jpg?..." }`
2. Main 进程立即调用 `GET {jpeg_url}` 拉取 JPEG 二进制
3. Main 进程转换为 base64 dataURL 返回给 Renderer

**禁止 Renderer 直接请求** `jpeg_url`，否则链接会失效。

### 3. 拍照控制 (`/capture`)

- **手动拍照**：单次触发拍照
- **相机端定时拍照**：
  - 配置间隔时间（秒/分钟）
  - 通过 `/config` 设置 `auto_cap_mode=timer` 和 `timer_period`
  - 通过 `/timer?enable=true/false` 启停定时器

### 4. 相机状态监控 (`/status`)

周期拉取相机状态（默认 2 秒），展示：

- 存储信息（SD 卡状态、容量）
- GPS 信息（卫星数、位置、精度）
- DLS 状态
- 时间信息（UTC、GPS 时间）
- 位置、高度、速度、航向
- 拍照配置

### 5. 文件管理 (`/files`)

- 浏览相机文件系统
- 多选文件加入下载队列
- 下载队列管理（暂停、恢复、重试）
- 删除文件
- 格式化 SD 卡（需二次确认输入 "ERASE"）

### 6. 授权激活 (`/license`)

- 7 天试用期
- 激活码激活
- 显示到期时间和用户信息
- 设备指纹绑定

### 7. 应用设置 (`/settings`)

- 下载目录配置
- 预览刷新率
- 状态刷新率
- 网络超时
- 日志开关

## 相机 API 参考

基础 URL 示例：`http://8.154.28.218:20010`

主要端点：

- `GET /status` - 相机状态
- `GET /jpeg_url` - 获取预览图一次性链接
- `GET|POST /capture` - 手动拍照
- `GET|POST /config` - 读写配置
- `GET /timer?enable=true|false` - 控制定时器
- `GET /files/<path>` - 文件浏览/下载
- `GET /deletefile/<path>` - 删除文件
- `POST /reformatsdcard` - 格式化 SD 卡

详细文档：https://micasense.github.io/rededge-api/api/http.html

## 数据库

应用使用 SQLite 本地数据库存储：

- 相机连接配置（camera_profiles）
- 应用设置（app_settings）
- 下载队列（download_queue）
- 拍照任务历史（capture_jobs）
- 授权状态（license_state）

数据库文件位于用户数据目录：

- Windows: `%APPDATA%/rededge-desktop-application/rededge.db`
- macOS: `~/Library/Application Support/rededge-desktop-application/rededge.db`
- Linux: `~/.config/rededge-desktop-application/rededge.db`

## 授权服务器配置（占位符）

在 `electron/services/license.js` 中配置：

```javascript
const LICENSE_CONFIG = {
  SERVER_BASE_URL: process.env.LICENSE_SERVER_BASE_URL || '<LICENSE_SERVER_BASE_URL>',
  ACTIVATE_PATH: process.env.LICENSE_API_ACTIVATE_PATH || '<LICENSE_API_ACTIVATE_PATH>',
  VALIDATE_PATH: process.env.LICENSE_API_VALIDATE_PATH || '<LICENSE_API_VALIDATE_PATH>',
  TRIAL_DAYS: 7,
  OFFLINE_GRACE_DAYS: 3
};
```

或通过环境变量设置：

```bash
export LICENSE_SERVER_BASE_URL=https://your-license-server.com
export LICENSE_API_ACTIVATE_PATH=/api/activate
export LICENSE_API_VALIDATE_PATH=/api/validate
```

## 常见问题

### 1. 预览图显示失败

- 检查相机连接是否正常
- 确认相机固件支持 `/jpeg_url` 端点
- 查看 Main 进程日志，确认两步拉取是否成功

### 2. 定时拍照不工作

- 使用"Capture"页面检测相机能力
- 确认相机固件支持 `/timer` 和 `/config` 端点
- 如果不支持，页面会显示提示信息

### 3. 下载速度慢

- 4G 网络不稳定是正常现象
- 下载失败会自动重试
- 可以暂停后稍后恢复

### 4. 授权激活失败

- 如果授权服务器未配置，会使用 mock 激活（开发模式）
- 检查网络连接
- 确认激活码格式正确

## 开发注意事项

### IPC 通信

所有相机 HTTP 请求必须在 Main 进程执行，通过 IPC 调用：

```javascript
// Renderer 进程（Vue 组件）
const status = await window.electronAPI.camera.getStatus()

// Main 进程通过 IPC handler 处理
ipcMain.handle('camera:getStatus', async () => {
  const profile = database.getActiveProfile()
  const cameraApi = new CameraApiClient(profile)
  return await cameraApi.getStatus()
})
```

### 预览图两步拉取（重要！）

```javascript
// ❌ 错误：Renderer 直接请求 jpeg_url
const response = await fetch(`${baseUrl}/jpeg_url`)
const { jpeg_url } = await response.json()
const img = await fetch(`${baseUrl}${jpeg_url}`) // 可能已失效！

// ✅ 正确：Main 进程两步拉取
async getOneTimePreviewFrame() {
  const { jpeg_url } = await this.requestJson('GET', '/jpeg_url')
  const jpegBuffer = await this.requestBinary('GET', jpeg_url) // 立即拉取
  return `data:image/jpeg;base64,${jpegBuffer.toString('base64')}`
}
```

### 错误处理

所有操作都应该有明确的错误反馈：

```javascript
try {
  await someOperation()
  message.success('Operation completed')
} catch (error) {
  message.error(`Operation failed: ${error.message}`)
}
```

## MVP 验收清单

- [x] `/status` 可拉取并展示
- [x] 预览页稳定刷新（1 Hz 默认）
- [x] 手动拍照可用
- [x] 相机端定时可启停（/config + /timer）
- [x] /files 可浏览并下载到本地、可删除、可格式化（强确认）
- [x] 授权流程 UI 可跑通（接口可 mock，但结构必须完整）

## License

Copyright © 2024
