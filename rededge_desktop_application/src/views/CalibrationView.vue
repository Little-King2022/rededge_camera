<template>
  <div class="calibration-view">
    <!-- Python Service Status Banner -->
    <a-alert
      v-if="!calibrationStore.pythonServiceStatus.isHealthy"
      type="warning"
      show-icon
      :message="t('calibration.pythonServiceNotRunning')"
      class="service-alert"
    >
      <template #action>
        <a-button
          type="primary"
          size="small"
          :loading="calibrationStore.isLoading"
          @click="startService"
        >
          {{ t('calibration.startService') }}
        </a-button>
      </template>
    </a-alert>

    <a-tabs v-model:activeKey="activeTab" class="main-tabs">
      <!-- Tab 1: Radiometric Calibration -->
      <a-tab-pane key="calibration" :tab="t('calibration.tabs.calibration')">
        <a-row :gutter="16">
          <!-- Left: Detection Panel -->
          <a-col :span="12">
            <a-card :title="t('calibration.detection.title')" class="detection-card">
              <a-space direction="vertical" :size="16" style="width: 100%">
                <!-- From File Button -->
                <a-button
                  type="primary"
                  block
                  :loading="calibrationStore.isScanning"
                  :disabled="!calibrationStore.pythonServiceStatus.isHealthy"
                  @click="selectAndDetectFromFiles"
                >
                  <template #icon><FolderOpenOutlined /></template>
                  {{ t('calibration.detection.fromFile') }}
                </a-button>

                <!-- Manual Serial Input -->
                <a-divider>{{ t('calibration.detection.orManualInput') }}</a-divider>

                <a-input-search
                  v-model:value="manualSerial"
                  :placeholder="t('calibration.detection.serialPlaceholder')"
                  :loading="isParsingSerial"
                  @search="parseManualSerial"
                >
                  <template #enterButton>
                    <a-button type="primary">{{ t('calibration.detection.parse') }}</a-button>
                  </template>
                </a-input-search>

                <!-- Scan Error -->
                <a-alert
                  v-if="calibrationStore.scanError"
                  type="error"
                  :message="calibrationStore.scanError"
                  show-icon
                  closable
                  @close="calibrationStore.clearDetection()"
                />
              </a-space>
            </a-card>
          </a-col>

          <!-- Right: Detection Result -->
          <a-col :span="12">
            <a-card :title="t('calibration.result.title')" class="result-card">
              <template v-if="calibrationStore.currentDetection">
                <QRScanResult
                  :detection="calibrationStore.currentDetection"
                  @save="openSaveModal"
                  @clear="calibrationStore.clearDetection()"
                />
              </template>
              <template v-else>
                <a-empty :description="t('calibration.result.empty')" />
              </template>
            </a-card>
          </a-col>
        </a-row>
      </a-tab-pane>

      <!-- Tab 2: Calibration Records -->
      <a-tab-pane key="records" :tab="t('calibration.tabs.records')">
        <a-card>
          <CalibrationRecordTable
            :records="calibrationStore.sortedRecords"
            :active-id="calibrationStore.activeRecord?.id"
            :loading="calibrationStore.isLoading"
            @activate="handleActivate"
            @delete="handleDelete"
            @view="handleViewDetails"
          />
        </a-card>
      </a-tab-pane>

      <!-- Tab 3: Batch Processing -->
      <a-tab-pane key="batch" :tab="t('calibration.tabs.batch')">
        <a-row :gutter="16">
          <a-col :span="12">
            <BatchConfigForm
              :calibration-records="calibrationStore.records"
              :active-calibration="calibrationStore.activeRecord"
              :disabled="!calibrationStore.pythonServiceStatus.isHealthy"
              @start="handleStartBatch"
            />
          </a-col>
          <a-col :span="12">
            <BatchProgressCard
              :job="currentBatchJob"
              @cancel="handleCancelBatch"
            />
          </a-col>
        </a-row>
      </a-tab-pane>
    </a-tabs>

    <!-- Save Modal -->
    <a-modal
      v-model:open="saveModalVisible"
      :title="t('calibration.save.title')"
      :confirm-loading="calibrationStore.isLoading"
      @ok="handleSave"
    >
      <CalibrationSaveForm
        ref="saveFormRef"
        :detection="calibrationStore.currentDetection"
      />
    </a-modal>

    <!-- Details Modal -->
    <a-modal
      v-model:open="detailsModalVisible"
      :title="t('calibration.details.title')"
      :footer="null"
      width="600px"
    >
      <CalibrationDetails :record="selectedRecord" />
    </a-modal>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, toRaw } from 'vue'
