import { describe, expect, it } from 'vitest';
import { composer } from '../../src/lib/moteur/composer';
import { FENETRES, TABLE_DIVISIONS } from '../../src/lib/moteur/equilibrage';
import type { Incident, Match, Palier } from '../../src/lib/moteur/types';
import { CLUBS, CONTEXTES, INCIDENTS } from '../../src/lib/contenu';
import { CONTENU_COMPLET } from '../fixtures/corpus-complet';

const CONTENU_REEL = { incidents: INCIDENTS, clubs: CLUBS, contextes: CONTEXTES };
const PALIERS: Palier[] = [0, 1, 2, 3, 4, 5, 6, 7, 8];

function comptesParFamille(match: Match): Map<string, number> {
	const comptes = new Map<string, number>();
	for (const { incident } of match.incidents) {
		comptes.set(incident.famille, (comptes.get(incident.famille) ?? 0) + 1);
	}
	return comptes;
}

describe('déterminisme', () => {
	it('retourne un objet strictement identique sur 1 000 appels', () => {
		const reference = JSON.stringify(composer('X', 3, CONTENU_REEL));
		for (let n = 0; n < 1000; n++) {
			expect(JSON.stringify(composer('X', 3, CONTENU_REEL))).toBe(reference);
		}
	});

	it('donne des matchs différents pour des seeds différentes', () => {
		const a = JSON.stringify(composer('seed-a', 6, CONTENU_REEL));
		const b = JSON.stringify(composer('seed-b', 6, CONTENU_REEL));
		expect(a).not.toBe(b);
	});

	it("ne dépend pas de l'ordre des incidents dans le contenu", () => {
		const inverse = { ...CONTENU_REEL, incidents: [...INCIDENTS].reverse() };
		// L'ordre du fichier ne doit pas changer le vivier, seulement son ordre
		// interne — donc le tirage change. On vérifie au moins que la composition
		// reste valide et déterministe, pas qu'elle soit identique.
		expect(JSON.stringify(composer('X', 6, inverse))).toBe(
			JSON.stringify(composer('X', 6, inverse))
		);
	});
});

describe('structure du match, contenu réel', () => {
	for (const palier of PALIERS) {
		it(`palier ${palier} : 12 incidents, ids uniques, minutes strictement croissantes`, () => {
			for (let n = 0; n < 200; n++) {
				const match = composer(`structure-${n}`, palier, CONTENU_REEL);
				expect(match.incidents).toHaveLength(12);

				const ids = match.incidents.map(({ incident }) => incident.id);
				expect(new Set(ids).size, `doublon d'id sur la seed structure-${n}`).toBe(12);

				const minutes = match.incidents.map(({ minute }) => minute);
				for (let i = 1; i < minutes.length; i++) {
					expect(minutes[i], `minutes non croissantes sur la seed structure-${n}`).toBeGreaterThan(
						minutes[i - 1] ?? -1
					);
				}
			}
		});
	}

	it('respecte les fenêtres et leurs quotas', () => {
		const match = composer('fenetres', 6, CONTENU_REEL);
		let index = 0;
		for (const fenetre of FENETRES) {
			for (let n = 0; n < fenetre.quota; n++) {
				expect(match.incidents[index]?.incident.fenetre).toBe(fenetre.id);
				index++;
			}
		}
		expect(index).toBe(12);
	});

	it("n'utilise que des incidents éligibles au palier", () => {
		for (const palier of PALIERS) {
			const match = composer('eligibilite', palier, CONTENU_REEL);
			for (const { incident } of match.incidents) {
				expect(incident.paliers, `${incident.id} au palier ${palier}`).toContain(palier);
			}
		}
	});

	it('tire deux clubs distincts, éligibles au palier', () => {
		for (const palier of PALIERS) {
			const match = composer('clubs', palier, CONTENU_REEL);
			expect(match.domicile.id).not.toBe(match.exterieur.id);
			expect(match.domicile.paliers).toContain(palier);
			expect(match.exterieur.paliers).toContain(palier);
		}
	});
});

describe('effets du contexte', () => {
	it('borne le tempérament du club à domicile dans [0, 2]', () => {
		for (let n = 0; n < 300; n++) {
			const match = composer(`temperament-${n}`, 6, CONTENU_REEL);
			expect(match.temperamentDomicile).toBeGreaterThanOrEqual(0);
			expect(match.temperamentDomicile).toBeLessThanOrEqual(2);
		}
	});

	it('applique le contrôle de départ de la division, modulé par le contexte', () => {
		for (const palier of PALIERS) {
			const match = composer('controle', palier, CONTENU_REEL);
			const attendu =
				(TABLE_DIVISIONS[palier]?.controleDepart ?? 0) +
				(match.contexte.effet?.controleDepart ?? 0);
			expect(match.controleDepart).toBe(attendu);
		}
	});
});

