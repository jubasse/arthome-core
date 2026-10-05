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
      '**The four lines come from the contract**: tier, service fee, subscription discount,\npromotion. Discount and promotion **do not stack** — the one most favourable to the viewer\nwins, and the rule lives in `@arthome/core` (D-017). Otherwise it would be written three\ntimes.\n\n**Past the end of seat sales**, thirty minutes after the start (D-089), the quote is refused\nwith `409` `order.sales_closed` and `salesEndAt`, as the purchase is.\n',
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
  joinWaitlist: {
    description:
      '**A state assignment, not a toggle**: two submissions leave one registration. The response\n**states the rank, or states that it will not state it** — it is never silent. The priority\nwindow (2 h) is served, never hardcoded in the surface.\n',
    upstream: [Service.TICKETING],
  },
  leaveWaitlist: {
    description:
      '**A state assignment**, like joining. Replayed on an already-removed registration, it\nsucceeds — an offline queue replays, and a failure there would be a false negative.\n',
    upstream: [Service.TICKETING],
  },
};
