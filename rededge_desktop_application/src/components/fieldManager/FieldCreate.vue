<template>
  <div class="field-create" @click="searchResults = []">
    <!-- Map Area -->
    <div class="map-section">
      <div class="map-toolbar">
        <a-space>
          <a-button
            :type="drawingMode ? 'primary' : 'default'"
            size="small"
            :ghost="drawingMode"
            @click="toggleDraw"
            :disabled="!!editingUid"
          >
            <template #icon><EditOutlined /></template>
            {{ drawingMode ? t('analysis.field.stopDraw') : t('analysis.field.drawPolygon') }}
          </a-button>
          <a-button size="small" @click="handleImport" :disabled="drawingMode || !!editingUid">
            <template #icon><ImportOutlined /></template>
            {{ t('analysis.field.importFile') }}
          </a-button>
          <a-button
            size="small"
            :disabled="drawnPolygons.length === 0 || !!editingUid"
            @click="handleConvertWGS84"
            :loading="converting"
          >
            <template #icon><SwapOutlined /></template>
            WGS84→GCJ02
          </a-button>
          <a-button
            size="small"
            :disabled="drawnPolygons.length === 0"
            danger
            @click="clearAllPolygons"
          >
            <template #icon><DeleteOutlined /></template>
            {{ t('analysis.field.clearAll') }}
          </a-button>
        </a-space>
        <div class="search-box" @click.stop>
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
              v-for="(item, i) in searchResults"
              :key="i"
              class="search-item"
              @click="jumpToPoi(item)"
            >
              <span class="search-item-name">{{ item.name }}</span>
              <span class="search-item-addr">{{ item.district || item.address || '' }}</span>
            </div>
          </div>
        </div>
      </div>
      <!-- Drawing hint banner -->
      <div v-if="drawingMode" class="draw-hint">
        {{ t('analysis.field.drawHint') }}
      </div>
      <div v-if="editingUid" class="draw-hint edit-hint">
        {{ t('analysis.field.editHint') }}
        <a-button type="link" size="small" @click="finishEditPolygon" style="font-size: 12px !important;">
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

    <!-- Field Form -->
    <div class="form-section" v-if="drawnPolygons.length > 0">
      <div class="form-scroll">
        <div
          v-for="(poly, index) in drawnPolygons"
          :key="poly._uid"
          :data-field-uid="poly._uid"
          class="field-form-card"
          :class="{
            'field-form-card-active': activePolyIndex === index,
            'field-form-card-editing': editingUid === poly._uid
          }"
          @click="focusPolygon(index)"
        >
          <div class="form-card-header">
            <span class="form-card-title">
              {{ t('analysis.field.fieldIndex', { index: index + 1 }) }}
            </span>
            <span class="form-card-area">
              {{ formatArea(poly.area) }}
            </span>
            <a-tooltip :title="t('analysis.field.editVertices')">
              <a-button
                type="text"
                size="small"
                :style="{ color: editingUid === poly._uid ? '#faad14' : undefined }"
                @click.stop="toggleEditPolygon(index)"
              >
                <NodeIndexOutlined />
              </a-button>
            </a-tooltip>
            <a-button type="text" size="small" danger @click.stop="removePolygon(index)">
              <CloseOutlined />
            </a-button>
          </div>
          <a-form layout="vertical" size="small" class="field-form">
            <a-row :gutter="8">
              <a-col :span="12">
                <a-form-item :label="t('analysis.field.fieldNumber')">
                  <a-input v-model:value="poly.fieldNumber" :placeholder="t('analysis.field.fieldNumberPlaceholder')" />
                </a-form-item>
              </a-col>
              <a-col :span="12">
                <a-form-item :label="t('analysis.field.fieldName')">
                  <a-input v-model:value="poly.name" :placeholder="t('analysis.field.fieldNamePlaceholder')" />
                </a-form-item>
              </a-col>
            </a-row>
            <a-row :gutter="8">
              <a-col :span="12">
                <a-form-item :label="t('analysis.field.cropType')">
                  <a-input v-model:value="poly.cropType" :placeholder="t('analysis.field.cropTypePlaceholder')" />
                </a-form-item>
              </a-col>
              <a-col :span="12">
                <a-form-item :label="t('analysis.field.cropVariety')">
                  <a-input v-model:value="poly.cropVariety" :placeholder="t('analysis.field.cropVarietyPlaceholder')" />
                </a-form-item>
              </a-col>
            </a-row>
            <a-form-item :label="t('analysis.field.notes')">
              <a-input v-model:value="poly.notes" :placeholder="t('analysis.field.notesPlaceholder')" />
            </a-form-item>
          </a-form>
        </div>
      </div>

      <a-button
        type="primary"
        block
        :loading="saving"
        :disabled="!!editingUid"
        class="save-btn"
        @click="handleSaveAll"
      >
        <template #icon><SaveOutlined /></template>
        {{ t('analysis.field.saveAll', { count: drawnPolygons.length }) }}
      </a-button>
    </div>

    <!-- Empty state when no polygons drawn -->
    <div v-else class="form-section form-empty">
      <EnvironmentOutlined style="font-size: 36px; color: #d9d9d9" />
      <p>{{ t('analysis.field.drawTip') }}</p>
    </div>
  </div>
