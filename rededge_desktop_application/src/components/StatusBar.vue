<template>
  <div class="status-bar">
    <!-- 左侧区域：软件信息和系统信息 -->
    <div class="status-left">
      <div class="status-item">
        <span class="status-label">{{ t('statusBar.version') }}:</span>
        <span class="status-value">v{{ appVersion }}</span>
      </div>

      <a-divider type="vertical" class="status-divider" />

      <div class="status-item">
        <span class="status-label">{{ t('statusBar.licenseStatus') }}:</span>
        <CheckCircleFilled v-if="licenseStatus === 'activated'" class="status-icon activated" />
        <CloseCircleFilled v-else class="status-icon" :class="statusClass" />
        <span class="status-value">{{ statusText }}</span>
      </div>

      <a-divider type="vertical" class="status-divider" />

      <div class="status-item">
        <ClockCircleOutlined class="status-icon" />
        <span class="status-value">{{ currentTime }}</span>
      </div>

      <a-divider type="vertical" class="status-divider" />

      <div class="status-item">
        <DatabaseOutlined class="status-icon" />
        <span class="status-label">RAM:</span>
        <span class="status-value">{{ memoryText }}</span>
      </div>

      <a-divider type="vertical" class="status-divider" />

      <div class="status-item">
        <DashboardOutlined class="status-icon" />
        <span class="status-label">CPU:</span>
        <span class="status-value">{{ cpuUsage }}%</span>
      </div>
    </div>

    <!-- 中间区域：留空或未来扩展 -->
    <div class="status-center">
    </div>

    <!-- 右侧区域：消息和帮助 -->
    <div class="status-right">
      <a-button type="text" class="status-btn" @click="showMessages = true">
        <a-badge :count="unreadCount" :offset="[-20, 3]" :number-style="{
          fontSize: '10px',
          minWidth: '12px',
          height: '13px',
          lineHeight: '12px',
          padding: '0 4px'
        }">
          <BellOutlined class="status-icon" />
        </a-badge>
        <span class="status-value">{{ t('statusBar.messages.title') }}</span>
      </a-button>


      <a-button type="text" class="status-btn" @click="showHelp = true">
        <QuestionCircleOutlined class="status-icon" />
        <span class="status-value">{{ t('statusBar.help.title') }}</span>
      </a-button>
    </div>

    <!-- 消息列表抽屉 -->
    <a-drawer v-model:open="showMessages" :title="t('statusBar.messages.title')" placement="right" :width="400"
      :body-style="{ padding: '12px' }">
      <a-list :data-source="messages" :locale="{ emptyText: t('statusBar.messages.empty') }">
        <template #renderItem="{ item }">
          <a-list-item :class="['message-item', { 'message-unread': !item.read }]" @click="markAsRead(item.id)">
            <a-list-item-meta>
              <template #avatar>
                <a-badge dot :color="item.read ? 'gray' : 'blue'">
                  <InfoCircleOutlined :style="{ fontSize: '20px' }" />
                </a-badge>
              </template>
              <template #title>
                <span :style="{ fontWeight: item.read ? 'normal' : 'bold' }">{{ item.title }}</span>
              </template>
              <template #description>
                <div>{{ item.content }}</div>
                <div class="message-time">{{ item.time }}</div>
              </template>
            </a-list-item-meta>
          </a-list-item>
        </template>
      </a-list>
      <template #footer>
        <a-button type="link" block @click="markAllAsRead">
          {{ t('statusBar.messages.markAllRead') }}
        </a-button>
      </template>
    </a-drawer>

    <!-- 帮助文档悬浮窗口 -->
    <HelpWindow v-model:visible="showHelp" :title="t('statusBar.help.title')" :default-position="helpWindowPosition">
      <div class="help-content">
        <h3>{{ currentPageHelp.title }}</h3>
        <a-divider />
        <div v-html="currentPageHelp.content"></div>
      </div>
    </HelpWindow>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import {
  CheckCircleFilled,
  CloseCircleFilled,
  ClockCircleOutlined,
  DatabaseOutlined,
  DashboardOutlined,
  BellOutlined,
  QuestionCircleOutlined,
  InfoCircleOutlined
} from '@ant-design/icons-vue'
import HelpWindow from './HelpWindow.vue'

