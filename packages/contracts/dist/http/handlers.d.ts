/**
 * What a server implements for a route, derived from its declaration: the typed input a handler
 * receives, the output it owes, and one method per operation id for a block of routes. A controller
 * `implements Endpoints<typeof block>`, so a route declared and not implemented, and a wrong return,
 * are compile errors that name the operation.
 */
import type { PrincipalOf } from './access.js';
import type { RouteBody, RouteHeaders, RouteParams, RouteQuery, RouteResponseBody, RouteShape, RouteSuccessStatus } from './index.js';
/** The caller as the route declares it: the identity's principal, `null` where an anonymous caller is let in, `undefined` on a public route. */
export type RoutePrincipal<R> = R extends {
    readonly access: infer A;
} ? PrincipalOf<A> : undefined;
export interface HandlerInput<R extends RouteShape> {
    readonly params: RouteParams<R>;
    readonly query: RouteQuery<R>;
    readonly headers: RouteHeaders<R>;
    readonly body: RouteBody<R>;
    readonly principal: RoutePrincipal<R>;
}
/** What the server stamps on every answer: the handler never writes them. */
type Stamped = 'servedAt' | 'rightsVersion';
/**
 * A declared shape without the index signatures its loose objects carry, so a handler returning an
 * undeclared field is a compile error. The client keeps the loose shape.
 */
export type Strict<T> = T extends readonly (infer Item)[] ? Strict<Item>[] : T extends object ? {
    [K in keyof T as string extends K ? never : number extends K ? never : symbol extends K ? never : K]: Strict<T[K]>;
} : T;
/** `degraded` is typed from the route's `degradable`: only the parts it names. */
export type Degraded<R> = R extends {
    readonly degradable: infer D extends readonly string[];
} ? {
    readonly degraded?: readonly D[number][];
} : unknown;
/** The data a handler returns: the declared body, strict, without the envelope meta the server stamps. */
export type Returned<B, R = unknown> = [B] extends [undefined] ? undefined : Omit<Strict<B>, Stamped | 'degraded'> & Degraded<R>;
type StatusNumber<S> = S extends `${infer N extends number}` ? N : S;
type OutputOf<R extends RouteShape, S extends keyof R['responses']> = S extends unknown ? {
    readonly status: StatusNumber<S>;
    readonly body: Returned<RouteResponseBody<R, S>, R>;
} : never;
/**
 * One success status: the body itself. Several: `{ status, body }`, a union keyed by status that
 * TypeScript narrows well.
 */
export type HandlerOutput<R extends RouteShape> = [RouteSuccessStatus<R>] extends [never] ? never : IsSingle<RouteSuccessStatus<R>> extends true ? Returned<RouteResponseBody<R, RouteSuccessStatus<R>>, R> : OutputOf<R, RouteSuccessStatus<R>>;
type IsSingle<T> = IsUnion<T> extends true ? false : true;
type IsUnion<T, U = T> = T extends unknown ? ([U] extends [T] ? false : true) : never;
/** One method per operation id of a block of routes, each taking its `HandlerInput` and returning its `HandlerOutput`. */
export type Endpoints<Routes extends {
    readonly [K in keyof Routes]: RouteShape;
}> = {
    readonly [K in keyof Routes]: (input: HandlerInput<Routes[K]>) => Promise<HandlerOutput<Routes[K]>>;
};
export {};
//# sourceMappingURL=handlers.d.ts.map