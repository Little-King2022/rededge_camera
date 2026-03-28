<template>
  <div class="analysis-root">
    <a-layout has-sider class="analysis-layout">
      <!-- ===== 左侧工具导航 ===== -->
      <a-layout-sider
        :width="240"
        :trigger="null"
        class="left-sider"
      >
        <div class="sider-title">
          <ExperimentOutlined class="sider-title-icon" />
          {{ t('analysis.title') }}
        </div>
        <a-menu
          v-model:selectedKeys="selectedKeys"
          mode="inline"
          class="tool-menu"
        >
          <a-menu-item key="spectral">
            <template #icon><LineChartOutlined /></template>
            {{ t('analysis.menu.spectralCalculator') }}
          </a-menu-item>
          <a-menu-item key="ai">
            <template #icon><CloudOutlined /></template>
            <span>{{ t('analysis.menu.aiModel') }}</span>
            <!-- <a-tag color="blue" class="soon-tag">Soon</a-tag> -->
          </a-menu-item>
        </a-menu>
      </a-layout-sider>

      <!-- ===== 中间工具内容区 ===== -->
      <a-layout-content class="tool-content">
        <!-- Python Service 状态提示 -->
        <a-alert
          v-if="!store.pythonServiceStatus.isHealthy"
          :message="t('analysis.pythonServiceNotRunning')"
          type="warning"
          show-icon
          banner
          class="service-alert"
        >
          <template #action>
            <a-button
              size="small"
              type="primary"
              :loading="isStartingService"
              @click="handleStartService"
            >
              {{ t('analysis.startService') }}
            </a-button>
          </template>
        </a-alert>

        <!-- 光谱计算器 -->
        <div v-if="selectedKeys[0] === 'spectral'" class="tool-scroll-area">
          <div class="tool-form-wrapper">
            <!-- 输入影像 -->
            <a-card size="small" class="section-card">
              <template #title>
                <span class="section-title">
                  <UploadOutlined class="section-icon" />
                  {{ t('analysis.spectral.inputSection') }}
                </span>
              </template>
              <a-form-item class="mb-0">
                <a-input
                  v-model:value="form.tifPath"
                  :placeholder="t('analysis.spectral.tifPlaceholder')"
                  readonly
                >
                  <template #addonAfter>
                    <a-button type="link" size="small" @click="handleSelectTif" class="addon-btn">
                      {{ t('common.browse') }}
                    </a-button>
                  </template>
                </a-input>
                <div class="form-tip">{{ t('analysis.spectral.tifTip') }}</div>
              </a-form-item>
            </a-card>

            <!-- 指数设置 -->
            <a-card size="small" class="section-card">
              <template #title>
                <span class="section-title">
                  <FunctionOutlined class="section-icon" />
                  {{ t('analysis.spectral.indexSection') }}
                </span>
              </template>

              <a-radio-group v-model:value="form.indexMode" button-style="solid" class="mode-switch">
                <a-radio-button value="preset">{{ t('analysis.spectral.presetIndex') }}</a-radio-button>
                <a-radio-button value="custom">{{ t('analysis.spectral.customIndex') }}</a-radio-button>
              </a-radio-group>

              <!-- 预设指数 -->
              <template v-if="form.indexMode === 'preset'">
                <a-select
                  v-model:value="form.presetIndex"
                  :placeholder="t('analysis.spectral.selectPreset')"
                  class="preset-select"
                >
                  <a-select-option v-for="(info, key) in PRESET_OPTIONS" :key="key" :value="key">
                    <div class="preset-option">
                      <span class="preset-name">{{ info.label }}</span>
                      <code class="preset-formula">{{ info.formula }}</code>
                    </div>
                  </a-select-option>
                </a-select>
              </template>

              <!-- 自定义公式计算器 -->
              <template v-if="form.indexMode === 'custom'">
                <div class="calc-panel">
                  <!-- 公式显示区 -->
                  <div class="calc-display">
                    <a-textarea
                      ref="formulaRef"
                      v-model:value="form.customFormula"
                      :placeholder="t('analysis.spectral.formulaPlaceholder')"
                      :auto-size="{ minRows: 2, maxRows: 4 }"
                      class="formula-input"
                    />
                    <a-button
                      v-if="form.customFormula"
                      type="text"
                      size="small"
                      class="calc-clear-btn"
                      @click="form.customFormula = ''"
                    >
                      <CloseCircleOutlined />
                    </a-button>
                  </div>

                  <!-- 波段变量 -->
                  <div class="calc-section">
                    <span class="calc-section-label">Band</span>
                    <div class="calc-btn-group">
                      <a-button
                        v-for="band in BAND_BUTTONS"
                        :key="band.value"
                        size="small"
                        class="calc-btn band-btn"
                        :style="{ '--band-color': band.color }"
                        @click="insertFormula(band.value)"
                      >
                        {{ band.label }}
                        <span class="band-wave">{{ band.wave }}</span>
                      </a-button>
                    </div>
                  </div>

                  <!-- 运算符 -->
                  <div class="calc-section">
                    <span class="calc-section-label">Op</span>
                    <div class="calc-btn-group">
                      <a-button
                        v-for="op in OP_BUTTONS"
                        :key="op.value"
                        size="small"
                        class="calc-btn op-btn"
                        @click="insertFormula(op.value)"
                      >
                        {{ op.label }}
                      </a-button>
                    </div>
                  </div>

                  <!-- 数值与函数 -->
                  <div class="calc-section">
                    <span class="calc-section-label">Fn</span>
                    <div class="calc-btn-group">
                      <a-button
                        v-for="fn in FN_BUTTONS"
                        :key="fn.value"
                        size="small"
                        class="calc-btn fn-btn"
                        @click="insertFormula(fn.value)"
                      >
                        {{ fn.label }}
                      </a-button>
                    </div>
                  </div>
                </div>
                <div class="form-tip">{{ t('analysis.spectral.formulaHelp') }}</div>
              </template>
            </a-card>

            <!-- 输出设置 -->
            <a-card size="small" class="section-card">
              <template #title>
                <span class="section-title">
                  <ExportOutlined class="section-icon" />
                  {{ t('analysis.spectral.outputSection') }}
                </span>
              </template>

              <a-form layout="vertical">
                <a-form-item :label="t('analysis.spectral.outputDir')" class="mb-8">
                  <a-input
                    v-model:value="form.outputDir"
                    readonly
                    :placeholder="t('analysis.spectral.outputDir')"
                  >
                    <template #addonAfter>
                      <a-button type="link" size="small" @click="handleSelectOutputDir" class="addon-btn">
                        {{ t('analysis.spectral.selectOutputDir') }}
                      </a-button>
                    </template>
                  </a-input>
                </a-form-item>
                <a-form-item :label="t('analysis.spectral.outputBasename')" class="mb-0">
                  <a-input
                    v-model:value="form.outputBasename"
                    :placeholder="t('analysis.spectral.outputBasenamePlaceholder')"
                  />
                </a-form-item>
              </a-form>
            </a-card>

            <!-- 提交按钮 -->
            <a-button
              type="primary"
              :loading="isSubmitting"
              :disabled="!store.pythonServiceStatus.isHealthy"
              block
              size="large"
              class="submit-btn"
              @click="handleSubmit"
            >
              <template #icon><ThunderboltOutlined /></template>
              {{ t('analysis.spectral.submitJob') }}
            </a-button>
          </div>
        </div>

        <!-- AI 模型 -->
        <div v-if="selectedKeys[0] === 'ai'" class="tool-scroll-area ai-section">
          <a-layout has-sider class="ai-layout">
            <!-- 模型列表 -->
            <a-layout-sider :width="340" class="model-list-sider" :trigger="null">
              <!-- 搜索 & 筛选 -->
              <div class="model-list-header">
                <a-input
                  v-model:value="modelSearch"
                  :placeholder="t('analysis.aiModel.searchPlaceholder')"
                  allow-clear
                  size="small"
                >
                  <template #prefix><SearchOutlined style="color: #bbb" /></template>
                </a-input>
                <div class="model-type-tabs">
                  <a-radio-group v-model:value="modelTypeFilter" size="small" button-style="solid">
                    <a-radio-button value="">{{ t('analysis.aiModel.allTypes') }}</a-radio-button>
                    <a-radio-button value="classic">{{ t('analysis.aiModel.types.classic') }}</a-radio-button>
                    <a-radio-button value="DL Model">{{ t('analysis.aiModel.types.DL Model') }}</a-radio-button>
                    <a-radio-button value="detection">{{ t('analysis.aiModel.types.detection') }}</a-radio-button>
                  </a-radio-group>
                </div>
                <div class="model-count">
                  {{ t('analysis.aiModel.totalModels', { count: filteredModels.length }) }}
                </div>
              </div>

              <!-- 列表内容 -->
              <div class="model-list-body">
                <!-- Loading -->
                <div v-if="store.modelsLoading" class="model-list-loading">
                  <a-spin :tip="t('analysis.aiModel.loadModels')" />
                </div>
                <!-- Error -->
                <div v-else-if="store.modelsError" class="model-list-empty">
                  <WarningOutlined style="font-size: 32px; color: #faad14" />
                  <p>{{ t('analysis.aiModel.loadFailed') }}</p>
                  <a-button size="small" @click="store.loadModels()">{{ t('analysis.aiModel.retry') }}</a-button>
                </div>
                <!-- Empty -->
                <div v-else-if="filteredModels.length === 0" class="model-list-empty">
                  <InboxOutlined style="font-size: 32px; color: #ccc" />
                  <p>{{ t('analysis.aiModel.empty') }}</p>
                </div>
                <!-- Cards -->
                <div
                  v-for="model in filteredModels"
                  :key="model.modelCode"
                  class="model-card"
                  :class="{ 'model-card-active': store.selectedModel?.modelCode === model.modelCode }"
                  @click="store.selectModel(model)"
                >
                  <div class="model-card-top">
                    <span class="model-card-name">{{ model.modelName }}</span>
                    <a-tag :color="modelTypeColor(model.modelType)" size="small" class="model-type-tag">
                      {{ t(`analysis.aiModel.types.${model.modelType}`) || model.modelType }}
                    </a-tag>
                  </div>
                  <div class="model-card-desc">{{ model.modelDescription }}</div>
                  <div class="model-card-meta">
                    <span>v{{ model.modelVersion }}</span>
                    <span>
                      <ThunderboltOutlined />
                      {{ model.callCount }}
                    </span>
                  </div>
                </div>
              </div>
            </a-layout-sider>

            <!-- 模型详情 -->
            <a-layout-content class="model-detail-content">
              <!-- 未选择模型 -->
              <div v-if="!store.selectedModel" class="model-detail-empty">
                <RobotOutlined style="font-size: 48px; color: #d9d9d9" />
                <p>{{ t('analysis.aiModel.selectModelTip') }}</p>
              </div>

              <!-- 模型详情 -->
              <div v-else class="model-detail-panel">
                <!-- Header -->
                <div class="model-detail-header">
                  <div class="model-detail-title-row">
                    <h2 class="model-detail-name">{{ store.selectedModel.modelName }}</h2>
                    <a-tag :color="modelTypeColor(store.selectedModel.modelType)" class="model-type-tag-lg">
                      {{ t(`analysis.aiModel.types.${store.selectedModel.modelType}`) || store.selectedModel.modelType }}
                    </a-tag>
                  </div>
                  <div class="model-detail-code">
                    {{ t('analysis.aiModel.modelCode') }}: {{ store.selectedModel.modelCode }}
                    <a-divider type="vertical" />
                    {{ t('analysis.aiModel.modelVersion') }}: v{{ store.selectedModel.modelVersion }}
                  </div>
                </div>

                <!-- Description -->
                <a-card size="small" class="detail-card">
                  <template #title>
                    <FileTextOutlined class="detail-card-icon" />
                    {{ t('analysis.aiModel.modelDescription') }}
                  </template>
                  <p class="model-desc-text">{{ store.selectedModel.modelDescription }}</p>
                </a-card>

                <!-- Info Grid -->
                <div class="detail-grid">
                  <div class="detail-grid-item">
                    <div class="detail-grid-label">{{ t('analysis.aiModel.inputFormat') }}</div>
                    <div class="detail-grid-value">
                      <a-tag v-for="fmt in parseFormats(store.selectedModel.inputFormat)" :key="fmt" color="blue">
                        {{ fmt.toUpperCase() }}
                      </a-tag>
                    </div>
                  </div>
                  <div class="detail-grid-item">
                    <div class="detail-grid-label">{{ t('analysis.aiModel.outputFormat') }}</div>
                    <div class="detail-grid-value">
                      <a-tag v-for="fmt in parseFormats(store.selectedModel.outputFormat)" :key="fmt" color="green">
                        {{ fmt.toUpperCase() }}
                      </a-tag>
                    </div>
                  </div>
                  <div class="detail-grid-item">
                    <div class="detail-grid-label">{{ t('analysis.aiModel.callCount') }}</div>
                    <div class="detail-grid-value detail-grid-number">
                      {{ store.selectedModel.callCount }}
                    </div>
                  </div>
                  <div class="detail-grid-item">
                    <div class="detail-grid-label">{{ t('analysis.aiModel.lastCallTime') }}</div>
                    <div class="detail-grid-value">
                      {{ store.selectedModel.lastCallTime || t('analysis.aiModel.noLastCall') }}
                    </div>
                  </div>
                </div>

                <!-- Run Button -->
                <a-button
                  type="primary"
                  block
                  size="large"
                  class="run-model-btn"
                  @click="handleRunModel"
                >
                  <template #icon><SendOutlined /></template>
                  {{ t('analysis.aiModel.runModel') }}
                </a-button>
              </div>
            </a-layout-content>
          </a-layout>
        </div>
      </a-layout-content>

      <!-- ===== 右侧任务队列 ===== -->
      <a-layout-sider
        v-model:collapsed="jobQueueCollapsed"
        :width="320"
        :collapsed-width="40"
        collapsible
        reverse-arrow
        :trigger="null"
        class="right-sider"
      >
        <!-- 折叠态：竖向图标条 -->
        <div v-if="jobQueueCollapsed" class="collapsed-strip" @click="jobQueueCollapsed = false">
          <a-badge :count="store.pendingJobs.length" :offset="[6, 0]">
            <UnorderedListOutlined class="collapsed-icon" />
          </a-badge>
          <span class="collapsed-label">{{ t('analysis.jobs.title') }}</span>
        </div>

        <!-- 展开态：完整队列面板 -->
        <template v-else>
          <div class="queue-panel">
            <!-- 头部 -->
            <div class="queue-header">
              <span class="queue-title">
                {{ t('analysis.jobs.title') }}
                <a-badge
                  v-if="store.pendingJobs.length > 0"
                  :count="store.pendingJobs.length"
                  class="queue-badge"
                />
              </span>
              <a-space :size="4">
                <a-button size="small" type="text" @click="handleRefreshJobs" :loading="store.isLoading">
                  <template #icon><ReloadOutlined /></template>
                </a-button>
                <a-button size="small" type="text" @click="jobQueueCollapsed = true">
                  <template #icon><RightOutlined /></template>
                </a-button>
              </a-space>
            </div>

            <!-- 任务列表 -->
            <div class="queue-body">
              <div v-if="store.sortedJobs.length === 0" class="queue-empty">
                <InboxOutlined class="empty-icon" />
                <p>{{ t('analysis.jobs.empty') }}</p>
              </div>

              <div v-else class="job-list">
                <div
                  v-for="job in store.sortedJobs"
                  :key="job.id"
                  class="job-card"
                  :class="`job-${job.status}`"
                >
                  <!-- 第一行：状态 + 指数名 -->
                  <div class="job-row-main">
                    <a-tag :color="statusColor(job.status)" size="small">
                      {{ t(`analysis.jobs.status.${job.status}`) }}
                    </a-tag>
                    <span class="job-name">{{ job.index_name || job.index_type?.toUpperCase() }}</span>
                  </div>

                  <!-- 自定义公式 -->
                  <div v-if="job.custom_formula" class="job-formula">
                    <code>{{ job.custom_formula }}</code>
                  </div>

                  <!-- 文件名 + 时间 -->
                  <div class="job-meta">
                    <span class="job-file" :title="job.tif_path">
                      <FileImageOutlined />
                      {{ getBasename(job.tif_path) }}
                    </span>
                    <span class="job-time">{{ formatTime(job.created_at) }}</span>
                  </div>

                  <!-- 进度条 -->
                  <a-progress
                    v-if="job.status === 'running' || job.status === 'pending'"
                    :percent="job.progress || 0"
                    :status="job.status === 'running' ? 'active' : 'normal'"
                    size="small"
                    :stroke-width="4"
                    class="job-progress"
                  />

                  <!-- 错误信息 -->
                  <a-alert
                    v-if="job.status === 'failed' && job.error_message"
                    type="error"
                    :message="job.error_message"
                    show-icon
                    class="job-alert"
                    :style="{ fontSize: '11px' }"
                  />

                  <!-- 操作按钮 -->
                  <div class="job-toolbar">
                    <template v-if="job.status === 'completed' && job.result">
                      <a-tooltip :title="t('analysis.jobs.actions.viewPng')">
                        <a-button type="text" size="small" @click="handleViewPng(job)">
                          <PictureOutlined />
                        </a-button>
                      </a-tooltip>
                      <a-tooltip title="TIF">
                        <a-button type="text" size="small" @click="store.openOutputFile(job.result.tif_path)">
                          <FileOutlined />
                        </a-button>
                      </a-tooltip>
                      <a-tooltip :title="t('analysis.jobs.actions.showFolder')">
                        <a-button type="text" size="small" @click="store.showInFolder(job.result.tif_path)">
                          <FolderOpenOutlined />
                        </a-button>
                      </a-tooltip>
                    </template>
                    <div class="toolbar-spacer" />
                    <a-button
                      v-if="job.status === 'pending' || job.status === 'running'"
                      type="text"
                      size="small"
                      danger
                      @click="handleCancelJob(job)"
                    >
                      <CloseOutlined />
                    </a-button>
                    <a-popconfirm
                      v-if="['completed', 'failed', 'cancelled'].includes(job.status)"
                      :title="t('analysis.messages.deleteConfirm')"
                      @confirm="handleDeleteJob(job)"
                      placement="left"
                    >
                      <a-button type="text" size="small">
                        <DeleteOutlined />
                      </a-button>
                    </a-popconfirm>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </template>
      </a-layout-sider>
    </a-layout>

    <!-- ===== PNG 预览弹窗 ===== -->
    <a-modal
      v-model:open="pngPreviewVisible"
      :title="previewJob?.index_name || t('analysis.jobs.result.title')"
      width="860px"
      :footer="null"
      centered
    >
      <div class="preview-body">
        <div class="preview-img-wrap">
          <a-spin v-if="pngLoading" />
          <img v-else-if="pngDataUrl" :src="pngDataUrl" class="preview-img" alt="" />
          <a-alert v-else-if="pngError" type="error" :message="pngError" show-icon />
        </div>

        <template v-if="!pngLoading && previewJob?.result?.stats">
          <a-descriptions
            :column="3"
            size="small"
            bordered
            class="preview-stats"
            :title="t('analysis.jobs.result.stats')"
          >
            <a-descriptions-item :label="t('analysis.jobs.result.min')">
              {{ previewJob.result.stats.min?.toFixed(4) }}
            </a-descriptions-item>
            <a-descriptions-item :label="t('analysis.jobs.result.max')">
              {{ previewJob.result.stats.max?.toFixed(4) }}
            </a-descriptions-item>
            <a-descriptions-item :label="t('analysis.jobs.result.mean')">
              {{ previewJob.result.stats.mean?.toFixed(4) }}
            </a-descriptions-item>
            <a-descriptions-item :label="t('analysis.jobs.result.std')">
              {{ previewJob.result.stats.std?.toFixed(4) }}
            </a-descriptions-item>
            <a-descriptions-item :label="t('analysis.jobs.result.validPixels')">
              {{ previewJob.result.stats.valid_pixels?.toLocaleString() }}
            </a-descriptions-item>
            <a-descriptions-item :label="t('analysis.jobs.result.totalPixels')">
              {{ previewJob.result.stats.total_pixels?.toLocaleString() }}
            </a-descriptions-item>
          </a-descriptions>
        </template>

        <div v-if="!pngLoading && previewJob?.result" class="preview-footer">
          <a-space>
            <a-button type="primary" size="small" @click="store.openOutputFile(previewJob.result.png_path)">
              <template #icon><PictureOutlined /></template>
              PNG
            </a-button>
            <a-button size="small" @click="store.openOutputFile(previewJob.result.tif_path)">
              <template #icon><FileOutlined /></template>
              TIF
            </a-button>
            <a-button size="small" @click="store.showInFolder(previewJob.result.tif_path)">
              <template #icon><FolderOpenOutlined /></template>
              {{ t('analysis.jobs.actions.showFolder') }}
            </a-button>
          </a-space>
        </div>
      </div>
    </a-modal>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, onUnmounted, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { message } from 'ant-design-vue'
