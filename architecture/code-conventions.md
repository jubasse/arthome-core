# Conventions de développement et outillage

> **Portée** — les sept dépôts Arthome. Ce document dit **comment on écrit et comment on outille**,
> pas ce que le domaine doit garantir.
>
> **Écrit le 21 septembre 2026**, en application de **D-013** (conventions communes, ESLint +
> Prettier) et **D-014** (`@arthome/tooling`). Toutes les versions citées ont été relevées sur le
> registre npm et la documentation officielle **le 21 septembre 2026** — §1 donne le relevé et ses
> sources.

---

## 0. Ce que ce document est, et ce qu'il n'est pas

### Les trois documents et leur frontière

| Document | Contenu | Qui le lit, quand |
|---|---|---|
| `critical-rules.md` *(un autre coéquipier)* | Les règles **métier** impératives. Moins de vingt lignes, recopié dans chaque dépôt. | Chaque session, en entier. |
| `definition-of-done.md` *(un autre coéquipier)* | Ce qui fait qu'un lot est fini. | À la clôture d'un lot. |
| **`code-conventions.md`** *(ce document)* | Style, nommage, outillage, versions, portes automatiques. | À la création d'un dépôt, à une montée de version, quand une porte rouge n'est pas comprise. |

Une convention de style **n'entre jamais** dans `critical-rules.md` : ce fichier doit rester lisible
à chaque session, et vingt lignes de métier valent mieux que cent lignes de tabulations. Quand ce
document a besoin d'une règle métier, il **renvoie** ; il ne la recopie pas.

### L'esprit : un principe écrit ne suffit pas

`corrections-handoff.md` § E2 établit le mode de défaillance dominant du projet : la **table
littérale parallèle**. Huit champs, cinq maquettes, un principe explicite qui l'interdisait — et la
faute quand même, à chaque fois, silencieusement.

> **La leçon, appliquée à ce document : toute règle énoncée ici doit nommer la commande qui la
> vérifie.** Une règle sans porte est une intention. Le §8 ramasse toutes les portes en un tableau ;
> chaque section en amont nomme la sienne au passage.

Corollaire assumé : **ce document préfère peu de règles vérifiées à beaucoup de règles espérées.**
Quand une convention est souhaitable mais invérifiable à coût raisonnable, elle est rangée en
« recommandation » et marquée comme telle, pour qu'on ne se raconte pas qu'elle est tenue.

### Deux contraintes de contexte qui pèsent sur tout le reste

1. **Une personne seule, sept dépôts.** Tout dispositif qui demande d'être entretenu en sept
   exemplaires sera abandonné. C'est la raison d'être de `@arthome/tooling` (§4) et la raison pour
   laquelle ce document refuse husky, lint-staged et commitlint au profit de deux crochets git de
   dix lignes (§8.4).
2. **Le quota d'Actions GitHub du compte est épuisé.** Aucune porte de ce document ne suppose un
   exécuteur distant. Tout se lance en local, avec la commande donnée. Quand le quota reviendra, le
   fichier de workflow n'aura qu'à appeler les mêmes commandes — c'est pour cela qu'elles sont
   toutes regroupées derrière `pnpm run verify` (§8.2).

---

## 1. L'état vérifié des versions — 21 septembre 2026

Relevé sur `registry.npmjs.org` et les documentations officielles ce jour. **Ce tableau est la
référence ; il périme.** Le §7.5 dit comment le remettre à jour.

### 1.1 L'outillage transverse

| Paquet | Version | Note vérifiée |
|---|---|---|
| `eslint` | **10.11.0** (`maintenance` : 9.39.5) | `eslintrc` **supprimé** ; `eslint.config.*` seul format. Node `^20.19 \|\| ^22.13 \|\| >=24`. Recherche du fichier de config **depuis le dossier du fichier linté**, en remontant. |
| `prettier` | **3.9.8** (`next` : 4.0.0-alpha.13) | Prettier 4 est **en alpha** : on reste sur 3.x. |
| `eslint-config-prettier` | **10.1.8** | Entrée à plat dédiée depuis 10.1.1 : `eslint-config-prettier/flat`. Gère les règles `@stylistic` depuis 10.0.0. Peer : `eslint >=7`. |
| `typescript-eslint` | **8.70.0** | Peer : `eslint ^8.57 \|\| ^9 \|\| ^10`, **`typescript >=4.8.4 <6.1.0`**. |
| `eslint-plugin-import-x` | **4.17.1** | Peer : `eslint ^8.57 \|\| ^9 \|\| ^10`, `@typescript-eslint/utils ^8.56`. |
| `pnpm` | **12.5.1** | `minimumReleaseAge` vaut **1440 minutes par défaut depuis pnpm 11**. `minimumReleaseAgeExclude` accepte des motifs depuis 10.17. |
| `turbo` | **2.11.2** | Cache de tâches seulement (D-005, README §3). |
| Node.js | **24.21.0 « Krypton » (LTS)** | Seule ligne qui satisfait les sept dépôts — voir §7.2. |

### 1.2 Les piles, et ce qu'elles contraignent réellement

**Contrainte** = un `peerDependencies` ou un refus d'exécution constaté, pas une préférence.

| Dépôt | Pile (version relevée) | Contrainte **dure** sur TypeScript | Source de la contrainte |
|---|---|---|---|
| `arthome-studio-web`, `arthome-studio-mobile` | Angular 22.1.7 | **`>=6.0 <6.1`** | `@angular/compiler-cli@22.1.7` → `peerDependencies.typescript` |
| `arthome-platform` | NestJS 12 / `@nestjs/cli` 12.0.3 | **TS 6 de fait** | `nest build` **abandonne** sur TS 7 (`UNSUPPORTED_TYPESCRIPT_VERSION`) : le CLI appelle `getParsedCommandLineOfConfigFile`, API absente de TS 7.0 |
| `arthome-storefront-web` | Next 16.3.5 | *aucune* venant de `next` | mais `eslint-config-next@16.3.5` dépend de `typescript-eslint ^8.46` → **`<6.1`** dès qu'on lint |
| `arthome-storefront-mobile` | React Native 0.87.1 | **aucune** | `react-native@0.87.1` n'a **pas** de peer `typescript` |
| `arthome-storefront-tv` | react-native-tvos 0.87.1-1 | **aucune** | idem |
| *tout dépôt qui lint avec des règles typées* | — | **`>=4.8.4 <6.1.0`** | `typescript-eslint@8.70.0` → `peerDependencies.typescript` |

Versions de TypeScript disponibles : **`typescript@6.0.3`** (dernière 6.0.x, publiée 2026-04-16) et
**`typescript@7.0.2`** (`latest`). Microsoft publie aussi **`@typescript/typescript6@6.0.2`**, un
paquet officiel — mainteneurs `typescript-bot`, `andrewbranch`, `jakebailey` — qui expose le binaire
`tsc6` et sert à faire cohabiter les deux compilateurs (§2.5).

### 1.3 Correction apportée au tableau de D-014

D-014 porte un tableau des épinglages. Vérification faite paquet par paquet, **deux de ses quatre
lignes sont à corriger**. Ce n'est pas une remise en cause de la décision — D-014 me demandait
explicitement de vérifier — mais la conséquence change.

| Ligne de D-014 | Ce qui est vérifié | Effet |
|---|---|---|
| Angular 22 → TS `>=6.0 <6.1` | ✅ **exact**, c'est un `peerDependencies` dur | inchangé |
| Angular 22 → Vitest `^4.0.8` | ✅ exact (Vitest publie 5.0.1 en `latest`, 4.1.11 en `V4`) | inchangé |
| React 19.3 → TS **`7.0.2`** | ❌ **ce n'est pas une contrainte.** `react-native@0.87.1` n'a aucun peer `typescript` ; `@types/react@19.3.0` porte `typesVersions: {"<=5.0": …}`, donc **TS 5.1+ suffit**. `7.0.2` est ce que `npm latest` renvoyait quand l'orchestrateur `react-how-to` a été vérifié — un constat de registre, pas un plancher. | **la fracture n'est pas imposée** |
| NestJS 12 → « non épinglé » | ❌ **NestJS est le plus contraint des quatre.** `nest build` échoue sur TS 7.0 quel que soit le constructeur (`tsc`, `swc`, `rspack`). | **le backend est du côté TS 6** |

**Conséquence, et c'est la charnière de tout le §2 :** la fracture TypeScript 6 / 7 n'est pas une
fatalité imposée par React. **Le seul plancher dur est le plafond d'Angular** (`<6.1`), et il est
rejoint par NestJS et par `typescript-eslint`. Rien ne pousse vers le haut.

Mais la fracture **arrivera** : `typescript@7.0.2` est déjà `latest`, un `pnpm add typescript` distrait
l'installe, et les deux dépôts React Native peuvent l'adopter du jour au lendemain sans rien casser
d'évident — jusqu'à ce que le lint typé tombe. La contrainte de publication que D-014 énonce est donc
juste ; c'est sa cause qui était mal attribuée. Le §2 la traite comme D-014 le demande.

---

## 2. La fracture TypeScript — la contrainte structurante

### 2.1 Ce qui est réellement en jeu

`@arthome/core` et `@arthome/contracts` sont publiés une fois et consommés par sept dépôts. Leurs
`.d.ts` sont le contrat. Si un consommateur ne peut pas les lire, il ne peut pas construire — et
l'erreur apparaît **chez le consommateur**, pas chez l'éditeur, ce qui est le pire endroit pour la
découvrir.

Trois questions distinctes, souvent confondues :

1. **Avec quelle version compile-t-on les paquets partagés ?** → §2.3
2. **Quelle version chaque dépôt installe-t-il ?** → §2.2
3. **Comment prouve-t-on que les `.d.ts` publiés passent les deux ?** → §2.4

### 2.2 La décision : TypeScript 6.0.3 pour la flotte

**Les sept dépôts installent `typescript@6.0.3`, épinglé exactement (pas de `^`, pas de `~`).**

Les raisons, dans l'ordre de force :

1. **Angular ne peut pas bouger.** `>=6.0 <6.1` est un `peerDependencies` de
   `@angular/compiler-cli`. Deux dépôts sur sept sont cloués là, et Angular 23 n'existe pas.
2. **NestJS ne peut pas bouger non plus.** `nest build` abandonne sur TS 7.0.
3. **Le lint typé ne peut pas bouger.** `typescript-eslint@8.70.0` plafonne à `<6.1.0`. Or le lint
   typé est **la raison pour laquelle Biome a été écarté** (D-013) : `no-floating-promises`,
   `no-misused-promises`, `await-thenable` n'existent que parce qu'un vérificateur de types est
   branché. Adopter TS 7 sur un dépôt, c'est éteindre ces règles **sur ce dépôt** — et la demande
   de support TS 7 ouverte chez `typescript-eslint` le jour de la sortie de 7.0.2 a été **fermée
   « not planned »**, faute d'API TypeScript 7 à laquelle se brancher. L'API est attendue en 7.1.
4. **Rien ne pousse dans l'autre sens.** React Native, React et Next n'exigent rien au-dessus de
   TS 5.1. Adopter TS 7 sur les deux surfaces React Native serait un choix, non une nécessité — et
   il coûterait le lint typé sur les deux surfaces les plus contraintes en mémoire et en
   performances, c'est-à-dire celles où une promesse orpheline coûte le plus cher.

**Ce que TypeScript 7 apporte et ce qu'il n'apporte pas.** 7.0 est un **portage en Go** du
compilateur : « methodically ported from our existing implementation rather than rewritten from
scratch », logique de vérification « structurally identical to TypeScript 6.0 », environ dix fois
plus rapide. Il **n'ajoute aucune syntaxe de type**. Il durcit les dépréciations de 6.0 en erreurs et
adopte ses nouveaux défauts (`strict: true`, `module: esnext`, `types: []`, `rootDir: "./"`,
`stableTypeOrdering: true` et non désactivable). Et il **ne livre pas d'API programmatique** —
d'où le refus de `typescript-eslint`, et d'où l'échec du CLI NestJS.

> **Donc :** l'inquiétude de D-014 — « leurs types publics s'interdire toute syntaxe propre à TS 7 »
> — n'a pas d'objet au sens littéral : **il n'existe pas de syntaxe propre à TS 7**. Le danger réel
> est ailleurs, et le §2.3 le traite : ce sont les **options de compilation** et l'**ordre d'émission
> des types**, pas la grammaire.

### 2.3 Comment `@arthome/core` et `@arthome/contracts` sont compilés

Quatre règles, toutes vérifiables.

**a. Compiler avec le compilateur le plus ancien de la flotte : `typescript@6.0.3`.**
Un `.d.ts` émis par 6.0 est lu par 7.0 — la vérification est structurellement identique et 7.0
accepte les sorties de 6.0. L'inverse n'est garanti par personne. On émet donc toujours avec le
plus bas, jamais avec le plus haut. Règle générale, pas circonstancielle : **le paquet partagé se
compile avec le plancher de ses consommateurs.**

**b. `"stableTypeOrdering": true` dans le tsconfig de construction des deux paquets — et nulle part
ailleurs.**
TypeScript attribue aux types des identifiants internes dans l'ordre où il les rencontre, et trie
les unions par ces identifiants. Ajouter un `const` au-dessus d'une fonction peut donc **retourner
l'ordre d'une union dans le `.d.ts` émis**, sans qu'une seule ligne du type ait changé. TypeScript 7
utilise un tri déterministe fondé sur le contenu ; `--stableTypeOrdering`, introduit en 6.0, fait
adopter à 6.0 le tri de 7.0.

