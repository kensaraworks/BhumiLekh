import type { RunOutcome } from '../types';

/**
 * Everything the results column can be showing. The four "no rows" states stay distinct:
 * empty ≠ no_data ≠ not_connected ≠ error.
 */
export type ResultViewKind = 'initial' | 'loading' | 'locked' | 'results' | 'empty' | 'no_data' | 'not_connected' | 'error';

export interface ResultView {
  kind: ResultViewKind;
  /** The outcome whose rows are on screen (may be the previous run while a re-run loads or after an error). */
  shown?: RunOutcome;
  /** Set when a run failed but the previous result is kept on screen. */
  errorOverlay?: string;
  /** A re-run is loading over the previous result. */
  refreshing?: boolean;
}
