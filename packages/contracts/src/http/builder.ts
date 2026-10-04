import { ApiErrorCode } from '@arthome/core';

import type { Access, IdentifiedAccess, Identity, PublicAccess, Requirement } from './access.js';
import type { CodesOf, ErrorList, ErrorModel, ErrorResponse, ErrorsInput } from './errors.js';
import { groupByStatus, errorResponseFor } from './errors.js';
import type {
  Header,
  Parameter,
  RequestBody,
  Response,
  Route,
  RouteDefinition,
  SecurityRequirement,
} from './index.js';
import { defineRoute } from './index.js';
import { sensitivePathsOf } from './marks.js';
import type { CachePolicy } from './policy.js';
import {
  CACHE_CONTROL_HEADER,
  DEFAULT_BODY_LIMIT,
  IDEMPOTENCY_REPLAYED_HEADER,
  VARY_HEADER,
} from './policy.js';
import type { Resource, ResourceConventions, ResourceOptions, SingleOptions } from './resource.js';
import { makeResource } from './resource.js';

type HeaderParameters = readonly (Parameter & { readonly in: 'header' })[];

type Responses = Readonly<Record<string, Response>>;

/** What a builder's `defineRoute` takes: a route without its version, which the builder holds. */
export type BuiltRouteDefinition<Allowed extends string = string> = Omit<
  RouteDefinition,
  'version'
> & { readonly errors?: ErrorsInput<Allowed> | ErrorList<Allowed> };

type PathParam = Parameter & { readonly in: 'path' };

/** A path prefix and the path parameters it declares: what `path()` accumulates. */
export interface Scope {
  readonly prefix: string;
  readonly params: readonly PathParam[];
}

export interface RootScope {
  readonly prefix: '';
  readonly params: readonly [];
}

type PlaceholdersOf<T extends string> = T extends `${string}{${infer Name}}${infer Rest}`
  ? Name | PlaceholdersOf<Rest>
  : never;

type DeclaredBy<Ps extends readonly PathParam[]> = Ps[number]['name'];

/** `never` when every `{placeholder}` of the template has its parameter. */
type MissingParameters<T extends string, Ps extends readonly PathParam[]> = Exclude<
  PlaceholdersOf<T>,
  DeclaredBy<Ps>
>;

type CheckedTemplate<T extends string, Ps extends readonly PathParam[]> = [
  MissingParameters<T, Ps>,
] extends [never]
  ? unknown
  : { readonly 'path(): a placeholder has no parameter': MissingParameters<T, Ps> };

type OwnParameters<D> = D extends { readonly parameters: infer X extends readonly Parameter[] }
  ? X
  : readonly [];

type OwnBody<D> = D extends { readonly requestBody: infer B extends RequestBody }
  ? { readonly requestBody: B }
  : unknown;

/** The error responses a set of `errors` declarations makes, over those already held. */
export type MergedErrors<E extends Responses, R> = R extends readonly unknown[]
  ? E
  : Omit<E, keyof R> & {
      readonly [S in keyof R]: R[S] extends readonly (infer C extends string)[]
        ? ErrorResponse<C | (S extends keyof E ? CodesOf<E[S]> : never)>
        : R[S];
    };

type OwnErrors<D> = D extends { readonly errors: infer R }
  ? R extends readonly unknown[]
    ? Record<never, never>
    : R
  : Record<never, never>;

/** The route a builder makes: its own parameters, then the builder's headers; its responses over the builder's errors. */
export type BuiltRoute<
  V extends number,
  P extends readonly Parameter[],
  E extends Responses,
  D extends Omit<BuiltRouteDefinition, 'errors'> & { readonly errors?: unknown },
  X = undefined,
  Z extends Scope = RootScope,
> = Route<
  {
    readonly method: D['method'];
    readonly version: V;
    readonly path: `${Z['prefix']}${D['path']}`;
    readonly parameters: readonly [
      ...Z['params'],
      ...OwnParameters<D>,
      ...P,
      ...IdentityParameters<X, D['method']>,
    ];
    readonly responses: Omit<MergedErrors<E, OwnErrors<D>>, keyof D['responses']> & D['responses'];
  } & OwnBody<D> &
    AccessOf<X>
>;

/** The parameters an identity adds to every route, and to a write. */
type IdentityParameters<X, Method> = X extends {
  readonly identity: {
    readonly parameters: infer Every extends readonly Parameter[];
    readonly writeParameters: infer Writes extends readonly Parameter[];
  };
}
  ? Method extends 'get'
    ? Every
    : readonly [...Every, ...Writes]
  : readonly [];

