<template>
  <div v-if="record" class="calibration-details">
    <a-descriptions :column="2" bordered size="small">
      <a-descriptions-item :label="t('calibration.details.serial')" :span="2">
        <a-typography-text copyable>{{ record.serial }}</a-typography-text>
      </a-descriptions-item>

      <a-descriptions-item :label="t('calibration.details.version')">
        v{{ record.panel_version }}
      </a-descriptions-item>

      <a-descriptions-item :label="t('calibration.details.status')">
        <a-tag v-if="record.is_active" color="green">{{ t('calibration.details.active') }}</a-tag>
        <a-tag v-else color="default">{{ t('calibration.details.inactive') }}</a-tag>
      </a-descriptions-item>

      <a-descriptions-item :label="t('calibration.details.minWavelength')">
        {{ record.min_wavelength }} nm
      </a-descriptions-item>

      <a-descriptions-item :label="t('calibration.details.maxWavelength')">
        {{ record.max_wavelength }} nm
      </a-descriptions-item>

      <a-descriptions-item :label="t('calibration.details.minReflectance')">
        {{ formatPercent(record.min_reflectance) }}
      </a-descriptions-item>

      <a-descriptions-item :label="t('calibration.details.maxReflectance')">
        {{ formatPercent(record.max_reflectance) }}
      </a-descriptions-item>

      <a-descriptions-item :label="t('calibration.details.createdAt')" :span="2">
        {{ formatDate(record.created_at) }}
      </a-descriptions-item>

      <a-descriptions-item v-if="record.notes" :label="t('calibration.details.notes')" :span="2">
        {{ record.notes }}
      </a-descriptions-item>
    </a-descriptions>

    <!-- Band Reflectances -->
    <div v-if="bandData.length > 0" class="band-section">
      <a-divider>{{ t('calibration.details.bandReflectances') }}</a-divider>
      <a-table
        :columns="bandColumns"
        :data-source="bandData"
        :pagination="false"
        size="small"
      >
        <template #bodyCell="{ column, record: band }">
          <template v-if="column.key === 'reflectance'">
            {{ formatPercent(band.reflectance) }}
          </template>
          <template v-else-if="column.key === 'irradiance'">
            {{ band.irradiance ? band.irradiance.toFixed(4) : '-' }}
          </template>
        </template>
      </a-table>
    </div>
  </div>
  <a-empty v-else :description="t('calibration.details.noRecord')" />
</template>

<script setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

const props = defineProps({
  record: {
    type: Object,
    default: null
  }
})

const bandColumns = [
  { title: t('calibration.details.band'), dataIndex: 'name', key: 'name', width: 100 },
  { title: t('calibration.details.wavelength'), dataIndex: 'wavelength', key: 'wavelength', width: 100 },
  { title: t('calibration.details.reflectance'), key: 'reflectance', width: 100 },
  { title: t('calibration.details.irradiance'), key: 'irradiance', width: 120 }
]

const bandData = computed(() => {
  if (!props.record) return []

  const bands = ['Blue', 'Green', 'Red', 'RedEdge', 'NIR']
  const wavelengths = [475, 560, 668, 717, 842]
  const reflectances = props.record.band_reflectances || {}
  const irradiances = props.record.panel_irradiance || []

  return bands.map((name, index) => ({
    key: index,
    name,
    wavelength: `${wavelengths[index]} nm`,
    reflectance: reflectances[index],
    irradiance: irradiances[index]
  }))
})

function formatPercent(value) {
  if (value === undefined || value === null) return '-'
  return `${(value * 100).toFixed(2)}%`
}

function formatDate(dateStr) {
  if (!dateStr) return '-'
  const date = new Date(dateStr)
  return date.toLocaleString()
}
</script>

<style scoped>
.calibration-details {
  max-height: 500px;
  overflow: auto;
}

.band-section {
  margin-top: 16px;
}
</style>
