import type { z } from 'zod';

import {
  AudienceSanction,
  ChatMode,
  CrewRole,
  DatePane,
  DateOutcome,
  DisplayState,
  FilterSeverity,
  IncidentCause,
  IncidentKind,
  Locale,
  MemberRole,
  MessageState,
  PriceTier,
  PublicationPromise,
  ReplayPolicy,
  RightsScope,
  RunState,
  Surface,
} from '@arthome/core';

import type {
  CapacityTierOpening,
  Chapter,
  ComplimentaryIssue,
  DateChatPane,
  DateCrewPane,
  DateOutcomeDecision,
  DatePublicPane,
  DateReplayPane,
  DateTechPane,
  DecideDateOutcomeBody,
  DuplicateDateBody,
  GrantDateAccessBody,
  IssueComplimentaryBody,
  MerchPin,
  MoveDatePublicationStateBody,
  OpenCapacityTierBody,
  PinMerchDuringLiveBody,
  PostChapterBody,
  RaiseIncidentBody,
  ReopenReplayWindowBody,
  ReplayWindow,
  RotateStreamKeyBody,
  RunTransitionBody,
  SetDateChatPolicyBody,
  SetDatePricesBody,
  SetDateReplayPolicyBody,
  SetQualityProfileBody,
  SetTechnicalProvisionBody,
  StudioChatMessage,
  SubmitHealthSampleBody,
  TechnicalCheck,
} from './schemas.js';
import {
  CapacityTierOpeningSchema,
  ChapterSchema,
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
  StudioChatMessageSchema,
  SubmitHealthSampleBodySchema,
  TechnicalCheckSchema,
} from './schemas.js';
import type { ModuleExamples } from '../../openapi/docs.js';
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

const DATE_ID = '019928a0-7d31-7a10-b8c4-2f9e11a4c001';

const dateSheet: z.output<typeof DateSheetSchema> = {
  dateId: DATE_ID,
  channelId: '019928a0-7d31-7a10-b8c4-2f9e11a4c222',
  title: 'Nuit blanche',
  startsAt: '2026-09-21T19:00:00Z',
  venueClock: { venueTimezone: 'Europe/Paris', venueUtcOffsetMin: 120 },
  runtimeMin: 95,
  openPanes: [DatePane.PUBLIC, DatePane.TICKETS, DatePane.TECH],
  publication: {
    dateId: DATE_ID,
    state: DisplayState.SCHEDULED,
    orderRank: 3,
    version: 7,
    checklist: [],
    offeredTransitions: [],
  },
};

const datePublicPane: DatePublicPane = {
  title: 'Nuit blanche',
  categoryId: 'dance-contemporary',
  genreIds: ['dance-contemporary-repertoire'],
  slug: '2026-09-21',
  canonicalUrl: 'https://arthome.fr/show/nuit-blanche/date/2026-09-21',
  rights: { scope: RightsScope.WORLDWIDE, blackoutCountries: [] },
  version: 8,
};

const dateReplayPane: DateReplayPane = {
  policy: ReplayPolicy.INCLUDED,
  windowHours: 72,
  assetReady: true,
  durationSec: 5700,
  availableFrom: '2026-09-21T22:00:00Z',
  expiresAt: '2026-09-24T22:00:00Z',
  views: 412,
  version: 2,
};

const publication: z.output<typeof PublicationSchema> = {
  dateId: DATE_ID,
  state: DisplayState.SCHEDULED,
  orderRank: 3,
  version: 8,
  publishedAt: '2026-09-21T18:04:00Z',
  pricesLockedAt: '2026-09-21T18:04:00Z',
  checklist: [],
  offeredTransitions: [
    { from: DisplayState.SCHEDULED, to: DisplayState.TECHNICAL, irreversible: false },
  ],
};

const moveDatePublicationStateBody: MoveDatePublicationStateBody = {
  to: DisplayState.SCHEDULED,
  expectedVersion: 7,
  acknowledgedPromiseCode: PublicationPromise.PRICES_ENGAGED,
};

const setDateReplayPolicyBody: SetDateReplayPolicyBody = {
  policy: ReplayPolicy.UNIT,
  windowHours: 72,
};

const duplicateDateBody: DuplicateDateBody = {
  newDateId: '019928c1-0000-7000-8000-000000000001',
  startsAt: '2026-11-05T19:30:00Z',
};

