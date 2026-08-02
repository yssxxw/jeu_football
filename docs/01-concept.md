# 01 — Concept

## Le pitch

**SIFFLET.** Un match, douze décisions, six secondes chacune. À la fin, la feuille de match dit ce que vous valez.

Vous êtes l'arbitre central. Pas le joueur, pas l'entraîneur, pas le président : le type que tout le monde insulte et que personne n'a jamais voulu être. Le jeu vous met à sa place et vous chronomètre.

---

## Les trois pistes

### A. SIFFLET — l'arbitre

Un match condensé en douze incidents. Un tacle par derrière à la 63e, une main dans la surface, un capitaine qui vient vous chercher, la VAR qui vous appelle. Six secondes pour trancher, jauge de contrôle du match qui monte et descend, et si elle tombe à zéro le match s'arrête avant la fin. À la sortie, une note sur 100 et la mention de l'observateur. Vous montez ou vous descendez de division.

### B. DERNIER JOUR — le mercato

21 h – minuit, dernier jour du mercato. Directeur sportif d'un club qui doit vendre 8 M€ avant minuit sous peine de rétrogradation administrative. Le téléphone sonne, chaque appel est un choix, le temps s'écoule pour de vrai. Fin : le bilan de la fenêtre, la note du conseil d'administration, et ce que la presse en dit le lendemain matin.

### C. LE VESTIAIRE — l'entraîneur qui ne dirige jamais un match

Une saison en neuf causeries. Veille de match, mi-temps à 0-2, retour de vestiaire après une gifle, entretien individuel avec le cadre qui boude. Vous ne touchez jamais à la tactique : vous ne gérez que des hommes. Note finale croisée : le classement d'un côté, l'état du groupe de l'autre. Les deux ne vont pas toujours ensemble.

---

## Je prends A. Voilà pourquoi.

**La fantaisie est déjà installée dans la tête de tout le monde.** Personne ne rêve d'être arbitre, mais tout spectateur se substitue à lui quinze fois par match, à voix haute, avec certitude. Le jeu ne crée pas un désir, il exploite un réflexe existant. B et C demandent d'abord de convaincre le joueur que le rôle est intéressant.

**Le contenu coûte cinq fois moins cher.** Un incident, c'est soixante mots et trois options, autonome, réutilisable dans n'importe quel match. B et C reposent sur une continuité narrative : ce que j'ai dit à la causerie 3 doit résonner à la causerie 7, sinon ça sonne faux. Ça veut dire des arbres, des variables de suivi, du contenu qui ne se recombine pas. Sur deux semaines de dev solo, c'est le piège.

**Le partage engendre du débat, pas de la vantardise.** Un score élevé fait dire « bravo » et on passe. Une décision fait dire « non mais t'es fou, c'était jamais penalty ». La capture de fin ne montre pas d'abord ma note, elle montre **ma décision sur l'action la plus chaude du match du jour**, à côté du pourcentage des autres joueurs. La section commentaires s'écrit toute seule.

**Zéro risque juridique.** Aucun joueur réel, aucune photo, aucune stat sous licence. Univers entièrement fictif (voir plus bas).

**Différenciation nette.** 7a0 est un jeu de construction d'effectif. Destiny Eleven est de la fiction de carrière. SIFFLET est un jeu de jugement instantané sous contrainte de temps — le chrono de six secondes est une mécanique qu'aucun des deux n'a et qui change complètement la sensation.

**Ce que je sacrifie en choisissant A :** l'attachement. Dans Destiny Eleven on suit un personnage sur quinze ans et on s'y attache ; ici on encaisse un match et on repart. Je compense par la progression en divisions (le personnage, c'est votre carrière d'arbitre) et, en V2 seulement, par des joueurs récurrents dont on apprend à connaître les habitudes. Je sacrifie aussi le pouvoir : on ne marque jamais de but dans SIFFLET.

---

## L'arbitrage licences, noir sur blanc

**Univers 100 % fictif. Aucune donnée réelle, libre de droits ou non.**

Raisons : les bases de joueurs réels utilisables (Wikidata, football-data.co.uk, les jeux de données open des fédérations) donnent des noms et des chiffres, jamais des personnalités — or ce jeu a besoin qu'un attaquant ait la réputation de tomber facilement. Un attaquant réel avec cette réputation dans un jeu, c'est un problème de droit à l'image et de dénigrement. Un attaquant inventé, c'est du matériau libre.

Nomenclature retenue, par « pays » de la Fédération (détaillée dans `03-contenu.md`) :

| Pays fictif | Inspiré de | Exemples de clubs |
|---|---|---|
| La Fédération | France | AS Pontérive, Racing Vaux-Cerny, US Villebasse, Stade Bourgnac |
| Riviera | Italie | Ponteverde Calcio, Sestrano 1908, AC Bariva |
| Alcázar | Espagne | Real Alcázar de Nieva, CD Valmorena |
| Ashmoor | Angleterre | Ashgrove Town, Hesketh Rovers, Kirbymoor FC |
| Nordhalle | Allemagne | SV Nordhalle 04, TSV Eichbrunn |

Les noms sont construits à partir de toponymes plausibles mais inexistants. Vérification obligatoire avant livraison : aucun nom de club généré ne doit correspondre à un club réel existant (procédure dans `03-contenu.md`).

---

## Le moment screenshot

Écran de fin, format portrait, fond noir, papier crème au centre. Ce n'est pas un écran de score, c'est **une feuille de match**.

Ce qu'on y voit, dans cet ordre :

1. En haut, en petit, tamponné : la division, la date, l'affiche (`LIGUE 2 · VAUX-CERNY 2 – 1 PONTÉRIVE`).
2. **Le nombre**, énorme, en chiffres compressés : `74`. Sur `/100` minuscule à côté.
3. Sous le nombre, la mention de l'observateur, en serif : « Passable. Deux ou trois erreurs sans conséquence. »
4. **L'action litigieuse.** Un bandeau : `78ᵉ — CONTACT DANS LA SURFACE`. Puis, sur deux lignes : `VOUS : laisser jouer.` / `LES AUTRES : 82 % ont sifflé penalty.` C'est cette ligne qui fait cliquer.
5. En bas, le carton obtenu s'il y en a un, et le domaine.

Pourquoi ça donne envie de cliquer : la note seule est un score, on la scrolle. Le désaccord chiffré est une accusation. « 82 % ont sifflé penalty » adressé à quelqu'un qui n'a pas sifflé, c'est une invitation à ouvrir le jeu pour vérifier qui a raison. Et la seule façon de vérifier, c'est de jouer le même match — il est identique pour tout le monde ce jour-là.

Variante de partage qui marche encore mieux et qu'il faut absolument garder : **le match arrêté**. Quand la jauge de contrôle tombe à zéro, la feuille de match est barrée d'un tampon rouge `MATCH ARRÊTÉ — 71ᵉ` et la note est plafonnée à 35. C'est un échec, et c'est la capture la plus partagée du jeu. Ne pas essayer d'adoucir cet écran.
