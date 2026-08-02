# 05 — Architecture

## 1. Stack

**SvelteKit 2 (Svelte 5, runes) + TypeScript strict + Vite, `adapter-vercel` en mode edge, Supabase (Postgres + Auth) région Frankfurt, Vercel Hobby.**

Justification en cinq lignes, comme demandé : Svelte compile ses composants et ne livre pas de runtime de rendu, ce qui est décisif ici parce que le budget est un premier tap sous 2 secondes en 4G ; le jeu est à 95 % local, donc on a besoin d'un framework qui disparaît, pas d'un framework qui orchestre. SvelteKit donne quand même des routes serveur pour la revalidation des scores, que je ne veux pas faire dans une fonction séparée. Supabase parce que Postgres + RLS + auth OAuth managés à zéro euro à cette échelle, et que la migration hors de Supabase reste possible (c'est du Postgres). Vercel plutôt que Netlify pour l'edge runtime sur la route de validation, sans autre motif fort.

**Ce que je conteste dans la stack proposée : l'auth anonyme Supabase au chargement.**

L'auth anonyme est présentée comme la clé du « je joue tout de suite, je crée un compte plus tard ». Elle ne l'est pas, elle en est la version chère. Créer une session anonyme, c'est : un appel réseau bloquant ou concurrent au démarrage, un JWT à stocker, une ligne `auth.users` créée pour chaque visiteur y compris ceux qui rebondissent en quatre secondes, et un quota Supabase consommé par des fantômes. Sur un jeu qui va prendre un pic de trafic Reddit, c'est le premier truc qui casse.

**Ce que je fais à la place :** rien du tout au démarrage. `localStorage` seul, aucun réseau, aucun compte. La session Supabase est créée **au premier moment où le joueur a besoin du serveur**, c'est-à-dire quand il soumet un score au classement — et à ce moment-là on ne crée pas une session anonyme, on lui propose directement un vrai compte (OAuth Google/Apple, ou magic link). Un joueur qui veut être classé accepte de s'identifier ; un joueur qui ne veut pas ne coûte rien.

Conséquence : `05` ne parle jamais de session anonyme, et `07-backlog-claude-code.md` ne contient pas de ticket pour ça. Si tu tiens à l'anonyme, le point de branchement est le ticket V1-2 et ça reste faisable, mais je ne le recommande pas.

**Ce que j'écarte aussi :**
- Next.js : plus lourd côté client pour zéro bénéfice ici, et le modèle serveur ne sert à rien à un jeu qui tourne en local.
- Un moteur de jeu (Phaser, PixiJS) : c'est du texte et des boutons, ce serait 200 Ko pour rien.
- Tailwind : oui pour la vitesse, mais avec une contrainte, voir `06`. Retenu, en mode CSS-first Tailwind 4, purge stricte.
- Un state manager : les runes Svelte 5 suffisent, le jeu a un seul store.

---

## 2. Arborescence du repo

```
sifflet/
├── CLAUDE.md
├── package.json
├── svelte.config.js
├── vite.config.ts
├── tsconfig.json
├── eslint.config.js
├── src/
│   ├── app.html
│   ├── app.css                      # tokens + base, voir 06
│   ├── lib/
│   │   ├── moteur/                  # ZONE PURE — aucun import DOM, aucun import Svelte
│   │   │   ├── prng.ts
│   │   │   ├── seed.ts
│   │   │   ├── equilibrage.ts       # toutes les constantes de 02, et elles n'existent qu'ici
│   │   │   ├── composer.ts          # seed + division -> Match
│   │   │   ├── appliquer.ts         # Etat + decision -> Etat
│   │   │   ├── noter.ts             # Etat final -> Resultat
│   │   │   ├── rejouer.ts           # seed + decisions[] -> Resultat  (utilisé par le serveur)
│   │   │   ├── types.ts
│   │   │   └── index.ts
│   │   ├── contenu/
│   │   │   ├── incidents/*.json
│   │   │   ├── clubs.json
│   │   │   ├── contextes.json
│   │   │   ├── badges.json
│   │   │   ├── presse.json
│   │   │   ├── version.ts
│   │   │   ├── schema.ts            # Zod, importé UNIQUEMENT par les scripts
│   │   │   └── index.ts
│   │   ├── sauvegarde/
│   │   │   ├── stockage.ts
│   │   │   ├── migrations.ts
│   │   │   └── fusion.ts
│   │   ├── etat/
│   │   │   └── partie.svelte.ts     # le seul store du jeu
│   │   ├── ui/
│   │   │   ├── Jauge.svelte
│   │   │   ├── Chrono.svelte
│   │   │   ├── CarteIncident.svelte
│   │   │   ├── OptionBouton.svelte
│   │   │   ├── Consequence.svelte
│   │   │   ├── EcranVar.svelte
│   │   │   ├── FeuilleDeMatch.svelte
│   │   │   └── Panneau.svelte
│   │   ├── partage/
│   │   │   └── carte.ts             # rendu canvas 1080×1350
│   │   └── supabase/
│   │       ├── client.ts
│   │       └── serveur.ts
│   └── routes/
│       ├── +layout.svelte
│       ├── +page.svelte             # coup d'envoi
│       ├── match/+page.svelte
│       ├── feuille/+page.svelte
│       ├── classement/+page.svelte  # V1
│       ├── mentions/+page.svelte
│       └── api/
│           ├── score/+server.ts
│           └── votes/[jour]/+server.ts
├── scripts/
│   ├── valider-contenu.ts
│   └── simuler.ts                   # 10 000 parties, sort la distribution des notes
├── tests/
│   ├── moteur/*.test.ts
│   ├── fixtures/
│   └── e2e/
└── static/
    ├── fonts/*.woff2
    ├── sons/*.webm
    └── og.png
```

**La règle qui structure tout :** `src/lib/moteur` est du TypeScript pur, sans dépendance, exécutable dans Node comme dans le navigateur comme dans un edge runtime. Le serveur importe exactement le même code que le client pour revalider un score. Toute la sécurité anti-triche repose là-dessus.

Appliqué par ESLint :

```js
{
  files: ['src/lib/moteur/**/*.ts'],
  rules: {
    'no-restricted-imports': ['error', { patterns: ['$app/*', 'svelte*', '$lib/ui/*', '$lib/etat/*'] }],
    'no-restricted-globals': ['error', 'window', 'document', 'localStorage', 'navigator', 'fetch'],
    'no-restricted-properties': ['error', { object: 'Math', property: 'random', message: 'PRNG seedé uniquement.' }],
  }
}
```

---

## 3. PRNG et déterminisme

### L'algorithme

`sfc32`, initialisé par `cyrb128` sur la chaîne de seed. 32 bits, quatre états, rapide, distribution correcte pour cet usage, une trentaine de lignes. Pas de dépendance.

```ts
// src/lib/moteur/prng.ts
export function cyrb128(s: string): [number, number, number, number] {
  let h1 = 1779033703, h2 = 3144134277, h3 = 1013904242, h4 = 2773480762;
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

export function sfc32(a: number, b: number, c: number, d: number) {
  return function rand(): number {
    a >>>= 0; b >>>= 0; c >>>= 0; d >>>= 0;
    let t = (a + b) | 0;
    a = b ^ (b >>> 9); b = (c + (c << 3)) | 0;
    c = (c << 21) | (c >>> 11); d = (d + 1) | 0;
    t = (t + d) | 0; c = (c + t) | 0;
    return (t >>> 0) / 4294967296;
  };
}

export function alea(seed: string) { return sfc32(...cyrb128(seed)); }
```

### Les seeds

| Type de partie | Seed |
|---|---|
| Match du jour | `SIFFLET-2026-07-31` |
| Match libre | `L-{division}-{compteurLocal}-{4 hex tirés de crypto.getRandomValues}` |
| Rejeu d'un match | la seed exacte, stockée sur la feuille de match |

La seed du match du jour est calculée **en local, à partir de la date UTC**, jamais demandée au serveur. Conséquence : le match du jour fonctionne hors ligne, et un joueur dont l'horloge est fausse joue un autre match — c'est accepté, le serveur refuse alors le score avec `jour invalide` et le lui dit clairement.

### Ce qui doit être dérivé de la seed

Tout, sans exception : le tirage des clubs, du contexte, des douze minutes, des douze incidents, l'ordre des tirages VAR, le résultat de la transformation d'un penalty. **Rien** ne dépend de l'heure, de la locale, de l'ordre d'itération d'un `Object.keys` ou de la taille de l'écran.

Piège identifié à traiter dès le premier commit : les fonctions de tirage doivent consommer le PRNG dans un **ordre fixe indépendant des données**. Ne jamais écrire `if (condition) rand()` sans consommer aussi dans la branche else, sinon un changement de contenu décale toute la suite du tirage.

Consommation documentée dans `composer.ts` en tête de fichier, sous forme de liste ordonnée des appels. Toute modification de cette liste incrémente `CONTENU_VERSION`.

### Tests de déterminisme

- `tests/moteur/determinisme.test.ts` : 200 seeds figées, snapshot du match composé complet. Ce test doit casser à chaque fois que l'équilibrage change — c'est son rôle.
- Test croisé Node ↔ navigateur : le même snapshot rejoué dans Vitest (Node) et dans Playwright (Chromium + WebKit). Les flottants doivent tomber au bit près.

---

## 4. Validation serveur des scores

### Le principe

Le client envoie ce qu'il a fait, pas ce qu'il a obtenu. Le serveur rejoue.

`POST /api/score`

```json
{
  "jour": "2026-07-31",
  "seed": "SIFFLET-2026-07-31",
  "contenuVersion": 1,
  "decisions": [2, 0, 1, 3, 2, 1, 1, 0, 2, 2, 1, 3],
  "varDecisions": [1],
  "dureesMs": [3120, 5980, 1440, 2870, 6000, 2210, 3990, 4510, 1980, 5230, 2650, 3310],
  "noteClient": 74
}
```

Le handler, dans l'ordre :

1. **Session** présente, sinon 401.
2. `jour === date UTC courante`, sinon 400 `jour invalide`.
3. `contenuVersion` connue (courante ou l'une des deux précédentes archivées), sinon 409 `client obsolète` → le client force un rechargement.
4. `decisions.length` cohérent avec le nombre d'incidents du match recomposé.
5. **Plausibilité temporelle** : chaque durée dans `[350, chronoDivision × 1000 + 250]`, somme dans `[40 000, 1 800 000]`. Une durée en dessous de 350 ms sur plus de 3 incidents → rejet.
6. **Rejeu** : `rejouer(seed, division: 6, decisions, varDecisions)` avec le contenu de la version annoncée.
7. `resultat.note === noteClient`, sinon rejet et log (c'est le signal d'un bug de version, pas forcément d'une triche — on veut le voir).
8. Appel de `enregistrer_score`. Le `on conflict do nothing` de la RPC gère le rejeu de requête.
9. Réponse : `{ rang, total, percentiles: {...} }`.

### Ce que ça n'empêche pas, et pourquoi je m'en fiche

Un joueur peut rejouer le match du jour en local jusqu'à obtenir 100, puis soumettre la séquence gagnante. Le rejeu serveur la validera : elle est légitime, seulement elle n'a pas été obtenue du premier coup.

Contre-mesures possibles et écartées :
- signer chaque décision avec un jeton serveur : casse le hors-ligne, ajoute un aller-retour par incident, tue le jeu.
- vérifier que le joueur n'a pas déjà chargé le match : impossible sans compte obligatoire.
- analyser la signature temporelle : bruit trop élevé, faux positifs garantis.

Décision assumée : **le classement quotidien est un classement d'honneur.** On bloque le script trivial (soumission de note arbitraire, temps impossibles), on ne bloque pas le joueur déterminé. Le vrai objet social du jeu n'est pas le rang, c'est le pourcentage de désaccord sur une action — et celui-là, un tricheur ne le pollue quasiment pas.

### Limitation de débit

Sur la route `/api/score` : 10 requêtes par heure par IP hachée (SHA-256 tronqué, jamais stockée en clair), en mémoire edge avec repli sur un compteur Postgres. Sur `/api/votes/[jour]` : cache CDN 60 s, `stale-while-revalidate` 300 s.

---

## 5. Budget de performance

Cible matérielle : Moto G Power sur 4G médiocre (RTT 150 ms, 1,6 Mbit/s), Chrome Android.

| Métrique | Budget | Comment on le tient |
|---|---|---|
| HTML initial | ≤ 8 Ko gzip | page de coup d'envoi rendue côté serveur, statique |
| JS critique (jusqu'au premier tap) | **≤ 55 Ko gzip** | Svelte, zéro dépendance runtime, contenu chargé après |
| JS total | ≤ 110 Ko gzip | |
| Contenu JSON | ≤ 95 Ko gzip | 140 incidents ≈ 210 Ko brut, ≈ 60 Ko gzip |
| Polices | ≤ 46 Ko | 3 fichiers woff2, sous-ensemble latin + français, `unicode-range` |
| LCP | < 1,5 s | |
| TTI / premier tap possible | **< 2,0 s** | |
| INP sur un tap d'option | < 100 ms | |
| CLS | 0 | toutes les hauteurs réservées, y compris la carte d'incident |

**Stratégie de chargement.** La page d'accueil n'a besoin ni du contenu ni du moteur : elle affiche deux noms de clubs et un bouton. Les clubs et contextes (8 Ko gzip) sont inlinés dans le HTML. Le moteur et les incidents sont préchargés en `modulepreload` juste après le premier rendu, et le bouton `COUP D'ENVOI` attend leur disponibilité — en pratique ils arrivent avant que le doigt ne bouge. Si ce n'est pas le cas, le bouton passe en état « chargement » avec le libellé inchangé et un léger battement, jamais un spinner.

**Polices.** `font-display: swap` interdit ici (le chiffre de la note qui saute de taille est laid). On utilise `size-adjust` sur une police de repli système pour que la substitution soit invisible, et `font-display: optional` sur la police de titrage. Détail dans `06`.

**Ce qu'on ne fait pas :** pas d'analytics avant l'interaction, pas de police Google chargée depuis un CDN tiers (auto-hébergées dans `static/fonts`), pas de polyfill, pas de sourcemap en production.

Contrôle : `npm run budget` fait échouer le build si `dist` dépasse les seuils. Lighthouse CI sur chaque PR, seuil performance ≥ 95 en mobile.

---

## 6. Cache et hors-ligne

Service worker minimal écrit à la main (`src/service-worker.ts`, supporté nativement par SvelteKit). Pas de Workbox : 15 Ko pour trois règles, non.

| Ressource | Stratégie |
|---|---|
| Shell (HTML, JS, CSS, polices, sons) | precache à l'install, versionné par le hash de build |
| Contenu JSON | precache |
| `/api/votes/[jour]` | network-first, repli cache, TTL 10 min |
| `/api/score` | network-only, avec **file d'attente** |

**File d'attente de soumission.** Si `/api/score` échoue pour cause de réseau, la soumission est stockée dans `sifflet.file` et rejouée au prochain démarrage en ligne. Elle est abandonnée si `jour !== aujourd'hui` au moment du rejeu — un score du 30 ne sert plus le 31.

Ce qui marche hors ligne : tout le jeu, y compris le match du jour, y compris la feuille de match et la carte de partage. Ce qui ne marche pas : les pourcentages de comparaison (on affiche « comparaison indisponible », pas une valeur inventée) et le classement.

Mise à jour : quand un nouveau service worker est prêt, on ne recharge pas de force en pleine partie. On attend la fin du match et on affiche une ligne sur la feuille de match : « Nouvelle version disponible — recharger ». Un rechargement forcé pendant un match du jour est le meilleur moyen de perdre un joueur pour de bon.

---

## 7. Environnements et déploiement

| Env | URL | Supabase | Analytics |
|---|---|---|---|
| local | `localhost:5173` | projet `sifflet-dev` | désactivé |
| aperçu | branches Vercel | projet `sifflet-dev` | désactivé |
| prod | domaine | projet `sifflet-prod` (Frankfurt) | actif |

Variables : `PUBLIC_SUPABASE_URL`, `PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE` (serveur uniquement, jamais préfixée `PUBLIC_`), `PUBLIC_SITE_URL`.

Migrations SQL versionnées dans `supabase/migrations/`, appliquées par la CLI Supabase dans le job de déploiement. Jamais de modification de schéma dans l'interface web, jamais.
