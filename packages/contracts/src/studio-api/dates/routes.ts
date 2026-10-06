import { ApiErrorCode, CatalogErrorCode, ChannelErrorCode, DomainErrorCode } from '@arthome/core';

import {
  CapacityTierOpeningSchema,
  ChapterIdParameter,
  ChapterSchema,
  ChatMessageIdParameter,
  ComplimentaryIssueSchema,
  DateChatPaneSchema,
  DateCrewPaneSchema,
  DateOutcomeDecisionSchema,
  DatePublicPaneSchema,
  DateReplayPaneSchema,
  DateTechPaneSchema,
  DecideDateOutcomeBodySchema,
  DuplicateDateBodySchema,
  GrantDateAccessBodySchema,
  HealthWindowParameter,
  IncidentIdParameter,
  IssueComplimentaryBodySchema,
  MerchPinSchema,
  MoveDatePublicationStateBodySchema,
  OpenCapacityTierBodySchema,
  PinMerchDuringLiveBodySchema,
  PostChapterBodySchema,
  RaiseIncidentBodySchema,
  ReopenReplayWindowBodySchema,
  ReplayWindowSchema,
  RotateStreamKeyBodySchema,
  RunTransitionBodySchema,
  SetDateChatPolicyBodySchema,
  SetDatePricesBodySchema,
  SetDateReplayPolicyBodySchema,
  SetQualityProfileBodySchema,
  SetTechnicalProvisionBodySchema,
  SinceSeqParameter,
  StudioChatMessageSchema,
  SubmitHealthSampleBodySchema,
  TechnicalCheckSchema,
} from './schemas.js';
import type {
  DecideDateOutcomeRoute,
  DeleteDateRoute,
  DuplicateDateRoute,
  EndRunRoute,
  GetDateChatPaneRoute,
  GetDateCrewPaneRoute,
  GetDatePublicPaneRoute,
  GetDateReplayPaneRoute,
  GetDateSheetRoute,
  GetDateTechPaneRoute,
  GetDateTicketsPaneRoute,
  GetHealthSeriesRoute,
  GetRunConsoleRoute,
  GoOnAirRoute,
  GrantDateAccessRoute,
  IssueComplimentaryRoute,
  ListStudioChatMessagesRoute,
  MoveDatePublicationStateRoute,
  OpenCapacityTierRoute,
  PinMerchDuringLiveRoute,
  PostChapterRoute,
  RaiseIncidentRoute,
  RehearseRunRoute,
  RemoveChapterRoute,
  ReopenReplayWindowRoute,
  ResetRunRoute,
  RevealStreamKeyRoute,
  RotateStreamKeyRoute,
  RunTechnicalCheckRoute,
  SetDateChatPolicyRoute,
  SetDatePricesRoute,
  SetDateReplayPolicyRoute,
  SetQualityProfileRoute,
  SetTechnicalProvisionRoute,
  SubmitHealthSampleRoute,
} from './types.js';
import { Acknowledged, Deleted, ReauthProof, cursor } from '../../http/index.js';
import { DateAccessGrantSchema } from '../../studio-access/index.js';
import { ChatPolicySchema } from '../../studio-desk/index.js';
import { DateSalesPaneSchema } from '../../studio-money/index.js';
import {
  DateSheetSchema,
  HealthSeriesSchema,
  PublicationSchema,
  RunConsoleSchema,
  StreamKeyRevealSchema,
  StudioIncidentSchema,
} from '../../studio-stage/index.js';
import {
  DateIdParameter,
  ReauthIntent,
  StudioTag,
  SurfaceParameter,
  TraceparentParameter,
  operator,
  recentAuth,
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

const ticketingDate = dates.tags(StudioTag.TICKETING).resource('dates', { id: DateIdParameter });

export const getDateTicketsPane: GetDateTicketsPaneRoute = ticketingDate
  .single('panes/tickets')
  .find({
    operationId: 'getDateTicketsPane',
    summary: "A date's ticketing pane.",
    item: DateSalesPaneSchema,
    answer: 'Capacity, tiers, prices, promotions, technical provision.',
  });

export const setDatePrices: SetDatePricesRoute = ticketingDate.single('prices').replace({
  operationId: 'setDatePrices',
  summary: "Sets a date's prices.",
  body: SetDatePricesBodySchema,
  item: DateSalesPaneSchema,
  answer: 'Prices up to date.',
  errors: [CatalogErrorCode.PRICES_LOCKED, CatalogErrorCode.PRICES_CURRENCY_MISMATCH],
});

export const openCapacityTier: OpenCapacityTierRoute = ticketingDate.action('capacity-tiers', {
  operationId: 'openCapacityTier',
  summary: 'Opens a capacity tier, and warns the waiting list in the same gesture.',
  body: OpenCapacityTierBodySchema,
  response: CapacityTierOpeningSchema,
  answer: 'Tier opened and waiting list warned, in the same transaction.',
  errors: [
    DomainErrorCode.CAPACITY_TIER_MUST_WIDEN,
    CatalogErrorCode.TECHNICAL_PROVISION_REQUIRED,
    CatalogErrorCode.OUTCOME_FINAL,
    DomainErrorCode.STATE_CONFLICT,
  ],
});

export const setTechnicalProvision: SetTechnicalProvisionRoute = ticketingDate
  .single('technical-provision')
  .replace({
    operationId: 'setTechnicalProvision',
    summary: "Records or revises a date's technical provision.",
    body: SetTechnicalProvisionBodySchema,
    item: DateSalesPaneSchema,
    answer: 'Provision recorded.',
    errors: [CatalogErrorCode.PROVISION_DEADLINE_PASSED, CatalogErrorCode.PROVISION_BELOW_CAPACITY],
  });

export const issueComplimentary: IssueComplimentaryRoute = ticketingDate.action('complimentaries', {
  operationId: 'issueComplimentary',
  summary: 'Issues complimentary tickets, by category.',
  body: IssueComplimentaryBodySchema,
  response: ComplimentaryIssueSchema,
  status: 201,
  answer: 'Complimentary tickets issued.',
  errors: [DomainErrorCode.STATE_CONFLICT],
});

const moderationDate = dates.tags(StudioTag.MODERATION).resource('dates', { id: DateIdParameter });

export const getDateChatPane: GetDateChatPaneRoute = moderationDate.single('panes/chat').find({
  operationId: 'getDateChatPane',
  summary: "A date's chat pane — the moderator's pane.",
  item: DateChatPaneSchema,
  answer: 'Chat regime, measured rate, queue waiting.',
});

export const setDateChatPolicy: SetDateChatPolicyRoute = moderationDate
  .single('chat-policy')
  .replace({
    operationId: 'setDateChatPolicy',
    summary: "Sets the date's chat regime.",
    body: SetDateChatPolicyBodySchema,
    item: ChatPolicySchema,
    answer: 'Regime up to date.',
  });

export const listStudioChatMessages: ListStudioChatMessagesRoute = moderationDate
  .path('chat')
  .resource('messages', { id: ChatMessageIdParameter })
  .findAll({
    operationId: 'listStudioChatMessages',
    summary:
      'The live chat as the studio sees it — **by cursor**, the second exception to page + total.',
    item: StudioChatMessageSchema,
    paging: cursor({ maxLimit: 200 }),
    parameters: [SinceSeqParameter],
    answer: 'A page of messages, with their state and their badge.',
  });

const runDate = dates.tags(StudioTag.RUN).resource('dates', { id: DateIdParameter });
const run = runDate.single('run');

export const getDateTechPane: GetDateTechPaneRoute = runDate.single('panes/tech').find({
  operationId: 'getDateTechPane',
  summary: "A date's technical pane — pre-flight and broadcast profile.",
  item: DateTechPaneSchema,
  answer: 'Protocol, return path, quality ladder, pre-flight checklist.',
});

export const getRunConsole: GetRunConsoleRoute = run.find({
  operationId: 'getRunConsole',
  summary: 'The state of the run — one call, the whole control-room screen.',
  item: RunConsoleSchema,
  answer: 'The console.',
});

export const runTechnicalCheck: RunTechnicalCheckRoute = run.action('technical-check', {
  operationId: 'runTechnicalCheck',
  summary: 'Starts the technical check.',
  response: TechnicalCheckSchema,
  answer: "The check's result, and the pre-flight checklist.",
  errors: [DomainErrorCode.STATE_CONFLICT],
});

export const rehearseRun: RehearseRunRoute = run.action('rehearse', {
  operationId: 'rehearseRun',
  summary: 'Starts the rehearsal.',
  body: RunTransitionBodySchema,
  response: RunConsoleSchema,
  answer: 'The console up to date.',
  errors: [DomainErrorCode.STATE_CONFLICT, DomainErrorCode.RUN_TRANSITION_FORBIDDEN],
});

export const goOnAir: GoOnAirRoute = run.action('go-on-air', {
  operationId: 'goOnAir',
  summary: 'Goes on air.',
  body: RunTransitionBodySchema,
  response: RunConsoleSchema,
  answer: 'The console up to date.',
  errors: [
    CatalogErrorCode.TECHNICAL_CHECK_REQUIRED,
    DomainErrorCode.STATE_CONFLICT,
    DomainErrorCode.RUN_TRANSITION_FORBIDDEN,
    DomainErrorCode.PUBLICATION_TRANSITION_FORBIDDEN,
  ],
});

export const endRun: EndRunRoute = run.action('end', {
  operationId: 'endRun',
  summary: 'Ends the broadcast.',
  body: RunTransitionBodySchema,
  response: RunConsoleSchema,
  answer: 'The console up to date.',
  errors: [DomainErrorCode.STATE_CONFLICT, DomainErrorCode.RUN_TRANSITION_FORBIDDEN],
});

export const resetRun: ResetRunRoute = run.action('reset', {
  operationId: 'resetRun',
  summary: 'Returns the run to idle.',
  body: RunTransitionBodySchema,
  response: RunConsoleSchema,
  answer: 'The console up to date.',
  errors: [DomainErrorCode.STATE_CONFLICT, DomainErrorCode.RUN_TRANSITION_FORBIDDEN],
});

export const setQualityProfile: SetQualityProfileRoute = runDate
  .single('run/quality-profile')
  .replace({
    operationId: 'setQualityProfile',
    summary: 'Changes the broadcast profile and the quality ladder.',
    body: SetQualityProfileBodySchema,
    item: RunConsoleSchema,
    answer: 'Quality ladder up to date.',
  });

const healthSamples = runDate.single('run/health-samples');

export const getHealthSeries: GetHealthSeriesRoute = healthSamples.find({
  operationId: 'getHealthSeries',
  summary: 'The health series over a bounded window — the curve a reconnection re-requests.',
  item: HealthSeriesSchema,
  parameters: [HealthWindowParameter],
  answer: 'The series over the window actually applied, with its peak.',
});

export const submitHealthSample: SubmitHealthSampleRoute = healthSamples.create({
  operationId: 'submitHealthSample',
  summary: 'Submits a measurement taken in the control room — the end-to-end latency.',
  body: SubmitHealthSampleBodySchema,
  item: Acknowledged,
  status: 202,
  idempotent: false,
  answer: 'Measurement accepted. A loss-tolerant write, with no idempotency key.',
});

const chapters = runDate.path('run').resource('chapters', { id: ChapterIdParameter });

export const postChapter: PostChapterRoute = chapters.create({
  operationId: 'postChapter',
  summary: 'Sets a chapter, at its position in the media.',
  body: PostChapterBodySchema,
  item: ChapterSchema,
  answer: 'Chapter set.',
});

export const removeChapter: RemoveChapterRoute = chapters.delete({
  operationId: 'removeChapter',
  summary: 'Removes a chapter.',
  response: Deleted,
  answer: 'Chapter removed.',
});

export const raiseIncident: RaiseIncidentRoute = runDate
  .resource('incidents', { id: IncidentIdParameter })
  .create({
    operationId: 'raiseIncident',
    summary: 'Declares an incident and broadcasts the holding screen.',
    body: RaiseIncidentBodySchema,
    item: StudioIncidentSchema,
    answer: 'Incident raised, broadcast in under two seconds.',
    errors: [DomainErrorCode.STATE_CONFLICT],
  });

const streamKey = runDate.single('stream-key');

export const revealStreamKey: RevealStreamKeyRoute = streamKey.action('reveal', {
  operationId: 'revealStreamKey',
  summary: 'Reveals the stream key — a separate command, audited, by name.',
  requires: [recentAuth({ intent: ReauthIntent.REVEAL_STREAM_KEY })],
  body: ReauthProof,
  response: StreamKeyRevealSchema,
  answer: 'The key, once, uncached.',
});

export const rotateStreamKey: RotateStreamKeyRoute = streamKey.action('rotate', {
  operationId: 'rotateStreamKey',
  summary: 'Rotates the stream key — the old one stops broadcasting at once.',
  requires: [recentAuth({ intent: ReauthIntent.ROTATE_STREAM_KEY })],
  body: RotateStreamKeyBodySchema,
  response: StreamKeyRevealSchema,
  answer: 'New key issued.',
  errors: [CatalogErrorCode.STREAM_KEY_ROTATION_DURING_RUN],
});

const crewDate = dates.tags(StudioTag.CREW).resource('dates', { id: DateIdParameter });

export const getDateCrewPane: GetDateCrewPaneRoute = crewDate.single('panes/crew').find({
  operationId: 'getDateCrewPane',
  summary: "A date's crew pane — assignments and one-off accesses, with their identifiers.",
  item: DateCrewPaneSchema,
  answer: 'Posts covered, posts missing, one-off accesses with their `grantId`.',
});

export const grantDateAccess: GrantDateAccessRoute = crewDate.single('crew').create({
  operationId: 'grantDateAccess',
  summary: 'Assigns a stand-in to a date, with an instant of expiry.',
  body: GrantDateAccessBodySchema,
  item: DateAccessGrantSchema,
  answer: 'One-off access granted.',
  errors: [ChannelErrorCode.CREW_ROLE_RESERVED],
});

const channelDate = dates.tags(StudioTag.CHANNEL).resource('dates', { id: DateIdParameter });

export const pinMerchDuringLive: PinMerchDuringLiveRoute = channelDate.action('merch-pin', {
  operationId: 'pinMerchDuringLive',
  summary: 'Pins an item during the live show.',
  body: PinMerchDuringLiveBodySchema,
  response: MerchPinSchema,
  answer: 'Pin up to date.',
});

export const reopenReplayWindow: ReopenReplayWindowRoute = channelDate.action('replay-window', {
  operationId: 'reopenReplayWindow',
  summary: 'Reopens the replay window.',
  body: ReopenReplayWindowBodySchema,
  response: ReplayWindowSchema,
  answer: 'Window reopened, with the new **derived** expiry.',
  errors: [CatalogErrorCode.REPLAY_POLICY_FINAL],
});