Deux bénéfices, tous deux mesurables : les `.d.ts` publiés deviennent **reproductibles** (un diff
dans `dist/` signifie un vrai changement de contrat, pas un accident d'ordre de déclaration), et ils
sont **déjà ce que 7.0 émettrait**, donc la migration future ne produira pas un faux changement de
contrat sur les sept dépôts à la fois.

Le coût annoncé est jusqu'à **25 % de vérification en plus**. C'est pourquoi l'option est réservée
au `tsconfig/lib.json` des **deux paquets publiés** — quelques centaines de fichiers, construits
rarement — et **interdite** dans les `tsconfig` d'application, où elle ralentirait chaque
vérification de type pour rien.

**Et elle est interdite pour une seconde raison, plus dure que la performance** : c'est la **seule
option de tout le dispositif qui n'existe pas des deux côtés de la fracture.** Sous TypeScript 7 le
tri déterministe « is `true` by default, and cannot be turned off ». Elle ne descend donc que dans
le fichier de base que TypeScript 7 ne lira jamais. Le raisonnement complet, et les trois fichiers
de base qui en découlent, sont au **§4.4**.

**c. `"isolatedDeclarations": true` sur les deux paquets publiés.**
Cette option refuse toute exportation dont le type ne peut pas être écrit sans inférer à travers le
corps de la fonction. Elle force à **annoter explicitement toute la surface publique**. Trois effets,
tous alignés avec ce projet :

- le `.d.ts` cesse de dépendre de subtilités d'inférence qui pourraient diverger entre deux
  compilateurs — c'est la vraie garantie « lisible par les deux », bien plus que n'importe quelle
  interdiction de syntaxe ;
- la surface publique devient lisible sans ouvrir l'implémentation, ce qui est exactement ce qu'on
  attend d'un paquet de contrats ;
- les erreurs apparaissent **chez l'éditeur**, à la construction du paquet, et non chez le
  consommateur.

C'est la contrainte la plus rentable de cette section, et elle est neuve sur le projet : à retenir
comme un ajout, pas comme un rappel.

**d. Cibles et format de module, écrits et non déduits.**
TypeScript 6.0 a changé ses défauts : `types` vaut désormais `[]` (et non plus « tous les `@types`
trouvés »), `rootDir` vaut `"."`, `module` vaut `esnext`, `target` vaut la version ES de l'année,
`strict` vaut `true`, `noUncheckedSideEffectImports` vaut `true`. `--baseUrl`, `--moduleResolution
node`, `--moduleResolution classic`, `target: es5`, `--outFile` sont supprimés ou dépréciés.

Un `tsconfig` qui s'appuyait sur les anciens défauts se comporte différemment sans avoir changé.
Les fichiers de base de `@arthome/tooling` **écrivent toutes ces options explicitement**, y compris
celles qui coïncident avec le défaut actuel : un défaut n'est pas une décision, et le prochain
majeur peut le changer.

Pour les deux paquets publiés : `target: "es2022"`, `module: "nodenext"`, `moduleResolution:
"nodenext"`, `lib: ["es2022"]`, `types: []`. `es2022` et pas plus haut parce que Metro, Hermes et le
moteur JavaScript de la TV sont les consommateurs les plus rustiques du lot, et que `@arthome/core`
s'interdit toute dépendance de plateforme (README §3) — donc aussi toute syntaxe qu'un de ses hôtes
ne sait pas digérer. `types: []` parce qu'un paquet de domaine qui capte par accident les types de
Node a cessé d'être agnostique, et que cela ne se voit qu'à la compilation d'un consommateur
navigateur.

### 2.4 La preuve : compiler les `.d.ts` contre les deux versions

D-014 est explicite — c'est la seule preuve acceptée. Elle est mécanisable en une commande et ne
dépend d'aucun exécuteur distant.

**Le principe.** Après construction de `@arthome/core` et `@arthome/contracts`, on écrit un fichier
de vérification minuscule qui **importe la surface publique** de chaque paquet, puis on le
type-vérifie deux fois : une fois avec `typescript@6.0.3`, une fois avec `typescript@7.0.2`. On ne
compile pas le code source deux fois — on compile **le contrat publié**, tel qu'un consommateur le
verra.

Dans `arthome-core`, un espace de travail `tools/dts-check/` que rien ne publie :

```
tools/dts-check/
├── package.json         # devDeps: typescript@6.0.3, @typescript/native@npm:typescript@7.0.2
├── tsconfig.json        # extends @arthome/tooling/tsconfig/base.json ; skipLibCheck: false
└── src/probe.ts         # export * from '@arthome/core'; export * from '@arthome/contracts';
```

Les **trois** points qui font que cette porte prouve quelque chose :

- **`"skipLibCheck": false`.** C'est toute la porte. Avec `skipLibCheck: true` — le défaut de
  beaucoup de modèles — TypeScript **ne vérifie pas les `.d.ts`**, et la porte devient un test qui
  passe toujours.
- **on vérifie `dist/`, pas `src/`.** Les `exports` du `package.json` doivent pointer sur les
  `.d.ts` construits. Un lien d'espace de travail pnpm qui résout vers les sources court-circuite
  exactement ce qu'on veut mesurer. Dans un espace de travail pnpm, `probe.ts` importe donc par le
  nom du paquet (`@arthome/core`) et jamais par un chemin relatif.
- **la sonde étend `@arthome/tooling/tsconfig/base.json`.** Ce n'est pas une commodité : cela fait
  que l'étape 3 vérifie **deux** choses — que les `.d.ts` passent sous TypeScript 7, *et* que le
  fichier de base partagé par les sept dépôts est encore lisible par TypeScript 7. Le jour où
  quelqu'un ajoutera une option propre à TS 6 dans la base, cette porte rougira le jour même
  (§4.4.3).

Les commandes, à lancer depuis `arthome-core` :

```bash
# 1. construire les paquets publiés (émet dist/**/*.d.ts)
pnpm -r --filter "@arthome/core" --filter "@arthome/contracts" run build

# 2. le contrat vu par TypeScript 6.0.3 — celui d'Angular, de NestJS et du lint typé
pnpm --filter dts-check exec tsc --noEmit

# 3. le même contrat vu par TypeScript 7.0.2 — celui de demain
pnpm --filter dts-check exec tsgo --noEmit     # binaire de @typescript/native

# 4. reproductibilité : la reconstruction ne doit rien changer
git diff --exit-code -- packages/*/dist/**/*.d.ts
```

L'étape 4 est le complément de `stableTypeOrdering` : si les `.d.ts` bougent alors que rien n'a
changé dans le code, c'est que l'option n'est pas active ou qu'une version d'outil a glissé. Elle
suppose que `dist/` des deux paquets publiés est **suivi par git** — c'est un choix assumé ici,
contre l'usage habituel, parce que c'est ce qui rend le changement de contrat **visible dans une
revue** plutôt que dans un incident chez un consommateur. Le coût est quelques diffs bruyants ; le
bénéfice est que `@arthome/contracts` ne peut plus changer en silence.

Les quatre échecs à savoir lire :

| Symptôme | Cause | Quoi faire |
|---|---|---|
| l'étape 2 passe, l'étape 3 échoue **sur un type** | on a utilisé un comportement que 7.0 a durci en erreur | corriger le paquet, pas la porte |
| l'étape 2 passe, l'étape 3 échoue **sur la configuration** (`TS5023` ou une option refusée) | une option propre à TS 6 a été ajoutée dans `tsconfig/base.json`, qui doit rester l'intersection | la déplacer dans `tsconfig/lib.json` (§4.4.2) |
| l'étape 3 passe, l'étape 2 échoue | on a compilé le paquet avec 7.0 par mégarde | vérifier quel `tsc` a servi (§2.5) |
| l'étape 4 échoue sans changement de source | `stableTypeOrdering` inactif, ou version de `typescript` déplacée | comparer les versions avant de toucher au code |

### 2.5 Faire cohabiter les deux compilateurs, quand c'est nécessaire

Le dépôt `tools/dts-check/` a besoin des deux TypeScript en même temps. Microsoft publie pour cela
`@typescript/typescript6`, qui installe le binaire **`tsc6`** — ce qui permet le montage inverse,
utile le jour où un dépôt devra passer en 7 avant que ses outils suivent :

```json
{
  "devDependencies": {
    "typescript": "npm:@typescript/typescript6",
    "@typescript/native": "npm:typescript@^7"
  }
}
```

`require('typescript')` résout alors TypeScript 6 — ce que chargent le CLI NestJS et
`typescript-eslint` — tandis que `npx tsc` exécute TypeScript 7.

**Deux avertissements, tous deux vérifiés :**

- `@typescript/typescript6` est publié à **6.0.2**, alors que `typescript` est à **6.0.3**. L'alias
  fait donc reculer d'un correctif. À accepter en connaissance de cause, pas par inadvertance.
- **Dans un espace de travail pnpm, ne jamais mélanger TS 6 et TS 7 entre paquets** : le greffon
  Swagger de NestJS résout le TypeScript remonté en tête et échoue. **Une seule version de
  TypeScript par dépôt** pour tout ce qu'un CLI charge. `tools/dts-check/` est la seule exception
  tolérée, parce que rien ne l'appelle depuis un CLI et que rien ne le publie.

### 2.6 Quand Angular montera

C'est la question que D-014 pose en dernier, et elle a une réponse simple parce que les §2.3 et §2.4
ont été payés d'avance.

**Ce qui déclenche la bascule** — les trois conditions, dans cet ordre :

1. TypeScript **7.1** publie l'API programmatique annoncée (« we expect TypeScript 7.1 to ship with
   a new (and different) API ») ;
2. `typescript-eslint` publie une version qui accepte `typescript >=7.1` — c'est la condition qui
   décide, parce que c'est elle qui gouverne le lint typé des sept dépôts ;
3. `@angular/compiler-cli` publie un majeur dont le peer `typescript` couvre 7.x — le jour où
   Angular 23 le fera, le plafond de la flotte disparaît.

**Ce qui se passe alors**, et ce qui ne se passe pas :

- les `.d.ts` publiés **ne changent pas** : ils sont déjà émis dans l'ordre de 7.0
  (`stableTypeOrdering`), avec une surface entièrement annotée (`isolatedDeclarations`), et la porte
  du §2.4 les valide déjà sous 7.0.2. La bascule ne rouvre pas le contrat ;
- la porte du §2.4 **s'inverse** : `typescript@7.x` devient l'étape 2 et le plancher ancien devient
  l'étape 3, tant qu'un consommateur reste derrière ;
- côté configuration, **une seule ligne disparaît** : `stableTypeOrdering` dans `tsconfig/lib.json`,
  devenue inutile puisque 7.0 l'applique toujours. C'est tout, parce que `tsconfig/base.json` et
  `tsconfig/app.json` sont déjà valides sous 7.0 par construction (§4.4.2) ;
- la bascule se fait **dépôt par dépôt**, dans l'ordre du §7.3, et jamais plus d'un dépôt en
  transit ;
