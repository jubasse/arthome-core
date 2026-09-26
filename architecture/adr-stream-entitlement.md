# ADR — Access to the live show

**Status**: accepted. **Date**: 21 September 2026. **Author**: `backend-domain`.
**Scope**: `streaming`, the CDN edge, and the three storefronts.
**Maturity**: **provisional** — the media provider has not been chosen, and its declared
capabilities will change the token's shape. The *mechanism* below depends on no provider.

---

## 1. What must hold, stated as a requirement

> **Changing IP address and clearing your cookies must change nothing.
> A shared link must not open the live show to someone with no entitlement.**

And the constraint that rules out half the usual answers up front:

> **Any heuristic based on an IP address or on a cookie is bypassable and does not count as an
> answer.** An IP is shared in a household and changes while roaming; a cookie is copied. Neither
> carries an entitlement.

What actually deals with sharing is **the concurrent-session limit**, held by the control plane,
with revocation. Not the address.

---

## 2. The problem the CDN creates

A CDN in front of the LL-HLS means **it is no longer our media server that serves the segments**.
So the "this person holds a seat" check can no longer happen at playback time: at the moment a
segment goes out, none of our processes is in the loop.

```
@arthome/core       says whether the entitlement is valid
streaming service   issues a short token against that entitlement
client              renews the token while the entitlement holds
CDN                 refuses anything that is not signed
```

The `PlaybackProvider` port must expose this capability **explicitly**: a future provider with no
signed URLs would break the business rule with nobody noticing.

---

## 3. The four pieces

### 3.1 The playback token — signed, short, renewed during the broadcast

<!-- arthome-codes-source: ERROR_CODES -->


Issued by `streaming`, **against a verified entitlement**, never against a session.

```
claims
  sub   profileId          did   deviceId
  dat   dateId             sid   playbackSessionId
  qmax  the quality ceiling the hardware security level allows
  scope full | preview     jti   unique identifier, for revocation
  exp   +120 s             kid   in the header, for rotation
```

**Lifetime: 120 seconds. Renewal interval: 45 seconds.**

`storefront-tv` Q9(b) required "≤ 60 s", and its requirement is met — but **it bears on the renewal
interval, not on the token's lifetime**, and the two must be told apart on pain of writing a false
guarantee (which is what I did: see the box in §3.3):

| | Bounded by | Value |
|---|---|---|
| time before **the client** learns it no longer has the entitlement | the **interval** | ≤ 45 s |
| time before **the edge stops serving** segments | the **token's lifetime** | up to 120 s |

It is the renewal that carries the concurrent-session limit, so it is indeed the interval that must
stay short — beyond a minute, the limit limits nothing. But it bounds only what the client knows,
never what the CDN serves.

**Renewal must not restart playback.** That is a constraint on the token's **shape**, not on its
lifetime: a token in the **path** would force a manifest reload and produce a micro-freeze every N
minutes, visible on a static theatre shot. So:

> **Never a token in a URL path.** It lives in a signed request or in a signed cookie, and the
> manifest path, like the segment paths, stays stable.

**A renewal refusal carries a code, and four distinct codes are necessary** — the TV shows four
different messages:

| Code | What the surface says |
|---|---|
| `watch.seat_expired` | your seat has expired |
| `watch.concurrent_limit_reached` | the concurrent-screen limit has been reached |
| `identity.signed_out_elsewhere` | you were signed out from another device |
| `api.service_unavailable` | our servers are not responding |

A generic code would produce a wrong one three times out of four.

**What else the token carries, and why it belongs here**: the protocol and the DRM system **chosen
by the server for this device**, and the **quality ceiling** its hardware security level allows.
The fleet imposes HLS + FairPlay on tvOS and DASH + Widevine elsewhere, with PlayReady on certain
models; **a client that guesses gets it wrong**, and it gets it wrong on the devices we cannot test.
A low-end HDMI stick offers only software Widevine, capped at SD: the server **degrades cleanly**
rather than refusing playback, and the TV **knows** it has been capped so it does not offer "4K" in
its quality panel.

**DRM serves device and quality tiering here, not an anti-copy promise.** §7 says so plainly.

### 3.2 Verification at the CDN edge — manifest **and** segments

> **A segment URL must not leak on its own.**

Signing the manifest and leaving the segments open is signing nothing: copying one segment link is
enough. So the signature bears on a **path prefix**, with an expiry:

```
/playback/{dateId}/{sessionScope}/*     signed, expires with the token
  ├── master.m3u8
  ├── {rendition}/index.m3u8
  └── {rendition}/seg-000123.m4s        covered by the SAME prefix signature
```

Two mechanisms, **declared by a port capability** because they are not equally available
everywhere:

| Mechanism | Where | Renewal |
|---|---|---|
| **signed cookies** on a prefix | browser (storefront web, studio web) | a same-origin call re-sets the cookie: **zero URL change, zero interruption** |
| **signature in a query parameter**, stable path | native players (TV, mobile) | the player re-applies the current token to each request through its request filter |

**The hard case, and it must be named**: `AVPlayer` on tvOS does not share the WebView's cookies
and offers no generic request filter. The answer is `AVAssetResourceLoaderDelegate`, which
intercepts the player's requests and applies the current header or parameter to them. That is
surface work, and **it is the point to validate on a real device before promising anything**: so
`PlaybackProvider` must declare `supportsSignedCookies` and `supportsQueryTokenRenewal`, and the
`PlaybackTicket` must say which one applies to this device.

**Stream paths are random and unpredictable** — `streaming.md` states it for the demonstration
mode, and it holds everywhere: a guessable path is one signature less.

### 3.3 The concurrent-session limit — **this is what deals with sharing**

<!-- arthome-codes-source: ERROR_CODES -->


Held by the control plane, **per entitlement** (the account and its plan), not per device and not
per address.

```
PlaybackSession   { id, accountId, profileId, deviceId, dateId,
                    leaseExpiresAt = now + 90 s }
```

**The lease expires for want of renewal. It is not released by a command.**
This is the most important decision in this section, and it comes from two surfaces independently:

- `storefront-tv`: *"`releasePlayback` cannot be guaranteed: a television gets unplugged, a set-top
  box loses power"*;
- `storefront-mobile`: *"the operating system kills an application without warning and without
  giving it time to close anything. A session that only closes on a client event leaves a ghost
  screen, and the user is refused their own second playback."*

So: **a 90 s lease, renewed every 45 s by the token renewal.** `releasePlayback` exists and speeds
the release up when the client manages it, but **nothing depends on it**. A household cannot end up
locked out by ghost sessions.

**The client can resume its own session**, identified by `deviceId`: reopening the player on the
same device reuses the lease instead of opening a second one.

**Beyond the ceiling** (`watch.plan_opening_multi_screen`: 2 screens on Premium, 1 otherwise), the renewal
is refused with `watch.concurrent_limit_reached` **and the list of active sessions** — device, city,
opening instant — so the surface can offer to **release one**. A bare refusal would leave the viewer
with no way out, which the file's principle no. 8 forbids.

**What the third screen sees** (`storefront-web` Q21): an explicit refusal, the list, and an action.
Never a network error, never a player spinning with no picture.

#### The real exposure window is 120 s, not 60 s — and I had written 60

This is the gravest defect the adversarial review found in my work (`skeptic.md` K3), because it
bears on **a security guarantee, numbered and published to five surfaces**.

> **Revocation does not revoke a token: it refuses the next renewal.** The window during which the
> edge keeps serving segments is therefore the lifetime of the **token in hand**, that is **up to
> 120 s** — and not the renewal interval.

```
revocation at T                                    token in hand, issued at T−ε
  │                                                  │
  ├── renewal at T+45 s: REFUSED                     ├── but it stays valid until T−ε+120 s
  │   the client knows                               │   and the CDN knows nothing
  └──────────────────────── real exposure ───────────┘
       best case  ~45 s           worst case  ~120 s           typical  45 to 75 s
```

A client that ignores the refusal — or that, more simply, does not stop — keeps pulling segments
that are **validly signed**. The prefix signature expires with the token (§3.2), not with the
decision.

**How the error happened, because it is instructive.** `storefront-tv` Q9(b) asked for "≤ 60 s", and
I copied 60 as if it were the guarantee obtained. But its requirement bore on the **renewal
interval** — that is what bounds the delay before the *client* learns of the refusal — and not on
the exposure time at the CDN. **I picked the number that pleased the question**, and it propagated
into four documents. That is critical rule 15 — a constant with two owners and two values — applied
this time to a security guarantee. One document alone was right: `adr-auth.md:520`.

**What the contract must serve**, and it is for `backend-contracts` to carry it: the value exposed
is not "60", it is **`playbackCutWithinSec = 120`**, accompanied by the expected typical value (45
to 75 s). And the integration test must measure **playback stopping**, not the renewal being
refused: a test that observes the refusal at 45 s goes green without having verified what the
sentence promises. **A false guarantee with a green test is worse than no guarantee.**

#### The arbitration returned: the token stays at 120 s

<!-- arthome-codes-source: ERROR_CODES -->


**Decision: we do not shorten the token.** Three reasons, and the first is the right one.

1. **The defect was never the window, it was the promise** — and that is repaired. Doubling the
   renewal frequency on the hottest path in the system in order to make a mechanism match a sentence
   somebody had written badly would be paying very dearly for a drafting error.
