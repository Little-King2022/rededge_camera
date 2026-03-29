<template>
  <div class="field-list">
    <!-- Map Preview -->
    <div class="map-section">
      <div class="map-toolbar">
        <span class="toolbar-title">
          {{ t('analysis.field.fieldListTitle') }}
          <a-tag v-if="store.fields.length > 0" color="blue">{{ store.fields.length }}</a-tag>
        </span>
        <a-space>
          <div class="search-box">
            <a-input
              v-model:value="searchKeyword"
              :placeholder="t('analysis.field.searchPlaceholder')"
              size="small"
              allow-clear
              @input="onSearchInput"
              @pressEnter="handleSearch"
              class="search-input"
            >
              <template #prefix><SearchOutlined style="color: #bbb" /></template>
            </a-input>
            <div v-if="searchResults.length > 0" class="search-dropdown">
              <div
                v-for="poi in searchResults"
                :key="poi.id"
                class="search-item"
                @click="jumpToPoi(poi)"
              >
                <span class="search-item-name">{{ poi.name }}</span>
                <span class="search-item-addr">{{ poi.district || poi.address }}</span>
              </div>
            </div>
          </div>
          <a-button
            v-if="editingFieldId"
            type="primary"
            size="small"
            @click="finishEdit"
          >
            <template #icon><CheckOutlined /></template>
            {{ t('analysis.field.finishEdit') }}
          </a-button>
          <a-button size="small" @click="handleRefresh" :loading="store.fieldsLoading">
            <template #icon><ReloadOutlined /></template>
          </a-button>
        </a-space>
      </div>
      <div class="map-wrapper">
        <div ref="mapContainer" class="map-container"></div>
        <a-button
          class="satellite-toggle"
          size="small"
          :type="satelliteMode ? 'primary' : 'default'"
          :ghost="satelliteMode"
          @click="toggleSatellite"
        >
          <template #icon><GlobalOutlined /></template>
          {{ satelliteMode ? t('analysis.field.normalMap') : t('analysis.field.satelliteMap') }}
        </a-button>
      </div>
    </div>

    <!-- Field List -->
    <div class="list-section">
      <div v-if="store.fieldsLoading" class="list-loading">
        <a-spin />
      </div>
      <div v-else-if="store.fields.length === 0" class="list-empty">
        <EnvironmentOutlined style="font-size: 32px; color: #d9d9d9" />
        <p>{{ t('analysis.field.emptyList') }}</p>
      </div>
      <div v-else class="list-scroll">
        <div
          v-for="field in store.fields"
          :key="field.id"
          class="field-item"
          :class="{
            'field-item-active': selectedFieldId === field.id,
            'field-item-editing': editingFieldId === field.id
          }"
          @click="selectField(field)"
        >
          <div class="field-item-header">
            <span class="field-item-name">
              {{ field.name || field.fieldNumber || t('analysis.field.unnamed') }}
            </span>
            <span class="field-item-area">{{ formatArea(field.area) }}</span>
          </div>
          <div class="field-item-meta">
            <span v-if="field.fieldNumber" class="meta-tag">{{ field.fieldNumber }}</span>
            <span v-if="field.cropType" class="meta-tag">{{ field.cropType }}</span>
            <span v-if="field.cropVariety" class="meta-tag crop-variety">{{ field.cropVariety }}</span>
          </div>
          <div class="field-item-time">
            {{ formatTime(field.createdAt) }}
          </div>
          <div class="field-item-actions" @click.stop>
            <a-button type="text" size="small" @click="startEditCoords(field)">
              <template #icon><AimOutlined /></template>
            </a-button>
            <a-button type="text" size="small" @click="openEditForm(field)">
              <template #icon><EditOutlined /></template>
            </a-button>
            <a-popconfirm
              :title="t('analysis.field.deleteConfirm')"
              @confirm="handleDelete(field.id)"
              placement="left"
            >
              <a-button type="text" size="small" danger>
                <template #icon><DeleteOutlined /></template>
              </a-button>
            </a-popconfirm>
          </div>
        </div>
      </div>
    </div>

    <!-- Edit Attribute Modal -->
    <a-modal
      v-model:open="editModalVisible"
      :title="t('analysis.field.editAttributes')"
      @ok="handleEditSave"
      :ok-text="t('common.save')"
      :cancel-text="t('common.cancel')"
      width="480px"
    >
      <a-form layout="vertical" v-if="editForm">
        <a-row :gutter="12">
          <a-col :span="12">
            <a-form-item :label="t('analysis.field.fieldNumber')">
              <a-input v-model:value="editForm.fieldNumber" />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item :label="t('analysis.field.fieldName')">
              <a-input v-model:value="editForm.name" />
            </a-form-item>
          </a-col>
        </a-row>
        <a-row :gutter="12">
          <a-col :span="12">
            <a-form-item :label="t('analysis.field.cropType')">
              <a-input v-model:value="editForm.cropType" />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item :label="t('analysis.field.cropVariety')">
              <a-input v-model:value="editForm.cropVariety" />
            </a-form-item>
          </a-col>
        </a-row>
        <a-form-item :label="t('analysis.field.notes')">
          <a-textarea v-model:value="editForm.notes" :auto-size="{ minRows: 2, maxRows: 4 }" />
        </a-form-item>
      </a-form>
    </a-modal>
  </div>
