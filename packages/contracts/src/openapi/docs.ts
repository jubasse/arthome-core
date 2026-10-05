/**
 * What a document says that no server or client reads: an operation's prose, the services it calls,
 * its maturity, the examples of its schemas, and the api's introduction. A module writes its own in
 * `docs.ts` and `examples.ts`; an api gathers them in its docs module, which only the emitter and
 * the tests import, so none of it reaches a surface's bundle.
 */

import { z } from 'zod';

import { SERVICES, Service } from '@arthome/core';
import type { Upstream } from '@arthome/core';

import type { Extensions } from '../http/index.js';

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
  /** Absent while the route still carries its own. */
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
