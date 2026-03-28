<template>
  <div class="system-settings">
    <a-tabs v-model:activeKey="activeTab">
      <a-tab-pane key="general" tab="通用设置">
        <a-form :model="generalSettings" :label-col="{ span: 4 }">
          <a-form-item label="站点名称">
            <a-input v-model:value="generalSettings.site_name" />
          </a-form-item>

          <a-form-item label="站点URL">
            <a-input v-model:value="generalSettings.site_url" />
          </a-form-item>

          <a-form-item label="系统邮箱">
            <a-input v-model:value="generalSettings.system_email" type="email" />
          </a-form-item>

          <a-form-item>
            <a-button type="primary" @click="handleSaveGeneral">
              保存设置
            </a-button>
          </a-form-item>
        </a-form>
      </a-tab-pane>

      <a-tab-pane key="license" tab="授权设置">
        <a-form :model="licenseSettings" :label-col="{ span: 4 }">
          <a-form-item label="试用期天数">
            <a-input-number
              v-model:value="licenseSettings.trial_period_days"
              :min="1"
              :max="90"
              style="width: 200px"
            />
            <span style="margin-left: 8px; color: #999">默认 7 天</span>
          </a-form-item>

          <a-form-item label="在线模式宽限期">
            <a-input-number
              v-model:value="licenseSettings.online_grace_period_days"
              :min="1"
              :max="30"
              style="width: 200px"
            />
            <span style="margin-left: 8px; color: #999">客户端离线后可继续使用的天数，默认 3 天</span>
          </a-form-item>

          <a-form-item label="离线模式说明">
            <a-textarea
              v-model:value="licenseSettings.offline_mode_description"
              :rows="3"
              placeholder="在生成授权码时显示的离线模式说明文本"
            />
          </a-form-item>

          <a-form-item>
            <a-button type="primary" @click="handleSaveLicense">
              保存设置
            </a-button>
          </a-form-item>
        </a-form>
      </a-tab-pane>

      <a-tab-pane key="heartbeat" tab="心跳设置">
        <a-form :model="heartbeatSettings" :label-col="{ span: 4 }">
          <a-form-item label="心跳超时阈值">
            <a-input-number
              v-model:value="heartbeatSettings.heartbeat_timeout_minutes"
              :min="1"
              :max="60"
              style="width: 200px"
            />
            <span style="margin-left: 8px; color: #999">分钟，默认 5 分钟</span>
          </a-form-item>

          <a-form-item label="离线判定时间">
            <a-input-number
              v-model:value="heartbeatSettings.offline_threshold_minutes"
              :min="5"
              :max="120"
              style="width: 200px"
            />
            <span style="margin-left: 8px; color: #999">分钟，超过此时间未心跳视为离线，默认 10 分钟</span>
          </a-form-item>

          <a-form-item>
            <a-button type="primary" @click="handleSaveHeartbeat">
              保存设置
            </a-button>
          </a-form-item>
        </a-form>
      </a-tab-pane>

      <a-tab-pane key="statistics" tab="统计信息">
        <Dashboard />
      </a-tab-pane>

      <a-tab-pane key="logs" tab="审计日志">
        <a-space style="margin-bottom: 16px;">
          <a-button @click="handleExportLogs" :loading="logsLoading">
            <export-outlined />
            导出
          </a-button>
          <a-button @click="fetchAuditLogs" :loading="logsLoading">
            <reload-outlined />
            刷新
          </a-button>
        </a-space>
        <a-table
          :columns="logColumns"
          :data-source="auditLogs"
          :loading="logsLoading"
          :pagination="logPagination"
          @change="handleLogTableChange"
          row-key="id"
          size="small"
          :scroll="{ x: 1200 }"
        >
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'created_at'">
              {{ formatDateTime(record.created_at) }}
            </template>
            <template v-if="column.key === 'user_agent'">
              <a-tooltip :title="record.user_agent">
                {{ record.user_agent }}
              </a-tooltip>
            </template>
          </template>
        </a-table>
      </a-tab-pane>
    </a-tabs>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, computed } from 'vue'
import { message } from 'ant-design-vue'
import * as XLSX from 'xlsx'
import {
  UserOutlined,
  CheckCircleOutlined,
  MinusCircleOutlined,
  ThunderboltOutlined,
  KeyOutlined,
  SafetyCertificateOutlined,
  ExperimentOutlined,
  CheckOutlined,
  LockOutlined,
  CodeOutlined,
  DownloadOutlined,
  PlayCircleOutlined,
  TeamOutlined,
  ClockCircleOutlined,
  ExportOutlined,
  ReloadOutlined
} from '@ant-design/icons-vue'
import { getSystemSettings, updateSystemSettings, getSystemStats, getAuditLogs } from '@/api/system'
import { formatDateTime } from '@/utils/format'
import { useSystemStore } from '@/stores/system'
import Dashboard from './Dashboard.vue'

const activeTab = ref('general')
const systemStore = useSystemStore()

const generalSettings = reactive({
  site_name: 'RedEdge 后台管理系统',
  site_url: '',
  system_email: ''
})

const licenseSettings = reactive({
  trial_period_days: 7,
  online_grace_period_days: 3,
  offline_mode_description: '离线模式下，客户端激活后不再连接服务器验证授权'
})

const heartbeatSettings = reactive({
  heartbeat_timeout_minutes: 5,
  offline_threshold_minutes: 10
})

const statsLoading = ref(false)
const systemStats = reactive({})

