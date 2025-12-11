export type MarkerConfig =
  | {
      kind: "pin";
      pinOptions?: google.maps.marker.PinElementOptions;
      title?: string;
    }
  | {
      kind: "img";
      src: string;
      title?: string;
    }
  | {
      kind: "svgString";
      svg: string;
      title?: string;
    }
  | {
      kind: "customElement";
      // parent returns any HTMLElement it wants (React/Vue, plain JS, etc.)
      createElement: () => HTMLElement;
      title?: string;
    };

export interface MapControl {
  position?: google.maps.ControlPosition; // default: TOP_RIGHT
  index?: number; // optional control index in that position
  createElement: (ctx: { map: google.maps.Map }) => HTMLElement;
}

export interface MapFocusConfig {
  name: string;
  featureType: google.maps.FeatureType;
  featureStyleOptions: google.maps.FeatureStyleOptions;
}
