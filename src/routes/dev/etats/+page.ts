import { dev } from '$app/environment';
import { error } from '@sveltejs/kit';

// Le catalogue d'états n'existe qu'en développement : il n'a rien à faire dans
// le bundle de production, ni dans le budget de poids.
export const prerender = false;

export function load(): void {
	if (!dev) error(404, 'Page de développement');
}
