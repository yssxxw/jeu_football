# 04 — Données

## 1. Schéma des contenus (JSON)

Tous les fichiers de contenu vivent dans `src/lib/contenu/` et sont importés statiquement — pas de fetch. Validation par Zod **au build uniquement** (script `npm run valider-contenu`), pas au runtime : le poids du validateur ne part pas dans le bundle client.

### `incidents/*.json`

Un fichier par famille (`tacle.json`, `main.json`, …), chacun contenant un tableau.

```ts
type Justesse = 0 | 0.4 | 0.7 | 1;
type Severite = 0 | 1 | 2 | 3 | 4;

interface Option {
  libelle: string;          // ≤ 34 caractères, tient sur une ligne en 390 px
  severite: Severite;
  justesse: Justesse;
  dControle: number;        // entier, [-25, 10]
  consequence: string;      // 1 à 2 phrases
  defaut?: true;            // exactement une par incident
  butProbable?: number;     // [0,1], uniquement sur les options qui accordent un penalty
  expulsion?: true;         // marque l'infériorité numérique pour la suite du match
}

interface Incident {
  id: string;               // snake_case, unique global, stable à vie
  famille: 'tacle' | 'main' | 'simulation' | 'contestation' | 'antijeu'
         | 'duel_aerien' | 'hors_jeu' | 'provocation' | 'banc';
  gravite: 1 | 2 | 3 | 4 | 5;
  paliers: number[];        // sous-ensemble de 0..8, trié
  fenetre: '3-15' | '16-30' | '31-45' | '46-65' | '66-80' | '81-90';
  ambigu: boolean;
  tendu: boolean;           // éligible au pool utilisé quand contrôle < 25
  var_eligible: boolean;
  texte: string;            // 45 à 90 mots
  options: Option[];        // 3 ou 4, triées par severite croissante
  var?: {
    revelation: string;
    maintien: { consequence: string };
    rectification: { libelleCorrige: string; consequence: string };
  };
}
```

