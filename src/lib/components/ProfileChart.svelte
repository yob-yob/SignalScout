<script lang="ts">
	import type { PathAnalysis } from '$lib/rf';

	let { result, color }: { result: PathAnalysis; color: string } = $props();

	const PAD = { top: 28, right: 16, bottom: 36, left: 44 };
	const W = 720;
	const H = 280;
	const PW = W - PAD.left - PAD.right;
	const PH = H - PAD.top - PAD.bottom;

	let data = $derived.by(() => {
		const n = result.samples.length;
		const items: { dKm: number; elevM: number; losM: number; f60Lo: number }[] = [];
		for (let i = 0; i < n; i++) {
			const dKm = result.samples[i].dM / 1000;
			items.push({ dKm, elevM: result.samples[i].elevM, losM: result.losM[i], f60Lo: result.losM[i] - result.fresnel60M[i] });
		}
		return items;
	});

	let xDomain = $derived.by(() => {
		const ds = data.map((d) => d.dKm);
		return [Math.min(...ds), Math.max(...ds)];
	});

	let yDomain = $derived.by(() => {
		const allY = data.flatMap((d) => [d.elevM, d.losM, d.f60Lo]);
		const min = Math.min(...allY);
		const max = Math.max(...allY);
		const pad = (max - min) * 0.15 || 10;
		return [min - pad, max + pad];
	});

	function xScale(dKm: number): number {
		return PAD.left + ((dKm - xDomain[0]) / (xDomain[1] - xDomain[0])) * PW;
	}
	function yScale(elevM: number): number {
		return PAD.top + PH - ((elevM - yDomain[0]) / (yDomain[1] - yDomain[0])) * PH;
	}
	function svgPath(points: { x: number; y: number }[]): string {
		if (points.length === 0) return '';
		return points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
	}
	function yGridLines(): { y: number; label: string }[] {
		const [min, max] = yDomain;
		const step = Math.max(10, Math.round((max - min) / 4 / 10) * 10);
		const lines: { y: number; label: string }[] = [];
		for (let v = Math.ceil(min / step) * step; v <= max; v += step) {
			lines.push({ y: yScale(v), label: `${v} m` });
		}
		return lines;
	}

	let losObstructed = $derived(result.verdict !== 'clear' && result.worst !== null);
	let losColor = $derived(losObstructed ? '#dc2626' : '#16a34a');

	// Build derived strings
	let dTerrain = $derived(svgPath(data.map((d) => ({ x: xScale(d.dKm), y: yScale(d.elevM) }))));
	let dLos = $derived(svgPath(data.map((d) => ({ x: xScale(d.dKm), y: yScale(d.losM) }))));
	let dFresnel = $derived(svgPath(data.map((d) => ({ x: xScale(d.dKm), y: yScale(d.f60Lo) }))));

	let dArea = $derived.by(() => {
		const n = data.length;
		if (n === 0) return '';
		const bottom = yScale(yDomain[0]);
		const pts = data.map((d) => `${xScale(d.dKm).toFixed(1)},${yScale(d.elevM).toFixed(1)}`);
		const firstX = xScale(data[0].dKm).toFixed(1);
		const lastX = xScale(data[n - 1].dKm).toFixed(1);
		return `M${firstX},${bottom.toFixed(1)} L${pts.join(' L')} L${lastX},${bottom.toFixed(1)} Z`;
	});

	let targetPt = $derived({ x: xScale(data[0].dKm) || PAD.left, y: yScale(data[0].losM) || PAD.top });
	let towerPt = $derived({ x: xScale(data[data.length - 1].dKm) || (W - PAD.right), y: yScale(data[data.length - 1].losM) || PAD.top });

	let worstPt = $derived.by(() => {
		const w = result.worst;
		if (!w) return null;
		return { x: xScale(w.dM / 1000), y: yScale(w.elevM), label: `+${w.aboveLosM.toFixed(0)} m` };
	});

	let xMaxLabel = $derived(xDomain[1].toFixed(2));
</script>

<svg viewBox="0 0 {W} {H}" class="w-full h-auto bg-background" role="img" aria-label="Terrain profile chart">
	<!-- grid lines -->
	{#each yGridLines() as gl (gl.y)}
		<line x1={PAD.left} y1={gl.y} x2={W - PAD.right} y2={gl.y} stroke="#e5e7eb" stroke-width="0.5" />
		<text x={PAD.left - 3} y={gl.y + 3} text-anchor="end" class="fill-muted-foreground" font-size="9">{gl.label}</text>
	{/each}

	<!-- terrain area -->
	<path d={dArea} fill="#c8b89a" fill-opacity="0.85" stroke="#a8987a" stroke-width="0.5" />

	<!-- fresnel boundary -->
	<path d={dFresnel} fill="none" stroke="#94a3b8" stroke-width="0.5" stroke-dasharray="2 2" opacity="0.6" />

	<!-- LOS -->
	<path d={dLos} fill="none" stroke={losColor} stroke-width="1.5" stroke-dasharray={losObstructed ? '4 2' : 'none'} />

	<!-- endpoints -->
	<circle cx={targetPt.x} cy={targetPt.y} r="3" fill="#dc2626" stroke="#fff" stroke-width="1" />
	<text x={targetPt.x} y={targetPt.y - 8} text-anchor="middle" class="fill-foreground font-medium" font-size="9">{data[0].losM.toFixed(0)} m</text>
	<circle cx={towerPt.x} cy={towerPt.y} r="3" fill={color} stroke="#fff" stroke-width="1" />
	<text x={towerPt.x} y={towerPt.y - 8} text-anchor="middle" class="fill-foreground font-medium" font-size="9">{data[data.length - 1].losM.toFixed(0)} m</text>

	<!-- worst obstruction -->
	{#if worstPt}
		<circle cx={worstPt.x} cy={worstPt.y} r="3" fill="#dc2626" stroke="#fff" stroke-width="1" />
		<text x={worstPt.x + 5} y={worstPt.y - 8} class="fill-destructive font-medium" font-size="9">{worstPt.label}</text>
	{/if}

	<!-- x-axis -->
	<text x={PAD.left} y={H - 4} text-anchor="middle" class="fill-muted-foreground" font-size="9">0</text>
	<text x={W - PAD.right} y={H - 4} text-anchor="middle" class="fill-muted-foreground" font-size="9">{xMaxLabel} km</text>
	<text x={W / 2} y={H - 4} text-anchor="middle" class="fill-muted-foreground" font-size="9">Distance from target</text>
	<text x={8} y={H / 2} text-anchor="middle" class="fill-muted-foreground" font-size="9" transform="rotate(-90, 8, {H / 2})">Elevation (m ASL)</text>
</svg>
