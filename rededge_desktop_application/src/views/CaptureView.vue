<template>
  <div class="capture-view">
    <a-row :gutter="16">
      <!-- Manual Capture -->
      <a-col :span="12" class="capture-col">
        <a-card :title="t('capture.manualTitle')" class="card full-height-card">
          <a-alert v-if="!cameraStore.hasActiveProfile" :message="t('capture.noActiveTitle')" type="warning" show-icon
            class="mb-3" />

          <a-button type="primary" size="large" @click="handleManualCapture" :loading="manualCaptureLoading"
            :disabled="!cameraStore.hasActiveProfile" block>
            {{ t('capture.captureNow') }}
          </a-button>

          <div v-if="lastCaptureId" class="capture-result mt-3">
            <a-alert :message="t('capture.captureInitiated')"
              :description="t('capture.captureId', { id: lastCaptureId })" type="success" show-icon />

            <a-alert v-if="capturePollError" class="mt-2" type="error" show-icon :message="capturePollError" />
          </div>
        </a-card>
      </a-col>

      <!-- Camera-Side Timer Capture -->
      <a-col :span="12" class="capture-col">
        <a-card :title="t('capture.timerTitle')" class="card full-height-card">
          <a-alert v-if="!capabilities.timer" :message="t('capture.timerNotSupported')"
            :description="t('capture.timerNotSupportedDesc')" type="warning" show-icon class="mb-3" />

          <a-form layout="vertical">
            <a-form-item :label="t('capture.interval')">
              <a-space>
                <a-input-number v-model:value="timerInterval" :min="1" :max="3600"
                  :disabled="timerRunning || !capabilities.timer" style="width: 120px" />
                <a-select v-model:value="timerUnit" :disabled="timerRunning || !capabilities.timer"
                  style="width: 150px">
                  <a-select-option value="seconds">{{ t('capture.seconds') }}</a-select-option>
                  <a-select-option value="minutes">{{ t('capture.minutes') }}</a-select-option>
                </a-select>
              </a-space>
              <a-space style="margin-left: 16px; transform: translateY(2px);">
                <a-button v-if="!timerRunning" type="primary" @click="handleStartTimer" :loading="timerActionLoading"
                  :disabled="!cameraStore.hasActiveProfile || !capabilities.timer">
                  {{ t('capture.startTimer') }}
                </a-button>
                <a-button v-else danger @click="handleStopTimer" :loading="timerActionLoading">
                  {{ t('capture.stopTimer') }}
                </a-button>
              </a-space>

            </a-form-item>
          </a-form>



          <div v-if="timerRunning" class="timer-status mt-3">
            <a-alert :message="t('capture.timerRunning')"
              :description="t('capture.timerRunningDesc', { interval: timerInterval, unit: timerUnitLabel })"
              type="info" show-icon />
          </div>
        </a-card>
      </a-col>
    </a-row>

    <!-- Capture History (Optional) -->
    <a-card :title="t('capture.recentTitle')" class="card mt-3">
      <div class="history-actions">
        <a-space>
          <a-button size="small" @click="toggleSelectAll">
            {{ allSelected ? t('capture.unselectAll') : t('capture.selectAll') }}
          </a-button>
          <a-button size="small" :loading="exportLoading" :disabled="selectedCaptureIds.length === 0"
            @click="handleBatchExport">
            {{ t('capture.saveSelected') }}
          </a-button>
          <a-button size="small" danger :disabled="selectedCaptureIds.length === 0" @click="handleBatchDelete">
            {{ t('capture.deleteSelected') }}
          </a-button>
        </a-space>
      </div>
      <a-empty v-if="captureHistory.length === 0" :description="t('capture.noRecent')" />
      <a-list v-else :dataSource="captureHistory" item-layout="horizontal">
        <template #renderItem="{ item }">
          <a-list-item>
            <div class="capture-item">
              <div class="capture-item-header">
                <a-checkbox :checked="selectedCaptureIds.includes(item.capture_id)"
                  @change="(event) => toggleSelectCapture(item.capture_id, event.target.checked)" />
                <a-list-item-meta>
                  <template #title>
                    {{ t('capture.item.captureIdTitle', { id: item.capture_id }) }}
                  </template>
                  <template #description>
                    {{ t('capture.item.description', {
                      type: formatCaptureType(item.type), status:
                        formatCaptureStatus(item.status || 'pending'), time: formatTime(item.timestamp) }) }}
                  </template>
                </a-list-item-meta>
              </div>

              <a-progress v-if="item.previewLoading" :percent="item.previewProgress || 0" status="active"
                size="small" />

              <div v-if="item.previewUrls?.length" class="preview-row">
                <div v-for="(url, index) in item.previewUrls" :key="url" class="preview-card">
                  <div class="preview-item">
                    <a-image :src="url" :alt="t('capture.bandPreviewAlt', { index: index + 1 })" />
                    <div class="preview-label">{{ formatBandLabel(index) }}</div>
                  </div>
                </div>
              </div>
            </div>
          </a-list-item>
        </template>
      </a-list>
    </a-card>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, toRaw } from 'vue'
