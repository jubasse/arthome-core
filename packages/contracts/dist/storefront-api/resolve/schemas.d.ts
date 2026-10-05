import { z } from 'zod';
import type { VocabularyIn } from '@arthome/core/schema';
import { ArtistSummarySchema, DateCardSchema } from '../../catalog/index.js';
import type { QueryParameter } from '../../http/index.js';
declare const PUBLIC_LINK_KINDS: readonly ["date", "show", "artist", "category"];
export declare const PublicLinkUrlParameter: QueryParameter<'url', z.ZodString>;
export declare const PublicLinkKindParameter: QueryParameter<'kind', VocabularyIn<typeof PUBLIC_LINK_KINDS>>;
export declare const PublicLinkSlugParameter: QueryParameter<'slug', z.ZodString>;
export declare const PublicLinkTargetSchema: z.ZodObject<{
    kind: z.ZodString;
    id: z.ZodString;
    canonicalUrl: z.ZodString;
    date: z.ZodOptional<typeof DateCardSchema>;
    artist: z.ZodOptional<typeof ArtistSummarySchema>;
}, z.core.$loose>;
export type PublicLinkTarget = z.output<typeof PublicLinkTargetSchema>;
export {};
//# sourceMappingURL=schemas.d.ts.map