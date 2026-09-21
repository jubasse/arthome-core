/** Les droits : huit roles canoniques, l'union jamais un rang, et `grants`. */

export { assignableRolesOf, canAssign } from './grants.js';

export type { EffectiveRights } from './rights.js';
export { canDecide, canOps, canRevenue, effectiveRightsOf } from './rights.js';
