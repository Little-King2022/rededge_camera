<template>
  <div class="version-management">
    <div class="toolbar">
      <a-button type="primary" @click="showUploadModal">
        <upload-outlined />
        上传安装包
      </a-button>
    </div>

    <a-table
      :columns="columns"
      :data-source="versions"
      :loading="loading"
      :pagination="pagination"
      @change="handleTableChange"
      row-key="id"
    >
      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'platform'">
          {{ formatPlatform(record.platform) }} ({{ formatArch(record.arch) }})
        </template>
        <template v-else-if="column.key === 'release_type'">
          <a-tag :color="getReleaseTypeColor(record.release_type)">
            {{ getReleaseTypeText(record.release_type) }}
          </a-tag>
        </template>
        <template v-else-if="column.key === 'file_size'">
          {{ formatFileSize(record.file_size) }}
        </template>
        <template v-else-if="column.key === 'is_latest'">
          <a-tag v-if="record.is_latest" color="green">最新</a-tag>
        </template>
        <template v-else-if="column.key === 'is_mandatory'">
          <a-tag v-if="record.is_mandatory" color="red">强制</a-tag>
        </template>
        <template v-else-if="column.key === 'published_at'">
          {{ formatDateTime(record.published_at) }}
        </template>
        <template v-else-if="column.key === 'action'">
          <a-space>
            <a-button type="link" size="small" @click="showDetail(record)">
              详情
            </a-button>
            <a-button
              v-if="!record.is_latest"
              type="link"
              size="small"
              @click="handleSetLatest(record)"
            >
              设为最新
            </a-button>
            <a-button type="link" size="small" @click="handleDownload(record)">
              下载
            </a-button>
            <a-popconfirm
              title="确定删除此版本吗？"
              @confirm="handleDelete(record)"
            >
              <a-button type="link" size="small" danger>删除</a-button>
            </a-popconfirm>
          </a-space>
        </template>
      </template>
    </a-table>

    <!-- 上传安装包对话框 -->
    <a-modal
      v-model:open="uploadModalVisible"
      title="上传安装包"
      @ok="handleUpload"
      width="600px"
      :confirm-loading="uploading"
    >
      <a-form :model="uploadForm" :label-col="{ span: 6 }">
        <a-form-item label="版本号" required>
          <a-input v-model:value="uploadForm.version" placeholder="例如：1.0.0" />
        </a-form-item>

        <a-form-item label="发布类型" required>
          <a-select v-model:value="uploadForm.release_type">
            <a-select-option value="stable">正式版</a-select-option>
            <a-select-option value="beta">测试版</a-select-option>
            <a-select-option value="alpha">内测版</a-select-option>
          </a-select>
        </a-form-item>

        <a-form-item label="平台" required>
          <a-select v-model:value="uploadForm.platform">
            <a-select-option value="win32">Windows</a-select-option>
            <a-select-option value="darwin">macOS</a-select-option>
            <a-select-option value="linux">Linux</a-select-option>
          </a-select>
        </a-form-item>

        <a-form-item label="架构" required>
          <a-select v-model:value="uploadForm.arch">
            <a-select-option value="x64">64位</a-select-option>
            <a-select-option value="arm64">ARM64</a-select-option>
          </a-select>
        </a-form-item>

        <a-form-item label="安装包" required>
          <a-upload
            v-model:file-list="fileList"
            :before-upload="beforeUpload"
            :max-count="1"
          >
            <a-button>
              <upload-outlined />
              选择文件
            </a-button>
          </a-upload>
        </a-form-item>

        <a-form-item label="更新日志">
          <a-textarea v-model:value="uploadForm.release_notes" :rows="4" />
        </a-form-item>

        <a-form-item label="设为最新版本">
          <a-switch v-model:checked="uploadForm.is_latest" />
        </a-form-item>

        <a-form-item label="强制更新">
          <a-switch v-model:checked="uploadForm.is_mandatory" />
        </a-form-item>
      </a-form>

      <a-progress v-if="uploadProgress > 0" :percent="uploadProgress" />
    </a-modal>

    <!-- 版本详情对话框 -->
    <a-modal
      v-model:open="detailModalVisible"
      title="版本详情"
      :footer="null"
      width="600px"
    >
      <a-descriptions v-if="currentVersion" :column="1" bordered>
        <a-descriptions-item label="版本号">
          {{ currentVersion.version }}
        </a-descriptions-item>
        <a-descriptions-item label="发布类型">
          <a-tag :color="getReleaseTypeColor(currentVersion.release_type)">
            {{ getReleaseTypeText(currentVersion.release_type) }}
          </a-tag>
        </a-descriptions-item>
        <a-descriptions-item label="平台">
          {{ formatPlatform(currentVersion.platform) }}
        </a-descriptions-item>
        <a-descriptions-item label="架构">
          {{ formatArch(currentVersion.arch) }}
        </a-descriptions-item>
        <a-descriptions-item label="文件名">
          {{ currentVersion.installer_filename }}
        </a-descriptions-item>
        <a-descriptions-item label="文件大小">
          {{ formatFileSize(currentVersion.file_size) }}
        </a-descriptions-item>
        <a-descriptions-item label="SHA256">
          <a-typography-text copyable style="font-family: monospace; font-size: 12px">
            {{ currentVersion.checksum_sha256 }}
          </a-typography-text>
        </a-descriptions-item>
        <a-descriptions-item label="下载次数">
          {{ currentVersion.download_count }}
        </a-descriptions-item>
        <a-descriptions-item label="是否最新">
          <a-tag v-if="currentVersion.is_latest" color="green">是</a-tag>
          <span v-else>否</span>
        </a-descriptions-item>
        <a-descriptions-item label="强制更新">
          <a-tag v-if="currentVersion.is_mandatory" color="red">是</a-tag>
          <span v-else>否</span>
        </a-descriptions-item>
        <a-descriptions-item label="发布时间">
          {{ formatDateTime(currentVersion.published_at) }}
        </a-descriptions-item>
        <a-descriptions-item label="更新日志">
          <pre style="white-space: pre-wrap">{{ currentVersion.release_notes || '无' }}</pre>
        </a-descriptions-item>
      </a-descriptions>
    </a-modal>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { message } from 'ant-design-vue'
