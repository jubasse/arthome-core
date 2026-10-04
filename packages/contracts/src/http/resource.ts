import type { z } from 'zod';

import { ApiErrorCode, DomainErrorCode } from '@arthome/core';

import type { BuiltRoute, BuiltRouteDefinition, RouteBuilder } from './builder.js';
import type { ErrorsInput } from './errors.js';
import type {
  Header,
  JsonRequestBody,
  JsonResponse,
  Parameter,
  QueryParameter,
  Response,
} from './index.js';

type PathParameterOf = Parameter & { readonly in: 'path' };

type Responses = Readonly<Record<string, Response>>;

/**
 * What an api decides once for every resource it serves: the envelope of one record and of a page,
 * the parameters a list takes, the validators of a read, the key and the version a write carries.
 */
export interface ResourceConventions {
  readonly item: (data: z.ZodType) => z.ZodType;
  readonly page: (data: z.ZodType) => z.ZodType;
  readonly listParameters: readonly Parameter[];
  /** `If-None-Match`, on a read. */
  readonly readParameters: readonly Parameter[];
  /** `ETag`, on the 200 of a read. */
  readonly readHeaders: Readonly<Record<string, Header>>;
  readonly notModified?: Response;
  /** `Idempotency-Key`, on a write. */
  readonly writeParameters: readonly Parameter[];
  /** The version a write expects the record to be at: a body field on an update, a query parameter on a removal. */
  readonly expectedVersion: z.ZodType;
}

export interface ResourceOptions<
  Id extends PathParameterOf,
  Parents extends readonly PathParameterOf[] = readonly [],
> {
  readonly id: Id;
  /** The path parameters of the resources this one is nested in, in path order. */
  readonly parents?: Parents;
  /** The singular, in kebab-case or camelCase, when dropping the final `s` of the name is wrong. */
  readonly singular?: string;
}

/** What a resource knows about itself: the builder it comes from and the path it serves. */
export interface ResourceContext {
  readonly version: number;
  readonly headers: readonly Parameter[];
  readonly responses: Responses;
  readonly allowed: string;
  readonly conventions: unknown;
  readonly name: string;
  readonly id: PathParameterOf;
  readonly parents: readonly PathParameterOf[];
}

type Conv<C extends ResourceContext> = Extract<C['conventions'], ResourceConventions>;

/** What a member says beyond the convention: prose, metadata, extra parameters, responses and codes. */
export type MemberDocs<Allowed extends string = string> = Omit<
  BuiltRouteDefinition<Allowed>,
  'method' | 'path' | 'operationId' | 'responses' | 'requestBody' | 'parameters'
> & {
  readonly operationId?: string;
  readonly parameters?: readonly Parameter[];
  readonly responses?: Responses;
};

type Docs<C extends ResourceContext, Own = unknown> = MemberDocs<C['allowed']> & Own;

interface ItemBody<S extends z.ZodType> {
  readonly data: z.output<S>;
}
interface PageBody<S extends z.ZodType> {
  readonly data: readonly z.output<S>[];
  readonly page: unknown;
}
type Schema<T> = z.ZodType<T>;

type ItemOf<D> = D extends { readonly item: infer S extends z.ZodType } ? S : z.ZodType;

type ExpectedVersionQuery = QueryParameter<'expectedVersion', z.ZodType, true>;
interface ExpectedVersion {
  readonly expectedVersion: number;
}

type PatchOf<S extends z.ZodObject> = Partial<z.output<S>> & ExpectedVersion;

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
    readonly responses: Omit<Success, keyof OwnResponses<D>> & OwnResponses<D>;
    readonly errors: JoinErrors<Errors, OwnErrors<D>>;
  } & Body
>;

type CollectionPath<C extends ResourceContext> = `/${C['name']}`;
type ItemPath<C extends ResourceContext> = `/${C['name']}/{${C['id']['name']}}`;
type ItemParameters<C extends ResourceContext> = readonly [...C['parents'], C['id']];
interface Sent<S extends z.ZodType> {
  readonly requestBody: JsonRequestBody<S>;
}

type ResponseOf<S extends z.ZodType | undefined, Status extends 200 | 201> = S extends z.ZodType
  ? Readonly<Record<Status, JsonResponse<Schema<ItemBody<S>>>>>
  : { readonly 204: Response };

export type FindRoute<C extends ResourceContext, D> = Member<
  C,
  D,
  'get',
  ItemPath<C>,
  readonly [...ItemParameters<C>, ...Conv<C>['readParameters']],
  { readonly 200: JsonResponse<Schema<ItemBody<ItemOf<D>>>> },
  { readonly 404: NotFound }
>;

export type FindAllRoute<C extends ResourceContext, D> = Member<
  C,
  D,
  'get',
  CollectionPath<C>,
  readonly [...C['parents'], ...Conv<C>['listParameters']],
  { readonly 200: JsonResponse<Schema<PageBody<ItemOf<D>>>> },
  { readonly 400: InvalidCursor }
