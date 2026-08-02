// Snapshot de 200 seeds. Ce test doit casser à chaque fois que le tirage ou
// l'équilibrage change — c'est son rôle. S'il casse, ce n'est jamais « il faut
// mettre à jour le snapshot », c'est « qu'est-ce que j'ai changé ».
// Regénération volontaire : npx tsx scripts/figer-snapshot.ts

import { describe, expect, it } from 'vitest';
import { CLUBS, CONTEXTES, INCIDENTS } from '../../src/lib/contenu';
import { composer } from '../../src/lib/moteur/composer';
import attendu from '../fixtures/matchs.snap.json';
import { resumer, SEEDS_SNAPSHOT, type ResumeMatch } from '../fixtures/snapshot';

const CONTENU = { incidents: INCIDENTS, clubs: CLUBS, contextes: CONTEXTES };
const FIGE = attendu as unknown as ResumeMatch[];

describe('snapshot de 200 seeds', () => {
	it('compose exactement les mêmes 200 matchs', () => {
		const obtenu = SEEDS_SNAPSHOT.map(({ seed, division }) =>
			resumer(composer(seed, division, CONTENU))
		);
		expect(obtenu).toEqual(FIGE);
	});

	it('couvre les neuf divisions', () => {
		expect(new Set(FIGE.map((match) => match.division)).size).toBe(9);
	});

	it('fige bien 200 matchs de 12 incidents', () => {
		expect(FIGE).toHaveLength(200);
		for (const match of FIGE) expect(match.incidents, match.seed).toHaveLength(12);
	});
});