</template>

<script setup>
import { ref, shallowRef, reactive, onMounted, onBeforeUnmount, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { message } from 'ant-design-vue'
import {
  EditOutlined,
  DeleteOutlined,
  CheckOutlined,
  ReloadOutlined,
  AimOutlined,
  EnvironmentOutlined,
  SearchOutlined,
  GlobalOutlined
} from '@ant-design/icons-vue'
import AMapLoader from '@amap/amap-jsapi-loader'
import { useAnalysisStore } from '../../stores/analysis'

const { t } = useI18n()
const store = useAnalysisStore()

const mapContainer = ref(null)
const AMapRef = shallowRef(null)
const mapInstance = shallowRef(null)
const selectedFieldId = ref(null)
const editingFieldId = ref(null)
const searchKeyword = ref('')
const searchResults = ref([])
const satelliteMode = ref(false)
let placeSearch = null
let autoComplete = null
let searchDebounceTimer = null

// Store polygon overlay references separately
const fieldOverlays = new Map()
let polygonEditor = null
let satelliteLayer = null
let roadNetLayer = null

// Edit form
const editModalVisible = ref(false)
const editForm = ref(null)
const editFormFieldId = ref(null)

onMounted(async () => {
  try {
    const AMap = await AMapLoader.load({
      key: window.__AMAP_KEY__ || '',
      version: '2.0',
      plugins: ['AMap.PolygonEditor', 'AMap.Scale', 'AMap.ToolBar', 'AMap.PlaceSearch', 'AMap.AutoComplete']
    })
    AMapRef.value = AMap

    mapInstance.value = new AMap.Map(mapContainer.value, {
      zoom: 10,
      center: [118.796877, 32.060255],
      viewMode: '2D'
    })

    mapInstance.value.addControl(new AMap.Scale())
    mapInstance.value.addControl(new AMap.ToolBar({ position: { top: '10px', right: '10px' } }))

    // Satellite + RoadNet layers (hidden by default)
    satelliteLayer = new AMap.TileLayer.Satellite()
    roadNetLayer = new AMap.TileLayer.RoadNet()
    satelliteLayer.hide()
    roadNetLayer.hide()
    mapInstance.value.add([satelliteLayer, roadNetLayer])

    // Init PlaceSearch & AutoComplete
    placeSearch = new AMap.PlaceSearch({ city: '南京', pageSize: 6 })
    autoComplete = new AMap.AutoComplete({ city: '南京' })

    // Load existing fields
    await store.loadFields()
    renderAllFields()
  } catch (e) {
    console.error('[FieldList] Map init failed:', e)
    message.error(t('analysis.field.mapLoadFailed'))
  }
})

onBeforeUnmount(() => {
  if (searchDebounceTimer) clearTimeout(searchDebounceTimer)
  if (polygonEditor) polygonEditor.close()
  fieldOverlays.clear()
  if (mapInstance.value) mapInstance.value.destroy()
})

watch(() => store.fields, () => {
  renderAllFields()
}, { deep: true })

function renderAllFields() {
  const AMap = AMapRef.value
  const map = mapInstance.value
  if (!AMap || !map) return

  // Remove old overlays
  fieldOverlays.forEach(overlay => map.remove(overlay))
  fieldOverlays.clear()

  // Add field polygons
  for (const field of store.fields) {
    if (!field.coordinates || field.coordinates.length < 3) continue
    const path = field.coordinates.map(c => new AMap.LngLat(c[0], c[1]))
    const polygon = new AMap.Polygon({
      path: path,
      fillColor: '#52c41a',
      fillOpacity: 0.2,
      strokeColor: '#52c41a',
      strokeWeight: 2,
      extData: { fieldId: field.id }
    })
    map.add(polygon)
    fieldOverlays.set(field.id, polygon)

    polygon.on('click', () => selectField(field))
  }

  // Fit view if has fields
  if (store.fields.length > 0) {
    map.setFitView([...fieldOverlays.values()])
  }
}

function selectField(field) {
  if (editingFieldId.value) return

  selectedFieldId.value = field.id
  highlightField(field.id)

  // Pan to field
  if (field.center && mapInstance.value) {
    mapInstance.value.setCenter(field.center)
    // mapInstance.value.setZoom(16)
  }
}

function highlightField(activeId) {
  fieldOverlays.forEach((overlay, id) => {
    overlay.setOptions({
      fillColor: id === activeId ? '#1890ff' : '#52c41a',
      fillOpacity: id === activeId ? 0.35 : 0.2,
      strokeColor: id === activeId ? '#1890ff' : '#52c41a',
      strokeWeight: id === activeId ? 3 : 2
    })
  })
}

function startEditCoords(field) {
  const AMap = AMapRef.value
  if (!AMap || !mapInstance.value) return

  // Close previous editor
  if (polygonEditor) {
    polygonEditor.close()
    polygonEditor = null
  }

  const overlay = fieldOverlays.get(field.id)
  if (!overlay) return

  editingFieldId.value = field.id
  selectedFieldId.value = field.id
  highlightField(field.id)

  // Pan to field
  if (field.center) {
    mapInstance.value.setCenter(field.center)
    // mapInstance.value.setZoom(16)
  }

  // Open editor
  polygonEditor = new AMap.PolygonEditor(mapInstance.value, overlay)
  polygonEditor.open()
}

async function finishEdit() {
  if (!polygonEditor || !editingFieldId.value) return

  polygonEditor.close()

  const overlay = fieldOverlays.get(editingFieldId.value)
  if (overlay) {
    const newPath = overlay.getPath().map(p => [p.lng, p.lat])
    const newArea = overlay.getArea()
    const newCenter = getCenterOfPath(newPath)

    const result = await store.updateField(editingFieldId.value, {
      coordinates: newPath,
      area: newArea,
      center: newCenter
    })
    if (result.success) {
      message.success(t('analysis.field.coordsUpdated'))
    } else {
      message.error(t('analysis.field.updateFailed'))
    }
  }

  polygonEditor = null
  editingFieldId.value = null
}

function openEditForm(field) {
  editFormFieldId.value = field.id
  editForm.value = reactive({
    fieldNumber: field.fieldNumber || '',
    name: field.name || '',
    cropType: field.cropType || '',
    cropVariety: field.cropVariety || '',
    notes: field.notes || ''
  })
  editModalVisible.value = true
}

async function handleEditSave() {
  if (!editForm.value || !editFormFieldId.value) return

  const result = await store.updateField(editFormFieldId.value, {
    fieldNumber: editForm.value.fieldNumber,
    name: editForm.value.name,
    cropType: editForm.value.cropType,
    cropVariety: editForm.value.cropVariety,
    notes: editForm.value.notes
  })

  if (result.success) {
    message.success(t('analysis.field.attrUpdated'))
    editModalVisible.value = false
  } else {
    message.error(t('analysis.field.updateFailed'))
  }
}

async function handleDelete(id) {
  const result = await store.deleteField(id)
  if (result.success) {
    message.success(t('analysis.field.deleteSuccess'))
    if (selectedFieldId.value === id) selectedFieldId.value = null
    if (editingFieldId.value === id) {
      if (polygonEditor) polygonEditor.close()
      polygonEditor = null
      editingFieldId.value = null
    }
  }
}

function onSearchInput() {
  if (searchDebounceTimer) clearTimeout(searchDebounceTimer)
  searchDebounceTimer = setTimeout(() => {
    const kw = searchKeyword.value.trim()
    if (!kw || !autoComplete) {
      searchResults.value = []
      return
    }
    autoComplete.search(kw, (status, result) => {
      if (status === 'complete' && result.tips) {
        searchResults.value = result.tips.filter(tip => tip.location).slice(0, 8)
      } else {
        searchResults.value = []
      }
    })
  }, 300)
}

function handleSearch() {
  if (searchDebounceTimer) clearTimeout(searchDebounceTimer)
  const kw = searchKeyword.value.trim()
  if (!kw || !placeSearch) {
    searchResults.value = []
    return
  }
  placeSearch.search(kw, (status, result) => {
    if (status === 'complete' && result.poiList) {
      searchResults.value = result.poiList.pois.slice(0, 6)
    } else {
      searchResults.value = []
    }
  })
}

function jumpToPoi(poi) {
  if (!mapInstance.value || !poi.location) return
  mapInstance.value.setCenter([poi.location.lng, poi.location.lat])
  // mapInstance.value.setZoom(16)
  searchResults.value = []
  searchKeyword.value = poi.name
}

function toggleSatellite() {
  if (!satelliteLayer || !roadNetLayer) return
  satelliteMode.value = !satelliteMode.value
  if (satelliteMode.value) {
    satelliteLayer.show()
    roadNetLayer.show()
  } else {
    satelliteLayer.hide()
    roadNetLayer.hide()
  }
}

async function handleRefresh() {
  await store.loadFields()
  renderAllFields()
}

function getCenterOfPath(path) {
  if (!path || path.length === 0) return null
  let sumLng = 0, sumLat = 0
  for (const [lng, lat] of path) {
    sumLng += lng
    sumLat += lat
  }
  return [sumLng / path.length, sumLat / path.length]
}

function formatArea(area) {
  if (!area || area <= 0) return '--'
  if (area >= 10000) {
    return `${(area / 10000).toFixed(2)} ha`
  }
  return `${area.toFixed(1)} m²`
}

function formatTime(d) {
  if (!d) return ''
  try {
    const dt = new Date(d)
    return dt.toLocaleDateString()
  } catch { return d }
}
</script>

<style scoped>
.field-list {
  display: flex;
  height: 100%;
  overflow: hidden;
}

.map-section {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.map-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  background: #fff;
  border-bottom: 1px solid #f0f0f0;
  flex-shrink: 0;
}

.toolbar-title {
  font-weight: 600;
  font-size: 14px;
  color: #333;
  display: flex;
  align-items: center;
  gap: 6px;
}

.search-box {
  position: relative;
}

.search-input {
  width: 200px;
}

.search-dropdown {
  position: absolute;
  top: 100%;
  left: 0;
  width: 300px;
  max-height: 260px;
  overflow-y: auto;
  background: #fff;
  border: 1px solid #e8e8e8;
  border-radius: 6px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  z-index: 100;
  margin-top: 4px;
}

.search-item {
  padding: 8px 12px;
  cursor: pointer;
  border-bottom: 1px solid #f5f5f5;
  transition: background 0.15s;
}

.search-item:last-child {
  border-bottom: none;
}

.search-item:hover {
  background: #e6f4ff;
}

.search-item-name {
  font-size: 13px;
  font-weight: 500;
  color: #333;
  display: block;
}

.search-item-addr {
  font-size: 11px;
  color: #999;
}

.map-wrapper {
  flex: 1;
  min-height: 200px;
  position: relative;
}

.map-container {
  width: 100%;
  height: 100%;
}

.satellite-toggle {
  position: absolute;
  right: 10px;
  bottom: 10px;
  z-index: 10;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15);
}

