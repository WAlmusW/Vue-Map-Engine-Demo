<template>
  <div id="app">
    <h1>Leaflet + Vue + TS Demo</h1>

    <section class="section">
      <h2>1. Input Map (pick coordinates)</h2>
      {{ DarkModeStyle }}

      <InputGoogle
        v-model="position"
        mode="drag"
        :source="{
          type: 'google',
        }"
        :style="DarkModeStyle"
        :controls="controls"
      />

      <p>
        Current position:
        <strong> {{ position.lat ?? "—" }}, {{ position.lng ?? "—" }} </strong>
      </p>

      <div class="service-selector">
        <label>
          <strong>Geocoding Service:</strong>
        </label>
        <div class="radio-group">
          <label>
            <input
              type="radio"
              value="openstreetmap"
              v-model="selectedService"
            />
            OpenStreetMap
          </label>
          <label>
            <input type="radio" value="googlemaps" v-model="selectedService" />
            Google Maps
          </label>
        </div>
      </div>

      <p v-if="address || isLoadingAddress">
        Address:
        <strong v-if="isLoadingAddress">Loading address...</strong>
        <strong v-else>{{ address }}</strong>
      </p>
    </section>

    <section
      class="section display-section"
      v-if="position.lat != null && position.lng != null"
    >
      <h2>2. Display Map (read-only)</h2>

      <h3>Using Google Maps</h3>
      <DisplayGoogle
        :lat="position.lat"
        :lng="position.lng"
        :zoom="6"
        :popupText="'This is the selected point'"
        :source="{
          type: 'google',
        }"
      />

      <h3>Using Leaflet + OpenStreetMap</h3>
      <DisplayLeaflet
        :lat="position.lat"
        :lng="position.lng"
        :zoom="6"
        :popupText="'This is the selected point'"
        :source="{
          type: 'raster',
          urlTemplate: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
          attribution: '&copy; OpenStreetMap contributors',
          maxZoom: 19,
        }"
      />

      <h3>Using Leaflet + OpenTopoMap</h3>
      <DisplayLeaflet
        :lat="position.lat"
        :lng="position.lng"
        :zoom="10"
        :popupText="'Topo view'"
        :source="{
          type: 'raster',
          urlTemplate: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
          attribution:
            'Kartendaten: © OpenStreetMap-Mitwirkende, SRTM | Kartendarstellung: © OpenTopoMap (CC-BY-SA)',
          maxZoom: 17,
        }"
      />

      <h3>Using Leaflet + Carto</h3>
      <DisplayLeaflet
        :lat="position.lat"
        :lng="position.lng"
        :zoom="10"
        :popupText="'Topo view'"
        :source="{
          type: 'raster',
          urlTemplate:
            'http://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png',
          attribution:
            'Map data &copy; OpenStreetMap contributors, &copy; CartoDB',
          maxZoom: 17,
        }"
      />

      <h3>Using MapLibre + demo tiles</h3>
      <DisplayMaplibre
        :lat="position.lat"
        :lng="position.lng"
        :zoom="6"
        :popupText="'This is the selected point'"
        :source="{
          type: 'maplibre-style',
          styleUrl: 'https://demotiles.maplibre.org/style.json',
        }"
      />

      <h3>Using OpenLayers + built-in OSM</h3>
      <DisplayOpenLayers
        :lat="position.lat"
        :lng="position.lng"
        :zoom="6"
        :popupText="'This is the selected point'"
        :source="{ type: 'openlayers-osm' }"
      />

      <h3>Using OpenLayers + external OpenStreetMap</h3>
      <DisplayOpenLayers
        :lat="position.lat"
        :lng="position.lng"
        :zoom="6"
        :popupText="'This is the selected point'"
        :source="{
          type: 'raster',
          urlTemplate: 'https://{a-c}.tile.openstreetmap.org/{z}/{x}/{y}.png',
          attribution: '&copy; OpenStreetMap contributors',
          maxZoom: 19,
        }"
      />
    </section>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from "vue";
import InputGoogle from "./components/inputmap/InputGoogle.vue";
import DisplayGoogle from "./components/displaymap/DisplayGoogle.vue";
import DisplayLeaflet from "./components/displaymap/DisplayLeaflet.vue";
import DisplayMaplibre from "./components/displaymap/DisplayMaplibre.vue";
import DisplayOpenLayers from "./components/displaymap/DisplayOpenLayers.vue";
import {
  reverseGeocode as osmReverseGeocode,
  formatAddress,
} from "./services/openStreetMapService";
import { reverseGeocode as gmapsReverseGeocode } from "./services/googleMapsService";
import type { MapControl } from "./types/google_map";
import {
  DarkModeStyle,
  RetroStyle,
} from "./components/inputmap/GoogleMapStyle";

interface LatLngValue {
  lat: number | null;
  lng: number | null;
}

const position = ref<LatLngValue>({
  lat: null,
  lng: null,
});

