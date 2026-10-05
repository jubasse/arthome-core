import { z } from 'zod';

import type { VocabularyIn } from '@arthome/core/schema';
import { uriIn, vocabularyOutLocal } from '@arthome/core/schema';

import { ArtistSummarySchema, DateCardSchema } from '../../catalog/index.js';
import type { QueryParameter } from '../../http/index.js';
import { localVocabulary } from '../../http/index.js';

const SCREEN_COMPOSITION =
  'A screen composition the server decides so that five surfaces do not each decide it differently.';
const PUBLIC_LINK_KINDS = ['date', 'show', 'artist', 'category'] as const;

export const PublicLinkUrlParameter: QueryParameter<'url', z.ZodString> = {
  name: 'url',
  in: 'query',
  description: 'Full canonical URL. Mutually exclusive with `kind` + `slug`.',
  schema: uriIn(),
};

export const PublicLinkKindParameter: QueryParameter<
  'kind',
  VocabularyIn<typeof PUBLIC_LINK_KINDS>
> = {
  name: 'kind',
  in: 'query',
  schema: localVocabulary(PUBLIC_LINK_KINDS, SCREEN_COMPOSITION),
};

export const PublicLinkSlugParameter: QueryParameter<'slug', z.ZodString> = {
  name: 'slug',
  in: 'query',
  description:
    "A date's slug is unique only within its show, so a date is named `{show-slug}/{date-slug}`.",
  schema: z.string(),
};

export const PublicLinkTargetSchema: z.ZodObject<
  {
    kind: z.ZodString;
    id: z.ZodString;
    canonicalUrl: z.ZodString;
    date: z.ZodOptional<typeof DateCardSchema>;
    artist: z.ZodOptional<typeof ArtistSummarySchema>;
  },
  z.core.$loose
> = z.looseObject({
  kind: vocabularyOutLocal(PUBLIC_LINK_KINDS, SCREEN_COMPOSITION),
  id: z.string(),
  canonicalUrl: z.string().meta({
    format: 'uri',
    description:
      "**The target's canonical URL**, which may differ from the one requested: a short form\n(`/s/`, `/a/`), or a slug replaced less than `SLUG_REDIRECT_DAYS` ago (D-075), resolves to\nthe current form. That is what lets the surface correct its URL rather than keep a stale\none bookmarked.\n",
  }),
  date: DateCardSchema.optional(),
  artist: ArtistSummarySchema.optional(),
});

export type PublicLinkTarget = z.output<typeof PublicLinkTargetSchema>;
