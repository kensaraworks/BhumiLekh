"""
Convert the saved MP WebGIS 2.0 village responses (the data engineering `mapUI` package) into
small static GeoJSON files that the web map loads directly. Standard library only.

    python ingest/webgis/build_map_data.py <path-to-mapUI> [out_dir]

    default out_dir: web/public/data/webgis   (served by Vite as /data/webgis/..., copied into dist/ on build)

Reads (never modifies):
    <mapUI>/data/raw/<loc_id>/010_landbank_S.json, 011_landbank_B.json, 012_landbank_P.json   WFS GeoJSON, EPSG:4326
    <mapUI>/data/raw/<loc_id>/requests.jsonl                                                  fetch time per file
    <mapUI>/data/legends/006_*.json, 007_*.json                                               land type / land use names
    <mapUI>/data/locations/*.json                                                             village names, LGD codes
Writes:
    parcels.geojson   one Polygon per WebGIS polygon + one Point (point on surface) per polygon, same id
    villages.geojson  per village: parcel-coverage outline (MultiLineString) + one label Point
    manifest.json     bounds, counts, validation report, provenance

Checks (same rules as mapUI/load_village.py, plus the PRD's): response complete, CRS EPSG:4326, feature belongs to
the village/type of its file, every coordinate inside the MP bounding box (outside -> rejected, counted), exact
duplicates skipped, self-intersecting rings counted (drawn as received; PostGIS repairs them with ST_MakeValid).

Boundary tier: every polygon here is a digitised cadastral polygon from WebGIS 2.0 (Bhu-Naksha), which is
Tier A under PRD 6.3. The source has no Tier B (village-only position) or Tier C (no geometry) records.
"""
import json
import math
import re
import sys
from collections import Counter
from pathlib import Path

PARCEL_FILES = {"S": "010_landbank_S.json", "B": "011_landbank_B.json", "P": "012_landbank_P.json"}
PARCEL_KIND = {"S": "survey", "B": "block", "P": "plot"}
LEGENDS = {"land_type": "006_legend_vp_villagemap_landtype.json", "landuse": "007_legend_vp_villagemap_landusetype.json"}
MP_BBOX = (74.0, 21.0, 82.9, 26.9)          # lon/lat envelope of Madhya Pradesh (generous)
R = 6371008.8                               # mean Earth radius, m
DP = 7                                      # output decimals (~1 cm)


def legend(path: Path):
    """id -> (title, fill); plus the fallback rule (no filter)."""
    codes, fallback = {}, None
    for layer in json.loads(path.read_text(encoding="utf-8"))["Legend"]:
        for rule in layer["rules"]:
            m = re.search(r"=\s*'([^']*)'", rule.get("filter") or "")
            fill = (((rule.get("symbolizers") or [{}])[0]).get("Polygon") or {}).get("fill")
            if m:
                codes[int(m.group(1))] = (rule["title"], fill)
            else:
                fallback = (rule["title"], fill)
    return codes, fallback


def ring_area_m2(ring):
    """Spherical polygon area (signed) of a lon/lat ring, m2."""
    s = 0.0
    for (x1, y1), (x2, y2) in zip(ring, ring[1:]):
        s += math.radians(x2 - x1) * (2 + math.sin(math.radians(y1)) + math.sin(math.radians(y2)))
    return s * R * R / 2


def polygon_area_m2(rings):
    return abs(ring_area_m2(rings[0])) - sum(abs(ring_area_m2(r)) for r in rings[1:])


def point_on_surface(rings):
    """A point guaranteed inside the polygon: middle of the widest interior span on a horizontal scan line."""
    ys = sorted({y for x, y in rings[0]})
    best = None
    # try the bbox middle first, then midpoints between distinct vertex heights
    mid = (ys[0] + ys[-1]) / 2
    candidates = [mid] + [(a + b) / 2 for a, b in zip(ys, ys[1:])]
    for y in candidates[:40]:
        xs = []
        for ring in rings:
            for (x1, y1), (x2, y2) in zip(ring, ring[1:]):
                if (y1 > y) != (y2 > y):
                    xs.append(x1 + (y - y1) * (x2 - x1) / (y2 - y1))
        xs.sort()
        for a, b in zip(xs[0::2], xs[1::2]):
            if best is None or b - a > best[0]:
                best = (b - a, ((a + b) / 2, y))
        if best and y == mid:
            break
    return best[1]