import * as UTIF from 'utif'
import { message } from 'ant-design-vue'
import { useCameraStore } from '../stores/camera'
import { useI18n } from 'vue-i18n'

const cameraStore = useCameraStore()
const { t, locale } = useI18n()

const manualCaptureLoading = ref(false)
const lastCaptureId = ref(null)
const captureStatus = ref(null)
const capturePolling = ref(false)
const capturePollError = ref(null)

const timerInterval = ref(10)
const timerUnit = ref('seconds')
const timerRunning = ref(false)
const timerActionLoading = ref(false)
const exportLoading = ref(false)

const capabilities = ref({
  timer: false,
  config: false,
  capture: false
})

const captureHistory = ref([])
const selectedCaptureIds = ref([])

const cameraBaseUrl = computed(() => {
  const profile = cameraStore.activeProfile
  if (!profile) return ''

  const { protocol, host, port, path_prefix } = profile
  const prefix = path_prefix && path_prefix.startsWith('/') ? path_prefix : `/${path_prefix || ''}`
  return `${protocol}://${host}:${port}${prefix}`.replace(/\/$/, '')
})

const timerUnitLabel = computed(() => (
  timerUnit.value === 'minutes' ? t('capture.minutes') : t('capture.seconds')
))

const bandNames = ['Blue', 'Green', 'Red', 'NIR', 'RedEdge']

let capturePollTimer = null
const CAPTURE_POLL_INTERVAL_MS = 1500
const CAPTURE_POLL_MAX_ATTEMPTS = 80

onMounted(async () => {
  await cameraStore.loadActiveProfile()
  await loadCaptureHistory()
  await loadCapabilities()
})

onUnmounted(() => {
  stopCapturePolling()
})

async function loadCapabilities() {
  if (!cameraStore.hasActiveProfile) {
    return
  }

  try {
    const caps = await window.electronAPI.camera.probeCapabilities()
    capabilities.value = caps
    console.log('[Capture] Camera capabilities:', caps)
  } catch (error) {
    console.error('[Capture] Failed to probe capabilities:', error)
  }
}

async function handleManualCapture() {
  if (!cameraStore.hasActiveProfile) {
    message.error(t('capture.messages.noActiveProfile'))
    return
  }

  manualCaptureLoading.value = true
  lastCaptureId.value = null
  captureStatus.value = null
  capturePollError.value = null

  try {
    const result = await window.electronAPI.camera.capture()
    lastCaptureId.value = result.id || result.capture_id || t('common.unknown')

    // Add to history
    captureHistory.value.unshift({
      capture_id: lastCaptureId.value,
      type: 'Manual',
      status: 'pending',
      previewUrls: [],
      previewLoading: false,
      previewProgress: 0,
      timestamp: Date.now()
    })
    await persistCaptureHistory()

    message.success(t('capture.messages.captureInitiatedToast', { id: lastCaptureId.value }))

    if (lastCaptureId.value && lastCaptureId.value !== 'Unknown') {
      startCapturePolling(lastCaptureId.value)
    }
  } catch (error) {
    message.error(t('capture.messages.captureFailed', { error: error.message }))
  } finally {
    manualCaptureLoading.value = false
  }
}

