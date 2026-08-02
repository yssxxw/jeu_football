# 07 — Backlog Claude Code

Ordre strict. Un ticket = un commit = une PR si tu travailles en branches. Ne pas commencer un ticket dont les dépendances ne sont pas vertes.

L'objectif d'ordonnancement : **quelque chose de jouable au ticket V0-6**, c'est-à-dire au bout d'un jour et demi. Tout ce qui vient après enrichit un jeu qui tourne déjà.

Convention des critères d'acceptation : ils sont vérifiables sans jugement. « L'écran est joli » n'est pas un critère. « `npm run budget` passe » en est un.

---

# V0 — jouable et partageable

Cible : 8 jours. Aucun compte, aucun serveur, aucun réseau autre que le chargement de la page.

---

### V0-1 — Squelette du projet

**Objectif.** SvelteKit 2 + Svelte 5 + TS strict + Tailwind 4 + Vitest + Playwright + ESLint, qui démarre et qui build.

**Fichiers.** `package.json`, `svelte.config.js`, `vite.config.ts`, `tsconfig.json`, `eslint.config.js`, `src/app.html`, `src/app.css`, `src/routes/+page.svelte`.

**Dépendances.** aucune.

**Critères d'acceptation.**
- `npm run dev` sert une page à `localhost:5173`
- `npm run build && npm run preview` fonctionne
- `npm run check` (svelte-check) sort 0 erreur, 0 avertissement
- `tsconfig` a `"strict": true`, `"noUncheckedIndexedAccess": true`, `"exactOptionalPropertyTypes": true`
- la règle ESLint `no-restricted-imports` sur `src/lib/moteur/**` est en place et fait échouer le lint sur un import de `svelte` ajouté volontairement

**Test manuel.** Ajouter `import { onMount } from 'svelte'` dans un fichier vide de `src/lib/moteur/`, lancer `npm run lint`, vérifier l'échec, retirer.

---

### V0-2 — PRNG et seeds

**Objectif.** Le générateur déterministe et les fonctions de seed.

**Fichiers.** `src/lib/moteur/prng.ts`, `src/lib/moteur/seed.ts`, `tests/moteur/prng.test.ts`.

**Dépendances.** V0-1.

**Contenu.** `cyrb128`, `sfc32`, `alea(seed)`, plus les utilitaires `tirerEntier(rand, min, max)`, `tirerDans(rand, tableau)`, `melanger(rand, tableau)` (Fisher-Yates), `seedDuJour(date)`, `seedLibre(division, compteur)`.

**Critères d'acceptation.**
- `alea('test')` appelé 5 fois donne exactement la même séquence à chaque exécution, valeurs figées dans le test
- `melanger` avec la même seed donne le même ordre 1 000 fois de suite
- `tirerEntier(rand, 0, 9)` sur 100 000 tirages : chaque valeur entre 9 800 et 10 200
- `seedDuJour(new Date('2026-07-31T23:59:00Z'))` === `'SIFFLET-2026-07-31'`
- aucune occurrence de `Math.random` dans `src/lib/moteur`

**Test manuel.** `npx vitest run tests/moteur/prng.test.ts` deux fois de suite, comparer les sorties.

---

### V0-3 — Types du moteur et constantes d'équilibrage

**Objectif.** Traduire `02-game-design.md` et `04-donnees.md` en types et en constantes, sans logique.

**Fichiers.** `src/lib/moteur/types.ts`, `src/lib/moteur/equilibrage.ts`.

**Dépendances.** V0-2.

**Contenu.** `TABLE_DIVISIONS` (les 9 lignes de la table §5 de `02`), `FENETRES` (les 6 créneaux et leurs quotas), `POIDS_NOTE = { justesse: 0.55, controle: 0.25, constance: 0.20 }`, `SEUILS_MENTION`, `MALUS`, `VAR`, `PENALTY_PROBA = 0.76`.

**Critères d'acceptation.**
- aucune de ces valeurs n'est écrite ailleurs dans le repo (vérifiable par `grep -r "0.55" src/ | grep -v equilibrage`)
- les quotas de `FENETRES` somment à 12
- un test vérifie que les 9 divisions sont présentes et ordonnées

---

### V0-4 — Contenu minimal et validation

