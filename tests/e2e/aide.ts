import { expect, type Page } from '@playwright/test';

/**
 * Joue un match entier depuis l'accueil, jusqu'à la feuille de match.
 *
 * Deux pièges que cette fonction traite explicitement :
 * — le match peut s'arrêter avant la 12e décision si le contrôle tombe à zéro,
 *   donc on ne suppose jamais le nombre d'incidents restants ;
 * — le dernier clic déclenche une navigation, et l'élément se détache pendant
 *   l'action. On l'attend donc comme une navigation, pas comme un clic ordinaire.
 */
export async function jouerUnMatch(page: Page): Promise<void> {
	await page.getByRole('button', { name: "COUP D'ENVOI" }).click();
	await expect(page).toHaveURL(/\/match$/);
	await jouerJusquALaFeuille(page);
}

export async function jouerJusquALaFeuille(page: Page): Promise<void> {
	// 12 incidents × 2 écrans, plus une marge.
	for (let n = 0; n < 30; n++) {
		const option = page.locator('ul li button').first();
		if ((await option.count()) > 0) {
			await option.click();
			continue;
		}

		const suivant = page.getByRole('button', { name: /Suivant|Feuille de match/ }).first();
		if ((await suivant.count()) === 0) break;

		if (((await suivant.textContent()) ?? '').includes('Feuille de match')) {
			await Promise.all([page.waitForURL(/\/feuille$/), suivant.click()]);
			break;
		}
		await suivant.click();
	}
	await expect(page).toHaveURL(/\/feuille$/);
}
