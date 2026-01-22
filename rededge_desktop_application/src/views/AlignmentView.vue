<template>
  <div class="alignment-view">
    <!-- Python Service Status Banner -->
    <a-alert
      v-if="!alignmentStore.pythonServiceStatus.isHealthy"
      type="warning"
      show-icon
      :message="t('alignment.pythonServiceNotRunning')"
      class="service-alert"
    >
      <template #action>
        <a-button
          type="primary"
          size="small"
          :loading="alignmentStore.isLoading"
          @click="startService"
        >
          {{ t('alignment.startService') }}
        </a-button>
      </template>
    </a-alert>

    <!-- Workflow Info Alert -->
    <a-alert
      type="info"
      show-icon
      class="workflow-alert"
      closable
    >
      <template #message>
        <strong>{{ t('alignment.workflow.title') }}</strong>
      </template>
      <template #description>
        <div>{{ t('alignment.workflow.step1') }}</div>
        <div>{{ t('alignment.workflow.step2') }}</div>
        <div class="workflow-note">
          <InfoCircleOutlined />
          {{ t('alignment.workflow.note') }}
        </div>
      </template>
    </a-alert>

    <a-tabs v-model:activeKey="activeTab" class="main-tabs">
      <!-- Tab 1: Generate Warp Matrices -->
      <a-tab-pane key="generate" :tab="t('alignment.tabs.generate')">
        <a-row :gutter="16">
          <a-col :span="12">
            <WarpMatrixGenerator
              :disabled="!alignmentStore.pythonServiceStatus.isHealthy"
              :is-computing="alignmentStore.isComputing"
              :camera-info="alignmentStore.currentCameraInfo"
              :progress="alignmentStore.computeProgress"
              @select-images="handleSelectImages"
              @compute="handleCompute"
              @clear="alignmentStore.clearCameraInfo()"
            />
          </a-col>
          <a-col :span="12">
            <a-card :title="t('alignment.generate.info')">
              <template v-if="alignmentStore.currentCameraInfo">
                <a-descriptions :column="1" size="small">
                  <a-descriptions-item :label="t('alignment.generate.cameraModel')">
                    {{ alignmentStore.currentCameraInfo.camera_model }}
                  </a-descriptions-item>
                  <a-descriptions-item :label="t('alignment.generate.cameraSerial')">
                    {{ alignmentStore.currentCameraInfo.camera_serial }}
                  </a-descriptions-item>
                  <a-descriptions-item :label="t('alignment.generate.recommendedMethod')">
                    <a-tag :color="alignmentStore.currentCameraInfo.recommended_method === 'sift' ? 'blue' : 'green'">
                      {{ alignmentStore.currentCameraInfo.recommended_method?.toUpperCase() }}
                    </a-tag>
                  </a-descriptions-item>
                  <a-descriptions-item :label="t('alignment.generate.bands')">
                    {{ alignmentStore.currentCameraInfo.bands?.length || 0 }}
                  </a-descriptions-item>
                </a-descriptions>

                <a-divider>{{ t('alignment.generate.bandInfo') }}</a-divider>
                <a-table
                  :columns="bandColumns"
                  :data-source="bandData"
                  :pagination="false"
                  size="small"
                />
              </template>
              <template v-else>
                <a-empty :description="t('alignment.generate.selectImagesFirst')" />
              </template>
            </a-card>
          </a-col>
        </a-row>
      </a-tab-pane>

      <!-- Tab 2: Single Alignment -->
      <a-tab-pane key="single" :tab="t('alignment.tabs.single')">
        <a-row :gutter="16">
          <a-col :span="12">
            <SingleAlignmentForm
              :warp-matrices="alignmentStore.sortedWarpMatrices"
              :disabled="!alignmentStore.pythonServiceStatus.isHealthy"
              :loading="alignmentStore.isLoading"
              @align="handleAlignSingle"
            />
          </a-col>
          <a-col :span="12">
            <AlignmentPreview :result="singleAlignmentResult" />
          </a-col>
        </a-row>
      </a-tab-pane>

      <!-- Tab 3: Batch Alignment -->
      <a-tab-pane key="batch" :tab="t('alignment.tabs.batch')">
        <a-row :gutter="16">
          <a-col :span="12">
            <BatchAlignmentForm
              :warp-matrices="alignmentStore.sortedWarpMatrices"
              :disabled="!alignmentStore.pythonServiceStatus.isHealthy"
              @start="handleStartBatch"
            />
          </a-col>
          <a-col :span="12">
            <AlignmentProgress
              :job="currentBatchJob"
              @cancel="handleCancelBatch"
            />
          </a-col>
        </a-row>
      </a-tab-pane>

      <!-- Tab 4: Records -->
      <a-tab-pane key="records" :tab="t('alignment.tabs.records')">
        <a-row :gutter="[16, 16]">
          <a-col :span="24">
            <a-card :title="t('alignment.records.matrices')">
              <WarpMatrixTable
                :records="alignmentStore.sortedWarpMatrices"
                :loading="alignmentStore.isLoading"
                @activate="handleActivateMatrix"
                @delete="handleDeleteMatrix"
              />
            </a-card>
          </a-col>
          <a-col :span="24">
            <a-card :title="t('alignment.records.jobs')">
              <AlignmentJobTable
                :jobs="alignmentStore.sortedJobs"
                :loading="alignmentStore.isLoading"
              />
            </a-card>
          </a-col>
        </a-row>
      </a-tab-pane>
    </a-tabs>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { message, Modal } from 'ant-design-vue'
