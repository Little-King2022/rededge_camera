<template>
  <div class="settings-view">
    <a-row :gutter="16">
      <a-col :span="6">
        <a-card class="sidebar-card" :title="t('settings.sidebarTitle')">
          <a-menu mode="inline" :selectedKeys="[activeSection]" @click="handleSectionChange">
            <a-menu-item key="general">{{ t('settings.menu.general') }}</a-menu-item>
            <a-menu-item key="network">{{ t('settings.menu.network') }}</a-menu-item>
            <a-menu-item key="license">{{ t('settings.menu.license') }}</a-menu-item>
            <a-menu-item key="about">{{ t('settings.menu.about') }}</a-menu-item>
          </a-menu>
        </a-card>
      </a-col>

      <a-col :span="18">
        <a-card :title="sectionTitle" class="main-card">
          <template #extra v-if="activeSection === 'general' || activeSection === 'network'">
            <a-space>
              <a-button @click="loadSettings">
                {{ t('common.reset') }}
              </a-button>
              <a-button type="primary" :loading="isSaving" @click="handleSave">
                {{ t('common.saveSettings') }}
              </a-button>
            </a-space>
          </template>

          <a-form layout="vertical" @submit.prevent="handleSave">

            <!-- 1-General Settings -->
            <div v-show="activeSection === 'general'">
              <!-- Download Settings -->
              <a-card size="small" :title="t('settings.general.downloadTitle')" class="settings-section">
                <a-form-item :label="t('settings.general.downloadDir')">
                  <a-input v-model:value="settings.download_directory"
                    :placeholder="t('settings.general.downloadDirPlaceholder')" />
                  <template #extra>
                    {{ t('settings.general.downloadDirExtra') }}
                  </template>
                </a-form-item>

                <a-form-item :label="t('settings.general.concurrent')">
                  <a-input-number v-model:value="settings.download_max_concurrent" :min="1" :max="5" :step="1"
                    style="width: 200px" />
                  <template #extra>
                    {{ t('settings.general.concurrentExtra') }}
                  </template>
                </a-form-item>
              </a-card>

              <!-- Preview Settings -->
              <a-card size="small" :title="t('settings.general.previewTitle')" class="settings-section mt-3">
                <a-form-item :label="t('settings.general.previewRate')">
                  <a-input-number v-model:value="settings.preview_refresh_rate" :min="0.1" :max="5" :step="0.1"
                    style="width: 200px" />
                  <template #extra>
                    {{ t('settings.general.previewExtra') }}
                  </template>
                </a-form-item>
              </a-card>

              <!-- Status Settings -->
              <a-card size="small" :title="t('settings.general.statusTitle')" class="settings-section mt-3">
                <a-form-item :label="t('settings.general.statusRate')">
                  <a-input-number v-model:value="settings.status_refresh_rate" :min="1" :max="60" :step="1"
                    style="width: 200px" />
                  <template #extra>
                    {{ t('settings.general.statusExtra') }}
                  </template>
                </a-form-item>
              </a-card>

              <!-- Logging Settings -->
              <a-card size="small" :title="t('settings.general.loggingTitle')" class="settings-section mt-3">
                <a-form-item :label="t('settings.general.enableLogging')">
                  <a-switch v-model:checked="settings.enable_logging" :checked-children="t('common.on')"
                    :un-checked-children="t('common.off')" />
                  <template #extra>
                    {{ t('settings.general.loggingExtra') }}
                  </template>
                </a-form-item>
              </a-card>

              <!-- Language Settings -->
              <a-card size="small" :title="t('settings.general.languageTitle')" class="settings-section mt-3">
                <a-form-item :label="t('settings.general.languageLabel')">
                  <a-select v-model:value="settings.language" style="width: 240px">
                    <a-select-option value="en-US">{{ t('settings.languageOptions.en') }}</a-select-option>
                    <a-select-option value="zh-CN">{{ t('settings.languageOptions.zh') }}</a-select-option>
                  </a-select>
                </a-form-item>
              </a-card>
            </div>

            <!-- 2-Network Settings -->
            <div v-show="activeSection === 'network'">
              <a-card size="small" :title="t('settings.network.title')" class="settings-section mt-3">
                <a-form-item :label="t('settings.network.timeout')">
                  <a-input-number v-model:value="settings.request_timeout" :min="5000" :max="120000" :step="1000"
                    style="width: 200px" />
                  <template #extra>
                    {{ t('settings.network.timeoutExtra') }}
                  </template>
                </a-form-item>
              </a-card>
              <a-card size="small" :title="t('settings.network.proxyTitle')" class="settings-section mt-3">
                <a-form-item :label="t('settings.network.enableProxy')">
                  <a-switch v-model:checked="settings.camera_proxy_enabled" :checked-children="t('common.on')"
                    :un-checked-children="t('common.off')" />
                  <template #extra>
                    {{ t('settings.network.proxyExtra') }}
                  </template>
                </a-form-item>

                <a-form-item v-if="settings.camera_proxy_enabled" :label="t('settings.network.proxyUrl')">
                  <a-input v-model:value="settings.camera_proxy_url"
                    :placeholder="t('settings.network.proxyPlaceholder')" />
                  <template #extra>
                    {{ t('settings.network.proxyUrlExtra', { example: 'http://user:pass@proxy-host:8080' }) }}
                  </template>
                </a-form-item>
              </a-card>

              <!-- Admin Server Settings -->
              <a-card size="small" :title="t('settings.network.adminServerTitle', 'Management Server')" class="settings-section mt-3">
                <a-form-item :label="t('settings.network.adminServerUrl', 'Server URL')">
                  <a-input v-model:value="settings.admin_server_url"
                    :placeholder="t('settings.network.adminServerUrlPlaceholder', 'http://localhost:5000/api')"
                    disabled />
                </a-form-item>
              </a-card>
            </div>

            <!-- 4-Software License -->
            <div v-show="activeSection === 'license'">
              <!-- License Status -->
              <a-row :gutter="16">
                <a-col :span="12">
                  <a-card size="small" :title="t('settings.license.currentStatus')">
                    <a-result :status="getStatusIcon()" :title="getStatusTitle()" :sub-title="getStatusDescription()">
                      <template #extra v-if="licenseStore.isTrial">
                        <a-statistic :title="t('settings.license.trialDays')" :value="licenseStore.trialDaysRemaining"
                          :suffix="t('common.days')" :valueStyle="getTrialStyle()" />
                      </template>
                    </a-result>
                  </a-card>
                </a-col>

                <a-col :span="12">
                  <a-card size="small" :title="t('settings.license.licenseInfo')">
                    <a-descriptions :column="1" size="small" v-if="licenseStore.licenseInfo">
                      <a-descriptions-item :label="t('settings.license.licenseStatus')">
                        <a-tag :color="getStatusColor()">
                          {{ formatLicenseStatus(licenseStore.licenseInfo.status) }}
                        </a-tag>
                      </a-descriptions-item>

                      <a-descriptions-item :label="t('settings.license.expiryDate')"
                        v-if="licenseStore.licenseInfo.expiry_at">
                        {{ formatDate(licenseStore.licenseInfo.expiry_at) }}
                      </a-descriptions-item>

                      <!-- <a-descriptions-item label="Device Fingerprint">
                      <code style="font-size: 11px">{{ licenseStore.licenseInfo.device_fingerprint?.substring(0, 16) }}...</code>
                    </a-descriptions-item> -->

                      <!-- <a-descriptions-item label="Last Check" v-if="licenseStore.licenseInfo.last_check_at">
                      {{ formatDate(licenseStore.licenseInfo.last_check_at) }}
                    </a-descriptions-item> -->
                    </a-descriptions>

                    <!-- User Information (if activated) -->
                    <a-divider v-if="licenseStore.isActivated && licenseStore.licenseInfo.user" />
                    <a-descriptions v-if="licenseStore.isActivated && licenseStore.licenseInfo.user"
                      :title="t('settings.license.userInfo')" :column="1" size="small">
                      <a-descriptions-item :label="t('settings.license.name')">
                        {{ licenseStore.licenseInfo.user.name }}
                      </a-descriptions-item>
                      <a-descriptions-item :label="t('settings.license.org')" v-if="licenseStore.licenseInfo.user.org">
                        {{ licenseStore.licenseInfo.user.org }}
                      </a-descriptions-item>
                      <a-descriptions-item :label="t('settings.license.contact')"
                        v-if="licenseStore.licenseInfo.user.contact">
                        {{ licenseStore.licenseInfo.user.contact }}
                      </a-descriptions-item>
                    </a-descriptions>
                  </a-card>
                </a-col>
              </a-row>

              <!-- Activation Section -->
              <a-row :gutter="16" class="mt-3" v-if="!licenseStore.isActivated">
                <a-col :span="24">
                  <a-card size="small" :title="t('settings.license.activateTitle')">
                    <a-alert v-if="licenseStore.isTrial"
                      :message="t('settings.license.trialAlert', { days: licenseStore.trialDaysRemaining })"
                      :description="t('settings.license.trialDesc')" type="info" show-icon class="mb-3" />

                    <a-alert v-if="licenseStore.isRevoked" :message="t('settings.license.revokedTitle')"
                      :description="t('settings.license.revokedDesc')" type="error" show-icon class="mb-3" />

                    <a-alert v-if="licenseStore.isExpired" :message="t('settings.license.expiredTitle')"
                      :description="t('settings.license.expiredDesc')" type="error" show-icon class="mb-3" />

                    <a-form layout="vertical" @submit.prevent="handleActivate">
                      <a-form-item :label="t('settings.license.activationCode')" required>
                        <a-input v-model:value="activationCode"
                          :placeholder="t('settings.license.activationPlaceholder')" size="large"
                          :disabled="licenseStore.isLoading" />
                      </a-form-item>

                      <a-form-item>
                        <a-button type="primary" html-type="submit" size="large" :loading="licenseStore.isLoading"
                          :disabled="!activationCode">
                          {{ t('settings.license.activateButton') }}
                        </a-button>
                      </a-form-item>

                      <a-alert v-if="activationError" :message="activationError" type="error" closable
                        @close="activationError = null" />
                    </a-form>
                  </a-card>
                </a-col>
              </a-row>

              <!-- Revalidate Button -->
              <a-row :gutter="16" class="mt-3" v-if="licenseStore.isActivated">
                <a-col :span="24">
                  <a-button @click="handleValidate" :loading="licenseStore.isLoading">
                    {{ t('settings.license.validateButton') }}
                  </a-button>
                </a-col>
              </a-row>

            </div>

            <!-- 5-About & Help -->
            <div v-show="activeSection === 'about'">
              <!-- 5-1 Software Version -->
              <a-card size="small" :title="t('settings.about.versionTitle')" class="settings-section">
                <a-descriptions :column="1" size="small">
                  <a-descriptions-item :label="t('settings.about.appVersion')">
                    {{ appVersion }}
                  </a-descriptions-item>
                  <a-descriptions-item :label="t('settings.about.build')">
                    {{ buildTime }}
                  </a-descriptions-item>
                </a-descriptions>
                <a-space>
                  <a-button type="primary" :loading="updateInfo.checking" @click="handleCheckUpdate">
                    {{ t('settings.update.checkUpdate') }}
                  </a-button>
                  <a-button
                    v-if="updateInfo.hasUpdate"
                    :loading="updateInfo.downloading"
                    :disabled="!updateInfo.latestId"
                    @click="handleDownloadUpdate"
                  >
                    {{ t('settings.update.downloadUpdate') }}
                  </a-button>
                  <a-button
                    v-if="updateInfo.downloadPath"
                    @click="handleInstallUpdate"
                  >
                    {{ t('settings.update.installUpdate') }}
                  </a-button>
                  <a-button
                    v-if="updateInfo.downloadPath"
                    @click="handleOpenDownloadFolder"
                  >
                    {{ t('settings.update.openDownloadFolder') }}
                  </a-button>
                </a-space>
              </a-card>

              <!-- 5-2 Software Update Log -->
              <a-card size="small" :title="t('settings.update.releaseNotes')" v-if="updateInfo.hasUpdate"
                class="settings-section mt-3">
                <div
                  v-if="updateInfo.releaseNotes"
                  v-html="updateInfo.releaseNotes"
                  style="max-height: 300px; overflow-y: auto;"
                ></div>
                <div v-else>{{ t('common.none') }}</div>
              </a-card>

              <!-- 5-3 Support Information -->
              <a-card size="small" :title="t('settings.about.companyName')" class="settings-section mt-3">
                <a-space direction="vertical">
                  <div>
                    <img src="/images/logo.jpg" alt="logo" style="height: 60px;" />
                  </div>
                  <div>
                    {{ t('settings.about.companyEmailLabel') }}
                    <a href="#" @click.prevent="openExternal(`mailto:${companyEmail}`)">{{ companyEmail }}</a>
                  </div>
                  <div>
                    {{ t('settings.about.companyPhoneLabel') }}
                    <a href="#" @click.prevent="openExternal(`tel:${companyPhone}`)">{{ companyPhone }}</a>
                  </div>
                  <div>
                    {{ t('settings.about.companyWebsiteLabel') }}
                    <a href="#" @click.prevent="openExternal(companyWebsite)">{{ companyWebsite }}</a>
                  </div>
                  <div>
                    {{ t('settings.about.companyAddressLabel') }}
                    <div>{{ t('settings.about.companyAddressLine1') }}</div>
                    <div>{{ t('settings.about.companyAddressLine2') }}</div>
                  </div>
                </a-space>
              </a-card>
            </div>
          </a-form>
        </a-card>
      </a-col>
    </a-row>
  </div>
