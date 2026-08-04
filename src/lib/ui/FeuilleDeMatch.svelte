<script lang="ts">
	// Feuille de match. docs/06 §6.5.
	//
	// C'est un objet, pas un tableau de bord : une feuille arrachée d'un carnet
	// à souche, avec un bord supérieur irrégulier.

	import { TABLE_DIVISIONS } from '$lib/moteur/equilibrage';
	import type { DecisionPrise, Match, Palier, Resultat } from '$lib/moteur/types';
	import Pictogramme from './Pictogramme.svelte';

	interface Props {
		match: Match;
		resultat: Resultat;
		decisions: readonly DecisionPrise[];
		licence: string;
		divisionAvant: Palier;
		divisionApres: Palier;
		/** Rejouée pour relancer l'incrémentation de la note. */
		cle: number;
	}

	let { match, resultat, decisions, licence, divisionAvant, divisionApres, cle }: Props = $props();

	// L'action litigieuse : la gravité la plus haute, et à égalité la plus tardive.
	const litigieux = $derived.by(() => {
		let choisie: DecisionPrise | null = null;
		for (const prise of decisions) {
			if (choisie === null || prise.gravite >= choisie.gravite) choisie = prise;
		}
		return choisie;
	});

	const libelleLitigieux = $derived.by(() => {
		if (litigieux === null) return null;
		const programme = match.incidents.find(({ incident }) => incident.id === litigieux.incidentId);
		return programme?.incident.options[litigieux.optionIndex]?.libelle ?? null;
	});

	const mouvement = $derived(
		divisionApres > divisionAvant
			? `MONTÉE — ${TABLE_DIVISIONS[divisionApres]?.nom.toUpperCase()}`
			: divisionApres < divisionAvant
				? `DESCENTE — ${TABLE_DIVISIONS[divisionApres]?.nom.toUpperCase()}`
				: 'MAINTIEN'
	);

	const cartons = $derived(
		decisions
			.filter((prise) => prise.severite >= 2)
			.map((prise) => (prise.severite === 2 ? 'jaune' : 'rouge'))
	);

	// La note s'incrémente de 0 à sa valeur, par entiers, jamais de décimale.
	let noteAffichee = $state(0);

	$effect(() => {
		void cle;
		const cible = resultat.note;
		const depart = performance.now();
		const duree = 700;
		let image = 0;

		const boucle = (): void => {
			const t = Math.min(1, (performance.now() - depart) / duree);
			// easeOutExpo
			const progression = t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
			noteAffichee = Math.round(cible * progression);
			if (t < 1) image = requestAnimationFrame(boucle);
		};
		image = requestAnimationFrame(boucle);
		return () => cancelAnimationFrame(image);
	});
</script>

