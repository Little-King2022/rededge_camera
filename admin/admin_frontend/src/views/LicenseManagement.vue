<template>
  <div class="license-management">
    <div class="toolbar">
      <a-button type="primary" @click="showGenerateModal">
        <plus-outlined />
        生成授权码
      </a-button>
      <a-button @click="handleExport" style="margin-left: 8px">
        <export-outlined />
        导出
      </a-button>
    </div>

    <a-table
      :columns="columns"
      :data-source="licenseStore.licenses"
      :loading="licenseStore.loading"
      :pagination="pagination"
      @change="handleTableChange"
      row-key="id"
    >
      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'code'">
          <a-typography-text copyable>{{ record.code }}</a-typography-text>
        </template>
        <template v-else-if="column.key === 'license_type'">
          {{ formatLicenseType(record.license_type) }}
        </template>
        <template v-else-if="column.key === 'offline_mode'">
          <a-tag :color="record.offline_mode ? 'blue' : 'default'">
            {{ record.offline_mode ? '离线' : '在线' }}
          </a-tag>
        </template>
        <template v-else-if="column.key === 'activations'">
          {{ record.current_activations }} / {{ record.max_activations }}
        </template>
        <template v-else-if="column.key === 'license_status'">
          <a-tag :color="getLicenseStatusColor(record.license_status)">
            {{ formatLicenseStatus(record.license_status) }}
          </a-tag>
        </template>
        <template v-else-if="column.key === 'is_active'">
          <a-tag :color="record.is_active ? 'green' : 'default'">
            {{ record.is_active ? '有效' : '无效' }}
          </a-tag>
        </template>
        <template v-else-if="column.key === 'expires_at'">
          {{ formatDateTime(record.expires_at) }}
        </template>
        <template v-else-if="column.key === 'action'">
          <a-space>
            <a-button type="link" size="small" @click="showDetail(record)">
              详情
            </a-button>
            <a-popconfirm
              title="确定吊销此授权码吗？"
              @confirm="handleRevoke(record)"
              :disabled="record.license_status === 'revoked'"
            >
              <a-button type="link" size="small" danger :disabled="record.license_status === 'revoked'">
                吊销
              </a-button>
            </a-popconfirm>
            <a-popconfirm
              title="确定删除此授权码吗？"
              @confirm="handleDelete(record)"
            >
              <a-button type="link" size="small" danger>删除</a-button>
            </a-popconfirm>
          </a-space>
        </template>
      </template>
    </a-table>

    <!-- 生成授权码对话框 -->
    <a-modal
      v-model:open="generateModalVisible"
      title="生成授权码"
      @ok="handleGenerate"
      width="600px"
    >
      <a-form :model="generateForm" :label-col="{ span: 6 }">
        <a-form-item label="授权类型" required>
          <a-select v-model:value="generateForm.license_type">
            <a-select-option value="trial">试用版</a-select-option>
            <a-select-option value="standard">标准版</a-select-option>
            <a-select-option value="professional">专业版</a-select-option>
            <a-select-option value="enterprise">企业版</a-select-option>
          </a-select>
        </a-form-item>

        <a-form-item label="有效期（天）" required>
          <a-input-number
            v-model:value="generateForm.duration_days"
            :min="1"
            :max="3650"
            style="width: 100%"
          />
        </a-form-item>

        <a-form-item label="最大激活数" required>
          <a-input-number
            v-model:value="generateForm.max_activations"
            :min="1"
            :max="1"
            disabled
            style="width: 100%"
          />
        </a-form-item>

        <a-form-item label="离线模式">
          <a-switch v-model:checked="generateForm.offline_mode" />
          <div style="color: #999; font-size: 12px; margin-top: 4px">
            离线模式下，客户端激活后不再连接服务器验证
          </div>
        </a-form-item>

        <a-form-item label="生成数量" required>
          <a-input-number
            v-model:value="generateForm.count"
            :min="1"
            :max="100"
            style="width: 100%"
          />
        </a-form-item>

        <a-form-item label="备注">
          <a-textarea v-model:value="generateForm.notes" :rows="3" />
        </a-form-item>
      </a-form>
    </a-modal>

    <!-- 授权码详情对话框 -->
    <a-modal
      v-model:open="detailModalVisible"
      title="授权码详情"
      :footer="null"
      width="600px"
    >
      <a-descriptions v-if="currentLicense" :column="1" bordered>
        <a-descriptions-item label="授权码">
          <a-typography-text copyable>{{ currentLicense.code }}</a-typography-text>
        </a-descriptions-item>
        <a-descriptions-item label="授权类型">
          {{ formatLicenseType(currentLicense.license_type) }}
        </a-descriptions-item>
        <a-descriptions-item label="有效期">
          {{ currentLicense.duration_days }} 天
        </a-descriptions-item>
        <a-descriptions-item label="离线模式">
          <a-tag :color="currentLicense.offline_mode ? 'blue' : 'default'">
            {{ currentLicense.offline_mode ? '是' : '否' }}
          </a-tag>
        </a-descriptions-item>
        <a-descriptions-item label="激活数">
          {{ currentLicense.current_activations }} / {{ currentLicense.max_activations }}
        </a-descriptions-item>
        <a-descriptions-item label="证书状态">
          <a-tag :color="getLicenseStatusColor(currentLicense.license_status)">
            {{ formatLicenseStatus(currentLicense.license_status) }}
          </a-tag>
        </a-descriptions-item>
        <a-descriptions-item label="状态">
          <a-tag :color="currentLicense.is_active ? 'green' : 'default'">
            {{ currentLicense.is_active ? '有效' : '无效' }}
          </a-tag>
        </a-descriptions-item>
        <a-descriptions-item label="到期时间">
          {{ formatDateTime(currentLicense.expires_at) }}
        </a-descriptions-item>
        <a-descriptions-item label="备注">
          {{ currentLicense.notes || '-' }}
        </a-descriptions-item>
        <a-descriptions-item label="证书日志">
          <a-timeline v-if="licenseLogEvents.length">
            <a-timeline-item v-for="(event, index) in licenseLogEvents" :key="index">
              <div>{{ formatLogTitle(event) }}</div>
              <div style="color: #999; font-size: 12px">{{ formatDateTime(event.at) }}</div>
              <div v-if="event.payload && event.payload.device_fingerprint" style="color: #666; font-size: 12px">
                {{ event.payload.hostname || '-' }} ({{ event.payload.device_fingerprint }})
              </div>
            </a-timeline-item>
          </a-timeline>
          <span v-else>-</span>
        </a-descriptions-item>
      </a-descriptions>
    </a-modal>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, computed } from 'vue'
