# `@arthome/tooling`

La configuration de base que les **sept dépôts Arthome** étendent : ESLint, Prettier, TypeScript,
Vitest — et les trois portes qui vérifient qu'ils n'ont pas divergé.

> **La conception est dans [`architecture/code-conventions.md`](../../architecture/code-conventions.md).**
> Ce README dit comment s'en servir ; le document dit pourquoi c'est comme ça. Quand les deux se
> contredisent, c'est le document qui a raison et ce paquet qui a un défaut.

---

## Ce qu'il porte

| Entrée | Contenu |
|---|---|
| `@arthome/tooling/eslint/base` | Le socle : recommandations JS, `typescript-eslint` **typé**, `import-x`, les règles TypeScript non négociables. **Aucune règle de formatage.** |
| `@arthome/tooling/eslint/node` | `base` + globales Node + préfixe `node:` obligatoire. Pour `arthome-platform`. |
| `@arthome/tooling/eslint/browser` | `base` + globales navigateur. Pour les cinq applications. |
| `@arthome/tooling/prettier` | La configuration Prettier. Aucun greffon. |
| `@arthome/tooling/vitest` | Un **objet nu**, jamais un `defineConfig`. |
| `@arthome/tooling/tsconfig/base.json` | L'**intersection** TS 6 / TS 7. Aucune option de chemin. |
| `@arthome/tooling/tsconfig/lib.json` | Paquets publiés. Le seul fichier que TS 7 ne lit jamais. |
| `@arthome/tooling/tsconfig/app.json` | Applications et services. |

Et trois exécutables : `arthome-check-enums`, `arthome-check-versions`, `arthome-check-tsconfig`.

**Il n'y a pas d'entrée `"."`**, volontairement : `import … from '@arthome/tooling'` échoue à la
résolution. C'est la première des quatre barrières qui l'empêchent de devenir une dépendance de
production, et la seule qui n'ait rien à surveiller.

---

## Comment un dépôt l'étend

### ESLint — l'ordre est la seule chose qui ne se négocie pas

```js
// eslint.config.js
import { defineConfig, globalIgnores } from 'eslint/config';
import base from '@arthome/tooling/eslint/browser';
import nextVitals from 'eslint-config-next/core-web-vitals';   // la pile, chez le dépôt
import prettier from 'eslint-config-prettier/flat';

export default defineConfig([
  globalIgnores(['.next/**', 'out/**', 'next-env.d.ts']),
  ...base,           // 1. le socle
  ...nextVitals,     // 2. la pile, qui peut rallumer des choses
  { rules: {} },     // 3. surcharges locales, chacune avec sa raison en commentaire
  prettier,          // 4. DERNIER : il éteint ce que 2 et 3 ont rallumé côté format
]);
```

**`eslint-config-prettier/flat` est le dernier élément, sans exception.** Placé avant, il ne
désactive rien de ce qui suit — et il échoue **silencieusement**. La porte le vérifie :

```bash
npx eslint-config-prettier src/index.ts
# attendu : No rules that are unnecessary or conflict with Prettier were found.
```

### Prettier — une ligne de `package.json`

```json
{ "prettier": "@arthome/tooling/prettier" }
```

Les deux dépôts Angular ont la **seule surcharge autorisée**, parce que Prettier n'associe
l'analyseur `angular` qu'à l'extension `.component.html` — que Angular 20+ a supprimée :

```js
// .prettierrc.mjs — dépôts Angular uniquement
import base from '@arthome/tooling/prettier';
export default {
  ...base,
  overrides: [...base.overrides, { files: 'src/app/**/*.html', options: { parser: 'angular' } }],
};
```

### TypeScript — `extends` par nom de paquet

```jsonc
{
  "extends": "@arthome/tooling/tsconfig/app.json",
  "compilerOptions": { "outDir": "dist", "paths": { "@/*": ["./src/*"] } },
  "include": ["src"]
}
```

