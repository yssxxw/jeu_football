<script lang="ts">
	// Un choix de décision. docs/06 §4.
	//
	// 56 px de haut, séparés par 1 px : les options forment un bloc, pas quatre
	// cartes. C'est un bulletin de vote, pas un menu.

	interface Props {
		libelle: string;
		/** Rang affiché sur desktop, où les touches 1 à 4 choisissent (06 §7). */
		rang: number;
		onChoix: () => void;
	}

	let { libelle, rang, onChoix }: Props = $props();
</script>

<button class="option" onclick={onChoix}>
	<span class="rang" aria-hidden="true">{rang}</span>
	<span class="libelle">{libelle}</span>
</button>

<style>
	.option {
		display: flex;
		align-items: center;
		gap: 12px;
		width: 100%;
		min-height: 56px;
		padding: 8px 16px;
		text-align: left;
		background: var(--papier);
		color: var(--encre);
		border-radius: 0;
		/* Le filet de séparation est posé par la liste parente : ici, chaque
		   bouton est seul dans son li, donc :first-child les viserait tous. */
		transition: transform var(--d-bouton) ease-out;
	}

	.option:active {
		transform: scale(0.985);
	}

	.rang {
		font-family: var(--interface);
		font-size: 11px;
		color: var(--encre-pale);
		/* Le rang n'a de sens qu'au clavier : on le cache au pouce. */
		display: none;
	}

	.libelle {
		font-family: var(--interface);
		font-size: 14px;
		line-height: 1.3;
		letter-spacing: 0.04em;
		text-transform: uppercase;
	}

	/* Navigation clavier complète sur desktop, affichée en petit (06 §7). */
	@media (pointer: fine) {
		.rang {
			display: inline;
		}
	}
</style>
