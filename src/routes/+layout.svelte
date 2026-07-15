<script lang="ts">
	import '../app.css';
	import { TooltipProvider } from '$lib/components/ui/tooltip';
	let { children } = $props();
</script>

<TooltipProvider delayDuration={0}>
	{@render children()}
</TooltipProvider>
