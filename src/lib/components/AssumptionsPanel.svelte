<script lang="ts">
	import { store, updateAssumptions } from '$lib/state/analysis.svelte';

	const FREQ_OPTIONS = [
		{ value: 700, label: '700 MHz' },
		{ value: 850, label: '850 MHz' },
		{ value: 1800, label: '1800 MHz' },
		{ value: 2100, label: '2100 MHz' },
		{ value: 2600, label: '2600 MHz' },
		{ value: 3500, label: '3500 MHz' },
	];
</script>

<div class="space-y-3 border rounded-lg p-3">
	<span class="text-sm font-medium">Configuration</span>

	<div class="space-y-1.5">
		<label for="pole-slider" class="text-xs font-medium flex justify-between">
			<span>Antenna height at target</span>
			<span class="text-muted-foreground tabular-nums">{store.assumptions.poleHeightM} m</span>
		</label>
		<input
			id="pole-slider"
			type="range"
			min="0" max="30" step="0.5"
			value={store.assumptions.poleHeightM}
			oninput={(e) => updateAssumptions({ poleHeightM: Number(e.currentTarget.value) })}
			class="w-full h-1.5 bg-muted rounded-full appearance-none cursor-pointer accent-primary
				[&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:size-3.5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:border [&::-webkit-slider-thumb]:border-ring [&::-webkit-slider-thumb]:shadow-sm
				[&::-moz-range-thumb]:size-3.5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-white [&::-moz-range-thumb]:border [&::-moz-range-thumb]:border-ring"
		/>
	</div>

	<div class="space-y-1.5">
		<label for="tower-slider" class="text-xs font-medium flex justify-between">
			<span>Tower structure height</span>
			<span class="text-muted-foreground tabular-nums">{store.assumptions.towerHeightM} m</span>
		</label>
		<input
			id="tower-slider"
			type="range"
			min="10" max="60" step="0.5"
			value={store.assumptions.towerHeightM}
			oninput={(e) => updateAssumptions({ towerHeightM: Number(e.currentTarget.value) })}
			class="w-full h-1.5 bg-muted rounded-full appearance-none cursor-pointer accent-primary
				[&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:size-3.5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:border [&::-webkit-slider-thumb]:border-ring [&::-webkit-slider-thumb]:shadow-sm
				[&::-moz-range-thumb]:size-3.5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-white [&::-moz-range-thumb]:border [&::-moz-range-thumb]:border-ring"
		/>
	</div>

	<div class="space-y-1.5">
		<label for="freq-select" class="text-xs font-medium">Frequency band</label>
		<select
			id="freq-select"
			class="w-full text-sm border rounded-lg px-2.5 py-1.5 bg-background"
			value={store.assumptions.freqMHz}
			onchange={(e) => updateAssumptions({ freqMHz: Number(e.currentTarget.value) })}
		>
			{#each FREQ_OPTIONS as opt}
				<option value={opt.value}>{opt.label}</option>
			{/each}
		</select>
	</div>
</div>
