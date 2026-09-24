import { defineConfig } from 'vitest/config';

import base from '@arthome/tooling/vitest';

// `@arthome/tooling/vitest` exports a BARE OBJECT: each repository applies its own
// `defineConfig` to it. That is what lets Angular (vitest 4) and the five other
// repositories (vitest 5) share one configuration without any version being imposed.
//
// ⚠ THIS FILE IS A NECESSARY COPY OF `packages/core/vitest.config.ts`, AND THE COPY
//   IS WHY THE ANNOTATION BELOW EXISTS.
//
//   The three lines cannot move into @arthome/tooling: `defineConfig` has to be
//   resolved by the CONSUMER, because the consumer is what knows the vitest version.
//   So the file is duplicated per package by design — and the first version of this
//   copy was written without `const config: ReturnType<typeof defineConfig>`, which
//   made `pnpm --filter @arthome/contracts run typecheck` fail immediately:
//
//     vitest.config.ts(8,16): error TS9037: Default exports can't be inferred with
//                             --isolatedDeclarations.
//
//   `isolatedDeclarations` comes from `tsconfig/lib.json` and applies to the type
//   check even under `noEmit`, so it reaches a config file that is never emitted.
//   `ReturnType<typeof defineConfig>` names no vitest type, so writing it out imposes
//   no vitest version on anyone — it is the annotation the option demands and nothing
//   more.
//
//   The lesson is not "add the annotation". It is that when a file MUST be
//   duplicated, the comment is the only thing carrying the reason, and a copy made by
//   reading the code rather than the comment silently drops the fix while keeping the
//   design. The paragraph above looked like verbosity; it was the load-bearing half.
const config: ReturnType<typeof defineConfig> = defineConfig({
  ...base,
  test: { ...base.test },
});

export default config;
