import { api } from '../../api';
import { bundledCatalog } from '../catalog';
import { parseCatalog } from '../catalog/parseCatalog';
import type { RunRequest, RunResponse } from '../types';
import { classifyError, classifyResponse, isAbort, RUN_TIMEOUT_MS } from './outcome';
import type { ScreenService } from './screenService';

/** Real backend adapter: PRD §8 endpoints through the shared axios client (auth header included). */
export const httpScreenService: ScreenService = {
  kind: 'api',

  async listScreens(signal) {
    const { data } = await api.get<unknown>('/screens', { signal });
    // PRD: "list of 30 screen definitions". Domains travel with the catalog when the server sends them.
    return Array.isArray(data)
      ? parseCatalog({ version: 'api', domains: bundledCatalog.domains, screens: data })
      : parseCatalog(data);
  },

  async runScreen(request: RunRequest, signal) {
    const started = performance.now();
    try {
      const { data } = await api.post<RunResponse>('/screen/run', request, { signal, timeout: RUN_TIMEOUT_MS });
      return classifyResponse(data, performance.now() - started);
    } catch (error) {
      if (isAbort(error)) throw error;
      return classifyError(error, performance.now() - started);
    }
  },

  async addToWatchlist(screenId, rowIds) {
    try {
      await api.post('/watchlist', { action: 'add', subjects: rowIds, source_screen: screenId });
      return { ok: true, message: `${rowIds.length} added to the watchlist.` };
    } catch {
      return { ok: false, message: 'Could not add to the watchlist. Nothing was added.' };
    }
  },
};
