<template>
  <div class="map" id="map" ref="mapContainer"></div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch, computed } from "vue";

/* ===========================
   Leaflet imports
   =========================== */
import L, {
  Map as LeafletMap,
  type LeafletMouseEvent,
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

/* ===========================
   MapLibre imports
   =========================== */
import maplibregl, {
  Map as MapLibreMap,
  Marker as MapLibreMarker,
  Popup as MapLibrePopup,
} from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

/* ===========================
   OpenLayers imports
   =========================== */
import OLMap from "ol/Map";
import View from "ol/View";
import TileLayer from "ol/layer/Tile";
import OSM from "ol/source/OSM";
import XYZ from "ol/source/XYZ";
import VectorLayer from "ol/layer/Vector";
import VectorSource from "ol/source/Vector";
import Feature from "ol/Feature";
import Point from "ol/geom/Point";
import { fromLonLat, toLonLat } from "ol/proj";
import Style from "ol/style/Style";
import CircleStyle from "ol/style/Circle";
import Fill from "ol/style/Fill";
import Stroke from "ol/style/Stroke";

/* ===========================
   Google Maps imports
   =========================== */
import { setOptions } from "@googlemaps/js-api-loader";

/* ===========================
   Types
   =========================== */
export type MapEngine = "leaflet" | "maplibre" | "openlayers" | "google";

export interface RasterSource {
  type: "raster";
  urlTemplate: string;
  attribution?: string;
  maxZoom?: number;
}

export interface MapLibreStyleSource {
  type: "maplibre-style";
  styleUrl: string;
}

export interface OpenLayersOsmSource {
  type: "openlayers-osm";
}

export interface GoogleMapsSource {
  type: "google";
  apiKey: string;
  mapId?: string; // optional map style ID if you configured one
}

export type BaseMapSource =
  | RasterSource
  | MapLibreStyleSource
  | OpenLayersOsmSource
  | GoogleMapsSource;

export interface BaseMapMarker {
  id?: string | number;
  lat: number;
  lng: number;
  popup?: string;
}

/* ===========================
   Props / Emits
   =========================== */
const props = defineProps<{
  engine?: MapEngine;
  source?: BaseMapSource;
  center?: [number, number];
  zoom?: number;
  clickable?: boolean;
  markers?: BaseMapMarker[];
}>();

const emit = defineEmits<{
  (e: "map-click", payload: { lat: number; lng: number }): void;
  (e: "center-change", payload: { lat: number; lng: number }): void;
}>();

const mapContainer = ref<HTMLDivElement | null>(null);

const activeEngine = computed<MapEngine>(() => props.engine ?? "leaflet");

/* ===========================
   Leaflet state
   =========================== */
let leafletMap: LeafletMap | null = null;
let leafletMarkersLayer: LayerGroup | null = null;
let leafletMarkerInstances: LeafletMarker[] = [];

/* ===========================
   MapLibre state
   =========================== */
let mapLibreMap: MapLibreMap | null = null;
let mapLibreMarkerInstances: MapLibreMarker[] = [];

/* ===========================
   OpenLayers state
   =========================== */
let olMap: OLMap | null = null;
let olMarkersSource: VectorSource | null = null;
let olMarkersLayer: VectorLayer<VectorSource> | null = null;

/* ===========================
   Google Maps state
   =========================== */
let googleMap: any = null;
let googleMarkers: any[] = [];

/* ===========================
   Destroy everything
   =========================== */
function destroyMap() {
  if (leafletMap) {
    leafletMap.remove();
    leafletMap = null;
    leafletMarkersLayer = null;
    leafletMarkerInstances = [];
  }

  if (mapLibreMap) {
    mapLibreMarkerInstances.forEach((m) => m.remove());
    mapLibreMarkerInstances = [];
    mapLibreMap.remove();
    mapLibreMap = null;
  }

  if (olMap) {
    olMap.setTarget(undefined as any);
    olMap = null;
    olMarkersSource = null;
    olMarkersLayer = null;
  }

  if (googleMap) {
    googleMarkers.forEach((m) => m.setMap(null));
    googleMarkers = [];
    googleMap = null;
  }
}

/* ===========================
   Init dispatcher
   =========================== */
function initMap() {
  destroyMap();
  if (!mapContainer.value) return;

  if (activeEngine.value === "leaflet") {
    initLeaflet();
  } else if (activeEngine.value === "maplibre") {
    initMapLibre();
  } else if (activeEngine.value === "openlayers") {
    initOpenLayers();
  } else if (activeEngine.value === "google") {
    initGoogleMaps();
  }
}

/* ===========================
   Leaflet init
   =========================== */
function initLeaflet() {
  if (!mapContainer.value) return;

  const initialCenter = props.center ?? [0, 0];
  const initialZoom = props.zoom ?? 2;

  leafletMap = L.map(mapContainer.value).setView(initialCenter, initialZoom);

  const src = props.source;
  if (src && src.type === "raster") {
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

  if (props.clickable) {
    leafletMap.on("click", (e: LeafletMouseEvent) => {
      const { lat, lng } = e.latlng;
      emit("map-click", { lat, lng });
    });
  }

  const emitLeafletCenter = () => {
    if (!leafletMap) return;
    const c = leafletMap.getCenter();
    emit("center-change", { lat: c.lat, lng: c.lng });
  };
  leafletMap.on("moveend", emitLeafletCenter);
  emitLeafletCenter();

  updateMarkers();
}

/* ===========================
   MapLibre init
   =========================== */
function initMapLibre() {
  if (!mapContainer.value) return;

  const initialCenter = props.center ?? [0, 0]; // [lat, lng]
  const initialZoom = props.zoom ?? 2;

  const src = props.source;
  const styleUrl =
    src && src.type === "maplibre-style"
      ? src.styleUrl
      : "https://demotiles.maplibre.org/style.json";

  mapLibreMap = new maplibregl.Map({
    container: mapContainer.value,
    style: styleUrl,
    center: [initialCenter[1], initialCenter[0]], // lon, lat
    zoom: initialZoom,
  });

  if (props.clickable) {
    mapLibreMap.on("click", (e) => {
      const lat = e.lngLat.lat;
      const lng = e.lngLat.lng;
      emit("map-click", { lat, lng });
    });
  }

  const emitMapLibreCenter = () => {
    if (!mapLibreMap) return;
    const c = mapLibreMap.getCenter();
    emit("center-change", { lat: c.lat, lng: c.lng });
  };

  mapLibreMap.on("moveend", emitMapLibreCenter);
  mapLibreMap.on("load", () => {
    emitMapLibreCenter();
    updateMarkers();
  });
}

/* ===========================
   OpenLayers init
   =========================== */
function initOpenLayers() {
  if (!mapContainer.value) return;

  const initialCenter = props.center ?? [0, 0];
  const initialZoom = props.zoom ?? 2;

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

  olMarkersSource = new VectorSource();
  olMarkersLayer = new VectorLayer({
    source: olMarkersSource,
    style: new Style({
      image: new CircleStyle({
        radius: 6,
        fill: new Fill({ color: "#ff5252" }),
        stroke: new Stroke({ color: "#ffffff", width: 2 }),
      }),
    }),
  });

  olMap = new OLMap({
    target: mapContainer.value,
    layers: [baseLayer, olMarkersLayer],
    view: new View({
      center: fromLonLat([initialCenter[1], initialCenter[0]]),
      zoom: initialZoom,
    }),
  });

  if (props.clickable) {
    olMap.on("click", (evt) => {
      const [lon, lat] = toLonLat(evt.coordinate);
      emit("map-click", { lat: lat!, lng: lon! });
    });
  }

  const emitOlCenter = () => {
    if (!olMap) return;
    const center = olMap.getView().getCenter();
    if (!center) return;
    const [lon, lat] = toLonLat(center);
    emit("center-change", { lat: lat!, lng: lon! });
  };

  olMap.on("moveend", emitOlCenter);
  emitOlCenter();

  updateMarkers();
}

/* ===========================
   Google Maps init
   =========================== */
async function initGoogleMaps() {
  if (!mapContainer.value) return;

  const initialCenter = props.center ?? [0, 0];
  const initialZoom = props.zoom ?? 2;

  const src = props.source as GoogleMapsSource | undefined;
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

  await google.maps.importLibrary("maps");

  // The google namespace is now available globally

  googleMap = new google.maps.Map(mapContainer.value, {
    center: { lat: initialCenter[0], lng: initialCenter[1] },
    zoom: initialZoom,
    ...(src.mapId ? { mapId: src.mapId } : {}),
  });

  if (props.clickable) {
    googleMap.addListener("click", (e: any) => {
      const lat = e.latLng.lat();
      const lng = e.latLng.lng();
      emit("map-click", { lat, lng });
    });
  }

  const emitGoogleCenter = () => {
    if (!googleMap) return;
    const c = googleMap.getCenter();
    if (!c) return;
    emit("center-change", { lat: c.lat(), lng: c.lng() });
  };

  googleMap.addListener("idle", emitGoogleCenter);
  emitGoogleCenter();

  updateMarkers();
}

/* ===========================
   Markers update
   =========================== */
function updateMarkers() {
  const markers = props.markers ?? [];

  if (activeEngine.value === "leaflet") {
    if (!leafletMarkersLayer) return;
    leafletMarkersLayer.clearLayers();
    leafletMarkerInstances = [];

    markers.forEach((m) => {
      const marker = L.marker([m.lat, m.lng]).addTo(leafletMarkersLayer!);
      if (m.popup) marker.bindPopup(m.popup);
      leafletMarkerInstances.push(marker);
    });
  } else if (activeEngine.value === "maplibre") {
    if (!mapLibreMap) return;

    mapLibreMarkerInstances.forEach((m) => m.remove());
    mapLibreMarkerInstances = [];

    markers.forEach((m) => {
      const marker = new maplibregl.Marker().setLngLat([m.lng, m.lat]);
      if (m.popup) {
        const popup = new MapLibrePopup().setHTML(m.popup);
        marker.setPopup(popup);
      }
      marker.addTo(mapLibreMap!);
      mapLibreMarkerInstances.push(marker);
    });
  } else if (activeEngine.value === "openlayers") {
    if (!olMarkersSource) return;

    olMarkersSource.clear();

    markers.forEach((m) => {
      const feature = new Feature({
        geometry: new Point(fromLonLat([m.lng, m.lat])),
      });
      olMarkersSource!.addFeature(feature);
    });
  } else if (activeEngine.value === "google") {
    if (!googleMap) return;

    googleMarkers.forEach((m) => m.setMap(null));
    googleMarkers = [];

    markers.forEach((m) => {
      const marker = new google.maps.Marker({
        position: { lat: m.lat, lng: m.lng },
        map: googleMap,
      });

      if (m.popup) {
        const info = new google.maps.InfoWindow({
          content: m.popup,
        });
        marker.addListener("click", () => {
          info.open({ anchor: marker, map: googleMap });
        });
      }

      googleMarkers.push(marker);
    });
  }
}

/* ===========================
   Watchers
   =========================== */
watch(
  () => props.markers,
  () => {
    updateMarkers();
  },
  { deep: true }
);

watch(
  () => props.center,
  (newCenter) => {
    if (!newCenter) return;

    if (activeEngine.value === "leaflet" && leafletMap) {
      leafletMap.setView(newCenter, leafletMap.getZoom());
    } else if (activeEngine.value === "maplibre" && mapLibreMap) {
      mapLibreMap.setCenter([newCenter[1], newCenter[0]]);
    } else if (activeEngine.value === "openlayers" && olMap) {
      olMap.getView().setCenter(fromLonLat([newCenter[1], newCenter[0]]));
    } else if (activeEngine.value === "google" && googleMap) {
      googleMap.setCenter({ lat: newCenter[0], lng: newCenter[1] });
    }
  }
);

watch(
  () => props.zoom,
  (newZoom) => {
    if (typeof newZoom !== "number") return;

    if (activeEngine.value === "leaflet" && leafletMap) {
      leafletMap.setZoom(newZoom);
    } else if (activeEngine.value === "maplibre" && mapLibreMap) {
      mapLibreMap.setZoom(newZoom);
    } else if (activeEngine.value === "openlayers" && olMap) {
      olMap.getView().setZoom(newZoom);
    } else if (activeEngine.value === "google" && googleMap) {
      googleMap.setZoom(newZoom);
    }
  }
);

watch(
  () => activeEngine.value,
  () => {
    initMap();
  }
);

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
