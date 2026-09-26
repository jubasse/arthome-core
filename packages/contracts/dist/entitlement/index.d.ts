/**
 * `@arthome/contracts/entitlement` — the right to watch, and nothing else.
 *
 * IT EXISTS TO BREAK A CYCLE, AND THE CYCLE WAS SEMANTIC RATHER THAN
 *   ACCIDENTAL. `catalog` needs a watch verdict, because a date's card shows
 *   whether you may watch it. `streaming` needs a date and its chapters, because
 *   a playback ticket is issued for one. Neither reference is wrong, so neither
 *   could simply be deleted — the two modules genuinely point at each other.
 *
 *   `z.lazy()` papered over it and the emitted schema was identical, which is
 *   what made it tempting. But a zod schema is built at MODULE LOAD, so a cycle
 *   is a load-order hazard: it holds until a declaration moves, then fails with
 *   an error naming a symbol unrelated to whatever was just edited. A worker
 *   lost time to exactly that message, reading `Cannot access 'ChapterSchema'
 *   before initialization` while adding something else entirely.
 *
 *   `WatchVerdict` references NOTHING — measured, not assumed — so it can sit
 *   below both. `catalog` imports it, `streaming` imports it, and the edge
 *   between those two is one-way again.
 *
 * *This mirrors `@arthome/core`, where entitlement is already its own bounded
 * context with `decideWatch` in it. The contract had flattened a distinction the
 * domain makes.*
 */
import { z } from 'zod';
import { type VocabularyOut, type VocabularyOutNullable } from '@arthome/core/schema';
export declare const WatchVerdictSchema: z.ZodObject<{
    allowed: z.ZodBoolean;
    scope: z.ZodOptional<VocabularyOut>;
    advisory: z.ZodBoolean;
    denialReasonCode: z.ZodOptional<VocabularyOutNullable>;
    reasonParams: z.ZodOptional<z.ZodObject<Record<string, never>, z.core.$catchall<z.ZodUnknown>>>;
    fallbackAction: z.ZodOptional<VocabularyOut>;
    previewSecondsLeft: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
    validUntil: z.ZodString;
}, z.core.$loose>;
//# sourceMappingURL=index.d.ts.map