# 02 — Game design

Tout ce qui est chiffré ici est normatif. Si un nombre te paraît faux pendant l'implémentation, ne le change pas : signale-le et on l'ajuste dans ce fichier, en un seul endroit (`src/lib/engine/equilibrage.ts` réexporte ces constantes, rien d'autre ne les redéfinit).

---

## 1. La boucle, écran par écran

### Écran 0 — Arrivée (`/`)

Il n'y a pas de page d'accueil. Le domaine ouvre directement sur la carte du match.

```
        SIFFLET
   ────────────────────
   DISTRICT 2 · match 1

   AS PONTÉRIVE
        reçoit
   US VILLEBASSE

   Fin de saison. Les deux
   équipes jouent le maintien.
   Arbitre : vous.

   [  COUP D'ENVOI  ]

   le match du jour →
```

Un seul bouton actionnable au pouce, en bas, 56 px de haut. Le texte de contexte fait deux lignes maximum et vient du tirage (voir §6). Aucun tutoriel. La première option du premier incident sert de tutoriel : elle est toujours évidente.

Temps entre le DNS et ce bouton cliquable : cible < 1,8 s en 4G. Budget détaillé dans `05-architecture.md`.

### Écran 1 — Incident (× 12)

C'est 95 % du temps de jeu. Structure verticale, de haut en bas :

```
▓▓▓▓▓▓▓▓▓▓▓░░░░░  ← jauge de contrôle, 6 px, pleine largeur
63'   PONTÉRIVE 1 – 1 VILLEBASSE     ← minute + score, mono, 12 px

   Le latéral de Pontérive a pris
   trois mètres à son vis-à-vis
   depuis dix minutes, et ça commence
   à se voir dans les tribunes. Le
   milieu de Villebasse sort du bloc,
   arrive avec deux temps de retard,
   semelle en avant. Le garçon reste
   au sol. Le banc adverse est debout.

   ┌───────────────────────────┐
   │  Laisser jouer            │
   ├───────────────────────────┤
   │  Faute, rien de plus      │
   ├───────────────────────────┤
   │  Avertissement            │
   ├───────────────────────────┤
   │  Expulsion                │
   └───────────────────────────┘
        ◜◝ anneau de chrono ◟◞
```

Le chrono est un anneau fin qui se vide autour du bord de l'écran (pas un compteur de chiffres : on ne veut pas que le joueur regarde le chrono, on veut qu'il le sente). Durée selon la division, table §5.

**Le chrono mesure le temps de décision, pas le temps de lecture.** Un incident fait 45 à 90 mots : six secondes ne suffisent pas à le lire, et faire courir le chrono pendant la lecture reviendrait à noter la vitesse de lecture plutôt que l'arbitrage. L'incident s'affiche donc avec l'anneau plein et immobile pendant un **temps de lecture**, puis le chrono démarre.

| Constante | Valeur |
|---|---|
| Par mot du texte | 220 ms (≈ 270 mots par minute) |
| Par mot de libellé d'option | 120 ms (un libellé se parcourt, il ne se lit pas comme une phrase) |
| Plancher | 3 s |
| Plafond | 18 s |

Le compte porte sur le texte de l'incident **et** sur les libellés des options : le joueur doit avoir lu ses choix, pas seulement la situation. Les options sont cliquables dès le premier instant — qui a compris tout de suite n'attend pas, et rien n'oblige à subir la phase de lecture.

Sur le contenu de V0-4, ça donne 12 à 18 s de lecture selon l'incident, soit 18 à 24 s par incident chrono compris, et **un match de 4,5 minutes** — dans la fourchette de 3 à 6 minutes de `01-concept.md`. Avant ce changement, un match durait 1,5 minute et le texte était illisible dans le temps imparti.

Un incident qui atteint le plafond de 18 s est un incident trop long : c'est au contenu de bouger, pas au plafond.

À l'expiration du chrono : l'option marquée `defaut: true` est jouée automatiquement, l'écran flashe une fois en rouge sombre (120 ms), et un compteur interne `nonDecidees++`.

### Écran 2 — Conséquence (1,4 s, non interruptible sauf tap)

L'incident se réduit à une ligne, la décision s'affiche en jaune ou rouge selon le carton, et une phrase de conséquence apparaît :