const logsLoading = ref(false)
const auditLogs = ref([])
const logPagination = reactive({
  current: 1,
  pageSize: 20,
  total: 0,
  showSizeChanger: true,
  showTotal: (total) => `共 ${total} 条`
})

// 动态生成筛选选项
const getUniqueValues = (data, key) => {
  const values = data.map(item => item[key]).filter(Boolean)
  return [...new Set(values)].map(value => ({ text: value, value }))
}

const logColumns = computed(() => [
  { 
    title: 'ID', 
    dataIndex: 'id', 
    key: 'id', 
    width: 60,
    sorter: (a, b) => a.id - b.id,
    fixed: 'left',
  },
  { 
    title: '用户', 
    dataIndex: 'username', 
    key: 'username', 
    width: 100,
    sorter: (a, b) => (a.username || '').localeCompare(b.username || ''),
    filters: getUniqueValues(auditLogs.value, 'username'),
    onFilter: (value, record) => record.username === value,
    fixed: 'left',
  },
  { 
    title: '操作', 
    dataIndex: 'action', 
    key: 'action',
    sorter: (a, b) => (a.action || '').localeCompare(b.action || ''),
    filters: getUniqueValues(auditLogs.value, 'action'),
    onFilter: (value, record) => record.action === value
  },
  { 
    title: '资源类型', 
    dataIndex: 'resource_type', 
    key: 'resource_type',
    sorter: (a, b) => (a.resource_type || '').localeCompare(b.resource_type || ''),
    filters: getUniqueValues(auditLogs.value, 'resource_type'),
    onFilter: (value, record) => record.resource_type === value
  },
  { 
    title: 'IP地址', 
    dataIndex: 'ip_address', 
    key: 'ip_address',
    sorter: (a, b) => (a.ip_address || '').localeCompare(b.ip_address || ''),
    filters: getUniqueValues(auditLogs.value, 'ip_address'),
    onFilter: (value, record) => record.ip_address === value,
    width: 100,
  },
  { 
    title: '请求UA', 
    dataIndex: 'user_agent', 
    key: 'user_agent',
    sorter: (a, b) => (a.user_agent || '').localeCompare(b.user_agent || ''),
    filters: getUniqueValues(auditLogs.value, 'user_agent'),
    onFilter: (value, record) => record.user_agent === value,
    ellipsis: true
  },
  { 
    title: '时间', 
    dataIndex: 'created_at', 
    key: 'created_at', 
    width: 180,
    sorter: (a, b) => new Date(a.created_at) - new Date(b.created_at)
  }
])

const handleSaveGeneral = async () => {
  const res = await updateSystemSettings({
    ...generalSettings
  })

  if (res.success) {
    message.success('保存成功')
    // 更新 store 中的站点名称
    systemStore.settings.site_name = generalSettings.site_name
    // 刷新页面标题
    document.title = `${generalSettings.site_name || 'RedEdge 后台管理系统'}`
  } else {
    message.error(res.error || '保存失败')
  }
}

const handleSaveLicense = async () => {
  const res = await updateSystemSettings({
    ...licenseSettings
  })

  if (res.success) {
    message.success('保存成功')
  } else {
    message.error(res.error || '保存失败')
  }
}

const handleSaveHeartbeat = async () => {
  const res = await updateSystemSettings({
    ...heartbeatSettings
  })

  if (res.success) {
    message.success('保存成功')
  } else {
    message.error(res.error || '保存失败')
  }
}

const fetchSettings = async () => {
  const res = await getSystemSettings()

  if (res.success && res.data) {
    console.log(res)
    Object.assign(generalSettings, res.data || {})
    Object.assign(licenseSettings, res.data || {})
    Object.assign(heartbeatSettings, res.data || {})
  }
}

const fetchStats = async () => {
  statsLoading.value = true
  try {
    const res = await getSystemStats()

    if (res.success) {
      console.log(res)
      Object.assign(systemStats, res.data || {})
    }
  } finally {
    statsLoading.value = false
  }
}

const fetchAuditLogs = async () => {
  logsLoading.value = true
  try {
    const perPage = 200
    let page = 1
    let allLogs = []
    let total = 0

    while (true) {
      const res = await getAuditLogs({
        page,
        per_page: perPage
      })

      if (!res.success) {
        break
      }

      const batch = res.data || []
      allLogs = allLogs.concat(batch)
      total = res.total ?? allLogs.length

      if (allLogs.length >= total || batch.length === 0) {
        break
      }

      page += 1
    }

    auditLogs.value = allLogs
    logPagination.total = allLogs.length

    const maxPage = Math.max(1, Math.ceil(allLogs.length / logPagination.pageSize))
    if (logPagination.current > maxPage) {
      logPagination.current = 1
    }
  } finally {
    logsLoading.value = false
  }
}

const handleLogTableChange = (pag) => {
  logPagination.current = pag.current
  logPagination.pageSize = pag.pageSize
}

onMounted(() => {
  fetchSettings()
  fetchStats()
  fetchAuditLogs()
})

const handleExportLogs = () => {
  const data = auditLogs.value.map(item => ({
    ID: item.id,
    用户: item.username || '-',
    操作: item.action || '-',
    资源类型: item.resource_type || '-',
    IP地址: item.ip_address || '-',
    请求UA: item.user_agent || '-',
    时间: formatDateTime(item.created_at)
  }))

  const ws = XLSX.utils.json_to_sheet(data)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, '审计日志')
  XLSX.writeFile(wb, `审计日志_${new Date().toLocaleDateString()}.xlsx`)
  message.success('导出成功')
}
</script>

<style scoped>
.system-settings {
  padding: 24px;
}
</style>
