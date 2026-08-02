<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { partie } from '$lib/etat/partie.svelte';

	const LIBELLE_JUSTESSE = new Map([
		[1, 'juste'],
		[0.7, 'défendable'],
		[0.4, 'discutable'],
		[0, 'erreur']
	]);

	onMount(() => {
		if (partie.resultat === null) goto('/');
	});

	function rejouer() {
		goto('/');
	}
</script>

<svelte:head><title>Feuille de match — SIFFLET</title></svelte:head>

{#if partie.resultat && partie.match && partie.etat}
	{@const resultat = partie.resultat}
	<h1>Feuille de match</h1>

	<p>
		{partie.match.domicile.nom}
		{resultat.buts.domicile} – {resultat.buts.exterieur}
		{partie.match.exterieur.nom}
	</p>

	<p><strong>{resultat.note} / 100</strong></p>
	<p>{resultat.mention}</p>

	{#if resultat.matchArrete}
		<p>Le match n'est pas allé au bout.</p>
	{/if}
	{#if partie.estMatchDuJour}
		<p>Match du jour.</p>
	{/if}

	<ul>
		<li>Justesse : {resultat.justesse}</li>
		<li>Contrôle final : {resultat.controle}</li>
		<li>Constance : {resultat.constance} ({resultat.incoherences} incohérence(s))</li>
		<li>Cartons : {resultat.cartonsJaunes} jaune(s), {resultat.cartonsRouges} rouge(s)</li>
		<li>Décisions non prises : {resultat.nonDecidees}</li>
		<li>Profil : {resultat.profilPresse}</li>
	</ul>

	<p>Division : {partie.nomDivision}</p>

	<h2>Les {partie.etat.decisions.length} décisions</h2>
	<ol>
		{#each partie.etat.decisions as decision (decision.incidentId)}
			<li>
				{decision.minute}' — {decision.famille} —
				{partie.match.incidents.find((p) => p.incident.id === decision.incidentId)?.incident
					.options[decision.optionIndex]?.libelle}
				— {LIBELLE_JUSTESSE.get(decision.justesse)}{decision.nonDecidee ? ' (non décidée)' : ''}
			</li>
		{/each}
	</ol>

	<p><button onclick={rejouer}>Rejouer</button></p>
{:else}
	<p>Aucune feuille de match.</p>
{/if}
