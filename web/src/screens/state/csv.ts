import { columnHeader, formatValue } from '../format';
import type { ColumnDef, Condition, Row } from '../types';

const cell = (v: string) => (/[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);

/** Client-side CSV of exactly the rows on screen, with trust qualifiers kept in the text. */
export function rowsToCsv(columns: ColumnDef[], rows: Row[], conditions: Condition[] = []): string {
  const header = ['id', ...columns.map((c) => columnHeader(c.label, c.type)), ...conditions.map((c) => c.label), 'confidence_note'];
  const lines = rows.map((row) => [
    row.id,
    ...columns.map((c) => {
      const v = row.values[c.key];
      return v === null || v === undefined ? '' : formatValue(c.type, v);
    }),
    ...conditions.map((c) => (row.pass?.[c.key] === undefined ? '' : row.pass[c.key] ? 'pass' : 'fail')),
    [
      typeof row.conf === 'number' && row.conf < 0.85 ? `weak cluster ${row.conf.toFixed(2)}` : '',
      row.flags?.includes('low_sample') ? 'low sample (n<5)' : '',
      row.flags?.includes('tier_b') ? 'approximate location (tier B)' : '',
    ]
      .filter(Boolean)
      .join('; '),
  ]);
  return [header, ...lines].map((l) => l.map((v) => cell(String(v))).join(',')).join('\n');
}

export function downloadCsv(filename: string, csv: string) {
  const blob = new Blob(['﻿', csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
