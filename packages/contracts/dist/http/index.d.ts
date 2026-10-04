/**
 * The HTTP contract as TypeScript: a route mirrors an OpenAPI operation, with a zod schema
 * wherever the document holds a JSON Schema, and an api names the components once.
 *
 * A component (a parameter, a header, a response) is a plain value. The api's `components` map
 * gives it its name, and `./openapi` writes a `$ref` wherever the same value appears again —
 * identity, the way a zod registry names a schema. A value nobody names is emitted inline.
 *
 * Every exported route carries an explicit annotation, `Route<{ method; path; parameters;
 * requestBody; responses }>`: `isolatedDeclarations` cannot infer through `defineRoute`, and
 * the annotation is also what a server handler and a client read their types from.
 */
import { z } from 'zod';
import type { Access, Requirement } from './access.js';
import type { Paging, SortKey } from './paging.js';
import type { CachePolicy } from './policy.js';
export type HttpMethod = 'get' | 'put' | 'post' | 'delete' | 'patch';
export type ParameterLocation = 'path' | 'query' | 'header' | 'cookie';
/** OpenAPI's specification extensions, carried into the document verbatim. */
export type Extensions = Readonly<Record<`x-${string}`, unknown>>;
export interface Parameter extends Extensions {
    readonly name: string;
    readonly in: ParameterLocation;
    readonly required?: boolean;
    readonly description?: string;
    readonly deprecated?: boolean;
    readonly schema: z.ZodType;
}
export interface MediaType extends Extensions {
    readonly schema: z.ZodType;
    readonly example?: unknown;
    readonly examples?: Readonly<Record<string, unknown>>;
}
export interface Header extends Extensions {
    readonly description?: string;
    readonly required?: boolean;
    readonly schema: z.ZodType;
}
export interface Response extends Extensions {
    readonly description: string;
    readonly headers?: Readonly<Record<string, Header>>;
    readonly content?: Readonly<Record<string, MediaType>>;
}
export interface RequestBody extends Extensions {
    readonly description?: string;
    readonly required?: boolean;
    readonly content: Readonly<Record<string, MediaType>>;
}
/** What a route's types are read from — the part of its annotation a handler or client needs. */
export interface RouteShape {
    readonly method: HttpMethod;
    /** The API version the route belongs to. It is not part of `path`: see `versionedPath`. */
    readonly version: number;
    /** The OpenAPI template without its version, `/dates/{dateId}`. */
    readonly path: string;
    readonly parameters?: readonly Parameter[];
    readonly requestBody?: RequestBody;
    readonly responses: Readonly<Record<string, Response>>;
}
/** The schemes that satisfy a route, by name: `{}` is a call with no credential at all. */
export type SecurityRequirement = Readonly<Record<string, readonly string[]>>;
export interface RouteDefinition extends RouteShape, Extensions {
    readonly operationId: string;
    readonly tags?: readonly string[];
    readonly summary?: string;
    readonly description?: string;
    readonly deprecated?: boolean;
    readonly security?: readonly SecurityRequirement[];
    /** Who may call: an identity, optionally, or anyone. The builder derives `security` from it. */
    readonly access?: Access;
    /** Rules beyond identity, in the order the server applies them. */
    readonly requires?: readonly Requirement[];
    /** The latency budget, in milliseconds: the typed client times out under it. */
    readonly budgetMs?: number;
    readonly cache?: CachePolicy;
    /** The ceiling of the request body, in bytes. */
    readonly bodyLimit?: number;
    /** Served between services only: no surface document lists it. */
    readonly internal?: boolean;
    /** The parts of a composed answer that may be missing: `degraded` is typed from them. */
    readonly degradable?: readonly string[];
    /** Only the caller reads and writes this data: another caller's id answers 404, never 403. */
    readonly owner?: 'caller';
    /** How a list is paged. */
    readonly paging?: Paging;
    /** The keys a list can be ordered by. */
    readonly sortable?: readonly SortKey[];
    /** The relations a read can return on demand, by name. */
    readonly expand?: Readonly<Record<string, z.ZodType>>;
}
/** Named members for a list of words, `CHAT` for `'chat'`, so no module spells a member again. */
export type AccessorOf<T extends readonly string[]> = {
    readonly [Member in T[number] as Uppercase<Member>]: Member;
};
/**
 * The accessor built from the list rather than written beside it: the list stays the one
 *   declaration, which is what `check-enums` reads.
 */
