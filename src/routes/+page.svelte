<script lang="ts">
	import { onMount } from 'svelte';
	import { afterNavigate, replaceState } from '$app/navigation';
	import Sidebar from '$lib/components/Sidebar.svelte';
	import AnalysisPanel from '$lib/components/AnalysisPanel.svelte';
	import MapView from '$lib/components/MapView.svelte';
	import ApiDisclaimerModal from '$lib/components/ApiDisclaimerModal.svelte';
	import { store, addTower, updateAssumptions } from '$lib/state/analysis.svelte';
	import { decodeShareState, loadSession, saveSession } from '$lib/share';
	import { syncQueryParams, decodeQueryParams } from '$lib/url';
	import { disclaimer, checkDisclaimer, dismissDisclaimer } from '$lib/state/disclaimer.svelte';

	let kitReady = $state(false);

	afterNavigate(() => {
		kitReady = true;
	});

	onMount(() => {
		hydrateState();
		checkDisclaimer();
	});

	function hydrateState() {
		const qp = decodeQueryParams();
		if (qp) {
			applyState(qp.target, qp.targetLabel, qp.towers, qp.assumptions);
			return;
		}

		const params = new URLSearchParams(window.location.search);
		const s = params.get('s');
		if (s) {
			const decoded = decodeShareState(s);
			if (decoded) {
				applyState(decoded.target, decoded.label, decoded.towers, decoded.assumptions);
				params.delete('s');
				const qs = params.toString();
				const clean = qs ? `?${qs}` : window.location.pathname;
				window.history.replaceState({}, '', clean);
				return;
			}
		}

		const session = loadSession();
		if (session) {
			const towers = session.towers.map((t) => ({ name: t.name, pos: { lat: t.lat, lon: t.lon }, color: t.color }));
			applyState(session.target, session.label, towers, session.assumptions);
			return;
		}
	}

	function applyState(
		target: { lat: number; lon: number } | null,
		label: string,
		towers: { name: string; pos: { lat: number; lon: number }; color: string }[],
		assumptions: { poleHeightM: number; towerHeightM: number; freqMHz: number },
	) {
		store.target = target;
		store.targetLabel = label || 'Target';
		store.targetInput = target ? `${target.lat}, ${target.lon}` : '';
		store.towers = [];
		for (const t of towers) {
			addTower(t.pos, t.name);
			const last = store.towers[store.towers.length - 1];
			if (last) {
				store.towers = store.towers.map((tw) => tw.id === last.id ? { ...tw, color: t.color } : tw);
			}
		}
		updateAssumptions(assumptions);
	}

	$effect(() => {
		if (!kitReady) return;
		const hasState = store.target || store.towers.length > 0;
		if (!hasState) return;

		syncQueryParams(store.target, store.targetLabel, store.towers, store.assumptions, replaceState);

		saveSession({
			v: 1,
			target: store.target ? { lat: store.target.lat, lon: store.target.lon } : null,
			label: store.targetLabel,
			towers: store.towers.map((t) => ({ name: t.name, lat: t.pos.lat, lon: t.pos.lon, color: t.color })),
			assumptions: store.assumptions,
		});
	});
</script>

<div class="flex h-dvh w-screen overflow-hidden flex-col md:flex-row">
	<div class="w-[400px] shrink-0 hidden md:flex flex-col border-r">
		<Sidebar />
	</div>

	<AnalysisPanel />

	<div class="flex-1 min-h-0 relative order-first md:order-none md:h-auto h-[45vh] md:shrink shrink-0">
		<MapView />
	</div>

	<div class="md:hidden flex-1 min-h-0 overflow-y-auto bg-card border-t">
		<Sidebar />
	</div>
</div>

{#if disclaimer.visible}
	<ApiDisclaimerModal dismiss={dismissDisclaimer} />
{/if}