> **AVERTISSEMENT — n° 6, Villebasse**
> Le banc de Pontérive trouve ça léger. Le joueur au sol se relève sans aide.

La jauge de contrôle s'anime pendant cette séquence (320 ms, `cubic-bezier(.2,.8,.2,1)`). Un tap passe à la suite.

### Écran 2bis — VAR (0 à 2 fois par match, divisions 5+)

Écran plein noir, texte en mono blanc, aucun chrono.

```
   ASSISTANCE VIDÉO
   ─────────────────
   Le ralenti montre que le
   contact a lieu vingt
   centimètres avant la ligne
   de surface. Le pied d'appui
   du défenseur est dehors.

   [ Je maintiens ]
   [ Je rectifie  ]
```

Pas de chrono ici : c'est la seule respiration du match, et c'est voulu. Voir arbitrage §8.3.

### Écran 3 — Fin de match

Transition d'un noir sec (250 ms), coup de sifflet final (son court, coupable si le son est désactivé — voir §9), puis la feuille de match se compose du haut vers le bas en 900 ms : d'abord l'affiche et le score, puis le nombre qui s'incrémente de 0 à la note en 700 ms (`easeOutExpo`), puis la mention, puis l'action litigieuse, puis les badges.

Trois actions en bas : `PARTAGER` (primaire), `REJOUER` (secondaire), `DÉTAIL DES 12 DÉCISIONS` (tertiaire, ouvre un panneau).

### Écran 4 — Détail (optionnel, mais c'est lui qui fait rejouer)

Liste des douze incidents. Pour chacun : minute, famille, votre décision, la justesse obtenue (`juste` / `défendable` / `discutable` / `erreur`), et en une phrase pourquoi. C'est le seul endroit du jeu où on explique. Le ton reste sec :

> **31ᵉ — main dans la surface** — vous avez sifflé penalty. *Erreur.* Le ballon vient du genou d'un partenaire à moins d'un mètre. Bras le long du corps.

---

## 2. Les trois mesures

### Contrôle du match — visible, 0 à 100

La seule jauge affichée. Démarre selon la division (table §5), typiquement 70.

Chaque option d'incident porte un `dControle` compris dans **[−25, +10]**. Après application, deux dérives passives :

- si les **deux dernières** décisions ont une justesse ≥ 0,7 → **+2**
- si les **deux dernières** décisions ont une justesse ≤ 0,4 → **−4**
- tempérament du club à domicile (0 calme, 1 chaud, 2 volcanique) : **−0, −1, −2** par incident après la 45ᵉ minute

Bornage `[0, 100]`.

**Seuils :**

