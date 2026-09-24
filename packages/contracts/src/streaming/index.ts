/**
 * `@arthome/contracts/streaming` — Watching: the advisory entitlement verdict and the incident veil a player displays.
 *
 * EVERY SCHEMA HERE EMITS A NAMED SCHEMA OF `openapi/storefront.yaml` EXACTLY, and
 * `pnpm run check:emit-diff` is what proves it: the document is authoritative
 * (D-058), so where the two differ the schema changes.
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
 *     `uuid()` and `instant()` become those core schemas, one edit per file.
 */

import { z } from 'zod';

import { CHAT_MODES, INCIDENT_KINDS, WatchScope } from '@arthome/core';
import {
  type VocabularyOut,
  type VocabularyOutNullable,
  int64,
  vocabularyOut,
  vocabularyOutLocal,
  vocabularyOutLocalNullable,
} from '@arthome/core/schema';

import { ChapterSchema, DateCardSchema } from '../catalog/index.js';
import { StorefrontLocalizedTextSchema } from '../text/index.js';

const uuid = (): z.ZodString => z.string().meta({ format: 'uuid' });

const instant = (): z.ZodString => z.string().meta({ format: 'date-time' });

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
    id: uuid().optional(),
    kind: vocabularyOut(INCIDENT_KINDS).optional(),
    message: StorefrontLocalizedTextSchema.optional().describe(
      'Written by the control room: it is **content**, not an i18n key, and it travels with its\nauthoring language like a synopsis. One of the only two acknowledged exceptions to "i18n by\ncodes".\n',
    ),
    raisedAt: instant().optional(),
  })
  .nullable()
  .describe(
    '**A client-side veil, never a stream switch**: the control room publishes the state, the\nplayer displays it over an untouched video. Instant, identical on all three storefronts, and\nthe media stays intact for the resume. Latency **≤ 2 s, non-negotiable**.\n',
  );

const TICKET_SCOPES: readonly [string, ...string[]] = [WatchScope.FULL, WatchScope.PREVIEW];
const QUALITY_CAPS = ['sd', 'hd', 'fhd', 'uhd'] as const;
const PROTOCOLS = ['hls', 'dash'] as const;
const DRM_SYSTEMS = ['fairplay', 'widevine', 'playready'] as const;
const EDGE_RENEWAL_MODES = ['signed_cookie', 'query_token'] as const;
const AUDIO_TRACK_KINDS = ['main', 'audio_description'] as const;
const SUBTITLE_TRACK_KINDS = ['subtitles', 'captions', 'surtitles'] as const;

const MEDIA_CAPABILITY_REASON =
  'A transport or media capability, not a domain notion: the domain never chooses an ingest protocol, a container or a DRM system, and a new one appears because a device appeared.';
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
    queryToken: z.string().nullable().optional(),
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
    sessionId: uuid(),
    deviceId: uuid()
      .optional()
      .describe(
        '**Served, because without it the list is not actionable.** The surface must be able to\nrecognise **its own** session in order to offer "resume here" rather than "release another\nscreen", and a device label is not enough: two phones of the same model carry the same one.\n',
      ),
    isCurrentDevice: z.boolean().optional(),
    deviceLabel: z.string().meta({ examples: ['Téléviseur du salon'] }),
    city: z.string().nullable().optional(),
    openedAt: instant(),
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
    expiresAt: instant(),
    renewAfterSec: int64().meta({ format: undefined }),
    leaseExpiresAt: instant(),
    signature: playbackSignature().optional(),
    qualityCap: vocabularyOutLocal(QUALITY_CAPS, MEDIA_CAPABILITY_REASON).optional(),
  })
  .describe(
    '**Partial** renewal: nothing that would force a stream reload. The refusal carries one of the\nfour distinct codes — a generic code would produce a false one three times out of four.\n',
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
    sessionId: uuid().describe(
      '**Recoverable after an OS kill.** The token being `no-store`, a client killed by the OS no\nlonger has this `sessionId`: it could neither renew, nor release, nor point at its own\nsession in the refusal list. Reopening with the **same `deviceId`** returns the same\nsession — that is the mechanism, and it is declared.\n',
    ),
    resumedExistingSession: z
      .boolean()
      .optional()
      .describe(
        "True when this opening **took over this device's existing lease** instead of opening a second\none. This is what stops a household being blocked by its own ghost screens — and it is\ndecisive for a `pass` subscriber, whose ceiling is **one** screen: without takeover,\nreopening the app after an OS kill locks them out of their own phone for the ninety seconds\nof the lease.\n",
      ),
    dateId: uuid(),
    scope: vocabularyOut(TICKET_SCOPES, 'WATCH_SCOPES')
      .meta({
        'x-arthome-vocabulary-narrowing':
          '`none` is a verdict, not a ticket: a ticket exists only where playback was allowed, so a scope of `none` here would be a token for watching nothing.',
      })
      .describe(
        '**A strict narrowing of `WATCH_SCOPES`, and the missing member is the rule.** `none` is a\nverdict, not a ticket: a ticket exists only where playback was allowed, so a scope of\n`none` here would be a token for watching nothing. `WatchVerdict.scope` carries all three\nbecause a verdict can say no; this one cannot.\n\n`preview` for a non-holder. Its token expires at `min(now + 120 s, now + secondsLeft)`:\n**reloading the page extends nothing**, and a reinstalled app resets no counter — the budget\nis **server-side**, per **account**.\n',
      ),
    previewSecondsLeft: int64().meta({ format: undefined }).nullable().optional(),
    protocol: vocabularyOutLocal(PROTOCOLS, MEDIA_CAPABILITY_REASON),
    drmSystem: vocabularyOutLocalNullable(DRM_SYSTEMS, MEDIA_CAPABILITY_REASON)
      .optional()
      .describe(
        '**Chosen by the server for this device.** The fleet imposes HLS + FairPlay on tvOS and\nDASH + Widevine elsewhere, PlayReady on certain models: **a client that guesses gets it\nwrong**, and it gets it wrong on the devices we cannot test.\n',
      ),
    qualityCap: vocabularyOutLocal(QUALITY_CAPS, MEDIA_CAPABILITY_REASON).describe(
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
    edgeRenewalMode: vocabularyOutLocal(EDGE_RENEWAL_MODES, MEDIA_CAPABILITY_REASON).describe(
      "**Declared, never guessed**: the two mechanisms are not equally available. `signed_cookie` for\na browser — a same-origin call resets the cookie, zero URL change, zero interruption.\n`query_token` for native players, which reapply the current token through their request\nfilter. `AVPlayer` on tvOS does not share the WebView's cookies: it is\n`AVAssetResourceLoaderDelegate`, and that is **the point to validate on a real device before\npromising anything**.\n",
    ),
    expiresAt: instant().describe(
      "**120 s.** The window during which one watches a stream one is no longer entitled to is the\n**renewal** interval, not the token's lifetime.\n",
    ),
    renewAfterSec: int64()
      .meta({ format: undefined })
      .meta({ examples: [45] })
      .describe(
        '**45 s**, under the 60 s ceiling the TV requires: it is the renewal that carries the concurrent-screen limit.',
      ),
    leaseExpiresAt: instant().describe(
      '**90 s.** It is the **lease** that carries the concurrent-screen limit, not a release command:\na television gets unplugged, a set-top box loses power, the OS kills a mobile app without\nwarning. `releasePlayback` speeds it up, **nothing depends on it**.\n',
    ),
    resumePoint: z
      .looseObject({
        positionSec: int64().meta({ format: undefined }).optional(),
        writtenAt: instant().optional(),
      })
      .nullable()
      .optional(),
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
