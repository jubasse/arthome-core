import { Service } from '@arthome/core';

import type { ModuleDocs } from '../../openapi/docs.js';

export const playbackDocs: ModuleDocs = {
  openPlayback: {
    description:
      "**This is the only evaluation of the right that is authoritative**, because it is the only\none that produces a token. The verdict served on a card is advisory (`advisory: true`); this\none is not.\n\n**The right is rechecked when playback starts, never inherited from the catalogue**: the\nviewer's country changes between the two — travel, roaming, a corporate network — and on\nmobile that gap is measured in hours.\n\n**Budget ≤ 1 s.** All the screen's material arrives here: chapters, tracks, chat mode,\nongoing incident, resume point, live edge, DRM, quality cap. No panel of the player should\ntrigger another call.\n\n**`Cache-Control: no-store`.** A right read back from disk is a false right.\n\n**Refused.** Each watch denial code produces a different screen (`watch.replay_expired` is a\n`410`, the others a `403`). On `watch.concurrent_limit_reached`, `params.activeSessions` carries the **list\nof active sessions** so the surface can offer to release one: a bare refusal would leave the\nviewer with no way out.\n",
    upstream: [Service.STREAMING],
    idempotencyExemption:
      '**Idempotency would be redundant here, because resumption already provides it.** An opening\non a `deviceId` that holds a live lease **resumes that lease** and returns the same\n`sessionId`: the effect of a second call is the effect of the first, by construction and not\nby memorisation. Adding a key would additionally memorise a `PlaybackTicket` — hence a signed\ntoken and its expiry instant — in a 24-hour store, for a response the contract says is\n**never** cached.\n',
  },
  renewPlaybackTicket: {
    description:
      '**Every 45 s**, for a 120 s token and a 90 s lease. It is the renewal that carries the\nconcurrent-screen limit: **the window during which someone watches a stream they are no\nlonger entitled to is exactly the renewal interval.**\n\nThe response contains **nothing that would force a manifest reload**: the path is stable,\nonly the signature changes.\n\n**Four distinct refusal codes**, because the surface displays four different messages. A\ngeneric code would produce a false one three times out of four.\n\n**Refused (`403`).** `SEAT_EXPIRED` · `watch.concurrent_limit_reached` · `identity.signed_out_elsewhere` ·\n`watch.preview_exhausted` · `DATE_INTERRUPTED`. `identity.signed_out_elsewhere` is what the television\nsigned out from the web sees — **not a network error**. **Real window: up to 120 s** — see\n`revokeDevice`.\n',
    upstream: [Service.STREAMING],
    idempotencyExemption:
      '**A renewal must produce a fresh window, never a memorised one.** Returning the original\nresponse would return a token already part-spent — and, at the worst moment, an already\nexpired one — when the call exists precisely to obtain a new one. It is also this renewal\nthat carries the concurrent-screen limit: replaying it from a store would bypass the count.\n',
  },
  releasePlayback: {
    description:
      '**Nothing depends on it.** A television is unplugged, a set-top box cuts out, the operating\nsystem kills a mobile application without warning: it is the **lease** that expires (90 s),\nnever this call that closes. A session that only closed on a client event would leave a ghost\nscreen, and the viewer would be refused their own second playback.\n\nThe client can **resume its own session**, identified by `deviceId`: reopening the player on\nthe same device reuses the lease instead of opening a second one.\n',
    upstream: [Service.STREAMING],
    idempotencyExemption:
      '**Idempotent by nature, and nothing depends on it.** Releasing twice leaves the same state,\nand it is the **expiring lease** that is authoritative — this call merely speeds things up. A\nkey would protect an effect that has neither accumulation nor consequence.\n',
  },
};
