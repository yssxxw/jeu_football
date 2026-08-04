<script lang="ts">
	// Écran de conséquence. docs/06 §6.3.
	//
	// Le bloc papier se réduit, la décision s'affiche, et s'il y a carton un
	// rectangle plein sort en rotation. Le rouge et le jaune ne portent jamais
	// une information seule : le carton a toujours son libellé à côté (06 §7).

	import type { Famille, Severite } from '$lib/moteur/types';
	import Pictogramme from './Pictogramme.svelte';

	interface Props {
		libelle: string;
		consequence: string;
		famille: Famille;
		severite: Severite;
		nonDecidee: boolean;
		resolutionVar: 'maintien' | 'rectification' | undefined;
		varEnAttente: boolean;
		matchArrete: boolean;
	}

	let {
		libelle,
		consequence,
		famille,
		severite,
		nonDecidee,
		resolutionVar,
		varEnAttente,
		matchArrete
	}: Props = $props();

	const carton = $derived(severite === 2 ? 'jaune' : severite >= 3 ? 'rouge' : null);
	const libelleCarton = $derived(
		severite === 2
			? 'Avertissement'
			: severite === 3
				? 'Second avertissement'
				: severite === 4
					? 'Expulsion'
					: null
	);
</script>

<section class="consequence papier" aria-live="assertive">
	<div class="tete">
		<Pictogramme {famille} taille={30} />
		<p class="decision mono">{libelle}</p>
	</div>

	{#if carton !== null}
		<p class="carton-ligne">
			<span class="carton" data-couleur={carton} aria-hidden="true"></span>
			<span class="mono">{libelleCarton}</span>
		</p>
	{/if}

	<p class="texte">{consequence}</p>

	{#if nonDecidee}
		<p class="note mono">Décision non prise. L'option par défaut a été appliquée.</p>
	{/if}
	{#if resolutionVar === 'rectification'}
		<p class="note mono">Décision rectifiée après visionnage.</p>
	{:else if resolutionVar === 'maintien'}
		<p class="note mono">Décision maintenue après visionnage.</p>
	{/if}
	{#if varEnAttente}
		<p class="note mono">L'assistance vidéo revient sur cette action.</p>
	{/if}
	{#if matchArrete}
		<p class="note mono">Le match est arrêté. Le contrôle est tombé à zéro.</p>
	{/if}
</section>

<style>
	.consequence {
		min-height: 340px;
		margin: 0 var(--marge);
		padding: 22px;
		display: flex;
		flex-direction: column;
		gap: 12px;
		justify-content: center;
		flex: none;
	}

	.tete {
		display: flex;
		align-items: center;
		gap: 10px;
		color: var(--encre-pale);
	}

	.decision {
		font-size: 13px;
		font-weight: 700;
		color: var(--encre);
	}

	@media (min-width: 900px) {
		.consequence {
			min-height: 420px;
			margin: 0;
			padding: 36px;
		}
	}

	.carton-ligne {
		display: flex;
		align-items: center;
		gap: 10px;
		color: var(--encre-pale);
	}

	.carton {
		display: inline-block;
		width: 36px;
		height: 50px;
		border-radius: var(--rayon);
		animation: sortie-carton var(--d-carton) var(--c-carton) both;
	}

	.carton[data-couleur='jaune'] {
		background: var(--jaune-carton);
	}

	.carton[data-couleur='rouge'] {
		background: var(--rouge-carton);
	}

	.texte {
		font-family: var(--corps);
		font-size: 17px;
	}

	.note {
		font-size: 11px;
		color: var(--encre-pale);
		text-transform: none;
	}

	@keyframes sortie-carton {
		from {
			transform: rotate(-4deg) scale(0.8);
			opacity: 0;
		}
		to {
			transform: none;
			opacity: 1;
		}
	}
</style>
