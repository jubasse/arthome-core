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
}

/** Named members for a list of words, `CHAT` for `'chat'`, so no module spells a member again. */
export type AccessorOf<T extends readonly string[]> = {
  readonly [Member in T[number] as Uppercase<Member>]: Member;
};

/**
 * The accessor built from the list rather than written beside it: the list stays the one
 *   declaration, which is what `check-enums` reads.
 */
export function accessorOf<const T extends readonly string[]>(members: T): AccessorOf<T> {
  return Object.fromEntries(
    members.map((member) => [member.toUpperCase(), member]),
  ) as AccessorOf<T>;
}

export type Route<T extends RouteShape = RouteShape> = T & Omit<RouteDefinition, keyof T>;

/** The only versioning strategy: the version is a path prefix, `/v1/dates/{dateId}`. */
export function versionedPath(route: Pick<RouteShape, 'version' | 'path'>): string {
  return `/v${String(route.version)}${route.path}`;
}

export type VersionedPath<R extends Pick<RouteShape, 'version' | 'path'>> =
  `/v${R['version']}${R['path']}`;

const VERSION_SUFFIX = /V(\d+)$/;

type HeaderParameters = readonly (Parameter & { readonly in: 'header' })[];

type Responses = Readonly<Record<string, Response>>;

/** What a builder's `defineRoute` takes: a route without its version, which the builder holds. */
export type BuiltRouteDefinition = Omit<RouteDefinition, 'version'>;

type OwnParameters<D> = D extends { readonly parameters: infer X extends readonly Parameter[] }
  ? X
  : readonly [];

type OwnBody<D> = D extends { readonly requestBody: infer B extends RequestBody }
  ? { readonly requestBody: B }
  : unknown;

/** The route a builder makes: its own parameters, then the builder's headers; its responses over the builder's errors. */
export type BuiltRoute<
  V extends number,
  P extends readonly Parameter[],
  E extends Responses,
  D extends BuiltRouteDefinition,
> = Route<
  {
    readonly method: D['method'];
    readonly version: V;
    readonly path: D['path'];
    readonly parameters: readonly [...OwnParameters<D>, ...P];
    readonly responses: Omit<E, keyof D['responses']> & D['responses'];
  } & OwnBody<D>
>;

/**
 * Settings shared by the routes of a group, accumulated one call at a time. Every call returns a
 * NEW builder and the types carry what was set, so `defineRoute` is inferred in full: the
 * builder's headers follow a route's own parameters and its errors sit under the route's
 * responses, and the route's own `tags` and `security` replace the builder's.
 */
export interface RouteBuilder<
  V extends number | undefined,
  P extends readonly Parameter[],
  E extends Responses,
> {
  version<const N extends number>(version: N): RouteBuilder<N, P, E>;
  tags(...tags: readonly string[]): RouteBuilder<V, P, E>;
  headers<const H extends HeaderParameters>(
    ...headers: H
  ): RouteBuilder<V, readonly [...P, ...H], E>;
  errors<const R extends Responses>(responses: R): RouteBuilder<V, P, Omit<E, keyof R> & R>;
  security(...requirements: readonly SecurityRequirement[]): RouteBuilder<V, P, E>;
  defineRoute<const D extends BuiltRouteDefinition>(
    this: RouteBuilder<number, P, E>,
    definition: D,
  ): BuiltRoute<NonNullable<V>, P, E, D>;
}

interface BuilderSettings {
  readonly version: number | undefined;
  readonly tags: readonly string[] | undefined;
  readonly headers: readonly Parameter[];
  readonly errors: Responses;
  readonly security: readonly SecurityRequirement[] | undefined;
}

function builderOf(
  settings: BuilderSettings,
): RouteBuilder<number, readonly Parameter[], Responses> {
  const next = (changes: Partial<BuilderSettings>): ReturnType<typeof builderOf> =>
    builderOf({ ...settings, ...changes });
  return Object.freeze({
    version: (version: number) => next({ version }),
    tags: (...tags: readonly string[]) => next({ tags: Object.freeze([...tags]) }),
    headers: (...headers: readonly Parameter[]) =>
      next({ headers: Object.freeze([...settings.headers, ...headers]) }),
    errors: (responses: Responses) =>
      next({ errors: Object.freeze({ ...settings.errors, ...responses }) }),
    security: (...requirements: readonly SecurityRequirement[]) =>
      next({ security: Object.freeze([...requirements]) }),
    defineRoute: (definition: BuiltRouteDefinition) => {
      if (settings.version === undefined) {
        throw new Error(
          `defineRoute: "${definition.operationId}" has no version; call .version(n).`,
        );
      }
      const tags = definition.tags ?? settings.tags;
      const security = definition.security ?? settings.security;
      const parameters = [...(definition.parameters ?? []), ...settings.headers];
      return defineRoute({
        ...definition,
        version: settings.version,
        ...(tags !== undefined && { tags }),
        ...(security !== undefined && { security }),
        ...(parameters.length > 0 && { parameters }),
        responses: { ...settings.errors, ...definition.responses },
      });
    },
  }) as unknown as RouteBuilder<number, readonly Parameter[], Responses>;
}