export declare function accessorOf<const T extends readonly string[]>(members: T): AccessorOf<T>;
export type Route<T extends RouteShape = RouteShape> = T & Omit<RouteDefinition, keyof T>;
/** The only versioning strategy: the version is a path prefix, `/v1/dates/{dateId}`. */
export declare function versionedPath(route: Pick<RouteShape, 'version' | 'path'>): string;
export type VersionedPath<R extends Pick<RouteShape, 'version' | 'path'>> = `/v${R['version']}${R['path']}`;
export declare function defineRoute<const T extends RouteDefinition>(definition: T): Route<T>;
/** The annotation of a path parameter: OpenAPI makes every one required. */
export interface PathParameter<Name extends string, S extends z.ZodType> extends Parameter {
    readonly name: Name;
    readonly in: 'path';
    readonly required: true;
    readonly schema: S;
}
/** A required parameter says `required: true`; an optional one may say `required: false` or nothing. */
type RequiredFlag<Required> = Required extends true ? {
    readonly required: true;
} : {
    readonly required?: false;
};
export type QueryParameter<Name extends string, S extends z.ZodType, Required = false> = Parameter & RequiredFlag<Required> & {
    readonly name: Name;
    readonly in: 'query';
    readonly schema: S;
};
export type HeaderParameter<Name extends string, S extends z.ZodType, Required = false> = Parameter & RequiredFlag<Required> & {
    readonly name: Name;
    readonly in: 'header';
    readonly schema: S;
};
/** The annotation of a response with a JSON body. */
export interface JsonResponse<S extends z.ZodType> extends Response {
    readonly content: {
        readonly 'application/json': MediaType & {
            readonly schema: S;
        };
    };
}
/** The annotation of a request carrying a JSON body. */
export interface JsonRequestBody<S extends z.ZodType, Required = true> extends RequestBody {
    readonly required?: Required extends true ? true : false;
    readonly content: {
        readonly 'application/json': MediaType & {
            readonly schema: S;
        };
    };
}
export interface ApiComponents {
    readonly schemas?: Readonly<Record<string, z.ZodType>>;
    readonly parameters?: Readonly<Record<string, Parameter>>;
    readonly headers?: Readonly<Record<string, Header>>;
    readonly responses?: Readonly<Record<string, Response>>;
    readonly securitySchemes?: Readonly<Record<string, unknown>>;
}
/**
 * A whole document: its top-level keys as the document writes them, `routes` in place of
 * `paths`. The routes' keys are their operation ids, so a client's method names are the
 * document's.
 */
