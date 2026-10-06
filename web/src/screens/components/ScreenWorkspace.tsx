import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { compareValues } from '../format';
import { validateParams } from '../params';
import { resolveRenderer, hasMapView } from '../renderers/registry';
import { DEFAULT_SCOPE, INDORE_EXTENT, scopeBBox, scopeLabel, scopeProblem, serializeScope } from '../scope';
import { screenService } from '../service/screenService';
import { downloadCsv, rowsToCsv } from '../state/csv';
import type { SavedConfig } from '../state/savedConfigs';
import type { useRunnerUrlState } from '../state/useRunnerUrlState';
import { useScreenRun } from '../state/useScreenRun';
import { summarizeTrust } from '../trust';
import type { BBox, ColumnDef, ParamValues, Row, RunRequest, ScreenDefinition, SortSpec } from '../types';
import { plural, UNIT_META } from '../vocabulary';
import { DrillDrawer } from './DrillDrawer';
import { ResultMapPanel } from './ResultMapPanel';
import { ResultsHeader } from './ResultsHeader';
import { ResultState } from './ResultState';
import { ResultTable } from './ResultTable';
import type { ResultView } from './resultView';
import { ScreenParameters } from './ScreenParameters';
import { useToast } from './toastContext';

type UrlState = ReturnType<typeof useRunnerUrlState>;

interface Props {
  screen: ScreenDefinition;
  domainLabel: string;
  url: UrlState;
  onSaveConfig: (config: Omit<SavedConfig, 'id' | 'savedAt'>) => SavedConfig | null;
}

function defaultSort(screen: ScreenDefinition): SortSpec | null {
  const metric = screen.render.table?.columns.find((c) => c.metric && c.sortable !== false);
  return metric ? { key: metric.key, dir: 'desc' } : null;
}

const typing = (el: EventTarget | null) => el instanceof HTMLElement && (el.isContentEditable || ['INPUT', 'SELECT', 'TEXTAREA'].includes(el.tagName));

/**
 * One screen's parameters and results. Mounted per screen (keyed by id), so switching screens
 * starts from a clean run state while the URL keeps everything restorable.
 */
