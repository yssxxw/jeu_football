// Temps de lecture d'un incident. docs/02-game-design.md §1.
//
// Fonction pure : elle prend un incident et rend une durée. C'est le composant
// Chrono qui décide quoi en faire, et le store qui la lui passe.

import { LECTURE } from './equilibrage';
import type { Incident } from './types';

function compterMots(texte: string): number {
	const propre = texte.trim();
	return propre === '' ? 0 : propre.split(/\s+/).length;
}

/**
 * Temps de lecture accordé avant que le chrono de décision ne démarre.
 * Compte le texte de l'incident et les libellés des options : le joueur doit
 * avoir lu ses choix, pas seulement la situation.
 */
export function dureeLectureMs(incident: Incident): number {
	const brut =
		compterMots(incident.texte) * LECTURE.msParMot +
		incident.options.reduce(
			(somme, option) => somme + compterMots(option.libelle) * LECTURE.msParMotLibelle,
			0
		);

	return Math.min(LECTURE.maximumMs, Math.max(LECTURE.minimumMs, brut));
}
