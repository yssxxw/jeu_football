import { expect, test } from '@playwright/test';
import { jouerJusquALaFeuille } from './aide';

const CHRONO = '[data-restant-ms]';

/** Force document.hidden puis émet visibilitychange, comme un passage en arrière-plan. */
const CACHER = `
	Object.defineProperty(document, 'hidden', { configurable: true, value: true });
	document.dispatchEvent(new Event('visibilitychange'));
`;

const MONTRER = `
	Object.defineProperty(document, 'hidden', { configurable: true, value: false });
	document.dispatchEvent(new Event('visibilitychange'));
`;

type Page = import('@playwright/test').Page;

async function restant(page: Page): Promise<number> {
	const valeur = await page.locator(CHRONO).first().getAttribute('data-restant-ms');
	return Number(valeur);
}

async function phase(page: Page): Promise<string | null> {
	return page.locator(CHRONO).first().getAttribute('data-phase');
}

/** Attend la fin du temps de lecture, c'est-à-dire le démarrage du décompte. */
async function attendreDecision(page: Page): Promise<void> {
	await expect(page.locator('[data-phase="decision"]')).toBeVisible({ timeout: 25_000 });
}

test('le chrono commence par une phase de lecture', async ({ page }) => {
	await page.goto('/');
	await page.getByRole('button', { name: "COUP D'ENVOI" }).click();

	await expect(page.locator(CHRONO)).toBeVisible();
	expect(await phase(page)).toBe('lecture');

	// Pendant la lecture, rien ne se consomme.
	const avant = await restant(page);
	await page.waitForTimeout(1200);
	expect(await restant(page)).toBe(avant);
});

test('les options sont cliquables dès la lecture', async ({ page }) => {
	await page.goto('/');
	await page.getByRole('button', { name: "COUP D'ENVOI" }).click();

	expect(await phase(page)).toBe('lecture');
	await page.locator('ul li button').first().click();

	// La décision est passée : on est sur l'écran de conséquence.
	await expect(page.getByRole('button', { name: /Suivant|Feuille de match/ })).toBeVisible();
});

test('la durée du chrono suit la division', async ({ page }) => {
	await page.goto('/');
	await page.getByRole('button', { name: "COUP D'ENVOI" }).click();

	// District 2 : 8 s de chrono. Le premier incident du tout premier match est
	// tacle_intro, qui porte son propre chrono de 10 s (02 §9).
	await expect(page.locator(CHRONO)).toBeVisible();
	const debut = await restant(page);
	expect(debut).toBeGreaterThan(7000);
	expect(debut).toBeLessThanOrEqual(10000);
});

test('le chrono décompte une fois la lecture terminée', async ({ page }) => {
	test.setTimeout(60_000);
	await page.goto('/');
	await page.getByRole('button', { name: "COUP D'ENVOI" }).click();
	await attendreDecision(page);

	const avant = await restant(page);
	await page.waitForTimeout(600);
	const apres = await restant(page);

	expect(apres).toBeLessThan(avant);
	expect(avant - apres).toBeGreaterThan(300);
});

test("à l'expiration, l'option par défaut est jouée et comptée comme non décidée", async ({
	page
}) => {
	test.setTimeout(90_000);
	await page.goto('/');
	await page.getByRole('button', { name: "COUP D'ENVOI" }).click();

	// On ne touche à rien : lecture puis chrono doivent décider à notre place.
	await expect(
		page.getByText("Décision non prise. L'option par défaut a été appliquée.")
	).toBeVisible({ timeout: 45_000 });

	// Et la feuille de match doit compter cette décision comme non prise.
	await page.getByRole('button', { name: /Suivant|Feuille de match/ }).click();
	await jouerJusquALaFeuille(page);
	await expect(page.getByText(/Décisions non prises : [1-9]/)).toBeVisible();
});

test('passer en arrière-plan 30 s ne consomme pas de temps', async ({ page }) => {
	test.setTimeout(120_000);
	await page.goto('/');
	await page.getByRole('button', { name: "COUP D'ENVOI" }).click();

	// On attend le décompte réel : c'est lui qu'il s'agit de mettre en pause.
	await attendreDecision(page);
	const avant = await restant(page);

	await page.evaluate(CACHER);
	await page.waitForTimeout(30_000);
	await page.evaluate(MONTRER);

	// Une image de rAF suffit à rafraîchir la valeur affichée.
	await page.waitForTimeout(120);
	const apres = await restant(page);

	// Le temps restant est inchangé à ±100 ms près, la marge du ticket, à quoi
	// s'ajoutent les 120 ms d'attente volontaire ci-dessus.
	expect(Math.abs(avant - apres)).toBeLessThanOrEqual(250);

	// Et surtout : le chrono n'a pas expiré pendant l'absence.
	await expect(
		page.getByText("Décision non prise. L'option par défaut a été appliquée.")
	).toHaveCount(0);
});

test('le réglage sans chrono retire l’anneau et marque la partie hors classement', async ({
	page
}) => {
	await page.goto('/');
	await page.getByLabel(/Jouer sans chrono/).check();
	await page.getByRole('button', { name: "COUP D'ENVOI" }).click();

	await expect(page.locator(CHRONO)).toHaveCount(0);

	await jouerJusquALaFeuille(page);
	await expect(page.getByText('SANS CHRONO — hors classement.')).toBeVisible();
	await expect(page.getByText('Décisions non prises : 0')).toBeVisible();
});

test('le réglage sans chrono survit à un rechargement', async ({ page }) => {
	await page.goto('/');
	await page.getByLabel(/Jouer sans chrono/).check();

	await page.goto('/');
	await expect(page.getByLabel(/Jouer sans chrono/)).toBeChecked();
});