const decideDateOutcomeBody: DecideDateOutcomeBody = {
  outcome: DateOutcome.POSTPONED,
  message: {
    contentLanguage: Locale.FR,
    text: 'Report au 4 novembre. Vos places restent valables.',
  },
  rescheduledTo: '2026-11-04T19:30:00Z',
  expectedVersion: 8,
};

const dateOutcomeDecision: DateOutcomeDecision = {
  outcome: DateOutcome.POSTPONED,
  declaredAt: '2026-09-21T20:50:00Z',
  moneyEffectCode: 'no_movement',
  affectedSeats: 174,
  version: 9,
};

const dateSalesPane: z.output<typeof DateSalesPaneSchema> = {
  dateId: DATE_ID,
  capacityTotal: 200,
  seatsAvailable: 26,
  seatsSold: 174,
  waitlistCount: 12,
  fillRateBps: 8700,
  priceTiers: [
    { tier: PriceTier.FULL, amount: { amountMinor: 2400, currencyCode: 'EUR' }, active: true },
  ],
  serviceFeePerSeat: { amountMinor: 150, currencyCode: 'EUR' },
  pricesLocked: true,
  technicalProvision: {
    required: false,
    threshold: 10000,
    provisionedCapacity: null,
    revisableUntil: null,
  },
  version: 12,
};

const setDatePricesBody: SetDatePricesBody = {
  tiers: [
    { tier: PriceTier.FULL, amountMinor: 2400, currencyCode: 'EUR', active: true },
    { tier: PriceTier.REDUCED, amountMinor: 1600, currencyCode: 'EUR', active: true },
  ],
};

const openCapacityTierBody: OpenCapacityTierBody = {
  additionalCapacity: 50,
  expectedVersion: 12,
  notifyWaitlist: true,
};

const capacityTierOpening: CapacityTierOpening = {
  sales: {
    dateId: DATE_ID,
    capacityTotal: 250,
    seatsAvailable: 26,
    priorityPool: { seatsLeft: 50, priorityUntil: '2026-09-21T20:06:00Z' },
    priceTiers: [],
    pricesLocked: true,
    version: 13,
  },
  waitlistNotified: 12,
  priorityUntil: '2026-09-21T20:06:00Z',
  version: 14,
};

const setTechnicalProvisionBody: SetTechnicalProvisionBody = { provisionedCapacity: 15000 };

const issueComplimentaryBody: IssueComplimentaryBody = {
  categoryId: 'press',
  quantity: 4,
  note: 'Invitations presse',
};

const complimentaryIssue: ComplimentaryIssue = {
  seatCodes: ['ATH-2P4K-8M', 'ATH-9L1D-3X'],
  sales: {
    dateId: DATE_ID,
    capacityTotal: 200,
    seatsAvailable: 24,
    priceTiers: [],
    pricesLocked: true,
    version: 14,
  },
};

const chatPolicy: z.output<typeof ChatPolicySchema> = {
  dateId: DATE_ID,
  mode: ChatMode.OPEN,
  filterSeverity: FilterSeverity.MEDIUM,
  slowModeSec: 0,
  holdersOnly: false,
  locked: true,
  version: 5,
};

const dateChatPane: DateChatPane = {
  policy: chatPolicy,
  throughputPerMinute: 41,
  pendingModerationCount: 14,
  assignedModerators: [],
};

const setDateChatPolicyBody: SetDateChatPolicyBody = { mode: ChatMode.EMOJI, slowModeSec: 10 };

const studioChatMessage: StudioChatMessage = {
  id: '019928f8-0000-7000-8000-000000000009',
  seq: 41280,
  authorHandle: '@anon.7742',
  atMediaSec: 1812,
  sentAt: '2026-09-21T19:29:42Z',
  state: MessageState.REMOVED,
  badge: AudienceSanction.MUTED,
  body: { contentLanguage: Locale.FR, text: '…' },
};

const dateTechPane: DateTechPane = {
  runState: RunState.IDLE,
  ingestProtocol: 'rtmps',
  monitorPath: 'll_hls',
  ingestUrl: 'rtmps://ingest.arthome.fr/live',
  technicalCheckPassedAt: '2026-09-21T18:45:00Z',
  preflight: [{ id: 'ingest_reachable', satisfied: true, measuredAt: '2026-09-21T18:44:58Z' }],
  qualityLadder: [{ renditionId: '1080p', heightPx: 1080, enabled: true }],
  version: 3,
};

