<script lang="ts">
	// Anneau de chrono. docs/02-game-design.md §1, docs/07 V0-8.
	//
	// performance.now() + requestAnimationFrame, jamais setInterval : setInterval
	// dérive et se fait étrangler par les navigateurs en arrière-plan.
	//
	// Le décompte se met en pause sur visibilitychange et reprend au retour. Une
	// notification entrante ne doit jamais coûter une décision au joueur : le
	// temps passé onglet caché n'est pas décompté.

	import { untrack } from 'svelte';

	interface Props {
		dureeMs: number;
		/** Change à chaque incident : remet le décompte à zéro. */
		cle: number;
		onExpiration: () => void;
	}

	let { dureeMs, cle, onExpiration }: Props = $props();

	// Capture volontaire de la valeur initiale : l'effet ci-dessous reprend la
	// main dès la première image, et partir de la durée pleine évite que l'anneau
	// apparaisse vide le temps d'une image.
	let restantMs = $state(untrack(() => dureeMs));

	const fraction = $derived(dureeMs === 0 ? 0 : Math.max(0, Math.min(1, restantMs / dureeMs)));

	$effect(() => {
		// Dépendances explicites : un nouvel incident relance un décompte neuf.
		const duree = dureeMs;
		void cle;

		restantMs = duree;

		let debut = performance.now();
		let ecouleAvantPause = 0;
		let image = 0;
		let expire = false;

		const boucle = (): void => {
			if (expire) return;
			// requestAnimationFrame ne se déclenche pas onglet caché, mais certains
			// navigateurs se contentent de l'étrangler : on ne compte donc rien
			// tant que le document est caché, quoi qu'il arrive.
			if (!document.hidden) {
				const ecoule = ecouleAvantPause + (performance.now() - debut);
				restantMs = Math.max(0, duree - ecoule);
				if (ecoule >= duree) {
					expire = true;
					onExpiration();
					return;
				}
			}
			image = requestAnimationFrame(boucle);
		};

		const surVisibilite = (): void => {
			if (document.hidden) {
				ecouleAvantPause += performance.now() - debut;
			} else {
				debut = performance.now();
				// rAF est arrêté pendant que l'onglet est caché : on le relance.
				if (!expire) {
					cancelAnimationFrame(image);
					image = requestAnimationFrame(boucle);
				}
			}
		};

		document.addEventListener('visibilitychange', surVisibilite);
		image = requestAnimationFrame(boucle);

		return () => {
			expire = true;
			cancelAnimationFrame(image);
			document.removeEventListener('visibilitychange', surVisibilite);
		};
	});
</script>

<!--
	Pas de compteur de chiffres : on ne veut pas que le joueur regarde le chrono,
	on veut qu'il le sente. L'habillage définitif vient en V0-11.
	data-restant-ms sert aux tests, et ne coûte rien.
-->
<div
	class="chrono"
	data-restant-ms={Math.round(restantMs)}
	aria-hidden="true"
	style="--fraction: {fraction}"
></div>

<style>
	.chrono {
		height: 4px;
		width: 100%;
		background: #ddd;
	}

	.chrono::before {
		content: '';
		display: block;
		height: 100%;
		width: calc(var(--fraction) * 100%);
		background: #333;
	}
</style>