import { message } from 'ant-design-vue'
import { useLicenseStore } from '@/stores/license'
import { formatLicenseType, formatDateTime, formatLicenseStatus } from '@/utils/format'
import { PlusOutlined, ExportOutlined } from '@ant-design/icons-vue'

const licenseStore = useLicenseStore()

const pagination = reactive({
  current: 1,
  pageSize: 10,
  total: 0,
  showSizeChanger: true,
  showTotal: (total) => `共 ${total} 条`
})

const generateModalVisible = ref(false)
const generateForm = reactive({
  license_type: 'standard',
  duration_days: 365,
  max_activations: 1,
  offline_mode: false,
  count: 1,
  notes: ''
})

const detailModalVisible = ref(false)
const currentLicense = ref(null)

const licenseLogEvents = computed(() => {
  const log = currentLicense.value?.license_log
  const events = Array.isArray(log?.events) ? log.events : []
  return events.slice()
})

const getLicenseStatusColor = (status) => {
  if (status === 'activated') return 'green'
  if (status === 'revoked') return 'red'
  if (status === 'unactivated') return 'default'
  return 'default'
}

const formatLogTitle = (event) => {
  const type = event?.type || ''
  if (type === 'created') return '创建'
  if (type === 'activated') return '激活'
  if (type === 'reactivated') return '重新激活'
  if (type === 'revoked') return '吊销'
  if (type === 'released') return '释放'
  return type || '日志'
}

const columns = [
  { title: '授权码', dataIndex: 'code', key: 'code', width: 250 },
  { title: '类型', dataIndex: 'license_type', key: 'license_type' },
  { title: '模式', key: 'offline_mode' },
  { title: '激活数', key: 'activations' },
  { title: '证书状态', dataIndex: 'license_status', key: 'license_status' },
  { title: '状态', dataIndex: 'is_active', key: 'is_active' },
  { title: '到期时间', dataIndex: 'expires_at', key: 'expires_at' },
  { title: '操作', key: 'action', width: 150 }
]

const showGenerateModal = () => {
  generateModalVisible.value = true
}

const handleGenerate = async () => {
  const result = await licenseStore.generateLicenses(generateForm)

  if (result.success) {
    message.success(`成功生成 ${generateForm.count} 个授权码`)
    generateModalVisible.value = false
    fetchData()
  } else {
    message.error(result.error || '生成失败')
  }
}

const showDetail = async (record) => {
  const result = await licenseStore.fetchLicenseDetail(record.code)
  if (result.success) {
    currentLicense.value = licenseStore.currentLicense
    detailModalVisible.value = true
  }
}

const handleDelete = async (record) => {
  const result = await licenseStore.deleteLicense(record.id)
  if (result.success) {
    message.success('删除成功')
  } else {
    message.error(result.error || '删除失败')
  }
}

const handleRevoke = async (record) => {
  const result = await licenseStore.revokeLicense(record.id)
  if (result.success) {
    message.success('吊销成功')
    if (currentLicense.value?.id === record.id) {
      currentLicense.value = result.data
    }
  } else {
    message.error(result.error || '吊销失败')
  }
}

const handleExport = async () => {
  const result = await licenseStore.exportLicenses()
  if (result.success) {
    message.success('导出成功')
  } else {
    message.error(result.error || '导出失败')
  }
}

const handleTableChange = (pag) => {
  pagination.current = pag.current
  pagination.pageSize = pag.pageSize
  fetchData()
}

const fetchData = async () => {
  const result = await licenseStore.fetchLicenses({
    page: pagination.current,
    per_page: pagination.pageSize
  })
  if (result.success) {
    pagination.total = licenseStore.total
  }
}

onMounted(() => {
  fetchData()
})
</script>

<style scoped>
.license-management {
  padding: 24px;
}

.toolbar {
  margin-bottom: 16px;
}
</style>
