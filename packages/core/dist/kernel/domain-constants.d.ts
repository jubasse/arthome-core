/**
 * The operational constants served to every surface as `DomainConstants` (openapi/storefront.yaml)
 * and copied nowhere: a copy is how "the web will say 30 minutes, the television 15" (E11,
 * critical-rules #15). Each names where it was decided.
 */
export declare const DomainConstant: {
    /** `prototypes/shared/catalogue.json`, `time.roomOpensBeforeMin`. */
    readonly ROOM_OPENS_MINUTES_BEFORE: 30;
    /** `needs/storefront-web.md` and `needs/storefront-tv.md`: exact up to it, a lower bound beyond. */
    readonly SEARCH_EXACT_TOTAL_LIMIT: 10000;
    /** D-075: a replaced slug keeps resolving to the current URL while people move to it. */
    readonly SLUG_REDIRECT_DAYS: 30;
    /** D-076: how many times one date may be postponed; a cancellation stays possible after. */
    readonly POSTPONEMENTS_MAX: 3;
    /** needs/storefront-web.md, `cancelSeat`: "cancel up to 1 h before the start". */
    readonly CANCEL_DEADLINE_MINUTES_BEFORE: 60;
    /** answers-to-surfaces.md Q14: how long the billboard waits before its preview plays. */
    readonly BILLBOARD_PREVIEW_DELAY_SECONDS: 4;
};
//# sourceMappingURL=domain-constants.d.ts.map