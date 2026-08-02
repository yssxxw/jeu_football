// Point d'entrée du contenu. Les JSON sont importés statiquement, jamais fetchés.
// Frontière d'entrée : la forme est garantie au build par `npm run valider-contenu`
// (schéma Zod dans schema.ts, qui ne doit jamais être importé d'ici).

import type { Club, Contexte, Incident } from '../moteur/types';
import antijeu from './incidents/antijeu.json';
import contestation from './incidents/contestation.json';
import provocation from './incidents/provocation.json';
import tacle from './incidents/tacle.json';
import clubsBruts from './clubs.json';
import contextesBruts from './contextes.json';

export { CONTENU_VERSION } from './version';

export const INCIDENTS: readonly Incident[] = [
	...tacle,
	...contestation,
	...antijeu,
	...provocation
] as unknown as Incident[];

export const CLUBS: readonly Club[] = clubsBruts as unknown as Club[];
export const CONTEXTES: readonly Contexte[] = contextesBruts as unknown as Contexte[];

export function incidentParId(id: string): Incident | undefined {
	return INCIDENTS.find((incident) => incident.id === id);
}
