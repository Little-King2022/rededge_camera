/**
 * Vue Router 配置
 */
import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useSystemStore } from '@/stores/system'

const routes = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/views/Login.vue'),
    meta: { requiresAuth: false }
  },
  {
    path: '/',
    component: () => import('@/layouts/MainLayout.vue'),
    redirect: '/dashboard',
    meta: { requiresAuth: true },
    children: [
      {
        path: 'dashboard',
        name: 'Dashboard',
        component: () => import('@/views/Dashboard.vue'),
        meta: { title: '仪表盘' }
      },
      {
        path: 'cameras',
        name: 'CameraManagement',
        component: () => import('@/views/CameraManagement.vue'),
        meta: { title: '相机管理' }
      },
      {
        path: 'clients',
        name: 'ClientManagement',
        component: () => import('@/views/ClientManagement.vue'),
        meta: { title: '客户端管理' }
      },
      {
        path: 'licenses',
        name: 'LicenseManagement',
        component: () => import('@/views/LicenseManagement.vue'),
        meta: { title: '授权管理' }
      },
      {
        path: 'versions',
        name: 'VersionManagement',
        component: () => import('@/views/VersionManagement.vue'),
        meta: { title: '版本管理' }
      },
      {
        path: 'users',
        name: 'UserManagement',
        component: () => import('@/views/UserManagement.vue'),
        meta: {
          title: '用户管理',
          requiredRole: 'admin'
        }
      },
      {
        path: 'settings',
        name: 'SystemSettings',
        component: () => import('@/views/SystemSettings.vue'),
        meta: {
          title: '系统设置',
          requiredRole: 'admin'
        }
      }
    ]
  },
  {
    path: '/:pathMatch(.*)*',
    redirect: '/dashboard'
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

// 获取站点名称
const getSiteName = () => {
  const systemStore = useSystemStore()
  return systemStore.siteName || 'RedEdge 后台管理系统'
}

// 路由守卫
router.beforeEach((to, from, next) => {
  const authStore = useAuthStore()

  // 设置页面标题
  const siteName = getSiteName()
  if (to.meta.title) {
    document.title = `${to.meta.title} - ${siteName}`
  } else {
    document.title = siteName
  }

  const isLoggedIn = authStore.isLoggedIn

  // 优先处理登录页，避免因 meta 判断异常导致循环重定向
  if (to.name === 'Login') {
    if (isLoggedIn) {
      next({ name: 'Dashboard' })
    } else {
      next()
    }
    return
  }

  // 检查是否需要认证（只有明确设置 requiresAuth: false 才不需要认证）
  if (to.meta.requiresAuth !== false) {
    if (!isLoggedIn) {
      next({ name: 'Login', query: { redirect: to.fullPath } })
      return
    }

    // 检查角色权限
    if (to.meta.requiredRole) {
      if (!authStore.hasPermission(to.meta.requiredRole)) {
        next({ name: 'Dashboard' })
        return
      }
    }
  }

  next()
})

export default router
