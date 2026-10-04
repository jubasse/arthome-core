import { z } from 'zod';

import { ApiErrorCode, DomainErrorCode } from '@arthome/core';

import type { Access } from './access.js';
import type { BuiltRoute, BuiltRouteDefinition, RouteBuilder, Scope } from './builder.js';
import type { ErrorsInput } from './errors.js';
import type {
  Header,
  JsonRequestBody,
  JsonResponse,
  Parameter,
  QueryParameter,
  Response,
} from './index.js';
import {
  sortDirectionSchema,
  sortKeyName,
  type Paging,
  type PagingConvention,
  type PagingConventions,
  type SortDirection,
  type SortKey,
} from './paging.js';
import { BATCH_BODY_LIMIT } from './policy.js';

type PathParameterOf = Parameter & { readonly in: 'path' };

type Responses = Readonly<Record<string, Response>>;

/**
 * What an api decides once for every resource it serves: the envelope of one record and of a page,
 * the parameters a list takes, the validators of a read, the key and the version a write carries.
 */
export interface ResourceConventions {
  /** Never read at runtime: the fields of the envelope every response carries, for the client's types. */
  readonly meta?: object;
  readonly item: (data: z.ZodType) => z.ZodType;
  readonly page: (data: z.ZodType) => z.ZodType;
  readonly listParameters: readonly Parameter[];
  /** `If-None-Match`, on a read. */
  readonly readParameters: readonly Parameter[];
  /** `ETag`, on the 200 of a read. */
  readonly readHeaders: Readonly<Record<string, Header>>;
  readonly notModified?: Response;
  /** The api's `Idempotency-Replayed` header, kept as one component. */
  readonly replayedHeader?: Header;
  /** The paging a list has unless it says otherwise. */
  readonly paging?: Paging;
  /** The other kinds of paging this api serves, beside its default. */
  readonly paginations?: PagingConventions;
  /** `Idempotency-Key`, on a write. */
  readonly writeParameters: readonly Parameter[];
  /** The version a write expects the record to be at: a body field on an update, a query parameter on a removal. */
  readonly expectedVersion: z.ZodType;
}

export interface ResourceOptions<
  Id extends PathParameterOf,
  Parents extends readonly PathParameterOf[] = readonly [],
  Owner extends 'caller' | undefined = undefined,
> {
  readonly id: Id;
  /** `caller`: only the caller writes this data, so there is no version, no conflict, and another caller's id is a 404. */
  readonly owner?: Owner;
  /** The path parameters of the resources this one is nested in, in path order. */
  readonly parents?: Parents;
  /** The singular, in kebab-case or camelCase, when dropping the final `s` of the name is wrong. */
  readonly singular?: string;
}

export interface SingleOptions<
  Parents extends readonly PathParameterOf[] = readonly [],
  Owner extends 'caller' | undefined = undefined,
> {
  readonly parents?: Parents;
  readonly owner?: Owner;
}

/** What a resource knows about itself: the builder it comes from and the path it serves. */
export interface ResourceContext {
  readonly version: number;
  readonly headers: readonly Parameter[];
  readonly responses: Responses;
  readonly allowed: string;
  readonly conventions: unknown;
  readonly access: unknown;
  readonly scope: Scope;
  readonly name: string;
  readonly id: PathParameterOf | undefined;
  readonly parents: readonly PathParameterOf[];
  readonly owner: 'caller' | undefined;
}

type Owned<C extends ResourceContext> = C['owner'] extends 'caller' ? true : false;

type Conv<C extends ResourceContext> = Extract<C['conventions'], ResourceConventions>;

type Without<
  T extends readonly Parameter[],
  Held extends readonly Parameter[],
> = T extends readonly [infer First extends Parameter, ...infer Rest extends readonly Parameter[]]
  ? First extends Held[number]
    ? Without<Rest, Held>
    : readonly [First, ...Without<Rest, Held>]
  : readonly [];

/** The parameters the convention adds, less those the builder already carries and so places itself. */
type Added<
  C extends ResourceContext,
  K extends 'listParameters' | 'readParameters' | 'writeParameters',
> = Without<Conv<C>[K], C['headers']>;

/** What a member says beyond the convention: prose, metadata, extra parameters, responses and codes. */
export type MemberDocs<Allowed extends string = string> = Omit<
  BuiltRouteDefinition<Allowed>,
  'method' | 'path' | 'operationId' | 'responses' | 'requestBody' | 'parameters'
> & {
  readonly operationId?: string;
  readonly parameters?: readonly Parameter[];
  readonly responses?: Responses;
  /** The example of the request body. */
  readonly example?: unknown;
  /** The body is not required: the request may carry none. */
  readonly optionalBody?: true;
};

type Docs<C extends ResourceContext, Own = unknown> = MemberDocs<C['allowed']> & Own;

type Envelope<C extends ResourceContext> =
  Conv<C> extends { readonly meta?: infer M extends object } ? M : object;
type Item<C extends ResourceContext, S extends z.ZodType> = Envelope<C> & {
  readonly data: z.output<S>;
};
type Page<C extends ResourceContext, S extends z.ZodType> = Envelope<C> & {
  readonly data: readonly z.output<S>[];
  readonly page: unknown;
};
type Schema<T> = z.ZodType<T>;

type ItemOf<D> = D extends { readonly item: infer S extends z.ZodType } ? S : z.ZodType;

export type ExpectedVersionQuery = QueryParameter<'expectedVersion', z.ZodType, true>;
type CodesOf<R> = R extends readonly (infer K)[] ? K : never;
type Join<Convention, Own> = Own extends readonly unknown[]
  ? Convention extends readonly unknown[]
    ? readonly (CodesOf<Convention> | CodesOf<Own>)[]
    : Own
  : Own;
type JoinErrors<Convention, Own> = {
  readonly [S in keyof Convention | keyof Own]: S extends keyof Own
    ? S extends keyof Convention
      ? Join<Convention[S], Own[S]>
      : Own[S]
    : S extends keyof Convention
      ? Convention[S]
      : never;
};
type OwnErrors<D> = D extends { readonly errors: infer R } ? R : Record<never, never>;
type OwnParameters<D> = D extends { readonly parameters: infer X extends readonly Parameter[] }
  ? X
  : readonly [];
