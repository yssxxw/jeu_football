<script lang="ts">
	// Coup d'envoi. docs/06 §6.1.
	//
	// Il n'y a pas de page d'accueil : le domaine ouvre directement sur la carte
	// du match. Un seul bouton actionnable au pouce, en bas. Aucun tutoriel.

	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { partie } from '$lib/etat/partie.svelte';
	import Panneau from '$lib/ui/Panneau.svelte';

	let pret = $state(false);
	let panneauOuvert = $state(false);

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

<Panneau ouvert={panneauOuvert} onFermer={() => (panneauOuvert = false)} />

<header class="entete">
	<button class="panneau-ouvrir mono" onclick={() => (panneauOuvert = true)}>Réglages</button>
	<h1 class="logotype">SIFFLET</h1>
</header>

{#if partie.sauvegardeCorrompue}
	<p class="bandeau mono">
		Sauvegarde illisible, mise de côté. La progression repart de zéro. L'ancienne est conservée.
	</p>
{/if}

<main class="accueil">
	{#if pret && partie.match}
		<p class="division mono">
			{partie.nomDivision} · match {partie.matchsJoues + 1}
		</p>

		<!-- L'affiche occupe le centre optique. Les couleurs de club n'apparaissent
		     que sous forme de deux filets de 3 px : c'est leur seule présence dans
		     tout le jeu, et ça suffit (06 §6.1). -->
		<div class="affiche">
			<p class="club">{partie.match.domicile.nom}</p>
			<span class="filet" style="background: {partie.match.domicile.couleurs[0]}"></span>

			<p class="recoit">reçoit</p>

			<p class="club">{partie.match.exterieur.nom}</p>
			<span class="filet" style="background: {partie.match.exterieur.couleurs[0]}"></span>
		</div>

		<p class="contexte">{partie.match.contexte.texte}<br />Arbitre : vous.</p>
	{:else}
		<p class="contexte">Composition du match.</p>
	{/if}
</main>

<footer class="pied">
	<button class="bouton-primaire" onclick={coupDEnvoi} disabled={!pret}>Coup d'envoi</button>
	<button class="bouton-tertiaire" onclick={matchDuJour} disabled={!pret}>
		le match du jour →
	</button>

	<p class="licence mono">
		LIC. {partie.sauvegarde.arbitreLocal.licence} · SÉRIE {partie.sauvegarde.quotidien.serie}
	</p>
</footer>

<style>
	.entete {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 16px var(--marge) 0;
	}

	.logotype {
		font-family: var(--titre);
		font-stretch: 82%;
		font-size: 18px;
		letter-spacing: 0.22em;
	}

	.panneau-ouvrir {
		color: var(--craie-pale);
		text-decoration: underline;
		text-underline-offset: 3px;
		min-height: 32px;
	}

	.bandeau {
		margin: 12px var(--marge) 0;
		padding: 8px 10px;
		color: var(--jaune-carton);
		border: 1px solid var(--jaune-carton);
		border-radius: var(--rayon);
		text-transform: none;
		line-height: 1.4;
	}

	.accueil {
		flex: 1;
		display: flex;
		flex-direction: column;
		justify-content: center;
		gap: 24px;
		padding: 24px var(--marge);
		text-align: center;
	}

	.division {
		color: var(--craie-pale);
	}

	.affiche {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: var(--gouttiere);
	}

	.club {
		font-family: var(--titre);
		font-stretch: 92%;
		font-size: 30px;
		line-height: 1.1;
		text-transform: uppercase;
	}

	.filet {
		display: block;
		width: 48px;
		height: 3px;
	}

	.recoit {
		font-family: var(--corps);
		font-style: italic;
		font-size: 15px;
		color: var(--craie-pale);
		margin: 4px 0;
	}

	.contexte {
		font-family: var(--corps);
		font-size: 17px;
		color: var(--craie);
		max-width: 30ch;
		margin: 0 auto;
	}

	.pied {
		padding: 0 var(--marge) calc(20px + env(safe-area-inset-bottom));
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 12px;
	}

	.licence {
		font-size: 12px;
		color: var(--craie-pale);
	}

	button:disabled {
		opacity: 0.7;
		cursor: default;
	}
</style>
