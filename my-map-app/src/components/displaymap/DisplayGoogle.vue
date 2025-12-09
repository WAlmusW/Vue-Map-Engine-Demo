<template>
  <div class="map" ref="mapContainer"></div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch, nextTick } from "vue";
import type { GoogleMapsSource } from "../../types/map";

/* ===========================
   Google Maps imports
   =========================== */
import { setOptions } from "@googlemaps/js-api-loader";

interface Props {
  lat: number;
  lng: number;
  zoom?: number;
  popupText?: string;
  source: GoogleMapsSource;
}

const props = withDefaults(defineProps<Props>(), {
  zoom: 12,
});

/* ===========================
   State
   =========================== */
const mapContainer = ref<HTMLDivElement | null>(null);

/* ===========================
   Google Maps state
   =========================== */
let googleMap: any = null;
let googleMarker: any = null;

/* ===========================
   Destroy map
   =========================== */
function destroyMap() {
  if (googleMap) {
    googleMap = null;
    googleMarker = null;
  }
}

/* ===========================
   Init Google Maps
   =========================== */
async function initMap() {
  destroyMap();
  if (!mapContainer.value) return;

  const initialCenter: google.maps.LatLngLiteral = {
    lat: props.lat,
    lng: props.lng,
  };
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

  const { Map, Marker, InfoWindow } = await google.maps.importLibrary("maps");

  // The google namespace is now available globally
  googleMap = new Map(mapContainer.value, {
    center: initialCenter,
    zoom: initialZoom,
    ...(src.mapId ? { mapId: src.mapId } : {}),
  });

  googleMarker = new Marker({
    position: { lat: props.lat, lng: props.lng },
    map: googleMap,
  });

  if (props.popupText) {
    const infoWindow = new InfoWindow({
      content: props.popupText,
    });
    googleMarker.addListener("click", () => {
      infoWindow.open({ anchor: googleMarker, map: googleMap });
    });
  }
}

/* ===========================
   Markers update
   =========================== */
function updateMarker() {
  if (!googleMap || !googleMarker) return;

  googleMarker.setPosition({ lat: props.lat, lng: props.lng });
}

/* ===========================
   Watchers
   =========================== */
watch(
  () => [props.lat, props.lng],
  () => {
    if (!googleMap) return;
    googleMap.setCenter({ lat: props.lat, lng: props.lng });
    updateMarker();
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
.map {
  width: 100%;
  height: 100%;
  min-height: 300px;
}
</style>
