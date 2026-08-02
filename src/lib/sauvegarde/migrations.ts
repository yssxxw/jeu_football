// Migrations de la sauvegarde. docs/04-donnees.md §2.
//
// Écart assumé vis-à-vis du dossier : migrer() retourne `null` au lieu
// d'appeler sauvegardeVierge() lui-même. La sauvegarde vierge a besoin de
// l'heure courante, et le temps est un argument dans ce projet — laisser
// l'appelant décider garde ce fichier pur et testable sans horloge.
//
// Règle : une migration ne supprime jamais un champ lors du déploiement qui
// l'introduit. On le laisse orphelin un cycle, on le nettoie au suivant.

import type { Sauvegarde } from './types';

export const SCHEMA_COURANT = 1;

type Migration = (sauvegarde: Record<string, unknown>) => Record<string, unknown>;

const MIGRATIONS: Record<number, Migration> = {
	// 1 -> 2 : exemple de ce à quoi ça ressemblera.
	// 1: (s) => ({ ...s, schema: 2, progression: { ...s.progression, saisons: [] } }),
};

/**
 * Migre une sauvegarde brute vers le schéma courant.
 * Retourne `null` quand il faut repartir d'une sauvegarde vierge : donnée
 * illisible, trou dans la chaîne de migrations, ou retour arrière de
 * déploiement (schéma plus récent que celui que ce code sait lire).
 */
export function migrer(brut: unknown): Sauvegarde | null {
	if (typeof brut !== 'object' || brut === null || Array.isArray(brut)) return null;

	let courante = brut as Record<string, unknown>;
	const schemaDe = (valeur: Record<string, unknown>): number =>
		typeof valeur.schema === 'number' ? valeur.schema : Number.NaN;

	if (!Number.isInteger(schemaDe(courante))) return null;

	while (schemaDe(courante) < SCHEMA_COURANT) {
		const migration = MIGRATIONS[schemaDe(courante)];
		if (!migration) return null; // trou dans la chaîne : on repart propre
		const suivante = migration(courante);
		// Une migration qui n'avance pas ferait tourner la boucle sans fin.
		if (schemaDe(suivante) <= schemaDe(courante)) return null;
		courante = suivante;
	}

	if (schemaDe(courante) > SCHEMA_COURANT) return null; // retour arrière de déploiement

	// Frontière d'entrée validée juste avant : la forme vient d'être contrôlée.
	return estUneSauvegarde(courante) ? (courante as unknown as Sauvegarde) : null;
}

/** Vérifie que la forme est exploitable avant de la rendre au jeu. */
function estUneSauvegarde(valeur: Record<string, unknown>): boolean {
	const objet = (cle: string): Record<string, unknown> | null => {
		const champ = valeur[cle];
		return typeof champ === 'object' && champ !== null && !Array.isArray(champ)
			? (champ as Record<string, unknown>)
			: null;
	};

	const progression = objet('progression');
	const quotidien = objet('quotidien');
	const reglages = objet('reglages');

	return (
		objet('arbitreLocal') !== null &&
		progression !== null &&
		quotidien !== null &&
		reglages !== null &&
		objet('compte') !== null &&
		typeof progression.division === 'number' &&
		typeof progression.matchsJoues === 'number' &&
		Array.isArray(progression.badges) &&
		Array.isArray(valeur.recentIncidents) &&
		typeof quotidien.serie === 'number' &&
		typeof reglages.chrono === 'boolean'
	);
}
