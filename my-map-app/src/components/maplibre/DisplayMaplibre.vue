<template>
  <div class="map" ref="mapContainer"></div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch } from "vue";
import type { MapLibreStyleSource } from "../../types/map";

/* ===========================
   MapLibre imports
   =========================== */
import maplibregl, {
  Map as MapLibreMap,
  Marker as MapLibreMarker,
  Popup as MapLibrePopup,
} from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

interface Props {
  lat: number;
  lng: number;
  zoom?: number;
  popupText?: string;
  source?: MapLibreStyleSource;
}

const props = withDefaults(defineProps<Props>(), {
  zoom: 12,
  source: () => ({
    type: "maplibre-style",
    styleUrl: "https://demotiles.maplibre.org/style.json",
  }),
});

/* ===========================
   State
   =========================== */
const mapContainer = ref<HTMLDivElement | null>(null);

/* ===========================
   MapLibre state
   =========================== */
let mapLibreMap: MapLibreMap | null = null;
let mapLibreMarker: MapLibreMarker | null = null;

/* ===========================
   Destroy map
   =========================== */
function destroyMap() {
  if (mapLibreMap) {
    mapLibreMarker?.remove();
    mapLibreMap.remove();
    mapLibreMap = null;
    mapLibreMarker = null;
  }
}

/* ===========================
   Init MapLibre
   =========================== */
function initMap() {
  destroyMap();
  if (!mapContainer.value) return;

  const initialCenter: [number, number] = [props.lng, props.lat]; // [lng, lat]
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

  mapLibreMarker = new maplibregl.Marker().setLngLat([props.lng, props.lat]);

  if (props.popupText) {
    const popup = new maplibregl.Popup().setHTML(props.popupText);
    mapLibreMarker.setPopup(popup);
  }

  mapLibreMarker.addTo(mapLibreMap);
}

/* ===========================
   Markers update
   =========================== */
function updateMarker() {
  if (!mapLibreMarker) return;
  mapLibreMarker.setLngLat([props.lng, props.lat]);
}

/* ===========================
   Watchers
   =========================== */
watch(
  () => [props.lat, props.lng],
  () => {
    if (!mapLibreMap) return;
    mapLibreMap.setCenter([props.lng, props.lat]);
    updateMarker();
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
.map {
  width: 100%;
  height: 100%;
  min-height: 300px;
}
</style>
