/**
 * 系统统计状态管理
 */
import { defineStore } from 'pinia'
import { getSystemStats, getUsageStats, getDashboardData } from '@/api/system'

export const useStatsStore = defineStore('stats', {
  state: () => ({
    systemStats: null,
    usageStats: null,
    dashboardData: null,
    loading: false
  }),

  getters: {
    /**
     * 客户端总数
     */
    totalClients: (state) => state.systemStats?.total_clients || 0,

    /**
     * 在线客户端数
     */
    onlineClients: (state) => state.systemStats?.online_clients || 0,

    /**
     * 离线客户端数
     */
    offlineClients: (state) => state.systemStats?.offline_clients || 0,

    /**
     * 今日新增客户端
     */
    todayNewClients: (state) => state.systemStats?.today_new_clients || 0,

    /**
     * 授权状态分布
     */
    licenseDistribution: (state) => state.systemStats?.license_distribution || {},

    /**
     * 版本分布
     */
    versionDistribution: (state) => state.systemStats?.version_distribution || {},

    /**
     * 平台分布
     */
    platformDistribution: (state) => state.systemStats?.platform_distribution || {},

    /**
     * 今日心跳成功率
     */
    todayHeartbeatRate: (state) => {
      if (!state.systemStats) return 0
      const { today_heartbeats, today_heartbeat_failures } = state.systemStats
      const total = today_heartbeats + today_heartbeat_failures
      if (total === 0) return 0
      return ((today_heartbeats / total) * 100).toFixed(2)
    }
  },

  actions: {
    /**
     * 获取系统统计数据
     */
    async fetchSystemStats() {
      this.loading = true
      try {
        const res = await getSystemStats()

        if (res.success) {
          this.systemStats = res.data
        }

        return res
      } catch (error) {
        console.error('获取系统统计失败:', error)
        return { success: false, error: error.message }
      } finally {
        this.loading = false
      }
    },

    /**
     * 获取使用统计
     */
    async fetchUsageStats(params = {}) {
      try {
        const res = await getUsageStats(params)

        if (res.success) {
          this.usageStats = res.data
        }

        return res
      } catch (error) {
        console.error('获取使用统计失败:', error)
        return { success: false, error: error.message }
      }
    },

    /**
     * 获取仪表盘数据
     */
    async fetchDashboardData() {
      this.loading = true
      try {
        const res = await getDashboardData()

        if (res.success) {
          this.dashboardData = res.data
        }

        return res
      } catch (error) {
        console.error('获取仪表盘数据失败:', error)
        return { success: false, error: error.message }
      } finally {
        this.loading = false
      }
    },

    /**
     * 刷新所有统计数据
     */
    async refreshAll() {
      await Promise.all([
        this.fetchSystemStats(),
        this.fetchDashboardData()
      ])
    }
  }
})
