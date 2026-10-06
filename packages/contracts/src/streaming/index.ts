/**
 * `@arthome/contracts/streaming` — Watching: the advisory entitlement verdict and the incident veil a player displays.
 *
 * EVERY SCHEMA HERE IS A COMPONENT OF `openapi/storefront.yaml`, which is generated from it
 * (D-120): `pnpm run check:openapi-generated` fails when the committed document is not
 * what the schemas emit.
 *
 * The rules this file follows, each of which was a defect the gate found (D-060, D-065):
 *
 *   - `z.looseObject()` on everything a server sends — a closed schema makes a
 *     generated client reject a server that added a field.
 *   - `int64()`, never `z.int()` — the latter emits JavaScript's safe range,
 *     which is in no document.
 *   - `vocabularyOut` / `vocabularyOutNullable` for every enumerated value, never
 *     `z.enum()`: a strict enum fails the whole payload when a member is added,
 *     and televisions run year-old builds. A vocabulary local to the contract
 *     is declared here, passed as `'none'` and carries its reason.
 *   - vocabulary members in `examples` are the named constants, never literals.
 *   - identifiers and instants are `format: uuid` / `format: date-time` WITHOUT a
 *     `pattern`, because that is what the document publishes for these fields;
 *     core's `*IdSchema` and `InstantSchema` add a `pattern` the document does
 *     not carry here. Once the document gains it (D-065 family D), the local
 *     `uuidOut()` and `InstantOut` become those core schemas, one edit per file.
 */

import { z } from 'zod';

import {
  CHAT_MODES,
  INCIDENT_KINDS,
  PLAYBACK_RENEWAL_INTERVAL_SECONDS,
  WatchScope,
} from '@arthome/core';
import {
  InstantOut,
  int64,
  type VocabularyOut,
  type VocabularyOutNullable,
  uuidOut,
  vocabularyOut,
  vocabularyOutLocal,
  vocabularyOutNullable,
} from '@arthome/core/schema';

import { ChapterSchema, DateCardSchema } from '../catalog/index.js';
import { accessorOf, type AccessorOf } from '../http/index.js';
import { sensitive } from '../http/marks.js';
import { StorefrontLocalizedTextSchema } from '../text/index.js';

export const IncidentSchema: z.ZodNullable<
  z.ZodObject<
    {
      id: z.ZodOptional<z.ZodString>;
      kind: z.ZodOptional<VocabularyOut>;
      message: z.ZodOptional<typeof StorefrontLocalizedTextSchema>;
      raisedAt: z.ZodOptional<z.ZodString>;
    },
    z.core.$loose
  >
> = z
  .looseObject({
    id: uuidOut().optional(),
    kind: vocabularyOut(INCIDENT_KINDS).optional(),
    message: StorefrontLocalizedTextSchema.optional().describe(
      'Written by the control room: it is **content**, not an i18n key, and it travels with its\nauthoring language like a synopsis. One of the only two acknowledged exceptions to "i18n by\ncodes".\n',
    ),
    raisedAt: InstantOut.optional(),
  })
  .nullable()
  .describe(
    '**A client-side veil, never a stream switch**: the control room publishes the state, the\nplayer displays it over an untouched video. Instant, identical on all three storefronts, and\nthe media stays intact for the resume. Latency **≤ 2 s, non-negotiable**.\n',
  );

const TICKET_SCOPES: readonly [string, ...string[]] = [WatchScope.FULL, WatchScope.PREVIEW];

// The media capabilities: transport, not domain, so they live in this contract rather than in core,
// and a new member appears because a device appeared. Exported so the opening's request and the
// ticket read one declaration.

/** The ceiling a device's hardware security level allows. */
export const QUALITY_CAPS = ['sd', 'hd', 'fhd', 'uhd'] as const;
export type QualityCap = (typeof QUALITY_CAPS)[number];
export const QualityCap: AccessorOf<typeof QUALITY_CAPS> = accessorOf(QUALITY_CAPS);

export const PLAYBACK_PROTOCOLS = ['hls', 'dash'] as const;
export type PlaybackProtocol = (typeof PLAYBACK_PROTOCOLS)[number];
export const PlaybackProtocol: AccessorOf<typeof PLAYBACK_PROTOCOLS> =
  accessorOf(PLAYBACK_PROTOCOLS);

