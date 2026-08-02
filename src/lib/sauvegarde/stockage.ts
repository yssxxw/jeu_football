// Accès au stockage local. docs/04-donnees.md §2.
//
// localStorage peut lancer une exception : mode privé Safari, quota plein,
// stockage désactivé par la politique du navigateur. Tous les accès passent
// donc par ici, qui encapsule le try/catch et dégrade vers une sauvegarde en
// mémoire. Le jeu doit rester jouable sans stockage, simplement sans progression.
//
// La sauvegarde ne s'écrase jamais silencieusement : toute donnée illisible est
// d'abord recopiée dans `sifflet.sauvegarde.corrompue`.

import { migrer, SCHEMA_COURANT } from './migrations';
import type { Sauvegarde } from './types';

export const CLE = 'sifflet.sauvegarde';
export const CLE_CORROMPUE = 'sifflet.sauvegarde.corrompue';

export const MAX_INCIDENTS_RECENTS = 36;
export const JOURS_RESULTATS_CONSERVES = 30;

export interface StockageBrut {
	obtenir(cle: string): string | null;
	poser(cle: string, valeur: string): void;
	/** Vrai quand les écritures sont perdues au rechargement (repli mémoire). */
	readonly enMemoire: boolean;
}

/** Repli utilisé quand localStorage n'est pas disponible, et par les tests. */
export function stockageMemoire(initial: Record<string, string> = {}): StockageBrut {
	const donnees = new Map(Object.entries(initial));
	return {
		obtenir: (cle) => donnees.get(cle) ?? null,
		poser: (cle, valeur) => {
			donnees.set(cle, valeur);
		},
		enMemoire: true
	};
}

/**
 * localStorage, avec repli mémoire définitif à la première exception.
 * On bascule une fois pour toutes : un stockage qui a échoué une fois
 * échouera encore, et réessayer à chaque écriture coûte cher pour rien.
 */
export function stockageNavigateur(): StockageBrut {
	let repli: StockageBrut | null = null;

	const basculer = (): StockageBrut => {
		if (repli === null) repli = stockageMemoire();
		return repli;
	};

	return {
		obtenir(cle) {
			if (repli !== null) return repli.obtenir(cle);
			try {
				return localStorage.getItem(cle);
			} catch {
				return basculer().obtenir(cle);
			}
		},
		poser(cle, valeur) {
			if (repli !== null) {
				repli.poser(cle, valeur);
				return;
			}
			try {
				localStorage.setItem(cle, valeur);
			} catch {
				basculer().poser(cle, valeur);
			}
		},
		get enMemoire() {
			return repli !== null;
		}
	};
}

/** Licence cosmétique, de la forme « FR-4471-C ». */
export function genererLicence(
	tirer: () => number = () => globalThis.crypto.getRandomValues(new Uint32Array(1))[0] ?? 0
): string {
	const lettres = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
	const brut = tirer();
	const chiffres = String(brut % 10000).padStart(4, '0');
	const finale = lettres[Math.floor(brut / 10000) % lettres.length] ?? 'A';
	return `FR-${chiffres}-${finale}`;
}

export interface OptionsVierge {
	licence?: string;
	mouvementReduit?: boolean;
}

export function sauvegardeVierge(maintenant: Date, options: OptionsVierge = {}): Sauvegarde {
	return {
		schema: SCHEMA_COURANT,
		arbitreLocal: {
			pseudo: null,
			licence: options.licence ?? genererLicence(),
			cree: maintenant.toISOString()
		},
		progression: {
			division: 0,
			divisionMax: 0,
			matchsJoues: 0,
			meilleureNote: null,
			sommeNotes: 0,
			badges: []
		},
		quotidien: {
			dernierJourJoue: null,
			serie: 0,
			serieMax: 0,
			jokerDispo: true,
			joursDepuisJoker: 0,
			resultats: {}
		},
		reglages: {
			son: false,
			chrono: true,
			mouvementReduit: options.mouvementReduit ?? false
		},
		recentIncidents: [],
		compte: { lieAuServeur: false, userId: null }
	};
}

export interface Chargement {
	sauvegarde: Sauvegarde;
	/** Vrai quand l'ancienne donnée a été mise de côté et la sauvegarde remise à zéro. */
	corrompue: boolean;
}

/**
 * Lit la sauvegarde. En cas de donnée illisible, la recopie dans
 * `sifflet.sauvegarde.corrompue` avant de repartir d'une sauvegarde vierge.
 * Ne lance jamais : le jeu doit démarrer quoi qu'il arrive.
 */
export function charger(
	stockage: StockageBrut,
	maintenant: Date,
	options: OptionsVierge = {}
): Chargement {
	const brut = stockage.obtenir(CLE);
	if (brut === null) {
		return { sauvegarde: sauvegardeVierge(maintenant, options), corrompue: false };
	}

	let analysee: unknown = null;
	try {
		analysee = JSON.parse(brut);
	} catch {
		analysee = null;
	}

	const migree = analysee === null ? null : migrer(analysee);
	if (migree !== null) return { sauvegarde: migree, corrompue: false };

	// On ne jette jamais la progression de quelqu'un sans en garder une copie.
	stockage.poser(CLE_CORROMPUE, brut);
	return { sauvegarde: sauvegardeVierge(maintenant, options), corrompue: true };
}

/** Purge les résultats de plus de 30 jours et plafonne les incidents récents. */
export function nettoyer(sauvegarde: Sauvegarde, maintenant: Date): Sauvegarde {
	const limite = new Date(maintenant);
	limite.setUTCDate(limite.getUTCDate() - JOURS_RESULTATS_CONSERVES);
	const jourLimite = limite.toISOString().slice(0, 10);

	const resultats: Sauvegarde['quotidien']['resultats'] = {};
	for (const [jour, resultat] of Object.entries(sauvegarde.quotidien.resultats)) {
		if (jour >= jourLimite) resultats[jour] = resultat;
	}

	return {
		...sauvegarde,
		quotidien: { ...sauvegarde.quotidien, resultats },
		recentIncidents: sauvegarde.recentIncidents.slice(-MAX_INCIDENTS_RECENTS)
	};
}

/**
 * Écrit la sauvegarde, après purge et plafonnement.
 * Appelée en fin de match et au changement de réglage, jamais pendant un match.
 */
export function enregistrer(
	stockage: StockageBrut,
	sauvegarde: Sauvegarde,
	maintenant: Date
): Sauvegarde {
	const propre = nettoyer(sauvegarde, maintenant);
	stockage.poser(CLE, JSON.stringify(propre));
	return propre;
}
