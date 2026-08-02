# SIFFLET

Un match, douze décisions, six secondes chacune. À la fin, la feuille de match dit ce que vous valez.

Jeu web de football gratuit, en français, mobile-first. Le joueur est l'arbitre central. Aucun compte, aucune publicité, univers entièrement fictif.

Le dossier de conception vit dans [`docs/`](docs/00-README.md) — commencer par `00-README.md`. Les conventions de travail sont dans [`CLAUDE.md`](CLAUDE.md).

## Démarrer

```bash
npm install
npm run dev          # serveur de dev, port 5173
```

## Vérifications

```bash
npm run check        # svelte-check, doit sortir 0/0
npm run lint         # prettier + eslint
npm run test         # vitest, unitaires
npm run test:e2e     # playwright
npm run build && npm run preview
```

Avant chaque commit : `npm run check && npm run lint && npm run test`.
