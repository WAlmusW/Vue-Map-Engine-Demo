<template>
  <div class="map" ref="mapContainer"></div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch } from "vue";
import type { RasterSource, BaseMapMarker } from "../../types/map";

/* ===========================
   Leaflet imports
   =========================== */
import L, {
  Map as LeafletMap,
  LayerGroup,
  Marker as LeafletMarker,
} from "leaflet";
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
  lat: number;
  lng: number;
  zoom?: number;
  popupText?: string;
  source?: RasterSource;
}

const props = withDefaults(defineProps<Props>(), {
  zoom: 12,
});

/* ===========================
   State
   =========================== */
const mapContainer = ref<HTMLDivElement | null>(null);

/* ===========================
   Leaflet state
   =========================== */
let leafletMap: LeafletMap | null = null;
let leafletMarkersLayer: LayerGroup | null = null;
let leafletMarkerInstances: LeafletMarker[] = [];

/* ===========================
   Destroy map
   =========================== */
function destroyMap() {
  if (leafletMap) {
    leafletMap.remove();
    leafletMap = null;
    leafletMarkersLayer = null;
    leafletMarkerInstances = [];
  }
}

/* ===========================
   Init Leaflet
   =========================== */
function initMap() {
  destroyMap();
  if (!mapContainer.value) return;

  const initialCenter: [number, number] = [props.lat, props.lng];
  const initialZoom = props.zoom;

  leafletMap = L.map(mapContainer.value).setView(initialCenter, initialZoom);

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

  leafletMarkersLayer = L.layerGroup().addTo(leafletMap);
  updateMarkers();
}

/* ===========================
   Markers update
   =========================== */
function updateMarkers() {
  if (!leafletMarkersLayer) return;

  leafletMarkersLayer.clearLayers();
  leafletMarkerInstances = [];

  const marker = L.marker([props.lat, props.lng]).addTo(leafletMarkersLayer);
  if (props.popupText) marker.bindPopup(props.popupText);
  leafletMarkerInstances.push(marker);
}

/* ===========================
   Watchers
   =========================== */
watch(
  () => [props.lat, props.lng],
  () => {
    if (!leafletMap) return;
    leafletMap.setView([props.lat, props.lng], props.zoom);
    updateMarkers();
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
.map {
  width: 100%;
  height: 100%;
  min-height: 300px;
}
</style>
