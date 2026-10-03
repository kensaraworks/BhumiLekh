import type { RequestTransformFunction, SourceSpecification } from 'maplibre-gl';
import { apiDataSource } from './apiDataSource';
import { developmentDataSource } from './developmentDataSource';
import { defaultView, type LayerDef } from './mapConfig';

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
}

export interface MapDataSource {
  /** MapLibre source for a layer, or null when that layer's data is not available. */
  getLayerSource(layer: LayerDef): SourceSpecification | null;
  /** Dossier for a parcel id taken from a clicked feature; null when there is none. */
  getParcelDossier(parcelId: string): Promise<Dossier | null>;
  transformRequest?: RequestTransformFunction;
  initialView?: { center: [number, number]; zoom: number };
}

export const dataSource: MapDataSource =
  import.meta.env.VITE_MAP_DATA_SOURCE === 'development' ? developmentDataSource : apiDataSource;

export const startView = dataSource.initialView ?? defaultView;
