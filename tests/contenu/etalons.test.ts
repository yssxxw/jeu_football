// Les cinq incidents rédigés de docs/03-contenu.md sont le mètre étalon.
// Leurs valeurs de justesse et de dControle sont figées ici : si un de ces
// tests casse, c'est le contenu qui a bougé, pas le test qu'il faut corriger.

import { describe, expect, it } from 'vitest';
import { CLUBS, CONTEXTES, CONTENU_VERSION, INCIDENTS, incidentParId } from '../../src/lib/contenu';
import { IncidentSchema } from '../../src/lib/contenu/schema';

const ETALONS = [
	'tacle_semelle_touche',
	'contact_surface_appui',
	'capitaine_insiste',
	'perte_de_temps_gardien',
	'celebration_kop_adverse'
] as const;

describe('contenu', () => {
	it('expose une version de contenu entière et positive', () => {
		expect(Number.isInteger(CONTENU_VERSION)).toBe(true);
		expect(CONTENU_VERSION).toBeGreaterThanOrEqual(1);
	});

	it('valide le schéma Zod pour chaque incident', () => {
		for (const incident of INCIDENTS) {
			expect(IncidentSchema.safeParse(incident).success, incident.id).toBe(true);
		}
	});

	it('fournit les clubs et les contextes du contenu minimal', () => {
		expect(CLUBS.length).toBeGreaterThanOrEqual(12);
		expect(CONTEXTES.length).toBeGreaterThanOrEqual(8);
	});

	it('contient les cinq incidents étalons', () => {
		for (const id of ETALONS) expect(incidentParId(id), id).toBeDefined();
	});
});

describe('tacle_semelle_touche', () => {
	const incident = incidentParId('tacle_semelle_touche');

	it('garde ses métadonnées', () => {
		expect(incident).toMatchObject({
			famille: 'tacle',
			gravite: 4,
			paliers: [3, 4, 5, 6, 7, 8],
			fenetre: '46-65',
			var_eligible: true
		});
	});

	it('garde ses quatre couples justesse / dControle', () => {
		expect(incident?.options.map((o) => [o.severite, o.justesse, o.dControle])).toEqual([
			[0, 0, -18],
			[1, 0.4, -9],
			[2, 1, 4],
			[4, 0.4, -6]
		]);
	});

	it('porte le défaut sur « Laisser jouer » et le bloc VAR', () => {
		expect(incident?.options.find((o) => o.defaut)?.libelle).toBe('Laisser jouer');
		expect(incident?.var?.revelation).toContain('Le ralenti est net.');
	});
});

describe('contact_surface_appui', () => {
	const incident = incidentParId('contact_surface_appui');

	it('garde ses métadonnées', () => {
		expect(incident).toMatchObject({
			famille: 'tacle',
			gravite: 5,
			paliers: [5, 6, 7, 8],
			ambigu: true,
			var_eligible: true
		});
	});

	it('garde ses quatre couples justesse / dControle', () => {
		expect(incident?.options.map((o) => [o.severite, o.justesse, o.dControle])).toEqual([
			[0, 0.7, -12],
			[1, 1, -2],
			[1, 0.4, -8],
			[2, 0, -20]
		]);
	});

	it('garde le piège à 0 en dernière option', () => {
		const derniere = incident?.options.at(-1);
		expect(derniere?.libelle).toBe("Penalty et avertissement pour l'attaquant");
		expect(derniere?.justesse).toBe(0);
	});
});

describe('capitaine_insiste', () => {
	const incident = incidentParId('capitaine_insiste');

	it('garde ses métadonnées', () => {
		expect(incident).toMatchObject({
			famille: 'contestation',
			gravite: 3,
			paliers: [2, 3, 4, 5, 6, 7, 8],
			var_eligible: false
		});
	});

	it('garde ses quatre couples justesse / dControle', () => {
		expect(incident?.options.map((o) => [o.severite, o.justesse, o.dControle])).toEqual([
			[0, 0.4, -7],
			[1, 1, 8],
			[2, 0.7, -3],
			[2, 0.4, -10]
		]);
	});

	it("ne propose aucune option d'expulsion", () => {
		expect(incident?.options.some((o) => o.severite >= 3)).toBe(false);
	});
});

describe('perte_de_temps_gardien', () => {
	const incident = incidentParId('perte_de_temps_gardien');

	it('garde ses métadonnées', () => {
		expect(incident).toMatchObject({
			famille: 'antijeu',
			gravite: 2,
			paliers: [3, 4, 5, 6, 7, 8],
			fenetre: '81-90'
		});
	});

	it('garde ses trois couples justesse / dControle', () => {
		expect(incident?.options.map((o) => [o.severite, o.justesse, o.dControle])).toEqual([
			[0, 0.4, -6],
			[1, 0.4, -4],
			[2, 1, 6]
		]);
	});
});

describe('celebration_kop_adverse', () => {
	const incident = incidentParId('celebration_kop_adverse');

	it('garde ses métadonnées', () => {
		expect(incident).toMatchObject({
			famille: 'provocation',
			gravite: 3,
			paliers: [4, 5, 6, 7, 8]
		});
	});

	it('garde ses quatre couples justesse / dControle', () => {
		expect(incident?.options.map((o) => [o.severite, o.justesse, o.dControle])).toEqual([
			[0, 0, -16],
			[1, 0.7, -2],
			[2, 1, 5],
			[2, 0.7, 2]
		]);
	});
});

describe('ton du contenu', () => {
	it('ne contient aucun emoji', () => {
		for (const incident of INCIDENTS) {
			const chaines = [
				incident.texte,
				...incident.options.flatMap((o) => [o.libelle, o.consequence])
			];
			for (const chaine of chaines) {
				expect(/\p{Extended_Pictographic}/u.test(chaine), incident.id).toBe(false);
			}
		}
	});

	it('ne contient aucun point d’exclamation hors parole rapportée', () => {
		for (const incident of INCIDENTS) {
			const horsCitations = incident.texte.replace(/«[^»]*»/g, '');
			expect(horsCitations.includes('!'), incident.id).toBe(false);
		}
	});

	it('tient les textes entre 45 et 90 mots', () => {
		for (const incident of INCIDENTS) {
			const mots = incident.texte.trim().split(/\s+/).length;
			expect(mots, incident.id).toBeGreaterThanOrEqual(45);
			expect(mots, incident.id).toBeLessThanOrEqual(90);
		}
	});
});
