import { describe, expect, it } from 'vitest';
import {
	calculerConstance,
	calculerJustesse,
	compterIncoherences,
	divisionApres,
	mentionPour,
	noter,
	profilPresse
} from '../../src/lib/moteur/noter';
import type {
	DecisionPrise,
	EtatPartie,
	Famille,
	Gravite,
	Justesse,
	Match,
	Palier,
	Severite
} from '../../src/lib/moteur/types';

function decision(
	partiel: Partial<DecisionPrise> & { justesse: Justesse; gravite: Gravite }
): DecisionPrise {
	return {
		incidentId: partiel.incidentId ?? 'x',
		minute: partiel.minute ?? 10,
		famille: partiel.famille ?? 'tacle',
		gravite: partiel.gravite,
		optionIndex: partiel.optionIndex ?? 0,
		severite: partiel.severite ?? 1,
		justesse: partiel.justesse,
		dControle: partiel.dControle ?? 0,
		nonDecidee: partiel.nonDecidee ?? false
	};
}

/** Douze décisions homogènes, pour composer un état de fin de match. */
function douze(justesse: Justesse, severite: Severite = 1, famille: Famille = 'tacle') {
	return Array.from({ length: 12 }, (_, index) =>
		decision({ justesse, gravite: 3, severite, famille, incidentId: `i${index}` })
	);
}

const MATCH_FACTICE = { seed: 'test', division: 6 as Palier } as unknown as Match;

function etat(partiel: Partial<EtatPartie> & { decisions: DecisionPrise[] }): EtatPartie {
	return {
		match: MATCH_FACTICE,
		index: partiel.decisions.length,
		controle: partiel.controle ?? 70,
		decisions: partiel.decisions,
		buts: partiel.buts ?? { domicile: 0, exterieur: 0 },
		expulsions: partiel.expulsions ?? 0,
		nonDecidees: partiel.nonDecidees ?? 0,
		var: partiel.var ?? { quotaUtilise: 0, rectifications: 0, maintiens: 0 },
		varEnAttente: null,
		matchArrete: partiel.matchArrete ?? false,
		termine: true
	};
}

describe('calculerJustesse', () => {
	it('rend 100 quand toutes les décisions valent 1', () => {
		expect(calculerJustesse(douze(1))).toBe(100);
	});

	it('rend 0 quand toutes les décisions valent 0', () => {
		expect(calculerJustesse(douze(0))).toBe(0);
	});

	it('pondère par la gravité', () => {
		// Une erreur sur un incident de gravité 5 pèse plus qu'un sans-faute de gravité 1.
		const decisions = [
			decision({ justesse: 1, gravite: 1 }),
			decision({ justesse: 0, gravite: 5 })
		];
		expect(calculerJustesse(decisions)).toBeCloseTo((100 * 1) / 6, 6);
	});

	it('rend 0 sur une liste vide', () => {
		expect(calculerJustesse([])).toBe(0);
	});
});

describe('compterIncoherences', () => {
	it('ne compte rien quand la ligne est constante', () => {
		expect(compterIncoherences(douze(1, 2))).toBe(0);
	});

	it('compte une incohérence : même famille, gravités proches, sévérités éloignées', () => {
		const decisions = [
			decision({ justesse: 1, gravite: 3, famille: 'tacle', severite: 0 }),
			decision({ justesse: 1, gravite: 3, famille: 'tacle', severite: 2 })
		];
		expect(compterIncoherences(decisions)).toBe(1);
	});

	it('ne compte pas deux familles différentes', () => {
		const decisions = [
			decision({ justesse: 1, gravite: 3, famille: 'tacle', severite: 0 }),
			decision({ justesse: 1, gravite: 3, famille: 'main', severite: 4 })
		];
		expect(compterIncoherences(decisions)).toBe(0);
	});

	it('ne compte pas des gravités éloignées de plus de 1', () => {
		const decisions = [
			decision({ justesse: 1, gravite: 1, famille: 'tacle', severite: 0 }),
			decision({ justesse: 1, gravite: 5, famille: 'tacle', severite: 4 })
		];
		expect(compterIncoherences(decisions)).toBe(0);
	});

	it('ne compte pas un écart de sévérité de 1', () => {
		const decisions = [
			decision({ justesse: 1, gravite: 3, famille: 'tacle', severite: 1 }),
			decision({ justesse: 1, gravite: 3, famille: 'tacle', severite: 2 })
		];
		expect(compterIncoherences(decisions)).toBe(0);
	});

	it('compte toutes les paires : trois décisions opposées deux à deux font 2 incohérences', () => {
		const decisions = [
			decision({ justesse: 1, gravite: 3, famille: 'tacle', severite: 0 }),
			decision({ justesse: 1, gravite: 3, famille: 'tacle', severite: 0 }),
			decision({ justesse: 1, gravite: 3, famille: 'tacle', severite: 4 })
		];
		expect(compterIncoherences(decisions)).toBe(2);
	});
});

