import { describe, expect, it } from 'vitest';

import type { Api } from './http/index.js';
import { strippingBodiesOf } from './http/index.js';
import { storefrontApi } from './storefront-api/index.js';
import { studioApi } from './studio-api/index.js';

/**
 * The routes not yet declared through an identity (`.identity(...)` or `.public()`): deny by default
 * holds only when this list is empty. A route outside it must declare its access, and a route in it
 * that now does must leave it, so the list only shrinks. The fan-out of the model ends with both
 * lists empty.
 */
const STOREFRONT_NOT_YET_OPTED_IN: readonly string[] = [
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

const STUDIO_NOT_YET_OPTED_IN: readonly string[] = [
  'addBannedWord',
  'changeMemberRoles',
  'closeReconciliationPeriod',
  'createReauthToken',
  'deleteChannel',
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
  'registerStudioPushToken',
  'removeBannedWord',
  'removeMember',
  'requestBankChange',
  'requestChannelExport',
  'revokeStudioDevice',
  'sanctionAudienceMember',
  'searchAudience',
  'signOutStudio',
  'transferChannelOwnership',
  'updateChannelIdentity',
  'updateChannelSettings',
  'updateStudioPreferences',
  'upsertMerchItem',
];

describe.each([
  ['storefront', storefrontApi, STOREFRONT_NOT_YET_OPTED_IN],
  ['studio', studioApi, STUDIO_NOT_YET_OPTED_IN],
] as const)('deny by default, %s', (_name, api: Api, pending: readonly string[]) => {
  const lacking = Object.values(api.routes)
    .filter((route) => route.access === undefined)
    .map((route) => route.operationId);

  it('has every route declare its access, but those still to be converted', () => {
    expect(lacking.filter((id) => !pending.includes(id))).toEqual([]);
  });

  it('keeps no converted route in the list of those still to be converted', () => {
    expect(pending.filter((id) => !lacking.includes(id))).toEqual([]);
  });
});

describe.each([
  ['storefront', storefrontApi],
  ['studio', studioApi],
] as const)('the stripping schemas, %s', (_name, api: Api) => {
  it('exist for every success response of every route', () => {
    for (const route of Object.values(api.routes)) {
      const bodies = strippingBodiesOf(route);
      const declared = Object.entries(route.responses).filter(
        ([status, response]) =>
          status.startsWith('2') && response.content?.['application/json'] !== undefined,
      );
      expect(Object.keys(bodies).sort()).toEqual(declared.map(([status]) => status).sort());
    }
  });
});
