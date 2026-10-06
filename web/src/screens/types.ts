/**
 * Screen Runner contracts.
 *
 * Mirrors the build contract in "BhumiLekh — how each query appears on screen" (render block,
 * response envelope, row shape) and PRD §8 (screen JSON, POST /api/screen/run, GET /api/screens).
 * Anything the frontend renders comes from these shapes; there are no per-screen components.
 */

/** Rendering patterns from the query playbook. The render block names one; the template does the rest. */
export type Pattern = 'FLT' | 'LYR' | 'TBL' | 'HYB' | 'CMP' | 'WKB' | 'NET' | 'DOS' | 'STAT' | 'MON' | 'SYS';

/** Result units (what one row is). */
export type Unit =
  | 'parcel' | 'cluster' | 'entity' | 'dev' | 'project' | 'auction' | 'cell' | 'deed' | 'zone' | 'corridor'
  | 'site' | 'water' | 'facility' | 'district' | 'city' | 'agency' | 'lender' | 'chart' | 'person' | 'event'
  | 'block' | 'none';

export type Flag =
  | 'needs_price' | 'price_input_optional' | 'super_admin' | 'confidence_badge' | 'imagery'
  | 'time_slider' | 'alertable' | 'batchable' | 'portfolio' | 'requires_block';

export type ColumnType =
  | 'text' | 'entity' | 'int' | 'decimal' | 'area_ha' | 'days' | 'months' | 'date' | 'percent' | 'ratio'
  | 'distance_m' | 'inr' | 'registered_value' | 'confidence' | 'tier' | 'sample_n' | 'check';

export interface ColumnDef {
  key: string;
  label: string;
  label_hi?: string;
  type: ColumnType;
  sortable?: boolean;
  /** The screen's key metric (default sort). */
  metric?: boolean;
}

export interface Condition {
  key: string;
  label: string;
  label_hi?: string;
}

export interface RenderSpec {
  pattern: Pattern;
  /** HYB, CMP and batch DOS: which view gets the larger share of the split. */
  lead?: 'map' | 'table';
  unit: Unit;
  map?: { geom: Unit; color_by: 'metric' };
  table?: { columns: ColumnDef[]; sort: string };
  metric: string;
  scope: 'area' | 'portfolio' | 'drawn_block' | 'subject';
  drill: string;
  flags: Flag[];
  params_from_logic?: string[];
  /** CMP only: the conditions the funnel strip and pass/fail columns show, in order. */
  conditions?: Condition[];
  /** STAT only: chart hint. */
  chart?: 'bars' | 'line' | 'histogram';
}

export type ParamType = 'int' | 'decimal' | 'date' | 'date_range' | 'select' | 'multi_select' | 'boolean' | 'text';

export interface DateRange {
  from: string;
  to: string;
}

export type ParamValue = number | string | boolean | string[] | DateRange | null;
export type ParamValues = Record<string, ParamValue>;

export interface ParamOption {
  value: string;
  label: string;
  label_hi?: string;
}

export interface ParamDef {
  key: string;
  label: string;
  label_hi?: string;
  type: ParamType;
  /** Dates may be relative: "today", "-12m", "-30d". */
  default: ParamValue;
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
  options?: ParamOption[];
  help?: string;
  help_hi?: string;
}

export interface ScreenDefinition {
  id: string;
  label: string;
  label_hi?: string;
  description: string;
  description_hi?: string;
  /** Domain id, see Catalog.domains. */
  domain: string;
  params: ParamDef[];
  caveat: string;
  caveat_hi?: string;
  sources: string[];
  /** Plain-language logic from the playbook. Display only; SQL lives server-side. */
  logic?: string;
  render: RenderSpec;
}

export interface Domain {
  id: string;
  label: string;
  label_hi?: string;
}

export interface Catalog {
  version: string;
  domains: Domain[];
  screens: ScreenDefinition[];
}

/* ---------- scope ---------- */

