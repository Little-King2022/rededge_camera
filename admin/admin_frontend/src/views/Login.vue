<template>
  <div class="login-container">
    <div class="login-box">
      <div class="login-header">
        <!-- <img src="/logo.png" alt="RedEdge" class="logo" /> -->
        <h1>RedEdge 后台管理系统</h1>
      </div>

      <a-form
        :model="formState"
        :rules="rules"
        @finish="handleLogin"
        autocomplete="off"
      >
        <a-form-item name="username">
          <a-input
            v-model:value="formState.username"
            size="large"
            placeholder="用户名"
          >
            <template #prefix>
              <user-outlined />
            </template>
          </a-input>
        </a-form-item>

        <a-form-item name="password">
          <a-input-password
            v-model:value="formState.password"
            size="large"
            placeholder="密码"
          >
            <template #prefix>
              <lock-outlined />
            </template>
          </a-input-password>
        </a-form-item>

        <a-form-item>
          <a-button
            type="primary"
            html-type="submit"
            size="large"
            block
            :loading="loading"
          >
            登录
          </a-button>
        </a-form-item>
      </a-form>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { message } from 'ant-design-vue'
import { useAuthStore } from '@/stores/auth'
import { UserOutlined, LockOutlined } from '@ant-design/icons-vue'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()

const loading = ref(false)
const formState = reactive({
  username: '',
  password: ''
})

const rules = {
  username: [{ required: true, message: '请输入用户名' }],
  password: [{ required: true, message: '请输入密码' }]
}

const handleLogin = async () => {
  loading.value = true

  try {
    const result = await authStore.login(formState)

    if (result.success) {
      message.success('登录成功')

      // 处理 redirect 参数
      let redirect = route.query.redirect
      if (redirect) {
        try {
          // 解码并验证是否为有效路径
          redirect = decodeURIComponent(redirect)
          // 确保是相对路径（以 / 开头）且不是登录页面
          if (!redirect.startsWith('/') || redirect.startsWith('/login')) {
            redirect = '/dashboard'
          }
        } catch (e) {
          redirect = '/dashboard'
        }
      }
      router.push(redirect || '/dashboard')
    } else {
      message.error(result.error || '登录失败')
    }
  } catch (error) {
    message.error('登录失败，请稍后重试')
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.login-container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.login-box {
  width: 400px;
  padding: 40px;
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
}

.login-header {
  text-align: center;
  margin-bottom: 32px;
}

.logo {
  height: 64px;
  margin-bottom: 16px;
}

.login-header h1 {
  font-size: 24px;
  color: #333;
  margin: 0;
}
</style>