type AccessOf<X> = X extends Access ? { readonly access: X } : unknown;

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
export interface RouteBuilder<
  V extends number | undefined,
  P extends readonly Parameter[],
  E extends Responses,
  A extends string = string,
  K extends ResourceConventions | undefined = undefined,
  X extends Access | undefined = undefined,
  Z extends Scope = RootScope,
> {
  version<const N extends number>(version: N): RouteBuilder<N, P, E, A, K, X, Z>;
  tags(...tags: readonly string[]): RouteBuilder<V, P, E, A, K, X, Z>;
  headers<const H extends HeaderParameters>(
    ...headers: H
  ): RouteBuilder<V, readonly [...P, ...H], E, A, K, X, Z>;
  errors<const R extends ErrorsInput<A> | ErrorList<A>>(
    errors: R,
  ): RouteBuilder<V, P, MergedErrors<E, R> & Responses, A, K, X, Z>;
  security(...requirements: readonly SecurityRequirement[]): RouteBuilder<V, P, E, A, K, X, Z>;
  conventions<const C extends ResourceConventions>(
    conventions: C,
  ): RouteBuilder<V, P, E, A, C, X, Z>;
  /** Every route requires this identity unless it says otherwise; its security is derived from it. */
  identity<const I extends Identity>(
    identity: I,
  ): RouteBuilder<V, P, E, A, K, IdentifiedAccess<I, false>, Z>;
  /** No identity: sign-in, sign-up, public links. */
  public(): RouteBuilder<V, P, E, A, K, PublicAccess, Z>;
  /** An anonymous caller is let in and the principal may be null; a credential presented and refused is still a `401`. */
  optionalAuth(): X extends IdentifiedAccess<infer I, boolean>
    ? RouteBuilder<V, P, E, A, K, IdentifiedAccess<I, true>, Z>
    : never;
  /** Rules beyond identity, applied in the order given, after those already set. */
  requires(...rules: readonly Requirement[]): RouteBuilder<V, P, E, A, K, X, Z>;
  /** The latency budget in milliseconds. */
  budget(milliseconds: number): RouteBuilder<V, P, E, A, K, X, Z>;
  /** The freshness of every read of the group; a write never carries it. */
  cache(policy: CachePolicy): RouteBuilder<V, P, E, A, K, X, Z>;
  /** The ceiling of a request body, in bytes. */
  bodyLimit(bytes: number): RouteBuilder<V, P, E, A, K, X, Z>;
  defineRoute<const D extends BuiltRouteDefinition<A>>(
    this: RouteBuilder<number, P, E, A, K, X, Z>,
    definition: D,
  ): BuiltRoute<NonNullable<V>, P, E, D, X, Z>;
  /**
   * A prefix and the path parameters it declares, once: everything built from the result sits under
   * it. The compiler checks that every `{placeholder}` of the template has its parameter. What the
   * result sets (`requires`, `tags`, the identity) adds to what the builder already holds. With a
   * closure, the routes it returns are what the call returns.
   */
  path<const T extends string, const Ps extends readonly PathParam[]>(
    template: T & CheckedTemplate<T, Ps>,
    ...params: Ps
  ): RouteBuilder<V, P, E, A, K, X, ScopeOf<Z, T, Ps>>;
  /** A collection: several records, each with its id in the URL. */
  resource<
    const Name extends string,
    const Id extends PathParam,
    const Parents extends readonly PathParam[] = readonly [],
    const Owner extends 'caller' | undefined = undefined,
  >(
    this: RouteBuilder<number, P, E, A, K, X, Z>,
    name: Name,
    options: ResourceOptions<Id, Parents, Owner>,
  ): Resource<ContextOf<V, P, E, A, K, X, Z, Name, Id, Parents, Owner>>;
  resource<
    const Name extends string,
    const Id extends PathParam,
    const Parents extends readonly PathParam[],
    const Owner extends 'caller' | undefined,
    R,
  >(
    this: RouteBuilder<number, P, E, A, K, X, Z>,
    name: Name,
    options: ResourceOptions<Id, Parents, Owner>,
    closure: (resource: Resource<ContextOf<V, P, E, A, K, X, Z, Name, Id, Parents, Owner>>) => R,
  ): R;
  /** What exists once in its context, so its URL has no id: my preferences, a channel's settings. */
  single<
    const Name extends string,
    const Parents extends readonly PathParam[] = readonly [],
    const Owner extends 'caller' | undefined = undefined,
  >(
    this: RouteBuilder<number, P, E, A, K, X, Z>,
    name: Name,
    options?: SingleOptions<Parents, Owner>,
  ): Resource<ContextOf<V, P, E, A, K, X, Z, Name, undefined, Parents, Owner>>;
  single<
    const Name extends string,
    const Parents extends readonly PathParam[],
    const Owner extends 'caller' | undefined,
    R,
  >(
    this: RouteBuilder<number, P, E, A, K, X, Z>,
    name: Name,
    options: SingleOptions<Parents, Owner> | undefined,
    closure: (
      single: Resource<ContextOf<V, P, E, A, K, X, Z, Name, undefined, Parents, Owner>>,
    ) => R,
  ): R;
}

