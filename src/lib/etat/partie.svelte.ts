// Le seul store du jeu. Les composants reçoivent et affichent, ils ne calculent rien.
//
// C'est ici, et dans src/routes/, que vivent les seuls appels à Date.now() :
// le moteur, lui, reçoit toujours le temps en argument.

import { CLUBS, CONTEXTES, INCIDENTS } from '$lib/contenu';
import { appliquer, etatInitial, resoudreVar, type Decision } from '$lib/moteur/appliquer';
import { dureeLectureMs } from '$lib/moteur/chrono';
import { composer } from '$lib/moteur/composer';
import { TABLE_DIVISIONS } from '$lib/moteur/equilibrage';
import { divisionApres, noter } from '$lib/moteur/noter';
import { seedDuJour, seedLibre } from '$lib/moteur/seed';
import type { EtatPartie, Palier, ResolutionVar, Resultat } from '$lib/moteur/types';
import {
	charger,
	CLE,
	CLE_CORROMPUE,
	enregistrer,
	MAX_INCIDENTS_RECENTS,
	sauvegardeVierge,
	stockageNavigateur,
	type StockageBrut
} from '$lib/sauvegarde/stockage';
import type { Sauvegarde } from '$lib/sauvegarde/types';

const CONTENU = { incidents: INCIDENTS, clubs: CLUBS, contextes: CONTEXTES };

/** Division du match du jour : la même pour toute la planète (02 §7). */
const DIVISION_MATCH_DU_JOUR: Palier = 6;

export type PhaseEcran = 'incident' | 'consequence' | 'var';

class Partie {
	private stockage: StockageBrut | null = null;

	sauvegarde = $state<Sauvegarde>(sauvegardeVierge(new Date(0), { licence: 'FR-0000-A' }));
	/** Vrai quand la sauvegarde précédente était illisible et a été mise de côté. */
	sauvegardeCorrompue = $state(false);
	chargee = $state(false);

	etat = $state<EtatPartie | null>(null);
	resultat = $state<Resultat | null>(null);
	phase = $state<PhaseEcran>('incident');
	/** Index de l'option qui vient d'être jouée, pour l'écran de conséquence. */
	dernierChoix = $state<number | null>(null);
	estMatchDuJour = $state(false);
	/** Division d'avant le match, pour que la feuille dise montée, maintien ou descente. */
	divisionAvantMatch = $state<Palier>(0);

	readonly division = $derived(this.sauvegarde.progression.division);
	readonly matchsJoues = $derived(this.sauvegarde.progression.matchsJoues);
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

	/**
	 * Minute affichée. Celle de l'incident en cours, ou celle du dernier joué
	 * pendant la conséquence. Aucune indication du type « 7/12 » n'est exposée :
	 * le joueur ne doit pas compter les incidents restants (06 §6.2).
	 */
	readonly minuteCourante = $derived(
		this.phase === 'incident'
			? (this.incidentCourant?.minute ?? this.incidentJoue?.minute ?? 0)
			: (this.incidentJoue?.minute ?? 0)
	);
	readonly nomDivision = $derived(TABLE_DIVISIONS[this.division]?.nom ?? '');

	/**
	 * Division du match en cours, qui n'est pas celle du joueur pendant le match
	 * du jour : celui-ci se joue en Ligue 1 pour tout le monde.
	 */
	readonly divisionEnCours = $derived(this.etat?.match.division ?? this.division);

	/**
	 * Durée du chrono de l'incident courant, en millisecondes. Celle de la
	 * division, sauf quand l'incident porte la sienne — tacle_intro, le tutoriel
	 * invisible, laisse 10 s pour lire (02 §9).
	 */
	readonly chronoMs = $derived(
		(this.incidentCourant?.incident.chronoS ??
			TABLE_DIVISIONS[this.divisionEnCours]?.chronoS ??
			6) * 1000
	);

	/**
	 * Temps de lecture accordé avant que le chrono ne démarre, en millisecondes.
	 * Le chrono mesure la décision, pas la lecture (02 §1).
	 */
	readonly lectureMs = $derived(
		this.incidentCourant === null ? 0 : dureeLectureMs(this.incidentCourant.incident)
	);

	/** Réglage « sans chrono » : retire l'anneau, le malus, et le classement. */
	readonly chronoActif = $derived(this.sauvegarde.reglages.chrono);

	/** Lecture unique au démarrage. Ne lance jamais, même sans stockage. */
	initialiser(maintenant: Date, options: { mouvementReduit?: boolean } = {}): void {
		if (this.chargee) return;
		this.stockage = stockageNavigateur();
		const chargement = charger(this.stockage, maintenant, options);
		this.sauvegarde = chargement.sauvegarde;
		this.sauvegardeCorrompue = chargement.corrompue;
		this.chargee = true;
	}

	/** Prépare l'affiche visible sur l'écran de coup d'envoi, sans démarrer la partie. */
	composerAffiche(): void {
		const seed = seedLibre(this.division, this.matchsJoues);
		this.etat = etatInitial(
			composer(seed, this.division, CONTENU, {
				recentIncidents: this.sauvegarde.recentIncidents
			})
		);
		this.resultat = null;
		this.phase = 'incident';
		this.dernierChoix = null;
		this.estMatchDuJour = false;
	}