type OwnResponses<D> = D extends { readonly responses: infer R } ? R : Record<never, never>;

type Codes<K extends string> = readonly K[];
type NotFound = Codes<typeof ApiErrorCode.NOT_FOUND>;
type IdempotencyCodes = Codes<
  typeof ApiErrorCode.IDEMPOTENCY_KEY_REUSED | typeof ApiErrorCode.IDEMPOTENCY_IN_FLIGHT
>;
type ConflictCodes = Codes<
  | typeof DomainErrorCode.STATE_CONFLICT
  | typeof ApiErrorCode.IDEMPOTENCY_KEY_REUSED
  | typeof ApiErrorCode.IDEMPOTENCY_IN_FLIGHT
>;
type InvalidCursor = Codes<typeof ApiErrorCode.SCHEMA_INVALID>;

type Member<
  C extends ResourceContext,
  D,
  Method extends 'get' | 'post' | 'put' | 'patch' | 'delete',
  Path extends string,
  Params extends readonly Parameter[],
  Success extends Responses,
  Errors,
  Body = unknown,
> = BuiltRoute<
  C['version'],
  C['headers'],
  C['responses'],
  {
    readonly method: Method;
    readonly path: Path;
    readonly operationId: string;
    readonly parameters: readonly [...Params, ...OwnParameters<D>];
    readonly responses: Omit<StatedSuccess<D, Success>, keyof OwnResponses<D>> & OwnResponses<D>;
    readonly errors: JoinErrors<Errors, OwnErrors<D>>;
  } & Body,
  C['access'] extends Access | undefined ? C['access'] : undefined,
  C['scope']
>;

type CollectionPath<C extends ResourceContext> = `/${C['name']}`;
type ItemPath<C extends ResourceContext> = C['id'] extends { readonly name: infer N extends string }
  ? `/${C['name']}/{${N}}`
  : `/${C['name']}`;
type ItemParameters<C extends ResourceContext> = C['id'] extends PathParameterOf
  ? readonly [...C['parents'], C['id']]
  : C['parents'];
type ConflictFor<C extends ResourceContext> =
  Owned<C> extends true ? IdempotencyCodes : ConflictCodes;
type VersionField<C extends ResourceContext> =
  Owned<C> extends true
    ? Record<never, never>
    : { readonly expectedVersion: Conv<C>['expectedVersion'] };

/** The body a write sends: the schema given, with the `expectedVersion` a shared record asks for. */
type VersionedBody<C extends ResourceContext, B> =
  B extends z.ZodObject<infer Shape, infer Config>
    ? z.ZodObject<Shape & VersionField<C>, Config>
    : z.ZodType;

/** The body of a partial change: each writable field optional, and the version. */
type PatchedBody<C extends ResourceContext, D> = D extends {
  readonly fields: infer F extends z.ZodObject;
}
  ? PartialBody<C, F>
  : D extends { readonly body: infer B extends z.ZodObject }
    ? PartialBody<C, B>
    : z.ZodType;

type PartialBody<C extends ResourceContext, F> =
  F extends z.ZodObject<infer Shape, infer Config>
    ? z.ZodObject<
        { readonly [K in keyof Shape]: z.ZodOptional<Shape[K]> } & VersionField<C>,
        Config
      >
    : z.ZodType;
/**
 * What a versioned write says about its item: a shared record's carries a `version`, the caller's
 * own need not, and a route that states its answer in full (`responses`) owns its shape.
 */
type ItemFor<C extends ResourceContext> =
  Owned<C> extends true
    ? { readonly item?: z.ZodType }
    : | { readonly item: VersionedItem<C> }
      | { readonly item?: z.ZodType; readonly responses: Readonly<Record<string, Response>> };

/** A shared record's item carries a `version`: absent from a given answer perhaps, never from the shape. */
type VersionedItem<C extends ResourceContext> =
  Owned<C> extends true ? z.ZodType : z.ZodType<{ readonly version?: number | undefined }>;
type NotFoundFor<C extends ResourceContext> = C['id'] extends PathParameterOf
  ? { readonly 404: NotFound }
  : Record<never, never>;
interface Sent<S extends z.ZodType, Required = true> {
  readonly requestBody: JsonRequestBody<S, Required>;
}

type ResponseOf<
  C extends ResourceContext,
  S extends z.ZodType | undefined,
  Status extends 200 | 201,
> = S extends z.ZodType
  ? Readonly<Record<Status, JsonResponse<Schema<Item<C, S>>>>>
  : { readonly 204: Response };

type RelationsOf<D> = D extends {
  readonly expand: infer E extends Readonly<Record<string, z.ZodType>>;
}
  ? { readonly [K in keyof E]?: z.output<E[K]> }
  : unknown;

type ExpandParameters<D> = D extends {
  readonly expand: infer E extends Readonly<Record<string, z.ZodType>>;
}
  ? readonly [
      QueryParameter<'include', z.ZodArray<z.ZodEnum<{ readonly [K in keyof E & string]: K }>>>,
    ]
  : readonly [];

export type FindRoute<C extends ResourceContext, D> = Member<
  C,
  D,
  'get',
  ItemPath<C>,
  readonly [...ItemParameters<C>, ...ExpandParameters<D>],
  {
    readonly 200: JsonResponse<
      Schema<Envelope<C> & { readonly data: z.output<ItemOf<D>> & RelationsOf<D> }>
    >;
  },
  NotFoundFor<C>
>;

type KeyName<T> = T extends string
  ? T
  : T extends { readonly key: infer N extends string }
    ? N
    : never;

type DropNamed<T extends readonly Parameter[], Names extends string> = T extends readonly [
  infer First extends Parameter,
  ...infer Rest extends readonly Parameter[],
]
  ? First['name'] extends Names
    ? DropNamed<Rest, Names>
    : readonly [First, ...DropNamed<Rest, Names>]
  : readonly [];

