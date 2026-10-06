import { X } from 'lucide-react';
import { DossierPanel } from '../../map/DossierPanel';
import { formatValue } from '../format';
import { ConfidenceBadge } from './TrustBadges';
import type { ColumnDef, Row, ScreenDefinition } from '../types';
import { PARCEL_UNITS, UNIT_META } from '../vocabulary';

/**
 * Drill-down from a result row. Parcel-like rows reuse the map's DossierPanel; other units show the
 * row and name the profile it will open once that view exists. The result underneath stays mounted.
 */
export function DrillDrawer({ screen, row, columns, onClose }: { screen: ScreenDefinition; row: Row; columns: ColumnDef[]; onClose: () => void }) {
  const unit = screen.render.unit;
  const parcelId = row.parcel_ids?.[0] ?? (unit === 'parcel' ? row.id.replace(/^parcel:/, '') : null);

  return (
    <div className="absolute inset-y-0 right-0 z-20 flex shadow-[-8px_0_24px_rgba(27,36,32,0.10)]">
      {PARCEL_UNITS.includes(unit) && parcelId ? (
        <DossierPanel parcelId={parcelId} onClose={onClose} />
      ) : (
        <aside aria-label={UNIT_META[unit].drill} className="flex h-full w-110 max-w-[90vw] flex-col border-l border-line bg-white">
          <div className="flex items-start justify-between border-b border-line px-5 pt-4.5 pb-3.5">
            <div>
              <div className="text-xs text-muted">{UNIT_META[unit].drill}</div>
              <div className="mt-0.5 font-plex-mono text-lg font-medium">{row.id}</div>
            </div>
            <button type="button" aria-label="Close" onClick={onClose} className="flex size-9 items-center justify-center rounded-lg border border-line bg-white text-muted">
              <X size={16} />
            </button>
          </div>
          <dl className="flex flex-col gap-2 overflow-y-auto px-5 py-4 text-[13.5px]">
            {columns.map((c) => (
              <div key={c.key} className="flex justify-between gap-4 border-b border-rule pb-2">
                <dt className="text-muted">{c.label}</dt>
                <dd className="text-right font-plex-mono text-[13px]">
                  {c.type === 'confidence' && typeof row.values[c.key] === 'number' ? <ConfidenceBadge value={row.values[c.key] as number} /> : formatValue(c.type, row.values[c.key])}
                </dd>
              </div>
            ))}
          </dl>
          <p className="mt-auto border-t border-rule px-5 py-3 text-xs text-muted">The {UNIT_META[unit].drill.toLowerCase()} view is not built yet; this row opens it once it exists.</p>
        </aside>
      )}
    </div>
  );
}