import { uploadVersion, getVersionList, setLatestVersion, deleteVersion, getDownloadUrl } from '@/api/version'
import { formatPlatform, formatArch, formatFileSize, formatDateTime } from '@/utils/format'
import { UploadOutlined } from '@ant-design/icons-vue'

const loading = ref(false)
const versions = ref([])

const pagination = reactive({
  current: 1,
  pageSize: 10,
  total: 0,
  showSizeChanger: true,
  showTotal: (total) => `共 ${total} 条`
})

const uploadModalVisible = ref(false)
const uploading = ref(false)
const uploadProgress = ref(0)
const fileList = ref([])

const uploadForm = reactive({
  version: '',
  release_type: 'stable',
  platform: 'win32',
  arch: 'x64',
  release_notes: '',
  is_latest: false,
  is_mandatory: false
})

const detailModalVisible = ref(false)
const currentVersion = ref(null)

const columns = [
  { title: '版本号', dataIndex: 'version', key: 'version' },
  { title: '平台', key: 'platform' },
  { title: '类型', key: 'release_type' },
  { title: '文件大小', key: 'file_size' },
  { title: '最新', key: 'is_latest' },
  { title: '强制', key: 'is_mandatory' },
  { title: '下载数', dataIndex: 'download_count', key: 'download_count' },
  { title: '发布时间', key: 'published_at' },
  { title: '操作', key: 'action', width: 250 }
]

const getReleaseTypeColor = (type) => {
  const colorMap = {
    stable: 'green',
    beta: 'orange',
    alpha: 'blue'
  }
  return colorMap[type] || 'default'
}

const getReleaseTypeText = (type) => {
  const textMap = {
    stable: '正式版',
    beta: '测试版',
    alpha: '内测版'
  }
  return textMap[type] || type
}

const showUploadModal = () => {
  uploadModalVisible.value = true
}

const beforeUpload = (file) => {
  fileList.value = [file]
  return false
}

const handleUpload = async () => {
  if (!fileList.value.length) {
    message.warning('请选择安装包文件')
    return
  }

  const formData = new FormData()
  const selectedFile = fileList.value[0]?.originFileObj || fileList.value[0]
  formData.append('file', selectedFile)
  Object.keys(uploadForm).forEach(key => {
    formData.append(key, uploadForm[key])
  })

  uploading.value = true
  uploadProgress.value = 0

  try {
    const result = await uploadVersion(formData, (progressEvent) => {
      uploadProgress.value = Math.round((progressEvent.loaded * 100) / progressEvent.total)
    })

    if (result.success) {
      message.success('上传成功')
      uploadModalVisible.value = false
      fileList.value = []
      uploadProgress.value = 0
      fetchData()
    } else {
      message.error(result.error || '上传失败')
    }
  } catch (error) {
    message.error('上传失败，请稍后重试')
  } finally {
    uploading.value = false
  }
}

const showDetail = (record) => {
  currentVersion.value = record
  detailModalVisible.value = true
}

const handleSetLatest = async (record) => {
  const result = await setLatestVersion(record.id)
  if (result.success) {
    message.success('设置成功')
    fetchData()
  } else {
    message.error(result.error || '设置失败')
  }
}

const handleDownload = (record) => {
  window.open(getDownloadUrl(record.id), '_blank')
}

const handleDelete = async (record) => {
  const result = await deleteVersion(record.id)
  if (result.success) {
    message.success('删除成功')
    fetchData()
  } else {
    message.error(result.error || '删除失败')
  }
}

const handleTableChange = (pag) => {
  pagination.current = pag.current
  pagination.pageSize = pag.pageSize
  fetchData()
}

const fetchData = async () => {
  loading.value = true
  try {
    const res = await getVersionList({
      page: pagination.current,
      per_page: pagination.pageSize
    })

    if (res.success) {
      versions.value = res.data
      pagination.total = res.total
    }
  } catch (error) {
    console.error('获取版本列表失败:', error)
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  fetchData()
})
</script>

<style scoped>
.version-management {
  padding: 24px;
}

.toolbar {
  margin-bottom: 16px;
}
</style>
