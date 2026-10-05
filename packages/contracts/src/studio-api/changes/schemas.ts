import { z } from 'zod';

import { uuidIn, vocabularyOutLocal, dateTimeIn } from '@arthome/core/schema';

import { StudioEnvelopeMetaSchema } from '../../envelope/index.js';
import type { QueryParameter } from '../../http/index.js';

const INVALIDATION_TAGS = [
  'date:{id}',
  'date:{id}:publication',
  'date:{id}:tickets',
  'date:{id}:run',
  'date:{id}:crew',
  'channel:{id}:members',
  'channel:{id}:payouts',
  'channel:{id}:moderation',
  'channel:{id}:settings',
  'person:duties',
  'person:inbox',
  'person:rights',
] as const;

export const ChangesSinceParameter: QueryParameter<'since', z.ZodString, true> = {
  name: 'since',
  in: 'query',
  required: true,
  schema: dateTimeIn(),
};

export const ChangesChannelParameter: QueryParameter<'channelId', z.ZodString> = {
  name: 'channelId',
  in: 'query',
  description:
    'Restricted to one channel. Absent, the response covers **all** accessible channels.',
  schema: uuidIn(),
};

export const StudioChangesSchema: z.ZodIntersection<
  typeof StudioEnvelopeMetaSchema,
  z.ZodObject<{ invalidated: z.ZodArray<z.ZodString>; complete: z.ZodBoolean }, z.core.$loose>
> = z.intersection(
  StudioEnvelopeMetaSchema,
  z.looseObject({
    invalidated: z
      .array(
        vocabularyOutLocal(
          INVALIDATION_TAGS,
          'Cache tags, not a domain vocabulary. They name what a surface must revalidate, and the domain has no notion of them: @arthome/core knows a date, not `date:{id}`.',
        ),
      )
      .meta({ description: 'Tags **named by the contract**, never invented by a surface.\n' }),
    complete: z.boolean(),
  }),
);

export type StudioChanges = z.output<typeof StudioChangesSchema>;
