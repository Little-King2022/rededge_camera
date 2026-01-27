<template>
  <div class="camera-management">
    <div class="toolbar">
      <a-button type="primary" @click="showCreateModal">
        <plus-outlined />
        新增配置
      </a-button>
    </div>

    <a-table
      :columns="columns"
      :data-source="cameraStore.cameras"
      :loading="cameraStore.loading"
      :pagination="pagination"
      @change="handleTableChange"
      row-key="id"
    >
      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'is_active'">
          <a-tag :color="record.is_active ? 'green' : 'default'">
            {{ record.is_active ? '激活' : '未激活' }}
          </a-tag>
        </template>
        <template v-else-if="column.key === 'endpoint'">
          {{ `${record.protocol}://${record.host}:${record.port}${record.path_prefix || ''}` }}
        </template>
        <template v-else-if="column.key === 'created_at'">
          {{ formatDateTime(record.created_at) }}
        </template>
        <template v-else-if="column.key === 'action'">
          <a-space>
            <a-button
              v-if="!record.is_active"
              type="link"
              size="small"
              @click="handleActivate(record)"
            >
              激活
            </a-button>
            <a-button type="link" size="small" @click="handleEdit(record)">
              编辑
            </a-button>
            <a-popconfirm
              title="确定删除此配置吗？"
              @confirm="handleDelete(record)"
            >
              <a-button type="link" size="small" danger>删除</a-button>
            </a-popconfirm>
          </a-space>
        </template>
      </template>
    </a-table>

    <a-modal
      v-model:open="modalVisible"
      :title="modalTitle"
      @ok="handleSubmit"
      @cancel="handleCancel"
      width="600px"
    >
      <a-form :model="formState" :label-col="{ span: 6 }">
        <a-form-item label="配置名称" required>
          <a-input v-model:value="formState.name" placeholder="例如：主相机" />
        </a-form-item>

        <a-form-item label="协议" required>
          <a-select v-model:value="formState.protocol">
            <a-select-option value="http">HTTP</a-select-option>
            <a-select-option value="https">HTTPS</a-select-option>
          </a-select>
        </a-form-item>

        <a-form-item label="主机地址" required>
          <a-input v-model:value="formState.host" placeholder="例如：192.168.1.100" />
        </a-form-item>

        <a-form-item label="端口" required>
          <a-input-number
            v-model:value="formState.port"
            :min="1"
            :max="65535"
            style="width: 100%"
          />
        </a-form-item>

        <a-form-item label="路径前缀">
          <a-input v-model:value="formState.path_prefix" placeholder="例如：/api" />
        </a-form-item>

        <a-form-item label="认证Token">
          <a-input v-model:value="formState.auth_token" placeholder="可选" />
        </a-form-item>

        <a-form-item label="描述">
          <a-textarea v-model:value="formState.description" :rows="3" />
        </a-form-item>
      </a-form>
    </a-modal>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { message } from 'ant-design-vue'
import { useCameraStore } from '@/stores/camera'
import { formatDateTime } from '@/utils/format'
import { PlusOutlined } from '@ant-design/icons-vue'

const cameraStore = useCameraStore()

const modalVisible = ref(false)
const modalTitle = ref('新增相机配置')
const editingId = ref(null)

const formState = reactive({
  name: '',
  protocol: 'http',
  host: '',
  port: 80,
  path_prefix: '',
  auth_token: '',
  description: ''
})

const pagination = reactive({
  current: 1,
  pageSize: 10,
  total: 0,
  showSizeChanger: true,
  showTotal: (total) => `共 ${total} 条`
})

const columns = [
  { title: '配置名称', dataIndex: 'name', key: 'name' },
  { title: '端点地址', key: 'endpoint' },
  { title: '状态', dataIndex: 'is_active', key: 'is_active' },
  { title: '创建时间', dataIndex: 'created_at', key: 'created_at' },
  { title: '操作', key: 'action', width: 200 }
]

const showCreateModal = () => {
  modalTitle.value = '新增相机配置'
  editingId.value = null
  resetForm()
  modalVisible.value = true
}

const handleEdit = (record) => {
  modalTitle.value = '编辑相机配置'
  editingId.value = record.id
  Object.assign(formState, record)
  modalVisible.value = true
}

const handleActivate = async (record) => {
  const result = await cameraStore.activateCamera(record.id)
  if (result.success) {
    message.success('激活成功')
  } else {
    message.error(result.error || '激活失败')
  }
}

const handleDelete = async (record) => {
  const result = await cameraStore.deleteCamera(record.id)
  if (result.success) {
    message.success('删除成功')
  } else {
    message.error(result.error || '删除失败')
  }
}

const handleSubmit = async () => {
  const result = editingId.value
    ? await cameraStore.updateCamera(editingId.value, formState)
    : await cameraStore.createCamera(formState)

  if (result.success) {
    message.success(editingId.value ? '更新成功' : '创建成功')
    modalVisible.value = false
  } else {
    message.error(result.error || '操作失败')
  }
}

const handleCancel = () => {
  modalVisible.value = false
  resetForm()
}

const resetForm = () => {
  Object.assign(formState, {
    name: '',
    protocol: 'http',
    host: '',
    port: 80,
    path_prefix: '',
    auth_token: '',
    description: ''
  })
}

const handleTableChange = (pag) => {
  pagination.current = pag.current
  pagination.pageSize = pag.pageSize
  fetchData()
}

const fetchData = async () => {
  const result = await cameraStore.fetchCameras({
    page: pagination.current,
    per_page: pagination.pageSize
  })
  if (result.success) {
    pagination.total = cameraStore.total
  }
}

onMounted(() => {
  fetchData()
})
</script>

<style scoped>
.camera-management {
  padding: 24px;
}

.toolbar {
  margin-bottom: 16px;
}
</style>
