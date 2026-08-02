// Simulation d'équilibrage. docs/07-backlog-claude-code.md V0-9.
//
// Cinq agents, N parties chacun par division, et la distribution des notes qui
// en sort. Sert à vérifier que les médianes de docs/02-game-design.md §4
// tiennent avant qu'on habille quoi que ce soit.
//
// Usage : npm run simuler [-- --parties=10000] [--division=6]

import { CLUBS, CONTEXTES, INCIDENTS } from '../src/lib/contenu';
import { appliquer, etatInitial, type Decision } from '../src/lib/moteur/appliquer';
import { composer } from '../src/lib/moteur/composer';
import { TABLE_DIVISIONS } from '../src/lib/moteur/equilibrage';
import { noter } from '../src/lib/moteur/noter';
import { alea, tirerDans, type Rand } from '../src/lib/moteur/prng';
import type { Famille, Incident, Palier, Severite } from '../src/lib/moteur/types';

const CONTENU = { incidents: INCIDENTS, clubs: CLUBS, contextes: CONTEXTES };
const PALIERS: Palier[] = [0, 1, 2, 3, 4, 5, 6, 7, 8];

/** Division de référence pour la comparaison à la table §4. */
const DIVISION_REFERENCE: Palier = 6;
const TOLERANCE = 4;

// ── Agents ──

interface Memoire {
	/** Sévérité déjà employée par famille, pour l'agent qui tient sa ligne. */
	severiteParFamille: Map<Famille, Severite>;
}

interface Agent {
	nom: string;
	/** Médiane visée par docs/02-game-design.md §4, quand le dossier en donne une. */
	cible: number | null;
	decider(incident: Incident, index: number, rand: Rand, memoire: Memoire): Decision;
}

function indexJustes(incident: Incident): number[] {
	const indices: number[] = [];
	incident.options.forEach((option, index) => {
		if (option.justesse >= 0.7) indices.push(index);
	});
	return indices;
}

function indexParfait(incident: Incident): number {
	let meilleur = 0;
	incident.options.forEach((option, index) => {
		const actuel = incident.options[meilleur];
		if (actuel && option.justesse > actuel.justesse) meilleur = index;
	});
	return meilleur;
}

/** Tous les indices d'options, pour un tirage uniforme. */
function tousLesIndex(incident: Incident): number[] {
	return incident.options.map((_, index) => index);
}

const AGENTS: readonly Agent[] = [
	{
		nom: 'aléatoire uniforme',
		cible: 35,
		decider: (incident, _index, rand) => tirerDans(rand, tousLesIndex(incident))
	},
	{
		nom: 'connaît le foot',
		cible: 77,
		// Choisit une option de justesse ≥ 0,7 dans 70 % des cas.
		decider: (incident, _index, rand) => {
			const justes = indexJustes(incident);
			const prendreLaBonne = rand() < 0.7;
			const vivier = prendreLaBonne && justes.length > 0 ? justes : tousLesIndex(incident);
			return tirerDans(rand, vivier);
		}
	},
	{
		nom: 'constant',
		cible: 80,
		// Idem, mais garde la même sévérité par famille d'un incident à l'autre.
		decider: (incident, _index, rand, memoire) => {
			const justes = indexJustes(incident);
			const prendreLaBonne = rand() < 0.7;
			const vivier = prendreLaBonne && justes.length > 0 ? justes : tousLesIndex(incident);
			const choix = tirerDans(rand, vivier);

			const dejaVue = memoire.severiteParFamille.get(incident.famille);
			if (dejaVue === undefined) {
				const option = incident.options[choix];
				if (option) memoire.severiteParFamille.set(incident.famille, option.severite);
				return choix;
			}

			// On reprend la sévérité déjà employée sur cette famille si elle est
			// disponible dans le vivier ; sinon on garde le choix initial.
			const memeSeverite = vivier.filter((index) => incident.options[index]?.severite === dejaVue);
			return memeSeverite.length > 0 ? (memeSeverite[0] ?? choix) : choix;
		}
	},
	{
		nom: 'parfait',
		cible: 95, // plafonne à 96 : voir l'encart de calibrage en tête de equilibrage.ts
		decider: (incident) => indexParfait(incident)
	},
	{
		nom: 'parfait, 2 chronos ratés',
		cible: 83,
		// Deux incidents non décidés, toujours les mêmes rangs : on veut mesurer
		// le coût du malus, pas la variance de l'endroit où il tombe.
		decider: (incident, index) => (index === 3 || index === 8 ? null : indexParfait(incident))
	}
];

// ── Statistiques ──

function quantile(triees: readonly number[], fraction: number): number {
	if (triees.length === 0) return Number.NaN;
	const rang = (triees.length - 1) * fraction;
	const bas = Math.floor(rang);
	const haut = Math.ceil(rang);
	const valeurBasse = triees[bas] ?? 0;
	const valeurHaute = triees[haut] ?? valeurBasse;
	return valeurBasse + (valeurHaute - valeurBasse) * (rang - bas);
}

interface Distribution {
	mediane: number;
	d1: number;
	d9: number;
	moyenne: number;
	min: number;
	max: number;
	arretes: number;
}

