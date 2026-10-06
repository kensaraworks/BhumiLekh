import { AlertTriangle } from 'lucide-react';
import type { CheckValue } from '../types';
import { checkText, isLowSample, isWeakCluster, LOW_SAMPLE_BELOW, TIER_META, WEAK_CLUSTER_BELOW, type Tier } from '../trust';
import { pill } from './ui';

/** Merge confidence; amber with a warning below 0.85 (PRD §7). */
export function ConfidenceBadge({ value, compact = false }: { value: number; compact?: boolean }) {
  if (isWeakCluster(value))
    return (
      <span className={`${pill} bg-warn-soft text-warn`} title={`Rests on an entity merge below ${WEAK_CLUSTER_BELOW}. Verify before acting.`}>
        <AlertTriangle size={12} aria-hidden="true" />
        {compact ? `Weak ${value.toFixed(2)}` : `Cluster ${value.toFixed(2)} · weak match`}
      </span>
    );
  return <span className={`${pill} bg-forest-soft text-forest`}>Cluster {value.toFixed(2)}</span>;
}

/** Low-confidence mark for metrics with sample n below 5. */
export function LowSampleMark({ n }: { n?: number }) {
  return (
    <span
      className="inline-flex items-center rounded border border-dashed border-warn px-1 text-[10.5px] leading-4 font-medium text-warn"
      title={`Low confidence: fewer than ${LOW_SAMPLE_BELOW} samples${n !== undefined ? ` (n = ${n})` : ''}`}
    >
      n&lt;{LOW_SAMPLE_BELOW}
    </span>
  );
}

export function SampleCell({ n }: { n: number }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="font-plex-mono">{n}</span>
      {isLowSample(n) && <LowSampleMark n={n} />}
    </span>
  );
}

const TIER_STYLE = {
  ok: 'bg-forest-soft text-forest',
  warn: 'border border-dashed border-[#C4AE63] bg-[#F7F0DA] text-[#6E5A16]',
  muted: 'bg-rule text-muted',
};

export function TierBadge({ tier }: { tier: Tier }) {
  const meta = TIER_META[tier];
  return (
    <span className={`${pill} ${TIER_STYLE[meta.tone]}`} title={meta.label}>
      {meta.short}
    </span>
  );
}

/** Dossier-check result. "None found in {source} as of {date}", never "no litigation". */
export function CheckCell({ check }: { check: CheckValue }) {
  if (check.status === 'fired')
    return (
      <span className="inline-flex items-center gap-1 font-medium text-risk" title={checkText(check)}>
        <AlertTriangle size={13} aria-hidden="true" />
        Fired{check.severity ? ` · ${check.severity}` : ''}
      </span>
    );
  return (
    <span className={`text-[12.5px] ${check.status === 'none_found' ? 'text-muted' : 'text-muted italic'}`} title={checkText(check)}>
      {checkText(check)}
    </span>
  );
}