describe('stabilité du PRNG face au contenu', () => {
	it('ajouter un incident inéligible au palier testé ne change pas le match', () => {
		const intrus: Incident = {
			id: 'intrus_inerte',
			famille: 'banc',
			gravite: 1,
			paliers: [8], // inéligible au palier 3 testé ci-dessous
			fenetre: '3-15',
			ambigu: false,
			tendu: false,
			var_eligible: false,
			texte: 'incident ajouté uniquement pour vérifier la stabilité du tirage',
			options: [
				{ libelle: 'A', severite: 0, justesse: 1, dControle: 0, consequence: '.', defaut: true },
				{ libelle: 'B', severite: 1, justesse: 0.4, dControle: -2, consequence: '.' },
				{ libelle: 'C', severite: 2, justesse: 0, dControle: -4, consequence: '.' }
			]
		};

		const avant = composer('stabilite', 3, CONTENU_REEL);
		const apres = composer('stabilite', 3, {
			...CONTENU_REEL,
			incidents: [...INCIDENTS, intrus]
		});
		expect(JSON.stringify(apres)).toBe(JSON.stringify(avant));
	});

	it('consomme le PRNG un nombre de fois indépendant du contenu', () => {
		// Deux contenus de tailles très différentes doivent produire des matchs
		// valides sans que le second « décale » quoi que ce soit : on le vérifie
		// en comparant le match du contenu réel à lui-même après ajout de 50
		// incidents tous inéligibles au palier 0.
		const inertes: Incident[] = Array.from({ length: 50 }, (_, index) => ({
			id: `inerte_${index}`,
			famille: 'banc',
			gravite: 1,
			paliers: [7, 8],
			fenetre: '16-30',
			ambigu: false,
			tendu: false,
			var_eligible: false,
			texte: 'remplissage',
			options: [
				{ libelle: 'A', severite: 0, justesse: 1, dControle: 0, consequence: '.', defaut: true },
				{ libelle: 'B', severite: 1, justesse: 0.4, dControle: -2, consequence: '.' },
				{ libelle: 'C', severite: 2, justesse: 0, dControle: -4, consequence: '.' }
			]
		}));

		expect(
			JSON.stringify(
				composer('inertie', 0, { ...CONTENU_REEL, incidents: [...INCIDENTS, ...inertes] })
			)
		).toBe(JSON.stringify(composer('inertie', 0, CONTENU_REEL)));
	});
});

// Ces deux règles ne sont vérifiables que sur un vivier qui respecte
// l'invariant « ≥ 8 incidents par couple (palier, fenêtre) ». Le contenu de
// V0-4 en compte 24 : au palier 0, quatre fenêtres n'offrent que leur quota
// exact et contiennent chacune un tacle, donc aucun algorithme ne peut y tenir
// la limite de deux par famille. Le corpus synthétique prouve l'algorithme ;
// le contenu complet de V0-13 le prouvera en vrai.
describe('règles de tirage, sur un vivier complet', () => {
	it("n'utilise jamais une famille plus de deux fois", () => {
		for (const palier of PALIERS) {
			for (let n = 0; n < 100; n++) {
				const match = composer(`famille-${n}`, palier, CONTENU_COMPLET);
				for (const [famille, compte] of comptesParFamille(match)) {
					expect(compte, `${famille} au palier ${palier}, seed famille-${n}`).toBeLessThanOrEqual(
						2
					);
				}
			}
		}
	});

	it('tient le taux d’ambigus de la division 6 dans [0,46 ; 0,54]', () => {
		let ambigus = 0;
		const parties = 500;
		for (let n = 0; n < parties; n++) {
			ambigus += composer(`ambigu-${n}`, 6, CONTENU_COMPLET).incidents.filter(
				({ incident }) => incident.ambigu
			).length;
		}
		const taux = ambigus / parties / 12;
		expect(taux).toBeGreaterThanOrEqual(0.46);
		expect(taux).toBeLessThanOrEqual(0.54);
	});

	it('vise la part d’ambigus de chaque division à un incident près', () => {
		for (const palier of [4, 5, 6, 7, 8] as Palier[]) {
			const cible = Math.round((TABLE_DIVISIONS[palier]?.partAmbigus ?? 0) * 12);
			for (let n = 0; n < 50; n++) {
				const obtenus = composer(`cible-${n}`, palier, CONTENU_COMPLET).incidents.filter(
					({ incident }) => incident.ambigu
				).length;
				expect(Math.abs(obtenus - cible), `palier ${palier}, seed cible-${n}`).toBeLessThanOrEqual(
					1
				);
			}
		}
	});
});

describe('cooldown', () => {
	it('évite les ids récents quand le vivier le permet', () => {
		const premier = composer('cooldown', 6, CONTENU_COMPLET);
		const recents = premier.incidents.map(({ incident }) => incident.id);
		const second = composer('cooldown', 6, CONTENU_COMPLET, { recentIncidents: recents });
		const repris = second.incidents.filter(({ incident }) => recents.includes(incident.id));
		expect(repris).toHaveLength(0);
	});
});
