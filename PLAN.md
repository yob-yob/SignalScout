# SignalScout — Cell Tower Line-of-Sight & Terrain Analyzer

A single-page web application that helps rural/off-grid users figure out **which nearby cell tower to aim a directional antenna at, and how high to mount it**, by visualizing terrain profiles, line-of-sight (LOS), Fresnel-zone clearance, and knife-edge diffraction loss between a target location (house) and user-supplied cell tower locations.

This plan is written for an implementing agent. It contains the full product spec, algorithms (with reference implementations), API constraints, UI layout, and acceptance criteria. The RF math has already been validated against a real-world case; implement it as specified.

---

## 1. Problem & Users

- **Who:** People in areas with poor mobile coverage planning a fixed cellular installation (LTE/5G router + external directional antenna on a pole/mast).
- **Problem:** They can find tower coordinates manually (via cellmapper.net + Google Maps) but have no easy way to know whether terrain blocks the path, how tall a pole they need, or which of several candidate towers is best.
- **Output the user cares about:**
  1. A map showing their house, the towers, and the paths.
  2. A terrain elevation profile per tower with the sightline overlaid.
  3. Concrete numbers: distance, bearing, worst obstruction, minimum pole height for LOS / 60% Fresnel clearance, and estimated knife-edge diffraction loss when LOS is impossible.
  4. A ranked comparison of all towers so the best aim is obvious.

There is no free global open dataset of tower coordinates suitable for embedding, so **tower locations are entered manually by the user** (typically sourced from cellmapper.net). Do not attempt to integrate a tower database in v1.

---

## 2. Tech Stack (fixed — do not substitute)

| Concern | Choice | Notes |
|---|---|---|
| Runtime / package manager | **Bun** | `bun install`, `bun run dev`, `bun run build` |
| Framework | **SvelteKit** (Svelte 5) | SPA mode: `@sveltejs/adapter-static` with `fallback: 'index.html'`, `export const ssr = false` in root `+layout.ts`. No server routes needed — all API calls are client-side. |
| UI components | **shadcn-svelte** | Sidebar, Input, Button, Card, Tabs, Slider, Select, Accordion, Badge, Tooltip, Popover (color picker), Alert, Skeleton |
| Map | **Leaflet** + **OpenStreetMap** raster tiles | Import Leaflet dynamically inside `onMount` (it touches `window`). Tile URL: `https://tile.openstreetmap.org/{z}/{x}/{y}.png`. OSM attribution is **mandatory**. |
| Charts | **LayerChart** (what shadcn-svelte charts are built on) | Terrain profile = **Linear Area Chart** (terrain fill) + **Linear Line Chart** overlays (sightline, Fresnel boundary) composed on shared axes. |
| Elevation data | **Open-Meteo Elevation API** (free, CORS-enabled, no key) | `GET https://api.open-meteo.com/v1/elevation?latitude=...&longitude=...` — see §5 for hard constraints. |
| Styling | Tailwind (comes with shadcn-svelte) | |
| State | Svelte 5 runes (`$state`, `$derived`) in a shared `analysis.svelte.ts` store module | No external state library. |

---

## 3. UI Specification

Single page, two-region layout. Desktop: fixed-width sidebar (~400px) left, map fills the rest. Mobile: map on top (~45vh), sidebar content below as a scrollable sheet.

### 3.1 Sidebar (top to bottom)

1. **App header** — name + one-line explanation. Small "How it works" Popover: 3 steps (① enter your location ② add towers from cellmapper.net ③ click Analyze, then click a tower pin or list item).
2. **Target location form**
   - One text input accepting `lat, lon` pasted as a single string (Google Maps copy format, e.g. `10.070856188794611, 123.61115373019253`). Parse commas/whitespace tolerantly; validate ranges (−90..90, −180..180). Show inline error on invalid input.
   - Optional label field (default "Target").
   - "Use my location" button via browser geolocation (graceful failure).