describe('calculerConstance', () => {
	it('vaut 100 sans incohérence', () => {
		expect(calculerConstance(0)).toBe(100);
	});

	it('perd 25 points par incohérence', () => {
		expect(calculerConstance(1)).toBe(75);
		expect(calculerConstance(3)).toBe(25);
	});

	it('ne descend pas sous 0', () => {
		expect(calculerConstance(9)).toBe(0);
	});
});

describe('noter', () => {
	it('rend une note nulle quand les trois mesures sont à zéro', () => {
		// Justesse 0, contrôle 0, et une ligne assez incohérente pour vider la
		// constance : alterner laisser-jouer et expulsion dans la même famille.
		const decisions = Array.from({ length: 12 }, (_, index) =>
			decision({
				justesse: 0,
				gravite: 3,
				famille: 'tacle',
				severite: index % 2 === 0 ? 0 : 4,
				incidentId: `i${index}`
			})
		);
		const resultat = noter(etat({ decisions, controle: 0, matchArrete: true }));
		expect(resultat.constance).toBe(0);
		expect(resultat.note).toBe(0);
		expect(resultat.justesse).toBe(0);
	});

	it('ne rend pas une note nulle sur un match raté mais cohérent', () => {
		// Tout faux, contrôle à zéro, mais la même ligne du début à la fin :
		// la constance seule rapporte 0,20 × 100 = 20 points.
		const resultat = noter(etat({ decisions: douze(0, 0), controle: 0, matchArrete: true }));
		expect(resultat.note).toBe(20);
	});

	it('rend 100 sur un match parfait', () => {
		const resultat = noter(etat({ decisions: douze(1, 2), controle: 100 }));
		expect(resultat.note).toBe(100);
		expect(resultat.justesse).toBe(100);
		expect(resultat.constance).toBe(100);
		expect(resultat.mention).toBe("On n'a pas parlé de vous.");
	});

	it('retire 5 points de note pour une incohérence', () => {
		const constant = noter(etat({ decisions: douze(1, 2), controle: 100 })).note;
		const decisions = douze(1, 2);
		decisions[0] = decision({ justesse: 1, gravite: 3, famille: 'tacle', severite: 0 });
		// Une seule décision à sévérité 0 face à onze à sévérité 2 crée 11 paires,
		// on isole donc le cas à deux décisions comparables.
		const avecUne = noter(
			etat({
				decisions: [
					decision({ justesse: 1, gravite: 3, famille: 'tacle', severite: 0 }),
					decision({ justesse: 1, gravite: 3, famille: 'tacle', severite: 2 }),
					decision({ justesse: 1, gravite: 3, famille: 'main', severite: 2 })
				],
				controle: 100
			})
		);
		expect(avecUne.incoherences).toBe(1);
		expect(avecUne.constance).toBe(75);
		// 0,20 × 25 points de constance perdus = 5 points de note.
		expect(constant - avecUne.note).toBe(5);
	});

	it('retire 15 points de note pour trois incohérences', () => {
		const decisions = [
			decision({ justesse: 1, gravite: 3, famille: 'tacle', severite: 0 }),
			decision({ justesse: 1, gravite: 3, famille: 'tacle', severite: 2 }),
			decision({ justesse: 1, gravite: 3, famille: 'main', severite: 0 }),
			decision({ justesse: 1, gravite: 3, famille: 'main', severite: 2 }),
			decision({ justesse: 1, gravite: 3, famille: 'banc', severite: 0 }),
			decision({ justesse: 1, gravite: 3, famille: 'banc', severite: 2 })
		];
		const resultat = noter(etat({ decisions, controle: 100 }));
		expect(resultat.incoherences).toBe(3);
		expect(resultat.constance).toBe(25);
		expect(resultat.note).toBe(100 - 15);
	});

	it('plafonne la note à 35 quand le match est arrêté', () => {
		const resultat = noter(etat({ decisions: douze(1, 2), controle: 100, matchArrete: true }));
		expect(resultat.note).toBeLessThanOrEqual(35);
		expect(resultat.matchArrete).toBe(true);
	});

	it('applique 3 points de malus par non-décision', () => {
		const sans = noter(etat({ decisions: douze(1, 2), controle: 100 })).note;
		const avec = noter(etat({ decisions: douze(1, 2), controle: 100, nonDecidees: 2 })).note;
		expect(sans - avec).toBe(6);
	});

	it('plafonne le malus de non-décision à 12', () => {
		const sans = noter(etat({ decisions: douze(1, 2), controle: 100 })).note;
		const avec = noter(etat({ decisions: douze(1, 2), controle: 100, nonDecidees: 12 })).note;
		expect(sans - avec).toBe(12);
	});

	it('borne la note dans [0, 100]', () => {
		for (const controle of [0, 50, 100]) {
			for (const nonDecidees of [0, 4, 12]) {
				const resultat = noter(etat({ decisions: douze(0, 0), controle, nonDecidees }));
				expect(resultat.note).toBeGreaterThanOrEqual(0);
				expect(resultat.note).toBeLessThanOrEqual(100);
				expect(Number.isInteger(resultat.note)).toBe(true);
			}
		}
	});

	it('compte les cartons jaunes et rouges', () => {
		const decisions = [
			decision({ justesse: 1, gravite: 3, severite: 2 }),
			decision({ justesse: 1, gravite: 3, severite: 2 }),
			decision({ justesse: 1, gravite: 3, severite: 4 }),
			decision({ justesse: 1, gravite: 3, severite: 0 })
		];
		const resultat = noter(etat({ decisions }));
		expect(resultat.cartonsJaunes).toBe(2);
		expect(resultat.cartonsRouges).toBe(1);
	});

	it('classe la partie par défaut', () => {
		expect(noter(etat({ decisions: douze(1, 2) })).horsClassement).toBe(false);
	});

	it('marque la partie hors classement quand le chrono est désactivé', () => {
		const resultat = noter(etat({ decisions: douze(1, 2) }), { chrono: false });
		expect(resultat.horsClassement).toBe(true);
	});

	it('retire le malus de non-décision quand le chrono est désactivé', () => {
		const avec = noter(etat({ decisions: douze(1, 2), controle: 100, nonDecidees: 3 }), {
			chrono: true
		});
		const sans = noter(etat({ decisions: douze(1, 2), controle: 100, nonDecidees: 3 }), {
			chrono: false
		});
		expect(sans.note - avec.note).toBe(9);
		expect(sans.note).toBe(100);
	});

	it('pondère justesse, contrôle et constance selon 0,55 / 0,25 / 0,20', () => {
		// Justesse 100, contrôle 0, constance 100 → 0,55×100 + 0,25×0 + 0,20×100 = 75
		const resultat = noter(etat({ decisions: douze(1, 2), controle: 0 }));
		expect(resultat.note).toBe(75);
	});
});

