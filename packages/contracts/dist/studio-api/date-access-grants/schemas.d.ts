import { z } from 'zod';
import type { PathParameter } from '../../http/index.js';
export declare const DateAccessGrantIdParameter: PathParameter<'grantId', z.ZodString>;
export declare const DateAccessRevocationSchema: z.ZodOptional<z.ZodObject<{
    revoked: z.ZodOptional<z.ZodBoolean>;
}, z.core.$loose>>;
export type DateAccessRevocation = z.output<typeof DateAccessRevocationSchema>;
//# sourceMappingURL=schemas.d.ts.map