</template>

<script setup>
import { computed, ref, onMounted } from 'vue'
import { message } from 'ant-design-vue'
import { useLicenseStore } from '../stores/license'
import { useI18n } from 'vue-i18n'

const licenseStore = useLicenseStore()
const { t, locale } = useI18n()

const activationCode = ref('')
const activationError = ref(null)

// 系统更新相关
const updateInfo = ref({
  checking: false,
  downloading: false,
  hasUpdate: false,
  latestId: null,
  latestVersion: '',
  currentVersion: import.meta.env.VITE_APP_VERSION || '1.0.1',
  releaseNotes: '',
  downloadPath: '',
  lastCheckTime: null,
  error: null
})

const settings = ref({
  download_directory: '',
  download_max_concurrent: 1,
  preview_refresh_rate: 0.5,
  status_refresh_rate: 3,
  request_timeout: 30000,
  enable_logging: true,
  camera_proxy_enabled: false,
  camera_proxy_url: '',
  admin_server_enabled: false,
  admin_server_url: '',
  language: 'en-US'
})

const isSaving = ref(false)
const activeSection = ref('general')
const sectionTitle = computed(() => {
  const titleMap = {
    general: t('settings.menu.general'),
    network: t('settings.menu.network'),
    license: t('settings.menu.license'),
    about: t('settings.menu.about')
  }
  return titleMap[activeSection.value] || t('settings.appSettingsTitle')
})
const appVersion = import.meta.env.VITE_APP_VERSION || 'Unknown'
const buildTime = import.meta.env.VITE_BUILD_TIME || 'Unknown'
const docUrl = 'https://micasense.github.io/rededge-api/'
const supportEmail = 'support@your-company.com'
const companyEmail = 'office@snzhny.com'
const companyPhone = '025-57250991'
const companyWebsite = 'http://www.snzhny.com/'

