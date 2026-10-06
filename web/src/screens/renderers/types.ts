import type { ReactNode } from 'react';
import type { ResultView } from '../components/resultView';
import type { NarrowView } from '../state/useRunnerUrlState';
import type { RunResponse, ScreenDefinition } from '../types';

/** What every pattern template receives. Panes are pre-built so templates only decide arrangement and extras. */
export interface RendererProps {
  screen: ScreenDefinition;
  view: ResultView;
  response: RunResponse | null;
  tablePane: ReactNode;
  mapPane: ReactNode;
  narrowView: NarrowView;
  onNarrowView: (view: NarrowView) => void;
  nearMiss: boolean;
  onNearMiss: (on: boolean) => void;
  /** One-line description of the current state, for panes that cannot show the full state panel. */
  stateText: string;
}
