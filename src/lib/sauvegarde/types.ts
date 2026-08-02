// Forme de la sauvegarde locale. docs/04-donnees.md §2.

import type { Palier } from '../moteur/types';

export interface ResultatDuJour {
	note: number;
	decisions: number[];
}

export interface Sauvegarde {
	schema: number;
	arbitreLocal: {
		pseudo: string | null; // null tant qu'il n'a pas été choisi
		licence: string; // ex « FR-4471-C », généré une fois, cosmétique
		cree: string; // date ISO
	};
	progression: {
		division: Palier;
		divisionMax: Palier;
		matchsJoues: number;
		meilleureNote: number | null;
		sommeNotes: number; // pour la moyenne, évite de stocker l'historique
		badges: string[]; // ids, triés
	};
	quotidien: {
		dernierJourJoue: string | null; // « 2026-07-31 »
		serie: number;
		serieMax: number;
		jokerDispo: boolean;
		joursDepuisJoker: number;
		resultats: Record<string, ResultatDuJour>; // 30 derniers jours, purge à l'écriture
	};
	reglages: {
		son: boolean; // false par défaut
		chrono: boolean; // true par défaut
		mouvementReduit: boolean; // initialisé depuis prefers-reduced-motion
	};
	recentIncidents: string[]; // 36 derniers ids joués, pour le cooldown, FIFO
	compte: { lieAuServeur: boolean; userId: string | null };
}
