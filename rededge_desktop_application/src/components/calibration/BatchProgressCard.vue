<template>
  <a-card :title="t('calibration.batch.progress.title')">
    <template v-if="job">
      <a-space direction="vertical" :size="16" style="width: 100%">
        <!-- Status -->
        <a-row>
          <a-col :span="8">
            <a-statistic :title="t('calibration.batch.progress.status')">
              <template #formatter>
                <a-tag :color="statusColor">{{ statusText }}</a-tag>
              </template>
            </a-statistic>
          </a-col>
          <a-col :span="8">
            <a-statistic
              :title="t('calibration.batch.progress.processed')"
              :value="job.processedCaptures"
              :suffix="`/ ${job.totalCaptures}`"
            />
          </a-col>
          <a-col :span="8">
            <a-statistic
              :title="t('calibration.batch.progress.progress')"
              :value="job.progress"
              suffix="%"
              :precision="1"
            />
          </a-col>
        </a-row>

        <!-- Progress Bar -->
        <a-progress
          :percent="job.progress"
          :status="progressStatus"
          :stroke-color="progressColor"
        />

        <!-- Current Capture -->
        <div v-if="job.currentCapture" class="current-capture">
          {{ t('calibration.batch.progress.currentCapture') }}: {{ job.currentCapture }}
        </div>

        <!-- Error Message -->
        <a-alert
          v-if="job.errorMessage"
          type="error"
          :message="job.errorMessage"
          show-icon
        />

        <!-- Cancel Button -->
        <a-button
          v-if="job.status === 'running'"
          danger
          block
          @click="$emit('cancel')"
        >
          {{ t('calibration.batch.progress.cancel') }}
        </a-button>
      </a-space>
    </template>

    <template v-else>
      <a-empty :description="t('calibration.batch.progress.noJob')" />
    </template>
  </a-card>
</template>

<script setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

const props = defineProps({
  job: {
    type: Object,
    default: null
  }
})

defineEmits(['cancel'])

const statusColor = computed(() => {
  if (!props.job) return 'default'
  switch (props.job.status) {
    case 'running': return 'processing'
    case 'completed': return 'success'
    case 'failed': return 'error'
    case 'cancelled': return 'warning'
    default: return 'default'
  }
})

const statusText = computed(() => {
  if (!props.job) return ''
  return t(`calibration.batch.progress.statusText.${props.job.status}`)
})

const progressStatus = computed(() => {
  if (!props.job) return 'normal'
  switch (props.job.status) {
    case 'running': return 'active'
    case 'completed': return 'success'
    case 'failed': return 'exception'
    default: return 'normal'
  }
})

const progressColor = computed(() => {
  if (!props.job) return undefined
  switch (props.job.status) {
    case 'running': return { from: '#52796f', to: '#6b9080' }
    case 'completed': return '#6b9080'
    case 'failed': return '#a44a3f'
    default: return undefined
  }
})
</script>

<style scoped>
.current-capture {
  color: #666;
  font-size: 13px;
}
</style>