export type ScopeKind = 'district' | 'tehsil' | 'village' | 'poly' | 'view';

export interface Scope {
  kind: ScopeKind;
  /** district / tehsil id, village name or code, polygon id. Absent for 'view'. */
  id?: string;
}

/** [west, south, east, north] in WGS84. */
export type BBox = [number, number, number, number];

/* ---------- run ---------- */

export interface SortSpec {
  key: string;
  dir: 'asc' | 'desc';
}

/** Body of POST /api/screen/run. PRD: {screen_id, params, bbox}; playbook adds scope and near_miss. */
export interface RunRequest {
  screen_id: string;
  params: ParamValues;
  scope: Scope;
  bbox: BBox | null;
  near_miss?: boolean;
  /** Only sent when the server truncated the result and the user re-sorts. */
  sort?: SortSpec;
}

export type RowFlag = 'low_conf' | 'low_sample' | 'tier_b' | 'tier_c';

export type CheckStatus = 'fired' | 'none_found' | 'not_covered' | 'error';

export interface CheckValue {
  status: CheckStatus;
  severity?: 'high' | 'medium' | 'low';
  source: string;
  as_of: string | null;
}

export interface Row {
  /** `${unit}:${id}`; also the drill-down target and the map feature key. */
  id: string;
  values: Record<string, unknown>;
  /** Lowest merge confidence this row rests on. */
  conf?: number;
  flags?: RowFlag[];
  /** Lets the map highlight parcel tiles without shipping geometry. */
  parcel_ids?: string[];
  /** Composites: condition key → passed. */
  pass?: Record<string, boolean>;
}

export interface SourceStatus {
  name: string;
  as_of: string | null;
  coverage: 'full' | 'partial' | 'none';
  /** True when as_of is older than the source's expected refresh. */
  stale?: boolean;
}

export interface RunMeta {
  total: number;
  returned: number;
  truncated: boolean;
  min_confidence?: number;
  low_sample: boolean;
  sources: SourceStatus[];
}

export interface ResponseColumn {
  key: string;
  label_key: string;
  type: ColumnType;
  sortable: boolean;
}

export interface FunnelStep {
  cond: string;
  label_key: string;
  remaining: number;
}

export interface SeriesPoint {
  x: string | number;
  y: number;
  n: number;
}

/** GeoJSON kept loose on purpose: MapLibre validates it, and features carry properties.row_id. */
export interface ResultFeatureCollection {
  type: 'FeatureCollection';
  features: {
    type: 'Feature';
    id?: string | number;
    properties: { row_id: string; tier?: 'A' | 'B' | 'C'; [k: string]: unknown };
    geometry: { type: string; coordinates: unknown };
  }[];
}

/** The one response envelope every pattern returns. */
export interface RunResponse {
  screen_id: string;
  run_id: string;
  as_of: string;
  render?: RenderSpec;
  caveat?: { en: string; hi?: string };
  interpreted_from?: string;
  meta: RunMeta;
  columns: ResponseColumn[];
  rows: Row[];
  h3_counts?: { r7: Record<string, number>; r8: Record<string, number> } | null;
  geojson?: ResultFeatureCollection | null;
  tiles?: string | null;
  funnel?: FunnelStep[] | null;
  series?: SeriesPoint[] | null;
  /** Set only by the development fixture generator. Never set by the API. */
  fixture?: boolean;
}

/**
 * What a run produced, after classification. The four non-result states are deliberately distinct:
 * empty (query ran, nothing matched), no_data (sources not populated), not_connected (screen not wired
 * to the API), error (the run failed).
 */
export type RunOutcome =
  | { status: 'results'; response: RunResponse; elapsedMs: number }
  | { status: 'empty'; response: RunResponse; elapsedMs: number }
  | { status: 'no_data'; response: RunResponse; elapsedMs: number }
  | { status: 'not_connected'; elapsedMs: number }
  | { status: 'error'; message: string; elapsedMs: number };

export type OutcomeStatus = RunOutcome['status'];