function distribution(notes: number[], arretes: number): Distribution {
	const triees = [...notes].sort((a, b) => a - b);
	return {
		mediane: quantile(triees, 0.5),
		d1: quantile(triees, 0.1),
		d9: quantile(triees, 0.9),
		moyenne: notes.reduce((somme, note) => somme + note, 0) / notes.length,
		min: triees[0] ?? Number.NaN,
		max: triees[triees.length - 1] ?? Number.NaN,
		arretes
	};
}

// ── Boucle de simulation ──

function jouer(agent: Agent, palier: Palier, seed: string): { note: number; arrete: boolean } {
	const match = composer(seed, palier, CONTENU);
	const rand = alea(`agent#${agent.nom}#${seed}`);
	const memoire: Memoire = { severiteParFamille: new Map() };

	let etat = etatInitial(match);
	let index = 0;
	while (!etat.termine) {
		const programme = match.incidents[etat.index];
		if (programme === undefined) break;
		etat = appliquer(etat, agent.decider(programme.incident, index, rand, memoire));
		index++;
	}

	// Les agents jouent avec le chrono : le malus de non-décision compte.
	const resultat = noter(etat, { chrono: true });
	return { note: resultat.note, arrete: resultat.matchArrete };
}

// ── Sortie ──

const arguments_ = process.argv.slice(2);
const valeurDe = (nom: string): string | undefined =>
	arguments_.find((a) => a.startsWith(`--${nom}=`))?.split('=')[1];

const parties = Number(valeurDe('parties') ?? 10_000);
const divisionDemandee = valeurDe('division');
const paliers = divisionDemandee === undefined ? PALIERS : ([Number(divisionDemandee)] as Palier[]);

const enJson = arguments_.includes('--json');
// En mode --json, stdout ne porte que du JSON : le reste part sur stderr.
(enJson ? console.error : console.log)(
	`${parties} parties par agent et par division, ${paliers.length} division(s).\n`
);

const resultats = new Map<string, Map<Palier, Distribution>>();

for (const agent of AGENTS) {
	const parDivision = new Map<Palier, Distribution>();
	for (const palier of paliers) {
		const notes: number[] = [];
		let arretes = 0;
		for (let n = 0; n < parties; n++) {
			const { note, arrete } = jouer(agent, palier, `sim-${palier}-${n}`);
			notes.push(note);
			if (arrete) arretes++;
		}
		parDivision.set(palier, distribution(notes, arretes));
	}
	resultats.set(agent.nom, parDivision);
}

// --json : sortie exploitable par un autre outil, sans relire un tableau mis
// en forme (les noms de divisions contiennent des chiffres, les reparser est
// une source d'erreur).
if (enJson) {
	const donnees = AGENTS.map((agent) => ({
		agent: agent.nom,
		cible: agent.cible,
		divisions: paliers.map((palier) => ({
			palier,
			nom: TABLE_DIVISIONS[palier]?.nom ?? '',
			...resultats.get(agent.nom)?.get(palier)
		}))
	}));
	console.log(JSON.stringify(donnees, null, '\t'));
	process.exit(0);
}

const nombre = (valeur: number): string => valeur.toFixed(1).padStart(6);

for (const agent of AGENTS) {
	const parDivision = resultats.get(agent.nom);
	if (!parDivision) continue;

	console.log(`── ${agent.nom} ${agent.cible === null ? '' : `(cible ${agent.cible})`}`);
	console.log('   division           d1 médiane     d9 moyenne    min    max  arrêtés');
	for (const palier of paliers) {
		const stats = parDivision.get(palier);
		if (!stats) continue;
		const nom = `${palier} ${TABLE_DIVISIONS[palier]?.nom ?? ''}`.padEnd(18);
		const partArretes = `${((stats.arretes / parties) * 100).toFixed(1)} %`.padStart(8);
		console.log(
			`   ${nom} ${nombre(stats.d1)} ${nombre(stats.mediane)} ${nombre(stats.d9)} ${nombre(stats.moyenne)} ${nombre(stats.min)} ${nombre(stats.max)} ${partArretes}`
		);
	}
	console.log('');
}

// ── Comparaison à la table §4 ──

if (paliers.includes(DIVISION_REFERENCE)) {
	console.log(
		`Comparaison à docs/02-game-design.md §4, division ${DIVISION_REFERENCE} (${TABLE_DIVISIONS[DIVISION_REFERENCE]?.nom}), tolérance ±${TOLERANCE}\n`
	);
	console.log('   agent                          cible  obtenue   écart');

	let horsTolerance = 0;
	for (const agent of AGENTS) {
		if (agent.cible === null) continue;
		const stats = resultats.get(agent.nom)?.get(DIVISION_REFERENCE);
		if (!stats) continue;
		const ecart = stats.mediane - agent.cible;
		const tenu = Math.abs(ecart) <= TOLERANCE;
		if (!tenu) horsTolerance++;
		console.log(
			`   ${agent.nom.padEnd(28)} ${String(agent.cible).padStart(6)} ${nombre(stats.mediane)} ${nombre(ecart)}  ${tenu ? '' : 'HORS TOLÉRANCE'}`
		);
	}

	console.log('');
	if (horsTolerance > 0) {
		console.log(
			`${horsTolerance} profil(s) hors tolérance. Ajuster les dControle du contenu, pas les pondérations de la note (02 §4).`
		);
		process.exitCode = 1;
	} else {
		console.log('Toutes les médianes chiffrées tiennent dans la tolérance.');
	}
}
