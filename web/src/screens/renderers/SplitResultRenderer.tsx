import { FunnelStrip } from '../components/FunnelStrip';
import type { RendererProps } from './types';

const tab = 'rounded-md border-0 px-3 py-1 text-[12.5px]';

/**
 * HYB (split view), CMP (composite funnel) and batch DOS: table above, map below, one result set.
 * The lead view gets the larger share. Below 1024px the two become tabs, lead first.
 */
export function SplitResultRenderer({ screen, view, response, tablePane, mapPane, narrowView, onNarrowView, nearMiss, onNearMiss }: RendererProps) {
  const mapLeads = screen.render.lead === 'map';
  const conditions = screen.render.conditions;
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      {screen.render.pattern === 'CMP' && conditions && (
        <FunnelStrip conditions={conditions} funnel={response?.funnel} nearMiss={nearMiss} onNearMiss={onNearMiss} ran={view.shown !== undefined} />
      )}
      <div role="tablist" aria-label="Result view" className="flex w-fit gap-0.5 rounded-lg bg-[#EDEAE2] p-0.75 lg:hidden">
        {(mapLeads ? (['map', 'table'] as const) : (['table', 'map'] as const)).map((v) => (
          <button key={v} type="button" role="tab" aria-selected={narrowView === v} onClick={() => onNarrowView(v)} className={`${tab} ${narrowView === v ? 'bg-white text-ink shadow-[0_0_0_1px_#DDD9CF]' : 'bg-transparent text-muted'}`}>
            {v === 'table' ? 'Table' : 'Map'}
          </button>
        ))}
      </div>
      <div className={`${narrowView === 'map' ? 'hidden' : 'flex'} min-h-[220px] flex-col lg:flex`} style={{ flex: mapLeads ? '2 1 0%' : '3 1 0%' }}>
        {tablePane}
      </div>
      <div className={`${narrowView === 'table' ? 'hidden' : 'block'} min-h-[220px] lg:block`} style={{ flex: mapLeads ? '3 1 0%' : '2 1 0%' }}>
        {mapPane}
      </div>
    </div>
  );
}
