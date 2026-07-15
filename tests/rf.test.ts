import { describe, it, expect } from 'bun:test';
import {
	computeClearance,
	computeFresnelRadius,
	computeFresnelClearance,
	computeKnifeEdge,
	computeFspl,
	computeVerdict,
	solveMinPoleHeight,
} from '../src/lib/rf';

/**
 * §10 Validation Fixture
 *
 * Target: 10.070856, 123.611154  (ground 78 m ASL)
 * Tower:  10.066379, 123.625225  (ground 25 m ASL)
 * Distance ≈ 1619 m
 * Bearing ≈ 107.9°
 * Pole 15 m, tower 35 m, 700 MHz
 *
 * 35-sample elevation array (from the plan):
 */
const FIXTURE_ELEVATIONS = [
	78, 71, 84, 84, 85, 85, 86, 73, 71, 71,
	74, 74, 74, 60, 63, 63, 57, 57, 42, 42,
	31, 31, 31, 31, 31, 31, 80, 80, 55, 55,
	31, 31, 28, 28, 25,
];

const FIXTURE_DISTANCE = 1619;
const POLE = 15;
const TOWER = 35;
const FREQ = 700;

function makeDistArray(totalM: number, n: number): number[] {
	const d: number[] = [];
	for (let i = 0; i < n; i++) {
		d.push((i * totalM) / (n - 1));
	}
	return d;
}

const distM = makeDistArray(FIXTURE_DISTANCE, FIXTURE_ELEVATIONS.length);

const targetASL = FIXTURE_ELEVATIONS[0] + POLE;
const towerASL = FIXTURE_ELEVATIONS[FIXTURE_ELEVATIONS.length - 1] + TOWER;

describe('§10 fixture: computeClearance', () => {
	const { losM, clearanceM } = computeClearance(
		FIXTURE_ELEVATIONS,
		distM,
		targetASL,
		towerASL,
		false, // no curvature for fixture v1
	);

	it('computes correct target LOS', () => {
		expect(losM[0]).toBeCloseTo(targetASL, 2);
		expect(losM[losM.length - 1]).toBeCloseTo(towerASL, 2);
	});

	it('finds the ridge obstruction at ~1.24-1.29 km', () => {
		let worstIdx = 0;
		let worstClearance = Infinity;
		for (let i = 1; i < clearanceM.length - 1; i++) {
			if (clearanceM[i] < worstClearance) {
				worstClearance = clearanceM[i];
				worstIdx = i;
			}
		}
		// The worst clearance should be negative (obstructed)
		expect(worstClearance).toBeLessThan(0);
		// Ridge is at index 26-27 (80m elevations)
		expect(worstIdx).toBeGreaterThanOrEqual(26);
		expect(worstIdx).toBeLessThanOrEqual(27);
		// Distance to ridge ≈ 1.24-1.29 km from target
		expect(distM[worstIdx]).toBeGreaterThan(1200);
		expect(distM[worstIdx]).toBeLessThan(1330);
	});

	it('ridge is ~12-13 m above sightline', () => {
		let minClearance = Infinity;
		for (let i = 1; i < clearanceM.length - 1; i++) {
			if (clearanceM[i] < minClearance) {
				minClearance = clearanceM[i];
			}
		}
		// clearance = los - terrain, negative means terrain above LOS
		const aboveLos = -minClearance;
		expect(aboveLos).toBeGreaterThan(11);
		expect(aboveLos).toBeLessThan(14);
	});
});

describe('§10 fixture: Fresnel zone', () => {
	it('computes Fresnel radius for a midpoint point', () => {
		const r = computeFresnelRadius(800, 819, 1619, 700);
		// For f=0.7 GHz, D=1.619 km, d1=0.8 km, d2=0.819 km:
		// r1 = 17.32 * sqrt(0.8*0.819 / (0.7*1.619))
		//    = 17.32 * sqrt(0.6552 / 1.1333)
		//    = 17.32 * sqrt(0.5782)
		//    = 17.32 * 0.7604
		//    ≈ 13.17 m
		expect(r).toBeGreaterThan(12);
		expect(r).toBeLessThan(14);
	});

	it('verdict is obstructed for the fixture path', () => {
		const { losM } = computeClearance(
			FIXTURE_ELEVATIONS, distM, targetASL, towerASL, false,
		);
		const { verdict } = computeFresnelClearance(
			distM, losM, FIXTURE_ELEVATIONS, FREQ,
		);
		expect(verdict).toBe('obstructed');
	});
});

describe('§10 fixture: knife-edge diffraction', () => {
	const { losM } = computeClearance(
		FIXTURE_ELEVATIONS, distM, targetASL, towerASL, false,
	);
	const { worst, zones, lossDb } = computeKnifeEdge(
		distM, FIXTURE_ELEVATIONS, losM, FREQ,
	);

	it('worst obstruction at ridge (~1.24-1.29 km from target)', () => {
		expect(worst).not.toBeNull();
		expect(worst!.dM).toBeGreaterThan(1200);
		expect(worst!.dM).toBeLessThan(1330);
	});

	it('ridge elevation is 80 m', () => {
		expect(worst!.elevM).toBe(80);
	});

	it('ridge is +12-13 m above sightline', () => {
		expect(worst!.aboveLosM).toBeGreaterThan(11);
		expect(worst!.aboveLosM).toBeLessThan(14);
	});

	it('v ≈ 1.5-1.8', () => {
		expect(worst!.v).toBeGreaterThan(1.4);
		expect(worst!.v).toBeLessThan(1.9);
	});

	it('knife-edge loss ≈ 17-18 dB', () => {
		expect(lossDb).toBeGreaterThan(16.5);
		expect(lossDb).toBeLessThan(18.5);
	});

	it('finds at least 1 obstruction zone', () => {
		expect(zones).toBeGreaterThanOrEqual(1);
	});
});

