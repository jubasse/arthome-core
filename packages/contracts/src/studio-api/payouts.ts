import { z } from 'zod';

import {
  DatePane,
  DisplayState,
  FailureNature,
  NavigationEntry,
  PAYOUT_STATES,
  PayoutErrorCode,
  Service,
  Surface,
  TaxJurisdictionLevel,
  TaxSupplyKind,
} from '@arthome/core';
import type { VocabularyIn } from '@arthome/core/schema';
import {
  InstantOut,
  MoneyOut,
  uuidOut,
  VOCABULARY_SOURCE_LOCAL,
  vocabularyIn,
} from '@arthome/core/schema';

import {
  ChannelIdParameter,
  ConflictResponse,
  ForbiddenResponse,
  IdempotencyKeyParameter,
  IfRightsVersionParameter,
  PageParameter,
  PageSizeParameter,
  SortByParameter,
  SortDirParameter,
  StudioTag,
  SurfaceParameter,
  TraceparentParameter,
  studioV1,
} from './components.js';
import { StudioEnvelopeMetaSchema, StudioErrorEnvelopeSchema } from '../envelope/index.js';
import type {
  JsonRequestBody,
  JsonResponse,
  PathParameter,
  QueryParameter,
  Route,
} from '../http/index.js';
import { OffsetPageInfoSchema } from '../pagination/index.js';
import {
  BankChangeRequestSchema,
  ExportJobSchema,
  PayoutLineSchema,
} from '../studio-money/index.js';

const payoutsRoutes = studioV1
  .tags(StudioTag.PAYOUTS)
  .headers(SurfaceParameter, IfRightsVersionParameter, TraceparentParameter);
const payoutsWrites = payoutsRoutes.headers(IdempotencyKeyParameter);

const REQUEST_CHANNEL_EXPORT_KIND = [
  'sales_csv',
  'fec',
  'sage',
  'cegid',
  'grouped_invoices',
  'journal',
  'schedule_ics',
  'stats_csv',
] as const;

