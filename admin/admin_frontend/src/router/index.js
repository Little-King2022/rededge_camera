/**
 * Vue Router 配置
 */
import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

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
        meta: { title: '相机配置管理' }
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

// 路由守卫
router.beforeEach((to, from, next) => {
  const authStore = useAuthStore()

  // 设置页面标题
  if (to.meta.title) {
    document.title = `${to.meta.title} - RedEdge 后台管理系统`
  } else {
    document.title = 'RedEdge 后台管理系统'
  }

  // 检查是否需要认证
  if (to.meta.requiresAuth !== false) {
    if (!authStore.isLoggedIn) {
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
  } else {
    // 已登录用户访问登录页，重定向到仪表盘
    if (to.name === 'Login' && authStore.isLoggedIn) {
      next({ name: 'Dashboard' })
      return
    }
  }

  next()
})

export default router
