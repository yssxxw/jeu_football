<script lang="ts">
	import '../app.css';
	import favicon from '$lib/assets/favicon.svg';

	let { children } = $props();
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<meta name="theme-color" content="#0C0C0D" />
</svelte:head>

<!-- Le desktop est le mobile dans un cadre, sans réagencement (06 §4). -->
<div class="cadre">
	{@render children()}
</div>
