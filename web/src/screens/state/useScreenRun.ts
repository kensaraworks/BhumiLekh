import { useQuery } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { screenService } from '../service/screenService';
import type { RunOutcome, RunRequest } from '../types';

/** Edits re-run after this pause, once the screen has been run (playbook: 600 ms). */
export const RERUN_DEBOUNCE_MS = 600;

const keyOf = (r: RunRequest | null) => (r ? JSON.stringify(r) : '');

/**
 * One cache key per run: [screen, scope, params, …] (playbook). The table and the map both read
 * this one result; neither re-queries on its own. Nothing runs until the user presses Run screen
 * (or opens a URL that was already run); afterwards, valid edits re-run after a 600 ms pause.
 */
export function useScreenRun(request: RunRequest | null, opts: { canRun: boolean; autoRunOnMount: boolean; onRan: () => void }) {
  const [committed, setCommitted] = useState<RunRequest | null>(null);
  const requestKey = keyOf(request);
  const committedKey = keyOf(committed);
  const { canRun, onRan } = opts;

  const query = useQuery({
    queryKey: ['screen-run', committed],
    queryFn: ({ signal }) => screenService.runScreen(committed!, signal),
    enabled: committed !== null,
    retry: false,
    staleTime: 5 * 60_000,
    refetchOnWindowFocus: false,
    // Keep the previous result of the same screen on screen (dimmed) while a re-run loads.
    placeholderData: (previous, previousQuery) =>
      (previousQuery?.queryKey[1] as RunRequest | null)?.screen_id === committed?.screen_id ? previous : undefined,
  });

  const { refetch } = query;
  const run = useCallback(() => {
    if (!canRun || !request) return;
    if (keyOf(request) === committedKey) void refetch();
    else setCommitted(request);
    onRan();
  }, [canRun, request, committedKey, refetch, onRan]);

  // A link or refresh that was already run (run=1) restores the result.
  const autoRan = useRef(false);
  useEffect(() => {
    if (autoRan.current || !opts.autoRunOnMount || !canRun || !request) return;
    autoRan.current = true;
    setCommitted(request);
  }, [opts.autoRunOnMount, canRun, request]);

  // After the first run, edits re-run on a debounce instead of on every keystroke.
  const pending = committed !== null && requestKey !== committedKey;
  useEffect(() => {
    if (!pending || !canRun || !request) return;
    const timer = window.setTimeout(() => setCommitted(request), RERUN_DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [pending, canRun, request, requestKey]);

  // The last non-error outcome, so an error can be shown above the previous result instead of wiping it.
  const lastGood = useRef<RunOutcome | null>(null);
  const outcome = query.data;
  if (outcome && outcome.status !== 'error' && !query.isPlaceholderData) lastGood.current = outcome;

  return useMemo(
    () => ({
      hasCommitted: committed !== null,
      outcome,
      lastGood: lastGood.current,
      isFetching: query.isFetching,
      isPlaceholder: query.isPlaceholderData,
      pending,
      run,
      retry: () => void refetch(),
    }),
    [committed, outcome, query.isFetching, query.isPlaceholderData, pending, run, refetch],
  );
}
