<script lang="ts">
	import { Slider } from '$lib/components/ui/slider';
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
		<span class="text-xs font-medium flex justify-between">
			<span>Antenna height at target</span>
			<span class="text-muted-foreground tabular-nums">{store.assumptions.poleHeightM} m</span>
		</span>
		<!-- svelte-ignore a11y_label_has_associated_control -->
		<Slider
			type="multiple"
			value={[store.assumptions.poleHeightM]}
			min={0}
			max={30}
			step={0.5}
			{...{ onvaluechange: (e: { value: number[] }) => updateAssumptions({ poleHeightM: e.value[0] }) } as Record<string, unknown>}
		/>
	</div>

	<div class="space-y-1.5">
		<span class="text-xs font-medium flex justify-between">
			<span>Tower structure height</span>
			<span class="text-muted-foreground tabular-nums">{store.assumptions.towerHeightM} m</span>
		</span>
		<!-- svelte-ignore a11y_label_has_associated_control -->
		<Slider
			type="multiple"
			value={[store.assumptions.towerHeightM]}
			min={10}
			max={60}
			step={0.5}
			{...{ onvaluechange: (e: { value: number[] }) => updateAssumptions({ towerHeightM: e.value[0] }) } as Record<string, unknown>}
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