- le `nest build` est le dernier à suivre, parce que le support de 7.1 dans `nest-cli` (PR #3554)
  était encore **suspendu** au 21 septembre 2026 : à revérifier avant d'y toucher.

**Ce qu'il ne faut pas faire d'ici là** : installer `typescript@latest` sur un dépôt « pour voir ».
`latest` vaut 7.0.2. Le §7.4 en fait une porte.

---

## 3. ESLint et Prettier — le partage de responsabilité

C'est la contrainte n°1 de D-013. Elle est traitée ici comme une **exigence** : chaque affirmation de
cette section se termine par la commande qui la vérifie.

### 3.1 La règle, en une phrase

> **Prettier possède le formatage. ESLint ne possède que la qualité de code. Recouvrement zéro.**

| | Prettier | ESLint |
|---|---|---|
| **Possède** | guillemets, points-virgules, largeur, indentation, virgules finales, sauts de ligne, parenthèses de flèche, position des accolades | promesses orphelines, `any`, variables inutilisées, cycles d'import, ordre des imports, règles de hooks, règles de template, accessibilité |
| **Ne touche jamais à** | la sémantique du code | une seule décision d'apparence |
| **Commande** | `prettier --check .` | `eslint .` |
| **Corrige** | `prettier --write .` | `eslint --fix .` |

Les deux commandes sont **séquentielles et indépendantes**. Elles ne sont jamais imbriquées. C'est
exactement ce que la documentation de Prettier décrit comme le montage sain : « if you run
`eslint --fix` and `prettier --write` as separate steps ».

### 3.2 `eslint-config-prettier`, et pourquoi sa position décide de tout

`eslint-config-prettier` **désactive** toutes les règles ESLint qui touchent au formatage. En
configuration à plat, ESLint applique les objets **dans l'ordre du tableau** : un objet tardif écrase
un objet antérieur. Placé avant un préréglage, `eslint-config-prettier` ne peut donc rien désactiver
de ce que ce préréglage allumera ensuite — il est simplement sans effet, **silencieusement**.

**Il est le dernier élément du tableau, sans exception.** Forme exacte, avec l'entrée à plat dédiée
introduite en 10.1.1 :

```js
// eslint.config.js — la forme, dans les sept dépôts
import { defineConfig, globalIgnores } from 'eslint/config';
import prettier from 'eslint-config-prettier/flat';   // ⚠ /flat, pas la racine

export default defineConfig([
  globalIgnores(['dist/**', 'coverage/**', '**/generated/**']),
  // … tout le reste : base, préréglages de pile, surcharges locales …
  prettier,                                            // ⚠ DERNIER, toujours
]);
```

Deux pièges, tous deux vérifiés :

- **`eslint-config-prettier` (racine) contre `eslint-config-prettier/flat`.** Les deux existent en
  10.1.8. L'entrée `/flat` porte un champ `name`, ce que l'inspecteur de configuration d'ESLint
  attend ; la racine a été conservée telle quelle pour ne pas casser l'existant. En configuration à
  plat, on importe **`/flat`**.
- **Un préréglage de pile peut embarquer sa propre copie.** C'est le cas de
  `@react-native/eslint-config@0.87.1`, qui dépend de `eslint-config-prettier@^8.5.0` — une copie en
  **majeur 8**, placée au milieu du tableau, qui ignore tout des règles `@stylistic`. Notre copie en
  10.1.8 placée **en dernier** reprend la main ; c'est la porte du §3.5 qui le **prouve**, et c'est
  précisément le scénario « un linter installé deux fois en deux versions » que D-014 redoutait.

### 3.3 `eslint-plugin-prettier` est proscrit

Interdit sur les sept dépôts. Ce n'est pas une préférence : c'est le montage qui **crée** les
conflits qu'on veut éviter. Les raisons, telles que la documentation de Prettier les donne :

1. « You end up with a lot of red squiggly lines in your editor, which gets annoying. Prettier is
   supposed to make you forget about formatting – and not be in your face about it! »
2. « They are slower than running Prettier directly. »
3. « They're yet one layer of indirection where things may break. »

Ces greffons « were especially useful when Prettier was new » ; aujourd'hui `prettier --check .`
suffit et tous les éditeurs utiles savent appeler Prettier.

**La même interdiction vaut dans l'autre sens** — et c'est le cas qu'on oublie : un **greffon
Prettier qui fait un travail de lint** est la même faute, symétrique.

| Interdit | Pourquoi |
|---|---|
| `eslint-plugin-prettier` | Prettier devenu règle ESLint |
| `prettier-plugin-organize-imports` | Prettier se met à **trier les imports**, entrant en concurrence directe avec `import-x/order` (§5.5) : deux outils, deux ordres, une guerre de `--fix` |
| `@trivago/prettier-plugin-sort-imports` | idem |
| `@stylistic/eslint-plugin` | ESLint rendu au formatage, c'est-à-dire exactement ce que `eslint-config-prettier` est là pour éteindre |

> **À noter, parce que c'est contre-intuitif** : Prettier **ne trie pas** les imports, et c'est
> délibéré. L'ordre des imports n'est donc **pas** un domaine partagé — il appartient entièrement à
> ESLint, et `import-x/order` ne crée aucun conflit. Ce n'est vrai que tant qu'aucun greffon de tri
> n'est installé côté Prettier. D'où l'interdiction ci-dessus : elle ne protège pas d'un désaccord
> de style, elle protège de la **réintroduction d'un recouvrement** là où il n'y en a pas.

### 3.4 `arrow-body-style` et `prefer-arrow-callback`

Ce sont les deux règles que D-013 demande de nommer. Leur cas exact :

- **Ce ne sont pas des règles de formatage.** `eslint-config-prettier` ne les désactive donc pas, et
  c'est correct : elles décident de la **forme du code**, pas de son apparence.
- **Elles ne posent problème que combinées à `eslint-plugin-prettier` et `--fix`**, où les deux
  correcteurs se repassent le même fichier. La documentation est explicite : « These rules are safe
  to use if you don't use `eslint-plugin-prettier`. »
- **`eslint-plugin-prettier` étant proscrit (§3.3), le problème n'existe pas ici.**

**Ce qu'on en fait, décidé :**

| Règle | Statut | Raison |
|---|---|---|
| `arrow-body-style` | **désactivée** | Elle impose une forme là où l'auteur a une raison de choisir : un corps en accolades signale souvent qu'une ligne va s'ajouter, et son `--fix` produit des diffs sans rapport avec le changement en cours. Aucun défaut n'est attrapé. |
| `prefer-arrow-callback` | **désactivée** | Même raison, et elle se heurte aux fonctions nommées passées en rappel, qui sont un choix légitime de lisibilité de pile d'appel. |

Elles figurent **explicitement** dans la configuration de base de `@arthome/tooling`, avec ce
commentaire — et non pas simplement laissées éteintes par omission. Une règle qu'on décide de ne pas
appliquer doit être écrite : sinon, le jour où un préréglage l'allume, personne ne saura si c'était
voulu.

```js
// @arthome/tooling — extrait de la configuration ESLint de base
{
  rules: {
    // Ni l'une ni l'autre n'est une règle de formatage : eslint-config-prettier
    // ne les éteint pas, et c'est normal. Elles ne deviennent nuisibles qu'avec
    // eslint-plugin-prettier, qui est proscrit ici (§3.3). On les éteint parce
    // qu'elles arbitrent un style sans attraper de défaut — pas par crainte d'un conflit.
    'arrow-body-style': 'off',
    'prefer-arrow-callback': 'off',
  },
}
```

### 3.5 La porte : le recouvrement doit être vide

**C'est la porte centrale de ce document.** Elle ne vérifie pas une opinion, elle **énumère** les
règles encore actives qui entrent en conflit avec Prettier. Elle doit rendre une liste vide, sur
chaque dépôt.

```bash
# Sur chacun des sept dépôts, depuis sa racine :
npx eslint-config-prettier src/index.ts        # un fichier représentatif, pas un chemin au hasard
```

Sortie attendue : `No rules that are unnecessary or conflict with Prettier were found.`
Toute autre sortie est un échec — et, à ce stade, **une ligne à ajouter au `rules` de fin de
tableau, jamais une raison de déplacer `eslint-config-prettier`**.

Quatre précisions qui rendent la porte fiable plutôt que rassurante :

1. **Le fichier compte.** L'outil interroge la configuration *résolue pour ce fichier*. ESLint 10
   cherche le fichier de configuration **depuis le dossier du fichier linté en remontant** : dans
   `arthome-core` et `arthome-platform`, qui sont des espaces de travail, un fichier de la racine et
   un fichier d'un paquet peuvent ne **pas** avoir la même configuration. La porte passe donc un
   fichier par **famille** de configuration, pas un seul pour tout le dépôt.
2. **Elle doit tourner après chaque ajout de préréglage.** Un nouveau préréglage de pile peut
   rallumer une règle de formatage sans le dire. C'est l'unique moyen de s'en apercevoir autrement
   qu'en voyant un diff bizarre trois semaines plus tard.
3. **Elle doit tourner après chaque montée d'ESLint ou d'un greffon**, pour la même raison.
4. **Elle est dans `pnpm run verify`** (§8.2). Une porte qu'on lance quand on y pense n'est pas une
   porte.

Les fichiers à passer, par dépôt :

| Dépôt | Fichiers représentatifs |
|---|---|
| `arthome-core` | `packages/core/src/index.ts`, `packages/contracts/src/index.ts`, `packages/tooling/index.js` |
| `arthome-platform` | `services/identity/src/main.ts`, `services/identity/src/app.module.ts` |
| `arthome-storefront-web` | `src/app/page.tsx`, `src/lib/api.ts` |
| `arthome-storefront-mobile`, `-tv` | `src/App.tsx`, `src/lib/api.ts` |
| `arthome-studio-web`, `-mobile` | `src/app/app.ts`, `src/app/app.html` |

### 3.6 Ce que Prettier possède, écrit une fois

La configuration Prettier vit dans `@arthome/tooling` et n'est **jamais redéfinie** par un dépôt
(§4.5). Son contenu :

```js
// @arthome/tooling/prettier — la configuration Prettier de la flotte
export default {
  semi: true,
  singleQuote: true,
  trailingComma: 'all',
  printWidth: 100,
  tabWidth: 2,
  useTabs: false,
  arrowParens: 'always',
  bracketSameLine: false,
  endOfLine: 'lf',
  overrides: [
    { files: '*.md', options: { proseWrap: 'always' } },
    { files: ['*.json', '*.jsonc'], options: { trailingComma: 'none' } },
  ],
};
```

Un dépôt le consomme par une ligne de son `package.json` :

```json
{ "prettier": "@arthome/tooling/prettier" }
```

Deux choix méritent leur raison, le reste est arbitraire et le sait :

- **`printWidth: 100`.** 80 fait retourner à la ligne des signatures TypeScript parfaitement
  lisibles et des chaînes de méthodes RxJS ; 120 rend les diffs côte à côte illisibles sur un
  portable. 100 est le compromis, et il est le même partout pour que déplacer du code entre dépôts
  ne reformate rien.
- **`endOfLine: 'lf'`.** Seul poste où un défaut différent produirait un diff de fichier entier.
  Doublé de `* text=auto eol=lf` dans un `.gitattributes` présent sur les sept dépôts : Prettier
  corrige le fichier, git l'empêche d'arriver.

**Le piège Angular, à traiter dans les deux dépôts Angular.** Prettier n'associe l'analyseur
`angular` — celui qui sait formater `@if`, `[prop]`, `(event)`, `{{ … }}` — qu'à l'extension
**`.component.html`**. Or Angular 20+ a **abandonné le suffixe `.component`** : le gabarit s'appelle
désormais `user-profile.html`. Prettier retombe alors sur l'analyseur `html` générique, qui formate
le balisage mais **laisse les expressions de liaison intactes** — sans erreur, sans avertissement.

Les deux dépôts Angular ajoutent donc, dans leur `.prettierrc.mjs` local, la seule surcharge
autorisée sur Prettier :

```js
import base from '@arthome/tooling/prettier';

export default {
  ...base,
  overrides: [
    ...base.overrides,
    // Angular 20+ a supprimé le suffixe `.component`, et Prettier n'associe
    // l'analyseur `angular` qu'à `.component.html`. Sans ceci, les expressions
    // de liaison ne sont pas formatées — silencieusement.
    { files: 'src/app/**/*.html', options: { parser: 'angular' } },
  ],
};
```

`index.html` reste hors de portée du motif : c'est un document HTML, pas un gabarit.

---

## 4. `@arthome/tooling` — le paquet de configuration

Troisième paquet publié de `arthome-core`, à côté de `@arthome/core` et `@arthome/contracts`
(D-014). Il porte ESLint, Prettier, TypeScript et Vitest.

### 4.1 Ce qu'il expose

Pas d'entrée `"."`. C'est délibéré : rien dans `src/` d'une application ne doit pouvoir importer ce
paquet (§4.7).

```json
{
  "name": "@arthome/tooling",
  "type": "module",
  "exports": {
    "./eslint/base":        "./eslint/base.js",
    "./eslint/node":        "./eslint/node.js",
    "./eslint/browser":     "./eslint/browser.js",
    "./prettier":           "./prettier.js",
    "./tsconfig/base.json": "./tsconfig/base.json",
    "./tsconfig/lib.json":  "./tsconfig/lib.json",
    "./tsconfig/app.json":  "./tsconfig/app.json",
    "./vitest":             "./vitest.js"
  }
}
```

| Entrée | Contenu | Qui l'étend |
|---|---|---|
| `./eslint/base` | tableau à plat : recommandations JS, `typescript-eslint` (typé), `import-x`, les règles du §5, **`eslint-config-prettier/flat` en dernier** | les sept |
| `./eslint/node` | `base` + globales Node, règles de service | `arthome-platform`, scripts d'outillage |
| `./eslint/browser` | `base` + globales navigateur | les cinq applications |
| `./prettier` | l'objet du §3.6 | les sept |
| `./tsconfig/base.json` | l'**intersection** TS 6 / TS 7, toutes options écrites, **aucun chemin** (§4.4) | les sept |
| `./tsconfig/lib.json` | `base` + `declaration`, `isolatedDeclarations`, **`stableTypeOrdering`** — le seul fichier que TS 7 ne lira jamais (§4.4.2) | `@arthome/core`, `@arthome/contracts` |
| `./tsconfig/app.json` | `base` + `noEmit`, `moduleResolution: "bundler"` | les cinq applications |
| `./vitest` | un **objet nu**, pas un `defineConfig` (§4.2) | les sept |

**Trois entrées ESLint et pas une.** Une seule entrée obligerait à embarquer les globales navigateur
dans les services et inversement, et les globales sont exactement ce qui produit les faux positifs
qui font désactiver une règle — puis oublier de la rallumer.

**Trois `tsconfig` et pas un** — c'est la question que le chef de projet pose, et elle a sa section :
**§4.4**. Les sous-chemins `./tsconfig/*.json` sont listés dans `exports` **extension comprise**,
parce que `extends` respecte `exports` (§4.4.4) — et les fichiers doivent en outre figurer dans le
champ `files` du `package.json`, sinon ils ne sont tout simplement pas publiés.

**Et trois `bin`**, qui sont les portes que ce paquet fournit aux six autres dépôts :
`arthome-check-enums` (§5.3), `arthome-check-versions` (§7.4), `arthome-check-tsconfig` (§4.5.1).
Chacun existe pour la même raison : sa table de référence ne doit vivre qu'**à un seul endroit**.

### 4.2 `dependencies` contre `peerDependencies`

D-014 nomme le piège : « un linter installé deux fois en deux versions est un classique ». La ligne
de partage est nette et tient en une question : **le dépôt nomme-t-il ce paquet lui-même ?**

```json
{
  "peerDependencies": {
    "eslint":     "^9.39.5 || ^10.11.0",
    "prettier":   "^3.9.8",
    "typescript": "6.0.3"
  },
  "peerDependenciesMeta": {
    "prettier": { "optional": false }
  },
  "dependencies": {
    "typescript-eslint":      "8.70.0",
    "eslint-config-prettier": "10.1.8",
    "eslint-plugin-import-x": "4.17.1",
    "globals":                "16.4.0"
  }
}
```

**En `peerDependencies` — les binaires que le dépôt exécute :**

- **`eslint`** — c'est `eslint` du dépôt qui tourne, qui lit le cache, que l'éditeur charge. Deux
  copies, et le greffon chargé par l'une n'est pas celui que l'autre voit. La fourchette couvre **9
  et 10** parce que les deux dépôts React Native sont cloués sur 9 (§6.3).
- **`prettier`** — `prettier --check` est lancé par le dépôt ; `@arthome/tooling` n'expose qu'un
  objet de configuration, et n'a aucune raison d'embarquer le formateur.
- **`typescript`** — c'est le nerf du §2. Épinglé **exactement à `6.0.3`**, sans `^` : un `^6.0.3`
  laisserait passer un futur 6.1 qui sortirait de la fourchette d'Angular. Une seule version de
  TypeScript par dépôt, et la même sur les sept.

**En `dependencies` — les greffons que `@arthome/tooling` importe et passe par valeur :**

En configuration à plat, un greffon est un **objet** placé dans le tableau, plus un nom résolu depuis
le dépôt comme au temps d'`eslintrc`. Il n'y a donc **aucune ambiguïté de résolution** : le greffon
que `@arthome/tooling` importe est celui qui s'exécute. C'est le seul vrai progrès de la
configuration à plat pour un paquet partagé, et il permet d'épingler ces greffons **exactement**,
sans que le dépôt ait à les connaître ni à les installer.

**Ni l'un ni l'autre — les greffons de pile, absents de `@arthome/tooling` :**

`angular-eslint`, `eslint-config-next`, `@next/eslint-plugin-next`, `eslint-plugin-react-hooks`,
`@react-native/eslint-config` ne figurent **nulle part** dans ce paquet, à aucun titre. Leur version
doit suivre le **majeur du framework installé dans le dépôt** : `angular-eslint@22.5.0` suppose
`@angular-devkit/core >= 22 < 23`, `@next/eslint-plugin-next@16.3.5` est versionné avec Next. Les
loger dans `@arthome/tooling` forcerait les sept dépôts à monter de framework ensemble — l'inverse
exact de ce que le §7.3 cherche.

**Ce qu'on refuse explicitement**, et qui est la faute classique : mettre `eslint` en
`dependencies`. pnpm installerait alors un second ESLint dans le dossier de `@arthome/tooling` ; le
lint en ligne de commande et celui de l'éditeur pourraient diverger, et le diagnostic est long parce
que rien n'échoue — les deux fonctionnent, différemment.

**La vérification**, à lancer sur chaque dépôt après installation :

```bash
pnpm why eslint typescript prettier    # attendu : une seule version résolue pour chacun
pnpm ls --depth 1 eslint               # attendu : aucune copie sous @arthome/tooling
```

### 4.3 Comment un dépôt étend, sans dupliquer

**ESLint** — les sept dépôts ont un `eslint.config.js` de cette forme, et de cette forme seulement :

```js
// eslint.config.js — arthome-storefront-web, par exemple
import { defineConfig, globalIgnores } from 'eslint/config';
import base from '@arthome/tooling/eslint/browser';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';
import prettier from 'eslint-config-prettier/flat';

export default defineConfig([
  globalIgnores(['.next/**', 'out/**', 'next-env.d.ts']),
  ...base,           // 1. le socle commun
  ...nextVitals,     // 2. la pile, qui peut rallumer des choses
  ...nextTs,
  { rules: { /* 3. surcharges locales, chacune avec sa raison en commentaire */ } },
  prettier,          // 4. DERNIER : il éteint tout ce que 2 et 3 ont pu rallumer côté format
]);
```

L'ordre **1 → 2 → 3 → 4** est la seule chose qui ne se négocie pas. Le §3.5 le vérifie.

**TypeScript** — c'est le cas qui entre en collision frontale avec la fracture du §2, et il a sa
section à lui : **§4.4**.

**Vitest** — `@arthome/tooling/vitest` exporte un **objet nu**, et n'importe **rien** de `vitest` :

```js
// vitest.config.ts d'un dépôt
import { defineConfig } from 'vitest/config';   // le defineConfig du dépôt, sa version à lui
import base from '@arthome/tooling/vitest';

export default defineConfig({ ...base, test: { ...base.test, /* propre au dépôt */ } });
```

**La raison est la fracture du §2, transposée à Vitest** : Angular 22 épingle `vitest ^4.0.8`, les
autres dépôts sont sur `5.0.1`. Si `@arthome/tooling` importait `defineConfig` depuis `vitest`, il
imposerait **une** version de Vitest aux sept dépôts et casserait les deux dépôts Angular. Un objet
nu n'impose rien : `vitest` n'apparaît ni en `dependencies`, ni en `peerDependencies` de
`@arthome/tooling`. Le paquet décrit la configuration ; il ne fournit pas l'outil.

### 4.4 Les tsconfig de base — combien, et ce que chacun porte

Le chef de projet a raison de l'expliciter : **un seul tsconfig de base ne peut pas suffire**, et la
raison est plus précise qu'une incompatibilité générale entre TypeScript 6 et 7.

#### 4.4.1 Ce qui diverge réellement entre TS 6.0.3 et TS 7.0.2

Vérifié option par option contre l'annonce de TypeScript 7.0 et les notes de version de 6.0, plutôt
que supposé. La liste est courte, et sa forme est instructive : **TypeScript 7 ne retire presque que
des options qu'on n'écrirait jamais ici.**

| Option | TS 6.0.3 | TS 7.0.2 | Nous concerne ? |
|---|---|---|---|
| `target: "es5"` | déprécié | **erreur dure** | non — on est en `es2022` |
| `downlevelIteration` | déprécié | **erreur dure** | non |
| `moduleResolution: "node"` / `"node10"` / `"classic"` | déprécié | **erreur dure** | non — `nodenext` ou `bundler` |
| `module: "amd"` / `"umd"` / `"systemjs"` / `"none"` | déprécié | **erreur dure** | non |
| `baseUrl` | déprécié | **erreur dure** | **oui, indirectement** — un modèle de `tsconfig` recopié d'Internet en contient presque toujours un (§4.4.4) |
| `esModuleInterop: false`, `allowSyntheticDefaultImports: false` | déprécié | **erreur dure** | non — on les laisse à `true` |
| `alwaysStrict: false` | déprécié | **erreur dure** | non |
| `outFile` | déprécié | **erreur dure** | non |
| `ignoreDeprecations: "6.0"` | valide, tait les avertissements | **ne tait plus rien** | non — on ne s'en sert pas, et s'en servir reviendrait à repousser ce travail |
| **`stableTypeOrdering`** | **option opt-in valide** (jusqu'à 25 % plus lent) | **`true` par défaut, « cannot be turned off »** | **oui — c'est la seule vraie collision du dispositif** |

> **La seule option de notre configuration qui n'existe pas des deux côtés de la même façon est
> `stableTypeOrdering`.** L'annonce officielle de TypeScript 7.0 dit qu'elle « is `true` by default,
> and cannot be turned off ». Si elle est acceptée en écriture explicite sous 7.0 n'est **pas
> vérifié** — les sources secondaires se contredisent — et c'est exactement pourquoi la règle
> ci-dessous rend la question sans objet plutôt que d'en dépendre.

#### 4.4.2 Trois fichiers, et la règle qui décide de leur contenu

**La règle, en une ligne : un fichier lu par les deux compilateurs ne contient que l'intersection ;
une option propre à une version descend dans le fichier que seule cette version lit.**

| Fichier | Lu par | Porte | Ne porte jamais |
|---|---|---|---|
| **`tsconfig/base.json`** | **TS 6 *et* TS 7** | les rigueurs communes : `strict` et sa famille, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `noImplicitOverride`, `noFallthroughCasesInSwitch`, `noImplicitReturns`, `useUnknownInCatchVariables`, `isolatedModules`, `verbatimModuleSyntax`, `forceConsistentCasingInFileNames`, `types: []`, `target`, `lib`, `module`, `moduleResolution` | **aucune option propre à une version**, et **aucun chemin** (§4.4.4) |
| **`tsconfig/lib.json`** | **TS 6 seulement** — la construction des deux paquets publiés | `extends` base + `declaration`, `declarationMap`, `isolatedDeclarations`, **`stableTypeOrdering`** | tout ce qui suppose un empaqueteur |
| **`tsconfig/app.json`** | TS 6 *et* TS 7 | `extends` base + `noEmit`, `moduleResolution: "bundler"`, `jsx` quand la pile en a besoin | `declaration`, `stableTypeOrdering` |

**Pourquoi trois et pas deux.** La piste du chef — `base` plus `lib` — est la bonne moitié du
problème : elle isole bien ce qui est propre aux paquets publiés. Il en manque une, et ce n'est pas
une question de version mais d'**émission** : une application ne produit pas de `.d.ts` et délègue
la résolution à son empaqueteur (`moduleResolution: "bundler"`), là où un paquet publié émet ses
`.d.ts` et doit résoudre comme Node (`nodenext`). Mettre les deux dans un seul fichier obligerait
les cinq applications à écraser trois options chacune — et une option qu'on écrase cinq fois n'est
plus verrouillée, c'est une valeur par défaut.

**Pourquoi pas quatre.** On pourrait vouloir un `base-ts7.json` pour le jour de la bascule. Inutile :
`base.json` est déjà valide sous TS 7 **par construction**, puisqu'il ne contient que
l'intersection. C'est le sens de la règle.

**Et `stableTypeOrdering` ne descend dans `lib.json` qu'ainsi**, ce qui règle la collision : le seul
fichier qui la porte est le seul que TypeScript 7 ne lira jamais, parce que les deux paquets publiés
se construisent avec TypeScript 6.0.3 (§2.3 a). Le jour de la bascule (§2.6), c'est **une ligne à
retirer dans un seul fichier**.

#### 4.4.3 La porte qui prouve que `base.json` est bien l'intersection

C'est le genre d'invariant qui se dégrade silencieusement : il suffit qu'on ajoute un jour une
option pratique dans `base.json` sans se demander si TypeScript 7 la connaît.

**Le dispositif : la sonde de `tools/dts-check` (§2.4) étend `tsconfig/base.json`.** Elle est
type-vérifiée sous les deux compilateurs. Donc **la porte 7 échoue si `base.json` cesse d'être
lisible par TypeScript 7** — et elle échoue sur le champ, chez l'éditeur, pas six mois plus tard
chez un consommateur.

```jsonc
// tools/dts-check/tsconfig.json
{
  "extends": "@arthome/tooling/tsconfig/base.json",  // ⚠ c'est ce qui fait de la porte 7
  "compilerOptions": {                               //   un contrôle du socle ET des .d.ts
    "noEmit": true,
    "skipLibCheck": false,                           // sans ceci, la porte passe toujours (§2.4)
    "types": []
  },
  "include": ["src"]
}
```

Une porte qui vérifie deux choses pour le prix d'une, et qui ne demande aucun outil de plus.

#### 4.4.4 `extends` à travers une frontière de paquet — le mécanisme, vérifié

`"extends": "@arthome/tooling/tsconfig/base.json"` utilise la **résolution de modules Node**. Les
quatre contextes que D-014 demande de contrôler, vérifiés plutôt que supposés :

| Contexte | Verdict | Ce qui a été vérifié |
|---|---|---|
| **résolution d'`exports`** | ✅ **respectée** | C'était un défaut connu — `extends` ignorait le champ `exports` et lisait toujours depuis la racine du paquet (microsoft/TypeScript#48665). **Corrigé par la PR #50955**, fusionnée en décembre 2022, donc livrée bien avant TS 6. Les sous-chemins `./tsconfig/*.json` doivent donc être **listés dans `exports`, extension `.json` comprise** (§4.1) : un sous-chemin absent est inaccessible. |
| **pnpm et ses liens symboliques** | ✅ tient | TypeScript résout `@arthome/tooling` comme un module puis lit à travers le lien ; `preserveSymlinks` reste à `false`. **Mais la contrainte pnpm est ailleurs** : `node_modules/@arthome/tooling` n'existe que si le paquet est une dépendance **directe** du dépôt. pnpm isole, il ne remonte pas les dépendances transitives — un dépôt qui hériterait de `@arthome/tooling` par transitivité ne pourrait pas l'étendre, avec un message qui parle d'un fichier introuvable. Il est donc en `devDependencies` **explicite** des sept. |
| **empaqueteur Metro** | ✅ sans objet, et c'est la bonne réponse | **Metro ne lit pas `tsconfig.json` du tout** : il transpile par Babel, sans vérification de type. `extends` ne le concerne donc jamais. Deux conséquences réelles à sa place : les `paths` doivent être **répliqués** dans `metro.config.js` (§6.3), et le champ `exports` de `@arthome/core` est bien honoré, la résolution par `exports` étant **active par défaut** dans Metro depuis la 0.82 (React Native 0.79), donc dans RN 0.87. |
| **CLI Angular** | ✅ tient, avec une garantie en plus | `ng build` passe par l'analyse de TypeScript, donc `extends` par nom de paquet fonctionne. Et Angular a **explicitement implémenté l'héritage d'`angularCompilerOptions` par `extends`**, au même niveau que `compilerOptions`. Les deux dépôts Angular gardent donc leurs `angularCompilerOptions` **chez eux** — `@arthome/tooling` n'en porte aucune, pour ne pas coupler le socle des sept à un framework qui n'en concerne que deux. |

**Le piège qui coûte le plus cher, et qui n'est pas une affaire de version.** La documentation est
sans ambiguïté : « All relative paths found in the configuration file will be resolved relative to
the configuration file they originated in. » Un chemin écrit dans `base.json` est donc résolu
**depuis `node_modules/@arthome/tooling/tsconfig/`**, et pas depuis le dépôt.

> **Règle : les trois fichiers de base ne contiennent aucune option porteuse de chemin.** Ni
> `include`, ni `exclude`, ni `files`, ni `outDir`, ni `rootDir`, ni `paths`, ni `typeRoots`, ni
> `declarationDir`. Ces options appartiennent **toujours** au `tsconfig.json` du dépôt.

`include`, `exclude` et `files` sont doublement piégeux : ils **écrasent** au lieu de fusionner, et
leurs chemins pointeraient dans `node_modules`. Un `include: ["src"]` dans la base compilerait
littéralement les sources de `@arthome/tooling`. Quant à `references`, il n'est **pas hérité** du
tout.

Et `baseUrl` est interdit pour deux raisons qui se cumulent : il porte un chemin, et il est une
**erreur dure sous TypeScript 7** (§4.4.1). Les `paths` s'écrivent donc sans `baseUrl`, dans le
dépôt, relatifs à son propre `tsconfig.json`.

#### 4.4.5 La forme, côté dépôt

```jsonc
// tsconfig.json — une application (storefront-web, par exemple)
{
  "extends": "@arthome/tooling/tsconfig/app.json",
  "compilerOptions": {
    "outDir": "dist",                       // chemin → ici, jamais dans la base
    "paths": { "@/*": ["./src/*"] },        // idem, et sans baseUrl
    "types": ["node"],                      // Next a besoin de ses globales (§6.4)
    "jsx": "preserve"
  },
  "include": ["src", "next-env.d.ts"],      // n'est jamais hérité : toujours écrit ici
  "exclude": ["node_modules", "dist"]
}
```

```jsonc
// tsconfig.build.json — @arthome/core et @arthome/contracts
{
  "extends": "@arthome/tooling/tsconfig/lib.json",
  "compilerOptions": { "outDir": "dist", "rootDir": "src" },
  "include": ["src"],
  "exclude": ["**/*.spec.ts"]
}
```

**La vérification, et c'est la seule qui dise la vérité** : `tsc --showConfig` affiche la
configuration **résolue**, après application des `extends`. Lire les fichiers ne suffit pas — c'est
ce que le compilateur a compris qui compte.

```bash
pnpm exec tsc --showConfig                                  # la config résolue de ce dépôt
pnpm exec tsc -p tsconfig.build.json --showConfig            # celle de la construction d'un paquet
```

### 4.5 Ce qui est verrouillé, ce qu'un dépôt peut redéfinir

D-014 est net : « sans cette dernière liste, `extends` n'est qu'une suggestion ». La voici — et
au-delà de la liste, la §4.5.1 dit comment on la **vérifie**, parce qu'une liste de verrous qu'on ne
mesure pas est une liste de vœux.

**Verrouillé — options de compilateur. Un dépôt qui redéfinit ceci a un défaut, pas un besoin :**

| Verrou | Valeur | Pourquoi |
|---|---|---|
| `strict` | `true` | le socle du §5.7 ; un dépôt « presque strict » n'a aucune des garanties du strict |
| `noUncheckedIndexedAccess` | `true` | §5.7 — `tableau[i]` vaut `T \| undefined` |
| `exactOptionalPropertyTypes` | `true` | §5.7 |
| `noImplicitOverride` | `true` | §5.7 |
| `noFallthroughCasesInSwitch` | `true` | l'exhaustivité du §5.3 en dépend |
| `noImplicitReturns` | `true` | §5.7 |
| `useUnknownInCatchVariables` | `true` | c'est par là qu'`any` revient (§5.6) |
| `isolatedModules` | `true` | Metro, SWC et esbuild transpilent fichier par fichier |
| `verbatimModuleSyntax` | `true` | impose `import type` (§5.5) |
| `forceConsistentCasingInFileNames` | `true` | macOS contre Linux |
| `isolatedDeclarations` | `true` **sur les deux paquets publiés** | §2.3 c — c'est la garantie « lisible par les deux » |
| `stableTypeOrdering` | `true` **dans `lib.json` uniquement** | §2.3 b, et §4.4.2 : nulle part ailleurs, jamais dans un fichier que TS 7 lira |
| `skipLibCheck` | `false` **dans `tools/dts-check`** | c'est la porte du §2.4 ; ailleurs `true` est toléré pour la vitesse |
| `baseUrl` | **absent** | porte un chemin *et* erreur dure sous TS 7 (§4.4.1) |
| la version de `typescript` | `6.0.3` | §2.2 — une seule version, la même sur les sept |

**Verrouillé — hors compilateur :** l'objet Prettier du §3.6 (sauf l'unique surcharge Angular du
§3.6) · la position de `eslint-config-prettier/flat` en dernier (§3.2) · l'interdiction
d'`eslint-plugin-prettier` et des greffons de tri Prettier (§3.3) · les règles marquées **[socle]**
au §5.

**Redéfinissable, sans justification** — et il faut que ce soit possible, sinon les dépôts
contourneront la base au lieu de l'étendre : `include` / `exclude` / `files` (ils ne sont d'ailleurs
**jamais** hérités utilement — §4.4.4), `outDir`, `rootDir`, `declarationDir`, `paths`, `typeRoots`,
`types` (Next a besoin de `["node"]`, §6.4), `lib` (une application TV n'a pas le même `lib` qu'un
service), `jsx`, `moduleResolution` quand l'empaqueteur l'impose, `angularCompilerOptions` en
entier, `globalIgnores`, la liste des préréglages de pile, la configuration Vitest hors du socle,
les motifs de fichiers de test.

#### 4.5.1 La porte : `tsc --showConfig` contre la liste

Lire les `tsconfig.json` des sept dépôts ne prouve rien — c'est la configuration **résolue** qui
s'exécute, et un `extends` peut être contourné par une seule ligne locale. Le contrôle est donc
mécanique, et il tient en une commande parce que `tsc --showConfig` émet du JSON :

```bash
# vérifie qu'aucun des verrous n'a été desserré dans ce dépôt
pnpm exec tsc --showConfig | node -e "
  const c = JSON.parse(require('fs').readFileSync(0,'utf8')).compilerOptions ?? {};
  const locked = {
    strict: true, noUncheckedIndexedAccess: true, exactOptionalPropertyTypes: true,
    noImplicitOverride: true, noFallthroughCasesInSwitch: true, noImplicitReturns: true,
    useUnknownInCatchVariables: true, isolatedModules: true, verbatimModuleSyntax: true,
    forceConsistentCasingInFileNames: true,
  };
  const bad = Object.entries(locked).filter(([k,v]) => c[k] !== v);
  if ('baseUrl' in c) bad.push(['baseUrl','doit être absent']);
  if (bad.length) { console.error('Verrous desserrés :', bad); process.exit(1); }
"
```

Ce contrôle est publié comme `arthome-check-tsconfig`, un `bin` de `@arthome/tooling` — **la table
des verrous vit donc à un seul endroit**, comme celle des versions (§7.4). Sept copies de cette
liste seraient exactement la faute E2 appliquée à l'outillage : sept tables littérales parallèles
sous un nom commun, qui divergeraient dans l'ordre où les dépôts seraient touchés.

```bash
pnpm exec arthome-check-tsconfig      # dans chacun des sept dépôts
```

**Ce que cette porte attrape et que rien d'autre n'attrape :** un `"strict": false` ajouté un soir
pour faire passer une migration, et jamais retiré. C'est le scénario exact que D-014 redoute — « chaque
dépôt désactivera la rigueur qui le gêne » — et la seule parade est de le mesurer, pas de l'interdire.

**Redéfinissable, avec une justification écrite dans le fichier :** désactiver une règle du socle sur
un motif de fichiers. La forme est imposée, et elle est vérifiable :

```js
{
  files: ['src/generated/**/*.ts'],
  rules: {
    // Code Protobuf généré : @typescript-eslint/no-explicit-any y est structurel,
    // et le fichier est réécrit à chaque `buf generate`. Voir architecture/events.md.
    '@typescript-eslint/no-explicit-any': 'off',
  },
}
```

**Interdit partout : le commentaire `eslint-disable` sans raison.** Un `eslint-disable-next-line`
doit porter sa raison sur la même ligne ou juste au-dessus. Deux motifs :

1. c'est la seule trace qu'un arbitrage a eu lieu ;
2. sur React, **un `eslint-disable` d'une règle `react-hooks/*` fait refuser la fonction entière par
   le compilateur React**, silencieusement — le bâtiment reste vert et le composant n'est plus
   optimisé (§6.2).

La porte correspondante, qui trouve les désactivations devenues inutiles :

```bash
pnpm exec eslint . --report-unused-disable-directives --max-warnings 0
```

### 4.6 Comment une montée se propage sans casser sept dépôts le même jour

C'est la question que D-014 pose en deuxième, et c'est celle qui décide si le paquet survit.

**a. Le versionnement de `@arthome/tooling` n'est pas celui d'une bibliothèque.**

| Changement | Version | Pourquoi |
|---|---|---|
| allumer une règle, durcir `warn` → `error`, monter un greffon d'un majeur | **MAJEUR** | ça rend un dépôt rouge : par définition, c'est cassant |
| ajouter une règle en `warn`, ajouter une entrée d'export, monter un greffon d'un mineur | MINEUR | |
| corriger un motif de fichiers, un commentaire, une option sans effet | CORRECTIF | |

**Le point qui n'est pas intuitif, et qui fait tout fonctionner : allumer une règle est un
changement cassant.** Un paquet de configuration qui traite l'ajout de règle comme un mineur rend
sept dépôts rouges en un `pnpm update`. C'est la version du désastre E2 appliquée à l'outillage.

**b. Toute règle nouvelle passe par `warn` avant `error`.**

Mineur `N` : la règle arrive en `warn`. Les sept dépôts la voient, personne n'est bloqué, et
`eslint . --max-warnings 0` permet à chaque dépôt de mesurer sa dette quand il le décide.
Majeur `N+1` : la règle passe en `error`, une fois les sept dépôts à zéro.

**c. Un seul dépôt en transit à la fois**, dans l'ordre du §7.3. Le dépôt en transit est nommé dans
le journal de montée (§7.5) ; tant qu'il y est, aucun autre ne bouge.

**d. Un dépôt qui ne peut pas suivre épingle le majeur précédent, et ce n'est pas un drame** — mais
c'est **daté**. Le majeur `N-1` est maintenu au plus **un cycle** ; au-delà, c'est le dépôt qu'on
corrige, pas le paquet qu'on prolonge. Le cas prévisible est celui des deux dépôts React Native
bloqués sur ESLint 9 (§6.3).

**e. `@arthome/tooling` se mange lui-même.** `arthome-core` utilise la version de l'espace de
travail, jamais la version publiée. Un majeur qui casse quelque chose le casse **d'abord chez
l'éditeur**, avant d'être publié — c'est la seule protection gratuite du dispositif.

```bash
# dans arthome-core : le paquet est consommé par lien d'espace de travail
pnpm --filter "@arthome/core" --filter "@arthome/contracts" run lint
```

**f. Publication sur GitHub Packages.** Registre déclaré dans un `.npmrc` **committé** (sans jeton) ;
le jeton reste dans le `~/.npmrc` de la machine.

```ini
# .npmrc — committé sur les sept dépôts
@arthome:registry=https://npm.pkg.github.com
```

**Le piège qu'il faut avoir vu venir** : depuis pnpm 11, `minimumReleaseAge` vaut **1440 minutes par
défaut**. Un paquet `@arthome/*` publié à l'instant serait donc **invisible pendant 24 heures** pour
le dépôt qui l'attend — et le symptôme est « la version n'existe pas », ce qui envoie chercher au
mauvais endroit. Les sept `pnpm-workspace.yaml` (ou `.npmrc` pour les dépôts sans espace de travail)
portent :

```yaml
minimumReleaseAge: 10080          # une semaine pour tout l'écosystème npm
minimumReleaseAgeExclude:
  - '@arthome/*'                  # nos propres paquets s'installent immédiatement
```

10080 plutôt que le défaut de 1440 : pour une personne seule qui ne surveille pas les avis de
sécurité en continu, une semaine de décantation sur les paquets tiers coûte peu et attrape
l'essentiel des compromissions de chaîne d'approvisionnement, qui sont détectées en quelques jours.

### 4.7 Comment il évite de devenir une dépendance de production

Quatre barrières, dont trois mécaniques.

1. **Il n'a pas d'entrée `"."`** (§4.1). `import { x } from '@arthome/tooling'` échoue à la
   résolution. C'est la barrière la plus efficace parce qu'elle n'a rien à surveiller.
2. **Il est en `devDependencies` chez les sept**, jamais ailleurs.
3. **Une règle ESLint du socle l'interdit dans le code applicatif :**

```js
{
  files: ['src/**'],
  rules: {
    'no-restricted-imports': ['error', {
      patterns: [{
        group: ['@arthome/tooling', '@arthome/tooling/*'],
        message: '@arthome/tooling est de l\'outillage : jamais dans src/.',
      }],
    }],
  },
}
```

4. **Une porte qui le vérifie**, parce que les trois précédentes peuvent être contournées par une
   dépendance transitive :

```bash
pnpm why -P @arthome/tooling      # attendu, sur les sept : aucune dépendance trouvée
```

Et côté publication, `@arthome/core` reste sous sa règle propre — **zéro dépendance framework**
(README §3). Sa porte à lui :

```bash
node -e "const p=require('./packages/core/package.json');
  const d={...p.dependencies};
  if (Object.keys(d).length) { console.error('core doit rester sans dépendance :', d); process.exit(1) }"
```

`@arthome/contracts` a le droit au runtime Protobuf et à `zod` — c'est la raison pour laquelle les
deux paquets sont séparés (README §3), et c'est **elle** qui est vérifiée : la porte de `core` est
« zéro », celle de `contracts` est « cette liste et pas une de plus ».

---

## 5. Le socle commun — ce qui vaut sur les sept dépôts

Les règles marquées **[socle]** sont verrouillées (§4.5). Les autres sont des recommandations, et
elles le disent.

### 5.1 Formatage

**[socle]** Prettier possède. La configuration est au §3.6. Il n'y a rien à discuter par dépôt, et
c'est le but : aucune minute d'attention ne doit aller là.

```bash
pnpm exec prettier --check .        # porte
pnpm exec prettier --write .        # correction
```

### 5.2 Nommage

**Fichiers et dossiers — [socle] :** `kebab-case`, toujours, sur les sept dépôts et pour toute
extension. Un seul cas de sensibilité à la casse entre macOS et Linux suffit à perdre une soirée, et
`kebab-case` le rend impossible.

**Dossiers — [socle] :** organisés **par domaine métier**, jamais par nature technique. Pas de
`components/`, `services/`, `utils/`, `types/` à la racine d'une fonctionnalité. C'est la
recommandation explicite d'Angular (« organize by feature areas, not file types ») et elle se
généralise sans dommage : `booking/` porte ses composants, ses appels, ses types et ses tests.

`utils/` mérite sa mention séparée, parce que c'est le dossier qui se remplit tout seul : une
fonction qui ne sait pas de quel domaine elle est n'a **pas encore trouvé son domaine**. Elle va dans
le domaine qui l'appelle jusqu'à ce qu'un deuxième appelant apparaisse ; à ce moment-là elle monte
dans `@arthome/core`, pas dans `utils/`.

**Symboles :**

| Nature | Convention | Exemple |
|---|---|---|
| variable, fonction, méthode, propriété | `camelCase` | `remainingSeats` |
| classe, interface, type, énumération | `PascalCase` | `BookingWindow` |
| constante de portée module, réellement constante | `SCREAMING_SNAKE_CASE` | `MAX_CHAT_MESSAGE_LENGTH` |
| valeur d'une union littérale | `kebab-case` en minuscules | `'read-only'`, `'replay-online'` |
| booléen | préfixe `is` / `has` / `can` / `should` | `canModerate` |
| fonction qui rend une promesse | verbe, pas de suffixe `Async` | `fetchBooking` |
| clé i18n | segments en `camelCase`, séparés par des points | `chat.collapse`, `account.alerts.alertHint` |
| clé i18n **d'un libellé d'énumération** | `enums.<nomDeLEnum>.<valeur>` | `enums.chatMode.read-only` |

Les deux dernières lignes sont relevées dans `shared/i18n/storefront.json`, comme les valeurs du
§5.3 et pour la même raison. La distinction entre les deux **n'est pas cosmétique** : E2 recense
parmi ses huit champs une **famille de copie `chat.*`** — `chat.free`, `chat.emoji`, `chat.off` —
qui double `enums.chatMode.*` — `open`, `emoji`, `read-only`, `off` — avec un vocabulaire qui
diverge dès la première valeur (`free` contre `open`). Un libellé d'énumération qui n'est pas sous
`enums.` est une table parallèle en devenir : c'est la porte du §5.3 qui le dit, et non la
vigilance.

**Ce qu'on ne fait pas — [socle] :** pas de préfixe `I` sur les interfaces, pas de suffixe `Type`,
pas de suffixe `Enum`, pas de `_` privé (TypeScript a `#` et `private`). Ces conventions viennent de
langages qui n'ont pas d'inférence ; ici elles font du bruit.

**Le cas des DTO de `@arthome/contracts`** — décidé, parce que c'est là que les noms circulent le
plus : le type d'un objet de frontière porte le nom du concept **sans suffixe** (`Booking`, et non
`BookingDto`) ; le type d'une commande porte le suffixe `Command` ; celui d'un événement, le suffixe
`Event` ; celui d'une réponse paginée, `Page<T>`. Le suffixe est réservé à ce qui a une **forme**
particulière, jamais à ce qui a une **provenance** particulière.

