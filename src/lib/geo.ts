export type LatLon = { lat: number; lon: number };

const R = 6371000;

function rad(deg: number): number {
	return (deg * Math.PI) / 180;
}

function deg(rad: number): number {
	return (rad * 180) / Math.PI;
}

export function haversine(a: LatLon, b: LatLon): number {
	const p1 = rad(a.lat);
	const p2 = rad(b.lat);
	const dp = rad(b.lat - a.lat);
	const dl = rad(b.lon - a.lon);
	const x = Math.sin(dp / 2) ** 2 + Math.cos(p1) * Math.cos(p2) * Math.sin(dl / 2) ** 2;
	return 2 * R * Math.asin(Math.sqrt(x));
}

export function bearing(a: LatLon, b: LatLon): number {
	const p1 = rad(a.lat);
	const p2 = rad(b.lat);
	const dl = rad(b.lon - a.lon);
	const y = Math.sin(dl) * Math.cos(p2);
	const x = Math.cos(p1) * Math.sin(p2) - Math.sin(p1) * Math.cos(p2) * Math.cos(dl);
	return (deg(Math.atan2(y, x)) + 360) % 360;
}

const COMPASS_POINTS = [
	'N', 'NbE', 'NNE', 'NEbN', 'NE', 'NEbE', 'ENE', 'EbN',
	'E', 'EbS', 'ESE', 'SEbE', 'SE', 'SEbS', 'SSE', 'SbE',
	'S', 'SbW', 'SSW', 'SWbS', 'SW', 'SWbW', 'WSW', 'WbS',
	'W', 'WbN', 'WNW', 'NWbW', 'NW', 'NWbN', 'NNW', 'NbW',
];

const COMPASS_POINTS_16 = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];

export function compassPoint(bearingDeg: number): string {
	const i = Math.round(bearingDeg / 22.5) % 32;
	return COMPASS_POINTS_16[Math.round(bearingDeg / 22.5) % 16];
}

export function samplePath(a: LatLon, b: LatLon, spacingM = 90): LatLon[] {
	const n = Math.max(2, Math.round(haversine(a, b) / spacingM));
	return Array.from({ length: n + 1 }, (_, i) => ({
		lat: a.lat + (b.lat - a.lat) * (i / n),
		lon: a.lon + (b.lon - a.lon) * (i / n),
	}));
}

export function parseLatLon(input: string): LatLon | null {
	const cleaned = input.replace(/[()]/g, '').trim();
	const parts = cleaned.split(/[\s,]+/).map(Number);
	if (parts.length < 2) return null;
	const [lat, lon] = parts;
	if (isNaN(lat) || isNaN(lon)) return null;
	if (lat < -90 || lat > 90 || lon < -180 || lon > 180) return null;
	return { lat, lon };
}
