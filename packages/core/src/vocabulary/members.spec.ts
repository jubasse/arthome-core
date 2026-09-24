import { describe, expect, it } from 'vitest';

import * as catalog from './catalog.js';
import * as commerce from './commerce.js';
import * as moderation from './moderation.js';
import * as people from './people.js';
import {
  WATCH_DENIAL_REASONS,
  WATCH_FALLBACK_ACTIONS,
  WATCH_SCOPES,
  WatchDenialReason,
  WatchFallbackAction,
  WatchScope,
} from '../entitlement/index.js';
import { LOCALES, Locale } from '../format/locale.js';
import { MESSAGE_DOMAINS, MessageDomain } from '../i18n/index.js';
import { FAILURE_NATURES, FailureNature } from '../kernel/errors.js';
import { MODERATION_BADGES, ModerationBadge } from '../moderation/index.js';

/**
 * INVARIANT UNDER TEST
 *   Every named member of a vocabulary is a value of that vocabulary.
 *
 * WHY THIS TEST EXISTS
 *   The named-member objects used to carry `as const satisfies Record<string, T>`,
 *   which made the compiler prove exactly this. TypeScript 6.0.3 rejects that
 *   form under `isolatedDeclarations` (TS9010): the declaration emitter cannot
 *   write the type without inferring through the `satisfies` expression.
 *
 *   Dropping `satisfies` fixes the build and loses the proof. A typo —
 *   `CANCELLED: 'canceled'` — would then compile and ship a wrong wire value in
 *   silence. That is the same class of defect as E1, where `helpers.planOf()`
 *   silently dropped every account to `free`.
 *
 *   So the proof moves from the compiler to here. One test, forty-two
 *   vocabularies, and it fails loudly on a single mistyped letter.
 */

interface VocabularyPair {
  readonly name: string;
  readonly values: readonly string[];
  readonly members: Readonly<Record<string, string>>;
}