const runConsole: z.output<typeof RunConsoleSchema> = {
  dateId: DATE_ID,
  state: RunState.ON_AIR,
  afterGracePeriod: true,
  ingestProtocol: 'rtmps',
  monitorPath: 'll_hls',
  monitorUrl: 'https://monitor.arthome.fr/a9f1c0/index.m3u8',
  qualityLadder: [{ renditionId: '1080p', heightPx: 1080, enabled: true }],
  startedAt: '2026-09-21T19:00:12Z',
  lastSample: {
    measuredAt: '2026-09-21T19:19:57Z',
    source: 'ingest_server',
    ingestUpKbps: 8900,
    latencyMs: null,
    droppedPct: 0.1,
    viewers: 1842,
  },
  incident: null,
  chapters: [],
  presence: [
    {
      personId: '019928b2-0000-7000-8000-00000000000a',
      displayName: 'Marie J.',
      roles: [MemberRole.PRODUCTION],
      lastActivityAt: '2026-09-21T19:19:48Z',
      isSelf: false,
    },
  ],
  chatThroughputPerMinute: 41,
  version: 3,
};

const technicalCheck: TechnicalCheck = {
  passed: true,
  passedAt: '2026-09-21T18:45:00Z',
  failures: [],
  sample: { measuredAt: '2026-09-21T18:44:58Z', source: 'ingest_server', ingestUpKbps: 9100 },
};

const runTransitionBody: RunTransitionBody = { expectedVersion: 3 };

const setQualityProfileBody: SetQualityProfileBody = {
  renditions: [
    { renditionId: '1080p', enabled: true },
    { renditionId: '360p', enabled: true },
  ],
};

const healthSeries: z.output<typeof HealthSeriesSchema> = {
  windowSec: 180,
  samples: [
    {
      measuredAt: '2026-09-21T21:39:00Z',
      source: 'ingest_server',
      ingestUpKbps: 8900,
      droppedPct: 0.1,
      viewers: 412,
    },
    {
      measuredAt: '2026-09-21T21:39:30Z',
      source: 'ingest_server',
      ingestUpKbps: 8700,
      droppedPct: 0.2,
      viewers: 431,
    },
  ],
  peakViewers: 431,
  peakViewersAt: '2026-09-21T21:39:30Z',
};

const submitHealthSampleBody: SubmitHealthSampleBody = {
  measuredAt: '2026-09-21T19:20:00Z',
  latencyMs: 820,
  deviceUpKbps: 4100,
};

const postChapterBody: PostChapterBody = {
  chapterId: '019928d0-0000-7000-8000-000000000001',
  vocabId: 'chapter.second_act',
  atMediaSec: 2760,
};

const chapter: Chapter = {
  id: '019928d0-0000-7000-8000-000000000001',
  vocabId: 'chapter.second_act',
  atMediaSec: 2760,
};

const raiseIncidentBody: RaiseIncidentBody = {
  incidentId: '019928d1-0000-7000-8000-000000000001',
  kind: IncidentKind.HOLD_SCREEN,
  cause: IncidentCause.VENUE_FEED_LOST,
  message: {
    contentLanguage: Locale.FR,
    text: 'Interruption technique. Nous reprenons dans quelques instants.',
  },
};

const incident: z.output<typeof StudioIncidentSchema> = {
  id: '019928d1-0000-7000-8000-000000000001',
  kind: IncidentKind.HOLD_SCREEN,
  cause: IncidentCause.VENUE_FEED_LOST,
  trigger: IncidentCause.MANUAL,
  message: {
    contentLanguage: Locale.FR,
    text: 'Interruption technique. Nous reprenons dans quelques instants.',
  },
  raisedAt: '2026-09-21T19:52:00Z',
  raisedBy: {
    personId: '019928b0-0000-7000-8000-000000000001',
    displayName: 'Claire D.',
    surface: Surface.STUDIO_MOBILE,
  },
};

const streamKeyReveal: z.output<typeof StreamKeyRevealSchema> = {
  streamKey: 'sk_live_9f2ac1b4',
  ingestUrl: 'rtmps://ingest.arthome.fr/live',
  revealedAt: '2026-09-21T18:40:00Z',
};

const rotateStreamKeyBody: RotateStreamKeyBody = {
  reauthToken: 'ott_9f2ac1',
  confirmDuringRun: false,
};

const dateAccessGrant: z.output<typeof DateAccessGrantSchema> = {
  grantId: '019928b3-0000-7000-8000-000000000001',
  dateId: DATE_ID,
  personId: '019928b2-0000-7000-8000-000000000001',
  displayName: 'Yann P.',
  crewRole: CrewRole.DIRECTOR,
  expiresAt: '2026-09-21T21:45:00Z',
  grantedBy: {
    personId: '019928b0-0000-7000-8000-000000000001',
    displayName: 'Claire D.',
    surface: Surface.STUDIO_WEB,
  },
};

