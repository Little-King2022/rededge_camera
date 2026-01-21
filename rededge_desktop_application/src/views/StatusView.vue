<template>
  <div class="status-view">
    <a-card :title="t('status.title')" class="main-card">
      <template #extra>
        <a-space>
          <span v-if="lastUpdateTime">
            {{ t('status.updated', { time: formatTime(lastUpdateTime) }) }}
          </span>
          <a-button
            :type="autoRefresh ? 'primary' : 'default'"
            @click="toggleAutoRefresh"
            :disabled="!cameraStore.hasActiveProfile"
          >
            {{ autoRefresh ? t('status.autoRefreshOn') : t('status.autoRefreshOff') }}
          </a-button>
          <a-button
            @click="refreshStatus"
            :disabled="!cameraStore.hasActiveProfile"
          >
            {{ t('status.refresh') }}
          </a-button>
        </a-space>
      </template>

      <!-- Connection Info -->
      <a-alert
        v-if="!cameraStore.hasActiveProfile"
        :message="t('status.noActiveTitle')"
        type="warning"
        show-icon
        class="mb-3"
      />
      <a-alert
        v-else-if="cameraStore.activeProfile"
        :message="t('status.connectedTo', { name: cameraStore.activeProfile.name })"
        :description="`${cameraStore.activeProfile.protocol}://${cameraStore.activeProfile.host}:${cameraStore.activeProfile.port}`"
        type="info"
        show-icon
        class="mb-3"
      />

      <!-- Error Display -->
      <a-alert
        v-if="error"
        :message="t('status.statusFetchFailed', { count: consecutiveFailures })"
        :description="error"
        type="error"
        show-icon
        closable
        @close="error = null"
        class="mb-3"
      />

      <!-- Two Column Layout -->
      <a-row :gutter="16">
        <!-- Left Column: Basic Status -->
        <a-col :span="12">
          <!-- Status Panels -->
          <a-row :gutter="16" v-if="status">
            <!-- Storage -->
            <a-col :span="8">
              <a-card size="small" class="status-card">
                <a-statistic
                  :title="t('status.storage')"
                  :value="formatStorage(status)"
                  :prefix="getStorageIcon(status)"
                  :valueStyle="getStorageStyle(status)"
                />
                <div class="status-detail">
                  <span v-if="status.sd_status">{{ status.sd_status }}</span>
                  <span v-if="status.sd_type"> | {{ status.sd_type }}</span>
                </div>
              </a-card>
            </a-col>

            <!-- GPS Satellites -->
            <a-col :span="8">
              <a-card size="small" class="status-card">
                <a-statistic
                  :title="t('status.gpsSatellites')"
                  :value="`${status.gps_used_sats || 0} / ${status.gps_vis_sats || 0}`"
                  :prefix="getGPSIcon(status)"
                  :valueStyle="getGPSStyle(status)"
                />
                <div class="status-detail">
                  {{ t('status.usedVisible') }}
                  <span v-if="status.gps_type"> | {{ status.gps_type }}</span>
                </div>
              </a-card>
            </a-col>

            <!-- DLS Status -->
            <a-col :span="8">
              <a-card size="small" class="status-card">
                <a-statistic
                  :title="t('status.dlsStatus')"
                  :value="status.dls_status || t('common.unknown')"
                  :valueStyle="getDLSStyle(status)"
                />
              </a-card>
            </a-col>
          </a-row>

          <!-- Time & Location -->
          <a-row :gutter="16" class="mt-3" v-if="status">
            <a-col :span="12">
              <a-card size="small" :title="t('status.timeInfo')" class="status-card">
                <a-descriptions :column="1" size="small">
                  <a-descriptions-item :label="t('status.utcTime')">
                    {{ formatUTCTime(status.utc_time) }}
                  </a-descriptions-item>
                  <a-descriptions-item :label="t('status.gpsTime')">
                    {{ formatUTCTime(status.gps_time) }}
                  </a-descriptions-item>
                  <a-descriptions-item :label="t('status.timeSource')">
                    {{ status.time_source || t('common.none') }}
                  </a-descriptions-item>
                </a-descriptions>
              </a-card>
            </a-col>

            <a-col :span="12">
              <a-card size="small" :title="t('status.location')" class="status-card">
                <a-descriptions :column="1" size="small">
                  <a-descriptions-item :label="t('status.latitude')">
                    {{ status.gps_lat?.toFixed(6) || '0.000000' }}°
                  </a-descriptions-item>
                  <a-descriptions-item :label="t('status.longitude')">
                    {{ status.gps_lon?.toFixed(6) || '0.000000' }}°
                  </a-descriptions-item>
                  <a-descriptions-item :label="t('status.positionAccuracy')">
                    {{ status.p_acc ? formatMeters(status.p_acc) : t('common.none') }}
                  </a-descriptions-item>
                </a-descriptions>
              </a-card>
            </a-col>
          </a-row>

          <!-- Altitude, Speed, Heading -->
          <a-row :gutter="16" class="mt-3" v-if="status">
            <a-col :span="8">
              <a-card size="small" class="status-card">
                <a-statistic
                  :title="t('status.altitudeMsl')"
                  :value="status.alt_msl || 0"
                  suffix="m"
                />
              </a-card>
            </a-col>

            <a-col :span="8">
              <a-card size="small" class="status-card">
                <a-statistic
                  :title="t('status.altitudeAgl')"
                  :value="status.alt_agl || 0"
                  suffix="m"
                />
              </a-card>
            </a-col>

            <a-col :span="8">
              <a-card size="small" class="status-card">
                <a-statistic
                  :title="t('status.speed2d')"
                  :value="status.vel_2d?.toFixed(2) || '0.00'"
                  suffix="m/s"
                />
              </a-card>
            </a-col>
          </a-row>

          <!-- Capture Config -->
          <a-row :gutter="16" class="mt-3" v-if="status">
            <a-col :span="24">
              <a-card size="small" :title="t('status.captureConfig')" class="status-card">
                <a-descriptions :column="2" size="small">
                  <a-descriptions-item :label="t('status.autoCaptureActive')">
                    <a-tag :color="status.auto_cap_active ? 'green' : 'default'">
                      {{ status.auto_cap_active ? t('common.yes') : t('common.no') }}
                    </a-tag>
                  </a-descriptions-item>
                  <a-descriptions-item :label="t('status.busVoltage')">
                    {{ status.bus_volts?.toFixed(2) || t('common.none') }} V
                  </a-descriptions-item>
                  <a-descriptions-item :label="t('status.heading')">
                    {{ status.course || 0 }}°
                  </a-descriptions-item>
                </a-descriptions>
              </a-card>
            </a-col>
          </a-row>

          <!-- Version Information -->
          <a-row :gutter="16" class="mt-3" v-if="version">
            <a-col :span="24">
              <a-card size="small" :title="t('status.cameraVersion')" class="status-card">
                <a-descriptions :column="2" size="small">
                  <a-descriptions-item :label="t('status.serialNumber')">
                    <a-tag color="blue">{{ version.serial }}</a-tag>
                  </a-descriptions-item>
                  <a-descriptions-item :label="t('status.softwareVersion')">
                    <a-tag color="green">{{ version.sw_version }}</a-tag>
                  </a-descriptions-item>
                </a-descriptions>
              </a-card>
            </a-col>
          </a-row>
        </a-col>

        <!-- Right Column: DLS IMU & Camera Info -->
        <a-col :span="12">
          <!-- DLS IMU Data -->
          <a-row :gutter="16" v-if="dlsImu">
            <a-col :span="24">
              <a-card 
                size="small" 
                :title="t('status.imuTitle')" 
                class="status-card clickable-card"
                @click="showImuVisualization"
              >
                <a-row :gutter="16">
                  <a-col :span="8">
                    <h4 class="sensor-title">{{ t('status.accelerometer') }}</h4>
                    <a-descriptions :column="1" size="small">
                      <a-descriptions-item label="X">{{ dlsImu.accel?.[0]?.toFixed(3) || t('common.none') }}</a-descriptions-item>
                      <a-descriptions-item label="Y">{{ dlsImu.accel?.[1]?.toFixed(3) || t('common.none') }}</a-descriptions-item>
                      <a-descriptions-item label="Z">{{ dlsImu.accel?.[2]?.toFixed(3) || t('common.none') }}</a-descriptions-item>
                    </a-descriptions>
                  </a-col>
                  <a-col :span="8">
                    <h4 class="sensor-title">{{ t('status.gyroscope') }}</h4>
                    <a-descriptions :column="1" size="small">
                      <a-descriptions-item label="X">{{ dlsImu.gyro?.[0]?.toFixed(6) || t('common.none') }}</a-descriptions-item>
                      <a-descriptions-item label="Y">{{ dlsImu.gyro?.[1]?.toFixed(6) || t('common.none') }}</a-descriptions-item>
                      <a-descriptions-item label="Z">{{ dlsImu.gyro?.[2]?.toFixed(6) || t('common.none') }}</a-descriptions-item>
                    </a-descriptions>
                  </a-col>
                  <a-col :span="8">
                    <h4 class="sensor-title">{{ t('status.magnetometer') }}</h4>
                    <a-descriptions :column="1" size="small">
                      <a-descriptions-item label="X">{{ dlsImu.mag?.[0]?.toExponential(3) || t('common.none') }}</a-descriptions-item>
                      <a-descriptions-item label="Y">{{ dlsImu.mag?.[1]?.toExponential(3) || t('common.none') }}</a-descriptions-item>
                      <a-descriptions-item label="Z">{{ dlsImu.mag?.[2]?.toExponential(3) || t('common.none') }}</a-descriptions-item>
                    </a-descriptions>
                  </a-col>
                </a-row>
                <a-divider style="margin: 12px 0" />
                <a-row :gutter="16">
                  <a-col :span="8">
                    <a-statistic
                      :title="t('status.pitch')"
                      :value="dlsImu.pitch?.toFixed(4) || 0"
                      suffix="rad"
                    />
                  </a-col>
                  <a-col :span="8">
                    <a-statistic
                      :title="t('status.roll')"
                      :value="dlsImu.roll?.toFixed(4) || 0"
                      suffix="rad"
                    />
                  </a-col>
                  <a-col :span="8">
                    <a-statistic
                      :title="t('status.yaw')"
                      :value="dlsImu.yaw?.toFixed(4) || 0"
                      suffix="rad"
                    />
                  </a-col>
                </a-row>
              </a-card>
            </a-col>
          </a-row>

          <!-- Camera Band Information -->
          <a-row :gutter="16" class="mt-3" v-if="cameraInfo">
            <a-col :span="24">
              <a-card 
                size="small" 
                :title="t('status.bandInfo')" 
                class="status-card clickable-card"
                @click="showBandVisualization"
              >
                <a-row :gutter="[16, 16]">
                  <a-col 
                    :span="24" 
                    :lg="8"
                    v-for="(band, key) in cameraInfo" 
                    :key="key"
                  >
                    <a-card size="small" :title="t('status.bandTitle', { key, name: band.bandname })" class="band-card">
                      <a-descriptions :column="1" size="small">
                        <a-descriptions-item :label="t('status.bandType')">
                          <a-tag>{{ band.type }}</a-tag>
                        </a-descriptions-item>
                        <a-descriptions-item :label="t('status.bandCenter')">
                          {{ band.center_nm }} nm
                        </a-descriptions-item>
                        <a-descriptions-item :label="t('status.bandBandwidth')">
                          {{ band.bandwidth_nm }} nm
                        </a-descriptions-item>
                        <a-descriptions-item :label="t('status.bandResolution')">
                          {{ band.image_width }} × {{ band.image_height }}
                        </a-descriptions-item>
                        <a-descriptions-item :label="t('status.bandFocalLength')">
                          {{ band.focal_length_px?.toFixed(2) || t('common.none') }} px
                        </a-descriptions-item>
                      </a-descriptions>
                    </a-card>
                  </a-col>
                </a-row>
              </a-card>
            </a-col>
          </a-row>
        </a-col>
      </a-row>

      <!-- IMU Visualization Modal -->
      <a-modal
        v-model:open="imuModalVisible"
        :title="t('status.imuModalTitle')"
        width="800px"
        :footer="null"
        @cancel="closeImuVisualization"
      >
        <div class="imu-visualization-container">
          <div ref="threeContainer" class="three-container"></div>
          <div class="imu-data-panel">
            <a-row :gutter="16">
              <a-col :span="8">
                <a-statistic
                  :title="t('status.roll')"
                  :value="dlsImu?.roll?.toFixed(4) || 0"
                  suffix="rad"
                  :value-style="{ fontSize: '18px' }"
                />
                <div class="degree-value">{{ radToDeg(dlsImu?.roll || 0) }}°</div>
              </a-col>
              <a-col :span="8">
                <a-statistic
                  :title="t('status.pitch')"
                  :value="dlsImu?.pitch?.toFixed(4) || 0"
                  suffix="rad"
                  :value-style="{ fontSize: '18px' }"
                />
                <div class="degree-value">{{ radToDeg(dlsImu?.pitch || 0) }}°</div>
              </a-col>
              <a-col :span="8">
                <a-statistic
                  :title="t('status.yaw')"
                  :value="dlsImu?.yaw?.toFixed(4) || 0"
                  suffix="rad"
                  :value-style="{ fontSize: '18px' }"
                />
                <div class="degree-value">{{ radToDeg(dlsImu?.yaw || 0) }}°</div>
              </a-col>
            </a-row>
          </div>
        </div>
      </a-modal>

      <!-- Band Visualization Modal -->
      <a-modal
        v-model:open="bandModalVisible"
        :title="t('status.bandModalTitle')"
        width="90vw"
        :footer="null"
        @cancel="closeBandVisualization"
      >
        <BandVisualization />
      </a-modal>
    </a-card>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, watch, nextTick } from 'vue'
