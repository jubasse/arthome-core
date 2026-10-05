import { ApiErrorCode, ChannelErrorCode, PayoutErrorCode } from '@arthome/core';

import { BankChangeRequestIdParameter, CountersignBankChangeBodySchema } from './schemas.js';
import type { CountersignBankChangeRoute } from './types.js';
import { BankChangeRequestSchema } from '../../studio-money/index.js';
import {
  ReauthIntent,
  StudioTag,
  SurfaceParameter,
  TraceparentParameter,
  operator,
  recentAuth,
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
    requires: [recentAuth({ intent: ReauthIntent.CHANGE_BANK_DETAILS })],
    body: CountersignBankChangeBodySchema,
    response: BankChangeRequestSchema,
    answer: 'Counter-signed, transfers resumed.',
    errors: [ChannelErrorCode.SAME_ACTOR_FORBIDDEN, PayoutErrorCode.BANK_CHANGE_REQUEST_EXPIRED],
  },
);
