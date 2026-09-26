/**
 * i18n: the keys and the reference catalogue, never the sentences.
 *
 * C6 — compiling the dictionaries in at build time is no longer enough, because fixing a typo on
 * mobile or TV would wait for a store review. An immutable versioned artefact serves updates on top
 * over a CDN, and each application embeds a build-time snapshot as a mandatory fallback.
 *
 * No service owns this catalogue (`context-map.md` §1.8): it has no invariant, no transaction and
 * no event, and a service that serves a static file is a service to operate for nothing.
 */

import { DomainError } from '../kernel/errors.js';
import { DomainGuardCode } from '../vocabulary/error-codes.js';

/** The five copy domains, split so the embedded snapshot stays small. */
export const MESSAGE_DOMAINS = ['common', 'storefront', 'studio', 'taxonomy', 'system'] as const;
export type MessageDomain = (typeof MESSAGE_DOMAINS)[number];

export const MessageDomain = {
  COMMON: 'common',
  STOREFRONT: 'storefront',
  STUDIO: 'studio',
  TAXONOMY: 'taxonomy',
  SYSTEM: 'system',
} as const;

/**
 * A message key: `<domain>.<path>`. A branded `string` rather than a union of the 1,126 real keys,
 * which would make adding copy a version change of the domain.
 */
export type MessageKey = string;

const KEY_SHAPE = /^[a-z][a-zA-Z0-9]*(?:\.[a-zA-Z0-9][a-zA-Z0-9-]*)+$/;

export function messageKey(raw: string): MessageKey {
  if (!KEY_SHAPE.test(raw)) {
    throw new DomainError({ code: DomainGuardCode.I18N_KEY_MALFORMED, params: { key: raw } });
  }
  return raw;
}

export function domainOf(key: MessageKey): MessageDomain | null {
  const head = key.split('.')[0] ?? '';
  return (MESSAGE_DOMAINS as readonly string[]).includes(head) ? (head as MessageDomain) : null;
}

/**
 * The key of an enumeration member: `enums.<type>.<value>`. The surfaces concatenated by hand and
 * produced `enums.moderationState.published` against `catalogue.messageStates.ok` — two keys for
 * one state (E3).
 */
export function enumKey(vocabulary: string, member: string): MessageKey {
  return messageKey(`enums.${vocabulary}.${member}`);
}

/**
 * The catalogue version served to a surface, carried by the bootstrap. It never blocks the first
 * render — the embedded snapshot is enough — which `storefront-tv` requires: there is an instant
 * when the TV knows neither the profile, nor the language, nor the labels.
 */
export interface LabelCatalogRef {
  /**
   * Open, and owned by `backend-contracts`: `MESSAGE_DOMAINS` is expressible nowhere in either
   * contract. The served `labelCatalog` carries `{ locale, version, url }`, so the domain survives
   * only inside the URL and a client must take a string apart to recover it — the one real gap the
   * inverse check found, not a deliberate domain-only member.
   */
  readonly domain: MessageDomain;
  readonly locale: string;
  readonly version: number;
  readonly url: string;
}
