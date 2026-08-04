<script lang="ts">
	// Feuille de match. docs/06 §6.5.

	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { partie } from '$lib/etat/partie.svelte';
	import FeuilleDeMatch from '$lib/ui/FeuilleDeMatch.svelte';

	const LIBELLE_JUSTESSE = new Map([
		[1, 'juste'],
		[0.9, 'rectifiée'],
		[0.7, 'défendable'],
		[0.4, 'discutable'],
		[0, 'erreur']
	]);

	let detailOuvert = $state(false);

	onMount(() => {
		if (partie.resultat === null) goto(resolve('/'));
	});
</script>

<svelte:head><title>Feuille de match — SIFFLET</title></svelte:head>

{#if partie.resultat && partie.match && partie.etat}
	<main class="page">
		<FeuilleDeMatch
			match={partie.match}
			resultat={partie.resultat}
			decisions={partie.etat.decisions}
			licence={partie.sauvegarde.arbitreLocal.licence}
			divisionAvant={partie.divisionAvantMatch}
			divisionApres={partie.division}
			cle={partie.matchsJoues}
		/>

		{#if detailOuvert}
			<!-- Le seul endroit du jeu où on explique (02 §1 écran 4). -->
			<section class="detail papier">
				<h2 class="mono">Les {partie.etat.decisions.length} décisions</h2>
				<ol>
					{#each partie.etat.decisions as decision (decision.incidentId)}
						<li>
							<span class="mono minute">{decision.minute}'</span>
							<span class="libelle">
								{partie.match.incidents.find((p) => p.incident.id === decision.incidentId)?.incident
									.options[decision.optionIndex]?.libelle}
							</span>
							<span class="mono verdict">
								{LIBELLE_JUSTESSE.get(decision.justesse)}{decision.nonDecidee
									? ' · non décidée'
									: ''}
							</span>
						</li>
					{/each}
				</ol>
			</section>
		{/if}
	</main>

	<footer class="actions">
		<button class="bouton-primaire" disabled>Partager</button>
		<button class="bouton-secondaire" onclick={() => goto(resolve('/'))}>Rejouer</button>
		<button class="bouton-tertiaire" onclick={() => (detailOuvert = !detailOuvert)}>
			{detailOuvert ? 'Masquer le détail' : 'Les 12 décisions'}
		</button>
	</footer>
{:else}
	<main class="page"><p class="mono">Aucune feuille de match.</p></main>
{/if}

<style>
	.page {
		flex: 1;
		padding: 16px 0 24px;
		display: flex;
		flex-direction: column;
		gap: 16px;
	}

	.detail {
		margin: 0 16px;
		padding: 20px;
	}

	.detail h2 {
		font-size: 11px;
		color: var(--encre-pale);
		margin-bottom: 12px;
	}

	.detail ol {
		display: flex;
		flex-direction: column;
		gap: 10px;
	}

	.detail li {
		display: grid;
		grid-template-columns: 40px 1fr;
		gap: 4px 10px;
	}

	.minute {
		font-size: 11px;
		color: var(--encre-pale);
	}

	.libelle {
		font-family: var(--titre);
		font-stretch: 92%;
		font-size: 15px;
	}

	.verdict {
		grid-column: 2;
		font-size: 11px;
		color: var(--encre-pale);
		text-transform: none;
	}

	.actions {
		padding: 0 16px calc(20px + env(safe-area-inset-bottom));
		display: flex;
		flex-direction: column;
		gap: 10px;
		align-items: center;
	}

	button:disabled {
		opacity: 0.5;
		cursor: default;
	}

	/* Les actions suivent la largeur de la feuille : étalées sur tout l'écran,
	   elles n'appartiendraient plus au même objet. */
	@media (min-width: 900px) {
		.actions {
			max-width: 620px;
			margin: 0 auto;
			padding-bottom: 40px;
		}

		.detail {
			max-width: 620px;
			margin: 0 auto;
		}
	}
</style>