import {
  ExperimentOutlined,
  LineChartOutlined,
  CloudOutlined,
  UploadOutlined,
  FunctionOutlined,
  ExportOutlined,
  ThunderboltOutlined,
  ReloadOutlined,
  RightOutlined,
  PictureOutlined,
  FileOutlined,
  FileTextOutlined,
  FileImageOutlined,
  FolderOpenOutlined,
  UnorderedListOutlined,
  InboxOutlined,
  CloseOutlined,
  CloseCircleOutlined,
  DeleteOutlined,
  SearchOutlined,
  WarningOutlined,
  SendOutlined
} from '@ant-design/icons-vue'
import { useAnalysisStore } from '../stores/analysis'

const { t } = useI18n()
const store = useAnalysisStore()

const formulaRef = ref(null)

// --- Calculator buttons ---
const BAND_BUTTONS = [
  { label: 'Blue',    value: 'blue',    wave: '475nm', color: '#2f54eb' },
  { label: 'Green',   value: 'green',   wave: '560nm', color: '#52c41a' },
  { label: 'Red',     value: 'red',     wave: '668nm', color: '#f5222d' },
  { label: 'RedEdge', value: 'rededge', wave: '717nm', color: '#eb2f96' },
  { label: 'NIR',     value: 'nir',     wave: '840nm', color: '#722ed1' }
]

