import { PenLine } from 'lucide-react';
import { memo } from 'react';
import { Link } from 'react-router-dom';
import { DISTRICTS, SCOPE_KINDS, TEHSILS } from '../scope';
import type { Scope, ScopeKind } from '../types';
import { input } from './ui';

interface Props {
  scope: Scope;
  onChange: (scope: Scope) => void;
  /** True when the result map is showing and can supply its own bounds. */
  liveViewAvailable: boolean;
}

const firstId: Partial<Record<ScopeKind, string>> = { district: 'indore', tehsil: '' };

/** District / tehsil / village / drawn area / current map view (PRD §9.1, §9.3). */
export const ScopeSelector = memo(function ScopeSelector({ scope, onChange, liveViewAvailable }: Props) {
  const district = scope.kind === 'district' ? scope.id : 'indore';

  return (
    <fieldset className="flex flex-col gap-1.5 border-0 p-0">
      <legend className="mb-1.5 text-[13px] font-medium text-ink">Scope</legend>
      {SCOPE_KINDS.map(({ kind, label }) => {
        const active = scope.kind === kind;
        return (
          <div key={kind} className="flex flex-col gap-1.5">
            <label className="flex items-center gap-2 text-[13.5px] text-ink">
              <input
                type="radio"
                name="screen-scope"
                checked={active}
                onChange={() => onChange(kind === 'view' ? { kind } : { kind, id: firstId[kind] ?? '' })}
                className="size-4 accent-forest"
              />
              {label}
            </label>

            {active && kind === 'district' && (
              <div className="pl-6">
                <select aria-label="District" value={district} onChange={(e) => onChange({ kind, id: e.target.value })} className={input}>
                  {DISTRICTS.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.label}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {active && kind === 'tehsil' && (
              <div className="pl-6">
                <select aria-label="Tehsil" value={scope.id ?? ''} onChange={(e) => onChange({ kind, id: e.target.value })} className={input}>
                  <option value="">Choose a tehsil…</option>
                  {TEHSILS.indore.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {active && kind === 'village' && (
              <div className="pl-6">
                <input
                  type="text"
                  aria-label="Village name or code"
                  placeholder="Village name or LGD code"
                  value={scope.id ?? ''}
                  onChange={(e) => onChange({ kind, id: e.target.value })}
                  className={input}
                />
              </div>
            )}

            {active && kind === 'poly' && (
              <div className="ml-6 flex flex-col gap-1.5 rounded-lg border border-dashed border-line bg-white px-3 py-2.5 text-xs leading-[1.45] text-muted">
                <span className="flex items-center gap-1.5 font-medium text-ink">
                  <PenLine size={13} aria-hidden="true" />
                  {scope.id ? `Using drawn area ${scope.id}` : 'No area drawn'}
                </span>
                The spatial scope comes from a polygon drawn on the map. Draw it there, then choose “Run a screen here”.
                <Link to="/app/map" className="font-medium text-forest hover:underline">
                  Open the map
                </Link>
              </div>
            )}

            {active && kind === 'view' && (
              <p className="ml-6 text-xs leading-[1.45] text-muted">
                {liveViewAvailable
                  ? 'Runs over the area visible in the result map below.'
                  : 'Runs over the Indore district extent until a result map is open; pan it to narrow the area.'}
              </p>
            )}
          </div>
        );
      })}
    </fieldset>
  );
});
