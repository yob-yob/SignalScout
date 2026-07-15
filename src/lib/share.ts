import type { LatLon } from './geo';
import type { Tower, Assumptions } from './state/analysis.svelte';

type SharePayload = {
	v: number;
	target: { lat: number; lon: number } | null;
	label: string;
	towers: { name: string; lat: number; lon: number; color: string }[];
	assumptions: Assumptions;
};

const VERSION = 1;

export function encodeShareState(
	target: LatLon | null,
	label: string,
	towers: Tower[],
	assumptions: Assumptions,
): string {
	const payload: SharePayload = {
		v: VERSION,
		target: target ? { lat: target.lat, lon: target.lon } : null,
		label,
		towers: towers.map((t) => ({ name: t.name, lat: t.pos.lat, lon: t.pos.lon, color: t.color })),
		assumptions: { ...assumptions },
	};
	const json = JSON.stringify(payload);
	return btoa(encodeURIComponent(json));
}

export function decodeShareState(encoded: string): {
	target: LatLon | null;
	label: string;
	towers: Omit<Tower, 'id'>[];
	assumptions: Assumptions;
} | null {
	try {
		const json = decodeURIComponent(atob(encoded));
		const payload = JSON.parse(json) as SharePayload;
		if (payload.v !== VERSION) return null;
		return {
			target: payload.target ? { lat: payload.target.lat, lon: payload.target.lon } : null,
			label: payload.label || 'Target',
			towers: payload.towers.map((t) => ({ name: t.name, pos: { lat: t.lat, lon: t.lon }, color: t.color })),
			assumptions: payload.assumptions,
		};
	} catch {
		return null;
	}
}

const LS_SESSION_KEY = 'signalscout_session';

export function saveSession(payload: SharePayload) {
	try {
		localStorage.setItem(LS_SESSION_KEY, JSON.stringify(payload));
	} catch { /* ignore */ }
}

export function loadSession(): SharePayload | null {
	try {
		const raw = localStorage.getItem(LS_SESSION_KEY);
		if (!raw) return null;
		const data = JSON.parse(raw);
		if (data && data.v === VERSION) return data as SharePayload;
		return null;
	} catch {
		return null;
	}
}

export function clearSession() {
	try {
		localStorage.removeItem(LS_SESSION_KEY);
	} catch { /* ignore */ }
}
