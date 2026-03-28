<template>
  <a-layout class="main-layout">
    <a-layout-sider
      v-model:collapsed="collapsed"
      :trigger="null"
      collapsible
      theme="dark"
      width="240"
    >
      <div class="logo">
        <span v-if="!collapsed">
          <div style="font-size: 15px; letter-spacing: 3px; font-weight: normal; color: gainsboro; text-align: center;">
            农作物低空监测平台
          </div>
          <div style="font-size: 22px; letter-spacing: 5px; font-weight: normal; margin-top: 4px; font-weight: bold; text-align: center;">
            后台管理系统
          </div>
        </span>
        <span v-else class="logo-mini">RE</span>
      </div>

      <a-menu
        v-model:selectedKeys="selectedKeys"
        theme="dark"
        mode="inline"
        @click="handleMenuClick"
      >
        <a-menu-item key="/dashboard">
          <dashboard-outlined />
          <span>仪表盘</span>
        </a-menu-item>

        <a-menu-item key="/cameras">
          <camera-outlined />
          <span>相机管理</span>
        </a-menu-item>

        <a-menu-item key="/clients">
          <desktop-outlined />
          <span>客户端管理</span>
        </a-menu-item>

        <a-menu-item key="/licenses">
          <key-outlined />
          <span>授权管理</span>
        </a-menu-item>

        <a-menu-item key="/versions">
          <cloud-upload-outlined />
          <span>版本管理</span>
        </a-menu-item>

        <a-menu-item v-if="authStore.isAdmin" key="/users">
          <user-outlined />
          <span>用户管理</span>
        </a-menu-item>

        <a-menu-item v-if="authStore.isAdmin" key="/settings">
          <setting-outlined />
          <span>系统设置</span>
        </a-menu-item>
      </a-menu>
    </a-layout-sider>

    <a-layout>
      <a-layout-header class="header">
        <div class="header-left">
          <menu-unfold-outlined
            v-if="collapsed"
            class="trigger"
            @click="collapsed = !collapsed"
          />
          <menu-fold-outlined
            v-else
            class="trigger"
            @click="collapsed = !collapsed"
          />
        </div>

        <div class="header-right">
          <a-dropdown>
            <div class="user-info">
              <user-outlined />
              <span>{{ authStore.username }}</span>
            </div>
            <template #overlay>
              <a-menu>
                <a-menu-item @click="handleProfile">
                  <user-outlined />
                  个人信息
                </a-menu-item>
                <a-menu-divider />
                <a-menu-item @click="handleLogout">
                  <logout-outlined />
                  退出登录
                </a-menu-item>
              </a-menu>
            </template>
          </a-dropdown>
        </div>
      </a-layout-header>

      <a-layout-content class="content">
        <router-view />
      </a-layout-content>
    </a-layout>

    <!-- 用户信息弹窗 -->
    <a-modal
      v-model:open="profileModalVisible"
      title="个人信息"
      :footer="null"
      :width="400"
    >
      <a-descriptions :column="1" bordered size="small">
        <a-descriptions-item label="用户名">
          {{ authStore.userInfo?.username }}
        </a-descriptions-item>
        <a-descriptions-item label="角色">
          <a-tag :color="getRoleColor(authStore.userInfo?.role)">
            {{ getRoleName(authStore.userInfo?.role) }}
          </a-tag>
        </a-descriptions-item>
        <a-descriptions-item label="邮箱">
          {{ authStore.userInfo?.email || '-' }}
        </a-descriptions-item>
        <a-descriptions-item label="创建时间">
          {{ formatDateTime(authStore.userInfo?.created_at) }}
        </a-descriptions-item>
        <a-descriptions-item label="最后登录">
          {{ formatDateTime(authStore.userInfo?.last_login_at) }}
        </a-descriptions-item>
      </a-descriptions>
    </a-modal>
  </a-layout>
</template>

<script setup>
import { ref, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import dayjs from 'dayjs'
import 'dayjs/locale/zh-cn'
import {
  MenuUnfoldOutlined,
  MenuFoldOutlined,
  DashboardOutlined,
  CameraOutlined,
  DesktopOutlined,
  KeyOutlined,
  CloudUploadOutlined,
  UserOutlined,
  SettingOutlined,
  LogoutOutlined
} from '@ant-design/icons-vue'

dayjs.locale('zh-cn')

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()

const collapsed = ref(false)
const selectedKeys = ref([route.path])
const profileModalVisible = ref(false)

watch(
  () => route.path,
  (newPath) => {
    selectedKeys.value = [newPath]
  }
)

const handleMenuClick = ({ key }) => {
  router.push(key)
}

const handleProfile = () => {
  profileModalVisible.value = true
}

const handleLogout = () => {
  authStore.logout()
}

const roleNames = {
  super_admin: '超级管理员',
  admin: '管理员',
  operator: '操作员'
}

const roleColors = {
  super_admin: 'red',
  admin: 'blue',
  operator: 'green'
}

const getRoleName = (role) => {
  return roleNames[role] || role || '-'
}

const getRoleColor = (role) => {
  return roleColors[role] || 'default'
}

const formatDateTime = (datetime) => {
  if (!datetime) return '-'
  return dayjs(datetime).format('YYYY年M月D日 HH:mm:ss')
}
</script>

<style scoped>
.main-layout {
  height: 100vh;
}

.logo {
  height: 64px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 16px;
  color: #fff;
  font-size: 18px;
  font-weight: bold;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.logo-mini {
  font-size: 24px;
  font-weight: bold;
  color: #1890ff;
}

.header {
  background: #fff;
  padding: 0 24px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  box-shadow: 0 1px 4px rgba(0, 21, 41, 0.08);
}

.header-left {
  display: flex;
  align-items: center;
}

.trigger {
  font-size: 18px;
  cursor: pointer;
  transition: color 0.3s;
}

.trigger:hover {
  color: #1890ff;
}

.header-right {
  display: flex;
  align-items: center;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  padding: 8px 12px;
  border-radius: 4px;
  transition: background-color 0.3s;
}

.user-info:hover {
  background-color: #f0f0f0;
}

.content {
  margin: 24px;
  padding: 24px;
  background: #fff;
  overflow-y: auto;
  border-radius: 4px;
}
</style>
