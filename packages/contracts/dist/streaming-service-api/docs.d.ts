import type { RouteDefinition } from '../http/index.js';
import type { ApiDocs, OperationDocumentation } from '../openapi/docs.js';
/** The streaming service document's introduction, and the docs and examples its modules register. */
export declare const streamingServiceDocs: ApiDocs;
/** Each streaming service operation's prose and doc-only metadata, by route: for the service's own docs. */
export declare const streamingServiceDocsOf: (route: RouteDefinition) => OperationDocumentation;
//# sourceMappingURL=docs.d.ts.map