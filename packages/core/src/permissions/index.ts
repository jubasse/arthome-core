/** Rights: eight canonical roles, the union never a rank, and `grants`. */

export { assignableRolesOf, canAssign } from './grants.js';

export type { EffectiveRights } from './rights.js';
export { canDecide, canOps, canRevenue, effectiveRightsOf } from './rights.js';
