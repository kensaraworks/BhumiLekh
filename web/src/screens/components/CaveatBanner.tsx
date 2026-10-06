import { AlertTriangle } from 'lucide-react';
import type { SourceStatus } from '../types';

/**
 * The screen's caveat, above the results, always visible — including with zero results.
 * Not a tooltip (PRD §8, §9.3). Stale sources are appended here, per the playbook.
 */
export function CaveatBanner({ caveat, staleSources = [] }: { caveat: string; staleSources?: SourceStatus[] }) {
  return (
    <div role="note" aria-label="Caveat" className="flex shrink-0 gap-2.5 rounded-lg border border-[#E9C79C] bg-warn-soft px-3.5 py-2.5 text-[13px] leading-[1.45] text-warn">
      <AlertTriangle size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
      <div className="flex flex-col gap-0.5">
        <span>
          <span className="font-semibold">Caveat · </span>
          {caveat}
        </span>
        {staleSources.map((s) => (
          <span key={s.name} className="text-[12.5px]">
            {s.name} last updated {s.as_of ?? 'unknown'}; results may miss recent records.
          </span>
        ))}
      </div>
    </div>
  );
}
