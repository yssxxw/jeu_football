// Validation du contenu : schéma Zod puis les 10 invariants de docs/04-donnees.md §1.
// Sort en code 1 au premier invariant cassé, avec le message et l'id fautif.
// Usage : npm run valider-contenu

import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { FENETRES, TABLE_DIVISIONS } from '../src/lib/moteur/equilibrage';
import type { Incident } from '../src/lib/moteur/types';
import { ClubSchema, ContexteSchema, IncidentSchema } from '../src/lib/contenu/schema';

const RACINE = join(import.meta.dirname, '..', 'src', 'lib', 'contenu');
const MOTS_MIN = 45;
const MOTS_MAX = 90;
const INCIDENTS_PAR_COUPLE_MIN = 8;

// Le seuil de 8 incidents par couple (palier, fenêtre) n'est atteignable qu'avec
// le contenu complet : bloquant à partir de V0-13, simple avertissement avant.
const COUVERTURE_BLOQUANTE = process.env.COUVERTURE_BLOQUANTE === '1';

/**
 * Jeu de caractères avec lequel static/fonts/*.woff2 a été sous-ensemblé.
 * Toute modification ici oblige à régénérer les polices, et inversement.
 * Latin de base imprimable, plus ce que le français exige, plus la ponctuation
 * typographique française. Voir docs/06-ui-direction-artistique.md §3.
 */
const CARACTERES_DESSINABLES = new Set([
	...Array.from({ length: 0x7f - 0x20 }, (_, index) => String.fromCodePoint(0x20 + index)),
	...'ÀÂÄÆÇÈÉÊËÎÏÔÖŒÙÛÜŸÑÁÍÓÚ',
	...'àâäæçèéêëîïôöœùûüÿñáíóú',
	...'«»""‘’–—…·°€%  ',
	'\n'
]);

const erreurs: string[] = [];
const avertissements: string[] = [];
const ecarts: string[] = [];

function erreur(id: string, message: string): void {
	erreurs.push(`${id} : ${message}`);
}

// Deux invariants de 04-donnees.md §1 sont contredits par les cinq incidents
// étalons de 03-contenu.md, qui font foi « au caractère près ». Ils sont donc
// signalés sans bloquer, le temps que l'arbitrage soit tranché dans la doc.
// Détail dans docs/04-donnees.md §1, encart « Écarts constatés ».
function ecart(id: string, message: string): void {
	ecarts.push(`${id} : ${message}`);
}

function compterMots(texte: string): number {
	return texte.trim().split(/\s+/).length;
}

// ── Chargement et schéma ──

function lireJson(chemin: string): unknown {
	return JSON.parse(readFileSync(chemin, 'utf8'));
}

const fichiersIncidents = readdirSync(join(RACINE, 'incidents'))
	.filter((nom) => nom.endsWith('.json'))
	.sort();

const incidents: Incident[] = [];

for (const fichier of fichiersIncidents) {
	const brut = lireJson(join(RACINE, 'incidents', fichier));
	if (!Array.isArray(brut)) {
		erreur(fichier, 'le fichier doit contenir un tableau');
		continue;
	}
	brut.forEach((entree, index) => {
		const resultat = IncidentSchema.safeParse(entree);
		if (!resultat.success) {
			const id =
				typeof entree === 'object' && entree !== null && 'id' in entree
					? String((entree as { id: unknown }).id)
					: `${fichier}[${index}]`;
			for (const probleme of resultat.error.issues) {
				erreur(id, `schéma — ${probleme.path.join('.')} : ${probleme.message}`);
			}
			return;
		}
		// Le nom du fichier doit correspondre à la famille : un incident rangé
		// ailleurs échappe à la relecture par famille.
		const familleAttendue = fichier.replace(/\.json$/, '');
		if (resultat.data.famille !== familleAttendue) {
			erreur(resultat.data.id, `rangé dans ${fichier} mais de famille ${resultat.data.famille}`);
		}
		incidents.push(resultat.data as Incident);
	});
}

