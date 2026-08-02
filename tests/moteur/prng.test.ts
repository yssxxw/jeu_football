import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { alea, melanger, tirerDans, tirerEntier } from '../../src/lib/moteur/prng';
import { seedDuJour, seedLibre } from '../../src/lib/moteur/seed';

describe('alea', () => {
	it('donne exactement la même séquence à chaque exécution', () => {
		const rand = alea('test');
		expect([rand(), rand(), rand(), rand(), rand()]).toEqual([
			0.7679105116985738, 0.4881803928874433, 0.7532575742807239, 0.9789246479049325,
			0.630205261753872
		]);
	});

	it('deux seeds différentes donnent des séquences différentes', () => {
		expect(alea('a')()).not.toBe(alea('b')());
	});
});

describe('melanger', () => {
	it('donne le même ordre 1 000 fois de suite avec la même seed', () => {
		const attendu = [7, 1, 5, 0, 3, 6, 8, 2, 9, 4];
		for (let n = 0; n < 1000; n++) {
			expect(melanger(alea('melange'), [0, 1, 2, 3, 4, 5, 6, 7, 8, 9])).toEqual(attendu);
		}
	});

	it('ne mute pas le tableau d’entrée et conserve les éléments', () => {
		const entree = [1, 2, 3, 4, 5];
		const sortie = melanger(alea('x'), entree);
		expect(entree).toEqual([1, 2, 3, 4, 5]);
		expect([...sortie].sort()).toEqual([1, 2, 3, 4, 5]);
	});
});

describe('tirerEntier', () => {
	it('est équidistribué sur [0, 9] : chaque valeur entre 9 800 et 10 200 sur 100 000 tirages', () => {
		const rand = alea('distribution');
		const comptes = new Array<number>(10).fill(0);
		for (let n = 0; n < 100_000; n++) {
			const v = tirerEntier(rand, 0, 9);
			comptes[v] = (comptes[v] ?? 0) + 1;
		}
		for (const compte of comptes) {
			expect(compte).toBeGreaterThanOrEqual(9800);
			expect(compte).toBeLessThanOrEqual(10200);
		}
	});

	it('inclut les deux bornes', () => {
		const rand = alea('bornes');
		const vus = new Set<number>();
		for (let n = 0; n < 1000; n++) vus.add(tirerEntier(rand, 3, 5));
		expect([...vus].sort()).toEqual([3, 4, 5]);
	});
});

describe('tirerDans', () => {
	it('retourne toujours un élément du tableau', () => {
		const rand = alea('tirage');
		const tableau = ['a', 'b', 'c'];
		for (let n = 0; n < 100; n++) expect(tableau).toContain(tirerDans(rand, tableau));
	});

	it('refuse un tableau vide', () => {
		expect(() => tirerDans(alea('vide'), [])).toThrow('tableau vide');
	});
});

describe('seedDuJour', () => {
	it('dérive la seed de la date UTC', () => {
		expect(seedDuJour(new Date('2026-07-31T23:59:00Z'))).toBe('SIFFLET-2026-07-31');
	});

	it('bascule au jour suivant à minuit UTC', () => {
		expect(seedDuJour(new Date('2026-07-31T23:59:59Z'))).toBe('SIFFLET-2026-07-31');
		expect(seedDuJour(new Date('2026-08-01T00:00:00Z'))).toBe('SIFFLET-2026-08-01');
	});
});

describe('seedLibre', () => {
	it('suit le format L-{division}-{compteur}-{4 hex}', () => {
		expect(seedLibre(3, 17)).toMatch(/^L-3-17-[0-9a-f]{4}$/);
	});
});

describe('pureté du moteur', () => {
	it('aucune occurrence de Math.random dans src/lib/moteur', () => {
		const racine = join(__dirname, '../../src/lib/moteur');
		const fichiers: string[] = [];
		const parcourir = (dossier: string): void => {
			for (const nom of readdirSync(dossier)) {
				const chemin = join(dossier, nom);
				if (statSync(chemin).isDirectory()) parcourir(chemin);
				else if (chemin.endsWith('.ts')) fichiers.push(chemin);
			}
		};
		parcourir(racine);
		expect(fichiers.length).toBeGreaterThan(0);
		for (const fichier of fichiers) {
			expect(readFileSync(fichier, 'utf8'), fichier).not.toContain('Math.random');
		}
	});
});