**Le suffixe de rôle sur les fichiers est un choix de pile, pas du socle.** Angular a abandonné
`.component.ts` (§6.1), NestJS l'a conservé (§6.5). Les deux ont raison chez eux. Le socle n'arbitre
pas ce point et le §6 l'assume.

### 5.3 Les énumérations, et la porte contre E2

**C'est la section la plus importante de ce document**, parce qu'elle traite la faute dominante du
projet : la **table littérale parallèle** (`corrections-handoff.md` § E2, commise sur huit champs par
cinq maquettes malgré un principe explicite).

> **Cette section a elle-même commis la faute qu'elle combat.** Sa première rédaction illustrait la
> règle avec un `CHAT_MODES = ['open', 'followers-only', 'subscribers-only', 'off']` — un vocabulaire
> **inventé**, qui n'existe nulle part dans le projet. Le vrai est `open | emoji | read-only | off`.
> La faute a été trouvée par un autre coéquipier, relisant ce document.
>
> Elle est consignée ici plutôt que discrètement corrigée, pour trois raisons. D'abord parce que
> c'est **la meilleure démonstration possible de la thèse de ce document** : l'auteur de la porte
> anti-E2 a commis E2 dans le paragraphe qui la décrit, et seule une relecture extérieure l'a vue —
> un principe écrit ne suffit pas, même à celui qui l'écrit. Ensuite parce qu'elle comptait
> **double** : `arthome-check-enums` lit ces noms de constantes, donc un exemple faux dans la
> documentation de la porte est un piège tendu à qui l'implémentera. Enfin parce qu'elle montre le
> mécanisme de la faute — je n'ai pas contredit une source, **je n'en ai consulté aucune**. La table
> littérale parallèle ne naît pas d'un désaccord, elle naît d'une reconstitution de mémoire.
>
> Les deux exemples ci-dessous sont désormais relevés à la source, et la source est nommée à chaque
> fois. **C'est la règle de rédaction de cette section** : une valeur d'énumération ne s'écrit pas
> ici sans son fichier d'origine.