const OP_BUTTONS = [
  { label: '+', value: ' + ' },
  { label: '\u2212', value: ' - ' },
  { label: '\u00d7', value: ' * ' },
  { label: '\u00f7', value: ' / ' },
  { label: '(', value: '(' },
  { label: ')', value: ')' },
  { label: '**', value: '**' }
]

const FN_BUTTONS = [
  { label: 'abs()',  value: 'abs()' },
  { label: 'sqrt()', value: 'np.sqrt()' },
  { label: 'log()',  value: 'np.log()' },
  { label: 'exp()',  value: 'np.exp()' },
  { label: '0.5',    value: '0.5' },
  { label: '1',      value: '1' },
  { label: '2',      value: '2' },
  { label: '2.5',    value: '2.5' }
]

function insertFormula(text) {
  const textarea = formulaRef.value?.$el?.querySelector?.('textarea') || formulaRef.value?.resizableTextArea?.textArea
  if (!textarea) {
    form.customFormula += text
    return
  }

  const start = textarea.selectionStart ?? form.customFormula.length
  const end = textarea.selectionEnd ?? start
  const before = form.customFormula.slice(0, start)
  const after = form.customFormula.slice(end)

  // For functions like abs(), sqrt() etc — place cursor inside the parens
  const parenMatch = text.match(/^(.+)\(\)$/)
  let cursorPos
  if (parenMatch) {
    form.customFormula = before + text + after
    cursorPos = start + text.length - 1  // inside ()
  } else {
    form.customFormula = before + text + after
    cursorPos = start + text.length
  }

  // Restore focus and set cursor position on next tick
  requestAnimationFrame(() => {
    textarea.focus()
    textarea.setSelectionRange(cursorPos, cursorPos)
  })
}

