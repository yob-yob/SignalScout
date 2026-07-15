const C = 299792458;
const R_EARTH = 6371000;
const K = 4 / 3;

export {
	C as SPEED_OF_LIGHT,
	R_EARTH,
	K as EFFECTIVE_EARTH_RADIUS_FACTOR,
};

export type SamplePoint = {
	dM: number;
	elevM: number;
};

export type PathAnalysis = {
	towerId: string;
	distanceM: number;
	bearingDeg: number;
	samples: SamplePoint[];
	losM: number[];
	fresnel60M: number[];
	worst: { dM: number; elevM: number; aboveLosM: number; v: number } | null;
	obstructionZones: number;
	minPoleLosM: number | null;
	minPoleFresnelM: number | null;
	diffractionDb: number;
	fsplDb: number;
	totalDb: number;
	verdict: 'clear' | 'marginal' | 'diffraction' | 'blocked';
};

export function analyzePath(
	samples: SamplePoint[],
	towerId: string,
	distanceM: number,
	bearingDeg: number,
	poleHeightM: number,
	towerHeightM: number,
	freqMHz: number,
): PathAnalysis {
	const n = samples.length;
	const terrainM = samples.map((s) => s.elevM);
	const distM = samples.map((s) => s.dM);

	const targetGroundM = terrainM[0];
	const towerGroundM = terrainM[n - 1];

	const targetASL = targetGroundM + poleHeightM;
	const towerASL = towerGroundM + towerHeightM;

	const { losM, clearanceM } = computeClearance(terrainM, distM, targetASL, towerASL, true);

	const { fresnel60M, verdict: fresnelVerdict } = computeFresnelClearance(
		distM, losM, terrainM, freqMHz,
	);

	const { worst, zones, lossDb } = computeKnifeEdge(
		distM, terrainM, losM, freqMHz,
	);

	const sightlineClear = clearanceM.every((c, i) => i === 0 || i === n - 1 || c >= 0);

	const minPoleLosM = solveMinPoleHeight(
		targetGroundM,
		towerGroundM,
		towerHeightM,
		terrainM,
		distM,
		freqMHz,
		'los',
	);

	const minPoleFresnelM = solveMinPoleHeight(
		targetGroundM,
		towerGroundM,
		towerHeightM,
		terrainM,
		distM,
		freqMHz,
		'fresnel',
	);

	const distanceKm = distanceM / 1000;
	const fsplDb = computeFspl(distanceKm, freqMHz);

	const worstAboveLosM = worst?.aboveLosM ?? 0;
	const verdict = computeVerdict(sightlineClear, fresnelVerdict, worstAboveLosM, lossDb);

	return {
		towerId,
		distanceM,
		bearingDeg,
		samples,
		losM,
		fresnel60M,
		worst,
		obstructionZones: zones,
		minPoleLosM,
		minPoleFresnelM,
		diffractionDb: lossDb,
		fsplDb,
		totalDb: fsplDb + lossDb,
		verdict,
	};
}

export function computeClearance(
	terrainM: number[],
	distM: number[],
	aM: number,
	bM: number,
	applyCurvature: boolean = true
): { losM: number[]; clearanceM: number[] } {
	const D = distM[distM.length - 1];
	const n = distM.length;
	const losM: number[] = new Array(n);
	const clearanceM: number[] = new Array(n);

	for (let i = 0; i < n; i++) {
		const d = distM[i];
		losM[i] = aM + ((bM - aM) * d) / D;

		let effectiveTerrain = terrainM[i];
		if (applyCurvature) {
			const d1 = d;
			const d2 = D - d;
			const bulge = (d1 * d2) / (2 * K * R_EARTH);
			effectiveTerrain += bulge;
		}

		clearanceM[i] = losM[i] - effectiveTerrain;
	}

	return { losM, clearanceM };
}

export function computeFresnelRadius(
	d1M: number,
	d2M: number,
	dTotalM: number,
	freqMHz: number
): number {
	const d1Km = d1M / 1000;
	const d2Km = d2M / 1000;
	const dKm = dTotalM / 1000;
	const fGHz = freqMHz / 1000;
	return 17.32 * Math.sqrt((d1Km * d2Km) / (fGHz * dKm));
}