onMounted(async () => {
  await loadSettings()
  await licenseStore.loadLicenseInfo()
})

async function loadSettings() {
  try {
    const allSettings = await window.electronAPI.settings.getAll()
    const defaultLocale = locale.value || getSystemLanguage()
    const targetLanguage = allSettings.language || defaultLocale

    settings.value = {
      download_directory: allSettings.download_directory || '',
      download_max_concurrent: parseInt(allSettings.download_max_concurrent || '1', 10),
      preview_refresh_rate: parseFloat(allSettings.preview_refresh_rate || '0.5'),
      status_refresh_rate: parseInt(allSettings.status_refresh_rate || '3', 10),
      request_timeout: parseInt(allSettings.request_timeout || '30000', 10),
      enable_logging: allSettings.enable_logging === 'true',
      camera_proxy_enabled: allSettings.camera_proxy_enabled === 'true',
      camera_proxy_url: allSettings.camera_proxy_url || '',
      admin_server_enabled: allSettings.admin_server_enabled === 'true',
      admin_server_url: allSettings.admin_server_url || '',
      language: targetLanguage
    }
    if (targetLanguage !== locale.value) {
      locale.value = targetLanguage
    }
  } catch (error) {
    message.error(t('settings.messages.loadFailed', { error: error.message }))
  }
}