// --- UI state ---
const selectedKeys = ref(['spectral'])
const jobQueueCollapsed = ref(false)
const isStartingService = ref(false)
const isSubmitting = ref(false)

// --- AI model state ---
const modelSearch = ref('')
const modelTypeFilter = ref('')

const filteredModels = computed(() => {
  let list = store.models
  if (modelTypeFilter.value) {
    list = list.filter(m => m.modelType === modelTypeFilter.value)
  }
  if (modelSearch.value.trim()) {
    const kw = modelSearch.value.trim().toLowerCase()
    list = list.filter(m =>
      m.modelName.toLowerCase().includes(kw) ||
      (m.modelDescription && m.modelDescription.toLowerCase().includes(kw))
    )
  }
  return list
})

// PNG preview
const pngPreviewVisible = ref(false)
const previewJob = ref(null)
const pngDataUrl = ref('')
const pngLoading = ref(false)
const pngError = ref('')

// --- Preset index definitions ---
const PRESET_OPTIONS = {
  ndvi:  { label: 'NDVI',  desc: '归一化植被指数',       formula: '(NIR-Red)/(NIR+Red)' },
  ndre:  { label: 'NDRE',  desc: '归一化红边指数',       formula: '(NIR-RE)/(NIR+RE)' },
  gndvi: { label: 'GNDVI', desc: '绿光归一化植被指数',   formula: '(NIR-G)/(NIR+G)' },
  exg:   { label: 'ExG',   desc: '超绿指数',            formula: '2G-R-B' },
  evi:   { label: 'EVI',   desc: '增强植被指数',         formula: '2.5(NIR-R)/(NIR+6R-7.5B+1)' },
  savi:  { label: 'SAVI',  desc: '土壤调节植被指数',     formula: '1.5(NIR-R)/(NIR+R+0.5)' },
  ccci:  { label: 'CCCI',  desc: '冠层叶绿素含量指数',   formula: 'NDRE/NDVI' }
}

