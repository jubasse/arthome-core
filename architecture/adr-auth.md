# ADR — Authentication, session and device pairing

> **Status**: proposed · **Date**: 21 September 2026 · **Author**: `auth` specialist
> **Decides**: the authentication mechanism for the five surfaces, the session form per
> surface, and the **single device-pairing primitive** (RFC 8628) that serves the TV's five
> intents.
> **Does not decide**: the live playback token (→ `adr-stream-entitlement.md`), but
> §9 states how the two systems fit together.

---

## 1. What was verified online, and not from memory

My internal knowledge stops in May 2026. Everything below was re-read on
**21 September 2026** against vendor documentation, npm and GitHub. Decisive capabilities are
never asserted from memory.

| Verified fact | Source | Result |
|---|---|---|
| better-auth has a Device Authorization plugin | `better-auth.com/docs/plugins/device-authorization` + `npm view better-auth exports` | **Confirmed.** `./plugins/device-authorization` is exported by the published package |
| better-auth version and licence | npm, 14 Sept. 2026 | **1.7.5**, **MIT**, 30 k stars, published a week ago |
| TypeORM adapter for better-auth | `better-auth.com/docs/adapters/...` | **Does not exist.** Kysely (default), Drizzle, Prisma, Mongo, custom adapter |
| better-auth JWT / JWKS plugin | `better-auth.com/docs/plugins/jwt` | JWKS served, `jwksPath`, rotation (`rotationInterval`, `gracePeriod`), `kid`, `definePayload`, `issuer`/`audience`, private key encrypted AES-256-GCM at rest |
| better-auth short-code alphabet | plugin docs | `ABCDEFGHJKLMNPQRSTUVWXYZ23456789` — excludes `0/O` and `1/I`, **but keeps `5`+`S` and `8`+`B`** |
| Overriding identifier generation | `better-auth.com/docs/reference/options` | `advanced.database.generateId` accepts a **function** → UUIDv7 possible |
| Cap on simultaneous profiles per device | `multi-session` plugin | `maximumSessions`, **default 5**, per-session revocation |
| 2FA | `two-factor` plugin | TOTP + OTP + backup codes, encrypted secrets, 3 req/10 s built in |
| NestJS adapter | npm `@thallesp/nestjs-better-auth` | **2.8.0**, MIT, 3 Sept. 2026, peers `@nestjs/core ^11.1.6 \|\| ^12`, `better-auth >=1.5 <2`, `express ^5.1`, Node ≥ 22.22.1 |
| SuperTokens and the device flow | search + vendor docs | **Not implemented.** Mentioned as a roadmap possibility, not as a capability |
| Keycloak and the device flow | Keycloak docs | Native, enabled and advertised in `openid-configuration` by default. Apache-2.0 |
| Zitadel and the device flow | `zitadel.com/docs/guides/integrate/login/oidc/device-authorization` | Native. **AGPL-3.0-only** since v3 |
| Logto and the device flow | `docs.logto.io/quick-starts/device-flow` | Native, `urn:ietf:params:oauth:grant-type:device_code`. **MPL-2.0** |
| `typeorm` published | npm, 21 Sept. 2026 | **1.1.1** — matches the recorded `^1.1` |
| `jose` published | npm | **6.2.12**, MIT |

**Two dated security facts, found online, that bear on the decision:**

- **CVE-2026-45337** (better-auth) — the Device Authorization plugin treated **any authenticated
  session as the owner of any pending `user_code`**: the ownership gate on
  `POST /device/approve` and `/device/deny` short-circuited while `userId` was unset. Fixed in
  **1.6.11**. We are on 1.7.5, so covered — but this CVE **is exactly the TV specialist's
  question Q2**. It proves that binding a pairing to an identity is the hard part, and that it
  must not be delegated without a check of our own (§6.3).
- **CVE-2026-88770** (Keycloak) — Keycloak's device flow still issues tokens for an account
  locked by brute-force protection, the redemption step not checking the lock. The same class of
  defect, in the candidate reputed to be the most mature.

**Known limitation of the better-auth plugin**, found online: neither `/device/code` nor
`/device/token` accepts a `resource`/`audience` parameter — the flow returns an **opaque
better-auth session**, not a JWT restricted to an API. Of no consequence here: in our topology it
is the **BFF** that mints the internal token (§8), never the client.

---

## 2. Decision table — surfaces × needs × candidates

### 2.1 The candidates on the decisive capabilities

| | **better-auth 1.7.5** | **SuperTokens 24.x** | **Passport + in-house** | **Keycloak** | **Zitadel v3** | **Logto** |
|---|---|---|---|---|---|---|
| **Native device flow (RFC 8628)** | **yes**, dedicated plugin + `oauthProvider()` integration | **no** (roadmap) | no — to be written | yes | yes | yes |
| Short-code alphabet controllable | yes (`generateUserCode`, `userCodeLength`) | — | total | hard (server-side) | hard | hard |
| TTL per intent | via `expiresIn` + hooks, **to be composed** | — | total | no (per realm) | no | no |
| 2FA | TOTP/OTP/backup codes | yes | to be written | yes | yes | yes |
| Password reset | built in | yes | to be written | yes | yes | yes |
| Social Google/Facebook | built in | yes | via strategies | yes | yes | yes |
| OAuth return in **Capacitor** (`capacitor://localhost`) | `bearer` plugin → token outside the cookie | yes | to be written | possible, via AppAuth | possible | possible |
| OAuth return in **React Native** | `@better-auth/expo` (**requires Expo**); otherwise `bearer` | RN SDK | to be written | AppAuth | AppAuth | AppAuth |
| **JWKS + rotation** | `jwt` plugin: `kid`, `rotationInterval`, `gracePeriod` | yes | to be written | yes | yes | yes |
| Per-session / per-device revocation | `multi-session.revoke` + `session` table | yes | to be written | yes | yes | yes |
| **≤ 5 profiles on a shared device** | `multi-session`, **default 5** | not native | to be written | not native | not native | not native |
| **Coexistence with TypeORM + PG 18** | no TypeORM adapter → **Kysely on the same PG, separate schema** | separate service + its own database | native | **its own database** | **its own database** | **its own database** |
| **Operating burden (one person)** | **a library inside `identity`**: 0 extra deployment | 1 container + 1 database | 0 containers, **all the code** | JVM, realms, version upgrades, CVEs | Go + PG, AGPL | Node + PG |
| Licence | **MIT** | Apache-2.0 + `NOASSERTION` on the repository | — | Apache-2.0 | **AGPL-3.0-only** | MPL-2.0 |

### 2.2 The surfaces and the session form each one needs

| Surface | Hard constraint raised by its specialist | Session carrier chosen | Storage |
|---|---|---|---|
| `storefront-web` (Next.js) | a cached function **can read neither cookies nor headers**; the header needs the session on every route | **cookie** `HttpOnly`/`Secure`/`SameSite=Lax`, validated by the storefront BFF | browser |
| `studio-web` (Angular) | six/eight roles, rights that **change mid-session** | **cookie** `HttpOnly`, studio BFF | browser |
| `studio-mobile` (Capacitor) | `capacitor://localhost` is a **third-party context on iOS 14+** → the cookie is dead | **bearer token** (`bearer`) | `@capacitor/preferences` (Keychain / Keystore), **never `localStorage`** |
| `storefront-mobile` (React Native) | the OS kills the app without warning; the token must not survive in the clear | **bearer token** | Keychain / Keystore (`expo-secure-store` under Expo, native equivalent under bare RN) |
| `storefront-tv` (react-native-tvos) | **no input beyond six characters**; **shared** device; no session at the moment of signing in | **bearer token** + **prior device identity** | the device's native store |

The line that governs everything: **three surfaces out of five cannot hold a cookie session.**
A candidate that can only do cookies is disqualified outright; a candidate that forces you to
write the "bearer token" path yourself carries a hidden cost.

---

## 3. Decision

### D-A1 — **better-auth 1.7.5**, as a library inside the `identity` service, with four plugins