import { useI18n } from 'vue-i18n'
import { message, Modal } from 'ant-design-vue'
import { FolderOpenOutlined } from '@ant-design/icons-vue'
import { useCalibrationStore } from '../stores/calibration'
import QRScanResult from '../components/calibration/QRScanResult.vue'
import CalibrationRecordTable from '../components/calibration/CalibrationRecordTable.vue'
import CalibrationSaveForm from '../components/calibration/CalibrationSaveForm.vue'
import CalibrationDetails from '../components/calibration/CalibrationDetails.vue'
import BatchConfigForm from '../components/calibration/BatchConfigForm.vue'
import BatchProgressCard from '../components/calibration/BatchProgressCard.vue'

const { t } = useI18n()
const calibrationStore = useCalibrationStore()

// State
const activeTab = ref('calibration')
const manualSerial = ref('')
const isParsingSerial = ref(false)
const saveModalVisible = ref(false)
const detailsModalVisible = ref(false)
const selectedRecord = ref(null)
const saveFormRef = ref(null)
const currentBatchJob = ref(null)
const batchPollTimer = ref(null)

// Lifecycle
onMounted(async () => {
  await calibrationStore.checkPythonService()
  await calibrationStore.loadRecords()
})

onUnmounted(() => {
  if (batchPollTimer.value) {
    clearInterval(batchPollTimer.value)
  }
})

// Methods
async function startService() {
  const success = await calibrationStore.startPythonService()
  if (success) {
    message.success(t('calibration.serviceStarted'))
  } else {
    message.error(t('calibration.serviceStartFailed'))
  }
}

async function selectAndDetectFromFiles() {
  const selectResult = await calibrationStore.selectPanelImages()

  if (selectResult.canceled) {
    return
  }

  if (!selectResult.success) {
    message.error(selectResult.error || t('calibration.selectFailed'))
    return
  }

  // Sort files by band index
  const filePaths = selectResult.filePaths.sort()

  if (filePaths.length < 5) {
    message.warning(t('calibration.needFiveBands'))
    return
  }

  const result = await calibrationStore.detectFromFiles(filePaths.slice(0, 5))

  if (result.success) {
    message.success(t('calibration.detectionSuccess'))
  }
}

async function parseManualSerial() {
  if (!manualSerial.value.trim()) {
    return
  }

  try {
    isParsingSerial.value = true
    const result = await calibrationStore.parseSerial(manualSerial.value.trim())

    if (result.success) {
      calibrationStore.currentDetection = result
      message.success(t('calibration.parseSuccess'))
    } else {
      message.error(result.error || t('calibration.parseFailed'))
    }
  } finally {
    isParsingSerial.value = false
  }
}

function openSaveModal() {
  saveModalVisible.value = true
}

async function handleSave() {
  const formData = saveFormRef.value?.getFormData()
  if (!formData) return

  const detection = calibrationStore.currentDetection
  
  // 根据detection的来源构建不同的数据结构
  // detect-from-files 返回: reflectances (array), irradiance (array), band_info
  // detect-qr/parse-serial 返回: min_wavelength, max_wavelength, band_reflectances (object)
  
  let record = {
    serial: detection.serial || '',
    panel_version: detection.panel_version || 0,
    notes: formData.notes || ''
  }

  // 如果有 band_info (来自 detect-from-files)
  if (detection.band_info && Array.isArray(detection.band_info)) {
    // 将 band_info 转换为 band_reflectances 对象
    const band_reflectances = {}
    detection.band_info.forEach(band => {
      if (band.reflectance !== undefined) {
        band_reflectances[band.index] = band.reflectance
      }
    })
    
    record.band_reflectances = band_reflectances
    // 将 Proxy 数组转换为普通数组
    record.panel_irradiance = detection.irradiance ? Array.from(detection.irradiance) : []
    record.camera_model = detection.camera_model || ''
    record.camera_serial = detection.camera_serial || ''
    
    // 从 reflectances 数组计算 min/max (如果有的话)
    if (detection.reflectances && detection.reflectances.length > 0) {
      record.min_reflectance = Math.min(...detection.reflectances)
      record.max_reflectance = Math.max(...detection.reflectances)
    }
    
    // 从 band_info 获取波长范围
    const wavelengths = detection.band_info
      .map(b => b.wavelength)
      .filter(w => w !== null && w !== undefined)
    if (wavelengths.length > 0) {
      record.min_wavelength = Math.min(...wavelengths)
      record.max_wavelength = Math.max(...wavelengths)
    }
  } 
  // 如果有 band_reflectances (来自 detect-qr/parse-serial)
  else if (detection.band_reflectances) {
    record.min_wavelength = detection.min_wavelength || 0
    record.min_reflectance = detection.min_reflectance || 0
    record.max_wavelength = detection.max_wavelength || 0
    record.max_reflectance = detection.max_reflectance || 0
    record.band_reflectances = detection.band_reflectances || {}
    record.panel_irradiance = []
  }

  console.log('[CalibrationView] Saving record:', record)

  const result = await calibrationStore.saveRecord(record)

  if (result.success) {
    saveModalVisible.value = false
    message.success(t('calibration.saveSuccess'))
  } else {
    message.error(result.error || t('calibration.saveFailed'))
  }
}

