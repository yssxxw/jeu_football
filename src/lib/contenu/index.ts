// Point d'entrée du contenu. Les JSON sont importés statiquement, jamais fetchés.
// Frontière d'entrée : la forme est garantie au build par `npm run valider-contenu`
// (schéma Zod dans schema.ts, qui ne doit jamais être importé d'ici).

import type { Club, Contexte, Incident } from '../moteur/types';
import antijeu from './incidents/antijeu.json';
import banc from './incidents/banc.json';
import contestation from './incidents/contestation.json';
import duelAerien from './incidents/duel_aerien.json';
import horsJeu from './incidents/hors_jeu.json';
import main from './incidents/main.json';
import provocation from './incidents/provocation.json';
import simulation from './incidents/simulation.json';
import tacle from './incidents/tacle.json';
import clubsBruts from './clubs.json';
import contextesBruts from './contextes.json';

export { CONTENU_VERSION } from './version';

export const INCIDENTS: readonly Incident[] = [
	...tacle,
	...main,
	...simulation,
	...contestation,
	...antijeu,
	...duelAerien,
	...horsJeu,
	...provocation,
	...banc
] as unknown as Incident[];

export const CLUBS: readonly Club[] = clubsBruts as unknown as Club[];
export const CONTEXTES: readonly Contexte[] = contextesBruts as unknown as Contexte[];

export function incidentParId(id: string): Incident | undefined {
	return INCIDENTS.find((incident) => incident.id === id);
}
