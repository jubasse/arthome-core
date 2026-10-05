import { z } from 'zod';
import type { PathParameter } from '../../http/index.js';
export declare const IncidentIdParameter: PathParameter<'incidentId', z.ZodString>;
export declare const EscalateIncidentBodySchema: z.ZodObject<{
    note: z.ZodString;
}, z.core.$strip>;
export declare const IncidentResolutionSchema: z.ZodOptional<z.ZodObject<{
    resolvedAt: z.ZodOptional<z.ZodString>;
}, z.core.$loose>>;
export declare const IncidentEscalationSchema: z.ZodOptional<z.ZodObject<{
    routedToRoles: z.ZodOptional<z.ZodArray<z.ZodString>>;
}, z.core.$loose>>;
export type EscalateIncidentBody = z.output<typeof EscalateIncidentBodySchema>;
export type IncidentResolution = z.output<typeof IncidentResolutionSchema>;
export type IncidentEscalation = z.output<typeof IncidentEscalationSchema>;
//# sourceMappingURL=schemas.d.ts.map