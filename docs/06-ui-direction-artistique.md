# 06 — UI et direction artistique

## 1. Le parti pris

Le jeu n'a pas l'air d'un jeu. Il a l'air d'**une feuille de match** : un document administratif, imprimé, tamponné, rempli à la main par quelqu'un qui a autre chose à faire. Fond noir de vestiaire, papier crème au centre, et le jaune et le rouge n'apparaissent que quand un carton sort.

Ce que ça écarte explicitement : le vert pelouse en aplat, les dégradés, les ombres portées douces, les cartes arrondies à 16 px, les illustrations de ballon, les silhouettes de joueurs, tout ce qui ressemble à une application de paris sportifs. Le vert existe dans le jeu, mais uniquement en texture, presque noir, et jamais comme couleur de marque.

Test de validation de la DA : une capture d'écran isolée, sans logo, doit être reconnaissable. Si elle pourrait être une autre application, c'est raté.

---

## 2. Palette

```css
--noir-vestiaire:  #0C0C0D;   /* fond global */
--noir-profond:    #060607;   /* fond des écrans VAR et transitions */
--papier:          #F2EDE3;   /* la feuille de match, cartes d'incident */
--papier-ombre:    #DED7C9;   /* filets, séparateurs sur papier */
--encre:           #14140F;   /* texte sur papier */
--encre-pale:      #6B675C;   /* texte secondaire sur papier */
--craie:           #E8E6E1;   /* texte sur noir */
--craie-pale:      #8A8880;   /* texte secondaire sur noir */

--jaune-carton:    #F2B705;   /* avertissement, jauge en alerte */
--rouge-carton:    #C42B21;   /* expulsion, jauge critique, tampon */
--vert-terrain:    #0E2A1B;   /* texture de fond du match, jamais en aplat visible */
--bleu-var:        #2F6DF2;   /* uniquement l'écran VAR, nulle part ailleurs */
```

Règles d'usage :

- Le jaune et le rouge ne servent **jamais** de couleur d'action. Un bouton n'est jamais jaune. Ils signifient un carton, une jauge en danger, un tampon. Rien d'autre.
- Le bouton primaire est du papier sur du noir, ou du noir sur du papier. Il n'y a pas de couleur d'accent d'interface, et c'est ce qui empêche le rendu « SaaS ».
- Le bleu VAR n'apparaît que sur l'écran VAR, en filet de 2 px et en libellé. Il est là pour signaler qu'on a changé de monde pendant vingt secondes.

Contraste : `--craie` sur `--noir-vestiaire` = 15,2:1. `--encre` sur `--papier` = 14,8:1. `--craie-pale` sur noir = 5,1:1, réservé aux textes non essentiels de 14 px et plus.

---

## 3. Typographies

Trois familles, toutes auto-hébergées en woff2 sous-ensemblées (latin + français), aucune requête vers un CDN tiers.

### Anybody — titrage, chiffres, notes

Variable, avec un axe de chasse (`wdth` 75 → 150). Publiée par Velvetyne, gratuite et redistribuable.

Pourquoi : c'est une grotesque héritée du lettrage sportif, celle qu'on voit compressée dans le dos des maillots et sur les panneaux de remplacement. L'axe de chasse permet d'écrire `74` en très large et `LIGUE 2` en très étroit avec la même police, ce qui donne à la feuille de match une cohérence typographique qu'aucun assemblage de deux polices n'aurait. Et elle n'a été vue nulle part ailleurs, ce qui est exactement le but.

Usages : la note (`wdth: 135`, `wght: 800`, 128 px), la minute et le score en cours de match (`wdth: 85`), les titres de section (`wdth: 78`, majuscules, `letter-spacing: 0.06em`).

### Newsreader — texte des incidents

Serif de presse, variable, avec un axe optique. Google Fonts, licence OFL.

Pourquoi : les incidents sont des comptes rendus. Un texte de match écrit en sans-serif ressemble à une notification ; écrit en serif de presse, il ressemble à ce qu'on lit dans un journal le lundi matin. Le contraste serif/grotesque entre le récit et les chiffres est ce qui donne au jeu son air de document plutôt que d'interface.

Usages : uniquement le corps des incidents, les conséquences, les mentions d'observateur et les lignes de presse. 19 px sur mobile, interlignage 1,52, `opsz` réglé à 20.

### Martian Mono — interface

Monospace variable à chasse condensée. Google Fonts, licence OFL.

Pourquoi : tout ce qui est administratif dans le jeu (numéro de licence, libellés de champs, en-têtes de tableau, horodatage) doit avoir l'air d'être sorti d'une imprimante matricielle. Une mono classique type JetBrains ferait « développeur » ; Martian Mono, avec sa chasse resserrée, fait « formulaire ».

