# SignalScout

<p align="center">
  <img src="docs/sample.png" alt="SignalScout demo screenshot" width="720">
</p>

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

See [docs/usage.md](docs/usage.md) for a detailed walkthrough.

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

## Contributing

1. Fork the repo and create a feature branch
2. Run `bun test` to ensure existing tests pass
3. Add tests for new functionality
4. Submit a pull request with a clear description of the change

## License

MIT — see [LICENSE](LICENSE) for details.
