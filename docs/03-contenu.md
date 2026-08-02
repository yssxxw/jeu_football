# 03 — Contenu

## Volume V0

| Type | Quantité | Charge de rédaction |
|---|---|---|
| Incidents | **140** | ~11 h (4 min pièce en régime) |
| Clubs | **44** (5 pays fictifs) | 1 h 30 |
| Contextes de match | **24** | 40 min |
| Badges | **26** | fait, voir `02-game-design.md` |
| Mentions d'observateur | **6** | fait |
| Lignes de presse (écran de fin) | **34** | 1 h |
| Textes d'interface | ~60 chaînes | 1 h |

Total rédaction : **environ 16 heures**. C'est le vrai coût du jeu, pas le code. Si les deux semaines dérapent, c'est ici qu'il faut couper : 90 incidents suffisent pour V0 (voir l'encart de contestation en fin de `09-mise-en-ligne.md`).

### Répartition des 140 incidents

Par famille :

| Famille | Nombre | Remarque |
|---|---|---|
| `tacle` | 34 | le cœur du jeu, il en faut beaucoup pour que la constance ait du sens |
| `main` | 18 | la famille la plus discutée, donc la plus rentable en partage |
| `simulation` | 16 | |
| `contestation` | 14 | gestion humaine, souvent sans carton |
| `antijeu` | 12 | perte de temps, faute tactique |
| `duel_aerien` | 12 | |
| `hors_jeu` | 10 | ne pas en mettre plus : c'est du binaire, ça se joue mal |
| `provocation` | 12 | célébrations, altercations, gestes |
| `banc` | 12 | entraîneurs, remplaçants, quatrième arbitre |

Par palier de division (un incident peut appartenir à plusieurs paliers) :

| Paliers | Incidents disponibles |
|---|---|
| 0–2 (district / régional) | 45 |
| 3–5 (national / L2) | 62 |
| 6–8 (élite) | 71 |

Contrainte de tirage à respecter à la rédaction : pour chaque palier et chaque fenêtre de minutes, au moins **8 incidents éligibles**. Sinon les matchs se répètent au bout de trois parties et le jeu meurt là.

Par ambiguïté : **58 incidents `ambigu: true`**, tous marqués `paliers: [4..8]` ou plus haut. Un incident ambigu a une seule option à `1` et au moins deux à `0,7`.

---

## Nomenclature de l'univers

Cinq pays fictifs. Voir `01-concept.md` pour l'arbitrage licences.

**La Fédération (France-like)** — un préfixe (`AS`, `US`, `FC`, `Racing`, `Stade`, `Olympique`, `SC`, `Entente`) + un toponyme construit. Toponymes fabriqués par recombinaison de radicaux réels : *Ponté-rive, Vaux-Cerny, Ville-basse, Bourg-nac, Marnières, Ardières, Faubourg-Sainte-Croix, Cheylard, Aubercy, Montverne, Sault-les-Bains, Grangeneuve*.

**Riviera (Italie-like)** — nom de ville + `Calcio` / `AC` / `US` / année de fondation : *Ponteverde Calcio, Sestrano 1908, AC Bariva, Monteluce, US Cavalletti*.

**Alcázar (Espagne-like)** — `Real` / `CD` / `Atlético` + toponyme : *Real Alcázar de Nieva, CD Valmorena, Atlético Sagreda, Peñarrubia CF*.

**Ashmoor (Angleterre-like)** — toponyme + `Town` / `City` / `Rovers` / `United` / `FC` : *Ashgrove Town, Hesketh Rovers, Kirbymoor FC, Barnwell United, Dunthorpe City*.

**Nordhalle (Allemagne-like)** — `SV` / `TSV` / `FC` / `VfB` + toponyme + année : *SV Nordhalle 04, TSV Eichbrunn, VfB Rautenau, FC Steinmoos 1919*.

**Procédure de vérification obligatoire avant la mise en ligne :** passer les 44 noms générés dans une recherche web exacte. Tout nom qui renvoie un club existant (même amateur, même dissous) est remplacé. Cette vérification se fait à la main, une fois, et se documente dans `contenu/VERIFICATION.md` avec la date. Ce n'est pas du zèle : un club de district homonyme qui découvre son nom dans un jeu où un de ses joueurs se fait expulser, ça se règle mal.

