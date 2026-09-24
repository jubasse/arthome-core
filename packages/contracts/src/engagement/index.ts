/**
 * `@arthome/contracts/engagement` — What reaches a viewer between visits: notification preferences.
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
 *     `uuid()` and `instant()` become those core schemas, one edit per file.
 */

import { z } from 'zod';

import { NOTIFICATION_CHANNELS } from '@arthome/core';
import { type VocabularyOut, int64, vocabularyOut } from '@arthome/core/schema';

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
