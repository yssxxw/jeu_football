<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { partie } from '$lib/etat/partie.svelte';

	let pret = $state(false);

	onMount(() => {
		// seedLibre tire dans crypto : la composition est faite côté client
		// uniquement, sinon le serveur et le navigateur ne composeraient pas
		// le même match.
		partie.composerAffiche(partie.matchsJoues);
		pret = true;
	});

	function coupDEnvoi() {
		partie.demarrerMatchLibre(partie.matchsJoues);
		goto('/match');
	}

	function matchDuJour() {
		partie.demarrerMatchDuJour(new Date());
		goto('/match');
	}
</script>

<svelte:head><title>SIFFLET</title></svelte:head>

<h1>SIFFLET</h1>

{#if pret && partie.match}
	<p>{partie.nomDivision} · match {partie.matchsJoues + 1}</p>

	<p>
		<strong>{partie.match.domicile.nom}</strong><br />
		reçoit<br />
		<strong>{partie.match.exterieur.nom}</strong>
	</p>

	<p>{partie.match.contexte.texte}<br />Arbitre : vous.</p>

	<p>
		<button onclick={coupDEnvoi}>COUP D'ENVOI</button>
	</p>
	<p>
		<button onclick={matchDuJour}>le match du jour</button>
	</p>
{:else}
	<p>Composition du match.</p>
{/if}
