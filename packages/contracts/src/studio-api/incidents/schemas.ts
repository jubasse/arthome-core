import { z } from 'zod';

import { InstantOut, uuidIn } from '@arthome/core/schema';

import type { PathParameter } from '../../http/index.js';

export const IncidentIdParameter: PathParameter<'incidentId', z.ZodString> = {
  name: 'incidentId',
  in: 'path',
  required: true,
  schema: uuidIn(),
};

export const EscalateIncidentBodySchema: z.ZodObject<{ note: z.ZodString }, z.core.$strip> =
  z.object({
    note: z.string().max(400),
  });

export const IncidentResolutionSchema: z.ZodOptional<
  z.ZodObject<{ resolvedAt: z.ZodOptional<z.ZodString> }, z.core.$loose>
> = z.looseObject({ resolvedAt: InstantOut.optional() }).optional();

export const IncidentEscalationSchema: z.ZodOptional<
  z.ZodObject<{ routedToRoles: z.ZodOptional<z.ZodArray<z.ZodString>> }, z.core.$loose>
> = z.looseObject({ routedToRoles: z.array(z.string()).optional() }).optional();

export type EscalateIncidentBody = z.output<typeof EscalateIncidentBodySchema>;
export type IncidentResolution = z.output<typeof IncidentResolutionSchema>;
export type IncidentEscalation = z.output<typeof IncidentEscalationSchema>;
