import { z } from 'zod';
import type { VocabularyIn } from '@arthome/core/schema';
import type { PathParameter } from '../../http/index.js';
declare const INVITATION_DECISIONS: readonly ["accept", "decline"];
export declare const InvitationIdParameter: PathParameter<'invitationId', z.ZodString>;
export declare const RespondToInvitationBodySchema: z.ZodObject<{
    decision: VocabularyIn<typeof INVITATION_DECISIONS>;
}, z.core.$strip>;
export type RespondToInvitationBody = z.output<typeof RespondToInvitationBodySchema>;
export {};
//# sourceMappingURL=schemas.d.ts.map