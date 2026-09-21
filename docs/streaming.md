# Arthome — media plane and broadcasting

A companion to the handover README. Covers streaming: protocols, control plane
versus media plane, provider abstraction, and the demonstration mode.

---

## 1. The principle: two strictly separated planes

```
CONTROL PLANE             NestJS / TypeScript
MEDIA PLANE               specialised video infrastructure
```

NestJS **drives** the broadcast: the lifecycle of a live show, stream keys,
entitlements, chapters set in the control room, incidents, ticketing, replay
policy, business metrics.

NestJS **never transcodes or segments** anything itself. Media processing is
real-time work: it belongs to proven tools (MediaMTX, FFmpeg, a managed
provider), driven by the code, never reimplemented in JavaScript.

---

## 2. Protocols

### Ingest

```
RTMP / RTMPS   maximum compatibility (OBS, encoders)
SRT            professional contribution, unstable networks
WHIP           WebRTC publishing from the browser
```

### Public distribution

```
LL-HLS + CDN
```

HTTP, therefore cacheable and distributable. Compatible with web, mobile and
TV. On the web, `hls.js` when the browser has no native HLS.

**H.264 for everything, at least to begin with.** The installed base of
connected televisions is too heterogeneous; HEVC and AV1 would lose devices
with no visible benefit at the target bitrates.

### Control-room return feed

```
WebRTC / WHEP
```

Sub-second, for monitoring the stage. **The audience does not need WebRTC**:
LL-HLS at a few seconds is enough, and costs infinitely less.

```
OBS / encoder
      │
 RTMPS / SRT / WHIP
      ▼
 Media provider
      │
      ├── WebRTC/WHEP ──────────► Studio          sub-second latency
      │
      └── LL-HLS ──► CDN ───────► Storefront      web · mobile · TV
```

---

## 3. Provider abstraction

Arthome depends on no provider. Ports, in the control plane:

```ts
interface LiveIngestProvider {}
interface PlaybackProvider {}
interface RecordingProvider {}
interface StreamingMetricsProvider {}
```

No provider-specific identifier crosses the domain. Capabilities are declared
explicitly — RTMP, SRT, WHIP, HLS, LL-HLS, WHEP, recording, DRM, geographic
restrictions — because not every provider offers the same things.

### By environment

| Environment | Provider |
|---|---|
| Tests | `FakeStreamingProvider` |
| Development | `MediaMtxStreamingProvider` (docker-compose) |
| Simple demonstration | `FixtureStreamingProvider` — pre-recorded video presented as a live broadcast |
| Interactive demonstration | `SandboxMediaMtxProvider` — self-hosted MediaMTX, no video transcoding |
| Production | `CloudStreamingProvider` — Cloudflare Stream |

In production, a managed media plane rather than an FFmpeg/GPU farm to
maintain: Arthome owns the business, not the codecs.

---

## 4. Three points where the domain touches the infrastructure

These three are not implementation details. Each deserves an ADR.

### Signed playback, at the edge

A CDN in front of the LL-HLS means that **it is no longer your media server
that serves the segments**. The check "this person holds a seat" can therefore
no longer be done at playback time.

```
@arthome/core       says whether the seat is valid
streaming service   asks the PlaybackProvider for a short token
client              renews the token for as long as the seat holds
CDN                 refuses anything that is not signed
```

The `PlaybackProvider` port must expose this capability **explicitly**: a
future provider without signed URLs would break the business rule without
anyone noticing.

### The standby screen is a client-side overlay, not a stream switch

The control room can show a standby screen during an incident — that is the
four-step journey in `Studio.dc.html`. With a managed provider, switching the
upstream feed is slow and expensive.

The right solution: **the control plane publishes an incident state, the
player shows the standby screen over the video.** Instantaneous, identical on
web, mobile and TV, and the media stays intact for the resumption. The message
written by the control room travels with the state.

### The replay window belongs to the domain

The `RecordingProvider` stores and deletes. It is `@arthome/core` that decides
the length of the window and whether it is included in the price. Otherwise the
replay policy — the one that justifies the price difference — would end up
encoded in a storage lifecycle, out of reach of the tests.

Record **the master stream at ingest**, not only the HLS variants: replays can
then be regenerated cleanly.

---

## 5. Chat must be anchored to media time

A chat message carries **its position in the media**, not only the time it was
sent.

Without that, chat replayed over a recording will be offset by however long the
viewer took to start playback. The mockups provide for replays with chapters:
the problem is certain.

It costs nothing if you think of it at the start. It cannot be recovered
afterwards.

**Kafka / Redis boundary**: Kafka is the durable log — moderation, audit,
replay, history. Redis handles delivery to connected clients (pub/sub as the
Socket.IO adapter). Confusing the two is the classic mistake.

---

## 6. Demonstration mode

Two levels. The first is the default path, the second the memorable moment.

### Deterministic demonstration

A pre-recorded stream presented as a live broadcast. Works immediately, with
nothing to install, at no cost. **This is what a visitor sees by default.**

### Interactive demonstration

