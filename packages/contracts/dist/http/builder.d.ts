import type { Access, IdentifiedAccess, Identity, PublicAccess, Requirement } from './access.js';
import type { GroupedByStatus, CodesOf, ErrorCodesIn, ErrorList, ErrorModel, ErrorResponse, ErrorsInput } from './errors.js';
import type { Parameter, RequestBody, Response, Route, RouteDefinition, SecurityRequirement } from './index.js';
import type { CachePolicy } from './policy.js';
import type { Resource, ResourceConventions, ResourceOptions, SingleOptions } from './resource.js';
type HeaderParameters = readonly (Parameter & {
    readonly in: 'header';
})[];
type Responses = Readonly<Record<string, Response>>;
/** What a builder's `defineRoute` takes: a route without its version, which the builder holds. */
export type BuiltRouteDefinition<Allowed extends string = string> = Omit<RouteDefinition, 'version'> & {
    readonly errors?: ErrorsInput<Allowed> | ErrorList<Allowed>;
};
type PathParam = Parameter & {
    readonly in: 'path';
};
/** A path prefix and the path parameters it declares: what `path()` accumulates. */
export interface Scope {
    readonly prefix: string;
    readonly params: readonly PathParam[];
}
export interface RootScope {
    readonly prefix: '';
    readonly params: readonly [];
}
type PlaceholdersOf<T extends string> = T extends `${string}{${infer Name}}${infer Rest}` ? Name | PlaceholdersOf<Rest> : never;
type DeclaredBy<Ps extends readonly PathParam[]> = Ps[number]['name'];
/** `never` when every `{placeholder}` of the template has its parameter. */
type MissingParameters<T extends string, Ps extends readonly PathParam[]> = Exclude<PlaceholdersOf<T>, DeclaredBy<Ps>>;
type CheckedTemplate<T extends string, Ps extends readonly PathParam[]> = [
    MissingParameters<T, Ps>
] extends [never] ? unknown : {
    readonly 'path(): a placeholder has no parameter': MissingParameters<T, Ps>;
};
type OwnParameters<D> = D extends {
    readonly parameters: infer X extends readonly Parameter[];
} ? X : readonly [];
type OwnBody<D> = D extends {
    readonly requestBody: infer B extends RequestBody;
} ? {
    readonly requestBody: B;
} : unknown;
/** The error responses a set of `errors` declarations makes, over those already held. */
export type MergedErrors<E extends Responses, R> = R extends readonly (infer C extends string)[] ? MergedErrors<E, GroupedByStatus<C>> : Omit<E, keyof R> & {
    readonly [S in keyof R]: R[S] extends readonly (infer C extends string)[] ? ErrorResponse<C | (S extends keyof E ? CodesOf<E[S]> : never)> : R[S];
};
type OwnErrors<D> = D extends {
    readonly errors: infer R;
} ? R extends readonly (infer C extends string)[] ? GroupedByStatus<C> : R : Record<never, never>;
type BuiltResponses<E extends Responses, D extends {
    readonly responses: Responses;
}> = Omit<MergedErrors<E, OwnErrors<D>>, keyof D['responses']> & D['responses'];
/**
 * The codes of each error status the route declares: what the server may refuse with. Always
 * present, possibly empty: testing it for emptiness cost 2.3M type instantiations over the two apis.
 */
