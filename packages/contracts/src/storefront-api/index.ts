import {
  BuyerTaxLocationSchema,
  MoneyOut,
  TaxEvidenceSchema,
  VenueClockSchema,
} from '@arthome/core/schema';

import { getAccountDeepLink } from './account-deep-link/routes.js';
import { getArtistDetail, listArtists } from './artists/routes.js';
import {
  changePassword,
  confirmEmailVerification,
  disableTwoFactor,
  enableTwoFactor,
  exchangeOneTimeToken,
  requestPasswordReset,
  resendEmailVerification,
  resetPassword,
  signIn,
  signOut,
  signUp,
  startSocialSignIn,
  verifyTwoFactor,
} from './auth/routes.js';
import { addCartLine, getCart, quoteCart, removeCartLine, updateCartLine } from './cart/routes.js';
import { getCategoryScreen, listCategories } from './categories/routes.js';
import { listChanges } from './changes/routes.js';
import { reportChatMessage } from './chat/routes.js';
import {
  AdmissionTokenParameter,
  ArtistIdParameter,
  BadRequestResponse,
  CacheControlPublicHeader,
  CategoryIdParameter,
  ConflictResponse,
  CsrfRefusedResponse,
  CursorDirectionParameter,
  CursorParameter,
  DateIdParameter,
  ForbiddenResponse,
  GoneResponse,
  IdempotencyKeyParameter,
  IdempotencyReplayedHeader,
  LateEntryAcknowledgedParameter,
  LimitParameter,
  NotFoundResponse,
  RetryAfterMsHeader,
  ServedAtHeader,
  SurfaceParameter,
  TooManyRequestsResponse,
  TraceparentParameter,
  UnauthorizedResponse,
  UnavailableResponse,
  PayloadTooLargeResponse,
  UnsupportedMediaTypeResponse,
  InternalErrorResponse,
  BadGatewayResponse,
  GatewayTimeoutResponse,
  VaryAuthHeader,
  ViewerTimezoneParameter,
} from './components.js';
import {
  enterSalesQueue,
  getDateDetail,
  getSalesQueuePosition,
  joinWaitlist,
  leaveWaitlist,
  listChatMessages,
  quoteSeat,
  refreshDateAvailability,
  sendChatMessage,
  sendReaction,
} from './dates/routes.js';
import { registerDevice } from './devices/routes.js';
import { getHomeScreen } from './home/routes.js';
import { getLiveScreen } from './live/routes.js';
import {
  addPasskey,
  addPaymentMethod,
  addToWatchlist,
  cancelAccountDeletion,
  clearReminder,
  createSavedSearch,
  deleteSavedSearch,
  followArtist,
  getAccountScreen,
  getExport,
  listFollowedArtists,
  listMyOrders,
  listMyReplays,
  listMyTickets,
  listNotifications,
  listSavedSearches,
  listWatchlist,
  markNotificationsRead,
  recordPlaybackPosition,
  removeFromWatchlist,
  removePasskey,
  removePaymentMethod,
  requestAccountDeletion,
  requestExport,
  revokeDevice,
  setReminder,
  signOutProfile,
  unfollowArtist,
  updateConsents,
  updateNotificationPreferences,
  updatePreferences,
  updateProfile,
  updateSavedSearch,
} from './me/routes.js';
import { checkoutCart, getOrder, purchaseSeat } from './orders/routes.js';
import {
  cancelPairing,
  createPairing,
  decidePairing,
  engagePairing,
  pollPairing,
} from './pairings/routes.js';
import { listPlans } from './plans/routes.js';
import { openPlayback, releasePlayback, renewPlaybackTicket } from './playback/routes.js';
import { extendRail } from './rails/routes.js';
import { listReplays } from './replays/routes.js';
import { resolvePublicLink } from './resolve/routes.js';
import { search } from './search/routes.js';
import { cancelSeat } from './seats/routes.js';
import { cancelSubscription, setSubscriptionPlan } from './subscription/routes.js';
import { contactSupport } from './support/routes.js';
import { getViewerContext } from './viewer-context/routes.js';
import {
  ArtistDetailSchema,
  ArtistSummarySchema,
  CategoryScreenSchema,
  CategoryTileSchema,
  ChapterSchema,
  DateCardSchema,
  DateDetailSchema,
  DomainConstantsSchema,
  FacetSchema,
  HomeScreenSchema,
  ImageRenditionSchema,
  LabelArtifactRefSchema,
  LiveScreenSchema,
  MediaSetSchema,
  MerchItemSchema,
  PriceTierSchema,
  RailSchema,
  SavedSearchSchema,
  ScheduleSlotSchema,
  SearchCriteriaSchema,
  ShowGroupSchema,
  StructuredFilterSchema,
} from '../catalog/index.js';
import {
  ChangeFeedSchema,
  ChatMessageSchema,
  NotificationEntrySchema,
  NotificationPreferencesSchema,
  ReactionQuotaSchema,
} from '../engagement/index.js';
import { WatchVerdictSchema } from '../entitlement/index.js';
import {
  StorefrontEnvelopeMetaSchema,
  StorefrontErrorEnvelopeSchema,
  StorefrontErrorSchema,
} from '../envelope/index.js';
import type { Api } from '../http/index.js';
import { defineApi } from '../http/index.js';
import {
  AccountDeepLinkSchema,
  AccountScreenSchema,
  ConsentsSchema,
  DevicePairingSchema,
  DeviceSchema,
  PairingOutcomeSchema,
  ProfileSummarySchema,
  SessionEstablishedBearerSchema,
  SessionEstablishedCookieSchema,
  StorefrontSessionEstablishedSchema,
  StorefrontSessionModeSchema,
  ViewerContextSchema,
  ViewerPreferencesSchema,
} from '../identity/index.js';
import { StorefrontCursorPageInfoSchema } from '../pagination/index.js';
import {
  ActivePlaybackSessionSchema,
  IncidentSchema,
  PlaybackRenewalSchema,
  PlaybackTicketSchema,
} from '../streaming/index.js';
import { StorefrontLocalizedTextSchema } from '../text/index.js';
import {
  CartLineSchema,
  CartQuoteSchema,
  CartSchema,
  ExportRequestSchema,
  ExternalOrderRefSchema,
  OrderSchema,
  PaymentHandoffSchema,
  PlanSchema,
  SalesQueuePositionSchema,
  SeatQuoteSchema,
  SubscriptionSchema,
  TicketCardSchema,
} from '../ticketing/index.js';

