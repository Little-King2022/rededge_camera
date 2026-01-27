<template>
  <div class="dashboard">
    <a-row :gutter="24">
      <a-col :span="6">
        <a-card>
          <a-statistic
            title="客户端总数"
            :value="totalClients"
            :value-style="{ color: '#3f8600' }"
          >
            <template #prefix>
              <desktop-outlined />
            </template>
          </a-statistic>
        </a-card>
      </a-col>

      <a-col :span="6">
        <a-card>
          <a-statistic
            title="在线客户端"
            :value="onlineClients"
            :value-style="{ color: '#1890ff' }"
          >
            <template #prefix>
              <wifi-outlined />
            </template>
          </a-statistic>
        </a-card>
      </a-col>

      <a-col :span="6">
        <a-card>
          <a-statistic
            title="离线客户端"
            :value="offlineClients"
            :value-style="{ color: '#cf1322' }"
          >
            <template #prefix>
              <disconnect-outlined />
            </template>
          </a-statistic>
        </a-card>
      </a-col>

      <a-col :span="6">
        <a-card>
          <a-statistic
            title="今日启动"
            :value="todayNewClients"
            :value-style="{ color: '#fa8c16' }"
          >
            <template #prefix>
              <rise-outlined />
            </template>
          </a-statistic>
        </a-card>
      </a-col>
    </a-row>

    <a-row :gutter="24" style="margin-top: 24px">
      <a-col :span="6">
        <a-card>
          <a-statistic
            title="授权码总数"
            :value="totalLicenses"
            :value-style="{ color: '#531dab' }"
          >
            <template #prefix>
              <key-outlined />
            </template>
          </a-statistic>
        </a-card>
      </a-col>

      <a-col :span="6">
        <a-card>
          <a-statistic
            title="已使用授权码"
            :value="usedLicenses"
            :value-style="{ color: '#2f54eb' }"
          >
            <template #prefix>
              <safety-certificate-outlined />
            </template>
          </a-statistic>
        </a-card>
      </a-col>

      <a-col :span="6">
        <a-card>
          <a-statistic
            title="版本总数"
            :value="totalVersions"
            :value-style="{ color: '#08979c' }"
          >
            <template #prefix>
              <appstore-outlined />
            </template>
          </a-statistic>
        </a-card>
      </a-col>

      <a-col :span="6">
        <a-card>
          <a-statistic
            title="累计下载"
            :value="totalDownloads"
            :value-style="{ color: '#ad6800' }"
          >
            <template #prefix>
              <cloud-download-outlined />
            </template>
          </a-statistic>
        </a-card>
      </a-col>
    </a-row>

    <a-row :gutter="24" style="margin-top: 24px">
      <a-col :span="12">
        <a-card title="授权状态分布" :loading="loading">
          <div v-if="licenseDistribution.length" class="distribution-list">
            <div v-for="item in licenseDistribution" :key="item.key" class="distribution-item">
              <div class="distribution-header">
                <span>{{ item.label }}</span>
                <span>{{ item.count }}</span>
              </div>
              <a-progress :percent="item.percent" size="small" :show-info="false" />
            </div>
          </div>
          <div v-else class="empty-text">暂无数据</div>
        </a-card>
      </a-col>

      <a-col :span="12">
        <a-card title="平台分布" :loading="loading">
          <div v-if="platformDistribution.length" class="distribution-list">
            <div v-for="item in platformDistribution" :key="item.key" class="distribution-item">
              <div class="distribution-header">
                <span>{{ item.label }}</span>
                <span>{{ item.count }}</span>
              </div>
              <a-progress :percent="item.percent" size="small" :show-info="false" />
            </div>
          </div>
          <div v-else class="empty-text">暂无数据</div>
        </a-card>
      </a-col>
    </a-row>

    <a-row :gutter="24" style="margin-top: 24px">
      <a-col :span="12">
        <a-card title="客户端版本分布" :loading="loading">
          <div v-if="appVersionDistribution.length" class="distribution-list">
            <div v-for="item in appVersionDistribution" :key="item.key" class="distribution-item">
              <div class="distribution-header">
                <span>{{ item.label }}</span>
                <span>{{ item.count }}</span>
              </div>
              <a-progress :percent="item.percent" size="small" :show-info="false" />
            </div>
          </div>
          <div v-else class="empty-text">暂无数据</div>
        </a-card>
      </a-col>

      <a-col :span="12">
        <a-card title="使用概况" :loading="loading">
          <a-descriptions :column="2" size="small">
            <a-descriptions-item label="在线率">
              {{ onlineRate }}%
            </a-descriptions-item>
            <a-descriptions-item label="今日启动">
              {{ todayNewClients }}
            </a-descriptions-item>
            <a-descriptions-item label="今日活跃">
              {{ todayActiveClients }}
            </a-descriptions-item>
            <a-descriptions-item label="今日使用时长">
              {{ formatDuration(todayUsageSeconds) }}
            </a-descriptions-item>
          </a-descriptions>
          <a-divider />
          <div class="section-title">最新版本</div>
          <a-list
            size="small"
            :data-source="latestVersions"
            :split="false"
          >
            <template #renderItem="{ item }">
              <a-list-item class="list-item">
                <span>{{ item.version }}</span>
                <a-space>
                  <a-tag>{{ formatPlatform(item.platform) }}/{{ formatArch(item.arch) }}</a-tag>
                  <a-tag v-if="item.is_mandatory" color="red">强制</a-tag>
                </a-space>
              </a-list-item>
            </template>
          </a-list>
        </a-card>
      </a-col>
    </a-row>

    <a-row :gutter="24" style="margin-top: 24px">
      <a-col :span="24">
        <a-card title="版本下载排行" :loading="loading">
          <a-table
            :columns="downloadColumns"
            :data-source="topDownloadedVersions"
            :pagination="false"
            size="small"
            row-key="id"
          >
            <template #bodyCell="{ column, record }">
              <template v-if="column.key === 'platform'">
                {{ formatPlatform(record.platform) }} ({{ formatArch(record.arch) }})
              </template>
              <template v-else-if="column.key === 'file_size'">
                {{ formatFileSize(record.file_size) }}
              </template>
              <template v-else-if="column.key === 'published_at'">
                {{ formatDateTime(record.published_at) }}
              </template>
            </template>
          </a-table>
        </a-card>
      </a-col>
    </a-row>

    <a-row :gutter="24" style="margin-top: 24px">
      <a-col :span="24">
        <a-card title="最近客户端活动" :loading="loading">
          <a-table
            :columns="columns"
            :data-source="recentClients"
            :pagination="false"
            size="small"
          >
            <template #bodyCell="{ column, record }">
              <template v-if="column.key === 'license_status'">
                <a-tag :color="getLicenseStatusColor(record.license_status)">
                  {{ formatLicenseStatus(record.license_status) }}
                </a-tag>
              </template>
              <template v-else-if="column.key === 'platform'">
                {{ formatPlatform(record.platform) }}
              </template>
              <template v-else-if="column.key === 'is_online'">
                <a-tag :color="record.is_online ? 'green' : 'default'">
                  {{ record.is_online ? '在线' : '离线' }}
                </a-tag>
              </template>
              <template v-else-if="column.key === 'last_heartbeat_at'">
                {{ formatDateTime(record.last_heartbeat_at) }}
              </template>
            </template>
          </a-table>
        </a-card>
      </a-col>
    </a-row>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { useStatsStore } from '@/stores/stats'