type SortParameters<D> = D extends { readonly sortable: infer S extends readonly SortKey[] }
  ? readonly [
      QueryParameter<'sortBy', z.ZodEnum<{ readonly [K in KeyName<S[number]>]: K }>>,
      QueryParameter<'sortDir', z.ZodDefault<z.ZodEnum<{ readonly [K in SortDirection]: K }>>>,
    ]
  : readonly [];

type FilterParameters<D> = D extends { readonly filters: infer F extends z.ZodType }
  ? readonly [QueryParameter<'filters', F>]
  : readonly [];

type ListBase<C extends ResourceContext, D> = D extends { readonly paging: infer P extends Paging }
  ? P extends { readonly kind: 'changesSince' }
    ? readonly [QueryParameter<'since', z.ZodString, true>]
    : Conv<C> extends { readonly paginations: infer Pg }
      ? P['kind'] extends keyof Pg
        ? Pg[P['kind']] extends {
            readonly parameters: (...paging: never[]) => infer R extends readonly Parameter[];
          }
          ? R
          : readonly Parameter[]
        : readonly Parameter[]
      : readonly Parameter[]
  : Added<C, 'listParameters'>;

type ListParameters<C extends ResourceContext, D> = readonly [
  ...(D extends { readonly sortable: unknown }
    ? DropNamed<ListBase<C, D>, 'sortBy' | 'sortDir'>
    : ListBase<C, D>),
  ...SortParameters<D>,
  ...FilterParameters<D>,
];

export type FindAllRoute<C extends ResourceContext, D> = Member<
  C,
  D,
  'get',
  CollectionPath<C>,
  readonly [...C['parents'], ...ListParameters<C, D>],
  {
    readonly 200: JsonResponse<
      Schema<
        D extends { readonly paging: { readonly kind: 'changesSince' } }
          ? Item<C, ItemOf<D>>
          : Page<C, ItemOf<D>>
      >
    >;
  },
  { readonly 400: InvalidCursor }
>;

export type CreateRoute<C extends ResourceContext, D> = Member<
  C,
  D,
  'post',
  CollectionPath<C>,
  readonly [
    ...C['parents'],
    ...(D extends { readonly idempotent: false } ? readonly [] : Added<C, 'writeParameters'>),
  ],
  { readonly 201: JsonResponse<Schema<Item<C, ResponseSchema<D>>>> },
  D extends { readonly idempotent: false }
    ? Record<never, never>
    : { readonly 409: IdempotencyCodes },
  Sent<BodyOf<D>>
>;

export type UpdateRoute<C extends ResourceContext, D> = Member<
  C,
  D,
  'patch',
  ItemPath<C>,
  readonly [...ItemParameters<C>, ...Added<C, 'writeParameters'>],
  { readonly 200: JsonResponse<Schema<Item<C, ItemOf<D>>>> },
  NotFoundFor<C> & { readonly 409: ConflictFor<C> },
  Sent<PatchedBody<C, D>>
>;

export type ReplaceRoute<C extends ResourceContext, D> = Member<
  C,
  D,
  'put',
  ItemPath<C>,
  readonly [...ItemParameters<C>, ...Added<C, 'writeParameters'>],
  { readonly 200: JsonResponse<Schema<Item<C, ItemOf<D>>>> },
  NotFoundFor<C> & { readonly 409: ConflictFor<C> },
  Sent<VersionedBody<C, BodyOf<D>>>
>;

export type UpsertRoute<C extends ResourceContext, D> = Member<
  C,
  D,
  'put',
  ItemPath<C>,
  readonly [
    ...ItemParameters<C>,
    ...(D extends { readonly idempotent: false } ? readonly [] : Added<C, 'writeParameters'>),
  ],
  ResponseOf<C, ItemSchema<D>, 200>,
  D extends { readonly idempotent: false }
    ? Record<never, never>
    : { readonly 409: IdempotencyCodes },
  BodyPart<D>
>;

export type DeleteRoute<C extends ResourceContext, D> = Member<
  C,
  D,
  'delete',
  ItemPath<C>,
  readonly [
    ...ItemParameters<C>,
    ...Added<C, 'writeParameters'>,
    ...(Owned<C> extends true ? readonly [] : readonly [ExpectedVersionQuery]),
  ],
  D extends { readonly response: infer R extends z.ZodType }
    ? { readonly 200: JsonResponse<Schema<Item<C, R>>> }
    : { readonly 204: Response },
  NotFoundFor<C> & { readonly 409: ConflictFor<C> }
>;

export type ActionRoute<
  C extends ResourceContext,
  Scope extends 'item' | 'collection',
  Name extends string,
  D,
> = Member<
  C,
  D,
  ActionMethod<D>,
  Scope extends 'item' ? `${ItemPath<C>}/${Name}` : `${CollectionPath<C>}/${Name}`,
  readonly [
    ...(Scope extends 'item' ? ItemParameters<C> : C['parents']),
    ...(ActionMethod<D> extends 'get' ? readonly [] : Added<C, 'writeParameters'>),
  ],
  ActionSuccess<C, D>,
  ActionMethod<D> extends 'get' ? Record<never, never> : { readonly 409: IdempotencyCodes },
  BodyPart<D>
>;

export type SubresourceReplaceRoute<C extends ResourceContext, Name extends string, D> = Member<
  C,
  D,
  'put',
  `${ItemPath<C>}/${Name}`,
  readonly [...ItemParameters<C>, ...Added<C, 'writeParameters'>],
  ResponseOf<C, ItemSchema<D>, 200>,
  NotFoundFor<C> & { readonly 409: ConflictFor<C> },
  Sent<VersionedBody<C, BodyOf<D>>>
>;

export type BatchRoute<C extends ResourceContext, D> = Member<
  C,
  D,
  'post',
  `/${C['name']}/batch`,
  C['parents'],
  {
    readonly 200: JsonResponse<
      Schema<
        Envelope<C> & {
          readonly data: Readonly<Record<string, z.output<ItemOf<D>>>>;
        }
      >
    >;
  },
  Record<never, never>,
  Sent<
    Schema<{
      readonly ids: readonly (C['id'] extends PathParameterOf
        ? z.output<C['id']['schema']>
        : string)[];
    }>
  >
>;

type ActionMethod<D> = D extends {
  readonly method: infer M extends 'get' | 'post' | 'put' | 'patch' | 'delete';
}
  ? M
  : 'post';

