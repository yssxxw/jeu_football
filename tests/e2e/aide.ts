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
		if (/\/feuille$/.test(page.url())) break;

		const option = page.locator('ul li button').first();
		const suivant = page.getByRole('button', { name: /Suivant|Feuille de match/ }).first();

		// Entre deux phases, Svelte remplace tout le bloc : il existe un instant
		// où ni les options ni le bouton ne sont dans le DOM. On attend donc
		// qu'un des deux arrive plutôt que de conclure qu'il n'y a plus rien.
		await expect(option.or(suivant).first()).toBeVisible();

		if (await option.isVisible()) {
			await option.click();
			continue;
		}

		if (((await suivant.textContent()) ?? '').includes('Feuille de match')) {
			// Ce clic déclenche une navigation : l'élément se détache pendant l'action.
			await Promise.all([page.waitForURL(/\/feuille$/), suivant.click()]);
			break;
		}
		await suivant.click();
	}
	await expect(page).toHaveURL(/\/feuille$/);
}