**[socle] La règle :** une union littérale, déclarée **une seule fois**, dans `@arthome/core`.

```ts
// @arthome/core — la forme imposée pour toute énumération de frontière.
// Vocabulaire relevé dans proto/arthome/chat/v1/events.proto (enum ChatMode),
// concordant avec shared/i18n/storefront.json (chatMode.open|emoji|read-only|off)
// et shared/fixtures.js. Ce n'est pas un exemple : c'est l'énumération réelle.
export const CHAT_MODES = ['open', 'emoji', 'read-only', 'off'] as const;
export type ChatMode = (typeof CHAT_MODES)[number];
```

Cette forme donne trois choses qu'aucune autre ne donne ensemble : le **type** pour le
vérificateur, le **tableau des valeurs** pour l'exécution (boucles d'interface, validation, schémas
zod), et **un seul endroit à changer**.

**Le second exemple est le cas fondateur de la famille**, et il vaut d'être écrit en entier parce
qu'il montre ce que la porte cherche. `corrections-handoff.md` § D2 : deux tables décrivent la même
machine à états, et ne se rejoignent qu'en un seul point de la maquette du studio.

| `shared/catalogue.json` → `publicationStates` *(fait autorité)* | `mockups/Studio.dc.html` → `EV_MOVES` *(table parallèle)* |
|---|---|
| `draft` | `draft` |
| `reserve` | `hidden` |
| `scheduled` | `sched` |
| `technical` | `tech` |
| `live` | `live` |
| `ended` | `done` |
| `replay-online` | `replay` |

```ts
// @arthome/core — relevé dans shared/catalogue.json (publicationStates), qui fait
// autorité sur mockups/Studio.dc.html : il est explicite et c'est lui que porte
// l'i18n (enums.publicationState.*). `replay-online` dit ce que `replay` ne dit
// pas — la rediffusion est EN VENTE. Voir corrections-handoff.md § D2.
export const PUBLICATION_STATES = [
  'draft', 'reserve', 'scheduled', 'technical', 'live', 'ended', 'replay-online',
] as const;
export type PublicationState = (typeof PUBLICATION_STATES)[number];
```

Ce que cet exemple enseigne, et que la seule règle n'enseigne pas : **les deux tables sont
lisibles, cohérentes et fonctionnelles chacune de son côté.** Rien ne plante. Le coût n'apparaît
qu'au moment où deux personnes — ou deux agents — lisent chacun la sienne et écrivent deux
contrats. C'est pourquoi la détection ne peut pas être laissée à la relecture.

**[socle] `enum` est interdit.** Quatre raisons, dans l'ordre :

1. un `enum` TypeScript **émet du code à l'exécution** — inacceptable dans `@arthome/core`, qui
   s'interdit toute empreinte de plateforme, et coûteux sur les surfaces contraintes ;
2. `const enum` ne survit pas à `isolatedModules`, que toute la flotte active ;
3. un `enum` ne se sérialise pas naturellement en JSON, alors que **toutes** ces valeurs traversent
   une frontière HTTP, gRPC ou Protobuf ;
4. une union littérale se rétrécit (`narrowing`) et s'exhaustive (`switch` sans `default`), ce qu'un
   `enum` numérique ne fait pas correctement.

**[socle] L'exhaustivité est obligatoire** sur tout `switch` portant sur une union littérale : pas de
`default`, et une branche `never` finale. C'est ce qui transforme « on a ajouté une valeur » en
erreur de compilation sur les sept dépôts, plutôt qu'en comportement manquant sur un écran.

```ts
function assertNever(value: never): never {
  throw new Error(`Unhandled variant: ${String(value)}`);
}
// … switch (mode) { case 'open': … ; default: return assertNever(mode); }
```

**La porte — et c'est ici que ce document essaie de valoir mieux qu'un principe.**

E2 prouve qu'écrire la règle ne suffit pas. Ce qu'il faut, c'est détecter **la réapparition d'une
valeur d'énumération ailleurs que là où elle est déclarée**. C'est mécanisable et bon marché :

> Un script `tools/check-enum-literals.mjs`, dans `arthome-core`, qui :
> 1. importe depuis `@arthome/core` **toutes** les constantes exportées qui sont des tableaux de
>    chaînes `as const`, sans en connaître la liste à l'avance, et collecte l'ensemble de leurs
>    valeurs ;
> 2. parcourt les fichiers source du dépôt (`src/**`, `app/**`), hors le module de déclaration, hors
>    `**/generated/**`, hors les fichiers de test ;
> 3. signale toute chaîne littérale appartenant à cet ensemble ;
> 4. sort en code 1 avec fichier, ligne et valeur.

**Le point 1 se découvre, il ne s'énumère pas**, et c'est délibéré. Une première rédaction de ce
paragraphe donnait la liste en dur — `CHAT_MODES`, `REPLAY_POLICIES`, `PUBLICATION_STATES`,
`MODERATION_STATES`, `CURRENCIES` — ce qui aurait été **une table parallèle de plus** : la liste des
énumérations, recopiée à côté des énumérations. Le script lit ce que `@arthome/core` exporte
réellement ; une énumération nouvelle est couverte le jour où elle est déclarée, sans que personne
ait à penser à l'inscrire quelque part.

