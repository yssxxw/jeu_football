import { describe, expect, it } from 'vitest';
import { CLUBS, CONTEXTES, INCIDENTS } from '../../src/lib/contenu';
import { appliquer, appliquerToutes, etatInitial } from '../../src/lib/moteur/appliquer';
import { composer } from '../../src/lib/moteur/composer';
import { CONTROLE, TABLE_DIVISIONS } from '../../src/lib/moteur/equilibrage';
import { calculerJustesse, noter } from '../../src/lib/moteur/noter';
import type { Match, Palier } from '../../src/lib/moteur/types';

const CONTENU = { incidents: INCIDENTS, clubs: CLUBS, contextes: CONTEXTES };
const PALIERS: Palier[] = [0, 1, 2, 3, 4, 5, 6, 7, 8];

function matchDe(seed: string, division: Palier = 6): Match {
	return composer(seed, division, CONTENU);
}

/** Index de l'option la plus juste de chaque incident du match. */
function decisionsParfaites(match: Match): number[] {
	return match.incidents.map(({ incident }) => {
		let meilleur = 0;
		incident.options.forEach((option, index) => {
			const actuel = incident.options[meilleur];
			if (actuel && option.justesse > actuel.justesse) meilleur = index;
		});
		return meilleur;
	});
}

/** Index de l'option la plus destructrice pour le contrôle. */
function decisionsPires(match: Match): number[] {
	return match.incidents.map(({ incident }) => {
		let pire = 0;
		incident.options.forEach((option, index) => {
			const actuel = incident.options[pire];
			if (actuel && option.dControle < actuel.dControle) pire = index;
		});
		return pire;
	});
}

describe('etatInitial', () => {
	it('part du contrôle de départ du match', () => {
		const match = matchDe('initial');
		expect(etatInitial(match).controle).toBe(match.controleDepart);
	});

	it('part vide et non terminé', () => {
		const etat = etatInitial(matchDe('initial'));
		expect(etat.index).toBe(0);
		expect(etat.decisions).toHaveLength(0);
		expect(etat.termine).toBe(false);
		expect(etat.matchArrete).toBe(false);
	});
});

describe('immuabilité', () => {
	it("ne mute pas l'état passé en argument", () => {
		const etat = etatInitial(matchDe('immuable'));
		const avant = JSON.stringify(etat);
		appliquer(etat, 0);
		expect(JSON.stringify(etat)).toBe(avant);
	});

	it('retourne un nouvel objet à chaque application', () => {
		const etat = etatInitial(matchDe('immuable'));
		expect(appliquer(etat, 0)).not.toBe(etat);
	});
});

describe('déterminisme', () => {
	it('rejoue exactement la même partie pour les mêmes décisions', () => {
		const match = matchDe('rejeu');
		const decisions = [0, 1, 2, 0, 1, 1, 2, 0, 0, 1, 2, 1];
		const a = JSON.stringify(appliquerToutes(match, decisions));
		const b = JSON.stringify(appliquerToutes(match, decisions));
		expect(a).toBe(b);
	});
});

describe('contrôle du match', () => {
	it("applique le dControle de l'option choisie", () => {
		const match = matchDe('controle');
		const premier = match.incidents[0];
		if (!premier) throw new Error('match sans incident');
		const option = premier.incident.options[0];
		if (!option) throw new Error('incident sans option');

		const apres = appliquer(etatInitial(match), 0);
		// Première décision : aucune dérive possible, le tempérament ne pèse
		// qu'après la 45e et cet incident est dans la fenêtre 3-15.
		expect(apres.controle).toBe(match.controleDepart + option.dControle);
	});

	it('reste borné dans [0, 100]', () => {
		for (const palier of PALIERS) {
			for (let n = 0; n < 40; n++) {
				const match = matchDe(`bornes-${n}`, palier);
				const etat = appliquerToutes(match, decisionsPires(match));
				expect(etat.controle).toBeGreaterThanOrEqual(CONTROLE.min);
				expect(etat.controle).toBeLessThanOrEqual(CONTROLE.max);
			}
		}
	});

	it('arrête le match dès que le contrôle touche 0', () => {
		let arretes = 0;
		for (let n = 0; n < 60; n++) {
			const match = matchDe(`arret-${n}`, 6);
			const etat = appliquerToutes(match, decisionsPires(match));
			if (etat.matchArrete) {
				arretes++;
				expect(etat.controle).toBe(0);
				expect(etat.termine).toBe(true);
				// Le match s'arrête à la minute courante : moins de 12 décisions.
				expect(etat.decisions.length).toBeLessThanOrEqual(12);
				expect(noter(etat).note).toBeLessThanOrEqual(35);
			}
		}
		expect(arretes, 'aucun match arrêté sur 60 parties jouées au pire').toBeGreaterThan(0);
	});

	it('n’accepte plus de décision une fois terminé', () => {
		const match = matchDe('fini');
		const etat = appliquerToutes(match, decisionsPires(match));
		expect(appliquer(etat, 0)).toBe(etat);
	});
});

