<template>
  <div class="files-view">
    <a-row :gutter="16">
      <!-- File Browser -->
      <a-col :span="14">
        <a-card :title="t('files.cameraFiles')" class="card card-fixed">
          <template #extra>
            <a-space>
              <a-button @click="loadFiles" :loading="filesLoading">
                {{ t('files.refresh') }}
              </a-button>
              <a-button
                type="primary"
                @click="handleDownloadSelected"
                :disabled="selectedFiles.length === 0"
              >
                {{ t('files.downloadSelected', { count: selectedFiles.length }) }}
              </a-button>
              <a-popconfirm
                :title="t('files.confirmDeleteSelected')"
                :ok-text="t('common.delete')"
                :cancel-text="t('common.cancel')"
                @confirm="handleDeleteSelected"
              >
                <a-button
                  danger
                  :disabled="selectedFiles.length === 0"
                >
                  {{ t('files.deleteSelected', { count: selectedFiles.length }) }}
                </a-button>
              </a-popconfirm>
              <a-popconfirm
                :title="t('files.formatSdTitle')"
                :ok-text="t('files.formatModal.confirmLabel')"
                :cancel-text="t('common.cancel')"
                @confirm="handleFormatSD"
              >
                <template #icon>
                  <exclamation-circle-outlined style="color: red" />
                </template>
                <a-button danger>{{ t('files.formatSdButton') }}</a-button>
              </a-popconfirm>
            </a-space>
          </template>

          <a-alert
            v-if="!cameraStore.hasActiveProfile"
            :message="t('files.noActiveProfile')"
            type="warning"
            show-icon
            class="mb-3"
          />

          <a-alert
            v-if="deleteTask"
            type="info"
            show-icon
            class="mb-3"
          >
            <template #message>
              {{ t('files.deleting', { completed: deleteTask.completed, total: deleteTask.total }) }}
            </template>
            <template #description>
              <a-progress
                :percent="getDeleteProgress(deleteTask)"
                size="small"
                :status="deleteTask.status === 'failed' ? 'exception' : (deleteTask.status === 'completed' ? 'success' : 'active')"
              />
              <div v-if="deleteTask.error_message" class="error-message">
                {{ t('files.errorLabel', { error: deleteTask.error_message }) }}
              </div>
            </template>
          </a-alert>

          <!-- Current Path -->
          <div class="current-path mb-3">
            <a-breadcrumb>
              <a-breadcrumb-item>
                <a @click="navigateTo('/')">{{ t('files.root') }}</a>
              </a-breadcrumb-item>
              <a-breadcrumb-item v-for="(segment, idx) in pathSegments" :key="idx">
                <a @click="navigateTo(buildPath(idx))">{{ segment }}</a>
              </a-breadcrumb-item>
            </a-breadcrumb>
          </div>

          <!-- Files Table -->
          <a-table
            :dataSource="files"
            :columns="fileColumns"
            :loading="filesLoading"
            :pagination="false"
            :scroll="{ y: 'calc(var(--panel-height) - 220px)' }"
            :row-selection="{
              selectedRowKeys: selectedFiles,
              onChange: onSelectChange
            }"
            rowKey="path"
          >
            <template #bodyCell="{ column, record }">
              <template v-if="column.key === 'name'">
                <a v-if="record.type === 'directory'" @click="navigateTo(record.path)">
                  📁 {{ record.name }}
                </a>
                <span v-else-if="record.type === 'file' && (record.name.endsWith('.jpg') || record.name.endsWith('.JPG') || record.name.endsWith('.jpeg') || record.name.endsWith('.JPEG') || record.name.endsWith('.png') || record.name.endsWith('.PNG') || record.name.endsWith('.tif') || record.name.endsWith('.TIF') )">🖼️ {{ record.name }}</span>
                <span v-else>📄 {{ record.name }}</span>
              </template>

              <template v-else-if="column.key === 'size'">
                {{ record.type === 'file' ? formatBytes(record.size) : '-' }}
              </template>

              <template v-else-if="column.key === 'actions'">
                <a-space>
                  <a-button size="small" @click="handleDownloadItem(record)">
                    {{ t('files.download') }}
                  </a-button>
                  <a-popconfirm
                    :title="record.type === 'directory' ? t('files.confirmDeleteFolder') : t('files.confirmDeleteFile')"
                    @confirm="handleDeleteItems([record])"
                  >
                    <a-button size="small" danger>{{ t('files.deleteFile') }}</a-button>
                  </a-popconfirm>
                </a-space>
              </template>
            </template>
          </a-table>
        </a-card>
      </a-col>

      <!-- Download Queue -->
      <a-col :span="10">
        <a-card :title="t('files.downloadQueue')" class="card card-fixed">
          <template #extra>
            <a-space>
              <a-button @click="refreshDownloads" :loading="downloadStore.isLoading">
                {{ t('files.refresh') }}
              </a-button>
              <a-button @click="handleOpenDownloadDirectory">
                {{ t('files.openDownloadFolder') }}
              </a-button>
              <a-button @click="handleClearCompleted">
                {{ t('files.clearCompleted') }}
              </a-button>
            </a-space>
          </template>

          <a-list
            :dataSource="downloadStore.downloads"
            :loading="downloadStore.isLoading"
            item-layout="vertical"
            class="download-list"
          >
            <template #renderItem="{ item }">
              <a-list-item>
                <a-list-item-meta>
                  <template #title>
                    <span class="download-title">
                      <span class="download-icon">{{ getDownloadIcon(item) }}</span>
                      <span>{{ getFileName(item.remote_path) }}</span>
                    </span>
                  </template>
                  <template #description>
                    <div class="download-info">
                      <a-progress
                        :percent="getDownloadProgress(item)"
                        :status="getProgressStatus(item.status)"
                        size="small"
                      />
                      <div class="download-details">
                        <span>{{ formatBytes(item.downloaded_bytes) }} / {{ formatBytes(item.total_bytes) }}</span>
                        <a-tag :color="getStatusColor(item.status)" size="small">
                          {{ getStatusLabel(item.status) }}
                        </a-tag>
                      </div>
                      <div v-if="item.error_message" class="error-message">
                        {{ t('files.errorLabel', { error: item.error_message }) }}
                      </div>
                    </div>
                  </template>
                </a-list-item-meta>

                <template #actions>
                  <a-button
                    v-if="item.status === 'downloading'"
                    size="small"
                    @click="downloadStore.pauseDownload(item.id)"
                  >
                    {{ t('files.pause') }}
                  </a-button>
                  <a-button
                    v-if="item.status === 'paused'"
                    size="small"
                    type="primary"
                    @click="downloadStore.resumeDownload(item.id)"
                  >
                    {{ t('files.resume') }}
                  </a-button>
                  <a-button
                    v-if="item.status === 'failed'"
                    size="small"
                    @click="downloadStore.retryDownload(item.id)"
                  >
                    {{ t('files.retry') }}
                  </a-button>
                  <a-button
                    size="small"
                    danger
                    @click="downloadStore.deleteDownload(item.id)"
                  >
                    {{ t('files.remove') }}
                  </a-button>
                </template>
              </a-list-item>
            </template>

            <template #empty>
              <a-empty :description="t('files.emptyDownloads')" />
            </template>
          </a-list>
        </a-card>
      </a-col>
    </a-row>

    <!-- Format SD Confirmation Modal -->
    <a-modal
      v-model:open="formatModalVisible"
      :title="t('files.formatModal.title')"
      @ok="confirmFormatSD"
      @cancel="formatModalVisible = false"
      :okText="t('files.formatModal.okText')"
      okType="danger"
    >
      <a-alert
        :message="t('files.formatModal.alertTitle')"
        :description="t('files.formatModal.alertDesc')"
        type="error"
        show-icon
        class="mb-3"
      />

      <a-form layout="vertical">
        <a-form-item :label="t('files.formatModal.confirmLabel')">
          <a-input
            v-model:value="formatConfirmText"
            :placeholder="t('files.formatModal.placeholder')"
            @keyup.enter="confirmFormatSD"
          />
        </a-form-item>
      </a-form>
    </a-modal>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { message } from 'ant-design-vue'
