import { defineConfig } from 'vitest/config';

import base from '@arthome/tooling/vitest';

// `@arthome/tooling/vitest` exports a BARE OBJECT: each repository applies its
// own `defineConfig` to it. That is what lets Angular (vitest 4) and the five
// other repositories (vitest 5) share the same configuration without any
// version being imposed.
// The return type is written out rather than inferred: this file is inside the
// package's tsconfig `include` (so typescript-eslint's project service will lint
// it), and that tsconfig carries `isolatedDeclarations`, which refuses an inferred
// default export. `ReturnType<typeof defineConfig>` names no vitest type, so it
// still imposes no vitest version on anyone.
const config: ReturnType<typeof defineConfig> = defineConfig({
  ...base,
  test: { ...base.test },
});

export default config;
