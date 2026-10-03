import { useRef, useState } from 'react';
import type { Map as MapLibreMap } from 'maplibre-gl';
import { DossierPanel } from './DossierPanel';
import { LayerPanel } from './LayerPanel';
import { layerDefs, type LayerId, type LayerState, type LayerStatus } from './mapConfig';
import { startView } from './mapDataSource';
import { MapShell } from './MapShell';
import { MapView } from './MapView';

const chip = 'absolute rounded-lg border border-line bg-white text-[12.5px] text-muted';

function recentQuarters(count: number) {
  const now = new Date();
  let quarter = Math.floor(now.getMonth() / 3);
  let year = now.getFullYear();
  const labels: string[] = [];
  for (let i = 0; i < count; i++) {
    labels.unshift(`Q${quarter + 1} ${String(year).slice(2)}`);
    if (--quarter < 0) {
      quarter = 3;
      year--;
    }
  }
  return labels;
}

const quarters = recentQuarters(8);

export function MapWorkspace() {
  const mapRef = useRef<MapLibreMap | null>(null);
  const [layers, setLayers] = useState(
    () =>
      Object.fromEntries(
        layerDefs.map((d) => [d.id, { on: d.defaultOn, opacity: d.defaultOpacity }]),
      ) as Record<LayerId, LayerState>,
  );
  const [status, setStatus] = useState<Partial<Record<LayerId, LayerStatus>>>({});
  const [zoom, setZoom] = useState(Math.round(startView.zoom));
  const [selectedParcelId, setSelectedParcelId] = useState<string | null>(null);

  const updateLayer = (id: LayerId, patch: Partial<LayerState>) =>
    setLayers((prev) => ({ ...prev, [id]: { ...prev[id], ...patch } }));
  const updateStatus = (id: LayerId, next: LayerStatus) =>
    setStatus((prev) => (prev[id] === next ? prev : { ...prev, [id]: next }));

  return (
    <MapShell>
      <div className="relative min-w-0 flex-1 overflow-hidden">
        <MapView
          layers={layers}
          selectedParcelId={selectedParcelId}
          mapRef={mapRef}
          onSelectParcel={setSelectedParcelId}
          onZoomChange={setZoom}
          onLayerStatus={updateStatus}
        />
        <LayerPanel layers={layers} status={status} onChange={updateLayer} />

        <div className="absolute top-4 right-4 flex items-center gap-2">
          <button
            type="button"
            disabled
            title="Area drawing is not available yet"
            className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-line bg-white px-3 py-1.5 text-[13px] font-medium disabled:cursor-not-allowed disabled:opacity-50"
          >
            Draw area
          </button>
          <div className="flex gap-0.5 rounded-lg border border-line bg-white p-0.75">
            <button type="button" className="rounded-md bg-forest-soft px-2.5 py-1.25 text-[13px] font-medium text-forest">
              Streets
            </button>
            <button
              type="button"
              disabled
              title="No satellite imagery source is configured"
              className="rounded-md px-2.5 py-1.25 text-[13px] text-muted disabled:cursor-not-allowed disabled:opacity-50"
            >
              Satellite
            </button>
          </div>
          <div className="flex flex-col rounded-lg border border-line bg-white">
            <button type="button" aria-label="Zoom in" onClick={() => mapRef.current?.zoomIn()} className="h-8.5 w-9 text-lg">
              +
            </button>
            <button
              type="button"
              aria-label="Zoom out"
              onClick={() => mapRef.current?.zoomOut()}
              className="h-8.5 w-9 border-t border-line text-lg"
            >
              −
            </button>
          </div>
        </div>

        <div className={`${chip} bottom-22 left-4 px-2.5 py-1.5`}>
          <span className="font-plex-mono">z{zoom}</span> · parcel polygons and khasra labels · metric cells show below z15
        </div>

        <div className="absolute right-4 bottom-4 left-4 flex h-15 items-center gap-4 rounded-xl border border-line bg-white px-4 py-2">
          <button
            type="button"
            disabled
            aria-label="Play quarters"
            title="Waiting for temporal tile data"
            className="size-9 rounded-full border border-line text-xs disabled:cursor-not-allowed disabled:opacity-50"
          >
            ▶
          </button>
          <div className="flex flex-1 flex-col gap-1.5">
            <input
              type="range"
              aria-label="Quarter"
              min={0}
              max={quarters.length - 1}
              defaultValue={quarters.length - 1}
              disabled
              title="Waiting for temporal tile data"
              className="w-full accent-forest disabled:cursor-not-allowed"
            />
            <div className="flex justify-between text-[11.5px] text-muted">
              {quarters.map((q, i) => (
                <span key={q} className={i === quarters.length - 1 ? 'font-semibold text-forest' : undefined}>
                  {q}
                </span>
              ))}
            </div>
          </div>
          <span className="w-32.5 text-xs text-muted">Temporal layers · quarterly</span>
        </div>
      </div>

      <div
        className={`shrink-0 overflow-hidden transition-[width] duration-200 ${selectedParcelId ? 'w-110' : 'w-0'}`}
      >
        {selectedParcelId && <DossierPanel parcelId={selectedParcelId} onClose={() => setSelectedParcelId(null)} />}
      </div>
    </MapShell>
  );
}