import { ExclamationCircleOutlined } from '@ant-design/icons-vue'
import { useCameraStore } from '../stores/camera'
import { useDownloadStore } from '../stores/download'
import { useI18n } from 'vue-i18n'

const cameraStore = useCameraStore()
const downloadStore = useDownloadStore()
const { t } = useI18n()

const currentPath = ref('/')
const files = ref([])
const filesLoading = ref(false)
const selectedFiles = ref([])
const formatModalVisible = ref(false)
const formatConfirmText = ref('')
const deleteTask = ref(null)
const deleteTaskId = ref(null)
const deleteTaskTimer = ref(null)

const fileColumns = computed(() => [
  { title: t('files.columns.name'), key: 'name', dataIndex: 'name' },
  { title: t('files.columns.size'), key: 'size', dataIndex: 'size' },
  { title: t('files.columns.actions'), key: 'actions' }
])

const pathSegments = computed(() => {
  return currentPath.value.split('/').filter(s => s)
})

onMounted(async () => {
  await cameraStore.loadActiveProfile()
  await downloadStore.loadDownloads()
  downloadStore.startAutoRefresh()
  await resumeDeleteTask()
  if (cameraStore.hasActiveProfile) {
    await loadFiles()
  }
})

onUnmounted(() => {
  downloadStore.stopAutoRefresh()
  stopDeleteTaskPolling()
})

