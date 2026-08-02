// Corpus synthétique qui respecte l'invariant « ≥ 8 incidents par couple
// (palier, fenêtre) » de docs/04-donnees.md §1, que le contenu de V0-4 ne
// tient pas encore. Il sert à vérifier l'ALGORITHME de composition sur un
// vivier de la taille prévue en V0-13, pas à tester le contenu réel.

import { FENETRES } from '../../src/lib/moteur/equilibrage';
import type { Club, Contexte, Famille, Incident, Palier } from '../../src/lib/moteur/types';

const FAMILLES: readonly Famille[] = [
	'tacle',
	'main',
	'simulation',
	'contestation',
	'antijeu',
	'duel_aerien',
	'hors_jeu',
	'provocation',
	'banc'
];

const TOUS_PALIERS: Palier[] = [0, 1, 2, 3, 4, 5, 6, 7, 8];
const PALIERS_HAUTS: Palier[] = [4, 5, 6, 7, 8];

function incident(id: string, famille: Famille, fenetre: string, ambigu: boolean): Incident {
	return {
		id,
		famille,
		gravite: 3,
		paliers: ambigu ? [...PALIERS_HAUTS] : [...TOUS_PALIERS],
		fenetre: fenetre as Incident['fenetre'],
		ambigu,
		tendu: false,
		var_eligible: false,
		texte: 'texte de remplissage sans importance pour la composition',
		options: [
			{ libelle: 'Laisser jouer', severite: 0, justesse: 0, dControle: -8, consequence: '.' },
			{ libelle: 'Faute', severite: 1, justesse: 1, dControle: 4, consequence: '.', defaut: true },
			...(ambigu
				? [
						{
							libelle: 'Avertissement',
							severite: 2 as const,
							justesse: 0.7 as const,
							dControle: -2,
							consequence: '.'
						},
						{
							libelle: 'Expulsion',
							severite: 4 as const,
							justesse: 0.7 as const,
							dControle: -6,
							consequence: '.'
						}
					]
				: [
						{
							libelle: 'Avertissement',
							severite: 2 as const,
							justesse: 0.4 as const,
							dControle: -2,
							consequence: '.'
						}
					])
		]
	};
}

/** Deux incidents par (fenêtre, famille) : un ouvert à tous les paliers, un ambigu réservé aux paliers 4+. */
export const INCIDENTS_COMPLETS: readonly Incident[] = FENETRES.flatMap((fenetre) =>
	FAMILLES.flatMap((famille) => [
		incident(`${famille}_${fenetre.id}_simple`, famille, fenetre.id, false),
		incident(`${famille}_${fenetre.id}_ambigu`, famille, fenetre.id, true)
	])
);

export const CLUBS_COMPLETS: readonly Club[] = Array.from({ length: 20 }, (_, index) => ({
	id: `club_${index}`,
	nom: `Club ${index}`,
	abrege: 'CLU',
	ville: `Ville ${index}`,
	pays: 'federation' as const,
	paliers: [...TOUS_PALIERS],
	temperament: (index % 3) as 0 | 1 | 2,
	surnom: `les ${index}`,
	couleurs: ['#000000', '#FFFFFF'] as [string, string]
}));

export const CONTEXTES_COMPLETS: readonly Contexte[] = Array.from({ length: 6 }, (_, index) => ({
	id: `contexte_${index}`,
	texte: `Contexte ${index}.`,
	paliers: [...TOUS_PALIERS]
}));

export const CONTENU_COMPLET = {
	incidents: INCIDENTS_COMPLETS,
	clubs: CLUBS_COMPLETS,
	contextes: CONTEXTES_COMPLETS
};