**Objectif.** Le schéma Zod, le script de validation, et un jeu de contenu suffisant pour jouer : **24 incidents**, 12 clubs, 8 contextes. Les 5 incidents rédigés dans `03-contenu.md` en font partie, à l'identique.

**Fichiers.** `src/lib/contenu/**`, `scripts/valider-contenu.ts`.

**Dépendances.** V0-3.

**Critères d'acceptation.**
- `npm run valider-contenu` passe et vérifie les 10 invariants listés dans `04-donnees.md` §1
- casser volontairement un invariant (deux options `defaut: true`) fait sortir le script en code 1 avec le message et l'id fautif
- Zod n'apparaît pas dans le bundle client : `npm run build` puis `grep -r "zod" .svelte-kit/output/client` ne renvoie rien
- les 5 incidents de `03-contenu.md` sont présents avec leurs valeurs exactes

**Test manuel.** Lancer le script, lire la sortie : elle affiche le compte d'incidents par palier et par fenêtre.

---

### V0-5 — Composition d'un match

**Objectif.** `composer(seed, division) → Match`, la fonction la plus critique du projet.

**Fichiers.** `src/lib/moteur/composer.ts`, `tests/moteur/composer.test.ts`.

**Dépendances.** V0-4.

**Contenu.** Les cinq étapes de `02-game-design.md` §6, dans l'ordre exact. En tête de fichier, un commentaire listant l'ordre de consommation du PRNG — il fait foi.

**Critères d'acceptation.**
- `composer('X', 3)` appelé 1 000 fois retourne un objet strictement identique (comparaison JSON)
- 12 incidents, aucun doublon d'id, minutes strictement croissantes
- aucune famille n'apparaît plus de 2 fois
- sur 500 seeds à la division 6, le taux d'incidents `ambigu` moyen est dans `[0.46, 0.54]`
- ajouter un incident au contenu ne change **pas** l'ordre de consommation du PRNG (test : deux snapshots, avant et après ajout d'un incident inéligible au palier testé, sur la même seed)
- snapshot de 200 seeds figé dans `tests/fixtures/matchs.snap.json`

**Test manuel.** `npx tsx scripts/apercu-match.ts SIFFLET-2026-07-31 6` affiche le match en texte dans le terminal.

**Constaté à l'implémentation.** Deux de ces critères — « aucune famille plus de 2 fois » et « taux d'ambigus dans `[0,46 ; 0,54]` à la division 6 » — ne sont pas vérifiables sur les 24 incidents de V0-4, et aucun algorithme ne peut les y tenir : au palier 0, quatre fenêtres n'offrent que leur quota exact et contiennent chacune un `tacle`, donc la famille déborde par construction ; et le vivier ne compte que 25 % d'ambigus au palier 6, contre 50 % visés. Les deux tiennent dès que l'invariant « ≥ 8 incidents par couple (palier, fenêtre) » est respecté. Ils sont donc testés sur un corpus synthétique complet (`tests/fixtures/corpus-complet.ts`), qui prouve l'algorithme, et ils repassent sur le contenu réel en **V0-13**. Le reste des critères est vérifié sur le contenu réel.

---

### V0-6 — Boucle jouable brute

**Objectif.** Le premier jalon qui compte : on peut jouer un match de bout en bout dans le navigateur. Aucun style, aucune animation, du HTML nu.

**Fichiers.** `src/lib/moteur/appliquer.ts`, `src/lib/moteur/noter.ts`, `src/lib/etat/partie.svelte.ts`, `src/routes/+page.svelte`, `src/routes/match/+page.svelte`, `src/routes/feuille/+page.svelte`.

**Dépendances.** V0-5.

**Contenu.** Application d'une décision (contrôle, dérives, tempérament, score du match, expulsions), calcul de justesse, constance, note, mention, profil de presse. Pas encore de chrono, pas encore de VAR.

**Critères d'acceptation.**
- depuis `/`, cliquer `COUP D'ENVOI` puis 12 options mène à une feuille de match affichant une note entière entre 0 et 100
- la jauge de contrôle affichée correspond à la valeur calculée par le moteur (vérifiable via `window.__debug` en dev)
- un match où toutes les options `justesse: 1` sont choisies donne justesse = 100
- un match où le contrôle atteint 0 s'arrête immédiatement et la note est ≤ 35
- 15 tests unitaires sur `noter()` couvrant : note nulle, note parfaite, 1 incohérence, 3 incohérences, match arrêté, malus de non-décision
- la division est mise à jour en local après le match selon la règle 72/48

