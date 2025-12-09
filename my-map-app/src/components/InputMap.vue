<template>
  <div class="input-map-wrapper">
    <div class="map-inner">
      <BaseMap
        :center="currentCenter"
        :zoom="zoom"
        :clickable="true"
        :markers="displayMarkers"
        :engine="engine"
        :source="source"
        @map-click="onMapClick"
        @center-change="onCenterChange"
      />
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
import { computed, reactive, watch } from "vue";
import BaseMap, {
  type BaseMapMarker,
  type MapEngine,
  type BaseMapSource,
} from "./BaseMap.vue";

interface LatLngValue {
  lat: number | null;
  lng: number | null;
}

const props = defineProps<{
  modelValue: LatLngValue;
  center?: [number, number];
  zoom?: number;
  engine?: MapEngine;
  source?: BaseMapSource;
  mode?: "click" | "center"; // 🔹 new
}>();

const emit = defineEmits<{
  (e: "update:modelValue", value: LatLngValue): void;
}>();

const zoom = computed(() => props.zoom ?? 4);
const engine = computed<MapEngine>(() => props.engine ?? "leaflet");
const source = computed<BaseMapSource | undefined>(() => props.source);
const mode = computed<"click" | "center">(() => props.mode ?? "click");

const localValue = reactive<LatLngValue>({
  lat: props.modelValue?.lat ?? null,
  lng: props.modelValue?.lng ?? null,
});

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

const currentCenter = computed<[number, number]>(() => {
  if (localValue.lat != null && localValue.lng != null) {
    return [localValue.lat, localValue.lng];
  }
  return props.center ?? [0, 0];
});

const displayMarkers = computed<BaseMapMarker[]>(() => {
  if (localValue.lat != null && localValue.lng != null) {
    return [
      {
        lat: localValue.lat,
        lng: localValue.lng,
        popup: `Lat: ${localValue.lat}, Lng: ${localValue.lng}`,
      },
    ];
  }
  return [];
});

function onMapClick(pos: { lat: number; lng: number }) {
  if (mode.value !== "click") return;
  localValue.lat = +pos.lat.toFixed(6);
  localValue.lng = +pos.lng.toFixed(6);
}

function onCenterChange(pos: { lat: number; lng: number }) {
  if (mode.value !== "center") return;
  localValue.lat = +pos.lat.toFixed(6);
  localValue.lng = +pos.lng.toFixed(6);
}
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
