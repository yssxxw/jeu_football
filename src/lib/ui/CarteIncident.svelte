<script lang="ts">
	// Carte d'incident. docs/06 §6.2.
	//
	// Hauteur réservée à 340 px quelle que soit la longueur du texte. Si un texte
	// déborde, ce n'est pas la carte qui grandit, c'est le texte qui est trop
	// long et le validateur de contenu aurait dû l'attraper. C'est ce qui tient
	// le CLS à zéro.

	interface Props {
		texte: string;
		/** Sous 25 de contrôle, un filet rouge encadre le papier. Sans un mot. */
		tendu?: boolean;
		/** Rejouée à chaque incident pour relancer l'animation d'apparition. */
		cle: number;
	}

	let { texte, tendu = false, cle }: Props = $props();
</script>

{#key cle}
	<article class="carte papier" class:tendu>
		<p>{texte}</p>
	</article>
{/key}

<style>
	.carte {
		height: 340px;
		margin: 0 var(--marge);
		padding: 22px;
		display: flex;
		align-items: center;
		overflow: hidden;
		flex: none;
		animation: apparition var(--d-carte) var(--c-carte) both;
	}

	.carte p {
		font-family: var(--corps);
		font-size: 19px;
		line-height: 1.52;
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
