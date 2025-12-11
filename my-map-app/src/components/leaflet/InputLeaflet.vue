<template>
  <div class="input-map-wrapper">
    <div class="map-inner">
      <div class="map" id="map-leaflet" ref="mapContainer"></div>
      <!-- Crosshair overlay when in center mode -->
      <div v-if="mode === 'center'" class="center-crosshair">+</div>
    </div>

    <div class="coords-display">
      <label>
        Lat:
        <input type="number" step="0.000001" v-model.number="localValue.lat" />
      </label>
      <label>
        Lng:
        <input type="number" step="0.000001" v-model.number="localValue.lng" />
      </label>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, watch, onMounted, onBeforeUnmount } from "vue";
import type { LatLngValue, RasterSource } from "../../types/map";

/* ===========================
   Leaflet imports
   =========================== */
import L, { Map as LeafletMap, type LeafletMouseEvent } from "leaflet";
import "leaflet/dist/leaflet.css";
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

interface Props {
  modelValue: LatLngValue;
  center?: [number, number];
  zoom?: number;
  source?: RasterSource;
  mode?: "click" | "center";
}

const props = withDefaults(defineProps<Props>(), {
  zoom: 4,
  mode: "click",
});

const emit = defineEmits<{
  (e: "update:modelValue", value: LatLngValue): void;
}>();

/* ===========================
   State
   =========================== */
const mapContainer = ref<HTMLDivElement | null>(null);
const localValue = reactive<LatLngValue>({
  lat: props.modelValue?.lat ?? null,
  lng: props.modelValue?.lng ?? null,
});

/* ===========================
   Leaflet state
   =========================== */
let leafletMap: LeafletMap | null = null;

/* ===========================
   Destroy map
   =========================== */
function destroyMap() {
  if (leafletMap) {
    leafletMap.remove();
    leafletMap = null;
  }
}

/* ===========================
   Init Leaflet
   =========================== */
function initMap() {
  destroyMap();
  if (!mapContainer.value) return;

  const initialCenter =
    localValue.lat != null && localValue.lng != null
      ? [localValue.lat, localValue.lng]
      : props.center ?? [0, 0];
  const initialZoom = props.zoom;

  leafletMap = L.map(mapContainer.value).setView(
    initialCenter as [number, number],
    initialZoom
  );

  const src = props.source;
  if (src) {
    L.tileLayer(src.urlTemplate, {
      maxZoom: src.maxZoom ?? 19,
      attribution: src.attribution ?? "&copy; OpenStreetMap contributors",
    }).addTo(leafletMap);
  } else {
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: "&copy; OpenStreetMap contributors",
    }).addTo(leafletMap);
  }

  if (props.mode === "click") {
    leafletMap.on("click", (e: LeafletMouseEvent) => {
      const { lat, lng } = e.latlng;
      localValue.lat = +lat.toFixed(6);
      localValue.lng = +lng.toFixed(6);
    });
  } else if (props.mode === "center") {
    const emitCenterChange = () => {
      if (!leafletMap) return;
      const c = leafletMap.getCenter();
      localValue.lat = +c.lat.toFixed(6);
      localValue.lng = +c.lng.toFixed(6);
    };
    leafletMap.on("moveend", emitCenterChange);
    emitCenterChange();
  }
}

/* ===========================
   Watchers
   =========================== */
watch(
  () => props.modelValue,
  (newVal) => {
    if (newVal) {
      localValue.lat = newVal.lat;
      localValue.lng = newVal.lng;
    } else {
      localValue.lat = null;
      localValue.lng = null;
    }
  },
  { deep: true, immediate: true }
);

watch(
  () => ({ ...localValue }),
  (val) => {
    emit("update:modelValue", { ...val });
  },
  { deep: true }
);

watch(
  () => props.center,
  (newCenter) => {
    if (!newCenter || !leafletMap) return;
    if (props.mode === "center") {
      leafletMap.setView(newCenter, leafletMap.getZoom());
    }
  }
);

watch(
  () => props.zoom,
  (newZoom) => {
    if (typeof newZoom !== "number" || !leafletMap) return;
    leafletMap.setZoom(newZoom);
  }
);

/* ===========================
   Lifecycle
   =========================== */
onMounted(() => {
  initMap();
});

onBeforeUnmount(() => {
  destroyMap();
});
</script>

<style scoped>
.input-map-wrapper {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

/* Make it possible to overlay crosshair on top of the map */
.map-inner {
  position: relative;
}

.map {
  width: 100%;
  height: 400px;
  min-height: 300px;
}

.center-crosshair {
  z-index: 9999;
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  pointer-events: none;
  font-size: 24px;
  font-weight: bold;
  color: red;
  text-shadow: 0 0 2px #fff;
}

.coords-display {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  font-size: 0.9rem;
}

.coords-display label {
  display: flex;
  align-items: center;
  gap: 0.25rem;
}
.coords-display input {
  width: 120px;
}
</style>