**Test manuel.** Jouer trois matchs d'affilée, vérifier que la division bouge dans le bon sens et que le contenu ne se répète pas.

---

### V0-7 — Sauvegarde locale

**Objectif.** Persistance, migrations, purge.

**Fichiers.** `src/lib/sauvegarde/stockage.ts`, `src/lib/sauvegarde/migrations.ts`, `tests/sauvegarde/*.test.ts`.

**Dépendances.** V0-6.

**Critères d'acceptation.**
- la progression survit à un rechargement complet
- une chaîne invalide dans `sifflet.sauvegarde` ne fait pas planter le jeu ; elle est déplacée dans `sifflet.sauvegarde.corrompue` et une sauvegarde vierge est créée
- une sauvegarde avec `schema: 99` repart vierge sans planter
- `recentIncidents` est plafonné à 36 entrées
- `quotidien.resultats` est purgé au-delà de 30 jours à chaque écriture
- l'écriture n'a lieu qu'en fin de match et au changement de réglage : instrumenter `setItem` en test et compter les appels sur une partie complète (attendu : 1)

**Test manuel.** Jouer, recharger, vérifier la division. Coller `{"lol":1}` dans la clé, recharger, vérifier qu'on repart proprement.

---

### V0-8 — Chrono

**Objectif.** L'anneau de chrono, l'option par défaut à l'expiration, le réglage « sans chrono ».

**Fichiers.** `src/lib/ui/Chrono.svelte`, `src/routes/match/+page.svelte`, `src/lib/etat/partie.svelte.ts`.

**Dépendances.** V0-6.

**Contenu.** Le décompte utilise `performance.now()` et `requestAnimationFrame`, pas `setInterval`. Il se met en pause si l'onglet passe en arrière-plan (`visibilitychange`) et reprend au retour — sinon on perd des joueurs sur une notification entrante.

**Critères d'acceptation.**
- la durée du chrono suit `TABLE_DIVISIONS[division].chrono`
- à l'expiration, l'option `defaut` est appliquée et `nonDecidees` s'incrémente
- passer l'onglet en arrière-plan pendant 30 s puis revenir : le temps restant est inchangé à ±100 ms
- le réglage « sans chrono » retire l'anneau, retire le malus, et pose `horsClassement: true` sur le résultat
- test Playwright : attendre l'expiration sur un incident, vérifier que l'option par défaut a bien été jouée

**Test manuel.** Lancer un match en district (8 s), ne rien toucher sur deux incidents, vérifier le malus de −6 sur la feuille.

---

### V0-9 — Équilibrage par simulation

**Objectif.** Vérifier que les nombres de `02-game-design.md` tiennent, avant de les habiller.

**Fichiers.** `scripts/simuler.ts`.

**Dépendances.** V0-8.