>;

export type CreateRoute<C extends ResourceContext, D> = Member<
  C,
  D,
  'post',
  CollectionPath<C>,
  readonly [...C['parents'], ...Conv<C>['writeParameters']],
  { readonly 201: JsonResponse<Schema<ItemBody<ResponseSchema<D>>>> },
  { readonly 409: IdempotencyCodes },
  Sent<BodyOf<D>>
>;

export type UpdateRoute<C extends ResourceContext, D> = Member<
  C,
  D,
  'patch',
  ItemPath<C>,
  readonly [...ItemParameters<C>, ...Conv<C>['writeParameters']],
  { readonly 200: JsonResponse<Schema<ItemBody<ItemOf<D>>>> },
  { readonly 404: NotFound; readonly 409: ConflictCodes },
  Sent<Schema<PatchBody<D>>>
>;

export type ReplaceRoute<C extends ResourceContext, D> = Member<
  C,
  D,
  'put',
  ItemPath<C>,
  readonly [...ItemParameters<C>, ...Conv<C>['writeParameters']],
  { readonly 200: JsonResponse<Schema<ItemBody<ItemOf<D>>>> },
  { readonly 404: NotFound; readonly 409: ConflictCodes },
  Sent<Schema<BodyOutput<D> & ExpectedVersion>>
>;

export type UpsertRoute<C extends ResourceContext, D> = Member<
  C,
  D,
  'put',
  ItemPath<C>,
  readonly [...ItemParameters<C>, ...Conv<C>['writeParameters']],
  ResponseOf<ItemSchema<D>, 200>,
  { readonly 409: IdempotencyCodes },
  BodyPart<D>
>;

export type DeleteRoute<C extends ResourceContext, D> = Member<
  C,
  D,
  'delete',
  ItemPath<C>,
  readonly [...ItemParameters<C>, ...Conv<C>['writeParameters'], ExpectedVersionQuery],
  { readonly 204: Response },
  { readonly 404: NotFound; readonly 409: ConflictCodes }
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
    ...(ActionMethod<D> extends 'get' ? readonly [] : Conv<C>['writeParameters']),
  ],
  ActionSuccess<D>,
  ActionMethod<D> extends 'get' ? Record<never, never> : { readonly 409: IdempotencyCodes },
  BodyPart<D>
>;

export type SubresourceReplaceRoute<C extends ResourceContext, Name extends string, D> = Member<
  C,
  D,
  'put',
  `${ItemPath<C>}/${Name}`,
  readonly [...ItemParameters<C>, ...Conv<C>['writeParameters']],
  ResponseOf<ItemSchema<D>, 200>,
  { readonly 404: NotFound; readonly 409: ConflictCodes },
  Sent<Schema<BodyOutput<D> & ExpectedVersion>>
>;

type ActionMethod<D> = D extends {
  readonly method: infer M extends 'get' | 'post' | 'put' | 'patch' | 'delete';
}
  ? M
  : 'post';

type ActionSuccess<D> = D extends { readonly status: infer S extends number }
  ? D extends { readonly response: infer R extends z.ZodType }
    ? Readonly<Record<S, JsonResponse<Schema<ItemBody<R>>>>>
    : Readonly<Record<S, Response>>
  : D extends { readonly response: infer R extends z.ZodType }
    ? { readonly 200: JsonResponse<Schema<ItemBody<R>>> }
    : { readonly 204: Response };

type BodyOf<D> = D extends { readonly body: infer B extends z.ZodType } ? B : z.ZodType;
type BodyOutput<D> = z.output<BodyOf<D>>;
type BodyPart<D> = D extends { readonly body: infer B extends z.ZodType } ? Sent<B> : unknown;
type ResponseSchema<D> = D extends { readonly response: infer R extends z.ZodType } ? R : ItemOf<D>;
type ItemSchema<D> = D extends { readonly item: infer S extends z.ZodType } ? S : undefined;
type PatchBody<D> = D extends { readonly fields: infer F extends z.ZodObject }
  ? PatchOf<F>
  : D extends { readonly body: infer B extends z.ZodObject }
    ? PatchOf<B>
    : ExpectedVersion;

export type CrudMember = 'find' | 'findAll' | 'create' | 'update' | 'replace' | 'upsert' | 'delete';
type DefaultMember = 'find' | 'findAll' | 'create' | 'update' | 'delete';

type Selection =
  | { readonly omit?: readonly DefaultMember[]; readonly pick?: undefined }
  | { readonly pick?: readonly CrudMember[]; readonly omit?: undefined };

type Own<O, K extends string> = O extends Readonly<Record<K, infer X>> ? X : unknown;