async function handleStartTimer() {
  if (!cameraStore.hasActiveProfile) {
    message.error(t('capture.messages.noActiveProfile'))
    return
  }

  if (!capabilities.value.timer) {
    message.error(t('capture.messages.timerNotSupported'))
    return
  }

  timerActionLoading.value = true

  try {
    // Calculate interval in seconds
    const intervalSec = timerUnit.value === 'minutes'
      ? timerInterval.value * 60
      : timerInterval.value

    // Start camera-side timer
    await window.electronAPI.camera.startTimer(intervalSec)

    timerRunning.value = true
    message.success(t('capture.messages.timerStarted'))

    console.log(`[Capture] Timer started: ${intervalSec}s interval`)
  } catch (error) {
    message.error(t('capture.messages.timerStartFailed', { error: error.message }))
  } finally {
    timerActionLoading.value = false
  }
}

async function handleStopTimer() {
  timerActionLoading.value = true

  try {
    await window.electronAPI.camera.stopTimer()

    timerRunning.value = false
    message.success(t('capture.messages.timerStopped'))

    console.log('[Capture] Timer stopped')
  } catch (error) {
    message.error(t('capture.messages.timerStopFailed', { error: error.message }))
  } finally {
    timerActionLoading.value = false
  }
}

function formatTime(timestamp) {
  if (timestamp === null || timestamp === undefined || timestamp === '') return t('common.none')
  const numeric = typeof timestamp === 'string' ? Number(timestamp) : timestamp
  const date = Number.isFinite(numeric) ? new Date(numeric) : new Date(timestamp)
  if (Number.isNaN(date.getTime())) return t('common.none')
  return date.toLocaleString(locale.value)
}

function formatCaptureType(type) {
  if (!type) return t('common.unknown')
  if (String(type).toLowerCase() === 'manual') return t('capture.type.manual')
  return String(type)
}

function formatCaptureStatus(status) {
  if (!status) return t('capture.status.pending')
  const key = String(status).toLowerCase()
  if (key === 'pending') return t('capture.status.pending')
  if (key === 'downloading') return t('capture.status.downloading')
  if (key === 'complete') return t('capture.status.complete')
  if (key === 'failed' || key === 'error') return t('capture.status.failed')
  if (key === 'timeout') return t('capture.status.timeout')
  return status
}

function formatBandLabel(index) {
  const bandIndex = Number(index) + 1
  const name = bandNames[Number(index)] || t('common.unknown')
  return t('capture.bandName', { index: bandIndex, name })
}

function buildImageUrl(path) {
  if (!path) return ''
  const base = cameraBaseUrl.value
  if (!base) return path
  return `${base}${path.startsWith('/') ? '' : '/'}${path}`
}

function setCaptureHistoryPreviews(captureId, previewUrls) {
  const item = captureHistory.value.find((entry) => entry.capture_id === captureId)
  if (item) {
    item.previewUrls = previewUrls
  }
  persistCaptureHistory()
}

function setCaptureHistoryPreviewProgress(captureId, progress, loading) {
  const item = captureHistory.value.find((entry) => entry.capture_id === captureId)
  if (item) {
    item.previewProgress = progress
    item.previewLoading = loading
  }
}

async function loadCaptureHistory() {
  try {
    const stored = await window.electronAPI.captureHistory.get()
    if (Array.isArray(stored) && stored.length > 0) {
      captureHistory.value = normalizeCaptureHistory(stored)
      return
    }

    const legacy = await window.electronAPI.settings.get('recent_captures')
    if (Array.isArray(legacy)) {
      captureHistory.value = normalizeCaptureHistory(legacy)
      await persistCaptureHistory()
    }
  } catch (error) {
    console.warn('[Capture] Failed to load recent captures:', error)
  }
}

