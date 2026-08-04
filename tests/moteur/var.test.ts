import { describe, expect, it } from 'vitest';
import { CLUBS, CONTEXTES, INCIDENTS } from '../../src/lib/contenu';
import {
	appliquer,
	appliquerToutes,
	etatInitial,
	resoudreVar
} from '../../src/lib/moteur/appliquer';
import { composer } from '../../src/lib/moteur/composer';
import { MALUS, TABLE_DIVISIONS, VAR } from '../../src/lib/moteur/equilibrage';
import { noter } from '../../src/lib/moteur/noter';
import type { EtatPartie, Match, Palier } from '../../src/lib/moteur/types';

const CONTENU = { incidents: INCIDENTS, clubs: CLUBS, contextes: CONTEXTES };
const PALIERS: Palier[] = [0, 1, 2, 3, 4, 5, 6, 7, 8];

function matchDe(seed: string, division: Palier): Match {
	return composer(seed, division, CONTENU);
}

function indexPire(incident: Match['incidents'][number]['incident']): number {
	let pire = 0;
	incident.options.forEach((option, index) => {
		const actuel = incident.options[pire];
		if (actuel && option.justesse < actuel.justesse) pire = index;
	});
	return pire;
}

function indexMeilleur(incident: Match['incidents'][number]['incident']): number {
	let meilleur = 0;
	incident.options.forEach((option, index) => {
		const actuel = incident.options[meilleur];
		if (actuel && option.justesse > actuel.justesse) meilleur = index;
	});
	return meilleur;
}

function decisionsParfaites(match: Match): number[] {
	return match.incidents.map(({ incident }) => indexMeilleur(incident));
}

/**
 * Se tromper volontairement sur les incidents que la vidéo peut revoir, et
 * jouer juste ailleurs. C'est le test manuel du ticket, et c'est aussi la seule
 * façon d'atteindre ces incidents : tout jouer au pire fait tomber le contrôle
 * à zéro avant la mi-temps, et le match s'arrête avant la vidéo.
 */
function decisionsProvoquantVar(match: Match): number[] {
	return match.incidents.map(({ incident }) =>
		incident.var_eligible && incident.gravite >= VAR.graviteMin
			? indexPire(incident)
			: indexMeilleur(incident)
	);
}

/** Joue en provoquant la vidéo, en lui répondant à chaque fois. */
function jouerEnProvoquant(match: Match, resolution: 'maintien' | 'rectification'): EtatPartie {
	return appliquerToutes(
		match,
		decisionsProvoquantVar(match),
		Array.from({ length: 4 }, () => resolution)
	);
}

/** Trouve une seed dont le match déclenche au moins une VAR à la division donnée. */
function seedAvecVar(division: Palier): { match: Match; etat: EtatPartie } | null {
	for (let n = 0; n < 400; n++) {
		const match = matchDe(`var-${n}`, division);
		const decisions = decisionsProvoquantVar(match);
		let etat = etatInitial(match);
		for (const decision of decisions) {
			if (etat.termine) break;
			etat = appliquer(etat, decision);
			if (etat.varEnAttente !== null) return { match, etat };
		}
	}
	return null;
}