interface ScopeOf<Z extends Scope, T extends string, Ps extends readonly PathParam[]> {
  readonly prefix: `${Z['prefix']}/${T}`;
  readonly params: readonly [...Z['params'], ...Ps];
}

interface ContextOf<
  V,
  P extends readonly Parameter[],
  E extends Responses,
  A extends string,
  K,
  X,
  Z extends Scope,
  Name extends string,
  Id extends PathParam | undefined,
  Parents extends readonly PathParam[],
  Owner extends 'caller' | undefined,
> {
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

type Structured = Readonly<Record<string, Response>>;

interface BuilderSettings {
  readonly version: number | undefined;
  readonly tags: readonly string[] | undefined;
  readonly headers: readonly Parameter[];
  readonly bases: Structured;
  readonly codes: Readonly<Record<string, readonly string[]>>;
  readonly security: readonly SecurityRequirement[] | undefined;
  readonly model: ErrorModel<string> | undefined;
  readonly conventions: ResourceConventions | undefined;
  readonly access: Access | undefined;
  readonly requires: readonly Requirement[];
  readonly budgetMs: number | undefined;
  readonly cache: CachePolicy | undefined;
  readonly bodyLimit: number | undefined;
  readonly prefix: string;
  readonly prefixParameters: readonly Parameter[];
}

type AnyBuilder = RouteBuilder<
  number,
  readonly Parameter[],
  Responses,
  string,
  ResourceConventions,
  Access | undefined
>;

function split(
  input: ErrorsInput<string> | ErrorList<string>,
): [Record<string, Response>, Record<string, readonly string[]>] {
  const bases: Record<string, Response> = {};
  if (Array.isArray(input)) return [bases, groupByStatus(input as readonly string[])];
  const codes: Record<string, readonly string[]> = {};
  for (const [status, value] of Object.entries(input as ErrorsInput<string>)) {
    if (Array.isArray(value)) codes[status] = value as readonly string[];
    else if (value !== undefined) bases[status] = value as Response;
  }
  return [bases, codes];
}

type CodesByStatus = Record<string, readonly string[]>;

type Closure = (scoped: never) => unknown;

const IDEMPOTENCY_KEY = 'Idempotency-Key';

/**
 * The errors a route can answer because of what it declares (`transport.md` §5.12, ADR §7.1): its
 * input, its body, its idempotency key, its identity and rules, its rate limit, and the surface.
 * A response the group or the route writes whole is kept over the derived one.
 */
function derivedCodes(
  settings: BuilderSettings,
  definition: {
    readonly method: string;
    readonly parameters: readonly Parameter[];
    readonly requestBody?: unknown;
  },
): CodesByStatus {
  const out: CodesByStatus = {};
  const add = (from: Readonly<Record<string, readonly string[]>>): void => {
    for (const [status, codes] of Object.entries(from)) {
      const held = out[status] ?? [];
      out[status] = [...held, ...codes.filter((code) => !held.includes(code))];
    }
  };
  if (settings.access === undefined) return out;
  const write = definition.method !== 'get';
  const hasInput =
    definition.requestBody !== undefined ||
    definition.parameters.some((parameter) => parameter.in === 'path' || parameter.in === 'query');
  if (hasInput) add({ 400: [ApiErrorCode.SCHEMA_INVALID] });
  if (definition.requestBody !== undefined) {
    add({
      413: [ApiErrorCode.PAYLOAD_TOO_LARGE],
      415: [ApiErrorCode.UNSUPPORTED_MEDIA_TYPE],
    });
  }
  if (definition.parameters.some((parameter) => parameter.name === IDEMPOTENCY_KEY)) {
    add({
      409: [ApiErrorCode.IDEMPOTENCY_KEY_REUSED, ApiErrorCode.IDEMPOTENCY_IN_FLIGHT],
    });
  }
  const { access } = settings;
  if (access?.kind === 'identified') {
    add({ 401: [ApiErrorCode.UNAUTHENTICATED] });
    add(access.identity.errors);
    if (write) add(access.identity.writeErrors);
  }
  for (const rule of settings.requires) add(rule.errors);
  if (access !== undefined) {
    add({ 500: [ApiErrorCode.INTERNAL] });
    if (settings.model?.upstreams === true) {
      add({
        502: [ApiErrorCode.UPSTREAM_UNAVAILABLE],
        504: [ApiErrorCode.UPSTREAM_TIMEOUT, ApiErrorCode.DEADLINE_EXCEEDED],
      });
    } else if (access.kind === 'identified' && access.identity.internal) {
      add({ 504: [ApiErrorCode.DEADLINE_EXCEEDED] });
    }
  }
  return out;
}

function responsesOf(
  settings: BuilderSettings,
  own: Readonly<Record<string, readonly string[]>>,
  ownBases: Readonly<Record<string, Response>>,
  derived: Readonly<Record<string, readonly string[]>>,
  identityBases: Readonly<Partial<Record<string, Response>>> = {},
): {
  readonly responses: Record<string, Response>;
  readonly codes: Record<string, readonly string[]>;
} {
  const bases = { ...identityBases, ...settings.bases, ...ownBases };
  const statuses = new Set([
    ...Object.keys(bases),
    ...Object.keys(settings.codes),
    ...Object.keys(own),
    ...Object.keys(derived),
  ]);
  const out: Record<string, Response> = {};
  const named: Record<string, readonly string[]> = {};
  for (const status of statuses) {
    const codes = [
      ...(derived[status] ?? []),
      ...(settings.codes[status] ?? []),
      ...(own[status] ?? []),
    ];
    out[status] = errorResponseFor(settings.model, Number(status), codes, bases[status]);
    named[status] = codesOfResponse(settings.model, status, codes, bases[status], out[status]);
  }
  return { responses: out, codes: named };
}

/** The codes a built error response stands for: the standard response's own, plus those a route added. */
function codesOfResponse(
  model: ErrorModel<string> | undefined,
  status: string,
  codes: readonly string[],
  base: Response | undefined,
  built: Response,
): readonly string[] {
  const standard = model?.standard[Number(status) as keyof ErrorModel<string>['standard']];
  const known = standard?.codes ?? [];
  if (built === standard?.response) return known;
  if (built === base) return codes;
  return [...new Set([...known, ...codes])];
}

interface ResponseHeaders {
  readonly every: Readonly<Record<string, Header>>;
  readonly replayed: boolean;
  readonly cache: CachePolicy | undefined;
  readonly etag: Readonly<Record<string, Header>>;
  readonly replayedHeader: Header | undefined;
}

function holdsSensitive(response: Response): boolean {
  return Object.values(response.content ?? {}).some(
    (media) => sensitivePathsOf(media.schema).length > 0,
  );
}

/** The headers a declaration implies on its successes: the identity's, the replay marker, the cache's. */
function withHeaders(
  responses: Record<string, Response>,
  implied: ResponseHeaders,
): Record<string, Response> {
  const out: Record<string, Response> = {};
  for (const [status, response] of Object.entries(responses)) {
    const success = status.startsWith('2');
    const carriesSecret = success && holdsSensitive(response);
    const added: Record<string, Header> = {
      ...(success ? implied.every : {}),
      ...(success &&
        implied.replayed && {
          'Idempotency-Replayed': implied.replayedHeader ?? IDEMPOTENCY_REPLAYED_HEADER,
        }),
      ...((carriesSecret || (status === '200' && implied.cache !== undefined)) && {
        'Cache-Control': CACHE_CONTROL_HEADER,
      }),
      ...(status === '200' ? implied.etag : {}),
      ...(status === '200' &&
        implied.cache !== undefined &&
        implied.cache.vary.length > 0 && { Vary: VARY_HEADER }),
    };
    out[status] =
      Object.keys(added).length === 0
        ? response
        : { ...response, headers: { ...added, ...response.headers } };
  }
  return out;
}

function securityOf(access: Access, method: string): readonly SecurityRequirement[] {
  if (access.kind === 'anyone') return [];
  const schemes = method === 'get' ? access.identity.schemes.read : access.identity.schemes.write;
  return access.optional && method === 'get'
    ? [...schemes, ...access.identity.optionalAlso, {}]
    : access.optional
      ? [...schemes, {}]
      : schemes;
}

function builderOf(settings: BuilderSettings): AnyBuilder {
  const next = (changes: Partial<BuilderSettings>): AnyBuilder =>
    builderOf({ ...settings, ...changes });
  const builder = {
    version: (version: number) => next({ version }),
    tags: (...tags: readonly string[]) => next({ tags: Object.freeze([...tags]) }),
    headers: (...headers: readonly Parameter[]) =>
      next({ headers: Object.freeze([...settings.headers, ...headers]) }),
    errors: (errors: ErrorsInput<string> | ErrorList<string>) => {
      const [bases, codes] = split(errors);
      const merged: Record<string, readonly string[]> = { ...settings.codes };
      for (const [status, added] of Object.entries(codes)) {
        merged[status] = Object.freeze([...(merged[status] ?? []), ...added]);
      }
      return next({
        bases: Object.freeze({ ...settings.bases, ...bases }),
        codes: Object.freeze(merged),
      });
    },
    security: (...requirements: readonly SecurityRequirement[]) =>
      next({ security: Object.freeze([...requirements]) }),
    conventions: (conventions: ResourceConventions) => next({ conventions }),
    identity: (identity: Identity) =>
      next({ access: Object.freeze({ kind: 'identified', identity, optional: false }) }),
    public: () => next({ access: Object.freeze({ kind: 'anyone' }) }),
    optionalAuth: () => {
      if (settings.access?.kind !== 'identified') {
        throw new Error('optionalAuth: set an identity first.');
      }
      return next({ access: Object.freeze({ ...settings.access, optional: true }) });
    },
    requires: (...rules: readonly Requirement[]) =>
      next({ requires: Object.freeze([...settings.requires, ...rules]) }),
    budget: (budgetMs: number) => next({ budgetMs }),
    cache: (cache: CachePolicy) => next({ cache }),
    bodyLimit: (bodyLimit: number) => next({ bodyLimit }),
    path: (template: string, ...rest: readonly unknown[]) => {
      const closure = typeof rest.at(-1) === 'function' ? (rest.at(-1) as Closure) : undefined;
      const params = (closure === undefined ? rest : rest.slice(0, -1)) as readonly Parameter[];
      const names = [...template.matchAll(/\{([^}]+)\}/g)].map((match) => match[1]);
      const missing = names.filter((name) => !params.some((parameter) => parameter.name === name));
      if (missing.length > 0) {
        throw new Error(`path "${template}": no parameter for ${missing.join(', ')}.`);
      }
      const scoped = next({
        prefix: `${settings.prefix}/${template.replace(/^\/+/, '')}`,
        prefixParameters: Object.freeze([...settings.prefixParameters, ...params]),
      });
      return closure === undefined ? scoped : closure(scoped as never);
    },
    defineRoute: (definition: BuiltRouteDefinition) => {
      if (settings.version === undefined) {
        throw new Error(
          `defineRoute: "${definition.operationId}" has no version; call .version(n).`,
        );
      }
      const { errors, ...rest } = definition;
      const { access } = settings;
      if (access !== undefined && rest.security !== undefined) {
        throw new Error(
          `defineRoute: "${definition.operationId}" declares its security by hand and has an identity: the identity writes it.`,
        );
      }
      const [ownBases, ownCodes] = split(errors ?? {});
      const identityBases =
        access?.kind === 'identified' && rest.method !== 'get'
          ? access.identity.writeResponses
          : {};
      const tags = rest.tags ?? settings.tags;
      const identityParameters =
        access?.kind === 'identified'
          ? [
              ...access.identity.parameters,
              ...(rest.method === 'get' ? [] : access.identity.writeParameters),
            ]
          : [];
      const conditional =
        (rest.method === 'get' && rest.cache?.etag === true) ||
        (rest.method === 'get' && settings.cache?.etag === true && rest.cache === undefined)
          ? settings.conventions
          : undefined;
      const conditionalParameters = (conditional?.readParameters ?? []).filter(
        (parameter) => !(rest.parameters ?? []).some((own) => own.name === parameter.name),
      );
      const parameters = [
        ...settings.prefixParameters,
        ...(rest.parameters ?? []),
        ...conditionalParameters,
        ...settings.headers,
        ...identityParameters,
      ];
      const security =
        access !== undefined
          ? securityOf(access, rest.method)
          : (rest.security ?? settings.security);
      const requires = [...settings.requires, ...(rest.requires ?? [])];
      const internal = access?.kind === 'identified' && access.identity.internal;
      const hasBody = rest.requestBody !== undefined;
      const budgetMs = rest.budgetMs ?? settings.budgetMs;
      const cache = rest.cache ?? (rest.method === 'get' ? settings.cache : undefined);
      const derived = derivedCodes(settings, {
        method: rest.method,
        parameters,
        requestBody: rest.requestBody,
      });
      const built = responsesOf(settings, ownCodes, ownBases, derived, identityBases);
      const errorCodes = Object.fromEntries(
        Object.entries(built.codes).filter(
          ([status]) => rest.responses === undefined || !(status in rest.responses),
        ),
      );
      const responses = withHeaders(
        {
          ...built.responses,
          ...(conditional?.notModified !== undefined && { 304: conditional.notModified }),
          ...rest.responses,
        },
        {
          every: access?.kind === 'identified' ? access.identity.responseHeaders : {},
          replayed:
            access !== undefined &&
            parameters.some((parameter) => parameter.name === IDEMPOTENCY_KEY),
          cache,
          etag: conditional?.readHeaders ?? {},
          replayedHeader: settings.conventions?.replayedHeader,
        },
      );
      return defineRoute({
        ...rest,
        path: `${settings.prefix}${rest.path}`,
        version: settings.version,
        ...(tags !== undefined && { tags }),
        ...(security !== undefined && { security }),
        ...(access !== undefined && { access }),
        ...(requires.length > 0 && { requires }),
        ...(internal && { internal }),
        ...(budgetMs !== undefined && { budgetMs }),
        ...(cache !== undefined && { cache }),
        ...(hasBody && { bodyLimit: rest.bodyLimit ?? settings.bodyLimit ?? DEFAULT_BODY_LIMIT }),
        ...(parameters.length > 0 && { parameters }),
        responses,
        ...(Object.keys(errorCodes).length > 0 && { errorCodes }),
      });
    },
    resource: (name: string, options: ResourceOptions<never, never>, closure?: Closure) => {
      if (settings.conventions === undefined) {
        throw new Error(`resource "${name}": call .conventions(...) first.`);
      }
      const made = makeResource(
        builder as never,
        settings.conventions,
        name,
        options,
        settings.headers,
      );
      return closure === undefined ? made : closure(made);
    },
    single: (name: string, options?: SingleOptions, closure?: Closure) => {
      if (settings.conventions === undefined) {
        throw new Error(`single "${name}": call .conventions(...) first.`);
      }
      const made = makeResource(
        builder as never,
        settings.conventions,
        name,
        { ...options, id: undefined },
        settings.headers,
      );
      return closure === undefined ? made : closure(made);
    },
  };
  return Object.freeze(builder) as unknown as AnyBuilder;
}