import { message } from 'ant-design-vue'
import { useCameraStore } from '../stores/camera'
import * as THREE from 'three'
import { useI18n } from 'vue-i18n'
import BandVisualization from '../components/BandVisualization.vue'

const cameraStore = useCameraStore()
const { t, locale } = useI18n()

const status = ref(null)
const dlsImu = ref(null)
const version = ref(null)
const cameraInfo = ref(null)
const isLoading = ref(false)
const error = ref(null)
const autoRefresh = ref(true)
const refreshInterval = ref(3000) // 3s default
const lastUpdateTime = ref(null)
const consecutiveFailures = ref(0)
const imuModalVisible = ref(false)
const bandModalVisible = ref(false)
const threeContainer = ref(null)

// Cache for data that doesn't change - only fetch once until app restart
let versionCache = null
let cameraInfoCache = null

let intervalId = null
let threeScene = null
let threeCamera = null
let threeRenderer = null
let cubeObject = null
let animationFrameId = null
let visibilityHandler = null

onMounted(async () => {
  await cameraStore.loadActiveProfile()
  
  // Load refresh interval from settings
  try {
    const statusRefreshRate = await window.electronAPI.settings.get('status_refresh_rate')
    if (statusRefreshRate) {
      const seconds = parseInt(statusRefreshRate, 10)
      if (Number.isFinite(seconds) && seconds > 0) {
        refreshInterval.value = seconds * 1000 // Convert to milliseconds
      }
    }
  } catch (err) {
    console.warn('[Status] Failed to load status_refresh_rate setting:', err)
  }
  
  if (cameraStore.hasActiveProfile) {
    await refreshStatus()
    if (autoRefresh.value) {
      startAutoRefresh()
    }
  }

  // 监听页面可见性变化
  visibilityHandler = () => {
    if (document.hidden) {
      // 页面不可见时停止自动刷新
      if (autoRefresh.value && intervalId) {
        stopAutoRefresh()
      }
    } else {
      // 页面可见时恢复自动刷新
      if (autoRefresh.value && !intervalId && cameraStore.hasActiveProfile) {
        startAutoRefresh()
      }
    }
  }
  document.addEventListener('visibilitychange', visibilityHandler)
})

