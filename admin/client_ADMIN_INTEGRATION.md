# RedEdge 桌面客户端 - 后台服务集成

## 概述

桌面客户端现已集成后台管理系统连接功能，支持：
- 客户端注册与识别
- 智能心跳上报（在线/离线模式）
- RSA 加密的授权码激活
- 授权验证（在线/离线分支）
- 软件更新检查与下载
- 相机配置同步

## 架构

### Main 进程服务 (admin-client.js)

**位置**: `electron/services/admin-client.js`

**功能**:
- HTTP 客户端管理
- 系统信息收集（CPU、内存、IP、MAC）
- 使用统计收集（启动次数、使用时长）
- RSA 加密/解密
- 心跳定时器管理

**关键方法**:
```javascript
class AdminClientService {
  async initialize()                        // 初始化服务
  async registerClient()                    // 注册客户端
  collectSystemInfo()                       // 收集系统信息
  collectUsageStats()                       // 收集使用统计
  async rsaEncrypt(plainText)               // RSA 加密
  async activateLicense(activationCode)     // 激活授权码（RSA 加密）
  async validateLicense()                   // 验证授权（智能分支）
  async checkForUpdates()                   // 检查更新
  async downloadUpdate(versionId, savePath) // 下载更新
  async syncCameraConfigs()                 // 同步相机配置
  startHeartbeat()                          // 启动心跳（仅在线模式）
  stopHeartbeat()                           // 停止心跳
}
```

### 数据库扩展 (database.js)

**新增设置字段**:
```javascript
app_settings: {
  admin_server_url: 'http://localhost:5000/api',
  admin_server_enabled: 'false',
  admin_heartbeat_interval: '300000',      // 5分钟
  client_registered: 'false',
  last_heartbeat_at: null
}
```

**新增授权字段**:
```javascript
license_state: {
  activation_code: '',
  license_type: '',
  offline_mode: false,                     // 离线模式标志
  expiry_at: null,
  last_check_at: null
}
```

**新增方法**:
```javascript
getAdminSettings()        // 获取管理服务器设置
updateAdminSettings(updates) // 更新管理服务器设置
```

### IPC Handlers (handlers.js)

新增 10 个 admin 相关的 IPC handlers:

```javascript
'admin:getSettings'          // 获取管理服务器设置
'admin:updateSettings'       // 更新管理服务器设置
'admin:checkConnection'      // 测试服务器连接
'admin:activateLicense'      // 激活授权码
'admin:validateLicense'      // 验证授权
'admin:checkUpdates'         // 检查更新
'admin:downloadUpdate'       // 下载更新
'admin:syncCameraConfigs'    // 同步相机配置
'admin:getHeartbeatStatus'   // 获取心跳状态
'admin:getOfflineMode'       // 获取离线模式状态
```

### Preload API (preload.cjs)

暴露给渲染进程的 API:

```javascript
window.electronAPI.admin = {
  getSettings,
  updateSettings,
  checkConnection,
  activateLicense,
  validateLicense,
  checkUpdates,
  downloadUpdate,
  syncCameraConfigs,
  getHeartbeatStatus,
  getOfflineMode
}
```

## 使用示例

### 1. 配置管理服务器

```vue
<template>
  <div>
    <a-form-item label="服务器地址">
      <a-input v-model:value="settings.admin_server_url" />
    </a-form-item>

    <a-form-item label="启用连接">
      <a-switch v-model:checked="serverEnabled" />
    </a-form-item>

    <a-button @click="testConnection">测试连接</a-button>
    <a-button @click="saveSettings">保存</a-button>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { message } from 'ant-design-vue'

const settings = ref({})
const serverEnabled = computed({
  get: () => settings.value.admin_server_enabled === 'true',
  set: (val) => settings.value.admin_server_enabled = val ? 'true' : 'false'
})

onMounted(async () => {
  settings.value = await window.electronAPI.admin.getSettings()
})

const testConnection = async () => {
  const result = await window.electronAPI.admin.checkConnection()
  if (result.success) {
    message.success('连接成功')
  } else {
    message.error(`连接失败: ${result.error}`)
  }
}

const saveSettings = async () => {
  await window.electronAPI.admin.updateSettings(settings.value)
  message.success('设置已保存')
}
</script>
```

### 2. 激活授权码

```vue
<script setup>
import { ref } from 'vue'
import { message } from 'ant-design-vue'

const activationCode = ref('')
const activating = ref(false)

const activateLicense = async () => {
  if (!activationCode.value) {
    message.warning('请输入激活码')
    return
  }

  activating.value = true

  try {
    const result = await window.electronAPI.admin.activateLicense(activationCode.value)

    if (result.success) {
      message.success(`激活成功！授权类型：${result.data.license_type}`)

      if (result.data.offline_mode) {
        message.info('离线模式已启用，无需连接服务器')
      }
    } else {
      message.error(`激活失败：${result.error}`)
    }
  } catch (error) {
    message.error(`激活错误：${error.message}`)
  } finally {
    activating.value = false
  }
}
</script>
```

