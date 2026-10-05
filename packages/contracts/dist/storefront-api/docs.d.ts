import type { RouteDefinition } from '../http/index.js';
import type { ApiDocs, OperationDocumentation } from '../openapi/docs.js';
/** The storefront document's introduction, and the docs and examples its modules register. */
export declare const storefrontDocs: ApiDocs;
/** Each storefront operation's prose and doc-only metadata, by route: for a server's own docs. Server only. */
export declare const storefrontDocsOf: (route: RouteDefinition) => OperationDocumentation;
//# sourceMappingURL=docs.d.ts.map