Les chemins vont **ici**, jamais dans la base : un chemin écrit dans un fichier étendu se résout
depuis ce fichier, c'est-à-dire depuis `node_modules/@arthome/tooling/tsconfig/`.

### Vitest — le `defineConfig` du dépôt, jamais celui du paquet

```ts
import { defineConfig } from 'vitest/config';   // la version du dépôt : 4.x sur Angular, 5.x ailleurs
import base from '@arthome/tooling/vitest';

export default defineConfig({ ...base, test: { ...base.test } });
```

---

## Verrouillé / redéfinissable

**Verrouillé** — un dépôt qui redéfinit ceci a un défaut, pas un besoin :

`strict` · `noUncheckedIndexedAccess` · `exactOptionalPropertyTypes` · `noImplicitOverride` ·
`noFallthroughCasesInSwitch` · `noImplicitReturns` · `useUnknownInCatchVariables` ·
`isolatedModules` · `verbatimModuleSyntax` · `forceConsistentCasingInFileNames` · la version de
`typescript` · la position de `eslint-config-prettier/flat` en dernier · l'interdiction
d'`eslint-plugin-prettier` et des greffons de tri Prettier.

**Interdit** : `baseUrl`, `downlevelIteration`, `outFile`, `ignoreDeprecations`, `target: es5`,
`moduleResolution: node10`, `module: amd|umd|systemjs`, `esModuleInterop: false`. Tous sont des
**erreurs dures sous TypeScript 7**.

**Redéfinissable sans justification** — et il faut que ce le soit, sinon la base sera contournée au
lieu d'être étendue : tous les chemins (`include`, `exclude`, `outDir`, `rootDir`, `paths`…),
`types`, `lib`, `jsx`, `module`, `moduleResolution`, `angularCompilerOptions`, les préréglages de
pile, la configuration Vitest hors du socle.

**Redéfinissable avec une justification écrite dans le fichier** : désactiver une règle du socle sur
un motif de fichiers. La forme est imposée :

```js
{
  files: ['src/generated/**/*.ts'],
  rules: {
    // Code Protobuf généré : la règle y est structurelle, et le fichier est
    // réécrit à chaque `buf generate`. Voir architecture/events.md.
    '@typescript-eslint/no-explicit-any': 'off',
  },
}
```

La table de référence est [`tsconfig-locks.json`](./tsconfig-locks.json) — **une seule, pour les
sept dépôts.** Sept copies seraient la faute E2 appliquée à l'outillage.

---

## Les trois portes

Toutes en **Node pur, zéro dépendance** : elles tournent avant même `pnpm install`, et sans
exécuteur distant — le quota d'Actions du compte est épuisé.

```bash
pnpm exec arthome-check-enums       # aucune valeur d'énumération recopiée (E2)
pnpm exec arthome-check-versions    # les sept dépôts n'ont pas divergé
pnpm exec arthome-check-tsconfig    # les verrous n'ont pas été desserrés
```

### `arthome-check-enums` — la porte contre E2

La faute dominante du projet est la **table littérale parallèle** : huit champs, cinq maquettes,
malgré un principe explicite qui l'interdisait. La leçon est qu'un principe ne suffit pas.

Elle **découvre** les `export const NOM = [...] as const` dans les sources de `@arthome/core`, puis
signale toute réapparition de ces valeurs ailleurs. Elle **ne porte aucune liste d'énumérations** —
une liste serait une table parallèle de plus. Une énumération nouvelle est couverte le jour où elle
est déclarée.

| Option | Effet |
|---|---|
| `--source <dossier>` | où sont les énumérations (défaut : `packages/core/src`, puis `../core/src`, puis `node_modules/@arthome/core/{src,dist}`) |
| `--allow <fichier>` | les exceptions (défaut : `tools/enum-literals.allow.json`) |
| `--quiet` | n'écrit qu'en cas d'échec |

Une exception **doit** porter une `reason`, sinon la porte refuse le fichier :

```json
{ "allow": [{ "file": "src/i18n/keymap.ts", "value": "open", "reason": "Plan de correspondance i18n : la clé est la valeur." }] }
```