export const listPayouts: Route<{
  method: 'get';
  version: 1;
  path: '/channels/{channelId}/payouts';
  parameters: readonly [
    typeof ChannelIdParameter,
    typeof PageParameter,
    typeof PageSizeParameter,
    typeof SortByParameter,
    typeof SortDirParameter,
    QueryParameter<'state', VocabularyIn<typeof PAYOUT_STATES>>,
    typeof SurfaceParameter,
    typeof IfRightsVersionParameter,
    typeof TraceparentParameter,
  ];
  responses: {
    200: JsonResponse<
      z.ZodIntersection<
        typeof StudioEnvelopeMetaSchema,
        z.ZodObject<
          {
            items: z.ZodArray<typeof PayoutLineSchema>;
            balances: z.ZodArray<typeof MoneyOut>;
            pendingBankChange: z.ZodOptional<typeof BankChangeRequestSchema>;
            page: typeof OffsetPageInfoSchema;
          },
          z.core.$loose
        >
      >
    >;
    403: typeof ForbiddenResponse;
  };
}> = payoutsRoutes.defineRoute({
  method: 'get',
  path: '/channels/{channelId}/payouts',
  operationId: 'listPayouts',
  summary: 'The payouts owed, one line per date sold.',
  description:
    '**One balance per currency, never a converted balance.** A channel selling in two currencies\nhas **two balances**: converting would introduce a rate, hence an exchange date, hence a\nreconciliation gap nobody could explain. Stripe keeps one balance per currency; we mirror it,\nwe do not aggregate it.\n\n**Reserved to roles with `canRevenue`** — the whole page, not only its columns.\n',
  'x-arthome-maturity': 'provisional',
  'x-arthome-upstream': [NavigationEntry.PAYOUTS],
  parameters: [
    ChannelIdParameter,
    PageParameter,
    PageSizeParameter,
    SortByParameter,
    SortDirParameter,
    {
      name: 'state',
      in: 'query',
      schema: vocabularyIn(PAYOUT_STATES).meta({
        'x-arthome-vocabulary-source': 'PAYOUT_STATES',
      }),
    },
  ],
  responses: {
    200: {
      description: 'A page of payout lines, and the balances **per currency**.',
      content: {
        'application/json': {
          schema: z.intersection(
            StudioEnvelopeMetaSchema,
            z.looseObject({
              items: z.array(PayoutLineSchema),
              balances: z
                .array(
                  MoneyOut.meta({
                    'x-arthome-tax-basis': 'inclusive',
                  }),
                )
                .meta({
                  description: '**One balance per currency.** Never aggregated.',
                }),
              pendingBankChange: BankChangeRequestSchema.optional(),
              page: OffsetPageInfoSchema,
            }),
          ),
          example: {
            servedAt: '2026-09-21T18:25:00.000Z',
            rightsVersion: 412,
            items: [
              {
                payoutId: '019928e5-0000-7000-8000-000000000001',
                dateId: '019928a0-7d31-7a10-b8c4-2f9e11a4c001',
                channelId: '019928a0-7d31-7a10-b8c4-2f9e11a4c222',
                state: DisplayState.SCHEDULED,
                grossTtc: {
                  amountMinor: 417600,
                  currencyCode: 'EUR',
                },
                vat: [
                  {
                    rateBps: 550,
                    base: {
                      amountMinor: 395830,
                      currencyCode: 'EUR',
                    },
                    amount: {
                      amountMinor: 21770,
                      currencyCode: 'EUR',
                    },
                    jurisdictionCode: 'FR',
                    jurisdictionLevel: TaxJurisdictionLevel.COUNTRY,
                    supplyKind: TaxSupplyKind.LIVE_STREAM_ACCESS,
                  },
                ],
                grossHt: {
                  amountMinor: 395830,
                  currencyCode: 'EUR',
                },
                commissionRateBps: 1200,
                commission: {
                  amountMinor: 47500,
                  currencyCode: 'EUR',
                },
                net: {
                  amountMinor: 348330,
                  currencyCode: 'EUR',
                },
                dueAt: '2026-10-05T21:30:00Z',
              },
            ],
            balances: [
              {
                amountMinor: 348330,
                currencyCode: 'EUR',
              },
            ],
            page: {
              page: 1,
              pageSize: 20,
              totalItems: 42,
              totalPages: 3,
            },
          },
        },
      },
    },
    403: ForbiddenResponse,
  },
});

export const requestBankChange: Route<{
  method: 'post';
  version: 1;
  path: '/channels/{channelId}/bank-change-requests';
  parameters: readonly [
    typeof ChannelIdParameter,
    typeof SurfaceParameter,
    typeof IfRightsVersionParameter,
    typeof TraceparentParameter,
    typeof IdempotencyKeyParameter,
  ];
  requestBody: JsonRequestBody<
    z.ZodObject<{ stripeSetupRef: z.ZodString; reauthToken: z.ZodString }, z.core.$strip>
  >;
  responses: {
    202: JsonResponse<
      z.ZodIntersection<
        typeof StudioEnvelopeMetaSchema,
        z.ZodObject<{ data: typeof BankChangeRequestSchema }, z.core.$loose>
      >
    >;
    403: typeof ForbiddenResponse;
    409: typeof ConflictResponse;
  };
}> = payoutsWrites.defineRoute({
  method: 'post',
  path: '/channels/{channelId}/bank-change-requests',
  operationId: 'requestBankChange',
  summary: 'Requests a change of bank details — dual signature.',
  description:
    '**An aggregate in its own right, not a write.** Two actors, two distinct roles (owner **and**\ntreasury), a delay, a trace — **and it suspends the payout in flight** for the duration of the\nsigning. A write cannot carry that.\n\nOnly the **last four characters** of the account travel: a full IBAN has no business in an\nevent log that gets replayed.\n\n**The return from an external browser confirms nothing**: the pending state lives\n**server-side**, and on the way back, "the deep link says where to go, the backend says what\nchanged".\n',
  'x-arthome-maturity': 'provisional',
  'x-arthome-upstream': [NavigationEntry.PAYOUTS],
  parameters: [ChannelIdParameter],
  requestBody: {
    required: true,
    content: {
      'application/json': {
        schema: z.object({
          stripeSetupRef: z.string().meta({
            description:
              '**Opaque** reference to the hosted flow. No provider identifier crosses the domain.,',
          }),
          reauthToken: z.string(),
        }),
        example: {
          stripeSetupRef: 'seti_1Ab2Cd',
          reauthToken: 'ott_9f2ac1',
        },
      },
    },
  },
  responses: {
    202: {
      description: 'Request created, transfers suspended until counter-signature.',
      content: {
        'application/json': {
          schema: z.intersection(
            StudioEnvelopeMetaSchema,
            z.looseObject({
              data: BankChangeRequestSchema,
            }),
          ),
          example: {
            servedAt: '2026-09-21T18:26:00.000Z',
            rightsVersion: 412,
            data: {
              requestId: '019928e6-0000-7000-8000-000000000001',
              state: 'pending_countersignature',
              maskedAccountTail: '4417',
              requestedBy: {
                personId: '019928b0-0000-7000-8000-000000000001',
                displayName: 'Claire D.',
                surface: Surface.STUDIO_WEB,
              },
              requestedAt: '2026-09-21T18:26:00Z',
              expiresAt: '2026-09-28T18:26:00Z',
              suspendsPayoutIds: ['019928e5-0000-7000-8000-000000000001'],
            },
          },
        },
      },
    },
    403: ForbiddenResponse,
    409: ConflictResponse,
  },
});

