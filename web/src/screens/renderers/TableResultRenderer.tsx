import type { RendererProps } from './types';

/** TBL (screener table): the answer is a ranked list; location is not the question, so there is no map. */
export function TableResultRenderer({ tablePane }: RendererProps) {
  return <div className="flex min-h-0 flex-1 flex-col">{tablePane}</div>;
}