import {
  formatLicenseStatus,
  formatPlatform,
  formatArch,
  formatDateTime,
  formatFileSize,
  formatDuration
} from '@/utils/format'
import {
  DesktopOutlined,
  WifiOutlined,
  DisconnectOutlined,
  RiseOutlined,
  KeyOutlined,
  SafetyCertificateOutlined,
  AppstoreOutlined,
  CloudDownloadOutlined
} from '@ant-design/icons-vue'

const statsStore = useStatsStore()
const loading = ref(false)
const recentClients = ref([])
const dashboardData = computed(() => statsStore.dashboardData || {})
const overview = computed(() => dashboardData.value.overview || {})
const totalClients = computed(() => overview.value.total_clients ?? statsStore.totalClients)
const onlineClients = computed(() => overview.value.online_clients ?? statsStore.onlineClients)
const offlineClients = computed(() => {
  if (overview.value.total_clients !== undefined && overview.value.online_clients !== undefined) {
    return Math.max(overview.value.total_clients - overview.value.online_clients, 0)
  }
  return statsStore.offlineClients
})
const todayNewClients = computed(() => overview.value.today_starts ?? statsStore.todayNewClients)
const totalLicenses = computed(() => overview.value.total_licenses ?? 0)
const usedLicenses = computed(() => overview.value.used_licenses ?? 0)
const totalVersions = computed(() => overview.value.total_versions ?? 0)
const totalDownloads = computed(() => overview.value.total_downloads ?? 0)
const onlineRate = computed(() => overview.value.online_rate ?? 0)
const todayUsageSeconds = computed(() => overview.value.today_usage_seconds ?? 0)
const todayActiveClients = computed(() => overview.value.today_active_clients ?? 0)
const latestVersions = computed(() => dashboardData.value.latest_versions || [])
const topDownloadedVersions = computed(() => dashboardData.value.top_downloaded_versions || [])