type SuccessKey = 200 | 201 | 202 | 203 | 204 | 206;

/** What the convention answers, unless the route states a success of its own, which replaces it. */
type StatedSuccess<D, Default> = D extends { readonly responses: infer R }
  ? [Extract<keyof R, SuccessKey>] extends [never]
    ? Default
    : Record<never, never>
  : Default;

type ActionSuccess<C extends ResourceContext, D> = D extends {
  readonly responses: infer R;
}
  ? [Extract<keyof R, SuccessKey>] extends [never]
    ? ActionDefaultSuccess<C, D>
    : Record<never, never>
  : ActionDefaultSuccess<C, D>;

type ActionDefaultSuccess<C extends ResourceContext, D> = D extends {
  readonly status: infer S extends number;
}
  ? D extends { readonly response: infer R extends z.ZodType }
    ? Readonly<Record<S, JsonResponse<Schema<Item<C, R>>>>>
    : Readonly<Record<S, Response>>
  : D extends { readonly response: infer R extends z.ZodType }
    ? { readonly 200: JsonResponse<Schema<Item<C, R>>> }
    : { readonly 204: Response };

type BodyOf<D> = D extends { readonly body: infer B extends z.ZodType } ? B : z.ZodType;
type BodyPart<D> = D extends { readonly body: infer B extends z.ZodType }
  ? Sent<B, D extends { readonly optionalBody: true } ? false : true>
  : unknown;
type ResponseSchema<D> = D extends { readonly response: infer R extends z.ZodType } ? R : ItemOf<D>;
type ItemSchema<D> = D extends { readonly item: infer S extends z.ZodType } ? S : undefined;

export type CrudMember = 'find' | 'findAll' | 'create' | 'update' | 'replace' | 'upsert' | 'delete';
type DefaultMember = 'find' | 'findAll' | 'create' | 'update' | 'delete';

type Selection =
  | { readonly omit?: readonly DefaultMember[]; readonly pick?: undefined }
  | { readonly pick?: readonly CrudMember[]; readonly omit?: undefined };

type Own<O, K extends string> = O extends Readonly<Record<K, infer X>> ? X : unknown;

type DefaultsOf<C extends ResourceContext> = C['id'] extends PathParameterOf
  ? DefaultMember
  : 'find' | 'update';

type SelectedMember<C extends ResourceContext, O> = O extends {
  readonly pick: readonly (infer M)[];
}
  ? M
  : | Exclude<DefaultsOf<C>, O extends { readonly omit: readonly (infer X)[] } ? X : never>
    | Extract<keyof O, 'replace' | 'upsert'>;

export interface CrudOptions<C extends ResourceContext> {
  readonly item: z.ZodType;
  readonly findAll?: Docs<
    C,
    {
      readonly paging?: Paging;
      readonly sortable?: readonly SortKey[];
      readonly filters?: z.ZodObject;
    }
  >;
  readonly find?: Docs<C, { readonly expand?: Readonly<Record<string, z.ZodType>> }>;
  readonly create?: Docs<C, { readonly body: z.ZodType; readonly response?: z.ZodType }>;
  readonly update?: Docs<C, { readonly fields: z.ZodObject } | { readonly body: z.ZodObject }>;
  readonly replace?: Docs<C, { readonly body: z.ZodObject }>;
  readonly upsert?: Docs<C, { readonly body?: z.ZodType }>;
  readonly delete?: Docs<C, { readonly response?: z.ZodType }>;
}

type CrudRequires<C extends ResourceContext, O> = ('create' extends SelectedMember<C, O>
  ? { readonly create: NonNullable<CrudOptions<C>['create']> }
  : unknown) &
  ('update' extends SelectedMember<C, O>
    ? { readonly update: NonNullable<CrudOptions<C>['update']> }
    : unknown);

type WithItem<O extends { readonly item: z.ZodType }, M extends string> = Own<O, M> & {
  readonly item: O['item'];
};

type CrudRoute<C extends ResourceContext, O extends { readonly item: z.ZodType }, M> = {
  find: FindRoute<C, WithItem<O, 'find'>>;
  findAll: FindAllRoute<C, WithItem<O, 'findAll'>>;
  create: CreateRoute<C, WithItem<O, 'create'>>;
  update: UpdateRoute<C, WithItem<O, 'update'>>;
  replace: ReplaceRoute<C, WithItem<O, 'replace'>>;
  upsert: UpsertRoute<C, WithItem<O, 'upsert'>>;
  delete: DeleteRoute<C, Own<O, 'delete'>>;
}[M & CrudMember];

type LastSegment<S extends string> = S extends `${string}/${infer Rest}` ? LastSegment<Rest> : S;
type PascalOf<S extends string> = S extends `${infer Head}-${infer Tail}`
  ? `${Capitalize<Head>}${PascalOf<Tail>}`
  : Capitalize<S>;
type SingularOf<S extends string> = S extends `${infer B}ies`
  ? `${B}y`
  : S extends `${infer B}ches`
    ? `${B}ch`
    : S extends `${infer B}shes`
      ? `${B}sh`
      : S extends `${infer B}xes`
        ? `${B}x`
        : S extends `${infer B}sses`
          ? `${B}ss`
          : S extends `${infer B}s`
            ? B
            : S;

/** The word an operation id ends with: a collection's singular, a single's own name. */
type SubjectOf<C extends ResourceContext> = C['id'] extends PathParameterOf
  ? PascalOf<SingularOf<LastSegment<C['name']>>>
  : PascalOf<LastSegment<C['name']>>;

type DerivedId<C extends ResourceContext, M> = M extends 'findAll'
  ? `findAll${PascalOf<LastSegment<C['name']>>}`
  : `${Extract<M, string>}${SubjectOf<C>}`;

type IdOf<C extends ResourceContext, O, M extends string> =
  Own<O, M> extends {
    readonly operationId: infer I extends string;
  }
    ? I
    : DerivedId<C, M>;

/** What `crud` returns: its routes keyed by operation id, so the record spreads into a closure. */
export type CrudRoutes<C extends ResourceContext, O extends { readonly item: z.ZodType }> = {
  readonly [M in SelectedMember<C, O> & CrudMember as IdOf<C, O, M>]: CrudRoute<C, O, M>;
};

