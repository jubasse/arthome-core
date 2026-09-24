// Types for `@arthome/tooling/prettier`.
//
// This one DOES name its library type, and the difference from vitest.d.ts is the
// test that decides every case here: does naming the type impose a version?
//
//   vitest  — peer `^4.0.8` on Angular, `5.0.1` elsewhere. Naming a vitest type
//             would impose one of two live majors on all seven repositories, so
//             vitest.d.ts is structural.
//   prettier — peer `^3.9.8`, one major, the same everywhere. `Config` exists and
//             means the same thing for every consumer, so naming it costs nothing
//             and buys real checking of a config object that is easy to get wrong.
//
// Same rule, opposite answer, because the facts differ. See code-conventions.md 4.2.

import type { Config } from 'prettier';

export declare const config: Config;
export default config;
