<script lang="ts">
	import { Card } from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import { store, retryTower } from '$lib/state/analysis.svelte';
	import { compassPoint } from '$lib/geo';
	import ProfileChart from './ProfileChart.svelte';

	let tower = $derived(store.towers.find((t) => t.id === store.selectedTowerId));
	let state = $derived(store.selectedTowerId ? store.towerStates[store.selectedTowerId] : undefined);
	let result = $derived(state?.result);

	function fmtKm(m: number): string { return (m / 1000).toFixed(2) + ' km'; }
	function fmtM(m: number): string { return m.toFixed(1) + ' m'; }
	function fmtDb(db: number): string { return db.toFixed(1) + ' dB'; }

	function verdictLabel(v: string): string {
		switch (v) {
			case 'clear': return 'Clear LOS';
			case 'marginal': return 'Marginal — Fresnel obstructed';
			case 'diffraction': return 'Diffraction path';
			case 'blocked': return 'Severely blocked';
			default: return v;
		}
	}

	function verdictVariant(v: string): 'default' | 'outline' | 'secondary' | 'destructive' {
		switch (v) {
			case 'clear': return 'default';
			case 'marginal': return 'secondary';
			case 'diffraction': return 'outline';
			case 'blocked': return 'destructive';
			default: return 'outline';
		}
	}

	function poleStr(v: number | null): string {
		if (v === null) return '> 200 m — not achievable';
		return v.toFixed(1) + ' m';
	}

	function interpretation(r: NonNullable<typeof result>): string {
		const w = r.worst;
		const parts: string[] = [];

		if (r.verdict === 'clear') {
			parts.push('The path is clear with full line-of-sight and good Fresnel zone clearance.');
		} else if (r.verdict === 'marginal') {
			parts.push('The sightline is clear but the Fresnel zone is partially obstructed. This may cause minor signal degradation.');
		} else {
			parts.push('Full line-of-sight is not achievable with the current pole height.');
			if (w) {
				const aboveLos = w.aboveLosM;
				parts.push(`The worst obstruction sits ${fmtM(aboveLos)} above the sightline at ${fmtKm(w.dM)} from target, causing an estimated ${fmtDb(r.diffractionDb)} of knife-edge diffraction loss at ${store.assumptions.freqMHz} MHz.`);
			}
			if (r.obstructionZones > 1) {
				parts.push('Multiple obstruction zones were detected — real loss may be higher than this single-edge estimate.');
			}
			if (r.diffractionDb <= 22) {
				parts.push('Despite the obstruction, a usable diffracted link is likely.');
			} else {
				parts.push('Signal loss is substantial — a taller pole or alternative tower may be needed.');
			}
		}

		if (r.minPoleLosM !== null && r.minPoleLosM <= 30) {
			parts.push(`A ${fmtM(r.minPoleLosM)} pole would achieve bare line-of-sight.`);
		}

		return parts.join(' ');
	}
</script>

{#if !tower || !result}
	<!-- loading state -->
	{#if state?.status === 'loading'}
		<Card class="p-3">
			<div class="space-y-2 animate-pulse">
				<div class="h-3 bg-muted rounded w-1/3"></div>
				<div class="h-32 bg-muted rounded"></div>
				<div class="grid grid-cols-2 gap-1.5">
					<div class="h-3 bg-muted rounded"></div><div class="h-3 bg-muted rounded"></div>
					<div class="h-3 bg-muted rounded"></div><div class="h-3 bg-muted rounded"></div>
				</div>
			</div>
			<p class="text-xs text-muted-foreground mt-2">Fetching elevation data...</p>
		</Card>
	{:else if state?.status === 'error'}
		<Card class="p-3 border-destructive/30">
			<p class="text-xs text-destructive mb-2">Could not fetch elevation data: {state.error || 'Unknown error'}</p>
			<Button size="sm" variant="outline" onclick={() => store.selectedTowerId && retryTower(store.selectedTowerId)}>
				Retry
			</Button>
		</Card>
	{:else}
		<Card class="p-3">
			<p class="text-xs text-muted-foreground">Loading...</p>
		</Card>
	{/if}
{:else}
	{@const r = result}
	<div class="space-y-3">
		<!-- verdict + name -->
		<div class="flex items-center gap-2">
			<div class="size-2.5 rounded-full shrink-0" style="background-color: {tower.color}"></div>
			<span class="font-medium text-sm">{tower.name}</span>
			<Badge variant={verdictVariant(r.verdict)} class="text-[10px] px-1.5 py-0 ml-auto">
				{verdictLabel(r.verdict)}
			</Badge>
		</div>

		<!-- profile chart -->
		<div class="border rounded-lg overflow-hidden bg-background">
			<ProfileChart {result} color={tower.color} />
		</div>

		<!-- DEM caveat -->
		<p class="text-[10px] text-muted-foreground/60">DEM: Copernicus GLO-90 (90 m). Narrow ridges may read low; vegetation invisible.</p>

		<!-- stat grid -->
		<div class="grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs p-2 border rounded-lg">
			<span class="text-muted-foreground">Distance</span>
			<span class="tabular-nums text-right">{fmtKm(r.distanceM)}</span>

			<span class="text-muted-foreground">Bearing</span>
			<span class="tabular-nums text-right">{r.bearingDeg.toFixed(0)}&deg; {compassPoint(r.bearingDeg)}</span>

			<span class="text-muted-foreground">Tower base elev.</span>
			<span class="tabular-nums text-right">{fmtM(r.samples[r.samples.length - 1].elevM)} ASL</span>

			{#if r.worst}
				<span class="text-muted-foreground">Worst obstruction</span>
				<span class="tabular-nums text-right">
					{fmtM(r.worst.elevM)} at {fmtKm(r.worst.dM)}<br />
					<span class="text-destructive">+{fmtM(r.worst.aboveLosM)} above LOS</span>
				</span>
			{/if}

			<span class="text-muted-foreground">Min pole (LOS)</span>
			<span class="tabular-nums text-right">{poleStr(r.minPoleLosM)}</span>

			<span class="text-muted-foreground">Min pole (60% Fresnel)</span>
			<span class="tabular-nums text-right">{poleStr(r.minPoleFresnelM)}</span>

			<span class="text-muted-foreground">Diffraction loss</span>
			<span class="tabular-nums text-right">{fmtDb(r.diffractionDb)}</span>

			<span class="text-muted-foreground">Free-space loss</span>
			<span class="tabular-nums text-right">{fmtDb(r.fsplDb)}</span>

			<span class="text-muted-foreground font-medium">Total path loss</span>
			<span class="tabular-nums text-right font-medium">{fmtDb(r.totalDb)}</span>
		</div>

		{#if r.obstructionZones > 1}
			<p class="text-[10px] text-destructive">
				Multiple obstruction zones detected — real loss may be higher than this single-edge estimate.
			</p>
		{/if}

		<!-- interpretation -->
		<p class="text-xs leading-relaxed text-muted-foreground">
			{interpretation(r)}
		</p>
	</div>
{/if}