2. **120 s on a two-hour performance is 1.6% of the show.**
3. **The security property that matters is held at ISSUANCE, not at revocation.**
   *A shared link does not open the live show to someone with no entitlement*: that is settled when
   the token is issued against a verified entitlement. Revocation deals with an entirely different
   case — an entitlement that **existed and then ceased**: a lapsed subscription, a disconnected
   device, a screen limit crossed, a refund. None of those justifies doubling the load on the hot
   path.

**One addition for the visible case, and it is labelled honestly.** When somebody disconnects a
device from their account and watches the screen stop, 120 s is a long time. So the existing
realtime channel pushes, on `viewer:{profileId}` and `device:{deviceId}`, a signal asking the client
to **stop playback immediately**.

> **That signal is NOT a security boundary.** A modified client ignores it; the edge keeps serving
> for up to 120 s; **the guarantee remains 120 s**. It is a **courtesy that makes the common case
> instant**, never a control.

Saying it that way is not drafting caution: this document rejects "any IP or cookie heuristic" up
front because it is bypassable, and it would be incoherent to then present a client-side signal as a
protection. A mechanism an attacker can ignore is measured by the comfort it brings, not by the
security it does not.

**What would reopen the decision — a threshold, not an intention.** If we measure that renewing at
45 s costs **less than 5% of the `streaming` service's CPU time at peak** and **less than 2% of
added latency on `OpenPlayback`'s p95**, then shortening the token to 60 s becomes free and the
window falls from 120 to 60 s. **Until that is measured, we change nothing** — which is exactly the
error we have just corrected, in the other direction.

**Immediate revocation, two paths:**
- `identity.device.revoked.v1` consumed by `streaming` → that device's leases move to `revoked`.
  **Real exposure window: up to 120 s** — see the box above;
- an `interrupted` outcome declared → the date's leases are revoked with `date.interrupted`, **at
  the end of the renewal in progress**, not by an abrupt cut: a feed cut with no explanation is
  exactly what principle no. 6 forbids.

### 3.4 Key rotation

Two key sets, **never the same one**:

| Set | Verified by | Rotation | Grace |
|---|---|---|---|
| **session / internal token** (BFF → services) | each service, by JWKS, **locally** | **30 d** | **24 h** |
| **playback** (entitlement → CDN) | the **CDN edge** | **90 d** | **7 d** |

Cadences and `kid` are fixed by `adr-auth.md` §8.1, which owns the key design. **An earlier version
of this document gave 24 h to both sets: that was a plausible number and a wrong one**, and it is
exactly the kind of parallel literal E2 describes — on an operational value this time, not on a
vocabulary.

**Separating them is the point.** A compromise of the playback key must not yield a session, and the
reverse. The playback set is additionally **per environment**: a public demonstration key never
signs anything in production.

### Why the two cadences differ — and it is not a setting

Rotation is **overlapping**: the new key is published, both are accepted during the grace window,
then the old one is withdrawn. The question is **what the grace must cover**, and that is where I
was wrong:

> **The grace window must cover the CDN cache, not the token's lifetime.**

A grace sized on a token's 120 s — which is what this document said — is useless. The edge caches
the JWKS document **for hours**: publishing the new key and then signing with it sixty seconds later
leaves the edge serving the old document, and **it then rejects perfectly valid tokens**. The viewer
sees their playback stop for no reason, and the cause is invisible server-side — the token *is*
good.

Hence a contract value, owed by `backend-contracts`:

```
Cache-Control: max-age=3600   on the JWKS document
grace  ≥  2 × max-age         for EVERY key, whoever issues it
```

The shorter of the two graces (24 h) therefore keeps a factor of 24, deliberately. And the playback
cadence is slower than the BFFs' **for that precise reason**, not out of vague caution: it is the
one that crosses a cache we do not control.

**Two operational rules that go with it, and that only show up in production:**

1. **A failed rotation never withdraws a key.** The JWKS document's assembler only **unions** what
   the issuers publish; withdrawal is a **separate** step, conditioned on the grace. An assembler
   that rebuilt "exactly what it sees" would delete a temporarily silent issuer's key and
   **invalidate all its tokens in flight**.
2. **No private key ever appears in the published document.** The gate is one line and runs after
   *every* publication — a `d` in a published JWK is the system's signature handed to the world
   (`definition-of-done.md` §7.6, gate J1).

---

## 4. The free preview — enforced by the token, not by the client

<!-- arthome-codes-source: ERROR_CODES -->


A non-holder sees the first few minutes and then the lock. **A preview you extend by reloading the
page is not a preview** (`storefront-web` Q20), and a reinstalled application would reset a
client-side counter to zero (`storefront-mobile` Q6).