.list-section {
  width: 300px;
  flex-shrink: 0;
  border-left: 1px solid #f0f0f0;
  background: #fff;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.list-loading {
  display: flex;
  justify-content: center;
  padding: 40px 0;
}

.list-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 16px;
  gap: 8px;
  color: #bbb;
  flex: 1;
}

.list-empty p {
  margin: 0;
  font-size: 13px;
  text-align: center;
}

.list-scroll {
  flex: 1;
  overflow-y: auto;
  padding: 6px;
  scrollbar-width: thin;
}

.field-item {
  padding: 10px 12px;
  border: 1px solid #f0f0f0;
  border-radius: 8px;
  margin-bottom: 6px;
  cursor: pointer;
  background: #fafafa;
  transition: all 0.2s;
}

.field-item:hover {
  border-color: #d9d9d9;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
}

.field-item-active {
  border-color: #1890ff;
  background: #e6f4ff;
}

.field-item-editing {
  border-color: #faad14;
  background: #fffbe6;
}

.field-item-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 4px;
}

.field-item-name {
  font-weight: 600;
  font-size: 13px;
  color: #333;
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.field-item-area {
  font-size: 12px;
  color: #1890ff;
  flex-shrink: 0;
  margin-left: 8px;
}

.field-item-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin-bottom: 4px;
}

.meta-tag {
  font-size: 11px;
  padding: 0 6px;
  background: #f5f5f5;
  border-radius: 3px;
  color: #666;
  line-height: 20px;
}

.crop-variety {
  background: #f6ffed;
  color: #389e0d;
}

.field-item-time {
  font-size: 11px;
  color: #bbb;
  margin-bottom: 4px;
}

.field-item-actions {
  display: flex;
  gap: 2px;
  padding-top: 4px;
  border-top: 1px solid #f5f5f5;
}
</style>
