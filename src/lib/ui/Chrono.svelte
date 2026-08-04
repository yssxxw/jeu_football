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

	let largeur = $state(0);
	let hauteur = $state(0);

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
	Un anneau de 3 px qui suit le périmètre intérieur de l'écran et se vide dans
	le sens horaire depuis le haut (06 §6.2). Pas de compteur de chiffres : on ne
	veut pas que le joueur regarde le chrono, on veut qu'il le sente.
	Les attributs data- servent aux tests, et ne coûtent rien.
-->
<!--
	Le viewBox suit les dimensions réelles du cadre : un viewBox carré étiré
	déformerait les tirets et l'anneau sortirait en morceaux.
-->
<div class="cadre-anneau" bind:clientWidth={largeur} bind:clientHeight={hauteur}>
	{#if largeur > 0 && hauteur > 0}
		<svg
			class="anneau"
			class:lecture={enLecture}
			class:urgence={!enLecture && fraction <= 0.25}
			data-restant-ms={Math.round(restantMs)}
			data-phase={enLecture ? 'lecture' : 'decision'}
			aria-hidden="true"
			viewBox="0 0 {largeur} {hauteur}"
			width={largeur}
			height={hauteur}
		>
			<!--
				pathLength normalise le périmètre à 100 quelle que soit la taille de
				l'écran : le dasharray se raisonne alors en pourcentage. Le tracé part
				du haut au centre et tourne dans le sens horaire.
			-->
			<path
				class="trait"
				pathLength="100"
				d="M {largeur / 2} 1.5 H {largeur - 1.5} V {hauteur - 1.5} H 1.5 V 1.5 Z"
				style="stroke-dasharray: {(fraction * 100).toFixed(3)} 100"
			/>
		</svg>
	{/if}
</div>

<style>
	/*
	 * Décalé de 4 px du haut : la jauge de contrôle occupe la ligne 0 (06 §6.2),
	 * et l'anneau suit le périmètre *intérieur*. Sans ce décalage, l'anneau
	 * passerait par-dessus la jauge et la masquerait.
	 */
	.cadre-anneau {
		position: fixed;
		inset: 4px 0 0;
		width: 100%;
		max-width: var(--cadre);
		height: calc(100dvh - 4px);
		margin: 0 auto;
		pointer-events: none;
		z-index: 2;
	}

	.anneau {
		display: block;
	}

	.trait {
		fill: none;
		stroke: var(--craie-pale);
		stroke-width: 3;
		/* linear strictement : toute autre courbe est un mensonge (06 §5). */
		transition: stroke-dasharray 100ms linear;
	}

	/* Pendant la lecture, l'anneau est plein et discret : rien ne presse encore. */
	.anneau.lecture .trait {
		stroke: var(--craie-pale);
		opacity: 0.45;
	}

	/* Sur les 25 derniers pourcents, il passe au rouge (06 §6.2). */
	.anneau.urgence .trait {
		stroke: var(--rouge-carton);
	}
</style>
