import type { RouteDefinition } from '../http/index.js';
import type { ApiDocs, OperationDocumentation } from '../openapi/docs.js';
/** The studio document's introduction, and the docs and examples its modules register. */
export declare const studioDocs: ApiDocs;
/** Each studio operation's prose and doc-only metadata, by route: for a server's own docs. Server only. */
export declare const studioDocsOf: (route: RouteDefinition) => OperationDocumentation;
//# sourceMappingURL=docs.d.ts.map