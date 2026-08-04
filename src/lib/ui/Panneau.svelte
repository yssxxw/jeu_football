<script lang="ts">
	// Panneau de réglages, règles et mentions. docs/06 §6.7.
	//
	// Il n'y a pas de menu dans ce jeu : réglages, « comment on est noté » et
	// liens légaux vivent ici, derrière l'icône en haut à gauche.
	//
	// L'option « sans chrono » y est présentée comme un réglage, pas comme un
	// mode facile (06 §7).

	import { partie } from '$lib/etat/partie.svelte';

	interface Props {
		ouvert: boolean;
		onFermer: () => void;
	}

	let { ouvert, onFermer }: Props = $props();

	let confirmation = $state('');
	let demandeEffacement = $state(false);

	function basculer(cle: 'son' | 'chrono' | 'mouvementReduit', valeur: boolean) {
		partie.changerReglage(cle, valeur, new Date());
	}

	function effacer() {
		if (confirmation !== 'EFFACER') return;
		partie.effacerProgression(new Date());
		demandeEffacement = false;
		confirmation = '';
		onFermer();
	}
</script>

<svelte:window
	onkeydown={(evenement) => {
		if (ouvert && evenement.key === 'Escape') onFermer();
	}}
/>

{#if ouvert}
	<!-- Un tap hors du panneau le ferme : pas de geste à apprendre. Le libellé
	     est distinct du bouton « Fermer » de l'en-tête pour rester lisible au
	     lecteur d'écran comme aux tests. -->
	<button class="voile" aria-label="Fermer le panneau" onclick={onFermer}></button>

	<aside class="panneau" aria-label="Réglages">
		<header>
			<h2 class="titre-section">RÉGLAGES</h2>
			<button class="fermer mono" onclick={onFermer}>Fermer</button>
		</header>

		<ul class="reglages">
			<li>
				<label>
					<input
						type="checkbox"
						checked={partie.sauvegarde.reglages.son}
						onchange={(e) => basculer('son', e.currentTarget.checked)}
					/>
					<span class="mono">Son</span>
				</label>
			</li>
			<li>
				<label>
					<input
						type="checkbox"
						checked={partie.sauvegarde.reglages.chrono}
						onchange={(e) => basculer('chrono', e.currentTarget.checked)}
					/>
					<span class="mono">Chrono</span>
				</label>
				<p class="aide">Sans chrono, la partie n'est pas classée.</p>
			</li>
			<li>
				<label>
					<input
						type="checkbox"
						checked={partie.sauvegarde.reglages.mouvementReduit}
						onchange={(e) => basculer('mouvementReduit', e.currentTarget.checked)}
					/>
					<span class="mono">Mouvement réduit</span>
				</label>
			</li>
		</ul>

		<h2 class="titre-section">COMMENT ON EST NOTÉ</h2>
		<ol class="regles">
			<li>Douze décisions, une note sur 100.</li>
			<li>La justesse pèse 55 %, le contrôle du match 25 %, la constance 20 %.</li>
			<li>Une décision juste vaut 1, une décision défendable 0,7.</li>
			<li>Siffler la même chose de la même façon compte autant que voir juste.</li>
			<li>La jauge du haut est votre contrôle du match. À zéro, la rencontre s'arrête.</li>
			<li>Une décision non prise coûte 3 points.</li>
			<li>À partir de la Ligue 2, la vidéo revient sur vos erreurs graves.</li>
			<li>Au-dessus de 72, vous montez. En dessous de 49, vous descendez.</li>
		</ol>

		<h2 class="titre-section">MENTIONS</h2>
		<p class="aide">
			Clubs, joueurs et compétitions sont fictifs. Aucun compte, aucune publicité, aucune donnée
			envoyée.
		</p>

		<div class="zone-rouge">
			{#if demandeEffacement}
				<p class="aide">Écrivez EFFACER pour confirmer.</p>
				<input
					class="mono champ"
					type="text"
					bind:value={confirmation}
					aria-label="Confirmation d'effacement"
				/>
				<button class="danger mono" onclick={effacer} disabled={confirmation !== 'EFFACER'}>
					Confirmer
				</button>
			{:else}
				<button class="danger mono" onclick={() => (demandeEffacement = true)}>
					Supprimer ma progression
				</button>
			{/if}
		</div>
	</aside>
{/if}

<style>
	.voile {
		position: fixed;
		inset: 0;
		background: rgb(0 0 0 / 0.5);
		z-index: 8;
		border: none;
	}

	.panneau {
		position: fixed;
		inset: 0 auto 0 0;
		width: min(300px, 88vw);
		z-index: 9;
		padding: 20px;
		overflow-y: auto;
		background: color-mix(in srgb, var(--terrain-profond) 96%, transparent);
		color: var(--craie);
		display: flex;
		flex-direction: column;
		gap: 20px;
		animation: glisser 300ms var(--c-carte) both;
	}

	header {
		display: flex;
		justify-content: space-between;
		align-items: baseline;
	}

	h2 {
		font-size: 12px;
		color: var(--craie-pale);
	}

	.fermer {
		color: var(--craie-pale);
		text-decoration: underline;
		text-underline-offset: 3px;
	}

	.reglages {
		display: flex;
		flex-direction: column;
		gap: 12px;
	}

	label {
		display: flex;
		align-items: center;
		gap: 10px;
		min-height: 32px;
	}

	.aide,
	.regles {
		font-family: var(--corps);
		font-size: 14px;
		color: var(--craie-pale);
		line-height: 1.5;
	}

	.regles {
		display: flex;
		flex-direction: column;
		gap: 6px;
	}

	.zone-rouge {
		margin-top: auto;
		padding-top: 16px;
		border-top: 1px solid #2a2a2c;
		display: flex;
		flex-direction: column;
		gap: 8px;
	}

	.danger {
		color: var(--rouge-carton);
		text-align: left;
		min-height: 40px;
	}

	.danger:disabled {
		opacity: 0.4;
		cursor: default;
	}

	.champ {
		background: #131315;
		color: var(--craie);
		border: 1px solid #2a2a2c;
		border-radius: var(--rayon);
		padding: 8px;
	}

	@keyframes glisser {
		from {
			transform: translateX(-100%);
		}
		to {
			transform: none;
		}
	}
</style>
