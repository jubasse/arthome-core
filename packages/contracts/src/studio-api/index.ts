import { MemberRole } from '@arthome/core';
import { MoneyOut } from '@arthome/core/schema';

import {
  getChannelAgenda,
  getChannelDashboard,
  getChannelStats,
  listChannelEvents,
  listDuties,
} from './agenda.js';
import {
  createReauthToken,
  getStudioBootstrap,
  listInbox,
  listReauthFactors,
  listStudioChanges,
  listStudioDevices,
  markInboxRead,
  registerStudioPushToken,
  requestPasswordResetStudio,
  revokeStudioDevice,
  signInStudio,
  signOutStudio,
  updateStudioPreferences,
  verifyTwoFactorStudio,
} from './bootstrap.js';
import {
  createUploadTicket,
  deleteChannel,
  getChannelSettings,
  listChannelJournal,
  listChannelMerchItems,
  listChannelReplays,
  pinMerchDuringLive,
  reopenReplayWindow,
  updateChannelIdentity,
  updateChannelSettings,
  upsertMerchItem,
} from './channel.js';
import {
  BadRequestResponse,
  ChannelIdParameter,
  ConflictResponse,
  CursorParameter,
  DateIdParameter,
  ForbiddenResponse,
  GoneResponse,
  IdempotencyKeyParameter,
  IdempotencyReplayedHeader,
  IfRightsVersionParameter,
  LimitParameter,
  NotFoundResponse,
  PageParameter,
  PageSizeParameter,
  RightsVersionHeader,
  ServedAtHeader,
  SortByParameter,
  SortDirParameter,
  StudioTag,
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
} from './components.js';
import {
  changeMemberRoles,
  getDateCrewPane,
  grantDateAccess,
  inviteMember,
  listChannelMembers,
  removeMember,
  respondToInvitation,
  revokeDateAccess,
  transferChannelOwnership,
} from './crew.js';
import {
  addBannedWord,
  claimModerationItem,
  getDateChatPane,
  listModerationQueue,
  listStudioChatMessages,
  releaseModerationItem,
  removeBannedWord,
  sanctionAudienceMember,
  searchAudience,
  setDateChatPolicy,
  settleModerationItem,
} from './moderation.js';
import {
  closeReconciliationPeriod,
  countersignBankChange,
  getChannelExport,
  listPayouts,
  requestBankChange,
  requestChannelExport,
} from './payouts.js';
import {
  createDateDraft,
  decideDateOutcome,
  deleteDate,
  duplicateDate,
  getDatePublicPane,
  getDateReplayPane,
  getDateSheet,
  moveDatePublicationState,
  setDateReplayPolicy,
} from './publication.js';
import {
  escalateIncidentToProduction,
  getChannelStreamSettings,
  getDateTechPane,
  getHealthSeries,
  getRunConsole,
  postChapter,
  raiseIncident,
  removeChapter,
  resolveIncident,
  revealStreamKey,
  rotateStreamKey,
  runTechnicalCheck,
  setQualityProfile,
  setRunState,
  submitHealthSample,
} from './run.js';
import {
  getChannelTicketing,
  getDateTicketsPane,
  issueComplimentary,
  openCapacityTier,
  refundSeat,
  setDatePrices,
  setTechnicalProvision,
} from './ticketing.js';
import {
  StudioEnvelopeMetaSchema,
  StudioErrorEnvelopeSchema,
  StudioErrorSchema,
} from '../envelope/index.js';
import { defineApi } from '../http/index.js';
import type { Api } from '../http/index.js';
import { OffsetPageInfoSchema, StudioCursorPageInfoSchema } from '../pagination/index.js';
import {
  ActorSchema,
  ChannelMemberSchema,
  DateAccessGrantSchema,
  DutySchema,
  EffectiveRightsSchema,
  StudioBootstrapSchema,
  StudioCountersSchema,
  StudioSessionEstablishedBearerSchema,
  StudioSessionEstablishedCookieSchema,
  StudioSessionEstablishedSchema,
  StudioSessionModeSchema,
} from '../studio-access/index.js';
import {
  AudienceMemberSchema,
  ChatPolicySchema,
  InboxEntrySchema,
  JournalEntrySchema,
  ModerationItemSchema,
} from '../studio-desk/index.js';
import {
  BankChangeRequestSchema,
  DashboardReminderSchema,
  DashboardScreenSchema,
  DateSalesPaneSchema,
  ExportJobSchema,
  MetricTileSchema,
  PayoutLineSchema,
  PeriodBoundsSchema,
  StatsAudienceSchema,
  StatsSeriesSchema,
} from '../studio-money/index.js';
import {
  CrewPresenceSchema,
  DateSheetSchema,
  EventsRowSchema,
  HealthSampleSchema,
  HealthSeriesSchema,
  MerchItemAdminSchema,
  PublicationChecklistItemSchema,
  PublicationSchema,
  PublicationTransitionSchema,
  RunConsoleSchema,
  StreamKeyRevealSchema,
  StudioIncidentSchema,
  UploadTicketSchema,
} from '../studio-stage/index.js';
import { StudioLocalizedTextSchema } from '../text/index.js';

