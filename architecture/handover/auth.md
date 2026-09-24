# auth — handover

Only what you cannot recover from the code or `git log`. The ADR (`architecture/adr-auth.md`,
1015 lines) is the artefact; read it. This is what it does not tell you.

## 1. §12.5 is closeable and the ADR does not know it

The ADR still says the pairing alphabet "exists only in prose" and still carries the provisional
block with the literal string. **That was true when I wrote it and is false now.**
`backend-domain` exported `PAIRING_CODE_ALPHABET` from `packages/core/src/pairing/pairing-code.ts`
after my last report and I was stood down before editing §5.1. I verified it and did not get to
act on it:

- value is byte-identical to the ADR's (`ACDEFHJKLMNPQRTVWXY23456789`), exclusions exactly
  `0 1 B G I O S U Z`, nine of them;
- `pairing-code.spec.ts` green, 11 tests, and they compute survivors **from the string** rather
  than restating them.

So: replace the §5.1 provisional block with the identifier, delete the literal, close §12.5.
**What would be wrong**: closing it by deleting the block without first checking the exported
value against the ADR's. The invariant admits **960 conformant alphabets** (3 × 2⁵ × C(5,3)), so
"the spec is green" does not mean "it is our alphabet". Diff the strings.

## 2. The check script never existed as a file, and half of it still has no home

Three drifts in this ADR were caught by assertions I ran ad hoc in a shell. They were never
committed. `pairing-code.spec.ts` now covers the *core* side. **Nothing covers the ADR side**, and
that is where all three drifts happened. If you touch §5.1, re-run these against a **named
revision** (`git show <sha>:architecture/adr-auth.md`), never the working tree:

- the alphabet literal appears **zero** times once §12.5 closes (it was twice for two commits —
  see §5 below);
- `0123456789ABCDEFGHJKMNPQRSTVWXYZ` (the seat alphabet) appears **nowhere** — restating it is the
  E2 parallel-literal fault in prose;
- `ATH` appears nowhere: `SEAT_CODE_PREFIX` is module-private on purpose, so the composed shape is
  built and checked in one place;
- six confusable classes keep exactly one member, one keeps three (`C D Q`), **none keeps two** —
  two survivors is the case where a misread yields a code that is valid but wrong.

## 3. Three better-auth behaviours that will each cost you a day

- **`signOut` revokes ALL of the user's sessions.** On a shared television that is catastrophic
  and looks like a bug report about "signing out of one profile logged everyone out". Per-profile
  sign-out is `multi-session.revoke`, a different route. Two gestures, never one for the other.
- **`bodyParser: false` belongs to the `identity` app, not the BFF.** It is required by
  `@thallesp/nestjs-better-auth`. Applied to a BFF it breaks every other route there.
- **There is no TypeORM adapter and there will not be one.** better-auth writes through Kysely.
  It owns schema `auth`; TypeORM owns `public`. No TypeORM entity may map a better-auth table —
  the domain holds a bare `user_id`. Two migration tools, one database, never interleaved in a
  deploy recipe.

Also: better-auth signs **EdDSA** by default and we require **ES256** everywhere. `@nestjs/jwt`
(jsonwebtoken 9) cannot verify EdDSA at all, and the CDN edge verifying playback tokens leans on
WebCrypto, where Ed25519 support is uneven. If you ever see an EdDSA token, something regressed.

## 4. Two routes that must NOT be relayed, which is the opposite of the obvious reading

"The BFF exposes `/v1/auth/*` as a documented relay" reads as *relay everything*. Two exceptions
carry real consequences and a newcomer will undo them:

- **`/jwks` is not relayed.** The JWKS is a static document served by the CDN. Relaying it puts
  the key-discovery path back through a BFF and reintroduces exactly the dependency §8.1 removes.
- **`/device/*` is not relayed.** It is consumed *by* the BFF behind `/v1/pairings`, so that the
  pairing primitive stays single. And `device/approve` / `device/deny` are never exposed raw:
  CVE-2026-45337 was precisely that better-auth treated any authenticated session as the owner of
  any pending `user_code`. **The ownership guard is ours, at the BFF, five lines, and it must
  stay ours.** Delegating it back is the one change that silently reintroduces a known CVE.

## 5. Where the TV's seat purchase lives, because nobody would look there

A television buying a seat does **not** go through `ticketing` first. `identity` owns the pairing
rendezvous — one `device_pairing` row, an opaque `outcomeRef`, nothing about seats or money — and
the *phone* runs the ordinary purchase journey with its own `Idempotency-Key`. Grep `ticketing`
for a short code and you will find nothing, correctly. Four of the five pairing intents
(`seat`, `plan`, `payment-method`, `merch`) are **not OAuth flows**; only `signin` is RFC 8628.
The shared thing is the rendezvous state machine, not the protocol. A fresh agent who "fixes"
this by routing all five through better-auth's device plugin will have re-implemented ticketing
inside `identity`.

## 6. What is written cautiously and is NOT settled

Read these as open, not as decided:

- **`capacitor://localhost` as a secure context in WKWebView is unverified.** `studio-mobile`
  flagged it; nobody has run it on a device. Web Crypto and `getUserMedia` depend on it.
- **S5 was never executed.** The native OAuth return — system browser, universal link, one-time
  state exchanged for a bearer token — is a *mechanism I reasoned through*, not a measurement. The
  case to exercise first is the OS killing the app mid-detour.
- **better-auth's input normalisation over a restricted subset alphabet is read from its
  documentation, not measured.** Specifically: that a lower-case code with an embedded space is
  still accepted when `generateUserCode` narrows the alphabet. If it is not, §5.1's normalisation
  table needs to move entirely into our own code.

## 7. A correction I owe

I twice reported line counts for this ADR (924, 966) that were my own earlier figures rather than
measurements against a named revision, and the lead relayed them as verified. Neither matches any
commit; the real sequence is 846 → 896 → 900 → 933 → 992 → 1015. Worse, a later check of
"1015 lines in HEAD" passed while HEAD carried a defect the tree had fixed — the fix was a
same-line substitution, so **the line count was invariant under the exact defect it was being used
to rule out**. If you report a number about a shared tree, name the revision you measured it
against, and make sure the thing you measure can fail for the reason you care about.
