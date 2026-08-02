# 09 — Mise en ligne

## 1. Nom de domaine

Critères, dans l'ordre : prononçable au téléphone, écrivable sans hésitation par un francophone, court, et surtout **crédible quand il est écrit en bas d'une capture d'écran**. C'est le seul endroit où le domaine sera vu par la majorité des visiteurs.

Candidats, par ordre de préférence :

| Domaine | Pour | Contre |
|---|---|---|
| `sifflet.fr` | exact, court, français, évident | probablement pris ou parqué |
| `coupdesifflet.fr` | disponible plus probablement, sonne comme un média | 14 caractères, moins bon en bas de carte |
| `sifflet.app` | HTTPS forcé, dispo plus probable | `.app` fait « application », pas « jeu » |
| `lecentral.fr` | l'arbitre central, joli, mémorisable | ne dit pas de quoi il s'agit |
| `monsieur.football` | drôle, mémorable, très partageable à l'oral | extension chère (~30 €/an), longue à taper |
| `sifflet.game` | disponible presque à coup sûr | extension inconnue du public français |

**À faire avant d'écrire une ligne de code :** vérifier la disponibilité des six, acheter le meilleur disponible **plus** `coupdesifflet.fr` en repli, et poser une redirection 301 du repli vers le principal. Coût annuel réel : 15 à 40 €.

