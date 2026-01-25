<template>
    <!-- Workflow Info Alert -->
    <a-alert
      type="info"
      show-icon
      class="workflow-alert"
      closable
    >
      <template #message>
        <strong>{{ t('alignment.workflow.title') }}</strong>
      </template>
      <template #description>
        <div>{{ t('alignment.workflow.step1') }}</div>
        <div>{{ t('alignment.workflow.step2') }}</div>
        <div class="workflow-note">
          <!-- <InfoCircleOutlined /> -->
          {{ t('alignment.workflow.note') }}
        </div>
      </template>
    </a-alert>
</template>

<script setup>
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
</script>

<style scoped>
.workflow-alert {
  margin-bottom: 8px;
}

.workflow-note {
  margin-top: 8px;
  padding: 8px;
  background: #f0f5ff;
  border-radius: 4px;
  color: #1890ff;
}

.workflow-note :deep(.anticon) {
  margin-right: 0px;
}
</style>