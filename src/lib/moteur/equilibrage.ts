// Toutes les constantes de docs/02-game-design.md, et elles n'existent qu'ici.
// Ces valeurs sont normatives : un écart se corrige dans la doc, pas dans ce fichier.
//
// ─────────────────────────────────────────────────────────────────────────────
// CALIBRAGE (V0-9) — arbitrage rendu, la table de 02 §4 a été révisée
// ─────────────────────────────────────────────────────────────────────────────
//
// La première simulation ne reproduisait pas la table des médianes du dossier.
// La décision prise est d'accepter le comportement mesuré et de réviser la
// table, plutôt que de tordre les pondérations ou le contenu. Deux conséquences
// assumées, désormais inscrites dans 02 §4 :
//
// 1. Le jeu parfait plafonne à 96, pas à 100. Un agent qui choisit toujours
//    l'option `justesse: 1` obtient 81 de constance : cinq couples d'incidents
//    ont des bonnes réponses mutuellement incohérentes au sens de 02 §2 — même
//    famille, gravités à 1 d'écart, sévérités à 2 ou plus. Exemple :
//    `tacle_dernier_defenseur` (rouge, gravité 5) et `tacle_semelle_touche`
//    (jaune, gravité 4). Ce ne sont pas des incohérences d'arbitrage, ce sont
//    deux situations différentes que la règle traite comme comparables parce
//    qu'elle assimile la gravité à la similitude de l'action. C'est accepté :
//    le 100 reste atteignable, mais seulement sur un tirage qui ne contient
//    aucun de ces couples.
//
// 2. La constance sépare peu les profils : 3 points entre « connaît le foot »
//    et « constant », là où le dossier en annonçait 12. C'est la même cause.
//    Si on veut un jour creuser cet écart, le levier est la règle de constance
//    (`CONSTANCE.ecartGraviteMax`), pas les `dControle` du contenu.
//
// La table de 02 §4 porte maintenant les médianes mesurées à la division 6,
// division du match du jour, et dit explicitement à quelle division elle
// s'applique — l'ancienne ne le disait pas, et aucune division ne tenait ses
// quatre cibles à ±4.
// ─────────────────────────────────────────────────────────────────────────────

import type { Division, Fenetre, Mention } from './types';

// 02 §5 — les neuf divisions
export const TABLE_DIVISIONS: readonly Division[] = [
	{
		palier: 0,
		nom: 'District 2',
		chronoS: 8,
		partAmbigus: 0.1,
		graviteMoyenne: 1.8,
		controleDepart: 78,
		quotaVar: 0
	},
	{
		palier: 1,
		nom: 'District 1',
		chronoS: 8,
		partAmbigus: 0.15,
		graviteMoyenne: 2,
		controleDepart: 76,
		quotaVar: 0
	},
	{
		palier: 2,
		nom: 'Régional',
		chronoS: 7,
		partAmbigus: 0.2,
		graviteMoyenne: 2.3,
		controleDepart: 74,
		quotaVar: 0
	},
	{
		palier: 3,
		nom: 'National 3',
		chronoS: 7,
		partAmbigus: 0.28,
		graviteMoyenne: 2.6,
		controleDepart: 72,
		quotaVar: 0
	},
	{
		palier: 4,
		nom: 'National',
		chronoS: 6,
		partAmbigus: 0.35,
		graviteMoyenne: 2.9,
		controleDepart: 70,
		quotaVar: 0
	},
	{
		palier: 5,
		nom: 'Ligue 2',
		chronoS: 6,
		partAmbigus: 0.42,
		graviteMoyenne: 3.2,
		controleDepart: 68,
		quotaVar: 1
	},
	{
		palier: 6,
		nom: 'Ligue 1',
		chronoS: 6,
		partAmbigus: 0.5,
		graviteMoyenne: 3.5,
		controleDepart: 66,
		quotaVar: 2
	},
	{
		palier: 7,
		nom: "Coupe d'Europe",
		chronoS: 5,
		partAmbigus: 0.58,
		graviteMoyenne: 3.8,
		controleDepart: 64,
		quotaVar: 2
	},
	{
		palier: 8,
		nom: 'International',
		chronoS: 5,
		partAmbigus: 0.65,
		graviteMoyenne: 4.1,
		controleDepart: 62,
		quotaVar: 2
	}
];

