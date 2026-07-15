<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Root, Trigger, Content, Portal } from '$lib/components/ui/popover';
	import TargetForm from './TargetForm.svelte';
	import TowerRepeater from './TowerRepeater.svelte';
	import AssumptionsPanel from './AssumptionsPanel.svelte';
	import RankingList from './RankingList.svelte';
	import { store, triggerAnalysis } from '$lib/state/analysis.svelte';
	import { encodeShareState } from '$lib/share';

	let copied = $state(false);

	function copyShareLink() {
		const encoded = encodeShareState(store.target, store.targetLabel, store.towers, store.assumptions);
		const url = `${window.location.origin}${window.location.pathname}?s=${encoded}`;
		navigator.clipboard.writeText(url);
		copied = true;
		setTimeout(() => (copied = false), 2000);
	}
</script>

<aside class="flex flex-col h-full bg-card border-r overflow-y-auto">
	<div class="p-4 space-y-4">
		<div class="flex items-start justify-between gap-2">
			<div>
				<h1 class="text-lg font-semibold tracking-tight">SignalScout</h1>
				<p class="text-xs text-muted-foreground mt-0.5">
					Find the best cell tower to aim at
				</p>
			</div>
			<Root>
				<Trigger class="size-7 rounded-md border text-xs font-medium cursor-pointer hover:bg-muted">
					?
				</Trigger>
				<Portal>
					<Content class="w-72 text-sm p-3 space-y-2">
						<p class="font-medium">How it works</p>
						<ol class="list-decimal pl-4 space-y-1 text-xs text-muted-foreground">
							<li>Enter your location using the form below</li>
							<li>Add cell tower coordinates from <a href="https://cellmapper.net" target="_blank" class="underline">cellmapper.net</a></li>
							<li>Click Analyze, then click a tower pin or list item to see the terrain profile</li>
						</ol>
					</Content>
				</Portal>
			</Root>
		</div>

		<hr class="border-border" />

		<TargetForm />
		<TowerRepeater />
		<AssumptionsPanel />

		<Button
			class="w-full"
			disabled={!store.target || store.towers.length === 0}
			onclick={() => triggerAnalysis()}
		>
			{store.analyzed ? 'Re-analyze paths' : 'Analyze paths'}
		</Button>

		{#if store.target && store.towers.length > 0 && !store.analyzed}
			<p class="text-xs text-muted-foreground text-center">
				Ready: {store.towers.length} tower{store.towers.length !== 1 ? 's' : ''} configured
			</p>
		{/if}

		{#if store.analyzed && store.towers.length > 0}
			<hr class="border-border" />
			<div class="flex items-center justify-between">
				<span class="text-sm font-medium">Results</span>
				<Button size="sm" variant="ghost" onclick={copyShareLink}>
					{copied ? 'Copied!' : 'Copy share link'}
				</Button>
			</div>
			<RankingList />
			{#if !store.selectedTowerId}
				<p class="text-xs text-muted-foreground text-center py-2">
					Select a tower from the list or click a pin on the map to see terrain profile.
				</p>
			{/if}
		{/if}

		<!-- attribution (subtle) -->
		<div class="mt-auto pt-4">
			<p class="text-[10px] text-muted-foreground/60 leading-relaxed">
				Map: &copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" class="underline">OpenStreetMap</a> contributors.
				Elevation data: <a href="https://open-meteo.com/" target="_blank" class="underline">Open-Meteo</a> / Copernicus GLO-90 DEM (90 m). Fine ridges may be smoothed; vegetation/buildings invisible. Verify with a real-world signal test before construction.
			</p>
		</div>
	</div>
</aside>
