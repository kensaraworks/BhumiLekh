import { AlertTriangle, Bookmark, Download, FlaskConical, Star } from 'lucide-react';
import type { ReactNode } from 'react';
import { formatElapsed } from '../format';
import type { TrustSummary } from '../trust';
import { WEAK_CLUSTER_BELOW } from '../trust';
import type { RunResponse, ScreenDefinition } from '../types';
import { plural, UNIT_META } from '../vocabulary';
import { CaveatBanner } from './CaveatBanner';
import type { ResultView } from './resultView';
import { btn } from './ui';

interface HeaderProps {
  screen: ScreenDefinition;
  view: ResultView;
  response: RunResponse | null;
  scopeLabel: string;
  rowCount: number;
  showInViewToggle: boolean;
  inViewAvailable: boolean;
  onlyInView: boolean;
  onOnlyInView: (on: boolean) => void;
  onExport: () => void;
  onWatchlist: () => void;
  onSave: () => void;
  trust: TrustSummary;
  onRetry: () => void;
}

const STATUS_TEXT: Record<ResultView['kind'], string> = {
  initial: 'Not run yet',
  loading: 'Running…',
  locked: 'Locked',
  results: '',
  empty: 'No matching results',
  no_data: 'No data available',
  not_connected: 'Not connected',
  error: 'Run failed',
};

function Notice({ icon, children, tone = 'muted' }: { icon: ReactNode; children: ReactNode; tone?: 'muted' | 'warn' | 'risk' | 'dev' }) {
  const tones = {
    muted: 'border-line bg-white text-muted',
    warn: 'border-[#E9C79C] bg-white text-warn',
    risk: 'border-[#E8B4B4] bg-[#FBEFEF] text-risk',
    dev: 'border-dashed border-[#8E97C7] bg-sale-soft text-sale',
  };
  return <div className={`flex items-center gap-2 rounded-lg border px-3 py-1.5 text-[12.5px] ${tones[tone]}`}>{icon}{children}</div>;
}

/** Caveat, run summary, actions and trust notices: the part of the results column every pattern shares. */
export function ResultsHeader(p: HeaderProps) {
  const unit = UNIT_META[p.screen.render.unit];
  const shown = p.view.shown;
  const hasRows = p.rowCount > 0;
  const meta = p.response?.meta;
  const total = meta?.total ?? p.rowCount;
  const summary = p.view.kind === 'results' ? `${total.toLocaleString('en-IN')} ${plural(unit.noun, total)}` : STATUS_TEXT[p.view.kind];
  const elapsed = shown && 'elapsedMs' in shown && p.view.kind !== 'loading' ? ` · ran in ${formatElapsed(shown.elapsedMs)}` : '';
  const unavailable = 'Unavailable until results are available.';

  return (
    <div className="flex shrink-0 flex-col gap-2.5">
      <CaveatBanner caveat={p.response?.caveat?.en ?? p.screen.caveat} staleSources={meta?.sources.filter((s) => s.stale)} />

      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <div className="flex items-baseline gap-1.5 text-sm" aria-live="polite">
          <span className="font-semibold whitespace-nowrap text-ink">{summary}</span>
          <span className="text-[13px] text-muted">
            {elapsed} · scope: {p.scopeLabel}
            {p.response?.as_of && p.view.kind === 'results' ? ` · data as of ${p.response.as_of}` : ''}
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {p.showInViewToggle && (
            <label className={`mr-1 flex items-center gap-1.5 text-[12.5px] ${p.inViewAvailable ? 'text-ink' : 'text-muted opacity-60'}`} title="Off by default, so results never shrink silently when the map pans">
              <input type="checkbox" disabled={!p.inViewAvailable} checked={p.onlyInView} onChange={(e) => p.onOnlyInView(e.target.checked)} className="size-3.5 accent-forest" />
              Only rows in map view
            </label>
          )}
          <button type="button" onClick={p.onExport} aria-disabled={!hasRows || undefined} title={hasRows ? 'Export the rows shown as CSV (e)' : `Export is ${unavailable.toLowerCase()}`} className={btn}>
            <Download size={14} aria-hidden="true" />
            Export CSV
          </button>
          <button type="button" onClick={p.onWatchlist} aria-disabled={!hasRows || undefined} title={hasRows ? 'Add every row to the watchlist (w)' : `Watchlist is ${unavailable.toLowerCase()}`} className={btn}>
            <Star size={14} aria-hidden="true" />
            Add all to watchlist
          </button>
          <button type="button" onClick={p.onSave} className={btn} title="Save this screen, scope and parameters in this browser">
            <Bookmark size={14} aria-hidden="true" />
            Save configuration
          </button>
        </div>
      </div>

      {(p.response?.fixture || p.view.errorOverlay || meta?.truncated || p.trust.weakRows > 0 || p.trust.lowSampleRows > 0) && (
        <div className="flex flex-col gap-1.5">
          {p.response?.fixture && (
            <Notice tone="dev" icon={<FlaskConical size={14} aria-hidden="true" />}>
              Development fixture · synthetic rows generated in the browser, not real land data.
            </Notice>
          )}
          {p.view.errorOverlay && (
            <Notice tone="risk" icon={<AlertTriangle size={14} aria-hidden="true" />}>
              <span className="flex-1">Last run failed: {p.view.errorOverlay} Showing the previous result.</span>
              <button type="button" onClick={p.onRetry} className="border-0 bg-transparent p-0 font-medium underline">
                Retry
              </button>
            </Notice>
          )}
          {meta?.truncated && (
            <Notice icon={null}>
              Showing the top {meta.returned.toLocaleString('en-IN')} of {meta.total.toLocaleString('en-IN')} by {p.screen.render.table?.columns.find((c) => c.metric)?.label ?? p.screen.render.metric}. Sorting asks the server to re-sort.
            </Notice>
          )}
          {p.trust.weakRows > 0 && (
            <Notice tone="warn" icon={<AlertTriangle size={14} aria-hidden="true" />}>
              {p.trust.weakRows} {p.trust.weakRows === 1 ? 'row rests' : 'rows rest'} on an entity merge below {WEAK_CLUSTER_BELOW}
              {p.trust.minConfidence !== null ? ` (lowest ${p.trust.minConfidence.toFixed(2)})` : ''}. Verify the cluster before acting.
            </Notice>
          )}
          {p.trust.lowSampleRows > 0 && (
            <Notice tone="warn" icon={<span className="font-plex-mono text-[11px]">n&lt;5</span>}>
              {p.trust.lowSampleRows} {p.trust.lowSampleRows === 1 ? 'row has' : 'rows have'} metrics from fewer than 5 samples; read them as low confidence.
            </Notice>
          )}
        </div>
      )}
    </div>
  );
}
