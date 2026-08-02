// Calcul de la note finale. docs/02-game-design.md §2 et §4.

import {
	CONSTANCE,
	MALUS,
	PLAFOND_NOTE_MATCH_ARRETE,
	POIDS_NOTE,
	PROGRESSION,
	SEUILS_MENTION
} from './equilibrage';
import type { DecisionPrise, EtatPartie, Palier, ProfilPresse, Resultat } from './types';

/** Justesse = 100 × Σ(justesse × gravite) / Σ(gravite). */
export function calculerJustesse(decisions: readonly DecisionPrise[]): number {
	if (decisions.length === 0) return 0;
	let numerateur = 0;
	let denominateur = 0;
	for (const decision of decisions) {
		numerateur += decision.justesse * decision.gravite;
		denominateur += decision.gravite;
	}
	return denominateur === 0 ? 0 : (100 * numerateur) / denominateur;
}

/**
 * Incohérence entre deux décisions : même famille, gravités proches,
 * sévérités éloignées. C'est ce que regardent les vrais observateurs.
 */
export function compterIncoherences(decisions: readonly DecisionPrise[]): number {
	let incoherences = 0;
	for (let a = 0; a < decisions.length; a++) {
		for (let b = a + 1; b < decisions.length; b++) {
			const premiere = decisions[a];
			const seconde = decisions[b];
			if (!premiere || !seconde) continue;
			if (premiere.famille !== seconde.famille) continue;
			if (Math.abs(premiere.gravite - seconde.gravite) > CONSTANCE.ecartGraviteMax) continue;
			if (Math.abs(premiere.severite - seconde.severite) >= CONSTANCE.ecartSeveriteMin) {
				incoherences++;
			}
		}
	}
	return incoherences;
}

export function calculerConstance(incoherences: number): number {
	return Math.max(0, 100 - CONSTANCE.penaliteParIncoherence * incoherences);
}

export function mentionPour(note: number): string {
	const trouvee = SEUILS_MENTION.find((seuil) => note >= seuil.noteMin && note <= seuil.noteMax);
	// SEUILS_MENTION couvre 0 à 100 sans trou, le test de equilibrage le vérifie.
	return trouvee?.texte ?? '';
}

/** Profil dominant pour la ligne de presse. docs/03-contenu.md, section Lignes de presse. */
export function profilPresse(
	decisions: readonly DecisionPrise[],
	justesse: number,
	incoherences: number,
	nonDecidees: number
): ProfilPresse {
	const cartons = decisions.filter((decision) => decision.severite >= 2).length;
	const rouges = decisions.filter((decision) => decision.severite >= 3).length;

	if (rouges >= 1 && justesse < 60) return 'sanguin';
	if (cartons <= 1) return 'permissif';
	if (incoherences >= 2) return 'illisible';
	if (nonDecidees >= 2) return 'hesitant';
	return 'neutre';
}

export interface OptionsNotation {
	/**
	 * Chrono actif pendant la partie. À false, le malus de non-décision est
	 * retiré et le résultat est marqué hors classement : sans contrainte de
	 * temps, la note n'est pas comparable à celle des autres (02 §8.1).
	 */
	chrono?: boolean;
}

export function noter(etat: EtatPartie, options: OptionsNotation = {}): Resultat {
	const chrono = options.chrono ?? true;
	const justesse = calculerJustesse(etat.decisions);
	const incoherences = compterIncoherences(etat.decisions);
	const constance = calculerConstance(incoherences);

	const noteBrute =
		POIDS_NOTE.justesse * justesse +
		POIDS_NOTE.controle * etat.controle +
		POIDS_NOTE.constance * constance;

	// La VAR arrive en V0-10 : ses deux malus valent 0 tant qu'elle n'existe pas.
	const malus = chrono
		? Math.min(MALUS.plafondNonDecisions, MALUS.parNonDecision * etat.nonDecidees)
		: 0;

	let note = Math.round(Math.min(100, Math.max(0, noteBrute - malus)));
	if (etat.matchArrete) note = Math.min(note, PLAFOND_NOTE_MATCH_ARRETE);

	return {
		note,
		justesse: Math.round(justesse),
		controle: etat.controle,
		constance,
		incoherences,
		mention: mentionPour(note),
		profilPresse: profilPresse(etat.decisions, justesse, incoherences, etat.nonDecidees),
		cartonsJaunes: etat.decisions.filter((decision) => decision.severite === 2).length,
		cartonsRouges: etat.decisions.filter((decision) => decision.severite >= 3).length,
		nonDecidees: etat.nonDecidees,
		matchArrete: etat.matchArrete,
		horsClassement: !chrono,
		buts: { ...etat.buts }
	};
}

/** Montée / descente appliquée immédiatement après le match. docs/02 §5. */
export function divisionApres(division: Palier, note: number): Palier {
	if (note >= PROGRESSION.noteMontee) return Math.min(8, division + 1) as Palier;
	if (note <= PROGRESSION.noteDescente) return Math.max(0, division - 1) as Palier;
	return division;
}