/** The context of what is nested under one record of `C`, or under `C` itself when it has no id. */
export type ChildContext<
  C extends ResourceContext,
  Name extends string,
  Id extends PathParameterOf | undefined,
  Owner extends 'caller' | undefined,
> = Omit<C, 'scope' | 'name' | 'id' | 'parents' | 'owner'> & {
  readonly scope: {
    readonly prefix: `${C['scope']['prefix']}/${C['name']}${C['id'] extends {
      readonly name: infer N extends string;
    }
      ? `/{${N}}`
      : ''}`;
    readonly params: readonly [
      ...C['scope']['params'],
      ...(C['id'] extends PathParameterOf ? readonly [C['id']] : readonly []),
    ];
  };
  readonly name: Name;
  readonly id: Id;
  readonly parents: readonly [];
  readonly owner: Owner;
};

export interface Resource<C extends ResourceContext> {
  find<
    const D extends Docs<
      C,
      { readonly item?: z.ZodType; readonly expand?: Readonly<Record<string, z.ZodType>> }
    >,
  >(
    docs: D,
  ): FindRoute<C, D>;
  findAll<
    const D extends Docs<
      C,
      {
        readonly item?: z.ZodType;
        readonly paging?: Paging;
        readonly sortable?: readonly SortKey[];
        readonly filters?: z.ZodObject;
      }
    >,
  >(
    docs: D,
  ): FindAllRoute<C, D>;
  /** POST on the collection, carrying an `Idempotency-Key`. */
  create<
    const D extends Docs<
      C,
      {
        readonly body: z.ZodType;
        readonly item?: z.ZodType;
        readonly response?: z.ZodType;
        /** `false`: no idempotency key, for a write that is a stream of samples. */
        readonly idempotent?: false;
      }
    >,
  >(
    docs: D,
  ): CreateRoute<C, D>;
  /**
   * PATCH: a partial change of one or several properties, with no business rule. An absent field
   * is unchanged and null clears an optional field. The body is `fields` made optional, or `body`
   * when the partial shape is not that; `expectedVersion` is added either way. A change that has
   * rules or consequences is an `action`.
   */
  update<
    const D extends Docs<
      C,
      ItemFor<C> & ({ readonly fields: z.ZodObject } | { readonly body: z.ZodObject })
    >,
  >(
    docs: D,
  ): UpdateRoute<C, D>;
  /** PUT: a full replacement, idempotent. The body is complete and an absent field is reset. */
  replace<const D extends Docs<C, { readonly body: z.ZodObject } & ItemFor<C>>>(
    docs: D,
  ): ReplaceRoute<C, D>;
  /** PUT on an id the client chose, such as `/follows/{artistId}`: it creates or replaces. */
  upsert<
    const D extends Docs<
      C,
      { readonly body?: z.ZodType; readonly item?: z.ZodType; readonly idempotent?: false }
    >,
  >(
    docs: D,
  ): UpsertRoute<C, D>;
  /** 204 unless `response` is given: the record that went, as it was, answered with a 200. */
  delete<const D extends Docs<C, { readonly response?: z.ZodType }>>(docs?: D): DeleteRoute<C, D>;
  /** `POST /{name}/batch`: many records by id in one read, answered as a table keyed by id. */
  batch<const D extends Docs<C, { readonly item: z.ZodType; readonly max?: number }>>(
    docs: D,
  ): BatchRoute<C, D>;
  /** A collection nested under one record of this one. */
  resource<
    const Name extends string,
    const Id extends PathParameterOf,
    const Owner extends 'caller' | undefined = undefined,
  >(
    name: Name,
    options: Omit<ResourceOptions<Id, readonly [], Owner>, 'parents'>,
  ): Resource<ChildContext<C, Name, Id, Owner>>;
  resource<
    const Name extends string,
    const Id extends PathParameterOf,
    const Owner extends 'caller' | undefined,
    R,
  >(
    name: Name,
    options: Omit<ResourceOptions<Id, readonly [], Owner>, 'parents'>,
    closure: (resource: Resource<ChildContext<C, Name, Id, Owner>>) => R,
  ): R;
  /** A prefix under this resource's record, with the path parameters it declares. */
  path<const T extends string, const Ps extends readonly PathParameterOf[]>(
    template: T,
    ...params: Ps
  ): RouteBuilder<
    C['version'],
    C['headers'],
    C['responses'],
    C['allowed'],
    Extract<C['conventions'], ResourceConventions | undefined>,
    Extract<C['access'], Access | undefined>,
    {
      readonly prefix: `${ChildContext<C, string, undefined, undefined>['scope']['prefix']}/${T}`;
      readonly params: readonly [
        ...ChildContext<C, string, undefined, undefined>['scope']['params'],
        ...Ps,
      ];
    }
  >;
  /** What exists once under this resource's record. */
  single<const Name extends string, const Owner extends 'caller' | undefined = undefined>(
    name: Name,
    options?: Omit<SingleOptions<readonly [], Owner>, 'parents'>,
  ): Resource<ChildContext<C, Name, undefined, Owner>>;
  single<const Name extends string, const Owner extends 'caller' | undefined, R>(
    name: Name,
    options: Omit<SingleOptions<readonly [], Owner>, 'parents'> | undefined,
    closure: (single: Resource<ChildContext<C, Name, undefined, Owner>>) => R,
  ): R;
  /** `/{name}/{id}/{action}`: every business state change of one record. */
  action<const Name extends string, const D extends ActionOptions<C>>(
    name: Name,
    options: D,
  ): ActionRoute<C, 'item', Name, D>;
  /** `/{name}/{action}`: an operation on the collection. */
  collectionAction<const Name extends string, const D extends ActionOptions<C>>(
    name: Name,
    options: D,
  ): ActionRoute<C, 'collection', Name, D>;
  subresource<const Name extends string>(
    name: Name,
  ): {
    /** PUT on a sub-resource such as `/dates/{id}/prices`: its full replacement. */
    replace<const D extends Docs<C, { readonly body: z.ZodObject; readonly item?: z.ZodType }>>(
      docs: D,
    ): SubresourceReplaceRoute<C, Name, D>;
  };
  /** The members `find`, `findAll`, `create`, `update` and `delete`; `replace` and `upsert` when given. */
  crud<const O extends CrudOptions<C> & Selection>(
    options: O & CrudRequires<C, O>,
  ): CrudRoutes<C, O>;
}

