# CLAUDE.md

Contexte du projet **SIFFLET**. À poser à la racine du repo. Ce fichier fait autorité sur les habitudes générales : quand il contredit une pratique courante, il gagne.

---

## Ce qu'est le projet

Un jeu web de football gratuit, en français, où le joueur arbitre un match en douze décisions chronométrées et reçoit une note sur 100. Mobile-first strict, portrait, au pouce. Pas de compte obligatoire, pas de publicité, pas de monétisation.

Le dossier de conception vit dans `docs/`. Les fichiers `02-game-design.md`, `04-donnees.md` et `06-ui-direction-artistique.md` sont **normatifs** : les chiffres qui s'y trouvent ne se négocient pas dans le code.

---

## Commandes

```bash
npm run dev              # serveur de dev, port 5173
npm run check            # svelte-check, doit sortir 0/0
npm run lint             # eslint + prettier --check
npm run test             # vitest, unitaires
npm run test:e2e         # playwright
npm run valider-contenu  # schéma + invariants du contenu, obligatoire avant tout commit de contenu
npm run simuler          # 10 000 parties par agent, sort la distribution des notes
npm run budget           # vérifie les budgets de poids, casse si dépassement
npm run apercu -- SEED DIV   # affiche un match composé dans le terminal
npm run build && npm run preview
```

Avant chaque commit : `npm run check && npm run lint && npm run test`. Avant chaque commit touchant `src/lib/contenu` : ajouter `npm run valider-contenu`.

---

## Règles de code

**TypeScript strict.** `strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes` sont activés et ne se désactivent pas. Aucun `any`. Aucun `as` sauf sur une frontière d'entrée validée juste avant (parse JSON, réponse réseau). `@ts-expect-error` autorisé s'il est commenté avec la raison ; `@ts-ignore` jamais.

**Svelte 5, runes uniquement.** `$state`, `$derived`, `$effect`, `$props`. Pas de store `writable` sauf si un cas l'impose vraiment, et alors avec un commentaire. Pas de `export let`.

**Un seul store de jeu**, `src/lib/etat/partie.svelte.ts`. Les composants ne calculent rien : ils reçoivent et ils affichent. Si un composant contient une formule, elle est au mauvais endroit.

**Le moteur est pur.** `src/lib/moteur/**` n'importe rien de Svelte, rien de `$app`, ne touche ni au DOM, ni à `localStorage`, ni à `fetch`, ni à `Date.now()`, ni à `Math.random`. Une fonction du moteur prend des arguments et retourne une valeur, point. C'est ce qui permet au serveur de rejouer une partie et à Vitest de tout tester. ESLint fait respecter ça ; si tu te retrouves à vouloir désactiver la règle, c'est que le code n'est pas au bon endroit.

**Le temps est un argument.** Toute fonction qui a besoin de l'heure la reçoit en paramètre (`maintenant: number`). Aucun appel direct à `Date.now()` en dehors de `src/lib/etat/` et `src/routes/`.

**Immuabilité dans le moteur.** `appliquer(etat, decision)` retourne un nouvel état, ne mute pas l'entrée. Ailleurs, la mutation locale est acceptée.

**Pas d'abstraction anticipée.** Deux occurrences ne justifient pas une factorisation. Trois, on en parle.

---

## Conventions de nommage

- **Français partout** dans le code métier : noms de fonctions, de variables, de types, de fichiers, ids de contenu, colonnes SQL, clés JSON. `justesse`, pas `accuracy`. `feuilleDeMatch`, pas `matchSheet`. C'est un jeu français écrit par une personne francophone, et le mélange franglais est ce qui rend les bases de code illisibles.
- Exceptions gardées en anglais : les mots-clés du langage, les noms d'API du navigateur, les termes de framework (`load`, `+page.svelte`), et `seed` (parce que « graine » ne veut rien dire ici).
- Fichiers : `kebab-case.ts`, composants `PascalCase.svelte`, ids de contenu `snake_case`.
- Types : `PascalCase`, sans préfixe `I`.
- Constantes d'équilibrage : `SCREAMING_SNAKE_CASE`, et elles vivent **uniquement** dans `equilibrage.ts`.
- Commits : `moteur:`, `ui:`, `contenu:`, `donnees:`, `infra:`, `docs:` puis une phrase à l'infinitif en français. Exemple : `moteur: appliquer la dérive de tempérament après la 45e`.

---

## Ce que tu décides seul

- L'implémentation interne de n'importe quelle fonction, tant que la signature et le résultat sont conformes au dossier.
- Le découpage en composants, le nommage local, l'organisation des tests.
- Ajouter un test. Toujours. Sans demander.
- Corriger une faute d'orthographe ou de typographie française dans le contenu ou l'interface.
- Refuser d'ajouter une dépendance et l'écrire à la main quand elle pèse plus de 5 Ko gzip pour ce qu'on en fait.
- Ajuster une valeur de `dControle` **dans le contenu** si `npm run simuler` sort hors des bornes attendues, en documentant l'ajustement dans le message de commit.

