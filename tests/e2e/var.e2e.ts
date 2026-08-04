import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { expect, test, type Page } from '@playwright/test';
import { composer } from '../../src/lib/moteur/composer';
import { VAR } from '../../src/lib/moteur/equilibrage';
import { seedDuJour } from '../../src/lib/moteur/seed';
import type { Club, Contexte, Incident, Match } from '../../src/lib/moteur/types';

// Le chargeur de Playwright ne gère pas les imports JSON sans attribut de type.
const RACINE = join(import.meta.dirname, '..', '..', 'src', 'lib', 'contenu');
const lire = (chemin: string): unknown => JSON.parse(readFileSync(chemin, 'utf8'));

const INCIDENTS = readdirSync(join(RACINE, 'incidents'))
	.filter((nom) => nom.endsWith('.json'))
	.sort()
	.flatMap((nom) => lire(join(RACINE, 'incidents', nom)) as Incident[]);
const CLUBS = lire(join(RACINE, 'clubs.json')) as Club[];
const CONTEXTES = lire(join(RACINE, 'contextes.json')) as Contexte[];

/**
 * Le match du jour se joue en Ligue 1, où la VAR existe, et sa seed est
 * déterministe : on sait donc à l'avance sur quels incidents se tromper pour
 * la déclencher, et on peut piloter la page en conséquence.
 */
function matchDuJour(): Match {
	return composer(seedDuJour(new Date()), 6, {
		incidents: INCIDENTS,
		clubs: CLUBS,
		contextes: CONTEXTES
	});
}

/**
 * Sur un incident que la vidéo peut revoir, la pire option ; ailleurs, la
 * meilleure, pour que le contrôle tienne jusqu'au bout du match.
 */
function indexCible(incident: Incident): number {
	const provoquer = incident.var_eligible && incident.gravite >= VAR.graviteMin;
	let cible = 0;
	incident.options.forEach((option, index) => {
		const actuelle = incident.options[cible];
		if (!actuelle) return;
		if (provoquer ? option.justesse < actuelle.justesse : option.justesse > actuelle.justesse) {
			cible = index;
		}
	});
	return cible;
}

/** Joue le match du jour en provoquant la vidéo, et compte les passages. */
async function jouerEnProvoquantLaVar(
	page: Page,
	reponse: 'Je maintiens' | 'Je rectifie'
): Promise<number> {
	const match = matchDuJour();
	let passages = 0;

	await page.goto('/');
	await page.getByRole('button', { name: 'le match du jour' }).click();

	for (const { incident } of match.incidents) {
		if (/\/feuille$/.test(page.url())) break;

		await page.locator('ul li button').nth(indexCible(incident)).click();

		const suivant = page.getByRole('button', { name: /Suivant|Feuille de match/ });
		await expect(suivant).toBeVisible();
		await suivant.click();

		// L'écran de vidéo s'intercale ici quand elle se déclenche.
		const bouton = page.getByRole('button', { name: reponse });
		if ((await bouton.count()) > 0) {
			passages++;
			await expect(page.getByText('ASSISTANCE VIDÉO')).toBeVisible();
			await bouton.click();
			await page.getByRole('button', { name: /Suivant|Feuille de match/ }).click();
		}
	}

	return passages;
}

test('se tromper sur un incident revu par la vidéo ouvre l’écran d’assistance', async ({
	page
}) => {
	test.setTimeout(90_000);
	const passages = await jouerEnProvoquantLaVar(page, 'Je rectifie');

	expect(passages, "la vidéo ne s'est jamais déclenchée").toBeGreaterThan(0);
	// Le quota de la Ligue 1 est de 2 : la vidéo ne revient jamais plus souvent.
	expect(passages).toBeLessThanOrEqual(2);
});

test('la feuille de match compte les rectifications', async ({ page }) => {
	test.setTimeout(90_000);
	const passages = await jouerEnProvoquantLaVar(page, 'Je rectifie');
	expect(passages).toBeGreaterThan(0);

	await expect(page).toHaveURL(/\/feuille$/);
	await expect(
		page.getByText(`Assistance vidéo : ${passages} rectification(s), 0 maintien(s)`)
	).toBeVisible();
});

test('la feuille de match compte les maintiens', async ({ page }) => {
	test.setTimeout(90_000);
	const passages = await jouerEnProvoquantLaVar(page, 'Je maintiens');
	expect(passages).toBeGreaterThan(0);

	await expect(page).toHaveURL(/\/feuille$/);
	await expect(
		page.getByText(`Assistance vidéo : 0 rectification(s), ${passages} maintien(s)`)
	).toBeVisible();
});