</template>

<script setup>
import { ref, shallowRef, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { useI18n } from 'vue-i18n'
import { message } from 'ant-design-vue'
import {
  EditOutlined,
  ImportOutlined,
  DeleteOutlined,
  CloseOutlined,
  SaveOutlined,
  EnvironmentOutlined,
  SearchOutlined,
  SwapOutlined,
  NodeIndexOutlined,
  GlobalOutlined
} from '@ant-design/icons-vue'
import AMapLoader from '@amap/amap-jsapi-loader'
import { useAnalysisStore } from '../../stores/analysis'

const { t } = useI18n()
const store = useAnalysisStore()
const emit = defineEmits(['saved'])

const mapContainer = ref(null)
const AMapRef = shallowRef(null)
const mapInstance = shallowRef(null)
const mouseTool = shallowRef(null)
const drawingMode = ref(false)
const drawnPolygons = ref([])
const activePolyIndex = ref(-1)
const saving = ref(false)
const converting = ref(false)
const searchKeyword = ref('')
const searchResults = ref([])
const editingUid = ref(null)
const satelliteMode = ref(false)

let placeSearch = null
let autoComplete = null
let polygonEditor = null
let searchDebounceTimer = null
let satelliteLayer = null
let roadNetLayer = null

let uidCounter = 0
const polygonOverlays = new Map()

function generateUid() {
  return ++uidCounter
}

onMounted(async () => {
  try {
    const AMap = await AMapLoader.load({
      key: window.__AMAP_KEY__ || '',
      version: '2.0',
      plugins: [
        'AMap.MouseTool', 'AMap.PolygonEditor', 'AMap.Scale', 'AMap.ToolBar',
        'AMap.PlaceSearch', 'AMap.AutoComplete'
      ]
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

    placeSearch = new AMap.PlaceSearch({ city: '南京', pageSize: 6 })
    autoComplete = new AMap.AutoComplete({ city: '南京' })

    mouseTool.value = new AMap.MouseTool(mapInstance.value)
    mouseTool.value.on('draw', (e) => onPolygonDrawn(e.obj))
  } catch (e) {
    console.error('[FieldCreate] Map init failed:', e)
    message.error(t('analysis.field.mapLoadFailed'))
  }
})

onBeforeUnmount(() => {
  if (polygonEditor) polygonEditor.close()
  if (mouseTool.value) mouseTool.value.close(true)
  if (searchDebounceTimer) clearTimeout(searchDebounceTimer)
  polygonOverlays.clear()
  if (mapInstance.value) mapInstance.value.destroy()
})

// ==================== Drawing ====================

function onPolygonDrawn(overlay) {
  const rawPath = overlay.getPath()
  if (!rawPath || rawPath.length < 3) {
    if (mapInstance.value) mapInstance.value.remove(overlay)
    if (drawingMode.value) startDraw()
    return
  }

  const path = rawPath.map(p => [p.lng, p.lat])
  const area = overlay.getArea()
  const center = getCenterOfPath(path)
  const uid = generateUid()

  overlay.setOptions({
    fillColor: '#1890ff', fillOpacity: 0.25,
    strokeColor: '#1890ff', strokeWeight: 2, strokeStyle: 'solid'
  })

  polygonOverlays.set(uid, overlay)
  overlay.on('click', () => {
    if (drawingMode.value) return
    const idx = drawnPolygons.value.findIndex(p => p._uid === uid)
    if (idx !== -1) focusPolygon(idx)
  })

  drawnPolygons.value.push({
    _uid: uid, coordinates: path, area, center,
    fieldNumber: '', name: '', cropType: '', cropVariety: '', notes: ''
  })

  activePolyIndex.value = drawnPolygons.value.length - 1
  highlightPolygons()
  scrollToCard(uid)

  if (drawingMode.value) startDraw()
}

function startDraw() {
  if (!mouseTool.value) return
  mouseTool.value.polygon({
    fillColor: '#1890ff', fillOpacity: 0.15,
    strokeColor: '#1890ff', strokeWeight: 2, strokeStyle: 'dashed'
  })
}

function toggleDraw() {
  if (drawingMode.value) {
    drawingMode.value = false
    mouseTool.value?.close(false)
  } else {
    drawingMode.value = true
    startDraw()
  }
}

// ==================== Selection & highlight ====================

function focusPolygon(index) {
  activePolyIndex.value = index
  highlightPolygons()

  const poly = drawnPolygons.value[index]
  if (poly?.center && mapInstance.value) {
    mapInstance.value.setCenter(poly.center)
  }
  // Scroll form card into view
  scrollToCard(poly._uid)
}

function scrollToCard(uid) {
  nextTick(() => {
    const el = document.querySelector(`[data-field-uid="${uid}"]`)
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  })
}

function highlightPolygons() {
  drawnPolygons.value.forEach((p, i) => {
    const overlay = polygonOverlays.get(p._uid)
    if (!overlay) return
    const active = i === activePolyIndex.value
    const editing = editingUid.value === p._uid
    overlay.setOptions({
      fillColor: editing ? '#faad14' : active ? '#1890ff' : '#8c8c8c',
      fillOpacity: editing ? 0.35 : active ? 0.35 : 0.15,
      strokeColor: editing ? '#faad14' : active ? '#1890ff' : '#8c8c8c',
      strokeWeight: editing || active ? 3 : 1,
      strokeStyle: 'solid'
    })
  })
}

// ==================== Vertex editing (PolygonEditor) ====================

function toggleEditPolygon(index) {
  const poly = drawnPolygons.value[index]
  if (!poly || !AMapRef.value || !mapInstance.value) return

  // If already editing this polygon → finish
  if (editingUid.value === poly._uid) {
    finishEditPolygon()
    return
  }

  // If editing another polygon → finish that first
  if (editingUid.value) finishEditPolygon()

  // Stop drawing mode
  if (drawingMode.value) {
    drawingMode.value = false
    mouseTool.value?.close(false)
  }

  const overlay = polygonOverlays.get(poly._uid)
  if (!overlay) return

  editingUid.value = poly._uid
  activePolyIndex.value = index
  highlightPolygons()

  if (poly.center) {
    mapInstance.value.setCenter(poly.center)
    mapInstance.value.setZoom(Math.max(mapInstance.value.getZoom(), 15))
  }

  polygonEditor = new AMapRef.value.PolygonEditor(mapInstance.value, overlay)
  polygonEditor.open()
}

function finishEditPolygon() {
  if (!polygonEditor || !editingUid.value) return

  polygonEditor.close()
  const uid = editingUid.value
  const overlay = polygonOverlays.get(uid)
  const idx = drawnPolygons.value.findIndex(p => p._uid === uid)

  if (overlay && idx !== -1) {
    const newPath = overlay.getPath().map(p => [p.lng, p.lat])
    const poly = drawnPolygons.value[idx]
    poly.coordinates = newPath
    poly.area = overlay.getArea()
    poly.center = getCenterOfPath(newPath)
  }

  polygonEditor = null
  editingUid.value = null
  highlightPolygons()
}

// ==================== Remove / clear ====================

function removePolygon(index) {
  const poly = drawnPolygons.value[index]
  if (!poly) return

  // Close editor if editing this polygon
  if (editingUid.value === poly._uid) finishEditPolygon()

  const overlay = polygonOverlays.get(poly._uid)
  if (overlay && mapInstance.value) mapInstance.value.remove(overlay)
  polygonOverlays.delete(poly._uid)
  drawnPolygons.value.splice(index, 1)

  if (activePolyIndex.value >= drawnPolygons.value.length) {
    activePolyIndex.value = drawnPolygons.value.length - 1
  }
  highlightPolygons()
}

function clearAllPolygons() {
  if (editingUid.value) finishEditPolygon()
  if (drawingMode.value) {
    drawingMode.value = false
    mouseTool.value?.close(false)
  }
  drawnPolygons.value.forEach(p => {
    const overlay = polygonOverlays.get(p._uid)
    if (overlay && mapInstance.value) mapInstance.value.remove(overlay)
  })
  polygonOverlays.clear()
  drawnPolygons.value = []
  activePolyIndex.value = -1
}

// ==================== WGS84 → GCJ-02 conversion ====================

const CONVERT_BATCH_SIZE = 40
const CONVERT_BATCH_DELAY = 200 // ms between batches

function convertBatch(AMap, batch) {
  return new Promise((resolve, reject) => {
    const pts = batch.map(c => new AMap.LngLat(c[0], c[1]))
    AMap.convertFrom(pts, 'gps', (status, result) => {
      if (status === 'complete' && result.info === 'ok') {
        resolve(result.locations.map(l => [l.lng, l.lat]))
      } else {
        reject(new Error('convertFrom failed'))
      }
    })
  })
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function handleConvertWGS84() {
  const AMap = AMapRef.value
  if (!AMap || drawnPolygons.value.length === 0) return
  converting.value = true
  try {
    // 1. Merge all polygon coordinates into a flat pool, record boundaries
    const allCoords = []
    const slices = [] // { start, length } for each polygon
    for (const poly of drawnPolygons.value) {
      slices.push({ start: allCoords.length, length: poly.coordinates.length })
      allCoords.push(...poly.coordinates)
    }

    // 2. Split into batches of 40, convert sequentially with rate limiting
    const converted = []
    for (let i = 0; i < allCoords.length; i += CONVERT_BATCH_SIZE) {
      if (i > 0) await delay(CONVERT_BATCH_DELAY)
      const batch = allCoords.slice(i, i + CONVERT_BATCH_SIZE)
      const result = await convertBatch(AMap, batch)
      converted.push(...result)
    }

    // 3. Distribute results back to each polygon
    for (let pi = 0; pi < drawnPolygons.value.length; pi++) {
      const { start, length } = slices[pi]
      const polyCoords = converted.slice(start, start + length)
      const poly = drawnPolygons.value[pi]
      poly.coordinates = polyCoords
      poly.center = getCenterOfPath(polyCoords)

      const overlay = polygonOverlays.get(poly._uid)
      if (overlay) {
        overlay.setPath(polyCoords.map(c => new AMap.LngLat(c[0], c[1])))
        poly.area = overlay.getArea()
      }
    }

    if (mapInstance.value) mapInstance.value.setFitView([...polygonOverlays.values()])
    message.success(t('analysis.field.convertSuccess', { count: drawnPolygons.value.length }))
  } catch (e) {
    console.error('[FieldCreate] WGS84 convert failed:', e)
    message.error(t('analysis.field.convertFailed'))
  } finally {
    converting.value = false
  }
}

// ==================== Import ====================

async function handleImport() {
  try {
    const result = await store.importGeoFile()
    if (!result.success) {
      if (!result.cancelled) message.error(result.error || t('analysis.field.importFailed'))
      return
    }
    if (!result.polygons || result.polygons.length === 0) {
      message.warning(t('analysis.field.noPolygonsFound'))
      return
    }

    const AMap = AMapRef.value
    if (!AMap || !mapInstance.value) return

    for (const polyData of result.polygons) {
      const coordsArr = polyData.coordinates.map(c => [c[0], c[1]])
      const path = coordsArr.map(c => new AMap.LngLat(c[0], c[1]))
      const polygon = new AMap.Polygon({
        path, fillColor: '#1890ff', fillOpacity: 0.25,
        strokeColor: '#1890ff', strokeWeight: 2
      })
      mapInstance.value.add(polygon)

      const area = polygon.getArea()
      const center = getCenterOfPath(coordsArr)
      const uid = generateUid()

      polygonOverlays.set(uid, polygon)
      polygon.on('click', () => {
        if (drawingMode.value) return
        const idx = drawnPolygons.value.findIndex(p => p._uid === uid)
        if (idx !== -1) focusPolygon(idx)
      })

      drawnPolygons.value.push({
        _uid: uid, coordinates: coordsArr, area, center,
        fieldNumber: polyData.properties?.fieldNumber || '',
        name: polyData.properties?.name || polyData.properties?.NAME || '',
        cropType: polyData.properties?.cropType || '',
        cropVariety: polyData.properties?.cropVariety || '',
        notes: ''
      })
    }

    mapInstance.value.setFitView([...polygonOverlays.values()])
    message.success(t('analysis.field.importSuccess', { count: result.polygons.length }))
  } catch (e) {
    console.error('[FieldCreate] Import failed:', e)
    message.error(t('analysis.field.importFailed'))
  }
}

// ==================== Save ====================

async function handleSaveAll() {
  if (drawnPolygons.value.length === 0) return

  saving.value = true
  try {
    let savedCount = 0
    for (const poly of drawnPolygons.value) {
      const result = await store.createField({
        fieldNumber: poly.fieldNumber,
        name: poly.name,
        area: poly.area,
        coordinates: JSON.parse(JSON.stringify(poly.coordinates)),
        center: JSON.parse(JSON.stringify(poly.center)),
        cropType: poly.cropType,
        cropVariety: poly.cropVariety,
        notes: poly.notes
      })
      if (result.success) savedCount++
    }

    if (savedCount > 0) {
      message.success(t('analysis.field.saveSuccess', { count: savedCount }))
      clearAllPolygons()
      emit('saved')
    } else {
      message.error(t('analysis.field.saveFailed'))
    }
  } finally {
    saving.value = false
  }
}

// ==================== Satellite toggle ====================

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

// ==================== Search (AutoComplete + PlaceSearch) ====================

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
        // Filter out tips without a valid location
        searchResults.value = result.tips.filter(tip => tip.location).slice(0, 8)
      } else {
        searchResults.value = []
      }
    })
  }, 300)
}

