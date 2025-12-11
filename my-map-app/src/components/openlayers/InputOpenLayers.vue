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
import { ref, reactive, watch, onMounted, onBeforeUnmount } from "vue";
import type {
  LatLngValue,
  OpenLayersOsmSource,
  RasterSource,
} from "../../types/map";

/* ===========================
   OpenLayers imports
   =========================== */
import OLMap from "ol/Map";
import View from "ol/View";
import TileLayer from "ol/layer/Tile";
import OSM from "ol/source/OSM";
import XYZ from "ol/source/XYZ";
import { fromLonLat, toLonLat } from "ol/proj";

interface Props {
  modelValue: LatLngValue;
  center?: [number, number];
  zoom?: number;
  source?: RasterSource | OpenLayersOsmSource;
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
   OpenLayers state
   =========================== */
let olMap: OLMap | null = null;

/* ===========================
   Destroy map
   =========================== */
function destroyMap() {
  if (olMap) {
    olMap.setTarget(undefined as any);
    olMap = null;
  }
}

/* ===========================
   Init OpenLayers
   =========================== */
function initMap() {
  destroyMap();
  if (!mapContainer.value) return;

  const initialCenter =
    localValue.lat != null && localValue.lng != null
      ? fromLonLat([localValue.lng, localValue.lat])
      : props.center
      ? fromLonLat([props.center[1], props.center[0]])
      : fromLonLat([0, 0]);
  const initialZoom = props.zoom;

  const src = props.source;

  let baseLayer: TileLayer<any>;
  if (src && src.type === "raster") {
    baseLayer = new TileLayer({
      source: new XYZ({
        url: src.urlTemplate,
        attributions: src.attribution,
        maxZoom: src.maxZoom ?? 19,
      }),
    });
  } else {
    baseLayer = new TileLayer({
      source: new OSM(),
    });
  }

  olMap = new OLMap({
    target: mapContainer.value,
    layers: [baseLayer],
    view: new View({
      center: initialCenter,
      zoom: initialZoom,
    }),
  });

  if (props.mode === "click") {
    olMap.on("click", (evt) => {
      const [lon, lat] = toLonLat(evt.coordinate);
      localValue.lat = +(lat ?? 0).toFixed(6);
      localValue.lng = +(lon ?? 0).toFixed(6);
    });
  } else if (props.mode === "center") {
    const emitCenterChange = () => {
      if (!olMap) return;
      const center = olMap.getView().getCenter();
      if (!center) return;
      const [lon, lat] = toLonLat(center);
      localValue.lat = +(lat ?? 0).toFixed(6);
      localValue.lng = +(lon ?? 0).toFixed(6);
    };

    olMap.on("moveend", emitCenterChange);
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
    if (!newCenter || !olMap) return;
    if (props.mode === "center") {
      olMap.getView().setCenter(fromLonLat([newCenter[1], newCenter[0]]));
    }
  }
);

watch(
  () => props.zoom,
  (newZoom) => {
    if (typeof newZoom !== "number" || !olMap) return;
    olMap.getView().setZoom(newZoom);
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