const PAIRS: readonly VocabularyPair[] = [
  { name: 'FailureNature', values: FAILURE_NATURES, members: FailureNature },
  { name: 'Locale', values: LOCALES, members: Locale },
  { name: 'MessageDomain', values: MESSAGE_DOMAINS, members: MessageDomain },
  { name: 'ModerationBadge', values: MODERATION_BADGES, members: ModerationBadge },
  { name: 'WatchDenialReason', values: WATCH_DENIAL_REASONS, members: WatchDenialReason },
  { name: 'WatchScope', values: WATCH_SCOPES, members: WatchScope },
  { name: 'WatchFallbackAction', values: WATCH_FALLBACK_ACTIONS, members: WatchFallbackAction },

  {
    name: 'PublicationState',
    values: catalog.PUBLICATION_STATES,
    members: catalog.PublicationState,
  },
  { name: 'RunState', values: catalog.RUN_STATES, members: catalog.RunState },
  { name: 'DateOutcome', values: catalog.DATE_OUTCOMES, members: catalog.DateOutcome },
  { name: 'DisplayState', values: catalog.DISPLAY_STATES, members: catalog.DisplayState },
  { name: 'ReplayPolicy', values: catalog.REPLAY_POLICIES, members: catalog.ReplayPolicy },
  { name: 'RightsScope', values: catalog.RIGHTS_SCOPES, members: catalog.RightsScope },
  { name: 'BlackoutReason', values: catalog.BLACKOUT_REASONS, members: catalog.BlackoutReason },
  {
    name: 'LanguageDependency',
    values: catalog.LANGUAGE_DEPENDENCIES,
    members: catalog.LanguageDependency,
  },
  { name: 'IncidentKind', values: catalog.INCIDENT_KINDS, members: catalog.IncidentKind },
  { name: 'IncidentCause', values: catalog.INCIDENT_CAUSES, members: catalog.IncidentCause },

  { name: 'PriceTier', values: commerce.PRICE_TIERS, members: commerce.PriceTier },
  { name: 'PlanTier', values: commerce.PLAN_TIERS, members: commerce.PlanTier },
  { name: 'PlanOpening', values: commerce.PLAN_OPENINGS, members: commerce.PlanOpening },
  {
    name: 'SubscriptionState',
    values: commerce.SUBSCRIPTION_STATES,
    members: commerce.SubscriptionState,
  },
  {
    name: 'PromotionReason',
    values: commerce.PROMOTION_REASONS,
    members: commerce.PromotionReason,
  },
  { name: 'OrderKind', values: commerce.ORDER_KINDS, members: commerce.OrderKind },
  { name: 'PayoutState', values: commerce.PAYOUT_STATES, members: commerce.PayoutState },
  { name: 'TaxSupplyKind', values: commerce.TAX_SUPPLY_KINDS, members: commerce.TaxSupplyKind },
  {
    name: 'TaxEvidenceKind',
    values: commerce.TAX_EVIDENCE_KINDS,
    members: commerce.TaxEvidenceKind,
  },
  {
    name: 'TaxJurisdictionLevel',
    values: commerce.TAX_JURISDICTION_LEVELS,
    members: commerce.TaxJurisdictionLevel,
  },

  { name: 'MessageState', values: moderation.MESSAGE_STATES, members: moderation.MessageState },
  {
    name: 'ModerationItemState',
    values: moderation.MODERATION_ITEM_STATES,
    members: moderation.ModerationItemState,
  },
  {
    name: 'AudienceSanction',
    values: moderation.AUDIENCE_SANCTIONS,
    members: moderation.AudienceSanction,
  },
  {
    name: 'ModerationVerdict',
    values: moderation.MODERATION_VERDICTS,
    members: moderation.ModerationVerdict,
  },
  {
    name: 'ModerationReason',
    values: moderation.MODERATION_REASONS,
    members: moderation.ModerationReason,
  },
  {
    name: 'StateChangeOrigin',
    values: moderation.STATE_CHANGE_ORIGINS,
    members: moderation.StateChangeOrigin,
  },
  { name: 'ChatMode', values: moderation.CHAT_MODES, members: moderation.ChatMode },
  {
    name: 'FilterSeverity',
    values: moderation.FILTER_SEVERITIES,
    members: moderation.FilterSeverity,
  },

  { name: 'MemberRole', values: people.MEMBER_ROLES, members: people.MemberRole },
  { name: 'CrewRole', values: people.CREW_ROLES, members: people.CrewRole },
  { name: 'NavigationEntry', values: people.NAVIGATION_ENTRIES, members: people.NavigationEntry },
  { name: 'DatePane', values: people.DATE_PANES, members: people.DatePane },
  { name: 'DeviceKind', values: people.DEVICE_KINDS, members: people.DeviceKind },
  { name: 'Surface', values: people.SURFACES, members: people.Surface },
  {
    name: 'NotificationChannel',
    values: people.NOTIFICATION_CHANNELS,
    members: people.NotificationChannel,
  },
];

describe('named members match their vocabulary', () => {
  it.each(PAIRS)('$name: every member is a value of the vocabulary', ({ values, members }) => {
    for (const member of Object.values(members)) {
      expect(values).toContain(member);
    }
  });

  it.each(PAIRS)('$name: every value has a named member', ({ values, members }) => {
    // The other direction matters too. A value with no named member cannot be
    // referenced by a rule without writing a string literal — which the
    // anti-E2 gate then rejects, leaving the value unusable.
    const named = new Set(Object.values(members));
    for (const value of values) {
      expect(named).toContain(value);
    }
  });

  it('covers every vocabulary that has named members', () => {
    // If someone adds a vocabulary and forgets to add it here, this number
    // stops matching and the omission is visible. The two vocabularies without
    // named members are the publication checklist items, which are consumed as
    // a list and never referenced one by one.
    expect(PAIRS).toHaveLength(42);
  });
});
