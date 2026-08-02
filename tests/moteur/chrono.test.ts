import { describe, expect, it } from 'vitest';
import { INCIDENTS } from '../../src/lib/contenu';
import { dureeLectureMs } from '../../src/lib/moteur/chrono';
import { LECTURE, TABLE_DIVISIONS } from '../../src/lib/moteur/equilibrage';
import type { Incident } from '../../src/lib/moteur/types';

function incidentDe(texte: string, libelles: string[]): Incident {
	return {
		id: 'test',
		famille: 'tacle',
		gravite: 3,
		paliers: [0],
		fenetre: '3-15',
		ambigu: false,
		tendu: false,
		var_eligible: false,
		texte,
		options: libelles.map((libelle, index) => ({
			libelle,
			severite: index as 0 | 1 | 2,
			justesse: index === 0 ? 1 : 0,
			dControle: 0,
			consequence: '.'
		}))
	};
}

describe('dureeLectureMs', () => {
	it('compte le texte au tarif plein et les libellés au tarif du parcours', () => {
		// 30 mots de texte, 6 mots de libellés : au-dessus du plancher.
		const incident = incidentDe('mot '.repeat(30).trim(), ['un deux', 'trois quatre', 'cinq six']);
		expect(dureeLectureMs(incident)).toBe(30 * LECTURE.msParMot + 6 * LECTURE.msParMotLibelle);
	});

	it('lit un libellé plus vite qu’un texte suivi', () => {
		expect(LECTURE.msParMotLibelle).toBeLessThan(LECTURE.msParMot);
	});

	it('applique un plancher aux incidents très courts', () => {
		const incident = incidentDe('court', ['a', 'b', 'c']);
		expect(dureeLectureMs(incident)).toBe(LECTURE.minimumMs);
	});

	it('applique un plafond aux incidents très longs', () => {
		const incident = incidentDe('mot '.repeat(500), ['a', 'b', 'c']);
		expect(dureeLectureMs(incident)).toBe(LECTURE.maximumMs);
	});

	it('laisse au moins le temps de lire chaque incident du contenu réel', () => {
		for (const incident of INCIDENTS) {
			const mots = incident.texte.trim().split(/\s+/).length;
			const duree = dureeLectureMs(incident);
			// Au moins 200 ms par mot du texte : en dessous, on ne lit pas, on devine.
			expect(duree / mots, incident.id).toBeGreaterThanOrEqual(200);
		}
	});

	it('donne au contenu réel des temps de lecture entre 3 et 14 secondes', () => {
		for (const incident of INCIDENTS) {
			const duree = dureeLectureMs(incident);
			expect(duree, incident.id).toBeGreaterThanOrEqual(LECTURE.minimumMs);
			expect(duree, incident.id).toBeLessThanOrEqual(LECTURE.maximumMs);
		}
	});
});

describe('temps total par incident', () => {
	it('laisse plus de temps que le seul chrono de la division', () => {
		// C'était le reproche : six secondes pour lire soixante mots et décider.
		for (const incident of INCIDENTS) {
			const chronoMs = (incident.chronoS ?? TABLE_DIVISIONS[6]?.chronoS ?? 6) * 1000;
			const total = dureeLectureMs(incident) + chronoMs;
			expect(total, incident.id).toBeGreaterThan(chronoMs);
			// Et le temps de lecture pèse au moins autant que la décision.
			expect(dureeLectureMs(incident), incident.id).toBeGreaterThanOrEqual(chronoMs);
		}
	});

	it('garde une partie sous les six minutes annoncées par 01-concept', () => {
		// 12 incidents au pire cas de lecture, plus le chrono, plus 1,4 s de
		// conséquence par incident.
		const pire = LECTURE.maximumMs + 8000 + 1400;
		expect((12 * pire) / 1000 / 60).toBeLessThan(6);
	});
});
