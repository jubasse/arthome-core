import type { z } from 'zod';

import type { VocabularyIn } from '@arthome/core/schema';
import { dateTimeIn } from '@arthome/core/schema';

import { localVocabulary } from '../../http/index.js';
import type { QueryParameter } from '../../http/index.js';

const CHANGES_SCOPES = ['profile', 'device'] as const;

export const ChangesSinceParameter: QueryParameter<'since', z.ZodString, true> = {
  name: 'since',
  in: 'query',
  required: true,
  description: "The `servedAt` of the client's last known response.",
  schema: dateTimeIn(),
};

export const ChangesScopeParameter: QueryParameter<
  'scope',
  z.ZodDefault<VocabularyIn<typeof CHANGES_SCOPES>>
> = {
  name: 'scope',
  in: 'query',
  description:
    'Which invalidations to return. `profile` covers what follows the account — tickets,\norders, subscription, cart — and is what a surface wants on returning to the\nforeground. `device` restricts the answer to what follows **this device**, and exists\nfor the television, where five profiles share one device and a switch of profile must\nnot force the other four to reload.\n\nA **closed** vocabulary, and legitimately so: this is an input, and the server must\nrefuse a scope it does not know rather than silently widen the answer.\n',
  schema: localVocabulary(
    CHANGES_SCOPES,
    'An account-management shape, local to this endpoint: what the person asked for, not a fact the domain reasons about.',
  ).default('profile'),
};
