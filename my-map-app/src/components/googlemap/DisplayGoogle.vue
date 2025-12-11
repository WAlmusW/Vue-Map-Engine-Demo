<template>
  <div class="map" ref="mapContainer"></div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch, nextTick } from "vue";
import type { MapControl, MapFocusConfig } from "./Configs";

/* ===========================
   Google Maps imports
   =========================== */
import { importLibrary } from "@googlemaps/js-api-loader";

interface Props {
  center?: [number, number];
  zoom?: number;
  mapId?: string;
  colorScheme?: "LIGHT" | "DARK";
  mapOptions?: google.maps.MapOptions;
  focusOn?: MapFocusConfig;
  controls?: MapControl[];
  markers?: google.maps.marker.AdvancedMarkerElement[];
}

const props = withDefaults(defineProps<Props>(), {
  zoom: 12,
  colorScheme: "LIGHT",
  mapOptions: () => ({
    disableDefaultUI: true,
  }),
  controls: () => [],
  markers: () => [],
});

/* ===========================
   State
   =========================== */
const mapContainer = ref<HTMLDivElement | null>(null);
const placeIdFocused = ref<string | null>(null);
let featureLayer;

/* ===========================
   Google Maps state
   =========================== */
let googleMap: google.maps.Map | null = null;
let attachedMarkers: google.maps.marker.AdvancedMarkerElement[] = [];

/* ===========================
   Destroy map
   =========================== */
function destroyMap() {
  // Detach all markers from the map
  if (attachedMarkers.length > 0) {
    attachedMarkers.forEach((marker) => {
      marker.map = null;
    });
    attachedMarkers = [];
  }

  if (googleMap) {
    googleMap = null;
  }
}

/* ===========================
   Attach markers to map
   =========================== */
function attachMarkers() {
  if (!googleMap) return;

  // Detach existing markers
  attachedMarkers.forEach((marker) => {
    marker.map = null;
  });
  attachedMarkers = [];

  // Attach new markers
  props.markers?.forEach((marker) => {
    marker.map = googleMap;
    attachedMarkers.push(marker);
  });

  // Fit bounds to show all markers if any exist
  if (props.markers && props.markers.length > 0) {
    fitMapToMarkers();
  }
}

/* ===========================
   Fit map to show all markers
   =========================== */
function fitMapToMarkers() {
  if (!googleMap || !props.markers || props.markers.length === 0) return;

  props.markers.forEach((marker) => {
    var currentBounds = googleMap!.getBounds();
    var markerPosition = marker.position;

    if (!currentBounds?.contains(markerPosition!)) {
      var newBounds = currentBounds?.extend(markerPosition!);
      googleMap!.fitBounds(newBounds!, 100);
    }
  });

  // If only one marker, set a reasonable zoom level
  if (props.markers.length === 1) {
    googleMap.setZoom(Math.min(googleMap.getZoom() || 12, 15));
  }
}

function getPlaceId() {
  if (!googleMap || !props.focusOn) return;

  const service = new google.maps.places.PlacesService(googleMap);

  const request = {
    query: props.focusOn.name,
    fields: ["place_id"],
  };

  service.findPlaceFromQuery(request, (results, status) => {
    if (
      status === google.maps.places.PlacesServiceStatus.OK &&
      results &&
      results[0]
    ) {
      const placeId = results[0].place_id;
      console.log("Found place ID:", placeId);
      if (placeId) placeIdFocused.value = placeId;
    } else {
      console.error("Place not found or error occurred:", status);
    }
  });
}

function highlightFocused() {
  if (!googleMap || !placeIdFocused.value || !props.focusOn) return;

  featureLayer = googleMap.getFeatureLayer(props.focusOn.featureType);

  const featureStyleOptions: google.maps.FeatureStyleOptions =
    props.focusOn.featureStyleOptions;

  featureLayer.style = (options) => {
    const f = options?.feature;
    if (!f) return undefined;

    // Try common locations where an id might live (use a type assertion only here)
    const placeId =
      (f as any).placeId ??
      (f as any).id ??
      (f as any).properties?.placeId ??
      (f as any).properties?.place_id;

    if (!placeId) return undefined;
    if (String(placeId) === placeIdFocused.value) {
      return featureStyleOptions;
    }
    return undefined;
  };
}

/* ===========================
   Init Google Maps
   =========================== */
async function initMap() {
  destroyMap();
  if (!mapContainer.value) return;

  const initialCenter: google.maps.LatLngLiteral = props.center
    ? { lat: props.center[0], lng: props.center[1] }
    : { lat: 0, lng: 0 };
  const initialZoom = props.zoom;

  // Need to wait for next tick to ensure DOM is ready
  await nextTick();

  const { Map } = await importLibrary("maps");
  await importLibrary("places");

  googleMap = new Map(mapContainer.value, {
    center: initialCenter,
    zoom: initialZoom,
    mapId: props.mapId,
    colorScheme: props.colorScheme,
    ...props.mapOptions,
  });

  // Add controls
  props.controls?.forEach((control) => {
    const el = control.createElement({ map: googleMap! });

    const position = control.position ?? google.maps.ControlPosition.TOP_RIGHT;

    const ctrlArray = googleMap!.controls[position];

    if (typeof control.index === "number") {
      ctrlArray!.insertAt(control.index, el);
    } else {
      ctrlArray!.push(el);
    }
  });

  // Attach markers
  attachMarkers();

  // Focus on place if specified
  if (props.focusOn) {
    getPlaceId();
    highlightFocused();
  }
}

/* ===========================
   Watchers
   =========================== */
watch(
  () => props.center,
  (newCenter) => {
    if (!newCenter || !googleMap) return;
    googleMap.setCenter({ lat: newCenter[0], lng: newCenter[1] });
  }
);

watch(
  () => props.zoom,
  (newZoom) => {
    if (typeof newZoom !== "number" || !googleMap) return;
    googleMap.setZoom(newZoom);
  }
);

watch(
  () => props.markers,
  () => {
    attachMarkers();
  },
  { deep: true }
);

watch(
  [() => props.mapId, () => props.colorScheme],
  async () => {
    if (!googleMap) return;
    console.log(
      `Reinitializing map with new mapId ${props.mapId} or colorScheme ${props.colorScheme}`
    );
    await initMap();
  },
  { immediate: false }
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
