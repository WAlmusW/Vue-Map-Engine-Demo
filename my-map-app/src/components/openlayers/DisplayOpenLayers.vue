<template>
  <div class="map" ref="mapContainer"></div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch } from "vue";
import type { OpenLayersOsmSource, RasterSource } from "../../types/map";

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
import { fromLonLat } from "ol/proj";
import Style from "ol/style/Style";
import CircleStyle from "ol/style/Circle";
import Fill from "ol/style/Fill";
import Stroke from "ol/style/Stroke";

interface Props {
  lat: number;
  lng: number;
  zoom?: number;
  popupText?: string;
  source?: RasterSource | OpenLayersOsmSource;
}

const props = withDefaults(defineProps<Props>(), {
  zoom: 12,
});

/* ===========================
   State
   =========================== */
const mapContainer = ref<HTMLDivElement | null>(null);

/* ===========================
   OpenLayers state
   =========================== */
let olMap: OLMap | null = null;
let olMarkersLayer: VectorLayer<VectorSource> | null = null;
let olMarkersSource: VectorSource | null = null;

/* ===========================
   Destroy map
   =========================== */
function destroyMap() {
  if (olMap) {
    olMap.setTarget(undefined as any);
    olMap = null;
    olMarkersLayer = null;
    olMarkersSource = null;
  }
}

/* ===========================
   Init OpenLayers
   =========================== */
function initMap() {
  destroyMap();
  if (!mapContainer.value) return;

  const initialCenter = fromLonLat([props.lng, props.lat]);
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
      center: initialCenter,
      zoom: initialZoom,
    }),
  });

  updateMarker();
}

/* ===========================
   Markers update
   =========================== */
function updateMarker() {
  if (!olMarkersSource) return;

  olMarkersSource.clear();

  const feature = new Feature({
    geometry: new Point(fromLonLat([props.lng, props.lat])),
  });
  olMarkersSource.addFeature(feature);
}

/* ===========================
   Watchers
   =========================== */
watch(
  () => [props.lat, props.lng],
  () => {
    if (!olMap) return;
    olMap.getView().setCenter(fromLonLat([props.lng, props.lat]));
    updateMarker();
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
.map {
  width: 100%;
  height: 400px;
  min-height: 300px;
}
</style>
