import type { LatLon } from './geo';
import type { Tower, Assumptions } from './state/analysis.svelte';

export function syncQueryParams(
	target: LatLon | null,
	targetLabel: string,
	towers: Tower[],
	assumptions: Assumptions,
	replace: (url: string, state: Record<string, unknown>) => void,
) {
	const p = new URLSearchParams();

	if (target) {
		p.set('tlat', target.lat.toFixed(6));
		p.set('tlon', target.lon.toFixed(6));
	}
	if (targetLabel && targetLabel !== 'Target') {
		p.set('tlabel', targetLabel);
	}

	towers.forEach((t, i) => {
		const n = i + 1;
		p.set(`t${n}_lat`, t.pos.lat.toFixed(6));
		p.set(`t${n}_lon`, t.pos.lon.toFixed(6));
		if (t.name && t.name !== `Tower ${n}`) p.set(`t${n}_name`, t.name);
		if (t.color && t.color !== '#2563eb') p.set(`t${n}_color`, t.color);
	});

	p.set('ph', String(assumptions.poleHeightM));
	p.set('th', String(assumptions.towerHeightM));
	p.set('f', String(assumptions.freqMHz));

	const qs = p.toString();
	const url = qs ? `?${qs}` : window.location.pathname;
	replace(url, {});
}

export function decodeQueryParams(): {
	target: LatLon | null;
	targetLabel: string;
	towers: Omit<Tower, 'id'>[];
	assumptions: Assumptions;
} | null {
	const p = new URLSearchParams(window.location.search);
	const tlat = p.get('tlat');
	const tlon = p.get('tlon');

	if (!tlat || !tlon) return null;

	const lat = Number(tlat);
	const lon = Number(tlon);
	if (isNaN(lat) || isNaN(lon)) return null;

	const target: LatLon = { lat, lon };
	const targetLabel = p.get('tlabel') || 'Target';

	const towers: Omit<Tower, 'id'>[] = [];
	for (let i = 1; ; i++) {
		const wlat = p.get(`t${i}_lat`);
		const wlon = p.get(`t${i}_lon`);
		if (!wlat || !wlon) break;
		const wLat = Number(wlat);
		const wLon = Number(wlon);
		if (isNaN(wLat) || isNaN(wLon)) break;
		const name = p.get(`t${i}_name`) || `Tower ${i}`;
		const color = p.get(`t${i}_color`) || '#2563eb';
		towers.push({ name, pos: { lat: wLat, lon: wLon }, color });
	}

	const assumptions: Assumptions = {
		poleHeightM: Number(p.get('ph')) || 10,
		towerHeightM: Number(p.get('th')) || 35,
		freqMHz: Number(p.get('f')) || 700,
	};

	return { target, targetLabel, towers, assumptions };
}
