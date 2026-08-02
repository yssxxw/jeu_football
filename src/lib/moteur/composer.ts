// Composition d'un match. Les cinq étapes de docs/02-game-design.md §6.
//
// ─────────────────────────────────────────────────────────────────────────────
// ORDRE DE CONSOMMATION DU PRNG — CE COMMENTAIRE FAIT FOI
// ─────────────────────────────────────────────────────────────────────────────
//
// Toute modification de cette liste incrémente CONTENU_VERSION.
//
//   1. club à domicile        1 appel
//   2. club à l'extérieur     1 appel
//   3. contexte               1 appel
//   4. minutes                Σ (taille de la fenêtre − 1) appels,
//                             une passe de melanger() par fenêtre, dans
//                             l'ordre de FENETRES. Le nombre d'appels ne
//                             dépend que de FENETRES, jamais du contenu.
//   5. incidents              12 appels, un par créneau, dans l'ordre
//                             chronologique. Exactement un appel par créneau,
//                             quelle que soit la taille du vivier.
//
// La règle qui tient tout : le NOMBRE d'appels ne dépend jamais des données.
// Le filtrage (paliers, fenêtre, famille, cooldown, quota d'ambigus) se fait
// entièrement AVANT le tirage, sans consommer. Un vivier vide fait relâcher
// les contraintes, il ne fait jamais tirer une deuxième fois. Ajouter un
// incident inéligible au palier testé ne change donc rien au match produit.
//
// Ne jamais écrire `if (x) rand()` sans consommer aussi dans l'autre branche.
// ─────────────────────────────────────────────────────────────────────────────

import { FENETRES, TABLE_DIVISIONS } from './equilibrage';
import { melanger, tirerDans, type Rand } from './prng';
import { alea } from './prng';
import type {
	Club,
	Contexte,
	Fenetre,
	Incident,
	IncidentProgramme,
	Match,
	Palier,
	Temperament
} from './types';

const INCIDENTS_PAR_MATCH = 12;
const FAMILLE_MAX_PAR_MATCH = 2;

export interface OptionsComposition {
	/** Ids joués récemment, évités si le vivier le permet. Ignoré pour le match du jour. */
	recentIncidents?: readonly string[];
}

export interface Contenu {
	incidents: readonly Incident[];
	clubs: readonly Club[];
	contextes: readonly Contexte[];
}

function division(palier: Palier) {
	const trouvee = TABLE_DIVISIONS[palier];
	if (!trouvee) throw new Error(`composer: division inconnue (${palier})`);
	return trouvee;
}

// ── Étape 3 — les douze minutes ──
//
// Une passe de melanger() par fenêtre sur l'intégralité de son intervalle :
// le nombre d'appels ne dépend que de FENETRES. On prend ensuite les `quota`
// premières minutes, puis on redresse la suite pour qu'elle soit strictement
// croissante — les fenêtres 31-45+2 et 46-65 se recouvrent sur 46 et 47.
function tirerMinutes(rand: Rand): number[] {
	const parFenetre: number[][] = [];
	for (const fenetre of FENETRES) {
		const intervalle: number[] = [];
		for (let minute = fenetre.debut; minute <= fenetre.fin; minute++) intervalle.push(minute);
		const melangees = melanger(rand, intervalle);
		parFenetre.push(melangees.slice(0, fenetre.quota).sort((a, b) => a - b));
	}

	const minutes: number[] = [];
	let precedente = 0;
	for (const groupe of parFenetre) {
		for (const minute of groupe) {
			const retenue = minute > precedente ? minute : precedente + 1;
			minutes.push(retenue);
			precedente = retenue;
		}
	}
	return minutes;
}

