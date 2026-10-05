import { ApiErrorCode } from '@arthome/core';

import { DateAccessGrantIdParameter, DateAccessRevocationSchema } from './schemas.js';
import type { RevokeDateAccessRoute } from './types.js';
import {
  StudioTag,
  SurfaceParameter,
  TraceparentParameter,
  operator,
  studioV1,
} from '../components.js';

const dateAccessGrants = studioV1
  .identity(operator)
  .headers(SurfaceParameter, TraceparentParameter)
  .errors([ApiErrorCode.FORBIDDEN, ApiErrorCode.NOT_FOUND])
  .tags(StudioTag.CREW)
  .resource('date-access-grants', { id: DateAccessGrantIdParameter });

export const revokeDateAccess: RevokeDateAccessRoute = dateAccessGrants.delete({
  operationId: 'revokeDateAccess',
  summary: 'Revokes a one-off access, without touching membership.',
  response: DateAccessRevocationSchema,
  answer: 'Access revoked.',
});
