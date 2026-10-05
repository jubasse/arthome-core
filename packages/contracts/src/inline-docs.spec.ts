import { describe, expect, it } from 'vitest';

import type { Api, Route } from './http/index.js';
import { storefrontApi } from './storefront-api/index.js';
import { studioApi } from './studio-api/index.js';

/**
 * The routes that still carry what only the document reads: an operation description, a doc-only
 * `x-arthome-*` key, or an example written in the route instead of registered. A converted module
 * carries none of it (its `docs.ts` and `examples.ts` do), so a route outside these lists must stay
 * clean, and a route in them that is now clean must leave them: the lists only shrink, and the
 * fan-out ends with both empty.
 */
const STOREFRONT_STILL_INLINE: readonly string[] = [
  'addCartLine',
  'cancelPairing',
  'cancelSeat',
  'cancelSubscription',
  'changePassword',
  'checkoutCart',
  'confirmEmailVerification',
  'contactSupport',
  'createPairing',
  'decidePairing',
  'disableTwoFactor',
  'enableTwoFactor',
  'engagePairing',
  'enterSalesQueue',
  'exchangeOneTimeToken',
  'extendRail',
  'getAccountDeepLink',
  'getArtistDetail',
  'getCart',
  'getCategoryScreen',
  'getDateDetail',
  'getHomeScreen',
  'getLiveScreen',
  'getOrder',
  'getSalesQueuePosition',
  'getViewerContext',
  'joinWaitlist',
  'leaveWaitlist',
  'listArtists',
  'listCategories',
  'listChanges',
  'listChatMessages',
  'listPlans',
  'listReplays',
  'openPlayback',
  'pollPairing',
  'purchaseSeat',
  'quoteCart',
  'quoteSeat',
  'refreshDateAvailability',
  'registerDevice',
  'releasePlayback',
  'removeCartLine',
  'renewPlaybackTicket',
  'reportChatMessage',
  'requestPasswordReset',
  'resendEmailVerification',
  'resetPassword',
  'resolvePublicLink',
  'search',
  'sendChatMessage',
  'sendReaction',
  'setSubscriptionPlan',
  'signIn',
  'signOut',
  'signUp',
  'startSocialSignIn',
  'updateCartLine',
  'verifyTwoFactor',
];

const STUDIO_STILL_INLINE: readonly string[] = [
  'addBannedWord',
  'changeMemberRoles',
  'claimModerationItem',
  'closeReconciliationPeriod',
  'createDateDraft',
  'createReauthToken',
  'deleteChannel',
  'escalateIncidentToProduction',
  'getChannelAgenda',
  'getChannelDashboard',
  'getChannelSettings',
  'getChannelStats',
  'getChannelStreamSettings',
  'getChannelTicketing',
  'getStudioBootstrap',
  'inviteMember',
  'listChannelEvents',
  'listChannelJournal',
  'listChannelMembers',
  'listChannelMerchItems',
  'listChannelReplays',
  'listDuties',
  'listInbox',
  'listModerationQueue',
  'listPayouts',
  'listReauthFactors',
  'listStudioChanges',
  'listStudioDevices',
  'markInboxRead',
  'refundSeat',
  'registerStudioPushToken',
  'releaseModerationItem',
  'removeBannedWord',
  'removeMember',
  'requestBankChange',
  'requestChannelExport',
  'requestPasswordResetStudio',
  'resolveIncident',
  'revokeStudioDevice',
  'sanctionAudienceMember',
  'searchAudience',
  'settleModerationItem',
  'signInStudio',
  'signOutStudio',
  'transferChannelOwnership',
  'updateChannelIdentity',
  'updateChannelSettings',
  'updateStudioPreferences',
  'upsertMerchItem',
  'verifyTwoFactorStudio',
];

const DOC_ONLY_KEYS = [
  'x-arthome-maturity',
  'x-arthome-upstream',
  'x-arthome-freshness',
  'x-arthome-idempotency-exemption',
] as const;

/** An example written in place: an example by reference, or derived from a registered one, is not. */
function writesAnExample(route: Route, shared: ReadonlySet<unknown>): boolean {
  const media = [
    ...Object.values(route.requestBody?.content ?? {}),
    ...Object.values(route.responses)
      .filter((response) => !shared.has(response))
      .flatMap((response) => Object.values(response.content ?? {})),
  ];
  return media.some(
    (entry) =>
      entry.example !== undefined ||
      Object.values(entry.examples ?? {}).some(
        (example) => typeof example !== 'object' || example === null || !('$ref' in example),
      ),
  );
}

describe.each([
  ['storefront', storefrontApi, STOREFRONT_STILL_INLINE],
  ['studio', studioApi, STUDIO_STILL_INLINE],
] as const)(
  'docs and examples out of the routes, %s',
  (_name, api: Api, pending: readonly string[]) => {
    const shared = new Set<unknown>(Object.values(api.components.responses ?? {}));
    const carrying = Object.values(api.routes)
      .filter(
        (route) =>
          route.description !== undefined ||
          DOC_ONLY_KEYS.some((key) => key in route) ||
          writesAnExample(route, shared),
      )
      .map((route) => route.operationId);

    it('has no route carry its docs or examples itself, but those still to be converted', () => {
      expect(carrying.filter((id) => !pending.includes(id))).toEqual([]);
    });

    it('keeps no converted route in the list of those still to be converted', () => {
      expect(pending.filter((id) => !carrying.includes(id))).toEqual([]);
    });
  },
);
