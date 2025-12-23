<template>
  <div class="map" ref="mapContainer"></div>
</template>

<script setup lang="ts">
import {
  ref,
  onMounted,
  onBeforeUnmount,
  watch,
  nextTick,
  computed,
} from "vue";
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
  center: () => [-6.2088, 106.8456], // Jakarta center for demo
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

// Bounds and marker filtering state
const currentBounds = ref<google.maps.LatLngBounds | null>(null);

/**
 * Computed property that filters markers to only show those within current viewport bounds.
 * This is the core of the viewport-based marker filtering example.
 *
 * Uses google.maps.LatLngBounds.contains() to check if each marker's position
 * falls within the current map bounds retrieved via googleMap.getBounds().
 */
const visibleMarkers = computed(() => {
  if (!currentBounds.value) return props.markers || [];
  return (props.markers || []).filter((marker) => {
    if (!marker.position) return false;
    return currentBounds.value!.contains(marker.position);
  });
});

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

  const bounds = new google.maps.LatLngBounds();

  props.markers.forEach((marker) => {
    if (marker.position) {
      bounds.extend(marker.position);
    }
  });

  googleMap.fitBounds(bounds);

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
      if (placeId) placeIdFocused.value = placeId;
      highlightFocused();
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

  // Apply the style to a single boundary.
  //@ts-ignore
  featureLayer.style = (options: { feature: { placeId: string } }) => {
    if (options.feature.placeId == placeIdFocused.value) {
      return featureStyleOptions;
    }
  };
}

/* ===========================
   Bounds and marker filtering functions
   =========================== */

/**
 * Updates the current viewport bounds whenever the map view changes.
 * This is called by the 'bounds_changed' event listener.
 *
 * The googleMap.getBounds() method returns a LatLngBounds object representing
 * the current viewport boundaries (northeast and southwest corners).
 */
function updateBounds() {
  if (!googleMap) return;
  // Get current viewport bounds using googleMap.getBounds()
  currentBounds.value = googleMap.getBounds() || null;
  console.log("Current bounds:", currentBounds.value?.toJSON());
}

/**
 * Attaches only the markers that are currently visible within the viewport.
 * This function demonstrates viewport-based marker filtering:
 *
 * 1. Detaches all currently attached markers
 * 2. Attaches only markers from the visibleMarkers computed property
 * 3. visibleMarkers filters props.markers using LatLngBounds.contains()
 *
 * This approach improves performance by only rendering markers in the current view.
 */
function attachVisibleMarkers() {
  if (!googleMap) return;

  // Detach existing markers
  attachedMarkers.forEach((marker) => {
    marker.map = null;
  });
  attachedMarkers = [];

  // Attach only visible markers (filtered by viewport bounds)
  visibleMarkers.value.forEach((marker) => {
    marker.map = googleMap;
    attachedMarkers.push(marker);
  });

  console.log(
    `Attached ${attachedMarkers.length} visible markers out of ${
      (props.markers || []).length
    } total`
  );
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

  // Update bounds initially
  updateBounds();

  // Attach visible markers
  attachVisibleMarkers();

  // Add event listeners for bounds changes
  googleMap.addListener("bounds_changed", () => {
    updateBounds();
  });

  googleMap.addListener("idle", () => {
    // Update markers when map stops moving
    attachVisibleMarkers();
  });

  // Focus on place if specified
  if (props.focusOn) {
    getPlaceId();
  }
}

/* ===========================
   Watchers
   =========================== */
watch(
  () => visibleMarkers.value,
  () => {
    attachVisibleMarkers();
  },
  { immediate: false }
);
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
