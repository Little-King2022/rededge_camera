<template>
  <a-card :title="t('calibration.batch.config.title')">
    <a-form layout="vertical">
      <!-- Input Directory -->
      <a-form-item :label="t('calibration.batch.config.inputDirectory')">
        <a-input-group compact>
          <a-input
            v-model:value="config.inputDirectory"
            style="width: calc(100% - 80px)"
            :placeholder="t('calibration.batch.config.selectInputDir')"
            readonly
          />
          <a-button @click="selectInputDirectory">
            {{ t('common.browse') }}
          </a-button>
        </a-input-group>
      </a-form-item>

      <!-- Output Directory -->
      <a-form-item :label="t('calibration.batch.config.outputDirectory')">
        <a-input-group compact>
          <a-input
            v-model:value="config.outputDirectory"
            style="width: calc(100% - 80px)"
            :placeholder="t('calibration.batch.config.selectOutputDir')"
            readonly
          />
          <a-button @click="selectOutputDirectory">
            {{ t('common.browse') }}
          </a-button>
        </a-input-group>
      </a-form-item>

      <!-- Calibration Selection -->
      <a-form-item :label="t('calibration.batch.config.calibration')">
        <a-select
          v-model:value="config.calibrationId"
          :placeholder="t('calibration.batch.config.selectCalibration')"
          style="width: 100%"
        >
          <a-select-option
            v-for="record in calibrationRecords"
            :key="record.id"
            :value="record.id"
          >
            {{ record.serial }}
            <a-tag v-if="record.is_active" color="green" size="small">{{ t('calibration.batch.config.active') }}</a-tag>
          </a-select-option>
        </a-select>
      </a-form-item>

      <!-- Panel Images (Optional) -->
      <a-form-item :label="t('calibration.batch.config.panelImages')">
        <a-input-group compact>
          <a-input
            :value="panelImagesText"
            style="width: calc(100% - 80px)"
            :placeholder="t('calibration.batch.config.selectPanelImages')"
            readonly
          />
          <a-button @click="selectPanelImages">
            {{ t('common.browse') }}
          </a-button>
        </a-input-group>
        <div class="form-hint">{{ t('calibration.batch.config.panelImagesHint') }}</div>
      </a-form-item>

      <!-- Options -->
      <a-divider>{{ t('calibration.batch.config.options') }}</a-divider>

      <a-form-item>
        <a-checkbox v-model:checked="config.options.generateThumbnails">
          {{ t('calibration.batch.config.generateThumbnails') }}
        </a-checkbox>
      </a-form-item>

      <a-form-item>
        <a-checkbox v-model:checked="config.options.generateRgbPreview">
          {{ t('calibration.batch.config.generateRgbPreview') }}
        </a-checkbox>
      </a-form-item>

      <a-form-item>
        <a-checkbox v-model:checked="config.options.generateNdvi">
          {{ t('calibration.batch.config.generateNdvi') }}
        </a-checkbox>
      </a-form-item>

      <!-- Start Button -->
      <a-form-item>
        <a-button
          type="primary"
          block
          :disabled="!canStart || disabled"
          @click="handleStart"
        >
          {{ t('calibration.batch.config.start') }}
        </a-button>
      </a-form-item>
    </a-form>
  </a-card>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

const props = defineProps({
  calibrationRecords: {
    type: Array,
    default: () => []
  },
  activeCalibration: {
    type: Object,
    default: null
  },
  disabled: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['start'])

const config = ref({
  inputDirectory: '',
  outputDirectory: '',
  calibrationId: null,
  panelImagePaths: [],
  options: {
    generateThumbnails: false,
    generateRgbPreview: true,
    generateNdvi: false
  }
})

// Set default calibration when records load
watch(() => props.activeCalibration, (active) => {
  if (active && !config.value.calibrationId) {
    config.value.calibrationId = active.id
  }
}, { immediate: true })

const panelImagesText = computed(() => {
  if (config.value.panelImagePaths.length === 0) return ''
  return `${config.value.panelImagePaths.length} ${t('calibration.batch.config.filesSelected')}`
})

const canStart = computed(() => {
  return config.value.inputDirectory &&
         config.value.outputDirectory
})

async function selectInputDirectory() {
  const result = await window.electronAPI.batch.selectInputDirectory()
  if (result.success) {
    config.value.inputDirectory = result.directory
  }
}

async function selectOutputDirectory() {
  const result = await window.electronAPI.batch.selectOutputDirectory()
  if (result.success) {
    config.value.outputDirectory = result.directory
  }
}

async function selectPanelImages() {
  const result = await window.electronAPI.calibration.selectPanelImages()
  if (result.success) {
    config.value.panelImagePaths = result.filePaths.sort().slice(0, 5)
  }
}

function handleStart() {
  const selectedCalibration = props.calibrationRecords.find(r => r.id === config.value.calibrationId)

  emit('start', {
    inputDirectory: config.value.inputDirectory,
    outputDirectory: config.value.outputDirectory,
    calibrationId: config.value.calibrationId,
    panelImagePaths: config.value.panelImagePaths.length > 0 ? config.value.panelImagePaths : undefined,
    panelReflectances: selectedCalibration?.band_reflectances ?
      Object.values(selectedCalibration.band_reflectances) : undefined,
    options: config.value.options
  })
}
</script>

<style scoped>
.form-hint {
  color: #888;
  font-size: 12px;
  margin-top: 4px;
}
</style>
