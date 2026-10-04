/**
 * What a route requires of its caller: an identity, and rules on top of it. Both are declarations,
 * a name with its parameters and its errors: the contract holds no server code, because the
 * surfaces import it. The server maps each name to a guard, and a name with no guard fails at boot.
 */

import type { z } from 'zod';

import { ApiErrorCode } from '@arthome/core';

import type { ErrorStatus } from './errors.js';
import type { Header, Parameter, SecurityRequirement } from './index.js';

/** The codes each status of a declaration can carry. */
export type CodesByStatus = Readonly<Partial<Record<ErrorStatus, readonly string[]>>>;

/**
 * The identified state of a surface, declared once: which credentials a read and a write accept,
 * and what the server knows about the caller once identified.
 */
export interface Identity<
  Name extends string = string,
  Principal extends z.ZodType = z.ZodType,
  Codes extends string = string,
> {
  readonly name: Name;
  /** The security requirements the document writes: a read, and a write (a cookie write adds its CSRF token). */
  readonly schemes: {
    readonly read: readonly SecurityRequirement[];
    readonly write: readonly SecurityRequirement[];
  };
  readonly principal: Principal;
  /** What an optional read also accepts beside the schemes: another surface credential, such as a device token. */
  readonly optionalAlso: readonly SecurityRequirement[];
  /** The codes this identity adds to a status of every route that requires it. */
  readonly errors: CodesByStatus;
  /** The codes added to a write only (the CSRF refusal of a cookie write, a stale rights version). */
  readonly writeErrors: CodesByStatus;
  /** Parameters every route of the identity takes (an internal route's deadline). */
  readonly parameters: readonly Parameter[];
  /** Parameters a write takes (`If-Rights-Version`). */
  readonly writeParameters: readonly Parameter[];
  /** Headers every 2xx response carries (`X-Arthome-Rights-Version`). */
  readonly responseHeaders: Readonly<Record<string, Header>>;
  /** An internal identity (a service's): its routes are marked internal and kept out of every surface document. */
  readonly internal: boolean;
  /** Carries `Codes` to the compiler: the codes the identity declares. */
  readonly codes?: readonly Codes[];
}

export interface IdentityOptions<Principal extends z.ZodType> {
  readonly schemes: {
    readonly read: readonly SecurityRequirement[];
    readonly write: readonly SecurityRequirement[];
  };
  readonly principal: Principal;
  readonly optionalAlso?: readonly SecurityRequirement[];
  readonly errors?: CodesByStatus;
  readonly writeErrors?: CodesByStatus;
  readonly parameters?: readonly Parameter[];
  readonly writeParameters?: readonly Parameter[];
  readonly responseHeaders?: Readonly<Record<string, Header>>;
  readonly internal?: boolean;
}

type CodesIn<E> = E extends CodesByStatus
  ? { [S in keyof E]: E[S] extends readonly (infer C extends string)[] ? C : never }[keyof E]
  : never;

export function identity<
  const Name extends string,
  const Principal extends z.ZodType,
  const Errors extends CodesByStatus = Record<never, never>,
  const WriteErrors extends CodesByStatus = Record<never, never>,
>(
  name: Name,
  options: IdentityOptions<Principal> & {
    readonly errors?: Errors;
    readonly writeErrors?: WriteErrors;
  },
): Identity<Name, Principal, CodesIn<Errors> | CodesIn<WriteErrors>> {
  return {
    name,
    schemes: options.schemes,
    principal: options.principal,
    optionalAlso: options.optionalAlso ?? [],
    errors: options.errors ?? {},
    writeErrors: options.writeErrors ?? {},
    parameters: options.parameters ?? [],
    writeParameters: options.writeParameters ?? [],
    responseHeaders: options.responseHeaders ?? {},
    internal: options.internal ?? false,
  };
}

/** A route's caller: nobody in particular, or an identity, optionally. */
export type Access =
  | { readonly kind: 'anyone' }
  | { readonly kind: 'identified'; readonly identity: Identity; readonly optional: boolean };

export interface PublicAccess {
  readonly kind: 'anyone';
}

export interface IdentifiedAccess<I extends Identity, Optional extends boolean = false> {
  readonly kind: 'identified';
  readonly identity: I;
  readonly optional: Optional;
}

/**
 * What a handler receives for the caller: the identity's principal, or `null` where the route
 * lets an anonymous caller in. A public route has no principal.
 */
export type PrincipalOf<A> = A extends {
  readonly identity: { readonly principal: infer P extends z.ZodType };
  readonly optional: infer Optional;
}
  ? Optional extends true
    ? z.output<P> | null
    : z.output<P>
  : undefined;

/** A rule beyond identity: a name the server maps to a guard, its parameters, and the codes it can answer. */
export interface Requirement<
  Name extends string = string,
  Params extends object = object,
  Codes extends string = string,
> {
  readonly kind: 'requirement';
  readonly name: Name;
  readonly params: Params;
  readonly errors: CodesByStatus;
  /** Carries `Codes` to the compiler. */
  readonly codes?: readonly Codes[];
}

export function requirement<
  const Name extends string,
  const Params extends object,
  const Errors extends CodesByStatus,
>(
  name: Name,
  options: { readonly params: Params; readonly errors: Errors },
): Requirement<Name, Params, CodesIn<Errors>> {
  return { kind: 'requirement', name, params: options.params, errors: options.errors };
}

export type CodesOfRequirement<R> = R extends Requirement<string, object, infer C> ? C : never;
export type CodesOfIdentity<I> = I extends Identity<string, z.ZodType, infer C> ? C : never;

/** A role rule: the caller holds one of `allowed` on the channel or the date `on` names. */
export interface RolesRequirement<Allowed extends string> extends Requirement<
  'roles',
  { readonly allowed: readonly Allowed[]; readonly on?: string },
  typeof ApiErrorCode.FORBIDDEN
> {
  on(parameter: string): RolesRequirement<Allowed>;
}

export function roles<const Allowed extends string>(
  ...allowed: readonly Allowed[]
): RolesRequirement<Allowed> {
  const make = (on: string | undefined): RolesRequirement<Allowed> => ({
    ...requirement('roles', {
      params: { allowed, ...(on !== undefined && { on }) },
      errors: { 403: [ApiErrorCode.FORBIDDEN] },
    }),
    on: (parameter: string) => make(parameter),
  });
  return make(undefined);
}

/**
 * The caller holds a recent re-authentication: the proof is the body field `proof` names (a token
 * `createReauthToken` minted), and the refusal asks for one.
 */
export function recentAuth<const Proof extends string = 'reauthToken'>(
  proof?: Proof,
): Requirement<
  'recentAuth',
  { readonly proof: { readonly in: 'body'; readonly name: Proof } },
  typeof ApiErrorCode.REAUTHENTICATION_REQUIRED
> {
  return requirement('recentAuth', {
    params: { proof: { in: 'body', name: (proof ?? 'reauthToken') as Proof } },
    errors: { 403: [ApiErrorCode.REAUTHENTICATION_REQUIRED] },
  });
}

/** A rate-limit bucket by name: the server binds the cap, and the `429` is derived. */
export function throttle<const Bucket extends string>(
  bucket: Bucket,
): Requirement<'throttle', { readonly bucket: Bucket }, typeof ApiErrorCode.RATE_LIMITED> {
  return requirement('throttle', {
    params: { bucket },
    errors: { 429: [ApiErrorCode.RATE_LIMITED] },
  });
}
