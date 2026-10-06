import { Lock, Search, X } from 'lucide-react';
import { memo, useMemo, useState } from 'react';
import type { SavedConfig } from '../state/savedConfigs';
import type { Catalog } from '../types';
import { sectionLabel } from './ui';

interface Props {
  catalog: Catalog;
  selectedId: string | null;
  activeSavedId: string | null;
  saved: SavedConfig[];
  onSelect: (screenId: string) => void;
  onApplySaved: (config: SavedConfig) => void;
  onRemoveSaved: (config: SavedConfig) => void;
}

const item =
  'flex w-full items-start gap-2 rounded-lg border-0 px-2.5 py-1.5 text-left text-[13px] leading-[1.35] focus-visible:outline-2 focus-visible:outline-forest';

/** Left column: screens grouped by domain, filterable, with saved configurations pinned on top. */
export const ScreenLibrary = memo(function ScreenLibrary({ catalog, selectedId, activeSavedId, saved, onSelect, onApplySaved, onRemoveSaved }: Props) {
  const [query, setQuery] = useState('');
  const q = query.trim().toLowerCase();
  const labelOf = useMemo(() => Object.fromEntries(catalog.screens.map((s) => [s.id, s.label])), [catalog]);

  const groups = useMemo(
    () =>
      catalog.domains
        .map((domain) => ({
          domain,
          screens: catalog.screens.filter(
            (s) =>
              s.domain === domain.id &&
              (!q || s.label.toLowerCase().includes(q) || s.description.toLowerCase().includes(q) || domain.label.toLowerCase().includes(q)),
          ),
        }))
        .filter((g) => g.screens.length > 0),
    [catalog, q],
  );
  const savedShown = saved.filter((c) => catalog.screens.some((s) => s.id === c.screenId) && (!q || c.name.toLowerCase().includes(q)));

  return (
    <nav aria-label="Screens" className="flex min-h-0 flex-1 flex-col">
      <div className="px-4 pt-4 pb-2">
        <label className="flex h-9 items-center gap-2 rounded-lg border border-line bg-paper px-2.5 text-muted focus-within:border-forest">
          <Search size={15} aria-hidden="true" />
          <input
            type="search"
            aria-label="Filter screens"
            placeholder={`Filter ${catalog.screens.length} screens`}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="min-w-0 flex-1 border-none bg-transparent text-[13px] text-ink outline-none"
          />
        </label>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-2.5 pb-4">
        {savedShown.length > 0 && (
          <section className="mt-2">
            <h2 className={`${sectionLabel} px-2 pb-1`}>Saved</h2>
            {savedShown.map((c) => (
              <div key={c.id} className="group relative">
                <button
                  type="button"
                  onClick={() => onApplySaved(c)}
                  aria-current={activeSavedId === c.id ? 'true' : undefined}
                  className={`${item} flex-col gap-0 pr-8 ${activeSavedId === c.id ? 'bg-forest-soft text-forest' : 'bg-transparent text-ink hover:bg-paper'}`}
                >
                  <span className="font-medium">{c.name}</span>
                  <span className="text-[11.5px] text-muted">{labelOf[c.screenId]}</span>
                </button>
                <button
                  type="button"
                  aria-label={`Remove saved configuration ${c.name}`}
                  title="Remove"
                  onClick={() => onRemoveSaved(c)}
                  className="absolute top-1.5 right-1.5 hidden size-6 items-center justify-center rounded-md border-0 bg-transparent text-muted group-focus-within:flex group-hover:flex hover:bg-white"
                >
                  <X size={13} />
                </button>
              </div>
            ))}
          </section>
        )}

        {groups.map(({ domain, screens }) => (
          <section key={domain.id} className="mt-3">
            <h2 className={`${sectionLabel} px-2 pb-1`}>{domain.label}</h2>
            {screens.map((s) => {
              const active = s.id === selectedId;
              const locked = s.render.flags.includes('needs_price');
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => onSelect(s.id)}
                  aria-current={active ? 'page' : undefined}
                  title={locked ? 'Needs price data' : undefined}
                  className={`${item} ${active ? 'bg-forest-soft font-medium text-forest' : 'bg-transparent text-ink hover:bg-paper'}`}
                >
                  <span className="flex-1">{s.label}</span>
                  {locked && (
                    <span className="mt-0.5 shrink-0 text-muted">
                      <Lock size={12} aria-hidden="true" />
                      <span className="sr-only">Needs price data</span>
                    </span>
                  )}
                </button>
              );
            })}
          </section>
        ))}

        {groups.length === 0 && savedShown.length === 0 && (
          <p className="px-2 py-6 text-[13px] text-muted">No screens match “{query}”.</p>
        )}
      </div>
    </nav>
  );
});