export function ScreenWorkspace({ screen, domainLabel, url, onSaveConfig }: Props) {
  const toast = useToast();
  const { params, defaults, scope, selectedId, nearMiss, setSelected, setHasRun, setScope } = url;
  const locked = screen.render.flags.includes('needs_price');
  const isComposite = screen.render.pattern === 'CMP';
  const split = hasMapView(screen.render);
  const unit = UNIT_META[screen.render.unit];

  /* ---------- parameters → request ---------- */
  const [draftInvalid, setDraftInvalid] = useState<Record<string, boolean>>({});
  const onDraftInvalid = useCallback((key: string, invalid: boolean) => setDraftInvalid((prev) => (prev[key] === invalid ? prev : { ...prev, [key]: invalid })), []);
  const errors = useMemo(() => validateParams(screen, params), [screen, params]);
  const firstError = Object.values(errors)[0] ?? (Object.values(draftInvalid).some(Boolean) ? 'Enter a number' : null);
  const runBlockedReason = scopeProblem(scope) ?? (firstError ? `Fix the parameters: ${firstError.toLowerCase()}` : null);

  const liveBBox = useRef<BBox | null>(null);
  const [viewBBox, setViewBBox] = useState<BBox>(INDORE_EXTENT);
  const [serverSort, setServerSort] = useState<SortSpec | undefined>(undefined);

  const request = useMemo<RunRequest | null>(() => {
    if (locked || runBlockedReason) return null;
    return {
      screen_id: screen.id,
      params,
      scope,
      bbox: scope.kind === 'view' ? viewBBox : scopeBBox(scope, null),
      ...(isComposite ? { near_miss: nearMiss } : {}),
      ...(serverSort ? { sort: serverSort } : {}),
    };
  }, [locked, runBlockedReason, screen.id, params, scope, viewBBox, isComposite, nearMiss, serverSort]);

  const markRan = useCallback(() => setHasRun(true), [setHasRun]);
  const run = useScreenRun(request, { canRun: request !== null, autoRunOnMount: url.hasRun, onRan: markRan });

  const onScopeChange = useCallback(
    (next: typeof scope) => {
      // "Current map view" is captured when chosen; later panning never changes the run silently.
      if (next.kind === 'view') setViewBBox(liveBBox.current ?? INDORE_EXTENT);
      setScope(next);
    },
    [setScope],
  );

  /* ---------- outcome → view ---------- */
  const view: ResultView = useMemo(() => {
    if (locked) return { kind: 'locked' };
    if (!run.hasCommitted) return { kind: 'initial' };
    const outcome = run.outcome;
    if (!outcome) return { kind: 'loading' };
    const hasRows = (o: typeof outcome) => o.status === 'results';
    if (run.isFetching) return hasRows(outcome) ? { kind: outcome.status, shown: outcome, refreshing: true } : { kind: 'loading' };
    if (outcome.status === 'error' && run.lastGood && run.lastGood.status === 'results')
      return { kind: run.lastGood.status, shown: run.lastGood, errorOverlay: outcome.message };
    return { kind: outcome.status, shown: outcome };
  }, [locked, run.hasCommitted, run.outcome, run.isFetching, run.lastGood]);

  const response = view.shown && 'response' in view.shown ? view.shown.response : null;

  /* ---------- columns, rows, sort, rows-in-view ---------- */
  const columns = useMemo<ColumnDef[]>(() => {
    const defined = screen.render.table?.columns ?? [];
    const extra = (response?.columns ?? [])
      .filter((c) => !defined.some((d) => d.key === c.key))
      .map((c) => ({ key: c.key, label: c.label_key.replace(/^col\./, '').replace(/_/g, ' '), type: c.type, sortable: c.sortable }));
    return [...defined, ...extra];
  }, [screen, response]);

  const [sort, setSort] = useState<SortSpec | null>(() => defaultSort(screen));
  const onSort = useCallback(
    (key: string) => {
      const next: SortSpec = sort?.key === key ? { key, dir: sort.dir === 'desc' ? 'asc' : 'desc' } : { key, dir: 'desc' };
      setSort(next);
      // A truncated result is only the top slice: re-sorting it locally would mislead, so ask the server.
      if (response?.meta.truncated) setServerSort(next);
    },
    [sort, response],
  );

  const allRows = useMemo(() => response?.rows ?? [], [response]);
  const sortedRows = useMemo(() => {
    if (!sort || response?.meta.truncated) return allRows;
    const dir = sort.dir === 'asc' ? 1 : -1;
    return [...allRows].sort((a, b) => dir * compareValues(a.values[sort.key], b.values[sort.key]));
  }, [allRows, sort, response]);

  const [onlyInView, setOnlyInView] = useState(false);
  const visibleRef = useRef<Set<string> | null>(null);
  const [visibleIds, setVisibleIds] = useState<Set<string> | null>(null);
  const onViewChange = useCallback(
    (bbox: BBox, ids: Set<string>) => {
      liveBBox.current = bbox;
      visibleRef.current = ids;
      if (onlyInView) setVisibleIds(ids);
    },
    [onlyInView],
  );
  const toggleInView = useCallback((on: boolean) => {
    setOnlyInView(on);
    setVisibleIds(on ? visibleRef.current : null);
  }, []);
  const rows = useMemo(() => (onlyInView && visibleIds ? sortedRows.filter((r) => visibleIds.has(r.id)) : sortedRows), [sortedRows, onlyInView, visibleIds]);
  const features = response?.geojson ?? null;
  const trust = useMemo(() => summarizeTrust(allRows, response?.meta), [allRows, response]);

  /* ---------- selection, hover, drill ---------- */
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const onSelect = useCallback((id: string) => setSelected(id), [setSelected]);
  const openRow = openId ? allRows.find((r) => r.id === openId) : undefined;

  /* ---------- actions ---------- */
  const scopeText = scopeLabel(scope);
  const exportCsv = useCallback(() => {
    if (rows.length === 0) return toast('Export is unavailable until results are available.');
    downloadCsv(`${screen.id}_${serializeScope(scope).replace(/[^a-z0-9]+/gi, '-')}_${new Date().toISOString().slice(0, 10)}.csv`, rowsToCsv(columns, rows, screen.render.conditions));
    toast(`Exported ${rows.length} ${plural('row', rows.length)} as CSV.`);
  }, [rows, columns, screen, scope, toast]);

  const addToWatchlist = useCallback(async () => {
    if (rows.length === 0) return toast('Add to watchlist is unavailable until results are available.');
    const result = await screenService.addToWatchlist(screen.id, rows.map((r: Row) => r.id));
    toast(result.message, result.ok ? 'info' : 'warn');
  }, [rows, screen.id, toast]);

  const saveConfig = useCallback(() => {
    const changed: ParamValues = Object.fromEntries(Object.entries(params).filter(([k, v]) => JSON.stringify(v) !== JSON.stringify(defaults[k])));
    const saved = onSaveConfig({ screenId: screen.id, name: `${screen.label} · ${scopeText}`, scope, params: changed });
    toast(saved ? 'Configuration saved locally.' : 'Could not save: this browser is blocking local storage.', saved ? 'info' : 'warn');
  }, [params, defaults, onSaveConfig, screen, scope, scopeText, toast]);

  /* ---------- keyboard: j/k rows, Enter open, Esc close, e export, w watchlist ---------- */
  const keys = useRef({ rows, selectedId, openId, exportCsv, addToWatchlist });
  useEffect(() => {
    keys.current = { rows, selectedId, openId, exportCsv, addToWatchlist };
  });
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || typing(e.target)) return;
      const k = keys.current;
      if (e.key === 'Escape' && k.openId) return setOpenId(null);
      if (e.key === 'j' || e.key === 'k') {
        if (k.rows.length === 0) return;
        const i = k.rows.findIndex((r) => r.id === k.selectedId);
        const next = e.key === 'j' ? Math.min(k.rows.length - 1, i + 1) : Math.max(0, i < 0 ? 0 : i - 1);
        k.selectedId = k.rows[next].id; // rapid presses advance before the URL round-trip re-renders
        setSelected(k.selectedId);
      } else if (e.key === 'Enter' && k.selectedId && k.rows.some((r) => r.id === k.selectedId)) setOpenId(k.selectedId);
      else if (e.key === 'e') k.exportCsv();
      else if (e.key === 'w') void k.addToWatchlist();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [setSelected]);

  /* ---------- panes ---------- */
  const stateKind = view.kind === 'results' || view.kind === 'loading' ? null : view.kind;
  const emptyNode = stateKind ? (
    <ResultState
      kind={stateKind}
      unitPlural={plural(unit.noun, 2)}
      scopeLabel={scopeText}
      sources={response?.meta.sources}
      message={view.shown?.status === 'error' ? view.shown.message : undefined}
      runBlockedReason={runBlockedReason}
      canWiden={scope.kind !== 'district'}
      paramsChanged={!url.isDefaultParams}
      onRun={run.run}
      onRetry={run.retry}
      onWiden={() => url.setScope(DEFAULT_SCOPE)}
      onResetParams={url.resetParams}
    />
  ) : null;

  const tablePane = (
    <ResultTable
      label={`${screen.label} results`}
      columns={columns}
      conditions={screen.render.conditions}
      rows={view.kind === 'results' ? rows : []}
      sort={sort}
      onSort={onSort}
      selectedId={selectedId}
      hoveredId={hoveredId}
      onSelect={onSelect}
      onHover={setHoveredId}
      onOpen={setOpenId}
      drillLabel={unit.drill}
      loading={view.kind === 'loading'}
      dimmed={!!view.refreshing}
      empty={emptyNode ?? (view.kind === 'results' && onlyInView ? <p className="px-6 py-8 text-center text-[13px] text-muted">No rows inside the current map view. Pan the map or turn off “Only rows in map view”.</p> : null)}
    />
  );

  const mapPane = split ? (
    <ResultMapPanel
      screen={screen}
      view={view}
      rows={allRows}
      features={features}
      selectedId={selectedId}
      hoveredId={hoveredId}
      onSelect={onSelect}
      onHover={setHoveredId}
      onViewChange={onViewChange}
    />
  ) : null;

  const Renderer = resolveRenderer(screen.render);
  const stateText = view.kind === 'initial' ? 'Run the screen to draw this benchmark.' : view.kind === 'loading' ? 'Running…' : 'No values to chart for this run.';
  const narrowView = url.narrowView ?? (screen.render.lead === 'map' ? 'map' : 'table');

  return (
    <>
      <aside className="shrink-0 border-b border-line bg-[#FAF9F5] lg:w-[280px] lg:overflow-y-auto lg:border-r lg:border-b-0 xl:w-[320px]">
        <ScreenParameters
          screen={screen}
          domainLabel={domainLabel}
          values={params}
          defaults={defaults}
          errors={errors}
          isDefault={url.isDefaultParams}
          scope={scope}
          liveViewAvailable={!!features?.features.length}
          locked={locked}
          runBlockedReason={runBlockedReason}
          running={run.isFetching}
          pending={run.pending}
          onChange={url.setParam}
          onDraftInvalid={onDraftInvalid}
          onReset={url.resetParams}
          onScopeChange={onScopeChange}
          onRun={run.run}
        />
      </aside>

      <section aria-label="Results" className="relative flex min-h-[760px] min-w-0 flex-1 flex-col gap-3 overflow-hidden p-4 lg:min-h-0 xl:p-5">
        <ResultsHeader
          screen={screen}
          view={view}
          response={response}
          scopeLabel={scopeText}
          rowCount={view.kind === 'results' ? rows.length : 0}
          showInViewToggle={split}
          inViewAvailable={!!features?.features.length && view.kind === 'results'}
          onlyInView={onlyInView}
          onOnlyInView={toggleInView}
          onExport={exportCsv}
          onWatchlist={() => void addToWatchlist()}
          onSave={saveConfig}
          trust={trust}
          onRetry={run.retry}
        />
        <Renderer
          screen={screen}
          view={view}
          response={response}
          tablePane={tablePane}
          mapPane={mapPane}
          narrowView={narrowView}
          onNarrowView={url.setNarrowView}
          nearMiss={nearMiss}
          onNearMiss={url.setNearMiss}
          stateText={stateText}
        />
        {openRow && <DrillDrawer screen={screen} row={openRow} columns={columns} onClose={() => setOpenId(null)} />}
      </section>
    </>
  );
}
