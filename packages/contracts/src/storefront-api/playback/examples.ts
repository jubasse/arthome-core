import type { z } from 'zod';

import { ChatMode, DisplayState, Locale, PriceTier } from '@arthome/core';

import type { OpenPlaybackBody } from './schemas.js';
import { OpenPlaybackBodySchema } from './schemas.js';
import type { ModuleExamples } from '../../openapi/docs.js';
import { PlaybackRenewalSchema, PlaybackTicketSchema } from '../../streaming/index.js';

const openPlaybackBody: OpenPlaybackBody = {
  deviceId: '019928f4-1b6c-7c3a-9f2e-6a1d0c4b8e77',
  kind: DisplayState.LIVE,
  capabilities: { drmSystems: ['fairplay'], hardwareSecureDecode: true, maxHeightPx: 2160 },
};

const playbackTicket: z.output<typeof PlaybackTicketSchema> = {
  sessionId: '019928f7-0000-7000-8000-000000000001',
  dateId: '019928a0-7d31-7a10-b8c4-2f9e11a4c001',
  scope: PriceTier.FULL,
  protocol: 'hls',
  drmSystem: 'fairplay',
  qualityCap: 'fhd',
  manifestUrl: 'https://cdn.arthome.fr/playback/a9f1c0/master.m3u8',
  signature: { queryToken: 'Expires=1790000000&Signature=abc', cookieSet: null },
  edgeRenewalMode: 'query_token',
  expiresAt: '2026-09-21T19:07:00.000Z',
  renewAfterSec: 45,
  leaseExpiresAt: '2026-09-21T19:06:30.000Z',
  chatMode: ChatMode.OPEN,
  chatRateLimitPerSecond: 2,
  liveEdgeSec: 6,
  chapters: [],
  audioTracks: [{ id: 'fr-main', language: Locale.FR, kind: 'main' }],
  subtitleTracks: [],
  incident: null,
};

const playbackRenewal: z.output<typeof PlaybackRenewalSchema> = {
  expiresAt: '2026-09-21T19:07:45.000Z',
  renewAfterSec: 45,
  leaseExpiresAt: '2026-09-21T19:07:15.000Z',
  signature: { queryToken: 'Expires=1790000120&Signature=def', cookieSet: null },
  qualityCap: 'fhd',
};

export const playbackExamples: ModuleExamples = [
  [OpenPlaybackBodySchema, [openPlaybackBody]],
  [PlaybackTicketSchema, [playbackTicket]],
  [PlaybackRenewalSchema, [playbackRenewal]],
];
