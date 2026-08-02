import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { expect, test } from '@playwright/test';
import { appliquer, etatInitial } from '../../src/lib/moteur/appliquer';
import { composer } from '../../src/lib/moteur/composer';
import { seedDuJour } from '../../src/lib/moteur/seed';
import type { Club, Contexte, Incident } from '../../src/lib/moteur/types';

// Le chargeur de Playwright ne gère pas les imports JSON sans attribut de type ;
// on lit donc le contenu depuis le disque plutôt que de contraindre l'application.
const RACINE = join(import.meta.dirname, '..', '..', 'src', 'lib', 'contenu');
const lire = (chemin: string): unknown => JSON.parse(readFileSync(chemin, 'utf8'));

const INCIDENTS = readdirSync(join(RACINE, 'incidents'))
	.filter((nom) => nom.endsWith('.json'))
	.sort()
	.flatMap((nom) => lire(join(RACINE, 'incidents', nom)) as Incident[]);
const CLUBS = lire(join(RACINE, 'clubs.json')) as Club[];
const CONTEXTES = lire(join(RACINE, 'contextes.json')) as Contexte[];

test("coup d'envoi, douze décisions, une note", async ({ page }) => {
	await page.goto('/');
	await page.getByRole('button', { name: "COUP D'ENVOI" }).click();

	await expect(page.getByText(/Contrôle : \d+ \/ 100/)).toBeVisible();

	// Douze incidents, chacun suivi de son écran de conséquence.
	for (let n = 0; n < 12; n++) {
		const options = page.locator('ul li button');
		if ((await options.count()) === 0) break; // match arrêté avant la fin
		await options.first().click();

		const suivant = page.getByRole('button', { name: /Suivant|Feuille de match/ });
		await expect(suivant).toBeVisible();
		await suivant.click();
	}

	await expect(page).toHaveURL(/\/feuille$/);

	const note = page.locator('p strong').first();
	await expect(note).toBeVisible();
	const texte = (await note.textContent()) ?? '';
	const valeur = Number(texte.split('/')[0]?.trim());
	expect(Number.isInteger(valeur)).toBe(true);
	expect(valeur).toBeGreaterThanOrEqual(0);
	expect(valeur).toBeLessThanOrEqual(100);
});

test('la jauge affichée est celle que calcule le moteur', async ({ page }) => {
	// Le match du jour a une seed déterministe : on peut donc recalculer la
	// valeur attendue avec le moteur, sans rien demander à la page.
	const match = composer(seedDuJour(new Date()), 6, {
		incidents: INCIDENTS,
		clubs: CLUBS,
		contextes: CONTEXTES
	});
	const attendu = appliquer(etatInitial(match), 0).controle;

	await page.goto('/');
	await page.getByRole('button', { name: 'le match du jour' }).click();
	await expect(page.getByText(`Contrôle : ${match.controleDepart} / 100`)).toBeVisible();

	await page.locator('ul li button').first().click();
	await expect(page.getByText(`Contrôle : ${attendu} / 100`)).toBeVisible();
});

test('le match du jour est jouable', async ({ page }) => {
	await page.goto('/');
	await page.getByRole('button', { name: 'le match du jour' }).click();
	await expect(page.getByText(/incident 1 sur 12/)).toBeVisible();
});
