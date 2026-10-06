import { useQuery } from '@tanstack/react-query';
import { ChevronDown } from 'lucide-react';
import { useCallback, useMemo } from 'react';
import { MapShell } from '../map/MapShell';
import { ScreenLibrary } from './components/ScreenLibrary';
import { ScreenWorkspace } from './components/ScreenWorkspace';
import { ToastProvider } from './components/Toast';
import { useToast } from './components/toastContext';
import { btn } from './components/ui';
import { defaultParams, sameValue } from './params';
import { serializeScope } from './scope';
import { screenService } from './service/screenService';
import { useSavedConfigs, type SavedConfig } from './state/savedConfigs';
import { useRunnerUrlState } from './state/useRunnerUrlState';

/**
 * Screen Runner (PRD §9.3): screen library | parameters generated from screen JSON | results
 * (caveat, table above map, actions). Lives inside the same shell as the Map.
 */
export function ScreenRunnerPage() {
  return (
    <MapShell>
      <ToastProvider>
        <ScreenRunner />
      </ToastProvider>
    </MapShell>
  );
}

function ScreenRunner() {
  const toast = useToast();
  const catalogQuery = useQuery({
    queryKey: ['screens'],
    queryFn: ({ signal }) => screenService.listScreens(signal),
    staleTime: Infinity,
    retry: 1,
  });
  const catalog = catalogQuery.data;
  const url = useRunnerUrlState(catalog);
  const { configs, save, remove } = useSavedConfigs();
  const { screen, scope, params, selectScreen } = url;

  const domainLabel = useMemo(() => catalog?.domains.find((d) => d.id === screen?.domain)?.label ?? '', [catalog, screen]);

  const activeSavedId = useMemo(() => {
    if (!screen) return null;
    const d = defaultParams(screen);
    return (
      configs.find(
        (c) =>
          c.screenId === screen.id &&
          serializeScope(c.scope) === serializeScope(scope) &&
          screen.params.every((p) => sameValue(c.params[p.key] ?? d[p.key], params[p.key])),
      )?.id ?? null
    );
  }, [configs, screen, scope, params]);

  const onSelect = useCallback((id: string) => selectScreen(id), [selectScreen]);
  const onApplySaved = useCallback((c: SavedConfig) => selectScreen(c.screenId, { scope: c.scope, params: c.params }), [selectScreen]);
  const onRemoveSaved = useCallback(
    (c: SavedConfig) => {
      remove(c.id);
      toast('Saved configuration removed.');
    },
    [remove, toast],
  );

  if (catalogQuery.isError)
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
        <h1 className="text-[15px] font-semibold text-ink">Could not load screen definitions</h1>
        <p className="text-[13px] text-muted">GET /api/screens did not respond. The runner needs the definitions to build its forms.</p>
        <button type="button" className={btn} onClick={() => void catalogQuery.refetch()}>
          Retry
        </button>
      </div>
    );

  const library = catalog ? (
    <ScreenLibrary
      catalog={catalog}
      selectedId={screen?.id ?? null}
      activeSavedId={activeSavedId}
      saved={configs}
      onSelect={onSelect}
      onApplySaved={onApplySaved}
      onRemoveSaved={onRemoveSaved}
    />
  ) : (
    <div className="flex flex-col gap-2 p-4" aria-busy="true" aria-label="Loading screens">
      {Array.from({ length: 12 }, (_, i) => (
        <span key={i} className="h-3 animate-pulse rounded bg-rule" style={{ width: `${55 + ((i * 17) % 40)}%` }} />
      ))}
    </div>
  );

  return (
    <div className="flex min-w-0 flex-1 flex-col overflow-y-auto bg-paper lg:flex-row lg:overflow-hidden">
      <aside className="hidden shrink-0 flex-col border-r border-line bg-white lg:flex lg:w-[224px] xl:w-[272px]">{library}</aside>

      {/* Below 1024px the library collapses above the form instead of squeezing three columns. */}
      <details className="group shrink-0 border-b border-line bg-white lg:hidden">
        <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3 text-[13.5px] [&::-webkit-details-marker]:hidden">
          <span>
            <span className="text-muted">Screen · </span>
            <span className="font-medium text-ink">{screen?.label ?? 'Choose a screen'}</span>
          </span>
          <ChevronDown size={16} className="text-muted transition-transform group-open:rotate-180" aria-hidden="true" />
        </summary>
        <div className="flex max-h-[60vh] flex-col border-t border-line">{library}</div>
      </details>

      {screen ? (
        <ScreenWorkspace key={screen.id} screen={screen} domainLabel={domainLabel} url={url} onSaveConfig={save} />
      ) : (
        <div className="flex flex-1 items-center justify-center text-[13px] text-muted">{catalog ? 'Choose a screen from the library.' : 'Loading screens…'}</div>
      )}
    </div>
  );
}