onUnmounted(() => {
  stopAutoRefresh()
  cleanupThreeScene()
  
  // 移除页面可见性监听
  if (visibilityHandler) {
    document.removeEventListener('visibilitychange', visibilityHandler)
    visibilityHandler = null
  }
})

function showImuVisualization() {
  imuModalVisible.value = true
  nextTick(() => {
    initThreeScene()
  })
}

function closeImuVisualization() {
  imuModalVisible.value = false
  cleanupThreeScene()
}

function showBandVisualization() {
  bandModalVisible.value = true
}

function closeBandVisualization() {
  bandModalVisible.value = false
}

function initThreeScene() {
  if (!threeContainer.value) return

  const container = threeContainer.value
  const width = container.clientWidth
  const height = 400

  // Scene
  threeScene = new THREE.Scene()
  threeScene.background = new THREE.Color(0xf0f0f0)

  // Camera
  threeCamera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000)
  threeCamera.position.set(3, 3, 3)
  threeCamera.lookAt(0, 0, 0)

  // Renderer
  threeRenderer = new THREE.WebGLRenderer({ antialias: true })
  threeRenderer.setSize(width, height)
  container.appendChild(threeRenderer.domElement)

  // Lights
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.6)
  threeScene.add(ambientLight)

  const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8)
  directionalLight.position.set(5, 10, 5)
  threeScene.add(directionalLight)

  // Create aircraft-like shape
  const group = new THREE.Group()

  // Main body (fuselage)
  const bodyGeometry = new THREE.BoxGeometry(2, 0.5, 0.5)
  const bodyMaterial = new THREE.MeshStandardMaterial({ color: 0x2196f3 })
  const body = new THREE.Mesh(bodyGeometry, bodyMaterial)
  group.add(body)

  // Wings
  const wingGeometry = new THREE.BoxGeometry(0.2, 2, 0.1)
  const wingMaterial = new THREE.MeshStandardMaterial({ color: 0x1976d2 })
  const wings = new THREE.Mesh(wingGeometry, wingMaterial)
  wings.rotation.z = Math.PI / 2
  group.add(wings)

  // Tail
  const tailGeometry = new THREE.BoxGeometry(0.2, 0.8, 0.1)
  const tailMaterial = new THREE.MeshStandardMaterial({ color: 0x1565c0 })
  const tail = new THREE.Mesh(tailGeometry, tailMaterial)
  tail.position.set(-0.9, 0, 0)
  tail.rotation.z = Math.PI / 2
  group.add(tail)

  // Nose cone
  const noseGeometry = new THREE.ConeGeometry(0.25, 0.5, 8)
  const noseMaterial = new THREE.MeshStandardMaterial({ color: 0xff9800 })
  const nose = new THREE.Mesh(noseGeometry, noseMaterial)
  nose.rotation.z = -Math.PI / 2
  nose.position.set(1.25, 0, 0)
  group.add(nose)

  // Add coordinate axes
  const axesHelper = new THREE.AxesHelper(2)
  threeScene.add(axesHelper)

  cubeObject = group
  threeScene.add(cubeObject)

  // Add grid
  const gridHelper = new THREE.GridHelper(5, 10)
  threeScene.add(gridHelper)

  // Start animation
  animate()
}

