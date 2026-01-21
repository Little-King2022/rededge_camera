<template>
  <a-config-provider :theme="themeConfig" :locale="antdLocale">
    <div id="app" class="app-container">
      <a-layout style="min-height: 100vh">
        <!-- Header -->
        <a-layout-header class="app-header">
          <div class="logo">
            <span class="logo-text">{{ t('app.title') }}</span>
          </div>
          <a-menu
            v-model:selectedKeys="selectedKeys"
            mode="horizontal"
            class="header-menu"
            @select="handleMenuSelect"
          >
            <a-menu-item key="/connect">{{ t('nav.connection') }}</a-menu-item>
            <a-menu-item key="/preview">{{ t('nav.preview') }}</a-menu-item>
            <a-menu-item key="/capture">{{ t('nav.capture') }}</a-menu-item>
            <a-menu-item key="/files">{{ t('nav.files') }}</a-menu-item>
            <a-menu-item key="/status">{{ t('nav.status') }}</a-menu-item>
            <a-menu-item key="/calibration">{{ t('nav.calibration') }}</a-menu-item>
            <a-menu-item key="/alignment">{{ t('nav.alignment') }}</a-menu-item>
            <a-menu-item key="/analysis">{{ t('nav.analysis') }}</a-menu-item>
            <a-menu-item key="/settings">{{ t('nav.settings') }}</a-menu-item>
          </a-menu>
          <div class="window-controls">
            <a-button
              type="text"
              class="window-control-btn"
              @click="handleMinimize"
            >
              <MinusOutlined />
            </a-button>
            <a-button
              type="text"
              class="window-control-btn"
              @click="handleToggleMaximize"
            >
              <BorderOutlined />
            </a-button>
            <a-button
              type="text"
              class="window-control-btn close"
              @click="handleClose"
            >
              <CloseOutlined />
            </a-button>
          </div>
        </a-layout-header>

        <!-- Content -->
        <a-layout-content class="app-content">
          <router-view v-slot="{ Component }">
            <transition name="fade" mode="out-in">
              <component :is="Component" />
            </transition>
          </router-view>
        </a-layout-content>
      </a-layout>
    </div>
  </a-config-provider>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { Modal } from 'ant-design-vue'
import { BorderOutlined, CloseOutlined, MinusOutlined } from '@ant-design/icons-vue'
import enUS from 'ant-design-vue/es/locale/en_US'
import zhCN from 'ant-design-vue/es/locale/zh_CN'

const router = useRouter()
const route = useRoute()
const { t, locale } = useI18n()

const selectedKeys = ref([route.path])

const antdLocale = computed(() => (locale.value === 'zh-CN' ? zhCN : enUS))

// Theme configuration - 低饱和、农业/科研场景
const themeConfig = {
  token: {
    colorPrimary: '#52796f',
    colorSuccess: '#6b9080',
    colorWarning: '#c88719',
    colorError: '#a44a3f',
    colorInfo: '#5b7c99',
    borderRadius: 4,
    fontSize: 16
  }
}

// Watch route changes
watch(() => route.path, (newPath) => {
  selectedKeys.value = [newPath]
})

const handleMenuSelect = ({ key }) => {
  router.push(key)
}

const handleMinimize = () => {
  window.electronAPI?.window?.minimize?.()
}

const handleToggleMaximize = () => {
  window.electronAPI?.window?.toggleMaximize?.()
}

const handleClose = () => {
  Modal.confirm({
    title: t('app.windowControls.exitConfirmTitle'),
    content: t('app.windowControls.exitConfirmContent'),
    okText: t('app.windowControls.exitConfirmOk'),
    cancelText: t('app.windowControls.exitConfirmCancel'),
    onOk: () => window.electronAPI?.window?.close?.()
  })
}
</script>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  -ms-overflow-style: none;
  scrollbar-width: none;
}

body::-webkit-scrollbar {
  width: 0;
  height: 0;
}

.app-container {
  min-height: 100vh;
  background: #f5f5f5;
}

.app-header {
  display: flex;
  align-items: center;
  background: #194d0c !important;
  padding: 0 24px;
  box-shadow: 0 2px 8px rgba(10, 48, 7, 0.948);
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 1000;
  height: 72px !important;
  -webkit-app-region: drag;
}

.logo {
  display: flex;
  align-items: center;
  margin-right: 50px;
}

.logo-text {
  font-size: 24px;
  font-weight: 600;
  color: #fff;
  letter-spacing: 0.5px;
}

.header-menu {
  flex: 1;
  background: transparent;
  border: none;
  line-height: 96px;
  font-weight: bold;
  font-size: 18px;
}

.header-menu .ant-menu-item {
  color: rgba(255, 255, 255, 0.76);
  font-weight: normal;
  -webkit-app-region: no-drag;
}

.header-menu .ant-menu-item * {
  -webkit-app-region: no-drag;
}

.header-menu .ant-menu-item:hover {
  color: #fff !important;
}

.header-menu .ant-menu-item-selected {
  color: #fff !important;
  font-weight: bold;
  background: rgba(255, 255, 255, 0.137) !important;
  border-radius: 5px !important;

}

.window-controls {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-left: auto;
  -webkit-app-region: no-drag;
}

.window-control-btn {
  width: 36px;
  height: 28px;
  color: #fff;
  padding: 0 !important;
}

.window-control-btn:hover {
  background: rgba(255, 255, 255, 0.15) !important;
}

.window-control-btn.close:hover {
  background: #e81123 !important;
  color: #fff !important;
}

.app-content {
  padding: 24px;
  background: #f5f5f5;
  padding-top: 88px;
}

/* Fade transition */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