**Invariants vérifiés par `valider-contenu` (le build casse si l'un saute) :**

- `id` unique sur l'ensemble des fichiers
- exactement une option avec `defaut: true`
- au moins une option avec `justesse === 1`
- si `ambigu === true` : au moins deux options à `0.7`
- si `var_eligible === true` : le bloc `var` existe
- `options` triées par `severite` croissante, sans doublon de sévérité
- longueur de `texte` entre 45 et 90 mots
- aucune occurrence de `!` hors guillemets dans `texte`
- aucun caractère hors du plan latin étendu (attrape les emojis)
- pour chaque couple (palier, fenêtre) : ≥ 8 incidents éligibles

**Écarts constatés à l'implémentation (V0-4), à trancher.** Trois règles de cette section sont contredites par les cinq incidents étalons de `03-contenu.md`, qui font foi au caractère près. `valider-contenu` les signale sous l'étiquette « écart doc » sans faire échouer le build, en attendant l'arbitrage :

| Règle | Ce que fait l'étalon | Décision à prendre |
|---|---|---|
| `options` triées par sévérité **sans doublon** | `contact_surface_appui` (0,1,1,2), `capitaine_insiste` (0,1,2,2) et `celebration_kop_adverse` (0,1,2,2) portent deux options de même sévérité | le tri est appliqué **au sens large** ; deux options peuvent partager une sévérité, c'est ce qui permet d'opposer deux gestes de même niveau |
| `libelle` ≤ 34 caractères | cinq libellés étalons vont de 36 à 47 caractères | soit l'UI accepte deux lignes, soit les libellés sont raccourcis en V0-11 |
| `ambigu: true` ⇒ ≥ 2 options à `0,7` | `contact_surface_appui` est déclaré ambigu et n'a qu'une option à `0,7` | soit le drapeau passe à `false`, soit une `justesse` bouge — les deux touchent à des valeurs normatives |

Le dixième invariant (≥ 8 incidents par couple) n'est atteignable qu'avec le contenu complet : il est un avertissement jusqu'à V0-13, où `COUVERTURE_BLOQUANTE=1` le rend bloquant.

### `clubs.json`, `contextes.json`, `badges.json`, `presse.json`

```ts
interface Club {
  id: string; nom: string; abrege: string;   // 3 lettres majuscules
  ville: string; pays: 'federation' | 'riviera' | 'alcazar' | 'ashmoor' | 'nordhalle';
  paliers: number[]; temperament: 0 | 1 | 2;
  surnom: string; couleurs: [string, string]; // hex
}

interface Contexte {
  id: string; texte: string;                 // 2 lignes max
  paliers: number[];
  effet?: { temperament?: -1 | 1; controleDepart?: number };
}

interface Badge {
  id: string; nom: string; description: string;
  secret?: true;                             // non affiché tant que non obtenu
}

interface LignePresse {
  profil: 'sanguin' | 'permissif' | 'illisible' | 'hesitant' | 'neutre' | 'special';
  noteMin: number; noteMax: number;
  cle?: 'match_arrete' | 'parfait' | 'premiere' | 'match_du_jour';
  texte: string;
}
```

### Versionnage du contenu

`src/lib/contenu/version.ts` exporte `export const CONTENU_VERSION = 1;`

**Règle absolue :** modifier le texte d'un incident n'incrémente pas la version. Modifier une `justesse`, un `dControle`, une `gravite`, l'ordre des options, ou ajouter/supprimer un incident **incrémente la version**. Sinon la revalidation serveur d'un score (qui rejoue le moteur) donne un résultat différent du client, et on rejette des parties honnêtes.

Le serveur garde les anciennes versions de contenu dans `contenu/archives/v{n}/` pour pouvoir revalider un score soumis juste avant un déploiement. On garde les **trois dernières** versions, pas plus.

---

## 2. Sauvegarde locale

Une seule clé : `sifflet.sauvegarde`. `localStorage`, pas `IndexedDB` — la donnée fait moins de 4 Ko et l'API synchrone évite un état de chargement au démarrage.

```ts
interface Sauvegarde {
  schema: 1;
  arbitreLocal: {
    pseudo: string | null;      // null tant qu'il n'a pas été choisi
    licence: string;            // ex "FR-4471-C", généré une fois, cosmétique
    cree: string;               // ISO date
  };
  progression: {
    division: number;           // 0..8
    divisionMax: number;
    matchsJoues: number;
    meilleureNote: number | null;
    sommeNotes: number;         // pour la moyenne, évite de stocker l'historique
    badges: string[];           // ids, triés
  };
  quotidien: {
    dernierJourJoue: string | null;   // "2026-07-31"
    serie: number;
    serieMax: number;
    jokerDispo: boolean;
    joursDepuisJoker: number;
    resultats: Record<string, { note: number; decisions: number[] }>;
    // resultats : les 30 derniers jours seulement, purge à l'écriture
  };
  reglages: {
    son: boolean;               // false par défaut
    chrono: boolean;            // true par défaut
    mouvementReduit: boolean;   // initialisé depuis prefers-reduced-motion
  };
  recentIncidents: string[];    // 36 derniers ids joués, pour le cooldown, FIFO
  compte: { lieAuServeur: boolean; userId: string | null };
}
```

Écriture : à la fin de chaque match, et au changement de réglage. Jamais pendant un match — si l'onglet meurt en cours de partie, le match est perdu, et c'est acceptable.

Lecture : une fois au démarrage, dans un store Svelte. Si le parse échoue ou si `schema` est absent, on repart d'une sauvegarde vierge **et on garde l'ancienne chaîne dans `sifflet.sauvegarde.corrompue`** pour pouvoir la récupérer si quelqu'un remonte le problème. Ne jamais effacer silencieusement la progression de quelqu'un.

### Migrations

`src/lib/save/migrations.ts` :

```ts
type Migration = (s: any) => any;

const MIGRATIONS: Record<number, Migration> = {
  // 1 -> 2 : exemple de ce à quoi ça ressemblera
  // 1: (s) => ({ ...s, schema: 2, progression: { ...s.progression, saisons: [] } }),
};

export function migrer(brut: unknown): Sauvegarde {
  let s = brut as any;
  while (s.schema < SCHEMA_COURANT) {
    const m = MIGRATIONS[s.schema];
    if (!m) return sauvegardeVierge();   // trou dans la chaîne : on repart propre
    s = m(s);
  }
  if (s.schema > SCHEMA_COURANT) return sauvegardeVierge(); // retour arrière de déploiement
  return s as Sauvegarde;
}
```

Règles : une migration ne supprime jamais un champ existant lors du déploiement qui l'introduit (on le laisse orphelin un cycle, on le nettoie au suivant) ; chaque migration a un test unitaire avec une sauvegarde réelle figée dans `tests/fixtures/save-v{n}.json`.

---

## 3. Base de données (Postgres / Supabase)

Rien de tout ça n'existe en V0. C'est le socle V1.

```sql
-- ─────────────────────────────────────────────────────────
-- Profils
-- ─────────────────────────────────────────────────────────
create table public.arbitres (
  id              uuid primary key references auth.users(id) on delete cascade,
  pseudo          text not null,
  pseudo_norm     text not null generated always as (lower(pseudo)) stored,
  licence         text not null,
  division        smallint not null default 0,
  division_max    smallint not null default 0,
  matchs_joues    integer  not null default 0,
  somme_notes     integer  not null default 0,
  meilleure_note  smallint,
  serie           integer  not null default 0,
  serie_max       integer  not null default 0,
  joker_dispo     boolean  not null default true,
  badges          text[]   not null default '{}',
  cree_le         timestamptz not null default now(),
  vu_le           timestamptz not null default now(),
  constraint pseudo_longueur check (char_length(pseudo) between 3 and 18),
  constraint pseudo_charset  check (pseudo ~ '^[A-Za-z0-9À-ÿ _.-]+$'),
  constraint division_bornes check (division between 0 and 8),
  constraint division_max_coherente check (division_max >= division),
  constraint note_bornes check (meilleure_note is null or meilleure_note between 0 and 100)
);
create unique index arbitres_pseudo_unique on public.arbitres (pseudo_norm);
create index arbitres_vu_le on public.arbitres (vu_le desc);

-- ─────────────────────────────────────────────────────────
-- Scores du match du jour (un seul par joueur et par jour)
-- ─────────────────────────────────────────────────────────
create table public.scores (
  id               bigint generated always as identity primary key,
  arbitre_id       uuid not null references public.arbitres(id) on delete cascade,
  jour             date not null,
  seed             text not null,
  contenu_version  smallint not null,
  note             smallint not null,
  justesse         smallint not null,
  controle         smallint not null,
  constance        smallint not null,
  decisions        smallint[] not null,
  duree_ms         integer not null,
  cree_le          timestamptz not null default now(),
  constraint note_bornes check (note between 0 and 100),
  constraint duree_plausible check (duree_ms between 40000 and 1800000),
  constraint decisions_taille check (array_length(decisions, 1) between 12 and 14)
);
create unique index scores_un_par_jour on public.scores (arbitre_id, jour);
create index scores_classement on public.scores (jour, note desc, duree_ms asc);

-- ─────────────────────────────────────────────────────────
-- Agrégat des décisions : c'est lui qui alimente "82 % ont sifflé penalty"
-- ─────────────────────────────────────────────────────────
create table public.votes_jour (
  jour         date not null,
  incident_id  text not null,
  option_index smallint not null,
  total        integer not null default 0,
  primary key (jour, incident_id, option_index)
);

-- ─────────────────────────────────────────────────────────
-- Signalements de pseudo
-- ─────────────────────────────────────────────────────────
create table public.signalements (
  id          bigint generated always as identity primary key,
  cible_id    uuid not null references public.arbitres(id) on delete cascade,
  auteur_id   uuid references public.arbitres(id) on delete set null,
  motif       text not null check (motif in ('insulte','usurpation','spam','autre')),
  traite      boolean not null default false,
  cree_le     timestamptz not null default now()
);
create index signalements_a_traiter on public.signalements (traite, cree_le) where not traite;
```

### RLS

```sql
alter table public.arbitres    enable row level security;
alter table public.scores      enable row level security;
alter table public.votes_jour  enable row level security;
alter table public.signalements enable row level security;

-- Chacun lit et modifie sa ligne, et rien d'autre.
create policy arbitre_lit_soi on public.arbitres
  for select using (auth.uid() = id);
create policy arbitre_ecrit_soi on public.arbitres
  for update using (auth.uid() = id)
  with check (auth.uid() = id);
create policy arbitre_cree_soi on public.arbitres
  for insert with check (auth.uid() = id);

-- Le classement public passe par une vue, pas par la table.
create view public.classement_jour
with (security_invoker = false) as
  select s.jour, a.pseudo, a.division_max, s.note, s.duree_ms,
         row_number() over (partition by s.jour order by s.note desc, s.duree_ms asc) as rang
  from public.scores s join public.arbitres a on a.id = s.arbitre_id
  where s.jour >= current_date - 7;
grant select on public.classement_jour to anon, authenticated;

-- Les scores ne sont JAMAIS insérés par le client.
create policy scores_lecture_soi on public.scores
  for select using (auth.uid() = arbitre_id);
-- pas de policy insert/update/delete : tout passe par la RPC ci-dessous.

-- Les agrégats sont publics en lecture, jamais en écriture directe.
create policy votes_lecture on public.votes_jour for select using (true);
```

### RPC d'enregistrement

Le client n'écrit pas dans `scores`. Le route handler SvelteKit revalide (voir `05-architecture.md`) puis appelle :

```sql
create or replace function public.enregistrer_score(
  p_jour date, p_seed text, p_contenu_version smallint,
  p_note smallint, p_justesse smallint, p_controle smallint, p_constance smallint,
  p_decisions smallint[], p_duree_ms integer, p_incidents text[]
) returns table (rang integer)
language plpgsql security definer set search_path = public as $$
declare v_id uuid := auth.uid();
begin
  if v_id is null then raise exception 'non authentifie'; end if;
  if p_jour <> current_date then raise exception 'jour invalide'; end if;

  insert into scores (arbitre_id, jour, seed, contenu_version, note,
                      justesse, controle, constance, decisions, duree_ms)
  values (v_id, p_jour, p_seed, p_contenu_version, p_note,
          p_justesse, p_controle, p_constance, p_decisions, p_duree_ms)
  on conflict (arbitre_id, jour) do nothing;

  if not found then raise exception 'deja joue'; end if;

  for i in 1 .. array_length(p_incidents, 1) loop
    insert into votes_jour (jour, incident_id, option_index, total)
    values (p_jour, p_incidents[i], p_decisions[i], 1)
    on conflict (jour, incident_id, option_index)
      do update set total = votes_jour.total + 1;
  end loop;

  return query
    select count(*)::integer + 1 from scores s
    where s.jour = p_jour and (s.note > p_note
       or (s.note = p_note and s.duree_ms < p_duree_ms));
end $$;
revoke all on function public.enregistrer_score from public;
grant execute on function public.enregistrer_score to authenticated;
```

### Rétention

- `scores` : purge des lignes de plus de 90 jours, cron quotidien. Le meilleur score reste dans `arbitres.meilleure_note`.
- `votes_jour` : conservé 30 jours.
- `signalements` traités : 180 jours.

---

## 4. Fusion local ↔ compte

Le point le plus casse-gueule du projet. Règle écrite ici une fois, implémentée une fois, testée.

Trois situations à la liaison d'un compte :

**Cas 1 — le compte est neuf** (`matchs_joues = 0` côté serveur). La progression locale est écrite telle quelle sur le serveur. Aucune question.

**Cas 2 — le compte a une progression, le local est marginal** (`matchsJoues local ≤ 3`). On écrase le local par le serveur, on prévient d'une ligne : « Progression retrouvée : Ligue 2, 41 matchs. » Aucune question.

**Cas 3 — les deux ont une progression réelle** (les deux `matchsJoues > 3`). Fusion champ par champ, automatique, sans question :

| Champ | Règle |
|---|---|
| `divisionMax`, `meilleureNote`, `serieMax` | **maximum** |
| `badges` | **union** |
| `matchsJoues`, `sommeNotes` | **somme** |
| `division` (courante) | celle du **côté qui a la `divisionMax` la plus haute** ; à égalité, celle du serveur |
| `serie`, `jokerDispo` | côté serveur (la série est un objet de calendrier, elle appartient au compte) |
| `resultats[jour]` | le résultat **déjà validé par le serveur** gagne toujours, quel que soit le score local |
| `pseudo`, `licence` | serveur |

**On ne demande rien au joueur.** Le prompt envisageait une question ; je l'écarte. Un dialogue « quelle progression garder ? » au moment de la création de compte, c'est une friction placée exactement au pire endroit du parcours, et le joueur n'a pas les éléments pour répondre. La fusion par maximum ne perd rien de ce à quoi il tient (divisions, records, badges) ; ce qui diverge — la division courante — est de toute façon récupérable en trois matchs.

Une seule exception : si la fusion fait **baisser** la division courante de plus de 2 crans par rapport au local, on affiche une ligne informative après coup sur la feuille de match suivante — pas un dialogue bloquant.

La fusion s'exécute **côté serveur**, dans une RPC `fusionner_progression(p_local jsonb)`, pas dans le client. Le client envoie sa sauvegarde, reçoit la sauvegarde fusionnée, l'écrit en local. Un seul aller-retour, atomique, rejouable.
