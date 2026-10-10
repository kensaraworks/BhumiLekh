import type { Dossier, MapDataSource } from './mapDataSource';

// Real WebGIS 2.0 parcel polygons (5 villages, Bhicholi Hapsi tehsil, Indore), converted to static GeoJSON by
// ingest/webgis/build_map_data.py. Served from web/public, so the same path works in `vite` and in a built dist/.
const base = `${import.meta.env.BASE_URL}data/webgis/`;

// PRD zoom rule: no parcel geometry below z15. The parcel file is only fetched once the map reaches this zoom.
export const PARCEL_LOAD_MIN_ZOOM = 15;

const PARCEL_FILE = { S: '010_landbank_S.json', B: '011_landbank_B.json', P: '012_landbank_P.json' } as const;
const PARCEL_KIND = { S: 'Survey (khasra)', B: 'Block', P: 'Plot' } as const;

interface VillageReport {
  loc_id: number;
  village: string;
  lgd_code: string | null;
  fetched_at: Record<string, string | null>;
}

interface Manifest {
  source: string;
  bounds: [number, number, number, number];
  villages: VillageReport[];
}

interface ParcelProps {
  id: string;
  loc_id: number;
  parcel_type: keyof typeof PARCEL_FILE;
  khasra_no: string;
  parcel_id: number | null;
  ulpin: string | null;
  lgd_code: string | null;
  land_type: string;
  landuse: string | null;
  is_land_bank: number | null;
  area_ha: number;
  boundary_tier: 'A' | 'B' | 'C';
}

async function getJson<T>(file: string): Promise<T> {
  const response = await fetch(base + file);
  if (!response.ok) throw new Error(`${file}: HTTP ${response.status}`);
  return (await response.json()) as T;
}

function once<T>(load: () => Promise<T>) {
  let pending: Promise<T> | null = null;
  return () =>
    (pending ??= load().catch((error) => {
      pending = null; // allow a retry after a failed request
      throw error;
    }));
}

const manifest = once(() => getJson<Manifest>('manifest.json'));

const parcelIndex = once(async () => {
  const fc = await getJson<{ features: { properties: ParcelProps; geometry: { type: string } }[] }>('parcels.geojson');
  const index = new Map<string, ParcelProps>();
  // Each parcel appears twice (polygon + centroid point); the polygon carries the full attributes.
  for (const f of fc.features) if (f.geometry.type !== 'Point') index.set(f.properties.id, f.properties);
  return index;
});

export const webgisDataSource: MapDataSource = {
  getLayerSource(layer) {
    if (layer.id === 'parcels') return { type: 'geojson', data: `${base}parcels.geojson` };
    if (layer.id === 'villages') return { type: 'geojson', data: `${base}villages.geojson` };
    return null;
  },

  deferUntilZoom(layer) {
    return layer.id === 'parcels' ? PARCEL_LOAD_MIN_ZOOM : undefined;
  },

  async loadInitialBounds() {
    const [minLng, minLat, maxLng, maxLat] = (await manifest()).bounds;
    return [
      [minLng, minLat],
      [maxLng, maxLat],
    ];
  },

  async getParcelDossier(parcelId) {
    const [index, m] = await Promise.all([parcelIndex(), manifest()]);
    const p = index.get(parcelId);
    if (!p) return null;
    const village = m.villages.find((v) => v.loc_id === p.loc_id);
    const dossier: Dossier = {
      parcelId,
      village: village?.village ?? String(p.loc_id),
      district: null,
      khasraNo: p.khasra_no,
      ulpin: p.ulpin,
      boundaryTier: p.boundary_tier,
      areaRecordedHa: null,
      areaGeometryHa: p.area_ha,
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
      sourceRecord: {
        source: 'MP WebGIS 2.0 · saved WFS response',
        fetchedAt: village?.fetched_at[PARCEL_FILE[p.parcel_type]] ?? null,
        attributes: [
          { label: 'Polygon type', value: PARCEL_KIND[p.parcel_type] },
          { label: 'Land type', value: p.land_type },
          { label: 'Land use', value: p.landuse ?? '—' },
          { label: 'Portal record id', value: p.parcel_id === null ? 'none on portal' : String(p.parcel_id) },
          { label: 'Land bank', value: p.is_land_bank === null ? '—' : p.is_land_bank ? 'yes' : 'no' },
          { label: 'LGD village code', value: p.lgd_code ?? village?.lgd_code ?? '—' },
          { label: 'Portal village id', value: String(p.loc_id) },
        ],
      },
    };
    return dossier;
  },
};
