// Le seul store du jeu. Les composants reçoivent et affichent, ils ne calculent rien.
//
// C'est ici, et dans src/routes/, que vivent les seuls appels à Date.now() :
// le moteur, lui, reçoit toujours le temps en argument.

import { CLUBS, CONTEXTES, INCIDENTS } from '$lib/contenu';
import { appliquer, etatInitial, type Decision } from '$lib/moteur/appliquer';
import { composer } from '$lib/moteur/composer';
import { TABLE_DIVISIONS } from '$lib/moteur/equilibrage';
import { divisionApres, noter } from '$lib/moteur/noter';
import { seedDuJour, seedLibre } from '$lib/moteur/seed';
import type { EtatPartie, Palier, Resultat } from '$lib/moteur/types';

const CONTENU = { incidents: INCIDENTS, clubs: CLUBS, contextes: CONTEXTES };

/** Division du match du jour : la même pour toute la planète (02 §7). */
const DIVISION_MATCH_DU_JOUR: Palier = 6;

export type PhaseEcran = 'incident' | 'consequence';

class Partie {
	/** Division courante du joueur. La persistance arrive en V0-7. */
	division = $state<Palier>(0);
	matchsJoues = $state(0);

	etat = $state<EtatPartie | null>(null);
	resultat = $state<Resultat | null>(null);
	phase = $state<PhaseEcran>('incident');
	/** Index de l'option qui vient d'être jouée, pour l'écran de conséquence. */
	dernierChoix = $state<number | null>(null);
	estMatchDuJour = $state(false);

	readonly match = $derived(this.etat?.match ?? null);

	readonly incidentCourant = $derived(
		this.etat === null ? null : (this.etat.match.incidents[this.etat.index] ?? null)
	);

	readonly incidentJoue = $derived(
		this.etat === null || this.etat.index === 0
			? null
			: (this.etat.match.incidents[this.etat.index - 1] ?? null)
	);

	readonly optionJouee = $derived(
		this.incidentJoue === null || this.dernierChoix === null
			? null
			: (this.incidentJoue.incident.options[this.dernierChoix] ?? null)
	);

	readonly controle = $derived(this.etat?.controle ?? 0);

	readonly numeroIncident = $derived(this.etat === null ? 0 : this.etat.index + 1);

	readonly nomDivision = $derived(TABLE_DIVISIONS[this.division]?.nom ?? '');

	/** Chrono de l'incident courant, en secondes. Le chrono lui-même arrive en V0-8. */
	readonly chronoS = $derived(
		this.incidentCourant?.incident.chronoS ?? TABLE_DIVISIONS[this.division]?.chronoS ?? 6
	);

	/** Prépare l'affiche visible sur l'écran de coup d'envoi, sans démarrer la partie. */
	composerAffiche(compteur: number): void {
		const seed = seedLibre(this.division, compteur);
		this.etat = etatInitial(composer(seed, this.division, CONTENU));
		this.resultat = null;
		this.phase = 'incident';
		this.dernierChoix = null;
		this.estMatchDuJour = false;
	}

	demarrerMatchLibre(compteur: number): void {
		this.composerAffiche(compteur);
	}

	demarrerMatchDuJour(maintenant: Date): void {
		const match = composer(seedDuJour(maintenant), DIVISION_MATCH_DU_JOUR, CONTENU);
		this.etat = etatInitial(match);
		this.resultat = null;
		this.phase = 'incident';
		this.dernierChoix = null;
		this.estMatchDuJour = true;
	}

	/** Joue une décision. `null` correspond à l'expiration du chrono. */
	decider(decision: Decision): void {
		if (this.etat === null || this.etat.termine) return;
		const avant = this.etat;
		const apres = appliquer(avant, decision);
		this.dernierChoix = apres.decisions[apres.decisions.length - 1]?.optionIndex ?? null;
		this.etat = apres;
		this.phase = 'consequence';
	}

	/** Passe de l'écran de conséquence à l'incident suivant, ou termine le match. */
	continuer(): void {
		if (this.etat === null) return;
		if (this.etat.termine) {
			this.terminer();
			return;
		}
		this.phase = 'incident';
	}

	private terminer(): void {
		if (this.etat === null || this.resultat !== null) return;
		const resultat = noter(this.etat);
		this.resultat = resultat;
		this.matchsJoues += 1;
		// Le match du jour se joue en division 6 sans faire bouger la progression.
		if (!this.estMatchDuJour) {
			this.division = divisionApres(this.division, resultat.note);
		}
	}
}

export const partie = new Partie();
