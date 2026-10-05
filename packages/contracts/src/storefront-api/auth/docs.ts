import { Service } from '@arthome/core';

import type { ModuleDocs } from '../../openapi/docs.js';

export const authDocs: ModuleDocs = {
  signUp: {
    description:
      '**A documented relay to `identity`, and the relay is mandatory, not preferable.** Three\nreasons, the first of which comes from our own tooling:\n\n1. **zod is the source and the OpenAPI is generated from it.** A transparent relay has no\n   schema, so it **would not appear in this document** — the six missing contracts would\n   stay missing. That is the decisive argument;\n2. **i18n by codes.** The authentication library answers in English sentences\n   (`"Invalid email or password"`), which the error envelope forbids. The BFF translates\n   into **codes**, envelope included;\n3. **rate limiting per `device_id`**, which the library cannot do: its ceilings are per\n   address or per session, and a living room behind a NAT shares its address.\n\nThe cookie, when there is one, is set on the **BFF\'s domain** — that is what lets the\nserver renderer read it, and what keeps critical rule 1 free of an exception through the\nauthentication door.\n\n**The public handle is generated, neutral, and changeable later** through `updateProfile`\n(D-101): a sign-up never fails on a handle, and nothing personal becomes public by\ndefault. A verification link is emailed at once; an unverified address blocks nothing\n(D-100), and `ViewerContext.account.emailVerified` says where it stands.\n\n**A taken email answers `409` `identity.email_taken`** (D-099). The status alone says the\naddress is registered, so what bounds enumeration is the rate limit, answered `429`.\n',
    upstream: [Service.IDENTITY],
  },
  signIn: {
    description:
      'Same relay, same translation into codes: `identity.invalid_credentials` **never** distinguishes an\nunknown email from a wrong password — the distinction would tell an attacker which accounts\nexist.\n\n`identity.two_factor_required` is an **intermediate** refusal, not a failure: it carries a\n`challengeId` to present to `/v1/auth/two-factor/verify`.\n',
    upstream: [Service.IDENTITY],
    idempotencyExemption:
      '**The one exemption that is not "nothing to deduplicate": this one is a prohibition.** The\nidempotency regime replays the original response **verbatim**; on a session opening, that\nwould amount to **returning a token without having verified the credentials**. A replayed\nkey would become a session bearer — and a stolen key, a stolen session.\n\nThe five other authentication routes do carry the key, because a replay there returns the\noriginal response rather than a `410` or a second effect: that is safe resumption. A\nsign-in, no — it must **always** re-authenticate. The protection against double submission\nhere is rate limiting per `device_id`, not the idempotency store.\n',
  },
  signOut: {
    description:
      "**The trap this operation exists to avoid.** The authentication library's `signOut` revokes\n**all** of the user's sessions. On a television shared by five profiles, that is never what\nanyone wants: it would sign out the whole living room.\n\n**Two gestures, two routes, never one for the other**:\n- **this one** closes the current session;\n- **`DELETE /v1/me/device-sessions/{sessionId}`** signs out **one profile** from a device\n  (`multi-session.revoke`), the other accounts staying signed in;\n- **`DELETE /v1/me/devices/{deviceId}`** removes the device, all its sessions **and its\n  playback leases**.\n\n**Order matters in `bearer` mode**: the session is destroyed server-side **then** the client\nclears its native store. Clearing the store is not revoking. In `cookie` mode, the cookie is\ncleared **with exactly the attributes that set it** — otherwise it is not cleared.\n",
    upstream: [Service.IDENTITY],
  },
  confirmEmailVerification: {
    description:
      '**The link points at the surface, never at the API**, which sends its token here. No\nsession is needed: the link is opened on whatever device read the email.\n\n**The token is spent by its first use and expires** (`adr-auth.md` §6.7). An unknown, an\nexpired and an already used token all answer the same `410`\n`identity.verification_link_invalid`: telling them apart would say which tokens were ever\nissued. A replay under the same `Idempotency-Key` answers the first `200` again.\n',
    upstream: [Service.IDENTITY],
  },
  resendEmailVerification: {
    description:
      'The fresh link replaces the earlier ones, which stop working. **`queued: true`** says the\nlink is recorded for `notifications` to send, which owns the sending; it does not say an\nemail left. **`queued: false` when the address is already verified**: nothing is queued,\nand that is not a refusal.\n',
    upstream: [Service.IDENTITY],
  },
  requestPasswordReset: {
    description:
      "**Always answers `202`, whether the account exists or not.** Distinguishing the two would\ntell an attacker which emails are registered.\n\n**The email's link points at the surface, never at the API** — `arthome.fr/reset?token=…` —\nand therefore **per product and per language**. The library's default builds it from its own\nbase address and would land the person on an API.\n",
    upstream: [Service.IDENTITY],
  },
  resetPassword: {
    description:
      '**Does not open a session.** The person signs in again, which proves the new password works\nand avoids an email link becoming a session bearer. The token is single-use and\nshort-lived.\n',
    upstream: [Service.IDENTITY],
  },
  startSocialSignIn: {
    description:
      "**The OAuth client is confidential and server-side.** No application embeds a secret: that\nis the only defensible form on a distributed binary, and the redirect is registered **once\nper provider**, on the BFF's domain.\n\n**The deep link on return never carries the token.** It carries only a **single-use opaque\nstate**, which the application then exchanges for its token over direct TLS with the BFF\n(`/v1/auth/exchange`). The return URL travels through the operating system, can be logged,\nand can be opened by another application.\n\n**Per surface**: browsers follow an ordinary redirect; native shells open the **system\nbrowser**, never their WebView, and come back through a universal link. **The television\ndoes no OAuth**: it goes through pairing, intent `signin`.\n",
    upstream: [Service.IDENTITY],
  },
  exchangeOneTimeToken: {
    description:
      '**This is what makes the journey replayable if the operating system kills the application\nduring the detour**: the pending state lives server-side, not in application memory. On\nreturn, the deep link says **where to go**, and this exchange says **what changed**.\n',
    upstream: [Service.IDENTITY],
  },
  changePassword: {
    description:
      '**The current password is required**, and that is not a formality: without it, a stolen\nsession would be enough to lock the owner out of their own account.\n\n**Other sessions are revoked** — this is the gesture one makes on suspecting a theft, and\nleaving the other bearers untouched would empty it of meaning. The current session survives:\nyou do not sign yourself out by changing your password.\n',
    upstream: [Service.IDENTITY],
  },
  enableTwoFactor: {
    description:
      '**The backup codes are returned here, once only.** They are never read back: the server\nkeeps only hashes of them. An operation able to repeat them would be able to read them, and\nit would no longer be a second factor.\n\nTwo-factor authentication is a **precondition** for transferring ownership of a channel on\nthe studio side: the contract refuses it without one.\n',
    upstream: [Service.IDENTITY],
  },
  disableTwoFactor: {
    description:
      '**Re-authentication required**: disabling a second factor is exactly what a session thief would try first.',
    upstream: [Service.IDENTITY],
  },
  verifyTwoFactor: {
    description:
      'Follows `identity.two_factor_required`. The `challengeId` is **short-lived and single-use**; a\nconsumed backup code cannot be replayed.\n',
    upstream: [Service.IDENTITY],
  },
};
