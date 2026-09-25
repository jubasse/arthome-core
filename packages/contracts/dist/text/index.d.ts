/**
 * `LocalizedText` — authored prose on the wire, and the exception that proves
 * the rule it breaks.
 *
 * Everything else is a code: an interface sentence never travels, the surface resolves
 * a key against a catalogue it embedded at build time.
 *
 * ⚠ TWO EXCEPTIONS, NAMED, AND THERE ARE NOT THREE: the hold-screen message a control
 *   room writes during an incident, and the studio inbox texts. Both are written by a
 *   person about a situation nobody anticipated, so the text travels — and it travels
 *   with the language it was written in.
 *
 * ⚠ `contentLanguage` IS NOT THE VIEWER'S LOCALE. `LocaleIn` is the viewer's preference
 *   and picks a catalogue; `contentLanguage` is the language THIS TEXT's author typed,
 *   so a viewer reading in English may be shown a French hold-screen message. The first
 *   version conflated the two and emitted a strict `enum` on a response — D-065 §H, and
 *   the test next door asserted the defect.
 *
 * ⚠ IT IS A BARE `string`, AND `LocaleOut` IS THE WRONG FIX: neither document publishes
 *   a vocabulary here, and the document is authoritative (D-058). Whether it should is
 *   open, and the change belongs in the two documents first, then here, in that order.
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