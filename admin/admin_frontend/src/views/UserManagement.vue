<template>
  <div class="user-management">
    <div class="toolbar">
      <a-space>
        <a-button type="primary" @click="showCreateModal">
          <plus-outlined />
          新增用户
        </a-button>
        <a-button @click="handleExport">
          <export-outlined />
          导出
        </a-button>
      </a-space>
    </div>

    <a-table
      :columns="columns"
      :data-source="users"
      :loading="loading"
      :pagination="pagination"
      @change="handleTableChange"
      row-key="id"
      :scroll="{ x: 900 }"
    >
      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'role'">
          <a-tag :color="getRoleColor(record.role)">
            {{ formatRole(record.role) }}
          </a-tag>
        </template>
        <template v-else-if="column.key === 'is_active'">
          <a-tag :color="record.is_active ? 'green' : 'default'">
            {{ record.is_active ? '激活' : '禁用' }}
          </a-tag>
        </template>
        <template v-else-if="column.key === 'last_login_at'">
          {{ formatDateTime(record.last_login_at) }}
        </template>
        <template v-else-if="column.key === 'action'">
          <a-space>
            <a-button type="link" size="small" @click="handleEdit(record)">
              编辑
            </a-button>
            <a-button type="link" size="small" @click="showResetPasswordModal(record)">
              重置密码
            </a-button>
            <a-popconfirm
              v-if="record.id !== authStore.userInfo?.id"
              title="确定删除此用户吗？"
              @confirm="handleDelete(record)"
            >
              <a-button type="link" size="small" danger>删除</a-button>
            </a-popconfirm>
          </a-space>
        </template>
      </template>
    </a-table>

    <!-- 新增/编辑用户对话框 -->
    <a-modal
      v-model:open="modalVisible"
      :title="modalTitle"
      @ok="handleSubmit"
      width="600px"
    >
      <a-form :model="formState" :label-col="{ span: 6 }">
        <a-form-item label="用户名" required>
          <a-input
            v-model:value="formState.username"
            :disabled="!!editingId"
            placeholder="请输入用户名"
          />
        </a-form-item>

        <a-form-item v-if="!editingId" label="密码" required>
          <a-input-password
            v-model:value="formState.password"
            placeholder="请输入密码"
          />
        </a-form-item>

        <a-form-item label="邮箱">
          <a-input v-model:value="formState.email" type="email" placeholder="请输入邮箱" />
        </a-form-item>

        <a-form-item label="角色" required>
          <a-select v-model:value="formState.role">
            <a-select-option value="operator">操作员</a-select-option>
            <a-select-option value="admin">管理员</a-select-option>
            <a-select-option
              v-if="authStore.isSuperAdmin"
              value="super_admin"
            >
              超级管理员
            </a-select-option>
          </a-select>
        </a-form-item>

        <a-form-item label="状态">
          <a-switch v-model:checked="formState.is_active" />
          <span style="margin-left: 8px">
            {{ formState.is_active ? '激活' : '禁用' }}
          </span>
        </a-form-item>
      </a-form>
    </a-modal>

    <!-- 重置密码对话框 -->
    <a-modal
      v-model:open="resetPasswordModalVisible"
      title="重置密码"
      @ok="handleResetPassword"
    >
      <a-form :label-col="{ span: 6 }">
        <a-form-item label="新密码" required>
          <a-input-password v-model:value="newPassword" placeholder="请输入新密码" />
        </a-form-item>
        <a-form-item label="确认密码" required>
          <a-input-password
            v-model:value="confirmPassword"
            placeholder="请再次输入新密码"
          />
        </a-form-item>
      </a-form>
    </a-modal>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { message } from 'ant-design-vue'
import * as XLSX from 'xlsx'
import { useAuthStore } from '@/stores/auth'
import { getUserList, createUser, updateUser, deleteUser, resetPassword } from '@/api/user'
import { formatRole, formatDateTime } from '@/utils/format'
import { PlusOutlined, ExportOutlined } from '@ant-design/icons-vue'

const authStore = useAuthStore()

const loading = ref(false)
const users = ref([])

const pagination = reactive({
  current: 1,
  pageSize: 10,
  total: 0,
  showSizeChanger: true,
  showTotal: (total) => `共 ${total} 条`
})

