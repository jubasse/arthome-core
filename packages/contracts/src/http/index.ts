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
  /** The OpenAPI template, `/v1/dates/{dateId}`. */
  readonly path: string;
  readonly parameters?: readonly Parameter[];
  readonly requestBody?: RequestBody;
  readonly responses: Readonly<Record<string, Response>>;
}

export interface RouteDefinition extends RouteShape, Extensions {
  readonly operationId: string;
  readonly tags?: readonly string[];
  readonly summary?: string;
  readonly description?: string;
  readonly deprecated?: boolean;
  readonly security?: readonly Readonly<Record<string, readonly string[]>>[];
}

export type Route<T extends RouteShape = RouteShape> = T & Omit<RouteDefinition, keyof T>;

export function defineRoute<const T extends RouteDefinition>(definition: T): Route<T> {
  return definition;
}

/** The annotation of a path parameter: OpenAPI makes every one required. */
export interface PathParameter<Name extends string, S extends z.ZodType> extends Parameter {
  readonly name: Name;
  readonly in: 'path';
  readonly required: true;
  readonly schema: S;
}

export interface QueryParameter<
  Name extends string,
  S extends z.ZodType,
  Required = false,
> extends Parameter {
  readonly name: Name;
  readonly in: 'query';
  readonly required?: Required extends true ? true : false;
  readonly schema: S;
}

export interface HeaderParameter<
  Name extends string,
  S extends z.ZodType,
  Required = false,
> extends Parameter {
  readonly name: Name;
  readonly in: 'header';
  readonly required?: Required extends true ? true : false;
  readonly schema: S;
}

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
  readonly security?: readonly Readonly<Record<string, readonly string[]>>[];
  readonly routes: Routes;
  readonly components: ApiComponents;
}

export type Api<Routes extends Readonly<Record<string, Route>> = Readonly<Record<string, Route>>> =
  ApiDefinition<Routes>;

export function defineApi<const Routes extends Readonly<Record<string, Route>>>(
  definition: ApiDefinition<Routes>,
): Api<Routes> {
  for (const [key, route] of Object.entries(definition.routes)) {
    if (key !== route.operationId) {
      throw new Error(`defineApi: the route under "${key}" is operation "${route.operationId}".`);
    }
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
    throw new Error(`${route.method.toUpperCase()} ${route.path} declares no 2xx response.`);
  }
  return first;
}