const clubsBruts = lireJson(join(RACINE, 'clubs.json'));
const contextesBruts = lireJson(join(RACINE, 'contextes.json'));

for (const [nom, brut, schema] of [
	['clubs.json', clubsBruts, ClubSchema],
	['contextes.json', contextesBruts, ContexteSchema]
] as const) {
	if (!Array.isArray(brut)) {
		erreur(nom, 'le fichier doit contenir un tableau');
		continue;
	}
	brut.forEach((entree, index) => {
		const resultat = schema.safeParse(entree);
		if (!resultat.success) {
			for (const probleme of resultat.error.issues) {
				erreur(`${nom}[${index}]`, `schéma — ${probleme.path.join('.')} : ${probleme.message}`);
			}
		}
	});
}

// ── Invariant 1 — id unique sur l'ensemble des fichiers ──

const vus = new Set<string>();
for (const incident of incidents) {
	if (vus.has(incident.id)) erreur(incident.id, 'id en double');
	vus.add(incident.id);
}

for (const incident of incidents) {
	const { id, options } = incident;

	// ── Invariant 2 — exactement une option avec defaut: true ──
	const defauts = options.filter((option) => option.defaut === true);
	if (defauts.length !== 1) {
		erreur(id, `${defauts.length} option(s) avec defaut: true, il en faut exactement une`);
	}

	// ── Invariant 3 — au moins une option avec justesse === 1 ──
	if (!options.some((option) => option.justesse === 1)) {
		erreur(id, 'aucune option avec justesse: 1');
	}

	// ── Invariant 4 — si ambigu : au moins deux options à 0.7 ──
	const nombreDefendables = options.filter((option) => option.justesse === 0.7).length;
	if (incident.ambigu && nombreDefendables < 2) {
		ecart(id, `ambigu: true mais ${nombreDefendables} option(s) à justesse 0,7, il en faut 2`);
	}

	// ── Invariant 5 — si var_eligible : le bloc var existe ──
	if (incident.var_eligible && incident.var === undefined) {
		erreur(id, 'var_eligible: true sans bloc var');
	}
	if (!incident.var_eligible && incident.var !== undefined) {
		erreur(id, 'bloc var présent alors que var_eligible: false');
	}

	// ── Invariant 6 — options triées par severite croissante ──
	// Écart assumé vis-à-vis de 04-donnees.md : le tri est au sens large, pas strict.
	// Trois des cinq incidents étalons de 03-contenu.md portent deux options de même
	// sévérité (contact_surface_appui, capitaine_insiste, celebration_kop_adverse).
	for (let i = 1; i < options.length; i++) {
		const precedente = options[i - 1];
		const courante = options[i];
		if (!precedente || !courante) continue;
		if (courante.severite < precedente.severite) {
			erreur(id, `options non triées par sévérité (position ${i})`);
		}
	}

	// ── Invariant 7 — texte entre 45 et 90 mots ──
	const mots = compterMots(incident.texte);
	if (mots < MOTS_MIN || mots > MOTS_MAX) {
		erreur(id, `texte de ${mots} mots, attendu entre ${MOTS_MIN} et ${MOTS_MAX}`);
	}

	// ── Invariant 8 — aucun « ! » hors paroles rapportées dans texte ──
	const texteHorsCitations = incident.texte.replace(/«[^»]*»/g, '').replace(/"[^"]*"/g, '');
	if (texteHorsCitations.includes('!')) {
		erreur(id, 'point d’exclamation hors parole rapportée dans texte');
	}

	// ── Invariant 9 — aucun caractère que les polices ne savent pas dessiner ──
	// Plus fort que « hors latin étendu » : on vérifie contre le jeu exact avec
	// lequel static/fonts/*.woff2 a été sous-ensemblé. Un caractère absent sort
	// en police de repli, ce qui se voit immédiatement au milieu d'un mot.
	const chaines = [
		incident.texte,
		...options.flatMap((option) => [option.libelle, option.consequence]),
		...(incident.var === undefined
			? []
			: [
					incident.var.revelation,
					incident.var.maintien.consequence,
					incident.var.rectification.libelleCorrige,
					incident.var.rectification.consequence
				])
	];
	for (const chaine of chaines) {
		if (/\p{Extended_Pictographic}/u.test(chaine)) {
			erreur(id, 'emoji détecté');
			break;
		}
		const interdit = [...chaine].find((caractere) => !CARACTERES_DESSINABLES.has(caractere));
		if (interdit !== undefined) {
			erreur(
				id,
				`caractère ${JSON.stringify(interdit)} (U+${(interdit.codePointAt(0) ?? 0)
					.toString(16)
					.toUpperCase()
					.padStart(4, '0')}) absent des polices livrées`
			);
			break;
		}
	}

	// Libellés : 34 caractères maximum, sinon ça déborde en 390 px (04 §1).
	for (const option of options) {
		if (option.libelle.length > 34) {
			ecart(id, `libellé de ${option.libelle.length} caractères : « ${option.libelle} »`);
		}
	}
}

