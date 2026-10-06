import { useCallback, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { defaultParams, parseParam, sameValue, serializeParam } from '../params';
import { DEFAULT_SCOPE, parseScope, serializeScope } from '../scope';
import type { Catalog, ParamValue, ParamValues, Scope } from '../types';

/**
 * The URL is the state (playbook "URL is the state"):
 *   ?screen=q007&scope=tehsil:depalpur&p.min_grantors=4&sel=cluster:4812&view=map&nm=1&run=1
 * Screen changes push a history entry (Back returns to the previous screen); edits replace.
 * Unknown params (e.g. the dev-only ?mock=) are preserved.
 */
export type NarrowView = 'table' | 'map';

const LAST_SCREEN_KEY = 'bhumilekh.screenRunner.lastScreen';
const readLast = () => {
  try {
    return localStorage.getItem(LAST_SCREEN_KEY);
  } catch {
    return null;
  }
};

export function useRunnerUrlState(catalog: Catalog | undefined) {
  const [sp, setSp] = useSearchParams();
  const screenId = sp.get('screen');
  const screen = catalog?.screens.find((s) => s.id === screenId) ?? null;

  // No (or unknown) screen in the URL: open the last one used, else the first in the library.
  useEffect(() => {
    if (!catalog || screen || catalog.screens.length === 0) return;
    const last = readLast();
    const fallback = catalog.screens.find((s) => s.id === last) ?? catalog.screens[0];
    setSp(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.set('screen', fallback.id);
        return next;
      },
      { replace: true },
    );
  }, [catalog, screen, setSp]);

  useEffect(() => {
    if (!screen) return;
    try {
      localStorage.setItem(LAST_SCREEN_KEY, screen.id);
    } catch {
      /* storage unavailable: nothing to remember */
    }
  }, [screen]);

  const defaults = useMemo(() => (screen ? defaultParams(screen) : {}), [screen]);

  const params = useMemo<ParamValues>(() => {
    if (!screen) return {};
    const values: ParamValues = { ...defaults };
    for (const def of screen.params) {
      const raw = sp.get(`p.${def.key}`);
      if (raw === null) continue;
      const parsed = parseParam(def, raw);
      if (parsed !== undefined) values[def.key] = parsed;
    }
    return values;
  }, [screen, defaults, sp]);

  const scopeRaw = sp.get('scope');
  const scope = useMemo(() => parseScope(scopeRaw), [scopeRaw]);
  const selectedId = sp.get('sel');
  const narrowView = (sp.get('view') === 'map' ? 'map' : sp.get('view') === 'table' ? 'table' : null) as NarrowView | null;
  const nearMiss = sp.get('nm') === '1';
  const hasRun = sp.get('run') === '1';

  const update = useCallback(
    (mutate: (next: URLSearchParams) => void, push = false) =>
      setSp(
        (prev) => {
          const next = new URLSearchParams(prev);
          mutate(next);
          return next;
        },
        { replace: !push },
      ),
    [setSp],
  );

  const selectScreen = useCallback(
    (id: string, preset?: { scope?: Scope; params?: ParamValues }) =>
      update((next) => {
        for (const key of [...next.keys()]) if (key.startsWith('p.') || ['sel', 'run', 'nm', 'view'].includes(key)) next.delete(key);
        next.set('screen', id);
        const target = catalog?.screens.find((s) => s.id === id);
        if (preset?.scope) next.set('scope', serializeScope(preset.scope));
        if (target && preset?.params) {
          const d = defaultParams(target);
          for (const def of target.params) {
            const v = preset.params[def.key];
            if (v !== undefined && !sameValue(v, d[def.key])) next.set(`p.${def.key}`, serializeParam(def, v));
          }
        }
      }, true),
    [update, catalog],
  );

  const setParam = useCallback(
    (key: string, value: ParamValue) =>
      update((next) => {
        const def = screen?.params.find((p) => p.key === key);
        if (!def) return;
        if (sameValue(value, defaults[key])) next.delete(`p.${key}`);
        else next.set(`p.${key}`, serializeParam(def, value));
      }),
    [update, screen, defaults],
  );

  const resetParams = useCallback(
    () => update((next) => [...next.keys()].filter((k) => k.startsWith('p.')).forEach((k) => next.delete(k))),
    [update],
  );

  const setScope = useCallback(
    (value: Scope) =>
      update((next) => {
        if (serializeScope(value) === serializeScope(DEFAULT_SCOPE)) next.delete('scope');
        else next.set('scope', serializeScope(value));
      }),
    [update],
  );

  const setSelected = useCallback(
    (id: string | null) =>
      update((next) => {
        if (id) next.set('sel', id);
        else next.delete('sel');
      }),
    [update],
  );

  const setNarrowView = useCallback((view: NarrowView) => update((next) => next.set('view', view)), [update]);
  const setNearMiss = useCallback((on: boolean) => update((next) => (on ? next.set('nm', '1') : next.delete('nm'))), [update]);
  const setHasRun = useCallback((on: boolean) => update((next) => (on ? next.set('run', '1') : next.delete('run'))), [update]);

  const isDefaultParams = useMemo(
    () => !!screen && screen.params.every((p) => sameValue(params[p.key], defaults[p.key])),
    [screen, params, defaults],
  );

  return {
    screen,
    params,
    defaults,
    isDefaultParams,
    scope,
    selectedId,
    narrowView,
    nearMiss,
    hasRun,
    selectScreen,
    setParam,
    resetParams,
    setScope,
    setSelected,
    setNarrowView,
    setNearMiss,
    setHasRun,
  };
}
