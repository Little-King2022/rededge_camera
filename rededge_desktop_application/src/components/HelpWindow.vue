<template>
  <Teleport to="body">
    <div
      v-if="visible"
      class="help-window-wrapper"
      :style="{
        left: position.x + 'px',
        top: position.y + 'px',
        width: size.width + 'px',
        height: size.height + 'px',
        zIndex: 1000
      }"
      @mousedown="bringToFront"
    >
      <!-- 窗口头部 -->
      <div
        class="help-window-header"
        @mousedown="startDrag"
      >
        <div class="help-window-title">
          <QuestionCircleOutlined class="title-icon" />
          <span>{{ title }}</span>
        </div>
        <div class="help-window-actions">
          <a-button
            type="text"
            size="small"
            class="header-btn"
            @click="emit('update:visible', false)"
          >
            <CloseOutlined />
          </a-button>
        </div>
      </div>

      <!-- 窗口内容 -->
      <div class="help-window-content">
        <slot></slot>
      </div>

      <!-- 调整大小手柄 -->
      <div class="resize-handle resize-handle-right" @mousedown.stop="startResize('right')"></div>
      <div class="resize-handle resize-handle-bottom" @mousedown.stop="startResize('bottom')"></div>
      <div class="resize-handle resize-handle-corner" @mousedown.stop="startResize('corner')"></div>
    </div>
  </Teleport>
</template>

<script setup>
import { ref, watch } from 'vue'
import { QuestionCircleOutlined, CloseOutlined } from '@ant-design/icons-vue'

const props = defineProps({
  visible: {
    type: Boolean,
    default: false
  },
  title: {
    type: String,
    default: '帮助文档'
  },
  defaultPosition: {
    type: Object,
    default: () => ({ x: 100, y: 100 })
  },
  defaultSize: {
    type: Object,
    default: () => ({ width: 500, height: 600 })
  }
})

const emit = defineEmits(['update:visible'])

// 窗口位置和大小
const position = ref({ ...props.defaultPosition })
const size = ref({ ...props.defaultSize })

// 拖拽状态
const isDragging = ref(false)
const dragStart = ref({ x: 0, y: 0 })

// 调整大小状态
const isResizing = ref(false)
const resizeDirection = ref('')
const resizeStart = ref({ x: 0, y: 0, width: 0, height: 0 })

// 导航栏高度（避免窗口被拖到导航栏后面）
const HEADER_HEIGHT = 72

// 重置位置（当窗口重新打开时）
watch(() => props.visible, (newVal) => {
  if (newVal) {
    // 确保窗口在可见区域内
    const maxX = window.innerWidth - size.value.width
    const maxY = window.innerHeight - size.value.height

    if (position.value.x > maxX) position.value.x = Math.max(50, maxX)
    if (position.value.y > maxY) position.value.y = Math.max(HEADER_HEIGHT, maxY)
    if (position.value.x < 0) position.value.x = 50
    if (position.value.y < HEADER_HEIGHT) position.value.y = HEADER_HEIGHT
  }
})

// 开始拖拽
const startDrag = (e) => {
  isDragging.value = true
  dragStart.value = {
    x: e.clientX - position.value.x,
    y: e.clientY - position.value.y
  }

  document.addEventListener('mousemove', onDrag)
  document.addEventListener('mouseup', stopDrag)
  e.preventDefault()
}

const onDrag = (e) => {
  if (!isDragging.value) return

  const newX = e.clientX - dragStart.value.x
  const newY = e.clientY - dragStart.value.y

  // 限制在窗口范围内，顶部不能超过导航栏
  position.value.x = Math.max(0, Math.min(newX, window.innerWidth - size.value.width))
  position.value.y = Math.max(HEADER_HEIGHT, Math.min(newY, window.innerHeight - size.value.height))
}

const stopDrag = () => {
  isDragging.value = false
  document.removeEventListener('mousemove', onDrag)
  document.removeEventListener('mouseup', stopDrag)
}

// 开始调整大小
const startResize = (direction) => {
  isResizing.value = true
  resizeDirection.value = direction
  resizeStart.value = {
    x: event.clientX,
    y: event.clientY,
    width: size.value.width,
    height: size.value.height
  }

  document.addEventListener('mousemove', onResize)
  document.addEventListener('mouseup', stopResize)
  event.preventDefault()
}

const onResize = (e) => {
  if (!isResizing.value) return

  const deltaX = e.clientX - resizeStart.value.x
  const deltaY = e.clientY - resizeStart.value.y

  if (resizeDirection.value === 'right' || resizeDirection.value === 'corner') {
    const newWidth = resizeStart.value.width + deltaX
    size.value.width = Math.max(400, Math.min(newWidth, window.innerWidth - position.value.x))
  }

  if (resizeDirection.value === 'bottom' || resizeDirection.value === 'corner') {
    const newHeight = resizeStart.value.height + deltaY
    size.value.height = Math.max(400, Math.min(newHeight, window.innerHeight - position.value.y))
  }
}

const stopResize = () => {
  isResizing.value = false
  resizeDirection.value = ''
  document.removeEventListener('mousemove', onResize)
  document.removeEventListener('mouseup', stopResize)
}

const bringToFront = () => {
  // 可以在这里实现多窗口时的置顶逻辑
}
</script>

<style scoped>
.help-window-wrapper {
  position: fixed;
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  user-select: none;
}

.help-window-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: linear-gradient(135deg, #52796f 0%, #354f52 100%);
  color: #fff;
  cursor: move;
  user-select: none;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.help-window-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 15px;
  font-weight: 600;
}

.title-icon {
  font-size: 16px;
}

.help-window-actions {
  display: flex;
  gap: 4px;
}

.header-btn {
  color: rgba(255, 255, 255, 0.85) !important;
  width: 28px;
  height: 28px;
  padding: 0 !important;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
}

.header-btn:hover {
  background: rgba(255, 255, 255, 0.15) !important;
  color: #fff !important;
}

.help-window-content {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
  background: #fff;
}

/* 调整大小手柄 */
.resize-handle {
  position: absolute;
  background: transparent;
}

.resize-handle-right {
  right: 0;
  top: 0;
  bottom: 0;
  width: 8px;
  cursor: ew-resize;
}

.resize-handle-bottom {
  left: 0;
  right: 0;
  bottom: 0;
  height: 8px;
  cursor: ns-resize;
}

.resize-handle-corner {
  right: 0;
  bottom: 0;
  width: 16px;
  height: 16px;
  cursor: nwse-resize;
}

.resize-handle-corner::after {
  content: '';
  position: absolute;
  right: 4px;
  bottom: 4px;
  width: 8px;
  height: 8px;
  border-right: 2px solid #d9d9d9;
  border-bottom: 2px solid #d9d9d9;
  border-radius: 0 0 2px 0;
}

/* 滚动条样式 */
.help-window-content::-webkit-scrollbar {
  width: 8px;
}

.help-window-content::-webkit-scrollbar-track {
  background: #f5f5f5;
  border-radius: 4px;
}

.help-window-content::-webkit-scrollbar-thumb {
  background: #d9d9d9;
  border-radius: 4px;
}

.help-window-content::-webkit-scrollbar-thumb:hover {
  background: #bfbfbf;
}
</style>