Un exemple de ce que la liste en dur aurait coûté, et il n'est pas théorique : `MODERATION_STATES`
au singulier **conflait trois axes que `proto/arthome/chat/v1/events.proto` sépare** — `MessageState`
(l'état du message), `ModerationItemState` (la nature de la ligne de file, où vit `reported`) et
`ModerationVerdict` (la sanction). C'est exactement l'écart E3, reproduit par un nom de constante
inventé au lieu d'être relevé.

Les exceptions légitimes — un test qui construit une donnée, un plan de correspondance i18n — sont
listées dans un `tools/enum-literals.allow.json` **versionné**, chaque ligne portant sa raison. Le
fichier d'exceptions est court ou la règle est mauvaise : au-delà de vingt lignes, c'est le signe
qu'une valeur manque dans `@arthome/core`.

Ce script est **le seul** que ce document demande d'écrire, et il est court. Il est publié comme un
`bin` de `@arthome/tooling` pour que les six autres dépôts l'exécutent contre leurs propres sources
en lisant les valeurs depuis `@arthome/core` installé :

```bash
pnpm exec arthome-check-enums        # dans chacun des sept dépôts
```

**Complément côté contrats** : chaque énumération de frontière est **dérivée**, jamais recopiée, dans
le schéma zod de `@arthome/contracts` (`z.enum(CHAT_MODES)`) et dans le `.proto` correspondant. Un
`.proto` ne peut pas importer du TypeScript ; c'est donc le point où la duplication est inévitable,
et c'est exactement pour cela qu'elle doit être **générée ou vérifiée**, pas écrite à la main. Le
détail appartient à `architecture/events.md` ; ce document se contente d'exiger que le contrôle
existe et figure dans `pnpm run verify`.

### 5.4 Structure d'un dépôt

Commun aux sept — ce qui doit exister et porter ce nom :

```
<dépôt>/
├── .npmrc                  registre @arthome (sans jeton)
├── .gitattributes          * text=auto eol=lf
├── .nvmrc                  24.21.0
├── eslint.config.js        socle + pile + prettier en dernier (§4.3)
├── .prettierrc.mjs         seulement si surcharge — sinon le champ "prettier" du package.json
├── tsconfig.json           extends @arthome/tooling/tsconfig/{app|lib}.json
├── package.json            packageManager: "pnpm@12.5.1", engines.node
├── README.md               ce que ce dépôt est, comment on le lance, comment on le vérifie
└── src/                    organisé par domaine (§5.2)
```

Deux dépôts ont un espace de travail pnpm (`arthome-core`, `arthome-platform`) : `packages/*` pour
l'un, `services/*` et `infra/` pour l'autre (README §3). Les cinq applications sont des dépôts
simples, avec leur propre `node_modules` et leur propre verrou — c'est ce qui fait disparaître la
friction Metro/pnpm évoquée dans le dossier de passation.

**`README.md` est obligatoire et il porte trois choses** : ce que le dépôt est, comment on le lance,
comment on le vérifie. Un dépôt vitrine dont le `README` ne dit pas comment lancer les portes n'a pas
de portes du point de vue d'un lecteur extérieur.

### 5.5 Imports et leur ordre

**[socle]** L'ordre est tenu par `import-x/order`, en `error`, corrigeable par `--fix`. Prettier ne
trie pas les imports (§3.3), donc **aucun recouvrement**.

Groupes, séparés par une ligne vide, dans cet ordre :

1. `builtin` — `node:fs`, toujours avec le préfixe `node:`
2. `external` — dépendances tierces
3. `internal` — `@arthome/core`, `@arthome/contracts`
4. `parent`, `sibling`, `index` — relatifs

Alphabétique à l'intérieur de chaque groupe, casse ignorée.

**[socle] Interdits, chacun avec son défaut réel :**

| Interdit | Règle | Défaut évité |
|---|---|---|
| remonter au-delà d'un niveau (`../../`) | `import-x/no-relative-parent-imports` (hors tests) | un chemin relatif profond est un couplage entre domaines qu'on n'a pas vu |
| un cycle d'imports | `import-x/no-cycle` | sur NestJS en ESM, c'est un `TDZ` au démarrage ou `TS1272`, et le message ne désigne pas le cycle |
| importer un type sans `import type` | `@typescript-eslint/consistent-type-imports` | un import de type qui survit à la compilation retient un module entier — c'est **la** cause de poids mort sur Metro |
| importer depuis `dist/` ou un chemin interne d'un paquet | `no-restricted-imports` | court-circuite `exports`, donc le contrat |

**[socle] Un fichier baril (`index.ts` qui réexporte tout) est interdit dans `@arthome/contracts`**,
et déconseillé partout ailleurs. Ce n'est pas un goût : c'est **D-012**, mesuré par deux agents
indépendamment — l'entrée barillet de zod rendait joignables 64 fichiers de traduction, soit
**93 Ko gzip contre 7,5 Ko**, pour un coût **fixe et non marginal**. Un baril annule l'élagage sur
tout empaqueteur qui ne fait pas d'analyse inter-modules — dont Metro par défaut.

### 5.6 Gestion des erreurs

**[socle] Trois natures d'erreur, trois traitements.** La faute à éviter est de les confondre, parce
qu'elles n'ont ni le même destinataire ni la même politique de reprise.

| Nature | Ce que c'est | Traitement |
|---|---|---|
| **Erreur de domaine** | une règle métier dit non : jauge pleine, fenêtre de rediffusion fermée, droit manquant | une classe d'erreur typée de `@arthome/core`, portant un **code stable** ; jamais une chaîne |
| **Erreur d'infrastructure** | le réseau, la base, le courtier | remontée telle quelle, avec sa cause ; politique de reprise décidée à l'appel, pas au lancement |
| **Défaut de programmation** | invariant rompu, `assertNever` atteint | on laisse tomber le processus ; on ne rattrape pas |

**[socle] Règles vérifiables :**

- `@typescript-eslint/no-floating-promises` en **error** — règle typée, et l'une des raisons pour
  lesquelles Biome a été écarté (D-013). Une promesse orpheline est un échec invisible ;
- `@typescript-eslint/no-misused-promises` en **error** — une `async` passée là où un rappel
  synchrone est attendu, et l'erreur disparaît ;
- `@typescript-eslint/only-throw-error` en **error** — on ne lance que des `Error` ;
- `@typescript-eslint/use-unknown-in-catch-callback-variable` en **error**, et `useUnknownInCatchVariables`
  dans `tsconfig` : un `catch (e)` donne `unknown`, pas `any`. C'est le point d'entrée par lequel
  `any` revient le plus souvent dans un projet strict ;
- un `catch` qui ne fait que journaliser **et** poursuivre est un défaut, pas un traitement : soit
  on rattrape et on décide, soit on laisse remonter.

**[socle] Le code d'erreur d'une erreur de domaine vient de `@arthome/core`, comme une valeur
d'énumération** — donc soumis à la porte du §5.3. Ce projet est en **i18n par codes** (D-012) : un
message de bibliothèque est inaffichable, et un code inventé sur place est intraduisible.

**L'enveloppe d'erreur de frontière** — sa forme, ses champs, la distinction « votre connexion »
contre « nos serveurs » relevée par les spécialistes de surface — appartient à
`@arthome/contracts` et à `architecture/context-map.md`. Ce document exige seulement qu'elle soit
**une seule forme**, définie une fois.

### 5.7 TypeScript — ce qui n'est pas négociable

**[socle] Dans `@arthome/tooling/tsconfig/base.json`, verrouillé :**

```jsonc
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,     // tableau[i] est T | undefined — la source d'erreur n°1 en production
    "exactOptionalPropertyTypes": true,   // { a?: string } n'accepte pas { a: undefined }
    "noImplicitOverride": true,
    "noFallthroughCasesInSwitch": true,
    "noImplicitReturns": true,
    "useUnknownInCatchVariables": true,
    "isolatedModules": true,              // Metro, SWC et esbuild transpilent fichier par fichier
    "verbatimModuleSyntax": true,         // impose `import type`, supprime l'ambiguïté d'élision
    "forceConsistentCasingInFileNames": true,
    "types": []                           // TS 6 l'exige de fait : plus de découverte automatique
  }
}
```

`noUncheckedIndexedAccess` et `exactOptionalPropertyTypes` sont les deux qui font râler et les deux
qui paient. Elles sont **activées dès le premier jour** : les activer sur une base existante coûte
dix fois plus, et c'est précisément la raison de calendrier qui a motivé D-013.

**[socle] Interdits, avec leur règle :**

| Interdit | Règle | Exception |
|---|---|---|
| `any` explicite | `@typescript-eslint/no-explicit-any` | `src/generated/**` (§4.5) |
| `as T` non vérifié | `@typescript-eslint/consistent-type-assertions` (`objectLiteralTypeAssertions: 'never'`) | `as const` ; un `satisfies` fait presque toujours l'affaire |
| `!` d'assertion non nulle | `@typescript-eslint/no-non-null-assertion` | aucune : on écrit la vérification |
| `@ts-ignore` | `@typescript-eslint/ban-ts-comment` | `@ts-expect-error` **avec description**, jamais `@ts-ignore` — la différence est que `@ts-expect-error` devient une erreur le jour où le problème est résolu |
| `enum` | `no-restricted-syntax` sur `TSEnumDeclaration` | aucune (§5.3) |
| `namespace` | `@typescript-eslint/no-namespace` | fichiers de déclaration tiers |
| `require()` dans du TypeScript | `@typescript-eslint/no-require-imports` | `metro.config.js` et autres configurations CJS |

**`satisfies` plutôt que `as`, et c'est une consigne d'écriture, pas seulement une interdiction :**
`as` dit au vérificateur de se taire ; `satisfies` lui demande de vérifier **puis** de conserver le
type précis inféré. Pour un objet de configuration ou une table de correspondance, `satisfies` est
toujours la bonne réponse — et il préserve le rétrécissement dont dépend la porte du §5.3.

**Le lint typé est obligatoire** — `parserOptions.projectService: true` dans la configuration de
base. Sans lui, `no-floating-promises`, `no-misused-promises`, `await-thenable` et
`no-unnecessary-condition` ne s'exécutent pas. C'est **ce que Biome n'a pas** et la raison de D-013 ;
un dépôt qui l'éteint pour gagner du temps a annulé la décision.

### 5.8 Tests

**[socle] Vitest partout** — mais pas la même version (§4.3) : `^4.0.8` sur les deux dépôts Angular,
`5.0.1` ailleurs. C'est une divergence imposée, pas subie ; elle disparaîtra avec Angular 23.

**[socle] Emplacement :** le test est **à côté** du fichier qu'il teste, `<nom>.spec.ts`. Pas de
dossier `__tests__`, pas d'arborescence `test/` parallèle — une arborescence parallèle finit
toujours par diverger de la structure qu'elle double, et c'est encore E2 sous un autre visage.

`.spec.ts` et non `.test.ts` : c'est ce qu'Angular impose (`user-profile.spec.ts`), et aligner les
cinq autres coûte zéro.

**[socle] Nommage d'un cas :** une phrase qui décrit le **comportement attendu**, pas la fonction
appelée.

```
✗ it('calls computeRemainingSeats')
✓ it('rend zéro place restante quand la jauge est atteinte')
```

**[socle] Pas de simulacre pour ce qui vient de `@arthome/core`.** Le domaine est pur et
déterministe — le simuler, c'est tester le simulacre. C'est même l'inverse qu'on veut : les
`fixtures/` déterministes de `@arthome/core` (README §3) sont le jeu de données **de référence** des
tests des sept dépôts. Un test qui recompose à la main une donnée que `fixtures` sait produire est
une **table littérale parallèle** — E2, à nouveau.

**Ce que le socle n'impose pas, délibérément :** un seuil de couverture chiffré. Pour un projet solo,
un seuil global produit des tests écrits pour le chiffre. Ce qui est exigé est ciblé : les modules de
`@arthome/core/domain/**` (jauge, fenêtre de rediffusion, commission, droits, fuseaux) sont testés
exhaustivement sur leurs **bornes**, parce que ce sont eux qui composent les valeurs que
`corrections-handoff.md` a trouvées divergentes partout. `definition-of-done.md` a le dernier mot sur
ce qui fait un lot fini.

### 5.9 Messages de commit

**[socle] Conventional Commits, en anglais**, conformément à D-008.

```
<type>(<scope>): <sujet à l'impératif, sans majuscule, sans point final>

<corps facultatif : pourquoi, jamais quoi — le diff dit déjà quoi>

<pied facultatif : BREAKING CHANGE:, Refs: …>
```

**Types :** `feat`, `fix`, `refactor`, `perf`, `test`, `docs`, `build`, `chore`, `revert`.

**Portées :** le nom du paquet, du service ou de la surface — `core`, `contracts`, `tooling`,
`identity`, `catalog`, `ticketing`, `chat`, `payouts`, `streaming`, `notifications`, `storefront-web`,
`storefront-mobile`, `storefront-tv`, `studio-web`, `studio-mobile`. Une portée qui n'est dans aucune
de ces listes est probablement un commit qui fait deux choses.

**[socle] Un `BREAKING CHANGE:` est obligatoire** pour tout changement de la surface publique de
`@arthome/core`, `@arthome/contracts` ou `@arthome/tooling`. Pour `@arthome/contracts`, il vaut
**changement de contrat** et déclenche le raisonnement du §7.1.

**La porte, sans dépendance** — `commitlint` demanderait un paquet, une configuration et un crochet à
entretenir en sept exemplaires. Un crochet `commit-msg` de dix lignes fait le même travail (§8.4).

---

## 6. Ce qui reste légitimement propre à chaque pile

**Le principe.** Uniformiser ce qui se déplace d'un dépôt à l'autre — les noms, les erreurs, les
imports, les tests, le formatage. **Ne pas uniformiser ce qu'un framework tient pour lui**, parce
qu'aligner de force coûte des désactivations de règles, et qu'une désactivation qu'on répète devient
une désactivation qu'on oublie.

Le test pour arbitrer : **est-ce que forcer l'uniformité ici me ferait éteindre une règle qui attrape
de vraies fautes ?** Si oui, la divergence est légitime. Chaque cas ci-dessous passe ce test.

### 6.1 Angular 22 — `arthome-studio-web`, `arthome-studio-mobile`

**Ce qui s'ajoute :** `angular-eslint@22.5.0` (peer `eslint ^9 || ^10`, `typescript-eslint ^8`,
`@angular-devkit/core >=22 <23`), en deux blocs — un pour les `.ts`, un pour les `.html` :

```js
// eslint.config.js — les deux dépôts Angular, forme
export default defineConfig([
  ...base,                                        // @arthome/tooling/eslint/browser
  { files: ['**/*.ts'],
    extends: [...tseslint.configs.recommended, ...angular.configs.tsRecommended],
    processor: angular.processInlineTemplates },  // ⚠ sans ça, les gabarits en ligne ne sont pas lintés
  { files: ['**/*.html'],
    extends: [...angular.configs.templateRecommended,
              ...angular.configs.templateAccessibility] },
  prettier,                                       // DERNIER
]);
```

**Pourquoi c'est légitime, et pas du laxisme :** le lint de gabarit est **la raison écrite** pour
laquelle Biome a été écarté (D-013). `@angular-eslint/eslint-plugin-template` attrape des fautes
qu'aucun analyseur de TypeScript ne peut voir — une liaison vers une propriété inexistante, un
`*ngFor` sans `trackBy`, un `@if` mal imbriqué, un contrôle sans étiquette accessible. Sur un studio
de régie, `templateAccessibility` n'est pas un supplément d'âme : c'est la moitié des fautes
d'interface.

**Ce qui diverge du socle, et pourquoi :**

| Divergence | Raison |
|---|---|
| **pas de suffixe `.component` / `.service` sur les fichiers** : `user-profile.ts`, classe `UserProfile` | c'est la convention Angular depuis la v20, et c'est le défaut des schémas du CLI. Forcer le suffixe signifie passer `type` + `addTypeToClassName` à chaque génération, pour toujours. Le socle n'arbitre pas le suffixe de rôle (§5.2) |
| `typescript` cloué à `6.0.3` | `@angular/compiler-cli@22.1.7` (§1.2) |
| `vitest ^4.0.8` | hors de la fourchette de pair d'Angular sinon (§4.3) |
| `.prettierrc.mjs` local avec `parser: 'angular'` | conséquence directe de l'abandon du suffixe (§3.6) |
| `OnPush` **est** la stratégie par défaut | à partir d'Angular 22, l'opt-out est `ChangeDetectionStrategy.Eager` et `Default` est déprécié |

**Deux pièges propres à Angular 22 qu'aucune règle ESLint n'attrape**, et qui valent d'être écrits
ici parce qu'ils sont silencieux :

- **zoneless.** C'est le défaut du démarrage depuis Angular 21. Dans une application zoneless,
  `NgZone.run()` ne planifie rien (`NgZone` est lié à `NoopNgZone`, dont `run` vaut `fn.apply(...)`),
  `runOutsideAngular()` est un passe-plat, `isStable` vaut toujours `true` et `onStable` /
  `onMicrotaskEmpty` n'émettent jamais. Une vue figée se répare **dans cet ordre** : écrire dans un
  signal → `ChangeDetectorRef.markForCheck()` → `ApplicationRef.tick()` en dernier recours.
- **on n'ajoute pas `provideZonelessChangeDetection()`** à une nouvelle application : zoneless est
  l'**absence** de fournisseur. C'est l'opt-out qui s'écrit.

### 6.2 React 19.3 — `arthome-storefront-mobile`, `arthome-storefront-tv`, et la partie React de Next

**Ce qui s'ajoute :** `eslint-plugin-react-hooks@7.1.1`, préréglage à plat :

```js
import reactHooks from 'eslint-plugin-react-hooks';
// …
{ files: ['**/*.{ts,tsx}'], ...reactHooks.configs.flat.recommended },
```

**Le piège de version, vérifié :** à la version 7, `configs.recommended` est devenu un objet au
format `eslintrc` (16 règles) ; l'étaler dans un tableau à plat **échoue au chargement** avec un
message qui parle d'`eslintrc` et ressemble à un bogue de configuration. Les clés `flat/recommended`,
`recommended-legacy` et `recommended-latest-legacy` de la version 6 **n'existent plus**. En
configuration à plat, on écrit `reactHooks.configs.flat.recommended`, jamais autre chose.

**À attendre, et ce n'est pas une régression :** passer de 6 à 7 fait rougir une base saine —
`recommended` passe de 2 à 16 règles et allume les règles du compilateur. **On corrige, on ne
réépingle pas.**

**Pourquoi c'est légitime :** ces règles sont l'autre moitié de la raison pour laquelle Biome a été
écarté (D-013). Et surtout, **un `eslint-disable` d'une règle `react-hooks/*` fait refuser la
fonction entière par le compilateur React** — catégorie `Suppression` — qui l'émet non optimisée,
sans rien journaliser, bâtiment vert. C'est le cas d'école de la règle qui doit rester allumée : la
désactiver ne masque pas un avertissement, elle **annule une optimisation** ailleurs.

