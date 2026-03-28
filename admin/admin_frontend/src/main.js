/**
 * 主入口文件
 */
import { createApp } from 'vue'
import { createPinia } from 'pinia'
import Antd from 'ant-design-vue'
import router from './router'
import { useSystemStore } from './stores/system'
import App from './App.vue'

import 'ant-design-vue/dist/reset.css'
import './style.css'

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)
app.use(router)
app.use(Antd)

// 初始化系统设置（用于页面标题）
const systemStore = useSystemStore()
systemStore.fetchSettings()

app.mount('#app')
