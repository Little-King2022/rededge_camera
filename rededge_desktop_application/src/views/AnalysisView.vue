<template>
    <div class="analysis">
        <h2>{{ t('analysis.title') }}</h2>
        <p>{{ t('analysis.placeholder') }}</p>
    </div>
</template>

<script setup>
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
</script>
