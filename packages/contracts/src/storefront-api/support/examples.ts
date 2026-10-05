import type { ContactSupportBody, SupportRequestOpening } from './schemas.js';
import { ContactSupportBodySchema, SupportRequestOpeningSchema } from './schemas.js';
import type { ModuleExamples } from '../../openapi/docs.js';

const contactSupportBody: ContactSupportBody = {
  topic: 'playback_quality',
  message: "L'image se fige toutes les deux minutes depuis le début.",
  context: {
    dateId: '019928a0-7d31-7a10-b8c4-2f9e11a4c001',
    traceId: '4bf92f3577b34da6a3ce929d0e0e4736',
  },
};

const supportRequestOpening: SupportRequestOpening = {
  requestId: '019928fd-0000-7000-8000-000000000001',
  reference: 'SUP-2026-0912',
  priorityCode: 'live_in_progress',
};

export const supportExamples: ModuleExamples = [
  [ContactSupportBodySchema, [contactSupportBody]],
  [SupportRequestOpeningSchema, [supportRequestOpening]],
];
