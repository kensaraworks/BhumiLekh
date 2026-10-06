import { MapPinned } from 'lucide-react';
import { lazy, memo, Suspense } from 'react';
import type { BBox, ResultFeatureCollection, Row, ScreenDefinition } from '../types';
import { plural, UNIT_META } from '../vocabulary';
import type { ResultView } from './resultView';

// MapLibre is only loaded when a run actually has something to draw.
const ResultMap = lazy(() => import('./ResultMap'));

interface Props {
  screen: ScreenDefinition;
  view: ResultView;
  rows: Row[];
  features: ResultFeatureCollection | null;
  selectedId: string | null;
  hoveredId: string | null;
  onSelect: (id: string) => void;
  onHover: (id: string | null) => void;
  onViewChange: (bbox: BBox, ids: Set<string>) => void;
}

function Legend({ approximate, unmapped }: { approximate: number; unmapped: number }) {
  return (
    <div className="pointer-events-none absolute bottom-3 left-3 flex max-w-[min(340px,58%)] flex-col gap-1.5 rounded-lg border border-line bg-white/95 px-3 py-2 text-[11.5px] text-muted">
      <span className="flex items-center gap-2">
        <span className="size-3 rounded-full border-2 border-white bg-[#2F7D6C] shadow-[0_0_0_1px_#DDD9CF]" />
        Result · Tier A located
      </span>
      {approximate > 0 && (
        <span className="flex items-center gap-2">
          <span className="size-3 rounded-full border-2 border-[#8C7424] bg-white" />
          Tier B · approximate location ({approximate})
        </span>
      )}
      {unmapped > 0 && <span>{unmapped} without a drawable location (Tier C or no geometry) · table only</span>}
    </div>
  );
}

function Placeholder({ title, text, what }: { title: string; text: string; what: string | null }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-1.5 bg-[#ECE9E1] px-6 text-center">
      <MapPinned size={18} className="text-muted" aria-hidden="true" />
      <span className="text-[13.5px] font-medium text-ink">{title}</span>
      <span className="max-w-[420px] text-[12.5px] leading-normal text-muted">{text}</span>
      {what && <span className="mt-1 max-w-[440px] text-[11.5px] leading-normal text-muted">Draws: {what}. Tier A solid, Tier B dashed and hatched, Tier C never drawn.</span>}
    </div>
  );
}

/** Map half of the split. Reads the same result set as the table; never runs its own query. */
export const ResultMapPanel = memo(function ResultMapPanel(p: Props) {
  const unit = UNIT_META[p.screen.render.unit];
  const what = unit.map;
  const drawableCount = p.features?.features.filter((f) => f.properties.tier !== 'C').length ?? 0;

  let body;
  if (p.view.shown?.status === 'results' && drawableCount > 0 && p.features) {
    const approximate = p.features.features.filter((f) => f.properties.tier === 'B').length;
    const located = new Set(p.features.features.filter((f) => f.properties.tier !== 'C').map((f) => f.properties.row_id));
    body = (
      <>
        <Suspense fallback={<Placeholder title="Loading map…" text="Preparing the result layer." what={null} />}>
          <ResultMap
            results={p.features}
            selectedResultId={p.selectedId}
            hoveredResultId={p.hoveredId}
            onSelectResult={p.onSelect}
            onHoverResult={p.onHover}
            onViewChange={p.onViewChange}
          />
        </Suspense>
        <Legend approximate={approximate} unmapped={p.rows.filter((r) => !located.has(r.id)).length} />
      </>
    );
  } else if (p.view.kind === 'loading') {
    body = <Placeholder title="Waiting for results" text="The map draws the same rows as the table once the run returns." what={what} />;
  } else if (p.view.shown?.status === 'results') {
    body = (
      <Placeholder
        title="No mapped locations in this result"
        text={`These ${plural(unit.noun, 2)} have no drawable geometry yet. Parcel results highlight here once parcel tiles are connected; the table holds every row.`}
        what={what}
      />
    );
  } else if (p.view.kind === 'empty') {
    body = <Placeholder title="Nothing to draw" text={`The run returned no ${plural(unit.noun, 2)} in this scope.`} what={what} />;
  } else if (p.view.kind === 'locked') {
    body = <Placeholder title="No map while locked" text="This screen needs price data before it can return anything to draw." what={what} />;
  } else if (p.view.kind === 'initial') {
    body = <Placeholder title="Map results will appear here" text="Run a screen with spatial results to populate this map." what={what} />;
  } else {
    const why =
      p.view.kind === 'no_data'
        ? "The screen's sources hold no records yet."
        : p.view.kind === 'not_connected'
          ? 'This screen is not connected to the screening API yet.'
          : 'The run failed, so there is nothing to draw.';
    body = <Placeholder title="Nothing to draw" text={why} what={what} />;
  }

  return (
    <section aria-label="Results map" className="relative h-full min-h-0 overflow-hidden rounded-xl border border-line bg-[#E9E6DD]">
      {body}
    </section>
  );
});
