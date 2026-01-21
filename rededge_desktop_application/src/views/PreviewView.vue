<template>
  <div class="preview-view">
    <a-card :title="t('preview.title')" class="main-card">
      <template #extra>
        <a-space>
          <a-button
            v-if="!isPlaying"
            type="primary"
            @click="startPreview"
            :disabled="!cameraStore.hasActiveProfile"
          >
            {{ t('preview.start') }}
          </a-button>
          <a-button
            v-else
            type="default"
            danger
            @click="stopPreview"
          >
            {{ t('preview.stop') }}
          </a-button>
        </a-space>
      </template>

      <!-- Active Profile Alert -->
      <a-alert
        v-if="!cameraStore.hasActiveProfile"
        :message="t('preview.noActiveTitle')"
        :description="t('preview.noActiveDesc')"
        type="warning"
        show-icon
        class="mb-3"
      />

      <!-- Preview Settings -->
      <a-row :gutter="16" class="mb-3">
        <a-col :span="8">
          <a-card size="small" :title="t('preview.settingsTitle')">
            <a-form layout="vertical" size="small">
              <a-form-item :label="t('preview.refreshRate')">
                <a-input-number
                  v-model:value="refreshRate"
                  :min="0.1"
                  :max="5"
                  :step="0.1"
                  :disabled="isPlaying"
                  style="width: 100%"
                />
              </a-form-item>
            </a-form>
          </a-card>
        </a-col>

        <a-col :span="16">
          <a-card size="small" :title="t('preview.statsTitle')">
            <a-descriptions :column="2" size="small">
              <a-descriptions-item :label="t('preview.statusLabel')">
                <a-tag :color="isPlaying ? 'green' : 'default'">
                  {{ isPlaying ? t('preview.statusRunning') : t('preview.statusStopped') }}
                </a-tag>
              </a-descriptions-item>
              <a-descriptions-item :label="t('preview.currentRate')">
                {{ currentRate.toFixed(2) }} Hz
              </a-descriptions-item>
              <a-descriptions-item :label="t('preview.frameTimestamp')">
                {{ frameTimestamp ? formatTime(frameTimestamp) : t('common.none') }}
              </a-descriptions-item>
              <!-- <a-descriptions-item :label="t('preview.lastSuccess')">
                {{ lastSuccessTime ? formatTime(lastSuccessTime) : t('common.none') }}
              </a-descriptions-item> -->
              <!-- <a-descriptions-item :label="t('preview.consecutiveFailures')">
                <a-tag :color="consecutiveFailures > 0 ? 'red' : 'green'">
                  {{ consecutiveFailures }}
                </a-tag>
              </a-descriptions-item> -->
              <a-descriptions-item :label="t('preview.frameSize')">
                {{ frameSize ? formatBytes(frameSize) : t('common.none') }}
              </a-descriptions-item>
            </a-descriptions>
          </a-card>
        </a-col>
      </a-row>

      <!-- Preview Image Display -->
      <div class="preview-container">
        <div v-if="error" class="error-display">
          <a-result
            status="error"
            :title="t('preview.errorTitle')"
            :sub-title="error"
          >
            <template #extra>
              <a-button type="primary" @click="retryPreview">
                {{ t('preview.retry') }}
              </a-button>
            </template>
          </a-result>
        </div>

        <div v-else-if="!previewDataURL && !isPlaying" class="placeholder">
          <a-empty :description="t('preview.empty')" />
        </div>

        <div v-else-if="isLoading && !previewDataURL" class="loading-display">
          <a-spin size="large" :tip="t('preview.loading')" />
        </div>

        <div v-else class="image-display">
          <img
            v-if="previewDataURL"
            :src="previewDataURL"
            :alt="t('preview.imageAlt')"
            class="preview-image"
          />
          <a-spin v-if="isLoading" class="loading-overlay" />
        </div>
      </div>
    </a-card>
    <a-card :title="t('preview.bandvisualization_title')" class="main-card mt-3">
      <BandVisualization />
    </a-card>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { message } from 'ant-design-vue'
import { useCameraStore } from '../stores/camera'
import { useI18n } from 'vue-i18n'
import BandVisualization from '../components/BandVisualization.vue'

const cameraStore = useCameraStore()
const { t, locale } = useI18n()

