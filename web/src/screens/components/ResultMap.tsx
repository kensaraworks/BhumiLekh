import { Map as MapLibreMap, type GeoJSONSource, type MapGeoJSONFeature } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import '../../map/maplibreWorker';
import { useEffect, useRef } from 'react';
import { defaultView, mapStyle } from '../../map/mapConfig';
import type { BBox, ResultFeatureCollection } from '../types';

export interface ResultMapProps {
  /** Same result set the table shows, as features keyed by properties.row_id. Tier C is never drawn. */
  results: ResultFeatureCollection;
  selectedResultId: string | null;
  hoveredResultId: string | null;
  onSelectResult: (rowId: string) => void;
  onHoverResult: (rowId: string | null) => void;
  /** Reported on every move; the table only uses it when "Only rows in view" is on. */
  onViewChange?: (bbox: BBox, visibleRowIds: Set<string>) => void;
}

const SOURCE = 'results';
const INTERACTIVE = ['res-point', 'res-poly-a-fill', 'res-poly-b-fill', 'res-line'];
const isPoly = ['==', ['geometry-type'], 'Polygon'];
const tierB = ['==', ['get', 'tier'], 'B'];
const state = (key: string, on: unknown, off: unknown) => ['case', ['boolean', ['feature-state', key], false], on, off];

function addHatch(map: MapLibreMap) {
  if (map.hasImage('hatch-b')) return;
  const c = document.createElement('canvas');
  c.width = c.height = 8;
  const ctx = c.getContext('2d');
  if (!ctx) return;
  ctx.fillStyle = '#F3EBCF';
  ctx.fillRect(0, 0, 8, 8);
  ctx.strokeStyle = '#C4AE63';
  ctx.lineWidth = 2;
  ctx.beginPath();
  for (const o of [-8, 0, 8]) {
    ctx.moveTo(o, 8);
    ctx.lineTo(o + 8, 0);
  }
  ctx.stroke();
  map.addImage('hatch-b', ctx.getImageData(0, 0, 8, 8));
}

/** Bounding boxes per row, for "rows in view" and for fitting the first result. */
function featureBoxes(fc: ResultFeatureCollection) {
  const boxes = new Map<string, BBox>();
  const visit = (coords: unknown, box: BBox) => {
    if (Array.isArray(coords) && typeof coords[0] === 'number') {
      const [x, y] = coords as [number, number];
      box[0] = Math.min(box[0], x);
      box[1] = Math.min(box[1], y);
      box[2] = Math.max(box[2], x);
      box[3] = Math.max(box[3], y);
    } else if (Array.isArray(coords)) coords.forEach((c) => visit(c, box));
  };
  for (const f of fc.features) {
    if (f.properties.tier === 'C') continue;
    const box: BBox = [Infinity, Infinity, -Infinity, -Infinity];
    visit(f.geometry.coordinates, box);
    if (Number.isFinite(box[0])) boxes.set(f.properties.row_id, box);
  }
  return boxes;
}

const drawable = (fc: ResultFeatureCollection): ResultFeatureCollection => ({
  type: 'FeatureCollection',
  features: fc.features.filter((f) => f.properties.tier !== 'C'),
});

/**
 * MapLibre rendering of a run's result set. It never queries on its own: it draws what it is given,
 * fits to the results once, and reports clicks/hover back to the shared selection.
 */