export const studioApi: Api<{
  signInStudio: typeof signInStudio;
  verifyTwoFactorStudio: typeof verifyTwoFactorStudio;
  requestPasswordResetStudio: typeof requestPasswordResetStudio;
  getStudioBootstrap: typeof getStudioBootstrap;
  listInbox: typeof listInbox;
  markInboxRead: typeof markInboxRead;
  createReauthToken: typeof createReauthToken;
  listReauthFactors: typeof listReauthFactors;
  listStudioDevices: typeof listStudioDevices;
  revokeStudioDevice: typeof revokeStudioDevice;
  signOutStudio: typeof signOutStudio;
  registerStudioPushToken: typeof registerStudioPushToken;
  listStudioChanges: typeof listStudioChanges;
  updateStudioPreferences: typeof updateStudioPreferences;
  listDuties: typeof listDuties;
  listChannelEvents: typeof listChannelEvents;
  getChannelDashboard: typeof getChannelDashboard;
  getChannelStats: typeof getChannelStats;
  getChannelAgenda: typeof getChannelAgenda;
  createDateDraft: typeof createDateDraft;
  getDateSheet: typeof getDateSheet;
  getDatePublicPane: typeof getDatePublicPane;
  getDateReplayPane: typeof getDateReplayPane;
  moveDatePublicationState: typeof moveDatePublicationState;
  setDateReplayPolicy: typeof setDateReplayPolicy;
  deleteDate: typeof deleteDate;
  duplicateDate: typeof duplicateDate;
  decideDateOutcome: typeof decideDateOutcome;
  getDateTicketsPane: typeof getDateTicketsPane;
  setDatePrices: typeof setDatePrices;
  openCapacityTier: typeof openCapacityTier;
  setTechnicalProvision: typeof setTechnicalProvision;
  refundSeat: typeof refundSeat;
  issueComplimentary: typeof issueComplimentary;
  getChannelTicketing: typeof getChannelTicketing;
  getDateChatPane: typeof getDateChatPane;
  setDateChatPolicy: typeof setDateChatPolicy;
  listModerationQueue: typeof listModerationQueue;
  claimModerationItem: typeof claimModerationItem;
  releaseModerationItem: typeof releaseModerationItem;
  settleModerationItem: typeof settleModerationItem;
  searchAudience: typeof searchAudience;
  sanctionAudienceMember: typeof sanctionAudienceMember;
  addBannedWord: typeof addBannedWord;
  removeBannedWord: typeof removeBannedWord;
  listStudioChatMessages: typeof listStudioChatMessages;
  getDateTechPane: typeof getDateTechPane;
  getRunConsole: typeof getRunConsole;
  runTechnicalCheck: typeof runTechnicalCheck;
  setRunState: typeof setRunState;
  setQualityProfile: typeof setQualityProfile;
  getHealthSeries: typeof getHealthSeries;
  submitHealthSample: typeof submitHealthSample;
  postChapter: typeof postChapter;
  removeChapter: typeof removeChapter;
  raiseIncident: typeof raiseIncident;
  resolveIncident: typeof resolveIncident;
  escalateIncidentToProduction: typeof escalateIncidentToProduction;
  revealStreamKey: typeof revealStreamKey;
  rotateStreamKey: typeof rotateStreamKey;
  getChannelStreamSettings: typeof getChannelStreamSettings;
  getDateCrewPane: typeof getDateCrewPane;
  listChannelMembers: typeof listChannelMembers;
  inviteMember: typeof inviteMember;
  respondToInvitation: typeof respondToInvitation;
  changeMemberRoles: typeof changeMemberRoles;
  removeMember: typeof removeMember;
  grantDateAccess: typeof grantDateAccess;
  revokeDateAccess: typeof revokeDateAccess;
  transferChannelOwnership: typeof transferChannelOwnership;
  deleteChannel: typeof deleteChannel;
  listChannelReplays: typeof listChannelReplays;
  getChannelSettings: typeof getChannelSettings;
  updateChannelSettings: typeof updateChannelSettings;
  listChannelJournal: typeof listChannelJournal;
  createUploadTicket: typeof createUploadTicket;
  listChannelMerchItems: typeof listChannelMerchItems;
  upsertMerchItem: typeof upsertMerchItem;
  pinMerchDuringLive: typeof pinMerchDuringLive;
  reopenReplayWindow: typeof reopenReplayWindow;
  updateChannelIdentity: typeof updateChannelIdentity;
  listPayouts: typeof listPayouts;
  requestBankChange: typeof requestBankChange;
  countersignBankChange: typeof countersignBankChange;
  closeReconciliationPeriod: typeof closeReconciliationPeriod;
  requestChannelExport: typeof requestChannelExport;
  getChannelExport: typeof getChannelExport;
}> = defineApi({
  openapi: '3.1.1',
  // Every `CODE` this document names in prose must be the WIRE spelling of a member of
  // ERROR_CODES, not the TypeScript accessor's. check-vocabulary.py compares them.
  'x-arthome-codes-source': 'ERROR_CODES',
  info: {
    title: 'Arthome Studio BFF',
    version: '1.0.0',
    summary:
      'The single contract for the two professional surfaces — studio web and studio mobile.',
    description:
      'Contract of the **studio BFF**. It serves `studio-web` (Angular) and `studio-mobile` (Angular\n+ Ionic + Capacitor). It is a **separate BFF** from the storefront\'s, and that is not a\nconvenience: the two products share neither the same session (cookie versus bearer token), nor\nthe same pagination (page + total versus cursor), nor the same projection envelope (per role\nversus per viewer), nor the same release cycle.\n\n## The rule that governs this whole document: role projection is server-side\n\n`canRevenue` **does not hide a column: it decides what the response contains.** A control room\nthat received raw ticketing figures in its payload and did not display them is a **leak**, not\na rule — the payload is in the clear inside a WebView, inspectable, and it survives in the\nphone\'s HTTP cache.\n\nThree consequences, carried everywhere in this document:\n\n- **a forbidden field is absent, never present and null.** Yes, that means different shapes\n  for the same screen depending on the role, and it is **intended**;\n- **a sort key on an absent field is refused** (`api.sort_key_forbidden`), never ignored — a sort\n  silently accepted on revenue betrays the ordering of the very values one is not allowed to\n  see;\n- **a notification never carries an amount if the recipient role lacks `canRevenue`**: it is\n  displayed on a locked screen.\n\n## A coded field is named after its vocabulary, never `reasonCode`\n\n`reasonCode` was carried by **five fields over four unrelated vocabularies** across the two\ncontracts — playback refusals, blackout reasons, refund reasons, cancellation reasons — plus two\nprice lines where it was a bare string. Nothing collided on the wire, since each lives in its own\nschema, and that is exactly what made it survive: **it was disambiguated only by where the reader\nwas standing.** A generated client may hoist one `ReasonCode` type out of all of them, and a human\nreading both documents assumes one vocabulary and is wrong.\n\nSo every coded field now names its own vocabulary — `denialReasonCode`, `blackoutReasonCode`,\n`refundReasonCode`, `cancelReasonCode`, `discountReasonCode` — which is the convention\n`failureCode`, `originCode` and `emptyReason` were already following. The generic name was the\nexception, not the rule.\n\n**The one place a bare `reasonCode` remains is inside `error.params`**, and it is not an exception\nto this: `params` is a bag whose keys are defined **per error `code`**, so the code that carries it\nis the disambiguator, stated rather than inferred.\n\n## Eight roles, never six\n\nAuthorisation bears on the **eight** canonical values — `artist`, `production`,\n`coordination`, `director`, `video`, `sound`, `moderation`, `treasury`. The fallback to six\npersonas is **a presentation label** and appears in no response: it conflates `director`,\n`video` and `sound` under "control room" and **erases `director`\'s right to invite**. A person\nholds a **set** of roles on a channel, and their navigation is the **union** of those\naccesses, never a rank.\n\nTwo scales of access, never conflated: **channel membership**, which is permanent, and\n**one-off access to a date**, which expires at a served instant. Conflating them would turn\nrevoking a stand-in into expulsion from the channel.\n\n## Rights move during the session\n\nEvery response carries `X-Arthome-Rights-Version`. When it changes, the navigation is stale:\nan accepted invitation adds a channel to the switcher, a one-off access expires on its own at\ncurtain-down, a role is withdrawn. Without that counter, the person keeps a tab that opens a\n403 and finds out **while on duty**. The maximum staleness of authorisation is\n**60 seconds**, the lifetime of the internal token minted by the BFF.\n\n## Three command regimes, named\n\n- **conditional** — most of the gestures made on duty. They carry `expectedVersion`, and the\n  server **refuses** if it has changed. The canonical case is the moderation verdict: the\n  second verdict is **refused, with the verdict that won and the name of whoever rendered\n  it**. A blind idempotent replay would produce exactly the opposite;\n- **leases** — "take charge" is not deciding. A lease **expires by itself**: a moderator whose\n  phone dies does not freeze a row for the whole live show. Taking charge is **never** queued\n  offline;\n- **two-stage** — changing a bank account, transferring ownership, inviting. They create a\n  **pending state** that the contract carries, and a bank change **suspends the payout in\n  flight**.\n\n## Pagination (D-010)\n\n**Page + total** everywhere — the design displays "1–8 OF N" and lists the page numbers, so it\nneeds the total and the number of pages. **Two named exceptions, and not one more**: the\n**moderation queue** and the **live chat** move to **cursors**, because they are streams and\noffset pagination duplicates and skips there **mechanically**, not exceptionally.\n\n**The audit log stays on page + total, with a mandatory period filter.** Nobody pages to the\n50,000th entry of a log: you filter by period first. A cursor would trade a problem we do not\nhave against the loss of the page numbers, which are precisely the affordance wanted.\n\n## Errors\n\nThe same envelope as the storefront: `code`, `nature`, `params`, `traceId`. `nature` is what being\non duty requires: `refused` (do not retry, understand), `unavailable` (retry),\n`offline_forbidden` (a **local** refusal, before anything is sent — **never emitted by the\nserver**). It is the decision someone on call must make in ten seconds.\n\n## Maturity\n\n`identity`, `catalog` and `ticketing` are **stable**; `streaming`, `chat`, `payouts` and\n`notifications` are **provisional**. Every operation carries `x-arthome-maturity`.\n',
    contact: {
      name: 'Arthome — architecture',
    },
    license: {
      name: 'UNLICENSED',
    },
  },
  servers: [
    {
      url: 'https://studio-api.arthome.fr',
      description: MemberRole.PRODUCTION,
    },
    {
      url: 'https://studio-api.staging.arthome.fr',
      description: 'recette',
    },
    {
      url: 'http://localhost:3002',
      description: 'local development (docker compose)',
    },
  ],
  tags: [
    {
      name: StudioTag.BOOTSTRAP,
      description: 'Bootstrap, effective rights, inbox, counters.',
    },
    {
      name: StudioTag.AGENDA,
      description: 'Channel schedule, duties, event board.',
    },
    {
      name: StudioTag.PUBLICATION,
      description: "A date's life cycle, state machine, publication gate.",
    },
    {
      name: StudioTag.TICKETING,
      description: 'Jauge, tarifs, contremarques, remboursements.',
    },
    {
      name: StudioTag.RUN,
      description: 'Running the live show: health, chapters, incidents, stream key.',
    },
    {
      name: StudioTag.MODERATION,
      description: 'File, verdicts, sanctions, dictionnaire.',
    },
    {
      name: StudioTag.CREW,
      description: 'Team, roles, invitations, one-off accesses.',
    },
    {
      name: StudioTag.PAYOUTS,
      description: 'Payouts, banking, reconciliation, accounting exports.',
    },
    {
      name: StudioTag.CHANNEL,
      description: 'Public identity, shop, replays, settings, audit log.',
    },
  ],
  security: [
    {
      sessionCookie: [],
    },
    {
      bearerToken: [],
    },
  ],
  routes: {
    signInStudio,
    verifyTwoFactorStudio,
    requestPasswordResetStudio,
    getStudioBootstrap,
    listInbox,
    markInboxRead,
    createReauthToken,
    listReauthFactors,
    listStudioDevices,
    revokeStudioDevice,
    signOutStudio,
    registerStudioPushToken,
    listStudioChanges,
    updateStudioPreferences,
    listDuties,
    listChannelEvents,
    getChannelDashboard,
    getChannelStats,
    getChannelAgenda,
    createDateDraft,
    getDateSheet,
    getDatePublicPane,
    getDateReplayPane,
    moveDatePublicationState,
    setDateReplayPolicy,
    deleteDate,
    duplicateDate,
    decideDateOutcome,
    getDateTicketsPane,
    setDatePrices,
    openCapacityTier,
    setTechnicalProvision,
    refundSeat,
    issueComplimentary,
    getChannelTicketing,
    getDateChatPane,
    setDateChatPolicy,
    listModerationQueue,
    claimModerationItem,
    releaseModerationItem,
    settleModerationItem,
    searchAudience,
    sanctionAudienceMember,
    addBannedWord,
    removeBannedWord,
    listStudioChatMessages,
    getDateTechPane,
    getRunConsole,
    runTechnicalCheck,
    setRunState,
    setQualityProfile,
    getHealthSeries,
    submitHealthSample,
    postChapter,
    removeChapter,
    raiseIncident,
    resolveIncident,
    escalateIncidentToProduction,
    revealStreamKey,
    rotateStreamKey,
    getChannelStreamSettings,
    getDateCrewPane,
    listChannelMembers,
    inviteMember,
    respondToInvitation,
    changeMemberRoles,
    removeMember,
    grantDateAccess,
    revokeDateAccess,
    transferChannelOwnership,
    deleteChannel,
    listChannelReplays,
    getChannelSettings,
    updateChannelSettings,
    listChannelJournal,
    createUploadTicket,
    listChannelMerchItems,
    upsertMerchItem,
    pinMerchDuringLive,
    reopenReplayWindow,
    updateChannelIdentity,
    listPayouts,
    requestBankChange,
    countersignBankChange,
    closeReconciliationPeriod,
    requestChannelExport,
    getChannelExport,
  },
  components: {
    securitySchemes: {
      sessionCookie: {
        type: 'apiKey',
        in: 'cookie',
        name: 'arthome_studio_session',
        description:
          "Opaque session, `HttpOnly`/`Secure`/`SameSite=Lax` cookie. This is `studio-web`'s form.\n",
      },
      bearerToken: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'opaque',
        description:
          '**`studio-mobile` cannot hold its session in a cookie**: `capacitor://localhost` is a\nthird-party context on iOS. The studio BFF therefore offers a **bearer-token** session\nalongside the cookie session — a refresh token bound to the device, kept in the native store\n(`@capacitor/preferences`, **never `localStorage`**), a short access token, revocation per\ndevice.\n\nOn returning from the background with an expired token: **silent refresh**. A\nre-authentication while on duty is an operational fault. It is required only for\n**sensitive operations** — revealing or rotating a stream key, transferring ownership of a\nchannel, changing a payout method — and it is then asked for **at the moment of the\noperation**, not on returning to a screen.\n\nAllowed origins on the CORS side, as **literal strings**: `capacitor://localhost` and\n`https://localhost`. A bare `localhost` entry covers neither, `*` is illegal with credentialed\nrequests, and a framework that normalises the origin through a URL parser would reject\n`capacitor://`.\n',
      },
    },
    parameters: {
      Traceparent: TraceparentParameter,
      Surface: SurfaceParameter,
      IdempotencyKey: IdempotencyKeyParameter,
      IfRightsVersion: IfRightsVersionParameter,
      ChannelId: ChannelIdParameter,
      DateId: DateIdParameter,
      Page: PageParameter,
      PageSize: PageSizeParameter,
      SortBy: SortByParameter,
      SortDir: SortDirParameter,
      Cursor: CursorParameter,
      Limit: LimitParameter,
    },
    headers: {
      ServedAt: ServedAtHeader,
      RightsVersion: RightsVersionHeader,
      IdempotencyReplayed: IdempotencyReplayedHeader,
    },
    responses: {
      BadRequest: BadRequestResponse,
      Unauthorized: UnauthorizedResponse,
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
      EnvelopeMeta: StudioEnvelopeMetaSchema,
      OffsetPageInfo: OffsetPageInfoSchema,
      CursorPageInfo: StudioCursorPageInfoSchema,
      Error: StudioErrorSchema,
      ErrorEnvelope: StudioErrorEnvelopeSchema,
      Money: MoneyOut,
      LocalizedText: StudioLocalizedTextSchema,
      Actor: ActorSchema,
      SessionMode: StudioSessionModeSchema,
      SessionEstablished: StudioSessionEstablishedSchema,
      SessionEstablishedCookie: StudioSessionEstablishedCookieSchema,
      SessionEstablishedBearer: StudioSessionEstablishedBearerSchema,
      // rights and bootstrap
      EffectiveRights: EffectiveRightsSchema,
      StudioCounters: StudioCountersSchema,
      StudioBootstrap: StudioBootstrapSchema,
      // measurement: period, tiles, series
      PeriodBounds: PeriodBoundsSchema,
      MetricTile: MetricTileSchema,
      DashboardReminder: DashboardReminderSchema,
      DashboardScreen: DashboardScreenSchema,
      StatsAudience: StatsAudienceSchema,
      StatsSeries: StatsSeriesSchema,
      // publication
      PublicationChecklistItem: PublicationChecklistItemSchema,
      PublicationTransition: PublicationTransitionSchema,
      Publication: PublicationSchema,
      DateSheet: DateSheetSchema,
      EventsRow: EventsRowSchema,
      Duty: DutySchema,
      // ticketing
      DateSalesPane: DateSalesPaneSchema,
      // the run
      HealthSample: HealthSampleSchema,
      RunConsole: RunConsoleSchema,
      CrewPresence: CrewPresenceSchema,
      HealthSeries: HealthSeriesSchema,
      StudioIncident: StudioIncidentSchema,
      StreamKeyReveal: StreamKeyRevealSchema,
      // moderation
      ModerationItem: ModerationItemSchema,
      AudienceMember: AudienceMemberSchema,
      ChatPolicy: ChatPolicySchema,
      // team
      ChannelMember: ChannelMemberSchema,
      DateAccessGrant: DateAccessGrantSchema,
      // money
      PayoutLine: PayoutLineSchema,
      BankChangeRequest: BankChangeRequestSchema,
      ExportJob: ExportJobSchema,
      UploadTicket: UploadTicketSchema,
      JournalEntry: JournalEntrySchema,
      InboxEntry: InboxEntrySchema,
      MerchItemAdmin: MerchItemAdminSchema,
    },
  },
});
