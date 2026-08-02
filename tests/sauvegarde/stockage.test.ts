import { describe, expect, it, vi } from 'vitest';
import { migrer, SCHEMA_COURANT } from '../../src/lib/sauvegarde/migrations';
import {
	charger,
	CLE,
	CLE_CORROMPUE,
	enregistrer,
	genererLicence,
	JOURS_RESULTATS_CONSERVES,
	MAX_INCIDENTS_RECENTS,
	nettoyer,
	sauvegardeVierge,
	stockageMemoire,
	stockageNavigateur
} from '../../src/lib/sauvegarde/stockage';
import type { Sauvegarde } from '../../src/lib/sauvegarde/types';

const MAINTENANT = new Date('2026-08-02T10:00:00Z');

function vierge(): Sauvegarde {
	return sauvegardeVierge(MAINTENANT, { licence: 'FR-1234-A' });
}

describe('sauvegardeVierge', () => {
	it('part au schéma courant, en district 2, sans badge', () => {
		const sauvegarde = vierge();
		expect(sauvegarde.schema).toBe(SCHEMA_COURANT);
		expect(sauvegarde.progression.division).toBe(0);
		expect(sauvegarde.progression.matchsJoues).toBe(0);
		expect(sauvegarde.progression.badges).toEqual([]);
		expect(sauvegarde.progression.meilleureNote).toBeNull();
	});

	it('coupe le son et garde le chrono, comme le veut 02 §9', () => {
		const sauvegarde = vierge();
		expect(sauvegarde.reglages.son).toBe(false);
		expect(sauvegarde.reglages.chrono).toBe(true);
	});

	it('reprend prefers-reduced-motion quand on le lui donne', () => {
		expect(sauvegardeVierge(MAINTENANT, { mouvementReduit: true }).reglages.mouvementReduit).toBe(
			true
		);
	});
});

describe('genererLicence', () => {
	it('suit le gabarit FR-0000-X', () => {
		expect(genererLicence(() => 41234)).toMatch(/^FR-\d{4}-[A-Z]$/);
	});

	it('est stable pour un même tirage', () => {
		expect(genererLicence(() => 7)).toBe(genererLicence(() => 7));
	});
});

describe('charger', () => {
	it('rend une sauvegarde vierge quand la clé est absente', () => {
		const { sauvegarde, corrompue } = charger(stockageMemoire(), MAINTENANT);
		expect(corrompue).toBe(false);
		expect(sauvegarde.progression.matchsJoues).toBe(0);
	});

	it('relit une sauvegarde valide', () => {
		const attendue = { ...vierge() };
		attendue.progression.division = 4;
		attendue.progression.matchsJoues = 11;
		const stockage = stockageMemoire({ [CLE]: JSON.stringify(attendue) });

		const { sauvegarde, corrompue } = charger(stockage, MAINTENANT);
		expect(corrompue).toBe(false);
		expect(sauvegarde.progression.division).toBe(4);
		expect(sauvegarde.progression.matchsJoues).toBe(11);
	});

	it('met de côté une chaîne invalide et repart vierge', () => {
		const stockage = stockageMemoire({ [CLE]: 'ceci n’est pas du JSON' });
		const { sauvegarde, corrompue } = charger(stockage, MAINTENANT);

		expect(corrompue).toBe(true);
		expect(sauvegarde.progression.matchsJoues).toBe(0);
		expect(stockage.obtenir(CLE_CORROMPUE)).toBe('ceci n’est pas du JSON');
	});

	it('met de côté un JSON valide mais qui n’est pas une sauvegarde', () => {
		const stockage = stockageMemoire({ [CLE]: '{"lol":1}' });
		const { sauvegarde, corrompue } = charger(stockage, MAINTENANT);

		expect(corrompue).toBe(true);
		expect(sauvegarde.progression.matchsJoues).toBe(0);
		expect(stockage.obtenir(CLE_CORROMPUE)).toBe('{"lol":1}');
	});

	it('repart vierge sur un schéma 99 sans planter', () => {
		const future = { ...vierge(), schema: 99 };
		const stockage = stockageMemoire({ [CLE]: JSON.stringify(future) });

		const { sauvegarde, corrompue } = charger(stockage, MAINTENANT);
		expect(corrompue).toBe(true);
		expect(sauvegarde.schema).toBe(SCHEMA_COURANT);
		expect(stockage.obtenir(CLE_CORROMPUE)).toContain('"schema":99');
	});

	it('ne perd jamais la donnée mise de côté', () => {
		const stockage = stockageMemoire({ [CLE]: 'abîmé' });
		charger(stockage, MAINTENANT);
		expect(stockage.obtenir(CLE_CORROMPUE)).not.toBeNull();
	});
});