`better-auth` + `@thallesp/nestjs-better-auth` 2.8.0, and the plugins **`jwt`**, **`bearer`**,
**`two-factor`**, **`multi-session`**, **`device-authorization`**.

**Why this one, in one sentence**: it is the only candidate that ticks *at the same time* the
native device flow, the bearer-token session for the three cookie-less surfaces, five profiles on
a shared device, and **zero extra deployment** — the criterion that, for a solo project, weighs
as much as the feature itself.

**What this does not authorise.** better-auth authenticates; it **does not authorise**. The eight
roles, the `grants` table, the one-off accesses that expire at curtain fall stay in the domain
(§7). better-auth's `organization` plugin **is not retained**: its role model cannot express
"`director` may invite `video` and `sound`, who invite nobody", nor a time-bounded access.

### D-A2 — A **single device-pairing primitive**, owned by `identity`

The contract carries **one** command, **one** shape, **one** state machine, **five** intents.

```
POST /pairings        createPairing(intent, payload?, deviceDescriptor) -> DevicePairing
GET  /pairings/{id}   pollPairing(pairingId)                            -> DevicePairingState
DELETE /pairings/{id} cancelPairing(pairingId)                          -> DevicePairingState
```

`intent ∈ { signin, seat, plan, payment-method, merch }`.

**The reasoning that makes the unification possible** — and it must be stated, because it is not
obvious: **four of the five intents are not OAuth authorisation flows.** Buying a seat from a TV
that is *already signed in* is not a request for a token: it is a **transaction rendezvous**.
Only `signin` is a genuine RFC 8628.

What is therefore single is **the rendezvous state machine**: short code, QR, expiry, polling,
`slow_down`, five outcomes. What differs is **the effect of approval**.

| | `signin` | `seat` · `plan` · `payment-method` · `merch` |
|---|---|---|
| Does the TV have a session when it opens one? | **no** | yes (mandatory) |
| Bound to | the **device** (`device_id`) | the **profile** that opened it |
| Approval served by | better-auth's `device-authorization` plugin | the phone's normal journey (BFF → `ticketing` / `billing`) |
| Effect | one more session on the device | an `outcomeRef` set on the pairing |

**The flow of a purchase intent, which respects "no synchronous calls between services":**

1. TV → storefront BFF → `identity`: `createPairing`. `identity` writes a `device_pairing` row
   and returns the code.
2. The phone scans → opens `verificationUriComplete` → BFF → `identity`: reads the intent and
   the payload, **in order to display them**.
3. The phone confirms and **goes through its normal purchase journey** (BFF → `ticketing`), with
   its own `Idempotency-Key`. No duplication of ticketing.
4. The BFF sets `approvePairing(pairingId, outcomeRef)` — or `failPairing(reason)` if
   `ticketing` refused.
5. The TV polls → the BFF reads the pairing, **composes** `PairingOutcome` from `outcomeRef` and
   returns it complete, so that the confirmation screen renders **without one more call**, as the
   TV requires.

`identity` knows neither seats nor payments: it carries only the rendezvous and an opaque
pointer. `ticketing` implements **no** short code. That is the "designed once, implemented once"
requirement met without turning `identity` into a catch-all service.

**The sixth case is a handoff, not a pairing.** The account-page QR that sends the viewer to
`arthome.fr/compte` carries the type `handoff` and **opens no** `device_pairing` row: nothing is
waiting, the screen does not switch. The contract separates them by name, not by an option.

---

## 4. The TV's three questions, decided

### Q3 — **Yes, the TV has a device identity before any session.** It is a contract notion.

Anonymous endpoints "with the code as the only secret" are rejected: they make impossible the
four things the TV asks for (naming itself under "connected devices", being revoked, carrying a
rate limit, re-attaching after a restart).

**Mechanism.** On first launch, the surface calls `registerDevice(deviceDescriptor)` and receives
a **`device_token`**: an **ES256** JWT, `aud: "arthome.device"`, long-lived (180 days),
**rotated on every use**, carrying `device_id` (UUIDv7) and nothing else. It grants access only
to: opening a pairing, polling a pairing, reading the public bootstrap payload. It **is not** a
session and gives access to no personal data.

This also settles **E13** (`devices` has two shapes under one name): `Device` is the registered
device, durable, revocable; `DeviceSession` is the (device, profile) pair. Two names, two shapes.

### Q2 — **Refusal with a distinct code for the four purchase intents. No profile switch.**

If the approving phone is signed in under a different identity from the profile that opened the
pairing: `PAIRING_IDENTITY_MISMATCH`, and the phone explicitly offers "switch account" — an act
of the person, never of the system.

**Why refusal and not a switch.** An implicit switch charges the **wrong payment method**,
credits the **wrong rights**, and delivers the seat to the wrong account — in a living room, at
the precise moment when two people are watching the same screen. A money operation is never
resolved by a silent change of identity. And CVE-2026-45337 shows what loosening this exact guard
costs.

**`signin` is the exception, and it is not an exception.** For `signin` there is no opening
profile: the pairing is bound to the **device**. The phone being signed in under a different
identity is the **nominal case** — it is the very meaning of "add an account" from the `gate`
screen. No `MISMATCH` is therefore possible on `signin`.

### Q4 — **One duration per intent, served in the response. Never fifteen minutes for a payment.**

| `intent` | `expiresAt` | Why |
|---|---|---|
| `signin` | **15 min** | finding your phone, signing in, possibly doing 2FA |
| `payment-method` · `plan` · `merch` | **10 min** | no gauge to honour, but a payment does not linger |
| **`seat`** | **5 min** | the gauge shown at booking time must stay true |

**And for `seat`, one further requirement, addressed to `backend-domain`:** the pairing duration
must be **the duration of a seat hold** placed by `ticketing` when the pairing is created.
Without it, the gauge shown on the TV is a lie for five minutes, which is precisely the defect
the TV reports. The two durations are the same value, served once.

In line with the mockup, **the waiting screen shows no countdown**: `expiresAt` is there for the
TV to give up, not to make the viewer anxious.

---

## 5. The two contract requirements raised by the TV

### 5.1 The short-code alphabet is **declared in the contract**

better-auth's default alphabet, `ABCDEFGHJKLMNPQRSTUVWXYZ23456789`, **is not enough**: it does
exclude `0/O` and `1/I`, but it **keeps `5` alongside `S` and `8` alongside `B`** — the two
confusions the TV names explicitly. We replace it via `generateUserCode`.

```
PAIRING_CODE_ALPHABET = "ACDEFHJKLMNPQRTVWXY23456789"   // 27 symbols
PAIRING_CODE_LENGTH   = 6
```

> ⚠ **This block is provisional and this document is the wrong home for it.** These values exist
> **nowhere else in the repository** — unlike `SEAT_CODE_ALPHABET`, which is an exported constant
> with a spec. They belong in `@arthome/core` beside it, exported, with the invariant below
> asserted in a spec; `backend-domain` owns that file. Until that constant exists this ADR is the
> only source, so the string stays here **and is not to be copied elsewhere in the meantime**.
> Once it is exported, replace this block with the identifier and assert that no copy of its
> value remains — the same rule this section applies to the seat code. See §12.5.

**The principle, and it is stronger than "drop the confusable glyphs":** for every commonly
confused pair, **keep exactly one member**. It is the kept member that makes correction *safe*
rather than guessed — the rule `backend-domain` formulated while writing the seat code's
normalisation, and which must be taken from him.

**The normalisation, declared — this is what my first draft was missing.** An alphabet without
its normalisation table is half a contract: each surface would guess its own.

| Typed | Mapped to | | Typed | Mapped to |
|---|---|---|---|---|
| `S`, `s` | `5` | | `I`, `i`, `1` | `L` |
| `B`, `b` | `8` | | `U`, `u` | `V` |
| `Z`, `z` | `2` | | lower case | upper case |
| `G`, `g` | `6` | | spaces, `-`, `.` | removed |

