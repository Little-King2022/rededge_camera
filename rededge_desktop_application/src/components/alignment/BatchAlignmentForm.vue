<template>
  <a-card :title="t('alignment.batch.title')">
    <a-form layout="vertical">
      <!-- Input Directory -->
      <a-form-item :label="t('alignment.batch.inputDirectory')">
        <a-input-group compact>
          <a-input
            v-model:value="config.inputDirectory"
            style="width: calc(100% - 80px)"
            :placeholder="t('alignment.batch.selectInputDir')"
            readonly
          />
          <a-button @click="selectInputDirectory">
            {{ t('common.browse') }}
          </a-button>
        </a-input-group>
      </a-form-item>

      <!-- Output Directory -->
      <a-form-item :label="t('alignment.batch.outputDirectory')">
        <a-input-group compact>
          <a-input
            v-model:value="config.outputDirectory"
            style="width: calc(100% - 80px)"
            :placeholder="t('alignment.batch.selectOutputDir')"
            readonly
          />
          <a-button @click="selectOutputDirectory">
            {{ t('common.browse') }}
          </a-button>
        </a-input-group>
      </a-form-item>

      <!-- Warp Matrix Selection -->
      <a-form-item :label="t('alignment.batch.warpMatrix')">
        <a-select
          v-model:value="config.warpMatrixId"
          :placeholder="t('alignment.batch.selectWarpMatrix')"
          style="width: 100%"
        >
          <a-select-option
            v-for="matrix in warpMatrices"
            :key="matrix.id"
            :value="matrix.id"
          >
            {{ matrix.camera_serial }} - {{ matrix.alignment_method }}
            <a-tag v-if="matrix.is_active" color="green" size="small">{{ t('alignment.batch.active') }}</a-tag>
          </a-select-option>
        </a-select>
      </a-form-item>

      <!-- Options -->
      <a-divider>{{ t('alignment.batch.options') }}</a-divider>

      <a-form-item>
        <a-checkbox v-model:checked="config.options.sortByWavelength">
          {{ t('alignment.batch.sortByWavelength') }}
        </a-checkbox>
      </a-form-item>

      <a-form-item>
        <a-checkbox v-model:checked="config.options.generateRgbPreview">
          {{ t('alignment.batch.generateRgbPreview') }}
        </a-checkbox>
      </a-form-item>

      <a-form-item>
        <a-checkbox v-model:checked="config.options.generateNdvi">
          {{ t('alignment.batch.generateNdvi') }}
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
          {{ t('alignment.batch.start') }}
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
  }
})

const emit = defineEmits(['start'])

const config = ref({
  inputDirectory: '',
  outputDirectory: '',
  warpMatrixId: null,
  options: {
    sortByWavelength: true,
    generateRgbPreview: true,
    generateNdvi: false
  }
})

const canStart = computed(() => {
  return config.value.inputDirectory &&
         config.value.outputDirectory &&
         config.value.warpMatrixId
})

async function selectInputDirectory() {
  const result = await window.electronAPI.alignment.selectInputDirectory()
  if (result.success) {
    config.value.inputDirectory = result.directory
  }
}

async function selectOutputDirectory() {
  const result = await window.electronAPI.alignment.selectOutputDirectory()
  if (result.success) {
    config.value.outputDirectory = result.directory
  }
}

function handleStart() {
  emit('start', {
    inputDirectory: config.value.inputDirectory,
    outputDirectory: config.value.outputDirectory,
    warpMatrixId: config.value.warpMatrixId,
    options: config.value.options
  })
}
</script>
