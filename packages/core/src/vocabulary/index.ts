/**
 * Les vocabulaires fermes du domaine, declares UNE FOIS.
 *
 * E2 — la table litterale parallele — est la faute dominante du projet :
 * commise sur huit champs par cinq maquettes, malgre un principe explicite qui
 * l'interdisait. La lecon est qu'un principe ne suffit pas. Ce module est le
 * seul endroit ou un vocabulaire est declare, et `arthome-check-enums` signale
 * toute recopie ailleurs dans le depot.
 *
 * Chaque vocabulaire porte trois choses :
 *   - la LISTE, en `as const` — c'est elle que la porte decouvre ;
 *   - le TYPE, derive de la liste ;
 *   - un objet de MEMBRES NOMMES, pour que les regles n'ecrivent jamais une
 *     chaine litterale. C'est ce qui rend la porte tenable.
 */

export * from './tolerant.js';
export * from './catalog.js';
export * from './moderation.js';
export * from './commerce.js';
export * from './people.js';