function animate() {
  animationFrameId = requestAnimationFrame(animate)

  if (cubeObject && dlsImu.value) {
    // Apply rotations (Three.js uses XYZ Euler angles)
    // Note: Depending on your IMU's coordinate system, you might need to adjust these
    cubeObject.rotation.set(
      dlsImu.value.pitch || 0,
      dlsImu.value.yaw || 0,
      dlsImu.value.roll || 0
    )
  }

  if (threeRenderer && threeScene && threeCamera) {
    threeRenderer.render(threeScene, threeCamera)
  }
}

function cleanupThreeScene() {
  if (animationFrameId) {
    cancelAnimationFrame(animationFrameId)
    animationFrameId = null
  }

  if (threeRenderer) {
    threeRenderer.dispose()
    if (threeContainer.value && threeRenderer.domElement) {
      threeContainer.value.removeChild(threeRenderer.domElement)
    }
    threeRenderer = null
  }

  threeScene = null
  threeCamera = null
  cubeObject = null
}

function radToDeg(rad) {
  return (rad * 180 / Math.PI).toFixed(2)
}

async function refreshStatus() {
  if (!cameraStore.hasActiveProfile) {
    message.error(t('status.messages.noActiveProfile'))
    return
  }

  isLoading.value = true

  try {
    // 准备请求数组（version 和 camera_info 使用缓存）
    const requests = [
      window.electronAPI.camera.getStatus(),
      window.electronAPI.camera.getDlsImu(),
      versionCache ? Promise.resolve(versionCache) : window.electronAPI.camera.getVersion(),
      cameraInfoCache ? Promise.resolve(cameraInfoCache) : window.electronAPI.camera.getCameraInfo()
    ]

    // 并行获取所有状态数据
    const [statusData, dlsImuData, versionData, cameraInfoData] = await Promise.allSettled(requests)

    // 处理 status
    if (statusData.status === 'fulfilled') {
      status.value = statusData.value
    }

    // 处理 DLS IMU
    if (dlsImuData.status === 'fulfilled') {
      dlsImu.value = dlsImuData.value
    }

    // 处理 version（首次获取后缓存）
    if (versionData.status === 'fulfilled') {
      version.value = versionData.value
      if (!versionCache) {
        versionCache = versionData.value
        console.log('[Status] Version cached:', versionCache)
      }
    }

    // 处理 camera info（首次获取后缓存）
    if (cameraInfoData.status === 'fulfilled') {
      cameraInfo.value = cameraInfoData.value
      if (!cameraInfoCache) {
        cameraInfoCache = cameraInfoData.value
        console.log('[Status] Camera info cached:', cameraInfoCache)
      }
    }

    lastUpdateTime.value = Date.now()
    error.value = null
    consecutiveFailures.value = 0
  } catch (err) {
    error.value = err.message
    consecutiveFailures.value++
    console.error('[Status] Failed to fetch status:', err)
  } finally {
    isLoading.value = false
  }
}

