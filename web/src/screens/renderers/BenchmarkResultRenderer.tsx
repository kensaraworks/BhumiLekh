import { BenchmarkChart } from '../components/BenchmarkChart';
import type { RendererProps } from './types';

/** STAT (benchmark chart): chart with its small table underneath. */
export function BenchmarkResultRenderer({ screen, response, tablePane, stateText }: RendererProps) {
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <BenchmarkChart series={response?.series} kind={screen.render.chart ?? 'bars'} metric={screen.render.metric} stateText={stateText} />
      <div className="flex min-h-[200px] flex-1 flex-col">{tablePane}</div>
    </div>
  );
}
