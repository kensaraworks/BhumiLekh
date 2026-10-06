import axios from 'axios';
import type { RunOutcome, RunResponse } from '../types';

export const RUN_TIMEOUT_MS = 15_000;

/**
 * Turns a successful envelope into an outcome. The same rule applies to the API and the mock:
 * rows → results; zero rows with every source uncovered → no_data; otherwise → empty.
 */
export function classifyResponse(response: RunResponse, elapsedMs: number): RunOutcome {
  if (response.rows.length > 0 || (response.series?.length ?? 0) > 0) return { status: 'results', response, elapsedMs };
  const sources = response.meta.sources;
  if (sources.length > 0 && sources.every((s) => s.coverage === 'none')) return { status: 'no_data', response, elapsedMs };
  return { status: 'empty', response, elapsedMs };
}

/** Maps transport failures to an outcome with a user-safe message (no stack traces, no payload dumps). */
export function classifyError(error: unknown, elapsedMs: number): RunOutcome {
  if (axios.isAxiosError(error)) {
    const status = error.response?.status;
    // 404: no such screen on the server. 501: the definition exists but its SQL is not wired.
    if (status === 404 || status === 501) return { status: 'not_connected', elapsedMs };
    if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT')
      return {
        status: 'error',
        elapsedMs,
        message: `The run timed out after ${RUN_TIMEOUT_MS / 1000} s. Narrow the scope to a tehsil and run again.`,
      };
    if (!error.response)
      return { status: 'error', elapsedMs, message: 'Could not reach the screening service. Check the connection and retry.' };
    const detail = (error.response.data as { detail?: unknown } | undefined)?.detail;
    if (status && status >= 400 && status < 500)
      return {
        status: 'error',
        elapsedMs,
        message: `The screening service rejected this run (HTTP ${status})${typeof detail === 'string' && detail.length < 200 ? `: ${detail}` : '.'}`,
      };
    return { status: 'error', elapsedMs, message: `The screening service failed to run this screen (HTTP ${status ?? 'error'}). Retry, or narrow the scope.` };
  }
  return { status: 'error', elapsedMs, message: 'The run failed unexpectedly. Retry, and report it if it keeps happening.' };
}

export const isAbort = (error: unknown) =>
  axios.isCancel(error) || (error instanceof DOMException && error.name === 'AbortError');
