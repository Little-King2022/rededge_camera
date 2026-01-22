<template>
  <div class="qr-scan-result">
    <a-descriptions :column="1" bordered size="small">
      <a-descriptions-item :label="t('calibration.result.serial')">
        <a-typography-text copyable>{{ detection.serial }}</a-typography-text>
      </a-descriptions-item>

      <a-descriptions-item :label="t('calibration.result.version')">
        v{{ detection.panel_version }}
      </a-descriptions-item>

      <a-descriptions-item v-if="detection.camera_model" :label="t('calibration.result.cameraModel')">
        {{ detection.camera_model }}
      </a-descriptions-item>

      <a-descriptions-item v-if="detection.min_wavelength" :label="t('calibration.result.wavelengthRange')">
        {{ detection.min_wavelength }} - {{ detection.max_wavelength }} nm
      </a-descriptions-item>

      <a-descriptions-item v-if="detection.min_reflectance" :label="t('calibration.result.reflectanceRange')">
        {{ formatPercent(detection.min_reflectance) }} - {{ formatPercent(detection.max_reflectance) }}
      </a-descriptions-item>
    </a-descriptions>

    <!-- Band Reflectances -->
    <div v-if="detection.band_reflectances || detection.band_info" class="band-section">
      <a-divider>{{ t('calibration.result.bandReflectances') }}</a-divider>

      <a-table
        :columns="bandColumns"
        :data-source="bandData"
        :pagination="false"
        size="small"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'reflectance'">
            {{ formatPercent(record.reflectance) }}
          </template>
          <template v-else-if="column.key === 'irradiance'">
            {{ record.irradiance ? record.irradiance.toFixed(4) : '-' }}
          </template>
        </template>
      </a-table>
    </div>

    <!-- Actions -->
    <div class="actions">
      <a-space>
        <a-button @click="$emit('clear')">
          {{ t('common.clear') }}
        </a-button>
        <a-button type="primary" @click="$emit('save')">
          {{ t('calibration.result.saveRecord') }}
        </a-button>
      </a-space>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

const props = defineProps({
  detection: {
    type: Object,
    required: true
  }
})

defineEmits(['save', 'clear'])

const bandColumns = [
  { title: t('calibration.result.band'), dataIndex: 'name', key: 'name', width: 100 },
  { title: t('calibration.result.wavelength'), dataIndex: 'wavelength', key: 'wavelength', width: 100 },
  { title: t('calibration.result.reflectance'), key: 'reflectance', width: 100 },
  { title: t('calibration.result.irradiance'), key: 'irradiance', width: 120 }
]

const bandData = computed(() => {
  // From band_info (file detection result)
  if (props.detection.band_info) {
    return props.detection.band_info.map((band, index) => ({
      key: index,
      name: band.name || `Band ${index + 1}`,
      wavelength: band.wavelength ? `${band.wavelength} nm` : '-',
      reflectance: band.reflectance,
      irradiance: band.irradiance
    }))
  }

  // From band_reflectances (QR/serial parse result)
  if (props.detection.band_reflectances) {
    const bands = ['Blue', 'Green', 'Red', 'RedEdge', 'NIR']
    const wavelengths = [475, 560, 668, 717, 842]

    return Object.entries(props.detection.band_reflectances).map(([index, reflectance]) => ({
      key: index,
      name: bands[index] || `Band ${parseInt(index) + 1}`,
      wavelength: `${wavelengths[index]} nm`,
      reflectance,
      irradiance: null
    }))
  }

  return []
})

function formatPercent(value) {
  if (value === undefined || value === null) return '-'
  return `${(value * 100).toFixed(1)}%`
}
</script>

<style scoped>
.qr-scan-result {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.band-section {
  flex: 1;
  overflow: auto;
  margin-top: 16px;
}

.actions {
  margin-top: 16px;
  text-align: right;
}
</style>
