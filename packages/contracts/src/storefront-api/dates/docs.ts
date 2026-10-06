import { Service } from '@arthome/core';

import type { ModuleDocs } from '../../openapi/docs.js';

export const datesDocs: ModuleDocs = {
  // `chat` is not called: the chat mode is already projected into `date_detail_public` by
  // `chat.date_chat_policy_changed`, which is what keeps this screen under the threshold of 4 upstreams.
  getDateDetail: {
    description:
      '**One call**, and it must be **cheap**: the television surface prefetches it for the focused\nitem once the focus has settled, and a prefetch paid for twice is worse than no prefetch at\nall. Hence a cache validator (`ETag`) and a declared freshness.\n\n**Public read.** Called **with no authentication at all**, this operation returns the\n**public body** — identical for every anonymous caller, hence shareable in a common\ncache. The three per-viewer overlays (`watchVerdict`, `viewerRelations`,\n`viewerProgress`) are then **absent**, never null. Called with a session or a bearer\ntoken, it returns the public body **plus** the overlays, and becomes private.\n',
    upstream: [Service.CATALOG, Service.TICKETING, Service.IDENTITY, Service.STREAMING],
  },
  refreshDateAvailability: {
    description:
      'The only legitimate call from a television\'s booking screen: the date is already in hand,\nonly the capacity moves. `validUntil` is short, `AVAILABILITY_VALID_SECONDS` after `servedAt`\n(`@arthome/core`), because the "show already started" price is **pro rata to the time\nremaining**.\n\n**Public read.** Called **with no authentication at all**, this operation returns the\n**public body** — identical for every anonymous caller, hence shareable in a common\ncache. The three per-viewer overlays (`watchVerdict`, `viewerRelations`,\n`viewerProgress`) are then **absent**, never null. Called with a session or a bearer\ntoken, it returns the public body **plus** the overlays, and becomes private.\n',
    upstream: [Service.TICKETING],
  },
  quoteSeat: {
    description:
      "**The four lines come from the contract**: tier, service fee, subscription discount,\npromotion. Discount and promotion **do not stack** — the one most favourable to the viewer\nwins, and the rule lives in `@arthome/core` (D-017). Otherwise it would be written three\ntimes.\n\n**Past the end of seat sales**, thirty minutes after the start (D-089), the quote is refused\nwith `409` `order.sales_closed` and `salesEndAt`, as the purchase is.\n\n**From an open priority pool** (D-083), a notified account's quote carries `priorityUntil`: the\npool is the caller's to buy from until then.\n",
    upstream: [Service.TICKETING],
    idempotencyExemption:
      '**A read disguised as a `POST`: it is a `POST` because its criteria do not fit in a URL, not\nbecause it writes.** A quote computes, it creates nothing — so there is no effect to\ndeduplicate.\n\n**And a key would protect nothing here**, because freshness is already guaranteed elsewhere:\nthe price carries its `validUntil`, and `expectedTotal` is **mandatory** at purchase — a\nstale price is refused by `order.price_stale` at the moment that matters, not at quoting time.\n\n**Worse: it would do harm.** The regime replays the original response **verbatim**, so a\nreplayed quote would be a quote **already part-spent, or expired** — or a price that the\npro-rata promotion has since made wrong. Same reason as a token renewal: what is being asked\nfor is a fresh value.\n',
  },
  enterSalesQueue: {
    description:
      "**A state assignment, not a toggle**: one entry per account and date, and entering again keeps\nthe place already taken. The queue serves in arrival order (D-081). No `Idempotency-Key`: the\nentry makes a second call harmless by itself (see the exemption).\n\n**An admission that lapses unused sends the account to the end of the queue**, in the spirit\nof the waiting list's one chance per registration (D-083): a turn kept after it passed is\ntaken from everyone behind.\n\n**A queue that is not armed admits nobody**: it answers `armed: false`, and the surface goes\nback to `purchaseSeat`, which needs no admission then. Admitting there would let an account\ncollect admissions ahead of the arming and walk past the queue once it arms.\n\n**The session names the account, never the path**, and the response speaks of the caller's\nentry alone: nobody else's position, account or admission.\n",
    upstream: [Service.TICKETING],
    maturity: 'provisional',
    maturityReason:
      'the sales queue entered the contract at provisional maturity (D-081) and is not built',
    idempotencyExemption:
      '**Idempotent by construction**: one entry per account and date, so a second call finds the\nfirst entry and answers its current state. A key would put a durable write per entrant in\nfront of the queue built to shed that load, and would replay a position that is stale seconds\nafter it was served.\n',
  },
  getSalesQueuePosition: {
    description:
      "**Polled at the cadence it serves**: `pollIntervalSec` is the pairing's served decay\n(`adr-auth.md` §5.3), not a second one, and the surface never polls faster.\n\n**`validUntil` is the next poll while `waiting`, and the admission's `expiresAt` once\n`admitted`.** Either countdown is computed against `servedAt`.\n\n**`no-store`**: a position and an admission are one account's, and perishable.\n",
    upstream: [Service.TICKETING],
    maturity: 'provisional',
    maturityReason:
      'the sales queue entered the contract at provisional maturity (D-081) and is not built',
  },
  getWaitlistRegistration: {
    description:
      "The caller's registration on a date's waiting list, and nobody else's: the session names the\naccount, never the path. `state` is `null` when the account never registered, and `joined` is true\nfor `waiting` or `notified` only.\n\n**While the caller is `notified` into an open window** (D-083), the answer serves `priorityUntil`\nand `priorityPoolSeats`, the pool's seats left. The public count, read from availability, leaves the\npool out, so the BFF adds them to build the caller's seat standing. Outside a window\n`priorityPoolSeats` is absent, and `priorityUntil` is `null` unless the caller is `notified`. A tier\nopened with `notifyWaitlist: false` makes no pool (D-094), and an entry its date's cancellation or\ninterruption ended is `closed` (D-096).\n\n**`no-store`**: a registration is one account's, and its window is perishable.\n",
    upstream: [Service.TICKETING],
  },
  joinWaitlist: {
    description:
      "**A state assignment, not a toggle**: two submissions leave one registration, and the answer is\nthe caller's registration as `getWaitlistRegistration` serves it.\n\n**Joined only once the date is sold out**: while public seats remain it is refused with `409`\n`waitlist.not_sold_out`, and the surface offers the purchase instead. Once sales have ended, by\ntime (D-089) or because the date was cancelled or interrupted, it is refused with `409`\n`order.sales_closed` and `salesEndAt`. A postponed date keeps its list.\n\n**Everyone registered gets the same chance** (D-083): there is no rank among them, so\n`rankDisclosed` is `false`. A tier opening notifies the whole list at once, and each notified\naccount may buy from the priority pool until `priorityUntil`, first come first served; an account\nthat joins while a window is open is `notified` into it at once. One that does not buy in the\nwindow becomes `lapsed`, and joins again to be told next time. The window's length is served in\n`priorityWindowHours`, never written into the surface.\n\n**A tier opened with `notifyWaitlist: false` notifies nobody and makes no pool** (D-094). **A\ncancellation or an interruption ends the list** (D-096): every entry becomes `closed`, and nobody is\ntold beyond the date's own card.\n",
    upstream: [Service.TICKETING],
  },
  leaveWaitlist: {
    description:
      '**A state assignment**, like joining. Replayed on an already-removed registration, it\nsucceeds — an offline queue replays, and a failure there would be a false negative. Leaving while\n`notified` gives up the priority window.\n',
    upstream: [Service.TICKETING],
  },
  listChatMessages: {
    description:
      '**No backward pagination on a live chat**: nobody scrolls back through a chat with a remote\ncontrol, and on all three surfaces it is a sliding window. The full history is read on the\n**replay**, replayed by `atMediaSec`.\n\nCatch-up on entry is **served per surface**: 20 messages on television, 50 elsewhere. **No\nremoved message ever reaches a public surface** — moderation is a state on the `chat` side,\nand the stream served is already filtered.\n',
    upstream: [Service.CHAT],
  },
  sendChatMessage: {
    description:
      '**Never queued offline**: a message replayed ten minutes later no longer means anything. It\nis **dropped**, not queued.\n\nThe position in the media (`atMediaSec`) is **provided by the client**, because only the\nclient knows where its playback has reached; the absolute instant is set by the server. Both\ntravel, never one alone.\n\nThe **rate limit is in the contract**, not merely enforced: `chat.rate_limited` carries\n`retryAfterMs`, so the surface can **disable the input cleanly** instead of stacking up\nrefusals.\n',
    upstream: [Service.CHAT],
  },
  sendReaction: {
    description:
      '**The quota travels with the response** — how many are left, when it recharges — so that the\nsurface can **disable** the control rather than let it fail. An inert action is forbidden by\nthe brief; an action that fails silently is worse. **One reaction in flight at a time.**\n',
    upstream: [Service.CHAT],
    idempotencyExemption:
      '**The quota already bounds the effect**, and it is served with the response. A replayed key\nwould return a **stale** quota — "17 left" when 12 are left — which is worse than no response\nat all: the surface disables its control on that number.\n',
  },
};
