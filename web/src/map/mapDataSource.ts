import type { LngLatBoundsLike, RequestTransformFunction, SourceSpecification } from 'maplibre-gl';
import { apiDataSource } from './apiDataSource';
import { developmentDataSource } from './developmentDataSource';
import { defaultView, type LayerDef } from './mapConfig';
import { webgisDataSource } from './webgisDataSource';

export interface Dossier {
  parcelId: string;
  isDevelopmentData?: boolean;
  village: string | null;
  district: string | null;
  khasraNo: string;
  ulpin: string | null;
  boundaryTier: 'A' | 'B' | 'C' | null;
  areaRecordedHa: number | null;
  areaGeometryHa: number | null;
  owners: { name: string }[];
  ownerClusterConfidence: number | null;
  coOwnerCount: number | null;
  cultivatorEntries: number | null;
  lastDeed: { type: string; date: string; valueInr: number | null; valueUnderstated: boolean } | null;
  deedCount: number | null;
  mutationLagFlags: number | null;
  circleRatePerSqm: number | null;
  comparablesCount: number | null;
  zone: string | null;
  fsi: number | null;
  riskFlags: { severity: 'Low' | 'Medium' | 'High'; label: string }[];
  rcmsCheckedOn: string | null;
  clusterParcelCount: number | null;
  provenance: { factCount: number; sourceCount: number } | null;
  /** Attributes exactly as the source sent them, for data that has no full dossier yet. */
  sourceRecord?: { source: string; fetchedAt: string | null; attributes: { label: string; value: string }[] };
}

export interface MapDataSource {
  /** MapLibre source for a layer, or null when that layer's data is not available. */
  getLayerSource(layer: LayerDef): SourceSpecification | null;
  /** Dossier for a parcel id taken from a clicked feature; null when there is none. */
  getParcelDossier(parcelId: string): Promise<Dossier | null>;
  transformRequest?: RequestTransformFunction;
  initialView?: { center: [number, number]; zoom: number };
  /** Bounds of the real data; the map fits to them once known. */
  loadInitialBounds?(): Promise<LngLatBoundsLike | null>;
  /** Zoom at which a GeoJSON layer's data is first fetched (nothing is downloaded below it). */
  deferUntilZoom?(layer: LayerDef): number | undefined;
}

// VITE_MAP_DATA_SOURCE: 'api' (vector tiles from VITE_TILES_BASE_URL), 'webgis' (saved WebGIS village parcels,
// static GeoJSON) or 'development' (4 labelled squares). Unset: 'api' when a tile server is configured, else 'webgis'.
const sources: Record<string, MapDataSource> = {
  api: apiDataSource,
  webgis: webgisDataSource,
  development: developmentDataSource,
};
const selected = import.meta.env.VITE_MAP_DATA_SOURCE || (import.meta.env.VITE_TILES_BASE_URL ? 'api' : 'webgis');

export const dataSource: MapDataSource = sources[selected] ?? apiDataSource;

export const startView = dataSource.initialView ?? defaultView;
