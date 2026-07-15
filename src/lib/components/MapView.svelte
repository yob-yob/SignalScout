<script lang="ts">
	import { onMount } from 'svelte';
	import 'leaflet/dist/leaflet.css';
	import { store } from '$lib/state/analysis.svelte';
	import { haversine, bearing, compassPoint } from '$lib/geo';

	let mapContainer!: HTMLDivElement;
	let map: import('leaflet').Map | null = null;
	let targetMarker: import('leaflet').Marker | null = null;
	let towerMarkers: Map<string, import('leaflet').Marker> = new Map();
	let polylines: Map<string, import('leaflet').Polyline> = new Map();
	let midpointLabels: Map<string, import('leaflet').Tooltip> = new Map();
	let leafletModule: typeof import('leaflet') | null = null;

	onMount(() => {
		initMap();
		return () => {
			map?.remove();
			map = null;
			leafletModule = null;
		};
	});

	async function initMap() {
		const L = await import('leaflet');
		leafletModule = L;

		map = L.map(mapContainer, {
			zoomControl: true,
			attributionControl: true,
		}).setView([0, 0], 2);

		L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
			attribution:
				'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
			maxZoom: 19,
		}).addTo(map);

		delete (L.Icon.Default.prototype as any)._getIconUrl;
		L.Icon.Default.mergeOptions({
			iconRetinaUrl:
				'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
			iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
			shadowUrl:
				'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
		});

		refreshAll();
	}

	function refreshAll() {
		const L = leafletModule;
		if (!map || !L) return;

		targetMarker?.remove();
		for (const m of towerMarkers.values()) m.remove();
		for (const p of polylines.values()) p.remove();
		for (const l of midpointLabels.values()) l.remove();
		towerMarkers.clear();
		polylines.clear();
		midpointLabels.clear();

		const _target = store.target;
		const _towers = store.towers;
		const _selectedId = store.selectedTowerId;
		const allPoints: import('leaflet').LatLngExpression[] = [];

		if (_target) {
			const tLatLng: import('leaflet').LatLngExpression = [_target.lat, _target.lon];
			targetMarker = L.marker(tLatLng, {
				icon: L.divIcon({
					html: `<div style="
						width: 16px; height: 16px;
						background: #dc2626;
						border: 2px solid #fff;
						border-radius: 50%;
						box-shadow: 0 1px 4px rgba(0,0,0,0.5);
					"></div>`,
					className: '',
					iconSize: [16, 16],
					iconAnchor: [8, 8],
				}),
			})
				.bindTooltip(store.targetLabel || 'Target', {
					permanent: true,
					direction: 'top',
					offset: [0, -10],
				})
				.addTo(map);
			allPoints.push(tLatLng);
		}

		for (const tower of _towers) {
			if (!_target) continue;

			const tLatLng: import('leaflet').LatLngExpression = [tower.pos.lat, tower.pos.lon];
			const marker = L.marker(tLatLng, {
				icon: L.divIcon({
					html: `<div style="
						width: 14px; height: 14px;
						background: ${tower.color};
						border: 2px solid #fff;
						border-radius: 50%;
						box-shadow: 0 1px 3px rgba(0,0,0,0.4);
					"></div>`,
					className: '',
					iconSize: [14, 14],
					iconAnchor: [7, 7],
				}),
			})
				.bindTooltip(tower.name, {
					permanent: true,
					direction: 'top',
					offset: [0, -10],
				})
				.addTo(map);

			marker.on('click', () => {
				store.selectedTowerId = tower.id;
			});

			towerMarkers.set(tower.id, marker);
			allPoints.push(tLatLng);

			const dist = haversine(_target, tower.pos);
			const brg = bearing(_target, tower.pos);

			const poly = L.polyline(
				[
					[_target.lat, _target.lon],
					[tower.pos.lat, tower.pos.lon],
				],
				{
					color: tower.color,
					weight: _selectedId === tower.id ? 4 : 2,
					opacity: _selectedId ? (_selectedId === tower.id ? 0.9 : 0.3) : 0.7,
				}
			).addTo(map);

			poly.on('click', () => {
				store.selectedTowerId = tower.id;
			});

			polylines.set(tower.id, poly);

			const midLat = (_target.lat + tower.pos.lat) / 2;
			const midLon = (_target.lon + tower.pos.lon) / 2;
			const label = `${(dist / 1000).toFixed(2)} km &bull; ${brg.toFixed(0)}&deg; ${compassPoint(brg)}`;
			const tooltip = L.tooltip({
				permanent: true,
				direction: 'center',
				className: 'path-label',
			})
				.setLatLng([midLat, midLon])
				.setContent(label)
				.addTo(map);
			midpointLabels.set(tower.id, tooltip);
		}

		if (allPoints.length > 0) {
			const bounds = L.latLngBounds(allPoints);
			map.fitBounds(bounds.pad(0.2), { animate: true });
		}
	}

	$effect(() => {
		void store.target;
		void store.towers;
		void store.selectedTowerId;
		if (map && leafletModule) refreshAll();
	});
</script>

<div bind:this={mapContainer} class="w-full h-full min-h-0"></div>

<style>
	:global(.path-label) {
		background: rgba(255, 255, 255, 0.92);
		border: 1px solid #d4d4d4;
		border-radius: 6px;
		padding: 2px 6px;
		font-size: 11px;
		font-weight: 500;
		white-space: nowrap;
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
	}
	:global(.path-label::before) {
		display: none;
	}
</style>