## Ce que tu demandes avant de faire

- Toute modification d'une valeur de `equilibrage.ts` — pondérations de la note, seuils de montée/descente, table des divisions. Ces chiffres sont dans `02-game-design.md` et le fichier de doc doit bouger en même temps.
- Toute nouvelle dépendance npm, quelle qu'elle soit.
- Tout changement de schéma SQL ou de politique RLS.
- Toute chose qui ajoute une requête réseau au chargement initial de la page.
- Tout ajout de cookie, d'identifiant persistant, ou de collecte de donnée personnelle.
- Toute modification du texte d'un incident existant après la mise en ligne (ça change ce que les joueurs ont vu, et potentiellement la revalidation).
- Écrire du contenu narratif de A à Z. Tu peux proposer, tu ne commites pas 40 incidents sans relecture.

---

## Pièges connus

**Le PRNG est fragile.** L'ordre de consommation dans `composer.ts` est documenté en tête de fichier et fait foi. Ne jamais ajouter un `if (x) rand()` sans consommer aussi dans l'autre branche : ça décale toute la suite du tirage et ça casse le match du jour pour tout le monde. Le test de snapshot sur 200 seeds est là pour ça — s'il casse, ce n'est jamais « il faut mettre à jour le snapshot », c'est « qu'est-ce que j'ai changé ».

**`CONTENU_VERSION`.** Changer une `justesse`, un `dControle`, une `gravite`, l'ordre des options, ou ajouter/retirer un incident → incrémenter. Changer un texte → ne pas incrémenter. Se tromper de sens fait rejeter des scores honnêtes en production.

**Zod ne doit pas atteindre le client.** `src/lib/contenu/schema.ts` n'est importé que par `scripts/`. Un import accidentel depuis un composant ajoute 12 Ko gzip et le test de budget le verra, mais tard.

**La sauvegarde ne s'écrase jamais silencieusement.** Toute branche de code qui remet une sauvegarde à zéro doit d'abord copier l'ancienne dans `sifflet.sauvegarde.corrompue`.

**`localStorage` peut lancer une exception** (mode privé Safari, quota plein). Tous les accès passent par les helpers de `src/lib/sauvegarde/stockage.ts`, qui encapsulent le try/catch et dégradent vers une sauvegarde en mémoire. Le jeu doit rester jouable sans stockage, juste sans progression.

**Le chrono en arrière-plan.** `setInterval` dérive et se fait étrangler par les navigateurs. On utilise `performance.now()` + `requestAnimationFrame`, et on met en pause sur `visibilitychange`. Une notification entrante ne doit jamais coûter une décision au joueur.

**Le budget de poids est dur.** `npm run budget` casse le build. Ne pas le contourner, ne pas relever les seuils sans en parler.

**Les hauteurs sont réservées.** La carte d'incident fait 340 px quoi qu'il arrive. Si un texte déborde, ce n'est pas la carte qui grandit, c'est le texte qui est trop long et le validateur de contenu aurait dû l'attraper.

**Ne jamais forcer un rechargement pendant un match.** Le service worker attend la fin de la partie.

---

## Ton du contenu et de l'interface

Si tu écris ou corriges du texte visible par le joueur :

- Pas d'emoji. Nulle part, jamais, y compris dans les messages d'erreur.
- Pas de point d'exclamation, sauf dans une parole rapportée, une fois par incident maximum.
- Pas de « Bravo », « Félicitations », « Oups », « Attention ! ». Le jeu ne commente pas, il constate.
- Pas de tutoiement du joueur dans l'interface système ; les textes d'incident, eux, s'adressent à lui en creux (« Le banc est déjà debout »).
- Les messages d'erreur disent ce qui s'est passé et ce qui se passe maintenant, en une phrase. « Score non enregistré, il sera renvoyé au prochain démarrage. »
- Registre : compte rendu de quotidien régional. Sec, précis, un peu désabusé.

Relis `03-contenu.md` avant d'écrire une seule ligne de contenu. Les cinq incidents rédigés sont le mètre étalon.

---

## Ce qu'on ne fera pas

Écrit ici pour que la question ne revienne pas :

- Pas de publicité, pas de tracking tiers, pas de pixel.
- Pas de compte obligatoire, jamais, à aucun moment.
- Pas d'énergie, pas de vies, pas de timer punitif, pas de notification push.
- Pas de joueur réel, pas de club réel, pas de compétition réelle, pas de logo réel.
- Pas de paiement en V0, V1 ou V2.
- Pas de mode multijoueur temps réel.
- Pas de version desktop réagencée : le desktop est le mobile dans un cadre.
