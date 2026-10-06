import type { Catalog, RunOutcome, RunRequest } from '../types';
import { httpScreenService } from './httpScreenService';
import { mockScreenService } from './mockScreenService';

export interface WatchlistResult {
  ok: boolean;
  message: string;
}

/**
 * The only seam between the Screen Runner UI and the backend. The UI never calls axios directly,
 * so switching from the mock to the API is one environment variable:
 *
 *   VITE_SCREEN_SOURCE=api   → GET /api/screens, POST /api/screen/run, POST /api/watchlist
 *   (unset)                  → bundled screen JSON + mock execution (no backend needed)
 */
export interface ScreenService {
  readonly kind: 'api' | 'mock';
  listScreens(signal?: AbortSignal): Promise<Catalog>;
  /** Never rejects for business outcomes; only rejects when aborted. */
  runScreen(request: RunRequest, signal?: AbortSignal): Promise<RunOutcome>;
  addToWatchlist(screenId: string, rowIds: string[]): Promise<WatchlistResult>;
}

export const screenService: ScreenService =
  import.meta.env.VITE_SCREEN_SOURCE === 'api' ? httpScreenService : mockScreenService;
