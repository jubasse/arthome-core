import { Service } from '@arthome/core';

import type { ModuleDocs } from '../../openapi/docs.js';

export const meDocs: ModuleDocs = {
  createReauthToken: {
    description:
      "**Four commands declared it `required` and no entry point issued it**: revealing a stream\nkey, rotating it, transferring ownership of a channel, deleting a channel. The contract\ndemanded a token it did not offer.\n\n**The factor is served, not guessed.** `GET` returns `acceptedFactors` for this device and\nthis person; the surface offers what the server accepts, instead of assuming. This is the\nquestion being on duty asks: rotating a stream key is the stage manager's emergency gesture — the\none you make when you suspect a leak **during** a live show. If re-authentication is a\npassword to be typed in a dark room, one-handed, the guarantee is paid for in dead air.\n\n**What the contract guarantees**: `platform_biometric` is offered as soon as the device\ndeclares it, and **its failure closes nothing** — it falls back to the other accepted factors,\nlisted in the same response. A single factor that fails in the room is a blocked operator.\n\nThe token is **single-use**, short-lived, and **bound to the command it targets**: a token\nminted to reveal a key does not transfer a channel.\n",
    upstream: [Service.IDENTITY],
    maturity: 'provisional',
    maturityReason: 'studio re-authentication is not built',
  },
  listReauthFactors: {
    description:
      '**Served, so that the surface assumes nothing.** It offers what the server accepts, and it\nknows in advance whether a fallback exists when biometrics fail — which decides what interface\nto show in a room, one-handed.\n',
    upstream: [Service.IDENTITY],
    maturity: 'provisional',
    maturityReason: 'studio re-authentication is not built',
  },
  listStudioDevices: {
    description:
      "**The studio offered neither a list, nor revocation, nor sign-out**, while the answer to the\nsurface's question promised \"revocation per device\". What that is worth concretely: **a phone\nleft behind in a room opens a moderation console and the revelation of a stream key** — and,\na freelancer working across several channels, on channels that do not belong to its bearer.\nNeither the person nor the channel's owner had any gesture available.\n\nThe notion of a device here is the studio's **token-bearing session**, distinct from the\ntelevision's pairing device: here a device is the bearer of a refresh token bound to the\nnative store.\n",
    upstream: [Service.IDENTITY],
    maturity: 'provisional',
    maturityReason: 'studio device sessions (D-118) are not built',
  },
  revokeStudioDevice: {
    description:
      'Revokes the refresh token bound to this device. The effect is immediate on the console — the\nserver makes it leave the real-time rooms without waiting for a reconnection — and **at most\n60 s on commands**, the lifetime of the internal token already minted.\n\n**A security command: never queued offline.** It must fail loudly rather than be replayed\nblind.\n',
    upstream: [Service.IDENTITY],
    maturity: 'provisional',
    maturityReason: 'studio device sessions (D-118) are not built',
  },
  signOutStudio: {
    description:
      'The "My account" sheet carries "SIGN OUT" and the contract had no gesture for it. Closes\n**this** device\'s session and revokes its refresh token; the person\'s other devices stay\nsigned in.\n',
    upstream: [Service.IDENTITY],
    maturity: 'provisional',
    maturityReason: 'studio device sessions (D-118) are not built',
  },
  registerStudioPushToken: {
    description:
      '**The routing was settled, the recipient did not exist.** Duty alerts — moderation queue\nsaturated, no moderator assigned at D-1, unstable bitrate — arrive precisely when the\napplication is **not** in the foreground. Payload redaction was promised; the payload had\nnobody to go to.\n\n**A put, not an append**: re-registering the same token creates no duplicate, and a dead token\nis detached by the service when the provider reports it.\n\n**Redaction applies**: a notification never carries an amount if the recipient role lacks\n`canRevenue` — it is displayed on a locked screen.\n',
    upstream: [Service.NOTIFICATIONS],
  },
  updateStudioPreferences: {
    description:
      "**Two settings follow the person, not the channel**: the reading timezone and the\ncontrol-room layout. The timezone is **the same field** as the storefront's — same account,\none carrier only.\n\n**Never in `localStorage`**: it is bound to the origin, can be cleared by the OS, and travels\nin no way at all — yet the person moves from studio web to studio mobile within the same\nevening.\n\n**Additive and tolerant**: a key unknown to one version is neither rejected nor erased on the\nnext write, otherwise the mobile version under store review would overwrite settings made from\nthe web.\n",
    upstream: [Service.IDENTITY],
  },
  listDuties: {
    description:
      '`person_duties` is held by `identity` and carries **all** accessible channels. The overlap is\n**served** (`overlapsWith`), computed once in `@arthome/core`: a surface recomputing it would\nproduce a second implementation of the rule.\n',
    upstream: [Service.IDENTITY, Service.CATALOG, Service.STREAMING],
  },
};
