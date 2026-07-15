# SignalScout Usage Guide

SignalScout computes terrain profiles and line-of-sight analysis between your location and nearby cell towers, helping you choose the best tower and antenna height for a directional link.

## Step-by-step walkthrough

### 1. Set your target location

Enter your location coordinates in the **Target location** field as `lat, lon` (e.g., `10.0708, 123.6111`). You can grab these from Google Maps by right-clicking a point and copying the coordinates, or click **Use my location** to let the browser geolocate you.

Optionally give your target a label (e.g., "Home roof").

### 2. Add cell towers

Click **Add tower** and enter each tower's coordinates. Towers can be found at [cellmapper.net](https://cellmapper.net) — look up your area, click on tower markers, and copy their latitude/longitude.

Each tower gets an auto-generated name ("Tower 1", etc.) that you can rename. A color dot is assigned to distinguish towers on the map and charts.

### 3. Configure assumptions

The **Configuration** panel lets you adjust three parameters that affect the analysis:

| Parameter | Range | Default | What it means |
|---|---|---|---|
| Antenna height | 0–30 m | 10 m | Height of your antenna above ground at the target location (pole/mast height) |
| Tower height | 10–60 m | 35 m | Height of the cell tower structure above its base ground level |
| Frequency | 700–3500 MHz | 700 MHz | Operating frequency band of the tower — affects Fresnel zone radius and free-space path loss |

Adjusting any parameter re-computes all path analyses in real time.

### 4. Analyze paths

Click **Analyze paths** to fetch elevation data and compute terrain profiles for all towers. The app queries the Open-Meteo elevation API (Copernicus GLO-90 DEM at 90 m resolution) for each target–tower path.

On first load a disclaimer explains the API usage — accept it to proceed. Elevation data is cached in memory and `localStorage` so re-analyses are instant.

### 5. Interpret results

After analysis, towers appear ranked by **total path loss** (lower dB = better) in the sidebar:

- **Clear LOS** — Full line-of-sight with good Fresnel zone clearance. Best-case link.
- **Marginal — Fresnel** — Sightline is clear but the Fresnel zone is partially obstructed. Minor degradation possible.
- **Diffraction path** — Terrain blocks line-of-sight but enough signal diffracts over the obstruction. Usable up to ~22 dB diffraction loss.
- **Severely blocked** — Heavy obstruction. A taller pole or different tower is advised.

Click a tower to see its detail panel, which shows:

- **Terrain profile chart** — Elevation along the path with line-of-sight ray, Fresnel zone envelope, and highlighted obstructions.
- **Stat grid** — Distance, bearing, base elevations, obstruction height, minimum pole heights (LOS and 60% Fresnel), diffraction loss, free-space path loss, and total path loss.
- **Plain-language interpretation** — A human-readable explanation of the link quality and whether it's workable.

### 6. Share your analysis

Click **Copy share link** to encode your target, towers, and assumptions into a URL. Anyone opening the link sees the same setup and can re-run the analysis. Sessions also persist in `localStorage` so your setup is restored on next visit.

## Finding tower coordinates

- Go to [cellmapper.net](https://cellmapper.net)
- Select your country and network provider
- Navigate to your area on the map
- Click on tower markers — the info popup shows latitude and longitude
- Copy these into SignalScout

## Limitations

- **DEM resolution** is 90 m. Narrow ridges, small hills, and man-made structures (buildings, towers themselves) are invisible.
- **Vegetation** is not modeled — trees can add significant obstruction at lower frequencies.
- **Diffraction** uses a single knife-edge model. Multi-obstruction paths may have higher real-world loss.
- **Pole height solver** caps at 200 m. If no LOS is achievable within that range, the field shows `> 200 m — not achievable`.
- Always verify with a real-world signal test before permanent installation.

## Keyboard shortcuts

| Key | Action |
|---|---|
| `Enter` (in coordinate inputs) | Validate / add tower |
| Click tower in list or map | Select for detail view |