<article class="feuille papier">
	<header class="entete mono">
		<span>{TABLE_DIVISIONS[match.division]?.nom}</span>
		<span>LIC. {licence}</span>
	</header>

	{#if resultat.horsClassement}
		<p class="hors-classement mono">Sans chrono — hors classement</p>
	{/if}

	<p class="affiche">
		{match.domicile.nom}
		{resultat.buts.domicile} – {resultat.buts.exterieur}
		{match.exterieur.nom}
	</p>

	<div class="bloc-note">
		<span class="note" data-note={resultat.note}>{noteAffichee}</span><span class="sur-cent mono"
			>/100</span
		>

		{#if resultat.matchArrete}
			<span class="tampon mono">Match arrêté</span>
		{/if}
	</div>

	<p class="mention">{resultat.mention}</p>

	{#if litigieux !== null && libelleLitigieux !== null}
		<div class="litigieux">
			<p class="mono entete-litige">
				<Pictogramme famille={litigieux.famille} taille={26} />
				<span>{litigieux.minute}' — {litigieux.famille.replace('_', ' ')}</span>
			</p>
			<p class="ligne-litige">VOUS : {libelleLitigieux}</p>
			<!-- La comparaison arrive en V1-6. Hors ligne comme avant serveur,
			     on affiche un tiret plutôt qu'une valeur inventée (06 §6.5). -->
			<p class="ligne-litige">LES AUTRES : —</p>
		</div>
	{/if}

	<p class="sous-notes mono">
		JUSTESSE {resultat.justesse} · CONTRÔLE {resultat.controle} · CONSTANCE {resultat.constance}
	</p>

	{#if cartons.length > 0}
		<p class="cartons">
			{#each cartons as couleur, index (index)}
				<span class="carton" data-couleur={couleur}></span>
			{/each}
			<span class="mono legende">
				{cartons.filter((c) => c === 'jaune').length} jaune(s), {cartons.filter(
					(c) => c === 'rouge'
				).length} rouge(s)
			</span>
		</p>
	{/if}

	{#if resultat.rectificationsVar + resultat.maintiensVarErrones > 0}
		<p class="mono ligne-var">
			Assistance vidéo : {resultat.rectificationsVar} rectification(s), {resultat.maintiensVarErrones}
			maintien(s)
		</p>
	{/if}

	<p class="mouvement mono">{mouvement}</p>
</article>

<style>
	/*
	 * Bord supérieur irrégulier : la feuille a été arrachée d'un carnet à
	 * souche. Masque SVG à dents de 1,5 px.
	 */
	.feuille {
		margin: 0 16px;
		padding: 28px;
		display: flex;
		flex-direction: column;
		gap: 14px;
		mask-image:
			url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='4' preserveAspectRatio='none'%3E%3Cpath d='M0 4 L0 1.5 L3 3 L6 1.5 L9 3 L12 1.5 L12 4 Z' fill='%23fff'/%3E%3C/svg%3E"),
			linear-gradient(#fff, #fff);
		mask-size:
			12px 4px,
			100% calc(100% - 4px);
		mask-position:
			top left,
			bottom left;
		mask-repeat: repeat-x, no-repeat;
	}

	.entete {
		display: flex;
		justify-content: space-between;
		font-size: 11px;
		color: var(--encre-pale);
		padding-bottom: 8px;
		border-bottom: 1px solid var(--papier-ombre);
	}

	.hors-classement {
		font-size: 10px;
		color: var(--encre-pale);
		text-transform: none;
	}

	.affiche {
		font-family: var(--titre);
		font-stretch: 88%;
		font-size: 22px;
		line-height: 1.2;
		text-transform: uppercase;
	}

	.bloc-note {
		position: relative;
		min-height: 150px;
		display: flex;
		align-items: baseline;
		gap: 6px;
	}

	.note {
		font-family: var(--titre);
		font-stretch: 135%;
		font-size: 128px;
		line-height: 1;
		font-variant-numeric: tabular-nums;
	}

	.sur-cent {
		font-size: 14px;
		color: var(--encre-pale);
		align-self: flex-start;
		padding-top: 12px;
	}

	/* La seule animation exubérante du jeu : c'est la capture la plus partagée. */
	.tampon {
		position: absolute;
		/* En travers de la note, mais assez bas pour que les deux restent
		   lisibles : c'est la capture la plus partagée du jeu. */
		top: 84px;
		left: 4px;
		font-size: 20px;
		font-weight: 700;
		color: var(--rouge-carton);
		border: 2px solid var(--rouge-carton);
		border-radius: var(--rayon);
		padding: 6px 12px;
		opacity: 0.88;
		transform: rotate(-7deg);
		animation: tampon var(--d-tampon) var(--c-carton) both;
	}

	.mention {
		font-family: var(--corps);
		font-style: italic;
		font-size: 21px;
		line-height: 1.35;
	}

	.litigieux {
		border-top: 1px solid var(--papier-ombre);
		padding-top: 12px;
		display: flex;
		flex-direction: column;
		gap: 4px;
	}

	.entete-litige {
		display: flex;
		align-items: center;
		gap: 8px;
		font-size: 11px;
		color: var(--encre-pale);
	}

	/* Sur écran large, la feuille garde une largeur de lecture confortable
	   plutôt que de s'étirer sur tout l'écran. */
	@media (min-width: 900px) {
		.feuille {
			max-width: 620px;
			margin: 0 auto;
			padding: 40px;
		}

		.note {
			font-size: 156px;
		}
	}

	.ligne-litige {
		font-family: var(--titre);
		font-stretch: 92%;
		font-size: 17px;
	}

	.sous-notes {
		font-size: 12px;
		color: var(--encre-pale);
	}

	.cartons {
		display: flex;
		align-items: center;
		gap: 6px;
	}

	.carton {
		display: inline-block;
		width: 14px;
		height: 20px;
		border-radius: var(--rayon);
	}

	.carton[data-couleur='jaune'] {
		background: var(--jaune-carton);
	}

	.carton[data-couleur='rouge'] {
		background: var(--rouge-carton);
	}

	.legende,
	.ligne-var {
		font-size: 11px;
		color: var(--encre-pale);
		text-transform: none;
	}

	.mouvement {
		font-size: 13px;
		padding-top: 10px;
		border-top: 1px solid var(--papier-ombre);
	}

	@keyframes tampon {
		from {
			transform: rotate(-7deg) scale(1.4);
			opacity: 0;
		}
		to {
			transform: rotate(-7deg) scale(1);
			opacity: 0.88;
		}
	}
</style>