describe('déclenchement', () => {
	it('ne se déclenche jamais en dessous de la division 5', () => {
		for (const palier of [0, 1, 2, 3, 4] as Palier[]) {
			for (let n = 0; n < 200; n++) {
				const match = matchDe(`bas-${n}`, palier);
				const etat = jouerEnProvoquant(match, 'rectification');
				expect(etat.var.quotaUtilise, `palier ${palier}, seed bas-${n}`).toBe(0);
			}
		}
	});

	it('se déclenche au moins parfois à partir de la division 5', () => {
		for (const palier of [5, 6, 7, 8] as Palier[]) {
			expect(seedAvecVar(palier), `aucune VAR trouvée au palier ${palier}`).not.toBeNull();
		}
	});

	it('ne se déclenche jamais quand la décision est juste', () => {
		for (const palier of [5, 6, 7, 8] as Palier[]) {
			for (let n = 0; n < 200; n++) {
				const match = matchDe(`juste-${n}`, palier);
				const etat = appliquerToutes(match, decisionsParfaites(match));
				expect(etat.var.quotaUtilise, `palier ${palier}, seed juste-${n}`).toBe(0);
			}
		}
	});

	it('respecte le quota de la division : 1 en Ligue 2, 2 au-delà', () => {
		for (const palier of [5, 6, 7, 8] as Palier[]) {
			const quota = TABLE_DIVISIONS[palier]?.quotaVar ?? 0;
			for (let n = 0; n < 200; n++) {
				const etat = jouerEnProvoquant(matchDe(`quota-${n}`, palier), 'rectification');
				expect(etat.var.quotaUtilise, `palier ${palier}, seed quota-${n}`).toBeLessThanOrEqual(
					quota
				);
			}
		}
		expect(TABLE_DIVISIONS[5]?.quotaVar).toBe(1);
		expect(TABLE_DIVISIONS[6]?.quotaVar).toBe(2);
	});

	it('ne se déclenche que sur un incident var_eligible de gravité 3 ou plus', () => {
		for (const palier of [5, 6, 7, 8] as Palier[]) {
			for (let n = 0; n < 120; n++) {
				const match = matchDe(`eligible-${n}`, palier);
				const decisions = decisionsProvoquantVar(match);
				let etat = etatInitial(match);
				for (const decision of decisions) {
					if (etat.termine) break;
					const attendu = match.incidents[etat.index];
					etat = appliquer(etat, decision);
					if (etat.varEnAttente !== null) {
						expect(attendu?.incident.var_eligible).toBe(true);
						expect(attendu?.incident.gravite).toBeGreaterThanOrEqual(VAR.graviteMin);
						etat = resoudreVar(etat, 'rectification');
					}
				}
			}
		}
	});

	it('est déterministe : même seed, mêmes décisions, mêmes VAR', () => {
		for (let n = 0; n < 50; n++) {
			const match = matchDe(`determinisme-${n}`, 6);
			const a = jouerEnProvoquant(match, 'rectification');
			const b = jouerEnProvoquant(match, 'rectification');
			expect(JSON.stringify(a.var)).toBe(JSON.stringify(b.var));
			expect(a.decisions.map((d) => d.var)).toEqual(b.decisions.map((d) => d.var));
		}
	});

	it('ne se déclenche pas sur un match déjà arrêté', () => {
		// Ici on joue tout au pire : c'est ce qui fait tomber le contrôle à zéro.
		let arretes = 0;
		for (let n = 0; n < 200; n++) {
			const match = matchDe(`arret-${n}`, 6);
			const etat = appliquerToutes(
				match,
				match.incidents.map(({ incident }) => indexPire(incident)),
				['rectification', 'rectification']
			);
			if (etat.matchArrete) {
				arretes++;
				expect(etat.varEnAttente, `seed arret-${n}`).toBeNull();
			}
		}
		expect(arretes, 'aucun match arrêté : le test ne vérifiait rien').toBeGreaterThan(0);
	});
});