D'où la conséquence pratique, à retenir : **`--report-unused-disable-directives` (§4.5) n'est pas un
nettoyage cosmétique sur ces deux dépôts** ; c'est le seul détecteur des désactivations `react-hooks`
oubliées, et donc des composants silencieusement non compilés.

**Le compilateur React, si et quand il est activé :** `babel-plugin-react-compiler@1.0.0` est un
réglage de construction opt-in, **jamais un défaut de React 19**. Trois règles :

- **l'épingler exactement** — un changement de granularité de mémoïsation peut faire sur- ou
  sous-déclencher un effet, ce qu'une couverture de bout en bout mince ne voit pas ;
- **ne jamais supprimer** un `useMemo` / `useCallback` / `memo` existant sous prétexte que le
  compilateur est là : celui qui alimente les dépendances d'un effet change le comportement quand on
  l'ôte ;
- **`'use no memo'` se met dans le corps** de la fonction ; au niveau du module, il éteint le fichier
  **et** journalise quand même `CompileSuccess`, donc tout script de couverture le comptera comme
  compilé.

Et `eslint-plugin-react-compiler` **ne s'installe pas** : dernière publication en août 2025, restée
au stade RC, jamais stable. Ses règles vivent dans `eslint-plugin-react-hooks`.

### 6.3 React Native et react-native-tvos — les deux dépôts de surface mobile et TV

**Ce qui s'ajoute :** `@react-native/eslint-config@0.87.1`, par son entrée `./flat`.

**Deux divergences imposées, et datées :**

| Divergence | Cause vérifiée | Condition de sortie |
|---|---|---|
| **ESLint 9.39.5** (et non 10.11.0) sur ces deux dépôts | `@react-native/eslint-config@0.87.1` a pour peer `eslint ^8.0.0 \|\| ^9.0.0` — **pas 10** | une version de `@react-native/eslint-config` acceptant ESLint 10 |
| une **seconde copie** d'`eslint-config-prettier`, en **majeur 8** | le préréglage RN en dépend (`^8.5.0`) | la même |

La seconde ligne est exactement ce que D-014 appelait « un linter installé deux fois en deux
versions ». Elle est **inoffensive ici**, pour une raison précise : notre `eslint-config-prettier/flat`
en 10.1.8 est placé **en dernier** (§3.2) et reprend donc la main sur tout ce que la copie en 8 a pu
laisser passer — notamment les règles `@stylistic`, que la version 8 ne connaît pas. Mais
« inoffensif » n'est pas « vérifié » : c'est la porte du §3.5 qui le **prouve**, sur ces deux dépôts
plus qu'ailleurs, et c'est là qu'elle gagne son coût.

`@arthome/tooling` déclare `eslint: "^9.39.5 || ^10.11.0"` en peer pour couvrir les deux mondes
(§4.2).

**Ce qui s'ajoute encore, propre à l'empaqueteur :**

- **`metro.config.js` ne lit pas `tsconfig.json`.** Metro transpile par Babel, sans vérification de
  type : l'`extends` de `@arthome/tooling` ne le concerne donc **jamais** (§4.4.4). En revanche les
  `paths` déclarés en TypeScript doivent être **répliqués** dans la configuration de Metro. C'est une
  duplication inévitable, donc à traiter comme telle : un commentaire croisé dans les deux fichiers,
  et la porte `tsc --noEmit` qui échoue si l'un diverge de l'autre (il échouera sur l'import, pas sur
  la duplication — c'est une preuve indirecte, et c'est mieux que rien).
- **La résolution par `exports` est acquise, elle.** Elle est activée **par défaut** dans Metro
  depuis la 0.82 (React Native 0.79), donc ici : l'entrée sans baril de `@arthome/contracts` (D-012)
  est bien celle que Metro résout. Si un jour un paquet tiers s'y casse, l'échappatoire est
  `resolver.unstable_enablePackageExports: false` — **et c'est alors tout le dépôt qui repasse en
  résolution héritée**, y compris nos paquets. À ne pas faire sans mesurer.
- **L'élagage n'est pas acquis.** D-012 le consigne : le gain de `zod/mini` est **conditionnel à un
  élagage que l'empaqueteur React Native n'active pas par défaut**, et la mesure (7,5 Ko contre
  93 Ko) a été faite sur un schéma isolé compilé par esbuild, pas sur un bundle applicatif réel. La
  règle qui en découle est ferme : **aucun fichier baril** (§5.5), et vérification sur un vrai bundle
  au palier mobile.
- **La TV n'a pas de clavier.** Ce n'est pas une convention de code, mais cela a une conséquence de
  code : toute saisie de plus de six caractères doit être un appairage d'appareil. Le contrat le
  porte ; ce document le rappelle pour que personne n'écrive un formulaire sur la TV par habitude.

**Deux dépôts et non un**, malgré un code très proche : c'est la structure multi-dépôts du README §3,
et c'est ce qui fait disparaître le conflit `react-native-tvos` / Expo dans un espace de travail
partagé. Le prix est la duplication ; il est payé volontairement, et `@arthome/tooling` plus
`@arthome/core` sont ce qui le rend supportable.

### 6.4 Next 16 — `arthome-storefront-web`

**Ce qui s'ajoute :** `eslint-config-next@16.3.5`, en deux préréglages à plat :
`eslint-config-next/core-web-vitals` et `eslint-config-next/typescript`, composés comme au §4.3.

**Deux points de version, vérifiés dans la documentation de Next 16.3.5 :**

- **`next lint` est supprimé depuis Next 16.** On appelle la ligne de commande ESLint directement, et
  l'option `eslint` du fichier `next.config` n'a plus d'objet. Une recette qui dit `next lint` est
  antérieure à Next 16.
- La documentation de Next **recommande elle-même** `eslint-config-prettier` importé depuis
  `eslint-config-prettier/flat` et placé après `nextVitals`. C'est exactement le montage du §3.2 : la
  règle de ce document n'est pas une invention locale.

**Pourquoi c'est légitime :** `@next/eslint-plugin-next` attrape des fautes propres au cadre et
invisibles autrement — un composant client déclaré `async`, un `<a>` vers une route interne, un
`<img>` à la place de `next/image`, `beforeInteractive` hors du document. Rien de tout cela n'est un
avis de style ; ce sont des régressions de performance et de rendu, et `core-web-vitals` les fait
passer d'avertissement à erreur, ce qui est le bon niveau pour une vitrine.

**Attention à `types: []`** (§2.3 d) : Next a besoin de ses types globaux. Le `tsconfig.json` du
dépôt ajoute `"types": ["node"]` et conserve la référence `next-env.d.ts` — qui reste dans
`globalIgnores`, parce qu'il est généré.

### 6.5 NestJS 12 — `arthome-platform`

**Ce qui s'ajoute :** la configuration Node (`@arthome/tooling/eslint/node`) et des règles
compatibles avec l'injection par décorateurs.

**Ce qui diverge du socle, et pourquoi c'est légitime :**

| Divergence | Raison |
|---|---|
| **le suffixe de rôle sur les fichiers est conservé** : `booking.service.ts`, `booking.controller.ts`, `booking.module.ts` | c'est ce que génèrent les schémas du CLI NestJS, et le CLI est utilisé. Combattre le générateur sur sept services, c'est perdre. **L'inverse exact d'Angular (§6.1), et les deux sont justes chez eux** — le socle a délibérément renoncé à trancher le suffixe de rôle (§5.2) |
| les paramètres de constructeur « inutilisés » sont tolérés | l'injection par constructeur les utilise ; `@typescript-eslint/no-unused-vars` a besoin d'`args: 'after-used'` et d'une exception sur les propriétés de paramètre |
| `experimentalDecorators` et `emitDecoratorMetadata` | NestJS en dépend pour l'injection. Vérifié : `tsc` de TypeScript **7.0.2** émet encore `design:paramtypes` — ce n'est donc pas ce qui bloquera la montée |
| `typescript` à `6.0.3` | `nest build` abandonne sur TS 7.0 (§1.2) |

**Trois pièges de construction, vérifiés, qui appartiennent à ce document parce qu'ils sont
silencieux :**

- **Le choix du constructeur décide si les greffons du CLI s'appliquent.** Mesuré sur `nest-cli`
  12.0.3 avec `@nestjs/swagger` 12.0.1, un DTO sans `@ApiProperty` : `tsc` → le schéma porte les
  propriétés ; `swc` → schéma **vide, sans erreur** ; `rspack` → schéma vide, et la construction
  annonce « compiled successfully ». Un service qui publie un OpenAPI vide et un service qui publie
  un OpenAPI juste ont exactement la même sortie de construction. **Porte obligatoire** : comparer
  le `/docs-json` produit au contrat d'`openapi/`.
- **Les fichiers non-TypeScript ne sont pas copiés** dans `dist/` tant qu'`assets` ne les liste pas.
  Cela vise directement les `.proto` (README §3) : ils doivent être listés, sinon le service démarre
  et échoue au premier appel gRPC.
- **Une seule version de TypeScript dans l'espace de travail pnpm** (§2.5) : mélanger TS 6 et TS 7
  entre paquets fait résoudre au greffon Swagger le TypeScript remonté en tête, et il échoue.

**Pourquoi Biome aurait échoué ici aussi :** `no-floating-promises` et `no-misused-promises` sont des
règles **typées**. Dans un système à sept services, une promesse orpheline est un message perdu, et
c'est le genre de défaut qui se manifeste comme une incohérence de données trois jours plus tard.

### 6.6 Ionic 9 et Capacitor 8 — `arthome-studio-mobile`

**Ce qui s'ajoute** par-dessus Angular (§6.1), et qui n'est pas une affaire de style mais
d'exécution :

- l'application s'exécute sous les origines **`capacitor://localhost`** (iOS) et
  **`https://localhost`** (Android) — ce qui décide du CORS, des témoins et de leurs attributs, et
  donc de ce que le contrat d'authentification doit prévoir (`architecture/adr-auth.md`) ;
- `android/` et `ios/` sont **committés**. Ce sont des sources, pas des artefacts. Le `.gitignore`
  du dépôt doit les préserver explicitement, parce que la plupart des modèles de `.gitignore` les
  excluent ;
- `capacitor.config.ts` est soumis aux mêmes règles que le reste du TypeScript du dépôt — c'est un
  fichier source, pas une configuration exemptée ;
- les liens profonds sont un contrat d'URL entre l'application et le web : leur forme appartient à
  `architecture/context-map.md`, pas à ce document.

**Pourquoi c'est légitime :** rien de tout cela n'est arbitrable par une convention de code. Ce sont
des contraintes d'un hôte natif, et les ignorer produit des erreurs qui n'apparaissent que sur
l'appareil.

---

## 7. Gouvernance des versions — sept dépôts, une personne

### 7.1 Qui décide, et selon quelle règle

**Une seule personne décide**, et toute montée de version qui franchit un majeur est consignée dans
`DECISIONS.md` avec sa raison. Ce n'est pas de la bureaucratie sur un projet solo : c'est le seul
moyen de savoir, six mois plus tard, si un épinglage est une contrainte ou une habitude.

**Trois régimes, et l'appartenance à un régime se justifie :**

| Régime | Ce qui y entre | Forme |
|---|---|---|
| **A — épinglé exactement, montée traitée comme un changement de contrat** | ce que **plusieurs dépôts** doivent voir de la **même façon à l'exécution** | version exacte, `peerDependencies` chez qui l'expose |
| **B — épinglé exactement, montée coordonnée** | l'outillage qui décide si la construction passe | version exacte, `devDependencies` |
| **C — fourchette, montée au fil de l'eau** | tout le reste | `^`, et le verrou fait foi |

**Régime A — la liste, et elle est courte :**

| Paquet | Version | Pourquoi A |
|---|---|---|
| **`zod`** | **4.6.5** | **Acté par le chef de projet** : dépendance d'exécution partagée par sept services et cinq applications. En `peerDependency` de `@arthome/contracts`, épinglée. **Un majeur de zod se traite comme un changement de contrat.** Deux zod dans un même processus, c'est deux registres de schémas et des erreurs de validation incompréhensibles |
| **`typescript`** | **6.0.3** | §2.2. Une seule version par dépôt et la même sur les sept ; le plafond d'Angular est dur et le lint typé en dépend |
| le runtime Protobuf de `@arthome/contracts` | à fixer avec `buf` | même raisonnement que zod : un runtime de sérialisation partagé, dont un majeur change la forme sur le fil |

**Et rien d'autre.** C'est la consigne de D-013 — « applique le même raisonnement à ce qui le mérite,
et à rien d'autre ». Le test d'appartenance à A, en une question : **si deux dépôts en ont deux
versions différentes en même temps, est-ce que quelque chose casse à l'exécution, de façon
difficile à diagnostiquer ?** `zod` : oui. `typescript` : oui, par le biais des `.d.ts` et du lint.
Le runtime Protobuf : oui. `react` : non — chaque application a son propre `node_modules` et son
propre processus. `eslint` : non — c'est de l'outillage, régime B.

**Régime B :** `eslint`, `prettier`, `eslint-config-prettier`, `typescript-eslint`, `vitest`,
`@arthome/tooling`, `pnpm`, Node. Épinglés exactement, montés dans l'ordre du §7.3.

**Régime C :** le reste. Le verrou est committé sur les sept dépôts et fait foi ; c'est lui qui rend
une construction reproductible, pas les fourchettes.

### 7.2 Node et pnpm — une version, écrite trois fois

**Node 24.21.0 « Krypton » (LTS)** sur les sept dépôts. C'est la seule ligne qui satisfait les quatre
planchers relevés :

| Exigence | Source |
|---|---|
| `^22.22.3 \|\| ^24.15.0 \|\| >=26` | Angular 22 (`@angular/compiler-cli`) — **le plus exigeant** |
| `^22.13.0 \|\| ^24.3.0 \|\| >=26` | React Native 0.87.1 |
| `^20.19 \|\| ^22.13 \|\| >=24` | ESLint 10 |
| `>=20.11` | `@nestjs/cli` 12 |

Node 26.9.0 existe mais n'est pas encore LTS ; 22.23.2 « Jod » conviendrait aussi et sera dépassé le
premier. **24.21.0.**

Écrite à trois endroits, parce que trois outils différents la lisent :

```
.nvmrc                              →  24.21.0
package.json → "engines": { "node": "^24.21.0" }
package.json → "packageManager": "pnpm@12.5.1"
```

`packageManager` est ce qui fait que Corepack installe la **bonne** version de pnpm sans y penser —
c'est la mesure qui coûte le moins et évite le plus de « ça marche chez moi » entre une machine et un
exécuteur.

### 7.3 L'ordre de montée, et pourquoi il est celui-là

Toute montée d'un paquet de régime B suit cet ordre, **un dépôt à la fois** :

1. **`arthome-core`** — il produit `@arthome/tooling` et se le mange (§4.6 e) ; s'il ne passe pas,
   rien ne part ;
2. **`arthome-platform`** — sept services, mais un seul dépôt et un seul espace de travail ; il donne
   le plus de signal pour le moins de manipulations ;
3. **`arthome-storefront-web`** — Next, la pile la plus tolérante ;
4. **`arthome-studio-web`** — Angular, la plus contrainte ; ce qui passe ici passera sur le studio
   mobile ;
5. **`arthome-studio-mobile`** — Angular plus la couche native ;
6. **`arthome-storefront-mobile`**, 7. **`arthome-storefront-tv`** — en dernier, parce que ce sont
   eux qui portent les divergences imposées (ESLint 9) et qu'il faut connaître l'état des cinq autres
   avant de les toucher.

**La règle qui compte plus que l'ordre : jamais deux dépôts en transit en même temps.** Sept dépôts
rouges simultanément, pour une personne seule, c'est une soirée perdue et une tentation d'éteindre
des règles.

### 7.4 Comment on évite que les dépôts divergent

Quatre dispositifs, du plus mécanique au plus humain :

1. **`@arthome/tooling`** (§4) — la configuration n'existe qu'à un endroit ;
2. **les catalogues pnpm**, dans les deux dépôts à espace de travail. `pnpm-workspace.yaml` déclare
   les versions, les `package.json` écrivent `"zod": "catalog:"`, et **pnpm remplace `catalog:` par
   la version réelle à la publication** — un consommateur extérieur ne voit jamais le protocole. Cela
   règle la cohérence **à l'intérieur** d'`arthome-core` et d'`arthome-platform` ;
