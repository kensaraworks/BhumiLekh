import { bundledCatalog } from '../catalog';
import type { RunOutcome, RunRequest, RunResponse, ScreenDefinition } from '../types';
import { buildFixtureResponse, ENABLE_SCREEN_FIXTURES } from './fixtures';
import { classifyResponse } from './outcome';
import type { ScreenService } from './screenService';

/**
 * Mock execution adapter. It behaves as if the screening API exists but the corpus is empty:
 * it returns real envelopes with zero rows and honest source coverage, never invented results.
 *
 * Default ("auto") behaviour, per screen:
 *  - every source is one of the PRD's 12 v1 sources → envelope with coverage "none" → "No data available"
 *  - any source outside the v1 list → behaves like HTTP 501 → "Screen not connected"
 *
 * Dev overrides (only in `npm run dev`, or via VITE_SCREEN_MOCK_SCENARIO):
 *   ?mock=empty | no_data | not_connected | error | timeout | fixtures
 * `fixtures` (or VITE_SCREEN_FIXTURES=true) returns clearly labelled synthetic rows to exercise the renderers.
 */
type Scenario = 'auto' | 'empty' | 'no_data' | 'not_connected' | 'error' | 'timeout' | 'fixtures';
const SCENARIOS: Scenario[] = ['auto', 'empty', 'no_data', 'not_connected', 'error', 'timeout', 'fixtures'];

function scenario(): Scenario {
  const fromUrl = import.meta.env.DEV ? new URLSearchParams(window.location.search).get('mock') : null;
  const value = (fromUrl ?? import.meta.env.VITE_SCREEN_MOCK_SCENARIO ?? 'auto') as Scenario;
  return SCENARIOS.includes(value) ? value : 'auto';
}

/** PRD §5 sources (S1–S12) plus layers derived from them inside the platform. */
const V1_SOURCES = [
  /SRO/i, /SAMPADA/i, /Bhulekh/i, /Parcel registry/i, /Parcel geometry/i, /Bhu-?Naksha/i, /RERA/i, /Auction feed/i,
  /IBAPI/i, /MCA/i, /Master plan/i, /Zoning/i, /Sentinel-2/i, /VIIRS/i, /Tender/i, /Circle rate/i, /RCMS/i, /ECI/i,
  /Entity (graph|registry)/i,
];
export const sourcesOutsideV1 = (screen: ScreenDefinition) =>
  screen.sources.filter((s) => !V1_SOURCES.some((re) => re.test(s)));

const hash = (s: string) => [...s].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);

function wait(ms: number, signal?: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    const timer = setTimeout(resolve, ms);
    signal?.addEventListener('abort', () => {
      clearTimeout(timer);
      reject(new DOMException('Aborted', 'AbortError'));
    });
  });
}

function emptyEnvelope(screen: ScreenDefinition, coverage: 'none' | 'full'): RunResponse {
  return {
    screen_id: screen.id,
    run_id: `mock_${Date.now().toString(36)}`,
    as_of: new Date().toISOString().slice(0, 10),
    render: screen.render,
    caveat: { en: screen.caveat, hi: screen.caveat_hi },
    meta: {
      total: 0,
      returned: 0,
      truncated: false,
      low_sample: false,
      sources: screen.sources.map((name) => ({ name, as_of: coverage === 'none' ? null : new Date().toISOString().slice(0, 10), coverage })),
    },
    columns: (screen.render.table?.columns ?? []).map((c) => ({ key: c.key, label_key: `col.${c.key}`, type: c.type, sortable: c.sortable ?? true })),
    rows: [],
    geojson: null,
    tiles: null,
    funnel: screen.render.conditions ? screen.render.conditions.map((c) => ({ cond: c.key, label_key: c.label, remaining: 0 })) : null,
    series: screen.render.pattern === 'STAT' ? [] : null,
  };
}

export const mockScreenService: ScreenService = {
  kind: 'mock',

  async listScreens(signal) {
    await wait(120, signal);
    return bundledCatalog;
  },

  async runScreen(request: RunRequest, signal): Promise<RunOutcome> {
    const started = performance.now();
    const screen = bundledCatalog.screens.find((s) => s.id === request.screen_id);
    const mode = ENABLE_SCREEN_FIXTURES ? 'fixtures' : scenario();
    await wait(mode === 'timeout' ? 2400 : 650 + (hash(request.screen_id + JSON.stringify(request.params)) % 450), signal);
    const elapsedMs = performance.now() - started;
    if (!screen) return { status: 'not_connected', elapsedMs };

    switch (mode) {
      case 'fixtures':
        return classifyResponse(buildFixtureResponse(screen, request), elapsedMs);
      case 'empty':
        return classifyResponse(emptyEnvelope(screen, 'full'), elapsedMs);
      case 'no_data':
        return classifyResponse(emptyEnvelope(screen, 'none'), elapsedMs);
      case 'not_connected':
        return { status: 'not_connected', elapsedMs };
      case 'error':
        return { status: 'error', elapsedMs, message: 'The screening service failed to run this screen (HTTP 500). Retry, or narrow the scope.' };
      case 'timeout':
        return { status: 'error', elapsedMs, message: 'The run timed out after 15 s. Narrow the scope to a tehsil and run again.' };
      default:
        return sourcesOutsideV1(screen).length > 0
          ? { status: 'not_connected', elapsedMs }
          : classifyResponse(emptyEnvelope(screen, 'none'), elapsedMs);
    }
  },

  async addToWatchlist() {
    await wait(200);
    return { ok: false, message: 'The watchlist is not connected yet. Nothing was added.' };
  },
};
