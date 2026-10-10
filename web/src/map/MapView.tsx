import { useEffect, useRef, useState, type RefObject } from 'react';
import { Map as MapLibreMap, type GeoJSONSource, type GeoJSONSourceSpecification, type LayerSpecification } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import {
  drawOrder,
  layerDefs,
  mapStyle,
  PARCEL_B_FILL,
  PARCEL_CLICK_LAYERS,
  PARCEL_ID_PROPERTY,
  PARCEL_SELECTED,
  zoomLimits,
  type LayerDef,
  type LayerId,
  type LayerState,
  type LayerStatus,
} from './mapConfig';
import { dataSource, startView } from './mapDataSource';

const OPACITY_PROPS = {
  fill: ['fill-opacity'],
  line: ['line-opacity'],
  circle: ['circle-opacity', 'circle-stroke-opacity'],
  symbol: ['text-opacity'],
} as const;

const orderedDefs = drawOrder.map((id) => layerDefs.find((d) => d.id === id)!);

function addHatchImage(map: MapLibreMap) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 8;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  ctx.fillStyle = '#F3EBCF';
  ctx.fillRect(0, 0, 8, 8);
  ctx.strokeStyle = '#C4AE63';
  ctx.lineWidth = 2;
  ctx.beginPath();
  for (const offset of [-8, 0, 8]) {
    ctx.moveTo(offset, 8);
    ctx.lineTo(offset + 8, 0);
  }
  ctx.stroke();
  map.addImage('hatch-b', ctx.getImageData(0, 0, 8, 8));
}

function applyLayerState(map: MapLibreMap, layers: Record<LayerId, LayerState>) {
  for (const def of layerDefs) {
    if (!map.getSource(def.id)) continue;
    const { on, opacity } = layers[def.id];
    for (const layer of def.styleLayers) {
      map.setLayoutProperty(layer.id, 'visibility', on ? 'visible' : 'none');
      for (const prop of OPACITY_PROPS[layer.type]) map.setPaintProperty(layer.id, prop, opacity);
    }
  }
}

const existing = (map: MapLibreMap, ids: string[]) => ids.filter((id) => map.getLayer(id));

/** Lowest zoom at which any of the layer's style layers draws. */
const drawsFrom = (def: LayerDef) => Math.min(...def.styleLayers.map((l) => l.minzoom ?? 0));

const EMPTY: GeoJSONSourceSpecification['data'] = { type: 'FeatureCollection', features: [] };
const FIT_PADDING = { top: 70, bottom: 110, left: 330, right: 70 }; // clear of the layer panel and timeline

interface Props {
  layers: Record<LayerId, LayerState>;
  selectedParcelId: string | null;
  mapRef: RefObject<MapLibreMap | null>;
  onSelectParcel: (parcelId: string) => void;
  onZoomChange: (zoom: number) => void;
  onLayerStatus: (id: LayerId, status: LayerStatus) => void;
}

