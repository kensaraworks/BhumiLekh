import type { ComponentType } from 'react';
import type { Pattern, RenderSpec } from '../types';
import { BenchmarkResultRenderer } from './BenchmarkResultRenderer';
import { SplitResultRenderer } from './SplitResultRenderer';
import { TableResultRenderer } from './TableResultRenderer';
import type { RendererProps } from './types';
import { UnsupportedPatternRenderer } from './UnsupportedPatternRenderer';

/**
 * Screen definition → render.pattern → template. One switch, no per-query components.
 * Adding a screen means adding JSON; adding a template means adding one entry here.
 */
export const RENDERERS: Record<Pattern, ComponentType<RendererProps>> = {
  HYB: SplitResultRenderer,
  CMP: SplitResultRenderer,
  TBL: TableResultRenderer,
  STAT: BenchmarkResultRenderer,
  DOS: UnsupportedPatternRenderer,
  FLT: UnsupportedPatternRenderer,
  LYR: UnsupportedPatternRenderer,
  WKB: UnsupportedPatternRenderer,
  NET: UnsupportedPatternRenderer,
  MON: UnsupportedPatternRenderer,
  SYS: UnsupportedPatternRenderer,
};

/** Dossier checks run inside the dossier, except in batch mode, which is a table-led split view. */
export function resolveRenderer(render: RenderSpec): ComponentType<RendererProps> {
  if (render.pattern === 'DOS' && render.flags.includes('batchable')) return SplitResultRenderer;
  return RENDERERS[render.pattern];
}

/** Whether the pattern's template shows a map. */
export const hasMapView = (render: RenderSpec) =>
  resolveRenderer(render) === SplitResultRenderer;
