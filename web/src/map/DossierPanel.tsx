import { useEffect, useState, type ReactNode } from 'react';
import { dataSource, type Dossier } from './mapDataSource';

type State = { status: 'loading' | 'empty' | 'error' } | { status: 'ready'; dossier: Dossier };

const WEAK_CLUSTER_BELOW = 0.85;
const LOW_SAMPLE_BELOW = 5;

const badge = 'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap';
const button =
  'inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-line bg-white px-3 py-1.5 text-[13px] font-medium disabled:cursor-not-allowed disabled:opacity-50';

const ha = (value: number | null) => (value === null ? '—' : `${value.toFixed(2)} ha`);
const inr = (value: number | null) => (value === null ? '—' : `₹${value.toLocaleString('en-IN')}`);

const TIERS = {
  A: { label: 'Tier A · surveyed', style: 'bg-forest-soft text-forest' },
  B: { label: 'Tier B · approximate', style: 'bg-warn-soft text-warn' },
  C: { label: 'Tier C · not drawn', style: 'bg-rule text-muted' },
};

const SEVERITY = { Low: 'bg-forest-soft text-forest', Medium: 'bg-warn-soft text-warn', High: 'bg-[#F7DADA] text-risk' };

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <details open className="group border-b border-rule px-5 py-3">
      <summary className="flex cursor-pointer list-none items-center justify-between text-xs font-semibold tracking-[0.04em] text-muted uppercase [&::-webkit-details-marker]:hidden">
        {title}
        <span className="text-sm transition-transform group-open:rotate-90">›</span>
      </summary>
      <div className="mt-1.5 flex flex-col gap-1.5 text-[13.5px]">{children}</div>
    </details>
  );
}

function Pair({ label, value }: { label: string; value: string | number | null }) {
  return (
    <span>
      <span className="text-[13px] text-muted">{label}</span>{' '}
      <span className="font-plex-mono text-[13px]">{value ?? '—'}</span>
    </span>
  );
}

function Message({ children }: { children: ReactNode }) {
  return <p className="px-5 py-6 text-sm text-muted">{children}</p>;
}

function Sections({ d }: { d: Dossier }) {
  const areasDiffer =
    d.areaRecordedHa && d.areaGeometryHa && Math.abs(d.areaRecordedHa - d.areaGeometryHa) / d.areaRecordedHa > 0.1;
  const ownerExtras = [
    d.coOwnerCount !== null && `${d.coOwnerCount} co-owners`,
    d.cultivatorEntries !== null && `${d.cultivatorEntries} cultivator entries`,
  ].filter(Boolean);

  return (
    <>
      <Section title="1 · Identity">
        <div className="flex flex-wrap items-center gap-4">
          <Pair label="Recorded" value={ha(d.areaRecordedHa)} />
          <Pair label="Geometry" value={ha(d.areaGeometryHa)} />
          {areasDiffer && <span className={`${badge} bg-warn-soft text-warn`}>Areas differ by over 10%</span>}
        </div>
      </Section>
      <Section title="2 · Ownership">
        {d.owners.length === 0 && <span className="text-[13px] text-muted">Owner not available</span>}
        {d.owners.map((owner) => (
          <div key={owner.name} className="flex items-center justify-between">
            <span className="font-medium">{owner.name}</span>
            {d.ownerClusterConfidence !== null && (
              <span
                className={`${badge} ${d.ownerClusterConfidence < WEAK_CLUSTER_BELOW ? 'bg-warn-soft text-warn' : 'bg-forest-soft text-forest'}`}
              >
                Cluster {d.ownerClusterConfidence.toFixed(2)}
                {d.ownerClusterConfidence < WEAK_CLUSTER_BELOW && ' · weak match'}
              </span>
            )}
          </div>
        ))}
        {ownerExtras.length > 0 && <span className="text-[13px] text-muted">+ {ownerExtras.join(' · ')}</span>}
      </Section>
      <Section title="3 · History">
        {d.lastDeed ? (
          <>
            <div className="flex items-center gap-2">
              <span className={`${badge} bg-sale-soft text-sale`}>{d.lastDeed.type}</span>
              <span className="text-[13px] text-muted">{d.lastDeed.date}</span>
            </div>
            <div>
              <span className="font-plex-mono text-[13px]">{inr(d.lastDeed.valueInr)}</span>{' '}
              {d.lastDeed.valueUnderstated && (
                <span className="text-xs font-medium text-warn">registered value (understated)</span>
              )}
            </div>
          </>
        ) : (
          <span className="text-[13px] text-muted">No deeds recorded</span>
        )}
        {d.deedCount !== null && (
          <span className="text-[13px] text-muted">
            {d.deedCount} deeds since 2015
            {d.mutationLagFlags ? ` · mutation lag flagged on ${d.mutationLagFlags}` : ''}
          </span>
        )}
      </Section>
      <Section title="4 · Valuation">
        <Pair label="Circle rate" value={d.circleRatePerSqm === null ? null : `${inr(d.circleRatePerSqm)}/sq m`} />
        {d.comparablesCount !== null && (
          <div className="flex items-center gap-2">
            <span className="text-[13px] text-muted">{d.comparablesCount} comparables within 2 km, 18 months</span>
            {d.comparablesCount < LOW_SAMPLE_BELOW && (
              <span className={`${badge} bg-warn-soft text-warn`}>Low sample · n={d.comparablesCount}</span>
            )}
          </div>
        )}
      </Section>
      <Section title="5 · Regulatory">
        <div>
          <Pair label="Zone" value={d.zone} /> · <Pair label="FSI" value={d.fsi} />
        </div>
      </Section>
      <Section title="6 · Risk flags">
        {d.riskFlags.map((flag) => (
          <div key={flag.label} className="flex items-center gap-2">
            <span className={`${badge} ${SEVERITY[flag.severity]}`}>{flag.severity}</span>
            {flag.label}
          </div>
        ))}
        <span className="text-[13px] text-muted">
          {d.riskFlags.length === 0 && d.rcmsCheckedOn
            ? `None found in RCMS as of ${d.rcmsCheckedOn}`
            : d.riskFlags.length === 0 && 'No title checks available'}
        </span>
      </Section>
      <Section title="7 · Owner’s other holdings">
        <span className="text-[13px] text-muted">
          {d.clusterParcelCount === null ? '—' : `${d.clusterParcelCount} parcels in this cluster`}
        </span>
      </Section>
      <Section title="8 · Provenance">
        <span className="text-[13px] text-muted">
          {d.provenance ? `${d.provenance.factCount} facts from ${d.provenance.sourceCount} sources` : '—'}
        </span>
      </Section>
    </>
  );
}

