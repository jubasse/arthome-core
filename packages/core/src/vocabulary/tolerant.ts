/**
 * La lecture TOLERANTE d'un vocabulaire ferme.
 *
 * C'est la seule chose de ce paquet qui, mal faite, produit un ecran noir chez
 * des gens qui ne peuvent rien y faire.
 *
 * Une revue de magasin TV est lente : une version publiee aujourd'hui tournera
 * dans des salons dans un an. Le jour ou le catalogue gagne une 22e discipline,
 * une nouvelle issue de date ou un nouveau regime de tchat, CES TELEVISEURS LA
 * RECEVRONT. Or une validation stricte par enumeration ne degrade pas
 * l'affichage d'une carte : elle fait echouer la validation de la PAGE ENTIERE.
 *
 * D'ou la regle, ecrite au contrat et implementee ici une fois :
 *   conserver la valeur brute et la traiter comme NEUTRE, jamais rejeter.
 *
 * La severite porte sur la FORME — les champs obligatoires, les types —
 * jamais sur le MEMBRE d'un vocabulaire. (storefront-tv Q12.)
 */

/** Un vocabulaire ferme : la liste qui fait autorite. */
export type Vocabulary<T extends string> = readonly T[];

export interface KnownMember<T extends string> {
  readonly known: true;
  readonly value: T;
}

export interface UnknownMember {
  readonly known: false;
  /** La valeur brute, CONSERVEE. Elle est neutre, elle n'est pas perdue. */
  readonly raw: string;
}

export type Tolerant<T extends string> = KnownMember<T> | UnknownMember;

/**
 * Lit une valeur contre son vocabulaire sans jamais echouer.
 *
 * Une valeur inconnue revient telle quelle, marquee comme inconnue : la surface
 * l'affiche avec un libelle generique plutot qu'un code brut, et le reste de la
 * page rend normalement.
 */
export function parseTolerant<T extends string>(vocabulary: Vocabulary<T>, raw: string): Tolerant<T> {
  return (vocabulary as readonly string[]).includes(raw)
    ? { known: true, value: raw as T }
    : { known: false, raw };
}

/**
 * Garde de type, pour les chemins ou une valeur inconnue doit etre ignoree
 * plutot que conservee — un filtre, un tri, un agregat.
 *
 * A n'utiliser QUE la ou la valeur ne s'affiche pas : sur un affichage, c'est
 * `parseTolerant` qui s'applique.
 */
export function isMember<T extends string>(vocabulary: Vocabulary<T>, raw: string): raw is T {
  return (vocabulary as readonly string[]).includes(raw);
}

/**
 * Rend la valeur si elle est connue, la valeur de repli sinon.
 *
 * Le repli est TOUJOURS explicite a l'appel : un repli par defaut cache dans
 * cette fonction ferait retomber tout le monde sur la meme valeur sans que
 * personne le voie — exactement ce que `helpers.planOf()` faisait avec `free`,
 * et c'est un defaut d'autorisation (E1).
 */
export function memberOr<T extends string>(vocabulary: Vocabulary<T>, raw: string, fallback: T): T {
  return isMember(vocabulary, raw) ? raw : fallback;
}