def segments_cross(p1, p2, p3, p4):
    def orient(a, b, c):
        v = (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0])
        return (v > 0) - (v < 0)
    return orient(p1, p2, p3) * orient(p1, p2, p4) < 0 and orient(p3, p4, p1) * orient(p3, p4, p2) < 0


def self_intersects(ring):
    segs = list(zip(ring, ring[1:]))
    n = len(segs)
    for i in range(n):
        for j in range(i + 2, n):
            if i == 0 and j == n - 1:
                continue
            if segments_cross(*segs[i], *segs[j]):
                return True
    return False


def rnd(pt):
    return [round(pt[0], DP), round(pt[1], DP)]


def outline_lines(polygons, tol=2e-7):
    """Boundary of the union of polygons that tile the village: every edge is first split at any other polygon's
    vertex lying on it (T-junctions, where one neighbour has an extra vertex), then edges used an odd number of
    times are kept and chained into lines. tol ~2 cm. Overlapping (non-tiling) polygons are not dissolved."""
    rings = [[tuple(rnd(p)) for p in ring] for rings_ in polygons for ring in rings_]
    cell = 0.0005
    grid = {}
    for ring in rings:
        for v in ring:
            grid.setdefault((int(v[0] // cell), int(v[1] // cell)), set()).add(v)

    def on_segment(a, b):
        (x1, y1), (x2, y2) = a, b
        dx, dy = x2 - x1, y2 - y1
        length2 = dx * dx + dy * dy
        found = []
        for cx in range(int(min(x1, x2) // cell), int(max(x1, x2) // cell) + 1):
            for cy in range(int(min(y1, y2) // cell), int(max(y1, y2) // cell) + 1):
                for v in grid.get((cx, cy), ()):
                    if v == a or v == b:
                        continue
                    t = ((v[0] - x1) * dx + (v[1] - y1) * dy) / length2
                    if 0 < t < 1 and abs((v[0] - x1) * dy - (v[1] - y1) * dx) / math.sqrt(length2) < tol:
                        found.append((t, v))
        return [v for _, v in sorted(found)]

    count = Counter()
    for ring in rings:
        for a, b in zip(ring, ring[1:]):
            if a == b:
                continue
            pts = [a, *on_segment(a, b), b]
            for p, q in zip(pts, pts[1:]):
                count[(p, q) if p < q else (q, p)] += 1
    edges = {e for e, c in count.items() if c % 2}
    adj = {}
    for a, b in edges:
        adj.setdefault(a, []).append(b)
        adj.setdefault(b, []).append(a)
    used, lines = set(), []
    for a, b in sorted(edges):
        if (a, b) in used:
            continue
        line = [a, b]
        used.add((a, b))
        for end in (1, 0):                 # extend forward, then backward
            while True:
                tip = line[-1] if end else line[0]
                prev = line[-2] if end else line[1]
                nxt = [n for n in adj[tip] if n != prev and ((tip, n) if tip < n else (n, tip)) not in used]
                if len(adj[tip]) != 2 or not nxt:
                    break
                n = nxt[0]
                used.add((tip, n) if tip < n else (n, tip))
                line = line + [n] if end else [n] + line
        lines.append([list(p) for p in line])
    return lines


def main(src: Path, out: Path):
    lt_codes, lt_fallback = legend(src / "data" / "legends" / LEGENDS["land_type"])
    lu_codes, lu_fallback = legend(src / "data" / "legends" / LEGENDS["landuse"])
    names = {}
    for f in sorted((src / "data" / "locations").glob("*.json")):
        for r in json.loads(f.read_text(encoding="utf-8"))["data"]:
            names[r["village_id"]] = r

    parcels, villages, report = [], [], []
    minx = miny = math.inf
    maxx = maxy = -math.inf
    for vdir in sorted(p for p in (src / "data" / "raw").iterdir() if p.is_dir()):
        loc_id = int(vdir.name)
        meta = names.get(loc_id, {})
        vname = (meta.get("village") or str(loc_id)).strip()
        fetched = {}
        if (vdir / "requests.jsonl").exists():
            for line in (vdir / "requests.jsonl").read_text(encoding="utf-8").splitlines():
                r = json.loads(line)
                fetched[r["file"]] = r["at"]
        rep = {"loc_id": loc_id, "village": vname, "name_hi": meta.get("village_ll"), "lgd_code": meta.get("lgd_code"),
               "counts": {}, "duplicates_skipped": 0, "outside_mp_rejected": 0, "self_intersecting": 0,
               "no_parcel_id": 0, "unlinked_land_type": 0, "fetched_at": {f: fetched.get(f) for f in PARCEL_FILES.values()}}
        seen, outline_src, area_sum, wx, wy = set(), [], 0.0, 0.0, 0.0
        vminx = vminy = math.inf
        vmaxx = vmaxy = -math.inf
        for ptype, fname in PARCEL_FILES.items():
            path = vdir / fname
            if not path.exists():
                continue
            fc = json.loads(path.read_text(encoding="utf-8"))
            feats = fc["features"]
            if not (fc.get("totalFeatures") == fc.get("numberReturned") == len(feats)):
                sys.exit(f"{path}: incomplete response ({len(feats)} of {fc.get('totalFeatures')})")
            if feats and ((fc.get("crs") or {}).get("properties") or {}).get("name") != "urn:ogc:def:crs:EPSG::4326":
                sys.exit(f"{path}: unexpected CRS {fc.get('crs')} - refusing to reinterpret it as WGS84")
            n = 0
            for f in feats:
                p, g = f["properties"], f["geometry"]
                if p["loc_id"] != loc_id or p["parcel_type"] != ptype:
                    sys.exit(f"{path}: feature for another village/type: {p}")
                key = json.dumps([p, g], sort_keys=True)
                if key in seen:
                    rep["duplicates_skipped"] += 1
                    continue
                seen.add(key)
                parts = g["coordinates"] if g["type"] == "MultiPolygon" else [g["coordinates"]]
                pts = [pt for poly in parts for ring in poly for pt in ring]
                if not pts or any(not (MP_BBOX[0] <= x <= MP_BBOX[2] and MP_BBOX[1] <= y <= MP_BBOX[3]) for x, y in pts):
                    rep["outside_mp_rejected"] += 1
                    continue
                if any(self_intersects(ring) for poly in parts for ring in poly):
                    rep["self_intersecting"] += 1
                xs, ys = [x for x, _ in pts], [y for _, y in pts]
                vminx, vminy, vmaxx, vmaxy = min(vminx, *xs), min(vminy, *ys), max(vmaxx, *xs), max(vmaxy, *ys)
                area = sum(polygon_area_m2(poly) for poly in parts)
                largest = max(parts, key=polygon_area_m2)
                lt = lt_codes.get(p.get("land_type_id"), lt_fallback)[0]
                lu = None
                if p.get("landuse_id") is not None:
                    lu = lu_codes[p["landuse_id"]][0] if p["landuse_id"] in lu_codes else f"{lu_fallback[0]} (id {p['landuse_id']})"
                rep["no_parcel_id"] += p.get("parcel_id") is None
                rep["unlinked_land_type"] += p.get("land_type_id") not in lt_codes
                n += 1
                fid = f"{loc_id}-{ptype}-{n}"
                props = {
                    "id": fid, "loc_id": loc_id, "parcel_type": ptype, "khasra_no": p["parcel_no"],
                    "parcel_id": p.get("parcel_id"), "ulpin": p.get("ulpin"), "lgd_code": p.get("lgd_code"),
                    "land_type": lt, "landuse": lu, "is_land_bank": p.get("is_land_bank"),
                    "area_ha": round(area / 10000, 4), "boundary_tier": "A",
                }
                # village name and fetch time live once per village in manifest.json (keeps the file small)
                # single-part MultiPolygons become Polygon so ['geometry-type'] filters read 'Polygon'
                geom = ({"type": "Polygon", "coordinates": [[rnd(pt) for pt in ring] for ring in parts[0]]} if len(parts) == 1 else
                        {"type": "MultiPolygon", "coordinates": [[[rnd(pt) for pt in ring] for ring in poly] for poly in parts]})
                parcels.append({"type": "Feature", "properties": props, "geometry": geom})
                c = point_on_surface(largest)
                point_props = {k: props[k] for k in ("id", "khasra_no", "land_type", "boundary_tier")}
                parcels.append({"type": "Feature", "properties": point_props, "geometry": {"type": "Point", "coordinates": rnd(c)}})
                if ptype in ("S", "B"):
                    outline_src.extend(parts)
                    area_sum += area
                    wx += c[0] * area
                    wy += c[1] * area
            rep["counts"][ptype] = n
        report.append(rep)
        if not outline_src:
            rep["note"] = "no polygons on the portal for this village; nothing drawn"
            continue
        minx, miny, maxx, maxy = min(minx, vminx), min(miny, vminy), max(maxx, vmaxx), max(maxy, vmaxy)
        rep["bbox"] = [round(v, 6) for v in (vminx, vminy, vmaxx, vmaxy)]
        rep["area_ha_survey_block"] = round(area_sum / 10000, 1)
        # label: the point-on-surface of a parcel nearest the area-weighted centre (always on the village's land)
        cx, cy = wx / area_sum, wy / area_sum
        label = min((f["geometry"]["coordinates"] for f in parcels
                     if f["geometry"]["type"] == "Point" and f["properties"]["id"].startswith(f"{loc_id}-")),
                    key=lambda q: (q[0] - cx) ** 2 + (q[1] - cy) ** 2)
        vprops = {"loc_id": loc_id, "name": vname, "name_hi": meta.get("village_ll"), "lgd_code": meta.get("lgd_code"),
                  "polygons": sum(rep["counts"].values())}
        villages.append({"type": "Feature", "properties": vprops,
                         "geometry": {"type": "MultiLineString", "coordinates": outline_lines(outline_src)}})
        villages.append({"type": "Feature", "properties": vprops, "geometry": {"type": "Point", "coordinates": label}})

    out.mkdir(parents=True, exist_ok=True)
    dump = lambda obj: json.dumps(obj, ensure_ascii=False, separators=(",", ":"))
    (out / "parcels.geojson").write_text(dump({"type": "FeatureCollection", "features": parcels}), encoding="utf-8")
    (out / "villages.geojson").write_text(dump({"type": "FeatureCollection", "features": villages}), encoding="utf-8")
    manifest = {
        "source": "MP WebGIS 2.0 public WFS tcgis:vp_villagemap_landbank (saved responses, mapUI package)",
        "crs": "EPSG:4326 (lon, lat)",
        "boundary_tier": "A for every polygon: digitised cadastral polygon from WebGIS 2.0 / Bhu-Naksha (PRD 6.3). "
                         "No Tier B or C records exist in this source.",
        "area_method": "spherical approximation, R = 6371008.8 m",
        "outline_method": "boundary of the union of survey (S) and block (B) polygons (shared edges cancelled after splitting at T-junctions); unparcelled roads/gaps and overlapping polygons remain as inner lines",
        "bounds": [round(v, 6) for v in (minx, miny, maxx, maxy)],
        "polygons": sum(sum(r["counts"].values()) for r in report),
        "villages": report,
    }
    (out / "manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=1), encoding="utf-8")
    for r in report:
        print(f"{r['loc_id']} {r['village']:<14} {r['counts']} dup {r['duplicates_skipped']} outside {r['outside_mp_rejected']} "
              f"self-int {r['self_intersecting']} area {r.get('area_ha_survey_block', 0)} ha bbox {r.get('bbox')}")
    print(f"bounds {manifest['bounds']}  polygons {manifest['polygons']}")
    for f in ("parcels.geojson", "villages.geojson", "manifest.json"):
        print(f"wrote {out / f} ({(out / f).stat().st_size / 1e6:.2f} MB)")


if __name__ == "__main__":
    if len(sys.argv) < 2:
        sys.exit(__doc__)
    repo = Path(__file__).resolve().parents[2]
    main(Path(sys.argv[1]), Path(sys.argv[2]) if len(sys.argv) > 2 else repo / "web" / "public" / "data" / "webgis")
