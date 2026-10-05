import type { z } from 'zod';

import {
  AccountStatus,
  DisplayState,
  OrderKind,
  OrderState,
  PriceTier,
  ReplayPolicy,
  RightsScope,
} from '@arthome/core';

import type { CreatePairingBody, DecidePairingBody, EngagePairingBody } from './schemas.js';
import {
  CreatePairingBodySchema,
  DecidePairingBodySchema,
  EngagePairingBodySchema,
} from './schemas.js';
import { DevicePairingSchema, PairingOutcomeSchema } from '../../identity/index.js';
import type { ModuleExamples } from '../../openapi/docs.js';

const createPairingBody: CreatePairingBody = {
  intent: OrderKind.SEAT,
  deviceId: '019928f4-1b6c-7c3a-9f2e-6a1d0c4b8e77',
  payload: {
    dateId: '019928a0-7d31-7a10-b8c4-2f9e11a4c001',
    tier: PriceTier.FULL,
    quantity: 2,
  },
};

const engagePairingBody: EngagePairingBody = {};

const decidePairingBody: DecidePairingBody = {
  decision: 'approve',
  outcomeRef: 'seat:019928f5-0000-7000-8000-000000000001',
};

const devicePairing: z.output<typeof DevicePairingSchema> = {
  pairingId: '019928f9-0000-7000-8000-000000000001',
  intent: OrderKind.SEAT,
  userCode: 'K7M2PQ',
  verificationUri: 'https://arthome.fr/appairage',
  verificationUriComplete: 'https://arthome.fr/appairage?code=K7M2PQ',
  expiresAt: '2026-09-21T18:55:00.000Z',
  pollIntervalSec: 2,
  state: OrderState.PENDING,
};

const pairingOutcome: z.output<typeof PairingOutcomeSchema> = {
  pairingId: '019928f9-0000-7000-8000-000000000001',
  intent: OrderKind.SEAT,
  state: 'approved',
  pollIntervalSec: 5,
  ticket: {
    seatId: '019928f5-0000-7000-8000-000000000001',
    dateId: '019928a0-7d31-7a10-b8c4-2f9e11a4c001',
    seatCode: 'ATH-7QK2-4M',
    tier: PriceTier.FULL,
    state: AccountStatus.ACTIVE,
    date: {
      id: '019928a0-7d31-7a10-b8c4-2f9e11a4c001',
      showId: '019928a0-7d31-7a10-b8c4-2f9e11a4c111',
      channelId: '019928a0-7d31-7a10-b8c4-2f9e11a4c222',
      slug: '2026-09-21',
      canonicalUrl: 'https://arthome.fr/show/nuit-blanche/date/2026-09-21',
      title: 'Nuit blanche',
      startsAt: '2026-09-21T19:00:00Z',
      venueClock: { venueTimezone: 'Europe/Paris', venueUtcOffsetMin: 120 },
      runtimeMin: 95,
      roomOpensAt: '2026-09-21T18:30:00Z',
      displayState: DisplayState.ROOM_OPEN,
      displayStateValidUntil: '2026-09-21T19:00:00Z',
      replay: { policy: ReplayPolicy.INCLUDED, windowHours: 72 },
      rights: { scope: RightsScope.WORLDWIDE, blackoutCountries: [] },
      media: { wide: [], poster: [] },
    },
  },
};

export const pairingsExamples: ModuleExamples = [
  [CreatePairingBodySchema, [createPairingBody]],
  [EngagePairingBodySchema, [engagePairingBody]],
  [DecidePairingBodySchema, [decidePairingBody]],
  [DevicePairingSchema, [devicePairing]],
  [PairingOutcomeSchema, [pairingOutcome]],
];
