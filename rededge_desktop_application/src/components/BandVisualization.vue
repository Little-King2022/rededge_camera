<template>
  <div class="band-visualization-container">
    <a-row :gutter="16">
      <a-col :span="8">
        <div class="band-image-wrapper">
          <h3 class="image-title">{{ t('status.sensorsLayout') }}</h3>
          <img
            src="/images/1.png"
            :alt="t('status.sensorsLayout')"
            class="band-image"
          />
        </div>
      </a-col>
      <a-col :span="8">
        <div class="band-image-wrapper">
          <h3 class="image-title">{{ t('status.bandCapturePreview') }}</h3>
          <img
            src="/images/2.png"
            :alt="t('status.bandCapturePreview')"
            class="band-image"
          />
        </div>
      </a-col>
      <a-col :span="8">
        <div class="band-image-wrapper">
          <h3 class="image-title">{{ t('status.spectralCurves') }}</h3>
          <img
            src="/images/3.png"
            :alt="t('status.spectralCurves')"
            class="band-image"
          />
        </div>
      </a-col>
    </a-row>
  </div>
</template>

<script setup>
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
</script>

<style scoped>
.band-visualization-container {
  padding: 16px 0;
}

.band-image-wrapper {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.image-title {
  font-size: 16px;
  font-weight: 600;
  color: #333;
  text-align: center;
  margin: 0;
}

.band-image {
  width: 100%;
  height: 500px;
  object-fit: contain;
  border: 1px solid #e8e8e8;
  border-radius: 4px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  background-color: #fff;
}
</style>
