import type { ColumnDef, ResultFeatureCollection, Row, RunRequest, RunResponse, ScreenDefinition } from '../types';
import { UNIT_META } from '../vocabulary';

/**
 * DEVELOPMENT FIXTURES — synthetic rows for exercising renderers, sorting, selection and the map.
 * Off by default. Turn on with VITE_SCREEN_FIXTURES=true, or ?mock=fixtures in `npm run dev`.
 * Every value is bracketed "[Fixture …]" and the UI shows a fixture banner; nothing here is real data.
 * Geometry is points only (no fabricated parcel boundaries).
 */
export const ENABLE_SCREEN_FIXTURES = import.meta.env.VITE_SCREEN_FIXTURES === 'true';

const SERVER_PAGE = 200;
const TRUNCATE_ABOVE = 5000;

function prng(seed: string) {
  let s = [...seed].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 11) || 1;
  return () => ((s = (s * 16807) % 2147483647) / 2147483647);
}

function valueFor(col: ColumnDef, i: number, r: () => number, screen: ScreenDefinition): unknown {
  const n = i + 1;
  switch (col.type) {
    case 'entity':
      return `[Fixture] ${UNIT_META[screen.render.unit].noun} ${String(n).padStart(2, '0')}`;
    case 'text':
      return `[${col.label} ${n}]`;
    case 'int':
      return Math.round(2 + r() * 38);
    case 'decimal':
      return Math.round(r() * 1000) / 100;
    case 'area_ha':
      return Math.round((0.4 + r() * 30) * 100) / 100;
    case 'days':
      return Math.round(10 + r() * 390);
    case 'months':
      return Math.round(6 + r() * 60);
    case 'percent':
      return Math.round(r() * 100) / 100;
    case 'ratio':
      return Math.round((0.6 + r() * 2) * 100) / 100;
    case 'distance_m':
      return Math.round(50 + r() * 1900);
    case 'inr':
    case 'registered_value':
      return Math.round(5 + r() * 400) * 100000;
    case 'confidence':
      return [0.95, 1.0, 0.78, 0.92, 0.81, 0.97][i % 6];
    case 'tier':
      return (['A', 'B', 'A', 'C'] as const)[i % 4];
    case 'sample_n':
      return i % 5 === 2 ? 3 : Math.round(6 + r() * 60);
    case 'date': {
      const d = new Date();
      d.setDate(d.getDate() - Math.round(r() * 700));
      return d.toISOString().slice(0, 10);
    }
    case 'check':
      return {
        status: (['fired', 'none_found', 'not_covered', 'none_found'] as const)[i % 4],
        severity: i % 4 === 0 ? (['high', 'medium', 'low'] as const)[i % 3] : undefined,
        source: screen.sources[0] ?? 'source',
        as_of: new Date().toISOString().slice(0, 10),
      };
  }
}

export function buildFixtureResponse(screen: ScreenDefinition, request: RunRequest): RunResponse {
  const r = prng(screen.id + JSON.stringify(request.params));
  const devRows = import.meta.env.DEV ? Number(new URLSearchParams(window.location.search).get('fixture_rows')) : 0;
  const total = devRows > 0 ? devRows : 24;
  const returned = total > TRUNCATE_ABOVE ? SERVER_PAGE : total;
  const columns = screen.render.table?.columns ?? [];
  const conditions = screen.render.conditions ?? [];
  const today = new Date().toISOString().slice(0, 10);

  const rows: Row[] = Array.from({ length: returned }, (_, i) => {
    const values = Object.fromEntries(columns.map((c) => [c.key, valueFor(c, i, r, screen)]));
    const conf = typeof values.conf === 'number' ? values.conf : screen.render.flags.includes('confidence_badge') ? [0.95, 0.83, 0.99][i % 3] : undefined;
    const flags: Row['flags'] = [];
    if (values.tier === 'B') flags.push('tier_b');
    if (values.tier === 'C') flags.push('tier_c');
    if (typeof values.sample_n === 'number' && values.sample_n < 5) flags.push('low_sample');
    if (typeof values.n === 'number' && values.n < 5) flags.push('low_sample');
    const failing = request.near_miss && i % 4 === 3 ? i % conditions.length : -1;
    return {
      id: `${screen.render.unit}:FIXTURE-${String(i + 1).padStart(3, '0')}`,
      values,
      conf,
      flags,
      pass: conditions.length ? Object.fromEntries(conditions.map((c, k) => [c.key, k !== failing])) : undefined,
    };
  });

  const spatial = !!screen.render.map;
  const geojson: ResultFeatureCollection | null = spatial
    ? {
        type: 'FeatureCollection',
        features: rows
          .filter((row) => row.values.tier !== 'C' && !row.flags?.includes('tier_c'))
          .map((row) => ({
            type: 'Feature' as const,
            properties: { row_id: row.id, tier: row.flags?.includes('tier_b') ? ('B' as const) : ('A' as const) },
            geometry: { type: 'Point', coordinates: [75.72 + r() * 0.3, 22.6 + r() * 0.25] },
          })),
      }
    : null;

  return {
    screen_id: screen.id,
    run_id: `fixture_${Date.now().toString(36)}`,
    as_of: today,
    render: screen.render,
    caveat: { en: screen.caveat },
    meta: {
      total,
      returned,
      truncated: returned < total,
      min_confidence: Math.min(...rows.map((row) => row.conf ?? 1)),
      low_sample: rows.some((row) => row.flags?.includes('low_sample')),
      sources: screen.sources.map((name, k) => ({ name, as_of: today, coverage: 'full' as const, stale: k === 1 })),
    },
    columns: columns.map((c) => ({ key: c.key, label_key: `col.${c.key}`, type: c.type, sortable: c.sortable ?? true })),
    rows,
    geojson,
    tiles: null,
    funnel: conditions.length
      ? conditions.map((c, k) => ({ cond: c.key, label_key: c.label, remaining: k === conditions.length - 1 ? total : Math.round(1800 / (k * 2.6 + 1)) + total }))
      : null,
    series:
      screen.render.pattern === 'STAT'
        ? rows.slice(0, 10).map((row, k) => ({ x: `[Fixture ${k + 1}]`, y: Number(row.values.metric) || 0, n: k % 4 === 1 ? 3 : 12 + k * 3 }))
        : null,
    fixture: true,
  };
}
