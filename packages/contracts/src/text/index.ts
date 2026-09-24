/**
 * `LocalizedText` — authored prose on the wire, and the exception that proves
 * the rule it breaks.
 *
 * EVERYTHING ELSE IS A CODE. `error.code`, `emptyReason`, `denialReasonCode`,
 * `textCode` on a dashboard reminder: an interface sentence never travels, the
 * surface resolves a key against a catalogue it embedded at build time. That is
 * not a preference — it is what lets a French and an English television render
 * the same payload, and what keeps a copy change out of a store review.
 *
 * ⚠ TWO EXCEPTIONS, NAMED, AND THERE ARE NOT THREE.
 *
 *   1. the **hold-screen message** a control room writes during an incident;
 *   2. the **studio inbox texts**.
 *
 *   Both are written by a person, about a situation nobody anticipated, in the
 *   moment. There is no key for "the lead has lost her voice, we resume in
 *   twenty minutes", and inventing one would mean shipping a catalogue entry per
 *   possible incident. So the text travels — **and it travels with the language
 *   it was written in**, because the alternative is a French sentence rendered
 *   under an English heading with nothing saying which it is.
 *
 * ⚠ `contentLanguage` IS NOT THE VIEWER'S LOCALE, AND THE TWO ARE EASY TO
 *   CONFLATE.
 *
 *   `LocaleSchema` is the viewer's preference and governs which catalogue a
 *   surface loads. `contentLanguage` is a property of THIS TEXT — the language
 *   its author typed. A viewer reading in English may be shown a hold-screen
 *   message in French, and the field is what lets the surface say so rather than
 *   pretend otherwise. They share a vocabulary and mean different things, which
 *   is the `reasonCode` shape (D-039) waiting to happen; naming it here is the
 *   cheapest place to stop it.
 */

import { z } from 'zod';

import { LocaleSchema } from '@arthome/core/schema';

export const LocalizedTextSchema: z.ZodObject<
  {
    // `typeof LocaleSchema`, NOT `z.ZodEnum<{ fr: 'fr'; en: 'en' }>`. Writing the
    // members here would be a parallel literal table in a type position — the one
    // place nobody greps — and `arthome-check-enums` catches it, which is how this
    // line came to be written the second way.
    contentLanguage: typeof LocaleSchema;
    text: z.ZodString;
  },
  z.core.$loose
> = z.looseObject({
  contentLanguage: LocaleSchema.describe(
    'The language this text was **written in** — a property of the text, not of the reader. ' +
      'A viewer reading in English may be shown a message written in French, and this is what ' +
      'lets the surface say so.',
  ),
  text: z
    .string()
    .describe('The authored text itself. Never an interface label: those travel as codes.'),
});