### Noms de joueurs

Les incidents ne nomment presque jamais les joueurs. Ils disent « le latéral », « le numéro 6 », « leur attaquant ». C'est un choix de production autant que de style : ça évite 400 noms à inventer, ça évite les collisions, et ça sonne comme un vrai compte rendu d'arbitre, qui ne connaît pas les noms et note les numéros.

Exception : **le capitaine**, désigné par son numéro, et les entraîneurs, désignés par leur fonction. Les joueurs récurrents nommés sont un chantier V2.

### Structure d'un club

```json
{
  "id": "ponterive",
  "nom": "AS Pontérive",
  "abrege": "PON",
  "ville": "Pontérive",
  "pays": "federation",
  "paliers": [0, 1, 2, 3],
  "temperament": 1,
  "surnom": "les Rivois",
  "couleurs": ["#1B3A6B", "#FFFFFF"]
}
```

`temperament` : 0 calme, 1 chaud, 2 volcanique. Affecte la dérive de contrôle après la 45ᵉ (voir `02-game-design.md` §2). Répartition visée sur les 44 clubs : 14 / 20 / 10.

---

## Structure d'un incident

```json
{
  "id": "tacle_semelle_touche",
  "famille": "tacle",
  "gravite": 4,
  "paliers": [3, 4, 5, 6, 7, 8],
  "fenetre": "46-65",
  "ambigu": false,
  "tendu": false,
  "var_eligible": true,
  "texte": "…",
  "options": [
    {
      "libelle": "Laisser jouer",
      "severite": 0,
      "justesse": 0,
      "dControle": -18,
      "consequence": "…",
      "defaut": true
    }
  ],
  "var": {
    "revelation": "…",
    "maintien": { "consequence": "…" },
    "rectification": { "libelleCorrige": "…", "consequence": "…" }
  }
}
```

**Règles de rédaction, non négociables :**

