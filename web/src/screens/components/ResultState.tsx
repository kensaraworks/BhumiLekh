import { AlertTriangle, Database, Lock, Play, SearchX, Unplug } from 'lucide-react';
import type { ReactNode } from 'react';
import type { SourceStatus } from '../types';
import type { ResultViewKind } from './resultView';
import { btn } from './ui';

interface Props {
  kind: Exclude<ResultViewKind, 'results' | 'loading'>;
  unitPlural: string;
  scopeLabel: string;
  sources?: SourceStatus[];
  message?: string;
  runBlockedReason: string | null;
  canWiden: boolean;
  paramsChanged: boolean;
  onRun: () => void;
  onRetry: () => void;
  onWiden: () => void;
  onResetParams: () => void;
}

function Frame({ icon, title, children, tone = 'muted' }: { icon: ReactNode; title: string; children: ReactNode; tone?: 'muted' | 'risk' }) {
  return (
    <div className="mx-auto flex max-w-[440px] flex-col items-center gap-2 px-6 py-8 text-center">
      <span className={`flex size-9 items-center justify-center rounded-full ${tone === 'risk' ? 'bg-[#F7DADA] text-risk' : 'bg-paper text-muted'}`}>{icon}</span>
      <h2 className="text-[15px] font-semibold text-ink">{title}</h2>
      <div className="flex flex-col items-center gap-3 text-[13px] leading-normal text-muted">{children}</div>
    </div>
  );
}

/** Body of the results table when there are no rows to show. */
export function ResultState(p: Props) {
  switch (p.kind) {
    case 'initial':
      return (
        <Frame icon={<Play size={16} />} title="Run a screen to see results">
          <p>No screening results are available yet. Configure the parameters and run this screen.</p>
          <button type="button" onClick={p.onRun} aria-disabled={!!p.runBlockedReason || undefined} className={btn} title={p.runBlockedReason ?? undefined}>
            <Play size={13} className="fill-current" aria-hidden="true" />
            Run screen
          </button>
          {p.runBlockedReason && <span className="text-xs text-warn">{p.runBlockedReason}</span>}
        </Frame>
      );
    case 'empty':
      return (
        <Frame icon={<SearchX size={16} />} title="No matching results">
          <p>
            No {p.unitPlural} match in {p.scopeLabel}. Try widening the geographic scope or adjusting the parameters.
          </p>
          {(p.canWiden || p.paramsChanged) && (
            <div className="flex gap-2">
              {p.canWiden && (
                <button type="button" onClick={p.onWiden} className={btn}>
                  Widen to the district
                </button>
              )}
              {p.paramsChanged && (
                <button type="button" onClick={p.onResetParams} className={btn}>
                  Restore default parameters
                </button>
              )}
            </div>
          )}
        </Frame>
      );
    case 'no_data':
      return (
        <Frame icon={<Database size={16} />} title="No screening data available yet">
          <p>Connect the screening data source to populate results. The screen ran, but its sources hold no records yet.</p>
          {p.sources && p.sources.length > 0 && (
            <ul className="w-full max-w-[340px] divide-y divide-rule rounded-lg border border-line bg-white text-left text-xs">
              {p.sources.map((s) => (
                <li key={s.name} className="flex justify-between gap-3 px-3 py-1.5">
                  <span className="text-ink">{s.name}</span>
                  <span>{s.coverage === 'none' ? 'Not loaded' : s.coverage === 'partial' ? `Partial · ${s.as_of ?? ''}` : `Loaded · ${s.as_of ?? ''}`}</span>
                </li>
              ))}
            </ul>
          )}
        </Frame>
      );
    case 'not_connected':
      return (
        <Frame icon={<Unplug size={16} />} title="Screen not connected">
          <p>UI definition is ready, but this screen is not connected to the screening API yet.</p>
        </Frame>
      );
    case 'error':
      return (
        <Frame icon={<AlertTriangle size={16} />} title="Unable to run screen" tone="risk">
          <p>{p.message ?? 'The run failed.'}</p>
          <button type="button" onClick={p.onRetry} className={btn}>
            Retry
          </button>
        </Frame>
      );
    case 'locked':
      return (
        <Frame icon={<Lock size={16} />} title="Needs price data">
          <p>
            This screen needs registered or market prices, which are not available yet (circle rates only). It stays locked rather than
            returning a misleading result.
          </p>
        </Frame>
      );
  }
}