export const storefrontApi: Api<{
  registerDevice: typeof registerDevice;
  getViewerContext: typeof getViewerContext;
  listChanges: typeof listChanges;
  signUp: typeof signUp;
  signIn: typeof signIn;
  signOut: typeof signOut;
  confirmEmailVerification: typeof confirmEmailVerification;
  resendEmailVerification: typeof resendEmailVerification;
  requestPasswordReset: typeof requestPasswordReset;
  resetPassword: typeof resetPassword;
  startSocialSignIn: typeof startSocialSignIn;
  exchangeOneTimeToken: typeof exchangeOneTimeToken;
  changePassword: typeof changePassword;
  enableTwoFactor: typeof enableTwoFactor;
  disableTwoFactor: typeof disableTwoFactor;
  verifyTwoFactor: typeof verifyTwoFactor;
  addPasskey: typeof addPasskey;
  removePasskey: typeof removePasskey;
  addPaymentMethod: typeof addPaymentMethod;
  removePaymentMethod: typeof removePaymentMethod;
  getAccountScreen: typeof getAccountScreen;
  listMyTickets: typeof listMyTickets;
  listMyReplays: typeof listMyReplays;
  listWatchlist: typeof listWatchlist;
  addToWatchlist: typeof addToWatchlist;
  removeFromWatchlist: typeof removeFromWatchlist;
  listFollowedArtists: typeof listFollowedArtists;
  followArtist: typeof followArtist;
  unfollowArtist: typeof unfollowArtist;
  setReminder: typeof setReminder;
  clearReminder: typeof clearReminder;
  listSavedSearches: typeof listSavedSearches;
  createSavedSearch: typeof createSavedSearch;
  updateSavedSearch: typeof updateSavedSearch;
  deleteSavedSearch: typeof deleteSavedSearch;
  listMyOrders: typeof listMyOrders;
  listNotifications: typeof listNotifications;
  markNotificationsRead: typeof markNotificationsRead;
  updateProfile: typeof updateProfile;
  updatePreferences: typeof updatePreferences;
  updateNotificationPreferences: typeof updateNotificationPreferences;
  updateConsents: typeof updateConsents;
  revokeDevice: typeof revokeDevice;
  signOutProfile: typeof signOutProfile;
  requestExport: typeof requestExport;
  getExport: typeof getExport;
  requestAccountDeletion: typeof requestAccountDeletion;
  cancelAccountDeletion: typeof cancelAccountDeletion;
  contactSupport: typeof contactSupport;
  getHomeScreen: typeof getHomeScreen;
  getLiveScreen: typeof getLiveScreen;
  listCategories: typeof listCategories;
  getCategoryScreen: typeof getCategoryScreen;
  listArtists: typeof listArtists;
  getArtistDetail: typeof getArtistDetail;
  search: typeof search;
  listReplays: typeof listReplays;
  extendRail: typeof extendRail;
  resolvePublicLink: typeof resolvePublicLink;
  listPlans: typeof listPlans;
  refreshDateAvailability: typeof refreshDateAvailability;
  quoteSeat: typeof quoteSeat;
  enterSalesQueue: typeof enterSalesQueue;
  getSalesQueuePosition: typeof getSalesQueuePosition;
  purchaseSeat: typeof purchaseSeat;
  getOrder: typeof getOrder;
  cancelSeat: typeof cancelSeat;
  joinWaitlist: typeof joinWaitlist;
  leaveWaitlist: typeof leaveWaitlist;
  getCart: typeof getCart;
  addCartLine: typeof addCartLine;
  updateCartLine: typeof updateCartLine;
  removeCartLine: typeof removeCartLine;
  quoteCart: typeof quoteCart;
  checkoutCart: typeof checkoutCart;
  setSubscriptionPlan: typeof setSubscriptionPlan;
  cancelSubscription: typeof cancelSubscription;
  getDateDetail: typeof getDateDetail;
  openPlayback: typeof openPlayback;
  renewPlaybackTicket: typeof renewPlaybackTicket;
  releasePlayback: typeof releasePlayback;
  recordPlaybackPosition: typeof recordPlaybackPosition;
  listChatMessages: typeof listChatMessages;
  sendChatMessage: typeof sendChatMessage;
  sendReaction: typeof sendReaction;
  reportChatMessage: typeof reportChatMessage;
  createPairing: typeof createPairing;
  pollPairing: typeof pollPairing;
  cancelPairing: typeof cancelPairing;
  engagePairing: typeof engagePairing;
  decidePairing: typeof decidePairing;
  getAccountDeepLink: typeof getAccountDeepLink;
}> = defineApi({
  openapi: '3.1.1',
  security: [
    {
      sessionCookie: [],
    },
    {
      bearerToken: [],
    },
  ],
  routes: {
    registerDevice,
    getViewerContext,
    listChanges,
    signUp,
    signIn,
    signOut,
    confirmEmailVerification,
    resendEmailVerification,
    requestPasswordReset,
    resetPassword,
    startSocialSignIn,
    exchangeOneTimeToken,
    changePassword,
    enableTwoFactor,
    disableTwoFactor,
    verifyTwoFactor,
    addPasskey,
    removePasskey,
    addPaymentMethod,
    removePaymentMethod,
    getAccountScreen,
    listMyTickets,
    listMyReplays,
    listWatchlist,
    addToWatchlist,
    removeFromWatchlist,
    listFollowedArtists,
    followArtist,
    unfollowArtist,
    setReminder,
    clearReminder,
    listSavedSearches,
    createSavedSearch,
    updateSavedSearch,
    deleteSavedSearch,
    listMyOrders,
    listNotifications,
    markNotificationsRead,
    updateProfile,
    updatePreferences,
    updateNotificationPreferences,
    updateConsents,
    revokeDevice,
    signOutProfile,
    requestExport,
    getExport,
    requestAccountDeletion,
    cancelAccountDeletion,
    contactSupport,
    getHomeScreen,
    getLiveScreen,
    listCategories,
    getCategoryScreen,
    listArtists,
    getArtistDetail,
    search,
    listReplays,
    extendRail,
    resolvePublicLink,
    listPlans,
    refreshDateAvailability,
    quoteSeat,
    enterSalesQueue,
    getSalesQueuePosition,
    purchaseSeat,
    getOrder,
    cancelSeat,
    joinWaitlist,
    leaveWaitlist,
    getCart,
    addCartLine,
    updateCartLine,
    removeCartLine,
    quoteCart,
    checkoutCart,
    setSubscriptionPlan,
    cancelSubscription,
    getDateDetail,
    openPlayback,
    renewPlaybackTicket,
    releasePlayback,
    recordPlaybackPosition,
    listChatMessages,
    sendChatMessage,
    sendReaction,
    reportChatMessage,
    createPairing,
    pollPairing,
    cancelPairing,
    engagePairing,
    decidePairing,
    getAccountDeepLink,
  },
  components: {
    parameters: {
      Traceparent: TraceparentParameter,
      Surface: SurfaceParameter,
      ViewerTimezone: ViewerTimezoneParameter,
      IdempotencyKey: IdempotencyKeyParameter,
      AdmissionToken: AdmissionTokenParameter,
      LateEntryAcknowledged: LateEntryAcknowledgedParameter,
      Cursor: CursorParameter,
      CursorDirection: CursorDirectionParameter,
      Limit: LimitParameter,
      DateId: DateIdParameter,
      ArtistId: ArtistIdParameter,
      CategoryId: CategoryIdParameter,
    },
    headers: {
      ServedAt: ServedAtHeader,
      IdempotencyReplayed: IdempotencyReplayedHeader,
      RetryAfterMs: RetryAfterMsHeader,
      CacheControlPublic: CacheControlPublicHeader,
      VaryAuth: VaryAuthHeader,
    },
    responses: {
      BadRequest: BadRequestResponse,
      Unauthorized: UnauthorizedResponse,
      CsrfRefused: CsrfRefusedResponse,
      Forbidden: ForbiddenResponse,
      NotFound: NotFoundResponse,
      Conflict: ConflictResponse,
      Gone: GoneResponse,
      TooManyRequests: TooManyRequestsResponse,
      Unavailable: UnavailableResponse,
      PayloadTooLarge: PayloadTooLargeResponse,
      UnsupportedMediaType: UnsupportedMediaTypeResponse,
      InternalError: InternalErrorResponse,
      BadGateway: BadGatewayResponse,
      GatewayTimeout: GatewayTimeoutResponse,
    },
    schemas: {
      // envelopes
      EnvelopeMeta: StorefrontEnvelopeMetaSchema,
      CursorPageInfo: StorefrontCursorPageInfoSchema,
      Error: StorefrontErrorSchema,
      ErrorEnvelope: StorefrontErrorEnvelopeSchema,
      // primitives
      Money: MoneyOut,
      LocalizedText: StorefrontLocalizedTextSchema,
      ImageRendition: ImageRenditionSchema,
      MediaSet: MediaSetSchema,
      VenueClock: VenueClockSchema,
      // authentication
      SessionMode: StorefrontSessionModeSchema,
      SessionEstablished: StorefrontSessionEstablishedSchema,
      SessionEstablishedCookie: SessionEstablishedCookieSchema,
      SessionEstablishedBearer: SessionEstablishedBearerSchema,
      // viewer bootstrap
      DomainConstants: DomainConstantsSchema,
      LabelArtifactRef: LabelArtifactRefSchema,
      ProfileSummary: ProfileSummarySchema,
      ViewerPreferences: ViewerPreferencesSchema,
      ViewerContext: ViewerContextSchema,
      ChangeFeed: ChangeFeedSchema,
      // the public date
      WatchVerdict: WatchVerdictSchema,
      DateCard: DateCardSchema,
      DateDetail: DateDetailSchema,
      PriceTier: PriceTierSchema,
      Chapter: ChapterSchema,
      // composed screens
      Rail: RailSchema,
      HomeScreen: HomeScreenSchema,
      ScheduleSlot: ScheduleSlotSchema,
      LiveScreen: LiveScreenSchema,
      CategoryTile: CategoryTileSchema,
      CategoryScreen: CategoryScreenSchema,
      ArtistSummary: ArtistSummarySchema,
      ArtistDetail: ArtistDetailSchema,
      Facet: FacetSchema,
      StructuredFilter: StructuredFilterSchema,
      SearchCriteria: SearchCriteriaSchema,
      ShowGroup: ShowGroupSchema,
      // commerce
      SalesQueuePosition: SalesQueuePositionSchema,
      TicketCard: TicketCardSchema,
      MerchItem: MerchItemSchema,
      CartLine: CartLineSchema,
      Cart: CartSchema,
      CartQuote: CartQuoteSchema,
      SeatQuote: SeatQuoteSchema,
      TaxEvidence: TaxEvidenceSchema,
      BuyerTaxLocation: BuyerTaxLocationSchema,
      PaymentHandoff: PaymentHandoffSchema,
      Order: OrderSchema,
      ExternalOrderRef: ExternalOrderRefSchema,
      Plan: PlanSchema,
      Subscription: SubscriptionSchema,
      // playback
      PlaybackTicket: PlaybackTicketSchema,
      PlaybackRenewal: PlaybackRenewalSchema,
      ActivePlaybackSession: ActivePlaybackSessionSchema,
      Incident: IncidentSchema,
      ChatMessage: ChatMessageSchema,
      ReactionQuota: ReactionQuotaSchema,
      // pairing
      DevicePairing: DevicePairingSchema,
      PairingOutcome: PairingOutcomeSchema,
      AccountDeepLink: AccountDeepLinkSchema,
      // account
      SavedSearch: SavedSearchSchema,
      NotificationEntry: NotificationEntrySchema,
      NotificationPreferences: NotificationPreferencesSchema,
      Consents: ConsentsSchema,
      Device: DeviceSchema,
      AccountScreen: AccountScreenSchema,
      ExportRequest: ExportRequestSchema,
    },
  },
});
