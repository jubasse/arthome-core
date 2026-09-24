/**
 * `@arthome/contracts/engagement` — What reaches a viewer between visits: notification preferences, the change feed, chat and the reaction quota.
 *
 * EVERY SCHEMA HERE EMITS A NAMED SCHEMA OF `openapi/storefront.yaml` EXACTLY, and
 * `pnpm run check:emit-diff` is what proves it: the document is authoritative
 * (D-058), so where the two differ the schema changes.
 *
 * The rules this file follows, each of which was a defect the gate found (D-060, D-065):
 *
 *   - `z.looseObject()` on everything a server sends — a closed schema makes a
 *     generated client reject a server that added a field.
 *   - `int64()`, never `z.int()` — the latter emits JavaScript's safe range,
 *     which is in no document.
 *   - `vocabularyOut` / `vocabularyOutNullable` for every enumerated value, never
 *     `z.enum()`: a strict enum fails the whole payload when a member is added,
 *     and televisions run year-old builds. A vocabulary local to the contract
 *     is declared here, passed as `'none'` and carries its reason.
 *   - vocabulary members in `examples` are the named constants, never literals.
 *   - identifiers and instants are `format: uuid` / `format: date-time` WITHOUT a
 *     `pattern`, because that is what the document publishes for these fields;
 *     core's `*IdSchema` and `InstantSchema` add a `pattern` the document does
 *     not carry here. Once the document gains it (D-065 family D), the local
 *     `uuidOut()` and `InstantOut` become those core schemas, one edit per file.
 */

import { z } from 'zod';

import { MODERATION_BADGES, NOTIFICATION_CHANNELS } from '@arthome/core';
import {
  InstantOut,
  int64,
  type VocabularyOut,
  uuidOut,
  vocabularyOut,
  vocabularyOutLocal,
} from '@arthome/core/schema';

import { StorefrontLocalizedTextSchema } from '../text/index.js';

const CACHE_TAGS = [
  'date:{id}',
  'date:{id}:availability',
  'artist:{id}',
  'category:{id}',
  'account:tickets',
  'account:orders',
  'account:subscription',
  'account:cart',
  'account:profile',
  'account:devices',
  'account:payment-methods',
  'home:rails',
] as const;

export const NotificationPreferencesSchema: z.ZodObject<
  {
    triggers: z.ZodOptional<
      z.ZodObject<Record<string, never>, z.core.$catchall<z.ZodArray<VocabularyOut>>>
    >;
    quietHours: z.ZodOptional<
      z.ZodObject<
        {
          enabled: z.ZodOptional<z.ZodBoolean>;
          fromHour: z.ZodOptional<z.ZodNumber>;
          toHour: z.ZodOptional<z.ZodNumber>;
          bypassWhenTicketHeld: z.ZodOptional<z.ZodBoolean>;
        },
        z.core.$loose
      >
    >;
  },
  z.core.$loose
> = z
  .looseObject({
    triggers: z
      .object({})
      .catchall(z.array(vocabularyOut(NOTIFICATION_CHANNELS)))
      .optional(),
    quietHours: z
      .looseObject({
        enabled: z.boolean().optional(),
        fromHour: int64().meta({ format: undefined }).min(0).max(23).optional(),
        toHour: int64().meta({ format: undefined }).min(0).max(23).optional(),
        bypassWhenTicketHeld: z.boolean().optional(),
      })
      .optional()
      .describe(
        '11 p.m. → 9 a.m. by default, **with the exception conditioned on holding a seat** — this is a\n**business rule**, not an interface setting: nobody misses a show they paid for because it\nstarts at 11.15 p.m.\n',
      ),
  })
  .describe('Five triggers × three channels, plus quiet hours.');

export const ChangeFeedSchema: z.ZodObject<
  {
    invalidated: z.ZodArray<VocabularyOut>;
    complete: z.ZodBoolean;
  },
  z.core.$loose
