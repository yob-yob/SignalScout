import { nanoid } from 'nanoid';
import type { LatLon } from '../geo';
import { haversine, bearing } from '../geo';
import type { SamplePoint, PathAnalysis } from '../rf';
import { analyzePath } from '../rf';
import { getElevations, type ElevationResult } from '../elevation';

export type Tower = {
	id: string;
	name: string;
	pos: LatLon;
	color: string;
};

export type Assumptions = {
	poleHeightM: number;
	towerHeightM: number;
	freqMHz: number;
};

export type CacheStatus = 'idle' | 'loading' | 'loaded' | 'error';

export type TowerAnalysisState = {
	status: CacheStatus;
	error?: string;
	samples?: SamplePoint[];
	result?: PathAnalysis;
};

const TOWER_COLORS = [
	'#2563eb', '#dc2626', '#16a34a', '#ca8a04',
	'#9333ea', '#0891b2', '#d97706', '#4f46e5',
];

const DEFAULTS: Assumptions = {
	poleHeightM: 10,
	towerHeightM: 35,
	freqMHz: 700,
};

let _colorIndex = 0;

export const store = $state({
	target: null as LatLon | null,
	targetLabel: 'Target',
	targetInput: '',
	towers: [] as Tower[],
	assumptions: { ...DEFAULTS } as Assumptions,
	selectedTowerId: null as string | null,
	towerStates: {} as Record<string, TowerAnalysisState>,
	analyzed: false,
});

export function setSelectedTowerId(id: string | null) {
	store.selectedTowerId = id;
}

export function addTower(pos: LatLon, name?: string): Tower {
	const color = TOWER_COLORS[_colorIndex % TOWER_COLORS.length];
	_colorIndex++;
	const tower: Tower = {
		id: nanoid(8),
		name: name || `Tower ${store.towers.length + 1}`,
		pos,
		color,
	};
	store.towers = [...store.towers, tower];
	return tower;
}

export function removeTower(id: string) {
	store.towers = store.towers.filter((t) => t.id !== id);
	if (store.selectedTowerId === id) store.selectedTowerId = null;
	const states = { ...store.towerStates };
	delete states[id];
	store.towerStates = states;
}

export function updateTower(id: string, updates: Partial<Pick<Tower, 'name' | 'pos' | 'color'>>) {
	store.towers = store.towers.map((t) => (t.id === id ? { ...t, ...updates } : t));
	if (updates.pos) {
		const states = { ...store.towerStates };
		delete states[id];
		store.towerStates = states;
	}
}

export function updateAssumptions(u: Partial<Assumptions>) {
	store.assumptions = { ...store.assumptions, ...u };
	recomputeResults();
}

export async function runAnalysis() {
	if (!store.target || store.towers.length === 0) return;
	store.analyzed = true;
	for (const tower of store.towers) {
		await ensureElevations(tower.id);
	}
}

export async function triggerAnalysis() {
	await runAnalysis();
}

export function fetchTowerElevation(towerId: string) {
	ensureElevations(towerId);
}

async function ensureElevations(towerId: string) {
	const existing = store.towerStates[towerId];
	if (existing?.samples && existing.samples.length > 0) return;
	if (existing?.status === 'loading') return;

	const tower = store.towers.find((t) => t.id === towerId);
	if (!tower || !store.target) return;

	store.towerStates = { ...store.towerStates, [towerId]: { status: 'loading' } };

	const result: ElevationResult = await getElevations(store.target, tower.pos, 90);

	if (result.error) {
		store.towerStates = { ...store.towerStates, [towerId]: { status: 'error', error: result.error } };
		return;
	}

	const distanceM = haversine(store.target, tower.pos);
	const bearingDeg = bearing(store.target, tower.pos);

	const samples = result.samples;
	if (!samples) {
		store.towerStates = { ...store.towerStates, [towerId]: { status: 'error', error: 'No elevation samples returned' } };
		return;
	}
	const analysis = deriveAnalysis(towerId, samples, distanceM, bearingDeg);

	store.towerStates = { ...store.towerStates, [towerId]: { status: 'loaded', samples, result: analysis } };
}

function deriveAnalysis(
	towerId: string,
	samples: SamplePoint[],
	distanceM: number,
	bearingDeg: number,
): PathAnalysis {
	return analyzePath(
		samples,
		towerId,
		distanceM,
		bearingDeg,
		store.assumptions.poleHeightM,
		store.assumptions.towerHeightM,
		store.assumptions.freqMHz,
	);
}

function recomputeResults() {
	const newStates = { ...store.towerStates };
	let changed = false;

	for (const tid of Object.keys(newStates)) {
		const state = newStates[tid];
		if (state.status === 'loaded' && state.samples) {
			const tower = store.towers.find((t) => t.id === tid);
			if (tower && store.target) {
				const dist = haversine(store.target, tower.pos);
				const brg = bearing(store.target, tower.pos);
				const updated = deriveAnalysis(tid, state.samples, dist, brg);
				if (JSON.stringify(state.result) !== JSON.stringify(updated)) {
					newStates[tid] = { ...state, result: updated };
					changed = true;
				}
			}
		}
	}

	if (changed) {
		store.towerStates = newStates;
	}
}

export function retryTower(towerId: string) {
	const states = { ...store.towerStates };
	delete states[towerId];
	store.towerStates = states;
	ensureElevations(towerId);
}
