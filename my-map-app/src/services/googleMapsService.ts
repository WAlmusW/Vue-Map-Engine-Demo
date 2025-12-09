// Google Maps Geocoding API service for reverse geocoding

import { setOptions } from "@googlemaps/js-api-loader";
// Note: importLibrary is called via google.maps.importLibrary after setOptions

// Declare global google maps types if not available
declare global {
  namespace google {
    namespace maps {
      class Geocoder {
        geocode(
          request: GeocoderRequest,
          callback: (
            results: GeocoderResult[] | null,
            status: GeocoderStatus
          ) => void
        ): void;
      }

      interface GeocoderRequest {
        location?: LatLng | LatLngLiteral;
        address?: string;
        bounds?: LatLngBounds | LatLngBoundsLiteral;
        componentRestrictions?: GeocoderComponentRestrictions;
        placeId?: string;
        region?: string;
      }

      interface GeocoderResult {
        address_components: GeocoderAddressComponent[];
        formatted_address: string;
        geometry: GeocoderGeometry;
        place_id: string;
        types: string[];
        partial_match?: boolean;
        plus_code?: GeocoderPlusCode;
      }

      interface GeocoderAddressComponent {
        long_name: string;
        short_name: string;
        types: string[];
      }

      interface GeocoderGeometry {
        location: LatLng;
        location_type: GeocoderLocationType;
        viewport: LatLngBounds;
        bounds?: LatLngBounds;
      }

      enum GeocoderStatus {
        ERROR = "ERROR",
        INVALID_REQUEST = "INVALID_REQUEST",
        OK = "OK",
        OVER_QUERY_LIMIT = "OVER_QUERY_LIMIT",
        REQUEST_DENIED = "REQUEST_DENIED",
        UNKNOWN_ERROR = "UNKNOWN_ERROR",
        ZERO_RESULTS = "ZERO_RESULTS",
      }

      enum GeocoderLocationType {
        APPROXIMATE = "APPROXIMATE",
        GEOMETRIC_CENTER = "GEOMETRIC_CENTER",
        RANGE_INTERPOLATED = "RANGE_INTERPOLATED",
        ROOFTOP = "ROOFTOP",
      }

      interface LatLng {
        lat(): number;
        lng(): number;
      }

      interface LatLngLiteral {
        lat: number;
        lng: number;
      }

      class LatLngBounds {}
      interface LatLngBoundsLiteral {}
      interface GeocoderComponentRestrictions {}
      interface GeocoderPlusCode {}
      // Add the importLibrary function
      function importLibrary(library: string): Promise<any>;
    }
  }
}

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