// 02 §6 étape 3 — les six fenêtres et leurs quotas (somme : 12)
export const FENETRES: readonly Fenetre[] = [
	{ id: '3-15', debut: 3, fin: 15, quota: 2 },
	{ id: '16-30', debut: 16, fin: 30, quota: 2 },
	{ id: '31-45', debut: 31, fin: 47, quota: 2 }, // 45 + 2 de temps additionnel
	{ id: '46-65', debut: 46, fin: 65, quota: 3 },
	{ id: '66-80', debut: 66, fin: 80, quota: 2 },
	{ id: '81-90', debut: 81, fin: 94, quota: 1 } // 90 + 4 de temps additionnel
];

// 02 §4 — la note finale
export const POIDS_NOTE = { justesse: 0.55, controle: 0.25, constance: 0.2 } as const;

export const MALUS = {
	parNonDecision: 3,
	plafondNonDecisions: 12,
	parRectificationVar: 2,
	parMaintienVarErrone: 8
} as const;

export const PLAFOND_NOTE_MATCH_ARRETE = 35;

export const SEUILS_MENTION: readonly Mention[] = [
	{ noteMin: 92, noteMax: 100, texte: "On n'a pas parlé de vous." },
	{ noteMin: 80, noteMax: 91, texte: 'Match bien tenu.' },
	{ noteMin: 68, noteMax: 79, texte: 'Passable. Deux ou trois erreurs sans conséquence.' },
	{ noteMin: 55, noteMax: 67, texte: 'Débordé par moments.' },
	{ noteMin: 40, noteMax: 54, texte: 'Le match vous a échappé.' },
	{ noteMin: 0, noteMax: 39, texte: 'Rapport transmis à la commission.' }
];

// 02 §1 — temps de lecture, accordé avant que le chrono ne démarre
//
// Le chrono de la division mesure le temps de DÉCISION, pas le temps de
// lecture. Un incident fait 45 à 90 mots : six secondes ne suffisent pas à le
// lire, et faire courir le chrono pendant la lecture revenait à noter la
// vitesse de lecture plutôt que l'arbitrage. Le texte s'affiche donc, le
// joueur dispose du temps de lecture ci-dessous, et le chrono ne démarre
// qu'ensuite. Les options restent cliquables pendant la lecture : qui a compris
// tout de suite n'attend pas.
export const LECTURE = {
	msParMot: 220, // ≈ 270 mots par minute, lecture attentive d'un texte suivi
	msParMotLibelle: 120, // un libellé se parcourt, il ne se lit pas comme une phrase
	minimumMs: 3000,
	maximumMs: 18000 // au-delà, l'incident est trop long : c'est au contenu de bouger
} as const;

// 02 §2 — contrôle du match
export const CONTROLE = {
	min: 0,
	max: 100,
	seuilNominal: 80, // ≥ 80 : jauge blanche
	seuilAmbre: 40, // 40–79 : jauge ambre
	seuilTendu: 25, // < 25 : jauge rouge, incidents tirés dans le pool tendu
	deriveBonus: 2, // les deux dernières décisions à justesse ≥ 0,7
	deriveBonusSeuilJustesse: 0.7,
	deriveMalus: -4, // les deux dernières décisions à justesse ≤ 0,4
	deriveMalusSeuilJustesse: 0.4,
	minuteTemperament: 45 // le tempérament du club à domicile pèse après la 45e
} as const;

// 02 §2 — constance
export const CONSTANCE = {
	penaliteParIncoherence: 25,
	ecartGraviteMax: 1, // paires comparables : |gravite_A − gravite_B| ≤ 1
	ecartSeveriteMin: 2 // incohérence si |severite_A − severite_B| ≥ 2
} as const;

// 02 §3 — VAR
export const VAR = {
	divisionMin: 5,
	graviteMin: 3,
	justesseDeclenchementMax: 0.4, // au-delà, on ne piège pas le joueur
	probaDeclenchement: 0.7,
	rectification: { justesse: 0.9, dNote: -2, dControle: -3 },
	maintien: { dNote: -8, dControle: -12 }
} as const;

// 02 §5 — montée / descente, appliquées immédiatement après le match
export const PROGRESSION = { noteMontee: 72, noteDescente: 48 } as const;

// 02 §6 étape 5 — le score du match
export const PENALTY_PROBA = 0.76;
export const EXPULSION_BONUS_BUT = 0.12; // par incident duel_aerien ou hors_jeu restant