function handleSearch() {
  const kw = searchKeyword.value.trim()
  if (!kw || !placeSearch) {
    searchResults.value = []
    return
  }
  placeSearch.search(kw, (status, result) => {
    if (status === 'complete' && result.poiList) {
      searchResults.value = result.poiList.pois.slice(0, 8)
    } else {
      searchResults.value = []
    }
  })
}

function jumpToPoi(poi) {
  if (!mapInstance.value || !poi.location) return
  mapInstance.value.setCenter([poi.location.lng, poi.location.lat])
  mapInstance.value.setZoom(16)
  searchResults.value = []
  searchKeyword.value = poi.name
}

// ==================== Helpers ====================

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
  if (area >= 10000) return `${(area / 10000).toFixed(2)} ha`
  return `${area.toFixed(1)} m²`
}
</script>

<style scoped>
.field-create {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
}

.map-section {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.map-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  background: #fff;
  border-bottom: 1px solid #f0f0f0;
  flex-shrink: 0;
  gap: 8px;
}

.polygon-count {
  font-size: 12px;
  color: #1890ff;
  font-weight: 500;
  white-space: nowrap;
}

.draw-hint {
  padding: 4px 12px;
  background: #e6f4ff;
  color: #1890ff;
  font-size: 12px;
  text-align: center;
  flex-shrink: 0;
  border-bottom: 1px solid #91caff;
}