const { t } = useI18n()
const router = useRouter()

// 应用版本
const appVersion = ref('1.0.1')

// 授权状态
const licenseStatus = ref('unknown')

// 当前时间
const currentTime = ref('')
let timeInterval = null
let licenseInterval = null

// 系统信息
const systemInfo = ref({
  memory: { total: 0, used: 0, free: 0, usagePercent: 0 },
  cpu: { usage: 0, cores: 0 }
})
let systemInfoInterval = null

// 消息相关
const showMessages = ref(false)
const messages = ref([
  {
    id: 1,
    title: t('statusBar.messages.welcome'),
    content: t('statusBar.messages.welcomeContent'),
    time: new Date().toLocaleString(),
    read: false
  },
  {
    id: 2,
    title: t('statusBar.messages.systemUpdate'),
    content: t('statusBar.messages.systemUpdateContent'),
    time: new Date(Date.now() - 86400000).toLocaleString(),
    read: true
  }
])

// 帮助相关
const showHelp = ref(false)

// 帮助窗口位置（计算属性，确保在窗口范围内）
const helpWindowPosition = computed(() => {
  if (typeof window !== 'undefined') {
    return { x: Math.max(50, window.innerWidth - 550), y: 100 }
  }
  return { x: 100, y: 100 }
})

// 计算属性
const unreadCount = computed(() => {
  return messages.value.filter(m => !m.read).length
})

const memoryText = computed(() => {
  const used = (systemInfo.value.memory.used / 1024 / 1024 / 1024).toFixed(1)
  const total = (systemInfo.value.memory.total / 1024 / 1024 / 1024).toFixed(1)
  return `${used} / ${total} GB`
})

const cpuUsage = computed(() => {
  return systemInfo.value.cpu.usage.toFixed(1)
})

const currentPageHelp = computed(() => {
  const route = router.currentRoute.value.path
  const helpMap = {
    '/connect': {
      title: t('statusBar.help.connect.title'),
      content: t('statusBar.help.connect.content')
    },
    '/preview': {
      title: t('statusBar.help.preview.title'),
      content: t('statusBar.help.preview.content')
    },
    '/capture': {
      title: t('statusBar.help.capture.title'),
      content: t('statusBar.help.capture.content')
    },
    '/files': {
      title: t('statusBar.help.files.title'),
      content: t('statusBar.help.files.content')
    },
    '/status': {
      title: t('statusBar.help.status.title'),
      content: t('statusBar.help.status.content')
    },
    '/calibration': {
      title: t('statusBar.help.calibration.title'),
      content: t('statusBar.help.calibration.content')
    },
    '/alignment': {
      title: t('statusBar.help.alignment.title'),
      content: t('statusBar.help.alignment.content')
    },
    '/settings': {
      title: t('statusBar.help.settings.title'),
      content: t('statusBar.help.settings.content')
    }
  }
  return helpMap[route] || {
    title: t('statusBar.help.default.title'),
    content: t('statusBar.help.default.content')
  }
})

const updateTime = () => {
  const now = new Date()
  currentTime.value = now.toLocaleString(undefined, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  })
}

const updateSystemInfo = async () => {
  try {
    const info = await window.electronAPI?.system?.getInfo?.()
    if (info) {
      systemInfo.value = info
    }
  } catch (error) {
    console.error('Failed to get system info:', error)
  }
}

const loadAppVersion = async () => {
  try {
    const version = await window.electronAPI?.system?.getVersion?.()
    if (version) {
      appVersion.value = version
    }
  } catch (error) {
    console.error('Failed to get app version:', error)
  }
}