type SelectedMember<O> = O extends { readonly pick: readonly (infer M)[] }
  ? M
  : | Exclude<DefaultMember, O extends { readonly omit: readonly (infer X)[] } ? X : never>
    | Extract<keyof O, 'replace' | 'upsert'>;

export interface CrudOptions<C extends ResourceContext> {
  readonly item: z.ZodType;
  readonly findAll?: Docs<C>;
  readonly find?: Docs<C>;
  readonly create?: Docs<C, { readonly body: z.ZodType; readonly response?: z.ZodType }>;
  readonly update?: Docs<C, { readonly fields: z.ZodObject } | { readonly body: z.ZodObject }>;
  readonly replace?: Docs<C, { readonly body: z.ZodObject }>;
  readonly upsert?: Docs<C, { readonly body?: z.ZodType }>;
  readonly delete?: Docs<C>;
}

type CrudRequires<C extends ResourceContext, O> = ('create' extends SelectedMember<O>
  ? { readonly create: NonNullable<CrudOptions<C>['create']> }
  : unknown) &
  ('update' extends SelectedMember<O>
    ? { readonly update: NonNullable<CrudOptions<C>['update']> }
    : unknown);

type CrudRoute<C extends ResourceContext, O extends { readonly item: z.ZodType }, M> = {
  find: FindRoute<C, Own<O, 'find'> & { readonly item: O['item'] }>;
  findAll: FindAllRoute<C, Own<O, 'findAll'> & { readonly item: O['item'] }>;
  create: CreateRoute<C, Own<O, 'create'> & { readonly item: O['item'] }>;
  update: UpdateRoute<C, Own<O, 'update'> & { readonly item: O['item'] }>;
  replace: ReplaceRoute<C, Own<O, 'replace'> & { readonly item: O['item'] }>;
  upsert: UpsertRoute<C, Own<O, 'upsert'> & { readonly item: O['item'] }>;
  delete: DeleteRoute<C, Own<O, 'delete'>>;
}[M & CrudMember];

export type CrudRoutes<C extends ResourceContext, O extends { readonly item: z.ZodType }> = {
  readonly [M in SelectedMember<O> & CrudMember]: CrudRoute<C, O, M>;
};

export interface Resource<C extends ResourceContext> {
  find<const D extends Docs<C, { readonly item: z.ZodType }>>(docs: D): FindRoute<C, D>;
  findAll<const D extends Docs<C, { readonly item: z.ZodType }>>(docs: D): FindAllRoute<C, D>;
  /** POST on the collection, carrying an `Idempotency-Key`. */
  create<
    const D extends Docs<
      C,
      { readonly body: z.ZodType; readonly item: z.ZodType; readonly response?: z.ZodType }
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
      { readonly item: z.ZodType } & (
        { readonly fields: z.ZodObject } | { readonly body: z.ZodObject }
      )
    >,
  >(
    docs: D,
  ): UpdateRoute<C, D>;
  /** PUT: a full replacement, idempotent. The body is complete and an absent field is reset. */
  replace<const D extends Docs<C, { readonly body: z.ZodObject; readonly item: z.ZodType }>>(
    docs: D,
  ): ReplaceRoute<C, D>;
  /** PUT on an id the client chose, such as `/follows/{artistId}`: it creates or replaces. */
  upsert<const D extends Docs<C, { readonly body?: z.ZodType; readonly item?: z.ZodType }>>(
    docs: D,
  ): UpsertRoute<C, D>;
  delete<const D extends Docs<C>>(docs?: D): DeleteRoute<C, D>;
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

const NOT_FOUND: ErrorsInput<string> = { 404: [ApiErrorCode.NOT_FOUND] };
const IDEMPOTENCY: readonly string[] = [
  ApiErrorCode.IDEMPOTENCY_KEY_REUSED,
  ApiErrorCode.IDEMPOTENCY_IN_FLIGHT,
];
const CONFLICT: ErrorsInput<string> = {
  ...NOT_FOUND,
  409: [DomainErrorCode.STATE_CONFLICT, ...IDEMPOTENCY],
};

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

function sentBody(schema: z.ZodType): {
  readonly required: true;
  readonly content: { readonly 'application/json': { readonly schema: z.ZodType } };
} {
  return { required: true, content: { 'application/json': { schema } } };
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
  conventions: ResourceConventions,
  name: string,
  options: ResourceOptions<PathParameterOf, readonly PathParameterOf[]>,
): never {
  const parents = options.parents ?? [];
  const last =
    name
      .split('/')
      .filter((segment) => !segment.startsWith('{'))
      .pop() ?? name;
  const plural = pascal(last);
  const singular = pascal(options.singular ?? singularOf(last));
  const collectionPath = `/${name}`;
  const itemPath = `/${name}/{${options.id.name}}`;
  const expectedVersionQuery: Parameter = {
    name: 'expectedVersion',
    in: 'query',
    required: true,
    schema: conventions.expectedVersion,
  };
  const withVersion = (body: z.ZodObject): z.ZodType =>
    body.extend({ expectedVersion: conventions.expectedVersion });

  const route = (spec: Spec): unknown => {
    const rest: Record<string, unknown> = { ...spec.docs };
    for (const key of OPTION_KEYS) Reflect.deleteProperty(rest, key);
    const definition = {
      method: spec.method,
      path: spec.path,
      operationId: spec.docs?.operationId ?? spec.derivedId,
      ...(spec.body !== undefined && { requestBody: sentBody(spec.body) }),
      ...rest,
      parameters: [...spec.parameters, ...(spec.docs?.parameters ?? [])],
      responses: { ...spec.responses, ...spec.docs?.responses },
      errors: mergeErrors(spec.errors, spec.docs?.errors),
    };
    return builder.defineRoute(definition as never);
  };

  const itemOf = (docs: AnyDocs | undefined): z.ZodType =>
    conventions.item(docs?.item as z.ZodType);

  const find = (docs: AnyDocs) =>
    route({
      method: 'get',
      path: itemPath,
      derivedId: `find${singular}`,
      docs,
      parameters: [...parents, options.id, ...conventions.readParameters],
      responses: {
        200: jsonResponse('The record.', itemOf(docs), conventions.readHeaders),
        ...(conventions.notModified !== undefined && { 304: conventions.notModified }),
      },
      errors: NOT_FOUND,
    });

  const findAll = (docs: AnyDocs) =>
    route({
      method: 'get',
      path: collectionPath,
      derivedId: `findAll${plural}`,
      docs,
      parameters: [...parents, ...conventions.listParameters],
      responses: { 200: jsonResponse('The page.', conventions.page(docs.item as z.ZodType)) },
      errors: { 400: [ApiErrorCode.SCHEMA_INVALID] },
    });

  const create = (docs: AnyDocs) =>
    route({
      method: 'post',
      path: collectionPath,
      derivedId: `create${singular}`,
      docs,
      parameters: [...parents, ...conventions.writeParameters],
      responses: {
        201: jsonResponse(
          'Created.',
          docs.response !== undefined ? conventions.item(docs.response as z.ZodType) : itemOf(docs),
        ),
      },
      errors: { 409: IDEMPOTENCY },
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
      parameters: [...parents, options.id, ...conventions.writeParameters],
      responses: { 200: jsonResponse('The record, updated.', itemOf(docs)) },
      errors: CONFLICT,
      body: withVersion(writable),
    });
  };

