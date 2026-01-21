import { createRouter, createWebHashHistory } from 'vue-router'
import ConnectView from '../views/ConnectView.vue'
import PreviewView from '../views/PreviewView.vue'
import CaptureView from '../views/CaptureView.vue'
import StatusView from '../views/StatusView.vue'
import FilesView from '../views/FilesView.vue'
import SettingsView from '../views/SettingsView.vue'
import AnalysisView from '../views/AnalysisView.vue'
import CalibrationView from '../views/CalibrationView.vue'
import AlignmentView from '../views/AlignmentView.vue'

const routes = [
  {
    path: '/',
    redirect: '/connect'
  },
  {
    path: '/connect',
    name: 'Connect',
    component: ConnectView
  },
  {
    path: '/preview',
    name: 'Preview',
    component: PreviewView
  },
  {
    path: '/capture',
    name: 'Capture',
    component: CaptureView
  },
  {
    path: '/status',
    name: 'Status',
    component: StatusView
  },
  {
    path: '/files',
    name: 'Files',
    component: FilesView
  },
  {
    path: '/calibration',
    name: 'Calibration',
    component: CalibrationView
  },
  {
    path: '/alignment',
    name: 'Alignment',
    component: AlignmentView
  },
  {
    path: '/settings',
    name: 'Settings',
    component: SettingsView
  },
  {
    path: '/analysis',
    name: 'Analysis',
    component: AnalysisView
  }
]

const router = createRouter({
  history: createWebHashHistory(),
  routes
})

export default router