// ── Étape 4 — le vivier d'un créneau ──
//
// Filtrage pur, sans tirage. Les contraintes sont relâchées une par une, de la
// plus souple à la plus dure, pour qu'un vivier vide ne bloque jamais la
// composition. Le palier et la fenêtre, eux, ne se relâchent pas.
function vivier(
	incidents: readonly Incident[],
	fenetre: Fenetre,
	palier: Palier,
	dejaTires: readonly Incident[],
	recents: readonly string[],
	ambiguSouhaite: boolean | null,
	poolTendu: boolean
): readonly Incident[] {
	const base = incidents.filter(
		(incident) => incident.fenetre === fenetre.id && incident.paliers.includes(palier)
	);

	const comptesFamille = new Map<string, number>();
	for (const incident of dejaTires) {
		comptesFamille.set(incident.famille, (comptesFamille.get(incident.famille) ?? 0) + 1);
	}
	const idsTires = new Set(dejaTires.map((incident) => incident.id));

	const jamaisTireDansLeMatch = base.filter((incident) => !idsTires.has(incident.id));
	const familleDisponible = jamaisTireDansLeMatch.filter(
		(incident) => (comptesFamille.get(incident.famille) ?? 0) < FAMILLE_MAX_PAR_MATCH
	);

	// Contraintes de confort, relâchées en premier si elles vident le vivier.
	const candidats = [
		// Tout : cooldown respecté, quota d'ambigus respecté, pool tendu respecté.
		familleDisponible.filter(
			(incident) =>
				!recents.includes(incident.id) &&
				(ambiguSouhaite === null || incident.ambigu === ambiguSouhaite) &&
				(!poolTendu || incident.tendu)
		),
		// On lâche le pool tendu.
		familleDisponible.filter(
			(incident) =>
				!recents.includes(incident.id) &&
				(ambiguSouhaite === null || incident.ambigu === ambiguSouhaite)
		),
		// On lâche le quota d'ambigus.
		familleDisponible.filter((incident) => !recents.includes(incident.id)),
		// On lâche le cooldown.
		familleDisponible,
		// On lâche la limite de famille.
		jamaisTireDansLeMatch,
		// Dernier recours : on autorise un doublon plutôt que de ne rien rendre.
		base
	];

	for (const liste of candidats) {
		if (liste.length > 0) return liste;
	}
	throw new Error(
		`composer: aucun incident éligible pour la fenêtre ${fenetre.id} au palier ${palier}`
	);
}

/**
 * Compose un match à partir d'une seed et d'une division.
 * Fonction pure : mêmes arguments, même objet, à l'octet près.
 */
export function composer(
	seed: string,
	palier: Palier,
	contenu: Contenu,
	options: OptionsComposition = {}
): Match {
	const rand = alea(seed);
	const reglages = division(palier);
	const recents = options.recentIncidents ?? [];

	// ── Étape 1 — les clubs ──
	const pool = contenu.clubs.filter((club) => club.paliers.includes(palier));
	if (pool.length < 2) {
		throw new Error(`composer: moins de deux clubs au palier ${palier}`);
	}
	const domicile = tirerDans(rand, pool);
	const exterieur = tirerDans(
		rand,
		pool.filter((club) => club.id !== domicile.id)
	);

	// ── Étape 2 — le contexte ──
	const contextes = contenu.contextes.filter((contexte) => contexte.paliers.includes(palier));
	if (contextes.length === 0) {
		throw new Error(`composer: aucun contexte au palier ${palier}`);
	}
	const contexte = tirerDans(rand, contextes);

	const dTemperament = contexte.effet?.temperament ?? 0;
	const temperamentDomicile = Math.min(
		2,
		Math.max(0, domicile.temperament + dTemperament)
	) as Temperament;
	const controleDepart = reglages.controleDepart + (contexte.effet?.controleDepart ?? 0);

	// ── Étape 3 — les douze minutes ──
	const minutes = tirerMinutes(rand);

	// ── Étape 4 — les incidents ──
	// Cible d'ambigus de la division, à ±1 incident près (02 §5).
	const cibleAmbigus = Math.round(reglages.partAmbigus * INCIDENTS_PAR_MATCH);

	const tires: Incident[] = [];
	const programmes: IncidentProgramme[] = [];
	let index = 0;

	for (const fenetre of FENETRES) {
		for (let n = 0; n < fenetre.quota; n++) {
			const ambigusTires = tires.filter((incident) => incident.ambigu).length;
			const creneauxRestants = INCIDENTS_PAR_MATCH - index;

			// Ni forçage vers l'ambigu ni forçage contre, tant que la cible reste
			// atteignable dans le nombre de créneaux qui restent.
			let ambiguSouhaite: boolean | null = null;
			if (ambigusTires + creneauxRestants <= cibleAmbigus) ambiguSouhaite = true;
			else if (ambigusTires >= cibleAmbigus) ambiguSouhaite = false;

			const minute = minutes[index];
			if (minute === undefined) throw new Error('composer: minute manquante');

			const incident = tirerDans(
				rand,
				vivier(contenu.incidents, fenetre, palier, tires, recents, ambiguSouhaite, false)
			);

			tires.push(incident);
			programmes.push({ minute, incident });
			index++;
		}
	}

	return {
		seed,
		division: palier,
		domicile,
		exterieur,
		contexte,
		temperamentDomicile,
		controleDepart,
		incidents: programmes
	};
}
