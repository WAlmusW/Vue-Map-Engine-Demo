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

export interface LatLngValue {
  lat: number | null;
  lng: number | null;
}

export type InputMapMode = "click" | "drag" | "center";
