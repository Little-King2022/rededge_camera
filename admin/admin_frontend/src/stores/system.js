/**
 * 系统设置状态管理
 */
import { defineStore } from 'pinia'
import { getSystemSettings, updateSystemSettings } from '@/api/system'

export const useSystemStore = defineStore('system', {
  state: () => ({
    settings: {
      site_name: 'RedEdge 后台管理系统'
    },
    loaded: false
  }),

  getters: {
    siteName: (state) => state.settings?.site_name || 'RedEdge 后台管理系统'
  },

  actions: {
    /**
     * 获取系统设置
     */
    async fetchSettings() {
      try {
        const res = await getSystemSettings()
        if (res.success && res.data) {
          this.settings = { ...this.settings, ...res.data }
          this.loaded = true
        }
      } catch (error) {
        console.error('获取系统设置失败:', error)
      }
    },

    /**
     * 更新系统设置
     */
    async updateSettings(data) {
      try {
        const res = await updateSystemSettings(data)
        if (res.success) {
          this.settings = { ...this.settings, ...data }
          return { success: true }
        }
        return { success: false, error: res.error }
      } catch (error) {
        console.error('更新系统设置失败:', error)
        return { success: false, error: error.message }
      }
    }
  }
})