export default function ResultMap({ results, selectedResultId, hoveredResultId, onSelectResult, onHoverResult, onViewChange }: ResultMapProps) {
  const container = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const loaded = useRef(false);
  const fitted = useRef(false);
  const boxes = useRef(featureBoxes(results));
  const latest = useRef({ onSelectResult, onHoverResult, onViewChange, results });
  const marked = useRef<{ selected: string | null; hovered: string | null }>({ selected: null, hovered: null });

  useEffect(() => {
    latest.current = { onSelectResult, onHoverResult, onViewChange, results };
  });

  const reportView = () => {
    const map = mapRef.current;
    if (!map) return;
    const b = map.getBounds();
    const bbox: BBox = [b.getWest(), b.getSouth(), b.getEast(), b.getNorth()];
    const ids = new Set<string>();
    for (const [id, f] of boxes.current) if (f[2] >= bbox[0] && f[0] <= bbox[2] && f[3] >= bbox[1] && f[1] <= bbox[3]) ids.add(id);
    latest.current.onViewChange?.(bbox, ids);
  };

  const fit = () => {
    const map = mapRef.current;
    if (!map || fitted.current || boxes.current.size === 0) return;
    const all = [...boxes.current.values()];
    const bounds: BBox = [Math.min(...all.map((b) => b[0])), Math.min(...all.map((b) => b[1])), Math.max(...all.map((b) => b[2])), Math.max(...all.map((b) => b[3]))];
    map.fitBounds([bounds[0], bounds[1], bounds[2], bounds[3]], { padding: { top: 40, right: 64, bottom: 96, left: 40 }, maxZoom: 15, duration: 0 });
    fitted.current = true;
  };

  useEffect(() => {
    if (!container.current) return;
    const map = new MapLibreMap({ container: container.current, style: mapStyle, center: defaultView.center, zoom: 10, attributionControl: { compact: true } });
    mapRef.current = map;

    map.on('load', () => {
      addHatch(map);
      map.addSource(SOURCE, { type: 'geojson', data: drawable(latest.current.results) as never, promoteId: 'row_id' });
      map.addLayer({ id: 'res-poly-a-fill', type: 'fill', source: SOURCE, filter: ['all', isPoly, ['!', tierB]] as never, paint: { 'fill-color': state('selected', '#9CC7BB', '#D5E7E1') as never, 'fill-opacity': 0.75 } });
      map.addLayer({ id: 'res-poly-b-fill', type: 'fill', source: SOURCE, filter: ['all', isPoly, tierB] as never, paint: { 'fill-pattern': 'hatch-b' } });
      map.addLayer({ id: 'res-poly-a-line', type: 'line', source: SOURCE, filter: ['all', isPoly, ['!', tierB]] as never, paint: { 'line-color': '#1E5B53', 'line-width': state('selected', 3, 1.2) as never } });
      map.addLayer({ id: 'res-poly-b-line', type: 'line', source: SOURCE, filter: ['all', isPoly, tierB] as never, paint: { 'line-color': '#8C7424', 'line-width': state('selected', 3, 1.3) as never, 'line-dasharray': [6, 4] } });
      map.addLayer({ id: 'res-line', type: 'line', source: SOURCE, filter: ['==', ['geometry-type'], 'LineString'] as never, paint: { 'line-color': '#3B4A8C', 'line-width': state('selected', 5, 3) as never } });
      map.addLayer({
        id: 'res-point-halo',
        type: 'circle',
        source: SOURCE,
        filter: ['==', ['geometry-type'], 'Point'] as never,
        paint: { 'circle-radius': 15, 'circle-color': '#1E5B53', 'circle-opacity': ['case', ['boolean', ['feature-state', 'selected'], false], 0.22, ['boolean', ['feature-state', 'hover'], false], 0.14, 0] as never },
      });
      map.addLayer({
        id: 'res-point',
        type: 'circle',
        source: SOURCE,
        filter: ['==', ['geometry-type'], 'Point'] as never,
        paint: {
          'circle-radius': ['case', ['boolean', ['feature-state', 'selected'], false], 8, ['boolean', ['feature-state', 'hover'], false], 7, 5.5] as never,
          // Tier B: hollow amber ring = approximate location, never drawn like a surveyed point.
          'circle-color': ['case', tierB, '#FFFFFF', ['boolean', ['feature-state', 'selected'], false], '#1E5B53', '#2F7D6C'] as never,
          'circle-stroke-color': ['case', tierB, '#8C7424', '#FFFFFF'] as never,
          'circle-stroke-width': 2,
        },
      });
      loaded.current = true;
      fit();
      reportView();
    });

    const rowAt = (features: MapGeoJSONFeature[]) => (features[0]?.properties?.row_id as string | undefined) ?? null;
    map.on('click', (e) => {
      const id = rowAt(map.queryRenderedFeatures(e.point, { layers: INTERACTIVE.filter((l) => map.getLayer(l)) }));
      if (id) latest.current.onSelectResult(id);
    });
    map.on('mousemove', (e) => {
      const id = rowAt(map.queryRenderedFeatures(e.point, { layers: INTERACTIVE.filter((l) => map.getLayer(l)) }));
      map.getCanvas().style.cursor = id ? 'pointer' : '';
      if (id !== marked.current.hovered) latest.current.onHoverResult(id);
    });
    map.on('mouseout', () => latest.current.onHoverResult(null));
    map.on('moveend', reportView);

    const ro = new ResizeObserver(() => map.resize());
    ro.observe(container.current);
    return () => {
      ro.disconnect();
      loaded.current = false;
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- the map is created once; props flow through refs.
  }, []);

  // New result set → new data (the map does not fetch anything itself).
  useEffect(() => {
    boxes.current = featureBoxes(results);
    const source = mapRef.current?.getSource(SOURCE) as GeoJSONSource | undefined;
    if (!loaded.current || !source) return;
    source.setData(drawable(results) as never);
    fit();
    reportView();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [results]);

  // Shared selection / hover → feature-state.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !loaded.current) return;
    const set = (id: string | null, key: 'selected' | 'hover', on: boolean) => {
      if (id && boxes.current.has(id)) map.setFeatureState({ source: SOURCE, id }, { [key]: on });
    };
    set(marked.current.selected, 'selected', false);
    set(marked.current.hovered, 'hover', false);
    set(selectedResultId, 'selected', true);
    set(hoveredResultId, 'hover', true);
    // Bring a table selection into view without refitting everything.
    if (selectedResultId && selectedResultId !== marked.current.selected) {
      const box = boxes.current.get(selectedResultId);
      const b = map.getBounds();
      if (box && (box[0] < b.getWest() || box[2] > b.getEast() || box[1] < b.getSouth() || box[3] > b.getNorth()))
        map.easeTo({ center: [(box[0] + box[2]) / 2, (box[1] + box[3]) / 2], duration: 400 });
    }
    marked.current = { selected: selectedResultId, hovered: hoveredResultId };
  }, [selectedResultId, hoveredResultId]);

  return (
    <div className="absolute inset-0">
      <div ref={container} className="h-full w-full" />
      <div className="absolute top-3 right-3 flex flex-col overflow-hidden rounded-lg border border-line bg-white">
        <button type="button" aria-label="Zoom in" onClick={() => mapRef.current?.zoomIn()} className="h-8 w-8 border-0 bg-white text-base hover:bg-paper">
          +
        </button>
        <button type="button" aria-label="Zoom out" onClick={() => mapRef.current?.zoomOut()} className="h-8 w-8 border-0 bg-white text-base shadow-[inset_0_1px_0_#DDD9CF] hover:bg-paper">
          −
        </button>
      </div>
    </div>
  );
}
