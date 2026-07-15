<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import TowerDetail from './TowerDetail.svelte';
	import { store, fetchTowerElevation, setSelectedTowerId } from '$lib/state/analysis.svelte';

	let _prevSelected = $state<string | null>(null);

	$effect(() => {
		const id = store.selectedTowerId;
		if (id && id !== _prevSelected) {
			_prevSelected = id;
			fetchTowerElevation(id);
		}
		if (!id) _prevSelected = null;
	});

	let hasSelection = $derived(!!store.selectedTowerId);
	let isReady = $derived.by(() => {
		if (!store.selectedTowerId) return false;
		const s = store.towerStates[store.selectedTowerId];
		return s?.status === 'loaded' || s?.status === 'error';
	});

	function close() {
		setSelectedTowerId(null);
	}
</script>

<!-- desktop: inline panel between sidebar and map -->
<aside
	class="hidden md:flex flex-col bg-card border-r overflow-hidden transition-all duration-300 ease-in-out
		{hasSelection && isReady ? 'w-[760px] opacity-100' : 'w-0 opacity-0 border-transparent'}"
>
	{#if hasSelection && isReady}
		<div class="flex flex-col h-full">
			<div class="flex items-center justify-between px-3 pt-3 pb-1 shrink-0">
				<span class="text-sm font-medium">Analysis</span>
				<Button variant="ghost" size="icon-sm" onclick={close} title="Close">&times;</Button>
			</div>
			<div class="flex-1 overflow-y-auto px-3 pb-3">
				<TowerDetail />
			</div>
		</div>
	{/if}
</aside>

<!-- mobile: full-screen overlay -->
{#if hasSelection && isReady}
	<aside class="md:hidden fixed inset-0 z-50 flex flex-col bg-card">
		<div class="flex items-center justify-between px-4 pt-4 pb-2 shrink-0 border-b">
			<span class="text-sm font-medium">Analysis</span>
			<Button variant="ghost" size="icon-sm" onclick={close} title="Close">&times;</Button>
		</div>
		<div class="flex-1 overflow-y-auto px-4 pb-6">
			<TowerDetail />
		</div>
	</aside>
{/if}
