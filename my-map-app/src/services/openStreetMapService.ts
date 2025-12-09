// OpenStreetMap Nominatim API service for reverse geocoding

// Interface for the Nominatim reverse geocoding response
export interface NominatimResponse {
  place_id: number;
  licence: string;
  osm_type: string;
  osm_id: number;
  lat: string;
  lon: string;
  class: string;
  type: string;
  place_rank: number;
  importance: number;
  addresstype: string;
  name?: string;
  display_name: string;
  address?: {
    house_number?: string;
    road?: string;
    suburb?: string;
    city?: string;
    town?: string;
    village?: string;
    county?: string;
    state?: string;
    postcode?: string;
    country?: string;
    country_code?: string;
    [key: string]: string | undefined;
  };
  boundingbox: string[];
}

// Custom interface for our reverse geocoding result
export interface ReverseGeocodeResult {
  displayName: string;
  address?: {
    house_number?: string;
    road?: string;
    suburb?: string;
    city?: string;
    town?: string;
    village?: string;
    county?: string;
    state?: string;
    postcode?: string;
    country?: string;
    country_code?: string;
  };
}

/**
 * Reverse geocodes coordinates to get full address using OpenStreetMap Nominatim API
 * @param lat - Latitude coordinate
 * @param lon - Longitude coordinate
 * @returns Promise with the reverse geocoding result or null if failed
 */
export async function reverseGeocode(
  lat: number,
  lon: number
): Promise<ReverseGeocodeResult | null> {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`;

    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data: NominatimResponse = await response.json();

    // Check if we got a valid response with address data
    if (!data || !data.display_name) {
      return null;
    }

    return {
      displayName: data.display_name,
      address: data.address,
    };
  } catch (error) {
    console.error("Error reverse geocoding coordinates:", error);
    return null;
  }
}

/**
 * Formats the address object into a readable string
 * @param address - Address object from the API response
 * @returns Formatted address string
 */
export function formatAddress(
  address: NonNullable<ReverseGeocodeResult["address"]>
): string {
  const parts: string[] = [];

  // Build address from most specific to most general
  if (address.house_number && address.road) {
    parts.push(`${address.house_number} ${address.road}`);
  } else if (address.road) {
    parts.push(address.road);
  }

  if (address.suburb) parts.push(address.suburb);
  if (address.city) parts.push(address.city);
  if (address.town) parts.push(address.town);
  if (address.village) parts.push(address.village);
  if (address.county) parts.push(address.county);
  if (address.state) parts.push(address.state);
  if (address.postcode) parts.push(address.postcode);
  if (address.country) parts.push(address.country);

  return parts.join(", ");
}