async function handleSave() {
  isSaving.value = true

  try {
    if (settings.value.camera_proxy_enabled && !isValidProxyUrl(settings.value.camera_proxy_url)) {
      message.error(t('settings.messages.saveFailed', { error: t('settings.network.proxyUrlInvalid') }))
      return
    }
    // Save each setting
    await window.electronAPI.settings.set('download_directory', settings.value.download_directory)
    await window.electronAPI.settings.set('download_max_concurrent', String(settings.value.download_max_concurrent))
    await window.electronAPI.settings.set('preview_refresh_rate', String(settings.value.preview_refresh_rate))
    await window.electronAPI.settings.set('status_refresh_rate', String(settings.value.status_refresh_rate))
    await window.electronAPI.settings.set('request_timeout', String(settings.value.request_timeout))
    await window.electronAPI.settings.set('enable_logging', String(settings.value.enable_logging))
    await window.electronAPI.settings.set('camera_proxy_enabled', String(settings.value.camera_proxy_enabled))
    await window.electronAPI.settings.set('camera_proxy_url', settings.value.camera_proxy_url)
    
    // Update Admin Server settings via specific IPC to ensure client re-initialization
    await window.electronAPI.admin.updateSettings({
      admin_server_enabled: String(settings.value.admin_server_enabled),
      admin_server_url: settings.value.admin_server_url
    })

    await window.electronAPI.settings.set('language', settings.value.language)
    if (settings.value.language !== locale.value) {
      locale.value = settings.value.language
    }

    message.success(t('settings.messages.saveSuccess'))
  } catch (error) {
    message.error(t('settings.messages.saveFailed', { error: error.message }))
  } finally {
    isSaving.value = false
  }
}

