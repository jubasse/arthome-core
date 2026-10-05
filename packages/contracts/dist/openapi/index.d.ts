/**
 * An api's OpenAPI document, emitted from its routes and components, and from its docs: the prose,
 * upstream, maturity and examples its modules register (`./docs.ts`), the only source of them: a
 * route or a media type that writes its own is refused.
 *
 * Schemas go through ONE zod registry per direction: every component under its document name,
 * and every schema a route holds under a synthetic id. Without a registry `z.toJSONSchema`
 * inlines every nested object, so a `$ref` to a component never survives. A request is emitted
 * with `io: 'input'`, a response with `io: 'output'` (D-057), and `components/schemas` with
 * `output`.
 */
import type { ApiDocs } from './docs.js';
import type { Api } from '../http/index.js';
export type OpenApiDocument = Readonly<Record<string, unknown>>;
export declare function openApiDocumentOf(api: Api, docs?: ApiDocs): OpenApiDocument;
export * from './docs.js';
//# sourceMappingURL=index.d.ts.map