const isPlaying = ref(false)
const isLoading = ref(false)
const error = ref(null)
const previewDataURL = ref(null)
const refreshRate = ref(0.5) // Hz (default 0.5Hz = 2 seconds per frame)
const currentRate = ref(0)
const frameTimestamp = ref(null)
const lastSuccessTime = ref(null)
const consecutiveFailures = ref(0)
const frameSize = ref(0)

let intervalId = null
let backoffTimeoutId = null
let lastFrameTime = null

onMounted(async () => {
  await cameraStore.loadActiveProfile()
  
  // Load refresh rate from settings
  try {
    const previewRefreshRate = await window.electronAPI.settings.get('preview_refresh_rate')
    if (previewRefreshRate) {
      const rate = parseFloat(previewRefreshRate)
      if (Number.isFinite(rate) && rate > 0) {
        refreshRate.value = rate
      }
    }
  } catch (err) {
    console.warn('[Preview] Failed to load preview_refresh_rate setting:', err)
  }
})

onUnmounted(() => {
  stopPreview()
})

async function startPreview() {
  if (!cameraStore.hasActiveProfile) {
    message.error(t('preview.messages.noActiveProfile'))
    return
  }

  isPlaying.value = true
  error.value = null
  consecutiveFailures.value = 0

  // Start fetching frames
  fetchFrame()

  // Set interval for continuous fetch
  const intervalMs = Math.floor(1000 / refreshRate.value)
  intervalId = setInterval(fetchFrame, intervalMs)
}

function stopPreview() {
  isPlaying.value = false

  // Clear all timers
  if (intervalId) {
    clearInterval(intervalId)
    intervalId = null
  }

  if (backoffTimeoutId) {
    clearTimeout(backoffTimeoutId)
    backoffTimeoutId = null
  }

  // Keep the last frame displayed (don't clear previewDataURL)
}

async function fetchFrame() {
  if (!isPlaying.value) return

  try {
    isLoading.value = true

    const startTime = Date.now()

    // CRITICAL: Call Main process to get preview frame via two-step fetch
    // Main process handles: GET /jpeg_url -> GET {jpeg_url} -> base64 dataURL
    const frame = await window.electronAPI.preview.getFrame()

    const endTime = Date.now()
    const fetchTime = endTime - startTime

    // Update preview
    previewDataURL.value = frame.dataURL
    frameTimestamp.value = frame.timestamp
    lastSuccessTime.value = Date.now()
    frameSize.value = frame.size || 0

    // Calculate actual refresh rate(>=0)
    if (lastFrameTime) {
      let actualInterval = startTime - lastFrameTime
      if (actualInterval < 0){
        actualInterval = 0
      }
      currentRate.value = 1000 / actualInterval
    }
    lastFrameTime = startTime

    // Reset error state
    error.value = null
    consecutiveFailures.value = 0

    console.log(`[Preview] Frame fetched in ${fetchTime}ms, size: ${formatBytes(frame.size)}`)
  } catch (err) {
    consecutiveFailures.value++
    error.value = err.message

    console.error('[Preview] Failed to fetch frame:', err)
    
    // No retry on failure - just display the error and continue with next scheduled fetch
  } finally {
    isLoading.value = false
  }
}

function retryPreview() {
  error.value = null
  consecutiveFailures.value = 0
  fetchFrame()
}

function formatTime(timestamp) {
  if (!timestamp) return t('common.none')
  const date = new Date(timestamp)
  return date.toLocaleTimeString(locale.value)
}

function formatBytes(bytes) {
  if (!bytes) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}
</script>

<style scoped>
.preview-view {
  max-width: 1400px;
  margin: 0 auto;
}

.main-card {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.mb-3 {
  margin-bottom: 16px;
}

.mt-3 {
  margin-top: 16px;
}

.preview-container {
  position: relative;
  min-height: 600px;
  background: #ffffff;
  border-radius: 4px;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
}

.error-display,
.placeholder,
.loading-display {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  background: #fff;
}

.image-display {
  position: relative;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.preview-image {
  max-width: 100%;
  max-height: 600px;
  object-fit: contain;
}

.loading-overlay {
  position: absolute;
  top: 20px;
  right: 20px;
  background: rgb(255, 255, 255);
  padding: 10px;
  border-radius: 4px;
}
</style>