/**
 * The empty builder: `routeBuilder(model).version(1).tags(...).headers(...).errors(...)`. The model
 * is the api's error vocabulary; without one, only responses written whole can be declared.
 */
export function routeBuilder<A extends string = string>(
  model?: ErrorModel<A>,
): RouteBuilder<undefined, readonly [], Record<never, never>, A> {
  return builderOf({
    version: undefined,
    tags: undefined,
    headers: [],
    bases: {},
    codes: {},
    security: undefined,
    model,
    conventions: undefined,
    access: undefined,
    requires: [],
    budgetMs: undefined,
    cache: undefined,
    bodyLimit: undefined,
    prefix: '',
    prefixParameters: [],
  }) as unknown as RouteBuilder<undefined, readonly [], Record<never, never>, A>;
}

/** The resource a builder makes for `name`, for an annotation: `ResourceOf<typeof studioV1, 'incidents', typeof IncidentIdParameter>`. */
export type ResourceOf<
  B,
  Name extends string,
  Id extends PathParam | undefined,
  Parents extends readonly PathParam[] = readonly [],
  Owner extends 'caller' | undefined = undefined,
> =
  B extends RouteBuilder<
    infer V extends number,
    infer P,
    infer E,
    infer A,
    infer K extends ResourceConventions,
    infer X,
    infer Z
  >
    ? Resource<ContextOf<V, P, E, A, K, X, Z, Name, Id, Parents, Owner>>
    : never;