function isValidProxyUrl(value) {
  const trimmed = String(value || '').trim()
  if (!trimmed) return false
  try {
    const url = new URL(trimmed)
    return url.protocol === 'http:' || url.protocol === 'https:'
  } catch (error) {
    return false
  }
}

function getSystemLanguage() {
  return navigator.language?.toLowerCase().startsWith('zh') ? 'zh-CN' : 'en-US'
}

function openExternal(url) {
  const target = String(url || '')
  if (!target) return
  if (window.electronAPI?.app?.openExternal) {
    window.electronAPI.app.openExternal(target)
  } else {
    window.open(target, '_blank')
  }
}

function handleSectionChange({ key }) {
  activeSection.value = key
}

async function handleActivate() {
  if (!activationCode.value) {
    message.error(t('settings.messages.enterActivation'))
    return
  }

  activationError.value = null

  try {
    const result = await licenseStore.activate(activationCode.value)

    if (result.success || result.expiry_at) {
      message.success(t('settings.messages.activationSuccess'))
      activationCode.value = ''
    } else {
      activationError.value = t('settings.messages.activationFailed')
    }
  } catch (error) {
    activationError.value = error.message
    message.error(t('settings.messages.activationFailedDetail', { error: error.message }))
  }
}

async function handleValidate() {
  try {
    await licenseStore.validate()
    message.success(t('settings.messages.validateSuccess'))
  } catch (error) {
    message.error(t('settings.messages.validateFailed', { error: error.message }))
  }
}

function getStatusIcon() {
  if (licenseStore.isActivated) return 'success'
  if (licenseStore.isRevoked) return 'error'
  if (licenseStore.isExpired) return 'error'
  if (licenseStore.isTrial) return 'warning'
  return 'info'
}

function getStatusTitle() {
  if (licenseStore.isActivated) return t('settings.status.activated')
  if (licenseStore.isRevoked) return t('settings.status.revoked')
  if (licenseStore.isExpired) return t('settings.status.expired')
  if (licenseStore.isTrial) return t('settings.status.trial')
  return t('settings.status.unknown')
}

function getStatusDescription() {
  if (licenseStore.isActivated) {
    return t('settings.statusDesc.activated')
  }
  if (licenseStore.isRevoked) {
    return t('settings.statusDesc.revoked')
  }
  if (licenseStore.isExpired) {
    return t('settings.statusDesc.expired')
  }
  if (licenseStore.isTrial) {
    return t('settings.statusDesc.trial', { days: licenseStore.trialDaysRemaining })
  }
  return ''
}

function getStatusColor() {
  if (licenseStore.isActivated) return 'green'
  if (licenseStore.isRevoked) return 'red'
  if (licenseStore.isExpired) return 'red'
  if (licenseStore.isTrial) return 'orange'
  return 'default'
}

function getTrialStyle() {
  const days = licenseStore.trialDaysRemaining
  if (days <= 1) return { color: '#a44a3f' }
  if (days <= 3) return { color: '#c88719' }
  return { color: '#6b9080' }
}

