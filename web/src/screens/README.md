# Screen Runner (`/app/screen`)

PRD §9.3. Left: screens grouped by domain. Middle: a form generated from the screen JSON. Right: the caveat, then the results table above the map. Rendering follows the query playbook's pattern templates.

## How a screen gets on screen

```
catalog/screens.json  →  render.pattern  →  renderers/registry.ts  →  template
                      →  params[]        →  ParameterField (one per type)
                      →  render.table    →  ResultTable columns
```

To add a screen, add an entry to `catalog/screens.json` (same shape `GET /api/screens` returns). No new component is needed unless the pattern itself is new. `parseCatalog.ts` rejects a screen that has no caveat, or a column labelled "market value".

| Pattern | Template | Map |
|---|---|---|
| HYB, CMP, batch DOS | `SplitResultRenderer`: table above map; the lead view gets the larger share; tabs below 1024px | yes |
| TBL | `TableResultRenderer` | no |
| STAT | `BenchmarkResultRenderer`: chart plus a small table | no |
| LYR, FLT, NET, MON, WKB, DOS, SYS | `UnsupportedPatternRenderer`, which says where the query lives instead | n/a |

## Backend seam

`service/screenService.ts` is the only part of the runner that talks to the backend.

| Env | Behaviour |
|---|---|
| *(unset)* | Uses the bundled JSON with mock execution. Screens whose sources are all in the PRD's 12 v1 sources return **No data available**. Screens that depend on any other source return **Screen not connected**. |
| `VITE_SCREEN_SOURCE=api` | Calls `GET /api/screens`, `POST /api/screen/run` with `{screen_id, params, scope, bbox, near_miss?, sort?}`, and `POST /api/watchlist`. |
| `VITE_SCREEN_FIXTURES=true` | Dev only. Generates synthetic rows labelled "[Fixture]" and shows a banner. They are never real data. |
| `?mock=empty\|no_data\|not_connected\|error\|timeout\|fixtures` | Applies in `npm run dev` only. Forces a state. `&fixture_rows=1000` tests windowing, and `6000` tests server truncation. |

`service/outcome.ts` maps every response to one of four distinct states:

- **results**: the response has rows
- **empty**: zero rows, and the sources are loaded
- **no_data**: zero rows, and every source has coverage `none`
- **not_connected**: HTTP 404 or 501

Timeouts, network failures and other HTTP errors become **error**, with a message that is safe to show.

## Trust rules (`trust.ts`)

- A weak-cluster badge appears below 0.85.
- A low-sample mark appears when n < 5.
- Tier A is drawn solid. Tier B is drawn dashed and hatched. Tier C is never drawn.
- The UI says "None found in {source} as of {date}".
- Registered values are labelled "registered value (understated)".
- The caveat is always above the results, including when there are zero rows.

## URL

The URL looks like this: `?screen=q007&scope=tehsil:depalpur&p.min_grantors=4&sel=cluster:4812&view=map&nm=1&run=1`.

- Changing the screen pushes a history entry.
- Edits replace the current entry.
- `run=1` restores the result after a refresh or when someone opens a shared link.

Keyboard shortcuts: `j`/`k` move between rows, `Enter` opens the selected row, `Esc` closes it, `e` exports to CSV, and `w` adds to the watchlist.
