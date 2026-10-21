import type { Map as MapLibreMap } from 'maplibre-gl';

// Mirror the `navy`, `navy-light`, `navy-border` and `parchment-dim` tokens in
// app/globals.css (MapLibre paint properties take colours, not Tailwind classes).
const BACKGROUND = '#1a0e06';
const WATER = '#251406';
const LAND = '#2b190a';
const LINE = '#4a2c0e';
const LABEL = '#c8b89a';

const has = (id: string, parts: string[]) => parts.some((p) => id.includes(p));

/**
 * Recolours the OpenFreeMap "liberty" style into the site's dark palette.
 * Layers are matched by id substring, so a layer the style no longer ships is
 * simply skipped. Call once the style has loaded.
 */
export function restyleBasemap(map: MapLibreMap): void {
  for (const layer of map.getStyle().layers ?? []) {
    const { id } = layer;
    switch (layer.type) {
      case 'background':
        map.setPaintProperty(id, 'background-color', BACKGROUND);
        break;
      case 'raster':
        // The natural_earth shaded relief: light, and still at ~0.55 opacity
        // around /map's opening zoom.
        map.setPaintProperty(id, 'raster-opacity', 0.15);
        map.setPaintProperty(id, 'raster-saturation', -1);
        break;
      case 'fill':
        if (has(id, ['water'])) map.setPaintProperty(id, 'fill-color', WATER);
        else if (has(id, ['land', 'park'])) map.setPaintProperty(id, 'fill-color', LAND);
        else if (has(id, ['aeroway'])) map.setPaintProperty(id, 'fill-color', LINE);
        else if (has(id, ['building'])) {
          map.setPaintProperty(id, 'fill-color', LAND);
          if (layer.paint && 'fill-outline-color' in layer.paint) {
            map.setPaintProperty(id, 'fill-outline-color', LINE);
          }
        }
        break;
      case 'line':
        if (has(id, ['water'])) map.setPaintProperty(id, 'line-color', WATER);
        else if (has(id, ['road', 'tunnel', 'bridge', 'boundary', 'park_outline', 'aeroway'])) {
          map.setPaintProperty(id, 'line-color', LINE);
        }
        break;
      case 'symbol':
        // Not every text symbol: highway shields draw their text on a light
        // shield icon and stay as the style has them.
        if (has(id, ['label', 'name', 'poi', 'airport'])) {
          map.setPaintProperty(id, 'text-color', LABEL);
          map.setPaintProperty(id, 'text-halo-color', BACKGROUND);
        }
        break;
      case 'fill-extrusion':
        if (id.includes('building-3d')) map.setPaintProperty(id, 'fill-extrusion-color', LINE);
        break;
    }
  }
}