/** The empty builder: `routeBuilder().version(1).tags(...).headers(...).errors(...)`. */
export function routeBuilder(): RouteBuilder<undefined, readonly [], Record<never, never>> {
  return builderOf({
    version: undefined,
    tags: undefined,
    headers: [],
    errors: {},
    security: undefined,
  }) as unknown as RouteBuilder<undefined, readonly [], Record<never, never>>;
}

/** Version 1 keeps the bare name; a later version of an operation is named `{name}V{version}`. */
function checkOperationId(definition: RouteDefinition): void {
  const suffix = VERSION_SUFFIX.exec(definition.operationId);
  const named = suffix === null ? 1 : Number(suffix[1]);
  if (
    !Number.isInteger(definition.version) ||
    definition.version < 1 ||
    named !== definition.version
  ) {
    throw new Error(
      `defineRoute: "${definition.operationId}" is version ${String(definition.version)}; ` +
        'version 1 has the bare operation id and version n the suffix "V{n}".',
    );
  }
}

export function defineRoute<const T extends RouteDefinition>(definition: T): Route<T> {
  checkOperationId(definition);
  return definition;
}

/** The annotation of a path parameter: OpenAPI makes every one required. */
export interface PathParameter<Name extends string, S extends z.ZodType> extends Parameter {
  readonly name: Name;
  readonly in: 'path';
  readonly required: true;
  readonly schema: S;
}

/** A required parameter says `required: true`; an optional one may say `required: false` or nothing. */
type RequiredFlag<Required> = Required extends true
  ? { readonly required: true }
  : { readonly required?: false };

export type QueryParameter<Name extends string, S extends z.ZodType, Required = false> = Parameter &
  RequiredFlag<Required> & {
    readonly name: Name;
    readonly in: 'query';
    readonly schema: S;
  };

export type HeaderParameter<
  Name extends string,
  S extends z.ZodType,
  Required = false,
> = Parameter &
  RequiredFlag<Required> & {
    readonly name: Name;
    readonly in: 'header';
    readonly schema: S;
  };

/** The annotation of a response with a JSON body. */
export interface JsonResponse<S extends z.ZodType> extends Response {
  readonly content: { readonly 'application/json': MediaType & { readonly schema: S } };
}

