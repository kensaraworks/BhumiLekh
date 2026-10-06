import { Lock, Play } from 'lucide-react';
import { memo } from 'react';
import type { ParamValue, ParamValues, Scope, ScreenDefinition } from '../types';
import { PATTERN_META } from '../vocabulary';
import { ParameterField } from './ParameterField';
import { ScopeSelector } from './ScopeSelector';
import { btnPrimary } from './ui';

interface Props {
  screen: ScreenDefinition;
  domainLabel: string;
  values: ParamValues;
  defaults: ParamValues;
  errors: Record<string, string>;
  isDefault: boolean;
  scope: Scope;
  liveViewAvailable: boolean;
  locked: boolean;
  runBlockedReason: string | null;
  running: boolean;
  pending: boolean;
  onChange: (key: string, value: ParamValue) => void;
  onDraftInvalid: (key: string, invalid: boolean) => void;
  onReset: () => void;
  onScopeChange: (scope: Scope) => void;
  onRun: () => void;
}

/** Middle column: generated entirely from screen.params. */
export const ScreenParameters = memo(function ScreenParameters(p: Props) {
  const { screen } = p;
  const meta = PATTERN_META[screen.render.pattern];
  const batch = screen.render.pattern === 'DOS';
  const view = batch ? 'Batch check · table leads' : `${meta.name}${screen.render.lead ? ` · ${screen.render.lead} leads` : ''}`;

  return (
    <form
      aria-label="Parameters"
      className="flex flex-col gap-4 px-5 pt-5"
      onSubmit={(e) => {
        e.preventDefault();
        p.onRun();
      }}
    >
      <header className="flex flex-col gap-1.5">
        <span className="text-xs text-muted">{p.domainLabel}</span>
        <h1 className="text-[19px] leading-[1.25] font-semibold tracking-[-0.01em] text-ink">{screen.label}</h1>
        <p className="text-[13.5px] leading-normal text-muted">{screen.description}</p>
        <dl className="mt-1 grid grid-cols-[auto_1fr] gap-x-2.5 gap-y-0.5 text-xs text-muted">
          <dt>View</dt>
          <dd className="text-ink">{view}</dd>
          <dt>Sources</dt>
          <dd className="text-ink">{screen.sources.join(', ')}</dd>
        </dl>
      </header>

      {p.locked && (
        <div className="flex gap-2.5 rounded-lg border border-line bg-white px-3 py-2.5 text-[12.5px] leading-[1.45] text-muted">
          <Lock size={14} className="mt-0.5 shrink-0 text-ink" aria-hidden="true" />
          <span>
            <span className="font-medium text-ink">Needs price data.</span> This screen depends on registered or market prices; only
            circle rates are available. It unlocks when a price source is connected.
          </span>
        </div>
      )}

      <div className="flex flex-col gap-3.5">
        {screen.params.length === 0 && <p className="text-[13px] text-muted">No tunable parameters. Set the scope and run.</p>}
        {screen.params.map((def) => (
          <ParameterField
            key={def.key}
            def={def}
            value={p.values[def.key] ?? null}
            defaultValue={p.defaults[def.key] ?? null}
            error={p.errors[def.key]}
            onChange={p.onChange}
            onDraftInvalid={p.onDraftInvalid}
          />
        ))}
      </div>

      <ScopeSelector scope={p.scope} onChange={p.onScopeChange} liveViewAvailable={p.liveViewAvailable} />

      <div className="sticky bottom-0 -mx-5 flex flex-col gap-2 border-t border-line bg-[#FAF9F5] px-5 pt-3 pb-4">
        <button type="submit" disabled={!!p.runBlockedReason || p.locked} className={btnPrimary}>
          <Play size={14} aria-hidden="true" className="fill-current" />
          {p.running ? 'Running…' : 'Run screen'}
        </button>
        <div className="flex min-h-4 items-center justify-between gap-2 text-xs">
          <span className={p.runBlockedReason && !p.locked ? 'text-warn' : 'text-muted'}>
            {p.locked ? 'Locked until price data exists' : (p.runBlockedReason ?? (p.pending ? 'Parameters changed · re-running…' : ''))}
          </span>
          {!p.isDefault && (
            <button type="button" onClick={p.onReset} className="border-0 bg-transparent p-0 text-xs font-medium text-forest hover:underline">
              Restore defaults
            </button>
          )}
        </div>
      </div>
    </form>
  );
});
