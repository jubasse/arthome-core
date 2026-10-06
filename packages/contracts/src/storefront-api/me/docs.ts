import { Service } from '@arthome/core';

import type { ModuleDocs } from '../../openapi/docs.js';

export const meDocs: ModuleDocs = {
  addPasskey: {
    description:
      'Returns the enrolment options produced by the server; the surface passes them to the browser\nor platform API, then returns the attestation to `PUT`. **The secret never leaves the\nhardware.**\n',
    upstream: [Service.IDENTITY],
  },
  removePasskey: {
    description:
      "**Refused if it is the account's last credential** (`LAST_CREDENTIAL`): an account with no way to sign in is a lost account.",
    upstream: [Service.IDENTITY],
  },
  addPaymentMethod: {
    description:
      '**The only surface able to register a card was the one with no keyboard.** The\n`payment_method` intent existed for television pairing, and the account\'s Security section\ndisplayed "Payment methods · Manage" without any command reaching it.\n\n**No card number touches our domain**: the command returns a setup `clientSecret`, and the\nsurface\'s payment element takes it from there — that is what keeps the compliance scope as\nnarrow as possible.\n',
    upstream: [Service.TICKETING],
  },
  removePaymentMethod: {
    description:
      "**Refused if it is the last method of an active subscription** (`payment_method.in_use`):\nsilently removing a subscription's only card would produce a failed charge and a cancelled\nplan that nobody intended.\n",
    upstream: [Service.TICKETING],
  },
  getAccountScreen: {
    description:
      'The eleven sections share **one** account shape. They justify neither eleven calls nor eleven\nschemas: eight are projections of this one. Only saved searches, orders and notifications are\npaginated separately.\n',
    upstream: [Service.IDENTITY, Service.TICKETING, Service.NOTIFICATIONS],
  },
  listMyTickets: {
    description:
      'The order is **server-side**: a date carrying an outcome rises to the top, because it calls\nfor action. No surface reorders.\n',
    upstream: [Service.TICKETING, Service.CATALOG, Service.STREAMING],
  },
  listMyReplays: {
    description:
      'Each entry carries `replay.expiresAt` as an **instant**; the surface derives "expires in 41 h" against `servedAt`, with no call.',
    upstream: [Service.TICKETING, Service.CATALOG, Service.STREAMING],
  },
  listWatchlist: {
    description:
      '"My list" — complete cards, not identifiers: the surface must be able to paint without a\nsecond call per entry.\n',
    upstream: [Service.IDENTITY, Service.CATALOG],
  },
  addToWatchlist: {
    description:
      '**A state assignment, not a toggle.** Two submissions of the same gesture leave a single\nentry; a toggle on an unreliable network would invert the result. Returns the updated card,\nso the surface repaints without a second round trip.\n',
    upstream: [Service.IDENTITY],
  },
  removeFromWatchlist: {
    description:
      'Replayed on an already-removed entry, it **succeeds** — an idempotent deletion must not fail.',
    upstream: [Service.IDENTITY],
  },
  listFollowedArtists: {
    description:
      "**The whole page was unserved.** `/v1/me/follows/{artistId}` exposed only `PUT` and\n`DELETE`, `/v1/artists` accepted no filter on following, and `AccountScreen` carried no list.\nThe only way to paint the screen was to walk `/v1/artists` in full and filter client-side —\nthat is, exactly what the contract forbids elsewhere, and rightly so.\n\n**The home page's `followed` rail was no substitute**: it carries `DateCard`s, hence\nannounced dates, whereas half of this page is made of followed artists **with no date** — and\nit has no sort, no remove-in-place, and no empty states of its own.\n\nThe contract in fact contradicted itself: `emptyReason` carried `no_followed_artist_live`,\n**an empty state for a list no operation produced**.\n\nIt also serves `account/faves`, of whose two collections this is the first — the second being\n`/v1/me/watchlist`.\n",
    upstream: [Service.IDENTITY, Service.CATALOG, Service.NOTIFICATIONS],
  },
  followArtist: {
    description:
      '**Following and being alerted are two settings.** `followArtist` is a catalogue relation; the\nalert is a flag **per followed artist** carried by `notifications` (`alertEnabled` below).\nConflating them would make it impossible to follow an artist without being notified — and the\nmobile design shows the two separately.\n',
    upstream: [Service.IDENTITY, Service.NOTIFICATIONS],
  },
  unfollowArtist: {
    description:
      '**A state assignment, not a toggle.** Returns the updated artist, so the surface repaints\nwithout a second round trip. It does not touch the alert flag, which is a distinct setting\ncarried by `notifications`.\n',
    upstream: [Service.IDENTITY],
  },
  setReminder: {
    description:
      '**A reminder is a dated promise.** If the date is postponed, the reminder **follows** the\npostponement; if it is cancelled, the reminder is **cancelled** and not sent into the void.\nThe lead time (30 min) is a **served** domain constant, not a surface choice.\n',
    upstream: [Service.NOTIFICATIONS],
  },
  clearReminder: {
    description:
      'Clears the reminder. Replayed on an already-cleared reminder, it succeeds — it is queued\noffline, so it must be safe on replay.\n',
    upstream: [Service.NOTIFICATIONS],
  },
  listSavedSearches: {
    description:
      '**Zero counting queries on opening.** The "new since your last visit" counter is incremented\nby the index\'s percolator when a new date matches, and reset to zero on read. The two other\noptions would cost ten aggregations per display, for a figure whose accuracy nobody will ever\nmeasure.\n',
    upstream: [Service.CATALOG],
  },
  createSavedSearch: {
    description:
      'The **signature** is produced by `normalizeSearchCriteria()` in `@arthome/core`,\nserver-side, once. It is what deduplicates: a replay **never** creates two identical\nalerts.\n',
    upstream: [Service.CATALOG],
  },
  updateSavedSearch: {
    description:
      '**Field-by-field** write, never a whole document. A saved search is queued offline: a replay\nmust converge to the same state, not invert it.\n',
    upstream: [Service.CATALOG],
  },
  deleteSavedSearch: {
    description:
      '**Replayed on an already-deleted entry, it succeeds** — that is what an offline queue requires.',
    upstream: [Service.CATALOG],
  },
  listMyOrders: {
    description:
      'An order may **not be ours**. `externalRef` is served **with its age**: what we guarantee is\nfreshness as of `syncedAt`, nothing more. When the external host does not answer, the age\ngrows — **nothing fails**.\n',
    upstream: [Service.TICKETING],
  },
  listNotifications: {
    description:
      'The `unreadCount` badge is **global**, not the page\'s: otherwise the surface would display\n"3" having loaded only the last twenty.\n',
    upstream: [Service.NOTIFICATIONS],
  },
  markNotificationsRead: {
    description:
      '**Monotonic: one does not un-read.** Replayed, it changes nothing — which is what makes it safe in an offline queue.',
    upstream: [Service.NOTIFICATIONS],
  },
  updateProfile: {
    description:
      '**Field by field**, never a whole document, and conditioned on `expectedVersion`: two devices do not silently overwrite each other.',
    upstream: [Service.IDENTITY],
  },
  updatePreferences: {
    description:
      '**Two scopes, and the contract separates them field by field**: `account` follows the\nperson, `device` follows the device and the room. A single scope would be wrong half the\ntime.\n\n**Additive and tolerant**: a key unknown to one version of the application is neither\nrejected nor erased on the next write — otherwise the mobile version stuck in store review\nwould overwrite settings made from the web.\n',
    upstream: [Service.IDENTITY],
  },
  updateNotificationPreferences: {
    description:
      '**The quiet-hours exception is conditioned on holding a seat**: that is a business rule, not\nan interface setting — one does not miss a show one paid for because it starts at 11:15 pm.\nThe **thresholds** that fire an alert live in `@arthome/core` and are served in\n`ViewerContext`; `notifications` reads them, it does not invent them.\n',
    upstream: [Service.NOTIFICATIONS],
  },
  updateConsents: {
    description:
      '**Never queued offline**: a consent has evidential value, it must be timestamped **by the\nserver** and carry the **version of the text accepted**. A consent without a version or a\ndate is worth nothing. `ads` defaults to `false`, and that default is **a contract\ndecision**, not a setting.\n',
    upstream: [Service.IDENTITY],
  },
  revokeDevice: {
    description:
      '**An observable effect on the targeted device, within 120 seconds at most.** Revoking\nremoves the `Device`, **all** its `DeviceSession`s **and its playback leases**: `identity`\npublishes `device_revoked`, `streaming` consumes it and refuses the **next renewal** of the\ntoken. The device displays `identity.signed_out_elsewhere`, **not a network error**.\n\n**Never queued offline**: this is a security command, it must fail loudly rather than be\nreplayed blind.\n',
    upstream: [Service.IDENTITY],
  },
  signOutProfile: {
    description:
      '**Two gestures, and they do not do the same thing.** This one closes a `DeviceSession`: the\nliving-room television keeps its four other profiles. `revokeDevice` removes the device and\neverything attached to it.\n',
    upstream: [Service.IDENTITY],
  },
  requestExport: {
    description:
      '**Asynchronous.** A tax ledger or a GDPR export is not an HTTP response: the command returns\nan acknowledgement and an identifier, the state is pollable, and the document arrives through\na short-lived signed address — **usable without a session cookie**, because an export\nprotected by a cookie is undownloadable from a native shell.\n',
    upstream: [Service.IDENTITY, Service.TICKETING],
  },
  getExport: {
    description:
      'An export is an **asynchronous job**. Until it is `ready`, `downloadUrl` is null: the\ncontract never serves an address that would not answer. The address is valid for 60 minutes\nand works **without a session cookie**.\n',
    upstream: [Service.IDENTITY, Service.TICKETING],
  },
  requestAccountDeletion: {
    description:
      '**A financial command as much as a personal one.** "Deletion cancels unused seats": it\ntherefore triggers refunds, touches payouts that may already be computed, and runs into the\nten-year accounting retention. It **can be neither synchronous nor total**.\n\nThe sequence is a **persistent saga**: the account moves to `deletion_requested`, sign-ins\nare blocked, `ticketing` cancels and refunds, `payouts` recomputes; a **30-day grace period**\nruns, during which the account is **reactivated by simply signing in** — which is what makes\nthe irreversible acceptable; at the end, `identity` **anonymises** instead of deleting.\nInvoices keep their frozen contents.\n',
    upstream: [Service.IDENTITY],
  },
  cancelAccountDeletion: {
    description:
      'The account is **reactivated by simply signing in** during the 30 days of grace, and that is\nexactly what makes the irreversible acceptable. What this command **does not undo**: seats\nalready cancelled and refunded. The contract says so rather than letting anyone assume\notherwise.\n',
    upstream: [Service.IDENTITY],
  },
  recordPlaybackPosition: {
    description:
      '**The most frequent write in the system.** It carries **no** idempotency key: one key per\n30 s slice, per viewer and per live show would make the idempotency store the hottest table\nin `streaming`, to protect a write whose loss has no consequence.\n\nExpected cadence: **on pause, on exit, on end, and a 30-to-60 s heartbeat**, plus a **forced\nwrite when going to the background**.\n\n**A late write is accepted**: the last position must be taken even if it arrives **after** a\n`releasePlayback` — a television can be cut off at any moment.\n\n**Last writer wins, and the ordering comes from the server.**\n\n**No position is recorded during a live** (D-111): a live gives no control of playback, so no\nresume point comes from it. A write then is answered with the stored point, unchanged, so an old\nclient stays harmless.\n',
    upstream: [Service.STREAMING],
    idempotencyExemption:
      '**The most frequent write in the system.** One key per 30-second slice, per viewer and per\nlive show would make the idempotency store the hottest table in `streaming` — to protect a\nwrite whose loss has no consequence and whose rule is already "last writer wins, server\nordering". The cost would be per minute of playback and per viewer.\n',
  },
};
