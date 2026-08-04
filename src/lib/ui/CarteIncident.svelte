<script lang="ts">
	// Carte d'incident. docs/06 §6.2.
	//
	// Hauteur réservée à 340 px quelle que soit la longueur du texte. Si un texte
	// déborde, ce n'est pas la carte qui grandit, c'est le texte qui est trop
	// long et le validateur de contenu aurait dû l'attraper. C'est ce qui tient
	// le CLS à zéro.

	import type { Famille } from '$lib/moteur/types';
	import Pictogramme from './Pictogramme.svelte';

	const NOM_FAMILLE: Record<Famille, string> = {
		tacle: 'Tacle',
		main: 'Main',
		simulation: 'Simulation',
		contestation: 'Contestation',
		antijeu: 'Antijeu',
		duel_aerien: 'Duel aérien',
		hors_jeu: 'Hors-jeu',
		provocation: 'Provocation',
		banc: 'Banc'
	};

	interface Props {
		texte: string;
		famille: Famille;
		/** Sous 25 de contrôle, un filet rouge encadre le papier. Sans un mot. */
		tendu?: boolean;
		/** Rejouée à chaque incident pour relancer l'animation d'apparition. */
		cle: number;
	}

	let { texte, famille, tendu = false, cle }: Props = $props();
</script>

{#key cle}
	<article class="carte papier" class:tendu>
		<!-- Le pictogramme dit la nature de l'action avant la lecture. Le libellé
		     l'accompagne toujours : une image ne porte jamais seule une
		     information (06 §7). -->
		<header class="famille">
			<Pictogramme {famille} taille={34} />
			<span class="mono">{NOM_FAMILLE[famille]}</span>
		</header>

		<p>{texte}</p>
	</article>
{/key}

<style>
	.carte {
		height: 340px;
		margin: 0 var(--marge);
		padding: 22px;
		display: flex;
		flex-direction: column;
		justify-content: center;
		gap: 16px;
		overflow: hidden;
		flex: none;
		animation: apparition var(--d-carte) var(--c-carte) both;
	}

	.famille {
		display: flex;
		align-items: center;
		gap: 10px;
		color: var(--encre-pale);
		padding-bottom: 12px;
		border-bottom: 1px solid var(--papier-ombre);
	}

	.famille span {
		font-size: 11px;
	}

	.carte p {
		font-family: var(--corps);
		font-size: 19px;
		line-height: 1.52;
	}

	/* Sur écran large, la carte respire : plus de hauteur et un texte plus grand. */
	@media (min-width: 900px) {
		.carte {
			height: 420px;
			margin: 0;
			padding: 36px;
		}

		.carte p {
			font-size: 22px;
		}
	}

	/* Contrôle sous 25 : un filet rouge, aucun texte d'alerte (06 §6.2). */
	.tendu {
		border-top: 1px solid var(--rouge-carton);
		border-bottom: 1px solid var(--rouge-carton);
	}

	@keyframes apparition {
		from {
			opacity: 0;
			transform: translateY(12px);
		}
		to {
			opacity: 1;
			transform: none;
		}
	}
</style>