describe('nettoyer', () => {
	it('plafonne recentIncidents à 36 entrées, en gardant les plus récentes', () => {
		const sauvegarde = vierge();
		sauvegarde.recentIncidents = Array.from({ length: 50 }, (_, index) => `i${index}`);

		const propre = nettoyer(sauvegarde, MAINTENANT);
		expect(propre.recentIncidents).toHaveLength(MAX_INCIDENTS_RECENTS);
		expect(propre.recentIncidents[0]).toBe('i14');
		expect(propre.recentIncidents.at(-1)).toBe('i49');
	});

	it('laisse recentIncidents intact en dessous du plafond', () => {
		const sauvegarde = vierge();
		sauvegarde.recentIncidents = ['a', 'b'];
		expect(nettoyer(sauvegarde, MAINTENANT).recentIncidents).toEqual(['a', 'b']);
	});

	it('purge les résultats de plus de 30 jours', () => {
		const sauvegarde = vierge();
		sauvegarde.quotidien.resultats = {
			'2026-08-02': { note: 80, decisions: [] }, // aujourd'hui
			'2026-07-20': { note: 70, decisions: [] }, // 13 jours
			'2026-07-03': { note: 60, decisions: [] }, // 30 jours, conservé
			'2026-06-20': { note: 50, decisions: [] }, // 43 jours, purgé
			'2025-01-01': { note: 40, decisions: [] } // très vieux, purgé
		};

		const propre = nettoyer(sauvegarde, MAINTENANT);
		expect(Object.keys(propre.quotidien.resultats).sort()).toEqual([
			'2026-07-03',
			'2026-07-20',
			'2026-08-02'
		]);
	});

	it('ne mute pas la sauvegarde qu’on lui passe', () => {
		const sauvegarde = vierge();
		sauvegarde.recentIncidents = Array.from({ length: 50 }, (_, index) => `i${index}`);
		const avant = JSON.stringify(sauvegarde);
		nettoyer(sauvegarde, MAINTENANT);
		expect(JSON.stringify(sauvegarde)).toBe(avant);
	});

	it('conserve exactement la fenêtre annoncée', () => {
		expect(JOURS_RESULTATS_CONSERVES).toBe(30);
	});
});

describe('enregistrer', () => {
	it('écrit une sauvegarde relisable', () => {
		const stockage = stockageMemoire();
		const sauvegarde = vierge();
		sauvegarde.progression.division = 5;

		enregistrer(stockage, sauvegarde, MAINTENANT);
		expect(charger(stockage, MAINTENANT).sauvegarde.progression.division).toBe(5);
	});

	it('nettoie avant d’écrire', () => {
		const stockage = stockageMemoire();
		const sauvegarde = vierge();
		sauvegarde.recentIncidents = Array.from({ length: 50 }, (_, index) => `i${index}`);

		enregistrer(stockage, sauvegarde, MAINTENANT);
		expect(charger(stockage, MAINTENANT).sauvegarde.recentIncidents).toHaveLength(
			MAX_INCIDENTS_RECENTS
		);
	});
});

describe('stockageNavigateur', () => {
	it('dégrade en mémoire quand localStorage lance à la lecture', () => {
		vi.stubGlobal('localStorage', {
			getItem: () => {
				throw new Error('SecurityError');
			},
			setItem: () => {
				throw new Error('SecurityError');
			}
		});

		const stockage = stockageNavigateur();
		expect(stockage.obtenir(CLE)).toBeNull();
		expect(stockage.enMemoire).toBe(true);

		// Le jeu reste jouable : on peut écrire et relire dans la même session.
		stockage.poser(CLE, 'x');
		expect(stockage.obtenir(CLE)).toBe('x');

		vi.unstubAllGlobals();
	});

	it('dégrade en mémoire quand le quota est plein à l’écriture', () => {
		const donnees = new Map<string, string>();
		vi.stubGlobal('localStorage', {
			getItem: (cle: string) => donnees.get(cle) ?? null,
			setItem: () => {
				throw new Error('QuotaExceededError');
			}
		});

		const stockage = stockageNavigateur();
		expect(stockage.enMemoire).toBe(false);
		stockage.poser(CLE, 'y');
		expect(stockage.enMemoire).toBe(true);
		expect(stockage.obtenir(CLE)).toBe('y');

		vi.unstubAllGlobals();
	});

	it('ne fait jamais échouer le chargement, même sans stockage', () => {
		vi.stubGlobal('localStorage', {
			getItem: () => {
				throw new Error('indisponible');
			},
			setItem: () => {
				throw new Error('indisponible');
			}
		});

		expect(() => charger(stockageNavigateur(), MAINTENANT)).not.toThrow();
		vi.unstubAllGlobals();
	});
});

describe('migrer', () => {
	it('accepte une sauvegarde au schéma courant', () => {
		expect(migrer(vierge())).not.toBeNull();
	});

	it('refuse une valeur qui n’est pas un objet', () => {
		expect(migrer(null)).toBeNull();
		expect(migrer('texte')).toBeNull();
		expect(migrer(42)).toBeNull();
		expect(migrer([])).toBeNull();
	});

	it('refuse une sauvegarde sans schéma', () => {
		const sans: Record<string, unknown> = { ...vierge() };
		delete sans.schema;
		expect(migrer(sans)).toBeNull();
	});

	it('refuse un schéma plus récent que le code', () => {
		expect(migrer({ ...vierge(), schema: 99 })).toBeNull();
	});

	it('refuse un schéma ancien sans migration disponible', () => {
		expect(migrer({ ...vierge(), schema: -3 })).toBeNull();
	});

	it('refuse une sauvegarde amputée d’une section', () => {
		const ampute: Record<string, unknown> = { ...vierge() };
		delete ampute.progression;
		expect(migrer(ampute)).toBeNull();
	});
});
