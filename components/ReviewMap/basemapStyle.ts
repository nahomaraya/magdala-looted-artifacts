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
      case 'fill':
        if (has(id, ['water'])) map.setPaintProperty(id, 'fill-color', WATER);
        else if (has(id, ['land', 'park'])) map.setPaintProperty(id, 'fill-color', LAND);
        break;
      case 'line':
        if (has(id, ['water'])) map.setPaintProperty(id, 'line-color', WATER);
        else if (has(id, ['road', 'tunnel', 'bridge', 'boundary'])) map.setPaintProperty(id, 'line-color', LINE);
        break;
      case 'symbol':
        if (has(id, ['label', 'name'])) {
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