1. `texte` : entre 45 et 90 mots. En dessous, on n'a pas assez d'informations pour juger. Au-dessus, le chrono devient injouable.
2. Le texte donne **tous les éléments nécessaires** pour trancher, sans jamais donner la réponse. Si un détail est décisif (point d'impact, ballon joué ou non, position du pied), il est dans le texte — ou alors il est réservé à la révélation VAR, et dans ce cas l'incident est marqué `var_eligible`.
3. Présent ou passé composé, jamais de futur, jamais de conditionnel. On raconte ce qui vient d'arriver.
4. Le texte se termine par ce qui met la pression : le banc debout, la tribune, le capitaine qui arrive. Pas par une question.
5. `consequence` : une à deux phrases, jamais plus. Elle décrit une réaction, pas un jugement. Jamais « bonne décision » ni « erreur ».
6. Trois options minimum, quatre maximum. Toujours dans l'ordre croissant de sévérité.
7. Aucun emoji. Aucune majuscule d'emphase. Aucun point d'exclamation dans le texte d'incident (autorisé dans les paroles rapportées, une seule fois par incident).
8. `defaut: true` sur exactement une option : celle qui arrive quand le chrono expire. C'est presque toujours « laisser jouer » — parce que ne rien faire, c'est laisser jouer.

---

## Les cinq exemples rédigés

Ces cinq-là sont le mètre étalon. Tout le reste du contenu doit sonner comme ça. S'ils sont dans le repo tels quels, ils servent aussi de tests de non-régression pour le schéma.

---

### 1. `tacle_semelle_touche` — famille `tacle`, gravité 4

> Le latéral de Pontérive a pris trois mètres à son vis-à-vis depuis dix minutes, et ça commence à se voir dans les tribunes. Le milieu adverse sort du bloc, arrive avec deux temps de retard, semelle en avant, à trente centimètres de la ligne de touche. Il touche le ballon en premier. Il touche la cheville juste après. Le garçon reste au sol. Le banc de Pontérive est déjà debout.

| Option | Sév. | Justesse | ΔContrôle | Conséquence |
|---|---|---|---|---|
| Laisser jouer *(défaut)* | 0 | 0 | −18 | Le jeu continue trois secondes puis s'arrête tout seul, personne ne joue le ballon. Les deux bancs vous regardent. |
| Faute, rien de plus | 1 | 0,4 | −9 | Vous rendez le ballon. Le capitaine de Pontérive vient chercher une explication et n'a pas l'air de la trouver. |
| Avertissement | 2 | 1 | +4 | Le joueur prend le carton sans discuter. Son entraîneur le remplace huit minutes plus tard. |
| Expulsion | 4 | 0,4 | −6 | Villebasse joue à dix. Le banc explose. Le stade se réveille, et pas dans le bon sens. |

`var_eligible: true`
**Révélation VAR :** « Le ralenti est net. Le ballon part d'abord, la semelle arrive après, pied à hauteur de cheville, appui en extension. Il n'y a pas de contrôle du geste. »
Maintien → « La commission reverra l'image jeudi. » Rectification → « Vous revenez vers le joueur et vous sortez le jaune. Personne ne comprend pourquoi ça a pris quarante secondes. »

---

### 2. `contact_surface_appui` — famille `tacle`, gravité 5, `ambigu: true`, paliers 5–8

> Deuxième poteau, 78ᵉ, 1-1. Le centre est trop long, l'attaquant de Villebasse le rattrape en pivotant. Le défenseur ferme, tend la jambe, l'attaquant part au sol dans un cri que la moitié du stade a entendu. Il y a eu contact, ça ne fait aucun doute. Où exactement, c'est autre chose : le duel commence dehors et finit dedans. Le capitaine de Villebasse court déjà vers vous, les deux bras en l'air.

| Option | Sév. | Justesse | ΔContrôle | Conséquence |
|---|---|---|---|---|
| Laisser jouer *(défaut)* | 0 | 0,7 | −12 | Corner. Villebasse hurle pendant vingt secondes puis se replace. Vous entendez le banc jusqu'à la fin. |
| Coup franc, hors de la surface | 1 | **1** | −2 | Coup franc à un mètre de la ligne. Personne n'est content, ce qui est en général bon signe. |
| Penalty | 1 | 0,4 | −8 | Vous pointez le point. Transformé (76 %). Pontérive ne vous adressera plus la parole du match. |
| Penalty et avertissement pour l'attaquant | 2 | 0 | −20 | Vous sifflez penalty puis vous avertissez celui qui l'a obtenu. Plus personne ne sait ce que vous avez vu. |

`var_eligible: true`
**Révélation VAR :** « Le pied d'appui du défenseur est à vingt centimètres à l'extérieur de la ligne. Le contact se produit là. La chute a lieu dedans. »

*Note de conception : la quatrième option existe pour une seule raison, elle est le piège du joueur qui panique et essaie de contenter tout le monde. Elle vaut 0. Il en faut une par match environ, pas plus.*

---

### 3. `capitaine_insiste` — famille `contestation`, gravité 3, paliers 2–8

> Vous venez de refuser un coup franc à l'entrée de la surface et le capitaine de Bourgnac ne lâche pas. Il vous suit sur six mètres, ni insultes ni contact, mais il parle fort et il pointe le sol du doigt à chaque phrase. Le stade voit très bien la scène. Ses coéquipiers ne viennent pas le chercher, ce qui est mauvais signe : ça veut dire qu'ils sont d'accord avec lui.

| Option | Sév. | Justesse | ΔContrôle | Conséquence |
|---|---|---|---|---|
| Continuer à marcher *(défaut)* | 0 | 0,4 | −7 | Il vous suit encore trois mètres, puis renonce. Il recommencera. |
| S'arrêter, le regarder, lui parler dix secondes | 1 | **1** | +8 | Il finit sa phrase et il s'en va. Vous n'aurez plus de problème avec lui. |
| Avertissement | 2 | 0,7 | −3 | Il prend le carton et se tait. Son entraîneur commence à protester à sa place. |
| Avertissement et le renvoyer dans son camp | 2 | 0,4 | −10 | Le geste est de trop. Ce qui était une discussion devient un incident. |

*Pas d'option d'expulsion : il n'y a rien qui la justifie, et proposer une option manifestement absurde apprend au joueur à ne pas lire.*

---

### 4. `perte_de_temps_gardien` — famille `antijeu`, gravité 2, paliers 3–8, fenêtre 81-90+4

> 88ᵉ, Ashgrove mène 1-0 à l'extérieur. Leur gardien met neuf secondes à se relever d'une prise de balle qu'il n'a pas subie, replace ses gants, regarde le banc. C'est le troisième dégagement du même acabit en dix minutes. Vous l'avez déjà prévenu une fois, à la 76ᵉ, sans carton. Le kop d'en face compte à voix haute.

| Option | Sév. | Justesse | ΔContrôle | Conséquence |
|---|---|---|---|---|
| Ajouter du temps, ne rien dire *(défaut)* | 0 | 0,4 | −6 | Vous lèverez cinq minutes au tableau. Ça ne changera rien à ce qu'il fait. |
| Nouvel avertissement verbal | 1 | 0,4 | −4 | Il hoche la tête. Le dégagement suivant prend onze secondes. |
| Avertissement | 2 | **1** | +6 | Le carton tombe. Le rythme reprend immédiatement. Le banc d'Ashgrove trouve ça sévère, tout le monde s'en fiche. |

*Le calcul de constance est actif ici : si le joueur a laissé passer un `antijeu` de gravité 2 ou 3 plus tôt sans rien faire, avertir ici crée une incohérence. C'est exactement le genre de piège que le jeu doit tendre.*

---

### 5. `celebration_kop_adverse` — famille `provocation`, gravité 3, paliers 4–8

> Le but égalisateur vient de tomber à la 84ᵉ. Le buteur de Sestrano traverse la moitié du terrain, escalade la barrière publicitaire et va célébrer à trois mètres du parcage adverse, le doigt sur l'écusson. Deux stadiers arrivent en courant. Un gobelet part des tribunes, tombe court. Le match est arrêté depuis vingt secondes et personne ne regarde le ballon.

| Option | Sév. | Justesse | ΔContrôle | Conséquence |
|---|---|---|---|---|
| Le laisser finir, reprendre le jeu *(défaut)* | 0 | 0 | −16 | Il reste encore dix secondes. Un deuxième gobelet part, plus précis. |
| Aller le chercher, reprise immédiate | 1 | 0,7 | −2 | Vous le tirez par le maillot vers le rond central. Le parcage vous siffle, le jeu repart. |
| Avertissement | 2 | **1** | +5 | Carton. Le règlement est le règlement, tout le monde le sait, y compris lui. Le calme revient en quinze secondes. |
| Avertissement et rappel au capitaine | 2 | 0,7 | +2 | Vous doublez le message. C'est long, mais rien n'ira plus loin ce soir. |

---

## Lignes de presse

Une seule ligne s'affiche en bas de la feuille de match, tirée selon le couple (tranche de note, profil dominant). Le profil dominant est calculé ainsi :

```
si cartons_rouges ≥ 1 et justesse < 60      → "sanguin"
sinon si cartons_total ≤ 1                  → "permissif"
sinon si incoherences ≥ 2                   → "illisible"
sinon si nonDecidees ≥ 2                    → "hesitant"
sinon                                       → "neutre"
```

Cinq profils × six tranches de note = 30 lignes, plus 4 lignes spéciales (match arrêté, note 100, première partie, match du jour). Exemples :

- *neutre / 80-91* — « Arbitrage sans histoire, deux décisions litigieuses, aucune qui change le résultat. »
- *sanguin / 40-54* — « Trois cartons en douze minutes de jeu effectif, et un match qui n'a jamais existé. »
- *permissif / 68-79* — « Il a laissé jouer, parfois trop. Les joueurs ont fini par s'en charger eux-mêmes. »
- *illisible / 55-67* — « Difficile de dire ce qu'il sanctionnait. Les deux bancs ont posé la même question. »
- *hesitant / 0-39* — « Le match a duré une heure et demie sans arbitre. »
- *spécial, match arrêté* — « Interrompu à la 71ᵉ. Le rapport dira le reste. »

Ton de ces lignes : celui d'un compte rendu de quotidien régional, pas d'un commentaire de plateau. Sec, court, un peu méchant.

---

## Ce qu'on ne rédige pas en V0

Coupé volontairement, pour mémoire :

- Les mi-temps et causeries. Le match est continu, il n'y a pas de pause écran.
- Le dialogue avec les assistants et le quatrième arbitre. Belle idée, chantier V2.
- Les joueurs récurrents à réputation. V2, et ça demande un système de mémoire inter-parties.
- Les compétitions à format (coupe, phases de groupe). V2.
