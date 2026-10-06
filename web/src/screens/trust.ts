import type { CheckValue, Row, RunMeta } from './types';

/**
 * Trust rules (PRD §7, §10 and the playbook's "Trust UI, the same in every pattern").
 * Every component reads these instead of re-deriving thresholds or wording.
 */
export const WEAK_CLUSTER_BELOW = 0.85;
export const LOW_SAMPLE_BELOW = 5;

export const isWeakCluster = (conf: number | null | undefined) => typeof conf === 'number' && conf < WEAK_CLUSTER_BELOW;
export const isLowSample = (n: number | null | undefined) => typeof n === 'number' && n < LOW_SAMPLE_BELOW;

export const rowIsWeak = (row: Row) => isWeakCluster(row.conf) || !!row.flags?.includes('low_conf');
export const rowIsLowSample = (row: Row) => !!row.flags?.includes('low_sample');

export type Tier = 'A' | 'B' | 'C';
export const TIER_META: Record<Tier, { label: string; short: string; tone: 'ok' | 'warn' | 'muted' }> = {
  A: { label: 'Tier A · surveyed boundary', short: 'Tier A', tone: 'ok' },
  B: { label: 'Tier B · approximate location', short: 'Tier B · approx.', tone: 'warn' },
  C: { label: 'Tier C · not drawn on the map', short: 'Tier C · not drawn', tone: 'muted' },
};

export function rowTier(row: Row): Tier | null {
  const v = row.values.tier;
  if (v === 'A' || v === 'B' || v === 'C') return v;
  if (row.flags?.includes('tier_c')) return 'C';
  if (row.flags?.includes('tier_b')) return 'B';
  return null;
}

/** Never "no litigation" / "no encumbrance": always the source and the date it was checked. */
export function noneFoundText(source: string, asOf: string | null): string {
  return asOf ? `None found in ${source} as of ${asOf}` : `None found in ${source}`;
}

export function checkText(check: CheckValue): string {
  switch (check.status) {
    case 'fired':
      return `Fired${check.severity ? ` · ${check.severity}` : ''} · ${check.source}${check.as_of ? ` as of ${check.as_of}` : ''}`;
    case 'none_found':
      return noneFoundText(check.source, check.as_of);
    case 'not_covered':
      return `Not covered · ${check.source} not loaded for this area`;
    case 'error':
      return `Check failed · ${check.source}`;
  }
}

/** Registered consideration is labelled as such everywhere, never as market value. */
export const REGISTERED_VALUE_SUFFIX = 'registered value (understated)';

export interface TrustSummary {
  weakRows: number;
  minConfidence: number | null;
  lowSampleRows: number;
  staleSources: { name: string; as_of: string | null }[];
}

export function summarizeTrust(rows: Row[], meta: RunMeta | undefined): TrustSummary {
  const weakRows = rows.filter(rowIsWeak).length;
  const confs = rows.map((r) => r.conf).filter((c): c is number => typeof c === 'number');
  const minConfidence = meta?.min_confidence ?? (confs.length ? Math.min(...confs) : null);
  return {
    weakRows,
    minConfidence,
    lowSampleRows: rows.filter(rowIsLowSample).length,
    staleSources: (meta?.sources ?? []).filter((s) => s.stale).map((s) => ({ name: s.name, as_of: s.as_of })),
  };
}