3. **entre les sept dépôts, il n'existe pas de catalogue** — c'est la limite du multi-dépôts, et elle
   est assumée. Le substitut est une porte, pas un espoir : `@arthome/tooling` expose un contrôle qui
   compare les versions installées de régime A et B aux versions attendues, déclarées dans un fichier
   de ce paquet.

   ```bash
   pnpm exec arthome-check-versions
   # échoue si typescript, zod, eslint, prettier, eslint-config-prettier, typescript-eslint
   # ou vitest ne sont pas à la version attendue pour la pile de ce dépôt
   ```

   La table des versions attendues vit dans `@arthome/tooling` — **une seule table, pas sept**. C'est
   la réponse E2 appliquée aux versions : sans cela, chaque `package.json` serait une table
   littérale parallèle de plus, et on sait ce qui arrive aux tables parallèles sur ce projet.
4. **le journal de montée** (§7.5), qui est la seule pièce non mécanique, et donc la plus fragile.

### 7.5 Tenir le §1 à jour

Le tableau du §1 périme. **La règle : on ne répond jamais de mémoire sur une version.** Les quatre
commandes qui le reconstruisent, hors ligne d'aucune sorte :

```bash
# ce que `latest` vaut aujourd'hui, pour les paquets qui décident
npm view eslint prettier eslint-config-prettier typescript typescript-eslint version
npm view angular-eslint eslint-config-next eslint-plugin-react-hooks vitest version

# ce que les piles exigent réellement — la seule source qui fasse foi
npm view @angular/compiler-cli@latest peerDependencies
npm view typescript-eslint@latest peerDependencies
```

Quand une ligne du §1 change, la mettre à jour **dans ce fichier**, avec la date. Un tableau daté et
juste vaut infiniment mieux qu'un tableau sans date dont personne ne sait s'il tient encore.

---

## 8. Les portes — tout se vérifie en local

Le quota d'Actions du compte est épuisé. Aucune porte ne suppose un exécuteur distant.

### 8.1 Le tableau

| # | Porte | Commande | Attendu | Section |
|---|---|---|---|---|
| 1 | **Conflit ESLint / Prettier nul** | `npx eslint-config-prettier <fichier>` | `No rules that are unnecessary or conflict with Prettier were found.` | §3.5 |
| 2 | Formatage | `pnpm exec prettier --check .` | aucun fichier listé | §5.1 |
| 3 | Lint | `pnpm exec eslint . --max-warnings 0` | aucune sortie | §5 |
| 4 | Désactivations orphelines | `pnpm exec eslint . --report-unused-disable-directives --max-warnings 0` | aucune | §4.5, §6.2 |
| 5 | Typage | `pnpm exec tsc --noEmit` | aucune erreur | §5.7 |
| 6 | **`.d.ts` sous TypeScript 6.0.3** | `pnpm --filter dts-check exec tsc --noEmit` | aucune erreur | §2.4 |
| 7 | **`.d.ts` sous TypeScript 7.0.2** | `pnpm --filter dts-check exec tsgo --noEmit` | aucune erreur | §2.4 |
| 8 | `.d.ts` reproductibles | `git diff --exit-code -- packages/*/dist/**/*.d.ts` | aucun diff | §2.4 |
| 9 | **Pas de table littérale parallèle** | `pnpm exec arthome-check-enums` | aucune occurrence | §5.3 |
| 10 | Versions alignées | `pnpm exec arthome-check-versions` | aucun écart | §7.4 |
| 11 | Un seul ESLint, un seul TypeScript | `pnpm why eslint typescript prettier` | une version chacun | §4.2 |
| 12 | Outillage hors production | `pnpm why -P @arthome/tooling` | aucune dépendance | §4.7 |
| 13 | `@arthome/core` sans dépendance | script du §4.7 | vide | §4.7 |
| 14 | Tests | `pnpm exec vitest run` | vert | §5.8 |
| 15 | **Verrous tsconfig non desserrés** | `pnpm exec arthome-check-tsconfig` | aucun verrou desserré | §4.5.1 |
| 16 | Message de commit | crochet `commit-msg` | conforme | §5.9, §8.4 |

Les portes **1, 6, 7, 9** sont celles que D-013 et D-014 exigent nommément. Ce sont aussi les quatre
qu'un projet abandonnerait en premier, parce qu'aucune ne correspond à une habitude installée.

### 8.2 `pnpm run verify` — une commande par dépôt

Une porte qu'on lance quand on y pense n'est pas une porte. Les sept dépôts exposent la même
commande, qui enchaîne **celles qui les concernent** :

```jsonc
// package.json — les sept dépôts, mêmes noms de scripts
{
  "scripts": {
    "format":       "prettier --write .",
    "format:check": "prettier --check .",
    "lint":         "eslint . --max-warnings 0 --report-unused-disable-directives",
    "typecheck":    "tsc --noEmit",
    "test":         "vitest run",
    "check:prettier-conflict": "eslint-config-prettier src/index.ts",
    "check:enums":    "arthome-check-enums",
    "check:versions": "arthome-check-versions",
    "check:tsconfig": "arthome-check-tsconfig",
    "verify": "pnpm run check:versions && pnpm run check:tsconfig && pnpm run check:prettier-conflict && pnpm run format:check && pnpm run lint && pnpm run typecheck && pnpm run check:enums && pnpm run test"
  }
}
```

Dans `arthome-core`, `verify` ajoute les portes 6, 7, 8 et 13.

**Les mêmes noms sur les sept dépôts** — c'est la seule façon, pour une personne seule qui passe de
l'un à l'autre, de ne jamais avoir à se demander comment on vérifie ici.

**L'ordre est délibéré et ne doit pas changer :** les versions et les verrous `tsconfig` d'abord
(une porte rouge parce qu'un paquet a glissé ou qu'un `strict: false` traîne est du temps perdu à
lire une erreur qui n'existe pas), le conflit Prettier ensuite
(il conditionne le sens des deux suivantes), puis le formatage, le lint, le typage, les énumérations
et les tests. Du plus rapide et du plus explicatif vers le plus lent.

### 8.3 Turborepo, seulement là où il sert

Dans `arthome-core` et `arthome-platform`, ces tâches passent par Turborepo — **pour le cache, et
rien d'autre** (D-005, README §3). `typecheck` et `build` déclarent leurs dépendances (`"dependsOn":
["^build"]`) parce qu'un service ne se type-vérifie pas avant que `@arthome/contracts` ait émis ses
`.d.ts` ; `lint` et `format:check` n'en déclarent aucune.

Les cinq applications n'ont **pas** de Turborepo : un dépôt d'une seule application n'a pas de
graphe de tâches à mettre en cache, et l'ajouter serait de l'outillage à entretenir pour rien. **Pas
de Nx**, sur aucun des sept (README §3).

### 8.4 Les crochets git — deux fichiers, aucune dépendance

Pas de husky, pas de lint-staged, pas de commitlint. Trois paquets, trois configurations et trois
montées de version à entretenir en sept exemplaires, pour ce que git fait nativement :

```bash
git config core.hooksPath .githooks       # une fois par dépôt, après le clonage
```

**`.githooks/pre-commit`** — Prettier sur les fichiers indexés seulement, pas sur le dépôt entier :

```sh
#!/bin/sh
files=$(git diff --cached --name-only --diff-filter=ACMR | grep -E '\.(ts|tsx|js|mjs|json|md|html|css|scss)$')
[ -z "$files" ] && exit 0
echo "$files" | xargs pnpm exec prettier --write
echo "$files" | xargs git add
```

**`.githooks/commit-msg`** — Conventional Commits (§5.9), dix lignes, zéro dépendance :

```sh
#!/bin/sh
pattern='^(feat|fix|refactor|perf|test|docs|build|chore|revert)(\([a-z0-9-]+\))?!?: .{1,72}$'
head -n1 "$1" | grep -qE "$pattern" && exit 0
grep -q '^Merge' "$1" && exit 0
echo "Message de commit non conforme (§5.9 de architecture/code-conventions.md)." >&2
echo "Forme : type(scope): sujet à l'impératif, 72 caractères max." >&2
exit 1
```

**Ce que les crochets ne font pas :** ils ne lancent ni `eslint`, ni `tsc`, ni les tests. Un crochet
lent est un crochet qu'on contourne avec `--no-verify`, et un crochet contourné vaut moins que pas de
crochet du tout, parce qu'il donne l'illusion d'une porte. Le lint, le typage et les tests sont dans
`pnpm run verify`, lancé avant de pousser.

**Le jour où le quota d'Actions revient :** le fichier de workflow appelle `pnpm run verify` et rien
d'autre. C'est pour cela que tout est derrière une seule commande — la CI distante n'ajoutera pas une
seconde définition de ce qui est vérifié, et il n'y aura donc jamais deux listes à tenir d'accord.

---

## 9. Ce qui n'est pas tranché ici

Consigné pour que ça ne se perde pas, et **ne pas** traité de mémoire le jour venu :

1. **Expo ou React Native nu** pour les deux surfaces mobiles et TV. D-001 le laisse ouvert et hors
   périmètre. La réponse change le §6.3 : Expo apporte son propre `eslint-config-expo` et sa propre
   gestion de versions, ce qui déplace la frontière entre ce que `@arthome/tooling` porte et ce que
   la pile porte.
2. **Le runtime Protobuf de `@arthome/contracts`** — son nom et sa version ne sont pas fixés
   (`architecture/events.md` et `proto/buf.yaml` en décideront). Sa place au **régime A** (§7.1) est
   en revanche décidée, par le même raisonnement que zod.
3. **Un seuil de couverture chiffré** — délibérément absent (§5.8). Si `definition-of-done.md` en
   fixe un, il prime et cette section s'aligne.
4. **La date de bascule vers TypeScript 7** — conditionnée à trois publications extérieures (§2.6),
   dont aucune n'est annoncée. Ne rien anticiper ; la porte 7 garantit que le jour venu sera un
   non-événement.
5. **Le retour du quota d'Actions** — le §8.4 dit ce que le workflow contiendra ; il ne l'écrit pas.

---

## Annexe — ce qui a été vérifié en ligne le 21 septembre 2026

Ce document ne cite aucune version de mémoire. Relevés effectués ce jour, chacun contre sa source.

| Vérifié | Source | Résultat |
|---|---|---|
| Versions de tous les paquets du §1 | `registry.npmjs.org` (`dist-tags`, documents de version) | tableau §1 |
| Plafond TypeScript d'Angular 22 | `@angular/compiler-cli@22.1.7` → `peerDependencies` | `>=6.0 <6.1` — **dur** |
| Plafond TypeScript de `typescript-eslint` | `typescript-eslint@8.70.0` → `peerDependencies`, et `typescript-eslint.io/users/dependency-versions` | `>=4.8.4 <6.1.0` |
| Support TypeScript 7 chez `typescript-eslint` | issue `typescript-eslint#12518` | **fermée « not planned »** — pas d'API TS 7 |
| Absence de contrainte TypeScript côté React Native | `react-native@0.87.1` → `peerDependencies` ; `@types/react@19.3.0` → `typesVersions` | **aucune** ; TS 5.1+ suffit |
| Refus de TypeScript 7 par le CLI NestJS | `nest-cli` 12.0.3, `UNSUPPORTED_TYPESCRIPT_VERSION` | `tsc`, `swc` et `rspack` également |
| Nature de TypeScript 7.0 | `devblogs.microsoft.com/typescript/announcing-typescript-7-0/` | portage Go, parité de vérification, **aucune syntaxe nouvelle**, pas d'API programmatique |
| `stableTypeOrdering` sous TS 6.0 | notes de version TypeScript 6.0 | tri déterministe de 7.0 porté à 6.0 ; jusqu'à 25 % plus lent |
| **`stableTypeOrdering` sous TS 7.0** | annonce officielle de TypeScript 7.0 | « is `true` by default, and **cannot be turned off** » → seule option du dispositif qui ne vaut pas des deux côtés (§4.4.1). **Non vérifié** : si l'écrire explicitement à `true` sous 7.0 est accepté ou refusé — d'où la règle du §4.4.2, qui rend la question sans objet |
| Options devenues **erreurs dures** en TypeScript 7.0 | annonce officielle de TypeScript 7.0 | `target: es5`, `downlevelIteration`, `moduleResolution: node/node10/classic`, `module: amd/umd/systemjs/none`, **`baseUrl`**, `esModuleInterop: false`, `allowSyntheticDefaultImports: false`, `alwaysStrict: false`, `outFile`, `module Foo {}`, `assert` sur les imports ; `ignoreDeprecations` ne les tait plus |
| Défauts changés en TypeScript 6.0 | notes de version TypeScript 6.0 | `types: []`, `rootDir: "."`, `strict`, `module: esnext` |
| `@typescript/typescript6` | registre npm, mainteneurs | **paquet officiel Microsoft**, binaire `tsc6`, publié à **6.0.2** |
| **`extends` et le champ `exports`** | `microsoft/TypeScript#48665`, **PR #50955** (fusionnée déc. 2022) | le défaut historique — `extends` ignorait `exports` — est **corrigé** ; les sous-chemins doivent donc être listés dans `exports` (§4.4.4) |
| **Chemins relatifs dans un `tsconfig` étendu** | `typescriptlang.org/tsconfig/extends.html` | « All relative paths found in the configuration file will be resolved relative to the configuration file they originated in » ; `files`/`include`/`exclude` **écrasent**, `references` n'est **pas hérité** → aucune option porteuse de chemin dans la base (§4.4.4) |
| **Héritage d'`angularCompilerOptions` par `extends`** | commits `angular/angular` (`d7e5bbf`, `e3ccd56`), `angular.dev/reference/configs/angular-compiler-options` | Angular l'a **explicitement implémenté**, au même niveau que `compilerOptions` |
| **Metro et `tsconfig`** | documentation Metro et React Native | Metro **ne lit pas** `tsconfig.json` ; résolution par `exports` **activée par défaut** depuis Metro 0.82 / React Native 0.79, donc dans RN 0.87 |
| `eslint-config-prettier` : position, entrée `/flat`, outil en ligne de commande | `README` et `CHANGELOG` du dépôt | dernier du tableau ; `/flat` séparé depuis 10.1.1 ; `npx eslint-config-prettier <fichier>` |
| `eslint-plugin-prettier` déconseillé | `prettier.io/docs/integrating-with-linters` | trois raisons citées au §3.3 |
| `arrow-body-style` / `prefer-arrow-callback` | `README` d'`eslint-config-prettier` | « safe to use if you don't use eslint-plugin-prettier » |
| ESLint 10 : `eslintrc` supprimé, recherche de config | `eslint.org/docs/latest/use/migrate-to-10.0.0` | à plat seulement ; recherche depuis le dossier du fichier |
| Montage Next 16 + Prettier | `nextjs.org/docs/app/api-reference/config/eslint` (v16.3.5, màj 2026-08-25) | `next lint` supprimé ; `eslint-config-prettier/flat` recommandé, placé après |
| Préréglages `eslint-plugin-react-hooks` 7 | `react-compiler-lint`, lu sur 6.1.1 et 7.1.1 | `flat.recommended` ; `flat/recommended` et `*-legacy` supprimés |
| `@react-native/eslint-config` : ESLint 10 et la copie d'`eslint-config-prettier` | `@react-native/eslint-config@0.87.1` → `peerDependencies`, `dependencies` | `eslint ^8 \|\| ^9` ; dépend d'`eslint-config-prettier@^8.5.0` |
| Analyseur Prettier pour les gabarits Angular | `src/language-html/languages.evaluate.js` de Prettier | `angular` associé **uniquement** à `.component.html` |
| Convention de nommage Angular | `angular.dev/style-guide` | pas de suffixe `.component` ; par domaine, pas par nature |
| `minimumReleaseAge` de pnpm | documentation pnpm | défaut **1440** depuis pnpm 11 ; motifs acceptés dans `minimumReleaseAgeExclude` depuis 10.17 |
| Catalogues pnpm et publication | `pnpm.io/catalogs` | `catalog:` **remplacé par la version réelle** à la publication |
| Node LTS | `nodejs.org/dist/index.json` | 24.21.0 « Krypton » ; 26.9.0 pas encore LTS |
| Prettier 4 | `dist-tags` de `prettier` | `next` = 4.0.0-**alpha**.13 → on reste en 3.x |
