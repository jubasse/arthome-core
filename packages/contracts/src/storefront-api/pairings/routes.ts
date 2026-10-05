import { ApiErrorCode, OrderErrorCode, PairingErrorCode } from '@arthome/core';

import {
  CreatePairingBodySchema,
  DecidePairingBodySchema,
  EngagePairingBodySchema,
  PairingIdParameter,
} from './schemas.js';
import type {
  CancelPairingRoute,
  CreatePairingRoute,
  DecidePairingRoute,
  EngagePairingRoute,
  PollPairingRoute,
} from './types.js';
import { throttle } from '../../http/index.js';
import { DevicePairingSchema, PairingOutcomeSchema } from '../../identity/index.js';
import {
  AdmissionTokenParameter,
  StorefrontTag,
  SurfaceParameter,
  TraceparentParameter,
  storefrontV1,
  viewer,
  viewerOrDevice,
} from '../components.js';

const pairing = storefrontV1
  .headers(SurfaceParameter, TraceparentParameter)
  .tags(StorefrontTag.PAIRING);
const devicePairings = pairing
  .identity(viewerOrDevice)
  .resource('pairings', { id: PairingIdParameter, owner: 'caller' });
const viewerPairings = pairing
  .identity(viewer)
  .resource('pairings', { id: PairingIdParameter, owner: 'caller' });

export const createPairing: CreatePairingRoute = devicePairings.create({
  operationId: 'createPairing',
  summary: 'Opens a device pairing, for one of the five intents.',
  parameters: [AdmissionTokenParameter],
  body: CreatePairingBodySchema,
  item: DevicePairingSchema,
  requires: [throttle('pairing_create')],
  answer: 'Pairing opened. The code, the complete QR, the expiry and the polling interval.',
  errors: [OrderErrorCode.SALES_QUEUE_ADMISSION_REQUIRED],
});

export const pollPairing: PollPairingRoute = devicePairings.find({
  operationId: 'pollPairing',
  summary: 'Polls the outcome of a pairing — and composes the confirmation screen.',
  item: PairingOutcomeSchema,
  answer: 'The outcome, and what it produced.',
  errors: [ApiErrorCode.CURSOR_TOO_OLD, PairingErrorCode.SLOW_DOWN],
});

export const cancelPairing: CancelPairingRoute = devicePairings.delete({
  operationId: 'cancelPairing',
  summary: 'Closes a pending pairing.',
  response: PairingOutcomeSchema,
  answer:
    'Cancelled, or already settled — **a second call returns the original outcome, never an error**.',
  errors: [PairingErrorCode.EXECUTION_ENGAGED],
});

export const engagePairing: EngagePairingRoute = viewerPairings.action('engagement', {
  operationId: 'engagePairing',
  summary: 'Marks the pairing as engaged — on entering the payment journey.',
  body: EngagePairingBodySchema,
  optionalBody: true,
  response: PairingOutcomeSchema,
  answer: 'Pairing engaged, therefore no longer cancellable.',
  errors: [
    ApiErrorCode.CURSOR_TOO_OLD,
    PairingErrorCode.IDENTITY_MISMATCH,
    PairingErrorCode.INTENT_NOT_ENGAGEABLE,
  ],
});

export const decidePairing: DecidePairingRoute = viewerPairings.action('decision', {
  operationId: 'decidePairing',
  summary: 'Approves or denies a pairing, from the phone.',
  body: DecidePairingBodySchema,
  response: PairingOutcomeSchema,
  answer: 'Decision recorded.',
  errors: [ApiErrorCode.CURSOR_TOO_OLD, PairingErrorCode.IDENTITY_MISMATCH],
});