export function MapView({ layers, selectedParcelId, mapRef, onSelectParcel, onZoomChange, onLayerStatus }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const loadedRef = useRef(false);
  const latest = useRef({ layers, onSelectParcel, onZoomChange, onLayerStatus });
  const [hover, setHover] = useState<{ x: number; y: number; khasra: string } | null>(null);

  useEffect(() => {
    latest.current = { layers, onSelectParcel, onZoomChange, onLayerStatus };
  });

  useEffect(() => {
    if (!containerRef.current) return;
    const map = new MapLibreMap({
      container: containerRef.current,
      style: mapStyle,
      center: startView.center,
      zoom: startView.zoom,
      ...zoomLimits,
      transformRequest: dataSource.transformRequest,
    });
    mapRef.current = map;
    const failed = new Set<string>();
    // GeoJSON layers whose data is fetched only once the map reaches a zoom (PRD: no parcel geometry below z15)
    const deferred = new Map<LayerId, { data: GeoJSONSourceSpecification['data']; zoom: number }>();

    const loadDeferred = () => {
      for (const [id, pending] of deferred) {
        if (map.getZoom() < pending.zoom) continue;
        deferred.delete(id);
        (map.getSource(id) as GeoJSONSource).setData(pending.data);
        latest.current.onLayerStatus(id, 'loading');
      }
    };

    dataSource
      .loadInitialBounds?.()
      .then((bounds) => {
        if (bounds && mapRef.current === map) map.fitBounds(bounds, { padding: FIT_PADDING, duration: 0 });
      })
      .catch((error) => console.error('Could not load the data bounds; keeping the default view.', error));

    map.on('load', () => {
      addHatchImage(map);
      for (const def of orderedDefs) {
        const spec = dataSource.getLayerSource(def);
        if (!spec) {
          latest.current.onLayerStatus(def.id, 'unavailable');
          continue;
        }
        const deferZoom = spec.type === 'geojson' ? dataSource.deferUntilZoom?.(def) : undefined;
        if (spec.type === 'geojson' && deferZoom !== undefined) {
          deferred.set(def.id, { data: spec.data, zoom: deferZoom });
          map.addSource(def.id, { ...spec, data: EMPTY });
        } else {
          map.addSource(def.id, spec);
        }
        for (const layer of def.styleLayers) {
          const sourceLayer = spec.type === 'vector' ? { 'source-layer': def.tilePath } : {};
          map.addLayer({ ...layer, source: def.id, ...sourceLayer } as unknown as LayerSpecification);
        }
        latest.current.onLayerStatus(def.id, deferred.has(def.id) ? 'zoomIn' : 'loading');
      }
      applyLayerState(map, latest.current.layers);
      loadDeferred();
      loadedRef.current = true;
      latest.current.onZoomChange(Math.round(map.getZoom()));
    });

    map.on('error', (event) => {
      const { sourceId, error } = event as unknown as { sourceId?: string; error?: Error };
      const def = layerDefs.find((d) => d.id === sourceId);
      if (!def) return;
      console.error(`Map layer "${def.id}" failed to load`, error);
      failed.add(def.id);
      latest.current.onLayerStatus(def.id, 'error');
    });

    map.on('idle', () => {
      for (const def of layerDefs) {
        if (!map.getSource(def.id) || failed.has(def.id) || !latest.current.layers[def.id].on) continue;
        if (deferred.has(def.id) || map.getZoom() < drawsFrom(def)) {
          latest.current.onLayerStatus(def.id, 'zoomIn');
          continue;
        }
        const ids = def.styleLayers.map((l) => l.id);
        const hasFeatures = map.queryRenderedFeatures({ layers: ids }).length > 0;
        latest.current.onLayerStatus(def.id, hasFeatures ? 'ready' : 'empty');
      }
    });

    map.on('zoom', () => latest.current.onZoomChange(Math.round(map.getZoom())));
    map.on('zoomend', loadDeferred);

    map.on('click', (event) => {
      const feature = map.queryRenderedFeatures(event.point, { layers: existing(map, PARCEL_CLICK_LAYERS) })[0];
      const id = feature?.properties?.[PARCEL_ID_PROPERTY];
      if (id != null) latest.current.onSelectParcel(String(id));
    });

    map.on('mousemove', (event) => {
      const [parcel] = map.queryRenderedFeatures(event.point, { layers: existing(map, PARCEL_CLICK_LAYERS) });
      map.getCanvas().style.cursor = parcel ? 'pointer' : '';
      const [approximate] = map.queryRenderedFeatures(event.point, { layers: existing(map, [PARCEL_B_FILL]) });
      setHover(
        approximate
          ? { x: event.point.x, y: event.point.y, khasra: String(approximate.properties.khasra_no) }
          : null,
      );
    });

    const resizeObserver = new ResizeObserver(() => map.resize());
    resizeObserver.observe(containerRef.current);

    return () => {
      resizeObserver.disconnect();
      loadedRef.current = false;
      map.remove();
      mapRef.current = null;
    };
  }, [mapRef]);

  useEffect(() => {
    if (loadedRef.current && mapRef.current) applyLayerState(mapRef.current, layers);
  }, [layers, mapRef]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !loadedRef.current || !map.getLayer(PARCEL_SELECTED)) return;
    map.setFilter(PARCEL_SELECTED, ['==', ['to-string', ['get', PARCEL_ID_PROPERTY]], selectedParcelId ?? '']);
  }, [selectedParcelId, mapRef]);

  return (
    <div className="absolute inset-0">
      {/* h-full/w-full: maplibre-gl.css sets .maplibregl-map { position: relative } outside any CSS layer, which
          overrides Tailwind's layered `absolute`; without an explicit size the map container collapses to 0 px. */}
      <div ref={containerRef} className="absolute inset-0 h-full w-full" />
      {hover && (
        <div
          className="pointer-events-none absolute w-47.5 rounded-lg bg-ink px-2.5 py-2 text-[12.5px] leading-[1.45] text-white"
          style={{ left: hover.x + 12, top: hover.y + 12 }}
        >
          <div className="font-plex-mono">Khasra {hover.khasra}</div>
          <div className="mt-1 text-[#F3D98B]">Tier B · approximate location. Boundary is not surveyed.</div>
        </div>
      )}
    </div>
  );
}
