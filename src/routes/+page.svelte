<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { partie } from '$lib/etat/partie.svelte';

	let pret = $state(false);

	onMount(() => {
		// seedLibre tire dans crypto et le stockage n'existe pas côté serveur :
		// tout se fait au montage, sinon le serveur et le navigateur ne
		// composeraient pas le même match.
		partie.initialiser(new Date(), {
			mouvementReduit: window.matchMedia('(prefers-reduced-motion: reduce)').matches
		});
		partie.composerAffiche();
		pret = true;
	});

	function coupDEnvoi() {
		partie.demarrerMatchLibre();
		goto('/match');
	}

	function matchDuJour() {
		partie.demarrerMatchDuJour(new Date());
		goto('/match');
	}
</script>

<svelte:head><title>SIFFLET</title></svelte:head>

<h1>SIFFLET</h1>

{#if partie.sauvegardeCorrompue}
	<p>Sauvegarde illisible, mise de côté. La progression repart de zéro.</p>
{/if}

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

	<p>
		<label>
			<input
				type="checkbox"
				checked={!partie.chronoActif}
				onchange={(evenement) =>
					partie.changerReglage('chrono', !evenement.currentTarget.checked, new Date())}
			/>
			Jouer sans chrono. Les parties sans chrono ne sont pas classées.
		</label>
	</p>
{:else}
	<p>Composition du match.</p>
{/if}
