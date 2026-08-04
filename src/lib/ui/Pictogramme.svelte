<script lang="ts">
	// Pictogrammes des familles d'incidents. docs/06 §1bis.
	//
	// Dessinés au trait, en géométrie simple, dans l'esprit des pictogrammes
	// d'un formulaire de fédération — pas une mascotte, pas une illustration
	// décorative. Ils servent la lecture : on voit en un coup d'œil de quelle
	// nature est l'incident avant même d'avoir lu le texte.
	//
	// Tout est inline et en currentColor : aucun fichier, aucun poids réseau,
	// et ils s'adaptent au papier comme au terrain.

	import type { Famille } from '$lib/moteur/types';

	interface Props {
		famille: Famille | 'sifflet';
		taille?: number;
		/** Décrit l'image quand elle porte une information à elle seule. */
		titre?: string;
	}

	let { famille, taille = 40, titre }: Props = $props();
</script>

<svg
	class="picto"
	width={taille}
	height={taille}
	viewBox="0 0 48 48"
	fill="none"
	stroke="currentColor"
	stroke-width="1.75"
	stroke-linecap="round"
	stroke-linejoin="round"
	role={titre === undefined ? 'presentation' : 'img'}
	aria-hidden={titre === undefined}
	aria-label={titre}
>
	{#if famille === 'tacle'}
		<!-- Jambe en glissade, semelle en avant, et le ballon devant. -->
		<path d="M6 38 L20 34 L30 27" />
		<path d="M20 34 L17 41" />
		<path d="M30 27 L36 21" />
		<circle cx="39" cy="17" r="5" />
		<path d="M4 43 H44" stroke-dasharray="2 3" />
	{:else if famille === 'main'}
		<!-- Bras écarté du corps, ballon au contact de la main. -->
		<path d="M14 42 V22" />
		<path d="M14 24 L28 16" />
		<path d="M28 16 L31 11 M31 11 L34 13" />
		<circle cx="38" cy="12" r="5" />
		<path d="M4 43 H44" stroke-dasharray="2 3" />
	{:else if famille === 'simulation'}
		<!-- Silhouette qui part au sol, trajectoire de chute marquée. -->
		<circle cx="16" cy="14" r="4" />
		<path d="M16 18 L20 28 L30 33" />
		<path d="M20 28 L14 34" />
		<path d="M26 12 C32 18 34 26 32 33" stroke-dasharray="3 3" />
		<path d="M4 43 H44" stroke-dasharray="2 3" />
	{:else if famille === 'contestation'}
		<!-- Deux figures face à face, la parole matérialisée en traits. -->
		<circle cx="13" cy="16" r="4" />
		<path d="M13 20 V34 M13 24 L8 30 M13 24 L18 29" />
		<circle cx="35" cy="16" r="4" />
		<path d="M35 20 V34 M35 24 L30 29 M35 24 L40 30" />
		<path d="M21 16 H27 M21 21 H25" />
	{:else if famille === 'antijeu'}
		<!-- Le temps qu'on grignote : cadran et aiguille arrêtée. -->
		<circle cx="24" cy="26" r="13" />
		<path d="M24 18 V26 L30 30" />
		<path d="M20 8 H28" />
		<path d="M24 8 V13" />
	{:else if famille === 'duel_aerien'}
		<!-- Deux têtes qui montent sur le même ballon. -->
		<circle cx="24" cy="10" r="5" />
		<circle cx="13" cy="24" r="4" />
		<path d="M13 28 V40" />
		<circle cx="35" cy="24" r="4" />
		<path d="M35 28 V40" />
		<path d="M17 21 L21 15 M31 21 L27 15" stroke-dasharray="3 2" />
	{:else if famille === 'hors_jeu'}
		<!-- Le drapeau de l'assistant et la ligne de hors-jeu. -->
		<path d="M14 42 V8" />
		<path d="M14 9 L34 15 L14 21 Z" />
		<path d="M30 42 V26" stroke-dasharray="3 3" />
		<path d="M4 42 H44" />
	{:else if famille === 'provocation'}
		<!-- Célébration face au parcage : bras levés, barrière devant. -->
		<circle cx="18" cy="13" r="4" />
		<path d="M18 17 V30 M18 20 L11 14 M18 20 L25 14 M18 30 L13 40 M18 30 L23 40" />
		<path d="M33 40 V18" />
		<path d="M33 22 H44 M33 30 H44" />
	{:else if famille === 'banc'}
		<!-- Le banc et la ligne de la zone technique. -->
		<path d="M8 26 H40" />
		<path d="M8 32 H40" />
		<path d="M12 26 V38 M36 26 V38" />
		<circle cx="16" cy="16" r="3" />
		<circle cx="26" cy="16" r="3" />
		<path d="M4 43 H44" stroke-dasharray="2 3" />
	{:else}
		<!-- Le sifflet : l'objet du jeu, utilisé comme marque. -->
		<path d="M8 20 H28 A9 9 0 1 1 28 34 H16 A8 8 0 0 1 8 26 Z" />
		<circle cx="31" cy="27" r="3.5" />
		<path d="M8 22 L2 18 M8 30 L2 34" />
	{/if}
</svg>

<style>
	.picto {
		display: block;
		flex: none;
	}
</style>
