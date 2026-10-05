import { Service } from '@arthome/core';

import type { ModuleDocs } from '../../openapi/docs.js';

export const pairingsDocs: ModuleDocs = {
  createPairing: {
    description:
      "**One command, one shape, one state machine, five intents.** The television accepts no input\nbeyond six characters: every payment goes through here, therefore through the phone.\n\n**`signin` is the only true RFC 8628**; the other four are **transaction appointments** —\nbuying from an already signed-in television is not a token request. What is shared is the\nstate machine; what differs is the effect of approval.\n\n**For `seat`, the pairing's lifetime is the lifetime of a seat hold placed by `ticketing` at\ncreation**: without that hold, the capacity shown on the television is false for five\nminutes — exactly the defect the television reported.\n\n`signin` opens with the **device token alone**, without a session. The other four require a\nsession on the television.\n\n**A seat pairing goes through the date's sales queue like every other purchase** (D-086).\nWhile the queue is armed, the television shows it, and `seat` opens only with the admission\nin `X-Arthome-Admission-Token`, since opening is what places the hold; without one it is\nrefused with `403` `order.sales_queue_admission_required`. First come, first served, with no\nway around it through the television.\n",
    upstream: [Service.IDENTITY, Service.TICKETING],
  },
  pollPairing: {
    description:
      '**RFC 8628-compliant polling, not the real-time channel.** Bringing a device identity into\nthe WebSocket namespace at `signin` time would widen its attack surface to save a few hundred\nmilliseconds.\n\nThe requirement "switch within two seconds at most" is met by a **served decay**:\n`pollIntervalSec` is 2 for the first 60 seconds, then 5 — so it stays under the server\'s\ncontrol, and it costs thirty requests per pairing at most. **The surface never polls faster\nthan the interval it is served.**\n\n**Works with the device token alone**, without a session: that is what allows reattachment\nafter the television restarts.\n\nThe response is **complete**: the confirmation screen costs **zero further calls**.\n\n**Slow down (`429`).** RFC 8628 `slow_down` (`pairing.slow_down`, with `Retry-After-Ms`): the surface **slows down**, it does not retry faster.\n',
    upstream: [Service.IDENTITY, Service.TICKETING, Service.CATALOG],
  },
  cancelPairing: {
    description:
      'Triggered by the Back button. The television often leaves without waiting for the response.\n**`pairing.execution_engaged` (`409`) — the pairing can no longer be cancelled.** The phone has\nentered the payment journey; cancelling here would orphan a purchase in flight.\n\n**What the surface does with this refusal**: it **stays on the waiting screen** and keeps\npolling. It does not go back. This is the only case in the contract where pressing Back does\nnot go up one level, and the reason is written down: we do not let a remote control cancel a\npayment it triggered itself.\n',
    upstream: [Service.IDENTITY],
  },
  engagePairing: {
    description:
      "**This operation exists to close a race that costs real money.**\n\nThe sequence without it: the viewer scans the QR, pays on their phone, and presses **Back**\nwhile the payment is executing. The television sends its `DELETE`; `ticketing` has already\ncharged; the decision arrives afterwards and receives `410`. **The seat is paid for, the\nphone shows a failure, the television has gone back, and the money is gone.** The contract\nhandled the reverse order — approval then cancellation — and not this one, which is the more\nlikely of the two: executing a payment takes seconds, pressing Back is instant.\n\n**Called by the BFF on the phone's behalf**, at the moment the phone enters the payment\njourney — hence **before** `ticketing` executes, not after. It moves the pairing from\n`pending` to `engaged`, and from then on `cancelPairing` answers `409`.\n\n**It applies only to the four purchase intents.** `signin` commits no money: a sign-in\npairing stays cancellable until its decision, and calling this on one is refused.\n\n**Idempotent**: a second call on an already `engaged` pairing returns the same state, not an\nerror — the phone may replay its entry into the journey on a network that switches over.\n\nRefused with `pairing.identity_mismatch`, or `pairing.intent_not_engageable` on `signin`.\n",
    upstream: [Service.IDENTITY],
  },
  decidePairing: {
    description:
      '**The ownership guard is written by us, not delegated.** CVE-2026-45337 showed what relaxing\nit costs: the plugin treated any authenticated session as the owner of any pending code.\n\nThree checks, in this order: the pairing is `pending` **or `engaged`** and not expired — an\nengaged pairing is precisely the one whose decision is awaited; if `intent = signin`, any\nvalid session suffices — **that is the nominal case, and it is the very meaning of "add an\naccount"**; otherwise, the bearer **is** the profile that opened the pairing, on pain of\n`pairing.identity_mismatch`.\n\n**No implicit profile switch.** It would charge the wrong payment method, credit the wrong\nrights and deliver the seat to the wrong account — in a living room, at the precise moment\ntwo people are watching the same screen. The phone offers "switch account": a gesture by the\nperson, never by the system.\n\nRefused with `pairing.identity_mismatch` — the bearer is not the profile that opened the pairing. Impossible on `signin`.\n',
    upstream: [Service.IDENTITY],
  },
};