const buildDistribution = (source, formatter, options = {}) => {
  const entries = Object.entries(source || {}).map(([key, value]) => {
    const normalizedKey = key || 'unknown'
    const rawLabel = formatter ? formatter(normalizedKey) : normalizedKey
    const label = normalizedKey === 'unknown' ? '未知' : rawLabel
    return {
      key: normalizedKey,
      label,
      count: Number(value) || 0
    }
  })
  const total = entries.reduce((sum, item) => sum + item.count, 0)
  let items = entries

  if (options.order?.length) {
    const orderSet = new Set(options.order)
    const ordered = options.order.map((key) => {
      const entry = entries.find((item) => item.key === key)
      if (entry) {
        return entry
      }
      const fallbackLabel = key === 'unknown' ? '未知' : (formatter ? formatter(key) : key)
      return { key, label: fallbackLabel, count: 0 }
    })
    const remaining = entries.filter((item) => !orderSet.has(item.key))
    items = [...ordered, ...remaining]
  } else {
    items = [...entries].sort((a, b) => b.count - a.count)
  }

  if (options.limit && items.length > options.limit) {
    const limited = items.slice(0, options.limit)
    const remainder = items.slice(options.limit)
    const otherCount = remainder.reduce((sum, item) => sum + item.count, 0)
    limited.push({
      key: 'other',
      label: '其他',
      count: otherCount
    })
    items = limited
  }

  return items.map((item) => ({
    ...item,
    percent: total ? Math.round((item.count / total) * 100) : 0
  })).filter((item) => item.count > 0)
}

const licenseDistribution = computed(() => buildDistribution(
  dashboardData.value.license_distribution,
  formatLicenseStatus,
  { order: ['activated', 'trial', 'expired', 'revoked', 'unknown'] }
))

const platformDistribution = computed(() => buildDistribution(
  dashboardData.value.platform_distribution,
  formatPlatform,
  { order: ['win32', 'darwin', 'linux', 'unknown'] }
))

const appVersionDistribution = computed(() => buildDistribution(
  dashboardData.value.app_version_distribution,
  (value) => value || '未知',
  { limit: 6 }
))

const columns = [
  { title: '设备指纹', dataIndex: 'device_fingerprint', key: 'device_fingerprint' },
  { title: '主机名', dataIndex: 'hostname', key: 'hostname' },
  { title: '在线状态', dataIndex: 'is_online', key: 'is_online' },
  { title: '平台', dataIndex: 'platform', key: 'platform' },
  { title: '版本', dataIndex: 'app_version', key: 'app_version' },
  { title: '授权状态', dataIndex: 'license_status', key: 'license_status' },
  { title: '最后心跳', dataIndex: 'last_heartbeat_at', key: 'last_heartbeat_at' }
]

const downloadColumns = [
  { title: '版本', dataIndex: 'version', key: 'version' },
  { title: '平台', dataIndex: 'platform', key: 'platform' },
  { title: '下载数', dataIndex: 'download_count', key: 'download_count' },
  { title: '大小', dataIndex: 'file_size', key: 'file_size' },
  { title: '发布时间', dataIndex: 'published_at', key: 'published_at' }
]

const getLicenseStatusColor = (status) => {
  const colorMap = {
    trial: 'blue',
    activated: 'green',
    expired: 'red',
    revoked: 'default'
  }
  return colorMap[status] || 'default'
}

const fetchData = async () => {
  loading.value = true
  try {
    await statsStore.fetchDashboardData()

    if (statsStore.dashboardData) {
      recentClients.value = statsStore.dashboardData.recent_clients || []
    }
  } catch (error) {
    console.error('获取仪表盘数据失败:', error)
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  fetchData()
})
</script>

<style scoped>
.dashboard {
  padding: 24px;
}

.distribution-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.distribution-item {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.distribution-header {
  display: flex;
  justify-content: space-between;
  color: #595959;
}

.empty-text {
  color: #8c8c8c;
  text-align: center;
  padding: 24px 0;
}

.section-title {
  font-weight: 600;
  color: #262626;
  margin-bottom: 8px;
}

.list-item {
  display: flex;
  justify-content: space-between;
  width: 100%;
}
</style>
