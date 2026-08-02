// Schémas Zod du contenu. Importé UNIQUEMENT par les scripts et les tests :
// un import depuis un composant ferait partir ~12 Ko gzip dans le bundle client.
// Les invariants inter-champs vivent dans scripts/valider-contenu.ts.

import { z } from 'zod';

export const JustesseSchema = z.union([z.literal(0), z.literal(0.4), z.literal(0.7), z.literal(1)]);

export const SeveriteSchema = z.union([
	z.literal(0),
	z.literal(1),
	z.literal(2),
	z.literal(3),
	z.literal(4)
]);

export const GraviteSchema = z.union([
	z.literal(1),
	z.literal(2),
	z.literal(3),
	z.literal(4),
	z.literal(5)
]);

export const PaliersSchema = z.array(z.number().int().min(0).max(8)).min(1);

export const FenetreIdSchema = z.enum(['3-15', '16-30', '31-45', '46-65', '66-80', '81-90']);

export const OptionSchema = z.strictObject({
	libelle: z.string().min(1),
	severite: SeveriteSchema,
	justesse: JustesseSchema,
	dControle: z.number().int().min(-25).max(10),
	consequence: z.string().min(1),
	defaut: z.literal(true).optional(),
	butProbable: z.number().min(0).max(1).optional(),
	expulsion: z.literal(true).optional()
});

export const BlocVarSchema = z.strictObject({
	revelation: z.string().min(1),
	maintien: z.strictObject({ consequence: z.string().min(1) }),
	rectification: z.strictObject({
		libelleCorrige: z.string().min(1),
		consequence: z.string().min(1)
	})
});

export const IncidentSchema = z.strictObject({
	id: z.string().regex(/^[a-z0-9_]+$/),
	famille: z.enum([
		'tacle',
		'main',
		'simulation',
		'contestation',
		'antijeu',
		'duel_aerien',
		'hors_jeu',
		'provocation',
		'banc'
	]),
	gravite: GraviteSchema,
	paliers: PaliersSchema,
	fenetre: FenetreIdSchema,
	ambigu: z.boolean(),
	tendu: z.boolean(),
	var_eligible: z.boolean(),
	texte: z.string().min(1),
	options: z.array(OptionSchema).min(3).max(4),
	var: BlocVarSchema.optional()
});

export const ClubSchema = z.strictObject({
	id: z.string().regex(/^[a-z0-9_]+$/),
	nom: z.string().min(1),
	abrege: z.string().regex(/^[A-Z]{3}$/),
	ville: z.string().min(1),
	pays: z.enum(['federation', 'riviera', 'alcazar', 'ashmoor', 'nordhalle']),
	paliers: PaliersSchema,
	temperament: z.union([z.literal(0), z.literal(1), z.literal(2)]),
	surnom: z.string().min(1),
	couleurs: z.tuple([z.string().regex(/^#[0-9A-F]{6}$/i), z.string().regex(/^#[0-9A-F]{6}$/i)])
});

export const ContexteSchema = z.strictObject({
	id: z.string().regex(/^[a-z0-9_]+$/),
	texte: z.string().min(1),
	paliers: PaliersSchema,
	effet: z
		.strictObject({
			temperament: z.union([z.literal(-1), z.literal(1)]).optional(),
			controleDepart: z.number().int().optional()
		})
		.optional()
});
