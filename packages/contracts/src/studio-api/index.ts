import { MoneyOut } from '@arthome/core/schema';

import { signInStudio, verifyTwoFactorStudio, requestPasswordResetStudio } from './auth/routes.js';
import { countersignBankChange } from './bank-change-requests/routes.js';
import { getStudioBootstrap } from './bootstrap/routes.js';
import { listStudioChanges } from './changes/routes.js';
import {
  addBannedWord,
  changeMemberRoles,
  closeReconciliationPeriod,
  createDateDraft,
  deleteChannel,
  getChannelAgenda,
  getChannelDashboard,
  getChannelSettings,
  getChannelStats,
  getChannelStreamSettings,
  getChannelTicketing,
  inviteMember,
  listChannelEvents,
  listChannelJournal,
  listChannelMembers,
  listChannelMerchItems,
  listChannelReplays,
  listModerationQueue,
  listPayouts,
  removeBannedWord,
  removeMember,
  requestBankChange,
  requestChannelExport,
  sanctionAudienceMember,
  searchAudience,
  transferChannelOwnership,
  updateChannelIdentity,
  updateChannelSettings,
  upsertMerchItem,
} from './channels/routes.js';
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
  NotFoundResponse,
  PageParameter,
  PageSizeParameter,
  RightsVersionHeader,
  SortByParameter,
  SortDirParameter,
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
import { revokeDateAccess } from './date-access-grants/routes.js';
import {
  decideDateOutcome,
  deleteDate,
  duplicateDate,
  endRun,
  getDateChatPane,
  getDateCrewPane,
  getDatePublicPane,
  getDateReplayPane,
  getDateSheet,
  getDateTechPane,
  getDateTicketsPane,
  getHealthSeries,
  getRunConsole,
  goOnAir,
  grantDateAccess,
  issueComplimentary,
  listStudioChatMessages,
  moveDatePublicationState,
  openCapacityTier,
  pinMerchDuringLive,
  postChapter,
  raiseIncident,
  rehearseRun,
  removeChapter,
  reopenReplayWindow,
  resetRun,
  revealStreamKey,
  rotateStreamKey,
  runTechnicalCheck,
  setDateChatPolicy,
  setDatePrices,
  setDateReplayPolicy,
  setQualityProfile,
  setTechnicalProvision,
  submitHealthSample,
} from './dates/routes.js';
import { getChannelExport } from './exports/routes.js';
import { listInbox, markInboxRead } from './inbox/routes.js';
import { resolveIncident, escalateIncidentToProduction } from './incidents/routes.js';
import { respondToInvitation } from './invitations/routes.js';
import {
  createReauthToken,
  listReauthFactors,
  listStudioDevices,
  revokeStudioDevice,
  signOutStudio,
  registerStudioPushToken,
  updateStudioPreferences,
  listDuties,
} from './me/routes.js';
import {
  claimModerationItem,
  releaseModerationItem,
  settleModerationItem,
} from './moderation/routes.js';
import { refundSeat } from './seats/routes.js';
import { createUploadTicket } from './uploads/routes.js';
import {
  StudioEnvelopeMetaSchema,
  StudioErrorEnvelopeSchema,
  StudioErrorSchema,
} from '../envelope/index.js';
import { defineApi, variantOf } from '../http/index.js';
import type { Api } from '../http/index.js';
import { SessionMode } from '../identity/index.js';
import { OffsetPageInfoSchema, StudioCursorPageInfoSchema } from '../pagination/index.js';
import {
  ActorSchema,
  ChannelMemberSchema,
  DateAccessGrantSchema,
  DutySchema,
  EffectiveRightsSchema,
  StudioBootstrapSchema,
  StudioCountersSchema,
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
  rehearseRun: typeof rehearseRun;
  goOnAir: typeof goOnAir;
  endRun: typeof endRun;
  resetRun: typeof resetRun;
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
    rehearseRun,
    goOnAir,
    endRun,
    resetRun,
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
    },
    headers: {
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
      SessionEstablishedCookie: variantOf(StudioSessionEstablishedSchema, SessionMode.COOKIE),
      SessionEstablishedBearer: variantOf(StudioSessionEstablishedSchema, SessionMode.BEARER),
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
