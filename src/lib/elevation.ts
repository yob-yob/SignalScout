import type { LatLon } from './geo';
import { samplePath, haversine } from './geo';
import type { SamplePoint } from './rf';
import { recordApiCall, recordCacheHit } from './state/stats.svelte';

const MAX_COORDS_PER_REQUEST = 100;
const ELEVATION_API = 'https://api.open-meteo.com/v1/elevation';
const CACHE_VERSION = 'v1';
const LS_PREFIX = 'signalscout_elev_';

const memoryCache = new Map<string, number[]>();

function hashKey(target: LatLon, tower: LatLon, spacingM: number): string {
	const t = `${target.lat.toFixed(6)},${target.lon.toFixed(6)}`;
	const w = `${tower.lat.toFixed(6)},${tower.lon.toFixed(6)}`;
	const s = `${spacingM}`;
	return `${t}|${w}|${s}`;
}

function fullKey(target: LatLon, tower: LatLon, spacingM: number): string {
	return `${CACHE_VERSION}:${hashKey(target, tower, spacingM)}`;
}

function loadFromLocalStorage(key: string): number[] | null {
	try {
		const raw = localStorage.getItem(`${LS_PREFIX}${key}`);
		if (!raw) return null;
		const data = JSON.parse(raw);
		if (Array.isArray(data) && data.every((v: unknown) => typeof v === 'number')) {
			return data as number[];
		}
		return null;
	} catch {
		return null;
	}
}

function saveToLocalStorage(key: string, elevations: number[]) {
	try {
		localStorage.setItem(`${LS_PREFIX}${key}`, JSON.stringify(elevations));
	} catch {
		// localStorage full or unavailable — silently skip
	}
}

async function fetchChunk(coords: LatLon[]): Promise<number[]> {
	const lats = coords.map((c) => c.lat.toFixed(6)).join(',');
	const lons = coords.map((c) => c.lon.toFixed(6)).join(',');
	const url = `${ELEVATION_API}?latitude=${lats}&longitude=${lons}`;

	recordApiCall();
	const res = await fetch(url);
	if (!res.ok) {
		throw new Error(`Elevation API returned status ${res.status}`);
	}

	const json = await res.json();

	if (json.error) {
		throw new Error(json.reason || 'Elevation API returned an error');
	}

	if (!Array.isArray(json.elevation)) {
		throw new Error('Unexpected elevation response format');
	}

	return json.elevation;
}

export async function fetchElevation(
	target: LatLon,
	tower: LatLon,
	samples: LatLon[],
	spacingM: number = 90,
): Promise<number[]> {
	const key = fullKey(target, tower, spacingM);

	const memResult = memoryCache.get(key);
	if (memResult) {
		recordCacheHit();
		return memResult;
	}

	const lsResult = loadFromLocalStorage(key);
	if (lsResult) {
		recordCacheHit();
		memoryCache.set(key, lsResult);
		return lsResult;
	}

	const chunks: LatLon[][] = [];
	for (let i = 0; i < samples.length; i += MAX_COORDS_PER_REQUEST) {
		chunks.push(samples.slice(i, i + MAX_COORDS_PER_REQUEST));
	}

	const results: number[] = [];
	for (const chunk of chunks) {
		const elevations = await fetchChunk(chunk);
		for (const elev of elevations) {
			results.push(elev);
		}
	}

	memoryCache.set(key, results);
	saveToLocalStorage(key, results);

	return results;
}

export function getCachedElevation(
	target: LatLon,
	tower: LatLon,
	spacingM: number = 90,
): number[] | null {
	const key = fullKey(target, tower, spacingM);
	return memoryCache.get(key) ?? loadFromLocalStorage(key);
}

export type ElevationResult =
	| { samples: SamplePoint[]; error?: undefined }
	| { samples?: undefined; error: string };

export async function getElevations(
	target: LatLon,
	tower: LatLon,
	spacingM: number = 90,
): Promise<ElevationResult> {
	try {
		const path = samplePath(target, tower, spacingM);
		const elevations = await fetchElevation(target, tower, path, spacingM);
		const totalDist = haversine(target, tower);
		const n = path.length;

		const samples: SamplePoint[] = [];
		for (let i = 0; i < elevations.length; i++) {
			samples.push({
				dM: (i * totalDist) / (n - 1),
				elevM: elevations[i],
			});
		}

		return { samples };
	} catch (err) {
		return { error: err instanceof Error ? err.message : 'Failed to fetch elevation data' };
	}
}
