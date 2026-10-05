/**
 * Strict on emit (ADR principle 2). The response schemas are loose objects so that a client reads
 * tolerantly, which is right for the client and wrong for the server: a handler could return any
 * extra field and it would reach the wire. `stripping(schema)` is the same schema with every loose
 * object turned into one that strips what it does not declare, deeply, and `strippingBodiesOf` gives
 * it for each success response of a route, for the platform's serializer.
 */
import { z } from 'zod';
import type { RouteShape } from './index.js';
/** The schema with each loose object turned into a stripping one. A schema with no object in it is returned as it is. */
export declare function stripping(schema: z.ZodType): z.ZodType;
/** The stripping schema of each success response of a route that has a JSON body, by status. */
export declare function strippingBodiesOf(route: RouteShape): Readonly<Record<string, z.ZodType>>;
//# sourceMappingURL=strict.d.ts.map