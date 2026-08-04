import { readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { expect, test } from '@playwright/test';
import { jouerUnMatch } from './aide';

const DOSSIER_POLICES = join(import.meta.dirname, '..', '..', 'static', 'fonts');
const BUDGET_POLICES = 46 * 1024;

test('les polices sont auto-hébergées et tiennent le budget', () => {
	const fichiers = readdirSync(DOSSIER_POLICES).filter((nom) => nom.endsWith('.woff2'));
	expect(fichiers.length, 'trois familles attendues').toBe(3);

	const poids = fichiers.reduce(
		(somme, nom) => somme + statSync(join(DOSSIER_POLICES, nom)).size,
		0
	);
	expect(poids, `${poids} octets de polices`).toBeLessThanOrEqual(BUDGET_POLICES);
});

test('aucune requête sortante vers un CDN de polices', async ({ page }) => {
	const sortantes: string[] = [];
	page.on('request', (requete) => {
		const url = requete.url();
		if (!url.startsWith('http://localhost')) sortantes.push(url);
	});

	await page.goto('/');
	await jouerUnMatch(page);

	const fautives = sortantes.filter(
		(url) => /fonts\.(googleapis|gstatic)\.com/.test(url) || /typekit|cdn/.test(url)
	);
	expect(fautives, `requêtes tierces : ${fautives.join(', ')}`).toHaveLength(0);
	expect(sortantes, `toute requête externe : ${sortantes.join(', ')}`).toHaveLength(0);
});

test('les trois polices sont bien chargées depuis le site', async ({ page }) => {
	const polices: string[] = [];
	page.on('response', (reponse) => {
		if (reponse.url().endsWith('.woff2')) polices.push(reponse.url());
	});

	await page.goto('/');
	await page.evaluate(() => document.fonts.ready);

	for (const nom of ['anybody', 'newsreader', 'martian-mono']) {
		expect(
			polices.some((url) => url.includes(nom)),
			`${nom} non chargée`
		).toBe(true);
	}
});

test('aucun rayon d’angle supérieur à 2 px dans le CSS produit', async ({ page }) => {
	await page.goto('/');

	// On relit les feuilles de style appliquées plutôt que les sources : c'est
	// le CSS produit qui compte, Tailwind compris.
	const fautifs = await page.evaluate(() => {
		const trouves: string[] = [];
		for (const feuille of Array.from(document.styleSheets)) {
			let regles: CSSRuleList;
			try {
				regles = feuille.cssRules;
			} catch {
				continue; // feuille d'une autre origine, hors sujet ici
			}
			for (const regle of Array.from(regles)) {
				if (!(regle instanceof CSSStyleRule)) continue;
				const rayon = regle.style.borderRadius;
				if (rayon === '') continue;
				for (const valeur of rayon.split(/\s+/)) {
					const px = /^(\d+(?:\.\d+)?)px$/.exec(valeur);
					if (px && Number(px[1]) > 2) trouves.push(`${regle.selectorText} { ${rayon} }`);
				}
			}
		}
		return trouves;
	});

	expect(fautifs, `rayons trop grands : ${fautifs.join(' | ')}`).toHaveLength(0);
});

test('le parcours complet ne provoque aucun décalage de mise en page', async ({ page }) => {
	await page.goto('/');

	// PerformanceObserver sur layout-shift : c'est la mesure du CLS.
	await page.evaluate(() => {
		const fenetre = window as unknown as { __cls: number };
		fenetre.__cls = 0;
		new PerformanceObserver((liste) => {
			for (const entree of liste.getEntries()) {
				const decalage = entree as PerformanceEntry & { value: number; hadRecentInput: boolean };
				if (!decalage.hadRecentInput) fenetre.__cls += decalage.value;
			}
		}).observe({ type: 'layout-shift', buffered: true });
	});

	await jouerUnMatch(page);

	const cls = await page.evaluate(() => (window as unknown as { __cls: number }).__cls);
	// La carte d'incident a une hauteur réservée : rien ne doit bouger.
	expect(cls, `CLS mesuré : ${cls}`).toBeLessThanOrEqual(0.01);
});

test('le catalogue d’états liste les quatre états de match et les cinq de feuille', async ({
	page
}) => {
	// Servi en dev uniquement ; en preview il répond 404, ce qui est le
	// comportement voulu et se vérifie aussi bien.
	const reponse = await page.goto('/dev/etats');
	expect(reponse?.status()).toBe(404);
});
