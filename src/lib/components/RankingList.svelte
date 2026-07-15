<script lang="ts">
	import { Badge } from '$lib/components/ui/badge';
	import { store, setSelectedTowerId } from '$lib/state/analysis.svelte';
	import { compassPoint } from '$lib/geo';
	import type { PathAnalysis } from '$lib/rf';

	type RankEntry = { towerId: string; name: string; color: string; result: PathAnalysis };

	let rankings = $derived.by(() => {
		const entries: RankEntry[] = [];
		for (const tower of store.towers) {
			const state = store.towerStates[tower.id];
			if (state?.status === 'loaded' && state.result) {
				entries.push({ towerId: tower.id, name: tower.name, color: tower.color, result: state.result });
			}
		}
		entries.sort((a, b) => a.result.totalDb - b.result.totalDb);
		return entries;
	});

	function verdictLabel(v: string): string {
		switch (v) {
			case 'clear': return 'Clear LOS';
			case 'marginal': return 'Marginal — Fresnel';
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
</script>

<div class="space-y-1.5">
	{#each rankings as entry (entry.towerId)}
		{@const r = entry.result}
		{@const sel = store.selectedTowerId === entry.towerId}
		<button
			class="w-full text-left p-2 rounded-lg border text-sm transition-colors cursor-pointer
				{sel ? 'border-primary/50 bg-primary/5' : 'border-transparent hover:bg-muted/50'}"
			onclick={() => setSelectedTowerId(entry.towerId)}
		>
			<div class="flex items-center gap-2">
				<div class="size-2.5 rounded-full shrink-0" style="background-color: {entry.color}"></div>
				<span class="font-medium truncate flex-1">{entry.name}</span>
				<span class="text-xs tabular-nums text-muted-foreground whitespace-nowrap">
					{(r.distanceM / 1000).toFixed(2)} km &bull; {r.bearingDeg.toFixed(0)}&deg; {compassPoint(r.bearingDeg)}
				</span>
			</div>
			<div class="flex items-center gap-2 mt-1">
				<Badge variant={verdictVariant(r.verdict)} class="text-[10px] px-1.5 py-0">
					{verdictLabel(r.verdict)}
				</Badge>
				<span class="text-xs tabular-nums text-muted-foreground">{r.totalDb.toFixed(1)} dB</span>
			</div>
		</button>
	{/each}

	{#if rankings.length === 0}
		<p class="text-xs text-muted-foreground text-center py-2">
			Click Analyze to compute path profiles.
		</p>
	{/if}
</div>
