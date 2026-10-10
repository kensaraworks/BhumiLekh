# WebGIS village parcels → static map data

`build_map_data.py` turns the saved MP WebGIS 2.0 responses in the data team's `mapUI` package into the files the
landing map loads (`web/public/data/webgis/`). Standard library only; the source package is never modified.

```sh
python ingest/webgis/build_map_data.py "C:\Users\<you>\Downloads\mapUI\mapUI"
```

| Output | Contents |
|---|---|
| `parcels.geojson` | 6,170 polygons (S survey, B block, P plot) + one point-on-surface per polygon; Tier A |
| `villages.geojson` | 5 villages: parcel-coverage outline (union of S+B) + label point |
| `manifest.json` | bounds, per-village counts, validation report, fetch times |

The web app uses this data when `VITE_MAP_DATA_SOURCE=webgis`, or by default while `VITE_TILES_BASE_URL` is unset.
Parcels are only downloaded once the map reaches z15 (PRD zoom rule). Re-run the script when the raw files change.
The production path is still PostGIS + `ST_AsMVT` tiles through `apiDataSource`.
