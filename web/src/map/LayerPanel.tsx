import { LAND_TYPE_FALLBACK, LAND_TYPE_FILL, layerDefs, type LayerId, type LayerState, type LayerStatus } from './mapConfig';

type LegendItem =
  | { label: string; bg: string; border: string; dashed?: boolean; round?: boolean }
  | { text: string }
  | { from: string; to: string; ramp: string[] };

const LEGENDS: Record<LayerId, { items: LegendItem[]; note?: string }> = {
  villages: {
    items: [{ label: 'Parcel coverage outline', bg: '#FFFFFF', border: '#7A4E12' }],
    note: 'Union of survey and block polygons · roads and gaps show as inner lines',
  },
  parcels: {
    items: [
      ...LAND_TYPE_FILL.map(([label, bg]) => ({ label: label.replace(' Land', ''), bg, border: '#1E5B53' })),
      { label: LAND_TYPE_FALLBACK.label.replace(' Land', ''), bg: LAND_TYPE_FALLBACK.fill, border: '#1E5B53' },
      { label: 'A digitised', bg: '#FFFFFF', border: '#1E5B53' },
      { label: 'B approximate', bg: '#F3EBCF', border: '#8C7424', dashed: true },
      { text: 'C not drawn · search only' },
    ],
    note: 'Points from z15, polygons from z17',
  },
  zoning: {
    items: [
      { label: 'Zones', bg: '#F2D8C9', border: '#B06A45' },
      { label: 'No-dev', bg: '#FFFFFF', border: '#9B1C1C' },
    ],
    note: 'Indore and Bhopal only · sheets with georef error over 15 m flagged',
  },
  velocity: {
    items: [
      { from: 'low', to: 'high', ramp: ['#EAF1EF', '#B9D6CE', '#78AFA1', '#2F7D6C', '#1E5B53'] },
      { label: 'n under 5', bg: '#FFFFFF', border: '#8A4204', dashed: true },
    ],
    note: 'Drawn at z6 to z14 as cells',
  },
  priceTrend: {
    items: [{ from: 'falling', to: 'rising', ramp: ['#B35C2E', '#E3B899', '#F2EFE8', '#9DC3BA', '#1E5B53'] }],
  },
  rera: { items: [{ label: 'Project', bg: '#3B4A8C', border: '#3B4A8C' }] },
  auctions: { items: [{ label: 'Live listing', bg: '#9B1C1C', border: '#9B1C1C', round: true }] },
};

const STATUS_TEXT: Partial<Record<LayerStatus, string>> = {
  loading: 'Loading…',
  unavailable: 'Data not connected yet',
  error: 'Could not load this layer',
  empty: 'No features in this view',
  zoomIn: 'Zoom in to see this layer',
};

const legendText = 'inline-flex items-center gap-1.5 text-[11.5px] text-muted';

function Legend({ item }: { item: LegendItem }) {
  if ('text' in item) return <span className="text-[11.5px] text-muted">{item.text}</span>;
  if ('ramp' in item) {
    return (
      <span className={legendText}>
        {item.from}
        <span className="flex">
          {item.ramp.map((color) => (
            <span key={color} className="h-2 w-4.5" style={{ background: color }} />
          ))}
        </span>
        {item.to}
      </span>
    );
  }
  return (
    <span className={legendText}>
      <span
        className={`h-2.5 w-3.5 border ${item.round ? 'rounded-[5px]' : 'rounded-xs'}`}
        style={{ background: item.bg, borderColor: item.border, borderStyle: item.dashed ? 'dashed' : 'solid' }}
      />
      {item.label}
    </span>
  );
}

interface Props {
  layers: Record<LayerId, LayerState>;
  status: Partial<Record<LayerId, LayerStatus>>;
  onChange: (id: LayerId, patch: Partial<LayerState>) => void;
}

export function LayerPanel({ layers, status, onChange }: Props) {
  const onCount = layerDefs.filter((d) => layers[d.id].on).length;

  return (
    <div className="absolute top-4 left-4 max-h-150 w-75 overflow-y-auto rounded-xl border border-line bg-white px-4 pt-3.5 pb-1.5">
      <div className="flex items-center justify-between">
        <span className="text-[15px] font-semibold">Layers</span>
        <span className="text-xs text-muted">
          {onCount} of {layerDefs.length} on
        </span>
      </div>
      {layerDefs.map((def) => {
        const legend = LEGENDS[def.id];
        const statusText = layers[def.id].on ? STATUS_TEXT[status[def.id] ?? 'loading'] : undefined;
        return (
          <div key={def.id} className="flex flex-col gap-1.5 border-b border-rule py-2.5 last:border-b-0">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id={`layer-${def.id}`}
                checked={layers[def.id].on}
                onChange={(e) => onChange(def.id, { on: e.target.checked })}
                className="size-4 accent-forest"
              />
              <label htmlFor={`layer-${def.id}`} className="flex-1 text-sm font-medium">
                {def.label}
              </label>
              <input
                type="range"
                aria-label={`${def.label} opacity`}
                min={0}
                max={100}
                value={Math.round(layers[def.id].opacity * 100)}
                onChange={(e) => onChange(def.id, { opacity: Number(e.target.value) / 100 })}
                className="w-17.5 accent-forest"
              />
            </div>
            <div className="ml-6.5 flex flex-wrap items-center gap-1.5">
              {legend.items.map((item, i) => (
                <Legend key={i} item={item} />
              ))}
            </div>
            {legend.note && <div className="ml-6.5 text-[11.5px] text-muted">{legend.note}</div>}
            {statusText && <div className="ml-6.5 text-[11.5px] font-medium text-warn">{statusText}</div>}
          </div>
        );
      })}
    </div>
  );
}
