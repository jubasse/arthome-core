import { defineConfig } from 'vitest/config';

import base from '@arthome/tooling/vitest';

// `@arthome/tooling/vitest` exports a BARE OBJECT: each repository applies its
// own `defineConfig` to it. That is what lets Angular (vitest 4) and the five
// other repositories (vitest 5) share the same configuration without any
// version being imposed.
export default defineConfig({ ...base, test: { ...base.test } });