/** Declared by a device opening playback, and chosen by the server for it. */
export const DRM_SYSTEMS = ['fairplay', 'widevine', 'playready'] as const;
export type DrmSystem = (typeof DRM_SYSTEMS)[number];
export const DrmSystem: AccessorOf<typeof DRM_SYSTEMS> = accessorOf(DRM_SYSTEMS);

/** How the edge's signature is renewed on this device (`adr-stream-entitlement.md` §3.2). */
export const EDGE_RENEWAL_MODES = ['signed_cookie', 'query_token'] as const;
export type EdgeRenewalMode = (typeof EDGE_RENEWAL_MODES)[number];
export const EdgeRenewalMode: AccessorOf<typeof EDGE_RENEWAL_MODES> =
  accessorOf(EDGE_RENEWAL_MODES);

const AUDIO_TRACK_KINDS = ['main', 'audio_description'] as const;
const SUBTITLE_TRACK_KINDS = ['subtitles', 'captions', 'surtitles'] as const;

const LOCAL_ENDPOINT_REASON =
  'A vocabulary local to this contract. The domain neither produces nor consumes these values \u2014 they describe what this endpoint offers, and a new member is an endpoint change.';

const playbackSignature = (): z.ZodObject<
  {
    queryToken: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    cookieSet: z.ZodOptional<z.ZodNullable<z.ZodBoolean>>;
  },
  z.core.$loose
> =>
  z.looseObject({
    queryToken: sensitive(z.string()).nullable().optional(),
    cookieSet: z.boolean().nullable().optional(),
  });

export const ActivePlaybackSessionSchema: z.ZodObject<
  {
    sessionId: z.ZodString;
    deviceId: z.ZodOptional<z.ZodString>;
    isCurrentDevice: z.ZodOptional<z.ZodBoolean>;
    deviceLabel: z.ZodString;
    city: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    openedAt: z.ZodString;
  },
  z.core.$loose
> = z
  .looseObject({
    sessionId: uuidOut(),
    deviceId: uuidOut()
      .optional()
      .describe(
        '**Served, because without it the list is not actionable.** The surface must be able to\nrecognise **its own** session in order to offer "resume here" rather than "release another\nscreen", and a device label is not enough: two phones of the same model carry the same one.\n',
      ),
    isCurrentDevice: z.boolean().optional(),
    deviceLabel: z.string().meta({ examples: ['Téléviseur du salon'] }),
    city: z.string().nullable().optional(),
    openedAt: InstantOut,
  })
  .describe(
    'Served **with** the `watch.concurrent_limit_reached` refusal, so the surface can offer to release\none. A bare refusal would leave the viewer with no way out.\n',
  );

export const PlaybackRenewalSchema: z.ZodObject<
  {
    expiresAt: z.ZodString;
    renewAfterSec: z.ZodNumber;
    leaseExpiresAt: z.ZodString;
    signature: z.ZodOptional<ReturnType<typeof playbackSignature>>;
    qualityCap: z.ZodOptional<VocabularyOut>;
  },
  z.core.$loose
> = z
  .looseObject({
    expiresAt: InstantOut,
    renewAfterSec: int64().meta({ format: undefined }),
    leaseExpiresAt: InstantOut,
    signature: playbackSignature().optional(),
    qualityCap: vocabularyOut(QUALITY_CAPS, 'QUALITY_CAPS').optional(),
  })
  .describe(
    '**Partial** renewal: nothing that would force a stream reload. A player renews every\n`PLAYBACK_RENEWAL_INTERVAL_SECONDS` for a token of `PLAYBACK_TOKEN_LIFETIME_SECONDS` and a lease of\n`PLAYBACK_LEASE_SECONDS` (`@arthome/core`). A refusal carries its own code, one per screen: a\ngeneric code would produce a false one.\n',
  );