export type ActionOptions<C extends ResourceContext> = Docs<
  C,
  {
    readonly method?: 'get' | 'post' | 'put' | 'patch' | 'delete';
    readonly body?: z.ZodType;
    readonly response?: z.ZodType;
    readonly status?: number;
    /** `false` leaves the idempotency key off a non-GET action. */
    readonly idempotent?: boolean;
  }
>;

const WORD = /[^A-Za-z0-9]+/;

function pascal(text: string): string {
  return text
    .split(WORD)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join('');
}

function camel(text: string): string {
  const name = pascal(text);
  return name.charAt(0).toLowerCase() + name.slice(1);
}

function singularOf(word: string): string {
  if (word.endsWith('ies')) return `${word.slice(0, -3)}y`;
  if (/(ch|sh|x|ss)es$/.test(word)) return word.slice(0, -2);
  if (word.endsWith('s')) return word.slice(0, -1);
  return word;
}

const SINCE_PARAMETER: Parameter = {
  name: 'since',
  in: 'query',
  required: true,
  description: 'The token the last answer gave.',
  schema: z.string(),
};

function filterParameter(schema: z.ZodObject): Parameter {
  return { name: 'filters', in: 'query', required: false, schema };
}

const SORT_PARAMETERS: readonly string[] = ['sortBy', 'sortDir'];

const NOT_FOUND: ErrorsInput<string> = { 404: [ApiErrorCode.NOT_FOUND] };
const IDEMPOTENCY: readonly string[] = [
  ApiErrorCode.IDEMPOTENCY_KEY_REUSED,
  ApiErrorCode.IDEMPOTENCY_IN_FLIGHT,
];

type AnyBuilder = RouteBuilder<
  number,
  readonly Parameter[],
  Responses,
  string,
  ResourceConventions
>;

type AnyDocs = MemberDocs & Readonly<Record<string, unknown>>;

const OPTION_KEYS = [
  'operationId',
  'parameters',
  'responses',
  'errors',
  'item',
  'body',
  'response',
  'fields',
  'method',
  'status',
  'idempotent',
  'example',
  'optionalBody',
  'filters',
  'max',
] as const;

function mergeErrors(
  convention: ErrorsInput<string>,
  docs: ErrorsInput<string> | undefined,
): ErrorsInput<string> {
  const out: Record<string, Response | readonly string[]> = { ...convention };
  for (const [status, value] of Object.entries(docs ?? {})) {
    const held = out[status];
    out[status] =
      Array.isArray(value) && Array.isArray(held)
        ? [...(held as readonly string[]), ...(value as readonly string[])]
        : (value as Response | readonly string[]);
  }
  return out;
}

function jsonResponse(
  description: string,
  schema: z.ZodType,
  headers?: Readonly<Record<string, Header>>,
): Response {
  return {
    description,
    ...(headers !== undefined && Object.keys(headers).length > 0 && { headers }),
    content: { 'application/json': { schema } },
  };
}

function sentBody(
  schema: z.ZodType,
  docs: AnyDocs | undefined,
): {
  readonly required: boolean;
  readonly content: {
    readonly 'application/json': { readonly schema: z.ZodType; readonly example?: unknown };
  };
} {
  return {
    required: docs?.optionalBody !== true,
    content: {
      'application/json': {
        schema,
        ...(docs?.example !== undefined && { example: docs.example }),
      },
    },
  };
}

interface Spec {
  readonly method: 'get' | 'post' | 'put' | 'patch' | 'delete';
  readonly path: string;
  readonly derivedId: string;
  readonly docs: AnyDocs | undefined;
  readonly parameters: readonly Parameter[];
  readonly responses: Responses;
  readonly errors: ErrorsInput<string>;
  readonly body?: z.ZodType;
}