// --- Form ---
const form = reactive({
  tifPath: '',
  indexMode: 'preset',
  presetIndex: 'ndvi',
  customFormula: '',
  outputDir: '',
  outputBasename: ''
})

// --- Job polling ---
let pollTimer = null

function startPolling() {
  if (pollTimer) return
  pollTimer = setInterval(async () => {
    for (const job of store.pendingJobs) {
      if (job.job_id) await store.pollJobStatus(job.job_id)
    }
  }, 2000)
}

function stopPolling() {
  if (pollTimer) { clearInterval(pollTimer); pollTimer = null }
}

watch(() => store.pendingJobs.length, (n) => n > 0 ? startPolling() : stopPolling())

// Load AI models when switching to AI tab
let modelsLoaded = false
watch(() => selectedKeys.value[0], (key) => {
  if (key === 'ai' && !modelsLoaded) {
    modelsLoaded = true
    store.loadModels()
  }
})

onMounted(async () => {
  await store.checkPythonService()
  await store.loadJobs()
  if (store.pendingJobs.length > 0) startPolling()
})

onUnmounted(() => stopPolling())

// --- Actions ---
async function handleStartService() {
  isStartingService.value = true
  try {
    const ok = await store.startPythonService()
    ok ? message.success(t('analysis.serviceStarted')) : message.error(t('analysis.serviceStartFailed'))
  } finally { isStartingService.value = false }
}

async function handleSelectTif() {
  const r = await window.electronAPI.analysis.selectTifFile()
  if (r.success && r.filePath) form.tifPath = r.filePath
}