**The `0`/`O` case, where I exclude both members — and it is deliberate.** `backend-domain` is
right that excluding both forbids any correction. I do it anyway, because on **a screen read from
three metres** `0` is not the member of a pair but of a **class**: `0`, `O`, `D`, `Q`, `C`
collapse together. Keeping `0` recovers only one edge of that class and in exchange permits the
production of codes containing the round glyph — thus causing more errors than it corrects.
Removing the class from the code space removes all of them. A typed `O` is then **necessarily**
the misreading of something else, with no correct target: the contract answers
`PAIRING_CODE_AMBIGUOUS_GLYPH`, which tells the TV to point at the position rather than reject
the code wholesale. Better than a silent refusal, and better than an invented correction.

**Why I do not align on Crockford, measured pair by pair.** Aligning would look like the right
answer; it is the opposite, and this is the one point in this document where I had to verify
before believing:

| Pair | This ADR (read at 3 m) | Crockford (dictated) |
|---|---|---|
| `5/S` · `8/B` · `2/Z` · `6/G` | keeps the digit — **safe correction** | **both present** — a misread yields a code that is *valid but wrong* |
| `1/I/L` | keeps `L` | keeps `1` |
| `0/O` | both absent — class removed | keeps `0` |
| `U/V` | keeps `V` | keeps `V` |

Crockford keeps `0` and `1` **because a base-32 encoding must have exactly 32 symbols**: its
normalisation table compensates a cardinality constraint, it does not express an ergonomic ideal.
My code encodes nothing — it is a random token, its cardinality is free. Inheriting the
compromise without inheriting the constraint would turn `5/S`, `8/B`, `2/Z` and `6/G` into
**four pairs with both members present** — the four where this alphabet in fact keeps the digit
alone, and which are counted again under §5.1's comparison with the seat code below. That is the
worst failure mode for this surface: a misread that produces a valid code fails *with nothing to
signal where*.

**`U` is removed**, for Crockford's two reasons: `U`/`V` are confused at three metres, and the
absence of `U` rules out six-letter codes that form an unfortunate word — a code is displayed at
120 points on a living-room television.

- **27⁶ ≈ 3.9 × 10⁸**, i.e. **28.5 bits** — above the threshold RFC 8628 §5.1 judges acceptable
  **provided a cap on attempts exists**, which is the case (§6.2). The 0.3 bit given up relative
  to my first draft buys one confusable pair fewer.
- The alphabet remains a **strict subset** of better-auth's: the normalisation described in its
  documentation (case-insensitive, spaces and punctuation ignored) continues to apply, and ours
  is added to it. *To be confirmed by the spike (§11); this is a reading of documentation and not
  a measurement.*
- Uniqueness is required **among pending pairings only**. An expired code becomes available
  again, otherwise the space is exhausted. `deviceCode`/`userCode` carry a unique index in
  better-auth; partial uniqueness calls for a **PostgreSQL partial unique index** on
  `status = 'pending'`.

**The seat code uses a different alphabet, and the difference is the point.** `@arthome/core`
exports `SEAT_CODE_ALPHABET` and `SEAT_CODE_BODY_LENGTH` from `src/ticketing/index.ts`; the
composed form is built by `seatCode(body)`, checked by `isSeatCode(value)` and normalised by
`normalizeSeatCodeInput(raw)`, with the prefix and the shape regex deliberately module-private.
**This ADR does not restate the value of `SEAT_CODE_ALPHABET`** — a second copy of 32 characters
in a prose document is exactly the parallel literal table that E2 found on eight fields, wearing
a different costume. Read it from `@arthome/core`, and assert against the import, never against a
transcription.

The two alphabets differ, but **far less than one would think, and the narrow difference is the
interesting one.** Both keep one member of a confusable class wherever they can, and both refuse
to guess. Computed from `ACDEFHJKLMNPQRTVWXY23456789`, six of the seven classes keep a member —
`L`, `5`, `8`, `2`, `6`, `V` — and exactly one does not:

| | `PAIRING_CODE` (this ADR) | `SEAT_CODE_ALPHABET` (ticketing) |
|---|---|---|
| Channel | **read once off a television, then discarded** | **dictated to support, retyped off a printed confirmation months later** |
| Confusable classes keeping a member | **6 of 7** | **all of them** |
| Classes made unrecoverable | **one**, `0`/`O`, deliberately | **none** |
| Normalisation | 7 characters mapped, `0` and `O` unmapped by design | 3 rows, exhaustive over the excluded set |
| Cost of a rejection | one retry on the remote | **a phone call** |

**The rule is shared, and it is arithmetic rather than judgement.** Count, for each confusable
class, how many of its members survive in the alphabet:

| Class | Survivors | Normalisable? |
|---|---|---|
| `1`/`I`/`L` · `S`/`5` · `B`/`8` · `Z`/`2` · `G`/`6` · `U`/`V` | **1** each | **yes** — the target is forced |
| `0`/`O`/`D`/`Q`/`C` | **3** (`D`, `Q`, `C`) | **no** — any mapping is a guess |

> **Normalise a confusable class if and only if exactly one of its members is in the alphabet.**
> One survivor: the target is forced, and correction is safe. Several: every mapping is a guess.
> None: it is not a class, it is a hole.

Nobody chose a philosophy here. **Recoverability requires that every confusable character have
exactly one valid target**, and whether that holds is a property of the alphabet, computable in
ten seconds. Ticketing satisfies it on every class it has; this alphabet satisfies it on six of
seven. `backend-domain` reports that a first draft of the seat code excluded *both* members of a
class — the third case above, a hole — and made correction impossible.

**Where the two genuinely differ is upstream of the arithmetic: the channel decides what counts
as a confusable class at all.** `U`/`V` is a class for me, because the code is read; it is not one
for a code dictated aloud, where "you" and "vee" are distinct. `U` is absent from the seat
alphabet for an unrelated reason — it rules out unfortunate words — and is therefore correctly
left unmapped there, even though `V` survives. The arithmetic is universal; the class list is not.

**And the one class I cannot normalise is a choice of mine, not a constraint.** It is tempting to
say the alphabet forced it, and for ticketing that is true — Crockford must keep 32 symbols. My
cardinality is free, so the honest statement is that I could have bought normalisability and
declined to: dropping `C`, `D`, `Q` and admitting `0` leaves that class one survivor and makes all
seven normalisable, at **25 symbols and 27.9 bits** instead of 27 and 28.5. I decline because
three common letters cost more, on a six-character code read at three metres, than one class that
refuses with a named error — `PAIRING_CODE_AMBIGUOUS_GLYPH` — where the cost of refusing is one
retry with the remote already in hand. Ticketing, priced at a phone call, would have had to take
the other side of that trade.

**This invariant should be a gate, not a sentence.** It is checkable from the alphabet string and
the class list alone, for both codes: *every mapped class has exactly one survivor, and no mapped
class has two.* It belongs in `definition-of-done.md` next to §7.6 — prose has no gate (§9.4),
which is how the claim above this one drifted twice.

The two therefore converge on one rule and diverge on everything below it: **correct
exhaustively, or not at all.** `normalizeSeatCodeInput` strips spaces, hyphens and a leading
prefix, uppercases, applies its three mappings and **corrects nothing else** — a character still
outside the alphabet afterwards makes `isSeatCode` return false, because "this code does not
exist" is better than a neighbouring seat found by accident. `PAIRING_CODE` does the same with
`PAIRING_CODE_AMBIGUOUS_GLYPH`, for the same reason and with a lighter consequence: a wrong
pairing correction merely fails, where a wrong seat correction finds someone else's seat. That
asymmetry is also why the two treat `U` differently — I map `U`→`V`, ticketing refuses `U`
outright. Neither constant cites the other, and neither should.

### 5.2 The validity duration is **served**, never copied

`expiresAt` is an **ISO instant in UTC** inside `DevicePairing`, in line with the project rule.
It is never again a mockup literal (**E12** closed). The TV has nothing to know, and the policy
changes without a store review.

