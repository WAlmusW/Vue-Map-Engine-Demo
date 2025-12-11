<script setup lang="ts">
import { onMounted, onUnmounted, ref, watch } from "vue";
import { importLibrary } from "@googlemaps/js-api-loader";
import type { LatLngValue, InputMapMode } from "../../types/map";
import type { MarkerConfig, MapControl } from "../../types/google_map";

interface Props {
  modelValue: LatLngValue;
  center?: [number, number];
  zoom?: number;
  mode: InputMapMode;
  mapId: string;
  colorScheme?: "LIGHT" | "DARK";
  mapOptions?: google.maps.MapOptions;
  marker?: MarkerConfig;
  controls?: MapControl[];
}

const props = withDefaults(defineProps<Props>(), {
  zoom: 4,
  mode: "click",
  colorScheme: "LIGHT",
  mapOptions: () => ({
    disableDefaultUI: true,
  }),
  marker: () => ({
    kind: "pin",
    pinOptions: {
      scale: 1.5,
      glyph: "☰",
      glyphColor: "white",
      background: "blue",
    },
  }),
  controls: () => [],
});

const emit = defineEmits<{
  (e: "update:modelValue", value: LatLngValue): void;
}>();

onMounted(() => {
  initMap();
});

onUnmounted(() => {
  destroyMap();
});

const mapContainer = ref<HTMLDivElement | null>(null);
const localValue = ref<LatLngValue>({
  lat: props.modelValue?.lat ?? null,
  lng: props.modelValue?.lng ?? null,
});

let googleMap: google.maps.Map | null = null;
let marker: google.maps.marker.AdvancedMarkerElement | null = null;

function destroyMap(): void {
  if (marker) {
    marker.map = null;
    marker = null;
  }
  if (googleMap) {
    googleMap = null;
  }
}

async function initMap(): Promise<void> {
  destroyMap();
  if (!mapContainer.value) return;

  const { Map } = await importLibrary("maps");
  const { AdvancedMarkerElement, PinElement } = await importLibrary("marker");

  const initialCenter =
    localValue.value.lat != null && localValue.value.lng != null
      ? { lat: localValue.value.lat, lng: localValue.value.lng }
      : props.center
      ? { lat: props.center[0], lng: props.center[1] }
      : { lat: 0, lng: 0 };
  const initialZoom = props.zoom;

  googleMap = new Map(mapContainer.value, {
    center: initialCenter,
    zoom: initialZoom,
    mapId: props.mapId,
    colorScheme: props.colorScheme,
    ...props.mapOptions,
  });

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

  switch (props.mode) {
    case "click":
      const clickListener = (event: google.maps.MapMouseEvent) => {
        if (!event.latLng) return;
        const lat = event.latLng.lat();
        const lng = event.latLng.lng();

        localValue.value.lat = +lat.toFixed(6);
        localValue.value.lng = +lng.toFixed(6);
      };

      googleMap.addListener("click", clickListener);
      break;

    case "center":
      const emitCenterChange = () => {
        if (!googleMap) return;
        const c = googleMap.getCenter();
        if (!c) return;
        localValue.value.lat = +c.lat().toFixed(6);
        localValue.value.lng = +c.lng().toFixed(6);
      };

      googleMap.addListener("idle", emitCenterChange);
      emitCenterChange();
      break;

    case "drag":
      const cfg = props.marker ?? { kind: "pin" as const };
      let contentEl: HTMLElement;

      switch (cfg.kind) {
        case "pin": {
          const pin = new PinElement(cfg.pinOptions);
          contentEl = pin.element;
          break;
        }

        case "img": {
          const img = document.createElement("img");
          img.src = cfg.src;
          img.style.width = "40px";
          img.style.height = "40px";
          img.style.objectFit = "contain";
          contentEl = img;
          break;
        }

        case "svgString": {
          const parser = new DOMParser();
          const svgDoc = parser.parseFromString(cfg.svg, "image/svg+xml");
          const svgEl = svgDoc.documentElement as unknown as HTMLElement;
          contentEl = svgEl;
          break;
        }

        case "customElement": {
          contentEl = cfg.createElement();
          break;
        }
      }

      // @ts-ignore
      marker = new AdvancedMarkerElement({
        map: googleMap,
        position: initialCenter,
        gmpDraggable: true,
        content: contentEl,
        title: "title" in cfg ? cfg.title : undefined,
      });

      const updatePosition = () => {
        if (!marker) return;
        const pos = marker.position as google.maps.LatLng;
        if (!pos) return;

        const lat = pos.lat;
        const lng = pos.lng;

        localValue.value.lat = +lat;
        localValue.value.lng = +lng;
      };

      marker.addListener("dragend", updatePosition);
      updatePosition();
      break;
  }
}

watch(
  () => props.modelValue,
  (newVal) => {
    if (newVal) {
      localValue.value.lat = newVal.lat;
      localValue.value.lng = newVal.lng;
    } else {
      localValue.value.lat = null;
      localValue.value.lng = null;
    }
  },
  { deep: true, immediate: true }
);

watch(
  () => ({ ...localValue.value }),
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

watch(
  [() => props.mapId, () => props.colorScheme],
  async (_) => {
    if (!googleMap) return; // Wait for initial map

    console.log(
      `Reinitializing map with new mapId ${props.mapId} or colorScheme ${props.colorScheme}`
    );

    // Save current state
    const currentCenter = googleMap.getCenter();
    const currentZoom = googleMap.getZoom();

    // Clean up marker
    if (marker) {
      marker.map = null;
      marker = null;
    }

    // Destroy current map
    destroyMap();

    // Reinitialize with new mapId
    await initMap();

    // Restore state
    if (currentCenter) googleMap?.setCenter(currentCenter);
    if (currentZoom != null) googleMap?.setZoom(currentZoom);
  },
  { immediate: false }
);
</script>

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

<style scoped>
.input-map-wrapper {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
} /* Make it possible to overlay crosshair on top of the map */

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
