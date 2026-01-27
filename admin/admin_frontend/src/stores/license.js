/**
 * 授权管理状态
 */
import { defineStore } from 'pinia'
import {
  getLicenseList,
  generateLicenses,
  getLicenseDetail,
  updateLicense,
  deleteLicense,
  revokeLicense,
  exportLicenses
} from '@/api/license'

export const useLicenseStore = defineStore('license', {
  state: () => ({
    licenses: [],
    currentLicense: null,
    total: 0,
    loading: false
  }),

  getters: {
    /**
     * 按授权类型分组
     */
    licensesByType: (state) => {
      const groups = {
        trial: [],
        standard: [],
        professional: [],
        enterprise: []
      }

      state.licenses.forEach(license => {
        const type = license.license_type || 'standard'
        if (groups[type]) {
          groups[type].push(license)
        }
      })

      return groups
    },

    /**
     * 可用授权码数量
     */
    availableCount: (state) => {
      return state.licenses.filter(l =>
        l.is_active && l.current_activations < l.max_activations
      ).length
    },

    /**
     * 已激活授权码数量
     */
    activatedCount: (state) => {
      return state.licenses.filter(l => l.current_activations > 0).length
    },

    /**
     * 离线模式授权码数量
     */
    offlineModeCount: (state) => {
      return state.licenses.filter(l => l.offline_mode).length
    }
  },

  actions: {
    /**
     * 获取授权码列表
     */
    async fetchLicenses(params = {}) {
      this.loading = true
      try {
        const res = await getLicenseList(params)

        if (res.success) {
          this.licenses = res.data
          this.total = res.total
        }

        return res
      } catch (error) {
        console.error('获取授权码列表失败:', error)
        return { success: false, error: error.message }
      } finally {
        this.loading = false
      }
    },

    /**
     * 生成授权码
     */
    async generateLicenses(data) {
      try {
        const res = await generateLicenses(data)

        if (res.success) {
          await this.fetchLicenses()
        }

        return res
      } catch (error) {
        console.error('生成授权码失败:', error)
        return { success: false, error: error.message }
      }
    },

    /**
     * 获取授权码详情
     */
    async fetchLicenseDetail(code) {
      try {
        const res = await getLicenseDetail(code)

        if (res.success) {
          this.currentLicense = res.data
        }

        return res
      } catch (error) {
        console.error('获取授权码详情失败:', error)
        return { success: false, error: error.message }
      }
    },

    /**
     * 更新授权码
     */
    async updateLicense(id, data) {
      try {
        const res = await updateLicense(id, data)

        if (res.success) {
          await this.fetchLicenses()
        }

        return res
      } catch (error) {
        console.error('更新授权码失败:', error)
        return { success: false, error: error.message }
      }
    },

    /**
     * 删除授权码
     */
    async deleteLicense(id) {
      try {
        const res = await deleteLicense(id)

        if (res.success) {
          this.licenses = this.licenses.filter(l => l.id !== id)
        }

        return res
      } catch (error) {
        console.error('删除授权码失败:', error)
        return { success: false, error: error.message }
      }
    },

    /**
     * 吊销授权码
     */
    async revokeLicense(id) {
      try {
        const res = await revokeLicense(id)

        if (res.success) {
          await this.fetchLicenses()
        }

        return res
      } catch (error) {
        console.error('吊销授权码失败', error)
        return { success: false, error: error.message }
      }
    },

    /**
     * 导出授权码
     */
    async exportLicenses(params = {}) {
      try {
        const res = await exportLicenses(params)

        // 创建下载链接
        const url = window.URL.createObjectURL(new Blob([res]))
        const link = document.createElement('a')
        link.href = url
        link.setAttribute('download', `licenses_${Date.now()}.csv`)
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        window.URL.revokeObjectURL(url)

        return { success: true }
      } catch (error) {
        console.error('导出授权码失败:', error)
        return { success: false, error: error.message }
      }
    }
  }
})
