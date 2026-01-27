/**
 * Axios 请求封装
 */
import axios from 'axios'
import { message } from 'ant-design-vue'
import router from '@/router'

// 创建 axios 实例
const request = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  timeout: 30000
})

// 请求拦截器
request.interceptors.request.use(
  config => {
    // 添加 JWT Token
    const token = localStorage.getItem('access_token')
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`
    }
    return config
  },
  error => {
    console.error('请求错误:', error)
    return Promise.reject(error)
  }
)

// 响应拦截器
request.interceptors.response.use(
  response => {
    const res = response.data

    // 如果是文件下载，直接返回
    if (response.config.responseType === 'blob') {
      return response
    }

    // 统一错误处理
    if (res.success === false) {
      message.error(res.error || res.message || '请求失败')
      return Promise.reject(new Error(res.error || '请求失败'))
    }

    return res
  },
  error => {
    console.error('响应错误:', error)

    // 处理 HTTP 错误
    if (error.response) {
      const { status, data } = error.response

      switch (status) {
        case 401:
          message.error('未授权，请重新登录')
          // 清除 Token
          localStorage.removeItem('access_token')
          localStorage.removeItem('user_info')
          // 跳转到登录页
          router.push('/login')
          break
        case 403:
          message.error('没有权限访问')
          break
        case 404:
          message.error('请求的资源不存在')
          break
        case 422:
          // JWT验证失败或请求参数错误
          const errorMsg = data?.msg || data?.error || data?.message || 'Token验证失败'
          message.error(errorMsg)
          if (errorMsg.includes('token') || errorMsg.includes('Token') || errorMsg.includes('expired')) {
            // Token 相关错误，跳转登录页
            localStorage.removeItem('access_token')
            localStorage.removeItem('user_info')
            router.push('/login')
          }
          break
        case 429:
          message.error('请求过于频繁，请稍后再试')
          break
        case 500:
          message.error(data?.error || '服务器内部错误')
          break
        default:
          message.error(data?.error || data?.message || '请求失败')
      }
    } else if (error.request) {
      message.error('网络错误，请检查网络连接')
    } else {
      message.error(error.message || '请求失败')
    }

    return Promise.reject(error)
  }
)

export default request
