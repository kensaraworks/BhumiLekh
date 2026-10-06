import type { DateRange, ParamDef, ParamValue, ParamValues, ScreenDefinition } from './types';

const iso = (d: Date) => d.toISOString().slice(0, 10);

/** Dates in screen JSON may be relative ("today", "-12m", "-30d") so defaults never go stale. */
export function resolveDate(value: string, now = new Date()): string {
  if (value === 'today') return iso(now);
  const m = /^-(\d+)([dmy])$/.exec(value);
  if (!m) return value;
  const d = new Date(now);
  const n = Number(m[1]);
  if (m[2] === 'd') d.setDate(d.getDate() - n);
  if (m[2] === 'm') d.setMonth(d.getMonth() - n);
  if (m[2] === 'y') d.setFullYear(d.getFullYear() - n);
  return iso(d);
}

export function defaultValue(def: ParamDef): ParamValue {
  const v = def.default;
  if (def.type === 'date' && typeof v === 'string') return resolveDate(v);
  if (def.type === 'date_range' && v && typeof v === 'object' && !Array.isArray(v)) {
    const r = v as DateRange;
    return { from: resolveDate(r.from), to: resolveDate(r.to) };
  }
  return v;
}

export function defaultParams(screen: ScreenDefinition): ParamValues {
  return Object.fromEntries(screen.params.map((p) => [p.key, defaultValue(p)]));
}

export function sameValue(a: ParamValue, b: ParamValue): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

/** Returns a message when the value breaks the definition's constraints, else null. */
export function validateParam(def: ParamDef, value: ParamValue): string | null {
  switch (def.type) {
    case 'int':
    case 'decimal': {
      if (typeof value !== 'number' || Number.isNaN(value)) return 'Enter a number';
      if (def.type === 'int' && !Number.isInteger(value)) return 'Whole numbers only';
      if (def.min !== undefined && value < def.min) return `Minimum ${def.min}`;
      if (def.max !== undefined && value > def.max) return `Maximum ${def.max}`;
      return null;
    }
    case 'multi_select':
      return Array.isArray(value) && value.length > 0 ? null : 'Choose at least one';
    case 'date_range': {
      const r = value as DateRange | null;
      if (!r?.from || !r?.to) return 'Choose both dates';
      return r.from <= r.to ? null : 'Start date is after end date';
    }
    case 'date':
      return typeof value === 'string' && value ? null : 'Choose a date';
    default:
      return null;
  }
}

export function validateParams(screen: ScreenDefinition, values: ParamValues): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const def of screen.params) {
    const message = validateParam(def, values[def.key] ?? null);
    if (message) errors[def.key] = message;
  }
  return errors;
}

/* ---------- URL serialisation (only values that differ from the default are written) ---------- */

export function serializeParam(def: ParamDef, value: ParamValue): string {
  if (value === null) return '';
  if (def.type === 'boolean') return value ? '1' : '0';
  if (def.type === 'multi_select') return (value as string[]).join(',');
  if (def.type === 'date_range') {
    const r = value as DateRange;
    return `${r.from}..${r.to}`;
  }
  return String(value);
}

export function parseParam(def: ParamDef, raw: string): ParamValue | undefined {
  switch (def.type) {
    case 'int':
    case 'decimal': {
      const n = Number(raw);
      return raw.trim() === '' || Number.isNaN(n) ? undefined : n;
    }
    case 'boolean':
      return raw === '1' || raw === 'true';
    case 'multi_select': {
      const allowed = new Set(def.options?.map((o) => o.value));
      return raw.split(',').filter((v) => allowed.has(v));
    }
    case 'select':
      return def.options?.some((o) => o.value === raw) ? raw : undefined;
    case 'date_range': {
      const [from, to] = raw.split('..');
      return from && to ? { from, to } : undefined;
    }
    default:
      return raw;
  }
}

/** Short human summary, e.g. "≥3 grantors · 1000 m · 24 months", for saved configurations. */
export function summarizeParams(screen: ScreenDefinition, values: ParamValues): string {
  return screen.params
    .map((def) => {
      const v = values[def.key];
      if (v === null || v === undefined) return null;
      if (def.type === 'boolean') return v ? def.label : null;
      if (def.type === 'multi_select') return `${(v as string[]).length} ${def.label.toLowerCase()}`;
      if (def.type === 'select') return def.options?.find((o) => o.value === v)?.label ?? String(v);
      if (def.type === 'date_range') return `${(v as DateRange).from} → ${(v as DateRange).to}`;
      return `${def.label} ${v}${def.unit ? ` ${def.unit}` : ''}`;
    })
    .filter(Boolean)
    .join(' · ');
}
