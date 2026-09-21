import { defineConfig } from 'vitest/config';

import base from '@arthome/tooling/vitest';

// `@arthome/tooling/vitest` exporte un OBJET NU : le depot lui applique son
// propre `defineConfig`. C'est ce qui permet a Angular (vitest 4) et aux cinq
// autres depots (vitest 5) de partager la meme configuration sans qu'aucune
// version soit imposee.
export default defineConfig({ ...base, test: { ...base.test } });