export const closeReconciliationPeriod: Route<{
  method: 'post';
  version: 1;
  path: '/channels/{channelId}/reconciliation-periods/{periodId}/close';
  parameters: readonly [
    typeof ChannelIdParameter,
    PathParameter<'periodId', z.ZodString>,
    typeof SurfaceParameter,
    typeof IfRightsVersionParameter,
    typeof TraceparentParameter,
    typeof IdempotencyKeyParameter,
  ];
  requestBody: JsonRequestBody<
    z.ZodObject<
      {
        explanations: z.ZodOptional<
          z.ZodArray<
            z.ZodObject<
              { payoutId: z.ZodOptional<z.ZodString>; note: z.ZodOptional<z.ZodString> },
              z.core.$strip
            >
          >
        >;
      },
      z.core.$strip
    >,
    false
  >;
  responses: {
    200: JsonResponse<
      z.ZodIntersection<
        typeof StudioEnvelopeMetaSchema,
        z.ZodObject<
          {
            data: z.ZodOptional<
              z.ZodObject<
                { periodId: z.ZodOptional<z.ZodString>; closedAt: z.ZodOptional<z.ZodString> },
                z.core.$loose
              >
            >;
          },
          z.core.$loose
        >
      >
    >;
    409: JsonResponse<typeof StudioErrorEnvelopeSchema>;
  };
}> = payoutsWrites.defineRoute({
  method: 'post',
  path: '/channels/{channelId}/reconciliation-periods/{periodId}/close',
  operationId: 'closeReconciliationPeriod',
  summary: 'Closes a reconciliation period.',
  description:
    "**A period does not close with an unexplained discrepancy.** The refusal carries the gap and\nthe lines concerned. We never rebuild the provider's ledger: we **reconcile** ours against it,\nand any discrepancy routes an alert to `treasury`.\n",
  'x-arthome-maturity': 'provisional',
  'x-arthome-upstream': [NavigationEntry.PAYOUTS],
  parameters: [
    ChannelIdParameter,
    {
      name: 'periodId',
      in: 'path',
      required: true,
      schema: z.string(),
    },
  ],
  requestBody: {
    required: false,
    content: {
      'application/json': {
        schema: z.object({
          explanations: z
            .array(
              z.object({
                payoutId: uuidOut().optional(),
                note: z.string().optional(),
              }),
            )
            .optional(),
        }),
        example: {
          explanations: [],
        },
      },
    },
  },
  responses: {
    200: {
      description: 'Period closed.',
      content: {
        'application/json': {
          schema: z.intersection(
            StudioEnvelopeMetaSchema,
            z.looseObject({
              data: z
                .looseObject({
                  periodId: z.string().optional(),
                  closedAt: InstantOut.optional(),
                })
                .optional(),
            }),
          ),
          example: {
            servedAt: '2026-10-01T09:00:00.000Z',
            rightsVersion: 412,
            data: {
              periodId: '2026-09',
              closedAt: '2026-10-01T09:00:00Z',
            },
          },
        },
      },
    },
    409: {
      description: '`payout.reconciliation_discrepancy_unexplained`, with the gap and the lines.',
      content: {
        'application/json': {
          schema: StudioErrorEnvelopeSchema,
          example: {
            error: {
              code: PayoutErrorCode.RECONCILIATION_DISCREPANCY_UNEXPLAINED,
              nature: FailureNature.REFUSED,
              params: {
                discrepancyMinor: -1240,
                currencyCode: 'EUR',
                payoutIds: ['019928e5-0000-7000-8000-000000000001'],
              },
              traceId: '4bf92f3577b34da6a3ce929d0e0e4736',
            },
            servedAt: '2026-10-01T09:00:00.000Z',
          },
        },
      },
    },
  },
});