Usages : libellés d'options de décision (14 px, majuscules, `letter-spacing: 0.04em`), en-têtes, numéro de licence, tout ce qui est chiffré hors de la note.

**Interdits explicites** : Inter, Roboto, Montserrat, Poppins, Open Sans, Lato, Manrope, DM Sans, et toute police système en usage principal.

### Repli et substitution

```css
@font-face {
  font-family: 'Newsreader-repli';
  src: local('Georgia'), local('Times New Roman');
  size-adjust: 96%;
  ascent-override: 92%;
  descent-override: 24%;
}
```
`font-display: swap` pour Newsreader et Martian Mono (avec les métriques ajustées ci-dessus, la substitution ne décale rien), `font-display: optional` pour Anybody — un chiffre qui change de chasse en cours d'animation est intolérable, mieux vaut ne pas l'avoir au premier chargement.

---

## 4. Grille, densité, gestes

Conçu pour un écran de **390 × 844** au pouce, en portrait. Le desktop est un cadre de 420 px de large centré sur fond noir texturé, sans réagencement — assumé, ce n'est pas un jeu de bureau.

- Marge latérale : 20 px. Elle ne change jamais.
- Gouttière verticale de base : 8 px, tout est un multiple.
- Zone de pouce : les quatre boutons d'options occupent les **340 derniers pixels** de l'écran. Rien d'actionnable au-dessus de la moitié de l'écran, sauf le bouton de son et le panneau.
- Hauteur d'un bouton d'option : 56 px, séparés par 1 px de `--papier-ombre` (ils forment un bloc, pas quatre cartes — c'est un bulletin de vote, pas un menu).
- Rayon des angles : **2 px** partout. Pas 8, pas 12, pas 16. C'est du papier découpé.
- Aucune ombre portée. Les plans se distinguent par la couleur, jamais par le flou.
- Une seule texture : un grain fin (bruit SVG, opacité 3 %) appliqué au papier. Fichier inline, < 400 octets.

Gestes : tap uniquement. Pas de swipe, pas de long press, pas de glisser. Un joueur dans le métro, une main, pouce.

---

## 5. Animations

Toutes les durées sont normatives. Toutes sont désactivées si `prefers-reduced-motion: reduce` (remplacées par des transitions d'opacité de 90 ms).

| Élément | Durée | Courbe |
|---|---|---|
| Apparition d'une carte d'incident | 220 ms | `cubic-bezier(.16,1,.3,1)`, translation Y de 12 px + opacité |
| Enfoncement d'un bouton d'option | 90 ms | `ease-out`, scale 0,985 |
| Sortie du carton (jaune/rouge) | 180 ms | `cubic-bezier(.34,1.56,.64,1)`, rotation −4° → 0°, scale 0,8 → 1 |
| Mouvement de la jauge de contrôle | 320 ms | `cubic-bezier(.2,.8,.2,1)` |
| Flash rouge sur chrono expiré | 120 ms | `ease-in-out`, opacité 0 → 0,35 → 0 |
| Anneau de chrono | durée du chrono | `linear`, strictement — toute autre courbe est un mensonge |
| Passage à l'incident suivant | 160 ms | crossfade |
| Entrée de l'écran VAR | 400 ms | fondu au noir 200 ms, puis filet bleu qui se trace de gauche à droite en 200 ms |
| Coup de sifflet final → feuille | 250 ms de noir sec, puis composition de 900 ms | échelonnage de 120 ms par bloc |
| Incrémentation de la note | 700 ms | `easeOutExpo`, l'affichage saute par entiers, jamais de décimale |
| Tampon `MATCH ARRÊTÉ` | 260 ms | scale 1,4 → 1 + rotation −7°, avec un léger dépassement |

Le tampon `MATCH ARRÊTÉ` est la seule animation exubérante du jeu. Elle est là parce que c'est la capture la plus partagée : elle doit être spectaculaire.

---

## 6. Les écrans

### 6.1 Coup d'envoi (`/`)

**Hiérarchie :** logotype (petit, en haut, `SIFFLET` en Anybody condensé, 18 px, `letter-spacing: 0.22em`) → bandeau de division en Martian Mono → l'affiche → le contexte → le bouton.

L'affiche occupe le centre optique : les deux noms de clubs en Anybody, `wdth: 92`, 30 px, l'un au-dessus de l'autre, séparés par le mot `reçoit` en Newsreader italique 15 px `--craie-pale`. Les couleurs des clubs apparaissent comme deux filets de 3 px sous chaque nom, largeur 48 px. C'est la seule présence des couleurs de club dans tout le jeu, et ça suffit.

**États :**
- *Chargement du moteur* : le bouton garde son libellé, son fond passe à 70 % d'opacité et un filet de progression de 2 px court sur son bord bas. Jamais de spinner.
- *Erreur de sauvegarde corrompue* : bandeau discret en haut, `--jaune-carton` sur noir, une ligne : « Sauvegarde illisible, progression repartie de zéro. L'ancienne est conservée. »
- *Match du jour déjà joué* : le lien secondaire devient « le match du jour — 74/100, 12 431ᵉ » et pointe vers la feuille archivée.

En bas, deux lignes en Martian Mono 12 px `--craie-pale` : le numéro de licence et la série en cours. Rien d'autre. Pas de bouton « Comment jouer », pas de CTA secondaire.

### 6.2 Match (`/match`)

**Structure fixe, jamais de saut de mise en page.**

- Ligne 0 (4 px) : la jauge de contrôle, pleine largeur, `--craie` sur `--noir-vestiaire`. Elle passe `--jaune-carton` sous 40, `--rouge-carton` sous 25. Sous 25, elle pulse à 1,2 s par cycle, très légèrement (opacité 1 → 0,75).
- Ligne 1 (32 px) : minute à gauche (Anybody `wdth: 85`, 20 px), score à droite (Martian Mono 13 px). Un point médian sépare. Aucune indication de progression du type « 7/12 » : le joueur ne doit pas compter les incidents restants.
- Bloc papier : 20 px de marge, padding 22 px, hauteur **réservée à 340 px** quelle que soit la longueur du texte (d'où la contrainte de 45–90 mots). Le texte est centré verticalement dans ce bloc.
- Bloc d'options, collé en bas, `safe-area-inset-bottom` respecté.
- L'anneau de chrono est un `stroke` de 3 px qui suit le périmètre intérieur de l'écran, `--craie-pale`, et se vide dans le sens horaire depuis le haut. Sur les 25 derniers pourcents, il passe `--rouge-carton`.

**États :**
- *Chrono désactivé dans les réglages* : pas d'anneau, et une mention `SANS CHRONO` en Martian Mono 11 px sous le score.
- *Infériorité numérique après une expulsion* : le score s'affiche `PON 1 – 1 VIL (10)`.
- *Contrôle sous 25* : un filet rouge de 1 px apparaît en haut et en bas du bloc papier. Aucun texte d'alerte — on n'explique pas au joueur qu'il est en train de perdre le match, il le sent.

### 6.3 Conséquence

Le bloc papier se réduit à 140 px en 200 ms, le texte de l'incident se réduit à sa première ligne tronquée en `--encre-pale`, et la décision s'affiche par-dessus.

S'il y a carton : un rectangle plein (36 × 50 px, angles à 2 px) en `--jaune-carton` ou `--rouge-carton`, animé selon §5, avec en dessous le numéro et le club en Martian Mono. La conséquence textuelle est en Newsreader 17 px.

Un tap n'importe où passe à la suite. Sinon, 1,4 s.

### 6.4 VAR

Plein écran `--noir-profond`. En haut, `ASSISTANCE VIDÉO` en Martian Mono 12 px `--bleu-var`, souligné d'un filet de 2 px qui se trace en 200 ms. La révélation en Newsreader 20 px, `--craie`, centrée verticalement, marge 32 px. Deux boutons en bas, hauteur 60 px, l'un contre l'autre, texte en Martian Mono majuscules.

Pas de chrono, pas de jauge, pas de score affiché. On sort du match pendant vingt secondes, l'écran doit le dire par le vide.

### 6.5 Feuille de match (`/feuille`)

L'écran le plus travaillé du jeu. C'est un objet, pas un tableau de bord.

Fond `--noir-vestiaire`. Le papier occupe toute la largeur moins 16 px de marge, du haut au bas, avec 28 px de padding. Bord supérieur irrégulier (masque SVG, dents de 1,5 px) : la feuille a été arrachée d'un carnet à souche.

De haut en bas :

1. En-tête en Martian Mono 11 px `--encre-pale`, justifié entre les deux bords : `LIGUE 2` … `31.07.2026` … `LIC. FR-4471-C`. Un filet de 1 px `--papier-ombre` en dessous.
2. L'affiche et le score final, Anybody `wdth: 88`, 22 px : `VAUX-CERNY 2 – 1 PONTÉRIVE`.
3. **La note.** Anybody `wdth: 138`, `wght: 800`, 128 px, calée à gauche, avec `/100` en Martian Mono 14 px en exposant. Bloc de 150 px de haut. C'est le premier élément qu'on voit sur une capture réduite à 25 %.
4. La mention, Newsreader italique 21 px, sur deux lignes maximum.
5. Filet, puis **le bloc litigieux** — l'incident du match dont la gravité est la plus haute (à égalité, le plus tardif). En-tête `78ᵉ — CONTACT DANS LA SURFACE` en Martian Mono 11 px. Puis deux lignes en Anybody 17 px : `VOUS : laisser jouer` / `LES AUTRES : 82 % penalty`. Le pourcentage est le seul chiffre coloré de la page, en `--rouge-carton`, et seulement si l'écart avec votre choix dépasse 60 points.
6. Les trois sous-notes en Martian Mono 12 px, sur une seule ligne : `JUSTESSE 81 · CONTRÔLE 62 · CONSTANCE 75`.
7. Les cartons distribués, en petits rectangles de 14 × 20 px alignés.
8. Les badges obtenus dans ce match, en une ligne de libellés soulignés.
9. La ligne de presse, Newsreader italique 15 px `--encre-pale`, entre guillemets français.
10. La division atteinte : `MONTÉE — NATIONAL` ou `MAINTIEN` ou `DESCENTE`, en Martian Mono 13 px, avec un filet en dessous.

**États :**
- *Match arrêté* : tampon `MATCH ARRÊTÉ 71ᵉ` en `--rouge-carton`, contour de 2 px, rotation −7°, posé en travers de la note, opacité 0,88.
- *Sans chrono* / *hors classement* : mention en Martian Mono 10 px sous l'en-tête, sans emphase.
- *Comparaison indisponible (hors ligne)* : la ligne `LES AUTRES` affiche `—`, sans explication. Un tap dessus affiche « comparaison indisponible hors connexion ».
- *Première partie de la vie du joueur* : après les badges, un bloc supplémentaire propose de choisir un pseudo. Une seule fois. Refusable d'un tap.

Actions, hors papier, sur le noir, en bas : `PARTAGER` (papier plein, 56 px), `REJOUER` (contour de 1 px), `LES 12 DÉCISIONS` (texte souligné, 14 px).

### 6.6 Carte de partage (canvas, 1080 × 1350)

Rendue à la main sur un `<canvas>`, sans dépendance. C'est la feuille de match recadrée : en-tête, affiche, la note, la mention, le bloc litigieux, le domaine en bas. Rien d'autre — pas de QR code, pas de « Joue maintenant », pas de logo de plateforme.

Le fond est `--noir-vestiaire` sur 60 px de pourtour, le papier occupe le reste. Le grain est redessiné à la bonne échelle. Les polices doivent être chargées avant le rendu (`document.fonts.ready`), sinon la carte sort en repli et c'est visible.

Partage via `navigator.share({ files, text })` quand disponible ; sinon téléchargement du PNG + copie du texte dans le presse-papier avec une confirmation d'une ligne.

Texte accompagnant :

```
SIFFLET — match du 31 juillet
Ligue 2 · Vaux-Cerny 2-1 Pontérive
74/100, « Passable. Deux ou trois erreurs sans conséquence. »
78ᵉ : j'ai laissé jouer. 82 % ont sifflé penalty.
sifflet.fr
```

### 6.7 Panneau (réglages, règles, mentions)

Glisse depuis la gauche, 300 ms, fond `--noir-profond` à 96 %. Trois sections en Martian Mono : réglages (son, chrono, mouvement réduit), « comment on est noté » (huit lignes, pas une page de règles), liens légaux. En bas, `SUPPRIMER MA PROGRESSION` en `--rouge-carton`, avec une confirmation qui demande d'écrire `EFFACER`.

---

## 7. Accessibilité

- Contrastes vérifiés ci-dessus, tous ≥ 4,5:1 sur les textes utiles.
- Taille de police minimale : 12 px, et uniquement pour du contenu redondant.
- Le chrono est un obstacle réel. L'option « sans chrono » est dans le panneau, accessible dès le premier écran, et elle est présentée comme un réglage, pas comme un mode facile.
- Navigation clavier complète sur desktop : `1`–`4` pour choisir une option, `Espace` pour valider une transition. Affiché en petit sur desktop uniquement.
- `aria-live="assertive"` sur le bloc de conséquence, `aria-live="polite"` sur la jauge annoncée par paliers de 10 seulement (sinon le lecteur d'écran parle en continu).
- Le rouge et le jaune ne portent jamais une information seule : un carton a toujours son libellé texte à côté.