describe('mentionPour', () => {
	it('rend la mention de chaque tranche', () => {
		expect(mentionPour(95)).toBe("On n'a pas parlé de vous.");
		expect(mentionPour(85)).toBe('Match bien tenu.');
		expect(mentionPour(70)).toBe('Passable. Deux ou trois erreurs sans conséquence.');
		expect(mentionPour(60)).toBe('Débordé par moments.');
		expect(mentionPour(45)).toBe('Le match vous a échappé.');
		expect(mentionPour(10)).toBe('Rapport transmis à la commission.');
	});
});

describe('profilPresse', () => {
	it('sanguin : un rouge et une justesse faible', () => {
		const decisions = [
			decision({ justesse: 0, gravite: 3, severite: 4 }),
			decision({ justesse: 0, gravite: 3, severite: 2 })
		];
		expect(profilPresse(decisions, 40, 0, 0)).toBe('sanguin');
	});

	it('permissif : un carton au plus', () => {
		expect(profilPresse(douze(1, 0), 90, 0, 0)).toBe('permissif');
	});

	it('illisible : deux incohérences ou plus', () => {
		expect(profilPresse(douze(1, 2), 90, 2, 0)).toBe('illisible');
	});

	it('hesitant : deux non-décisions ou plus', () => {
		expect(profilPresse(douze(1, 2), 90, 0, 2)).toBe('hesitant');
	});

	it('neutre : rien de remarquable', () => {
		expect(profilPresse(douze(1, 2), 90, 0, 0)).toBe('neutre');
	});
});

describe('divisionApres', () => {
	it('monte à 72 et au-dessus', () => {
		expect(divisionApres(3, 72)).toBe(4);
		expect(divisionApres(3, 100)).toBe(4);
	});

	it('descend à 48 et en dessous', () => {
		expect(divisionApres(3, 48)).toBe(2);
		expect(divisionApres(3, 0)).toBe(2);
	});

	it('reste sur place entre 49 et 71', () => {
		expect(divisionApres(3, 49)).toBe(3);
		expect(divisionApres(3, 71)).toBe(3);
	});

	it('ne sort pas de [0, 8]', () => {
		expect(divisionApres(0, 0)).toBe(0);
		expect(divisionApres(8, 100)).toBe(8);
	});
});
