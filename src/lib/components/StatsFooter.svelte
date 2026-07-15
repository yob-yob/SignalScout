<script lang="ts">
	import { stats, getRemainingBudget, getBudgetTier } from '$lib/state/stats.svelte';
	import { Tooltip, TooltipTrigger, TooltipContent } from '$lib/components/ui/tooltip';

	const remaining = $derived(getRemainingBudget());
	const tier = $derived(getBudgetTier());

	function budgetColor(t: string): string {
		if (t === 'good') return 'text-green-600 dark:text-green-400';
		if (t === 'warn') return 'text-amber-600 dark:text-amber-400';
		return 'text-red-600 dark:text-red-400';
	}
</script>

<footer class="shrink-0 border-t px-3 py-2 flex items-center justify-center gap-3 text-xs text-muted-foreground">
	<Tooltip>
		<TooltipTrigger class="border-b border-dotted border-muted-foreground/40 cursor-help">
			API calls: {stats.sessionApiCalls}
		</TooltipTrigger>
		<TooltipContent class="w-64 px-2.5 py-1.5 text-xs leading-relaxed">
			Open-Meteo API requests made during this browser session. This counter resets when you
			refresh the page. Opening SignalScout in another tab or browser starts a separate session counter.
		</TooltipContent>
	</Tooltip>

	<span class="opacity-40">&middot;</span>

	<Tooltip>
		<TooltipTrigger class="border-b border-dotted border-muted-foreground/40 cursor-help">
			Cached: {stats.sessionCacheHits}
		</TooltipTrigger>
		<TooltipContent class="w-64 px-2.5 py-1.5 text-xs leading-relaxed">
			Times elevation data was served from cache (browser memory or localStorage) instead of
			calling the API. Cached data reduces API usage and speeds up results.
		</TooltipContent>
	</Tooltip>

	<span class="opacity-40">&middot;</span>

	<Tooltip>
		<TooltipTrigger class="border-b border-dotted border-muted-foreground/40 cursor-help {budgetColor(tier)}">
			Remaining: {remaining} / 10,000
		</TooltipTrigger>
		<TooltipContent class="w-64 px-2.5 py-1.5 text-xs leading-relaxed">
			Estimated remaining API calls based on this session only. The Open-Meteo free tier allows
			10,000 calls/day per IP address. This count does not include usage from other tabs,
			browsers, or devices on the same network.
		</TooltipContent>
	</Tooltip>
</footer>