async function resumeDeleteTask() {
  try {
    const activeTask = await window.electronAPI.camera.getActiveDeleteTask()
    if (activeTask && (activeTask.status === 'running' || activeTask.status === 'preparing')) {
      deleteTask.value = activeTask
      deleteTaskId.value = activeTask.id
      startDeleteTaskPolling()
    }
  } catch (error) {
    console.warn('Failed to resume delete task:', error.message)
  }
}

function startDeleteTaskPolling() {
  if (deleteTaskTimer.value || !deleteTaskId.value) return
  deleteTaskTimer.value = setInterval(async () => {
    try {
      const task = await window.electronAPI.camera.getDeleteTask(deleteTaskId.value)
      if (!task) {
        stopDeleteTaskPolling()
        deleteTask.value = null
        return
      }

      deleteTask.value = task

      if (task.status === 'completed' || task.status === 'failed') {
        stopDeleteTaskPolling()
        if (task.status === 'completed') {
              message.success(t('files.messages.deleteCompleted'))
          deleteTask.value = null
        } else if (task.error_message) {
              message.error(t('files.messages.deleteFailed', { error: task.error_message }))
        }
        deleteTaskId.value = null
        await loadFiles()
      }
    } catch (error) {
      console.warn('Failed to poll delete task:', error.message)
    }
  }, 1000)
}

function stopDeleteTaskPolling() {
  if (deleteTaskTimer.value) {
    clearInterval(deleteTaskTimer.value)
    deleteTaskTimer.value = null
  }
}

async function loadFiles() {
  if (!cameraStore.hasActiveProfile) {
    message.error(t('files.messages.noActiveProfile'))
    return
  }

  filesLoading.value = true

  try {
    const result = await window.electronAPI.camera.listFiles(currentPath.value)

    // Parse file list
    if (Array.isArray(result)) {
      files.value = result.map(item => {
        const name = item.name || item
        const type = item.type || (item.is_dir ? 'directory' : 'file')
        return {
          name,
          path: `${currentPath.value}/${name}`.replace(/\/+/g, '/'),
          type,
          size: item.size || 0
        }
      })
    } else if (result && (Array.isArray(result.directories) || Array.isArray(result.files))) {
      const dirItems = (result.directories || []).map(dirName => ({
        name: dirName,
        path: `${currentPath.value}/${dirName}`.replace(/\/+/g, '/'),
        type: 'directory',
        size: 0
      }))

      const fileItems = (result.files || []).map(file => {
        const name = file.name || file
        return {
          name,
          path: `${currentPath.value}/${name}`.replace(/\/+/g, '/'),
          type: 'file',
          size: file.size || 0
        }
      })

      files.value = [...dirItems, ...fileItems]
    } else {
      files.value = []
    }
  } catch (error) {
    message.error(t('files.messages.listFailed', { error: error.message }))
    files.value = []
  } finally {
    filesLoading.value = false
  }
}

function navigateTo(path) {
  currentPath.value = path
  selectedFiles.value = []
  loadFiles()
}

function buildPath(segmentIndex) {
  const segments = pathSegments.value.slice(0, segmentIndex + 1)
  return '/' + segments.join('/')
}

function onSelectChange(selectedRowKeys) {
  selectedFiles.value = selectedRowKeys
}

async function handleDownloadItem(item) {
  try {
    await downloadStore.addToQueue([{
      remote_path: item.path,
      size: item.size,
      type: item.type
    }])
    message.success(t('files.messages.itemAdded'))
  } catch (error) {
    message.error(t('files.messages.addQueueFailed', { error: error.message }))
  }
}

async function handleDownloadSelected() {
  const itemsToDownload = files.value.filter(f =>
    selectedFiles.value.includes(f.path)
  ).map(f => ({
    remote_path: f.path,
    size: f.size,
    type: f.type
  }))

  if (itemsToDownload.length === 0) {
    message.warning(t('files.messages.noItemsSelected'))
    return
  }

  try {
    await downloadStore.addToQueue(itemsToDownload)
    message.success(t('files.messages.itemsAdded', { count: itemsToDownload.length }))
    selectedFiles.value = []
  } catch (error) {
    message.error(t('files.messages.addQueueFailed', { error: error.message }))
  }
}

async function handleDeleteItems(items) {
  try {
    if (deleteTask.value && (deleteTask.value.status === 'running' || deleteTask.value.status === 'preparing')) {
      message.warning(t('files.messages.deleteTaskRunning'))
      return
    }

    const payload = items.map(item => ({
      path: item.path,
      type: item.type
    }))

    const task = await window.electronAPI.camera.deletePaths(payload)
    if (!task || !task.id) {
      message.error(t('files.messages.deleteTaskStartFailed'))
      return
    }

    deleteTask.value = task
    deleteTaskId.value = task.id
    selectedFiles.value = []
    message.info(t('files.messages.deleteTaskStarted'))
    startDeleteTaskPolling()
  } catch (error) {
    message.error(t('files.messages.deleteFailed', { error: error.message }))
  }
}