const dateCrewPane: DateCrewPane = {
  slots: [
    {
      crewRole: CrewRole.DIRECTOR,
      covered: true,
      personId: '019928b2-0000-7000-8000-000000000001',
      displayName: 'Yann P.',
      membershipKind: 'grant',
    },
    {
      crewRole: CrewRole.MODERATION,
      covered: false,
      personId: null,
      displayName: null,
      membershipKind: 'member',
    },
  ],
  grants: [
    {
      grantId: '019928b3-0000-7000-8000-000000000001',
      dateId: DATE_ID,
      personId: '019928b2-0000-7000-8000-000000000001',
      displayName: 'Yann P.',
      crewRole: CrewRole.DIRECTOR,
      expiresAt: '2026-09-21T21:45:00Z',
    },
  ],
  missingRoles: [CrewRole.MODERATION],
};

const grantDateAccessBody: GrantDateAccessBody = {
  personId: '019928b2-0000-7000-8000-000000000001',
  crewRole: CrewRole.DIRECTOR,
  expiresAt: '2026-09-21T21:45:00Z',
};

const pinMerchDuringLiveBody: PinMerchDuringLiveBody = {
  itemId: '019928a0-7d31-7a10-b8c4-2f9e11a4d001',
};

const merchPin: MerchPin = { pinnedItemId: '019928a0-7d31-7a10-b8c4-2f9e11a4d001' };

const reopenReplayWindowBody: ReopenReplayWindowBody = { additionalHours: 48 };

const replayWindow: ReplayWindow = { expiresAt: '2026-09-26T21:30:00Z', windowHours: 120 };

export const datesExamples: ModuleExamples = [
  [DateSheetSchema, [dateSheet]],
  [DatePublicPaneSchema, [datePublicPane]],
  [DateReplayPaneSchema, [dateReplayPane]],
  [PublicationSchema, [publication]],
  [MoveDatePublicationStateBodySchema, [moveDatePublicationStateBody]],
  [SetDateReplayPolicyBodySchema, [setDateReplayPolicyBody]],
  [DuplicateDateBodySchema, [duplicateDateBody]],
  [DecideDateOutcomeBodySchema, [decideDateOutcomeBody]],
  [DateOutcomeDecisionSchema, [dateOutcomeDecision]],
  [DateSalesPaneSchema, [dateSalesPane]],
  [SetDatePricesBodySchema, [setDatePricesBody]],
  [OpenCapacityTierBodySchema, [openCapacityTierBody]],
  [CapacityTierOpeningSchema, [capacityTierOpening]],
  [SetTechnicalProvisionBodySchema, [setTechnicalProvisionBody]],
  [IssueComplimentaryBodySchema, [issueComplimentaryBody]],
  [ComplimentaryIssueSchema, [complimentaryIssue]],
  [ChatPolicySchema, [chatPolicy]],
  [DateChatPaneSchema, [dateChatPane]],
  [SetDateChatPolicyBodySchema, [setDateChatPolicyBody]],
  [StudioChatMessageSchema, [studioChatMessage]],
  [DateTechPaneSchema, [dateTechPane]],
  [RunConsoleSchema, [runConsole]],
  [TechnicalCheckSchema, [technicalCheck]],
  [RunTransitionBodySchema, [runTransitionBody]],
  [SetQualityProfileBodySchema, [setQualityProfileBody]],
  [HealthSeriesSchema, [healthSeries]],
  [SubmitHealthSampleBodySchema, [submitHealthSampleBody]],
  [PostChapterBodySchema, [postChapterBody]],
  [ChapterSchema, [chapter]],
  [RaiseIncidentBodySchema, [raiseIncidentBody]],
  [StudioIncidentSchema, [incident]],
  [StreamKeyRevealSchema, [streamKeyReveal]],
  [RotateStreamKeyBodySchema, [rotateStreamKeyBody]],
  [DateCrewPaneSchema, [dateCrewPane]],
  [DateAccessGrantSchema, [dateAccessGrant]],
  [GrantDateAccessBodySchema, [grantDateAccessBody]],
  [PinMerchDuringLiveBodySchema, [pinMerchDuringLiveBody]],
  [MerchPinSchema, [merchPin]],
  [ReopenReplayWindowBodySchema, [reopenReplayWindowBody]],
  [ReplayWindowSchema, [replayWindow]],
];
