/**
 * 认证状态管理
 */
import { defineStore } from 'pinia'
import { login as loginApi, logout as logoutApi, getProfile, refreshToken as refreshTokenApi } from '@/api/auth'
import { setToken, getToken, removeToken, setUserInfo, getUserInfo, removeUserInfo, clearAuth } from '@/utils/auth'
import router from '@/router'

export const useAuthStore = defineStore('auth', {
  state: () => ({
    token: getToken(),
    userInfo: getUserInfo(),
    isLoggedIn: !!getToken()
  }),

  getters: {
    /**
     * 获取当前用户角色
     */
    currentRole: (state) => state.userInfo?.role || null,

    /**
     * 是否为超级管理员
     */
    isSuperAdmin: (state) => state.userInfo?.role === 'super_admin',

    /**
     * 是否为管理员（包含超级管理员）
     */
    isAdmin: (state) => ['super_admin', 'admin'].includes(state.userInfo?.role),

    /**
     * 获取用户名
     */
    username: (state) => state.userInfo?.username || ''
  },

  actions: {
    /**
     * 登录
     */
    async login(credentials) {
      try {
        const res = await loginApi(credentials)

        if (res.success) {
          this.token = res.data.access_token
          this.userInfo = res.data.user
          this.isLoggedIn = true

          setToken(res.data.access_token)
          setUserInfo(res.data.user)

          return { success: true }
        }

        return { success: false, error: res.error || '登录失败' }
      } catch (error) {
        console.error('[Auth Store] Login error:', error)
        return { success: false, error: error.message || '登录失败' }
      }
    },

    /**
     * 登出
     */
    async logout() {
      try {
        await logoutApi()
      } catch (error) {
        console.error('登出请求失败:', error)
      } finally {
        this.token = null
        this.userInfo = null
        this.isLoggedIn = false

        clearAuth()
        router.push('/login')
      }
    },

    /**
     * 获取用户信息
     */
    async fetchUserInfo() {
      try {
        const res = await getProfile()

        if (res.success) {
          this.userInfo = res.data
          setUserInfo(res.data)
          return { success: true }
        }

        return { success: false }
      } catch (error) {
        console.error('获取用户信息失败:', error)
        return { success: false }
      }
    },

    /**
     * 刷新 Token
     */
    async refreshToken() {
      try {
        const res = await refreshTokenApi()

        if (res.success) {
          this.token = res.data.access_token
          setToken(res.data.access_token)
          return { success: true }
        }

        return { success: false }
      } catch (error) {
        console.error('刷新 Token 失败:', error)
        this.logout()
        return { success: false }
      }
    },

    /**
     * 检查权限
     */
    hasPermission(requiredRole) {
      const roleHierarchy = {
        super_admin: 3,
        admin: 2,
        operator: 1
      }

      const currentLevel = roleHierarchy[this.currentRole] || 0
      const requiredLevel = roleHierarchy[requiredRole] || 0

      return currentLevel >= requiredLevel
    }
  }
})
