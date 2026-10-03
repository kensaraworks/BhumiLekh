import type { Dossier, MapDataSource } from './mapDataSource';

// Development fixture: four labelled squares, not real parcels. Enable with VITE_MAP_DATA_SOURCE=development.
const origin = { lng: 75.8577, lat: 22.7196 };
const size = 0.0006;

const square = (col: number, row: number) => {
  const x = origin.lng + col * size * 1.4;
  const y = origin.lat + row * size * 1.4;
  return [[[x, y], [x + size, y], [x + size, y + size], [x, y + size], [x, y]]];
};

const fixtures = [
  { id: 'DEV-1', tier: 'A', col: 0, row: 0 },
  { id: 'DEV-2', tier: 'A', col: 1, row: 0 },
  { id: 'DEV-3', tier: 'B', col: 0, row: 1 },
  { id: 'DEV-4', tier: 'C', col: 1, row: 1 },
] as const;

export const developmentDataSource: MapDataSource = {
  initialView: { center: [origin.lng + size * 1.2, origin.lat + size * 1.2], zoom: 17.5 },

  getLayerSource(layer) {
    if (layer.id !== 'parcels') return null;
    return {
      type: 'geojson',
      data: {
        type: 'FeatureCollection',
        features: fixtures.map((f) => ({
          type: 'Feature' as const,
          properties: { id: f.id, khasra_no: f.id, boundary_tier: f.tier },
          geometry: { type: 'Polygon' as const, coordinates: square(f.col, f.row) },
        })),
      },
    };
  },

  async getParcelDossier(parcelId) {
    const fixture = fixtures.find((f) => f.id === parcelId);
    if (!fixture) return null;
    const dossier: Dossier = {
      parcelId,
      isDevelopmentData: true,
      village: null,
      district: null,
      khasraNo: fixture.id,
      ulpin: null,
      boundaryTier: fixture.tier,
      areaRecordedHa: null,
      areaGeometryHa: null,
      owners: [],
      ownerClusterConfidence: null,
      coOwnerCount: null,
      cultivatorEntries: null,
      lastDeed: null,
      deedCount: null,
      mutationLagFlags: null,
      circleRatePerSqm: null,
      comparablesCount: null,
      zone: null,
      fsi: null,
      riskFlags: [],
      rcmsCheckedOn: null,
      clusterParcelCount: null,
      provenance: null,
    };
    return dossier;
  },
};
