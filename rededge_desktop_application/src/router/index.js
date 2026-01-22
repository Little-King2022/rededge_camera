import { createRouter, createWebHashHistory } from 'vue-router'

const routes = [
  {
    path: '/',
    redirect: '/connect'
  },
  {
    path: '/connect',
    name: 'Connect',
    component: () => import('../views/ConnectView.vue')
  },
  {
    path: '/preview',
    name: 'Preview',
    component: () => import('../views/PreviewView.vue')
  },
  {
    path: '/capture',
    name: 'Capture',
    component: () => import('../views/CaptureView.vue')
  },
  {
    path: '/status',
    name: 'Status',
    component: () => import('../views/StatusView.vue')
  },
  {
    path: '/files',
    name: 'Files',
    component: () => import('../views/FilesView.vue')
  },
  {
    path: '/calibration',
    name: 'Calibration',
    component: () => import('../views/CalibrationView.vue')
  },
  {
    path: '/alignment',
    name: 'Alignment',
    component: () => import('../views/AlignmentView.vue')
  },
  {
    path: '/settings',
    name: 'Settings',
    component: () => import('../views/SettingsView.vue')
  },
  {
    path: '/analysis',
    name: 'Analysis',
    component: () => import('../views/AnalysisView.vue')
  }
]

const router = createRouter({
  history: createWebHashHistory(),
  routes
})

export default router
