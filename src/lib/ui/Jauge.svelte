<script lang="ts">
	// Jauge de contrôle. docs/06 §6.2 ligne 0.
	//
	// La seule jauge affichée du jeu. Blanche au-dessus de 40, ambre en dessous,
	// rouge sous 25 — et sous 25 elle pulse très légèrement. Aucun texte
	// d'alerte : on n'explique pas au joueur qu'il est en train de perdre le
	// match, il le sent.

	import { CONTROLE } from '$lib/moteur/equilibrage';

	interface Props {
		valeur: number;
	}

	let { valeur }: Props = $props();

	const etat = $derived(
		valeur < CONTROLE.seuilTendu ? 'critique' : valeur < CONTROLE.seuilAmbre ? 'alerte' : 'nominal'
	);
</script>

<div
	class="jauge"
	role="progressbar"
	aria-label="Contrôle du match"
	aria-valuemin={CONTROLE.min}
	aria-valuemax={CONTROLE.max}
	aria-valuenow={valeur}
	aria-live="polite"
	data-controle={valeur}
	data-etat={etat}
>
	<span class="remplissage" data-etat={etat} style="width: {Math.max(0, Math.min(100, valeur))}%"
	></span>
</div>

<style>
	.jauge {
		height: 4px;
		width: 100%;
		background: #1c1c1e;
		flex: none;
	}

	.remplissage {
		display: block;
		height: 100%;
		background: var(--craie);
		transition: width var(--d-jauge) var(--c-jauge);
	}

	.remplissage[data-etat='alerte'] {
		background: var(--jaune-carton);
	}

	.remplissage[data-etat='critique'] {
		background: var(--rouge-carton);
		animation: pulsation 1.2s ease-in-out infinite;
	}

	@keyframes pulsation {
		0%,
		100% {
			opacity: 1;
		}
		50% {
			opacity: 0.75;
		}
	}
</style>