interface ErrorCodesMember<R> {
    readonly errorCodes: ErrorCodesIn<R>;
}
/** The route a builder makes: its own parameters, then the builder's headers; its responses over the builder's errors. */
export type BuiltRoute<V extends number, P extends readonly Parameter[], E extends Responses, D extends Omit<BuiltRouteDefinition, 'errors'> & {
    readonly errors?: unknown;
}, X = undefined, Z extends Scope = RootScope> = Route<{
    readonly method: D['method'];
    readonly version: V;
    readonly path: `${Z['prefix']}${D['path']}`;
    readonly parameters: readonly [
        ...Z['params'],
        ...OwnParameters<D>,
        ...P,
        ...IdentityParameters<X, D['method']>
    ];
    readonly responses: BuiltResponses<E, D>;
} & OwnBody<D> & AccessOf<X> & OwnDegradable<D> & ErrorCodesMember<BuiltResponses<E, D>>>;
/** The parameters an identity adds to every route, and to a write. */
type IdentityParameters<X, Method> = X extends {
    readonly identity: {
        readonly parameters: infer Every extends readonly Parameter[];
        readonly writeParameters: infer Writes extends readonly Parameter[];
    };
} ? Method extends 'get' ? Every : readonly [...Every, ...Writes] : readonly [];
type OwnDegradable<D> = D extends {
    readonly degradable: infer P extends readonly string[];
} ? {
    readonly degradable: P;
} : unknown;
type AccessOf<X> = X extends Access ? {
    readonly access: X;
} : unknown;
/**
 * Settings shared by the routes of a group, accumulated one call at a time. Every call returns a
 * NEW builder and the types carry what was set, so `defineRoute` is inferred in full: the
 * builder's headers follow a route's own parameters and its errors sit under the route's
 * responses, and the route's own `tags` and `security` replace the builder's.
 *
 * Errors cumulate in three levels, merged per status: a response the api documents once
 * (`.errors({ 400: BadRequestResponse })`), the convention errors a resource adds, and the codes a
 * route declares (`errors: { 409: ['date.prices_locked'] }`), typed from the code registry.
 */