describe('§10 fixture: FSPL', () => {
	const fspl = computeFspl(1.619, 700);

	it('approx 94 dB', () => {
		expect(fspl).toBeGreaterThan(93);
		expect(fspl).toBeLessThan(95);
	});
});

describe('§10 fixture: total path loss', () => {
	const { losM } = computeClearance(
		FIXTURE_ELEVATIONS, distM, targetASL, towerASL, false,
	);
	const { lossDb } = computeKnifeEdge(
		distM, FIXTURE_ELEVATIONS, losM, FREQ,
	);
	const fspl = computeFspl(1.619, FREQ);
	const total = fspl + lossDb;

	it('total ≈ 111-112 dB', () => {
		expect(total).toBeGreaterThan(110);
		expect(total).toBeLessThan(113);
	});
});

describe('§10 fixture: verdict', () => {
	it('verdict is diffraction', () => {
		const { losM } = computeClearance(
			FIXTURE_ELEVATIONS, distM, targetASL, towerASL, false,
		);
		const worstIdx = 26;
		const aboveLosM = FIXTURE_ELEVATIONS[worstIdx] - losM[worstIdx];
		const { lossDb } = computeKnifeEdge(
			distM, FIXTURE_ELEVATIONS, losM, FREQ,
		);
		const { verdict: fresnelVerdict } = computeFresnelClearance(
			distM, losM, FIXTURE_ELEVATIONS, FREQ,
		);

		const v = computeVerdict(false, fresnelVerdict, aboveLosM, lossDb);
		expect(v).toBe('diffraction');
	});
});

describe('§10 fixture: min pole height for bare LOS', () => {
	it('reports tall pole requirement (not achievable territory)', () => {
		const result = solveMinPoleHeight(
			FIXTURE_ELEVATIONS[0],
			FIXTURE_ELEVATIONS[FIXTURE_ELEVATIONS.length - 1],
			TOWER,
			FIXTURE_ELEVATIONS,
			distM,
			FREQ,
			'los',
		);
		// Requires a pole far beyond the realistic 30 m max
		expect(result).not.toBeNull();
		expect(result!).toBeGreaterThan(50);
		expect(result!).toBeLessThan(100);
	});
});

describe('rf unit tests', () => {
	it('computeClearance returns correct LOS for flat terrain', () => {
		const terrain = [10, 10, 10, 10, 10];
		const dist = [0, 250, 500, 750, 1000];
		const { losM } = computeClearance(terrain, dist, 10, 20, false);
		expect(losM[0]).toBeCloseTo(10, 2);
		expect(losM[4]).toBeCloseTo(20, 2);
		expect(losM[2]).toBeCloseTo(15, 2);
	});

	it('computeFspl gives known reference value', () => {
		// 1 km at 1000 MHz
		const fspl = computeFspl(1, 1000);
		// 32.45 + 0 + 60 = 92.45 dB
		expect(fspl).toBeCloseTo(92.45, 2);
	});

	it('computeVerdict: clear when no obstruction and fresnel clear', () => {
		const v = computeVerdict(true, 'clear', 0, 0);
		expect(v).toBe('clear');
	});

	it('computeVerdict: marginal when sightline clear but fresnel obstructed', () => {
		const v = computeVerdict(true, 'marginal', -5, 0);
		expect(v).toBe('marginal');
	});

	it('computeVerdict: diffraction when small loss', () => {
		const v = computeVerdict(false, 'obstructed', 12, 17);
		expect(v).toBe('diffraction');
	});

	it('computeVerdict: blocked when severe obstruction', () => {
		const v = computeVerdict(false, 'obstructed', 30, 30);
		expect(v).toBe('blocked');
	});

	it('solveMinPoleHeight: returns 0 when already clear', () => {
		const terrain = [10, 5, 5, 5, 10];
		const dist = [0, 250, 500, 750, 1000];
		const result = solveMinPoleHeight(10, 10, 0, terrain, dist, 700, 'los');
		expect(result).toBe(0);
	});

	it('solveMinPoleHeight: returns null when >200 m', () => {
		// Extremely obstructed path — huge ridge in middle
		const terrain = [10, 500, 500, 500, 10];
		const dist = [0, 250, 500, 750, 1000];
		const result = solveMinPoleHeight(10, 10, 0, terrain, dist, 700, 'los');
		expect(result).toBeNull();
	});

	it('Fresnel radius is larger at lower frequencies', () => {
		const r700 = computeFresnelRadius(400, 400, 800, 700);
		const r2100 = computeFresnelRadius(400, 400, 800, 2100);
		expect(r700).toBeGreaterThan(r2100);
	});
});