Ce fichier reste court ou la règle est mauvaise. Au-delà de vingt lignes, c'est le signe qu'une
valeur manque dans `@arthome/core`.

### `arthome-check-versions`

Lit [`versions.json`](./versions.json) — régime A (partagé à l'exécution, une montée majeure vaut
changement de contrat : `zod`, `typescript`), régime B (outillage), et la liste des paquets
proscrits. Il connaît les **exceptions nommées** : ESLint 9 sur les deux dépôts React Native,
Vitest 4 sur les deux dépôts Angular. Passer `--repo <nom>` pour forcer le dépôt évalué.

### `arthome-check-tsconfig`

Vérifie la configuration **résolue**, pas les fichiers : un `extends` se contourne d'une ligne
locale. Utilise `tsc --showConfig` quand `typescript` est installé, sinon résout la chaîne d'`extends`
lui-même — pour que la porte existe avant l'installation.

Quand la chaîne d'`extends` est rompue, elle signale **la cause unique et s'arrête** : lister dix
verrous manquants inviterait à les recopier dans le dépôt, c'est-à-dire à commettre la faute même
que la base existe pour éviter.

---

## `dependencies` contre `peerDependencies`

La question qui tranche : **le dépôt nomme-t-il ce paquet lui-même ?**

| | Pourquoi |
|---|---|
| **peer** — `eslint`, `@eslint/js`, `prettier`, `typescript` | Ce sont les **binaires que le dépôt exécute**. Deux copies d'ESLint, et le greffon chargé par l'une n'est pas celui que l'autre voit ; les deux fonctionnent, différemment, et le diagnostic est long. `@eslint/js` est peer parce qu'il doit suivre le **majeur d'`eslint`**, qui vaut 9 sur deux dépôts et 10 sur cinq. |
| **dependencies** épinglés exact — `typescript-eslint`, `eslint-config-prettier`, `eslint-plugin-import-x`, `eslint-import-resolver-typescript`, `globals` | En configuration à plat un greffon est un **objet passé par valeur**, plus un nom résolu depuis le dépôt : aucune ambiguïté de résolution, donc on peut les épingler ici sans que le dépôt ait à les connaître. |
| **nulle part** — `angular-eslint`, `eslint-config-next`, `eslint-plugin-react-hooks`, `eslint-config-expo`, `@react-native/eslint-config` | Leur version doit suivre le **majeur du framework installé dans le dépôt**. Les loger ici forcerait les sept dépôts à monter de framework ensemble. |
| **ni l'un ni l'autre** — `vitest` | L'entrée exporte un objet nu. Importer `vitest/config` imposerait une version aux sept et casserait les deux dépôts Angular. |

```bash
pnpm why eslint typescript prettier   # attendu : une seule version résolue pour chacun
pnpm why -P @arthome/tooling          # attendu : aucune dépendance (jamais en production)
```

---

## Monter la version de ce paquet

Le versionnement d'un paquet de configuration n'est pas celui d'une bibliothèque :

| Changement | Version |
|---|---|
| **allumer une règle**, durcir `warn` → `error`, monter un greffon d'un majeur | **MAJEUR** |
| ajouter une règle en `warn`, ajouter une entrée d'export | mineur |
| corriger un motif de fichiers, un commentaire | correctif |

**Allumer une règle est un changement cassant** : sinon un `pnpm update` rend sept dépôts rouges le
même jour. Toute règle nouvelle arrive en `warn` au mineur `N`, puis passe `error` au majeur `N+1`,
une fois les sept dépôts à zéro. Un seul dépôt en transit à la fois, dans l'ordre :
`arthome-core` → `arthome-platform` → `storefront-web` → `studio-web` → `studio-mobile` →
`storefront-mobile` → `storefront-tv`.

`arthome-core` consomme la version de l'espace de travail : un majeur qui casse quelque chose le
casse **d'abord chez l'éditeur**, avant d'être publié.
