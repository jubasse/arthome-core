import { MemberRole } from '@arthome/core';

import { StudioTag } from './components.js';
import type { RouteDefinition } from '../http/index.js';
import type { ApiDocs, OperationDocumentation } from '../openapi/docs.js';
import { apiDocs, documentationLookup } from '../openapi/docs.js';
import { authDocs } from './auth/docs.js';
import { authExamples } from './auth/examples.js';
import { bankChangeRequestsDocs } from './bank-change-requests/docs.js';
import { bankChangeRequestsExamples } from './bank-change-requests/examples.js';
import { bootstrapDocs } from './bootstrap/docs.js';
import { bootstrapExamples } from './bootstrap/examples.js';
import { changesDocs } from './changes/docs.js';
import { changesExamples } from './changes/examples.js';
import { channelsDocs } from './channels/docs.js';
import { channelsExamples } from './channels/examples.js';
import { dateAccessGrantsDocs } from './date-access-grants/docs.js';
import { dateAccessGrantsExamples } from './date-access-grants/examples.js';
import { datesDocs } from './dates/docs.js';
import { datesExamples } from './dates/examples.js';
import { sharedExamples } from './examples.js';
import { exportsDocs } from './exports/docs.js';
import { inboxDocs } from './inbox/docs.js';
import { inboxExamples } from './inbox/examples.js';
import { incidentsDocs } from './incidents/docs.js';
import { incidentsExamples } from './incidents/examples.js';
import { invitationsDocs } from './invitations/docs.js';
import { invitationsExamples } from './invitations/examples.js';
import { meDocs } from './me/docs.js';
import { meExamples } from './me/examples.js';
import { moderationDocs } from './moderation/docs.js';
import { moderationExamples } from './moderation/examples.js';
import { seatsDocs } from './seats/docs.js';
import { seatsExamples } from './seats/examples.js';
import { uploadsDocs } from './uploads/docs.js';
import { uploadsExamples } from './uploads/examples.js';

/** The studio document's introduction, and the docs and examples its modules register. */
export const studioDocs: ApiDocs = apiDocs({
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
  securitySchemes: {
    sessionCookie: {
      type: 'apiKey',
      in: 'cookie',
      name: 'arthome_studio_session',
      description:
        "Opaque session, `HttpOnly`/`Secure`/`SameSite=Lax` cookie. This is `studio-web`'s form.\n\n**In this mode, a request that writes carries `X-Arthome-Csrf`**: the value of the\n`__Host-arthome_studio_csrf` cookie the BFF sets beside the session cookie, readable by the page and\nbound to that session. Without it, or with another session's, the BFF answers `403`\n`api.forbidden`. Each such write declares it: the `csrfToken` scheme beside this one, and the\n`CsrfRefused` response. `If-Rights-Version` is optional and is no defence against it.\n",
    },
    csrfToken: {
      type: 'apiKey',
      in: 'header',
      name: 'X-Arthome-Csrf',
      description:
        "The `__Host-arthome_studio_csrf` cookie's value, echoed by a write made with the session\ncookie (see `sessionCookie`). Required together with it, never with a bearer token.\n",
    },
    bearerToken: {
      type: 'http',
      scheme: 'bearer',
      bearerFormat: 'opaque',
      description:
        '**`studio-mobile` cannot hold its session in a cookie**: `capacitor://localhost` is a\nthird-party context on iOS. The studio BFF therefore offers a **bearer-token** session\nalongside the cookie session — a refresh token bound to the device, kept in the native store\n(`@capacitor/preferences`, **never `localStorage`**), a short access token, revocation per\ndevice.\n\nOn returning from the background with an expired token: **silent refresh**. A\nre-authentication while on duty is an operational fault. It is required only for\n**sensitive operations** — revealing or rotating a stream key, transferring ownership of a\nchannel, changing a payout method — and it is then asked for **at the moment of the\noperation**, not on returning to a screen.\n\nAllowed origins on the CORS side, as **literal strings**: `capacitor://localhost` and\n`https://localhost`. A bare `localhost` entry covers neither, `*` is illegal with credentialed\nrequests, and a framework that normalises the origin through a URL parser would reject\n`capacitor://`.\n',
    },
  },
  modules: [
    authDocs,
    bankChangeRequestsDocs,
    bootstrapDocs,
    changesDocs,
    channelsDocs,
    dateAccessGrantsDocs,
    datesDocs,
    exportsDocs,
    inboxDocs,
    incidentsDocs,
    invitationsDocs,
    meDocs,
    moderationDocs,
    seatsDocs,
    uploadsDocs,
  ],
  examples: [
    sharedExamples,
    authExamples,
    bankChangeRequestsExamples,
    bootstrapExamples,
    changesExamples,
    channelsExamples,
    dateAccessGrantsExamples,
    datesExamples,
    inboxExamples,
    incidentsExamples,
    invitationsExamples,
    meExamples,
    moderationExamples,
    seatsExamples,
    uploadsExamples,
  ],
});

/** Each studio operation's prose and doc-only metadata, by route: for a server's own docs. Server only. */
export const studioDocsOf: (route: RouteDefinition) => OperationDocumentation =
  documentationLookup(studioDocs);
