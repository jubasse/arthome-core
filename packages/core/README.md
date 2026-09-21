# `@arthome/core`

Le domaine Arthome. **Zéro dépendance framework** : pas de React, pas d'Angular, pas de Nest,
pas d'API navigateur, pas de Node spécifique. Le paquet tourne sous Node, Next, **Metro** et
Angular.

> Le plan complet est dans `architecture/core-port-plan.md`. Ce fichier dit comment s'en servir
> et ce qu'il ne faut pas y faire.

---

## Deux entrées, et c'est la décision structurante

```ts
import { displayStateOf, roundMinor, PlanOpening } from '@arthome/core';        // les règles
import { MoneySchema } from '@arthome/core/schema';                            // les schémas
```

| Entrée | Contenu | Dépendance |
|---|---|---|
| `.` | les règles, les vocabulaires, le temps, l'argent | **aucune** |
| `./schema` | les schémas zod de base, que `@arthome/contracts` étend | `zod` (peer, **optionnelle**) |

**L'entrée `.` n'importe zod à aucune profondeur**, et `tools/check-core-entry.mjs` le vérifie à
chaque exécution de `verify`. Le motif est mesuré (D-012) : le coût de zod est **fixe et lié à
l'import** — 93 Ko compressés pour un seul `z.string()` en entrée classique. Un seul
`import { z }` glissé au fond d'un module de règles ferait payer la facture entière à la TV et au
mobile **sans que rien ne le signale** : le code compile, les tests passent, le bundle grossit.

Une surface qui n'a besoin que des règles n'installe pas zod.

---

## Trois règles d'écriture, et elles ne se négocient pas

### 1. Aucun état global

`shared/helpers.js` porte trois états mutables — `locale`, `viewerCountry`, une horloge implicite —
plus un index global sur le jeu de fixtures. Commode dans un fichier chargé par une maquette.
**Dans un paquet importé par sept services, c'est un défaut** : deux requêtes concurrentes d'un
service NestJS partageraient la même langue et le même pays.

> Toute fonction reçoit son contexte en argument. L'horloge est un **port** (`Clock`), jamais un
> `Date.now()` au fond d'une règle.

Un test qui passe à 23 h 59 et échoue à 00 h 01 a trouvé un `Date.now()` oublié.

### 2. Jamais une chaîne littérale d'un vocabulaire

Les 36 vocabulaires fermés sont déclarés dans `src/vocabulary/`, une fois. Les règles importent
les **membres nommés** :

```ts
import { DateOutcome } from '@arthome/core';

if (outcome === DateOutcome.CANCELLED) { … }   // ✓
if (outcome === 'cancelled') { … }              // ✗ arthome-check-enums échoue
```

E2 — la table littérale parallèle — est la faute dominante du projet : commise sur huit champs par
cinq maquettes, **malgré un principe explicite qui l'interdisait**. La leçon est qu'un principe ne
suffit pas ; il faut une porte. Elle est active depuis que ce paquet existe.

### 3. La surface publique est annotée

`isolatedDeclarations` est actif : toute fonction exportée annote son type de retour, et aucun type
anonyme n'est exporté. Contrainte heureuse — un type nommé se cite dans une revue, un type anonyme
se recopie.

---

## Ce qui est écrit

| Module | État |
|---|---|
| `kernel` · `vocabulary` · `money` · `time` | **vague 1 — écrite** |
| `taxonomy` · `media` · `format` · `i18n` | vague 2 |
| `catalog` · `replay` · `permissions` | vague 3 |
| `ticketing` · `moderation` · `notification` · `search` | vague 4 |
| `entitlement` · `payout` | vague 5 — les plus exposés, donc les derniers des règles |
| `schema` | vague 6 — la seule à ajouter zod |
| `fixtures` | vague 7 |

---

## Lancer les portes

Deux d'entre elles lisent les **sources** et fonctionnent sans installation :

```bash
node packages/tooling/bin/check-enums.mjs   # la porte anti-E2
node tools/check-core-entry.mjs             # les deux entrées
```

Le reste (`typecheck`, `test`, `build`) attend `pnpm install`.
