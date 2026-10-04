import type { z } from 'zod';
import { ApiErrorCode, DomainErrorCode } from '@arthome/core';
import type { BuiltRoute, BuiltRouteDefinition, RouteBuilder } from './builder.js';
import type { Header, JsonRequestBody, JsonResponse, Parameter, QueryParameter, Response } from './index.js';
type PathParameterOf = Parameter & {
    readonly in: 'path';
};
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
    /** `Idempotency-Key`, on a write. */
    readonly writeParameters: readonly Parameter[];
    /** The version a write expects the record to be at: a body field on an update, a query parameter on a removal. */
    readonly expectedVersion: z.ZodType;
}
export interface ResourceOptions<Id extends PathParameterOf, Parents extends readonly PathParameterOf[] = readonly []> {
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
type Without<T extends readonly Parameter[], Held extends readonly Parameter[]> = T extends readonly [infer First extends Parameter, ...infer Rest extends readonly Parameter[]] ? First extends Held[number] ? Without<Rest, Held> : readonly [First, ...Without<Rest, Held>] : readonly [];
/** The parameters the convention adds, less those the builder already carries and so places itself. */
type Added<C extends ResourceContext, K extends 'listParameters' | 'readParameters' | 'writeParameters'> = Without<Conv<C>[K], C['headers']>;
/** What a member says beyond the convention: prose, metadata, extra parameters, responses and codes. */
export type MemberDocs<Allowed extends string = string> = Omit<BuiltRouteDefinition<Allowed>, 'method' | 'path' | 'operationId' | 'responses' | 'requestBody' | 'parameters'> & {
    readonly operationId?: string;
    readonly parameters?: readonly Parameter[];
    readonly responses?: Responses;
    /** The example of the request body. */
    readonly example?: unknown;
    /** The body is not required: the request may carry none. */
    readonly optionalBody?: true;
};
type Docs<C extends ResourceContext, Own = unknown> = MemberDocs<C['allowed']> & Own;
type Envelope<C extends ResourceContext> = Conv<C> extends {
    readonly meta?: infer M extends object;
} ? M : object;
type Item<C extends ResourceContext, S extends z.ZodType> = Envelope<C> & {
    readonly data: z.output<S>;
};
type Page<C extends ResourceContext, S extends z.ZodType> = Envelope<C> & {
    readonly data: readonly z.output<S>[];
    readonly page: unknown;
};
type Schema<T> = z.ZodType<T>;
type ItemOf<D> = D extends {
    readonly item: infer S extends z.ZodType;
} ? S : z.ZodType;
type ExpectedVersionQuery = QueryParameter<'expectedVersion', z.ZodType, true>;
interface ExpectedVersion {
    readonly expectedVersion: number;
}
type PatchOf<S extends z.ZodObject> = Partial<z.output<S>> & ExpectedVersion;
type CodesOf<R> = R extends readonly (infer K)[] ? K : never;
type Join<Convention, Own> = Own extends readonly unknown[] ? Convention extends readonly unknown[] ? readonly (CodesOf<Convention> | CodesOf<Own>)[] : Own : Own;
type JoinErrors<Convention, Own> = {
    readonly [S in keyof Convention | keyof Own]: S extends keyof Own ? S extends keyof Convention ? Join<Convention[S], Own[S]> : Own[S] : S extends keyof Convention ? Convention[S] : never;
};
type OwnErrors<D> = D extends {
    readonly errors: infer R;
} ? R : Record<never, never>;
type OwnParameters<D> = D extends {
    readonly parameters: infer X extends readonly Parameter[];
} ? X : readonly [];
type OwnResponses<D> = D extends {
    readonly responses: infer R;
} ? R : Record<never, never>;
type Codes<K extends string> = readonly K[];
type NotFound = Codes<typeof ApiErrorCode.NOT_FOUND>;
type IdempotencyCodes = Codes<typeof ApiErrorCode.IDEMPOTENCY_KEY_REUSED | typeof ApiErrorCode.IDEMPOTENCY_IN_FLIGHT>;
type ConflictCodes = Codes<typeof DomainErrorCode.STATE_CONFLICT | typeof ApiErrorCode.IDEMPOTENCY_KEY_REUSED | typeof ApiErrorCode.IDEMPOTENCY_IN_FLIGHT>;
type InvalidCursor = Codes<typeof ApiErrorCode.SCHEMA_INVALID>;
type Member<C extends ResourceContext, D, Method extends 'get' | 'post' | 'put' | 'patch' | 'delete', Path extends string, Params extends readonly Parameter[], Success extends Responses, Errors, Body = unknown> = BuiltRoute<C['version'], C['headers'], C['responses'], {
    readonly method: Method;
    readonly path: Path;
    readonly operationId: string;
    readonly parameters: readonly [...Params, ...OwnParameters<D>];
    readonly responses: Omit<Success, keyof OwnResponses<D>> & OwnResponses<D>;
    readonly errors: JoinErrors<Errors, OwnErrors<D>>;
} & Body>;
type CollectionPath<C extends ResourceContext> = `/${C['name']}`;
type ItemPath<C extends ResourceContext> = `/${C['name']}/{${C['id']['name']}}`;
type ItemParameters<C extends ResourceContext> = readonly [...C['parents'], C['id']];
interface Sent<S extends z.ZodType, Required = true> {
    readonly requestBody: JsonRequestBody<S, Required>;
}
type ResponseOf<C extends ResourceContext, S extends z.ZodType | undefined, Status extends 200 | 201> = S extends z.ZodType ? Readonly<Record<Status, JsonResponse<Schema<Item<C, S>>>>> : {
    readonly 204: Response;
};
export type FindRoute<C extends ResourceContext, D> = Member<C, D, 'get', ItemPath<C>, readonly [...ItemParameters<C>, ...Added<C, 'readParameters'>], {
    readonly 200: JsonResponse<Schema<Item<C, ItemOf<D>>>>;
}, {
    readonly 404: NotFound;
}>;
export type FindAllRoute<C extends ResourceContext, D> = Member<C, D, 'get', CollectionPath<C>, readonly [...C['parents'], ...Added<C, 'listParameters'>], {
    readonly 200: JsonResponse<Schema<Page<C, ItemOf<D>>>>;
}, {
    readonly 400: InvalidCursor;
}>;
export type CreateRoute<C extends ResourceContext, D> = Member<C, D, 'post', CollectionPath<C>, readonly [...C['parents'], ...Added<C, 'writeParameters'>], {
    readonly 201: JsonResponse<Schema<Item<C, ResponseSchema<D>>>>;
}, {
    readonly 409: IdempotencyCodes;
}, Sent<BodyOf<D>>>;
export type UpdateRoute<C extends ResourceContext, D> = Member<C, D, 'patch', ItemPath<C>, readonly [...ItemParameters<C>, ...Added<C, 'writeParameters'>], {
    readonly 200: JsonResponse<Schema<Item<C, ItemOf<D>>>>;
}, {
    readonly 404: NotFound;
    readonly 409: ConflictCodes;
}, Sent<Schema<PatchBody<D>>>>;
export type ReplaceRoute<C extends ResourceContext, D> = Member<C, D, 'put', ItemPath<C>, readonly [...ItemParameters<C>, ...Added<C, 'writeParameters'>], {
    readonly 200: JsonResponse<Schema<Item<C, ItemOf<D>>>>;
}, {
    readonly 404: NotFound;
    readonly 409: ConflictCodes;
}, Sent<Schema<BodyOutput<D> & ExpectedVersion>>>;
export type UpsertRoute<C extends ResourceContext, D> = Member<C, D, 'put', ItemPath<C>, readonly [...ItemParameters<C>, ...Added<C, 'writeParameters'>], ResponseOf<C, ItemSchema<D>, 200>, {
    readonly 409: IdempotencyCodes;
}, BodyPart<D>>;
export type DeleteRoute<C extends ResourceContext, D> = Member<C, D, 'delete', ItemPath<C>, readonly [...ItemParameters<C>, ...Added<C, 'writeParameters'>, ExpectedVersionQuery], {
    readonly 204: Response;
}, {
    readonly 404: NotFound;
    readonly 409: ConflictCodes;
}>;
export type ActionRoute<C extends ResourceContext, Scope extends 'item' | 'collection', Name extends string, D> = Member<C, D, ActionMethod<D>, Scope extends 'item' ? `${ItemPath<C>}/${Name}` : `${CollectionPath<C>}/${Name}`, readonly [
    ...(Scope extends 'item' ? ItemParameters<C> : C['parents']),
    ...(ActionMethod<D> extends 'get' ? readonly [] : Added<C, 'writeParameters'>)
], ActionSuccess<C, D>, ActionMethod<D> extends 'get' ? Record<never, never> : {
    readonly 409: IdempotencyCodes;
}, BodyPart<D>>;
export type SubresourceReplaceRoute<C extends ResourceContext, Name extends string, D> = Member<C, D, 'put', `${ItemPath<C>}/${Name}`, readonly [...ItemParameters<C>, ...Added<C, 'writeParameters'>], ResponseOf<C, ItemSchema<D>, 200>, {
    readonly 404: NotFound;
    readonly 409: ConflictCodes;
}, Sent<Schema<BodyOutput<D> & ExpectedVersion>>>;
type ActionMethod<D> = D extends {
    readonly method: infer M extends 'get' | 'post' | 'put' | 'patch' | 'delete';
} ? M : 'post';
type SuccessKey = 200 | 201 | 202 | 203 | 204 | 206;
type ActionSuccess<C extends ResourceContext, D> = D extends {
    readonly responses: infer R;
} ? [Extract<keyof R, SuccessKey>] extends [never] ? ActionDefaultSuccess<C, D> : Record<never, never> : ActionDefaultSuccess<C, D>;
type ActionDefaultSuccess<C extends ResourceContext, D> = D extends {
    readonly status: infer S extends number;
} ? D extends {
    readonly response: infer R extends z.ZodType;
} ? Readonly<Record<S, JsonResponse<Schema<Item<C, R>>>>> : Readonly<Record<S, Response>> : D extends {
    readonly response: infer R extends z.ZodType;
} ? {
    readonly 200: JsonResponse<Schema<Item<C, R>>>;
} : {
    readonly 204: Response;
};
type BodyOf<D> = D extends {
    readonly body: infer B extends z.ZodType;
} ? B : z.ZodType;
type BodyOutput<D> = z.output<BodyOf<D>>;
type BodyPart<D> = D extends {
    readonly body: infer B extends z.ZodType;
} ? Sent<B, D extends {
    readonly optionalBody: true;
} ? false : true> : unknown;
type ResponseSchema<D> = D extends {
    readonly response: infer R extends z.ZodType;
} ? R : ItemOf<D>;
type ItemSchema<D> = D extends {
    readonly item: infer S extends z.ZodType;
} ? S : undefined;
type PatchBody<D> = D extends {
    readonly fields: infer F extends z.ZodObject;
} ? PatchOf<F> : D extends {
    readonly body: infer B extends z.ZodObject;
} ? PatchOf<B> : ExpectedVersion;
export type CrudMember = 'find' | 'findAll' | 'create' | 'update' | 'replace' | 'upsert' | 'delete';
type DefaultMember = 'find' | 'findAll' | 'create' | 'update' | 'delete';
type Selection = {
    readonly omit?: readonly DefaultMember[];
    readonly pick?: undefined;
} | {
    readonly pick?: readonly CrudMember[];
    readonly omit?: undefined;
};
type Own<O, K extends string> = O extends Readonly<Record<K, infer X>> ? X : unknown;
type SelectedMember<O> = O extends {
    readonly pick: readonly (infer M)[];
} ? M : Exclude<DefaultMember, O extends {
    readonly omit: readonly (infer X)[];
} ? X : never> | Extract<keyof O, 'replace' | 'upsert'>;
export interface CrudOptions<C extends ResourceContext> {
    readonly item: z.ZodType;
    readonly findAll?: Docs<C>;
    readonly find?: Docs<C>;
    readonly create?: Docs<C, {
        readonly body: z.ZodType;
        readonly response?: z.ZodType;
    }>;
    readonly update?: Docs<C, {
        readonly fields: z.ZodObject;
    } | {
        readonly body: z.ZodObject;
    }>;
    readonly replace?: Docs<C, {
        readonly body: z.ZodObject;
    }>;
    readonly upsert?: Docs<C, {
        readonly body?: z.ZodType;
    }>;
    readonly delete?: Docs<C>;
}
type CrudRequires<C extends ResourceContext, O> = ('create' extends SelectedMember<O> ? {
    readonly create: NonNullable<CrudOptions<C>['create']>;
} : unknown) & ('update' extends SelectedMember<O> ? {
    readonly update: NonNullable<CrudOptions<C>['update']>;
} : unknown);
type CrudRoute<C extends ResourceContext, O extends {
    readonly item: z.ZodType;
}, M> = {
    find: FindRoute<C, Own<O, 'find'> & {
        readonly item: O['item'];
    }>;
    findAll: FindAllRoute<C, Own<O, 'findAll'> & {
        readonly item: O['item'];
    }>;
    create: CreateRoute<C, Own<O, 'create'> & {
        readonly item: O['item'];
    }>;
    update: UpdateRoute<C, Own<O, 'update'> & {
        readonly item: O['item'];
    }>;
    replace: ReplaceRoute<C, Own<O, 'replace'> & {
        readonly item: O['item'];
    }>;
    upsert: UpsertRoute<C, Own<O, 'upsert'> & {
        readonly item: O['item'];
    }>;
    delete: DeleteRoute<C, Own<O, 'delete'>>;
}[M & CrudMember];
export type CrudRoutes<C extends ResourceContext, O extends {
    readonly item: z.ZodType;
}> = {
    readonly [M in SelectedMember<O> & CrudMember]: CrudRoute<C, O, M>;
};
export interface Resource<C extends ResourceContext> {
    find<const D extends Docs<C, {
        readonly item: z.ZodType;
    }>>(docs: D): FindRoute<C, D>;
    findAll<const D extends Docs<C, {
        readonly item: z.ZodType;
    }>>(docs: D): FindAllRoute<C, D>;
    /** POST on the collection, carrying an `Idempotency-Key`. */
    create<const D extends Docs<C, {
        readonly body: z.ZodType;
        readonly item: z.ZodType;
        readonly response?: z.ZodType;
    }>>(docs: D): CreateRoute<C, D>;
    /**
     * PATCH: a partial change of one or several properties, with no business rule. An absent field
     * is unchanged and null clears an optional field. The body is `fields` made optional, or `body`
     * when the partial shape is not that; `expectedVersion` is added either way. A change that has
     * rules or consequences is an `action`.
     */
    update<const D extends Docs<C, {
        readonly item: z.ZodType;
    } & ({
        readonly fields: z.ZodObject;
    } | {
        readonly body: z.ZodObject;
    })>>(docs: D): UpdateRoute<C, D>;
    /** PUT: a full replacement, idempotent. The body is complete and an absent field is reset. */
    replace<const D extends Docs<C, {
        readonly body: z.ZodObject;
        readonly item: z.ZodType;
    }>>(docs: D): ReplaceRoute<C, D>;
    /** PUT on an id the client chose, such as `/follows/{artistId}`: it creates or replaces. */
    upsert<const D extends Docs<C, {
        readonly body?: z.ZodType;
        readonly item?: z.ZodType;
    }>>(docs: D): UpsertRoute<C, D>;
    delete<const D extends Docs<C>>(docs?: D): DeleteRoute<C, D>;
    /** `/{name}/{id}/{action}`: every business state change of one record. */
    action<const Name extends string, const D extends ActionOptions<C>>(name: Name, options: D): ActionRoute<C, 'item', Name, D>;
    /** `/{name}/{action}`: an operation on the collection. */
    collectionAction<const Name extends string, const D extends ActionOptions<C>>(name: Name, options: D): ActionRoute<C, 'collection', Name, D>;
    subresource<const Name extends string>(name: Name): {
        /** PUT on a sub-resource such as `/dates/{id}/prices`: its full replacement. */
        replace<const D extends Docs<C, {
            readonly body: z.ZodObject;
            readonly item?: z.ZodType;
        }>>(docs: D): SubresourceReplaceRoute<C, Name, D>;
    };
    /** The members `find`, `findAll`, `create`, `update` and `delete`; `replace` and `upsert` when given. */
    crud<const O extends CrudOptions<C> & Selection>(options: O & CrudRequires<C, O>): CrudRoutes<C, O>;
}
export type ActionOptions<C extends ResourceContext> = Docs<C, {
    readonly method?: 'get' | 'post' | 'put' | 'patch' | 'delete';
    readonly body?: z.ZodType;
    readonly response?: z.ZodType;
    readonly status?: number;
    /** `false` leaves the idempotency key off a non-GET action. */
    readonly idempotent?: boolean;
}>;
type AnyBuilder = RouteBuilder<number, readonly Parameter[], Responses, string, ResourceConventions>;
export declare function makeResource(builder: AnyBuilder, given: ResourceConventions, name: string, options: ResourceOptions<PathParameterOf, readonly PathParameterOf[]>, headers: readonly Parameter[]): never;
export {};
//# sourceMappingURL=resource.d.ts.map