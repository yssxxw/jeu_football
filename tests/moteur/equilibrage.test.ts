import { describe, expect, it } from 'vitest';
import {
	FENETRES,
	POIDS_NOTE,
	SEUILS_MENTION,
	TABLE_DIVISIONS,
	VAR
} from '../../src/lib/moteur/equilibrage';

describe('TABLE_DIVISIONS', () => {
	it('contient les 9 divisions, ordonnées du district à l’international', () => {
		expect(TABLE_DIVISIONS).toHaveLength(9);
		TABLE_DIVISIONS.forEach((division, index) => {
			expect(division.palier).toBe(index);
		});
		expect(TABLE_DIVISIONS.map((d) => d.nom)).toEqual([
			'District 2',
			'District 1',
			'Régional',
			'National 3',
			'National',
			'Ligue 2',
			'Ligue 1',
			"Coupe d'Europe",
			'International'
		]);
	});

	it('durcit chaque colonne de façon monotone en montant', () => {
		for (let i = 1; i < TABLE_DIVISIONS.length; i++) {
			const inferieure = TABLE_DIVISIONS[i - 1];
			const superieure = TABLE_DIVISIONS[i];
			if (!inferieure || !superieure) throw new Error('division manquante');
			expect(superieure.chronoS).toBeLessThanOrEqual(inferieure.chronoS);
			expect(superieure.partAmbigus).toBeGreaterThan(inferieure.partAmbigus);
			expect(superieure.graviteMoyenne).toBeGreaterThan(inferieure.graviteMoyenne);
			expect(superieure.controleDepart).toBeLessThan(inferieure.controleDepart);
			expect(superieure.quotaVar).toBeGreaterThanOrEqual(inferieure.quotaVar);
		}
	});

	it('réserve la VAR aux divisions 5 et plus', () => {
		for (const division of TABLE_DIVISIONS) {
			expect(division.quotaVar > 0).toBe(division.palier >= VAR.divisionMin);
		}
	});
});

describe('FENETRES', () => {
	it('somme ses quotas à 12', () => {
		expect(FENETRES.reduce((somme, f) => somme + f.quota, 0)).toBe(12);
	});

	it('est ordonnée chronologiquement, bornes cohérentes', () => {
		for (let i = 0; i < FENETRES.length; i++) {
			const fenetre = FENETRES[i];
			if (!fenetre) throw new Error('fenêtre manquante');
			expect(fenetre.debut).toBeLessThanOrEqual(fenetre.fin);
			const precedente = FENETRES[i - 1];
			if (precedente) expect(fenetre.debut).toBeGreaterThan(precedente.debut);
		}
	});
});

describe('POIDS_NOTE', () => {
	it('somme ses pondérations à 1', () => {
		expect(POIDS_NOTE.justesse + POIDS_NOTE.controle + POIDS_NOTE.constance).toBeCloseTo(1, 10);
	});
});

describe('SEUILS_MENTION', () => {
	it('couvre 0 à 100 sans trou ni chevauchement', () => {
		const tries = [...SEUILS_MENTION].sort((a, b) => a.noteMin - b.noteMin);
		expect(tries[0]?.noteMin).toBe(0);
		expect(tries[tries.length - 1]?.noteMax).toBe(100);
		for (let i = 1; i < tries.length; i++) {
			expect(tries[i]?.noteMin).toBe((tries[i - 1]?.noteMax ?? NaN) + 1);
		}
	});
});