describe('résolution', () => {
	const trouve = seedAvecVar(6);
	if (trouve === null) throw new Error('aucune VAR déclenchée à la division 6');
	const { etat: enAttente } = trouve;

	it('bloque la partie tant que la vidéo attend', () => {
		expect(enAttente.varEnAttente).not.toBeNull();
		expect(enAttente.termine).toBe(false);
		// Toute décision est refusée : l'état revient inchangé.
		expect(appliquer(enAttente, 0)).toBe(enAttente);
	});

	it('rectifier porte la justesse à 0,9 et coûte 3 de contrôle', () => {
		const apres = resoudreVar(enAttente, 'rectification');
		const rang = enAttente.varEnAttente ?? 0;

		expect(apres.decisions[rang]?.justesse).toBe(0.9);
		expect(apres.decisions[rang]?.var).toBe('rectification');
		expect(apres.controle).toBe(enAttente.controle + VAR.rectification.dControle);
		expect(apres.var.rectifications).toBe(1);
		expect(apres.varEnAttente).toBeNull();
	});

	it('maintenir laisse la justesse et coûte 12 de contrôle', () => {
		const apres = resoudreVar(enAttente, 'maintien');
		const rang = enAttente.varEnAttente ?? 0;

		expect(apres.decisions[rang]?.justesse).toBe(enAttente.decisions[rang]?.justesse);
		expect(apres.decisions[rang]?.var).toBe('maintien');
		expect(apres.controle).toBe(enAttente.controle + VAR.maintien.dControle);
		expect(apres.var.maintiens).toBe(1);
	});

	it('ne mute pas l’état qu’on lui passe', () => {
		const avant = JSON.stringify(enAttente);
		resoudreVar(enAttente, 'rectification');
		expect(JSON.stringify(enAttente)).toBe(avant);
	});

	it('ignore une résolution quand aucune vidéo n’attend', () => {
		const etat = etatInitial(matchDe('sans-var', 6));
		expect(resoudreVar(etat, 'rectification')).toBe(etat);
	});

	it('arrête le match si le maintien fait tomber le contrôle à zéro', () => {
		const bas: EtatPartie = { ...enAttente, controle: 5 };
		const apres = resoudreVar(bas, 'maintien');
		expect(apres.controle).toBe(0);
		expect(apres.matchArrete).toBe(true);
		expect(apres.termine).toBe(true);
	});
});

describe('malus de note', () => {
	const trouve = seedAvecVar(6);
	if (trouve === null) throw new Error('aucune VAR déclenchée à la division 6');

	it('compte 2 points par rectification et 8 par maintien', () => {
		const rectifie = noter(resoudreVar(trouve.etat, 'rectification'));
		const maintenu = noter(resoudreVar(trouve.etat, 'maintien'));

		expect(rectifie.rectificationsVar).toBe(1);
		expect(maintenu.maintiensVarErrones).toBe(1);
		expect(MALUS.parRectificationVar).toBe(2);
		expect(MALUS.parMaintienVarErrone).toBe(8);
	});

	it('punit plus lourdement le maintien que la rectification', () => {
		// À contrôle égal, pour isoler le malus de note du malus de contrôle.
		const rectifie = resoudreVar(trouve.etat, 'rectification');
		const maintenu = resoudreVar(trouve.etat, 'maintien');
		const memeControle = { ...maintenu, controle: rectifie.controle };

		expect(noter(memeControle).note).toBeLessThan(noter(rectifie).note);
	});
});

describe('rejeu serveur', () => {
	it('consomme les réponses VAR dans l’ordre', () => {
		const match = matchDe('rejeu', 6);
		const decisions = decisionsProvoquantVar(match);

		const rectifiant = appliquerToutes(match, decisions, ['rectification', 'rectification']);
		const maintenant = appliquerToutes(match, decisions, ['maintien', 'maintien']);

		expect(rectifiant.var.rectifications).toBe(rectifiant.var.quotaUtilise);
		expect(maintenant.var.maintiens).toBe(maintenant.var.quotaUtilise);
	});

	it('maintient par défaut quand la liste des réponses est épuisée', () => {
		const match = matchDe('rejeu-court', 6);
		const etat = appliquerToutes(match, decisionsProvoquantVar(match), []);
		expect(etat.var.rectifications).toBe(0);
		expect(etat.var.maintiens).toBe(etat.var.quotaUtilise);
	});

	it('ne laisse jamais une partie inachevée sur une VAR en attente', () => {
		for (const palier of PALIERS) {
			for (let n = 0; n < 100; n++) {
				const match = matchDe(`fin-${n}`, palier);
				const etat = appliquerToutes(match, decisionsProvoquantVar(match));
				expect(etat.varEnAttente, `palier ${palier}, seed fin-${n}`).toBeNull();
			}
		}
	});
});
