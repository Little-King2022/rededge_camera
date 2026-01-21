<template>
  <a-card :title="t('alignment.preview.title')">
    <template v-if="result">
      <a-space direction="vertical" :size="16" style="width: 100%">
        <!-- Success Status -->
        <a-alert
          type="success"
          :message="t('alignment.preview.success')"
          show-icon
        />

        <!-- Output Info -->
        <a-descriptions :column="1" size="small" bordered>
          <a-descriptions-item :label="t('alignment.preview.outputPath')">
            <a-typography-text :ellipsis="{ tooltip: result.output_path }">
              {{ result.output_path }}
            </a-typography-text>
          </a-descriptions-item>

          <a-descriptions-item v-if="result.cropped_dimensions" :label="t('alignment.preview.dimensions')">
            {{ result.cropped_dimensions[2] }} x {{ result.cropped_dimensions[3] }}
          </a-descriptions-item>

          <a-descriptions-item v-if="result.rgb_preview_path" :label="t('alignment.preview.rgbPreview')">
            <a-typography-text :ellipsis="{ tooltip: result.rgb_preview_path }">
              {{ result.rgb_preview_path }}
            </a-typography-text>
          </a-descriptions-item>

          <a-descriptions-item v-if="result.ndvi_path" :label="t('alignment.preview.ndviPath')">
            <a-typography-text :ellipsis="{ tooltip: result.ndvi_path }">
              {{ result.ndvi_path }}
            </a-typography-text>
          </a-descriptions-item>
        </a-descriptions>

        <!-- Open Folder Button -->
        <a-button type="primary" @click="openFolder">
          <template #icon><FolderOpenOutlined /></template>
          {{ t('alignment.preview.openFolder') }}
        </a-button>
      </a-space>
    </template>

    <template v-else>
      <a-empty :description="t('alignment.preview.noResult')" />
    </template>
  </a-card>
</template>

<script setup>
import { useI18n } from 'vue-i18n'
import { FolderOpenOutlined } from '@ant-design/icons-vue'
import { message } from 'ant-design-vue'

const { t } = useI18n()

const props = defineProps({
  result: {
    type: Object,
    default: null
  }
})

async function openFolder() {
  if (!props.result?.output_path) return

  try {
    // Extract directory from output path
    const dir = props.result.output_path.substring(0, props.result.output_path.lastIndexOf('/'))
    await window.electronAPI.app.openExternal(`file://${dir}`)
  } catch (e) {
    message.error(t('alignment.preview.openFolderFailed'))
  }
}
</script>
