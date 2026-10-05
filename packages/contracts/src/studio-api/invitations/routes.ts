import { ApiErrorCode, DomainErrorCode } from '@arthome/core';

import { InvitationIdParameter, RespondToInvitationBodySchema } from './schemas.js';
import type { RespondToInvitationRoute } from './types.js';
import { EffectiveRightsSchema } from '../../studio-access/index.js';
import {
  StudioTag,
  SurfaceParameter,
  TraceparentParameter,
  operator,
  studioV1,
} from '../components.js';

const invitations = studioV1
  .identity(operator)
  .headers(SurfaceParameter, TraceparentParameter)
  .errors([ApiErrorCode.FORBIDDEN, ApiErrorCode.NOT_FOUND])
  .tags(StudioTag.CREW)
  .resource('invitations', { id: InvitationIdParameter });

export const respondToInvitation: RespondToInvitationRoute = invitations.action('response', {
  operationId: 'respondToInvitation',
  summary: 'Accepts or declines an invitation.',
  body: RespondToInvitationBodySchema,
  response: EffectiveRightsSchema,
  answer: 'Answer recorded, with the new rights version.',
  errors: [DomainErrorCode.STATE_CONFLICT],
});