| Contrôle | Effet |
|---|---|
| ≥ 80 | rien (état nominal, jauge blanche) |
| 40–79 | jauge ambre |
| < 25 | jauge rouge + les incidents restants sont tirés dans le pool `tendu` (gravité ≥ 3) |
| = 0 | **fin anticipée immédiate**. Le match s'arrête à la minute courante. Note plafonnée à 35. Badge `Le match n'est pas allé au bout`. |

Le plafond à 100 sert : au-delà, on ne gagne rien à être irréprochable tôt. C'est délibéré, ça évite de « banker » du contrôle en début de match pour se permettre n'importe quoi ensuite.

### Justesse — cachée jusqu'à la fin, 0 à 100

Chaque option porte une valeur `justesse` prise dans **{0 ; 0,4 ; 0,7 ; 1}** :

| Valeur | Libellé affiché | Sens |
|---|---|---|
| 1 | juste | la décision attendue |
| 0,7 | défendable | un arbitre correct peut la prendre, personne ne s'en offusque |
| 0,4 | discutable | pas une faute professionnelle, mais ça se voit |
| 0 | erreur | ça se retrouve dans le résumé de l'émission du dimanche soir |

Chaque incident porte une `gravite` de 1 à 5 (poids de l'action dans le match).

```
Justesse = 100 × Σ(justesse_i × gravite_i) / Σ(gravite_i)
```

### Constance — cachée, 0 à 100

C'est le critère que les vrais observateurs regardent en premier, et c'est ce qui rend le jeu plus profond qu'un QCM. Vous n'êtes pas jugé seulement sur chaque décision isolée, mais sur le fait de siffler la même chose de la même façon pendant 90 minutes.

Chaque décision a une **sévérité** :

| Sévérité | Décision |
|---|---|
| 0 | laisser jouer |
| 1 | faute sans sanction |
| 2 | avertissement |
| 3 | second avertissement (expulsion indirecte) |
| 4 | expulsion directe |

Chaque incident appartient à une **famille** : `tacle`, `main`, `simulation`, `contestation`, `antijeu`, `duel_aerien`, `hors_jeu`, `provocation`, `banc`.

> Il y a **incohérence** entre deux incidents A et B si : même famille, `|gravite_A − gravite_B| ≤ 1`, et `|severite_A − severite_B| ≥ 2`.

```
Constance = max(0, 100 − 25 × nombre_d_incoherences)
```

Un match typique contient 3 à 5 paires comparables. Deux incohérences vous coûtent 10 points de note finale : c'est lourd, c'est fait exprès.

---

## 3. La VAR

Disponible à partir de la division 5 (Ligue 2). En dessous, elle n'existe pas — ce n'est pas une simplification, c'est la réalité, et ça sert la courbe de difficulté : les divisions basses pardonnent moins parce que rien ne vous rattrape, mais les incidents y sont plus lisibles.

**Déclenchement.** Après un incident où toutes ces conditions sont réunies :
- l'incident porte `var_eligible: true`
- votre justesse sur cet incident est ≤ 0,4
- `gravite ≥ 3`
- le quota de VAR du match n'est pas épuisé (1 en division 5, 2 au-delà)
- tirage PRNG < **0,70**

**Résolution.**

| Choix | Justesse de l'incident | Note | Contrôle |
|---|---|---|---|
| Je rectifie | forcée à **0,9** | **−2** | **−3** |
| Je maintiens | inchangée | **−8** | **−12** |

Rectifier ne remonte pas à 1 : vous vous êtes trompé, la vidéo a corrigé, ce n'est pas la même chose que d'avoir vu juste. Maintenir alors qu'on a tort est le choix le plus puni du jeu, et c'est correct : c'est aussi le plus puni dans la vraie vie.

Cas particulier : si la VAR se déclenche et que votre décision initiale était en fait juste (`justesse ≥ 0,7`), elle ne se déclenche pas. On ne piège pas le joueur.

---

## 4. La note finale

```
Note_brute = 0,55 × Justesse
           + 0,25 × Controle_final
           + 0,20 × Constance

Malus = 3 × nonDecidees            (plafonné à 12)
      + 2 × rectifications_VAR
      + 8 × maintiens_VAR_errones

Note = arrondi( borne(Note_brute − Malus, 0, 100) )