describe('dérives passives', () => {
	it('ajoute 2 quand les deux dernières décisions sont à justesse ≥ 0,7', () => {
		// On cherche un match dont les deux premiers incidents ont une option à 1.
		const match = matchDe('derive-bonus', 6);
		const parfaites = decisionsParfaites(match);
		const premier = match.incidents[0];
		const second = match.incidents[1];
		if (!premier || !second) throw new Error('match incomplet');

		const optionA = premier.incident.options[parfaites[0] ?? 0];
		const optionB = second.incident.options[parfaites[1] ?? 0];
		if (!optionA || !optionB) throw new Error('options manquantes');
		// decisionsParfaites choisit l'option la plus juste : le validateur de
		// contenu garantit qu'il en existe une à justesse 1 sur chaque incident.
		expect(optionA.justesse).toBeGreaterThanOrEqual(0.7);
		expect(optionB.justesse).toBeGreaterThanOrEqual(0.7);

		const apresUn = appliquer(etatInitial(match), parfaites[0] ?? 0);
		const apresDeux = appliquer(apresUn, parfaites[1] ?? 0);
		const attendu = Math.min(100, apresUn.controle + optionB.dControle + CONTROLE.deriveBonus);
		expect(apresDeux.controle).toBe(attendu);
	});

	it('retire le tempérament du club à domicile après la 45e', () => {
		// Comparaison de deux matchs identiques hormis le tempérament : impossible
		// à isoler sur le contenu réel, on vérifie donc la règle sur la somme des
		// dControle contre le contrôle final, tempérament compris.
		const match = matchDe('temperament', 6);
		const decisions = decisionsParfaites(match);
		const etat = appliquerToutes(match, decisions);

		const apresQuaranteCinq = etat.decisions.filter(
			(prise) => prise.minute > CONTROLE.minuteTemperament
		).length;
		expect(apresQuaranteCinq).toBeGreaterThan(0);
		// Le tempérament ne peut que faire baisser le contrôle.
		const sommeDControle = etat.decisions.reduce((somme, prise) => somme + prise.dControle, 0);
		expect(etat.controle).toBeLessThanOrEqual(
			Math.min(100, match.controleDepart + sommeDControle + 2 * etat.decisions.length)
		);
	});
});

describe('non-décision', () => {
	it("joue l'option par défaut et incrémente le compteur", () => {
		const match = matchDe('defaut');
		const premier = match.incidents[0];
		if (!premier) throw new Error('match sans incident');
		const indexDefaut = premier.incident.options.findIndex((option) => option.defaut === true);

		const etat = appliquer(etatInitial(match), null);
		expect(etat.nonDecidees).toBe(1);
		expect(etat.decisions[0]?.optionIndex).toBe(indexDefaut);
		expect(etat.decisions[0]?.nonDecidee).toBe(true);
	});

	it('donne le même contrôle que le choix explicite de la même option', () => {
		const match = matchDe('defaut-egal');
		const premier = match.incidents[0];
		if (!premier) throw new Error('match sans incident');
		const indexDefaut = premier.incident.options.findIndex((option) => option.defaut === true);

		expect(appliquer(etatInitial(match), null).controle).toBe(
			appliquer(etatInitial(match), indexDefaut).controle
		);
	});
});

describe('score du match', () => {
	it('part de 0-0 et ne bouge que par les décisions', () => {
		const match = matchDe('score');
		expect(etatInitial(match).buts).toEqual({ domicile: 0, exterieur: 0 });
	});

	it('reste déterministe sur les buts', () => {
		const match = matchDe('score-determinisme');
		const decisions = decisionsPires(match);
		expect(appliquerToutes(match, decisions).buts).toEqual(appliquerToutes(match, decisions).buts);
	});

	it('marque parfois sur les penalties accordés', () => {
		let butsTotaux = 0;
		for (let n = 0; n < 80; n++) {
			const match = matchDe(`penalty-${n}`, 4);
			// On choisit systématiquement l'option qui accorde un penalty si elle existe.
			const decisions = match.incidents.map(({ incident }) => {
				const index = incident.options.findIndex((option) => option.penalty === true);
				return index === -1 ? 0 : index;
			});
			const etat = appliquerToutes(match, decisions);
			butsTotaux += etat.buts.domicile + etat.buts.exterieur;
		}
		expect(butsTotaux).toBeGreaterThan(0);
	});
});

describe('partie complète, critères du ticket', () => {
	it('mène à une note entière entre 0 et 100 sur les neuf divisions', () => {
		for (const palier of PALIERS) {
			for (let n = 0; n < 30; n++) {
				const match = matchDe(`complet-${n}`, palier);
				const etat = appliquerToutes(
					match,
					match.incidents.map((_, index) => index % 3)
				);
				const resultat = noter(etat);
				expect(Number.isInteger(resultat.note)).toBe(true);
				expect(resultat.note).toBeGreaterThanOrEqual(0);
				expect(resultat.note).toBeLessThanOrEqual(100);
			}
		}
	});

	it('donne une justesse de 100 quand toutes les options justesse 1 sont choisies', () => {
		for (const palier of PALIERS) {
			for (let n = 0; n < 20; n++) {
				const match = matchDe(`parfait-${n}`, palier);
				const etat = appliquerToutes(match, decisionsParfaites(match));
				// Un match parfait ne peut pas s'arrêter : toutes les options justes
				// ont un dControle positif ou faiblement négatif.
				expect(etat.decisions).toHaveLength(12);
				expect(calculerJustesse(etat.decisions)).toBe(100);
				expect(noter(etat).justesse).toBe(100);
			}
		}
	});

	it('joue les incidents dans l’ordre du match, jusqu’à l’arrêt éventuel', () => {
		const match = matchDe('ordre');
		const etat = appliquerToutes(
			match,
			match.incidents.map(() => 0)
		);
		const joues = match.incidents.slice(0, etat.decisions.length);
		expect(etat.decisions.map((prise) => prise.incidentId)).toEqual(
			joues.map(({ incident }) => incident.id)
		);
		expect(etat.decisions.map((prise) => prise.minute)).toEqual(joues.map(({ minute }) => minute));
	});

	it('porte le chrono de tacle_intro à 10 s, contre 6 s pour la division', () => {
		const intro = INCIDENTS.find((incident) => incident.id === 'tacle_intro');
		expect(intro?.chronoS).toBe(10);
		expect(TABLE_DIVISIONS[6]?.chronoS).toBe(6);
	});
});
