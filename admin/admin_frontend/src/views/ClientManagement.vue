<template>
  <div class="client-management">
    <div class="toolbar">
      <a-space>
        <a-select v-model:value="filters.license_status" placeholder="授权状态" style="width: 120px" allowClear
          @change="fetchData">
          <a-select-option value="trial">试用</a-select-option>
          <a-select-option value="activated">已激活</a-select-option>
          <a-select-option value="expired">已过期</a-select-option>
          <a-select-option value="revoked">已吊销</a-select-option>
        </a-select>

        <a-select v-model:value="filters.platform" placeholder="平台" style="width: 120px" allowClear @change="fetchData">
          <a-select-option value="win32">Windows</a-select-option>
          <a-select-option value="darwin">macOS</a-select-option>
          <a-select-option value="linux">Linux</a-select-option>
        </a-select>

        <a-button @click="fetchData">
          <reload-outlined />
          刷新
        </a-button>

        <a-button @click="handleExport">
          <export-outlined />
          导出
        </a-button>
      </a-space>
    </div>

    <a-table :columns="columns" :data-source="clientStore.clients" :loading="clientStore.loading"
      :pagination="pagination" @change="handleTableChange" row-key="id" :scroll="{ x: 1200 }">
      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'device_fingerprint'">
          <a-tooltip :title="record.device_fingerprint" placement="bottomLeft">
            {{ record.device_fingerprint }}
          </a-tooltip>
        </template>
        <template v-else-if="column.key === 'online_status'">
          <a-badge :status="isOnline(record) ? 'success' : 'default'" :text="isOnline(record) ? '在线' : '离线'" />
        </template>
        <template v-else-if="column.key === 'license_status'">
          <a-tag :color="getLicenseStatusColor(record.license_status)">
            {{ formatLicenseStatus(record.license_status) }}
          </a-tag>
        </template>
        <template v-else-if="column.key === 'platform'">
          {{ formatPlatform(record.platform) }}
        </template>
        <template v-else-if="column.key === 'offline_mode'">
          <a-tag :color="record.offline_mode ? 'blue' : 'default'">
            {{ record.offline_mode ? '离线模式' : '在线模式' }}
          </a-tag>
        </template>
        <template v-else-if="column.key === 'last_heartbeat_at'">
          {{ formatDateTime(record.last_heartbeat_at) }}
        </template>
        <template v-else-if="column.key === 'action'">
          <a-space>
            <a-button type="link" size="small" @click="showDetail(record)">
              详情
            </a-button>
            <a-button type="link" size="small" @click="showAssignCamera(record)">
              分配相机
            </a-button>
            <a-button type="link" size="small" @click="showAssignLicense(record)">
              分配授权
            </a-button>
            <a-popconfirm v-if="record.license_status === 'activated'" title="确定吊销此客户端的授权吗？"
              @confirm="handleRevoke(record)">
              <a-button type="link" size="small" danger>吊销授权</a-button>
            </a-popconfirm>
          </a-space>
        </template>
      </template>
    </a-table>

    <!-- 客户端详情弹窗 -->
    <a-modal v-model:open="detailModalVisible" title="客户端详情" :footer="null" width="50%">
      <div v-if="currentClient">
        <a-descriptions :column="1" bordered>
          <a-descriptions-item label="设备指纹">
            {{ currentClient.device_fingerprint }}
          </a-descriptions-item>
          <a-descriptions-item label="主机名">
            {{ currentClient.hostname }}
          </a-descriptions-item>
          <a-descriptions-item label="平台">
            {{ formatPlatform(currentClient.platform) }}
          </a-descriptions-item>
          <a-descriptions-item label="架构">
            {{ formatArch(currentClient.arch) }}
          </a-descriptions-item>
          <a-descriptions-item label="CPU型号">
            {{ currentClient.cpu_model || '-' }}
          </a-descriptions-item>
          <a-descriptions-item label="内存">
            {{ formatFileSize(currentClient.total_memory) }}
          </a-descriptions-item>
          <a-descriptions-item label="IP地址">
            {{ currentClient.ip_address }}
          </a-descriptions-item>
          <a-descriptions-item label="MAC地址">
            {{ currentClient.mac_address }}
          </a-descriptions-item>
          <a-descriptions-item label="应用版本">
            {{ currentClient.app_version }}
          </a-descriptions-item>
          <a-descriptions-item label="授权状态">
            <a-tag :color="getLicenseStatusColor(currentClient.license_status)">
              {{ formatLicenseStatus(currentClient.license_status) }}
            </a-tag>
          </a-descriptions-item>
          <a-descriptions-item label="授权模式">
            <a-tag :color="currentClient.offline_mode ? 'blue' : 'default'">
              {{ currentClient.offline_mode ? '离线模式' : '在线模式' }}
            </a-tag>
          </a-descriptions-item>
          <a-descriptions-item label="激活码">
            {{ currentClient.activation_code || '-' }}
          </a-descriptions-item>
          <a-descriptions-item label="到期时间">
            {{ formatDateTime(currentClient.license_expiry_at) }}
          </a-descriptions-item>
          <a-descriptions-item label="最后心跳">
            {{ formatDateTime(currentClient.last_heartbeat_at) }}
          </a-descriptions-item>
        </a-descriptions>
      </div>
    </a-modal>

    <!-- 分配相机配置对话框 -->
    <a-modal v-model:open="assignCameraModalVisible" title="分配相机配置" @ok="handleAssignCamera">
      <a-select v-model:value="selectedCameraId" placeholder="请选择相机配置" style="width: 100%">
        <a-select-option v-for="camera in cameraStore.cameras" :key="camera.id" :value="camera.id">
          {{ camera.name }}
        </a-select-option>
      </a-select>
    </a-modal>

    <!-- 分配授权码对话框 -->
    <a-modal v-model:open="assignLicenseModalVisible" title="分配授权码" @ok="handleAssignLicense">
      <a-input v-model:value="inputLicenseCode" placeholder="请输入授权码" />
    </a-modal>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { message } from 'ant-design-vue'