function startAutoRefresh() {
  stopAutoRefresh()
  intervalId = setInterval(refreshStatus, refreshInterval.value)
}

function stopAutoRefresh() {
  if (intervalId) {
    clearInterval(intervalId)
    intervalId = null
  }
}

function toggleAutoRefresh() {
  autoRefresh.value = !autoRefresh.value
  if (autoRefresh.value) {
    startAutoRefresh()
  } else {
    stopAutoRefresh()
  }
}

function formatStorage(status) {
  if (!status.sd_gb_free || !status.sd_gb_total) {
    return t('status.noStorage')
  }
  return `${status.sd_gb_free.toFixed(2)} / ${status.sd_gb_total.toFixed(2)} GB`
}

function getStorageIcon(status) {
  if (status.sd_warn || status.sd_status !== 'Ok') {
    return '⛔'
  }
  return '💾'
}

function getStorageStyle(status) {
  if (status.sd_warn || status.sd_status !== 'Ok') {
    return { color: '#a44a3f' }
  }
  return { color: '#6b9080' }
}

function getGPSIcon(status) {
  if (status.gps_warn || (status.gps_used_sats || 0) === 0) {
    return '⛔'
  }
  return '📡'
}

function getGPSStyle(status) {
  if (status.gps_warn || (status.gps_used_sats || 0) === 0) {
    return { color: '#c88719' }
  }
  return { color: '#6b9080' }
}