/** The annotation of a request carrying a JSON body. */
export interface JsonRequestBody<S extends z.ZodType, Required = true> extends RequestBody {
  readonly required?: Required extends true ? true : false;
  readonly content: { readonly 'application/json': MediaType & { readonly schema: S } };
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

export type Api<Routes extends Readonly<Record<string, Route>> = Readonly<Record<string, Route>>> =
  ApiDefinition<Routes>;

export function defineApi<const Routes extends Readonly<Record<string, Route>>>(
  definition: ApiDefinition<Routes>,
): Api<Routes> {
  const served = new Set<string>();
  for (const [key, route] of Object.entries(definition.routes)) {
    if (key !== route.operationId) {
      throw new Error(`defineApi: the route under "${key}" is operation "${route.operationId}".`);
    }
    const address = `${route.method.toUpperCase()} ${versionedPath(route)}`;
    if (served.has(address)) throw new Error(`defineApi: ${address} is declared twice.`);
    served.add(address);
  }
  return definition;
}

type ParametersOf<R> = R extends { readonly parameters: readonly (infer P)[] }
  ? P extends Parameter
    ? P
    : never
  : never;

type ParametersIn<R, L extends ParameterLocation> = Extract<ParametersOf<R>, { readonly in: L }>;

/** A parameter's default is the answering service's; a relay passes the value it received. */
type WithoutDefault<S> = S extends z.ZodDefault<infer Inner> ? Inner : S;

type IsObjectSchema<S> = WithoutDefault<S> extends z.ZodObject ? true : false;

type ValueOf<P extends Parameter, Io extends 'input' | 'output'> = Io extends 'input'
  ? z.input<WithoutDefault<P['schema']>>
  : z.output<WithoutDefault<P['schema']>>;

type NameOf<P extends Parameter, L extends ParameterLocation> = L extends 'header'
  ? Lowercase<P['name']>
  : P['name'];

type ScalarValues<
  P extends Parameter,
  L extends ParameterLocation,
  Io extends 'input' | 'output',
> = {
  readonly [K in P as K extends { readonly required: true } ? NameOf<K, L> : never]: ValueOf<K, Io>;
} & {
  readonly [K in P as K extends { readonly required: true } ? never : NameOf<K, L>]?: ValueOf<
    K,
    Io
  >;
};

type UnionToIntersection<U> = (U extends unknown ? (value: U) => void : never) extends (
  value: infer I,
) => void
  ? I
  : never;

/** An object-typed query parameter is exploded (`style: form`, `explode: true`): its fields are the keys. */
type ExplodedValues<P extends Parameter, Io extends 'input' | 'output'> = [P] extends [never]
  ? unknown
  : UnionToIntersection<
      P extends { readonly required: true } ? ValueOf<P, Io> : Partial<ValueOf<P, Io>>
    >;

type Flatten<T> = { [K in keyof T]: T[K] } & {};

type ObjectParametersIn<R, L extends ParameterLocation> =
  ParametersIn<R, L> extends infer P
    ? P extends Parameter
      ? IsObjectSchema<P['schema']> extends true
        ? P
        : never
      : never
    : never;

type ScalarParametersIn<R, L extends ParameterLocation> = Exclude<
  ParametersIn<R, L>,
  ObjectParametersIn<R, L>
>;

type ValuesIn<R, L extends ParameterLocation, Io extends 'input' | 'output'> = Flatten<
  ScalarValues<ScalarParametersIn<R, L>, L, Io> & ExplodedValues<ObjectParametersIn<R, L>, Io>
>;

/** The path parameters a handler receives. */
export type RouteParams<R extends RouteShape> = ValuesIn<R, 'path', 'output'>;

/** The query a handler receives: validated and coerced, an exploded object's fields at the top. */
export type RouteQuery<R extends RouteShape> = ValuesIn<R, 'query', 'output'>;

/** The declared headers a handler receives, under the lowercase names Node gives them. */
export type RouteHeaders<R extends RouteShape> = ValuesIn<R, 'header', 'output'>;

type JsonSchemaOf<C> = C extends { readonly 'application/json': { readonly schema: infer S } }
  ? S extends z.ZodType
    ? S
    : never
  : never;

export type RouteBody<R extends RouteShape> = R extends {
  readonly requestBody: { readonly content: infer C };
}
  ? z.output<JsonSchemaOf<C>>
  : undefined;

export type RouteStatus<R extends RouteShape> = keyof R['responses'] & (number | `${number}`);

export type RouteResponseBody<
  R extends RouteShape,
  Status extends keyof R['responses'],
> = R['responses'][Status] extends { readonly content: infer C }
  ? z.output<JsonSchemaOf<C>>
  : undefined;

/** The 2xx statuses a route declares. */
export type RouteSuccessStatus<R extends RouteShape> = Extract<
  RouteStatus<R>,
  200 | 201 | 202 | 203 | 204 | 206 | '200' | '201' | '202' | '203' | '204' | '206'
>;

/** What a client sends: inputs (defaults may be left out), header names as the contract writes them. */
export interface RouteInput<R extends RouteShape> {
  readonly params: ValuesIn<R, 'path', 'input'>;
  readonly query: ValuesIn<R, 'query', 'input'>;
  readonly headers: Partial<Record<ParametersIn<R, 'header'>['name'], string>>;
  readonly body: R extends { readonly requestBody: { readonly content: infer C } }
    ? z.input<JsonSchemaOf<C>>
    : undefined;
}

function unwrapped(schema: z.ZodType): z.ZodType {
  if (schema instanceof z.ZodOptional || schema instanceof z.ZodNullable) {
    return unwrapped(schema.unwrap() as z.ZodType);
  }
  if (schema instanceof z.ZodDefault) return unwrapped(schema.unwrap() as z.ZodType);
  return schema;
}

function withoutDefault(schema: z.ZodType): z.ZodType {
  return schema instanceof z.ZodDefault ? (schema.unwrap() as z.ZodType) : schema;
}

function isExplodedObject(parameter: Parameter): boolean {
  return parameter.in === 'query' && unwrapped(parameter.schema) instanceof z.ZodObject;
}

type WireKind = 'number' | 'boolean' | 'list' | 'text';

function wireKindOf(schema: z.ZodType): WireKind {
  const inner = unwrapped(schema);
  if (inner instanceof z.ZodNumber) return 'number';
  if (inner instanceof z.ZodBoolean) return 'boolean';
  if (inner instanceof z.ZodArray) return 'list';
  return 'text';
}

function scalarFromWire(kind: WireKind, value: unknown): unknown {
  if (typeof value !== 'string') return value;
  if (kind === 'number') return value === '' ? value : Number(value);
  if (kind === 'boolean') return value === 'true' ? true : value === 'false' ? false : value;
  return value;
}

/**
 * A query string carries text: a lone value of a list arrives as a string and a repeated one as
 *   an array, and a number or a boolean arrives spelled. The schema is the contract's, unchanged;
 *   only what reaches it is decoded.
 */
function decodedFromWire(schema: z.ZodType): z.ZodType {
  const kind = wireKindOf(schema);
  if (kind === 'text') return schema;
  if (kind === 'list') {
    const items = unwrapped(schema);
    const itemKind = items instanceof z.ZodArray ? wireKindOf(items.element as z.ZodType) : 'text';
    return z.preprocess((value) => {
      if (value === undefined) return value;
      const list: readonly unknown[] = Array.isArray(value) ? value : [value];
      return list.map((item) => scalarFromWire(itemKind, item));
    }, schema);
  }
  return z.preprocess((value) => scalarFromWire(kind, value), schema);
}

function asOptional(schema: z.ZodType, required: boolean | undefined): z.ZodType {
  return required === true ? schema : schema.optional();
}

/** Refuses an undeclared key BY NAME: `strictObject` reports it with an empty path, so no field. */
const UNDECLARED = z.custom(() => false);

/** The query a server validates: undeclared parameters refused, defaults not materialised. */
export function querySchemaOf<R extends RouteShape>(route: R): z.ZodType<RouteQuery<R>, unknown> {
  const shape: Record<string, z.ZodType> = {};
  for (const parameter of route.parameters ?? []) {
    if (parameter.in !== 'query') continue;
    const schema = withoutDefault(parameter.schema);
    if (isExplodedObject(parameter)) {
      const object = unwrapped(schema);
      if (!(object instanceof z.ZodObject)) continue;
      for (const [field, fieldSchema] of Object.entries<z.ZodType>(object.shape)) {
        shape[field] = asOptional(decodedFromWire(withoutDefault(fieldSchema)), false);
      }
      continue;
    }
    shape[parameter.name] = asOptional(decodedFromWire(schema), parameter.required);
  }
  return z.object(shape).catchall(UNDECLARED) as unknown as z.ZodType<RouteQuery<R>, unknown>;
}

/** The declared headers, under Node's lowercase names; every other header passes through. */
export function headersSchemaOf<R extends RouteShape>(
  route: R,
): z.ZodType<RouteHeaders<R>, unknown> {
  const shape: Record<string, z.ZodType> = {};
  for (const parameter of route.parameters ?? []) {
    if (parameter.in !== 'header') continue;
    shape[parameter.name.toLowerCase()] = asOptional(
      decodedFromWire(withoutDefault(parameter.schema)),
      parameter.required,
    );
  }
  return z.looseObject(shape) as unknown as z.ZodType<RouteHeaders<R>, unknown>;
}

export function paramsSchemaOf<R extends RouteShape>(route: R): z.ZodType<RouteParams<R>, unknown> {
  const shape: Record<string, z.ZodType> = {};
  for (const parameter of route.parameters ?? []) {
    if (parameter.in !== 'path') continue;
    shape[parameter.name] = decodedFromWire(withoutDefault(parameter.schema));
  }
  return z.object(shape) as unknown as z.ZodType<RouteParams<R>, unknown>;
}

/** The JSON body's schema, or `undefined` for a route that takes none. */
export function bodySchemaOf<R extends RouteShape>(
  route: R,
): z.ZodType<RouteBody<R>, unknown> | undefined {
  const media = route.requestBody?.content['application/json'];
  if (media === undefined) return undefined;
  return asOptional(media.schema, route.requestBody?.required) as unknown as z.ZodType<
    RouteBody<R>,
    unknown
  >;
}

/** The lowest 2xx a route declares — the status a handler answers with when it succeeds. */
export function successStatusOf(route: RouteShape): number {
  const statuses = Object.keys(route.responses)
    .map(Number)
    .filter((status) => status >= 200 && status < 300)
    .sort((a, b) => a - b);
  const first = statuses[0];
  if (first === undefined) {
    throw new Error(
      `${route.method.toUpperCase()} ${versionedPath(route)} declares no 2xx response.`,
    );
  }
  return first;
}
