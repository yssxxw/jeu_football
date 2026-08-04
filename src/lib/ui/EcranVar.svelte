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

<section class="var">
	<h2>ASSISTANCE VIDÉO</h2>
	<hr />
	<p>{bloc.revelation}</p>

	<ul>
		<li><button onclick={() => onResolution('maintien')}>Je maintiens</button></li>
		<li><button onclick={() => onResolution('rectification')}>Je rectifie</button></li>
	</ul>
</section>

<style>
	/* L'habillage définitif vient en V0-11 : ici, juste le fond noir et le mono
	   qui distinguent cet écran du reste du match. */
	.var {
		background: #000;
		color: #fff;
		padding: 1rem;
		font-family: ui-monospace, monospace;
	}

	.var ul {
		list-style: none;
		padding: 0;
	}
</style>
