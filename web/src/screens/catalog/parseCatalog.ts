import type { Catalog, ColumnType, ParamType, Pattern, ScreenDefinition } from '../types';

const PATTERNS: Pattern[] = ['FLT', 'LYR', 'TBL', 'HYB', 'CMP', 'WKB', 'NET', 'DOS', 'STAT', 'MON', 'SYS'];
const PARAM_TYPES: ParamType[] = ['int', 'decimal', 'date', 'date_range', 'select', 'multi_select', 'boolean', 'text'];
const COLUMN_TYPES: ColumnType[] = [
  'text', 'entity', 'int', 'decimal', 'area_ha', 'days', 'months', 'date', 'percent', 'ratio',
  'distance_m', 'inr', 'registered_value', 'confidence', 'tier', 'sample_n', 'check',
];

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const isStr = (v: unknown): v is string => typeof v === 'string' && v.length > 0;

/**
 * Validates screen definitions, whether they come from the bundled JSON or GET /api/screens.
 * Invalid screens are dropped with a console error instead of crashing the library; a screen
 * without a caveat is invalid, because the caveat header is mandatory (PRD §8).
 */
export function parseScreen(raw: unknown): ScreenDefinition | null {
  const problems: string[] = [];
  if (!isObj(raw)) return null;
  const id = isStr(raw.id) ? raw.id : '(no id)';
  if (!isStr(raw.id)) problems.push('id');
  if (!isStr(raw.label)) problems.push('label');
  if (!isStr(raw.domain)) problems.push('domain');
  if (!isStr(raw.caveat)) problems.push('caveat (required: shown above every result)');
  if (!Array.isArray(raw.params)) problems.push('params');
  else
    raw.params.forEach((p, i) => {
      if (!isObj(p) || !isStr(p.key) || !PARAM_TYPES.includes(p.type as ParamType)) problems.push(`params[${i}]`);
      else if ((p.type === 'select' || p.type === 'multi_select') && !Array.isArray(p.options)) problems.push(`params[${i}].options`);
    });
  const render = raw.render;
  if (!isObj(render) || !PATTERNS.includes(render.pattern as Pattern) || !isStr(render.unit)) problems.push('render');
  else if (isObj(render.table) && Array.isArray(render.table.columns)) {
    render.table.columns.forEach((c, i) => {
      if (!isObj(c) || !isStr(c.key) || !isStr(c.label) || !COLUMN_TYPES.includes(c.type as ColumnType))
        problems.push(`render.table.columns[${i}]`);
      // PRD §10: registered consideration is never "market value".
      else if (/market value/i.test(String(c.label)) && c.type !== 'text')
        problems.push(`render.table.columns[${i}] label says "market value"`);
    });
  }
  if (problems.length) {
    console.error(`Screen definition ${id} rejected: ${problems.join(', ')}`);
    return null;
  }
  const screen = raw as unknown as ScreenDefinition;
  return {
    ...screen,
    description: screen.description ?? '',
    sources: Array.isArray(screen.sources) ? screen.sources : [],
    render: { ...screen.render, flags: Array.isArray(screen.render.flags) ? screen.render.flags : [] },
  };
}

export function parseCatalog(raw: unknown): Catalog {
  if (!isObj(raw) || !Array.isArray(raw.screens)) throw new Error('Screen catalog is malformed');
  const screens = raw.screens.map(parseScreen).filter((s): s is ScreenDefinition => s !== null);
  const domains = Array.isArray(raw.domains)
    ? raw.domains.filter((d): d is Catalog['domains'][number] => isObj(d) && isStr(d.id) && isStr(d.label))
    : [];
  // Screens whose domain is not declared still show, under their raw domain id.
  for (const s of screens) if (!domains.some((d) => d.id === s.domain)) domains.push({ id: s.domain, label: s.domain });
  return { version: isStr(raw.version) ? raw.version : 'unknown', domains, screens };
}
