import type { z } from 'zod';

import {
  DatePane,
  DateOutcome,
  DisplayState,
  Locale,
  PublicationPromise,
  ReplayPolicy,
  RightsScope,
} from '@arthome/core';

import type {
  DateOutcomeDecision,
  DatePublicPane,
  DateReplayPane,
  DecideDateOutcomeBody,
  DuplicateDateBody,
  MoveDatePublicationStateBody,
  SetDateReplayPolicyBody,
} from './schemas.js';
import {
  DateOutcomeDecisionSchema,
  DatePublicPaneSchema,
  DateReplayPaneSchema,
  DecideDateOutcomeBodySchema,
  DuplicateDateBodySchema,
  MoveDatePublicationStateBodySchema,
  SetDateReplayPolicyBodySchema,
} from './schemas.js';
import type { ModuleExamples } from '../../openapi/docs.js';
import { DateSheetSchema, PublicationSchema } from '../../studio-stage/index.js';

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
};

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
];
