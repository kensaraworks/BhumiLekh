// MapLibre GL JS v6 is ESM-only and finds its web worker through `import.meta.url`, which does not resolve inside
// Vite's dependency pre-bundle (node_modules/.vite/deps), so the worker 404s and no source ever loads.
// Per the MapLibre installation guide (Vite), let Vite bundle the worker and register its URL once, before any map
// is created. Works for `vite` dev and `vite build`. Import this module for its side effect.
import { setWorkerUrl } from 'maplibre-gl';
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url';

setWorkerUrl(workerUrl);
