import { createApp } from "vue";
import { importLibrary, setOptions } from "@googlemaps/js-api-loader";
import App from "./App.vue";

// Map CSS
import "leaflet/dist/leaflet.css";
import "ol/ol.css";

// Google Maps API V2 Key setup
setOptions({
  key: import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string,
  region: "ID",
  language: "id",
});

await importLibrary("maps");

createApp(App).mount("#app");
