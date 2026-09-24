/**
 * The clock is a PORT, never a `Date.now()` buried inside a rule.
 *
 * This is the most invasive reshaping of the port, and it is not negotiable.
 * `shared/helpers.js` reads an implicit clock deep inside `stateOf`,
 * `isRoomOpen`, `replayHoursLeft` and `dayLabel`; and all of `shared/` is built
 * on offsets relative to app open — `catalogue.json` says so itself: "nothing
 * here expires". Excellent for a mockup, unusable in a contract.
 *
 * Two consequences:
 *   - a rule that reads the system clock is not testable. A test that passes at
 *     23:59 and fails at 00:01 has found a forgotten `Date.now()`;
 *   - a package imported by seven services CANNOT hold global state. Two
 *     concurrent requests would share the same clock, the same language and the
 *     same country.
 */
/** The production clock. The only one that reads the machine's time. */
export class SystemClock {
    now() {
        return new Date().toISOString();
    }
    nowMs() {
        return Date.now();
    }
}
/**
 * The clock for tests and for the deterministic dataset.
 *
 * `advance` exists for window tests — replay expiry, playback lease, quote
 * validity — where the whole point is to make an instant pass.
 */
export class FixedClock {
    ms;
    constructor(instant) {
        this.ms = typeof instant === 'number' ? instant : Date.parse(instant);
    }
    now() {
        return new Date(this.ms).toISOString();
    }
    nowMs() {
        return this.ms;
    }
    /** Advances the clock. Returns the instant reached. */
    advance(millis) {
        this.ms += millis;
        return this.now();
    }
}
//# sourceMappingURL=clock.js.map