export const PlaybackTicketSchema: z.ZodObject<
  {
    sessionId: z.ZodString;
    resumedExistingSession: z.ZodOptional<z.ZodBoolean>;
    dateId: z.ZodString;
    scope: VocabularyOut;
    previewSecondsLeft: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
    protocol: VocabularyOut;
    drmSystem: z.ZodOptional<VocabularyOutNullable>;
    qualityCap: VocabularyOut;
    manifestUrl: z.ZodString;
    signature: ReturnType<typeof playbackSignature>;
    edgeRenewalMode: VocabularyOut;
    expiresAt: z.ZodString;
    renewAfterSec: z.ZodNumber;
    leaseExpiresAt: z.ZodString;
    resumePoint: z.ZodOptional<
      z.ZodNullable<
        z.ZodObject<
          {
            positionSec: z.ZodOptional<z.ZodNumber>;
            writtenAt: z.ZodOptional<z.ZodString>;
          },
          z.core.$loose
        >
      >
    >;
    liveEdgeSec: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
    chapters: z.ZodOptional<z.ZodArray<typeof ChapterSchema>>;
    audioTracks: z.ZodOptional<
      z.ZodArray<
        z.ZodObject<
          {
            id: z.ZodOptional<z.ZodString>;
            language: z.ZodOptional<z.ZodString>;
            kind: z.ZodOptional<VocabularyOut>;
          },
          z.core.$loose
        >
      >
    >;
    subtitleTracks: z.ZodOptional<
      z.ZodArray<
        z.ZodObject<
          {
            id: z.ZodOptional<z.ZodString>;
            language: z.ZodOptional<z.ZodString>;
            kind: z.ZodOptional<VocabularyOut>;
          },
          z.core.$loose
        >
      >
    >;
    chatMode: VocabularyOut;
    chatRateLimitPerSecond: z.ZodOptional<z.ZodNumber>;
    incident: z.ZodOptional<typeof IncidentSchema>;
    date: z.ZodOptional<typeof DateCardSchema>;
  },
  z.core.$loose
