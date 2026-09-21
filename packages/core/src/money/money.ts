/**
 * L'argent, en unite mineure entiere.
 *
 * Decision du projet : « une unite canonique (centimes entiers + code devise)
 * en base et dans les contrats. Jamais de chaine formatee stockee ni
 * transportee, sauf dans un document. » Le formatage est de la presentation et
 * vit dans `format/`, avec une locale explicite.
 *
 * ⚠ `fixtures.js` porte les prix en EUROS ENTIERS (`price: 26`). C'est une
 * commodite de maquette : elle ne sait pas exprimer 26,50 €. Le portage
 * multiplie par cent.
 */

import { DomainError } from '../kernel/errors.js';

export interface Money {
  /** La plus petite unite de la devise, en entier. Peut etre negatif. */
  readonly amountMinor: number;
  /** ISO 4217, majuscules. */
  readonly currencyCode: string;
}

const CURRENCY_SHAPE = /^[A-Z]{3}$/;

export function money(amountMinor: number, currencyCode: string): Money {
  if (!Number.isSafeInteger(amountMinor)) {
    throw new DomainError({
      code: 'money.amount_not_integer',
      params: { amount: String(amountMinor) },
    });
  }
  if (!CURRENCY_SHAPE.test(currencyCode)) {
    throw new DomainError({ code: 'money.currency_invalid', params: { currency: currencyCode } });
  }
  return { amountMinor, currencyCode };
}

export function zero(currencyCode: string): Money {
  return money(0, currencyCode);
}

export function isZero(value: Money): boolean {
  return value.amountMinor === 0;
}

export function isNegative(value: Money): boolean {
  return value.amountMinor < 0;
}

/**
 * Additionner deux devises differentes est une faute, jamais une conversion
 * implicite.
 *
 * D4 : trois marches sont declares, UN SEUL est exerce — le multi-devise est
 * une intention, pas une regle eprouvee. Convertir ici introduirait un taux,
 * donc une date de change, donc un ecart de reconciliation qu'on ne saurait pas
 * expliquer. Une chaine qui vend dans deux devises a DEUX SOLDES.
 */
function assertSameCurrency(left: Money, right: Money): void {
  if (left.currencyCode !== right.currencyCode) {
    throw new DomainError({
      code: 'money.currency_mismatch',
      params: { left: left.currencyCode, right: right.currencyCode },
    });
  }
}

export function add(left: Money, right: Money): Money {
  assertSameCurrency(left, right);
  return money(left.amountMinor + right.amountMinor, left.currencyCode);
}

export function subtract(left: Money, right: Money): Money {
  assertSameCurrency(left, right);
  return money(left.amountMinor - right.amountMinor, left.currencyCode);
}

export function sum(values: readonly Money[], currencyCode: string): Money {
  return values.reduce<Money>((total, value) => add(total, value), zero(currencyCode));
}

export function compare(left: Money, right: Money): number {
  assertSameCurrency(left, right);
  return left.amountMinor - right.amountMinor;
}

export function min(left: Money, right: Money): Money {
  return compare(left, right) <= 0 ? left : right;
}

export function max(left: Money, right: Money): Money {
  return compare(left, right) >= 0 ? left : right;
}

export function multiplyByCount(value: Money, count: number): Money {
  if (!Number.isSafeInteger(count) || count < 0) {
    throw new DomainError({ code: 'money.count_invalid', params: { count: String(count) } });
  }
  return money(value.amountMinor * count, value.currencyCode);
}
