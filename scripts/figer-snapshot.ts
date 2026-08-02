// Regénère tests/fixtures/matchs.snap.json.
// À n'exécuter QUE lorsqu'un changement du tirage est voulu et assumé : si le
// test de snapshot casse, la question n'est jamais « faut-il le mettre à jour »
// mais « qu'est-ce que j'ai changé ». Voir CLAUDE.md, pièges connus.

import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { CLUBS, CONTEXTES, INCIDENTS } from '../src/lib/contenu';
import { composer } from '../src/lib/moteur/composer';
import { resumer, SEEDS_SNAPSHOT } from '../tests/fixtures/snapshot';

const contenu = { incidents: INCIDENTS, clubs: CLUBS, contextes: CONTEXTES };
const snapshot = SEEDS_SNAPSHOT.map(({ seed, division }) =>
	resumer(composer(seed, division, contenu))
);

const chemin = join(import.meta.dirname, '..', 'tests', 'fixtures', 'matchs.snap.json');
writeFileSync(chemin, `${JSON.stringify(snapshot, null, '\t')}\n`, 'utf8');
console.log(`${snapshot.length} matchs figés dans ${chemin}`);