const address = ref<string>("");
const isLoadingAddress = ref<boolean>(false);
const selectedService = ref<"openstreetmap" | "googlemaps">("openstreetmap");
const currentStyleKey = ref<"DarkMode" | "RetroMode">("DarkMode");
const geocodingTimeoutId = ref<number | null>(null);

const controls: MapControl[] = [
  {
    position: google.maps.ControlPosition.RIGHT_BOTTOM,
    createElement: ({ map }) => {
      const container = document.createElement("div");
      container.style.display = "flex";
      container.style.flexDirection = "column";
      container.style.gap = "4px";
      container.style.margin = "8px";

      const btnBase = () => {
        const btn = document.createElement("button");
        btn.classList.add("custom-map-control-button");
        btn.style.width = "32px";
        btn.style.height = "32px";
        btn.style.borderRadius = "4px";
        btn.style.border = "none";
        btn.style.cursor = "pointer";
        btn.style.boxShadow = "0 1px 4px rgba(0,0,0,0.3)";
        btn.style.background = "#fff";
        return btn;
      };

      // + button
      const zoomInBtn = btnBase();
      zoomInBtn.textContent = "+";
      zoomInBtn.title = "Zoom in";
      zoomInBtn.addEventListener("click", () => {
        const currentZoom = map.getZoom() ?? 0;
        map.setZoom(currentZoom + 1);
      });

      // - button
      const zoomOutBtn = btnBase();
      zoomOutBtn.textContent = "−";
      zoomOutBtn.title = "Zoom out";
      zoomOutBtn.addEventListener("click", () => {
        const currentZoom = map.getZoom() ?? 0;
        map.setZoom(currentZoom - 1);
      });

      container.appendChild(zoomInBtn);
      container.appendChild(zoomOutBtn);

      return container;
    },
  },
  {
    position: google.maps.ControlPosition.TOP_CENTER,
    createElement: ({ map }) => {
      const btn = document.createElement("button");

      btn.classList.add("custom-map-control-button");
      btn.style.marginTop = "8px";
      btn.textContent =
        currentStyleKey.value === "DarkMode"
          ? "Switch to style Retro"
          : "Switch to style Dark";

      btn.addEventListener("click", () => {
        // flip between X and Y
        currentStyleKey.value =
          currentStyleKey.value === "DarkMode" ? "RetroMode" : "DarkMode";

        // update button label
        btn.textContent =
          currentStyleKey.value === "DarkMode"
            ? "Switch to style Retro"
            : "Switch to style Dark";

        // map will react via your `style` watcher,
        // but you *can* also force it directly if you want:
        const styles =
          currentStyleKey.value === "DarkMode" ? DarkModeStyle : RetroStyle;
        map.setOptions({ styles: styles });
      });

      return btn;
    },
  },
];

/**
 * Get the appropriate reverse geocoding function based on selected service
 */
function getReverseGeocodeFunction() {
  return selectedService.value === "googlemaps"
    ? gmapsReverseGeocode
    : osmReverseGeocode;
}

/**
 * Perform reverse geocoding with debouncing
 */
async function performReverseGeocoding(newPosition: LatLngValue) {
  if (newPosition.lat != null && newPosition.lng != null) {
    isLoadingAddress.value = true;
    try {
      const reverseGeocodeFn = getReverseGeocodeFunction();
      const result = await reverseGeocodeFn(newPosition.lat, newPosition.lng);
      if (result?.displayName) {
        address.value = result.displayName;
      } else if (result?.address) {
        address.value = formatAddress(result.address);
      } else {
        address.value = "Unable to determine address";
      }
    } catch (error) {
      console.error("Error getting address:", error);
      address.value = "Error retrieving address";
    } finally {
      isLoadingAddress.value = false;
    }
  } else {
    address.value = "";
    isLoadingAddress.value = false;
  }
}

// Watch for position changes and reverse geocode (debounced by 1000ms)
watch(position, (newPosition) => {
  if (geocodingTimeoutId.value) {
    clearTimeout(geocodingTimeoutId.value);
  }
  geocodingTimeoutId.value = setTimeout(() => {
    performReverseGeocoding(newPosition);
  }, 1000);
});

// Watch for service changes to re-geocode with new service
watch(selectedService, async () => {
  const currentPosition = position.value;
  if (currentPosition.lat != null && currentPosition.lng != null) {
    // Trigger re-geocoding with the new service
    const watcher = watch(position, () => {}, { immediate: false });
    watcher();
    await new Promise((resolve) => setTimeout(resolve, 0)); // Wait for reactivity
    position.value = { ...currentPosition }; // Trigger the position watch
  }
});
</script>

<style>
#app {
  font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI",
    sans-serif;
  padding: 1rem;
}
.section {
  margin-bottom: 2rem;
}

.display-section {
  min-height: 400px;
  display: block !important;
  width: 100%;
}

.service-selector {
  margin: 0.5rem 0;
  padding: 0.5rem;
  background: #f5f5f5;
  border-radius: 4px;
  border: 1px solid #ddd;
}

.service-selector strong {
  display: block;
  margin-bottom: 0.5rem;
}

.radio-group {
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
}

.radio-group label {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  cursor: pointer;
}
</style>