async function handleSelectOutputDir() {
  const r = await window.electronAPI.analysis.selectOutputDirectory()
  if (r.success && r.directory) form.outputDir = r.directory
}

async function handleSubmit() {
  if (!form.tifPath)    return message.warning(t('analysis.messages.selectTifFirst'))
  if (!form.outputDir)  return message.warning(t('analysis.messages.selectOutputFirst'))
  if (form.indexMode === 'preset' && !form.presetIndex) return message.warning(t('analysis.messages.selectIndexFirst'))
  if (form.indexMode === 'custom' && !form.customFormula.trim()) return message.warning(t('analysis.messages.enterFormulaFirst'))

  const indexType = form.indexMode === 'preset' ? form.presetIndex : 'custom'
  const indexName = form.indexMode === 'preset'
    ? PRESET_OPTIONS[form.presetIndex]?.label || indexType.toUpperCase()
    : 'Custom'

  isSubmitting.value = true
  try {
    const result = await store.submitJob({
      tifPath: form.tifPath,
      indexType,
      indexName,
      customFormula: form.indexMode === 'custom' ? form.customFormula.trim() : '',
      outputDir: form.outputDir,
      outputBasename: form.outputBasename.trim() || undefined
    })
    if (result.success) {
      message.success(t('analysis.messages.submitSuccess'))
      // auto-expand queue when a job is submitted
      jobQueueCollapsed.value = false
      startPolling()
    } else {
      message.error(t('analysis.messages.submitFailed', { error: result.error }))
    }
  } finally { isSubmitting.value = false }
}

async function handleRefreshJobs() { await store.loadJobs() }

async function handleCancelJob(job) {
  if (!job.job_id) return
  const r = await store.cancelJob(job.job_id)
  r.success ? message.success(t('analysis.messages.cancelSuccess')) : message.error(t('analysis.messages.cancelFailed'))
}

async function handleDeleteJob(job) {
  const r = await store.deleteJob(job.id, job.job_id)
  if (r.success) message.success(t('analysis.messages.deleteSuccess'))
}

async function handleViewPng(job) {
  previewJob.value = job
  pngDataUrl.value = ''
  pngError.value = ''
  pngLoading.value = true
  pngPreviewVisible.value = true
  try {
    const pngPath = job.result?.png_path
    if (!pngPath) { pngError.value = t('analysis.messages.fileNotFound'); return }
    const r = await window.electronAPI.analysis.readFileAsBase64(pngPath)
    if (r.success) {
      pngDataUrl.value = `data:${r.mimeType};base64,${r.data}`
    } else {
      pngError.value = r.error || t('analysis.messages.fileNotFound')
    }
  } finally { pngLoading.value = false }
}

// --- AI model helpers ---
function modelTypeColor(type) {
  return { classic: 'blue', 'DL Model': 'purple', detection: 'orange' }[type] || 'default'
}

function parseFormats(str) {
  if (!str) return []
  return str.split(/[,/]/).map(s => s.trim()).filter(Boolean)
}

function handleRunModel() {
  message.info(t('analysis.aiModel.runModelTip'))
}

// --- Helpers ---
function statusColor(s) {
  return { pending: 'default', running: 'processing', completed: 'success', failed: 'error', cancelled: 'warning' }[s] || 'default'
}

function getBasename(p) {
  if (!p) return ''
  return p.replace(/\\/g, '/').split('/').pop() || p
}