const statusClass = computed(() => {
  if (licenseStatus.value === 'activated') return 'activated'
  if (licenseStatus.value === 'trial') return 'trial'
  if (licenseStatus.value === 'expired' || licenseStatus.value === 'revoked' || licenseStatus.value === 'invalid') {
    return 'revoked'
  }
  return 'not-activated'
})

const statusText = computed(() => {
  switch (licenseStatus.value) {
    case 'activated':
      return t('settings.status.activated')
    case 'trial':
      return t('settings.status.trial')
    case 'expired':
      return t('settings.status.expired')
    case 'revoked':
    case 'invalid':
      return t('settings.status.revoked')
    default:
      return t('settings.status.unknown')
  }
})

const loadLicenseStatus = async () => {
  try {
    const license = await window.electronAPI?.license?.getInfo?.()
    if (license) {
      licenseStatus.value = String(license.status || 'unknown').toLowerCase()
    }
  } catch (error) {
    console.error('Failed to get license status:', error)
  }
}

const markAsRead = (id) => {
  const message = messages.value.find(m => m.id === id)
  if (message) {
    message.read = true
  }
}

const markAllAsRead = () => {
  messages.value.forEach(m => m.read = true)
}

// 生命周期
onMounted(() => {
  updateTime()
  timeInterval = setInterval(updateTime, 1000)

  updateSystemInfo()
  systemInfoInterval = setInterval(updateSystemInfo, 2000)

  loadAppVersion()
  loadLicenseStatus()
  licenseInterval = setInterval(loadLicenseStatus, 60000)
})

onUnmounted(() => {
  if (timeInterval) clearInterval(timeInterval)
  if (systemInfoInterval) clearInterval(systemInfoInterval)
  if (licenseInterval) clearInterval(licenseInterval)
})
</script>

<style scoped>
.status-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  height: 32px;
  background: #2c2c2c;
  color: #ffffff;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 20px;
  z-index: 999;
  font-size: 14px;
  box-shadow: 0 -1px 4px rgba(0, 0, 0, 0.3);
}

.status-left,
.status-center,
.status-right {
  display: flex;
  align-items: center;
  gap: 5px;
}

.status-item {
  display: flex;
  align-items: center;
  gap: 6px;
}

.status-label {
  color: #a0a0a0;
  font-size: 13px;
}

.status-value {
  color: #e0e0e0;
  font-size: 14px;
}

.status-icon {
  font-size: 14px;
  color: #a0a0a0;
}

.status-icon.activated {
  color: #52c41a;
}

.status-icon.trial {
  color: #faad14;
}

.status-icon.revoked {
  color: #ff4d4f;
}

.status-icon.not-activated {
  color: #ff4d4f;
}

.status-divider {
  margin: 0 10px;
  height: 18px;
  border-color: #3a3a3a;
}

.memory-indicator {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  display: inline-block;
}

.indicator-low {
  background: #52c41a;
  box-shadow: 0 0 6px #52c41a;
}

.indicator-medium {
  background: #faad14;
  box-shadow: 0 0 6px #faad14;
}

.indicator-high {
  background: #ff4d4f;
  box-shadow: 0 0 6px #ff4d4f;
}

.status-btn {
  height: 32px;
  padding: 0 8px;
  color: #a0a0a0;
  transition: all 0.2s;
}

.status-btn:hover {
  color: #e0e0e0;
  background: rgba(255, 255, 255, 0.1);
}

.message-item {
  cursor: pointer;
  transition: background 0.2s;
}

.message-item:hover {
  background: rgba(0, 0, 0, 0.02);
}

.message-unread {
  background: rgba(24, 144, 255, 0.05);
}

.message-time {
  font-size: 12px;
  color: #999;
  margin-top: 4px;
}

.help-content {
  color: #333;
}

.help-content h3 {
  margin: 0 0 16px 0;
  font-size: 18px;
  font-weight: 600;
}

.help-content :deep(p) {
  margin-bottom: 12px;
  line-height: 1.6;
}

.help-content :deep(ul) {
  padding-left: 20px;
}

.help-content :deep(li) {
  margin-bottom: 8px;
  line-height: 1.6;
}
</style>
