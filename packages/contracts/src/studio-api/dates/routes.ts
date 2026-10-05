import { ApiErrorCode, CatalogErrorCode, DomainErrorCode } from '@arthome/core';

import {
  DateOutcomeDecisionSchema,
  DatePublicPaneSchema,
  DateReplayPaneSchema,
  DecideDateOutcomeBodySchema,
  DuplicateDateBodySchema,
  MoveDatePublicationStateBodySchema,
  SetDateReplayPolicyBodySchema,
} from './schemas.js';
import type {
  DecideDateOutcomeRoute,
  DeleteDateRoute,
  DuplicateDateRoute,
  GetDatePublicPaneRoute,
  GetDateReplayPaneRoute,
  GetDateSheetRoute,
  MoveDatePublicationStateRoute,
  SetDateReplayPolicyRoute,
} from './types.js';
import { Deleted } from '../../http/index.js';
import { DateSheetSchema, PublicationSchema } from '../../studio-stage/index.js';
import {
  DateIdParameter,
  StudioTag,
  SurfaceParameter,
  TraceparentParameter,
  operator,
  studioV1,
} from '../components.js';

const dates = studioV1
  .identity(operator)
  .headers(SurfaceParameter, TraceparentParameter)
  .errors([ApiErrorCode.FORBIDDEN, ApiErrorCode.NOT_FOUND]);
const publicationDate = dates
  .tags(StudioTag.PUBLICATION)
  .resource('dates', { id: DateIdParameter });

export const getDateSheet: GetDateSheetRoute = publicationDate.single('sheet').find({
  operationId: 'getDateSheet',
  summary: "A date's record, and the list of panes open to this person.",
  item: DateSheetSchema,
  answer: 'The record and its publication.',
});

export const getDatePublicPane: GetDatePublicPaneRoute = publicationDate
  .single('panes/public')
  .find({
    operationId: 'getDatePublicPane',
    summary: "A date's public pane — what is published.",
    item: DatePublicPaneSchema,
    answer: 'The public pane.',
  });

export const getDateReplayPane: GetDateReplayPaneRoute = publicationDate
  .single('panes/replay')
  .find({
    operationId: 'getDateReplayPane',
    summary: "A date's replay pane — the promise, the file, the sale.",
    item: DateReplayPaneSchema,
    answer: 'Policy, active, remaining window, sale, audience.',
  });

export const moveDatePublicationState: MoveDatePublicationStateRoute = publicationDate.action(
  'publication/transitions',
  {
    operationId: 'moveDatePublicationState',
    summary: 'Moves the date through the state machine.',
    body: MoveDatePublicationStateBodySchema,
    response: PublicationSchema,
    answer: 'Transition applied. The publication up to date, with its newly offered transitions.',
    errors: [
      DomainErrorCode.STATE_CONFLICT,
      DomainErrorCode.PUBLICATION_TRANSITION_IRREVERSIBLE,
      DomainErrorCode.PUBLICATION_PROMISE_UNACKNOWLEDGED,
      DomainErrorCode.PUBLICATION_CHECKLIST_INCOMPLETE,
    ],
  },
);

export const setDateReplayPolicy: SetDateReplayPolicyRoute = publicationDate
  .single('replay-policy')
  .replace({
    operationId: 'setDateReplayPolicy',
    summary: 'Sets the replay policy — the promise made before the purchase.',
    body: SetDateReplayPolicyBodySchema,
    item: PublicationSchema,
    answer: 'Policy up to date.',
    errors: [CatalogErrorCode.REPLAY_POLICY_FINAL],
  });

export const deleteDate: DeleteDateRoute = publicationDate.delete({
  operationId: 'deleteDate',
  summary: 'Deletes a date.',
  response: Deleted,
  answer: 'Date deleted.',
  errors: [CatalogErrorCode.DATE_HAS_SOLD_SEATS],
});

export const duplicateDate: DuplicateDateRoute = publicationDate.action('duplicate', {
  operationId: 'duplicateDate',
  summary: 'Duplicates a date, or applies it to the series.',
  body: DuplicateDateBodySchema,
  response: DateSheetSchema,
  status: 201,
  answer: "New date created, **without** the original's prices or capacity.",
  errors: [DomainErrorCode.STATE_CONFLICT],
});

export const decideDateOutcome: DecideDateOutcomeRoute = publicationDate.action('outcome', {
  operationId: 'decideDateOutcome',
  summary: "Declares a date's outcome — postpone, cancel, interrupt.",
  body: DecideDateOutcomeBodySchema,
  response: DateOutcomeDecisionSchema,
  answer: 'Outcome declared, and what it implies for the holders.',
  errors: [
    CatalogErrorCode.OUTCOME_DECISION_FORBIDDEN,
    DomainErrorCode.STATE_CONFLICT,
    CatalogErrorCode.OUTCOME_FINAL,
    CatalogErrorCode.DATE_NOT_PUBLIC,
    CatalogErrorCode.DATE_ALREADY_STARTED,
    CatalogErrorCode.DATE_NOT_STARTED,
    CatalogErrorCode.DATE_ALREADY_ENDED,
    CatalogErrorCode.RESCHEDULE_IN_PAST,
  ],
});
