<script lang="ts">
	import { Card } from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Root, Trigger, Content, Portal } from '$lib/components/ui/popover';
	import { parseLatLon } from '$lib/geo';
	import { store, addTower, removeTower, updateTower } from '$lib/state/analysis.svelte';

	const PRESET_COLORS = [
		'#2563eb', '#dc2626', '#16a34a', '#ca8a04',
		'#9333ea', '#0891b2', '#d97706', '#4f46e5',
	];

	let rawInputs = $state<Record<string, string>>({});
	let errors = $state<Record<string, string>>({});
	let populated = new Set<string>();

	// auto-populate inputs when towers are loaded from URL/share
	$effect(() => {
		for (const t of store.towers) {
			if (!populated.has(t.id) && t.pos && (t.pos.lat !== 0 || t.pos.lon !== 0)) {
				rawInputs = { ...rawInputs, [t.id]: `${t.pos.lat}, ${t.pos.lon}` };
				populated.add(t.id);
			}
		}
	});

	function handleAdd() {
		const t = addTower({ lat: 0, lon: 0 });
		errors = { ...errors, [t.id]: '' };
		rawInputs = { ...rawInputs, [t.id]: '' };
	}

	function handleDelete(id: string) {
		removeTower(id);
		const e = { ...errors }; delete e[id]; errors = e;
		const r = { ...rawInputs }; delete r[id]; rawInputs = r;
	}

	function validateTower(id: string, raw: string) {
		const trimmed = raw.trim();
		if (!trimmed) {
			errors = { ...errors, [id]: '' };
		} else {
			const parsed = parseLatLon(trimmed);
			if (!parsed) {
				errors = { ...errors, [id]: 'Invalid coordinates' };
			} else {
				errors = { ...errors, [id]: '' };
				updateTower(id, { pos: parsed });
				rawInputs = { ...rawInputs, [id]: `${parsed.lat}, ${parsed.lon}` };
			}
		}
	}
</script>

<div class="space-y-3">
	<div class="flex items-center justify-between">
		<span class="text-sm font-medium">Towers</span>
		<Button size="sm" onclick={handleAdd}>+ Add tower</Button>
	</div>

	{#each store.towers as tower (tower.id)}
		{@const err = errors[tower.id] ?? ''}
		<Card class="p-3 space-y-2">
			<div class="flex gap-2 items-start">
				<div class="flex-1 space-y-2">
					<Input
						placeholder="Tower name"
						value={tower.name}
						oninput={(e: Event) => updateTower(tower.id, { name: (e.currentTarget as HTMLInputElement).value })}
						class="text-sm"
					/>
					<div>
						<Input
							placeholder="lat, lon"
							value={rawInputs[tower.id] ?? ''}
							oninput={(e: Event) => {
								rawInputs = { ...rawInputs, [tower.id]: (e.currentTarget as HTMLInputElement).value };
							}}
							onblur={(e: FocusEvent) => validateTower(tower.id, (e.currentTarget as HTMLInputElement).value)}
							class="text-sm"
						/>
						{#if err}
							<p class="text-xs text-destructive mt-0.5">{err}</p>
						{/if}
					</div>
				</div>
				<div class="flex gap-1 items-center">
					<Root>
						<Trigger class="cursor-pointer" aria-label="Change tower color">
							<div
								class="size-6 rounded border"
								style="background-color: {tower.color}"
								title="Change color"
							></div>
						</Trigger>
						<Portal>
							<Content class="p-2 w-36">
								<div class="grid grid-cols-4 gap-1">
									{#each PRESET_COLORS as c}
										<button
											class="size-6 rounded border cursor-pointer {c === tower.color ? 'ring-2 ring-foreground' : ''}"
											style="background-color: {c}"
											onclick={() => updateTower(tower.id, { color: c })}
											aria-label="Color {c}"
										></button>
									{/each}
								</div>
							</Content>
						</Portal>
					</Root>
					<Button
						variant="ghost"
						size="icon-sm"
						onclick={() => handleDelete(tower.id)}
					>
						&times;
					</Button>
				</div>
			</div>
		</Card>
	{:else}
		<p class="text-sm text-muted-foreground text-center py-4">
			No towers added. Add one to analyze a path.
		</p>
	{/each}
</div>