export function DossierPanel({ parcelId, onClose }: { parcelId: string; onClose: () => void }) {
  const [state, setState] = useState<State>({ status: 'loading' });

  useEffect(() => {
    let cancelled = false;
    setState({ status: 'loading' });
    dataSource
      .getParcelDossier(parcelId)
      .then((dossier) => !cancelled && setState(dossier ? { status: 'ready', dossier } : { status: 'empty' }))
      .catch(() => !cancelled && setState({ status: 'error' }));
    return () => {
      cancelled = true;
    };
  }, [parcelId]);

  const dossier = state.status === 'ready' ? state.dossier : null;
  const tier = dossier?.boundaryTier ? TIERS[dossier.boundaryTier] : null;

  return (
    <aside aria-label="Parcel dossier" className="flex h-full w-110 flex-col overflow-hidden border-l border-line bg-white">
      <div className="flex flex-col gap-2.5 border-b border-line px-5 pt-4.5 pb-3.5">
        <div className="flex items-start justify-between">
          <div>
            <div className="text-xs text-muted">
              {dossier ? [dossier.village, dossier.district].filter(Boolean).join(' · ') || 'Location not available' : ' '}
            </div>
            <div className="mt-0.5 font-plex-mono text-2xl font-medium">
              {dossier ? `Khasra ${dossier.khasraNo}` : `Parcel ${parcelId}`}
            </div>
          </div>
          <button
            type="button"
            aria-label="Close dossier"
            onClick={onClose}
            className="size-9 rounded-lg border border-line bg-white text-lg text-muted"
          >
            ×
          </button>
        </div>
        {dossier && (
          <>
            <div className="flex items-center gap-2">
              <span className="text-[13px] text-muted">ULPIN</span>
              <span className="font-plex-mono text-[13px]">{dossier.ulpin ?? '—'}</span>
              {dossier.ulpin && (
                <button
                  type="button"
                  aria-label="Copy ULPIN"
                  onClick={() => navigator.clipboard.writeText(dossier.ulpin!)}
                  className="flex p-0.5 text-muted"
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" aria-hidden="true" className="fill-none stroke-current stroke-[1.7]" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M8 8h12v12H8z M4 16V4h12" />
                  </svg>
                </button>
              )}
              <span className="flex-1" />
              {tier && <span className={`${badge} ${tier.style}`}>{tier.label}</span>}
            </div>
            <div className="flex gap-2">
              <button type="button" disabled title="Watchlist is not available yet" className={button}>
                Watch
              </button>
              <button type="button" disabled title="Full dossier page is not available yet" className={button}>
                Open full page
              </button>
            </div>
          </>
        )}
      </div>
      <div className="flex-1 overflow-y-auto">
        {dossier?.isDevelopmentData && (
          <div className="border-b border-rule bg-warn-soft px-5 py-2 text-xs font-medium text-warn">
            Development fixture · not real land data
          </div>
        )}
        {state.status === 'loading' && <Message>Loading dossier…</Message>}
        {state.status === 'empty' && <Message>No dossier is available for this parcel yet.</Message>}
        {state.status === 'error' && <Message>Could not load the dossier. Try selecting the parcel again.</Message>}
        {dossier && <Sections d={dossier} />}
      </div>
    </aside>
  );
}