// ── Invariant 10 — pour chaque couple (palier, fenêtre) : ≥ 8 incidents éligibles ──

const couvertureManquante: string[] = [];
for (const division of TABLE_DIVISIONS) {
	for (const fenetre of FENETRES) {
		const eligibles = incidents.filter(
			(incident) => incident.fenetre === fenetre.id && incident.paliers.includes(division.palier)
		).length;
		if (eligibles < INCIDENTS_PAR_COUPLE_MIN) {
			couvertureManquante.push(
				`palier ${division.palier} (${division.nom}) / fenêtre ${fenetre.id} : ${eligibles} incident(s), il en faut ${INCIDENTS_PAR_COUPLE_MIN}`
			);
		}
	}
}

if (couvertureManquante.length > 0) {
	const cible = COUVERTURE_BLOQUANTE ? erreurs : avertissements;
	cible.push(
		`couverture insuffisante sur ${couvertureManquante.length} couple(s) (palier, fenêtre)`,
		...couvertureManquante.slice(0, 5).map((ligne) => `  ${ligne}`)
	);
	if (couvertureManquante.length > 5) {
		cible.push(`  … et ${couvertureManquante.length - 5} autre(s)`);
	}
}

// ── Rapport ──

console.log(`Incidents : ${incidents.length}`);

console.log('\nPar palier');
for (const division of TABLE_DIVISIONS) {
	const compte = incidents.filter((incident) => incident.paliers.includes(division.palier)).length;
	console.log(`  ${division.palier} ${division.nom.padEnd(15)} ${compte}`);
}

console.log('\nPar fenêtre');
for (const fenetre of FENETRES) {
	const compte = incidents.filter((incident) => incident.fenetre === fenetre.id).length;
	console.log(`  ${fenetre.id.padEnd(8)} quota ${fenetre.quota}   ${compte} incident(s)`);
}

console.log('\nPar famille');
const familles = [...new Set(incidents.map((incident) => incident.famille))].sort();
for (const famille of familles) {
	const compte = incidents.filter((incident) => incident.famille === famille).length;
	console.log(`  ${famille.padEnd(13)} ${compte}`);
}

const ambigus = incidents.filter((incident) => incident.ambigu).length;
console.log(`\nAmbigus : ${ambigus} / ${incidents.length}`);
console.log(`Clubs : ${Array.isArray(clubsBruts) ? clubsBruts.length : 0}`);
console.log(`Contextes : ${Array.isArray(contextesBruts) ? contextesBruts.length : 0}`);

if (ecarts.length > 0) {
	console.log(`\n${ecarts.length} écart(s) doc — 03-contenu.md contre 04-donnees.md §1`);
	for (const ligne of ecarts) console.log(`  ${ligne}`);
}

if (avertissements.length > 0) {
	console.log(`\n${avertissements.length} avertissement(s)`);
	for (const ligne of avertissements) console.log(`  ${ligne}`);
}

if (erreurs.length > 0) {
	console.error(`\n${erreurs.length} erreur(s)`);
	for (const ligne of erreurs) console.error(`  ${ligne}`);
	process.exit(1);
}

console.log('\nContenu valide.');
