/**
 * The status each error code is answered with, one per code (transport.md §5.5). A route lists
 * codes; the document groups them by this status, and the server answers a refusal with it.
 */
import { type ErrorCode } from '@arthome/core';
import type { ErrorStatus } from './errors.js';
export declare const ERROR_STATUS: Readonly<Record<ErrorCode, ErrorStatus>>;
export declare function statusOf(code: ErrorCode): ErrorStatus;
//# sourceMappingURL=error-status.d.ts.map