import type { CountersignBankChangeBody } from './schemas.js';
import { CountersignBankChangeBodySchema } from './schemas.js';
import type { ModuleExamples } from '../../openapi/docs.js';

const countersignBankChangeBody: CountersignBankChangeBody = {
  decision: 'countersign',
  reauthToken: 'ott_4d77e2',
};

export const bankChangeRequestsExamples: ModuleExamples = [
  [CountersignBankChangeBodySchema, [countersignBankChangeBody]],
];
