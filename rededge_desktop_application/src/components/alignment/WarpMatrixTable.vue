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
      <template v-if="column.key === 'camera'">
        <div class="camera-info">
          <span class="model">{{ record.camera_model }}</span>
          <span class="serial">{{ record.camera_serial }}</span>
        </div>
      </template>

      <template v-else-if="column.key === 'method'">
        <a-tag :color="record.alignment_method === 'sift' ? 'blue' : 'green'">
          {{ record.alignment_method?.toUpperCase() }}
        </a-tag>
      </template>

      <template v-else-if="column.key === 'quality'">
        <a-progress
          :percent="record.alignment_quality"
          :size="[100, 8]"
          :status="record.alignment_quality >= 90 ? 'success' : (record.alignment_quality >= 70 ? 'normal' : 'exception')"
        />
      </template>

      <template v-else-if="column.key === 'status'">
        <a-tag v-if="record.is_active" color="green">
          {{ t('alignment.records.active') }}
        </a-tag>
        <a-tag v-else color="default">
          {{ t('alignment.records.inactive') }}
        </a-tag>
      </template>

      <template v-else-if="column.key === 'createdAt'">
        {{ formatDate(record.created_at) }}
      </template>

      <template v-else-if="column.key === 'actions'">
        <a-space>
          <a-button
            v-if="!record.is_active"
            type="link"
            size="small"
            @click="$emit('activate', record.id)"
          >
            {{ t('alignment.records.activate') }}
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
      <a-empty :description="t('alignment.records.emptyMatrices')" />
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
  loading: {
    type: Boolean,
    default: false
  }
})

defineEmits(['activate', 'delete'])

const columns = [
  {
    title: t('alignment.records.camera'),
    key: 'camera',
    width: 200
  },
  {
    title: t('alignment.records.method'),
    key: 'method',
    width: 100
  },
  {
    title: t('alignment.records.quality'),
    key: 'quality',
    width: 120
  },
  {
    title: t('alignment.records.status'),
    key: 'status',
    width: 100
  },
  {
    title: t('alignment.records.createdAt'),
    key: 'createdAt',
    width: 150
  },
  {
    title: t('common.actions'),
    key: 'actions',
    width: 150
  }
]

function formatDate(dateStr) {
  if (!dateStr) return '-'
  const date = new Date(dateStr)
  return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}
</script>

<style scoped>
.camera-info {
  display: flex;
  flex-direction: column;
}

.model {
  font-weight: 500;
}

.serial {
  color: #888;
  font-size: 12px;
}
</style>
