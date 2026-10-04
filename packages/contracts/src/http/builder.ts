import type { CodesOf, ErrorModel, ErrorResponse, ErrorsInput } from './errors.js';
import { errorResponseFor } from './errors.js';
import type {
  Parameter,
  RequestBody,
  Response,
  Route,
  RouteDefinition,
  SecurityRequirement,
} from './index.js';
import { defineRoute } from './index.js';
import type { Resource, ResourceConventions, ResourceOptions } from './resource.js';
import { makeResource } from './resource.js';

type HeaderParameters = readonly (Parameter & { readonly in: 'header' })[];

type Responses = Readonly<Record<string, Response>>;

/** What a builder's `defineRoute` takes: a route without its version, which the builder holds. */
export type BuiltRouteDefinition<Allowed extends string = string> = Omit<
  RouteDefinition,
  'version'
> & { readonly errors?: ErrorsInput<Allowed> };

type OwnParameters<D> = D extends { readonly parameters: infer X extends readonly Parameter[] }
  ? X
  : readonly [];

type OwnBody<D> = D extends { readonly requestBody: infer B extends RequestBody }
  ? { readonly requestBody: B }
  : unknown;

/** The error responses a set of `errors` declarations makes, over those already held. */
export type MergedErrors<E extends Responses, R> = Omit<E, keyof R> & {
  readonly [S in keyof R]: R[S] extends readonly (infer C extends string)[]
    ? ErrorResponse<C | (S extends keyof E ? CodesOf<E[S]> : never)>
    : R[S];
};

type OwnErrors<D> = D extends { readonly errors: infer R } ? R : Record<never, never>;

/** The route a builder makes: its own parameters, then the builder's headers; its responses over the builder's errors. */
export type BuiltRoute<
  V extends number,
  P extends readonly Parameter[],
  E extends Responses,
  D extends Omit<BuiltRouteDefinition, 'errors'> & { readonly errors?: unknown },
> = Route<
  {
    readonly method: D['method'];
    readonly version: V;
    readonly path: D['path'];
    readonly parameters: readonly [...OwnParameters<D>, ...P];
    readonly responses: Omit<MergedErrors<E, OwnErrors<D>>, keyof D['responses']> & D['responses'];
  } & OwnBody<D>
>;

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
> {
  version<const N extends number>(version: N): RouteBuilder<N, P, E, A, K>;
  tags(...tags: readonly string[]): RouteBuilder<V, P, E, A, K>;
  headers<const H extends HeaderParameters>(
    ...headers: H
  ): RouteBuilder<V, readonly [...P, ...H], E, A, K>;
  errors<const R extends ErrorsInput<A>>(
    errors: R,
  ): RouteBuilder<V, P, MergedErrors<E, R> & Responses, A, K>;
  security(...requirements: readonly SecurityRequirement[]): RouteBuilder<V, P, E, A, K>;
  conventions<const C extends ResourceConventions>(conventions: C): RouteBuilder<V, P, E, A, C>;
  defineRoute<const D extends BuiltRouteDefinition<A>>(
    this: RouteBuilder<number, P, E, A, K>,
    definition: D,
  ): BuiltRoute<NonNullable<V>, P, E, D>;
  resource<
    const Name extends string,
    const Id extends Parameter & { readonly in: 'path' },
    const Parents extends readonly (Parameter & { readonly in: 'path' })[] = readonly [],
  >(
    this: RouteBuilder<number, P, E, A, K>,
    name: Name,
    options: ResourceOptions<Id, Parents>,
  ): Resource<{
    readonly version: NonNullable<V>;
    readonly headers: P;
    readonly responses: E;
    readonly allowed: A;
    readonly conventions: K;
    readonly name: Name;
    readonly id: Id;
    readonly parents: Parents;
  }>;
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
}

type AnyBuilder = RouteBuilder<
  number,
  readonly Parameter[],
  Responses,
  string,
  ResourceConventions
>;

function split(
  input: ErrorsInput<string>,
): [Record<string, Response>, Record<string, readonly string[]>] {
  const bases: Record<string, Response> = {};
  const codes: Record<string, readonly string[]> = {};
  for (const [status, value] of Object.entries(input)) {
    if (Array.isArray(value)) codes[status] = value as readonly string[];
    else if (value !== undefined) bases[status] = value as Response;
  }
  return [bases, codes];
}

function responsesOf(
  settings: BuilderSettings,
  own: Readonly<Record<string, readonly string[]>>,
  ownBases: Readonly<Record<string, Response>>,
): Record<string, Response> {
  const bases = { ...settings.bases, ...ownBases };
  const statuses = new Set([
    ...Object.keys(bases),
    ...Object.keys(settings.codes),
    ...Object.keys(own),
  ]);
  const out: Record<string, Response> = {};
  for (const status of statuses) {
    const codes = [...(settings.codes[status] ?? []), ...(own[status] ?? [])];
    out[status] = errorResponseFor(settings.model, Number(status), codes, bases[status]);
  }
  return out;
}

function builderOf(settings: BuilderSettings): AnyBuilder {
  const next = (changes: Partial<BuilderSettings>): AnyBuilder =>
    builderOf({ ...settings, ...changes });
  const builder = {
    version: (version: number) => next({ version }),
    tags: (...tags: readonly string[]) => next({ tags: Object.freeze([...tags]) }),
    headers: (...headers: readonly Parameter[]) =>
      next({ headers: Object.freeze([...settings.headers, ...headers]) }),
    errors: (errors: ErrorsInput<string>) => {
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
    defineRoute: (definition: BuiltRouteDefinition) => {
      if (settings.version === undefined) {
        throw new Error(
          `defineRoute: "${definition.operationId}" has no version; call .version(n).`,
        );
      }
      const { errors, ...rest } = definition;
      const [ownBases, ownCodes] = split(errors ?? {});
      const tags = rest.tags ?? settings.tags;
      const security = rest.security ?? settings.security;
      const parameters = [...(rest.parameters ?? []), ...settings.headers];
      return defineRoute({
        ...rest,
        version: settings.version,
        ...(tags !== undefined && { tags }),
        ...(security !== undefined && { security }),
        ...(parameters.length > 0 && { parameters }),
        responses: { ...responsesOf(settings, ownCodes, ownBases), ...rest.responses },
      });
    },
    resource: (name: string, options: ResourceOptions<never, never>) => {
      if (settings.conventions === undefined) {
        throw new Error(`resource "${name}": call .conventions(...) first.`);
      }
      return makeResource(builder as unknown as AnyBuilder, settings.conventions, name, options);
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
  }) as unknown as RouteBuilder<undefined, readonly [], Record<never, never>, A>;
}
