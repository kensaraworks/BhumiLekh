import type { BBox, Scope, ScopeKind } from './types';

/**
 * Geographic reference for the scope selector. v1 is Indore district at full depth (PRD §2).
 * Replace with a lookup endpoint when one exists; ids are the URL values.
 */
export const DISTRICTS = [{ id: 'indore', label: 'Indore' }];
export const TEHSILS: Record<string, { id: string; label: string }[]> = {
  indore: [
    { id: 'depalpur', label: 'Depalpur' },
    { id: 'hatod', label: 'Hatod' },
    { id: 'indore', label: 'Indore' },
    { id: 'mhow', label: 'Mhow (Dr. Ambedkar Nagar)' },
    { id: 'sanwer', label: 'Sanwer' },
  ],
};

/** Approximate Indore district extent; used for "Current map view" until a live view is shared. */
export const INDORE_EXTENT: BBox = [75.45, 22.45, 76.25, 23.1];

export const SCOPE_KINDS: { kind: ScopeKind; label: string }[] = [
  { kind: 'district', label: 'District' },
  { kind: 'tehsil', label: 'Tehsil' },
  { kind: 'village', label: 'Village' },
  { kind: 'poly', label: 'Drawn area' },
  { kind: 'view', label: 'Current map view' },
];

export const DEFAULT_SCOPE: Scope = { kind: 'district', id: 'indore' };

export function serializeScope(scope: Scope): string {
  return scope.kind === 'view' ? 'view' : `${scope.kind}:${scope.id ?? ''}`;
}

export function parseScope(raw: string | null): Scope {
  if (!raw) return DEFAULT_SCOPE;
  if (raw === 'view') return { kind: 'view' };
  const i = raw.indexOf(':');
  const kind = (i < 0 ? raw : raw.slice(0, i)) as ScopeKind;
  if (!SCOPE_KINDS.some((k) => k.kind === kind)) return DEFAULT_SCOPE;
  const id = i < 0 ? '' : decodeURIComponent(raw.slice(i + 1));
  return { kind, id };
}

export function scopeLabel(scope: Scope): string {
  switch (scope.kind) {
    case 'district':
      return `${DISTRICTS.find((d) => d.id === scope.id)?.label ?? scope.id ?? 'District'} district`;
    case 'tehsil':
      return scope.id
        ? `${Object.values(TEHSILS).flat().find((t) => t.id === scope.id)?.label ?? scope.id} tehsil`
        : 'Tehsil (not chosen)';
    case 'village':
      return scope.id ? `${scope.id} village` : 'Village (not chosen)';
    case 'poly':
      return scope.id ? `Drawn area ${scope.id}` : 'Drawn area (none drawn)';
    case 'view':
      return 'Current map view';
  }
}

/** Why the scope cannot run yet, or null when it can. */
export function scopeProblem(scope: Scope): string | null {
  if (scope.kind === 'tehsil' && !scope.id) return 'Choose a tehsil';
  if (scope.kind === 'village' && !scope.id?.trim()) return 'Enter a village name or code';
  if (scope.kind === 'poly' && !scope.id) return 'Draw an area on the map first';
  return null;
}

export function scopeBBox(scope: Scope, liveView: BBox | null): BBox | null {
  if (scope.kind === 'view') return liveView ?? INDORE_EXTENT;
  return null; // district / tehsil / village / polygon are resolved server-side from scope.id
}