An authenticated visitor genuinely broadcasts and watches their stream cross
the whole platform. **Two entry points into the same media plane.**

**Default journey — the browser, over WHIP**

```
authenticated visitor → "Try a broadcast" → grants camera and microphone
  → getUserMedia → WHIP publish to MediaMTX
  → Studio shows the ON AIR state and the metrics
  → the Storefront plays the stream
```

No installation, a few seconds. **This is the journey to put forward**: nobody
will install OBS to try a demonstration. It is the difference between a
demonstration that ten people try and one that everybody tries.

**Advanced journey — OBS**, presented as an option and never as a
prerequisite: session created, temporary URL and credentials, publishing over
RTMPS, SRT or WHIP. Same end result, a workflow close to professional use.

Expected stream in both cases: H.264 *baseline*, 720p30, ~2 to 2.5 Mbps, a
keyframe every 2 s.

**No cloud provider in this mode**: per-minute billing exposed on a public
demonstration is a risk not worth taking. Self-hosted MediaMTX, no CDN.

### Codec constraints — the point that makes the demonstration fail

Without video transcoding, whatever comes in must be directly remuxable into
HLS. Two traps:

**Video — force H.264.** A browser will happily negotiate VP8, VP9 or AV1 over
WebRTC, and none of that remuxes into HLS. Constrain the SDP to H.264,
*baseline* profile. Plan for an **explicit failure**: some browsers and Android
devices offer no hardware H.264 encoder. A clear message is worth more than a
stream that never arrives — "your browser cannot broadcast in H.264, try the
OBS journey".

**Audio — Opus to AAC, transcoding mandatory.** The browser emits Opus over
WebRTC, by default and with no alternative. HLS expects AAC: Safari and most
televisions will not play Opus inside an HLS container. So an **audio-only
transcoding branch** is needed — negligible in CPU next to video, a few percent
of a core per stream, but indispensable. To be verified against the chosen
MediaMTX version: depending on the case it does this on its own, otherwise it
is an FFmpeg audio pass.

So the chain is not "no transcoding" but **"no video transcoding"**. The
distinction changes everything: one is free, the other is not.

**The WHEP branch to the control room keeps the Opus**: only the HLS branch
converts. The control room has no need for AAC, and it is the path most
sensitive to latency.

### Where the converted stream lands — the topology decides the latency

Two possible arrangements, only one acceptable.

FFmpeg reads from MediaMTX and **produces the HLS itself**: you lose MediaMTX's
LL-HLS muxer and get FFmpeg's classic HLS back. The "few seconds" becomes
eight, and the chat synchronisation argument collapses.

FFmpeg reads from MediaMTX, converts the audio, and **republishes into
MediaMTX** on a second path. MediaMTX keeps control of the LL-HLS. That is the
one.

```
WHIP → mediamtx/live/xxx          H.264 + Opus
         ├── WHEP ──────────────► Studio              no transcoding
         └── FFmpeg ────────────► mediamtx/hls/xxx    video copied, audio AAC
                                      └── LL-HLS ───► Storefront
```

On the FFmpeg pass: `-c:v copy`, `-fflags nobuffer`, a low `-max_delay`.
Without that FFmpeg will add its own buffer, and you will pay in latency what
you saved in CPU.

**General sandbox rule: remux before transcoding.** Transcoding is introduced
only where compatibility demands it — here, the audio, and only on the HLS
branch. On the OBS journey with H.264 and AAC on input, no pass is necessary:
remuxing alone.

### Authorisation, lifecycle, telemetry — three distinct mechanisms

```
Authorisation   MediaMTX external HTTP authentication → NestJS API
                synchronous, BEFORE the stream is accepted
                checks: token, session, owner, expiry, quota

Lifecycle       runOnOnline · runOnOffline · runOnRead · runOnUnread hooks
                report the state, decide nothing

Telemetry       MediaMTX Prometheus metrics
```

**The hooks are not there to authorise.** `runOnConnect` is a lifecycle event;
authorisation goes through the dedicated mechanism, failing which a stream can
get in before being refused.

### Real metrics, and honest ones

Without video transcoding, MediaMTX's metrics are exposed directly. The control
room's indicators — inbound and outbound bitrate, RTP packets, *jitter*,
connected players, bytes transferred, duration — **stop being simulated and
become real measurements**. That is exactly what the mockup promises; say so
explicitly in the README.

Two rules of honesty:

- **Never present a metric as native if it is not.** End-to-end latency
  requires a dedicated measurement — `RTCPeerConnection.getStats()` on the
  client, or application timestamps.
- **Adapt the dashboard to the input protocol.** Lost packets and *jitter*
  only exist on WebRTC input; over RTMP, carried on TCP, they make no sense.
  Hide what is not measured rather than showing zero: a zero reads as
  "perfect", not as "not measured".

### Monitoring adapts to the input protocol

WHEP is not mandatory for every source. **Never create a media branch just to
make a diagram uniform**: a transformation is only justified if it brings a
measurable property — compatibility, latency or quality.

