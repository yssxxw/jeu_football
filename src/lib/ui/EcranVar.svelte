<script lang="ts">
	// Écran d'assistance vidéo. docs/02-game-design.md §1 écran 2bis et §3.
	//
	// Pas de chrono ici, et c'est voulu : c'est la seule respiration du match.
	// Douze incidents à six secondes d'affilée finissent en bouillie ; la vidéo
	// casse la cadence une ou deux fois, au moment le plus chaud. C'est le seul
	// moment du jeu où on pense au lieu de réagir. Arbitrage détaillé en 02 §8.3.

	import type { BlocVar, ResolutionVar } from '$lib/moteur/types';

	interface Props {
		bloc: BlocVar;
		onResolution: (resolution: ResolutionVar) => void;
	}

	let { bloc, onResolution }: Props = $props();
</script>

<!--
	Pas de chrono, pas de jauge, pas de score. On sort du match pendant vingt
	secondes, l'écran doit le dire par le vide (06 §6.4).
-->
<section class="var">
	<header>
		<h2 class="mono">Assistance vidéo</h2>
		<span class="filet" aria-hidden="true"></span>
	</header>

	<p class="revelation">{bloc.revelation}</p>

	<ul class="reponses">
		<li>
			<button class="reponse mono" onclick={() => onResolution('maintien')}>Je maintiens</button>
		</li>
		<li>
			<button class="reponse mono" onclick={() => onResolution('rectification')}>Je rectifie</button
			>
		</li>
	</ul>
</section>

<style>
	.var {
		position: fixed;
		inset: 0;
		width: 100%;
		max-width: var(--cadre);
		margin: 0 auto;
		z-index: 5;
		background: var(--terrain-profond);
		display: flex;
		flex-direction: column;
		padding: 32px 32px calc(0px + env(safe-area-inset-bottom));
		animation: entree-var 200ms ease-out both;
	}

	header {
		flex: none;
	}

	h2 {
		font-size: 12px;
		color: var(--bleu-var);
	}

	/* Le filet bleu se trace de gauche à droite. Le bleu n'apparaît que sur cet
	   écran, nulle part ailleurs : il signale qu'on a changé de monde. */
	.filet {
		display: block;
		height: 2px;
		margin-top: 8px;
		background: var(--bleu-var);
		transform-origin: left;
		animation: tracer-filet 200ms ease-out 200ms both;
	}

	.revelation {
		flex: 1;
		display: flex;
		align-items: center;
		font-family: var(--corps);
		font-size: 20px;
		line-height: 1.5;
		color: var(--craie);
	}

	.reponses {
		flex: none;
		margin: 0 -32px;
	}

	.reponse {
		display: block;
		width: 100%;
		min-height: 60px;
		border-radius: 0;
		border-top: 1px solid #1a1a1d;
		font-size: 14px;
		color: var(--craie);
		text-align: center;
	}

	@keyframes entree-var {
		from {
			opacity: 0;
		}
		to {
			opacity: 1;
		}
	}

	@keyframes tracer-filet {
		from {
			transform: scaleX(0);
		}
		to {
			transform: scaleX(1);
		}
	}
</style>
