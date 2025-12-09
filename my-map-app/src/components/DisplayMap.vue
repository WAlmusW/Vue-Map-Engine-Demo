<template>
  <div class="display-map-wrapper">
    <BaseMap
      :center="center"
      :zoom="zoom"
      :clickable="false"
      :markers="markers"
      :engine="engine"
      :source="source"
    />
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import BaseMap, {
  type BaseMapMarker,
  type MapEngine,
  type BaseMapSource,
} from "./BaseMap.vue";

const props = defineProps<{
  lat: number;
  lng: number;
  zoom?: number;
  popupText?: string;
  engine?: MapEngine;
  source?: BaseMapSource;
}>();

const zoom = computed(() => props.zoom ?? 12);
const engine = computed<MapEngine>(() => props.engine ?? "leaflet");
const source = computed<BaseMapSource | undefined>(() => props.source);

const center = computed<[number, number]>(() => [props.lat, props.lng]);

const markers = computed<BaseMapMarker[]>(() => [
  {
    lat: props.lat,
    lng: props.lng,
    popup: props.popupText ?? `Lat: ${props.lat}, Lng: ${props.lng}`,
  },
]);
</script>

<style scoped>
.display-map-wrapper {
  width: 100%;
  height: 400px;
}
</style>
