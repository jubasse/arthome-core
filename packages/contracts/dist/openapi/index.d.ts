/**
 * An api's OpenAPI document, emitted from its routes and components.
 *
 * Schemas go through ONE zod registry per direction: every component under its document name,
 * and every schema a route holds under a synthetic id. Without a registry `z.toJSONSchema`
 * inlines every nested object, so a `$ref` to a component never survives (D-058's emit pipeline,
 * `tools/emit-contracts.mjs`, found that first). A request is emitted with `io: 'input'`, a
 * response with `io: 'output'` (D-057), and `components/schemas` with `output`, as the emit-diff
 * gate compares it.
 */
import type { Api } from '../http/index.js';
export type OpenApiDocument = Readonly<Record<string, unknown>>;
export declare function openApiDocumentOf(api: Api): OpenApiDocument;
//# sourceMappingURL=index.d.ts.map