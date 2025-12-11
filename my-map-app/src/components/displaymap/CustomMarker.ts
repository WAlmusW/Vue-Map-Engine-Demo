import { importLibrary } from "@googlemaps/js-api-loader";
import type { MarkerConfig } from "../../types/google_map";

export interface CustomMarkerOptions {
  position: { lat: number; lng: number };
  marker?: MarkerConfig;
  title?: string;
  popup?: string;
  hoverable?: boolean;
  draggable?: boolean;
  clickable?: boolean;
  onClick?: (marker: google.maps.marker.AdvancedMarkerElement) => void;
  onDragEnd?: (marker: google.maps.marker.AdvancedMarkerElement) => void;
  onHover?: (
    marker: google.maps.marker.AdvancedMarkerElement,
    isHovering: boolean
  ) => void;
}

export async function createMarker(
  options: CustomMarkerOptions
): Promise<google.maps.marker.AdvancedMarkerElement> {
  const { AdvancedMarkerElement, PinElement } = await importLibrary("marker");
  const { InfoWindow } = await importLibrary("maps");

  const {
    position,
    marker,
    title,
    popup,
    hoverable = false,
    draggable = false,
    clickable = true,
    onClick,
    onDragEnd,
    onHover,
  } = options;

  // Create marker content based on config
  let contentEl: HTMLElement;

  if (marker) {
    switch (marker.kind) {
      case "pin": {
        const pin = new PinElement(marker.pinOptions);
        contentEl = pin.element;
        break;
      }

      case "img": {
        const img = document.createElement("img");
        img.src = marker.src;
        img.style.width = "40px";
        img.style.height = "40px";
        img.style.objectFit = "contain";
        if (title) img.title = title;
        contentEl = img;
        break;
      }

      case "svgString": {
        const parser = new DOMParser();
        const svgDoc = parser.parseFromString(marker.svg, "image/svg+xml");
        const svgEl = svgDoc.documentElement as unknown as HTMLElement;
        if (title) svgEl.title = title;
        contentEl = svgEl;
        break;
      }

      case "customElement": {
        contentEl = marker.createElement();
        break;
      }

      default: {
        // Fallback to default pin
        const pin = new PinElement();
        contentEl = pin.element;
      }
    }
  } else {
    // Default pin if no marker config
    const pin = new PinElement();
    contentEl = pin.element;
  }

  // Apply hover effects if requested
  if (hoverable) {
    contentEl.style.cursor = "pointer";
    contentEl.style.transition = "transform 0.2s ease";

    contentEl.addEventListener("mouseenter", () => {
      contentEl.style.transform = "scale(1.2)";
      onHover?.(null as any, true); // Will be set after marker creation
    });

    contentEl.addEventListener("mouseleave", () => {
      contentEl.style.transform = "scale(1)";
      onHover?.(null as any, false); // Will be set after marker creation
    });
  }

  // Create the marker
  const advancedMarker = new AdvancedMarkerElement({
    position,
    content: contentEl,
    gmpDraggable: draggable,
    gmpClickable: clickable,
    title,
  });

  // Handle click for popup
  if (clickable && popup) {
    const infoWindow = new InfoWindow({
      content: popup,
    });

    advancedMarker.addListener("click", () => {
      infoWindow.open({
        anchor: advancedMarker,
        map: advancedMarker.map,
      });
      onClick?.(advancedMarker);
    });
  } else if (clickable && onClick) {
    advancedMarker.addListener("click", () => onClick(advancedMarker));
  }

  // Handle drag events
  if (draggable && onDragEnd) {
    advancedMarker.addListener("dragend", () => onDragEnd(advancedMarker));
  }

  // Store hover callback for later map attachment
  if (hoverable && onHover) {
    (advancedMarker as any)._onHover = onHover;
  }

  return advancedMarker;
}
