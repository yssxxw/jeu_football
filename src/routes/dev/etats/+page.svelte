<script lang="ts">
	// Catalogue des états d'écran. Demandé par le ticket V0-11 : les 4 états de
	// l'écran de match et les 5 de la feuille doivent être atteignables sans
	// jouer une partie entière jusqu'à tomber sur le bon cas.
	//
	// Page de développement uniquement : elle n'existe pas dans le build de
	// production, voir le +page.ts à côté.

	import { CLUBS, CONTEXTES, INCIDENTS } from '$lib/contenu';
	import { appliquer, etatInitial } from '$lib/moteur/appliquer';
	import { composer } from '$lib/moteur/composer';
	import { noter } from '$lib/moteur/noter';
	import type { DecisionPrise, Match, Palier, Resultat } from '$lib/moteur/types';
	import CarteIncident from '$lib/ui/CarteIncident.svelte';
	import Consequence from '$lib/ui/Consequence.svelte';
	import EcranVar from '$lib/ui/EcranVar.svelte';
	import FeuilleDeMatch from '$lib/ui/FeuilleDeMatch.svelte';
	import Jauge from '$lib/ui/Jauge.svelte';

	const CONTENU = { incidents: INCIDENTS, clubs: CLUBS, contextes: CONTEXTES };
	const match: Match = composer('etats-vitrine', 6, CONTENU);
	const premier = match.incidents[0];
	const blocVar = INCIDENTS.find((incident) => incident.var !== undefined)?.var;

	/** Construit un résultat de démonstration sans jouer douze décisions. */
	function resultatDe(surcharge: Partial<Resultat>): Resultat {
		const base = noter(appliquer(etatInitial(match), 0));
		return { ...base, ...surcharge };
	}

	function decisionsDe(): DecisionPrise[] {
		let etat = etatInitial(match);
		for (let n = 0; n < 4; n++) {
			if (etat.termine) break;
			etat = appliquer(etat, 0);
		}
		return etat.decisions;
	}

	const decisions = decisionsDe();

	const etatsMatch = [
		{ nom: 'Incident, contrôle nominal', controle: 82, tendu: false },
		{ nom: 'Incident, contrôle en alerte (< 40)', controle: 34, tendu: false },
		{ nom: 'Incident, contrôle critique (< 25)', controle: 18, tendu: true },
		{ nom: 'Incident, contrôle à zéro', controle: 0, tendu: true }
	];

	const etatsFeuille: { nom: string; resultat: Resultat; divisionApres: Palier }[] = [
		{ nom: 'Nominale, maintien', resultat: resultatDe({ note: 64 }), divisionApres: 6 },
		{ nom: 'Montée', resultat: resultatDe({ note: 88 }), divisionApres: 7 },
		{ nom: 'Descente', resultat: resultatDe({ note: 41 }), divisionApres: 5 },
		{
			nom: 'Match arrêté',
			resultat: resultatDe({ note: 28, matchArrete: true, controle: 0 }),
			divisionApres: 5
		},
		{
			nom: 'Hors classement (sans chrono)',
			resultat: resultatDe({ note: 71, horsClassement: true }),
			divisionApres: 6
		}
	];

	let varVisible = $state(false);
</script>

<svelte:head><title>États — SIFFLET</title></svelte:head>

<main class="catalogue">
	<h1 class="titre-section">États des écrans</h1>

	<h2 class="mono">Écran de match</h2>
	{#each etatsMatch as etat (etat.nom)}
		<section class="cas">
			<p class="mono etiquette">{etat.nom}</p>
			<Jauge valeur={etat.controle} />
			{#if premier}
				<CarteIncident texte={premier.incident.texte} tendu={etat.tendu} cle={0} />
			{/if}
		</section>
	{/each}

	<section class="cas">
		<p class="mono etiquette">Conséquence, avec carton rouge</p>
		<Consequence
			libelle="Faute et expulsion"
			consequence="Le rouge. Le banc explose. Le stade se réveille, et pas dans le bon sens."
			severite={4}
			nonDecidee={false}
			resolutionVar={undefined}
			varEnAttente={false}
			matchArrete={false}
		/>
	</section>

	<section class="cas">
		<p class="mono etiquette">Conséquence, décision non prise</p>
		<Consequence
			libelle="Laisser jouer"
			consequence="Le jeu continue trois secondes puis s'arrête tout seul."
			severite={0}
			nonDecidee={true}
			resolutionVar={undefined}
			varEnAttente={false}
			matchArrete={false}
		/>
	</section>

	<h2 class="mono">Assistance vidéo</h2>
	<section class="cas">
		<button class="bouton-secondaire" onclick={() => (varVisible = true)}>Afficher l'écran</button>
	</section>
	{#if varVisible && blocVar}
		<EcranVar bloc={blocVar} onResolution={() => (varVisible = false)} />
	{/if}

	<h2 class="mono">Feuille de match</h2>
	{#each etatsFeuille as cas (cas.nom)}
		<section class="cas">
			<p class="mono etiquette">{cas.nom}</p>
			<FeuilleDeMatch
				{match}
				resultat={cas.resultat}
				{decisions}
				licence="FR-4471-C"
				divisionAvant={6}
				divisionApres={cas.divisionApres}
				cle={0}
			/>
		</section>
	{/each}
</main>

<style>
	.catalogue {
		padding: 20px 0 40px;
		display: flex;
		flex-direction: column;
		gap: 20px;
	}

	h1 {
		font-size: 18px;
		padding: 0 var(--marge);
	}

	h2 {
		padding: 16px var(--marge) 0;
		color: var(--craie-pale);
		border-top: 1px solid #1c1c1e;
	}

	.cas {
		display: flex;
		flex-direction: column;
		gap: 8px;
	}

	.etiquette {
		padding: 0 var(--marge);
		font-size: 11px;
		color: var(--craie-pale);
		text-transform: none;
	}
</style>
