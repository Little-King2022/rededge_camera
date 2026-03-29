<template>
  <div class="field-list">
    <div class="map-section">
      <div class="map-toolbar">
        <span class="toolbar-title">
          {{ t('analysis.field.fieldListTitle') }}
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
          <!-- <a-button size="small" @click="handleRefresh" :loading="store.fieldsLoading">
            <template #icon><ReloadOutlined /></template>
          </a-button> -->
        </a-space>
      </div>
      <div v-if="editingFieldId" class="edit-hint">
        {{ t('analysis.field.editHint') }}
        <a-button type="link" size="small" @click="finishEdit" style="font-size: 12px !important;">
          {{ t('analysis.field.finishEdit') }}
        </a-button>
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
  </div>
</template>

<script setup>
import { ref, shallowRef, onMounted, onBeforeUnmount, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { message } from 'ant-design-vue'
import {
  ReloadOutlined,
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

const fieldOverlays = new Map()
let polygonEditor = null
let satelliteLayer = null
let roadNetLayer = null

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

    satelliteLayer = new AMap.TileLayer.Satellite()
    roadNetLayer = new AMap.TileLayer.RoadNet()
    satelliteLayer.hide()
    roadNetLayer.hide()
    mapInstance.value.add([satelliteLayer, roadNetLayer])

    placeSearch = new AMap.PlaceSearch({ city: '南京', pageSize: 6 })
    autoComplete = new AMap.AutoComplete({ city: '南京' })

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

  fieldOverlays.forEach(overlay => map.remove(overlay))
  fieldOverlays.clear()

  for (const field of store.fields) {
    if (!field.coordinates || field.coordinates.length < 3) continue
    const path = field.coordinates.map(c => new AMap.LngLat(c[0], c[1]))
    const polygon = new AMap.Polygon({
      path,
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

  if (store.fields.length > 0) {
    map.setFitView([...fieldOverlays.values()])
  }
}

function selectField(field) {
  if (editingFieldId.value) return
  selectedFieldId.value = field.id
  highlightField(field.id)
  if (field.center && mapInstance.value) {
    mapInstance.value.setCenter(field.center)
  }
}

function highlightField(activeId) {
  const editing = editingFieldId.value
  fieldOverlays.forEach((overlay, id) => {
    const isEditing = id === editing
    const isActive = id === activeId
    overlay.setOptions({
      fillColor: isEditing ? '#faad14' : isActive ? '#1890ff' : '#52c41a',
      fillOpacity: isEditing ? 0.35 : isActive ? 0.35 : 0.2,
      strokeColor: isEditing ? '#faad14' : isActive ? '#1890ff' : '#52c41a',
      strokeWeight: isEditing || isActive ? 3 : 2
    })
  })
}

function startEditCoords(field) {
  const AMap = AMapRef.value
  if (!AMap || !mapInstance.value) return

  if (polygonEditor) {
    polygonEditor.close()
    polygonEditor = null
  }

  const overlay = fieldOverlays.get(field.id)
  if (!overlay) return

  editingFieldId.value = field.id
  selectedFieldId.value = field.id
  highlightField(field.id)

  if (field.center) {
    mapInstance.value.setCenter(field.center)
  }

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

// --- Search ---

function onSearchInput() {
  if (searchDebounceTimer) clearTimeout(searchDebounceTimer)
  searchDebounceTimer = setTimeout(() => {
    const kw = searchKeyword.value.trim()
    if (!kw || !autoComplete) { searchResults.value = []; return }
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
  if (!kw || !placeSearch) { searchResults.value = []; return }
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
  searchResults.value = []
  searchKeyword.value = poi.name
}

function toggleSatellite() {
  if (!satelliteLayer || !roadNetLayer) return
  satelliteMode.value = !satelliteMode.value
  if (satelliteMode.value) { satelliteLayer.show(); roadNetLayer.show() }
  else { satelliteLayer.hide(); roadNetLayer.hide() }
}

async function handleRefresh() {
  await store.loadFields()
  renderAllFields()
}

function getCenterOfPath(path) {
  if (!path || path.length === 0) return null
  let sumLng = 0, sumLat = 0
  for (const [lng, lat] of path) { sumLng += lng; sumLat += lat }
  return [sumLng / path.length, sumLat / path.length]
}

// Expose methods and state for parent (AnalysisView right sider)
defineExpose({
  selectField,
  startEditCoords,
  finishEdit,
  handleDelete,
  selectedFieldId,
  editingFieldId
})
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
}

.edit-hint {
  padding: 4px 12px;
  background: #fffbe6;
  color: #ad8b00;
  font-size: 12px;
  text-align: center;
  flex-shrink: 0;
  border-bottom: 1px solid #ffe58f;
}

.search-box {
  position: relative;
}

.search-input {
  width: 240px;
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

.search-item:last-child { border-bottom: none; }
.search-item:hover { background: #e6f4ff; }

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
</style>
