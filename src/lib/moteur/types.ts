// Types du moteur et du contenu.
// Traduction de docs/02-game-design.md et docs/04-donnees.md §1.

export type Justesse = 0 | 0.4 | 0.7 | 1;
export type Severite = 0 | 1 | 2 | 3 | 4;
export type Gravite = 1 | 2 | 3 | 4 | 5;
export type Temperament = 0 | 1 | 2;
export type Palier = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;

export type Famille =
	| 'tacle'
	| 'main'
	| 'simulation'
	| 'contestation'
	| 'antijeu'
	| 'duel_aerien'
	| 'hors_jeu'
	| 'provocation'
	| 'banc';

export type FenetreId = '3-15' | '16-30' | '31-45' | '46-65' | '66-80' | '81-90';

export interface Option {
	libelle: string; // ≤ 34 caractères, tient sur une ligne en 390 px
	severite: Severite;
	justesse: Justesse;
	dControle: number; // entier, [-25, 10]
	consequence: string; // 1 à 2 phrases
	defaut?: true; // exactement une par incident
	penalty?: true; // marque l'octroi d'un penalty, transformé selon PENALTY_PROBA
	butProbable?: number; // [0, 1], remplace PENALTY_PROBA sur cette option seulement
	expulsion?: true; // marque l'infériorité numérique pour la suite du match
}

export interface BlocVar {
	revelation: string;
	maintien: { consequence: string };
	rectification: { libelleCorrige: string; consequence: string };
}

export interface Incident {
	id: string; // snake_case, unique global, stable à vie
	famille: Famille;
	gravite: Gravite;
	paliers: Palier[]; // sous-ensemble de 0..8, trié
	fenetre: FenetreId;
	ambigu: boolean;
	tendu: boolean; // éligible au pool utilisé quand contrôle < 25
	var_eligible: boolean;
	texte: string; // 45 à 90 mots
	options: Option[]; // 3 ou 4, triées par severite croissante
	var?: BlocVar;
	// Chrono propre à l'incident, en secondes. Écrase celui de la division.
	// Existe pour tacle_intro, que 02-game-design.md §9 fixe à 10 s : c'est le
	// tutoriel invisible et il doit laisser le temps de lire. Contenu, pas équilibrage.
	chronoS?: number;
}

export type Pays = 'federation' | 'riviera' | 'alcazar' | 'ashmoor' | 'nordhalle';

export interface Club {
	id: string;
	nom: string;
	abrege: string; // 3 lettres majuscules
	ville: string;
	pays: Pays;
	paliers: Palier[];
	temperament: Temperament; // 0 calme, 1 chaud, 2 volcanique
	surnom: string;
	couleurs: [string, string]; // hex
}

export interface Contexte {
	id: string;
	texte: string; // 2 lignes max
	paliers: Palier[];
	effet?: { temperament?: -1 | 1; controleDepart?: number };
}

export interface Badge {
	id: string;
	nom: string;
	description: string;
	secret?: true; // non affiché tant que non obtenu
}

export type ProfilPresse =
	'sanguin' | 'permissif' | 'illisible' | 'hesitant' | 'neutre' | 'special';

export interface LignePresse {
	profil: ProfilPresse;
	noteMin: number;
	noteMax: number;
	cle?: 'match_arrete' | 'parfait' | 'premiere' | 'match_du_jour';
	texte: string;
}

// ── Équilibrage (formes des constantes de equilibrage.ts) ──

export interface Division {
	palier: Palier;
	nom: string;
	chronoS: number; // durée du chrono d'un incident, en secondes
	partAmbigus: number; // proportion visée d'incidents ambigus, [0, 1]
	graviteMoyenne: number;
	controleDepart: number;
	quotaVar: 0 | 1 | 2;
}

export interface Fenetre {
	id: FenetreId;
	debut: number; // minute incluse
	fin: number; // minute incluse, temps additionnel compris
	quota: number; // incidents tirés dans ce créneau
}

export interface Mention {
	noteMin: number;
	noteMax: number;
	texte: string;
}

// ── Match composé (produit de composer.ts, V0-5) ──

export interface IncidentProgramme {
	minute: number;
	incident: Incident;
}

// ── Partie en cours (appliquer.ts) ──

export interface DecisionPrise {
	incidentId: string;
	minute: number;
	famille: Famille;
	gravite: Gravite;
	optionIndex: number;
	severite: Severite;
	justesse: Justesse;
	dControle: number;
	/** Vraie quand le chrono a expiré et que l'option par défaut a été jouée. */
	nonDecidee: boolean;
}

export interface EtatPartie {
	match: Match;
	/** Index du prochain incident à jouer, de 0 à 12. */
	index: number;
	controle: number;
	decisions: DecisionPrise[];
	buts: { domicile: number; exterieur: number };
	/** Joueurs expulsés, toutes équipes confondues (02 §6 étape 5). */
	expulsions: number;
	nonDecidees: number;
	/** Contrôle tombé à 0 : le match s'arrête à la minute courante. */
	matchArrete: boolean;
	termine: boolean;
}

// ── Résultat (noter.ts) ──

export interface Resultat {
	note: number;
	justesse: number;
	controle: number;
	constance: number;
	incoherences: number;
	mention: string;
	profilPresse: ProfilPresse;
	cartonsJaunes: number;
	cartonsRouges: number;
	nonDecidees: number;
	matchArrete: boolean;
	buts: { domicile: number; exterieur: number };
}

export interface Match {
	seed: string;
	division: Palier;
	domicile: Club;
	exterieur: Club;
	contexte: Contexte;
	// Tempérament du club à domicile après effet du contexte, borné à [0, 2].
	temperamentDomicile: Temperament;
	// Contrôle de départ de la division après effet du contexte.
	controleDepart: number;
	incidents: IncidentProgramme[]; // 12, minutes strictement croissantes
}
