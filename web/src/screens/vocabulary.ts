import type { Pattern, Unit } from './types';

/** Pattern names and where non-runner patterns live, from the query playbook. */
export const PATTERN_META: Record<Pattern, { name: string; family: string; elsewhere?: string }> = {
  FLT: { name: 'Filter chip', family: 'Filter only', elsewhere: 'Map → Filter bar → + Add filter' },
  LYR: { name: 'Map layer', family: 'Map only', elsewhere: 'Map → Layers panel' },
  TBL: { name: 'Screener table', family: 'Table only' },
  HYB: { name: 'Split view', family: 'Map + table' },
  CMP: { name: 'Composite funnel', family: 'Map + table' },
  WKB: { name: 'Assembly workbench', family: 'Map + table', elsewhere: 'Map → draw a block → Open assembly workbench' },
  NET: { name: 'Network graph', family: 'Relationship', elsewhere: 'Entity profile → Network tab' },
  DOS: { name: 'Dossier check', family: 'Single subject', elsewhere: 'Parcel dossier → Risk flags' },
  STAT: { name: 'Benchmark chart', family: 'Table only' },
  MON: { name: 'Monitor & feed', family: 'Over time', elsewhere: 'Watch → New rule' },
  SYS: { name: 'No screen', family: 'No screen' },
};

/** Unit vocabulary: noun, how it draws on the map, where a row drills to. */
export const UNIT_META: Record<Unit, { noun: string; map: string | null; drill: string }> = {
  parcel: { noun: 'parcel', map: 'Matching parcels: counts per H3 cell below z15, centroids z15–16, polygons z17+ with tier styling', drill: 'Parcel dossier' },
  cluster: { noun: 'buyer cluster', map: 'Cluster hulls, with member parcels from z15', drill: 'Cluster profile' },
  entity: { noun: 'entity', map: 'Holdings of the selected row only', drill: 'Entity profile' },
  dev: { noun: 'developer', map: 'Projects of the selected developer only', drill: 'Developer profile' },
  project: { noun: 'RERA project', map: 'Project pins, footprints from z15', drill: 'Project card' },
  auction: { noun: 'auction', map: 'Auction pins, parcel outline when matched', drill: 'Auction card' },
  cell: { noun: 'cell', map: 'H3 cells filled by value (r7 zoomed out, r8 zoomed in)', drill: 'Cell card' },
  deed: { noun: 'deed', map: 'Parcel of each deed, pins below z15', drill: 'Parcel dossier › History' },
  zone: { noun: 'zone', map: 'Overlay polygons, hatched', drill: 'Overlay card' },
  corridor: { noun: 'corridor', map: 'Corridor lines with buffer rings', drill: 'Corridor card' },
  site: { noun: 'detected site', map: 'Detection polygons', drill: 'Imagery compare' },
  water: { noun: 'water body', map: 'Water-body outlines with extent by year', drill: 'Water-body card' },
  facility: { noun: 'facility', map: 'Facility footprints', drill: 'Facility card' },
  district: { noun: 'district', map: 'District fill', drill: 'District card' },
  city: { noun: 'city', map: null, drill: 'Underlying rows' },
  agency: { noun: 'agency', map: null, drill: 'Underlying projects' },
  lender: { noun: 'lender', map: null, drill: 'Underlying auctions' },
  chart: { noun: 'point', map: null, drill: 'Underlying rows' },
  person: { noun: 'person', map: 'Holdings of the selected node only', drill: 'Person profile' },
  event: { noun: 'event', map: 'Event pins or extracted geometry', drill: 'Event card' },
  block: { noun: 'parcel in block', map: 'Block outline with parcels coloured by the active tab', drill: 'Parcel dossier' },
  none: { noun: 'result', map: null, drill: '—' },
};

export const plural = (noun: string, n: number) => (n === 1 ? noun : noun.endsWith('y') && !noun.endsWith('ey') ? `${noun.slice(0, -1)}ies` : `${noun}s`);

/** Units whose drill target is a parcel dossier (reuses the map's DossierPanel). */
export const PARCEL_UNITS: Unit[] = ['parcel', 'deed', 'block'];