  const replace = (docs: AnyDocs) =>
    route({
      method: 'put',
      path: itemPath,
      derivedId: `replace${singular}`,
      docs,
      parameters: [...parents, options.id, ...conventions.writeParameters],
      responses: { 200: jsonResponse('The record, replaced.', itemOf(docs)) },
      errors: CONFLICT,
      body: withVersion(docs.body as z.ZodObject),
    });

  const upsert = (docs: AnyDocs) =>
    route({
      method: 'put',
      path: itemPath,
      derivedId: `upsert${singular}`,
      docs,
      parameters: [...parents, options.id, ...conventions.writeParameters],
      responses:
        docs.item !== undefined
          ? { 200: jsonResponse('The record.', itemOf(docs)) }
          : { 204: { description: 'Done.' } },
      errors: { 409: IDEMPOTENCY },
      ...(docs.body !== undefined && { body: docs.body as z.ZodType }),
    });

  const remove = (docs: AnyDocs | undefined) =>
    route({
      method: 'delete',
      path: itemPath,
      derivedId: `delete${singular}`,
      docs,
      parameters: [...parents, options.id, ...conventions.writeParameters, expectedVersionQuery],
      responses: { 204: { description: 'Removed.' } },
      errors: CONFLICT,
    });

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
        parameters: [...parents, options.id, ...conventions.writeParameters],
        responses:
          docs.item !== undefined
            ? { 200: jsonResponse('The record.', itemOf(docs)) }
            : { 204: { description: 'Done.' } },
        errors: CONFLICT,
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
    const defaults: readonly CrudMember[] = ['find', 'findAll', 'create', 'update', 'delete'];
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
      members[member] = make({ ...own, item: crudOptions.item });
    }
    return members;
  };

  const resource = {
    find,
    findAll,
    create,
    update,
    replace,
    upsert,
    delete: remove,
    crud,
    action: (action_: string, docs: AnyDocs) =>
      action(
        `${itemPath}/${action_}`,
        [...parents, options.id],
        `${camel(action_)}${singular}`,
        docs,
      ),
    collectionAction: (action_: string, docs: AnyDocs) =>
      action(`${collectionPath}/${action_}`, [...parents], `${camel(action_)}${plural}`, docs),
    subresource,
  };
  return resource as never;
}
