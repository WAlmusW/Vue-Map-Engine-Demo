// Google Maps Geocoding API service for reverse geocoding

import { setOptions } from "@googlemaps/js-api-loader";

// Re-export the common interfaces for consistency
export { type ReverseGeocodeResult } from "./openStreetMapService";
export { formatAddress } from "./openStreetMapService";

// Google Maps Geocoding API response types
interface GoogleMapsGeocodeResult {
  address_components: Array<{
    long_name: string;
    short_name: string;
    types: string[];
  }>;
  formatted_address: string;
  geometry: {
    location: {
      lat(): number;
      lng(): number;
    };
    location_type: string;
    viewport: {
      northeast: {
        lat(): number;
        lng(): number;
      };
      southwest: {
        lat(): number;
        lng(): number;
      };
    };
  };
  partial_match?: boolean;
  place_id: string;
  plus_code?: {
    compound_code: string;
    global_code: string;
  };
  types: string[];
}

// Google Maps API initialization flag
let googleMapsInitialized = false;

/**
 * Initialize the Google Maps API with setOptions
 */
function initGoogleMaps() {
  if (!googleMapsInitialized) {
    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

    if (!apiKey || apiKey === "your_google_maps_api_key_here") {
      throw new Error(
        "Google Maps API key not configured. Please set VITE_GOOGLE_MAPS_API_KEY in your .env file."
      );
    }

    setOptions({
      key: apiKey,
      v: "weekly",
      libraries: ["places"], // Include places library for geocoding
    });

    googleMapsInitialized = true;
  }
}

/**
 * Reverse geocodes coordinates to get full address using Google Maps Geocoding API
 * @param lat - Latitude coordinate
 * @param lon - Longitude coordinate
 * @returns Promise with the reverse geocoding result or null if failed
 */
export async function reverseGeocode(
  lat: number,
  lon: number
): Promise<import("./openStreetMapService").ReverseGeocodeResult | null> {
  try {
    // Initialize Google Maps API if not already initialized
    initGoogleMaps();

    // Load the geocoding library
    await google.maps.importLibrary("geocoding");

    // Create a Geocoding service instance
    const geocoder = new google.maps.Geocoder();

    const request: google.maps.GeocoderRequest = {
      location: {
        lat,
        lng: lon,
      },
    };

    return new Promise((resolve) => {
      geocoder.geocode(
        request,
        (
          results: google.maps.GeocoderResult[] | null,
          status: google.maps.GeocoderStatus
        ) => {
          if (
            status === google.maps.GeocoderStatus.OK &&
            results &&
            results.length > 0
          ) {
            const result = results[0]!; // Use the first (most relevant) result - we know results.length > 0

            // Convert Google Maps result to our common interface
            const reverseGeocodeResult: import("./openStreetMapService").ReverseGeocodeResult =
              {
                displayName: result.formatted_address,
                address: extractAddressComponents(result.address_components),
              };

            resolve(reverseGeocodeResult);
          } else {
            console.error("Google Maps Geocoding failed:", status);
            resolve(null);
          }
        }
      );
    });
  } catch (error) {
    console.error("Error loading Google Maps API:", error);
    return null;
  }
}

/**
 * Extract address components from Google Maps address_components format
 * and convert to our common address object format
 */
function extractAddressComponents(
  components: GoogleMapsGeocodeResult["address_components"]
):
  | import("./openStreetMapService").ReverseGeocodeResult["address"]
  | undefined {
  const address: NonNullable<
    import("./openStreetMapService").ReverseGeocodeResult["address"]
  > = {};

  for (const component of components) {
    // Check component types to determine what field it represents
    if (component.types.includes("street_number")) {
      address.house_number = component.long_name;
    } else if (component.types.includes("route")) {
      address.road = component.long_name;
    } else if (
      component.types.includes("locality") ||
      component.types.includes("administrative_area_level_3")
    ) {
      address.city = component.long_name;
    } else if (component.types.includes("administrative_area_level_2")) {
      address.county = component.long_name;
    } else if (component.types.includes("administrative_area_level_1")) {
      address.state = component.long_name;
    } else if (component.types.includes("country")) {
      address.country = component.long_name;
      address.country_code = component.short_name;
    } else if (component.types.includes("postal_code")) {
      address.postcode = component.long_name;
    } else if (
      component.types.includes("sublocality") ||
      component.types.includes("neighborhood")
    ) {
      address.suburb = component.long_name;
    }
  }

  // Return address object if it has any meaningful components
  return Object.keys(address).length > 0 ? address : undefined;
}
