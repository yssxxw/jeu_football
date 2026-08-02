// Les 200 seeds figées du test de déterminisme, et le résumé compact d'un
// match. Partagé par le test et par scripts/figer-snapshot.ts pour qu'il n'y
// ait qu'une seule définition de ce qui est figé.

import type { Match, Palier } from '../../src/lib/moteur/types';

export interface SeedFigee {
	seed: string;
	division: Palier;
}

/** 200 seeds : les 9 divisions parcourues en boucle, plus les dates du match du jour. */
export const SEEDS_SNAPSHOT: readonly SeedFigee[] = Array.from({ length: 200 }, (_, index) => {
	const division = (index % 9) as Palier;
	const seed =
		index < 100 ? `SNAP-${index}` : `SIFFLET-2026-${String((index % 12) + 1).padStart(2, '0')}-15`;
	return { seed, division };
});

export interface ResumeMatch {
	seed: string;
	division: Palier;
	affiche: string;
	contexte: string;
	temperament: number;
	controleDepart: number;
	incidents: string[];
}

/** Résumé stable d'un match : tout ce qui doit rester identique d'un build à l'autre. */
export function resumer(match: Match): ResumeMatch {
	return {
		seed: match.seed,
		division: match.division,
		affiche: `${match.domicile.abrege}-${match.exterieur.abrege}`,
		contexte: match.contexte.id,
		temperament: match.temperamentDomicile,
		controleDepart: match.controleDepart,
		incidents: match.incidents.map(({ minute, incident }) => `${minute}:${incident.id}`)
	};
}
