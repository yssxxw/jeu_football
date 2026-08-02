<script lang="ts">
	// Anneau de chrono. docs/02-game-design.md §1, docs/07 V0-8.
	//
	// Deux phases. D'abord la LECTURE : l'anneau reste plein, rien ne se
	// consomme, le joueur lit. Puis la DÉCISION : l'anneau se vide selon le
	// chrono de la division. Les options sont cliquables dès la première phase,
	// qui a compris tout de suite n'attend pas.
	//
	// performance.now() + requestAnimationFrame, jamais setInterval : setInterval
	// dérive et se fait étrangler par les navigateurs en arrière-plan.
	//
	// Le décompte se met en pause sur visibilitychange et reprend au retour. Une
	// notification entrante ne doit jamais coûter une décision au joueur : le
	// temps passé onglet caché n'est décompté dans aucune des deux phases.

	import { untrack } from 'svelte';

	interface Props {
		/** Temps de lecture accordé avant que le décompte ne commence. */
		lectureMs: number;
		/** Temps de décision, une fois la lecture terminée. */
		dureeMs: number;
		/** Change à chaque incident : remet les deux phases à zéro. */
		cle: number;
		onExpiration: () => void;
	}

	let { lectureMs, dureeMs, cle, onExpiration }: Props = $props();

	// Capture volontaire des valeurs initiales : l'effet ci-dessous reprend la
	// main dès la première image, et partir de la durée pleine évite que l'anneau
	// apparaisse vide le temps d'une image.
	let restantMs = $state(untrack(() => dureeMs));
	let enLecture = $state(untrack(() => lectureMs > 0));

	const fraction = $derived(dureeMs === 0 ? 0 : Math.max(0, Math.min(1, restantMs / dureeMs)));

	$effect(() => {
		// Dépendances explicites : un nouvel incident relance un cycle neuf.
		const lecture = lectureMs;
		const decision = dureeMs;
		void cle;

		restantMs = decision;
		enLecture = lecture > 0;

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

				if (ecoule < lecture) {
					enLecture = true;
					restantMs = decision;
				} else {
					enLecture = false;
					const ecouleEnDecision = ecoule - lecture;
					restantMs = Math.max(0, decision - ecouleEnDecision);
					if (ecouleEnDecision >= decision) {
						expire = true;
						onExpiration();
						return;
					}
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
	Les attributs data- servent aux tests, et ne coûtent rien.
-->
<div
	class="chrono"
	class:lecture={enLecture}
	data-restant-ms={Math.round(restantMs)}
	data-phase={enLecture ? 'lecture' : 'decision'}
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

	/* Pendant la lecture, l'anneau est plein et neutre : rien ne presse encore. */
	.chrono.lecture::before {
		background: #999;
	}
</style>