export const requestChannelExport: Route<{
  method: 'post';
  version: 1;
  path: '/channels/{channelId}/exports';
  parameters: readonly [
    typeof ChannelIdParameter,
    typeof SurfaceParameter,
    typeof IfRightsVersionParameter,
    typeof TraceparentParameter,
    typeof IdempotencyKeyParameter,
  ];
  requestBody: JsonRequestBody<
    z.ZodObject<
      {
        kind: VocabularyIn<typeof REQUEST_CHANNEL_EXPORT_KIND>;
        from: z.ZodString;
        to: z.ZodString;
      },
      z.core.$strip
    >
  >;
  responses: {
    202: JsonResponse<
      z.ZodIntersection<
        typeof StudioEnvelopeMetaSchema,
        z.ZodObject<{ data: typeof ExportJobSchema }, z.core.$loose>
      >
    >;
    403: typeof ForbiddenResponse;
  };
}> = payoutsWrites.defineRoute({
  method: 'post',
  path: '/channels/{channelId}/exports',
  operationId: 'requestChannelExport',
  summary: 'Requests an export — sales journal, FEC, Sage, Cegid, grouped invoices.',
  description:
    '**An asynchronous job** (BullMQ **internal to its service**), never a synchronous download:\nover 24 months that is not tenable. The URL returned is **signed, short-lived, and usable\nwithout a session cookie** — an export protected by a cookie is undownloadable from the native\nshell.\n',
  'x-arthome-maturity': 'provisional',
  'x-arthome-upstream': [NavigationEntry.PAYOUTS, Service.CATALOG, DatePane.CHAT],
  parameters: [ChannelIdParameter],
  requestBody: {
    required: true,
    content: {
      'application/json': {
        schema: z.object({
          kind: vocabularyIn(REQUEST_CHANNEL_EXPORT_KIND).meta({
            'x-arthome-vocabulary-source': VOCABULARY_SOURCE_LOCAL,
            'x-arthome-vocabulary-reason':
              "A document or export format. It names an accounting tool or a file type, which is the outside world's vocabulary rather than ours.",
          }),
          from: z.string().meta({
            format: 'date',
          }),
          to: z.string().meta({
            format: 'date',
          }),
        }),
        example: {
          kind: 'fec',
          from: '2026-09-01',
          to: '2026-09-30',
        },
      },
    },
  },
  responses: {
    202: {
      description: 'Export mis en file.',
      content: {
        'application/json': {
          schema: z.intersection(
            StudioEnvelopeMetaSchema,
            z.looseObject({
              data: ExportJobSchema,
            }),
          ),
          example: {
            servedAt: '2026-09-21T18:39:00.000Z',
            rightsVersion: 412,
            data: {
              exportId: '019928e8-0000-7000-8000-000000000001',
              kind: 'fec',
              state: 'queued',
              requestedAt: '2026-09-21T18:39:00Z',
            },
          },
        },
      },
    },
    403: ForbiddenResponse,
  },
});
