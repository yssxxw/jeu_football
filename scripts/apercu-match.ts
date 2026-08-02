// Affiche un match composé dans le terminal.
// Usage : npm run apercu -- SIFFLET-2026-07-31 6

import { CLUBS, CONTEXTES, INCIDENTS } from '../src/lib/contenu';
import { composer } from '../src/lib/moteur/composer';
import { TABLE_DIVISIONS } from '../src/lib/moteur/equilibrage';
import type { Palier } from '../src/lib/moteur/types';

const [seedArg, divisionArg] = process.argv.slice(2);

if (seedArg === undefined) {
	console.error('Usage : npm run apercu -- SEED DIVISION');
	console.error('Exemple : npm run apercu -- SIFFLET-2026-07-31 6');
	process.exit(1);
}

const palier = Number(divisionArg ?? 6);
if (!Number.isInteger(palier) || palier < 0 || palier > 8) {
	console.error(`Division invalide : ${divisionArg}. Attendu un entier de 0 à 8.`);
	process.exit(1);
}

const match = composer(seedArg, palier as Palier, {
	incidents: INCIDENTS,
	clubs: CLUBS,
	contextes: CONTEXTES
});
const reglages = TABLE_DIVISIONS[palier as Palier];

const LIBELLE_JUSTESSE = new Map([
	[1, 'juste'],
	[0.7, 'défendable'],
	[0.4, 'discutable'],
	[0, 'erreur']
]);

console.log('');
console.log(`  ${match.domicile.nom.toUpperCase()}`);
console.log('       reçoit');
console.log(`  ${match.exterieur.nom.toUpperCase()}`);
console.log('');
console.log(`  ${reglages?.nom} · seed ${match.seed}`);
console.log(`  ${match.contexte.texte}`);
console.log('');
console.log(
	`  contrôle de départ ${match.controleDepart} · tempérament ${match.temperamentDomicile} · chrono ${reglages?.chronoS} s · VAR ${reglages?.quotaVar}`
);
console.log('');

for (const { minute, incident } of match.incidents) {
	const marques = [
		incident.ambigu ? 'ambigu' : '',
		incident.tendu ? 'tendu' : '',
		incident.var_eligible ? 'var' : '',
		incident.chronoS === undefined ? '' : `chrono ${incident.chronoS} s`
	].filter(Boolean);

	console.log(
		`  ${String(minute).padStart(3)}'  ${incident.id.padEnd(28)} ${incident.famille.padEnd(13)} g${incident.gravite}  ${marques.join(' ')}`
	);
	for (const option of incident.options) {
		const defaut = option.defaut === true ? ' (défaut)' : '';
		console.log(
			`         ${String(option.severite)}  ${option.libelle.padEnd(50)} ${String(LIBELLE_JUSTESSE.get(option.justesse) ?? option.justesse).padEnd(11)} ${option.dControle > 0 ? '+' : ''}${option.dControle}${defaut}`
		);
	}
	console.log('');
}

const ambigus = match.incidents.filter(({ incident }) => incident.ambigu).length;
console.log(`  ${ambigus} incident(s) ambigu(s) sur 12`);
console.log('');
