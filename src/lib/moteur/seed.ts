// Fabrique des seeds. Formats définis dans docs/05-architecture.md §3.

/** Seed du match du jour, calculée en local à partir de la date UTC. */
export function seedDuJour(date: Date): string {
	return `SIFFLET-${date.toISOString().slice(0, 10)}`;
}

/** Seed d'un match libre : L-{division}-{compteurLocal}-{4 hex}. */
export function seedLibre(division: number, compteur: number): string {
	const octets = new Uint8Array(2);
	globalThis.crypto.getRandomValues(octets);
	const hex = Array.from(octets, (o) => o.toString(16).padStart(2, '0')).join('');
	return `L-${division}-${compteur}-${hex}`;
}