const modalVisible = ref(false)
const modalTitle = ref('新增用户')
const editingId = ref(null)

const formState = reactive({
  username: '',
  password: '',
  email: '',
  role: 'operator',
  is_active: true
})

const resetPasswordModalVisible = ref(false)
const resetPasswordUserId = ref(null)
const newPassword = ref('')
const confirmPassword = ref('')

const columns = [
  { title: '用户名', dataIndex: 'username', key: 'username', width: 150, fixed: 'left' },
  { title: '邮箱', dataIndex: 'email', key: 'email', width: 200 },
  { title: '角色', dataIndex: 'role', key: 'role', width: 100 },
  { title: '状态', dataIndex: 'is_active', key: 'is_active', width: 80 },
  { title: '最后登录', dataIndex: 'last_login_at', key: 'last_login_at', width: 180 },
  { title: '操作', key: 'action', width: 250, fixed: 'right' }
]

const getRoleColor = (role) => {
  const colorMap = {
    super_admin: 'red',
    admin: 'orange',
    operator: 'blue'
  }
  return colorMap[role] || 'default'
}

const showCreateModal = () => {
  modalTitle.value = '新增用户'
  editingId.value = null
  resetForm()
  modalVisible.value = true
}

const handleEdit = (record) => {
  modalTitle.value = '编辑用户'
  editingId.value = record.id
  Object.assign(formState, {
    username: record.username,
    email: record.email,
    role: record.role,
    is_active: record.is_active
  })
  modalVisible.value = true
}

const handleSubmit = async () => {
  if (editingId.value) {
    const { username, password, ...updateData } = formState
    const res = await updateUser(editingId.value, updateData)
    if (res.success) {
      message.success('更新成功')
      modalVisible.value = false
      fetchData()
    } else {
      message.error(res.error || '更新失败')
    }
  } else {
    const res = await createUser(formState)
    if (res.success) {
      message.success('创建成功')
      modalVisible.value = false
      fetchData()
    } else {
      message.error(res.error || '创建失败')
    }
  }
}

const handleDelete = async (record) => {
  const res = await deleteUser(record.id)
  if (res.success) {
    message.success('删除成功')
    fetchData()
  } else {
    message.error(res.error || '删除失败')
  }
}

const showResetPasswordModal = (record) => {
  resetPasswordUserId.value = record.id
  newPassword.value = ''
  confirmPassword.value = ''
  resetPasswordModalVisible.value = true
}

const handleResetPassword = async () => {
  if (!newPassword.value) {
    message.warning('请输入新密码')
    return
  }

  if (newPassword.value !== confirmPassword.value) {
    message.warning('两次输入的密码不一致')
    return
  }

  const res = await resetPassword(resetPasswordUserId.value, {
    new_password: newPassword.value
  })

  if (res.success) {
    message.success('密码重置成功')
    resetPasswordModalVisible.value = false
  } else {
    message.error(res.error || '密码重置失败')
  }
}

const resetForm = () => {
  Object.assign(formState, {
    username: '',
    password: '',
    email: '',
    role: 'operator',
    is_active: true
  })
}

const handleTableChange = (pag) => {
  pagination.current = pag.current
  pagination.pageSize = pag.pageSize
  fetchData()
}

const fetchData = async () => {
  loading.value = true
  try {
    const res = await getUserList({
      page: pagination.current,
      per_page: pagination.pageSize
    })

    if (res.success) {
      users.value = res.data
      pagination.total = res.total
    }
  } catch (error) {
    console.error('获取用户列表失败:', error)
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  fetchData()
})

const handleExport = () => {
  const data = users.value.map(item => ({
    用户名: item.username,
    邮箱: item.email || '-',
    角色: formatRole(item.role),
    状态: item.is_active ? '激活' : '禁用',
    最后登录: formatDateTime(item.last_login_at)
  }))

  const ws = XLSX.utils.json_to_sheet(data)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, '用户列表')
  XLSX.writeFile(wb, `用户列表_${new Date().toLocaleDateString()}.xlsx`)
  message.success('导出成功')
}
</script>

<style scoped>
.user-management {
  padding: 24px;
}

.toolbar {
  margin-bottom: 16px;
}
</style>
