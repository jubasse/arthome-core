import { ApiErrorCode, ModerationErrorCode } from '@arthome/core';

import { ModerationItemIdParameter, SettleModerationItemBodySchema } from './schemas.js';
import type {
  ClaimModerationItemRoute,
  ReleaseModerationItemRoute,
  SettleModerationItemRoute,
} from './types.js';
import { ModerationItemSchema } from '../../studio-desk/index.js';
import {
  StudioTag,
  SurfaceParameter,
  TraceparentParameter,
  operator,
  studioV1,
} from '../components.js';

const moderationItems = studioV1
  .identity(operator)
  .headers(SurfaceParameter, TraceparentParameter)
  .errors([ApiErrorCode.FORBIDDEN, ApiErrorCode.NOT_FOUND])
  .tags(StudioTag.MODERATION)
  .resource('moderation/items', { id: ModerationItemIdParameter });

export const claimModerationItem: ClaimModerationItemRoute = moderationItems.action('claim', {
  operationId: 'claimModerationItem',
  summary: 'Claims a row — a lease, not a write.',
  response: ModerationItemSchema,
  answer: 'Lease taken, with the instant it expires.',
  errors: [ModerationErrorCode.ALREADY_CLAIMED],
});

export const releaseModerationItem: ReleaseModerationItemRoute = moderationItems
  .single('claim')
  .delete({
    operationId: 'releaseModerationItem',
    summary: 'Releases the claim.',
    response: ModerationItemSchema,
    answer: 'Row released.',
  });

export const settleModerationItem: SettleModerationItemRoute = moderationItems.action('verdict', {
  operationId: 'settleModerationItem',
  summary: 'Renders a verdict — conditional, never a blind idempotent write.',
  body: SettleModerationItemBodySchema,
  response: ModerationItemSchema,
  answer: 'Verdict rendered.',
  errors: [ModerationErrorCode.ALREADY_SETTLED],
});
