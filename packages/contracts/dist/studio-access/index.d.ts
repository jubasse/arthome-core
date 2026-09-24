/**
 * `@arthome/contracts/studio-access` — who may operate, and with what: the actor, their
 * effective rights, and the bootstrap a studio surface is handed on sign-in. Separate from
 * `identity` because the two products' session shapes genuinely differ — a viewer receives a
 * `ViewerContext`, a control room receives a `StudioBootstrap`.
 *
 * ⚠ `StudioSessionEstablished{Bearer,Cookie}Schema` CARRY THE PRODUCT PREFIX. The storefront
 *   exports two schemas of the same names with a different payload, and the emit gate tries
 *   `<Product><Name>Schema` before `<Name>Schema`: the prefix is what selects these two for
 *   `studio.yaml`.
 *
 * ⚠ `looseObject` because a server sends these shapes; `int64` and never `z.int()`;
 *   `vocabularyOut` for every enumerated value a server sends. A vocabulary the document
 *   declares as local (`x-arthome-vocabulary-source: none`) goes through `localVocabulary`,
 *   which emits the reason the document gives instead of inventing a source name.
 */
import { z } from 'zod';
import { StudioCountersSchema } from '../studio-money/index.js';
/** Who caused the fact. */
export declare const ActorSchema: z.ZodObject<{
    accountId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    personId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    displayName: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    surface: z.ZodString;
}, z.core.$loose>;
/** The rights of one person on one channel, computed once in `@arthome/core`. */
export declare const EffectiveRightsSchema: z.ZodObject<{
    channelId: z.ZodString;
    channelName: z.ZodOptional<z.ZodString>;
    roles: z.ZodArray<z.ZodString>;
    isOwner: z.ZodOptional<z.ZodBoolean>;
    navigation: z.ZodArray<z.ZodString>;
    contextualPages: z.ZodOptional<z.ZodArray<z.ZodString>>;
    tabBar: z.ZodOptional<z.ZodArray<z.ZodString>>;
    datePanes: z.ZodArray<z.ZodString>;
    canRevenue: z.ZodBoolean;
    canOps: z.ZodBoolean;
    canTech: z.ZodBoolean;
    canDecideOutcome: z.ZodBoolean;
    assignableRoles: z.ZodArray<z.ZodString>;
    dateGrants: z.ZodOptional<z.ZodArray<z.ZodObject<{
        grantId: z.ZodString;
        dateId: z.ZodString;
        crewRole: z.ZodString;
        expiresAt: z.ZodString;
    }, z.core.$loose>>>;
}, z.core.$loose>;
/** The first paint waits for this and for nothing else. */
export declare const StudioBootstrapSchema: z.ZodObject<{
    person: z.ZodObject<{
        personId: z.ZodString;
        displayName: z.ZodString;
        isFreelance: z.ZodOptional<z.ZodBoolean>;
        runsCalled: z.ZodOptional<z.ZodNumber>;
        readingTimezone: z.ZodOptional<z.ZodString>;
    }, z.core.$loose>;
    channels: z.ZodArray<typeof EffectiveRightsSchema>;
    personNavigation: z.ZodOptional<z.ZodArray<z.ZodString>>;
    rightsVersion: z.ZodNumber;
    constants: z.ZodObject<{
        technicalProvisionThreshold: z.ZodOptional<z.ZodNumber>;
        provisionRevisionHours: z.ZodOptional<z.ZodNumber>;
        waitlistPriorityWindowHours: z.ZodOptional<z.ZodNumber>;
        cancelDeadlineMinutesBefore: z.ZodOptional<z.ZodNumber>;
        payoutDelayDays: z.ZodOptional<z.ZodNumber>;
        commissionRateBps: z.ZodOptional<z.ZodNumber>;
        chatBurstThresholdPerMinute: z.ZodOptional<z.ZodNumber>;
        moderationQueueAlertThreshold: z.ZodOptional<z.ZodNumber>;
        crewUnassignedAlertHoursBefore: z.ZodOptional<z.ZodNumber>;
        holdScreenAutoAfterSec: z.ZodOptional<z.ZodNumber>;
        seasonBounds: z.ZodOptional<z.ZodObject<{
            startsOn: z.ZodOptional<z.ZodString>;
            endsOn: z.ZodOptional<z.ZodString>;
        }, z.core.$loose>>;
    }, z.core.$loose>;
    labelCatalog: z.ZodObject<{
        domain: z.ZodOptional<z.ZodString>;
        locale: z.ZodOptional<z.ZodString>;
        version: z.ZodOptional<z.ZodNumber>;
        url: z.ZodOptional<z.ZodString>;
    }, z.core.$loose>;
    counters: typeof StudioCountersSchema;
    realtime: z.ZodOptional<z.ZodObject<{
        namespace: z.ZodOptional<z.ZodString>;
        pulseIntervalSec: z.ZodOptional<z.ZodNumber>;
    }, z.core.$loose>>;
}, z.core.$loose>;
/** A cookie session: nothing in the body but the bootstrap. */
export declare const StudioSessionEstablishedCookieSchema: z.ZodObject<{
    mode: z.ZodLiteral<'cookie'>;
    bootstrap: typeof StudioBootstrapSchema;
}, z.core.$loose>;
/** A bearer session: an opaque token in the body, no cookie. */
export declare const StudioSessionEstablishedBearerSchema: z.ZodObject<{
    mode: z.ZodLiteral<'bearer'>;
    accessToken: z.ZodString;
    refreshToken: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    expiresAt: z.ZodString;
    bootstrap: typeof StudioBootstrapSchema;
}, z.core.$loose>;
//# sourceMappingURL=index.d.ts.map