function normalizeCaptureHistory(history) {
  const items = Array.isArray(history) ? history : []
  return items.map((item) => {
    const normalizedType = item?.type ?? item?.capture_type ?? item?.captureType ?? item?.mode ?? null
    const normalizedTimestamp = item?.timestamp ?? item?.time ?? item?.created_at ?? item?.createdAt ?? item?.date ?? null
    return {
      ...item,
      type: normalizedType ?? item?.type,
      timestamp: normalizedTimestamp ?? item?.timestamp
    }
  })
}

async function persistCaptureHistory() {
  try {
    const safeCaptures = serializeCaptureHistory(captureHistory.value)
    await window.electronAPI.captureHistory.set(safeCaptures)
  } catch (error) {
    console.warn('[Capture] Failed to persist recent captures:', error)
  }
}

function serializeCaptureHistory(history) {
  const raw = Array.isArray(history) ? history.map(item => toRaw(item)) : []
  return raw.map((item) => ({
    capture_id: item.capture_id,
    type: item.type,
    status: item.status,
    timestamp: item.timestamp,
    previewUrls: Array.isArray(item.previewUrls) ? item.previewUrls.slice() : [],
    previewLoading: Boolean(item.previewLoading),
    previewProgress: Number(item.previewProgress || 0)
  }))
}

const allSelected = computed(() => {
  return captureHistory.value.length > 0
    && selectedCaptureIds.value.length === captureHistory.value.length
})

function toggleSelectCapture(captureId, checked) {
  if (checked) {
    if (!selectedCaptureIds.value.includes(captureId)) {
      selectedCaptureIds.value.push(captureId)
    }
  } else {
    selectedCaptureIds.value = selectedCaptureIds.value.filter((id) => id !== captureId)
  }
}

function toggleSelectAll() {
  if (allSelected.value) {
    selectedCaptureIds.value = []
  } else {
    selectedCaptureIds.value = captureHistory.value.map((entry) => entry.capture_id)
  }
}

async function handleBatchDelete() {
  if (selectedCaptureIds.value.length === 0) return
  captureHistory.value = captureHistory.value.filter((entry) => !selectedCaptureIds.value.includes(entry.capture_id))
  selectedCaptureIds.value = []
  await persistCaptureHistory()
  message.success(t('capture.messages.selectedDeleted'))
}

async function handleBatchExport() {
  if (selectedCaptureIds.value.length === 0) return
  exportLoading.value = true

  try {
    const captureIds = Array.isArray(selectedCaptureIds.value)
      ? selectedCaptureIds.value.map((id) => String(id))
      : []
    const result = await window.electronAPI.captureHistory.export({
      captureIds
    })

    if (result?.canceled) {
      message.info(t('capture.messages.exportCanceled'))
      return
    }

    if (result?.success) {
      message.success(t('capture.messages.exportSuccess', { directory: result.directory }),5)
    } else {
      message.error(t('capture.messages.exportFailed'))
    }
  } catch (error) {
    message.error(t('capture.messages.exportFailedDetail', { error: error.message }))
  } finally {
    exportLoading.value = false
  }
}

async function decodeTiffToDataUrl(arrayBuffer) {
  const ifds = UTIF.decode(arrayBuffer)
  if (!ifds?.length) {
    throw new Error(t('capture.messages.invalidTiff'))
  }

  UTIF.decodeImage(arrayBuffer, ifds[0])
  const rgba = UTIF.toRGBA8(ifds[0])
  const { width, height } = ifds[0]

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) {
    throw new Error(t('capture.messages.canvasNotAvailable'))
  }

  const imageData = ctx.createImageData(width, height)
  imageData.data.set(rgba)
  ctx.putImageData(imageData, 0, 0)

  return canvas.toDataURL('image/png')
}

