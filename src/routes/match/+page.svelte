<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { dev } from '$app/environment';
	import { partie } from '$lib/etat/partie.svelte';

	onMount(() => {
		// Arrivée directe sur /match sans partie en cours : on repart de l'accueil.
		if (partie.etat === null) goto('/');
	});

	// Le critère d'acceptation de V0-6 demande de pouvoir comparer la jauge
	// affichée à la valeur du moteur. Exposé en dev uniquement.
	$effect(() => {
		if (!dev) return;
		Object.assign(window, {
			__debug: {
				controle: partie.controle,
				index: partie.etat?.index ?? 0,
				decisions: partie.etat?.decisions ?? [],
				buts: partie.etat?.buts ?? null
			}
		});
	});

	function suivant() {
		partie.continuer();
		if (partie.resultat !== null) goto('/feuille');
	}
</script>

<svelte:head><title>Match — SIFFLET</title></svelte:head>

{#if partie.etat && partie.match}
	<p>Contrôle : {partie.controle} / 100</p>

	{#if partie.phase === 'incident' && partie.incidentCourant}
		{@const programme = partie.incidentCourant}
		<p>
			{programme.minute}' — {partie.match.domicile.abrege}
			{partie.etat.buts.domicile} – {partie.etat.buts.exterieur}
			{partie.match.exterieur.abrege}
			<br />
			incident {partie.numeroIncident} sur 12
		</p>

		<p>{programme.incident.texte}</p>

		<ul>
			{#each programme.incident.options as option, index (index)}
				<li>
					<button onclick={() => partie.decider(index)}>{option.libelle}</button>
				</li>
			{/each}
		</ul>
	{:else if partie.incidentJoue && partie.optionJouee}
		{@const programme = partie.incidentJoue}
		<p>{programme.minute}' — {partie.optionJouee.libelle}</p>
		<p>{partie.optionJouee.consequence}</p>

		{#if partie.etat.matchArrete}
			<p>Le match est arrêté. Le contrôle est tombé à zéro.</p>
		{/if}

		<p>
			<button onclick={suivant}>
				{partie.etat.termine ? 'Feuille de match' : 'Suivant'}
			</button>
		</p>
	{/if}
{:else}
	<p>Aucun match en cours.</p>
{/if}