function formatTime(d) {
  if (!d) return ''
  try {
    const dt = new Date(d)
    return `${dt.toLocaleDateString()} ${dt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
  } catch { return d }
}
</script>

<style scoped>
/* ===== Root & Layout ===== */
.analysis-root {
  /* 父容器 .app-content 的 padding: top 88px + bottom 60px = 148px */
  height: calc(100vh - 148px);
  overflow: hidden;
}

.analysis-layout {
  height: 100%;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.06);
}

/* ===== Left Sider ===== */
.left-sider {
  background: #fff !important;
  border-right: 1px solid #f0f0f0;
}

.left-sider :deep(.ant-layout-sider-children) {
  display: flex;
  flex-direction: column;
}

.sider-title {
  padding: 16px 16px 14px;
  font-size: 16px;
  font-weight: 600;
  color: #1d1d1d;
  border-bottom: 1px solid #f0f0f0;
  display: flex;
  align-items: center;
  gap: 8px;
}

.sider-title-icon {
  font-size: 16px;
  color: #1890ff;
}

.tool-menu {
  flex: 1;
  border-right: none !important;
  padding: 4px 0;
}

.soon-tag {
  margin-left: 4px;
  font-size: 10px;
  line-height: 16px;
  padding: 0 4px;
  vertical-align: middle;
  border-radius: 4px;
}

/* ===== Tool Content ===== */
.tool-content {
  overflow: hidden;
  display: flex;
  flex-direction: column;
  /* background: #f7f8fa; */
}

.service-alert {
  flex-shrink: 0;
}

.tool-scroll-area {
  flex: 1;
  overflow-y: auto;
  padding: 0px 16px 16px;
  scrollbar-width: none; /* Firefox */
}

.tool-scroll-area::-webkit-scrollbar {
  display: none; /* Chrome/Edge */
}

.tool-form-wrapper {
  /* max-width: 640px; */
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.section-card {
  border-radius: 8px;
}

.section-card :deep(.ant-card-head) {
  min-height: auto;
  padding: 8px 16px;
  border-bottom: 1px solid #f5f5f5;
}

.section-card :deep(.ant-card-head-title) {
  padding: 0;
}

.section-card :deep(.ant-card-body) {
  padding: 12px 16px;
}

.section-title {
  font-size: 15px;
  font-weight: 600;
  color: #555;
  display: flex;
  align-items: center;
  gap: 6px;
}

.section-icon {
  color: #1890ff;
  font-size: 16px;
}

.addon-btn {
  padding: 0 4px;
  height: auto;
  line-height: 1;
}

.form-tip {
  margin-top: 6px;
  font-size: 13px;
  color: #999;
  line-height: 1.6;
}

.mode-switch {
  margin-bottom: 12px;
}

.preset-select {
  width: 100%;
}

.preset-option {
  display: flex;
  align-items: baseline;
  gap: 8px;
}

.preset-name {
  font-weight: 500;
}

.preset-formula {
  font-size: 11px;
  color: #aaa;
  font-family: 'SFMono-Regular', Consolas, monospace;
}

/* ===== Custom Formula Calculator ===== */
.calc-panel {
  border: 1px solid #e8e8e8;
  border-radius: 8px;
  overflow: hidden;
  background: #fafbfc;
}

.calc-display {
  position: relative;
  background: #fff;
  border-bottom: 1px solid #f0f0f0;
}

.calc-display .formula-input {
  font-family: 'SFMono-Regular', Consolas, monospace;
  font-size: 14px;
  border: none;
  border-radius: 0;
  padding-right: 32px;
}

.calc-display .formula-input:focus,
.calc-display :deep(.ant-input-focused) {
  box-shadow: none;
}

.calc-clear-btn {
  position: absolute;
  right: 4px;
  top: 4px;
  color: #bbb;
  z-index: 1;
}

.calc-clear-btn:hover {
  color: #999;
}

.calc-section {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 6px 10px;
  border-bottom: 1px dashed #f0f0f0;
}

.calc-section:last-child {
  border-bottom: none;
}

.calc-section-label {
  flex-shrink: 0;
  width: 32px;
  font-size: 10px;
  font-weight: 600;
  color: #bbb;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  padding-top: 5px;
  text-align: right;
}

.calc-btn-group {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  flex: 1;
}

.calc-btn {
  font-size: 12px;
  padding: 2px 8px;
  height: 28px;
  border-radius: 6px;
  font-weight: 500;
  transition: all 0.15s;
}

/* Band buttons: colored left border + light tint */
.band-btn {
  border-left: 3px solid var(--band-color);
  background: #fff;
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.band-btn:hover {
  background: color-mix(in srgb, var(--band-color) 8%, #fff);
  border-color: var(--band-color);
  color: var(--band-color);
}

.band-wave {
  font-size: 10px;
  color: #bbb;
  font-weight: 400;
}

/* Operator buttons */
.op-btn {
  min-width: 36px;
  font-size: 15px;
  font-weight: 600;
  background: #fff;
  text-align: center;
  justify-content: center;
}

.op-btn:hover {
  background: #e6f4ff;
  color: #1890ff;
  border-color: #91caff;
}

/* Function / constant buttons */
.fn-btn {
  font-family: 'SFMono-Regular', Consolas, monospace;
  font-size: 11px;
  background: #fff;
}

.fn-btn:hover {
  background: #f6ffed;
  color: #389e0d;
  border-color: #b7eb8f;
}

.mb-8 {
  margin-bottom: 8px;
}

.mb-0 {
  margin-bottom: 0;
}

.submit-btn {
  border-radius: 8px;
  font-weight: 500;
  height: 44px;
}

/* ===== Right Sider: Job Queue ===== */
.right-sider {
  background: #fff !important;
  border-left: 1px solid #f0f0f0;
  overflow: hidden;
}

.right-sider :deep(.ant-layout-sider-children) {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
}

/* Collapsed strip */
.collapsed-strip {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding-top: 16px;
  gap: 12px;
  cursor: pointer;
  height: 100%;
  transition: background 0.2s;
}

.collapsed-strip:hover {
  background: #f5f5f5;
}

.collapsed-icon {
  font-size: 18px;
  color: #666;
}

.collapsed-label {
  writing-mode: vertical-lr;
  font-size: 12px;
  color: #999;
  letter-spacing: 2px;
}

/* Queue panel (expanded) */
.queue-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
}

.queue-header {
  padding: 12px 12px 10px;
  border-bottom: 1px solid #f0f0f0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-shrink: 0;
}

.queue-title {
  font-size: 16px;
  font-weight: 600;
  color: #333;
  display: flex;
  align-items: center;
  gap: 8px;
}

.queue-badge :deep(.ant-badge-count) {
  font-size: 10px;
  box-shadow: none;
}

.queue-body {
  flex: 1;
  overflow-y: auto;
  padding: 8px;
}

.queue-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 40px 0;
  color: #ccc;
}

.empty-icon {
  font-size: 36px;
  margin-bottom: 8px;
}

.queue-empty p {
  font-size: 13px;
  color: #bbb;
  margin: 0;
}

/* Job cards */
.job-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.job-card {
  padding: 10px 12px 8px;
  border: 1px solid #f0f0f0;
  border-radius: 8px;
  background: #fafafa;
  transition: border-color 0.2s, box-shadow 0.2s;
}

.job-card:hover {
  border-color: #d9d9d9;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
}

.job-running   { border-left: 3px solid #1890ff; background: #f0f7ff; }
.job-completed { border-left: 3px solid #52c41a; }
.job-failed    { border-left: 3px solid #ff4d4f; background: #fff2f0; }
.job-cancelled { border-left: 3px solid #faad14; }

.job-row-main {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 4px;
}

.job-name {
  font-weight: 600;
  font-size: 13px;
  color: #333;
}

.job-formula {
  margin-bottom: 4px;
}

.job-formula code {
  font-size: 11px;
  color: #666;
  background: #fff;
  border: 1px solid #eee;
  padding: 1px 6px;
  border-radius: 4px;
  word-break: break-all;
}

.job-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 4px;
  font-size: 11px;
  color: #999;
}

.job-file {
  display: flex;
  align-items: center;
  gap: 3px;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
}

.job-time {
  flex-shrink: 0;
  margin-left: 8px;
}

.job-progress {
  margin: 4px 0;
}

.job-alert {
  margin: 4px 0;
  padding: 4px 8px;
  font-size: 11px;
}

.job-alert :deep(.ant-alert-message) {
  font-size: 11px;
}

.job-toolbar {
  display: flex;
  align-items: center;
  gap: 2px;
  margin-top: 4px;
  padding-top: 4px;
  border-top: 1px solid #f5f5f5;
}

.toolbar-spacer {
  flex: 1;
}

/* ===== PNG Preview Modal ===== */
.preview-body {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.preview-img-wrap {
  display: flex;
  justify-content: center;
  min-height: 80px;
}

.preview-img {
  max-width: 100%;
  max-height: 460px;
  object-fit: contain;
  border-radius: 6px;
  border: 1px solid #f0f0f0;
}

.preview-stats {
  margin-top: 4px;
}

.preview-footer {
  display: flex;
  justify-content: center;
}

/* ===== AI Model Section ===== */
.ai-section {
  padding: 0 !important;
}

.ai-layout {
  height: 100%;
  background: transparent;
}

.model-list-sider {
  background: #fff !important;
  border-right: 1px solid #f0f0f0;
}

.model-list-sider :deep(.ant-layout-sider-children) {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
}

.model-list-header {
  padding: 12px;
  border-bottom: 1px solid #f0f0f0;
  display: flex;
  flex-direction: column;
  gap: 8px;
  flex-shrink: 0;
}

.model-type-tabs {
  display: flex;
}

.model-type-tabs :deep(.ant-radio-button-wrapper) {
  font-size: 12px;
  padding: 0 8px;
}

.model-count {
  font-size: 12px;
  color: #999;
}

.model-list-body {
  flex: 1;
  overflow-y: auto;
  padding: 8px;
  scrollbar-width: none;
}

.model-list-body::-webkit-scrollbar {
  display: none;
}

.model-list-loading {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 60px 0;
}

.model-list-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 40px 0;
  gap: 8px;
  color: #bbb;
}

.model-list-empty p {
  margin: 0;
  font-size: 13px;
}

/* Model Card */
.model-card {
  padding: 10px 12px;
  border: 1px solid #f0f0f0;
  border-radius: 8px;
  margin-bottom: 6px;
  cursor: pointer;
  background: #fafafa;
  transition: all 0.2s;
}

.model-card:hover {
  border-color: #d9d9d9;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.06);
}

.model-card-active {
  border-color: #1890ff;
  background: #e6f4ff;
  box-shadow: 0 0 0 1px #1890ff20;
}

.model-card-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 4px;
}

.model-card-name {
  font-weight: 600;
  font-size: 13px;
  color: #333;
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.model-type-tag {
  flex-shrink: 0;
  font-size: 11px;
  line-height: 18px;
  padding: 0 6px;
  border-radius: 4px;
}

.model-card-desc {
  font-size: 12px;
  color: #888;
  line-height: 1.5;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  margin-bottom: 6px;
}

.model-card-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 11px;
  color: #bbb;
}

.model-card-meta span {
  display: flex;
  align-items: center;
  gap: 3px;
}

/* Model Detail */
.model-detail-content {
  background: #fff;
  overflow-y: auto;
  scrollbar-width: none;
}

.model-detail-content::-webkit-scrollbar {
  display: none;
}

.model-detail-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  gap: 12px;
  color: #bbb;
}

.model-detail-empty p {
  margin: 0;
  font-size: 14px;
}

.model-detail-panel {
  padding: 20px 24px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.model-detail-header {
  padding-bottom: 16px;
  border-bottom: 1px solid #f0f0f0;
}

.model-detail-title-row {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 6px;
}

.model-detail-name {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
  color: #1d1d1d;
}

.model-type-tag-lg {
  font-size: 12px;
  padding: 1px 8px;
  border-radius: 4px;
}

.model-detail-code {
  font-size: 13px;
  color: #999;
}

.detail-card {
  border-radius: 8px;
}

.detail-card :deep(.ant-card-head) {
  min-height: auto;
  padding: 8px 16px;
  border-bottom: 1px solid #f5f5f5;
}

.detail-card :deep(.ant-card-head-title) {
  padding: 0;
  font-size: 14px;
  font-weight: 600;
  color: #555;
  display: flex;
  align-items: center;
  gap: 6px;
}

.detail-card-icon {
  color: #1890ff;
}

.detail-card :deep(.ant-card-body) {
  padding: 12px 16px;
}

.model-desc-text {
  margin: 0;
  font-size: 13px;
  line-height: 1.8;
  color: #555;
}

/* Info Grid */
.detail-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.detail-grid-item {
  padding: 12px 16px;
  background: #fafbfc;
  border: 1px solid #f0f0f0;
  border-radius: 8px;
}

.detail-grid-label {
  font-size: 12px;
  color: #999;
  margin-bottom: 6px;
}

.detail-grid-value {
  font-size: 13px;
  color: #333;
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  align-items: center;
}

.detail-grid-number {
  font-size: 20px;
  font-weight: 600;
  color: #1890ff;
}

.run-model-btn {
  border-radius: 8px;
  font-weight: 500;
  height: 44px;
  margin-top: 8px;
}
</style>