function formatDate(dateStr) {
  if (!dateStr) return t('common.none')
  const date = new Date(dateStr)
  return date.toLocaleString(locale.value)
}

function formatLicenseStatus(status) {
  const normalized = String(status || '').toLowerCase()
  if (normalized === 'activated') return t('settings.status.activated')
  if (normalized === 'expired') return t('settings.status.expired')
  if (normalized === 'revoked' || normalized === 'invalid') return t('settings.status.revoked')
  if (normalized === 'trial') return t('settings.status.trial')
  if (!normalized) return t('settings.status.unknown')
  return status
}

// 检查更新
async function handleCheckUpdate() {
  updateInfo.value.checking = true
  updateInfo.value.error = null
  updateInfo.value.downloading = false

  try {
    if (!window.electronAPI?.admin?.checkUpdates) {
      throw new Error('Update API not available')
    }

    const result = await window.electronAPI.admin.checkUpdates()
    if (!result || result.success === false) {
      throw new Error(result?.error || 'Update check failed')
    }

    const latest = result.latest_version || null
    const hasUpdate = Boolean(result.has_update ?? result.hasUpdate)
    const latestVersion = latest?.version || updateInfo.value.currentVersion

    updateInfo.value.hasUpdate = hasUpdate
    updateInfo.value.latestId = latest?.id || null
    updateInfo.value.latestVersion = latestVersion
    updateInfo.value.releaseNotes = latest?.release_notes || result.release_notes || ''
    updateInfo.value.downloadPath = ''
    updateInfo.value.lastCheckTime = new Date().toISOString()

    if (hasUpdate) {
      message.warning(t('settings.update.messages.newVersionAvailable', {
        version: latestVersion
      }))
    } else {
      message.success(t('settings.update.messages.upToDate', {
        version: updateInfo.value.currentVersion
      }))
    }
  } catch (error) {
    updateInfo.value.error = error.message || 'Unknown error'
    message.error(t('settings.update.messages.checkFailed', { error: error.message }))
  } finally {
    updateInfo.value.checking = false
  }
}

async function handleDownloadUpdate() {
  if (!updateInfo.value.latestId) {
    message.error(t('settings.update.messages.downloadFailed', { error: 'Missing version id' }))
    return
  }

  updateInfo.value.downloading = true
  updateInfo.value.error = null

  try {
    const result = await window.electronAPI?.admin?.downloadUpdate(updateInfo.value.latestId)
    if (!result || result.success === false) {
      throw new Error(result?.error || 'Download failed')
    }

    updateInfo.value.downloadPath = result.path || ''
    message.success(t('settings.update.messages.downloadSuccess'))
  } catch (error) {
    updateInfo.value.error = error.message || 'Unknown error'
    message.error(t('settings.update.messages.downloadFailed', { error: error.message }))
  } finally {
    updateInfo.value.downloading = false
  }
}

async function handleInstallUpdate() {
  const downloadPath = updateInfo.value.downloadPath
  if (!downloadPath) {
    message.error(t('settings.update.messages.downloadFailed', { error: 'Missing download path' }))
    return
  }

  try {
    const result = await window.electronAPI?.app?.openPath(downloadPath)
    if (result && result.success === false) {
      throw new Error(result.error || 'Open installer failed')
    }
  } catch (error) {
    message.error(t('settings.update.messages.downloadFailed', { error: error.message }))
  }
}

async function handleOpenDownloadFolder() {
  const downloadPath = updateInfo.value.downloadPath
  if (!downloadPath) {
    message.error(t('settings.update.messages.downloadFailed', { error: 'Missing download path' }))
    return
  }

  try {
    const result = await window.electronAPI?.app?.showItemInFolder(downloadPath)
    if (result && result.success === false) {
      throw new Error(result.error || 'Open download folder failed')
    }
  } catch (error) {
    message.error(t('settings.update.messages.downloadFailed', { error: error.message }))
  }
}
</script>

<style scoped>
.settings-view {
  max-width: 1200px;
  margin: 0 auto;
}

.sidebar-card {
  height: calc(100vh - 160px);
  position: sticky;
  top: 88px;
}

.main-card {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.settings-section {
  border: 1px solid #f0f0f0;
}

.mt-3 {
  margin-top: 16px;
}

.license-view {
  max-width: 1200px;
  margin: 0 auto;
}

.mb-3 {
  margin-bottom: 16px;
}
</style>
