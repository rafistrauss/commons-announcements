<script lang="ts">
	import favicon from '$lib/assets/favicon.svg';

	let { children } = $props();
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

<style>
	@media print {
		:global(.noprint) {
			display: none !important;
		}
	}
</style>

{@render children?.()}