async function handleDeleteSelected() {
  const itemsToDelete = files.value.filter(f =>
    selectedFiles.value.includes(f.path)
  )

  if (itemsToDelete.length === 0) {
    message.warning(t('files.messages.noItemsSelected'))
    return
  }

  await handleDeleteItems(itemsToDelete)
}

function handleFormatSD() {
  formatModalVisible.value = true
  formatConfirmText.value = ''
}

async function confirmFormatSD() {
  if (formatConfirmText.value !== 'ERASE') {
    message.error(t('files.messages.confirmErase'))
    return
  }

  try {
    await window.electronAPI.camera.formatSDCard()
    message.success(t('files.messages.formatSuccess'))
    formatModalVisible.value = false
    formatConfirmText.value = ''
    await loadFiles()
  } catch (error) {
    message.error(t('files.messages.formatFailed', { error: error.message }))
  }
}

async function refreshDownloads() {
  await downloadStore.loadDownloads()
}

async function handleClearCompleted() {
  try {
    const count = await downloadStore.clearCompleted()
    message.success(t('files.messages.clearCompleted', { count }))
  } catch (error) {
    message.error(t('files.messages.clearCompletedFailed', { error: error.message }))
  }
}

async function handleOpenDownloadDirectory() {
  try {
    const result = await downloadStore.openDownloadDirectory()
    if (!result?.success && result?.error) {
      message.error(t('files.messages.openFolderFailed', { error: result.error }))
    }
  } catch (error) {
    message.error(t('files.messages.openFolderFailed', { error: error.message }))
  }
}

function getFileName(path) {
  return path.split('/').pop()
}

function getDownloadProgress(download) {
  if (download.total_bytes > 0) {
    return Math.round((download.downloaded_bytes / download.total_bytes) * 100)
  }
  if (download.total_files > 0) {
    return Math.round((download.completed_files / download.total_files) * 100)
  }
  return 0
}

function getDownloadIcon(item) {
  const name = (item.remote_path || '').toLowerCase()
  if (item.type === 'folder') return '📁'
  if (name.match(/\.(jpg|jpeg|png|gif|bmp|tif|tiff)$/)) return '🖼️'
  return '📄'
}

function getDeleteProgress(task) {
  if (!task || task.total === 0) return 0
  return Math.round((task.completed / task.total) * 100)
}

function getProgressStatus(status) {
  if (status === 'completed') return 'success'
  if (status === 'failed') return 'exception'
  if (status === 'downloading') return 'active'
  return 'normal'
}

function getStatusColor(status) {
  const colors = {
    pending: 'default',
    downloading: 'blue',
    paused: 'orange',
    completed: 'green',
    failed: 'red'
  }
  return colors[status] || 'default'
}

function getStatusLabel(status) {
  if (status === 'pending') return t('files.status.pending')
  if (status === 'downloading') return t('files.status.downloading')
  if (status === 'paused') return t('files.status.paused')
  if (status === 'completed') return t('files.status.completed')
  if (status === 'failed') return t('files.status.failed')
  return status
}

function formatBytes(bytes) {
  if (!bytes) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}
</script>

<style scoped>
.files-view {
  --panel-height: calc(100vh - 120px);
  max-width: 1600px;
  margin: 0 auto;
}

.card {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  min-height: 600px;
}

.card-fixed {
  height: var(--panel-height);
  display: flex;
  flex-direction: column;
}

.card-fixed :deep(.ant-card-head) {
  flex-shrink: 0;
}

.card-fixed :deep(.ant-card-body) {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

.files-view :deep(.ant-table) {
  flex: 1;
  min-height: 0;
}

.files-view :deep(.ant-table-body) {
  overflow-y: auto;
}

.download-list {
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

.download-list :deep(.ant-spin-nested-loading),
.download-list :deep(.ant-spin-container),
.download-list :deep(.ant-list) {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.download-list :deep(.ant-list-items) {
  flex: 1;
  overflow-y: auto;
  min-height: 0;
}

.mb-3 {
  margin-bottom: 16px;
}

.current-path {
  padding: 12px;
  background: #f5f5f5;
  border-radius: 4px;
}

.download-info {
  width: 100%;
}

.download-details {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 8px;
  font-size: 12px;
  color: #666;
}

.error-message {
  margin-top: 4px;
  font-size: 12px;
  color: #a44a3f;
}

.download-title {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.download-icon {
  width: 18px;
  display: inline-flex;
  justify-content: center;
}
</style>
