<template>
  <a-card :title="t('alignment.generate.title')">
    <a-space direction="vertical" :size="16" style="width: 100%">
      <!-- Select Images Button -->
      <a-button
        type="primary"
        block
        :disabled="disabled || isComputing"
        @click="$emit('select-images')"
      >
        <template #icon><FolderOpenOutlined /></template>
        {{ t('alignment.generate.selectImages') }}
      </a-button>

      <!-- Selected Images Info -->
      <div v-if="cameraInfo" class="selected-info">
        <a-tag color="green">{{ cameraInfo.camera_model }}</a-tag>
        <span class="serial">{{ cameraInfo.camera_serial }}</span>
      </div>

      <!-- Method Selection -->
      <a-form-item :label="t('alignment.generate.method')">
        <a-radio-group v-model:value="options.method" :disabled="!cameraInfo || isComputing">
          <a-radio-button value="opencv">OpenCV (ECC)</a-radio-button>
          <a-radio-button value="sift">SIFT</a-radio-button>
        </a-radio-group>
        <div class="method-hint">
          {{ options.method === 'opencv' ? t('alignment.generate.opencvHint') : t('alignment.generate.siftHint') }}
        </div>
      </a-form-item>

      <!-- Reference Band -->
      <a-form-item :label="t('alignment.generate.referenceBand')">
        <a-select v-model:value="options.referenceBand" :disabled="!cameraInfo || isComputing" style="width: 100%">
          <a-select-option v-for="band in bandOptions" :key="band.value" :value="band.value">
            {{ band.label }}
          </a-select-option>
        </a-select>
      </a-form-item>

      <!-- Progress -->
      <template v-if="progress">
        <a-alert
          :type="progress.status === 'completed' ? 'success' : (progress.status === 'failed' ? 'error' : 'info')"
          :message="progress.message"
          show-icon
        />
      </template>

      <!-- Action Buttons -->
      <a-space>
        <a-button
          type="primary"
          :loading="isComputing"
          :disabled="!cameraInfo || disabled"
          @click="handleCompute"
        >
          {{ t('alignment.generate.compute') }}
        </a-button>
        <a-button :disabled="!cameraInfo || isComputing" @click="$emit('clear')">
          {{ t('common.clear') }}
        </a-button>
      </a-space>
    </a-space>
  </a-card>
</template>

<script setup>
import { ref, watch, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { FolderOpenOutlined } from '@ant-design/icons-vue'

const { t } = useI18n()

const props = defineProps({
  disabled: {
    type: Boolean,
    default: false
  },
  isComputing: {
    type: Boolean,
    default: false
  },
  cameraInfo: {
    type: Object,
    default: null
  },
  progress: {
    type: Object,
    default: null
  }
})

const emit = defineEmits(['select-images', 'compute', 'clear'])

const options = ref({
  method: 'opencv',
  referenceBand: 1
})

// Update recommended method when camera info changes
watch(() => props.cameraInfo, (info) => {
  if (info?.recommended_method) {
    options.value.method = info.recommended_method
  }
})

const bandOptions = computed(() => {
  if (!props.cameraInfo?.bands) {
    return [
      { value: 0, label: 'Band 1 - Blue (475nm)' },
      { value: 1, label: 'Band 2 - Green (560nm)' },
      { value: 2, label: 'Band 3 - Red (668nm)' },
      { value: 3, label: 'Band 4 - RedEdge (717nm)' },
      { value: 4, label: 'Band 5 - NIR (842nm)' }
    ]
  }

  return props.cameraInfo.bands.map((band, index) => ({
    value: index,
    label: `Band ${index + 1} - ${band.name} (${band.wavelength}nm)`
  }))
})

function handleCompute() {
  emit('compute', { ...options.value })
}
</script>

<style scoped>
.selected-info {
  display: flex;
  align-items: center;
  gap: 8px;
}

.serial {
  color: #666;
  font-size: 12px;
}

.method-hint {
  color: #888;
  font-size: 12px;
  margin-top: 4px;
}
</style>
