/**
 * The operational constants served to every surface as `DomainConstants` (openapi/storefront.yaml)
 * and copied nowhere: a copy is how "the web will say 30 minutes, the television 15" (E11,
 * critical-rules #15). Each names where it was decided.
 */
export const DomainConstant = {
  /** `prototypes/shared/catalogue.json`, `time.roomOpensBeforeMin`. */
  ROOM_OPENS_MINUTES_BEFORE: 30,
  /** `needs/storefront-web.md` and `needs/storefront-tv.md`: exact up to it, a lower bound beyond. */
  SEARCH_EXACT_TOTAL_LIMIT: 10_000,
} as const;