import { InfoCircleOutlined } from '@ant-design/icons-vue'
import { useAlignmentStore } from '../stores/alignment'
import WarpMatrixGenerator from '../components/alignment/WarpMatrixGenerator.vue'
import SingleAlignmentForm from '../components/alignment/SingleAlignmentForm.vue'
import BatchAlignmentForm from '../components/alignment/BatchAlignmentForm.vue'
import AlignmentProgress from '../components/alignment/AlignmentProgress.vue'
import AlignmentPreview from '../components/alignment/AlignmentPreview.vue'
import WarpMatrixTable from '../components/alignment/WarpMatrixTable.vue'
import AlignmentJobTable from '../components/alignment/AlignmentJobTable.vue'

const { t } = useI18n()
const alignmentStore = useAlignmentStore()

// State
const activeTab = ref('generate')
const singleAlignmentResult = ref(null)
const currentBatchJob = ref(null)
const batchPollTimer = ref(null)
const selectedImagePaths = ref([])

// Band columns for info table
const bandColumns = [
  { title: t('alignment.generate.bandName'), dataIndex: 'name', key: 'name' },
  { title: t('alignment.generate.wavelength'), dataIndex: 'wavelength', key: 'wavelength' }
]

const bandData = computed(() => {
  if (!alignmentStore.currentCameraInfo?.bands) return []
  return alignmentStore.currentCameraInfo.bands.map((band, index) => ({
    key: index,
    name: band.name || `Band ${index + 1}`,
    wavelength: band.wavelength ? `${band.wavelength} nm` : '-'
  }))
})

// Lifecycle
onMounted(async () => {
  await alignmentStore.checkPythonService()
  await alignmentStore.loadWarpMatrices()
  await alignmentStore.loadWarpMatrixJobs()
  await alignmentStore.loadJobHistory()
})

onUnmounted(() => {
  if (batchPollTimer.value) {
    clearInterval(batchPollTimer.value)
  }
})

// Methods
async function startService() {
  const success = await alignmentStore.startPythonService()
  if (success) {
    message.success(t('alignment.serviceStarted'))
  } else {
    message.error(t('alignment.serviceStartFailed'))
  }
}

async function handleSelectImages() {
  const result = await alignmentStore.selectImages()

  if (result.canceled) return

  if (!result.success) {
    message.error(result.error || t('alignment.selectFailed'))
    return
  }

  const filePaths = result.filePaths.sort()

  // Require exactly five single-band TIF files.
  if (filePaths.length !== 5) {
    message.warning(t('alignment.needFiveBands'))
    return
  }

  // Warn when inputs look uncalibrated.
  const hasCalibrated = filePaths.some(path =>
    path.toLowerCase().includes('reflectance') ||
    path.toLowerCase().includes('calibrated')
  )

  if (!hasCalibrated) {
    Modal.confirm({
      title: t('alignment.warning.title'),
      content: t('alignment.warning.useRawImages'),
      okText: t('common.confirm'),
      cancelText: t('common.cancel'),
      onOk: () => {
        proceedWithImages(filePaths)
      }
    })
  } else {
    proceedWithImages(filePaths)
  }
}