.edit-hint {
  background: #fffbe6;
  color: #ad8b00;
  border-bottom-color: #ffe58f;
  font-size: 12px !important;
}

.search-box {
  position: relative;
  flex-shrink: 0;
}

.search-input {
  width: 240px;
}

.search-dropdown {
  position: absolute;
  top: 100%;
  right: 0;
  width: 320px;
  max-height: 300px;
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

/* ===== Form section ===== */
.form-section {
  flex-shrink: 0;
  max-height: 45%;
  display: flex;
  flex-direction: column;
  border-top: 1px solid #f0f0f0;
  background: #fafbfc;
}

.form-scroll {
  flex: 1;
  overflow-y: auto;
  padding: 8px;
  /* Double-column grid when container is wide enough */
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
  gap: 6px;
  align-content: start;
  scrollbar-width: thin;
}

.form-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 24px;
  gap: 8px;
  color: #bbb;
  min-height: 120px;
}

.form-empty p {
  margin: 0;
  font-size: 13px;
}

.field-form-card {
  padding: 10px 12px 6px;
  border: 1px solid #e8e8e8;
  border-radius: 8px;
  background: #fff;
  cursor: pointer;
  transition: border-color 0.2s, box-shadow 0.2s;
}

.field-form-card:hover {
  border-color: #d0d0d0;
}

.field-form-card-active {
  border-color: #1890ff;
  box-shadow: 0 0 0 1px rgba(24, 144, 255, 0.15);
}

.field-form-card-editing {
  border-color: #faad14;
  box-shadow: 0 0 0 1px rgba(250, 173, 20, 0.2);
}

.form-card-header {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 8px;
}

.form-card-title {
  font-weight: 600;
  font-size: 13px;
  color: #333;
}

.form-card-area {
  font-size: 12px;
  color: #1890ff;
  flex: 1;
}

.field-form :deep(.ant-form-item) {
  margin-bottom: 6px;
}

.field-form :deep(.ant-form-item-label) {
  padding-bottom: 2px;
}

.field-form :deep(.ant-form-item-label > label) {
  font-size: 12px;
  color: #888;
  height: auto;
}

.save-btn {
  margin: 8px;
  border-radius: 6px;
  flex-shrink: 0;
}
</style>