export function computeFresnelClearance(
	distM: number[],
	losM: number[],
	terrainM: number[],
	freqMHz: number
): { fresnel60M: number[]; verdict: 'clear' | 'marginal' | 'obstructed' } {
	const D = distM[distM.length - 1];
	const n = distM.length;
	const fresnel60M: number[] = new Array(n);
	let isClear = true;
	let isObstructed = false;

	for (let i = 0; i < n; i++) {
		const d1 = distM[i];
		const d2 = D - d1;
		const r1 = computeFresnelRadius(d1, d2, D, freqMHz);
		fresnel60M[i] = 0.6 * r1;

		const clearance = losM[i] - terrainM[i];
		if (clearance < fresnel60M[i]) {
			isClear = false;
			if (clearance < 0) {
				isObstructed = true;
			}
		}
	}

	let verdict: 'clear' | 'marginal' | 'obstructed';
	if (isClear) {
		verdict = 'clear';
	} else if (isObstructed) {
		verdict = 'obstructed';
	} else {
		verdict = 'marginal';
	}

	return { fresnel60M, verdict };
}

export function computeKnifeEdge(
	distM: number[],
	terrainM: number[],
	losM: number[],
	freqMHz: number
): {
	worst: { dM: number; elevM: number; aboveLosM: number; v: number } | null;
	zones: number;
	lossDb: number;
} {
	const D = distM[distM.length - 1];
	const lambda = C / (freqMHz * 1e6);
	const n = distM.length;

	let worstIdx = -1;
	let worstV = -Infinity;

	for (let i = 1; i < n - 1; i++) {
		const hc = terrainM[i] - losM[i];
		if (hc <= 0) continue;

		const d1 = distM[i];
		const d2 = D - d1;
		const v = hc * Math.sqrt((2 * (d1 + d2)) / (lambda * d1 * d2));

		if (v > worstV) {
			worstV = v;
			worstIdx = i;
		}
	}

	let worst: { dM: number; elevM: number; aboveLosM: number; v: number } | null = null;
	let lossDb = 0;

	if (worstIdx >= 0) {
		const hc = terrainM[worstIdx] - losM[worstIdx];
		worst = {
			dM: distM[worstIdx],
			elevM: terrainM[worstIdx],
			aboveLosM: hc,
			v: worstV,
		};
		lossDb = jFunction(worstV);
	}

	let zones = 0;
	let inZone = false;
	for (let i = 1; i < n - 1; i++) {
		const clearance = losM[i] - terrainM[i];
		if (clearance < 0) {
			if (!inZone) {
				zones++;
				inZone = true;
			}
		} else {
			inZone = false;
		}
	}

	return { worst, zones, lossDb };
}

function jFunction(v: number): number {
	if (v <= -0.78) return 0;
	return 6.9 + 20 * Math.log10(Math.sqrt((v - 0.1) ** 2 + 1) + v - 0.1);
}

export function computeFspl(distanceKm: number, freqMHz: number): number {
	return 32.45 + 20 * Math.log10(distanceKm) + 20 * Math.log10(freqMHz);
}

export function computeVerdict(
	sightlineClear: boolean,
	fresnelVerdict: 'clear' | 'marginal' | 'obstructed',
	worstAboveLosM: number,
	diffractionDb: number
): 'clear' | 'marginal' | 'diffraction' | 'blocked' {
	if (fresnelVerdict === 'clear' && diffractionDb === 0) {
		return 'clear';
	}
	if (sightlineClear && diffractionDb === 0) {
		return 'marginal';
	}
	if (
		diffractionDb > 0 &&
		(worstAboveLosM <= 20 || diffractionDb <= 22)
	) {
		return 'diffraction';
	}
	return 'blocked';
}

export function solveMinPoleHeight(
	targetGroundM: number,
	towerGroundM: number,
	towerHeightM: number,
	terrainM: number[],
	distM: number[],
	freqMHz: number,
	criterion: 'los' | 'fresnel'
): number | null {
	const towerASL = towerGroundM + towerHeightM;
	const D = distM[distM.length - 1];
	const n = distM.length;

	function constraintSatisfied(h: number): boolean {
		const targetASL = targetGroundM + h;
		const aM = targetASL;
		const bM = towerASL;

		for (let i = 1; i < n - 1; i++) {
			const d = distM[i];
			const losI = aM + ((bM - aM) * d) / D;

			const bulge = (d * (D - d)) / (2 * K * R_EARTH);
			const effectiveTerrain = terrainM[i] + bulge;

			if (criterion === 'los') {
				if (losI < effectiveTerrain) return false;
			} else {
				const d1 = d;
				const d2 = D - d;
				const r1 = computeFresnelRadius(d1, d2, D, freqMHz);
				if (losI < effectiveTerrain + 0.6 * r1) return false;
			}
		}
		return true;
	}

	if (constraintSatisfied(0)) return 0;

	let lo = 0;
	let hi = 200;

	for (let iter = 0; iter < 60; iter++) {
		const mid = (lo + hi) / 2;
		if (constraintSatisfied(mid)) {
			hi = mid;
		} else {
			lo = mid;
		}
	}

	if (!constraintSatisfied(200)) return null;

	return Math.ceil(hi * 10) / 10;
}
