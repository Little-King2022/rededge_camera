/**
 * 相机配置状态管理
 */
import { defineStore } from 'pinia'
import { getCameraList, getCameraDetail, createCamera, updateCamera, deleteCamera, activateCamera } from '@/api/camera'

export const useCameraStore = defineStore('camera', {
  state: () => ({
    cameras: [],
    currentCamera: null,
    total: 0,
    loading: false
  }),

  getters: {
    /**
     * 获取激活的相机配置
     */
    activeCamera: (state) => state.cameras.find(c => c.is_active) || null,

    /**
     * 获取相机列表（按名称排序）
     */
    sortedCameras: (state) => {
      return [...state.cameras].sort((a, b) => a.name.localeCompare(b.name))
    }
  },

  actions: {
    /**
     * 获取相机列表
     */
    async fetchCameras(params = {}) {
      this.loading = true
      try {
        const res = await getCameraList(params)

        if (res.success) {
          this.cameras = res.data
          this.total = res.total
        }

        return res
      } catch (error) {
        console.error('获取相机列表失败:', error)
        return { success: false, error: error.message }
      } finally {
        this.loading = false
      }
    },

    /**
     * 获取相机详情
     */
    async fetchCameraDetail(id) {
      try {
        const res = await getCameraDetail(id)

        if (res.success) {
          this.currentCamera = res.data
        }

        return res
      } catch (error) {
        console.error('获取相机详情失败:', error)
        return { success: false, error: error.message }
      }
    },

    /**
     * 创建相机配置
     */
    async createCamera(data) {
      try {
        const res = await createCamera(data)

        if (res.success) {
          await this.fetchCameras()
        }

        return res
      } catch (error) {
        console.error('创建相机配置失败:', error)
        return { success: false, error: error.message }
      }
    },

    /**
     * 更新相机配置
     */
    async updateCamera(id, data) {
      try {
        const res = await updateCamera(id, data)

        if (res.success) {
          await this.fetchCameras()
        }

        return res
      } catch (error) {
        console.error('更新相机配置失败:', error)
        return { success: false, error: error.message }
      }
    },

    /**
     * 删除相机配置
     */
    async deleteCamera(id) {
      try {
        const res = await deleteCamera(id)

        if (res.success) {
          this.cameras = this.cameras.filter(c => c.id !== id)
        }

        return res
      } catch (error) {
        console.error('删除相机配置失败:', error)
        return { success: false, error: error.message }
      }
    },

    /**
     * 激活相机配置
     */
    async activateCamera(id) {
      try {
        const res = await activateCamera(id)

        if (res.success) {
          await this.fetchCameras()
        }

        return res
      } catch (error) {
        console.error('激活相机配置失败:', error)
        return { success: false, error: error.message }
      }
    }
  }
})
