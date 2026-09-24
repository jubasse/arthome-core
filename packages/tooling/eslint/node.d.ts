// Types for `@arthome/tooling/eslint/node`. Structural for the same reason as
// base.d.ts: `eslint` is a peer across two live majors (9 on the two React Native
// repositories, 10 on the other five), so a declaration must not name its types.
// See code-conventions.md 4.2.

import type { FlatConfigEntry } from './base.js';

export declare const node: FlatConfigEntry[];
export default node;
