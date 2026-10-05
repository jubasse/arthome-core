import type { z } from 'zod';
export type Def = {
    readonly type: string;
} & Readonly<Record<string, unknown>>;
export declare function defOf(schema: z.ZodType): Def;
export declare function isLeafKind(kind: string): boolean;
/** The walkers fail closed: a container they cannot see into would hide whatever it holds. */
export declare function unknownKind(walker: string, kind: string): never;
export interface Child {
    readonly schema: z.ZodType;
    readonly step: string;
    readonly field?: true;
}
export declare function pathBelow(path: string, child: Child): string;
/** What a schema holds and the path step to each part, or nothing for a leaf. Throws on a kind not listed. */
export declare function childrenOf(walker: string, schema: z.ZodType): readonly Child[];
//# sourceMappingURL=schema-kinds.d.ts.map