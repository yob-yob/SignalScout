<script module lang="ts">
	const DISCLAIMER_KEY = 'signalscout_api_disclaimer_v1';

	export function hasAcceptedDisclaimer(): boolean {
		try {
			return localStorage.getItem(DISCLAIMER_KEY) === '1';
		} catch {
			return false;
		}
	}
</script>

<script lang="ts">
	import { Button } from '$lib/components/ui/button';

	let { dismiss }: { dismiss: () => void } = $props();
</script>

<div
	class="fixed inset-0 z-[1100] flex items-center justify-center bg-black/70 backdrop-blur-sm"
>
	<div class="bg-card text-card-foreground border rounded-lg shadow-xl max-w-lg w-full mx-4 p-6 flex flex-col gap-4">
		<h2 class="text-lg font-semibold">Before you begin</h2>

		<div class="text-sm text-muted-foreground flex flex-col gap-2">
			<p>
				SignalScout uses the free <strong>Open-Meteo Elevation API</strong> to fetch terrain
				elevation data along each path you analyze.
			</p>
			<p>
				The free tier has the following limits for <strong>non-commercial use</strong>:
			</p>
			<ul class="list-disc pl-5 flex flex-col gap-0.5">
				<li><strong>10,000</strong> API calls per day</li>
				<li><strong>5,000</strong> calls per hour</li>
				<li><strong>600</strong> calls per minute</li>
			</ul>
			<p>
				Rate limiting is <strong>IP-based</strong>. This means all users sharing the same
				public IP address &mdash; such as others on your home WiFi or office network &mdash;
				share the same quota. If someone else on your network is also using Open-Meteo,
				their usage counts toward your limit.
			</p>
			<p>
				SignalScout only calls the API when you click <strong>&ldquo;Analyze paths&rdquo;</strong>.
				Results are cached in your browser to avoid repeat calls. A stats footer at the
				bottom of the sidebar tracks your session usage.
			</p>
		</div>

		<Button class="w-full" onclick={dismiss}>I Understand</Button>
	</div>
</div>