```
PreviewBudget  (accountId, dateId) → secondsUsed        counted down SERVER-SIDE
```

A non-holder's token is issued with `scope: preview` and
`exp = min(now + 120 s, now + secondsLeft)`. When the budget is exhausted, renewal is refused with
`watch.preview_exhausted`, and the surface puts up its lock — with the action that gets out of the dead
end, never a dead screen.

**The scope is the account, not the device**: otherwise a household with four devices gets four
previews. And the budget is **served** in the entitlement verdict, so the surface can show the
countdown without counting it itself.

---

## 5. What `streaming` must know in order to decide — and why it knows it

`decideWatch` has five inputs, belonging to three contexts. **No synchronous call between services
being permitted**, `streaming` keeps a **local projection** fed by Kafka:

| Input | Source | Arrives via |
|---|---|---|
| holding a seat | `ticketing` | `ticketing.seat.activated.v1` / `.cancelled` |
| plan and `opens[]`, screen ceiling | `ticketing` | `ticketing.subscription.changed.v1` |
| the date's state and its bounds | `catalog` | `catalog.date.scheduled.v1` / `.rescheduled` / `.outcome_declared` |
| replay policy and window | `catalog` | `catalog.date.replay_policy_set.v1` |
| territorial rights | `catalog` | `catalog.date.rights_changed.v1` |

This is **the only projection in the system that carries authority** — the seven others
(`data-model.md` §4) feed a display, this one decides an entitlement — and it is owned because both
alternatives are worse: a synchronous call between services is forbidden, and an entitlement decided
by the BFF has no authority — it produces no token.

**Freshness tolerated: ≤ 5 s.** Beyond that, `context-map.md` §11's `read_model_staleness_seconds`
alert fires. And the viewer's country is **resolved at every opening**, not projected: it changes
between two reads (travel, roaming, corporate network), and on mobile that gap is measured in hours.

**The entitlement is re-checked when playback starts, never inherited from the catalogue.** The
verdict served on a card is **indicative and not binding**, and the contract says so.

---

## 6. Ingest — the other end of the same problem

The right to **watch** and the right to **broadcast** are two things, but the discipline is the same:
a synchronous check **before** accepting anything.

| Mechanism | Role |
|---|---|
| the media server's **external HTTP authentication** → NestJS API | **synchronous, BEFORE the feed is accepted**: token, session, owner, expiry, quota |
| `runOnOnline` / `runOnOffline` / `runOnRead` hooks | **lifecycle only**: they report state, they decide nothing |
| Prometheus metrics | monitor and cut, **never authorise** |

**The hooks are not for authorising** — `streaming.md` is explicit, and the reason is concrete:
`runOnConnect` is a lifecycle event, so **a feed can get in before being refused**.

**The stream key is a secret displayed on a phone, in a venue, often in front of a contractor.**
Hence four guarantees, already stated in `data-model.md` §5.2: never in a list payload, revealed by
a distinct and audited command, rotated immediately with the old one stopping instantly, and
`Cache-Control: no-store` — the key must end up neither in the phone's HTTP cache nor in an
application snapshot the system takes when it goes to the background.

---

## 7. The limit we own

> **Nothing above prevents a screen recording.**

A viewer who films their television, or who captures their screen with software, gets a copy. No
segment signature, no session limit and no key rotation changes that: those mechanisms protect
**access**, not **copying**.

Only **DRM** with a protected media path and controlled output (HDCP) would do it, and even then:
against a camera pointed at a screen, nothing does.

**DRM is out of proportion here**, for three reasons we can write down:

1. **The cost.** A Widevine/PlayReady/FairPlay licence, a licence server, encrypted packaging per
   rendition and a test plan across a heterogeneous television fleet — for a live-performance
   platform run by one person.
2. **The return.** The value of a live-performance capture is very largely in the moment: the live
   show, the chat, the audience. A low-definition copy of a static theatre shot dents neither the
   box office nor the replay.
3. **The real risk is not copying, it is account sharing** — and that is exactly what the
   concurrent-session limit deals with, without DRM and without an address heuristic.

**What we keep of DRM anyway**: the `PlaybackTicket`'s `drm_system` field and its `qmax` ceiling.
They are not there to prevent copying; they are there because **the fleet requires them** — a player
that guesses its DRM system gets it wrong, and an HDMI stick with only software Widevine must
receive SD rather than a refusal.

It is this kind of judgement — **a composable architecture, instantiated at the minimum viable
level, with a paragraph explaining what has deliberately not been deployed and why** — that
`streaming.md` asks to be written, and that sends a stronger signal than an unfinished attempt to
stand everything up.
