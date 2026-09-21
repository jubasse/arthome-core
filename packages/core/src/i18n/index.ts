/**
 * L'i18n : les CLES et le catalogue de reference. **Jamais les phrases.**
 *
 * C6 — le modele a change en cours de projet. `i18n-compile.js` compilait les
 * dictionnaires dans chaque surface au build ; cela reste vrai et ne suffit
 * plus, parce que corriger une coquille sur mobile ou sur TV demanderait
 * d'attendre une revue de magasin.
 *
 * Le modele retenu, et ce module en est la moitie stable :
 *   - `core` garde les CLES et le catalogue de reference ;
 *   - un artefact VERSIONNE IMMUABLE sert les mises a jour par-dessus,
 *     `/{surface}/{locale}/v{N}.json`, en CDN ;
 *   - chaque application embarque un INSTANTANE AU BUILD comme repli
 *     obligatoire — jamais un code brut affiche si le service est
 *     indisponible.
 *
 * ⚠ AUCUN SERVICE NE POSSEDE CE CATALOGUE (`context-map.md` §1.8). Il n'a ni
 * invariant, ni transaction, ni evenement : c'est un fichier statique, et un
 * service qui sert un fichier statique est un service a exploiter pour rien.
 */

import { DomainError } from '../kernel/errors.js';

/** Les cinq domaines de copie, decoupes pour que l'instantane embarque soit petit. */
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
 * Une cle de message : `<domaine>.<chemin>`.
 *
 * Le type reste `string` marque plutot qu'une union des 1 126 cles reelles :
 * les geler dans le paquet ferait d'un ajout de copie un changement de version
 * du domaine, ce qui est exactement ce que le catalogue dynamique existe pour
 * eviter.
 */
export type MessageKey = string;

const KEY_SHAPE = /^[a-z][a-zA-Z0-9]*(?:\.[a-zA-Z0-9][a-zA-Z0-9-]*)+$/;

export function messageKey(raw: string): MessageKey {
  if (!KEY_SHAPE.test(raw)) {
    throw new DomainError({ code: 'i18n.key_malformed', params: { key: raw } });
  }
  return raw;
}

export function domainOf(key: MessageKey): MessageDomain | null {
  const head = key.split('.')[0] ?? '';
  return (MESSAGE_DOMAINS as readonly string[]).includes(head) ? (head as MessageDomain) : null;
}

/**
 * La cle d'un membre d'enumeration : `enums.<type>.<valeur>`.
 *
 * C'est la seule fabrique de cles du paquet, et elle existe pour une raison
 * precise : les surfaces resolvaient les libelles d'enumeration en concatenant
 * a la main, ce qui a produit `enums.moderationState.published` d'un cote et
 * `catalogue.messageStates.ok` de l'autre — deux cles pour un meme etat (E3).
 */
export function enumKey(vocabulary: string, member: string): MessageKey {
  return messageKey(`enums.${vocabulary}.${member}`);
}

/**
 * La version du catalogue servie a une surface, portee par l'amorcage.
 *
 * Elle ne bloque JAMAIS le premier rendu : l'instantane embarque suffit, et le
 * catalogue servi se superpose ensuite. `storefront-tv` en fait une exigence —
 * il existe un instant, avant la premiere reponse, ou la TV ne connait ni le
 * profil, ni la langue, ni les libelles.
 */
export interface LabelCatalogRef {
  readonly domain: MessageDomain;
  readonly locale: string;
  readonly version: number;
  readonly url: string;
}
