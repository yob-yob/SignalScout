<script lang="ts">
	import { Input } from '$lib/components/ui/input';
	import { Button } from '$lib/components/ui/button';
	import { parseLatLon } from '$lib/geo';
	import { store } from '$lib/state/analysis.svelte';

	let error = $state('');
	let geoError = $state('');

	function handleGeolocate() {
		error = '';
		if (!navigator.geolocation) {
			geoError = 'Geolocation not supported by this browser.';
			return;
		}
		navigator.geolocation.getCurrentPosition(
			(pos) => {
				store.target = { lat: pos.coords.latitude, lon: pos.coords.longitude };
				store.targetInput = `${pos.coords.latitude.toFixed(6)}, ${pos.coords.longitude.toFixed(6)}`;
				error = '';
				geoError = '';
			},
			() => {
				geoError = 'Could not get location. Check browser permissions.';
			},
		);
	}

	function validate() {
		const v = store.targetInput.trim();
		if (!v) {
			error = '';
			store.target = null;
			return;
		}
		const parsed = parseLatLon(v);
		if (!parsed) {
			error = 'Enter coordinates as "lat, lon" (e.g. 10.0708, 123.6111).';
			store.target = null;
			return;
		}
		error = '';
		store.target = parsed;
	}
</script>

<div class="space-y-3">
	<div>
		<label for="target-coords" class="text-sm font-medium mb-1 block">
			Target location (lat, lon)
		</label>
		<Input
			id="target-coords"
			placeholder="e.g. 10.0708, 123.6111"
			value={store.targetInput}
			oninput={(e: Event) => {
				store.targetInput = (e.currentTarget as HTMLInputElement).value;
			}}
			onblur={validate}
		/>
		{#if error}
			<p class="text-xs text-destructive mt-1">{error}</p>
		{/if}
	</div>

	<div class="flex gap-2 items-end">
		<div class="flex-1">
			<label for="target-label" class="text-sm font-medium mb-1 block">Label (optional)</label>
			<Input
				id="target-label"
				placeholder="Target"
				value={store.targetLabel}
				oninput={(e: Event) => (store.targetLabel = (e.currentTarget as HTMLInputElement).value)}
			/>
		</div>
		<Button variant="ghost" size="default" onclick={handleGeolocate} class="whitespace-nowrap">
			&#8982; Use my location
		</Button>
	</div>

	{#if geoError}
		<p class="text-xs text-destructive">{geoError}</p>
	{/if}
</div>