### 3. 检查并下载更新

```vue
<script setup>
import { ref } from 'vue'
import { message } from 'ant-design-vue'

const updateInfo = ref(null)
const checking = ref(false)
const downloading = ref(false)

const checkForUpdates = async () => {
  checking.value = true

  try {
    const result = await window.electronAPI.admin.checkUpdates()

    if (result.success) {
      if (result.has_update) {
        updateInfo.value = {
          version: result.latest_version,
          downloadUrl: result.download_url,
          mandatory: result.is_mandatory,
          notes: result.release_notes
        }
        message.success(`发现新版本：${result.latest_version}`)
      } else {
        message.info('已是最新版本')
      }
    } else {
      message.error(`检查更新失败：${result.error}`)
    }
  } catch (error) {
    message.error(`检查更新错误：${error.message}`)
  } finally {
    checking.value = false
  }
}

const downloadUpdate = async (versionId) => {
  downloading.value = true

  try {
    const result = await window.electronAPI.admin.downloadUpdate(versionId)

    if (result.success) {
      message.success(`更新已下载到：${result.path}`)
      // 提示用户手动安装
    } else {
      message.error(`下载失败：${result.error}`)
    }
  } catch (error) {
    message.error(`下载错误：${error.message}`)
  } finally {
    downloading.value = false
  }
}
</script>
```

### 4. 同步相机配置

```vue
<script setup>
import { message } from 'ant-design-vue'

const syncCameraConfig = async () => {
  try {
    const result = await window.electronAPI.admin.syncCameraConfigs()

    if (result.success) {
      if (result.config) {
        message.success(`已同步相机配置：${result.config.name}`)
      } else {
        message.info('服务器未分配相机配置')
      }
    } else {
      message.error(`同步失败：${result.error}`)
    }
  } catch (error) {
    message.error(`同步错误：${error.message}`)
  }
}
</script>
```

## 工作流程

### 初始化流程
1. 应用启动
2. `database.initialize()` - 初始化数据库
3. `licenseService.initialize()` - 初始化授权服务
4. `adminClient.initialize()` - 初始化后台客户端
   - 检查是否启用后台连接
   - 如果未注册，调用 `registerClient()`
   - 根据授权模式决定是否启动心跳

### 授权激活流程
1. 用户输入激活码
2. 调用 `window.electronAPI.admin.activateLicense(code)`
3. Main 进程 `adminClient.activateLicense(code)`
   - RSA 加密激活码
   - POST `/licenses/activate`
   - 后端 RSA 解密并验证
   - 返回授权信息（包含 offline_mode）
4. 更新本地 `license_state`
5. 根据 `offline_mode` 决定是否启动心跳

### 在线模式验证流程
1. 应用启动时调用 `validateLicense()`
2. 检查本地到期时间
3. 检查最后验证时间
4. 如果超过宽限期（3天），调用 `validateWithServer()`
5. POST `/licenses/validate`
6. 更新 `last_check_at`

### 离线模式验证流程
1. 应用启动时调用 `validateLicense()`
2. 检查本地到期时间
3. 如果 `offline_mode=true`，跳过服务器验证
4. 返回 `{ valid: true, mode: 'offline' }`

### 心跳流程（仅在线模式）
1. 启动定时器（默认5分钟）
2. 收集系统信息
3. 收集使用统计
4. POST `/clients/heartbeat`
5. 更新 `last_heartbeat_at`

## 配置选项

### 管理服务器 URL
- **开发环境**: `http://localhost:5000/api`
- **生产环境**: `https://admin.rededge.example.com/api`

### 心跳间隔
- **默认**: 300000ms (5分钟)
- **可配置范围**: 60000ms - 3600000ms (1分钟 - 1小时)

### 宽限期
- **默认**: 3天
- **说明**: 在线模式客户端离线后可继续使用的时间

## 安全说明

1. **RSA 加密**
   - 使用 Node.js `crypto` 模块
   - 2048 位密钥
   - PKCS1 填充
   - 激活码传输加密

2. **设备指纹**
   - 基于硬件信息生成
   - 用于客户端唯一识别

3. **离线模式**
   - 激活后不再连接服务器
   - 仅本地验证到期时间
   - 适合无网络环境

## 错误处理

### 网络错误
- 心跳失败不影响应用使用（宽限期内）
- 更新检查失败静默处理
- 配置同步失败提示用户

### 授权错误
- 激活码无效：提示用户
- 授权过期：阻止应用启动
- 授权被吊销：提示联系管理员

## 下一步

创建 SettingsView.vue 中的后台服务器配置界面，包括：
1. 服务器 URL 配置
2. 启用/禁用开关
3. 连接测试按钮
4. 授权激活界面
5. 更新检查界面
6. 心跳状态显示
