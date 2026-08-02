import { expect, test } from '@playwright/test';
import { jouerUnMatch } from './aide';

const CLE = 'sifflet.sauvegarde';
const CLE_CORROMPUE = 'sifflet.sauvegarde.corrompue';

/** Remplace setItem par une version qui compte les écritures sur la clé de sauvegarde. */
const INSTRUMENTER = `
	window.__ecritures = [];
	const original = Storage.prototype.setItem;
	Storage.prototype.setItem = function (cle, valeur) {
		window.__ecritures.push(cle);
		return original.call(this, cle, valeur);
	};
`;

test('une partie complète n’écrit qu’une seule fois', async ({ page }) => {
	await page.addInitScript(INSTRUMENTER);
	await page.goto('/');
	await jouerUnMatch(page);

	const ecritures = await page.evaluate(
		() => (window as unknown as { __ecritures: string[] }).__ecritures
	);
	expect(ecritures.filter((cle) => cle === CLE)).toHaveLength(1);
});

test('rien n’est écrit pendant le match, seulement à la fin', async ({ page }) => {
	await page.addInitScript(INSTRUMENTER);
	await page.goto('/');
	await page.getByRole('button', { name: "COUP D'ENVOI" }).click();

	// Trois incidents joués : aucune écriture ne doit avoir eu lieu.
	for (let n = 0; n < 3; n++) {
		await page.locator('ul li button').first().click();
		await page.getByRole('button', { name: /Suivant|Feuille de match/ }).click();
	}

	const pendant = await page.evaluate(
		() => (window as unknown as { __ecritures: string[] }).__ecritures
	);
	expect(pendant.filter((cle) => cle === CLE)).toHaveLength(0);
});

test('la progression survit à un rechargement complet', async ({ page }) => {
	await page.goto('/');
	await jouerUnMatch(page);

	const apresMatch = await page.evaluate((cle) => localStorage.getItem(cle), CLE);
	expect(apresMatch).not.toBeNull();
	const attendu = JSON.parse(apresMatch ?? '{}') as {
		progression: { matchsJoues: number; division: number };
	};
	expect(attendu.progression.matchsJoues).toBe(1);

	// Rechargement complet : la division affichée doit être celle qu'on a gagnée.
	await page.goto('/');
	await expect(page.getByText(/match 2$/)).toBeVisible();

	const relu = await page.evaluate((cle) => localStorage.getItem(cle), CLE);
	expect(JSON.parse(relu ?? '{}').progression.division).toBe(attendu.progression.division);
});

test('une sauvegarde illisible est mise de côté et le jeu démarre quand même', async ({ page }) => {
	await page.addInitScript(
		([cle, contenu]) => localStorage.setItem(cle as string, contenu as string),
		[CLE, 'ceci nest pas du JSON']
	);
	await page.goto('/');

	await expect(page.getByText('Sauvegarde illisible, mise de côté.')).toBeVisible();
	await expect(page.getByRole('button', { name: "COUP D'ENVOI" })).toBeVisible();

	const corrompue = await page.evaluate((cle) => localStorage.getItem(cle), CLE_CORROMPUE);
	expect(corrompue).toBe('ceci nest pas du JSON');
});

test('une sauvegarde de schéma inconnu repart vierge sans planter', async ({ page }) => {
	await page.addInitScript(
		([cle, contenu]) => localStorage.setItem(cle as string, contenu as string),
		[CLE, JSON.stringify({ schema: 99, progression: { division: 7 } })]
	);
	await page.goto('/');

	await expect(page.getByRole('button', { name: "COUP D'ENVOI" })).toBeVisible();
	await expect(page.getByText(/District 2 · match 1/)).toBeVisible();
});

test('le jeu reste jouable quand localStorage est indisponible', async ({ page }) => {
	// On casse localStorage seulement : sessionStorage sert à la navigation
	// SvelteKit, et le neutraliser testerait autre chose que ce qu'on veut.
	await page.addInitScript(`
		Object.defineProperty(window, 'localStorage', {
			configurable: true,
			get() { throw new Error('SecurityError'); }
		});
	`);
	await page.goto('/');
	await jouerUnMatch(page);

	// La note est bien là : seule la progression est perdue, pas la partie.
	await expect(page.locator('p strong').first()).toBeVisible();
});
