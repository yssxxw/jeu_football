// Application d'une décision. docs/02-game-design.md §2 et §6 étape 5.
//
// Immuabilité : appliquer() retourne un nouvel état et ne mute jamais l'entrée.
//
// PRNG : les tirages de déroulement (transformation d'un penalty, but consécutif
// à une infériorité numérique) n'utilisent PAS le flux de composer.ts. Ils
// dérivent une sous-seed de la seed du match et de l'index de l'incident, par
// exemple `${seed}#penalty#3`. Conséquence : le nombre de décisions prises
// avant n'influence aucun tirage, donc un changement de contenu ou de règle ne
// peut pas décaler la suite d'une partie. C'est le même raisonnement que
// l'ordre fixe de composer.ts, appliqué à un cas où l'ordre ne peut pas l'être.

import { CONTROLE, EXPULSION_BONUS_BUT, PENALTY_PROBA } from './equilibrage';
import { alea } from './prng';
import type { EtatPartie, Justesse, Match, Option } from './types';

/** Index de l'option jouée, ou null quand le chrono a expiré (option par défaut). */
export type Decision = number | null;

export function etatInitial(match: Match): EtatPartie {
	return {
		match,
		index: 0,
		controle: match.controleDepart,
		decisions: [],
		buts: { domicile: 0, exterieur: 0 },
		expulsions: 0,
		nonDecidees: 0,
		matchArrete: false,
		termine: false
	};
}

function borner(valeur: number): number {
	return Math.min(CONTROLE.max, Math.max(CONTROLE.min, valeur));
}

/** Dérives passives de 02 §2, appliquées après le dControle de l'option. */
function derives(justesses: readonly Justesse[], minute: number, temperament: number): number {
	let delta = 0;

	const deuxDernieres = justesses.slice(-2);
	if (deuxDernieres.length === 2) {
		if (deuxDernieres.every((j) => j >= CONTROLE.deriveBonusSeuilJustesse)) {
			delta += CONTROLE.deriveBonus;
		} else if (deuxDernieres.every((j) => j <= CONTROLE.deriveMalusSeuilJustesse)) {
			delta += CONTROLE.deriveMalus;
		}
	}

	// Le tempérament du club à domicile ne pèse qu'après la 45e.
	if (minute > CONTROLE.minuteTemperament) delta -= temperament;

	return delta;
}

function optionParDefaut(options: readonly Option[]): number {
	const index = options.findIndex((option) => option.defaut === true);
	// Le validateur de contenu garantit qu'il y en a exactement une ; en cas de
	// contenu abîmé on retombe sur la première plutôt que de casser la partie.
	return index === -1 ? 0 : index;
}

/**
 * Applique une décision et retourne un nouvel état.
 * `decision` vaut null quand le chrono a expiré : l'option par défaut est jouée
 * et le compteur de non-décisions augmente.
 */
export function appliquer(etat: EtatPartie, decision: Decision): EtatPartie {
	if (etat.termine) return etat;

	const programme = etat.match.incidents[etat.index];
	if (programme === undefined) throw new Error(`appliquer: aucun incident à l'index ${etat.index}`);

	const { incident, minute } = programme;
	const nonDecidee = decision === null;
	const optionIndex = nonDecidee ? optionParDefaut(incident.options) : decision;
	const option = incident.options[optionIndex];
	if (option === undefined) {
		throw new Error(`appliquer: option ${optionIndex} inconnue sur ${incident.id}`);
	}

	// ── Contrôle du match ──
	const justesses = [...etat.decisions.map((prise) => prise.justesse), option.justesse];
	const controle = borner(
		etat.controle + option.dControle + derives(justesses, minute, etat.match.temperamentDomicile)
	);

	// ── Score du match (02 §6 étape 5) ──
	// Un penalty accordé se transforme avec la probabilité PENALTY_PROBA ; une
	// infériorité numérique ajoute EXPULSION_BONUS_BUT par expulsion sur chaque
	// duel aérien et hors-jeu restant. Le camp qui marque n'est pas déterminable
	// depuis le contenu : les incidents ne disent pas quelle équipe est en cause.
	// Il est donc tiré, de façon déterministe, à partir de la seed du match.
	// Signalé comme sous-spécifié dans docs/02-game-design.md §6.
	const buts = { ...etat.buts };
	const marquer = (cle: string): void => {
		const camp = alea(`${etat.match.seed}#camp#${etat.index}#${cle}`)() < 0.5;
		if (camp) buts.domicile += 1;
		else buts.exterieur += 1;
	};

	if (option.penalty === true) {
		const butProbable = option.butProbable ?? PENALTY_PROBA;
		if (alea(`${etat.match.seed}#penalty#${etat.index}`)() < butProbable) marquer('penalty');
	}

	const expulsions = etat.expulsions + (option.expulsion === true ? 1 : 0);
	const ouvertAuxButs = incident.famille === 'duel_aerien' || incident.famille === 'hors_jeu';
	if (ouvertAuxButs && etat.expulsions > 0) {
		const proba = EXPULSION_BONUS_BUT * etat.expulsions;
		if (alea(`${etat.match.seed}#inferiorite#${etat.index}`)() < proba) marquer('inferiorite');
	}

	const index = etat.index + 1;
	const matchArrete = controle <= CONTROLE.min;

	return {
		match: etat.match,
		index,
		controle,
		decisions: [
			...etat.decisions,
			{
				incidentId: incident.id,
				minute,
				famille: incident.famille,
				gravite: incident.gravite,
				optionIndex,
				severite: option.severite,
				justesse: option.justesse,
				dControle: option.dControle,
				nonDecidee
			}
		],
		buts,
		expulsions,
		nonDecidees: etat.nonDecidees + (nonDecidee ? 1 : 0),
		matchArrete,
		termine: matchArrete || index >= etat.match.incidents.length
	};
}

/** Rejoue une suite complète de décisions. Utilisé par les tests et par le serveur. */
export function appliquerToutes(match: Match, decisions: readonly Decision[]): EtatPartie {
	let etat = etatInitial(match);
	for (const decision of decisions) {
		if (etat.termine) break;
		etat = appliquer(etat, decision);
	}
	return etat;
}
