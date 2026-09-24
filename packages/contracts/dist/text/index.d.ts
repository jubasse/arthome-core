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
 *   `LocaleIn` is the viewer's preference and governs which catalogue a surface
 *   loads. `contentLanguage` is a property of THIS TEXT — the language its
 *   author typed. A viewer reading in English may be shown a hold-screen message
 *   in French, and the field is what lets the surface say so rather than pretend
 *   otherwise. They share a vocabulary and mean different things, which is the
 *   `reasonCode` shape (D-039) waiting to happen; naming it here is the cheapest
 *   place to stop it.
 *
 * ⚠ AND THE FIRST VERSION OF THIS FILE GOT THE OTHER HALF WRONG — the direction,
 *   not the concept.
 *
 *   It used `LocaleSchema`, which was `vocabularyIn(LOCALES)`: STRICT. On a
 *   RESPONSE. It emitted `enum: ['fr','en']`, so the day a third content language
 *   is authored, a television running a year-old build rejects **the whole
 *   payload this text sits in** rather than showing the text and shrugging at the
 *   language. That is critical rule 10 broken on the member while honoured on the
 *   shape — in a module written two days after the rule, by someone who had just
 *   written a paragraph about `contentLanguage` versus the viewer's locale and
 *   never asked which DIRECTION the field travelled.
 *
 *   The empty-diff gate found it on its first run, by comparing the emitted
 *   `enum` against a document that has none (D-065 §H). Core now exports
 *   `LocaleIn` and `LocaleOut` and no `LocaleSchema` at all, so the choice has to
 *   be made rather than defaulted.
 */
import { z } from 'zod';
/** Authored text as the storefront documents it. */
export declare const StorefrontLocalizedTextSchema: z.ZodObject<{
    contentLanguage: z.ZodString;
    text: z.ZodString;
}, z.core.$loose>;
/** Authored text as the studio documents it — the same shape, the console's own prose (D-065 family G). */
export declare const StudioLocalizedTextSchema: z.ZodObject<{
    contentLanguage: z.ZodString;
    text: z.ZodString;
}, z.core.$loose>;
//# sourceMappingURL=index.d.ts.map