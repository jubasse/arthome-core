import { MemberRole } from '@arthome/core';
import {
  BuyerTaxLocationSchema,
  MoneyOut,
  TaxEvidenceSchema,
  VenueClockSchema,
} from '@arthome/core/schema';

import {
  BadRequestResponse,
  CacheControlPublicHeader,
  CursorParameter,
  GoneResponse,
  LimitParameter,
  StorefrontTag,
  SurfaceParameter,
  TraceparentParameter,
  VaryAuthHeader,
} from './components.js';
import { search } from './discovery.js';
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

export const storefrontApi: Api<{ search: typeof search }> = defineApi({
  openapi: '3.1.1',
  'x-arthome-codes-source': 'ERROR_CODES',
  info: {
    title: 'Arthome Storefront BFF',
    version: '1.0.0',
    summary: 'The single contract for the three public surfaces — web, mobile, television.',
    description:
      'Contract of the **storefront BFF**. It serves `storefront-web` (Next.js),\n`storefront-mobile` (React Native) and `storefront-tv` (react-native-tvos). These three\nsurfaces share one document: what differs between them is a **parameter**\n(`X-Arthome-Surface`), never a shape.\n\n## This document is generated, it is not written\n\nThe source is zod, in `@arthome/contracts`; this document is produced by `z.toJSONSchema()`.\nThree consequences, visible throughout what follows:\n\n- **no date is a `z.date()`** and **no boundary schema carries a `z.transform()`**: both are\n  unconvertible. Instants are `date-time` strings (RFC 3339, UTC).\n- a **request** schema is converted with `io: "input"`, a **response** schema with\n  `io: "output"`. Getting it backwards produces false documentation.\n- the regenerated document must be **identical** to the committed one. That is a gate in\n  `definition-of-done.md`.\n\n## Closed vocabularies, and the survival of the fleet\n\nA closed vocabulary appears in two forms, and **they are not the same**.\n\n- on **input** (what the client sends): strict `enum`. An unknown value is refused with\n  `api.schema_invalid`.\n- on **output** (what the server returns): `type: string` together with\n  `x-arthome-vocabulary`, which lists the known values **for documentation only**. A surface\n  that receives a value missing from that list **keeps it raw and treats it as neutral**; it\n  never rejects, and above all it does not fail the whole page.\n\nThe reason is `storefront-tv` Q12: a version published today will be running in living rooms\na year from now, and the day the catalogue gains a 22nd discipline, those televisions will\nreceive it. Strictness applies to the **shape** — required fields, types — never to the\n**member** of a vocabulary.\n\n## A coded field is named after its vocabulary, never `reasonCode`\n\n`reasonCode` was carried by **five fields over four unrelated vocabularies** across the two\ncontracts — playback refusals, blackout reasons, refund reasons, cancellation reasons — plus two\nprice lines where it was a bare string. Nothing collided on the wire, since each lives in its own\nschema, and that is exactly what made it survive: **it was disambiguated only by where the reader\nwas standing.** A generated client may hoist one `ReasonCode` type out of all of them, and a human\nreading both documents assumes one vocabulary and is wrong.\n\nSo every coded field now names its own vocabulary — `denialReasonCode`, `blackoutReasonCode`,\n`refundReasonCode`, `cancelReasonCode`, `discountReasonCode` — which is the convention\n`failureCode`, `originCode` and `emptyReason` were already following. The generic name was the\nexception, not the rule.\n\n**The one place a bare `reasonCode` remains is inside `error.params`**, and it is not an exception\nto this: `params` is a bag whose keys are defined **per error `code`**, so the code that carries it\nis the disambiguator, stated rather than inferred.\n\n## Public read and identified read — two bodies, one path\n\n**Ten catalogue operations are callable with no authentication at all**, and that is the\n**nominal** case: `home`, `live`, `categories`, `categories/{id}`, `artists`,\n`artists/{id}`, `dates/{id}`, `dates/{id}/availability`, `search`, `plans`. This surface\nexists to be indexed — the brief defines it by "search ranking and server rendering are\ndecisive" — and a search engine\'s crawler has no cookie, no bearer token, and no reason\nwhatsoever to manufacture one. **Guest mode** takes exactly the same path.\n\nThe same path returns **two bodies**, and the difference is declared:\n\n| Called | Body | `Cache-Control` |\n|---|---|---|\n| with no authentication at all | **public body** — `watchVerdict`, `viewerRelations` and `viewerProgress` are **absent** | `public, max-age=<freshness>` |\n| with a session, bearer token or device token | public body **plus** the three overlays | `private, max-age=<freshness>` |\n\n**The public body is identical for every anonymous caller.** That is what makes it shareable:\na cached render function can read neither cookie nor header, so it is anonymous by\nconstruction, and it can cache that body without risk. Serving as `public` a body that varies\nper viewer would be **a leak, not an optimisation** — and that is the sole reason for the\n`Vary` declared on these ten responses.\n\n**An absent field is never a null field**: the projection rule holds here as it does on the\nstudio side. A surface receiving the public body knows it did not ask for the overlays; it\ndoes not confuse them with a refused right.\n\n**The absence of a credential is never a `401`.** A `401` on these ten paths means a\ncredential was **presented and refused** — expired, malformed, wrong audience.\n\n## What every response carries\n\n`servedAt` on **every** response; `validUntil` as soon as a perishable value is present;\n`lastEventSeq` on every read model fed by a stream. Every displayed countdown is computed\nagainst `servedAt`, **never** against the client\'s clock — a phone\'s clock drifts in standby,\njumps on a timezone change, and its owner can set it.\n\n## Errors\n\nOne envelope, up to and including Traefik: `code`, `nature`, `params`, `traceId`. A\nvalidation failure translates into a **code**, never into a zod message in English. `nature`\nis `refused` (the server said no definitively), `unavailable` (retry) or\n`offline_forbidden` — the last one is **never emitted by the server**: it is the nature of a\nlocal refusal, produced by the surface before anything is sent, and it is in the vocabulary\nso that the surface has only one error shape to render.\n\n## Pagination (D-010)\n\nThe storefront paginates **by cursor**, opaque, Base64-encoded over the composite key\n`(created_at, id)`. It is **bidirectional**, **independent of page size** — a screen rotation\ndoes not invalidate it — and it lives **24 hours**. Beyond that: `410` `api.cursor_too_old`,\nwhich demands a full reload and says so.\n\n## Maturity\n\nEndpoints served by `identity`, `catalog` and `ticketing` are **stable**: `oasdiff breaking`\nblocks any break. Those served by `streaming`, `chat`, `payouts` and `notifications` are\n**provisional**: `oasdiff` is a warning there. Every operation carries\n`x-arthome-maturity`.\n',
    contact: {
      name: 'Arthome — architecture',
    },
    license: {
      name: 'UNLICENSED',
    },
  },
  servers: [
    {
      url: 'https://api.arthome.fr',
      description: MemberRole.PRODUCTION,
    },
    {
      url: 'https://api.staging.arthome.fr',
      description: 'recette',
    },
    {
      url: 'http://localhost:3001',
      description: 'local development (docker compose)',
    },
  ],
  tags: [
    {
      name: StorefrontTag.BOOTSTRAP,
      description: 'Bootstrap, viewer context, invalidations.',
    },
    {
      name: StorefrontTag.DISCOVERY,
      description: 'Home, live, disciplines, artists, search.',
    },
    {
      name: StorefrontTag.DATE,
      description: "A date's record, and everything attached to it.",
    },
    {
      name: StorefrontTag.COMMERCE,
      description: 'Seats, cart, merchandise, subscription.',
    },
    {
      name: StorefrontTag.PLAYBACK,
      description: 'Right to watch, token, session, resume position.',
    },
    {
      name: StorefrontTag.CHAT,
      description: "The viewer's voice during a live show.",
    },
    {
      name: StorefrontTag.PAIRING,
      description: 'Device pairing (RFC 8628) — the five intents.',
    },
    {
      name: StorefrontTag.ACCOUNT,
      description: 'Account, preferences, security, personal data.',
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
    search,
  },
  components: {
    securitySchemes: {
      sessionCookie: {
        type: 'apiKey',
        in: 'cookie',
        name: 'arthome_session',
        description:
          'Opaque `better-auth` session, carried by an `HttpOnly`/`Secure`/`SameSite=Lax` cookie. This\nis the form chosen for `storefront-web`, which renders on the server and whose cached\nfunctions can read neither cookie nor header on the static render path.\n',
      },
      bearerToken: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'opaque',
        description:
          "The same session, carried in `Authorization: Bearer` by `better-auth`'s `bearer` plugin\n(`set-auth-token` header on return). This is the form chosen for `storefront-mobile` and\n`storefront-tv`, kept in the native store (Keychain / Keystore), **never in\n`localStorage`**.\n",
      },
      deviceToken: {
        type: 'apiKey',
        in: 'header',
        name: 'X-Arthome-Device-Token',
        description:
          'ES256 JWT, `aud: "arthome.device"`, 180 days, **rotated on every use**, carrying `device_id`\nand nothing else. Obtained on first launch through `registerDevice`, **before any session**.\nIt is not a session: it opens only pairing, pairing polling and the public bootstrap, and\n**opens no personal data** — in particular not the real-time channel (`adr-auth.md` §4/Q3,\n§5.3).\n',
      },
    },
    parameters: {
      Traceparent: TraceparentParameter,
      Surface: SurfaceParameter,
      Cursor: CursorParameter,
      Limit: LimitParameter,
    },
    headers: {
      CacheControlPublic: CacheControlPublicHeader,
      VaryAuth: VaryAuthHeader,
    },
    responses: {
      BadRequest: BadRequestResponse,
      Gone: GoneResponse,
    },
    schemas: {
      EnvelopeMeta: StorefrontEnvelopeMetaSchema,
      CursorPageInfo: StorefrontCursorPageInfoSchema,
      Error: StorefrontErrorSchema,
      ErrorEnvelope: StorefrontErrorEnvelopeSchema,
      Money: MoneyOut,
      LocalizedText: StorefrontLocalizedTextSchema,
      ImageRendition: ImageRenditionSchema,
      MediaSet: MediaSetSchema,
      VenueClock: VenueClockSchema,
      SessionMode: StorefrontSessionModeSchema,
      SessionEstablished: StorefrontSessionEstablishedSchema,
      SessionEstablishedCookie: SessionEstablishedCookieSchema,
      SessionEstablishedBearer: SessionEstablishedBearerSchema,
      DomainConstants: DomainConstantsSchema,
      LabelArtifactRef: LabelArtifactRefSchema,
      ProfileSummary: ProfileSummarySchema,
      ViewerPreferences: ViewerPreferencesSchema,
      ViewerContext: ViewerContextSchema,
      ChangeFeed: ChangeFeedSchema,
      WatchVerdict: WatchVerdictSchema,
      DateCard: DateCardSchema,
      DateDetail: DateDetailSchema,
      PriceTier: PriceTierSchema,
      Chapter: ChapterSchema,
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
      PlaybackTicket: PlaybackTicketSchema,
      PlaybackRenewal: PlaybackRenewalSchema,
      ActivePlaybackSession: ActivePlaybackSessionSchema,
      Incident: IncidentSchema,
      ChatMessage: ChatMessageSchema,
      ReactionQuota: ReactionQuotaSchema,
      DevicePairing: DevicePairingSchema,
      PairingOutcome: PairingOutcomeSchema,
      AccountDeepLink: AccountDeepLinkSchema,
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
