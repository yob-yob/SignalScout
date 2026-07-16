<svelte:head>
	<title>SignalScout — Cell Tower Line-of-Sight &amp; Terrain Analyzer</title>
	<meta name="description" content="Find the best cell tower to aim a directional antenna at. SignalScout analyzes terrain profiles, line-of-sight, Fresnel-zone clearance, and knife-edge diffraction loss between your location and nearby cell towers." />
	<meta property="og:title" content="SignalScout — Cell Tower Line-of-Sight &amp; Terrain Analyzer" />
	<meta property="og:description" content="Find the best cell tower to aim at — terrain profiles, line-of-sight analysis, Fresnel clearance, and diffraction loss for rural/off-grid cellular installations." />
	<meta property="og:type" content="website" />
	<meta property="og:url" content="https://signalscout.yob-yob.com/" />
	<meta name="twitter:card" content="summary" />
	<meta name="twitter:title" content="SignalScout — Cell Tower Line-of-Sight &amp; Terrain Analyzer" />
	<meta name="twitter:description" content="Find the best cell tower to aim at with terrain profiles, line-of-sight analysis, and Fresnel clearance." />
	<link rel="canonical" href="https://signalscout.yob-yob.com/" />
</svelte:head>

<script lang="ts">
	import '../app.css';
	import { TooltipProvider } from '$lib/components/ui/tooltip';
	let { children } = $props();
</script>

<TooltipProvider delayDuration={0}>
	{@render children()}
</TooltipProvider>
