import { ChevronRight } from 'lucide-react';
import type { Condition, FunnelStep } from '../types';

/** Composite screens: how many candidates survive each condition, in order (playbook CMP). */
export function FunnelStrip({ conditions, funnel, nearMiss, onNearMiss, ran }: { conditions: Condition[]; funnel: FunnelStep[] | null | undefined; nearMiss: boolean; onNearMiss: (on: boolean) => void; ran: boolean }) {
  return (
    <div className="flex shrink-0 items-center gap-3 rounded-lg border border-line bg-white px-3 py-2">
      <ol className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto text-xs" aria-label="Conditions funnel">
        {conditions.map((c, i) => {
          const step = funnel?.find((f) => f.cond === c.key);
          return (
            <li key={c.key} className="flex shrink-0 items-center gap-1">
              {i > 0 && <ChevronRight size={13} className="text-muted" aria-hidden="true" />}
              <span className="flex items-baseline gap-1.5 rounded-md bg-paper px-2 py-1">
                <span className="font-plex-mono text-[11px] text-muted">{i + 1}</span>
                <span className="text-muted">{c.label}</span>
                <span className="font-plex-mono font-medium text-ink">{ran && step ? step.remaining.toLocaleString('en-IN') : '—'}</span>
              </span>
            </li>
          );
        })}
      </ol>
      <label className="flex shrink-0 items-center gap-1.5 text-xs text-ink" title="Adds rows that fail exactly one condition">
        <input type="checkbox" checked={nearMiss} onChange={(e) => onNearMiss(e.target.checked)} className="size-3.5 accent-forest" />
        Show near misses
      </label>
    </div>
  );
}
