<template>
  <div class="input-map-wrapper">
    <div class="map-inner">
      <div class="map" id="map-maplibre" ref="mapContainer"></div>
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
import type { LatLngValue, MapLibreStyleSource } from "../../types/map";

/* ===========================
   MapLibre imports
   =========================== */
import maplibregl, { Map as MapLibreMap } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

interface Props {
  modelValue: LatLngValue;
  center?: [number, number];
  zoom?: number;
  source?: MapLibreStyleSource;
  mode?: "click" | "center";
}

const props = withDefaults(defineProps<Props>(), {
  zoom: 4,
  mode: "click",
  source: () => ({
    type: "maplibre-style",
    styleUrl: "https://demotiles.maplibre.org/style.json",
  }),
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
   MapLibre state
   =========================== */
let mapLibreMap: MapLibreMap | null = null;

/* ===========================
   Destroy map
   =========================== */
function destroyMap() {
  if (mapLibreMap) {
    mapLibreMap.remove();
    mapLibreMap = null;
  }
}

/* ===========================
   Init MapLibre
   =========================== */
function initMap() {
  destroyMap();
  if (!mapContainer.value) return;

  const initialCenter: [number, number] =
    localValue.lat != null && localValue.lng != null
      ? [localValue.lng, localValue.lat] // [lng, lat]
      : props.center
      ? [props.center[1], props.center[0]] // [lng, lat]
      : [0, 0];
  const initialZoom = props.zoom;

  const src = props.source;
  const styleUrl =
    src && src.type === "maplibre-style"
      ? src.styleUrl
      : "https://demotiles.maplibre.org/style.json";

  mapLibreMap = new maplibregl.Map({
    container: mapContainer.value,
    style: styleUrl,
    center: initialCenter,
    zoom: initialZoom,
  });

  if (props.mode === "click") {
    mapLibreMap.on("click", (e) => {
      const lat = e.lngLat.lat;
      const lng = e.lngLat.lng;
      localValue.lat = +lat.toFixed(6);
      localValue.lng = +lng.toFixed(6);
    });
  } else if (props.mode === "center") {
    const emitCenterChange = () => {
      if (!mapLibreMap) return;
      const c = mapLibreMap.getCenter();
      localValue.lat = +c.lat.toFixed(6);
      localValue.lng = +c.lng.toFixed(6);
    };

    mapLibreMap.on("moveend", emitCenterChange);
    mapLibreMap.on("load", () => {
      emitCenterChange();
    });
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
    if (!newCenter || !mapLibreMap) return;
    if (props.mode === "center") {
      mapLibreMap.setCenter([newCenter[1], newCenter[0]]);
    }
  }
);

watch(
  () => props.zoom,
  (newZoom) => {
    if (typeof newZoom !== "number" || !mapLibreMap) return;
    mapLibreMap.setZoom(newZoom);
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