> = z
  .looseObject({
    sessionId: uuidOut().describe(
      '**Recoverable after an OS kill.** The token being `no-store`, a client killed by the OS no\nlonger has this `sessionId`: it could neither renew, nor release, nor point at its own\nsession in the refusal list. Reopening with the **same `deviceId`** returns the same\nsession — that is the mechanism, and it is declared.\n',
    ),
    resumedExistingSession: z
      .boolean()
      .optional()
      .describe(
        "True when this opening **took over this device's existing lease** instead of opening a second\none. This is what stops a household being blocked by its own ghost screens — and it is\ndecisive for a `pass` subscriber, whose ceiling is **one** screen: without takeover,\nreopening the app after an OS kill locks them out of their own phone for the lease's lifetime\n(`PLAYBACK_LEASE_SECONDS`).\n",
      ),
    dateId: uuidOut(),
    scope: vocabularyOut(TICKET_SCOPES, 'WATCH_SCOPES')
      .meta({
        'x-arthome-vocabulary-narrowing':
          '`none` is a verdict, not a ticket: a ticket exists only where playback was allowed, so a scope of `none` here would be a token for watching nothing.',
      })
      .describe(
        '**A strict narrowing of `WATCH_SCOPES`, and the missing member is the rule.** `none` is a\nverdict, not a ticket: a ticket exists only where playback was allowed, so a scope of\n`none` here would be a token for watching nothing. `WatchVerdict.scope` carries all three\nbecause a verdict can say no; this one cannot.\n\n`preview` for a non-holder, from on air (D-110): under the incident veil it is granted and costs\nnothing. Its token expires at the earlier of `PLAYBACK_TOKEN_LIFETIME_SECONDS` and the seconds\nleft, under the veil too (`previewTokenExpiresAt`), and it renews before (`previewRenewAfterSeconds`):\n**reloading the page extends nothing**, and a reinstalled app resets no counter — the budget\nis **server-side**, per **account**.\n',
      ),
    previewSecondsLeft: int64().meta({ format: undefined }).nullable().optional(),
    protocol: vocabularyOut(PLAYBACK_PROTOCOLS, 'PLAYBACK_PROTOCOLS'),
    drmSystem: vocabularyOutNullable(DRM_SYSTEMS, 'DRM_SYSTEMS')
      .optional()
      .describe(
        '**Chosen by the server for this device.** The fleet imposes HLS + FairPlay on tvOS and\nDASH + Widevine elsewhere, PlayReady on certain models: **a client that guesses gets it\nwrong**, and it gets it wrong on the devices we cannot test.\n',
      ),
    qualityCap: vocabularyOut(QUALITY_CAPS, 'QUALITY_CAPS').describe(
      'The ceiling the device\'s **hardware** security level allows. An entry-level HDMI stick offers\nonly software Widevine: the server **degrades cleanly** rather than refusing, and the surface\n**knows** it has been capped — so it does not offer "4K" in its quality panel.\n',
    ),
    manifestUrl: z
      .string()
      .meta({ format: 'uri' })
      .describe(
        '**The path is stable and never carries the token.** A token in the path would force a\nmanifest reload on every renewal, hence a micro-freeze every N minutes — visible on a static\ntheatre shot. Stream paths are random and unpredictable.\n',
      ),
    signature: playbackSignature().describe(
      'The signature covers a **path prefix**: signing the manifest and leaving the segments open is signing nothing.',
    ),
    edgeRenewalMode: vocabularyOut(EDGE_RENEWAL_MODES, 'EDGE_RENEWAL_MODES').describe(
      "**Declared, never guessed**: the two mechanisms are not equally available. `signed_cookie` for\na browser — a same-origin call resets the cookie, zero URL change, zero interruption.\n`query_token` for native players, which reapply the current token through their request\nfilter. `AVPlayer` on tvOS does not share the WebView's cookies: it is\n`AVAssetResourceLoaderDelegate`, and that is **the point to validate on a real device before\npromising anything**.\n",
    ),
    expiresAt: InstantOut.describe(
      '**`PLAYBACK_TOKEN_LIFETIME_SECONDS`** (D-020). The client learns it is no longer entitled\nwithin the renewal interval, but the edge may keep serving it until the token in hand expires.\n',
    ),
    renewAfterSec: int64()
      .meta({ format: undefined })
      .meta({ examples: [PLAYBACK_RENEWAL_INTERVAL_SECONDS] })
      .describe(
        '**`PLAYBACK_RENEWAL_INTERVAL_SECONDS`**, under the ceiling the TV requires: it is the renewal that carries the concurrent-screen limit. A preview renews sooner, before its token expires (`previewRenewAfterSeconds`).',
      ),
    leaseExpiresAt: InstantOut.describe(
      '**`PLAYBACK_LEASE_SECONDS`.** It is the **lease** that carries the concurrent-screen limit, not a release command:\na television gets unplugged, a set-top box loses power, the OS kills a mobile app without\nwarning. `releasePlayback` speeds it up, **nothing depends on it**.\n',
    ),
    resumePoint: z
      .looseObject({
        positionSec: int64().meta({ format: undefined }).optional(),
        writtenAt: InstantOut.optional(),
      })
      .nullable()
      .optional()
      .describe(
        "**A replay's only.** A live gives no control of playback and records no position (D-111),\nso a live's ticket carries none.\n",
      ),
    liveEdgeSec: int64().meta({ format: undefined }).nullable().optional(),
    chapters: z.array(ChapterSchema).optional(),
    audioTracks: z
      .array(
        z.looseObject({
          id: z.string().optional(),
          language: z.string().optional(),
          kind: vocabularyOutLocal(AUDIO_TRACK_KINDS, LOCAL_ENDPOINT_REASON).optional(),
        }),
      )
      .optional(),
    subtitleTracks: z
      .array(
        z.looseObject({
          id: z.string().optional(),
          language: z.string().optional(),
          kind: vocabularyOutLocal(SUBTITLE_TRACK_KINDS, LOCAL_ENDPOINT_REASON).optional(),
        }),
      )
      .optional(),
    chatMode: vocabularyOut(CHAT_MODES),
    chatRateLimitPerSecond: int64().meta({ format: undefined }).optional(),
    incident: IncidentSchema.optional(),
    date: DateCardSchema.optional(),
  })
  .describe(
    '**The whole `player` screen in a single response**: chapters, tracks, chat regime, ongoing\nincident, resume point, live edge, DRM and quality ceiling. No player panel may trigger a\ncall — on television a modal *is* a page, and the budget is one round trip.\n\n**Budget: ≤ 1 s**, within a total budget of about 10 s to first frame.\n\n**Never cached** — `Cache-Control: no-store`. A right reread from disk is a false right.\n',
  );
