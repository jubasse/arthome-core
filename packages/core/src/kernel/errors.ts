/**
 * L'erreur de domaine porte un CODE, jamais une phrase.
 *
 * Decision « i18n par codes » : l'API rend des codes et leurs parametres,
 * enveloppe d'erreur comprise. Un message anglais qui remonte jusqu'a un ecran
 * fait fuir l'i18n des la premiere erreur de formulaire — et c'est le
 * formulaire de paiement qui la fait fuir en premier.
 */

/** Les parametres d'un message, resolus par la surface contre son catalogue. */
export type MessageParams = Readonly<Record<string, string | number | boolean>>;

/**
 * La NATURE d'un echec, que `studio-mobile` a demandee et qui manquait.
 *
 * C'est la decision qu'une personne en garde doit prendre en dix secondes :
 * reessayer, comprendre, ou decrocher le telephone d'astreinte.
 *
 * `offline_forbidden` n'est JAMAIS emise par un serveur : c'est la nature d'un
 * refus local, avant tout envoi. Elle est au vocabulaire pour que la surface
 * n'ait qu'une seule forme d'erreur a rendre.
 */
export const FAILURE_NATURES = ['refused', 'unavailable', 'offline_forbidden'] as const;
export type FailureNature = (typeof FAILURE_NATURES)[number];

export const FailureNature = {
  REFUSED: 'refused',
  UNAVAILABLE: 'unavailable',
  OFFLINE_FORBIDDEN: 'offline_forbidden',
} as const satisfies Record<string, FailureNature>;

export interface DomainErrorInit {
  readonly code: string;
  readonly params?: MessageParams;
  readonly nature?: FailureNature;
}

/** Une violation d'invariant. Elle ne porte pas de texte : elle porte un code. */
export class DomainError extends Error {
  public readonly code: string;
  public readonly params: MessageParams;
  public readonly nature: FailureNature;

  public constructor(init: DomainErrorInit) {
    super(init.code);
    this.name = 'DomainError';
    this.code = init.code;
    this.params = init.params ?? {};
    this.nature = init.nature ?? FailureNature.REFUSED;
  }
}

export function isDomainError(value: unknown): value is DomainError {
  return value instanceof DomainError;
}
