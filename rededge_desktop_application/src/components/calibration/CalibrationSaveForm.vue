<template>
  <a-form layout="vertical">
    <a-form-item :label="t('calibration.save.serial')">
      <a-input :value="detection?.serial" disabled />
    </a-form-item>

    <a-form-item :label="t('calibration.save.notes')">
      <a-textarea
        v-model:value="formData.notes"
        :placeholder="t('calibration.save.notesPlaceholder')"
        :rows="3"
      />
    </a-form-item>

    <a-form-item>
      <a-checkbox v-model:checked="formData.setAsActive">
        {{ t('calibration.save.setAsActive') }}
      </a-checkbox>
    </a-form-item>
  </a-form>
</template>

<script setup>
import { ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

const props = defineProps({
  detection: {
    type: Object,
    default: null
  }
})

const formData = ref({
  notes: '',
  setAsActive: true
})

watch(() => props.detection, () => {
  formData.value = {
    notes: '',
    setAsActive: true
  }
})

function getFormData() {
  return { ...formData.value }
}

defineExpose({ getFormData })
</script>
