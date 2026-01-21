import { createApp } from 'vue'
import { createPinia } from 'pinia'
import Antd from 'ant-design-vue'
import App from './App.vue'
import router from './router'
import i18n from './i18n'
import 'ant-design-vue/dist/reset.css'

async function bootstrap() {
	const app = createApp(App)
	const pinia = createPinia()

	app.use(pinia)
	app.use(router)
	app.use(Antd)
	app.use(i18n)

	try {
		const savedLocale = await window.electronAPI?.settings?.get('language')
		const systemLocale = navigator.language?.toLowerCase().startsWith('zh') ? 'zh-CN' : 'en-US'
		const targetLocale = savedLocale || systemLocale
		if (i18n.global.availableLocales.includes(targetLocale)) {
			i18n.global.locale.value = targetLocale
		}
	} catch (error) {
		console.warn('[i18n] Failed to load saved locale:', error)
	}

	app.mount('#app')
	console.log('[Renderer] Vue application mounted')
}

bootstrap()
