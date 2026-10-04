/**
 * A typed client for an api: one method per operation id, its input and each declared response
 * typed from the route.
 *
 * It only needs a `fetch`, typed structurally here because the published packages compile with
 * no DOM and no Node types (`code-conventions.md` §2.3 d): the browser's, React Native's and
 * Node's all fit, and so does a test double.
 */

import type { z } from 'zod';

import type {
  Api,
  ClientView,
  Degraded,
  DerivedStatus,
  ErrorBody,
  RouteInput,
  RouteResponseBody,
  RouteShape,
} from '../http/index.js';
import { DERIVED_ERROR_CODES, parseTolerant, versionedPath } from '../http/index.js';

export interface FetchInit {
  readonly method: string;
  readonly headers: Record<string, string>;
  readonly body?: string;
}

export interface FetchResponseLike {
  readonly status: number;
  readonly headers: { get(name: string): string | null };
  text(): Promise<string>;
}

/** `Init` is what a caller adds per call and the `fetch` understands — an `AbortSignal`, say. */
export type FetchLike<Init extends object> = (
  url: string,
  init: FetchInit & Init,
) => Promise<FetchResponseLike>;

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
export type ClientResponse<R extends RouteShape> =
  | {
      [S in DeclaredStatus<R>]: {
        readonly status: S;
        readonly body: ClientView<RouteResponseBody<R, S>> & Degraded<R>;
        readonly headers: FetchResponseLike['headers'];
      };
    }[DeclaredStatus<R>]
  | DerivedResponse<R>;

type Optional<Key extends string, T> =
  Record<never, never> extends T ? Readonly<Partial<Record<Key, T>>> : Readonly<Record<Key, T>>;

export type ClientInput<R extends RouteShape, Init extends object> = Optional<
  'params',
  RouteInput<R>['params']
> &
  Optional<'query', RouteInput<R>['query']> &
  (RouteInput<R>['body'] extends undefined
    ? { readonly body?: undefined }
    : { readonly body: RouteInput<R>['body'] }) & {
    /** Header names as the contract writes them. Those the options already send may be left out. */
    readonly headers?: RouteInput<R>['headers'] & Readonly<Record<string, string>>;
    readonly init?: Init;
  };

/** The relations a read can return on demand: the names its `include` parameter takes. */
export type IncludeNames<R extends RouteShape> = R extends {
  readonly parameters: readonly (infer P)[];
}
  ? P extends { readonly name: 'include'; readonly schema: infer S extends z.ZodType }
    ? z.output<S> extends readonly (infer N)[]
      ? N
      : never
    : never
  : never;

/** A response whose `data` has the relations that were asked for, and only those, present. */
export type NarrowIncluded<T, Names> = T extends { readonly body: infer B }
  ? B extends { readonly data: infer D }
    ? Omit<T, 'body'> & {
        readonly body: Omit<B, 'data'> & {
          readonly data: D & Required<Pick<D, Names & keyof D>>;
        };
      }
    : T
  : T;

export type ClientMethod<R extends RouteShape, Init extends object> = [IncludeNames<R>] extends [
  never,
]
  ? Record<never, never> extends ClientInput<R, Init>
    ? (input?: ClientInput<R, Init>) => Promise<ClientResponse<R>>
    : (input: ClientInput<R, Init>) => Promise<ClientResponse<R>>
  : <const I extends readonly IncludeNames<R>[] = readonly []>(
      input?: Omit<ClientInput<R, Init>, 'query'> & {
        readonly query?: Omit<NonNullable<ClientInput<R, Init>['query']>, 'include'> & {
          readonly include?: I;
        };
      },
    ) => Promise<NarrowIncluded<ClientResponse<R>, I[number]>>;

export type Client<A extends Api, Init extends object> = {
  readonly [K in keyof A['routes']]: ClientMethod<A['routes'][K], Init>;
};

/** A status the route does not declare: the body is not the route's to type, so it is not typed. */
export class UndeclaredStatusError extends Error {
  public constructor(
    public readonly operationId: string,
    public readonly status: number,
    public readonly body: unknown,
  ) {
    super(`${operationId} answered ${String(status)}, which its contract does not declare.`);
    this.name = 'UndeclaredStatusError';
  }
}

interface AnyInput {
  readonly params?: Readonly<Record<string, unknown>>;
  readonly query?: Readonly<Record<string, unknown>>;
  readonly headers?: Readonly<Record<string, string>>;
  readonly body?: unknown;
  readonly init?: object;
}

function wireValue(value: unknown): string {
  return typeof value === 'string' ? value : JSON.stringify(value);
}

function pathOf(template: string, params: Readonly<Record<string, unknown>>): string {
  return template.replace(/\{([^}]+)\}/g, (_match, name: string) => {
    const value = params[name];
    if (value === undefined) throw new Error(`The path parameter "${name}" is missing.`);
    return encodeURIComponent(wireValue(value));
  });
}

/** Lists as repeated keys and an absent value left out: `style: form`, `explode: true`. */
function queryStringOf(query: Readonly<Record<string, unknown>>): string {
  const pairs: string[] = [];
  for (const [key, value] of Object.entries(query)) {
    const items: readonly unknown[] = Array.isArray(value) ? value : [value];
    for (const item of items) {
      if (item === undefined || item === null) continue;
      pairs.push(`${encodeURIComponent(key)}=${encodeURIComponent(wireValue(item))}`);
    }
  }
  return pairs.length > 0 ? `?${pairs.join('&')}` : '';
}

async function bodyOf(response: FetchResponseLike): Promise<unknown> {
  const text = await response.text();
  if (text === '') return undefined;
  return response.headers.get('content-type')?.includes('json') === true
    ? (JSON.parse(text) as unknown)
    : text;
}

/** A body parsed with its schema, keeping a variant of a tagged union it does not know. */
function readTolerant(schema: Parameters<typeof parseTolerant>[0], body: unknown): unknown {
  const result = parseTolerant(schema, body);
  if (!result.ok) throw result.error;
  return result.value;
}

export function createClient<A extends Api, Init extends object = Record<never, never>>(
  api: A,
  options: ClientOptions<Init>,
): Client<A, Init> {
  const baseUrl = options.baseUrl.replace(/\/+$/, '');
  const client: Record<string, (input?: AnyInput) => Promise<unknown>> = {};
  for (const [operationId, route] of Object.entries(api.routes)) {
    client[operationId] = async (input: AnyInput = {}) => {
      const shared = typeof options.headers === 'function' ? options.headers() : options.headers;
      const headers: Record<string, string> = { ...shared, ...input.headers };
      const hasBody = input.body !== undefined;
      if (hasBody) headers['content-type'] = 'application/json';
      const url = `${baseUrl}${pathOf(versionedPath(route), input.params ?? {})}${queryStringOf(input.query ?? {})}`;
      const request: FetchInit = {
        method: route.method.toUpperCase(),
        headers,
        ...(hasBody && { body: JSON.stringify(input.body) }),
      };
      const init: FetchInit & Init = { ...((input.init ?? {}) as Init), ...request };
      const response = await options.fetch(url, init);
      const body = await bodyOf(response);
      const declared = route.responses[String(response.status)];
      if (declared === undefined && !(response.status in DERIVED_ERROR_CODES)) {
        throw new UndeclaredStatusError(operationId, response.status, body);
      }
      const schema = declared?.content?.['application/json']?.schema;
      return {
        status: response.status,
        body:
          options.validateResponses === true && schema !== undefined
            ? readTolerant(schema, body)
            : body,
        headers: response.headers,
      };
    };
  }
  return client as Client<A, Init>;
}