import * as XLSX from 'xlsx'
import { useClientStore } from '@/stores/client'
import { useCameraStore } from '@/stores/camera'
import {
  formatLicenseStatus,
  formatPlatform,
  formatArch,
  formatFileSize,
  formatDateTime
} from '@/utils/format'
import { ReloadOutlined, ExportOutlined } from '@ant-design/icons-vue'

const clientStore = useClientStore()
const cameraStore = useCameraStore()

const filters = reactive({
  license_status: undefined,
  platform: undefined
})

const pagination = reactive({
  current: 1,
  pageSize: 10,
  total: 0,
  showSizeChanger: true,
  showTotal: (total) => `共 ${total} 条`
})

const detailModalVisible = ref(false)
const currentClient = ref(null)

const assignCameraModalVisible = ref(false)
const selectedCameraId = ref(null)
const assigningClientId = ref(null)

const assignLicenseModalVisible = ref(false)
const inputLicenseCode = ref('')

const columns = [
  { title: '主机名', dataIndex: 'hostname', key: 'hostname', width: 150, fixed: 'left' },
  { title: '设备指纹', dataIndex: 'device_fingerprint', key: 'device_fingerprint', width: 220, ellipsis: true },
  { title: '平台', dataIndex: 'platform', key: 'platform', width: 100 },
  { title: '在线状态', key: 'online_status', width: 100 },
  { title: '授权状态', dataIndex: 'license_status', key: 'license_status', width: 100 },
  { title: '授权模式', key: 'offline_mode', width: 100 },
  { title: '最后心跳', dataIndex: 'last_heartbeat_at', key: 'last_heartbeat_at', width: 180 },
  { title: '操作', key: 'action', width: 300, fixed: 'right' }
]

const isOnline = (client) => {
  if (!client.last_heartbeat_at) return false
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000)
  return new Date(client.last_heartbeat_at) > fiveMinutesAgo
}

const getLicenseStatusColor = (status) => {
  const colorMap = {
    trial: 'blue',
    activated: 'green',
    expired: 'red',
    revoked: 'default'
  }
  return colorMap[status] || 'default'
}

const showDetail = async (record) => {
  const result = await clientStore.fetchClientDetail(record.id)
  if (result.success) {
    currentClient.value = clientStore.currentClient
    detailModalVisible.value = true
  }
}

const showAssignCamera = (record) => {
  assigningClientId.value = record.id
  assignCameraModalVisible.value = true
}

const handleAssignCamera = async () => {
  if (!selectedCameraId.value) {
    message.warning('请选择相机配置')
    return
  }

  const result = await clientStore.assignCamera(assigningClientId.value, selectedCameraId.value)
  if (result.success) {
    message.success('分配成功')
    assignCameraModalVisible.value = false
    selectedCameraId.value = null
  } else {
    message.error(result.error || '分配失败')
  }
}

const showAssignLicense = (record) => {
  assigningClientId.value = record.id
  assignLicenseModalVisible.value = true
}

const handleAssignLicense = async () => {
  if (!inputLicenseCode.value) {
    message.warning('请输入授权码')
    return
  }

  const result = await clientStore.assignLicense(assigningClientId.value, inputLicenseCode.value)
  if (result.success) {
    message.success('分配成功')
    assignLicenseModalVisible.value = false
    inputLicenseCode.value = ''
    fetchData()
  } else {
    message.error(result.error || '分配失败')
  }
}

const handleRevoke = async (record) => {
  const result = await clientStore.revokeLicense(record.id)
  if (result.success) {
    message.success('吊销成功')
    fetchData()
  } else {
    message.error(result.error || '吊销失败')
  }
}

const handleTableChange = (pag) => {
  pagination.current = pag.current
  pagination.pageSize = pag.pageSize
  fetchData()
}

const fetchData = async () => {
  const result = await clientStore.fetchClients({
    page: pagination.current,
    per_page: pagination.pageSize,
    ...filters
  })
  if (result.success) {
    pagination.total = clientStore.total
  }
}

onMounted(() => {
  fetchData()
  cameraStore.fetchCameras()
})

const handleExport = () => {
  const data = clientStore.clients.map(item => ({
    主机名: item.hostname,
    设备指纹: item.device_fingerprint,
    平台: formatPlatform(item.platform),
    在线状态: isOnline(item) ? '在线' : '离线',
    授权状态: formatLicenseStatus(item.license_status),
    授权模式: item.offline_mode ? '离线模式' : '在线模式',
    应用版本: item.app_version || '-',
    IP地址: item.ip_address || '-',
    最后心跳: formatDateTime(item.last_heartbeat_at)
  }))

  const ws = XLSX.utils.json_to_sheet(data)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, '客户端列表')
  XLSX.writeFile(wb, `客户端列表_${new Date().toLocaleDateString()}.xlsx`)
  message.success('导出成功')
}
</script>

<style scoped>
.client-management {
  padding: 24px;
}

.toolbar {
  margin-bottom: 16px;
}
</style>