> = z
  .looseObject({
    invalidated: z
      .array(
        vocabularyOutLocal(
          CACHE_TAGS,
          "Cache tags, not a domain vocabulary. They name what a surface must revalidate, in\nNext's `revalidateTag` namespace convention, and the domain has no notion of them:\n`@arthome/core` knows a date, not `date:{id}`.\n",
        ),
      )
      .meta({ examples: [['date:019928a0-7d31-7a10-b8c4-2f9e11a4c001', 'account:tickets']] })
      .describe(
        'Tags **named by the contract**, never invented by a surface — otherwise mobile and television\nwould invent others and Next\'s server rendering would call `revalidateTag` on keys nobody\nemits.\n\n**This list is the union of two families, and they are not symmetric with\n`x-arthome-invalidates`.** That extension names, on a write, the reads that write makes\nfalse — it therefore covers only what the caller **caused**. The three catalogue tags\nappear in no `x-arthome-invalidates` and that is not a gap: nothing on the storefront\nwrites the catalogue. `date:{id}`, `artist:{id}` and `category:{id}` reach this feed\nbecause the **studio** published, which is the case the description above calls "what the\nstorefront did not cause". Counting the two lists against each other therefore proves\nnothing; a tag missing from **this** list is the defect, because it is the list\n`revalidateTag` reads.\n\nThe `{…}` placeholder is the identifier of the resource. In `x-arthome-invalidates` the\nsame tag is written with the operation\'s own path parameter (`date:{dateId}:availability`)\nbecause that is what supplies the value; it is the same tag.\n',
      ),
    complete: z
      .boolean()
      .describe(
        '`false` means "too many changes, reload everything" — the same honesty as `resume:too_old`\non the real-time channel. A client that does not know what it missed is worse than a client\nthat reloads.\n',
      ),
  })
  .describe(
    '**A list of invalidations, not the data.** On returning to the foreground, a surface\nrevalidates half a dozen reads at once; refusing that burst means refusing to open the\napplication. One request instead of twelve.\n',
  );

export const ChatMessageSchema: z.ZodObject<
  {
    id: z.ZodString;
    dateId: z.ZodString;
    seq: z.ZodNumber;
    authorHandle: z.ZodString;
    authorRoleCode: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    atMediaSec: z.ZodNumber;
    sentAt: z.ZodString;
    badge: VocabularyOut;
    body: typeof StorefrontLocalizedTextSchema;
  },
  z.core.$loose
> = z.looseObject({
  id: uuidOut(),
  dateId: uuidOut(),
  seq: int64().describe('Monotonic per date. **The resume point** of the real-time stream.'),
  authorHandle: z.string().meta({ examples: ['@marie.j'] }),
  authorRoleCode: z
    .string()
    .nullable()
    .optional()
    .describe('Present for a team message — those always clear the rate ceiling.'),
  atMediaSec: int64()
    .meta({ format: undefined })
    .describe(
      '**The position in the media**, not the time it was sent. Without it, chat replayed over a\nrecording is offset by however long the viewer took to start playback.\n',
    ),
  sentAt: InstantOut.describe(
    'The absolute instant, **in addition**. Both are carried, never one alone.',
  ),
  badge: vocabularyOut(MODERATION_BADGES).describe(
    'The single badge, **derived** by `moderationBadgeOf` and **served**, never recomposed.\nPrecedence: banned > silenced > removed > published. Three separate axes on the model side —\nmessage state, nature of the queue line, sanction on the person — never stacked.\n',
  ),
  body: StorefrontLocalizedTextSchema,
});

export const ReactionQuotaSchema: z.ZodObject<
  {
    remaining: z.ZodNumber;
    rechargesAt: z.ZodString;
  },
  z.core.$loose
> = z
  .looseObject({
    remaining: int64().meta({ format: undefined }),
    rechargesAt: InstantOut,
  })
  .describe(
    '**Returned with the response.** The surface must **disable** the control rather than let it\nfail: an inert action is proscribed by the brief, but an action that fails silently is worse.\nOne reaction in flight at a time.\n',
  );

export const NotificationEntrySchema: z.ZodObject<
  {
    id: z.ZodString;
    triggerCode: z.ZodString;
    params: z.ZodObject<Record<string, never>, z.core.$catchall<z.ZodUnknown>>;
    deepLink: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    createdAt: z.ZodString;
    read: z.ZodBoolean;
  },
  z.core.$loose
> = z.looseObject({
  id: uuidOut(),
  triggerCode: z.string().meta({ examples: ['date_starts_soon'] }),
  params: z.object({}).catchall(z.unknown()),
  deepLink: z.string().meta({ format: 'uri' }).nullable().optional(),
  createdAt: InstantOut,
  read: z.boolean(),
});
