import { Service } from '@arthome/core';

import type { ModuleDocs } from '../../openapi/docs.js';

export const chatDocs: ModuleDocs = {
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
  reportChatMessage: {
    description:
      'A report creates a **queue row** (`reported`), not a sanction. The three axes never stack.',
    upstream: [Service.CHAT],
  },
};
