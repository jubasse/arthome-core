import { z } from 'zod';

import { Service } from '@arthome/core';

import {
  StorefrontTag,
  SurfaceParameter,
  TraceparentParameter,
  UnauthorizedResponse,
  storefrontV1,
} from './components.js';
import { StorefrontEnvelopeMetaSchema } from '../envelope/index.js';
import type { JsonResponse, Route } from '../http/index.js';
import { AccountDeepLinkSchema } from '../identity/index.js';

const pairingRoutes = storefrontV1
  .tags(StorefrontTag.PAIRING)
  .headers(SurfaceParameter, TraceparentParameter);

export const getAccountDeepLink: Route<{
  method: 'get';
  version: 1;
  path: '/account-deep-link';
  parameters: readonly [typeof SurfaceParameter, typeof TraceparentParameter];
  responses: {
    200: JsonResponse<
      z.ZodIntersection<
        typeof StorefrontEnvelopeMetaSchema,
        z.ZodObject<{ data: typeof AccountDeepLinkSchema }, z.core.$loose>
      >
    >;
    401: typeof UnauthorizedResponse;
  };
}> = pairingRoutes.defineRoute({
  method: 'get',
  path: '/account-deep-link',
  operationId: 'getAccountDeepLink',
  summary: 'The QR that hands off to account management — what is NOT a pairing.',
  description:
    '**Nothing is waiting, the screen does not switch, no pairing row is opened.** Two distinct\nshapes in the contract, separated by **name** and not by an option — otherwise someone will\nimplement a wait where there is none.\n',
  'x-arthome-maturity': 'stable',
  'x-arthome-upstream': [Service.IDENTITY],
  responses: {
    200: {
      description: 'The link.',
      content: {
        'application/json': {
          schema: z.intersection(
            StorefrontEnvelopeMetaSchema,
            z.looseObject({
              data: AccountDeepLinkSchema,
            }),
          ),
          example: {
            servedAt: '2026-09-21T18:54:00.000Z',
            data: {
              url: 'https://arthome.fr/compte',
            },
          },
        },
      },
    },
    401: UnauthorizedResponse,
  },
});