async function proceedWithImages(filePaths) {
  selectedImagePaths.value = filePaths

  // Get camera info
  const infoResult = await alignmentStore.getCameraInfo(selectedImagePaths.value)
  if (!infoResult.success) {
    message.error(infoResult.error || t('alignment.getCameraInfoFailed'))
  }
}

async function handleCompute(options) {
  // Require exactly 5 single-band inputs.
  if (selectedImagePaths.value.length !== 5) {
    message.warning(t('alignment.needFiveBands'))
    return
  }

  const result = await alignmentStore.computeWarpMatrices(selectedImagePaths.value, options)

  if (result.success) {
    message.success(t('alignment.computeSuccess'))
    selectedImagePaths.value = []
  } else {
    message.error(result.error || t('alignment.computeFailed'))
  }
}

async function handleAlignSingle(config) {
  singleAlignmentResult.value = null

  const result = await alignmentStore.alignSingle(
    config.imagePaths,
    config.warpMatrixId,
    config.outputPath,
    config.options
  )

  if (result.success) {
    singleAlignmentResult.value = result
    message.success(t('alignment.alignSuccess'))
  } else {
    message.error(result.error || t('alignment.alignFailed'))
  }
}

async function handleStartBatch(config) {
  const result = await alignmentStore.alignBatch(
    config.inputDirectory,
    config.outputDirectory,
    config.warpMatrixId,
    config.options
  )

  if (result.success) {
    currentBatchJob.value = {
      jobId: result.job_id,
      status: 'running',
      totalCaptures: result.total_captures,
      processedCaptures: 0,
      progress: 0
    }

    startBatchPolling(result.job_id)
    message.success(t('alignment.batchStarted'))
  } else {
    message.error(result.error || t('alignment.batchStartFailed'))
  }
}

function startBatchPolling(jobId) {
  if (batchPollTimer.value) {
    clearInterval(batchPollTimer.value)
  }

  batchPollTimer.value = setInterval(async () => {
    const status = await alignmentStore.getJobStatus(jobId)

    if (status.success) {
      currentBatchJob.value = {
        ...currentBatchJob.value,
        status: status.status,
        processedCaptures: status.processed_captures,
        progress: status.progress,
        currentCapture: status.current_capture,
        errorMessage: status.error_message
      }

      if (['completed', 'failed', 'cancelled'].includes(status.status)) {
        clearInterval(batchPollTimer.value)
        batchPollTimer.value = null
        await alignmentStore.loadJobHistory()

        if (status.status === 'completed') {
          message.success(t('alignment.batchCompleted'))
        } else if (status.status === 'failed') {
          message.error(t('alignment.batchFailed'))
        }
      }
    }
  }, 1000)
}

async function handleCancelBatch() {
  if (!currentBatchJob.value?.jobId) return

  await alignmentStore.cancelJob(currentBatchJob.value.jobId)
  message.info(t('alignment.batchCancelled'))
}

async function handleActivateMatrix(id) {
  await alignmentStore.setActiveMatrix(id)
  message.success(t('alignment.activateSuccess'))
}

async function handleDeleteMatrix(id) {
  Modal.confirm({
    title: t('alignment.deleteConfirm.title'),
    content: t('alignment.deleteConfirm.content'),
    okText: t('common.confirm'),
    cancelText: t('common.cancel'),
    okType: 'danger',
    async onOk() {
      await alignmentStore.deleteMatrix(id)
      message.success(t('alignment.deleteSuccess'))
    }
  })
}
</script>

<style scoped>
.alignment-view {
  padding: 16px;
  height: 100%;
  overflow: auto;
}

.service-alert {
  margin-bottom: 16px;
}

.workflow-alert {
  margin-bottom: 16px;
}

.workflow-note {
  margin-top: 8px;
  padding: 8px;
  background: #f0f5ff;
  border-radius: 4px;
  color: #1890ff;
}

.workflow-note :deep(.anticon) {
  margin-right: 8px;
}

.main-tabs {
  background: #fff;
  padding: 16px;
  border-radius: 4px;
}
</style>




