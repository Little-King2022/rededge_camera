<template>
  <a-table
    :columns="columns"
    :data-source="records"
    :loading="loading"
    :pagination="{ pageSize: 10 }"
    row-key="id"
    size="small"
  >
    <template #bodyCell="{ column, record }">
      <template v-if="column.key === 'serial'">
        <a-typography-text :ellipsis="{ tooltip: record.serial }">
          {{ record.serial }}
        </a-typography-text>
      </template>

      <template v-else-if="column.key === 'version'">
        v{{ record.panel_version }}
      </template>

      <template v-else-if="column.key === 'reflectance'">
        {{ formatReflectanceRange(record) }}
      </template>

      <template v-else-if="column.key === 'status'">
        <a-tag v-if="record.id === activeId" color="green">
          {{ t('calibration.records.active') }}
        </a-tag>
        <a-tag v-else color="default">
          {{ t('calibration.records.inactive') }}
        </a-tag>
      </template>

      <template v-else-if="column.key === 'createdAt'">
        {{ formatDate(record.created_at) }}
      </template>

      <template v-else-if="column.key === 'actions'">
        <a-space>
          <a-button
            v-if="record.id !== activeId"
            type="link"
            size="small"
            @click="$emit('activate', record.id)"
          >
            {{ t('calibration.records.activate') }}
          </a-button>
          <a-button
            type="link"
            size="small"
            @click="$emit('view', record)"
          >
            {{ t('calibration.records.view') }}
          </a-button>
          <a-button
            type="link"
            size="small"
            danger
            @click="$emit('delete', record.id)"
          >
            {{ t('common.delete') }}
          </a-button>
        </a-space>
      </template>
    </template>

    <template #emptyText>
      <a-empty :description="t('calibration.records.empty')" />
    </template>
  </a-table>
</template>

<script setup>
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

defineProps({
  records: {
    type: Array,
    default: () => []
  },
  activeId: {
    type: Number,
    default: null
  },
  loading: {
    type: Boolean,
    default: false
  }
})

defineEmits(['activate', 'delete', 'view'])

const columns = [
  {
    title: t('calibration.records.serial'),
    key: 'serial',
    width: 200,
    ellipsis: true
  },
  {
    title: t('calibration.records.version'),
    key: 'version',
    width: 80
  },
  {
    title: t('calibration.records.reflectance'),
    key: 'reflectance',
    width: 150
  },
  {
    title: t('calibration.records.status'),
    key: 'status',
    width: 100
  },
  {
    title: t('calibration.records.createdAt'),
    key: 'createdAt',
    width: 150
  },
  {
    title: t('common.actions'),
    key: 'actions',
    width: 200
  }
]

function formatReflectanceRange(record) {
  if (!record.min_reflectance || !record.max_reflectance) {
    return '-'
  }
  const min = (record.min_reflectance * 100).toFixed(1)
  const max = (record.max_reflectance * 100).toFixed(1)
  return `${min}% - ${max}%`
}

function formatDate(dateStr) {
  if (!dateStr) return '-'
  const date = new Date(dateStr)
  return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}
</script>
