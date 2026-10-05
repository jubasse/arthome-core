import { ApiErrorCode } from '@arthome/core';

import { CreateUploadTicketBodySchema } from './schemas.js';
import type { CreateUploadTicketRoute } from './types.js';
import { UploadTicketSchema } from '../../studio-stage/index.js';
import {
  StudioTag,
  SurfaceParameter,
  TraceparentParameter,
  operator,
  studioV1,
} from '../components.js';

const uploads = studioV1
  .identity(operator)
  .headers(SurfaceParameter, TraceparentParameter)
  .errors([ApiErrorCode.FORBIDDEN, ApiErrorCode.NOT_FOUND])
  .tags(StudioTag.CHANNEL)
  .single('uploads');

export const createUploadTicket: CreateUploadTicketRoute = uploads.create({
  operationId: 'createUploadTicket',
  summary: 'Obtains a signed upload URL for a binary.',
  body: CreateUploadTicketBodySchema,
  item: UploadTicketSchema,
  answer: 'Signed upload URL.',
});
