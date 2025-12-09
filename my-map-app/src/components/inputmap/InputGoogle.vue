<template>
  <div class="input-map-wrapper">
    <div class="map-inner">
      <div class="map" ref="mapContainer"></div>
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
import {
  ref,
  reactive,
  watch,
  onMounted,
  onBeforeUnmount,
  nextTick,
} from "vue";
import type { LatLngValue, GoogleMapsSource } from "../../types/map";

/* ===========================
   Google Maps imports
   =========================== */
import { setOptions } from "@googlemaps/js-api-loader";

interface Props {
  modelValue: LatLngValue;
  center?: [number, number];
  zoom?: number;
  source: GoogleMapsSource;
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
   Google Maps state
   =========================== */
let googleMap: any = null;

/* ===========================
   Destroy map
   =========================== */
function destroyMap() {
  if (googleMap) {
    googleMap = null;
  }
}

/* ===========================
   Init Google Maps
   =========================== */
async function initMap() {
  destroyMap();
  if (!mapContainer.value) return;

  const initialCenter =
    localValue.lat != null && localValue.lng != null
      ? { lat: localValue.lat, lng: localValue.lng }
      : props.center
      ? { lat: props.center[0], lng: props.center[1] }
      : { lat: 0, lng: 0 };
  const initialZoom = props.zoom;

  const src = props.source;
  if (!src || src.type !== "google" || !src.apiKey) {
    console.error(
      "Google Maps engine requires a source with type 'google' and an apiKey"
    );
    return;
  }

  setOptions({
    key: src.apiKey,
    v: "weekly",
  });

  // Need to wait for next tick to ensure DOM is ready
  await nextTick();

  const { Map } = await google.maps.importLibrary("maps");

  // The google namespace is now available globally
  googleMap = new Map(mapContainer.value, {
    center: initialCenter,
    zoom: initialZoom,
    ...(src.mapId ? { mapId: src.mapId } : {}),
  });

  if (props.mode === "click") {
    googleMap.addListener("click", (e: any) => {
      const lat = e.latLng.lat();
      const lng = e.latLng.lng();
      localValue.lat = +lat.toFixed(6);
      localValue.lng = +lng.toFixed(6);
    });
  } else if (props.mode === "center") {
    const emitCenterChange = () => {
      if (!googleMap) return;
      const c = googleMap.getCenter();
      if (!c) return;
      localValue.lat = +c.lat().toFixed(6);
      localValue.lng = +c.lng().toFixed(6);
    };

    googleMap.addListener("idle", emitCenterChange);
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
    if (!newCenter || !googleMap) return;
    if (props.mode === "center") {
      googleMap.setCenter({ lat: newCenter[0], lng: newCenter[1] });
    }
  }
);

watch(
  () => props.zoom,
  (newZoom) => {
    if (typeof newZoom !== "number" || !googleMap) return;
    googleMap.setZoom(newZoom);
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
