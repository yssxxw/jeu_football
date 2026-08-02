// Générateur déterministe du moteur : sfc32 initialisé par cyrb128.
// Algorithme et justification dans docs/05-architecture.md §3.

export type Rand = () => number;

export function cyrb128(s: string): [number, number, number, number] {
	let h1 = 1779033703,
		h2 = 3144134277,
		h3 = 1013904242,
		h4 = 2773480762;
	for (let i = 0; i < s.length; i++) {
		const k = s.charCodeAt(i);
		h1 = h2 ^ Math.imul(h1 ^ k, 597399067);
		h2 = h3 ^ Math.imul(h2 ^ k, 2869860233);
		h3 = h4 ^ Math.imul(h3 ^ k, 951274213);
		h4 = h1 ^ Math.imul(h4 ^ k, 2716044179);
	}
	h1 = Math.imul(h3 ^ (h1 >>> 18), 597399067);
	h2 = Math.imul(h4 ^ (h2 >>> 22), 2869860233);
	h3 = Math.imul(h1 ^ (h3 >>> 17), 951274213);
	h4 = Math.imul(h2 ^ (h4 >>> 19), 2716044179);
	return [(h1 ^ h2 ^ h3 ^ h4) >>> 0, (h2 ^ h1) >>> 0, (h3 ^ h1) >>> 0, (h4 ^ h1) >>> 0];
}

export function sfc32(a: number, b: number, c: number, d: number): Rand {
	return function rand(): number {
		a >>>= 0;
		b >>>= 0;
		c >>>= 0;
		d >>>= 0;
		let t = (a + b) | 0;
		a = b ^ (b >>> 9);
		b = (c + (c << 3)) | 0;
		c = (c << 21) | (c >>> 11);
		d = (d + 1) | 0;
		t = (t + d) | 0;
		c = (c + t) | 0;
		return (t >>> 0) / 4294967296;
	};
}

export function alea(seed: string): Rand {
	return sfc32(...cyrb128(seed));
}

/** Entier dans [min, max], bornes incluses. */
export function tirerEntier(rand: Rand, min: number, max: number): number {
	return min + Math.floor(rand() * (max - min + 1));
}

/** Un élément du tableau. Le tableau ne doit pas être vide ni contenir undefined. */
export function tirerDans<T>(rand: Rand, tableau: readonly T[]): T {
	if (tableau.length === 0) throw new Error('tirerDans: tableau vide');
	const element = tableau[tirerEntier(rand, 0, tableau.length - 1)];
	if (element === undefined) throw new Error('tirerDans: élément indéfini');
	return element;
}

/** Copie mélangée du tableau (Fisher-Yates). Ne mute pas l'entrée. */
export function melanger<T>(rand: Rand, tableau: readonly T[]): T[] {
	const copie = [...tableau];
	for (let i = copie.length - 1; i > 0; i--) {
		const j = tirerEntier(rand, 0, i);
		const elementI = copie[i];
		const elementJ = copie[j];
		if (elementI === undefined || elementJ === undefined)
			throw new Error('melanger: élément indéfini');
		copie[i] = elementJ;
		copie[j] = elementI;
	}
	return copie;
}
