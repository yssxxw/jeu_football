# SIFFLET — dossier de conception

Un match, douze décisions, six secondes chacune. À la fin, la feuille de match dit ce que vous valez.

Jeu web de football gratuit, en français, mobile-first. Le joueur est l'arbitre central. Aucun compte, aucune publicité, univers entièrement fictif. Partie de 3 à 6 minutes, note sur 100, progression du district à l'international.

---

## Ordre de lecture

| Fichier | À lire quand | Statut |
|---|---|---|
| `01-concept.md` | d'abord, en entier | décisionnel |
| `02-game-design.md` | avant d'écrire une ligne de moteur | **normatif** |
| `03-contenu.md` | avant d'écrire un incident | **normatif** (ton et schéma) |
| `04-donnees.md` | avant de toucher au stockage ou au SQL | **normatif** |
| `05-architecture.md` | avant le premier commit | décisionnel |
| `06-ui-direction-artistique.md` | avant de styler quoi que ce soit | **normatif** |
| `07-backlog-claude-code.md` | en continu, c'est le plan de travail | opérationnel |
| `08-CLAUDE.md` | à copier à la racine du repo sous le nom `CLAUDE.md` | opérationnel |
| `09-mise-en-ligne.md` | pendant V0-13, pas avant | opérationnel |

**Normatif** veut dire : les chiffres et les règles qui s'y trouvent ne se changent pas dans le code. Si l'implémentation impose un écart, on modifie le fichier de doc dans le même commit.

Trois lectures suffisent pour commencer : `01`, `02` et le ticket V0-1 de `07`. Le reste se lit au moment où il sert.

---

## Mise en place du repo

```bash
mkdir sifflet && cd sifflet
git init
mkdir docs
# déposer les fichiers 01 à 09 dans docs/
cp docs/08-CLAUDE.md ./CLAUDE.md
git add . && git commit -m "docs: dossier de conception"
```

---

## Premières commandes avec Claude Code

Une par session, dans cet ordre. Ne pas enchaîner deux tickets dans le même contexte : le moteur mérite d'être relu ticket par ticket.

**Session 1**

```
Lis docs/00-README.md, docs/05-architecture.md et docs/07-backlog-claude-code.md.
Implémente le ticket V0-1 (squelette du projet), et rien d'autre.
Respecte l'arborescence de docs/05-architecture.md section 2 :
crée les dossiers vides avec un .gitkeep, y compris src/lib/moteur.
Vérifie chaque critère d'acceptation du ticket avant de me répondre,
et dis-moi lequel tu n'as pas pu vérifier.
```

**Session 2**

```
Lis docs/02-game-design.md et docs/07-backlog-claude-code.md.
Implémente V0-2 puis V0-3, dans cet ordre, avec les tests.
Toutes les constantes de docs/02 vont dans src/lib/moteur/equilibrage.ts
et nulle part ailleurs. Ne code aucune logique de jeu dans ce ticket.
```

**Session 3**

```
Lis docs/03-contenu.md et docs/04-donnees.md.
Implémente V0-4 : le schéma Zod, le script de validation, et le contenu minimal.
Les 5 incidents rédigés dans docs/03-contenu.md doivent être présents
au caractère près, avec leurs valeurs de justesse et de dControle exactes.
Pour les 19 autres incidents, propose-les-moi en markdown avant de les écrire en JSON.
```

**Session 4 — le jalon qui compte**

```
Lis docs/02-game-design.md sections 1, 2, 4 et 6.
Implémente V0-5 puis V0-6.
Objectif de fin de session : je dois pouvoir jouer un match complet
dans le navigateur, sans style, et obtenir une note.
```

Après V0-6, le jeu existe. Tout le reste est de l'amélioration d'une chose qui tourne.

---

## Ce qui est contesté dans le brief d'origine

Quatre points, argumentés en fin de `09-mise-en-ligne.md` §6 : le délai de deux semaines (le mur est la rédaction, pas le code), l'auth anonyme Supabase au chargement (écartée, remplacée par du `localStorage` seul), le coût d'infrastructure en V1 (le budget est bon, il arrive plus tôt), et l'utilité même du classement quotidien (falsifiable par construction, à remplacer par la comparaison des décisions seule).

Les quatre sont appliqués dans le corps du dossier malgré la contestation, sauf l'auth anonyme, qui est explicitement remplacée avec le point de branchement indiqué pour revenir en arrière.