si match_arrete : Note = min(Note, 35)
```

Pondération assumée : la justesse pèse plus que tout, mais elle ne suffit pas. Un arbitre qui a tout bon et qui a perdu le vestiaire plafonne à 79. Un arbitre irréprochable techniquement mais incohérent plafonne à 80. Il faut les trois pour dépasser 90.

### Mentions de l'observateur

| Note | Mention |
|---|---|
| 92–100 | On n'a pas parlé de vous. |
| 80–91 | Match bien tenu. |
| 68–79 | Passable. Deux ou trois erreurs sans conséquence. |
| 55–67 | Débordé par moments. |
| 40–54 | Le match vous a échappé. |
| 0–39 | Rapport transmis à la commission. |

La mention 92+ est la meilleure et c'est celle qui ressemble le moins à un compliment. C'est le cœur du ton du jeu : le meilleur arbitrage est celui qu'on oublie. Ne pas la remplacer par « Excellent ! ».

### Distribution mesurée

Calibrée par simulation (`npm run simuler`, 10 000 parties par agent et par division, ticket V0-9). **Ces médianes sont celles de la division 6 (Ligue 1)**, division du match du jour — la table le dit maintenant explicitement, parce qu'aucune division ne tenait les cibles de la version précédente et que rien n'indiquait laquelle visait.

| Profil | Note médiane | Tolérance |
|---|---|---|
| Joueur au hasard | 35 | ±4 |
| Joueur qui connaît les règles du foot | 77 | ±4 |
| Joueur qui a compris la constance | 80 | ±4 |
| Parfait sur la justesse mais chrono raté 2× | 83 | ±4 |
| Parfait | 95 | ±4 |

Trois écarts avec la table d'origine, tous assumés après mesure :

**Le jeu parfait plafonne à 96, pas à 100.** Un joueur qui choisit toujours l'option `justesse: 1` obtient 81 de constance, parce que cinq couples d'incidents ont des bonnes réponses mutuellement incohérentes au sens du §2 — même famille, gravités à un d'écart, sévérités à deux ou plus. Un carton rouge sur un tacle de dernier défenseur et un jaune sur un tacle en touche sont deux décisions correctes, mais la règle de constance les compare parce qu'elle assimile la gravité à la similitude de l'action. Le 100 reste atteignable, sur un tirage qui ne contient aucun de ces couples. C'est accepté en l'état.

**La constance sépare peu.** Trois points entre « connaît le foot » et « a compris la constance », là où la table d'origine en annonçait douze. Même cause. Si on veut creuser cet écart un jour, le levier est `CONSTANCE.ecartGraviteMax`, pas les `dControle` du contenu — les baisser ferait descendre les deux profils ensemble.

**Le profil « première partie, joueur normal » (61) est retiré.** Aucun des cinq agents de V0-9 ne le représente, et il n'a donc jamais été mesuré. À reprendre avec de vrais joueurs, pas avec un agent inventé pour l'occasion.

Le levier de calibrage reste le même : ajuster **uniquement** le `dControle` moyen des options `justesse: 0,7` — jamais les pondérations de la note.

---

## 5. Divisions et difficulté

Neuf paliers. On démarre en District 2. On ne peut pas descendre en dessous de 0, on ne peut pas monter au-dessus de 8.

| # | Division | Chrono | % incidents ambigus | Gravité moy. | Contrôle départ | VAR |
|---|---|---|---|---|---|---|
| 0 | District 2 | 8,0 s | 10 % | 1,8 | 78 | non |
| 1 | District 1 | 8,0 s | 15 % | 2,0 | 76 | non |
| 2 | Régional | 7,0 s | 20 % | 2,3 | 74 | non |
| 3 | National 3 | 7,0 s | 28 % | 2,6 | 72 | non |
| 4 | National | 6,0 s | 35 % | 2,9 | 70 | non |
| 5 | Ligue 2 | 6,0 s | 42 % | 3,2 | 68 | 1 max |
| 6 | Ligue 1 | 6,0 s | 50 % | 3,5 | 66 | 2 max |
| 7 | Coupe d'Europe | 5,0 s | 58 % | 3,8 | 64 | 2 max |
| 8 | International | 5,0 s | 65 % | 4,1 | 62 | 2 max |

« Incident ambigu » = incident dont la meilleure option vaut `1` mais dont au moins deux autres options valent `0,7`. En district, on vous demande de voir un tacle par derrière. En international, on vous demande de choisir entre trois lectures défendables de la même image.

**Montée / descente**, appliquée immédiatement après le match :

```
Note ≥ 72  →  division + 1
Note ≤ 48  →  division − 1
sinon      →  sur place
```

Trajectoire minimale District 2 → International : 8 matchs parfaits. Trajectoire réaliste mesurée en simulation : 19 matchs. Durée : environ 75 minutes de jeu cumulées, étalées sur une à trois semaines. C'est la bonne longueur pour un jeu gratuit sans monétisation.

Une descente n'efface rien : les badges, la meilleure note et la division maximale atteinte sont conservés à vie. On ne peut perdre que sa position courante.

---

## 6. Composition d'un match

Tout est dérivé de la seed. Même seed = même match, même ordre, mêmes chronos, mêmes tirages de conséquence. Aucun appel à `Math.random` dans le moteur.

**Étape 1 — les clubs.** Deux clubs tirés dans le pool de la division (`clubs.json`, filtré par `paliers`), distincts, l'un à domicile. Le tempérament du club à domicile module la dérive de contrôle (§2).

**Étape 2 — le contexte.** Une ligne tirée parmi 24 (`contextes.json`), compatible avec la division : maintien, derby, montée, match en retard, huis clos partiel, retour d'un ancien joueur. Le contexte n'a **aucun effet mécanique** sauf trois d'entre eux : `derby` (+1 tempérament), `huis clos` (−1 tempérament), `match couperet` (−4 contrôle de départ).

**Étape 3 — les douze minutes.** Tirées dans six fenêtres fixes, une minute par créneau, sans doublon :

| Fenêtre | Nombre d'incidents |
|---|---|
| 3–15 | 2 |
| 16–30 | 2 |
| 31–45+2 | 2 |
| 46–65 | 3 |
| 66–80 | 2 |
| 81–90+4 | 1 |

**Étape 4 — les incidents.** Pour chaque créneau, tirage dans le pool filtré par : division compatible (`paliers`), fenêtre compatible (`fenetre`), famille pas déjà utilisée plus de 2 fois dans ce match, id absent des 3 derniers matchs joués (cooldown local, ignoré pour le match du jour qui doit rester identique pour tout le monde). Le taux d'incidents `ambigu: true` doit respecter le pourcentage de la table §5 à ±1 incident près ; si le tirage ne le permet pas, on force le dernier créneau.

**Étape 5 — le score du match.** Il démarre à 0-0 et n'évolue que par vos décisions. Un penalty accordé se transforme avec une probabilité de **0,76** (tirage PRNG). Un but hors-jeu que vous avez validé compte. Un joueur expulsé donne +0,12 de probabilité de but à l'adversaire sur chaque incident restant de type `duel_aerien` ou `hors_jeu`. Rien d'autre ne fait bouger le score.

C'est peu, et c'est volontaire : le score n'est pas un enjeu, c'est un décor qui prouve que vos décisions ont pesé. Un 3-2 obtenu à coups de penalties inventés est en soi une information sur votre match.

---

## 7. Rétention

### Le match du jour

Seed = `SIFFLET-{YYYY-MM-DD}`. Même match pour toute la planète, joué à la division 6 (Ligue 1) quelle que soit votre progression — c'est important, sinon la comparaison des pourcentages n'a aucun sens. Une seule tentative comptabilisée. Rejouable ensuite en mode libre, la feuille de match porte alors la mention `HORS CLASSEMENT`.

### Série

Nombre de jours consécutifs où le match du jour a été joué. Un **joker** dans la poche couvre un jour manqué, automatiquement, sans rien demander. Il se régénère après 7 jours joués. Maximum un joker stocké.

Pas de notification, pas de compte à rebours anxiogène, pas de perte de progression si la série casse. La série est un compteur, pas une laisse.

### Badges — 26 en V0

| Id | Nom | Condition |
|---|---|---|
| `premier_match` | Licence obtenue | terminer un match |
| `sans_carton` | Le match s'est joué | 0 carton, note ≥ 70 |
| `rouge_juste` | Il n'y avait rien d'autre à faire | expulsion directe avec justesse 1 |
| `rouge_injuste` | Il rentre au vestiaire à cause de vous | expulsion directe avec justesse 0 |
| `douze_sur_douze` | Aucune ambiguïté | justesse = 100 |
| `match_arrete` | Le match n'est pas allé au bout | contrôle à 0 |
| `remontada` | Repris en main | contrôle passé sous 20 puis fini au-dessus de 60 |
| `constant` | Même sifflet pendant 90 minutes | constance = 100 sur 4 paires comparables ou plus |
| `girouette` | Personne n'a compris votre ligne | 3 incohérences ou plus |
| `avale_sifflet` | Vous avez avalé votre sifflet | 3 décisions non prises |
| `var_humble` | La vidéo avait raison | 2 rectifications dans le même match |
| `var_teteu` | Vous ne l'avez pas regardée | 2 maintiens erronés dans le même match |
| `montee_1` | Régional | atteindre la division 2 |
| `montee_2` | Le monde professionnel | atteindre la division 4 |
| `montee_3` | Ligue 1 | atteindre la division 6 |
| `montee_4` | Le badge FIFA | atteindre la division 8 |
| `ascenseur` | Trois montées de suite | 3 matchs consécutifs à 72+ |
| `chute` | Trois descentes de suite | 3 matchs consécutifs à 48− |
| `serie_7` | Une semaine | série de 7 |
| `serie_30` | Un mois | série de 30 |
| `derby` | Derby tenu | note ≥ 80 sur un contexte derby |
| `dernier_geste` | À la dernière minute | décision de gravité 5 après la 88ᵉ, justesse 1 |
| `penalty_refuse` | Vous avez laissé jouer | ne pas siffler un penalty réclamé, avec justesse 1 |
| `quatre_jaunes` | Le carnet était plein | 4 avertissements ou plus, note ≥ 70 |
| `mention_max` | On n'a pas parlé de vous | note ≥ 92 |
| `cent` | Rien à redire | note = 100 |

Aucun badge n'est monnayable, aucun ne débloque de contenu. Ce sont des lignes sur une carte d'arbitre.

---

## 8. Quatre arbitrages, et ce que j'ai jeté à chaque fois

### 8.1 — Le chrono de six secondes

**Ce que je jette :** les incidents longs, une partie de l'accessibilité, et la possibilité de réfléchir. Un texte d'incident ne peut pas dépasser 90 mots, ce qui interdit les mises en situation riches façon Destiny Eleven.

**Ce que je ne jette plus :** le confort de lecture. La première version faisait courir le chrono dès l'affichage du texte, ce qui rendait le jeu injouable — six secondes pour lire soixante mots et choisir. Le temps de lecture du §1 corrige ça sans rien enlever à la contrainte : on décide toujours en six secondes, mais on décide en ayant lu.

**Ce que je gagne :** la seule chose qui fait la différence entre arbitrer et commenter. Sans chrono, le jeu est un quiz de règlement et il n'y a aucune raison de le rejouer. Avec chrono, on se trompe *en sachant* qu'on se trompe, et c'est ça qui donne envie de recommencer.

**Rattrapage :** option « sans chrono » dans les réglages, disponible dès le premier écran de réglages, qui retire le malus de non-décision. Les parties sans chrono sont exclues du classement et la feuille de match porte la mention `SANS CHRONO`. Ce n'est pas une punition, c'est une honnêteté vis-à-vis du classement.

### 8.2 — Une seule jauge visible

**Ce que je jette :** la lisibilité. Le joueur ne sait pas s'il est bon avant la fin. Des gens vont trouver ça frustrant, et ils auront raison.

**Ce que je gagne :** le verdict final devient une révélation au lieu d'une confirmation, et le contrôle du match devient la seule information à surveiller — donc la tension se concentre sur un seul objet à l'écran, ce qui est impératif en portrait au pouce. Et c'est fidèle : un arbitre ne connaît jamais sa note pendant le match.

### 8.3 — Pas de chrono sur l'écran VAR

**Ce que je jette :** la cohérence de la contrainte. On a passé tout le match à dire « décide vite » et là on laisse respirer.

**Ce que je gagne :** un contraste de rythme. Douze incidents à 6 secondes d'affilée, c'est une bouillie ; le joueur sature vers l'incident 8. La VAR casse la cadence exactement une ou deux fois, au moment le plus chaud. C'est le seul moment du jeu où on pense au lieu de réagir, et il vaut cher pour cette raison.

### 8.4 — Il existe une bonne réponse

**Ce que je jette :** la vérité du métier. L'arbitrage est réellement ambigu, et prétendre le contraire est une simplification que des connaisseurs vont me reprocher.

**Ce que je gagne :** un jeu notable. Sans vérité, pas de note, pas de classement, pas de comparaison, pas de partage — donc pas de jeu.

**Rattrapage :** le palier `0,7` « défendable ». Sur un incident ambigu, deux ou trois options valent 0,7 et une seule vaut 1. Le détail de fin de match dit « défendable », jamais « faux », sur ces options-là. Et l'écran de comparaison avec les autres joueurs est là précisément pour dire : la vérité du jeu n'est pas la vérité du foot.

---

## 9. Détails qui ne sont pas négociables

- **Son coupé par défaut.** Le jeu s'ouvre souvent au bureau ou dans le métro. Un bouton son en haut à droite, état mémorisé. Trois sons seulement : sifflet court (décision), sifflet long (fin), rumeur de foule sourde en boucle basse (activable). Poids total < 40 Ko en `.webm` opus.
- **Aucun écran de chargement entre deux incidents.** Le contenu du match entier est calculé au coup d'envoi et tenu en mémoire.
- **Le bouton retour du navigateur ne quitte pas le match.** Il ouvre une confirmation « abandonner le match ? ». Un abandon compte comme un match perdu à 0 : sinon on relance jusqu'à obtenir un bon tirage.
- **Pas de menu.** Réglages, mentions et « comment ça marche » vivent dans un panneau accessible depuis l'icône en haut à gauche, jamais dans une page dédiée.
- **Le premier incident de la toute première partie est toujours le même** (`tacle_intro`, gravité 2, réponse évidente, chrono à 10 s). C'est le tutoriel et il ne se voit pas.
