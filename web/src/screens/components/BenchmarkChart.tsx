import { BarChart3 } from 'lucide-react';
import { isLowSample, LOW_SAMPLE_BELOW } from '../trust';
import type { SeriesPoint } from '../types';

/**
 * Benchmark (STAT) chart: bars or a line, with n on hover and hatched low-sample points.
 * Only draws what the run returned; with no series it says so instead of drawing an empty axis.
 */
export function BenchmarkChart({ series, kind, metric, stateText }: { series: SeriesPoint[] | null | undefined; kind: 'bars' | 'line' | 'histogram'; metric: string; stateText: string }) {
  if (!series || series.length === 0)
    return (
      <div className="flex h-44 shrink-0 flex-col items-center justify-center gap-1.5 rounded-xl border border-line bg-white text-center">
        <BarChart3 size={18} className="text-muted" aria-hidden="true" />
        <span className="text-[13px] font-medium text-ink">{metric}</span>
        <span className="text-[12.5px] text-muted">{stateText}</span>
      </div>
    );

  const max = Math.max(...series.map((s) => s.y), 0) || 1;
  const W = 640;
  const H = 150;
  const bw = W / series.length;
  return (
    <figure className="flex h-48 shrink-0 flex-col gap-1 rounded-xl border border-line bg-white px-4 pt-3 pb-2">
      <figcaption className="flex justify-between text-xs text-muted">
        <span>{metric}</span>
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-3 border border-dashed border-warn bg-warn-soft" /> n &lt; {LOW_SAMPLE_BELOW}, low confidence
        </span>
      </figcaption>
      <svg viewBox={`0 0 ${W} ${H + 18}`} preserveAspectRatio="none" className="min-h-0 w-full flex-1" role="img" aria-label={metric}>
        {kind === 'line' ? (
          <polyline
            fill="none"
            stroke="#1E5B53"
            strokeWidth={2}
            points={series.map((s, i) => `${i * bw + bw / 2},${H - (s.y / max) * (H - 8)}`).join(' ')}
          />
        ) : null}
        {series.map((s, i) => {
          const h = (s.y / max) * (H - 8);
          const low = isLowSample(s.n);
          return (
            <g key={String(s.x)}>
              <title>{`${s.x}: ${s.y} (n = ${s.n}${low ? ', low confidence' : ''})`}</title>
              {kind === 'line' ? (
                <circle cx={i * bw + bw / 2} cy={H - h} r={3.5} fill={low ? '#FBEBD7' : '#1E5B53'} stroke={low ? '#8A4204' : 'none'} strokeDasharray={low ? '2 2' : undefined} />
              ) : (
                <rect x={i * bw + bw * 0.18} y={H - h} width={bw * 0.64} height={h} fill={low ? '#FBEBD7' : '#2F7D6C'} stroke={low ? '#8A4204' : 'none'} strokeDasharray={low ? '3 2' : undefined} />
              )}
              <text x={i * bw + bw / 2} y={H + 13} textAnchor="middle" fontSize={10} fill="#56605B">
                {String(s.x).slice(0, 12)}
              </text>
            </g>
          );
        })}
      </svg>
    </figure>
  );
}