async function handleActivate(id) {
  await calibrationStore.setActive(id)
  message.success(t('calibration.activateSuccess'))
}

async function handleDelete(id) {
  Modal.confirm({
    title: t('calibration.deleteConfirm.title'),
    content: t('calibration.deleteConfirm.content'),
    okText: t('common.confirm'),
    cancelText: t('common.cancel'),
    okType: 'danger',
    async onOk() {
      await calibrationStore.deleteRecord(id)
      message.success(t('calibration.deleteSuccess'))
    }
  })
}

function handleViewDetails(record) {
  selectedRecord.value = record
  detailsModalVisible.value = true
}

async function handleStartBatch(config) {
  try {
    // 移除Vue响应式包装并序列化
    const rawConfig = toRaw(config)
    const serializedConfig = JSON.parse(JSON.stringify(rawConfig))
    
    const result = await window.electronAPI.batch.start(serializedConfig)

    if (result.success) {
      currentBatchJob.value = {
        jobId: result.job_id,
        status: 'running',
        totalCaptures: result.total_captures,
        processedCaptures: 0,
        progress: 0
      }

      // Start polling
      startBatchPolling(result.job_id)
      message.success(t('calibration.batch.started'))
    } else {
      message.error(result.error || t('calibration.batch.startFailed'))
    }
  } catch (e) {
    message.error(e.message)
  }
}

function startBatchPolling(jobId) {
  if (batchPollTimer.value) {
    clearInterval(batchPollTimer.value)
  }

  batchPollTimer.value = setInterval(async () => {
    try {
      const status = await window.electronAPI.batch.getStatus(jobId)

      if (status.success) {
        currentBatchJob.value = {
          ...currentBatchJob.value,
          status: status.status,
          processedCaptures: status.processed_captures,
          progress: status.progress,
          currentCapture: status.current_capture,
          errorMessage: status.error_message
        }

        if (status.status === 'completed' || status.status === 'failed' || status.status === 'cancelled') {
          clearInterval(batchPollTimer.value)
          batchPollTimer.value = null

          if (status.status === 'completed') {
            message.success(t('calibration.batch.completed'))
          } else if (status.status === 'failed') {
            message.error(t('calibration.batch.failed'))
          }
        }
      }
    } catch (e) {
      console.error('Failed to poll batch status:', e)
    }
  }, 1000)
}

async function handleCancelBatch() {
  if (!currentBatchJob.value?.jobId) return

  try {
    await window.electronAPI.batch.cancel(currentBatchJob.value.jobId)
    message.info(t('calibration.batch.cancelled'))
  } catch (e) {
    message.error(e.message)
  }
}
</script>

<style scoped>
.calibration-view {
  padding: 16px;
  height: 100%;
  overflow: auto;
}

.service-alert {
  margin-bottom: 16px;
}

.main-tabs {
  background: #fff;
  padding: 16px;
  border-radius: 4px;
}

.detection-card,
.result-card {
  height: 400px;
}

.result-card :deep(.ant-card-body) {
  height: calc(100% - 57px);
  overflow: auto;
}
</style>
