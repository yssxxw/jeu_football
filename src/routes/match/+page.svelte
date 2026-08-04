<script lang="ts">
	// Écran de match. docs/06 §6.2 à 6.4.
	//
	// Structure fixe, jamais de saut de mise en page : jauge, ligne d'état,
	// bloc papier à hauteur réservée, bloc d'options collé en bas.

	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { dev } from '$app/environment';
	import { partie } from '$lib/etat/partie.svelte';
	import { CONTROLE } from '$lib/moteur/equilibrage';
	import CarteIncident from '$lib/ui/CarteIncident.svelte';
	import Chrono from '$lib/ui/Chrono.svelte';
	import Consequence from '$lib/ui/Consequence.svelte';
	import EcranVar from '$lib/ui/EcranVar.svelte';
	import Jauge from '$lib/ui/Jauge.svelte';
	import OptionBouton from '$lib/ui/OptionBouton.svelte';

	onMount(() => {
		// Arrivée directe sur /match sans partie en cours : on repart de l'accueil.
		if (partie.etat === null) goto(resolve('/'));
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
		partie.continuer(new Date());
		if (partie.resultat !== null) goto(resolve('/feuille'));
	}

	// Navigation clavier sur desktop : 1 à 4 choisissent, Espace enchaîne (06 §7).
	function auClavier(evenement: KeyboardEvent) {
		if (partie.etat === null) return;

		if (partie.phase === 'incident' && partie.incidentCourant) {
			const rang = Number(evenement.key);
			if (
				Number.isInteger(rang) &&
				rang >= 1 &&
				rang <= partie.incidentCourant.incident.options.length
			) {
				evenement.preventDefault();
				partie.decider(rang - 1);
			}
			return;
		}

		if (partie.phase === 'consequence' && evenement.key === ' ') {
			evenement.preventDefault();
			suivant();
		}
	}
</script>

<svelte:head><title>Match — SIFFLET</title></svelte:head>
<svelte:window onkeydown={auClavier} />

{#if partie.etat && partie.match}
	{@const etat = partie.etat}
	{@const tendu = partie.controle < CONTROLE.seuilTendu}

	{#if partie.phase === 'var' && partie.blocVar}
		<EcranVar bloc={partie.blocVar} onResolution={(choix) => partie.repondreVar(choix)} />
	{:else}
		<Jauge valeur={partie.controle} />

		<header class="etat-match">
			<span class="minute">{partie.minuteCourante}'</span>
			<span class="score mono">
				{partie.match.domicile.abrege}
				{etat.buts.domicile} – {etat.buts.exterieur}
				{partie.match.exterieur.abrege}{#if etat.expulsions > 0}&nbsp;(10){/if}
			</span>
		</header>

		{#if !partie.chronoActif}
			<p class="sans-chrono mono">Sans chrono</p>
		{/if}

		<div class="deux-colonnes">
			<main class="corps">
				{#if partie.phase === 'incident' && partie.incidentCourant}
					{@const programme = partie.incidentCourant}

					{#if partie.chronoActif}
						<Chrono
							lectureMs={partie.lectureMs}
							dureeMs={partie.chronoMs}
							cle={etat.index}
							onExpiration={() => partie.decider(null)}
						/>
					{/if}

					<CarteIncident
						texte={programme.incident.texte}
						famille={programme.incident.famille}
						{tendu}
						cle={etat.index}
					/>
				{:else if partie.incidentJoue && partie.optionJouee}
					{@const prise = etat.decisions[etat.decisions.length - 1]}
					<Consequence
						libelle={partie.optionJouee.libelle}
						consequence={partie.optionJouee.consequence}
						famille={partie.incidentJoue.incident.famille}
						severite={partie.optionJouee.severite}
						nonDecidee={prise?.nonDecidee ?? false}
						resolutionVar={prise?.var}
						varEnAttente={etat.varEnAttente !== null}
						matchArrete={etat.matchArrete}
					/>
				{/if}
			</main>

			<footer class="options">
				{#if partie.phase === 'incident' && partie.incidentCourant}
					<ul>
						{#each partie.incidentCourant.incident.options as option, index (index)}
							<li>
								<OptionBouton
									libelle={option.libelle}
									rang={index + 1}
									onChoix={() => partie.decider(index)}
								/>
							</li>
						{/each}
					</ul>
				{:else}
					<button class="bouton-primaire" onclick={suivant}>
						{etat.termine && etat.varEnAttente === null ? 'Feuille de match' : 'Suivant'}
					</button>
				{/if}
			</footer>
		</div>
	{/if}
{:else}
	<main class="corps"><p class="sans-chrono mono">Aucun match en cours.</p></main>
{/if}

<style>
	.etat-match {
		height: 32px;
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 0 var(--marge);
		flex: none;
	}

	.minute {
		font-family: var(--titre);
		font-stretch: 85%;
		font-size: 20px;
	}

	.score {
		font-size: 13px;
		color: var(--craie-pale);
	}

	.sans-chrono {
		padding: 0 var(--marge);
		font-size: 11px;
		color: var(--craie-pale);
		flex: none;
	}

	.corps {
		flex: 1;
		display: flex;
		flex-direction: column;
		justify-content: center;
	}

	/* Zone de pouce : les options occupent le bas de l'écran, rien
	   d'actionnable au-dessus de la moitié (06 §4). */
	.options {
		flex: none;
		padding: 0 var(--marge) calc(16px + env(safe-area-inset-bottom));
	}

	.options ul {
		border-radius: var(--rayon);
		overflow: hidden;
	}

	/* Les options forment un bloc, pas quatre cartes : un filet de 1 px les
	   sépare, et seulement entre elles (06 §4). */
	.options li + li :global(button) {
		border-top: 1px solid var(--papier-ombre);
	}

	/* Sur écran large, le panneau d'options est plein hauteur : sa bordure et
	   son fond viennent de .deux-colonnes, il ne reste que le rembourrage. */
	@media (min-width: 900px) {
		.options {
			padding: 32px;
		}
	}
</style>
