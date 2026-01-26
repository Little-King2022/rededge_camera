<template>
  <a-card :title="t('alignment.single.title')">
    <a-form layout="vertical">
      <!-- Select Images -->
      <a-form-item :label="t('alignment.single.selectImages')">
        <a-input-group compact>
          <a-input
            :value="imagePathsText"
            style="width: calc(100% - 80px)"
            :placeholder="t('alignment.single.selectImagesPlaceholder')"
            readonly
          />
          <a-button @click="selectImages">
            {{ t('common.browse') }}
          </a-button>
        </a-input-group>
      </a-form-item>

      <!-- Warp Matrix Selection -->
      <a-form-item :label="t('alignment.single.warpMatrix')">
        <a-select
          v-model:value="config.warpMatrixId"
          :placeholder="t('alignment.single.selectWarpMatrix')"
          style="width: 100%"
        >
          <a-select-option
            v-for="matrix in warpMatrices"
            :key="matrix.id"
            :value="matrix.id"
          >
            {{ matrix.camera_serial }} - {{ matrix.alignment_method }}
            <a-tag v-if="matrix.is_active" color="green" size="small">{{ t('alignment.single.active') }}</a-tag>
          </a-select-option>
        </a-select>
      </a-form-item>

      <!-- Output Path -->
      <a-form-item :label="t('alignment.single.outputPath')">
        <a-input-group compact>
          <a-input
            v-model:value="config.outputPath"
            style="width: calc(100% - 80px)"
            :placeholder="t('alignment.single.outputPathPlaceholder')"
            readonly
          />
          <a-button @click="selectOutputPath">
            {{ t('common.browse') }}
          </a-button>
        </a-input-group>
      </a-form-item>

      <!-- Options -->
      <a-divider>{{ t('alignment.single.options') }}</a-divider>

      <a-form-item>
        <a-checkbox v-model:checked="config.options.sortByWavelength">
          {{ t('alignment.single.sortByWavelength') }}
        </a-checkbox>
      </a-form-item>

      <a-form-item>
        <a-checkbox v-model:checked="config.options.generateRgbPreview">
          {{ t('alignment.single.generateRgbPreview') }}
        </a-checkbox>
      </a-form-item>

      <a-form-item>
        <a-checkbox v-model:checked="config.options.generateNdvi">
          {{ t('alignment.single.generateNdvi') }}
        </a-checkbox>
      </a-form-item>

      <!-- Align Button -->
      <a-form-item>
        <a-button
          type="primary"
          block
          :disabled="!canAlign || disabled"
          :loading="loading"
          @click="handleAlign"
        >
          {{ t('alignment.single.align') }}
        </a-button>
      </a-form-item>
    </a-form>
  </a-card>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

const props = defineProps({
  warpMatrices: {
    type: Array,
    default: () => []
  },
  disabled: {
    type: Boolean,
    default: false
  },
  loading: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['align'])

const config = ref({
  imagePaths: [],
  warpMatrixId: null,
  outputPath: '',
  options: {
    sortByWavelength: true,
    generateRgbPreview: true,
    generateNdvi: false
  }
})

const imagePathsText = computed(() => {
  if (config.value.imagePaths.length === 0) return ''
  return `${config.value.imagePaths.length} ${t('alignment.single.filesSelected')}`
})

const canAlign = computed(() => {
  return config.value.imagePaths.length >= 5 &&
         config.value.warpMatrixId &&
         config.value.outputPath
})

async function selectImages() {
  const result = await window.electronAPI.alignment.selectImages()
  if (result.success) {
    config.value.imagePaths = result.filePaths.sort().slice(0, 5)
  }
}

async function selectOutputPath() {
  const result = await window.electronAPI.alignment.selectOutputDirectory()
  if (result.success) {
    // Generate output filename
    const now = new Date()
    const year = now.getFullYear()
    const month = String(now.getMonth() + 1).padStart(2, '0')
    const day = String(now.getDate()).padStart(2, '0')
    const hour = String(now.getHours()).padStart(2, '0')
    const minute = String(now.getMinutes()).padStart(2, '0')
    const second = String(now.getSeconds()).padStart(2, '0')
    const timestamp = `${year}${month}${day}_${hour}${minute}${second}`
    // If Windows, use backslashes
    const isWindows = window.navigator.platform.indexOf('Win') > -1
    if (isWindows) {
      config.value.outputPath = `${result.directory}\\aligned_${timestamp}.tif`
      return
    }
    config.value.outputPath = `${result.directory}/aligned_${timestamp}.tif`
  }
}

function handleAlign() {
  emit('align', {
    imagePaths: config.value.imagePaths,
    warpMatrixId: config.value.warpMatrixId,
    outputPath: config.value.outputPath,
    options: config.value.options
  })
}
</script>