3. **Tower repeater**
   - "Add tower" button appends a row: paste-friendly `lat, lon` input, optional name (default `Tower 1..n`), color swatch (Popover with ~8 preset colors; default blue `#2563eb`), delete button.
   - Rows are collapsible Cards. Min 1 tower to analyze; soft cap 12 (perf + sanity).
4. **Global assumptions panel** (Accordion, "Advanced assumptions", open by default)
   - **Antenna height at target (pole)** — Slider 0–30 m, default 10 m.
   - **Tower structure height** — Slider 10–60 m, default 35 m. (Users don't know real tower heights; this is an explicit assumption, label it as such.)
   - **Frequency** — Select: 700 MHz (default), 850, 1800, 2100, 2600, 3500 MHz. Affects Fresnel radius and diffraction loss.
   - Changing any assumption **recomputes instantly client-side** (no refetch — elevation data is cached).
5. **Analyze button** — primary action. Disabled until target + ≥1 tower valid.
6. **Results area** (rendered after analysis)
   - **Ranking card**: all towers sorted by estimated total path loss (FSPL + diffraction). Each row: color dot, name, distance, bearing, verdict Badge — `Clear LOS` (green) / `Marginal — Fresnel obstructed` (amber) / `Diffraction path` (orange) / `Severely blocked` (red), and total dB. Clicking a row selects that tower (same as clicking its map pin).
   - **Selected-tower detail panel**:
     - Terrain profile chart (see §3.3).
     - Stat grid: distance, bearing (° true, plus compass point e.g. "108° ESE"), tower base elevation, worst obstruction (height ASL, distance from target, meters above/below sightline), min pole height for bare LOS, min pole height for 60% first-Fresnel clearance at selected frequency (show "> 200 m — not achievable" when the solver caps out), knife-edge diffraction loss at current pole height, FSPL, estimated total path loss.
     - A one-paragraph plain-language interpretation generated from the numbers (template-based, e.g. "Full line-of-sight is not achievable with a realistic pole. However, the ridge sits only 13 m above your sightline at 10 m pole height, costing ≈18 dB at 700 MHz — a usable diffracted link is likely.").

### 3.2 Map behavior

- Target = **red pin** (fixed). Towers = pins in their chosen colors.
- After Analyze: draw a polyline from each tower to the target in that tower's color; midpoint label (Leaflet Tooltip, permanent) showing distance (`1.62 km`) and bearing.
- Selected tower's polyline becomes thicker/opaque; others dim to ~40% opacity.
- Clicking a tower pin (or ranking row) triggers elevation fetch (if not cached) → renders the detail panel. Show a Skeleton/loading state in the sidebar and a subtle spinner on the pin while fetching.
- Fit map bounds to all pins after Analyze.
- Optional nice-to-have: clicking the map fills whichever input is focused (target or a tower row).

### 3.3 Terrain profile chart (the core visualization)

Composed LayerChart chart, x = distance from target (km), y = elevation (m ASL):

1. **Area series** — terrain profile (sampled elevations), earthy fill (e.g. `#c8b89a` at 90% opacity), darker stroke.
2. **Line series** — straight sightline from target antenna (`ground + poleHeight`) to tower antenna (`towerBase + towerStructureHeight`). Green dashed when fully clear, red dashed when obstructed.
3. **Line series (band)** — lower boundary of the 60% first-Fresnel zone beneath the sightline (dotted, subtle). Where terrain rises above this line but stays below the sightline → "Marginal".
4. **Point + annotation** — worst obstruction marker with a label (`Ridge 80 m — +13 m above LOS`).
5. **Endpoint markers** — target (red) and tower (tower color) with labels showing antenna ASL heights.
6. Tooltip on hover: distance, terrain elevation, sightline elevation, clearance.
7. Chart must re-render reactively when pole height / tower height / frequency sliders change (elevations are cached; only the math reruns).

---

## 4. Algorithms (reference implementations — port to TypeScript as `src/lib/geo.ts` and `src/lib/rf.ts`, pure functions, unit-tested)

All angles in degrees at the API surface, radians internally. Earth radius `R = 6371000` m. Earth curvature can be ignored below ~10 km paths (bulge < 1 m at 6 km), but include the optional effective-earth correction anyway (§4.6) since it's cheap.

### 4.1 Distance (haversine)

```ts
function haversine(a: LatLon, b: LatLon): number {
  const R = 6371000;
  const p1 = rad(a.lat), p2 = rad(b.lat);
  const dp = rad(b.lat - a.lat), dl = rad(b.lon - a.lon);
  const x = Math.sin(dp/2)**2 + Math.cos(p1)*Math.cos(p2)*Math.sin(dl/2)**2;
  return 2 * R * Math.asin(Math.sqrt(x)); // meters
}
```

### 4.2 Initial bearing

```ts
function bearing(a: LatLon, b: LatLon): number {
  const p1 = rad(a.lat), p2 = rad(b.lat), dl = rad(b.lon - a.lon);
  const y = Math.sin(dl) * Math.cos(p2);
  const x = Math.cos(p1)*Math.sin(p2) - Math.sin(p1)*Math.cos(p2)*Math.cos(dl);
  return (deg(Math.atan2(y, x)) + 360) % 360;
}
```

Also implement `compassPoint(bearing)` → 16-point rose ("ESE").

### 4.3 Path sampling

Linear interpolation in lat/lon is fine at these distances (< 10 km):

```ts
function samplePath(a: LatLon, b: LatLon, spacingM = 90): LatLon[] {
  const n = Math.max(2, Math.round(haversine(a, b) / spacingM));
  return Array.from({length: n + 1}, (_, i) => ({
    lat: a.lat + (b.lat - a.lat) * i / n,
    lon: a.lon + (b.lon - a.lon) * i / n,
  }));
}
```

**Spacing = 90 m** to match the DEM's native resolution (Copernicus GLO-90). Finer sampling adds requests without adding information.

### 4.4 Line of sight & clearance

For target antenna ASL `A = groundElev[0] + poleH` and tower antenna ASL `B = groundElev[last] + towerH`, sightline at sample `i` (distance `d[i]`, total `D`):

```
los[i] = A + (B − A) · d[i] / D
clearance[i] = los[i] − terrain[i]     // negative = obstructed
```

### 4.5 First Fresnel zone

Radius at a point with distances `d1`, `d2` (km) from the endpoints, total `D` (km), frequency `f` (GHz):

```
r1 = 17.32 · sqrt( (d1 · d2) / (f · D) )   // meters
```

Clearance rule: path is **Clear** if terrain stays ≥ 0.6·r1 below the sightline everywhere; **Marginal** if it intrudes into the 60% zone but not the sightline; **Obstructed** if terrain crosses the sightline.

### 4.6 Optional effective-earth curvature correction

Add to terrain height at each sample: `bulge[i] = (d1 · d2) / (2 · k · R)` with `k = 4/3`, `d1/d2` in meters. Sub-meter below 6 km but keeps results honest for longer paths.

### 4.7 Minimum pole height solver

Binary search `h ∈ [0, 200]` m for the smallest `h` such that every interior sample satisfies the chosen criterion (bare LOS: `los[i] ≥ terrain[i]`; Fresnel: `los[i] ≥ terrain[i] + 0.6·r1[i]`). ~60 iterations. If even `h = 200` fails, report "not achievable with a pole."

### 4.8 Single knife-edge diffraction (ITU-R P.526 approximation)

Find the **worst** interior obstruction not by height above LOS but by the diffraction parameter `v` (a lower, closer obstacle can dominate a taller, farther one):

```
hc = terrain[i] − los[i]                    // m, + means above sightline
v  = hc · sqrt( 2 (d1 + d2) / (λ d1 d2) )   // d1, d2 in m; λ = c / f
J(v) = v > −0.78
     ? 6.9 + 20·log10( sqrt((v − 0.1)² + 1) + v − 0.1 )   // dB
     : 0
```

Take `max v` over interior samples → single knife-edge loss. Also count distinct obstruction zones (contiguous runs of `clearance < 0`); if > 1, display "multiple obstructions — real loss will be higher than this single-edge estimate."

### 4.9 Free-space path loss & total

```
FSPL(dB) = 32.45 + 20·log10(D_km) + 20·log10(f_MHz)
total    = FSPL + J(v)
```

Rank towers ascending by `total`. Verdict thresholds (at current assumptions): Clear LOS (J = 0, Fresnel clear) / Marginal (sightline clear, Fresnel intruded) / Diffraction path (0 < hc worst ≤ ~20 m above LOS or J ≤ ~22 dB) / Severely blocked (otherwise).

---

## 5. Open-Meteo Elevation API — hard constraints

- Endpoint: `https://api.open-meteo.com/v1/elevation?latitude=<csv>&longitude=<csv>` → `{"elevation":[...]}` in request order. CORS is enabled; call directly from the browser.
- **Max 100 coordinates per request.** Chunk longer paths and concatenate results **in order**. Keep each path's samples contiguous within/across chunks.
- Round coordinates to 6 decimals in the URL (≈0.1 m, keeps URLs shorter).
- Free tier is rate-limited (~10k req/day, be polite): fetch **lazily** — only when a tower is selected — and **cache** results.
- Cache key: `hash(target, tower, spacing)` → elevation array, stored in an in-memory Map **and** `localStorage` (with a version prefix so schema changes invalidate old entries).
- Failure handling: network error / non-200 / `{"error":true}` → Alert in the detail panel with a Retry button; never crash the app. Debounce rapid re-clicks.
- DEM source is **Copernicus GLO-90 (90 m)** — display the two accuracy caveats permanently under the chart: (1) narrow ridges may be smoothed lower than reality; (2) vegetation and buildings are invisible to the DEM. Recommend a real-world signal test at height before construction.

---

## 6. Data model

```ts
type LatLon = { lat: number; lon: number };

type Tower = {
  id: string;            // nanoid
  name: string;
  pos: LatLon;
  color: string;         // hex
};

type Assumptions = {
  poleHeightM: number;    // default 10
  towerHeightM: number;   // default 35
  freqMHz: number;        // default 700
};

type PathAnalysis = {
  towerId: string;
  distanceM: number;
  bearingDeg: number;
  samples: { dM: number; elevM: number }[];   // cached from API
  // everything below derived client-side from samples + assumptions:
  losM: number[];
  fresnel60M: number[];
  worst: { dM: number; elevM: number; aboveLosM: number; v: number };
  obstructionZones: number;
  minPoleLosM: number | null;       // null = >200 m
  minPoleFresnelM: number | null;
  diffractionDb: number;
  fsplDb: number;
  totalDb: number;
  verdict: 'clear' | 'marginal' | 'diffraction' | 'blocked';
};
```

`samples` come from the network once; every other field is a `$derived` computation so the assumption sliders feel instant.

---

## 7. Shareability & persistence

- **URL state:** serialize target + towers + assumptions into the URL query/hash (compact JSON → base64url). On load, hydrate from URL if present. This makes any analysis shareable with a plain link — a core requirement ("I could share to anyone"). Elevation data is *not* in the URL; recipients refetch (cheap).
- "Copy share link" Button in the results header.
- Also persist the last session to `localStorage` so a refresh doesn't lose work.

---

## 8. Design direction (for the implementing agent)

Subject: terrain, radio, and field engineering — lean into a **topographic/field-instrument** aesthetic rather than a generic SaaS dashboard. Suggested direction (adapt, don't cargo-cult): muted terrain palette (sand/olive/slate) with one high-visibility signal accent used *only* for the selected path and verdict badges; a slightly technical mono/grotesque face for coordinates and dB figures, humanist sans for body; the terrain profile chart is the hero and signature element — give it room, don't shrink it into a card thumbnail. Keep motion minimal: one smooth transition when the detail panel opens, nothing ambient. Quality floor: responsive to mobile, keyboard-focus visible, `prefers-reduced-motion` respected, WCAG AA contrast.

Interface copy: plain and directive. Buttons say what they do ("Analyze paths", "Copy share link"). Errors say what happened and what to do ("Couldn't reach the elevation service. Check your connection and retry."). Empty state teaches the cellmapper.net workflow in 3 short steps with a link.

---

## 9. Project structure

```
src/
  lib/
    geo.ts             // haversine, bearing, samplePath, compassPoint
    rf.ts              // los, fresnel, knife-edge, solver, fspl, verdict
    elevation.ts       // chunked fetch (≤100 pts), caching, errors
    state/analysis.svelte.ts   // runes store: target, towers, assumptions, results, selection
    share.ts           // URL (de)serialization
    components/
      Sidebar.svelte
      TargetForm.svelte
      TowerRepeater.svelte
      AssumptionsPanel.svelte
      RankingList.svelte
      TowerDetail.svelte
      ProfileChart.svelte
      MapView.svelte   // Leaflet wrapper, client-only
  routes/
    +layout.ts         // ssr = false, prerender = true
    +page.svelte
tests/
    geo.test.ts  rf.test.ts   // bun test
```

## 10. Validation fixture (must pass)

Use this real case as a regression test for `rf.ts` (values from the validated analysis):

- Target `10.070856, 123.611154` (ground 78 m ASL), tower `10.066379, 123.625225` (ground 25 m ASL). Distance ≈ **1619 m**, bearing ≈ **107.9°**.
- With pole 15 m, tower 35 m, 700 MHz, and the 35-sample elevation array
  `[78,71,84,84,85,85,86,73,71,71,74,74,74,60,63,63,57,57,42,42,31,31,31,31,31,31,80,80,55,55,31,31,28,28,25]`:
  worst obstruction = **80 m ridge ≈ 1.24–1.29 km** from target, ≈ **+12–13 m** above sightline, `v ≈ 1.5–1.8`, knife-edge loss ≈ **17–18 dB**, FSPL ≈ **94 dB**, total ≈ **111–112 dB**, verdict `diffraction`. Min pole for bare LOS ≈ **98 m** (i.e., "not achievable" territory), confirming the solver and the verdict logic.

## 11. Milestones

1. **M1 — Skeleton:** SvelteKit SPA on Bun, shadcn-svelte installed, Leaflet map with OSM tiles + attribution, sidebar layout, target + tower forms with validation, pins + colored polylines + distance/bearing labels.
2. **M2 — Math core:** `geo.ts` + `rf.ts` fully unit-tested against §10 fixture. `elevation.ts` with chunking + caching.
3. **M3 — Analysis UX:** tower selection → lazy fetch → ProfileChart (area + LOS line + Fresnel band + worst-obstruction annotation) → stat grid → verdict + interpretation text → ranking list; reactive assumption sliders.
4. **M4 — Share & polish:** URL state, copy-link, localStorage session, mobile layout, loading/error/empty states, attribution footer (OpenStreetMap contributors; elevation: Open-Meteo / Copernicus GLO-90 DEM — both attributions are license requirements, not optional), README with `bun` commands.

## 12. Out of scope for v1 (note as future ideas only)

Tower databases/APIs, multi-knife-edge (Deygout/Epstein-Peterson) models, clutter/foliage layers, link-budget calculator with EIRP/antenna-gain inputs, KML/GeoJSON export, saved projects/accounts, offline tiles.