function getDLSStyle(status) {
  if (status.dls_status === 'Ok') {
    return { color: '#6b9080' }
  }
  return { color: '#c88719' }
}

function formatUTCTime(timeStr) {
  if (!timeStr) return t('common.none')
  return timeStr
}

function formatTime(timestamp) {
  if (!timestamp) return t('common.none')
  const date = new Date(timestamp)
  return date.toLocaleTimeString(locale.value)
}

function formatMeters(meters) {
  if (meters < 1000) {
    return `${meters.toFixed(0)} m`
  }
  return `${(meters / 1000).toFixed(2)} km`
}
</script>

<style scoped>
.status-view {
  max-width: 1400px;
  margin: 0 auto;
}

.main-card {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.status-card {
  height: 100%;
}

.status-detail {
  margin-top: 8px;
  font-size: 12px;
  color: #666;
}

.sensor-title {
  font-size: 14px;
  font-weight: 600;
  margin-bottom: 8px;
  color: #333;
}

.band-card {
  background: #fafafa;
  border: 1px solid #e8e8e8;
}

.clickable-card {
  cursor: pointer;
  transition: all 0.3s ease;
}

.clickable-card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  transform: translateY(-2px);
}

.imu-visualization-container {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.three-container {
  width: 100%;
  height: 400px;
  border: 1px solid #e8e8e8;
  border-radius: 4px;
  overflow: hidden;
}

.imu-data-panel {
  padding: 16px;
  background: #fafafa;
  border-radius: 4px;
}

.degree-value {
  margin-top: 4px;
  font-size: 12px;
  color: #666;
  text-align: center;
}

.mb-3 {
  margin-bottom: 16px;
}

.mt-3 {
  margin-top: 16px;
}
</style>