**An exception to the "dates travel as ISO strings" rule, and it must be written down**: *inside*
a JWT, `exp`, `iat` and `nbf` remain **numeric seconds**, because RFC 7519 requires it and no
verifier will read anything else. The ISO rule governs API payloads, not the inside of a token.
Declared clock tolerance: **± 30 s** (`jose`'s `clockTolerance`).

### 5.3 What the contract must carry in addition, and was missing

- **Five outcomes, five codes**, as the TV requires: `pending` → `approved` | `denied` |
  `expired` | `cancelled`, plus **`approved_with_failure`** for "the phone finished, the purchase
  failed". A single code would produce a false message four times out of five.
- **`pollInterval`** served (better-auth default: 5 s), and `slow_down` honoured. The TV must
  never poll faster: a few thousand televisions all waiting are a load the server must be able to
  moderate.
- **Re-attachment after a restart**: `pairingId` is persisted by the TV, and
  `pollPairing(pairingId)` must work **with the `device_token` alone**, without a session. This
  is the case one forgets, and it is served by construction since the pairing is bound to the
  device.
- **Q1 — how the TV learns it is done**: **periodic polling per RFC 8628**, not the real-time
  channel. Reason: the channel knows no identity yet at `signin` time, and bringing it in would
  widen its attack surface to gain a few hundred milliseconds. To meet the "switch within two
  seconds at most" requirement, we serve `pollInterval: 2s` **for the first 60 seconds**, then
  5 s. It is a server-served decay, therefore moderable, and it costs at most 30 requests per
  pairing.

---

## 6. Sessions, tokens and revocation, surface by surface

### 6.1 Three carriers, a single issuer

- **Opaque better-auth session** — issued by `identity`, written to its database. Carried by
  **cookie** (`storefront-web`, `studio-web`) or by **bearer token** (`studio-mobile`,
  `storefront-mobile`, `storefront-tv`), via the `bearer` plugin, which returns the token in the
  `set-auth-token` header and receives it as `Authorization: Bearer`. **The mode is chosen by the
  BFF and declared explicitly — §8.2.4.**
- **`device_token`** — §4/Q3.
- **Internal token** — minted by the **BFF**, ~60 s, per-service `aud` (§8).

**Answer to `studio-mobile` on returning from background with an expired token**: **silent
refresh**, never a re-authentication. A re-authentication in the middle of a shift is an
operational fault. Re-authentication is required only for **sensitive operations** (changing the
stream key, transferring channel ownership, adding a payout method), and it is then asked for *at
the moment of the operation*, not on returning to the screen. Durations: session 7 days
(`session.expiresIn`), sliding renewal every 24 h (`session.updateAge`).

**Answer to `storefront-mobile` on what survives a kill**: the bearer token survives **encrypted
by the native store** (Keychain / Keystore), never in the clear. The **playback right never
survives** — it is returned by the entitlement service on each playback (§9). An app reopened
after a week refreshes silently if the session is still alive, and sends the user back to the
sign-in screen only if it is not.

### 6.2 Rate limiting

better-auth provides: 5 requests on `/device` per code-lifetime window, 3 req/10 s on the 2FA
endpoints, `slow_down` on polling. **Not enough for us**: those caps are per session or per
address, and a living room behind a NAT shares its address. At the BFF we add a cap **per
`device_id`** (`@nestjs/throttler` + Redis, which is already at the BFF) and a **lockout after N
wrong-code attempts**, per code and per device. That is the defence the 28.5 bits of entropy
presuppose.

### 6.3 The ownership guard, written by us

In light of CVE-2026-45337, `approvePairing` and `denyPairing` **are not exposed as they stand**.
The BFF interposes a guard that checks explicitly, before delegating:

1. the pairing is `pending` and not expired;
2. `intent = signin` → the bearer is any valid session (nominal case);
3. otherwise → `session.user.id` **is** the pairing's `owner_profile_id`, failing which
   `PAIRING_IDENTITY_MISMATCH`.

It is five lines, and it is the line that caused the CVE. One does not delegate the guard that
has already given way once at the vendor.

### 6.4 The five exits to an external browser (`studio-mobile`)

What `studio-mobile` asks for is adopted in full and becomes a contract rule:

- a **strict allow-list** of return addresses (universal links `applinks` / App Links), literal
  strings, **never a pattern**;
- an **opaque, single-use, short-lived state** (10 min), issued before departure and verified on
  return — it carries **nothing meaningful**, the return URL transiting through the OS;
- **the pending state lives server-side**, never in app memory: "account change awaiting
  signature", "payout account connection in progress". The system may kill the app during the
  detour; on return, **the deep link says where to go, the backend says what changed**. A payment
  confirmed by a URL parameter is a payment confirmed by the client.

The opaque state is served by better-auth's **`one-time-token`** plugin, which already exists.

### 6.5 The shared television

`multi-session` with `maximumSessions: 5` — which is already the default — carries exactly the
three rules the TV states: up to five profiles on the device, rights carried by the **profile**
and never by the device, and a **per-profile sign-out** (`multi-session.revoke`) that leaves the
other accounts signed in. Revoking the **device** is a distinct command, which deletes the
`Device` and all its `DeviceSession` rows at once.

### 6.6 CORS for the native shell

The studio BFF's allow-list contains the **literal strings** `capacitor://localhost` and
`https://localhost`, plus the development origins. A bare `localhost` entry covers neither,
`Access-Control-Allow-Origin: *` is illegal with credentialed requests, and a framework that
normalises `Origin` through a URL parser will reject `capacitor://` — so the comparison is on the
raw string. Details and settings → `nestjs-web-security`.

---

## 7. Authorization: the eight roles stay in the domain

**The collapse to six personas is not safe for authorization** (E6). Authorization is done on the
**eight** values of `memberRoles`, verified in `shared/catalogue.json`:
`artist · production · coordination · director · video · sound · moderation · treasury`.
The catalogue's `grants` table confirms it: `director` may invite `video` and `sound`; `video`,
`sound`, `moderation` and `treasury` invite nobody. The collapse to six merges `director`,
`video` and `sound` under `regie` and **erases that right**. Six is a **label**, never an
authorization key.

**Where each thing lives**

| Notion | Owner | Why |
|---|---|---|
| Account, password, 2FA, social, sessions, devices | `identity` (better-auth) | authentication |
| Channel membership, **set** of roles per (person, channel), `grants` | domain (`channels`) | this is business data that changes without signing in again |
| **Stand-in assigned to a date**, with `expiresAt` | domain | scoped to one date, own life cycle — merging the two would turn revoking a stand-in into an exclusion from the channel |
| Effective rights (navigation, panels, `canRevenue`/`canOps`/`canTech`, `canInviteRoles`) | computed **once** in `@arthome/core`, served by the studio BFF | "no value computed twice" |

**Rights change mid-session — and this is settled by the internal token's lifetime.** Since the
token minted by the BFF lives ~60 s, **the maximum staleness of authorization is 60 seconds**.
That is the right answer for the studio web: an accepted invitation takes effect in under a
minute, without signing in again and without anyone querying `identity`.

**But sixty seconds is not enough for an access that expires.** A stand-in whose access expires
"at curtain fall" may survive up to 60 s inside an already-minted token. Hence a firm rule: the
token carries the **roles** (coarse, stable); the service checks the **time-bounded access on the
loaded resource** (fine, dated). CASL 7 (`createMongoAbility`, checking the instance with
`subject()`), never a type-level check alone.

**`canRevenue` decides the content, not the display.** A control room that receives the ticketing
gross and does not display it is a leak. The projection is **server-side**, and a notification
**never** carries an amount if the recipient role lacks `canRevenue` — it is shown on a locked
screen.

**Every command must be authorisable on its own.** A Next.js server action is a public POST
route: the protection of the page that calls it is not a boundary. Every write command carries
the identifier of the targeted resource, and the contract states which ownership is checked. And
**no service skips its own authorization** because "only the BFF calls it".

### 7.1 E1 — why the broken plans touch authentication

`plan.opens[]` gates playback access, and **four disjoint vocabularies** coexist: `plans[]` says
`free`/`pass`/`premium`, `accounts[].plan` says `season`/`monthly`/`none`, the web and TV mockups
invent four more. Since `helpers.planOf()` does `… || plans()[0]`, **the four reference accounts
silently fall back to `free`**.

**Consequence for this ADR, and it is firm: the internal token carries no plan claim.** No
`plan`, no `opens[]`, no `entitlements`. Reasons:

1. putting a broken vocabulary into a token freezes the defect inside a signed artefact;
2. a plan changes by the second (cancellation, failed direct debit) and does not tolerate 60 s of
   staleness on a money decision;
3. the playback right belongs to `adr-stream-entitlement.md`, which resolves it **at playback-token
   issuance**, on fresh data.

The authentication token says **who**. It never says **what the person is entitled to watch**.

### 7.2 UUIDv7 and the creation date

A UUIDv7 reveals its creation date. The decision, deliberately narrow:

- a token's `sub` = the user's UUIDv7: **acceptable**. A token is short-lived, already
  authenticated, and is not a public URL.
- **No natural person's identifier appears in a public URL.** Share pages, public profiles and QR
  codes carry a **slug** or a distinct public identifier. Artists are public entities: their
  creation date is not a secret.
- better-auth generates a base62 string by default. We impose UUIDv7 through
  `advanced.database.generateId`, **verified** as accepting a function.

---

## 8. Topology: what the BFF mints, what the services verify

In line with the binding decisions, with no exception requested.

```
surface ──(cookie | Bearer)──► BFF ──(JWT ES256, ~60 s, aud=<service>)──► service
                                │                                          │
                                └─ validates the session (Redis + identity) └─ verifies via JWKS,
                                   mints the internal token                    locally, jose
```

- **The BFF, and it alone, validates the session.** No service calls `identity` or reads the
  session store. Redis stays **at the BFF only**.
- **The BFF mints the internal token**: `jose`, **ES256**, `iss` = the BFF, `aud` = the target
  service, `sub` = `user_id`, minimal claims (roles per channel, `device_id`), `exp` 60 s. A token
  minted for `ticketing` is **refused** by `billing`.
- **Each service verifies locally** with `createRemoteJWKSet` built **once** (not per request),
  with `algorithms`, `issuer` and `audience` **pinned** — without pinning, any token signed by
  that key passes. Never `x-user-id` in a header: any caller can set it.
- **`traceparent` (W3C) is propagated** from the surface to the service, through the BFF.

### 8.1 The sensitive point: where the JWKS lives

A service that fetches the JWKS from a BFF reintroduces a dependency on the edge.
**Decision: a single, static JWKS document served by the CDN.** It contains the public keys of
the **four** issuers, distinguished by a `kid` prefix:

| Issuer | `kid` | `aud` | Rotation |
|---|---|---|---|
| storefront BFF | `bff-sf-<date>` | `arthome.<service>` | 30 d, grace 24 h |
| studio BFF | `bff-st-<date>` | `arthome.<service>` | 30 d, grace 24 h |
| Entitlement (playback) | `play-<date>` | `arthome.cdn` | **90 d, grace 7 d** |
| `identity` (device_token) | `dev-<date>` | `arthome.device` | 90 d, grace 7 d |

No service-to-service call: that is the only benefit the single document buys, and it is enough
to justify it.

**What I had written and that was wrong: "a single object to rotate".** From it I drew an
argument for a **single rotation job**. `definition-of-done.md` §7.6 refuted it, and the
refutation is worth restating here rather than living only there: **the simplification was
illusory, and my own table showed it.** My four rows already carry two calendars and two grace
windows — 30 d / 24 h for the BFFs, 90 d / 7 d for playback and the device. A single job would
therefore not have been *one* job, but *one job with four branches*: it would have paid the price
of gathering **four private keys** under a single process without ever buying the simplicity that
motivated it.

**The decision retained: four independent rotations, one per issuer, plus a secret-less
assembler.** Each issuer rotates its key at its own cadence and publishes its **public part**;
the assembler concatenates the four public parts into one document and uploads it. It holds no
private key: it is therefore not a target, and a rotation that fails blocks none of the others.
That is precisely what a single job would have lost.

Sequencing rule, unchanged: publish the new key **before** signing with it, retire the old one
**after** the window computed below.

**Why the two cadences diverge — the reason, which was missing.** I had written these figures
without arguing them; `backend-contracts` formulated the mechanism, and it is counter-intuitive
enough that it must be written down, or someone will "simplify" by aligning the cadences:

> **The grace window must cover the CDN cache, not the token's lifetime.** The edge caches the
> JWKS document for hours. Publishing the new key and then signing with it sixty seconds later
> causes **perfectly valid** tokens to be rejected, by an edge that is still serving the old
> document and does not know the new `kid`.

Hence the rule, and it is numeric: the document is served with **`Cache-Control: max-age=3600`**,
and **every grace window is ≥ 2 × max-age**. Both cadences respect this 2 h floor (24 h for the
BFFs, 7 d for playback and the device); what separates them is therefore the margin above it, and
it is deliberate: a CDN edge warms up less well than a service we operate, and its cache is the
only one of the four we cannot flush.

The sizing reasoning is therefore **not** "the longest token lifetime" but **the maximum of the
two**: the token's lifetime *and* twice the document's `max-age`. Acceptance gate:
`definition-of-done.md` §7.6.

**ES256 everywhere, not EdDSA.** better-auth signs with EdDSA by default; we impose `ES256`. Two
verified reasons: `@nestjs/jwt` (jsonwebtoken 9) **cannot** verify EdDSA, and the CDN edge that
must verify the playback token relies on WebCrypto, where Ed25519 support is more recent and more
uneven than P-256's. One algorithm for the four issuers is one fewer thing that diverges.

### 8.2 Where the authentication routes are mounted

*Lead's arbitration, made at time 4 on a point raised by `backend-contracts`.* Six contracts were
missing — create an account, sign in, sign out, reset a password, the four `account/security`
actions, the studio's device management — and they all depended on the same undecided question.

**Decision: the BFF exposes `/v1/auth/*` as a documented relay, and the session cookie is set on
the BFF's domain.** It is consistent with what this ADR already stated — "the BFF, and it alone,
validates the session" — and it holds all four constraints at once: **critical rule 1** no longer
has an exception through the authentication door, the Next server sees the cookie on its own
domain, the Capacitor shell receives a **bearer token** from the same relay rather than a cookie
that iOS 14+ forbids it to hold, and **§7's placement of better-auth inside `identity` is
preserved untouched** — trivially, since the relay adds a hop in front of `identity` instead of
moving anything out of it. That fourth constraint costs nothing to meet, which is exactly why it
was about to go unwritten: the relay was chosen against four pressures, not three, and a reader
who counts three will not understand why `identity` was never a candidate for the edge.

**One entry door, three delivery modes.**

#### 8.2.1 What the relay exposes, and what it does not

| Family | Relayed under `/v1/auth/*` | Note |
|---|---|---|
| `sign-up/email`, `sign-in/email`, `sign-out` | **yes** | |
| `forget-password`, `reset-password` | **yes** | the email link points at the **surface**, not the API (§8.2.7) |
| `sign-in/social`, `callback/:provider` | **yes** | confidential server-side client (§8.2.3) |
| `get-session` | **yes**, but **projected** | returns `ViewerContext` / effective rights, not better-auth's shape |
| `update-user`, `change-password`, `change-email`, `delete-user` | **yes** | re-authentication required on the sensitive ones (§6.1) |
| `two-factor/*` | **yes** | |
| `multi-session/*` | **yes** | this is the studio's device management and the TV's profiles |
| `device/*` (RFC 8628) | **no** | consumed **by** the BFF behind `/v1/pairings` — a single primitive (§3) |
| `device/approve`, `device/deny` | **no, never raw** | wrapped by the ownership guard (§6.3) |
| `/jwks` | **no** | the document is **static and served by the CDN** (§8.1). Relaying it would reintroduce the dependency §8.1 removes |
| `/token` (`jwt` plugin) | **no** | the BFF mints the internal token itself; **no client obtains a service-audience JWT** |
| `/ok`, `/error` (default pages) | **no** | they render English sentences — forbidden by i18n-by-codes |

#### 8.2.2 What the relay **adds** — without which it would be the application gateway we rejected

The lead is right to demand this list: a relay that re-dispatches is a gateway, and the project
rejected one in advance. What the BFF does **beyond forwarding**, and from which nothing excuses
it:

1. **Zod validation, and therefore the OpenAPI.** This is the decisive argument, and it comes
   from a binding decision: `zod` validates everything, the OpenAPI is **generated from zod**. A
   transparent relay has no schema, therefore **does not appear in the OpenAPI** — the six
   missing contracts would stay missing. Every relayed route declares its input and output
   schemas.
2. **The project's error envelope, in codes.** better-auth answers with English sentences
   (`"Invalid email or password"`). i18n-by-codes forbids that, error envelope included. The BFF
   holds the mapping from better-auth code to project code. On its own, this point would make the
   relay mandatory.
3. **The pairing ownership guard** (§6.3) — the line that caused CVE-2026-45337.
4. **The choice of delivery mode** (§8.2.4): it is the BFF that decides what it returns, not
   `identity`, which knows nothing about it.
5. **Rate limiting per `device_id`** (§6.2), which better-auth cannot do: its caps are per address
   or per session, and a living room behind a NAT shares its address.
6. **Cookie hardening and CSRF** in cookie mode (→ `nestjs-web-security`), moot in bearer mode.
7. **`traceparent`** propagated, and correlation with the rest of the request chain.

#### 8.2.3 The OAuth return, and the two native shells

The redirect URI is registered **once per provider**, on the BFF's domain. A structural point,
which settles the question I had left "to be verified": **the surfaces never talk to Google or to
Facebook.** They open `/v1/auth/sign-in/social` on the BFF, which redirects. The OAuth client is
therefore **confidential and server-side** — no mobile app embeds a secret, which is in any case
the only defensible arrangement in a distributed binary.

| Surface | Return path | What holds |
|---|---|---|
| `storefront-web`, `studio-web` | ordinary browser redirect | cookie set on the BFF's domain, read by Next during server rendering |
| `studio-mobile` (Capacitor) | **system browser**, never the WebView, then a **universal link** | `capacitor://localhost` is a third-party context: no cookie would survive there |
| `storefront-mobile` (RN) | `ASWebAuthenticationSession` / Custom Tabs, then an **app link** | same |
| `storefront-tv` | **no browser** | the TV does no OAuth: it goes through pairing, `intent: signin` (§3) |

**The rule that makes the return safe, and it is absolute: the deep link never carries the
token.** It carries only an **opaque single-use state** (`one-time-token` plugin), which the app
exchanges for its bearer token over direct TLS with the BFF. The reason was already established
by `studio-mobile`: the return URL transits through the OS, may be logged, and may be opened by
another application. It is also what makes the journey **replayable** if the OS kills the app
during the detour — the pending state is server-side (§6.4).

#### 8.2.4 The three delivery modes

The mode is an **explicit parameter** of the request, validated by zod. **Never inferred from the
`User-Agent`**: it is forgeable, and I have held throughout this document that a bypassable
heuristic does not count as an answer.

| Mode | Surfaces | What the BFF returns | Storage |
|---|---|---|---|
| `cookie` | `storefront-web`, `studio-web` | `HttpOnly` `Secure` `SameSite=Lax` cookie, **nothing in the body** | browser |
| `bearer` | `studio-mobile`, `storefront-mobile` | opaque token in the body, **no cookie** | Keychain / Keystore, `@capacitor/preferences` |
| `device` | `storefront-tv` | `device_token` first (§4/Q3), then a bearer token **per profile** at the end of pairing | native store |

**Invariant: a response never carries both at once.** A token in the body *and* a cookie means two
carriers for one session, therefore two revocations to maintain and one that will be forgotten.

The `device` mode is the one the lead asks me to connect: the TV has **neither cookie nor token**
at the moment it opens a sign-in pairing, since it has no session. That is exactly what the device
identity solves (§4/Q3) — the `device_token` is what allows it to call `/v1/pairings` before any
session, and nothing else.

#### 8.2.5 Sign-out, in the three modes

| Mode | What happens |
|---|---|
| `cookie` | session destroyed server-side, then the cookie cleared **with exactly the attributes that set it** — otherwise it is not cleared |
| `bearer` | session destroyed server-side, **then** the client wipes its native store. The order matters: wiping the store is not revoking |
| `device` | **`multi-session.revoke` for a single profile.** The television's other accounts stay signed in. Revoking the **device** is a distinct command, which closes all its sessions at once |

**A trap worth writing down**: better-auth's `signOut` revokes **all** of the user's sessions. On
a shared television that is not what is wanted — per-profile sign-out must go through
`multi-session.revoke`. Two gestures, two routes, never one for the other.

**Connection to `DeviceSessionClosed`.** The three modes emit the same event, and the grain
`backend-domain` has just added is the one that was missing: **`(device_id, profile_id)`**.
Without `profile_id`, signing one profile out of a shared television cut off playback for the
whole living room or for nobody. The entitlement service consumes it and refuses the next renewal
**for that profile on that device**; the latency is the one in §9 — the event lag, then 75 to
120 s.

#### 8.2.6 What stays inside `identity` and is never exposed

- **the credential store** — argon2id hashes, encrypted TOTP secrets, backup codes. Never read by
  the BFF, never on the wire, under any mode;
- **the private keys and their rotation** (§8.1) — `/jwks` is not relayed, nor is `/token`;
- **the device registry** — `identity` writes it; the surfaces read a projection of it;
- **the `auth` schema's tables** — no TypeORM entity maps them (R2).

#### 8.2.7 What the relay breaks, and that I am flagging

The lead asked me to flag what does not hold. One thing genuinely breaks:

**better-auth's official client is no longer usable.** `authClient` — and with it
`@better-auth/expo` — expects better-auth's route and response shape at a known `baseURL`. Once
the BFF projects `get-session` into `ViewerContext` and replaces messages with codes, the shape no
longer matches. **The five surfaces therefore write a thin client against `@arthome/contracts`**,
as they do for everything else in the product, and do not use the SDK.

This is a real cost: it removes one of better-auth's selling points. I hold it to be acceptable,
and it has an upside I had not foreseen. **R4 disappears**: I had flagged that `@better-auth/expo`
requires Expo while the Expo / bare React Native choice is not made. Since we no longer use that
package at all, the authentication decision becomes **entirely indifferent** to the React Native
stack choice. One risk fewer, by an unexpected route.

Three configuration traps, to be written down before they cost half a day each:

- **`baseURL` must be the BFF's public URL**, not `identity`'s internal address. better-auth
  builds its redirects and its email links from it: set wrongly, the OAuth returns and the reset
  links point at an unreachable host. `trustedOrigins` lists the five surfaces' origins, as
  **literal strings** — including `capacitor://localhost` (§6.6).
- **The reset link points at the surface, not the API**: `arthome.fr/reset?token=…` or
  `studio.arthome.fr/reset?token=…`, therefore **per product and per language**. We override
  `sendResetPassword`; the default built from `baseURL` would land the user on an API.
- **`bodyParser: false` concerns the `identity` application**, not the BFF. It is a requirement of
  better-auth's NestJS adapter; applying it to the BFF would break everything else there.

---

## 9. How this fits with `adr-stream-entitlement.md`

This is the question explicitly asked. **Two token systems, five points of contact.**

| | Session / internal token (this ADR) | Playback token (`adr-stream-entitlement`) |
|---|---|---|
| **Who issues** | session: `identity` · internal token: the **BFF** | the **entitlement** service |
| **Who verifies** | the BFF (session) · each service (JWKS) | the **CDN edge** |
| **Lifetime** | session 7 d · internal **60 s** | **120 s**, renewed every **45 s**, lease **90 s** |
| **Carries** | who you are, your roles | what you may watch, on which device |
| **Algorithm** | **ES256** | **ES256** — same family, mandatory for the edge |
| **Keys** | `kid` `bff-*` | `kid` `play-*` — **same JWKS document**, **slower** rotation cadence (§8.1) |

**Five points of contact, written down:**

1. **The document is shared, the rotation is not.** Same published document, same `kid`
   convention — but **four independent rotations** (§8.1), because the cadences differ and a
   single job would gather four private keys while simplifying nothing. The CDN edge also caches
   the JWKS aggressively: a playback key rotates **every 90 days with 7 days of grace**, while a
   BFF key rotates every 30 days with 24 h. Aligning the two cadences would cause valid tokens to
   be rejected at the edge. **This is the main trap of this articulation**, and the exact
   mechanism that produces it is written in **§8.1** — the grace window is sized on the **cache**,
   not on the token.
2. **Revocation works through renewal, not through a deny-list.** A 120 s playback token is not
   revoked: one **stops renewing it**. "Disconnect this device" revokes the `DeviceSession` in
   `identity`, which publishes `session.revoked` / `device.revoked`; the entitlement service
   consumes the event and refuses the next renewal. **Maximum latency = event lag + 120 s** — the
   case where the token has just been renewed at the instant of revocation. The real range is
   **75 to 120 s**: the last renewal is 0 to 45 s old, and the token it produced lives 120 s from
   then. (My first draft said "45 to 75 s": it was the same confusion between the interval and the
   lifetime, committed one line after denouncing it.) This is the numeric answer to
   `storefront-web`'s question 25 ("does disconnecting this device cut playback, and in how
   long?") and to the TV's `DeviceSession`.
3. **The lease expires, it does not close.** The concurrent-session limit rests on a **90 s lease
   that expires** — shorter than the token, therefore renewed by the same 45 s heartbeat — never
   on an end call that a TV, or a mobile killed by the OS, will not always be able to make. This
   is exactly the TV's Q9c and `storefront-mobile`'s question 5 ("who releases a killed
   session?"). The playback session is identified by this ADR's `device_id`, which lets a person
   **take back their own session** instead of being blocked by their own ghost screen.
4. **The renewal interval is not the token's lifetime — and this is the fault everything came
   from.** `adr-stream-entitlement.md` §3.1 stated that "the window during which one watches a
   stream one is no longer entitled to is *exactly the renewal interval*". That is false, and it
   is from this sentence that the "60 s" travelled into five documents, mine included. Two
   distinct delays, two distinct bounds:

   | Delay | Bounded by | Value |
   |---|---|---|
   | before **the client** learns of the refusal | the renewal interval | **≤ 45 s** |
   | before **the edge stops serving** | the **token's lifetime** | up to **120 s** |

   The security guarantee is the **second row**, always. The first is only a convenience: it
   describes how fast a cooperative client stops of its own accord.

   **A pushed signal may stop playback sooner; it is a courtesy, not a boundary.** The lead asked
   for one for the visible case, and it must be labelled as such in the contract: a modified
   client ignores it, the edge serves for up to 120 s, and the guarantee remains **120 s**. I have
   held throughout this document that any bypassable heuristic does not count as an answer; it
   counts no more here because it is comfortable.

   **How the error happened**, stated by its author and copied here so that the shape of the fault
   stays legible: *"`storefront-tv` asked for ≤ 60 s, I picked the number that pleased the
   question."* I had taken it up without verifying it — a client requirement read as a server
   value. It is the same gesture that produced E1 and E12: a literal adopted because it was there.
   **It does not come from ignorance, it comes from the smaller number being easier to write** —
   which is why it will happen again, and why a constant needs an owning document rather than a
   careful author.

   The same shape has a second form, found in this very document: **a sentence that needs a fact
   its author does not have will fill the gap with a plausible generalisation.** §5.1 claimed for
   two drafts that the pairing code and the seat code "share a shape", because I was holding a
   placeholder for an identifier I had not been given — and a generalisation reads so much better
   than an admission that nobody rereads it. The two codes share no alphabet and no normalisation
   table. The remedy is not more care either: it is to **name the hole** — write "whose name
   belongs to `backend-domain`" and leave it ugly — because a named hole gets filled and a
   definite description that reads fine does not.

   The second specimen arrived from the lead, about this same section, and it is sharper than
   mine: told that this alphabet "excludes both members of each confusable pair", I adopted it
   into a comparison table, and it was true of **one class out of seven**. The person who wrote
   it was the person who had supplied me the facts — he had the two alphabet strings in front of
   him and nothing about their normalisation, needed a crisp contrast for a message, and
   generalised past what he held. So the failure mode is not about access or seniority: **having
   the facts is no protection, because the gap being filled is the one the author cannot see.**
   My own normalisation table, eight rows, sat in this document contradicting the claim for two
   drafts. What caught it was arithmetic on the alphabet string, not rereading.

   **The mechanism under both, and it is the one E2 already named.** Nothing false spread from
   document to document: a **new summary contradicted a precise statement this same document
   already made**, and nothing compared the two. The scoped, correct sentence — "the `0`/`O`
   case, where I exclude both members" — was fifty-nine lines above the row that generalised it
   into a policy, and the row immediately below then had to explain that `0`/`O` was special,
   which only makes sense if the others are not. Three rows, two of them disagreeing with the one
   between them. **That is the parallel literal table, in prose**: the same fact stated twice in
   one document, the second copy drifting, because nobody reads a document against itself. E2
   found it on eight data fields and a CI gate can catch it there; in prose there is no gate, so
   the only defence is to state a fact once and reference it afterwards — which is rule 15,
   arrived at from the other end.

5. **The clocks.** All issuers are NTP-disciplined; declared tolerance **± 30 s** on both sides;
   `exp`/`iat` numeric (RFC 7519) inside tokens, ISO in API payloads. A CDN edge whose clock
   drifts rejects silently: the tolerance must be written in both ADRs, with the same value.

**And the boundary, stated once**: this ADR answers **who are you**; `adr-stream-entitlement`
answers **may you watch this, now, here, on this screen**. The second consumes the first's `sub`
and `device_id`; the first knows nothing of territories, of plans, or of concurrent screens
(§7.1).

---

## 10. Risks accepted

| # | Risk | Severity | What contains it |
|---|---|---|---|
| **R1** | **The Device Authorization plugin is young, and it has already had an authorization CVE** (CVE-2026-45337, fixed in 1.6.11). Binding to an identity — our Q2 — is precisely what gave way. | **high** | The ownership guard is **written by us** at the BFF (§6.3), not delegated. Spike S3. Watch the vendor's security advisories; they publish a monthly bulletin. |
| **R2** | **No TypeORM adapter.** better-auth writes to PostgreSQL through Kysely: **two migration tools on one database**. | medium | A dedicated **`auth`** schema for better-auth, **`public`** for TypeORM. No TypeORM entity maps a better-auth table; the domain holds only a `user_id`. Two migration commands in the same deployment recipe, never interleaved. |
| **R3** | **`@thallesp/nestjs-better-auth` is a community adapter** (2.8.0, MIT, one maintainer). It requires `bodyParser: false` and installs a global guard. | medium | The dependency is **thin**: it mounts a router and a guard. Should it be abandoned, mounting `auth.handler` by hand costs a day, not a migration. `@AllowAnonymous()` on health and webhooks — not to be forgotten, the guard is global. |
| **R4** | ~~**`@better-auth/expo` requires Expo**, and the Expo / bare RN choice is not made (D-001).~~ **Extinguished** by §8.2.7. | ~~medium~~ → **none** | The `/v1/auth/*` relay makes the official client unusable anyway: we do **not** install `@better-auth/expo`. The authentication decision is therefore **entirely indifferent** to the Expo / bare React Native choice. Extinguished by a route I had not foreseen — it is the relay, decided for an entirely different reason, that removed this risk. |
| **R5** | **Four intents out of five are not RFC 8628**, and I route them through the same state machine. A hurried reader will see a misuse of the standard. | medium | It is deliberate and written down (§3, D-A2): the **shape** is the RFC's because the TV client must be single; only `signin` borrows the **protocol**. The other four issue no OAuth token. |
| **R6** | **A per-address rate limit is ineffective**: a living room behind a NAT, a carrier on CGNAT. | low | A cap per **`device_id`** (§6.2), made possible by the Q3 decision. That is the practical reason that settles Q3, on top of the TV's four. |
| **R7** | **28.5 bits of entropy over six characters** is comfortable but not enormous. | low | Short windows (5–15 min), **partial** uniqueness over pending pairings only, a cap on attempts and a lockout. RFC 8628 §5.1 accepts this entropy **provided rate limiting exists** — the condition is met. |
| **R8** | **I make `identity` the owner of the pairing**, including for purchase intents. | low | `identity` carries only a rendezvous and an **opaque pointer**; it knows nothing of seats, plans or payments. The alternative — `ticketing` as owner — would force `identity` to call it for `signin`, which "no synchronous calls between services" forbids. |

**The main risk I accept is R1**: on the most decisive point of this document I retain a component
whose implementation of that very point was vulnerable three months ago. I accept it because the
alternatives are worse — SuperTokens cannot do it, Keycloak carries **the same class of defect,
unfixed** (CVE-2026-88770), and doing it by hand amounts to writing oneself the code that produced
both CVEs — but I accept it only with the §6.3 guard written on our side.

---

## 11. The minimal spike that would confirm the decision

**A single spike, two to three days, one throwaway NestJS service.** It does not validate
better-auth in general: it validates the **points on which the decision could break**.

**S1 — The coexistence, which is the architectural risk.** A throwaway `identity`: NestJS 12 +
`@thallesp/nestjs-better-auth` 2.8.0 + better-auth 1.7.5 on **PostgreSQL 18**, better-auth in the
`auth` schema via its CLI, **two TypeORM ^1.1 entities** in `public` with their migrations.
*Success*: both sets of migrations run in either order without conflict;
`advanced.database.generateId` does produce **UUIDv7** values in the better-auth tables; a join
`public.channel_member → auth.user` works. *Failure ⇒ fall back to Logto (MPL-2.0, its own
database, native device flow), which is second in this ranking.*

**S2 — Pairing end to end, with the five outcomes.** `deviceAuthorization` configured with
`generateUserCode` (alphabet from §5.1, 6 characters), `expiresIn` **per intent**, a decaying
`interval`. A fake TV client in Node polls; a fake phone approves, denies, lets it expire,
cancels, and **approves then fails**. *Success*: the five outcomes are distinguishable by code,
`slow_down` is received, the switch happens **within two seconds**, and a persisted `pairingId`
**re-attaches after a restart** of the fake client. *Also to be measured*: that a code in lower
case, with a space in the middle, is indeed accepted — the reading of documentation I flagged as
unmeasured (§5.1). *And since the §5.1 correction*: the whole **normalisation table** — `S`→`5`,
`B`→`8`, `Z`→`2`, `G`→`6`, `I`/`1`→`L`, `U`→`V` — plus the fact that a typed `O` returns
`PAIRING_CODE_AMBIGUOUS_GLYPH` and not a generic failure. An untested normalisation is a
normalisation that diverges across five surfaces.

**S3 — The guard that caused the CVE.** Two accounts. Account A opens a `seat` pairing; account B,
**authenticated**, attempts `approve` with A's `user_code`. *Success*:
`PAIRING_IDENTITY_MISMATCH`, and **nothing is created**. Then the same attempt with
`intent = signin`: *success* = accepted, because that is the nominal case. **This is the test that
must exist before any line of production code**, and it belongs in the regression suite, not in
the spike.

**S4 — The verification chain, on one page.** The BFF validates the session, mints a 60 s
**ES256** JWT with `aud: "arthome.ticketing"`; a fake service verifies it with `jose` and
`createRemoteJWKSet` against a **static JWKS document**, with `algorithms`/`issuer`/`audience`
pinned. *Success*: the token passes; the **same token presented to a fake `billing` is refused**;
a `kid` rotation with a grace period breaks nothing. *Failure on the rotation ⇒ §8.1 must be
revised before anything is written.*

**S5 — The OAuth return inside a native shell, which is the only thing §8.2.3 asserts without
having measured it.** A minimal Capacitor shell: `sign-in/social` opened in the **system
browser**, return via a **universal link**, exchange of the single-use state for a bearer token,
stored in `@capacitor/preferences`. *Success*: the return reopens the app, and **the deep link
contains no token** — only the opaque state. *Above all to be exercised*: the case where the OS
**kills the app during the detour**, which is the failure mode `studio-mobile` reports and that
nothing else covers. *Failure ⇒ it is §8.2.3 that must be revised, not the choice of
better-auth.*

**What the spike does not have to prove**: 2FA, password reset and social sign-in. These are
established functions in every candidate; exercising them would cost days without settling
anything.

---

## 12. What I escalate to the lead

No technical impossibility: **no binding decision is reopened.** Three points had been escalated
and a fourth came from the lead; **four are closed, and a fifth is open.** I leave them here with their outcome
rather than deleting them — a question resolved without a trace gets asked again.

1. **~~The `seat` pairing duration must be the duration of a seat hold~~ — closed.** (§4/Q4.)
   `backend-domain` drew from it an aggregate he did not have, **`SeatHold`**, whose invariant is
   "a single instant carried by both objects, never two durations that drift". This justifies
   after the fact the 5 minutes I had chosen for `seat` without being able to argue them: **a
   pairing duration is a commitment about the gauge**, not an interface convenience.
2. **Where the authentication routes are mounted** — *decided by the lead at time 4*, written in
   **§8.2**: a `/v1/auth/*` relay at the BFF, cookie on the BFF's domain, three delivery modes. I
   found only one thing that breaks — better-auth's official client becomes unusable (§8.2.7) —
   and it extinguishes R4 along the way. **The arbitration does not need to be reopened.**
3. **~~A written exception to the "dates travel as ISO strings" rule~~ — closed.**
   `backend-contracts` wrote it at time 2, `critical-rules.md` **rule 6**, with the note that was
   the real object of the request:

   > **Dates travel as ISO 8601 UTC strings.** *Exception: inside a JWT, `exp`/`iat`/`nbf` remain
   > numeric seconds (RFC 7519) — this is not a mistake, do not "fix" it.*

   What I was asking for was less the rule than **the prohibition on correcting it**: an exception
   that looks like a mistake gets repaired by someone well-intentioned, and the token then stops
   being verifiable by any conformant verifier at all.
5. **The pairing alphabet exists only in prose** — **open**, and it is the sharpest instance of
   this document's own argument. `rg` over the repository finds `PAIRING_CODE` and
   `ACDEFHJKLMNPQRTVWXY` in **exactly one file: this one.** The section that establishes that a
   value needs an owning document is itself the owning document of a value that exists nowhere
   else. "Prose has no gate" (§9.4) is therefore not a limitation of the ADR — it is a
   description of where that alphabet lives, and it cannot have a gate until it is a constant.
   For `backend-domain`, in `@arthome/core` beside `SEAT_CODE_ALPHABET`.

   **One sequencing note, because it is the difference between a move and a loss.** The invariant
   does not determine the string: **960 distinct alphabets satisfy it** (3 choices for which of
   `1`/`I`/`L` survives, 2 each for the five binary classes, and 10 ways to pick which 3 of
   `0`/`O`/`D`/`Q`/`C` survive). Handing over the invariant as the specification would be
   underdetermined by three orders of magnitude. **The string travels with it**, and this block
   is deleted only once the export exists.

4. **~~The static JWKS document has no owner~~ — closed, and my proposal was the wrong one.**
   (§8.1.) I was asking for *a single rotation job* to be assigned; `definition-of-done.md` §7.6
   showed that the simplification was illusory, my own table already carrying two calendars. The
   form retained is **four independent rotations plus a secret-less assembler** — which,
   incidentally, no longer needs a single owner, since each issuer rotates its own key and the
   assembler holds nothing.
