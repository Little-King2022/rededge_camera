/**
 * 客户端状态管理
 */
import { defineStore } from 'pinia'
import {
  getClientList,
  getClientDetail,
  getClientStats,
  updateClient,
  assignCamera,
  assignLicense,
  revokeLicense
} from '@/api/client'

export const useClientStore = defineStore('client', {
  state: () => ({
    clients: [],
    currentClient: null,
    currentStats: null,
    total: 0,
    loading: false
  }),

  getters: {
    /**
     * 在线客户端数量
     */
    onlineCount: (state) => {
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000)
      return state.clients.filter(c =>
        c.last_heartbeat_at && new Date(c.last_heartbeat_at) > fiveMinutesAgo
      ).length
    },

    /**
     * 离线客户端数量
     */
    offlineCount: (state) => {
      return state.clients.length - state.onlineCount
    },

    /**
     * 按授权状态分组
     */
    clientsByLicenseStatus: (state) => {
      const groups = {
        trial: [],
        activated: [],
        expired: [],
        revoked: []
      }

      state.clients.forEach(client => {
        const status = client.license_status || 'trial'
        if (groups[status]) {
          groups[status].push(client)
        }
      })

      return groups
    },

    /**
     * 按平台分组
     */
    clientsByPlatform: (state) => {
      const groups = {}

      state.clients.forEach(client => {
        const platform = client.platform || 'unknown'
        if (!groups[platform]) {
          groups[platform] = []
        }
        groups[platform].push(client)
      })

      return groups
    }
  },

  actions: {
    /**
     * 获取客户端列表
     */
    async fetchClients(params = {}) {
      this.loading = true
      try {
        const res = await getClientList(params)

        if (res.success) {
          this.clients = res.data
          this.total = res.total
        }

        return res
      } catch (error) {
        console.error('获取客户端列表失败:', error)
        return { success: false, error: error.message }
      } finally {
        this.loading = false
      }
    },

    /**
     * 获取客户端详情
     */
    async fetchClientDetail(id) {
      try {
        const res = await getClientDetail(id)

        if (res.success) {
          this.currentClient = res.data
        }

        return res
      } catch (error) {
        console.error('获取客户端详情失败:', error)
        return { success: false, error: error.message }
      }
    },

    /**
     * 获取客户端使用统计
     */
    async fetchClientStats(id, params = {}) {
      try {
        const res = await getClientStats(id, params)

        if (res.success) {
          this.currentStats = res.data
        }

        return res
      } catch (error) {
        console.error('获取客户端统计失败:', error)
        return { success: false, error: error.message }
      }
    },

    /**
     * 更新客户端信息
     */
    async updateClient(id, data) {
      try {
        const res = await updateClient(id, data)

        if (res.success) {
          await this.fetchClients()
        }

        return res
      } catch (error) {
        console.error('更新客户端失败:', error)
        return { success: false, error: error.message }
      }
    },

    /**
     * 分配相机配置
     */
    async assignCamera(id, cameraId) {
      try {
        const res = await assignCamera(id, { camera_config_id: cameraId })

        if (res.success) {
          await this.fetchClientDetail(id)
        }

        return res
      } catch (error) {
        console.error('分配相机配置失败:', error)
        return { success: false, error: error.message }
      }
    },

    /**
     * 分配授权码
     */
    async assignLicense(id, licenseCode) {
      try {
        const res = await assignLicense(id, { license_code: licenseCode })

        if (res.success) {
          await this.fetchClientDetail(id)
        }

        return res
      } catch (error) {
        console.error('分配授权码失败:', error)
        return { success: false, error: error.message }
      }
    },

    /**
     * 吊销授权
     */
    async revokeLicense(id) {
      try {
        const res = await revokeLicense(id)

        if (res.success) {
          await this.fetchClientDetail(id)
        }

        return res
      } catch (error) {
        console.error('吊销授权失败:', error)
        return { success: false, error: error.message }
      }
    }
  }
})
