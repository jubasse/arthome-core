/**
 * Le CODE DE PLACE — emis par le SERVEUR, jamais derive cote client.
 *
 * `storefront-web` Q18 : il s'affiche a l'identique sur le web, le mobile et la
 * TV. La maquette le calcule par HACHAGE — commodite qui, portee telle quelle,
 * donnerait **trois codes differents pour la meme place** des qu'une surface
 * change de fonction de hachage. Ce n'est pas un risque theorique : les trois
 * surfaces sont ecrites dans trois langages par trois piles differentes.
 *
 * Ce module ne GENERE donc pas un code depuis un identifiant : il en valide la
 * FORME et le formate. La generation est une ecriture de service, avec une
 * source d'alea et une contrainte d'unicite — deux choses qu'un domaine pur
 * n'a pas.
 */

import { DomainError } from '../kernel/errors.js';

/**
 * L'alphabet : Crockford base 32 — les dix chiffres, et les lettres SAUF
 * `I`, `L`, `O` et `U`.
 *
 * ⚠ Le choix de l'exclusion n'est pas libre, et une premiere redaction s'y est
 * trompee : exclure LES DEUX membres d'une paire confusable (`0` ET `O`)
 * rend la correction IMPOSSIBLE — un spectateur qui dicte « O » au support n'a
 * alors aucune valeur valide a laquelle on puisse le ramener.
 *
 * Crockford garde un membre de chaque paire et exclut l'autre, ce qui rend la
 * normalisation SURE plutot que devinee : `I` et `L` ne peuvent etre que `1`,
 * `O` ne peut etre que `0`. Et `U` est exclue pour une raison sans rapport —
 * eviter de composer par hasard un mot grossier.
 */
export const SEAT_CODE_ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
export const SEAT_CODE_BODY_LENGTH = 6;
const SEAT_CODE_PREFIX = 'ATH';

const SEAT_CODE_SHAPE = new RegExp(`^${SEAT_CODE_PREFIX}-[${SEAT_CODE_ALPHABET}]{${String(SEAT_CODE_BODY_LENGTH)}}$`);

export function isSeatCode(value: string): boolean {
  return SEAT_CODE_SHAPE.test(value);
}

/**
 * Compose un code a partir d'un corps deja tire par le service.
 *
 * Le corps vient d'une source d'alea cryptographique cote service : le domaine
 * n'en a pas, et c'est tant mieux — une source d'alea rendrait ce paquet
 * dependant d'une API de plateforme, ce qu'il s'interdit.
 */
export function seatCode(body: string): string {
  const normalized = body.toUpperCase();
  const code = `${SEAT_CODE_PREFIX}-${normalized}`;
  if (!isSeatCode(code)) {
    throw new DomainError({ code: 'seat_code.malformed', params: { body } });
  }
  return code;
}

/**
 * Normalise une saisie humaine avant comparaison.
 *
 * Le support lit un code au telephone, le spectateur le retape : minuscules,
 * espaces, tiret oublie, prefixe omis, et surtout les confusables. La
 * correction est SURE et non devinee : `I` et `L` sont absentes de l'alphabet,
 * donc elles ne peuvent etre que `1` ; `O` en est absente, donc elle ne peut
 * etre que `0`.
 *
 * ⚠ On ne corrige RIEN d'autre. Un caractere qui reste hors alphabet apres
 * normalisation fait echouer `isSeatCode`, et c'est le bon resultat : mieux
 * vaut « ce code n'existe pas » qu'un code voisin trouve par hasard.
 */
export function normalizeSeatCodeInput(raw: string): string {
  const body = raw
    .toUpperCase()
    .replace(/[\s-]/g, '')
    .replace(/^ATH/, '')
    .replace(/[IL]/g, '1')
    .replace(/O/g, '0');
  return `${SEAT_CODE_PREFIX}-${body}`;
}
