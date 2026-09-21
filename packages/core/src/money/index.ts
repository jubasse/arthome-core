/** L'argent : unite mineure entiere, taux en points de base, arrondi unique. */

export type { Money } from './money.js';
export {
  add,
  compare,
  isNegative,
  isZero,
  max,
  min,
  money,
  multiplyByCount,
  subtract,
  sum,
  zero,
} from './money.js';

export type { BasisPoints } from './rounding.js';
export {
  BASIS_POINTS_SCALE,
  applyRate,
  basisPoints,
  remainderAfterRate,
  roundMinor,
  taxIncludedIn,
} from './rounding.js';
