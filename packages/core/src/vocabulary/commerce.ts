/**
 * Les vocabulaires du commerce du spectateur : ce qu'il achete, et ce que cet
 * achat ouvre.
 *
 * ⚠ CE FICHIER EST DECLARANT (voir catalog.ts).
 */

/** Tranche par `shared` : `enums.priceTier`. */
export const PRICE_TIERS = ['full', 'reduced', 'support'] as const;
export type PriceTier = (typeof PRICE_TIERS)[number];

export const PriceTier = {
  FULL: 'full',
  REDUCED: 'reduced',
  SUPPORT: 'support',
} as const;

/**
 * E1 — L'ECART LE PLUS GRAVE DU DOSSIER, et ce n'est pas un defaut d'affichage.
 *
 * Quatre vocabulaires disjoints coexistaient : `plans[]` de `catalogue.json`
 * (`free`/`pass`/`premium`), `accounts[].plan` (`season`/`monthly`/`none`),
 * l'i18n qui traduit les six, et deux maquettes qui en inventent d'autres.
 * Consequence VERIFIEE : `helpers.planOf()` fait
 * `plans().filter(p => p.id === account.plan)[0] || plans()[0]` — AUCUN compte
 * de reference ne trouve le sien, TOUS retombent silencieusement sur `free`.
 * Et comme `plan.opens[]` conditionne l'acces a la lecture, c'est un DEFAUT
 * D'AUTORISATION.
 *
 * `catalogue.json` fait autorite. `monthly`, `season` et `none` sont retires :
 * aucune donnee ne les reference. Et la place a l'unite n'est pas un
 * abonnement, c'est un MODE D'ACHAT : elle n'entre pas dans ce vocabulaire.
 */
export const PLAN_TIERS = ['free', 'pass', 'premium'] as const;
export type PlanTier = (typeof PLAN_TIERS)[number];

export const PlanTier = {
  FREE: 'free',
  PASS: 'pass',
  PREMIUM: 'premium',
} as const;

/**
 * Les NEUF ouvertures reellement portees par `catalogue.json`.
 *
 * Orthographe : celle de `shared/`, A LA LETTRE — donc kebab-case (K6).
 * Un `opens.includes('multi-screen')` sur une charge utile qui porterait
 * `multi_screen` rend `false` EN SILENCE : tout le monde retombe a un ecran,
 * ce qui est la forme exacte d'E1, reintroduite par le contrat apres avoir ete
 * corrigee sur les formules.
 */
export const PLAN_OPENINGS = [
  'browse',
  'trailers',
  'free-dates',
  'replays',
  'no-ads',
  'one-live-month',
  'all-lives',
  'multi-screen',
  'archive',
] as const;
export type PlanOpening = (typeof PLAN_OPENINGS)[number];

export const PlanOpening = {
  BROWSE: 'browse',
  TRAILERS: 'trailers',
  FREE_DATES: 'free-dates',
  REPLAYS: 'replays',
  NO_ADS: 'no-ads',
  ONE_LIVE_MONTH: 'one-live-month',
  ALL_LIVES: 'all-lives',
  MULTI_SCREEN: 'multi-screen',
  ARCHIVE: 'archive',
} as const;

export const SUBSCRIPTION_STATES = ['active', 'past-due', 'sub-cancelled', 'trialing'] as const;
export type SubscriptionState = (typeof SUBSCRIPTION_STATES)[number];

export const SubscriptionState = {
  ACTIVE: 'active',
  PAST_DUE: 'past-due',
  CANCELLED: 'sub-cancelled',
  TRIALING: 'trialing',
} as const;

/**
 * Cinq motifs relevés dans la conception, avec des regles distinctes.
 * `late-rate` est au PRORATA du temps restant : le prix depend de l'instant de
 * lecture, donc il voyage avec sa validite et n'est jamais une chaine figee.
 */
export const PROMOTION_REASONS = [
  'pre-sale',
  'preview-night',
  'discovery-rate',
  'final-date',
  'late-rate',
] as const;
export type PromotionReason = (typeof PROMOTION_REASONS)[number];

export const PromotionReason = {
  PRE_SALE: 'pre-sale',
  PREVIEW_NIGHT: 'preview-night',
  DISCOVERY_RATE: 'discovery-rate',
  FINAL_DATE: 'final-date',
  LATE_RATE: 'late-rate',
} as const;

/** D-011 : deux commandes DISTINCTES, jamais une commande mixte. */
export const ORDER_KINDS = ['seat-order', 'merch-order', 'subscription-order'] as const;
export type OrderKind = (typeof ORDER_KINDS)[number];

export const OrderKind = {
  SEAT: 'seat-order',
  MERCH: 'merch-order',
  SUBSCRIPTION: 'subscription-order',
} as const;

/**
 * `held` tant qu'une ISSUE est ouverte, `refunded` si la date est annulee,
 * `suspended` tant qu'un changement de coordonnees bancaires attend sa
 * contre-signature. Ce que `shared/` porte et qui fait autorite : commission
 * 12 %, delai 14 jours, arrondi a l'unite sur chaque composante separement.
 */
export const PAYOUT_STATES = ['scheduled-payout', 'held', 'paid', 'refunded', 'suspended'] as const;
export type PayoutState = (typeof PAYOUT_STATES)[number];

export const PayoutState = {
  SCHEDULED: 'scheduled-payout',
  HELD: 'held',
  PAID: 'paid',
  REFUNDED: 'refunded',
  SUSPENDED: 'suspended',
} as const;

/**
 * Le taux depend du couple JURIDICTION x NATURE DE LA PRESTATION, jamais d'une
 * constante par marche. L'arret Derby Quad contre HMRC a juge que
 * l'exoneration des places de theatre NE S'ETEND PAS au direct diffuse.
 */
export const TAX_SUPPLY_KINDS = [
  'live-stream-access',
  'replay-access',
  'subscription-access',
  'merchandise',
] as const;
export type TaxSupplyKind = (typeof TAX_SUPPLY_KINDS)[number];

export const TaxSupplyKind = {
  LIVE_STREAM_ACCESS: 'live-stream-access',
  REPLAY_ACCESS: 'replay-access',
  SUBSCRIPTION: 'subscription-access',
  MERCHANDISE: 'merchandise',
} as const;

/**
 * L'UE exige DEUX elements de preuve NON CONTRADICTOIRES pour une vente B2C —
 * et Stripe Tax privilegie une adresse unique au lieu de les comparer, donc la
 * regle de preuve NE PEUT PAS lui etre deleguee.
 */
export const TAX_EVIDENCE_KINDS = [
  'billing-address',
  'ip-address',
  'bank-country',
  'card-country',
  'sim-country',
  'declared-by-buyer',
] as const;
export type TaxEvidenceKind = (typeof TAX_EVIDENCE_KINDS)[number];

export const TaxEvidenceKind = {
  BILLING_ADDRESS: 'billing-address',
  IP_ADDRESS: 'ip-address',
  BANK_COUNTRY: 'bank-country',
  CARD_COUNTRY: 'card-country',
  SIM_COUNTRY: 'sim-country',
  DECLARED_BY_BUYER: 'declared-by-buyer',
} as const;

/** Environ 9 000 juridictions aux Etats-Unis : un pays ne permet aucun calcul. */
export const TAX_JURISDICTION_LEVELS = ['country', 'state', 'county', 'city'] as const;
export type TaxJurisdictionLevel = (typeof TAX_JURISDICTION_LEVELS)[number];

export const TaxJurisdictionLevel = {
  COUNTRY: 'country',
  STATE: 'state',
  COUNTY: 'county',
  CITY: 'city',
} as const;