export interface RouteBuilder<V extends number | undefined, P extends readonly Parameter[], E extends Responses, A extends string = string, K extends ResourceConventions | undefined = undefined, X extends Access | undefined = undefined, Z extends Scope = RootScope> {
    version<const N extends number>(version: N): RouteBuilder<N, P, E, A, K, X, Z>;
    tags(...tags: readonly string[]): RouteBuilder<V, P, E, A, K, X, Z>;
    headers<const H extends HeaderParameters>(...headers: H): RouteBuilder<V, readonly [...P, ...H], E, A, K, X, Z>;
    errors<const R extends ErrorsInput<A> | ErrorList<A>>(errors: R): RouteBuilder<V, P, MergedErrors<E, R> & Responses, A, K, X, Z>;
    security(...requirements: readonly SecurityRequirement[]): RouteBuilder<V, P, E, A, K, X, Z>;
    conventions<const C extends ResourceConventions>(conventions: C): RouteBuilder<V, P, E, A, C, X, Z>;
    /** Every route requires this identity unless it says otherwise; its security is derived from it. */
    identity<const I extends Identity>(identity: I): RouteBuilder<V, P, E, A, K, IdentifiedAccess<I, false>, Z>;
    /** No identity: sign-in, sign-up, public links. */
    public(): RouteBuilder<V, P, E, A, K, PublicAccess, Z>;
    /** An anonymous caller is let in and the principal may be null; a credential presented and refused is still a `401`. */
    optionalAuth(): X extends IdentifiedAccess<infer I, boolean> ? RouteBuilder<V, P, E, A, K, IdentifiedAccess<I, true>, Z> : never;
    /** Rules beyond identity, applied in the order given, after those already set. */
    requires(...rules: readonly Requirement[]): RouteBuilder<V, P, E, A, K, X, Z>;
    /** The latency budget in milliseconds. */
    budget(milliseconds: number): RouteBuilder<V, P, E, A, K, X, Z>;
    /** The freshness of every read of the group; a write never carries it. */
    cache(policy: CachePolicy): RouteBuilder<V, P, E, A, K, X, Z>;
    /** The ceiling of a request body, in bytes. */
    bodyLimit(bytes: number): RouteBuilder<V, P, E, A, K, X, Z>;
    defineRoute<const D extends BuiltRouteDefinition<A>>(this: RouteBuilder<number, P, E, A, K, X, Z>, definition: D): BuiltRoute<NonNullable<V>, P, E, D, X, Z>;
    /**
     * A prefix and the path parameters it declares, once: everything built from the result sits under
     * it. The compiler checks that every `{placeholder}` of the template has its parameter. What the
     * result sets (`requires`, `tags`, the identity) adds to what the builder already holds. With a
     * closure, the routes it returns are what the call returns.
     */
    path<const T extends string, const Ps extends readonly PathParam[]>(template: T & CheckedTemplate<T, Ps>, ...params: Ps): RouteBuilder<V, P, E, A, K, X, ScopeOf<Z, T, Ps>>;
    /** A collection: several records, each with its id in the URL. */
    resource<const Name extends string, const Id extends PathParam, const Parents extends readonly PathParam[] = readonly [], const Owner extends 'caller' | undefined = undefined>(this: RouteBuilder<number, P, E, A, K, X, Z>, name: Name, options: ResourceOptions<Id, Parents, Owner>): Resource<ContextOf<V, P, E, A, K, X, Z, Name, Id, Parents, Owner>>;
    resource<const Name extends string, const Id extends PathParam, const Parents extends readonly PathParam[], const Owner extends 'caller' | undefined, R>(this: RouteBuilder<number, P, E, A, K, X, Z>, name: Name, options: ResourceOptions<Id, Parents, Owner>, closure: (resource: Resource<ContextOf<V, P, E, A, K, X, Z, Name, Id, Parents, Owner>>) => R): R;
    /** What exists once in its context, so its URL has no id: my preferences, a channel's settings. */
    single<const Name extends string, const Parents extends readonly PathParam[] = readonly [], const Owner extends 'caller' | undefined = undefined>(this: RouteBuilder<number, P, E, A, K, X, Z>, name: Name, options?: SingleOptions<Parents, Owner>): Resource<ContextOf<V, P, E, A, K, X, Z, Name, undefined, Parents, Owner>>;
    single<const Name extends string, const Parents extends readonly PathParam[], const Owner extends 'caller' | undefined, R>(this: RouteBuilder<number, P, E, A, K, X, Z>, name: Name, options: SingleOptions<Parents, Owner> | undefined, closure: (single: Resource<ContextOf<V, P, E, A, K, X, Z, Name, undefined, Parents, Owner>>) => R): R;
}
interface ScopeOf<Z extends Scope, T extends string, Ps extends readonly PathParam[]> {
    readonly prefix: `${Z['prefix']}/${T}`;
    readonly params: readonly [...Z['params'], ...Ps];
}
interface ContextOf<V, P extends readonly Parameter[], E extends Responses, A extends string, K, X, Z extends Scope, Name extends string, Id extends PathParam | undefined, Parents extends readonly PathParam[], Owner extends 'caller' | undefined> {
    readonly version: NonNullable<V> & number;
    readonly headers: P;
    readonly responses: E;
    readonly allowed: A;
    readonly conventions: K;
    readonly access: X;
    readonly scope: Z;
    readonly name: Name;
    readonly id: Id;
    readonly parents: Parents;
    readonly owner: Owner;
}
/**
 * The empty builder: `routeBuilder(model).version(1).tags(...).headers(...).errors(...)`. The model
 * is the api's error vocabulary; without one, only responses written whole can be declared.
 */
export declare function routeBuilder<A extends string = string>(model?: ErrorModel<A>): RouteBuilder<undefined, readonly [], Record<never, never>, A>;
/** The resource a builder makes for `name`, for an annotation: `ResourceOf<typeof studioV1, 'incidents', typeof IncidentIdParameter>`. */
export type ResourceOf<B, Name extends string, Id extends PathParam | undefined, Parents extends readonly PathParam[] = readonly [], Owner extends 'caller' | undefined = undefined> = B extends RouteBuilder<infer V extends number, infer P, infer E, infer A, infer K extends ResourceConventions, infer X, infer Z> ? Resource<ContextOf<V, P, E, A, K, X, Z, Name, Id, Parents, Owner>> : never;
export {};
//# sourceMappingURL=builder.d.ts.map