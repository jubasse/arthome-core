// Types for `@arthome/tooling/eslint/base`.
//
// STRUCTURAL, and for the vitest reason rather than the prettier one: `eslint` is a
// peer at `^9.39.5 || ^10.11.0`, because the two React Native repositories are held
// on 9 by `@react-native/eslint-config` while the other five are on 10. Naming
// `Linter.Config` would pin a declaration to one of two live majors whose type
// shapes are not identical.
//
// A flat config is an array of plain objects, and that is all a consumer needs to
// know to spread it. Its own ESLint validates the result when it loads the config,
// which is where the version is known. See code-conventions.md 4.2.

/** One entry of a flat config array. Deliberately open: ESLint validates it. */
export type FlatConfigEntry = Readonly<Record<string, unknown>>;

export declare const SOURCE_FILES: string[];
export declare const COMMON_IGNORES: string[];
export declare const base: FlatConfigEntry[];
export default base;
