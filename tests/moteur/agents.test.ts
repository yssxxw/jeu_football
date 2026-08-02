// Ce que la simulation de V0-9 doit garantir en permanence : un agent qui joue
// mieux note mieux. Les valeurs absolues, elles, vivent dans `npm run simuler`
// et sont commentées en tête de equilibrage.ts — les figer ici les rendrait
// fragiles pour rien, alors que l'ordre des profils, lui, ne se négocie pas.

import { describe, expect, it } from 'vitest';
import { CLUBS, CONTEXTES, INCIDENTS } from '../../src/lib/contenu';
import { appliquer, etatInitial, type Decision } from '../../src/lib/moteur/appliquer';
import { composer } from '../../src/lib/moteur/composer';
import { noter } from '../../src/lib/moteur/noter';
import { alea, tirerDans, type Rand } from '../../src/lib/moteur/prng';
import type { Incident, Palier } from '../../src/lib/moteur/types';

const CONTENU = { incidents: INCIDENTS, clubs: CLUBS, contextes: CONTEXTES };
const PARTIES = 300;

function tousLesIndex(incident: Incident): number[] {
	return incident.options.map((_, index) => index);
}

function indexParfait(incident: Incident): number {
	let meilleur = 0;
	incident.options.forEach((option, index) => {
		const actuel = incident.options[meilleur];
		if (actuel && option.justesse > actuel.justesse) meilleur = index;
	});
	return meilleur;
}

type Decideur = (incident: Incident, index: number, rand: Rand) => Decision;

const ALEATOIRE: Decideur = (incident, _index, rand) => tirerDans(rand, tousLesIndex(incident));

const CONNAIT_LE_FOOT: Decideur = (incident, _index, rand) => {
	const justes = tousLesIndex(incident).filter(
		(index) => (incident.options[index]?.justesse ?? 0) >= 0.7
	);
	const vivier = rand() < 0.7 && justes.length > 0 ? justes : tousLesIndex(incident);
	return tirerDans(rand, vivier);
};

const PARFAIT: Decideur = (incident) => indexParfait(incident);

const PARFAIT_DEUX_CHRONOS: Decideur = (incident, index) =>
	index === 3 || index === 8 ? null : indexParfait(incident);

function medianeDe(decideur: Decideur, palier: Palier): number {
	const notes: number[] = [];
	for (let n = 0; n < PARTIES; n++) {
		const match = composer(`sim-${palier}-${n}`, palier, CONTENU);
		const rand = alea(`agent#${n}`);
		let etat = etatInitial(match);
		let index = 0;
		while (!etat.termine) {
			const programme = match.incidents[etat.index];
			if (programme === undefined) break;
			etat = appliquer(etat, decideur(programme.incident, index, rand));
			index++;
		}
		notes.push(noter(etat, { chrono: true }).note);
	}
	notes.sort((a, b) => a - b);
	return notes[Math.floor(notes.length / 2)] ?? Number.NaN;
}

describe('profils de joueurs, division 6', () => {
	const aleatoire = medianeDe(ALEATOIRE, 6);
	const connait = medianeDe(CONNAIT_LE_FOOT, 6);
	const parfait = medianeDe(PARFAIT, 6);
	const parfaitRate = medianeDe(PARFAIT_DEUX_CHRONOS, 6);

	it('classe les profils dans le bon ordre', () => {
		expect(aleatoire).toBeLessThan(connait);
		expect(connait).toBeLessThan(parfait);
	});

	it('punit les chronos ratés sans effacer la qualité du reste', () => {
		expect(parfaitRate).toBeLessThan(parfait);
		expect(parfaitRate).toBeGreaterThan(connait);
	});

	it('laisse le joueur au hasard sous la barre de la descente', () => {
		// 02 §5 : une note ≤ 48 fait descendre. Jouer au hasard doit faire descendre.
		expect(aleatoire).toBeLessThanOrEqual(48);
	});

	it('laisse un joueur qui connaît le foot monter', () => {
		// 02 §5 : une note ≥ 72 fait monter.
		expect(connait).toBeGreaterThanOrEqual(72);
	});
});

describe('l’ordre des profils tient à toutes les divisions', () => {
	for (const palier of [0, 3, 6, 8] as Palier[]) {
		it(`division ${palier}`, () => {
			expect(medianeDe(ALEATOIRE, palier)).toBeLessThan(medianeDe(CONNAIT_LE_FOOT, palier));
			expect(medianeDe(CONNAIT_LE_FOOT, palier)).toBeLessThanOrEqual(medianeDe(PARFAIT, palier));
		});
	}
});
