import { InboxReadAnswerSchema, MarkInboxReadBodySchema } from './schemas.js';
import type { ListInboxRoute, MarkInboxReadRoute } from './types.js';
import { pages } from '../../http/index.js';
import { InboxEntrySchema } from '../../studio-desk/index.js';
import {
  StudioTag,
  SurfaceParameter,
  TraceparentParameter,
  operator,
  studioV1,
} from '../components.js';

const inbox = studioV1
  .identity(operator)
  .headers(SurfaceParameter, TraceparentParameter)
  .tags(StudioTag.BOOTSTRAP)
  .single('inbox', { owner: 'caller' });

export const listInbox: ListInboxRoute = inbox.findAll({
  operationId: 'listInbox',
  summary: 'The inbox — invitations and alerts routed by role and by channel.',
  paging: pages({ maxPageSize: 100 }),
  item: InboxEntrySchema,
  answer: 'A page of inbox entries.',
});

export const markInboxRead: MarkInboxReadRoute = inbox.create({
  operationId: 'markInboxRead',
  summary: 'Marks inbox entries as read.',
  body: MarkInboxReadBodySchema,
  responses: {
    200: {
      description: 'Up-to-date counters.',
      content: { 'application/json': { schema: InboxReadAnswerSchema } },
    },
  },
});
