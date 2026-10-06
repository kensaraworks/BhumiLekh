import type { CheckValue, ColumnType } from './types';
import { checkText, REGISTERED_VALUE_SUFFIX } from './trust';

const num = (v: unknown) => (typeof v === 'number' && !Number.isNaN(v) ? v : null);

/** Plain-text cell value, used by CSV export and by cells without special rendering. */
export function formatValue(type: ColumnType, value: unknown): string {
  if (value === null || value === undefined || value === '') return '—';
  const n = num(value);
  switch (type) {
    case 'int':
    case 'sample_n':
      return n === null ? String(value) : Math.round(n).toLocaleString('en-IN');
    case 'decimal':
      return n === null ? String(value) : n.toLocaleString('en-IN', { maximumFractionDigits: 2 });
    case 'ratio':
      return n === null ? String(value) : n.toFixed(2);
    case 'confidence':
      return n === null ? String(value) : n.toFixed(2);
    case 'percent':
      return n === null ? String(value) : `${(n <= 1 ? n * 100 : n).toFixed(0)}%`;
    case 'area_ha':
      return n === null ? String(value) : `${n.toFixed(2)} ha`;
    case 'days':
      return n === null ? String(value) : `${Math.round(n)} d`;
    case 'months':
      return n === null ? String(value) : `${Math.round(n)} mo`;
    case 'distance_m':
      return n === null ? String(value) : n >= 1000 ? `${(n / 1000).toFixed(1)} km` : `${Math.round(n)} m`;
    case 'inr':
    case 'registered_value':
      return n === null ? String(value) : `₹${n.toLocaleString('en-IN')}`;
    case 'check':
      return typeof value === 'object' ? checkText(value as CheckValue) : String(value);
    default:
      return String(value);
  }
}

/** Column header text; registered values always carry their qualifier. */
export function columnHeader(label: string, type: ColumnType): string {
  return type === 'registered_value' ? `${label} · ${REGISTERED_VALUE_SUFFIX}` : label;
}

export const NUMERIC_TYPES: ColumnType[] = [
  'int', 'decimal', 'area_ha', 'days', 'months', 'percent', 'ratio', 'distance_m', 'inr', 'registered_value', 'confidence', 'sample_n',
];

export function compareValues(a: unknown, b: unknown): number {
  if (a === b) return 0;
  if (a === null || a === undefined) return 1;
  if (b === null || b === undefined) return -1;
  if (typeof a === 'number' && typeof b === 'number') return a - b;
  if (typeof a === 'object' && typeof b === 'object') {
    const order = { fired: 0, error: 1, not_covered: 2, none_found: 3 } as Record<string, number>;
    return (order[(a as CheckValue).status] ?? 9) - (order[(b as CheckValue).status] ?? 9);
  }
  return String(a).localeCompare(String(b), 'en-IN', { numeric: true });
}

export const formatElapsed = (ms: number) => (ms < 1000 ? `${Math.round(ms)} ms` : `${(ms / 1000).toFixed(1)} s`);
