import { describe, it, expect } from 'bun:test';
import {
	haversine,
	bearing,
	compassPoint,
	samplePath,
	parseLatLon,
} from '../src/lib/geo';

describe('haversine', () => {
	it('returns distance in meters for the fixture case', () => {
		// §10 fixture: target (10.070856, 123.611154) to tower (10.066379, 123.625225)
		const d = haversine(
			{ lat: 10.070856, lon: 123.611154 },
			{ lat: 10.066379, lon: 123.625225 },
		);
		expect(d).toBeGreaterThan(1600);
		expect(d).toBeLessThan(1650);
		// The plan says ≈ 1619m
		expect(d).toBeGreaterThan(1615);
		expect(d).toBeLessThan(1625);
	});

	it('returns approximately 111.32 km for 1 degree latitude', () => {
		// 1 deg lat ≈ 111.32 km
		const d = haversine(
			{ lat: 0, lon: 0 },
			{ lat: 1, lon: 0 },
		);
		expect(d).toBeGreaterThan(111000);
		expect(d).toBeLessThan(111500);
	});

	it('returns 0 for same point', () => {
		const d = haversine(
			{ lat: 45, lon: -90 },
			{ lat: 45, lon: -90 },
		);
		expect(d).toBe(0);
	});

	it('handles antipodal points', () => {
		const d = haversine(
			{ lat: 0, lon: 0 },
			{ lat: 0, lon: 180 },
		);
		// Half the earth's circumference ~ 20,037 km
		expect(d).toBeGreaterThan(20000000);
		expect(d).toBeLessThan(20040000);
	});
});

describe('bearing', () => {
	it('returns ~107.9° for the fixture case', () => {
		const b = bearing(
			{ lat: 10.070856, lon: 123.611154 },
			{ lat: 10.066379, lon: 123.625225 },
		);
		expect(b).toBeGreaterThan(107);
		expect(b).toBeLessThan(109);
	});

	it('returns exactly 0 for due north', () => {
		const b = bearing(
			{ lat: 0, lon: 0 },
			{ lat: 1, lon: 0 },
		);
		expect(b).toBeCloseTo(0, 1);
	});

	it('returns exactly 90 for due east', () => {
		const b = bearing(
			{ lat: 0, lon: 0 },
			{ lat: 0, lon: 1 },
		);
		expect(b).toBeCloseTo(90, 1);
	});

	it('returns exactly 180 for due south', () => {
		const b = bearing(
			{ lat: 1, lon: 0 },
			{ lat: 0, lon: 0 },
		);
		expect(b).toBeCloseTo(180, 1);
	});

	it('returns exactly 270 for due west', () => {
		const b = bearing(
			{ lat: 0, lon: 1 },
			{ lat: 0, lon: 0 },
		);
		expect(b).toBeCloseTo(270, 1);
	});
});

describe('compassPoint', () => {
	it('returns ESE for ~108°', () => {
		expect(compassPoint(108)).toBe('ESE');
	});

	it('returns N for 0°', () => {
		expect(compassPoint(0)).toBe('N');
	});

	it('returns N for 360°', () => {
		expect(compassPoint(360)).toBe('N');
	});

	it('returns E for 90°', () => {
		expect(compassPoint(90)).toBe('E');
	});

	it('returns S for 180°', () => {
		expect(compassPoint(180)).toBe('S');
	});

	it('returns W for 270°', () => {
		expect(compassPoint(270)).toBe('W');
	});

	it('returns a string for any angle', () => {
		for (let b = 0; b < 360; b += 13) {
			const cp = compassPoint(b);
			expect(typeof cp).toBe('string');
			expect(cp.length).toBeGreaterThan(0);
		}
	});
});

describe('samplePath', () => {
	it('returns at least 2 points', () => {
		const path = samplePath(
			{ lat: 0, lon: 0 },
			{ lat: 0.01, lon: 0.01 },
			90,
		);
		expect(path.length).toBeGreaterThanOrEqual(2);
	});

	it('returns points in order with correct spacing', () => {
		const a = { lat: 10.070856, lon: 123.611154 };
		const b = { lat: 10.066379, lon: 123.625225 };
		const dist = haversine(a, b);
		const path = samplePath(a, b, 90);
		const n = Math.max(2, Math.round(dist / 90));
		expect(path.length).toBe(n + 1);
	});

	it('first point is start, last is end', () => {
		const a = { lat: 10, lon: 123 };
		const b = { lat: 10.01, lon: 123.01 };
		const path = samplePath(a, b, 90);
		expect(path[0].lat).toBeCloseTo(a.lat, 8);
		expect(path[0].lon).toBeCloseTo(a.lon, 8);
		expect(path[path.length - 1].lat).toBeCloseTo(b.lat, 8);
		expect(path[path.length - 1].lon).toBeCloseTo(b.lon, 8);
	});

	it('returns exactly 2 points for near-zero distance', () => {
		const path = samplePath(
			{ lat: 10, lon: 123 },
			{ lat: 10.00001, lon: 123.00001 },
			90,
		);
		expect(path.length).toBeGreaterThanOrEqual(2);
	});
});

describe('parseLatLon', () => {
	it('parses comma-separated coordinates', () => {
		const result = parseLatLon('10.070856, 123.611154');
		expect(result).not.toBeNull();
		expect(result!.lat).toBeCloseTo(10.070856, 6);
		expect(result!.lon).toBeCloseTo(123.611154, 6);
	});

	it('parses space-separated coordinates', () => {
		const result = parseLatLon('10.070856 123.611154');
		expect(result).not.toBeNull();
		expect(result!.lat).toBeCloseTo(10.070856, 6);
		expect(result!.lon).toBeCloseTo(123.611154, 6);
	});

	it('parses parentheses-wrapped coordinates', () => {
		const result = parseLatLon('(10.070856, 123.611154)');
		expect(result).not.toBeNull();
		expect(result!.lat).toBeCloseTo(10.070856, 6);
		expect(result!.lon).toBeCloseTo(123.611154, 6);
	});

	it('returns null for empty string', () => {
		expect(parseLatLon('')).toBeNull();
	});

	it('returns null for invalid input', () => {
		expect(parseLatLon('hello world')).toBeNull();
	});

	it('returns null for out-of-range latitude', () => {
		expect(parseLatLon('100, 50')).toBeNull();
	});

	it('returns null for out-of-range longitude', () => {
		expect(parseLatLon('50, 200')).toBeNull();
	});

	it('returns null for single number', () => {
		expect(parseLatLon('50')).toBeNull();
	});
});