À éviter absolument : tout nom contenant `arbitre` associé à un nom de fédération ou de compétition réelle, et toute extension `.io` (le public visé ne la connaît pas et l'écrit de travers).

**Marque.** Pas de dépôt INPI en V0. Si le jeu marche, un dépôt en classe 9 et 41 coûte 190 € et se fait à ce moment-là, pas avant.

---

## 2. Analytics

**Plausible auto-hébergé** sur un petit VPS, ou **Umami** sur le tier gratuit. Pas Google Analytics, pour trois raisons : le poids (45 Ko), le bandeau cookie qu'il impose, et le fait qu'il transfère des données hors UE.

Ce qu'on mesure, et rien d'autre :

| Événement | Pourquoi on en a besoin |
|---|---|
| Page vue (`/`, `/match`, `/feuille`) | mesure du rebond avant le premier tap |
| `coup_envoi` | taux de conversion arrivée → partie lancée. **La métrique numéro un.** |
| `match_termine` (avec `division`, `tranche_note`) | taux d'abandon en cours de partie |
| `match_abandonne` (avec `incident_index`) | à quel incident on décroche |
| `partage_effectue` | le moteur de croissance |
| `rejouer` | la rétention immédiate |
| `compte_cree`, `compte_refuse` | V1 |

Aucun identifiant persistant, aucun cookie, aucune empreinte de navigateur. Plausible et Umami savent fonctionner comme ça, il faut juste le configurer explicitement (`data-domain` sans `hash`, pas de `revenue`, pas de `props` contenant un identifiant).

**Le script d'analytics ne se charge pas avant le premier tap.** Il est injecté après `coup_envoi`, en `defer`. Un visiteur qui rebondit en trois secondes ne charge rien — il est compté par le log serveur, pas par un script.

---

## 3. RGPD

Ce qui suit décrit une intention de conformité, pas un avis juridique. Sur les points 3 et 4, faire relire par quelqu'un dont c'est le métier avant un pic d'audience.

### Ce qu'on stocke

| Donnée | Où | Base légale | Durée |
|---|---|---|---|
| Sauvegarde de partie (division, badges, réglages, licence fictive) | `localStorage` du navigateur | nécessaire au service demandé par l'utilisateur | jusqu'à effacement par l'utilisateur |
| Adresse e-mail (V1, compte optionnel) | Supabase, Frankfurt | exécution du service | jusqu'à suppression du compte |
| Pseudo, division, notes, décisions (V1) | Supabase, Frankfurt | exécution du service | scores purgés à 90 jours |
| Hachage tronqué d'IP pour la limitation de débit (V1) | mémoire edge, 1 h | intérêt légitime, sécurité | 1 heure |
| Statistiques d'audience agrégées | Plausible/Umami | intérêt légitime, données non individualisantes | 24 mois |

### Bandeau cookie

**Il n'y en a pas, et c'est un choix documenté.** Le jeu ne pose aucun cookie. Le `localStorage` sert uniquement à fournir le service explicitement demandé (sauvegarder la partie en cours de quelqu'un qui joue), ce qui relève de l'exemption de consentement prévue par la CNIL pour les traceurs strictement nécessaires. L'audience est mesurée sans traceur individualisant, dans les conditions de l'exemption pour la mesure d'audience.

Conséquence à tenir : **le jour où on ajoute un traceur qui sort de ce cadre, il faut un bandeau.** Donc on n'en ajoute pas. C'est écrit dans `CLAUDE.md`.

### Mentions minimales

Une page `/mentions`, accessible depuis le panneau, six blocs courts :

1. Éditeur : nom, statut, contact e-mail. Une adresse postale est obligatoire pour un éditeur professionnel ; pour un projet personnel non lucratif, l'e-mail et le nom suffisent, mais il faut être joignable.
2. Hébergeur : Vercel Inc., adresse, et Supabase pour la base, avec la région.
3. Données : le tableau ci-dessus, en français simple.
4. Droits : accès, rectification, effacement, portabilité. **Et surtout les boutons qui vont avec**, dans le panneau : `SUPPRIMER MA PROGRESSION` (local) et, en V1, `SUPPRIMER MON COMPTE` (appelle une RPC qui fait un `delete` en cascade et déconnecte). Un droit qui demande d'écrire un e-mail est un droit qu'on n'exerce pas.
5. Propriété : tous les clubs, joueurs, compétitions et lieux sont fictifs. Toute ressemblance, etc. Cette ligne n'a aucune valeur juridique en soi mais elle clarifie l'intention, et elle est vraie.
6. Contact : une adresse qui est relevée.

Pas de conditions générales d'utilisation en V0 : il n'y a ni compte, ni paiement, ni contenu utilisateur. Elles arrivent avec V1 et le classement, et elles tiennent en une page.

---

## 4. Modération

Le seul contenu utilisateur du jeu est **un pseudo de 3 à 18 caractères** affiché dans un classement. C'est peu, et c'est déjà suffisant pour créer un problème.

Trois niveaux :

1. **À la création.** Liste de blocage (insultes, termes racistes et antisémites, apologies, noms de personnalités susceptibles d'usurpation). Une liste française maintenue à la main dans `src/lib/moderation/blocage.ts`, plus une normalisation qui neutralise les contournements évidents (accents, chiffres substitués aux lettres, espaces insécables, caractères homoglyphes cyrilliques). On refuse avec un message neutre : « Ce pseudo n'est pas disponible. » On n'explique pas quelle règle a matché, sinon on donne la carte du filtre.
2. **Signalement.** Un bouton sur chaque ligne du classement, trois motifs, un envoi. Aucune confirmation élaborée.
3. **Traitement.** Une page d'administration protégée, une action unique : renommer le pseudo en `Arbitre #{id court}` et poser un drapeau qui empêche de le changer pendant 30 jours. Pas de bannissement : ça ne sert à rien sur un jeu sans compte obligatoire.

Engagement de délai réaliste pour une personne seule : **72 heures**. L'annoncer dans les mentions plutôt que de promettre 24 h.

Si le classement devient un problème disproportionné (c'est possible, ça arrive vite), le plan B est de n'afficher que le rang et la note, sans pseudo, sauf pour ses propres amis. Le préparer, ne pas le construire.

---

## 5. Plan de lancement

Le jeu vit ou meurt dans les 96 premières heures. Le reste, ce sont des conséquences.

### Avant J0 — ce qui doit être prêt

- Le jeu en ligne, testé sur un iPhone réel et un Android d'entrée de gamme, sur une connexion 4G dégradée. Pas en wifi, pas dans un émulateur.
- Une carte de partage impeccable. C'est le produit marketing, pas le site.
- Une image `og.png` (1200 × 630) qui est une feuille de match, pas un logo.
- Le match du jour du J0 vérifié à la main : joué en entier, textes relus. Un incident mal écrit le jour du lancement, c'est le seul que 40 000 personnes verront.
- Un plan de bascule si Supabase explose : en V0 il n'y a rien à faire tomber, c'est l'argument.

### J0 — jeudi, 18 h

Jeudi soir : les gens sont sur leur téléphone, disponibles, et il reste le week-end pour que ça monte. Pas le lundi, pas le vendredi soir.

1. **Envoi direct à 20 personnes** qui aiment le foot, individuellement, avec une phrase personnelle. Pas un groupe. On regarde qui joue, on lit les retours, on corrige les fautes.
2. Deux ou trois **serveurs Discord** de supporters où on est déjà connu. Jamais un serveur où on n'a jamais parlé : c'est du spam et ça se voit.

### J+1 — vendredi matin

3. **r/footballfrance** et **r/Ligue1**. Un post par subreddit, à 24 h d'écart. Le titre ne vend pas le jeu, il pose la question du jeu : « J'ai laissé jouer sur le penalty de la 78e. 82 % des gens ont sifflé. » Le lien en commentaire ou dans le corps selon les règles du sub — les lire avant, elles varient.
4. **X / Twitter** : pas un fil de présentation. Une capture de sa propre feuille de match avec la ligne de désaccord, et le lien. Le format qui marche est celui du joueur, pas celui du créateur.

### J+2 — samedi

5. **TikTok et Reels** : un enregistrement d'écran de 15 secondes qui se termine sur le tampon `MATCH ARRÊTÉ`. C'est l'échec qui se partage, pas la réussite. Deux ou trois variantes, publiées à quelques heures d'intervalle.
6. **r/webgames** et **r/incremental_games** en anglais, en expliquant honnêtement que c'est en français. Ça ramène peu mais ça ramène des gens qui commentent.

### J+3 et suivants

7. Contacter les comptes de **vulgarisation de l'arbitrage** — il en existe plusieurs en français sur X, TikTok et YouTube, tenus par des arbitres en activité ou d'anciens arbitres. C'est le public exactement adapté, et ce sont eux qui légitiment le jeu ou le descendent. Les contacter après avoir des chiffres, pas avant : un message avec « 30 000 parties jouées en trois jours » se répond, un message avec « j'ai fait un jeu » ne se répond pas.
8. Un post sur un forum ou une communauté de développement français si on veut parler de la fabrication. C'est une audience différente, elle ne fait pas jouer mais elle fait exister.

### Ce qu'on ne fait pas

- Product Hunt : audience anglophone, produits SaaS, aucun rapport.
- Hacker News : le jeu est en français, le titre passerait, le contenu non.
- Acheter de la publicité. Sur un jeu gratuit sans monétisation, chaque euro dépensé est un euro perdu.
- Un compte de marque sur les réseaux avant d'avoir des joueurs. Un compte vide dessert.

### Ce qu'on surveille, et ce qu'on en fait

| Signal | Seuil qui doit alerter | Réaction |
|---|---|---|
| Arrivée → `coup_envoi` | < 55 % | l'écran d'accueil ne dit pas assez vite ce qu'on fait |
| `coup_envoi` → `match_termine` | < 65 % | trop long, ou le chrono décourage. Regarder `match_abandonne.incident_index` |
| `match_termine` → `partage` | < 12 % | la feuille de match n'est pas assez désirable |
| `match_termine` → `rejouer` | < 30 % | la progression en divisions ne se voit pas assez |
| Retour au J+1 | < 15 % | le match du jour (V1) devient prioritaire immédiatement |

Si le taux arrivée → `coup_envoi` est bon et que le partage est mauvais, le problème est la carte, et c'est réparable en une journée. Si c'est l'inverse, le problème est le concept, et il faut le savoir vite.

---

## 6. Encart : ce que je conteste dans le brief

Appliqué dans le corps du dossier, comme demandé. Mais voilà les quatre points sur lesquels je pense que tu te trompes.

### 6.1 — « Jouable et partageable en deux semaines de dev solo »

C'est faux, et pas à cause du code. Le code de V0 tient en six à sept jours pour quelqu'un d'assisté par Claude Code. Le problème est **les 140 incidents**, soit environ 16 heures de rédaction — et de la rédaction qui ne se délègue pas, parce que c'est exactement la chose que le brief interdit de bâcler (« ça doit sonner comme un vrai jeu écrit par quelqu'un qui regarde du foot »). Seize heures d'écriture soutenue, ça ne se fait pas en soirée après une journée de dev.

**Contre-proposition :** lancer avec **90 incidents**, pas 140. Le seuil réel est l'invariant « 8 incidents éligibles par couple (palier, fenêtre) », qui tient à 90 en resserrant les paliers hauts. On perd de la variété au bout de six ou sept parties ; on le voit dans les données et on complète la semaine suivante avec du contenu écrit à partir de ce que les joueurs commentent. C'est plus lent au départ et bien meilleur au bout d'un mois.

### 6.2 — L'auth anonyme Supabase comme fondation

Traité en détail dans `05-architecture.md` §1. Résumé : créer une session serveur pour chaque visiteur, dont 60 % rebondiront en moins de dix secondes, c'est payer le coût de l'inscription pour tout le monde afin d'éviter la friction pour quelques-uns. Le `localStorage` seul résout « je joue tout de suite » mieux et pour rien, et le compte se propose au moment où il a du sens. Je l'ai appliqué à ma façon dans le dossier ; le point de branchement pour revenir à ta version est le ticket V1-2.

### 6.3 — « Zéro euro jusqu'à 20 000 joueurs »

Vrai en V0, où il n'y a littéralement aucun serveur. Faux en V1 dès qu'on ajoute la comparaison des décisions : `votes_jour` prend une écriture par incident et par joueur, soit **douze `UPSERT` par partie**. À 20 000 parties quotidiennes, c'est 240 000 écritures par jour sur une instance Supabase gratuite, plus la lecture des pourcentages par tous les joueurs.

**Contre-proposition, déjà intégrée :** les lectures passent par un endpoint mis en cache CDN 60 secondes (donc quelques dizaines de requêtes réelles par minute, quel que soit le trafic), et les écritures sont groupées en un seul appel RPC par partie. Ça tient. Mais il faut surveiller le nombre de connexions, pas la bande passante, et prévoir 25 €/mois pour le plan Pro dès qu'on passe 15 000 parties quotidiennes. Le budget « < 30 €/mois ensuite » est le bon, il arrive juste plus tôt que prévu.

### 6.4 — Le classement quotidien

Tu ne l'as pas demandé explicitement, mais il découle de « run seedé du jour » et je l'ai mis en V1. Je le fais en le sachant bancal : il est impossible à protéger contre le rejeu local, comme expliqué dans `05-architecture.md` §4. Un classement qu'on sait falsifiable, sur un jeu sans enjeu, ne mérite peut-être pas les cinq jours de V1.

**Contre-proposition :** commencer par **la comparaison seule** — le pourcentage des autres joueurs sur chaque décision, qui est la vraie valeur sociale du jeu et qui, elle, ne se falsifie pas de façon rentable. Le classement n'arrive que si les joueurs le réclament. Ça économise les tickets V1-3, V1-7 et V1-8, soit à peu près la moitié de V1, et ça repousse les comptes, la modération et les CGU d'autant.
