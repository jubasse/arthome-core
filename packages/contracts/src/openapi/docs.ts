/**
 * What a document says that no server or client reads: an operation's prose, the services it calls,
 * its maturity, the examples of its schemas, and the api's introduction. A module writes its own in
 * `docs.ts` and `examples.ts`; an api gathers them in its docs module, which only the emitter and
 * the tests import, so none of it reaches a surface's bundle.
 */

import { z } from 'zod';

import { SERVICES, Service } from '@arthome/core';
import type { Upstream } from '@arthome/core';

import type { Extensions, RouteDefinition } from '../http/index.js';

export type Maturity = 'stable' | 'provisional';

/** The regime of each service's contract: a copy of `transport.md` §5.11, held to it by `check-contract-docs`. */
export const MATURITY_BY_SERVICE: Readonly<Record<Service, Maturity>> = {
  [Service.IDENTITY]: 'stable',
  [Service.CATALOG]: 'stable',
  [Service.TICKETING]: 'stable',
  [Service.STREAMING]: 'provisional',
  [Service.CHAT]: 'provisional',
  [Service.PAYOUTS]: 'provisional',
  [Service.NOTIFICATIONS]: 'provisional',
};

function isService(upstream: Upstream): upstream is Service {
  return (SERVICES as readonly string[]).includes(upstream);
}

/**
 * The regime of the operation's owning service, the first service in its upstream: a BFF keeps its
 * own shape stable over a provisional service it translates. `undefined` when it calls no service
 * (`realtime` is not one).
 */
export function maturityOf(upstream: readonly Upstream[]): Maturity | undefined {
  const owner = upstream.find(isService);
  return owner === undefined ? undefined : MATURITY_BY_SERVICE[owner];
}

interface DerivedMaturity {
  readonly maturity?: undefined;
  readonly maturityReason?: undefined;
}

/** Only where it differs from `maturityOf(upstream)`, and never without its reason. */
interface StatedMaturity {
  readonly maturity: Maturity;
  /** Why, in one phrase. */
  readonly maturityReason: string;
}

export type OperationDoc = {
  readonly description?: string;
  readonly upstream?: readonly Upstream[];
  /** Why a write that takes no `Idempotency-Key` (`idempotent: false`) is safe without one. */
  readonly idempotencyExemption?: string;
} & (DerivedMaturity | StatedMaturity);

/** A module's operations, by operation id: `export const datesDocs = { ... } satisfies ModuleDocs`. */
export type ModuleDocs = Readonly<Record<string, OperationDoc>>;

export type ExampleEntry = readonly [schema: z.ZodType, examples: readonly unknown[]];

/** A module's examples, by schema: `[[DateSchema, [dateExample]]] as const satisfies ModuleExamples`. */
export type ModuleExamples = readonly ExampleEntry[];

/**
 * The examples of each schema, registered once. A schema derived with `.meta()` or `.describe()`
 * inherits its parent's, as zod's own metadata does.
 */
export class ExampleRegistry {
  public readonly entries: readonly ExampleEntry[];
  private readonly registry = z.registry<{ readonly examples: readonly unknown[] }>();

  public constructor(modules: readonly ModuleExamples[]) {
    this.entries = modules.flat();
    for (const [schema, examples] of this.entries) {
      if (examples.length === 0) throw new Error('examples: a schema is registered with none.');
      if (this.registry.has(schema)) throw new Error('examples: a schema is registered twice.');
      this.registry.add(schema, { examples });
    }
  }

  public firstOf(schema: z.ZodType): unknown {
    return this.registry.get(schema)?.examples[0];
  }

  /** The entries of `schemas`, for an api that serves operations this one registered the examples of. */
  public entriesOf(schemas: readonly z.ZodType[]): ModuleExamples {
    return schemas.map((schema) => {
      const examples = this.registry.get(schema)?.examples;
      if (examples === undefined) throw new Error('examples: a schema asked for has none.');
      return [schema, examples];
    });
  }
}

type DocumentObject = Readonly<Record<string, unknown>>;

/** The parts of an api's document no consumer reads: its introduction and the names it documents. */
export interface DocumentDocs extends Extensions {
  readonly info?: DocumentObject;
  readonly servers?: readonly DocumentObject[];
  readonly tags?: readonly DocumentObject[];
  readonly securitySchemes?: Readonly<Record<string, unknown>>;
}

export interface ApiDocs extends DocumentDocs {
  readonly operations: ModuleDocs;
  readonly examples: ExampleRegistry;
}

export interface ApiDocsDefinition extends DocumentDocs {
  readonly modules?: readonly ModuleDocs[];
  readonly examples?: readonly ModuleExamples[];
}

/** Gathers an api's modules, and refuses an operation documented twice. */
export function apiDocs(definition: ApiDocsDefinition): ApiDocs {
  const { modules = [], examples = [], ...document } = definition;
  const operations: Record<string, OperationDoc> = {};
  for (const module of modules) {
    for (const [operationId, doc] of Object.entries(module)) {
      if (operationId in operations) {
        throw new Error(`apiDocs: "${operationId}" is documented twice.`);
      }
      operations[operationId] = doc;
    }
  }
  return { ...document, operations, examples: new ExampleRegistry(examples) };
}

/** The extensions only a module's `docs.ts` writes of an operation, never its route; so is its prose. */
const DOC_ONLY_EXTENSIONS: readonly `x-${string}`[] = [
  'x-arthome-maturity',
  'x-arthome-upstream',
  'x-arthome-freshness',
  'x-arthome-idempotency-exemption',
];

/** What a document says of one operation beyond its route's runtime fields. */
export interface OperationDocumentation {
  readonly description?: string;
  readonly 'x-arthome-maturity'?: Maturity;
  readonly 'x-arthome-upstream'?: readonly Upstream[];
  readonly 'x-arthome-idempotency-exemption'?: string;
}

/**
 * The prose and doc-only `x-arthome-*` of `route`, from what its module registered: the registry is
 * the only source, and a route carrying its own is refused. A registered operation's maturity is
 * the stated one, else its owning service's.
 */
export function documentationOf(
  route: RouteDefinition,
  doc: OperationDoc | undefined,
): OperationDocumentation {
  const carried = [
    ...(route.description === undefined ? [] : ['prose']),
    ...DOC_ONLY_EXTENSIONS.filter((key) => route[key] !== undefined),
  ];
  if (carried.length > 0) {
    throw new Error(
      `openapi: "${route.operationId}" carries its own ${carried.join(', ')}; register it in its module's docs.ts.`,
    );
  }
  if (doc === undefined) return {};
  const derived = maturityOf(doc.upstream ?? []);
  if (doc.maturity !== undefined && doc.maturity === derived) {
    throw new Error(
      `openapi: "${route.operationId}" states the maturity its owning service gives; leave it out.`,
    );
  }
  const maturity = doc.maturity ?? derived;
  if (maturity === undefined) {
    throw new Error(
      `openapi: "${route.operationId}" calls no service a maturity derives from; state its maturity.`,
    );
  }
  return {
    ...(doc.description !== undefined && { description: doc.description }),
    'x-arthome-maturity': maturity,
    ...(doc.upstream !== undefined && { 'x-arthome-upstream': doc.upstream }),
    ...(doc.idempotencyExemption !== undefined && {
      'x-arthome-idempotency-exemption': doc.idempotencyExemption,
    }),
  };
}

/** The documentation of each route of an api, looked up by route: what a server's own docs show. */
export function documentationLookup(
  docs: ApiDocs,
): (route: RouteDefinition) => OperationDocumentation {
  return (route) => documentationOf(route, docs.operations[route.operationId]);
}
