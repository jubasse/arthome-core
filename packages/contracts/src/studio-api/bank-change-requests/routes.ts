import { ApiErrorCode, ChannelErrorCode } from '@arthome/core';

import { BankChangeRequestIdParameter, CountersignBankChangeBodySchema } from './schemas.js';
import type { CountersignBankChangeRoute } from './types.js';
import { recentAuth } from '../../http/index.js';
import { BankChangeRequestSchema } from '../../studio-money/index.js';
import {
  StudioTag,
  SurfaceParameter,
  TraceparentParameter,
  operator,
  studioV1,
} from '../components.js';

const bankChangeRequests = studioV1
  .identity(operator)
  .headers(SurfaceParameter, TraceparentParameter)
  .errors([ApiErrorCode.FORBIDDEN, ApiErrorCode.NOT_FOUND])
  .tags(StudioTag.PAYOUTS)
  .resource('bank-change-requests', { id: BankChangeRequestIdParameter });

export const countersignBankChange: CountersignBankChangeRoute = bankChangeRequests.action(
  'countersign',
  {
    operationId: 'countersignBankChange',
    summary: 'Counter-signs a change of bank details.',
    requires: [recentAuth()],
    body: CountersignBankChangeBodySchema,
    response: BankChangeRequestSchema,
    answer: 'Counter-signed, transfers resumed.',
    errors: [ChannelErrorCode.SAME_ACTOR_FORBIDDEN],
  },
);