export function makeResource(
  builder: AnyBuilder,
  given: ResourceConventions,
  name: string,
  options: Omit<ResourceOptions<PathParameterOf, readonly PathParameterOf[]>, 'id'> & {
    readonly id?: PathParameterOf | undefined;
  },
  headers: readonly Parameter[],
): never {
  const held = new Set(headers.map((header) => `${header.in}:${header.name}`));
  const unheld = (parameters: readonly Parameter[]): readonly Parameter[] =>
    parameters.filter((parameter) => !held.has(`${parameter.in}:${parameter.name}`));
  const conventions = {
    ...given,
    listParameters: unheld(given.listParameters),
    readParameters: unheld(given.readParameters),
    writeParameters: unheld(given.writeParameters),
  };
  const parents = options.parents ?? [];
  const { id } = options;
  const last =
    name
      .split('/')
      .filter((segment) => !segment.startsWith('{'))
      .pop() ?? name;
  const plural = pascal(last);
  const singular = pascal(options.singular ?? (id === undefined ? last : singularOf(last)));
  const owned = options.owner === 'caller';
  const collectionPath = `/${name}`;
  const itemPath = id === undefined ? collectionPath : `/${name}/{${id.name}}`;
  const itemParameters: readonly Parameter[] = id === undefined ? parents : [...parents, id];
  const itemNotFound = id === undefined ? {} : NOT_FOUND;
  const conflicts: ErrorsInput<string> = owned
    ? { ...itemNotFound, 409: IDEMPOTENCY }
    : { ...itemNotFound, 409: [DomainErrorCode.STATE_CONFLICT, ...IDEMPOTENCY] };
  const expectedVersionQuery: Parameter = {
    name: 'expectedVersion',
    in: 'query',
    required: true,
    schema: conventions.expectedVersion,
  };
  const withVersion = (body: z.ZodObject): z.ZodType =>
    owned ? body : body.extend({ expectedVersion: conventions.expectedVersion });

  const route = (spec: Spec): unknown => {
    const rest: Record<string, unknown> = { ...spec.docs };
    for (const key of OPTION_KEYS) Reflect.deleteProperty(rest, key);
    const own = spec.docs?.responses ?? {};
    const answered = Object.keys(own).some((status) => status.startsWith('2'));
    const generated = Object.fromEntries(
      Object.entries(spec.responses).filter(([status]) => !(answered && status.startsWith('2'))),
    );
    const definition = {
      method: spec.method,
      path: spec.path,
      operationId: spec.docs?.operationId ?? spec.derivedId,
      ...(spec.body !== undefined && { requestBody: sentBody(spec.body, spec.docs) }),
      ...(owned && { owner: 'caller' }),
      ...rest,
      parameters: [...spec.parameters, ...(spec.docs?.parameters ?? [])],
      responses: { ...generated, ...spec.docs?.responses },
      errors: mergeErrors(spec.errors, spec.docs?.errors),
    };
    return builder.defineRoute(definition as never);
  };

  const expansionsOf = (docs: AnyDocs | undefined): Readonly<Record<string, z.ZodType>> =>
    docs?.expand ?? {};

  /** The item with each relation on demand optional, and marked with the name that asks for it. */
  const itemOf = (
    docs: AnyDocs | undefined,
    expand: Readonly<Record<string, z.ZodType>> = {},
  ): z.ZodType => {
    const item = (docs?.item as z.ZodType | undefined) ?? z.unknown();
    const entries = Object.entries(expand);
    if (entries.length === 0) return conventions.item(item);
    const relations = z.object(
      Object.fromEntries(
        entries.map(([relation, schema]) => [
          relation,
          schema.meta({ 'x-arthome-expanded-by': relation }).optional(),
        ]),
      ),
    );
    return conventions.item(z.intersection(item, relations));
  };

  const expansionParameters = (docs: AnyDocs | undefined): readonly Parameter[] => {
    const names = Object.keys(expansionsOf(docs));
    return names.length === 0
      ? []
      : [
          {
            name: 'include',
            in: 'query',
            required: false,
            description: 'The relations to return with the record, by name.',
            schema: z.array(z.enum(names as [string, ...string[]])),
          },
        ];
  };

  const find = (docs: AnyDocs) =>
    route({
      method: 'get',
      path: itemPath,
      derivedId: `find${singular}`,
      docs,
      parameters: [...itemParameters, ...expansionParameters(docs)],
      responses: { 200: jsonResponse('The record.', itemOf(docs, expansionsOf(docs))) },
      errors: itemNotFound,
    });

  /** The parameters, the page envelope and the errors of a list: its paging, its sort keys, its filters. */
  const listing = (docs: AnyDocs) => {
    const paging = docs.paging;
    const sortable = docs.sortable;
    const filters = docs.filters as z.ZodObject | undefined;
    const item = (docs.item as z.ZodType | undefined) ?? z.unknown();
    let listParameters: readonly Parameter[] = conventions.listParameters;
    let page: z.ZodType = conventions.page(item);
    const errors: Record<string, readonly string[]> = { 400: [ApiErrorCode.SCHEMA_INVALID] };
    if (paging?.kind === 'changesSince') {
      listParameters = [SINCE_PARAMETER];
      page = conventions.item(item);
      errors[410] = [ApiErrorCode.CURSOR_TOO_OLD];
    } else if (paging !== undefined) {
      const convention = conventions.paginations?.[paging.kind] as
        PagingConvention<Paging> | undefined;
      if (convention === undefined) {
        throw new Error(`resource "${name}": this api has no "${paging.kind}" paging.`);
      }
      listParameters = convention.parameters(paging);
      page = convention.page(item);
      if (paging.kind === 'cursor') errors[410] = [ApiErrorCode.CURSOR_TOO_OLD];
    }
    if (sortable !== undefined) {
      const keys = sortable.map(sortKeyName) as [string, ...string[]];
      listParameters = [
        ...listParameters.filter((parameter) => !SORT_PARAMETERS.includes(parameter.name)),
        {
          name: 'sortBy',
          in: 'query',
          required: false,
          description: 'The key to order by.',
          schema: z.enum(keys),
        },
        {
          name: 'sortDir',
          in: 'query',
          required: false,
          schema: sortDirectionSchema(),
        },
      ];
      if (sortable.some((key) => typeof key !== 'string')) {
        errors[403] = [ApiErrorCode.SORT_KEY_FORBIDDEN];
      }
    }
    return {
      parameters: [
        ...parents,
        ...listParameters,
        ...(filters === undefined ? [] : [filterParameter(filters)]),
      ],
      responses: { 200: jsonResponse('The page.', page) },
      errors: errors as ErrorsInput<string>,
    };
  };

  const findAll = (docs: AnyDocs) =>
    route({
      method: 'get',
      path: collectionPath,
      derivedId: `findAll${plural}`,
      docs: {
        ...docs,
        ...((docs.paging ?? conventions.paging) !== undefined && {
          paging: docs.paging ?? conventions.paging,
        }),
      },
      ...listing(docs),
    });

  const create = (docs: AnyDocs) =>
    route({
      method: 'post',
      path: collectionPath,
      derivedId: `create${singular}`,
      docs,
      parameters: [...parents, ...(docs.idempotent === false ? [] : conventions.writeParameters)],
      responses: {
        201: jsonResponse(
          'Created.',
          docs.response !== undefined ? conventions.item(docs.response as z.ZodType) : itemOf(docs),
        ),
      },
      errors: docs.idempotent === false ? {} : { 409: IDEMPOTENCY },
      body: docs.body as z.ZodType,
    });

  const update = (docs: AnyDocs) => {
    const writable =
      (docs.fields as z.ZodObject | undefined)?.partial() ?? (docs.body as z.ZodObject);
    return route({
      method: 'patch',
      path: itemPath,
      derivedId: `update${singular}`,
      docs,
      parameters: [...itemParameters, ...conventions.writeParameters],
      responses: { 200: jsonResponse('The record, updated.', itemOf(docs)) },
      errors: conflicts,
      body: withVersion(writable),
    });
  };

  const replace = (docs: AnyDocs) =>
    route({
      method: 'put',
      path: itemPath,
      derivedId: `replace${singular}`,
      docs,
      parameters: [...itemParameters, ...conventions.writeParameters],
      responses: { 200: jsonResponse('The record, replaced.', itemOf(docs)) },
      errors: conflicts,
      body: withVersion(docs.body as z.ZodObject),
    });

  const upsert = (docs: AnyDocs) =>
    route({
      method: 'put',
      path: itemPath,
      derivedId: `upsert${singular}`,
      docs,
      parameters: [
        ...itemParameters,
        ...(docs.idempotent === false ? [] : conventions.writeParameters),
      ],
      responses:
        docs.item !== undefined
          ? { 200: jsonResponse('The record.', itemOf(docs)) }
          : { 204: { description: 'Done.' } },
      errors: docs.idempotent === false ? {} : { 409: IDEMPOTENCY },
      ...(docs.body !== undefined && { body: docs.body as z.ZodType }),
    });

  const remove = (docs: AnyDocs | undefined) =>
    route({
      method: 'delete',
      path: itemPath,
      derivedId: `delete${singular}`,
      docs,
      parameters: [
        ...itemParameters,
        ...conventions.writeParameters,
        ...(owned ? [] : [expectedVersionQuery]),
      ],
      responses:
        docs?.response === undefined
          ? { 204: { description: 'Removed.' } }
          : { 200: jsonResponse('Removed.', conventions.item(docs.response as z.ZodType)) },
      errors: conflicts,
    });

  const batch = (docs: AnyDocs) => {
    const key = id?.schema ?? z.string();
    const max = (docs.max as number | undefined) ?? 200;
    return route({
      method: 'post',
      path: `${collectionPath}/batch`,
      derivedId: `batch${plural}`,
      docs: { bodyLimit: BATCH_BODY_LIMIT, ...docs },
      parameters: [...parents],
      responses: {
        200: jsonResponse(
          'The records found, by id.',
          conventions.item(z.record(z.string(), docs.item as z.ZodType)),
        ),
      },
      errors: {},
      body: z.object({ ids: z.array(key).max(max) }),
    });
  };

  const action = (
    path: string,
    pathParameters: readonly Parameter[],
    derivedId: string,
    docs: AnyDocs,
  ) => {
    const method = (docs.method as Spec['method'] | undefined) ?? 'post';
    const keyed = (docs.idempotent as boolean | undefined) ?? method !== 'get';
    const response = docs.response as z.ZodType | undefined;
    const status = (docs.status as number | undefined) ?? (response === undefined ? 204 : 200);
    return route({
      method,
      path,
      derivedId,
      docs,
      parameters: [...pathParameters, ...(keyed ? conventions.writeParameters : [])],
      responses: {
        [status]:
          response === undefined
            ? { description: 'Done.' }
            : jsonResponse('Done.', conventions.item(response)),
      },
      errors: keyed ? { 409: IDEMPOTENCY } : {},
      ...(docs.body !== undefined && { body: docs.body as z.ZodType }),
    });
  };

  const subresource = (sub: string) => ({
    replace: (docs: AnyDocs) =>
      route({
        method: 'put',
        path: `${itemPath}/${sub}`,
        derivedId: `replace${singular}${pascal(sub)}`,
        docs,
        parameters: [...itemParameters, ...conventions.writeParameters],
        responses:
          docs.item !== undefined
            ? { 200: jsonResponse('The record.', itemOf(docs)) }
            : { 204: { description: 'Done.' } },
        errors: conflicts,
        body: withVersion(docs.body as z.ZodObject),
      }),
  });

  const crud = (
    crudOptions: AnyDocs & Readonly<Record<string, AnyDocs | readonly string[] | undefined>>,
  ) => {
    const pick = crudOptions.pick as readonly CrudMember[] | undefined;
    const omit = crudOptions.omit as readonly CrudMember[] | undefined;
    if (pick !== undefined && omit !== undefined) {
      throw new Error(`resource "${name}": crud takes pick or omit, not both.`);
    }
    const defaults: readonly CrudMember[] =
      id === undefined ? ['find', 'update'] : ['find', 'findAll', 'create', 'update', 'delete'];
    const selected = (member: CrudMember): boolean =>
      pick !== undefined
        ? pick.includes(member)
        : defaults.includes(member)
          ? !(omit ?? []).includes(member)
          : crudOptions[member] !== undefined;
    const builders: Record<CrudMember, (docs: AnyDocs) => unknown> = {
      find,
      findAll,
      create,
      update,
      replace,
      upsert,
      delete: remove,
    };
    const members: Record<string, unknown> = {};
    for (const [member, make] of Object.entries(builders) as [
      CrudMember,
      (docs: AnyDocs) => unknown,
    ][]) {
      if (!selected(member)) continue;
      const own = crudOptions[member] as AnyDocs | undefined;
      const needsBody =
        member !== 'find' && member !== 'findAll' && member !== 'delete' && member !== 'upsert';
      if (needsBody && own === undefined) {
        throw new Error(
          `resource "${name}": crud selects "${member}" and has no "${member}" options.`,
        );
      }
      const made = make({ ...own, item: crudOptions.item }) as { readonly operationId: string };
      members[made.operationId] = made;
    }
    return members;
  };

  const underItem = (): AnyBuilder =>
    id === undefined
      ? builder.path(name)
      : builder.path(`${name}/{${id.name}}` as never, id as never);
  const nested =
    (kind: 'resource' | 'single' | 'path') =>
    (...args: readonly unknown[]) =>
      (underItem()[kind] as (...inner: readonly unknown[]) => unknown)(...args);

  const resource = {
    batch,
    resource: nested('resource'),
    single: nested('single'),
    path: nested('path'),
    find,
    findAll,
    create,
    update,
    replace,
    upsert,
    delete: remove,
    crud,
    action: (action_: string, docs: AnyDocs) =>
      action(`${itemPath}/${action_}`, itemParameters, `${camel(action_)}${singular}`, docs),
    collectionAction: (action_: string, docs: AnyDocs) =>
      action(`${collectionPath}/${action_}`, [...parents], `${camel(action_)}${plural}`, docs),
    subresource,
  };
  return resource as never;
}
