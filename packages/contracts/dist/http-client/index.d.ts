/**
 * A typed client for an api: one method per operation id, its input and each declared response
 * typed from the route.
 *
 * It only needs a `fetch`, typed structurally here because the published packages compile with
 * no DOM and no Node types (`code-conventions.md` §2.3 d): the browser's, React Native's and
 * Node's all fit, and so does a test double.
 */
import type { z } from 'zod';
import type { Api, DerivedStatus, ErrorBody, RouteInput, RouteResponseBody, RouteShape } from '../http/index.js';
import { DERIVED_ERROR_CODES } from '../http/index.js';
export interface FetchInit {
    readonly method: string;
    readonly headers: Record<string, string>;
    readonly body?: string;
}
export interface FetchResponseLike {
    readonly status: number;
    readonly headers: {
        get(name: string): string | null;
    };
    text(): Promise<string>;
}
/** `Init` is what a caller adds per call and the `fetch` understands — an `AbortSignal`, say. */
export type FetchLike<Init extends object> = (url: string, init: FetchInit & Init) => Promise<FetchResponseLike>;
export interface ClientOptions<Init extends object> {
    readonly baseUrl: string;
    readonly fetch: FetchLike<Init>;
    /** Sent with every call — the surface, a bearer token — before the call's own headers. */
    readonly headers?: Readonly<Record<string, string>> | (() => Readonly<Record<string, string>>);
    /** Parses each body with the route's schema for its status, and throws on a mismatch. */
    readonly validateResponses?: boolean;
}
type DeclaredStatus<R extends RouteShape> = keyof R['responses'] & number;
type DerivedResponse<R extends RouteShape> = {
    [S in Exclude<DerivedStatus, DeclaredStatus<R>>]: {
        readonly status: S;
        readonly body: ErrorBody<(typeof DERIVED_ERROR_CODES)[S][number]>;
        readonly headers: FetchResponseLike['headers'];
    };
}[Exclude<DerivedStatus, DeclaredStatus<R>>];
/**
 * What a call answers: the statuses the route declares, typed by the route, and the derived errors
 * (400, 401, 403, 413, 415, 429, 500, 502, 504), typed by the api's own codes. A surface can switch
 * on a 401 or a 429 with types, and a status that is neither throws `UndeclaredStatusError`.
 */
export type ClientResponse<R extends RouteShape> = {
    [S in DeclaredStatus<R>]: {
        readonly status: S;
        readonly body: RouteResponseBody<R, S>;
        readonly headers: FetchResponseLike['headers'];
    };
}[DeclaredStatus<R>] | DerivedResponse<R>;
type Optional<Key extends string, T> = Record<never, never> extends T ? Readonly<Partial<Record<Key, T>>> : Readonly<Record<Key, T>>;
export type ClientInput<R extends RouteShape, Init extends object> = Optional<'params', RouteInput<R>['params']> & Optional<'query', RouteInput<R>['query']> & (RouteInput<R>['body'] extends undefined ? {
    readonly body?: undefined;
} : {
    readonly body: RouteInput<R>['body'];
}) & {
    /** Header names as the contract writes them. Those the options already send may be left out. */
    readonly headers?: RouteInput<R>['headers'] & Readonly<Record<string, string>>;
    readonly init?: Init;
};
/** The relations a read can return on demand: the names its `include` parameter takes. */
export type IncludeNames<R extends RouteShape> = R extends {
    readonly parameters: readonly (infer P)[];
} ? P extends {
    readonly name: 'include';
    readonly schema: infer S extends z.ZodType;
} ? z.output<S> extends readonly (infer N)[] ? N : never : never : never;
/** A response whose `data` has the relations that were asked for, and only those, present. */
export type NarrowIncluded<T, Names> = T extends {
    readonly body: infer B;
} ? B extends {
    readonly data: infer D;
} ? Omit<T, 'body'> & {
    readonly body: Omit<B, 'data'> & {
        readonly data: D & Required<Pick<D, Names & keyof D>>;
    };
} : T : T;
export type ClientMethod<R extends RouteShape, Init extends object> = [IncludeNames<R>] extends [
    never
] ? Record<never, never> extends ClientInput<R, Init> ? (input?: ClientInput<R, Init>) => Promise<ClientResponse<R>> : (input: ClientInput<R, Init>) => Promise<ClientResponse<R>> : <const I extends readonly IncludeNames<R>[] = readonly []>(input?: Omit<ClientInput<R, Init>, 'query'> & {
    readonly query?: Omit<NonNullable<ClientInput<R, Init>['query']>, 'include'> & {
        readonly include?: I;
    };
}) => Promise<NarrowIncluded<ClientResponse<R>, I[number]>>;
export type Client<A extends Api, Init extends object> = {
    readonly [K in keyof A['routes']]: ClientMethod<A['routes'][K], Init>;
};
/** A status the route does not declare: the body is not the route's to type, so it is not typed. */
export declare class UndeclaredStatusError extends Error {
    readonly operationId: string;
    readonly status: number;
    readonly body: unknown;
    constructor(operationId: string, status: number, body: unknown);
}
export declare function createClient<A extends Api, Init extends object = Record<never, never>>(api: A, options: ClientOptions<Init>): Client<A, Init>;
export {};
//# sourceMappingURL=index.d.ts.map