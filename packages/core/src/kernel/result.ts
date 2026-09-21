/**
 * Un resultat explicite, pour les regles qui refusent sans que ce soit un bogue.
 *
 * `decideWatch` en est le cas type : un refus de droit est une REPONSE, pas une
 * exception — et il porte un code que cinq surfaces affichent differemment.
 */

import type { MessageParams } from './errors.js';

export interface Ok<T> {
  readonly ok: true;
  readonly value: T;
}

export interface Err {
  readonly ok: false;
  readonly code: string;
  readonly params: MessageParams;
}

export type Result<T> = Ok<T> | Err;

export function ok<T>(value: T): Ok<T> {
  return { ok: true, value };
}

export function err(code: string, params: MessageParams = {}): Err {
  return { ok: false, code, params };
}

export function isOk<T>(result: Result<T>): result is Ok<T> {
  return result.ok;
}
