import { PATTERN_META } from '../vocabulary';
import type { RendererProps } from './types';

/** Patterns that are not run from the Screen Runner (map layers, filter chips, dossier checks, graphs, feeds…). */
export function UnsupportedPatternRenderer({ screen }: RendererProps) {
  const meta = PATTERN_META[screen.render.pattern];
  return (
    <div className="flex flex-1 items-center justify-center rounded-xl border border-line bg-white p-8 text-center text-[13px] text-muted">
      <p className="max-w-md">
        <span className="font-medium text-ink">{meta.name}.</span> This query does not run in the Screen Runner
        {meta.elsewhere ? `; open it from ${meta.elsewhere}.` : '.'}
      </p>
    </div>
  );
}