```
WHIP source (H.264 + Opus)
  → WHEP straight to the Studio: sub-second is genuinely reachable
  → Opus → AAC audio branch for the Storefront only

RTMPS/SRT source (H.264 + AAC)
  → LL-HLS for Studio AND Storefront: same output, no transcoding
```

On RTMP input, ingest already carries one to three seconds of latency: the
floor is reached before the output. Transcoding AAC to Opus to obtain a WHEP
that will never be sub-second is paying for an unreachable promise. The
`monitor/{id}` branch is created only if it brings a measured gain.

### Lifecycle of the compatibility workers

Every stream that needs a missing representation spawns an FFmpeg process.
**These are first-class resources**, to be supervised as such.

**Start and stop tied to the MediaMTX lifecycle** — `runOnOnline` starts the
worker, going offline stops it. The hooks serve the lifecycle, never
authorisation.

**Grace period on going offline.** A two-second network cut at the venue takes
`live/{id}` offline and then online again: without a safeguard, the worker is
killed and restarted, `playback/{id}` destroyed and recreated, the HLS manifest
starts again from zero — and every connected player stalls over a simple
hiccup. So the worker is only killed after a few seconds with no publisher, and
a return within that window reuses it. This is a case distinct from the failure
of the worker, and far more frequent.

**Supervision** — a worker must never die in silence. Exit code, signal, crash
all surface to the domain as an incident (`COMPATIBILITY_WORKER_FAILED`) so
that the control room shows an explicit cause instead of a player that never
starts.

**Bounded retry** — three attempts with increasing delay, then declared
failure. Never an infinite restart: an FFmpeg that crashes in a loop consumes
the machine without producing anything.

**Garbage collector** — it periodically compares the live sessions with the
active workers. A worker without a session is killed; a session that should
have a worker and does not triggers an incident and a controlled recovery. The
MediaMTX lifecycle remains the normal mechanism; the garbage collector is the
safety net. **Never depend on a single cleanup mechanism.**

### Quotas separated by kind of resource

Not every session costs the same: an OBS input already in H.264/AAC consumes no
transcoding CPU, a browser input does.

```
MAX_ACTIVE_STREAMS    connections, memory, inbound bandwidth
MAX_AUDIO_TRANSCODES  CPU, RAM, system latency
MAX_EGRESS_MBIT       outbound bandwidth, server cost
```

**`MAX_AUDIO_TRANSCODES` is measured, it is not chosen.** A bench test on the
real host — 1, 4, 8, 12 workers — then observation of CPU, memory, latency and
stability. Machine comfortable up to twelve, degraded at sixteen: you settle on
eight or ten. The quota reflects real capacity, not an aesthetic number.

### Security

Never anonymous. Several layers:

```
authentication · anti-bot (Turnstile) · per-IP rate limiting
per-user quota · global quota · temporary stream token
random, unpredictable stream paths
```

**Authorisation by hooks, not by polling**: MediaMTX's `runOnConnect` and
`runOnPublish` call the NestJS API at the moment of publication — the token is
validated before the stream gets in. Prometheus polling remains useful for
watching the bitrate and cutting off, not for authorising.

### Quotas

```
1 active stream per user              3 creations per day
5 to 10 minutes per session           720p30, ~3 Mbps maximum
1 broadcaster, 1 or 2 viewers         recording disabled
TTL ~15 minutes                       private stream, not indexable
```

And global ceilings: `MAX_ACTIVE_STREAMS`, `MAX_DEMO_EGRESS`,
`MAX_DAILY_STREAM_MINUTES`, `MAX_CREATIONS_PER_MINUTE`. The demonstration is
not meant to scale: once capacity is reached, you refuse or fall back to the
pre-recorded demonstration.

A **spending cap at the provider account level**, on top of the application
quotas. Belt and braces.

### Cleanup

Every demonstration resource is ephemeral. A session carries at minimum `id`,
`ownerId`, `createdAt`, `expiresAt`, `providerResourceId`, `status`.

A periodic garbage collector spots expired sessions, stops the stream, revokes
the credentials, deletes the resources and cleans up orphans. **Never depend on
the browser closing cleanly** nor on a client end-of-session call.

---

## 7. What Arthome owns, and what it does not reimplement

**Arthome develops and owns**: the lifecycle of live shows, entitlements,
stream keys, orchestration, security, ticketing, replay policy, business
metrics.

**Arthome does not reimplement**: codecs, transcoding, HLS packaging, adaptive
bitrate engine, CDN distribution.

**The media plane must remain replaceable without touching the domain.**

---

## 8. An owned trade-off, to be written in the README

The architecture above is that of a real video platform. In a solo project,
what will actually be built: ingest, LL-HLS playback, the WHEP control-room
return feed, the demonstration mode, the signed tokens. Multi-region ingest,
the GPU farm and multi-CDN will remain a diagram.

That is not a gap. **A composable architecture, documented, instantiated at the
minimum viable level, with a paragraph explaining what was deliberately not
deployed and why**, sends a stronger signal than an unfinished attempt to stand
everything up.