	demarrerMatchLibre(): void {
		this.composerAffiche();
	}

	demarrerMatchDuJour(maintenant: Date): void {
		// Le match du jour ignore le cooldown local : il doit rester identique
		// pour tout le monde, quelles que soient les parties déjà jouées.
		const match = composer(seedDuJour(maintenant), DIVISION_MATCH_DU_JOUR, CONTENU);
		this.etat = etatInitial(match);
		this.resultat = null;
		this.phase = 'incident';
		this.dernierChoix = null;
		this.estMatchDuJour = true;
	}

	/** Bloc VAR de l'incident sur lequel la vidéo attend une réponse. */
	readonly blocVar = $derived.by(() => {
		if (this.etat === null || this.etat.varEnAttente === null) return null;
		const prise = this.etat.decisions[this.etat.varEnAttente];
		if (prise === undefined) return null;
		return (
			this.etat.match.incidents.find(({ incident }) => incident.id === prise.incidentId)?.incident
				.var ?? null
		);
	});

	/** Joue une décision. `null` correspond à l'expiration du chrono. */
	decider(decision: Decision): void {
		if (this.etat === null || this.etat.termine) return;
		const apres = appliquer(this.etat, decision);
		this.dernierChoix = apres.decisions[apres.decisions.length - 1]?.optionIndex ?? null;
		this.etat = apres;
		this.phase = 'consequence';
	}

	/** Répond à la vidéo. Sans réponse, la partie ne peut pas avancer. */
	repondreVar(resolution: ResolutionVar): void {
		if (this.etat === null || this.etat.varEnAttente === null) return;
		this.etat = resoudreVar(this.etat, resolution);
		// On repasse par la conséquence : la vidéo vient de changer la décision.
		this.phase = 'consequence';
	}

	/** Passe de l'écran de conséquence à la suite : vidéo, incident suivant, ou fin. */
	continuer(maintenant: Date): void {
		if (this.etat === null) return;

		// La vidéo s'intercale entre la conséquence et l'incident suivant.
		if (this.etat.varEnAttente !== null) {
			this.phase = 'var';
			return;
		}

		if (this.etat.termine) {
			this.terminer(maintenant);
			return;
		}
		this.phase = 'incident';
	}

	/** Change un réglage et écrit immédiatement : c'est la seconde et dernière occasion d'écrire. */
	changerReglage<C extends keyof Sauvegarde['reglages']>(
		cle: C,
		valeur: Sauvegarde['reglages'][C],
		maintenant: Date
	): void {
		this.sauvegarde = {
			...this.sauvegarde,
			reglages: { ...this.sauvegarde.reglages, [cle]: valeur }
		};
		this.ecrire(maintenant);
	}

	/**
	 * Efface la progression à la demande du joueur (06 §6.7).
	 * L'ancienne sauvegarde est d'abord recopiée : même effacée volontairement,
	 * une progression ne disparaît pas sans copie de secours.
	 */
	effacerProgression(maintenant: Date): void {
		if (this.stockage !== null) {
			const ancienne = this.stockage.obtenir(CLE);
			if (ancienne !== null) this.stockage.poser(CLE_CORROMPUE, ancienne);
		}
		this.sauvegarde = sauvegardeVierge(maintenant, {
			mouvementReduit: this.sauvegarde.reglages.mouvementReduit
		});
		this.ecrire(maintenant);
		this.composerAffiche();
	}

	private ecrire(maintenant: Date): void {
		if (this.stockage === null) return;
		this.sauvegarde = enregistrer(this.stockage, this.sauvegarde, maintenant);
	}

	private terminer(maintenant: Date): void {
		if (this.etat === null || this.resultat !== null) return;
		const etat = this.etat;
		const resultat = noter(etat, { chrono: this.sauvegarde.reglages.chrono });
		this.resultat = resultat;

		const progression = this.sauvegarde.progression;
		this.divisionAvantMatch = progression.division;
		// Le match du jour se joue en division 6 sans faire bouger la progression.
		const division = this.estMatchDuJour
			? progression.division
			: divisionApres(progression.division, resultat.note);

		const joues = etat.decisions.map((prise) => prise.incidentId);

		this.sauvegarde = {
			...this.sauvegarde,
			progression: {
				...progression,
				division,
				divisionMax: Math.max(progression.divisionMax, division) as Palier,
				matchsJoues: progression.matchsJoues + 1,
				meilleureNote: Math.max(progression.meilleureNote ?? 0, resultat.note),
				sommeNotes: progression.sommeNotes + resultat.note
			},
			recentIncidents: [...this.sauvegarde.recentIncidents, ...joues].slice(-MAX_INCIDENTS_RECENTS)
		};

		// Unique écriture d'une partie complète.
		this.ecrire(maintenant);
	}
}

export const partie = new Partie();
