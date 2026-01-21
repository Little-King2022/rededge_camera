<template>
  <a-table
    :columns="columns"
    :data-source="jobs"
    :loading="loading"
    :pagination="{ pageSize: 10 }"
    row-key="id"
    size="small"
  >
    <template #bodyCell="{ column, record }">
      <template v-if="column.key === 'id'">
        #{{ record.id }}
      </template>

      <template v-else-if="column.key === 'type'">
        <a-tag :color="record.job_type === 'batch' ? 'blue' : 'cyan'">
          {{ record.job_type === 'batch' ? t('alignment.jobs.batch') : t('alignment.jobs.single') }}
        </a-tag>
      </template>

      <template v-else-if="column.key === 'captures'">
        {{ record.processed_captures }} / {{ record.total_captures }}
      </template>

      <template v-else-if="column.key === 'status'">
        <a-tag :color="getStatusColor(record.status)">
          {{ t(`alignment.jobs.status.${record.status}`) }}
        </a-tag>
      </template>

      <template v-else-if="column.key === 'createdAt'">
        {{ formatDate(record.created_at) }}
      </template>

      <template v-else-if="column.key === 'duration'">
        {{ calculateDuration(record) }}
      </template>
    </template>

    <template #emptyText>
      <a-empty :description="t('alignment.jobs.empty')" />
    </template>
  </a-table>
</template>

<script setup>
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

defineProps({
  jobs: {
    type: Array,
    default: () => []
  },
  loading: {
    type: Boolean,
    default: false
  }
})

const columns = [
  {
    title: t('alignment.jobs.id'),
    key: 'id',
    width: 80
  },
  {
    title: t('alignment.jobs.type'),
    key: 'type',
    width: 100
  },
  {
    title: t('alignment.jobs.captures'),
    key: 'captures',
    width: 100
  },
  {
    title: t('alignment.jobs.statusCol'),
    key: 'status',
    width: 100
  },
  {
    title: t('alignment.jobs.createdAt'),
    key: 'createdAt',
    width: 150
  },
  {
    title: t('alignment.jobs.duration'),
    key: 'duration',
    width: 100
  }
]

function getStatusColor(status) {
  switch (status) {
    case 'completed': return 'success'
    case 'running': return 'processing'
    case 'failed': return 'error'
    case 'cancelled': return 'warning'
    case 'pending': return 'default'
    default: return 'default'
  }
}

function formatDate(dateStr) {
  if (!dateStr) return '-'
  const date = new Date(dateStr)
  return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

function calculateDuration(job) {
  if (!job.started_at) return '-'

  const start = new Date(job.started_at)
  const end = job.completed_at ? new Date(job.completed_at) : new Date()
  const diffMs = end - start
  const diffSec = Math.floor(diffMs / 1000)

  if (diffSec < 60) {
    return `${diffSec}s`
  } else if (diffSec < 3600) {
    const min = Math.floor(diffSec / 60)
    const sec = diffSec % 60
    return `${min}m ${sec}s`
  } else {
    const hr = Math.floor(diffSec / 3600)
    const min = Math.floor((diffSec % 3600) / 60)
    return `${hr}h ${min}m`
  }
}
</script>