async function loadCapturePreviews(captureId, status) {
  const rawCache = status?.raw_cache_path
  if (!rawCache) {
    return
  }

  const entries = Object.entries(rawCache)
    .filter(([, path]) => typeof path === 'string' && path.length > 0)
    .sort((a, b) => Number(a[0]) - Number(b[0]))

  const previewUrls = []
  const total = entries.length
  let completed = 0

  if (total > 0) {
    setCaptureHistoryPreviewProgress(captureId, 0, true)
  }

  for (const [, path] of entries) {
    try {
      const response = await fetch(buildImageUrl(path))
      const buffer = await response.arrayBuffer()
      const dataUrl = await decodeTiffToDataUrl(buffer)
      previewUrls.push(dataUrl)
    } catch (error) {
      console.warn('[Capture] Failed to load preview image:', error)
    } finally {
      completed += 1
      const percent = total > 0 ? Math.round((completed / total) * 100) : 100
      setCaptureHistoryPreviewProgress(captureId, percent, completed < total)
    }
  }

  if (previewUrls.length > 0) {
    setCaptureHistoryPreviews(captureId, previewUrls)
  }

  setCaptureHistoryPreviewProgress(captureId, 100, false)
}

function stopCapturePolling() {
  if (capturePollTimer) {
    clearTimeout(capturePollTimer)
    capturePollTimer = null
  }
  capturePolling.value = false
}

function updateCaptureHistoryStatus(captureId, statusValue) {
  const item = captureHistory.value.find((entry) => entry.capture_id === captureId)
  if (item) {
    item.status = statusValue
  }
  persistCaptureHistory()
}

function startCapturePolling(captureId) {
  stopCapturePolling()
  capturePolling.value = true
  capturePollError.value = null

  let attempts = 0

  const poll = async () => {
    attempts += 1

    try {
      const status = await window.electronAPI.camera.getCaptureStatus(captureId)
      captureStatus.value = status

      if (status?.status === 'complete') {
        capturePolling.value = false
        updateCaptureHistoryStatus(captureId, 'downloading')
        await loadCapturePreviews(captureId, status)
        updateCaptureHistoryStatus(captureId, 'complete')
        return
      }

      if (status?.status === 'failed' || status?.status === 'error') {
        capturePolling.value = false
        updateCaptureHistoryStatus(captureId, status.status)
        message.error(t('capture.messages.captureFailedGeneric'))
        return
      }
    } catch (error) {
      capturePollError.value = t('capture.messages.pollingError', { error: error.message })
    }

    if (attempts >= CAPTURE_POLL_MAX_ATTEMPTS) {
      capturePolling.value = false
      capturePollError.value = t('capture.messages.pollingTimeout')
      updateCaptureHistoryStatus(captureId, 'timeout')
      return
    }

    capturePollTimer = setTimeout(poll, CAPTURE_POLL_INTERVAL_MS)
  }

  poll()
}
</script>

<style scoped>
.capture-view {
  max-width: 1200px;
  margin: 0 auto;
}

.card {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.mb-3 {
  margin-bottom: 16px;
}

.mt-2 {
  margin-top: 8px;
}

.mt-3 {
  margin-top: 16px;
}

.capture-col {
  display: flex;
}

.full-height-card {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.full-height-card :deep(.ant-card-body) {
  flex: 1;
}

.capture-result,
.timer-status {
  margin-top: 16px;
}

.capture-item {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.capture-item-header {
  display: flex;
  align-items: flex-start;
  gap: 12px;
}

.history-actions {
  display: flex;
  justify-content: flex-end;
  margin-bottom: 12px;
}

.preview-grid {
  width: 100%;
}

.preview-row {
  display: flex;
  flex-wrap: nowrap;
  gap: 12px;
  overflow-x: auto;
  padding-bottom: 4px;
}

.preview-card {
  flex: 1 1 0;
  min-width: 180px;
}

.preview-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.preview-item :deep(img) {
  width: 100%;
  max-height: 180px;
  object-fit: contain;
}

.preview-label {
  font-size: 12px;
  color: #666;
}
</style>
