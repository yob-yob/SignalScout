# SignalScout

Cell Tower Line-of-Sight & Terrain Analyzer — a single-page web app that helps you figure out which nearby cell tower to aim a directional antenna at, and how high to mount it.

## Quick start

```bash
bun install
bun run dev      # dev server at http://localhost:5173
bun run build    # production build to build/
bun run preview  # preview production build
bun test         # run all tests
```

## Usage

1. Enter your location (paste `lat, lon` from Google Maps, or use browser geolocation)
2. Add cell tower coordinates (find them at [cellmapper.net](https://cellmapper.net))
3. Adjust antenna height and frequency assumptions as needed
4. Click **Analyze paths** to compute terrain profiles
5. Click a tower in the ranking list or on the map to see:
   - Terrain profile chart with line-of-sight and Fresnel zone
   - Distance, bearing, path loss, and obstruction details
   - Plain-language interpretation of the link quality
6. Use **Copy share link** to share your analysis via URL

## Tech stack

| Concern | Choice |
|---|---|
| Runtime | Bun |
| Framework | SvelteKit (SPA mode) |
| UI | shadcn-svelte + Tailwind CSS |
| Map | Leaflet + OpenStreetMap |
| Charts | SVG (hand-crafted) |
| Elevation data | Open-Meteo / Copernicus GLO-90 DEM |

## Data sources & attribution

- **Map tiles:** &copy; [OpenStreetMap](https://www.openstreetmap.org/copyright) contributors
- **Elevation data:** [Open-Meteo](https://open-meteo.com/) / Copernicus GLO-90 DEM (90 m resolution). Fine ridges may be smoothed; vegetation and buildings are invisible to the DEM. Verify with a real-world signal test before construction.

## RF algorithms

All RF math is in `src/lib/rf.ts` — pure TypeScript functions implementing:

- Haversine distance & bearing
- Terrain path sampling (90 m spacing)
- Line-of-sight clearance with earth curvature correction
- First Fresnel zone (ITU-R P.526)
- Single knife-edge diffraction loss
- Minimum pole height solver (binary search, 0–200 m)
- Free-space path loss (FSPL)

Unit-tested against a validated real-world fixture (see `tests/rf.test.ts`).

## Project structure

```
src/
  lib/
    geo.ts              # haversine, bearing, samplePath, compassPoint
    rf.ts               # LOS, Fresnel, knife-edge, solver, FSPL, verdict
    elevation.ts        # chunked API fetch, caching (memory + localStorage)
    share.ts            # URL state (de)serialization
    state/
      analysis.svelte.ts  # Svelte 5 runes store
    components/
      Sidebar.svelte
      TargetForm.svelte
      TowerRepeater.svelte
      AssumptionsPanel.svelte
      RankingList.svelte
      TowerDetail.svelte
      ProfileChart.svelte
      MapView.svelte
  routes/
    +layout.ts          # ssr=false, prerender=true (SPA mode)
    +page.svelte        # main layout
tests/
  geo.test.ts           # 21 tests
  rf.test.ts            # 31 tests (§10 fixture + unit tests)
```
