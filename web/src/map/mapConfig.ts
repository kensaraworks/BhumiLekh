import type { StyleSpecification } from 'maplibre-gl';

export type LayerId = 'parcels' | 'zoning' | 'velocity' | 'priceTrend' | 'rera' | 'auctions';
export type LayerStatus = 'loading' | 'ready' | 'empty' | 'unavailable' | 'error';
export interface LayerState {
  on: boolean;
  opacity: number;
}

export interface StyleLayer {
  id: string;
  type: 'fill' | 'line' | 'circle' | 'symbol';
  filter?: unknown[];
  minzoom?: number;
  maxzoom?: number;
  layout?: Record<string, unknown>;
  paint?: Record<string, unknown>;
}

export interface LayerDef {
  id: LayerId;
  label: string;
  tilePath: string;
  defaultOn: boolean;
  defaultOpacity: number;
  styleLayers: StyleLayer[];
}

export const defaultView = { center: [75.8577, 22.7196] as [number, number], zoom: 11 };

// Development basemap. Replace with the project's style by setting VITE_MAP_STYLE_URL.
const developmentBasemap: StyleSpecification = {
  version: 8,
  glyphs: 'https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf',
  sources: {
    basemap: {
      type: 'raster',
      tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
      tileSize: 256,
      maxzoom: 19,
      attribution: '© OpenStreetMap contributors',
    },
  },
  layers: [{ id: 'basemap', type: 'raster', source: 'basemap', paint: { 'raster-saturation': -0.5 } }],
};
export const mapStyle: StyleSpecification | string = import.meta.env.VITE_MAP_STYLE_URL || developmentBasemap;

// Tile contract assumed from the PRD schema (parcel columns, ST_AsMVT layer name = tile path).
// Adjust the property names below when the tile endpoints are published.
export const PARCEL_ID_PROPERTY = 'id';
export const PARCEL_B_FILL = 'parcels-b-fill';
export const PARCEL_SELECTED = 'parcels-selected';
export const PARCEL_CLICK_LAYERS = [PARCEL_B_FILL, 'parcels-a-fill', 'parcels-centroids'];

// Parcel geometry is only drawn from z17; z15-16 shows centroids (PRD zoom rules).
const isPolygon = ['==', ['geometry-type'], 'Polygon'];
const tier = (t: string) => ['all', isPolygon, ['==', ['get', 'boundary_tier'], t]];
const ramp = (prop: string, stops: [number, string][]) => ['interpolate', ['linear'], ['get', prop], ...stops.flat()];

const parcelLayers: StyleLayer[] = [
  { id: 'parcels-a-fill', type: 'fill', filter: tier('A'), minzoom: 17, paint: { 'fill-color': '#D5E7E1' } },
  { id: 'parcels-a-line', type: 'line', filter: tier('A'), minzoom: 17, paint: { 'line-color': '#1E5B53', 'line-width': 1.2 } },
  { id: PARCEL_B_FILL, type: 'fill', filter: tier('B'), minzoom: 17, paint: { 'fill-pattern': 'hatch-b' } },
  {
    id: 'parcels-b-line',
    type: 'line',
    filter: tier('B'),
    minzoom: 17,
    paint: { 'line-color': '#8C7424', 'line-width': 1.3, 'line-dasharray': [6, 4] },
  },
  {
    id: PARCEL_SELECTED,
    type: 'line',
    filter: ['==', ['to-string', ['get', PARCEL_ID_PROPERTY]], ''],
    minzoom: 15,
    paint: { 'line-color': '#0F3F39', 'line-width': 3 },
  },
  {
    id: 'parcels-centroids',
    type: 'circle',
    filter: ['==', ['geometry-type'], 'Point'],
    minzoom: 15,
    maxzoom: 17,
    paint: { 'circle-radius': 5, 'circle-color': '#1E5B53', 'circle-stroke-color': '#FFFFFF', 'circle-stroke-width': 1 },
  },
  {
    id: 'parcels-labels',
    type: 'symbol',
    filter: isPolygon,
    minzoom: 17,
    layout: { 'text-field': ['get', 'khasra_no'], 'text-font': ['Open Sans Regular'], 'text-size': 11 },
    paint: { 'text-color': '#23413C' },
  },
];

export const layerDefs: LayerDef[] = [
  { id: 'parcels', label: 'Parcels', tilePath: 'parcels', defaultOn: true, defaultOpacity: 0.8, styleLayers: parcelLayers },
  {
    id: 'zoning',
    label: 'Zoning',
    tilePath: 'zones',
    defaultOn: false,
    defaultOpacity: 0.6,
    styleLayers: [
      { id: 'zones-fill', type: 'fill', paint: { 'fill-color': '#F2D8C9' } },
      { id: 'zones-line', type: 'line', paint: { 'line-color': '#B06A45', 'line-width': 1 } },
      {
        id: 'zones-nodev',
        type: 'line',
        filter: ['==', ['get', 'no_dev'], true],
        paint: { 'line-color': '#9B1C1C', 'line-width': 2 },
      },
    ],
  },
  {
    id: 'velocity',
    label: 'Transaction velocity',
    tilePath: 'metrics',
    defaultOn: true,
    defaultOpacity: 0.8,
    styleLayers: [
      {
        id: 'velocity-fill',
        type: 'fill',
        minzoom: 6,
        maxzoom: 15,
        paint: {
          'fill-color': ramp('txn_velocity', [[0, '#EAF1EF'], [0.25, '#B9D6CE'], [0.5, '#78AFA1'], [0.75, '#2F7D6C'], [1, '#1E5B53']]),
        },
      },
      {
        id: 'velocity-sparse',
        type: 'line',
        minzoom: 6,
        maxzoom: 15,
        filter: ['<', ['get', 'n'], 5],
        paint: { 'line-color': '#8A4204', 'line-width': 1, 'line-dasharray': [4, 3] },
      },
    ],
  },
  {
    id: 'priceTrend',
    label: 'Price trend',
    tilePath: 'metrics',
    defaultOn: false,
    defaultOpacity: 0.6,
    styleLayers: [
      {
        id: 'price-trend-fill',
        type: 'fill',
        minzoom: 6,
        maxzoom: 15,
        paint: {
          'fill-color': ramp('price_trend', [[-1, '#B35C2E'], [-0.5, '#E3B899'], [0, '#F2EFE8'], [0.5, '#9DC3BA'], [1, '#1E5B53']]),
        },
      },
    ],
  },
  {
    id: 'rera',
    label: 'RERA projects',
    tilePath: 'projects',
    defaultOn: true,
    defaultOpacity: 0.8,
    styleLayers: [
      {
        id: 'rera-points',
        type: 'circle',
        paint: { 'circle-radius': 7, 'circle-color': '#3B4A8C', 'circle-stroke-color': '#FFFFFF', 'circle-stroke-width': 1.5 },
      },
    ],
  },
  {
    id: 'auctions',
    label: 'Auctions',
    tilePath: 'auctions',
    defaultOn: true,
    defaultOpacity: 0.8,
    styleLayers: [
      {
        id: 'auction-points',
        type: 'circle',
        paint: { 'circle-radius': 8, 'circle-color': '#9B1C1C', 'circle-stroke-color': '#FFFFFF', 'circle-stroke-width': 1.5 },
      },
    ],
  },
];

// Bottom to top: area layers under parcels, point markers above.
export const drawOrder: LayerId[] = ['zoning', 'velocity', 'priceTrend', 'parcels', 'rera', 'auctions'];
