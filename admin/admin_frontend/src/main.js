/**
 * 主入口文件
 */
import { createApp } from 'vue'
import { createPinia } from 'pinia'
import Antd from 'ant-design-vue'
import router from './router'
import { useSystemStore } from './stores/system'
import { useAuthStore } from './stores/auth'
import App from './App.vue'

import 'ant-design-vue/dist/reset.css'
import './style.css'

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)
app.use(router)
app.use(Antd)

// 仅在已登录时初始化系统设置（避免未登录时触发 401 导致重定向循环）
const authStore = useAuthStore()
if (authStore.isLoggedIn) {
  const systemStore = useSystemStore()
  systemStore.fetchSettings()
}

app.mount('#app')