export interface ApiDefinition<Routes extends Readonly<Record<string, Route>>> extends Extensions {
    readonly openapi: string;
    readonly info: Readonly<Record<string, unknown>>;
    readonly servers?: readonly Readonly<Record<string, unknown>>[];
    readonly tags?: readonly Readonly<Record<string, unknown>>[];
    readonly security?: readonly SecurityRequirement[];
    readonly routes: Routes;
    readonly components: ApiComponents;
}
export type Api<Routes extends Readonly<Record<string, Route>> = Readonly<Record<string, Route>>> = ApiDefinition<Routes>;
export declare function defineApi<const Routes extends Readonly<Record<string, Route>>>(definition: ApiDefinition<Routes>): Api<Routes>;
type ParametersOf<R> = R extends {
    readonly parameters: readonly (infer P)[];
} ? P extends Parameter ? P : never : never;
type ParametersIn<R, L extends ParameterLocation> = Extract<ParametersOf<R>, {
    readonly in: L;
}>;
/** A parameter's default is the answering service's; a relay passes the value it received. */
type WithoutDefault<S> = S extends z.ZodDefault<infer Inner> ? Inner : S;
type IsObjectSchema<S> = WithoutDefault<S> extends z.ZodObject ? true : false;
type ValueOf<P extends Parameter, Io extends 'input' | 'output'> = Io extends 'input' ? z.input<WithoutDefault<P['schema']>> : z.output<WithoutDefault<P['schema']>>;
type NameOf<P extends Parameter, L extends ParameterLocation> = L extends 'header' ? Lowercase<P['name']> : P['name'];
type ScalarValues<P extends Parameter, L extends ParameterLocation, Io extends 'input' | 'output'> = {
    readonly [K in P as K extends {
        readonly required: true;
    } ? NameOf<K, L> : never]: ValueOf<K, Io>;
} & {
    readonly [K in P as K extends {
        readonly required: true;
    } ? never : NameOf<K, L>]?: ValueOf<K, Io>;
};
type UnionToIntersection<U> = (U extends unknown ? (value: U) => void : never) extends (value: infer I) => void ? I : never;
/** An object-typed query parameter is exploded (`style: form`, `explode: true`): its fields are the keys. */
type ExplodedValues<P extends Parameter, Io extends 'input' | 'output'> = [P] extends [never] ? unknown : UnionToIntersection<P extends {
    readonly required: true;
} ? ValueOf<P, Io> : Partial<ValueOf<P, Io>>>;
type Flatten<T> = {
    [K in keyof T]: T[K];
} & {};
type ObjectParametersIn<R, L extends ParameterLocation> = ParametersIn<R, L> extends infer P ? P extends Parameter ? IsObjectSchema<P['schema']> extends true ? P : never : never : never;
type ScalarParametersIn<R, L extends ParameterLocation> = Exclude<ParametersIn<R, L>, ObjectParametersIn<R, L>>;
type ValuesIn<R, L extends ParameterLocation, Io extends 'input' | 'output'> = Flatten<ScalarValues<ScalarParametersIn<R, L>, L, Io> & ExplodedValues<ObjectParametersIn<R, L>, Io>>;
/** The path parameters a handler receives. */
export type RouteParams<R extends RouteShape> = ValuesIn<R, 'path', 'output'>;
/** The query a handler receives: validated and coerced, an exploded object's fields at the top. */
export type RouteQuery<R extends RouteShape> = ValuesIn<R, 'query', 'output'>;
/** The declared headers a handler receives, under the lowercase names Node gives them. */
export type RouteHeaders<R extends RouteShape> = ValuesIn<R, 'header', 'output'>;
type JsonSchemaOf<C> = C extends {
    readonly 'application/json': {
        readonly schema: infer S;
    };
} ? S extends z.ZodType ? S : never : never;
export type RouteBody<R extends RouteShape> = R extends {
    readonly requestBody: {
        readonly content: infer C;
    };
} ? z.output<JsonSchemaOf<C>> : undefined;
export type RouteStatus<R extends RouteShape> = keyof R['responses'] & (number | `${number}`);
export type RouteResponseBody<R extends RouteShape, Status extends keyof R['responses']> = R['responses'][Status] extends {
    readonly content: infer C;
} ? z.output<JsonSchemaOf<C>> : undefined;
/** The 2xx statuses a route declares. */
export type RouteSuccessStatus<R extends RouteShape> = Extract<RouteStatus<R>, 200 | 201 | 202 | 203 | 204 | 206 | '200' | '201' | '202' | '203' | '204' | '206'>;
/** What a client sends: inputs (defaults may be left out), header names as the contract writes them. */
export interface RouteInput<R extends RouteShape> {
    readonly params: ValuesIn<R, 'path', 'input'>;
    readonly query: ValuesIn<R, 'query', 'input'>;
    readonly headers: Partial<Record<ParametersIn<R, 'header'>['name'], string>>;
    readonly body: R extends {
        readonly requestBody: {
            readonly content: infer C;
        };
    } ? z.input<JsonSchemaOf<C>> : undefined;
}
/** The query a server validates: undeclared parameters refused, defaults not materialised. */
export declare function querySchemaOf<R extends RouteShape>(route: R): z.ZodType<RouteQuery<R>, unknown>;
/** The declared headers, under Node's lowercase names; every other header passes through. */
export declare function headersSchemaOf<R extends RouteShape>(route: R): z.ZodType<RouteHeaders<R>, unknown>;
export declare function paramsSchemaOf<R extends RouteShape>(route: R): z.ZodType<RouteParams<R>, unknown>;
/** The JSON body's schema, or `undefined` for a route that takes none. */
export declare function bodySchemaOf<R extends RouteShape>(route: R): z.ZodType<RouteBody<R>, unknown> | undefined;
/** The lowest 2xx a route declares — the status a handler answers with when it succeeds. */
export declare function successStatusOf(route: RouteShape): number;
export * from './access.js';
export * from './builder.js';
export * from './collect.js';
export * from './errors.js';
export type * from './handlers.js';
export * from './marks.js';
export * from './paging.js';
export * from './policy.js';
export * from './responses.js';
export * from './tagged.js';
export * from './resource.js';
//# sourceMappingURL=index.d.ts.map