**Contenu.** Cinq agents : aléatoire uniforme, « connaît le foot » (choisit l'option de justesse ≥ 0,7 dans 70 % des cas), « constant » (idem + garde la même sévérité par famille), « parfait », « parfait mais rate 2 chronos ». 10 000 parties chacun.

**Critères d'acceptation.**
- le script sort un tableau des médianes et des déciles par agent et par division
- les médianes obtenues sont dans ±4 points de la table §4 de `02-game-design.md`
- si ce n'est pas le cas : **ne pas ajuster le code**, ajuster les `dControle` du contenu et documenter l'écart dans un commentaire en tête de `equilibrage.ts`

**Test manuel.** `npx tsx scripts/simuler.ts` et lire le tableau.

---

### V0-10 — VAR

**Objectif.** L'écran VAR et sa logique.

**Fichiers.** `src/lib/moteur/appliquer.ts`, `src/lib/ui/EcranVar.svelte`.

**Dépendances.** V0-8.

**Critères d'acceptation.**
- la VAR ne se déclenche jamais en dessous de la division 5
- elle ne se déclenche jamais quand la justesse de l'incident est ≥ 0,7
- le quota par match est respecté (1 en division 5, 2 au-delà)
- rectifier porte la justesse de l'incident à 0,9 et applique −2 note, −3 contrôle
- maintenir applique −8 note, −12 contrôle
- le déclenchement est déterministe : même seed, mêmes décisions → mêmes VAR

**Test manuel.** Jouer un match en Ligue 1 en choisissant volontairement une mauvaise option sur un incident de gravité 4+, vérifier le déclenchement.

---

### V0-11 — Direction artistique

**Objectif.** Appliquer `06-ui-direction-artistique.md` à tous les écrans existants.

**Fichiers.** `src/app.css`, `static/fonts/*`, tous les composants de `src/lib/ui/`.

**Dépendances.** V0-10.

**Contenu.** Tokens CSS, polices sous-ensemblées, grille, animations, tous les états listés dans `06` §6.

**Critères d'acceptation.**
- les trois polices sont auto-hébergées, aucune requête sortante vers `fonts.googleapis.com` ou `fonts.gstatic.com` (vérifier l'onglet réseau)
- poids cumulé des woff2 ≤ 46 Ko
- `prefers-reduced-motion: reduce` remplace toutes les animations par un fondu de 90 ms
- CLS mesuré à 0 sur le parcours accueil → match → feuille
- les 4 états de l'écran de match et les 5 états de la feuille de match sont implémentés et atteignables (une page `/dev/etats` en mode dev les liste tous)
- aucun `border-radius` supérieur à 2 px dans le CSS produit

**Test manuel.** Ouvrir `/dev/etats` sur un téléphone réel et parcourir les états.

---

### V0-12 — Carte de partage

**Objectif.** Le PNG 1080 × 1350 et le partage natif.

**Fichiers.** `src/lib/partage/carte.ts`, `src/lib/ui/FeuilleDeMatch.svelte`.

**Dépendances.** V0-11.

**Critères d'acceptation.**
- la carte est rendue en moins de 300 ms sur un appareil de milieu de gamme
- `document.fonts.ready` est attendu avant le premier trait
- sur iOS Safari, `navigator.share` avec `files` ouvre bien la feuille de partage
- sur un navigateur sans `navigator.canShare({files})`, le PNG se télécharge et le texte est copié, avec une confirmation d'une ligne
- le texte d'accompagnement suit exactement le gabarit de `06` §6.6
- test visuel figé : une carte générée depuis une seed connue est comparée à un PNG de référence (tolérance 2 % de pixels)

**Test manuel.** Partager vers une conversation, vérifier l'aperçu sur le téléphone du destinataire.

---

### V0-13 — Contenu complet

**Objectif.** Passer de 24 à 140 incidents, de 12 à 44 clubs, de 8 à 24 contextes, écrire les 34 lignes de presse et les 26 badges.

**Fichiers.** `src/lib/contenu/**`, `src/lib/contenu/VERIFICATION.md`.

**Dépendances.** V0-9 (l'équilibrage doit être figé avant d'écrire en masse).

**Critères d'acceptation.**
- `npm run valider-contenu` passe, y compris l'invariant « ≥ 8 incidents par couple (palier, fenêtre) »
- la répartition par famille correspond à la table de `03-contenu.md` à ±2 près
- les 44 noms de clubs ont été vérifiés un par un et `VERIFICATION.md` est daté et signé
- les 26 badges sont tous atteignables : un test parcourt les conditions et vérifie qu'aucune n'est contradictoire
- 20 matchs consécutifs en division 6 : aucun incident répété
- les deux critères de V0-5 reportés ici passent enfin sur le contenu réel : aucune famille plus de 2 fois, et taux d'ambigus dans `[0,46 ; 0,54]` à la division 6 (basculer les tests de `corpus-complet.ts` vers le contenu réel, et lancer `COUVERTURE_BLOQUANTE=1 npm run valider-contenu`)

**Test manuel.** Jouer 10 matchs et lire tous les textes. C'est long, c'est le seul moyen d'attraper les fautes.

---

### V0-14 — Perf, hors-ligne, mise en ligne

**Objectif.** Le jeu est en ligne sur le domaine et tient les budgets.

**Fichiers.** `src/service-worker.ts`, `scripts/budget.ts`, config Vercel.

**Dépendances.** V0-13.

**Critères d'acceptation.**
- tous les budgets de `05-architecture.md` §5 sont tenus, `npm run budget` le vérifie et casse le build sinon
- Lighthouse mobile : performance ≥ 95, accessibilité ≥ 95
- en mode avion, l'application se charge et un match complet est jouable
- le match du jour hors ligne donne le même match qu'en ligne
- aucun cookie n'est posé (vérifier `document.cookie === ''` après un match complet)
- l'image `og.png` s'affiche correctement dans un aperçu de lien

**Test manuel.** Passer le téléphone en mode avion, jouer, repasser en ligne, vérifier qu'il ne s'est rien passé de bizarre.

---

# V1 — comptes, quotidien, classement

Cible : 5 jours, une à deux semaines après le lancement de V0, en fonction de ce que dit le trafic.

### V1-1 — Match du jour, série, joker

Local uniquement, sans serveur. Seed du jour, une tentative comptabilisée, rejeu marqué hors classement, compteur de série, joker automatique.

**Acceptation.** Simuler le passage de minuit (injection d'horloge en test) ; jouer J, sauter J+1, jouer J+2 → série conservée, joker consommé. Sauter deux jours → série remise à 0, aucun message culpabilisant.

### V1-2 — Supabase, schéma, RLS

Appliquer les migrations de `04-donnees.md` §3. **Acceptation.** Un client authentifié ne peut pas lire la ligne d'un autre arbitre ni insérer dans `scores` (tests SQL avec deux utilisateurs).

### V1-3 — Compte optionnel

Proposé à un seul endroit : sur la feuille de match, après une note ≥ 75 ou à la 3ᵉ partie, selon ce qui arrive en premier. OAuth Google + Apple + magic link. **Acceptation.** Le parcours complet ne dépasse pas 3 taps hors saisie d'e-mail. Refuser la proposition ne la fait pas réapparaître avant 7 jours.

### V1-4 — Fusion de progression

La RPC `fusionner_progression` et sa règle champ par champ (`04-donnees.md` §4). **Acceptation.** 6 tests couvrant les 3 cas et les cas limites (badges disjoints, division locale supérieure, résultat du jour présent des deux côtés).

### V1-5 — Soumission et revalidation

`POST /api/score` avec rejeu serveur. **Acceptation.** Une note falsifiée dans la charge utile est rejetée ; une séquence honnête passe ; une seconde soumission le même jour renvoie 409 ; un `contenuVersion` obsolète renvoie 409 et le client se recharge.

### V1-6 — Pourcentages de comparaison

`votes_jour`, l'endpoint caché derrière le CDN, l'affichage sur la feuille de match. **Acceptation.** Après 50 soumissions simulées, le pourcentage affiché correspond aux données ; en dessous de 30 votes sur un incident, on affiche `—` plutôt qu'un pourcentage non significatif.

### V1-7 — Classement

Vue `classement_jour`, top 100 + rang personnel. Pas de classement global à vie : uniquement le jour et les 7 derniers jours. **Acceptation.** La page charge en moins de 400 ms avec 100 000 lignes dans `scores` (test de charge avec données générées).

### V1-8 — Modération des pseudos

Liste de blocage à l'inscription, bouton de signalement sur le classement, RPC admin de renommage. **Acceptation.** Un pseudo de la liste est refusé à la création avec un message clair ; un signalement crée une ligne ; le renommage administrateur fonctionne et notifie l'utilisateur au prochain chargement.

---

# V2 — le reste

Sans engagement de date. À arbitrer avec les chiffres d'usage, pas avec l'envie.

- **Carrière et saisons.** Une saison = 10 matchs, un classement d'arbitres en fin de saison, une désignation pour une finale si vous finissez dans les trois premiers.
- **Joueurs récurrents.** Un attaquant qui simule, un défenseur qui parle trop. Leur réputation se construit sur vos parties passées et devient une information utilisable. C'est la meilleure idée du backlog et la plus coûteuse.
- **Assistants et quatrième arbitre.** Un assistant qui lève son drapeau à tort une fois par match, à vous de le suivre ou non.
- **Compétitions.** Coupe, phases de groupes, un tirage au sort hebdomadaire.
- **Partage animé.** Une vidéo de 4 s au lieu d'un PNG, pour les stories.
- **Cosmétiques.** Habillages de la feuille de match (carnet à souche, papier de fédération, télex). Point de branchement pour un don plus tard — voir `09-mise-en-ligne.md`. Rien de tout ça ne touche à l'équilibrage.
- **i18n.** L'anglais d'abord. Le contenu est le mur : 140 incidents à réécrire, pas à traduire, parce qu'un incident d'arbitrage français ne sonne pas juste en anglais tel quel.
