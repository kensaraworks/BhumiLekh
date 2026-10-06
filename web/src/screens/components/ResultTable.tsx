import { ArrowDown, ArrowUp, Check, ChevronRight, X } from 'lucide-react';
import { memo, useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { columnHeader, formatValue, NUMERIC_TYPES } from '../format';
import { rowIsLowSample, rowIsWeak, rowTier } from '../trust';
import type { CheckValue, ColumnDef, Condition, Row, SortSpec } from '../types';
import { CheckCell, ConfidenceBadge, LowSampleMark, SampleCell, TierBadge } from './TrustBadges';

const ROW_H = 38;
const VIRTUALIZE_ABOVE = 100;
const OVERSCAN = 12;

interface Props {
  columns: ColumnDef[];
  conditions?: Condition[];
  rows: Row[];
  sort: SortSpec | null;
  onSort: (key: string) => void;
  selectedId: string | null;
  hoveredId: string | null;
  onSelect: (id: string) => void;
  onHover: (id: string | null) => void;
  onOpen: (id: string) => void;
  drillLabel: string;
  /** Skeleton rows: first load of a run. */
  loading: boolean;
  /** Previous result shown under a loading re-run. */
  dimmed: boolean;
  /** Rendered in the body when there are no rows (state panel). */
  empty: ReactNode;
  label: string;
}

const isNumeric = (c: ColumnDef) => NUMERIC_TYPES.includes(c.type) && c.type !== 'confidence';

function Cell({ col, row, firstEntity }: { col: ColumnDef; row: Row; firstEntity: boolean }) {
  const v = row.values[col.key];
  switch (col.type) {
    case 'confidence':
      return typeof v === 'number' ? <ConfidenceBadge value={v} /> : <span className="text-muted">—</span>;
    case 'tier': {
      const t = rowTier(row);
      return t ? <TierBadge tier={t} /> : <span className="text-muted">—</span>;
    }
    case 'sample_n':
      return typeof v === 'number' ? <SampleCell n={v} /> : <span className="text-muted">—</span>;
    case 'check':
      return v && typeof v === 'object' ? <CheckCell check={v as CheckValue} /> : <span className="text-muted">—</span>;
    case 'entity':
      return (
        <span className="inline-flex items-center gap-2">
          <span className="font-medium">{formatValue(col.type, v)}</span>
          {/* Rows resting on a weak merge carry the badge even when the screen has no confidence column. */}
          {firstEntity && rowIsWeak(row) && typeof row.conf === 'number' && <ConfidenceBadge value={row.conf} compact />}
        </span>
      );
    default:
      return (
        <span className={`inline-flex items-center gap-1.5 ${isNumeric(col) ? 'font-plex-mono' : ''}`}>
          {formatValue(col.type, v)}
          {col.metric && rowIsLowSample(row) && <LowSampleMark />}
        </span>
      );
  }
}

interface RowProps {
  row: Row;
  index: number;
  columns: ColumnDef[];
  conditions: Condition[];
  firstEntityKey: string | undefined;
  selected: boolean;
  hovered: boolean;
  drillLabel: string;
  onSelect: (id: string) => void;
  onHover: (id: string | null) => void;
  onOpen: (id: string) => void;
}

const ResultRow = memo(function ResultRow({ row, index, columns, conditions, firstEntityKey, selected, hovered, drillLabel, onSelect, onHover, onOpen }: RowProps) {
  return (
    <tr
      aria-selected={selected}
      data-row-id={row.id}
      onClick={() => onSelect(row.id)}
      onDoubleClick={() => onOpen(row.id)}
      onMouseEnter={() => onHover(row.id)}
      onMouseLeave={() => onHover(null)}
      className={`group cursor-pointer ${selected ? 'bg-[#EEF5F2]' : hovered ? 'bg-[#F7F6F1]' : 'bg-white'}`}
      style={{ height: ROW_H }}
    >
      <td className={`sticky left-0 z-[1] border-b border-rule pr-2 pl-3 text-right font-plex-mono text-[11.5px] text-muted ${selected ? 'bg-[#EEF5F2] shadow-[inset_3px_0_0_#1E5B53]' : hovered ? 'bg-[#F7F6F1]' : 'bg-white'}`}>
        {index + 1}
      </td>
      {columns.map((c) => (
        <td key={c.key} className={`border-b border-rule px-3 whitespace-nowrap ${isNumeric(c) ? 'text-right' : ''}`}>
          <Cell col={c} row={row} firstEntity={c.key === firstEntityKey} />
        </td>
      ))}
      {conditions.map((c) => {
        const passed = row.pass?.[c.key];
        return (
          <td key={c.key} className="border-b border-rule px-2 text-center">
            {passed === undefined ? (
              <span className="text-muted">—</span>
            ) : passed ? (
              <Check size={14} className="inline text-forest" aria-label="passes" />
            ) : (
              <X size={14} className="inline text-warn" aria-label="fails" />
            )}
          </td>
        );
      })}
      <td className="border-b border-rule pr-2 text-right">
        <button
          type="button"
          aria-label={`Open ${drillLabel}`}
          title={`Open ${drillLabel}`}
          onClick={(e) => {
            e.stopPropagation();
            onOpen(row.id);
          }}
          className={`inline-flex size-6 items-center justify-center rounded-md border-0 bg-transparent text-muted hover:bg-paper hover:text-ink ${selected || hovered ? 'visible' : 'invisible group-hover:visible'}`}
        >
          <ChevronRight size={15} />
        </button>
      </td>
    </tr>
  );
});

/**
 * Generic result table: columns come from the screen's render block, never from this component.
 * Sticky header, horizontal scroll, windowed rendering above 100 rows.
 */
export const ResultTable = memo(function ResultTable(p: Props) {
  const scroller = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [viewportH, setViewportH] = useState(600);
  const conditions = p.conditions ?? [];
  const firstEntityKey = p.columns.find((c) => c.type === 'entity')?.key;
  const hasConfidenceColumn = p.columns.some((c) => c.type === 'confidence');
  const virtual = p.rows.length > VIRTUALIZE_ABOVE;

  useLayoutEffect(() => {
    const el = scroller.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setViewportH(el.clientHeight));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const raf = useRef(0);
  const onScroll = useCallback(() => {
    cancelAnimationFrame(raf.current);
    raf.current = requestAnimationFrame(() => setScrollTop(scroller.current?.scrollTop ?? 0));
  }, []);

  // Selection made on the map scrolls its row into view.
  useEffect(() => {
    const el = scroller.current;
    if (!el || !p.selectedId) return;
    const index = p.rows.findIndex((r) => r.id === p.selectedId);
    if (index < 0) return;
    const top = index * ROW_H;
    const headerH = 36;
    if (top < el.scrollTop || top + ROW_H > el.scrollTop + el.clientHeight - headerH) el.scrollTo({ top: Math.max(0, top - el.clientHeight / 2), behavior: 'smooth' });
  }, [p.selectedId, p.rows]);

  const start = virtual ? Math.max(0, Math.floor(scrollTop / ROW_H) - OVERSCAN) : 0;
  const end = virtual ? Math.min(p.rows.length, Math.ceil((scrollTop + viewportH) / ROW_H) + OVERSCAN) : p.rows.length;
  const visible = p.rows.slice(start, end);
  const colCount = p.columns.length + conditions.length + 2;

  return (
    <div ref={scroller} onScroll={onScroll} className="relative min-h-0 flex-1 overflow-auto rounded-xl border border-line bg-white">
      <table aria-label={p.label} aria-rowcount={p.rows.length} className={`w-full border-separate border-spacing-0 text-[13px] transition-opacity ${p.dimmed ? 'opacity-55' : ''}`}>
        <thead className="sticky top-0 z-[2]">
          <tr className="h-9">
            <th scope="col" className="sticky left-0 z-[3] w-10 border-b border-line bg-[#FAF9F5] pr-2 pl-3 text-right text-xs font-semibold text-muted">
              #
            </th>
            {p.columns.map((c) => {
              const active = p.sort?.key === c.key;
              const label = columnHeader(c.label, c.type);
              return (
                <th
                  key={c.key}
                  scope="col"
                  aria-sort={active ? (p.sort!.dir === 'asc' ? 'ascending' : 'descending') : undefined}
                  className={`border-b border-line bg-[#FAF9F5] px-3 text-xs font-semibold whitespace-nowrap text-muted ${isNumeric(c) ? 'text-right' : 'text-left'}`}
                >
                  {c.sortable !== false && p.rows.length > 1 ? (
                    <button type="button" onClick={() => p.onSort(c.key)} className={`inline-flex items-center gap-1 border-0 bg-transparent p-0 font-semibold ${active ? 'text-ink' : 'text-muted hover:text-ink'}`}>
                      {label}
                      {active && (p.sort!.dir === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />)}
                    </button>
                  ) : (
                    label
                  )}
                </th>
              );
            })}
            {/* Numbered to match the funnel strip; the full condition is in the tooltip and for screen readers. */}
            {conditions.map((c, i) => (
              <th key={c.key} scope="col" title={c.label} className="w-9 border-b border-line bg-[#FAF9F5] px-2 text-center font-plex-mono text-xs font-semibold text-muted">
                <span aria-hidden="true">{i + 1}</span>
                <span className="sr-only">{c.label}</span>
              </th>
            ))}
            <th scope="col" className="w-9 border-b border-line bg-[#FAF9F5]">
              <span className="sr-only">Open</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {p.loading && p.rows.length === 0 ? (
            Array.from({ length: 7 }, (_, i) => (
              <tr key={i} style={{ height: ROW_H }}>
                <td className="border-b border-rule" />
                {Array.from({ length: colCount - 1 }, (_, j) => (
                  <td key={j} className="border-b border-rule px-3">
                    <span className="block h-2.5 animate-pulse rounded bg-rule" style={{ width: `${40 + ((i * 7 + j * 13) % 45)}%` }} />
                  </td>
                ))}
              </tr>
            ))
          ) : p.rows.length === 0 ? (
            <tr>
              <td colSpan={colCount}>{p.empty}</td>
            </tr>
          ) : (
            <>
              {start > 0 && <tr aria-hidden="true" style={{ height: start * ROW_H }} />}
              {visible.map((row, i) => (
                <ResultRow
                  key={row.id}
                  row={row}
                  index={start + i}
                  columns={p.columns}
                  conditions={conditions}
                  firstEntityKey={hasConfidenceColumn ? undefined : firstEntityKey}
                  selected={row.id === p.selectedId}
                  hovered={row.id === p.hoveredId}
                  drillLabel={p.drillLabel}
                  onSelect={p.onSelect}
                  onHover={p.onHover}
                  onOpen={p.onOpen}
                />
              ))}
              {end < p.rows.length && <tr aria-hidden="true" style={{ height: (p.rows.length - end) * ROW_H }} />}
            </>
          )}
        </tbody>
      </table>
    </div>
  );
});
