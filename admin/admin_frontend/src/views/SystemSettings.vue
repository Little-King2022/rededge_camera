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
        <a-card title="系统统计" :loading="statsLoading" style="margin-bottom: 24px">
          <a-descriptions :column="2">
            <a-descriptions-item label="客户端总数">
              {{ systemStats.total_clients || 0 }}
            </a-descriptions-item>
            <a-descriptions-item label="在线客户端">
              {{ systemStats.online_clients || 0 }}
            </a-descriptions-item>
            <a-descriptions-item label="授权码总数">
              {{ systemStats.total_licenses || 0 }}
            </a-descriptions-item>
            <a-descriptions-item label="已激活授权码">
              {{ systemStats.activated_licenses || 0 }}
            </a-descriptions-item>
            <a-descriptions-item label="软件版本数">
              {{ systemStats.total_versions || 0 }}
            </a-descriptions-item>
            <a-descriptions-item label="今日新增客户端">
              {{ systemStats.today_new_clients || 0 }}
            </a-descriptions-item>
          </a-descriptions>
        </a-card>

        <a-card title="使用统计">
          <a-descriptions :column="2">
            <a-descriptions-item label="今日总启动次数">
              {{ usageStats.today_total_starts || 0 }}
            </a-descriptions-item>
            <a-descriptions-item label="今日活跃客户端">
              {{ usageStats.today_active_clients || 0 }}
            </a-descriptions-item>
            <a-descriptions-item label="本月总启动次数">
              {{ usageStats.month_total_starts || 0 }}
            </a-descriptions-item>
            <a-descriptions-item label="本月活跃客户端">
              {{ usageStats.month_active_clients || 0 }}
            </a-descriptions-item>
          </a-descriptions>
        </a-card>
      </a-tab-pane>

      <a-tab-pane key="logs" tab="审计日志">
        <a-table
          :columns="logColumns"
          :data-source="auditLogs"
          :loading="logsLoading"
          :pagination="logPagination"
          @change="handleLogTableChange"
          row-key="id"
          size="small"
        >
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'action'">
              <a-tag>{{ record.action }}</a-tag>
            </template>
            <template v-else-if="column.key === 'created_at'">
              {{ formatDateTime(record.created_at) }}
            </template>
          </template>
        </a-table>
      </a-tab-pane>
    </a-tabs>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { message } from 'ant-design-vue'
import { getSystemSettings, updateSystemSettings, getSystemStats, getAuditLogs } from '@/api/system'
import { formatDateTime } from '@/utils/format'

const activeTab = ref('general')

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
const usageStats = reactive({})

const logsLoading = ref(false)
const auditLogs = ref([])
const logPagination = reactive({
  current: 1,
  pageSize: 20,
  total: 0,
  showSizeChanger: true,
  showTotal: (total) => `共 ${total} 条`
})

const logColumns = [
  { title: 'ID', dataIndex: 'id', key: 'id', width: 80 },
  { title: '用户', dataIndex: 'user_id', key: 'user_id', width: 100 },
  { title: '操作', dataIndex: 'action', key: 'action' },
  { title: '资源类型', dataIndex: 'resource_type', key: 'resource_type' },
  { title: '资源ID', dataIndex: 'resource_id', key: 'resource_id' },
  { title: 'IP地址', dataIndex: 'ip_address', key: 'ip_address' },
  { title: '时间', dataIndex: 'created_at', key: 'created_at', width: 180 }
]

const handleSaveGeneral = async () => {
  const res = await updateSystemSettings({
    ...generalSettings
  })

  if (res.success) {
    message.success('保存成功')
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
    Object.assign(generalSettings, res.data.general || {})
    Object.assign(licenseSettings, res.data.license || {})
    Object.assign(heartbeatSettings, res.data.heartbeat || {})
  }
}

const fetchStats = async () => {
  statsLoading.value = true
  try {
    const res = await getSystemStats()

    if (res.success) {
      Object.assign(systemStats, res.data.system || {})
      Object.assign(usageStats, res.data.usage || {})
    }
  } finally {
    statsLoading.value = false
  }
}

const fetchAuditLogs = async () => {
  logsLoading.value = true
  try {
    const res = await getAuditLogs({
      page: logPagination.current,
      per_page: logPagination.pageSize
    })

    if (res.success) {
      auditLogs.value = res.data.items
      logPagination.total = res.data.total
    }
  } finally {
    logsLoading.value = false
  }
}

const handleLogTableChange = (pag) => {
  logPagination.current = pag.current
  logPagination.pageSize = pag.pageSize
  fetchAuditLogs()
}

onMounted(() => {
  fetchSettings()
  fetchStats()
  fetchAuditLogs()
})
</script>

<style scoped>
.system-settings {
  padding: 24px;
}
</style>
