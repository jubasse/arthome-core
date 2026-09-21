import { describe, expect, it } from 'vitest';

import { SCARCITY_THRESHOLD_BPS } from '../ticketing/seats.js';
import {
  ALMOST_FULL_THRESHOLD_BPS,
  CREW_UNASSIGNED_ALERT_HOURS,
  MODERATION_QUEUE_ALERT_SIZE,
  REMINDER_LEAD_MINUTES,
  isWithinQuietHours,
  mayCarryAmount,
  reminderInstantFor,
  reminderStillValid,
  shouldDeliverNow,
} from './index.js';

/**
 * INVARIANT PROTEGE
 *   Les cinq seuils sont des REGLES DE DOMAINE servies, pas des textes d'ecran.
 *
 * POURQUOI CE TEST EXISTE
 *   `storefront-mobile` Q10 : « recopies, ils divergeront — le web dira
 *   30 minutes, la TV 15, et le mobile aura raison par hasard ». Deux d'entre
 *   eux n'avaient AUCUN porteur nulle part (G6).
 */
describe('les cinq seuils', () => {
  it('porte les deux qui n\'avaient aucun porteur', () => {
    expect(MODERATION_QUEUE_ALERT_SIZE).toBe(10);
    expect(CREW_UNASSIGNED_ALERT_HOURS).toBe(24);
  });

  it('rappelle trente minutes avant le lever de rideau', () => {
    expect(REMINDER_LEAD_MINUTES).toBe(30);
    expect(reminderInstantFor('2026-09-21T19:00:00.000Z')).toBe('2026-09-21T18:30:00.000Z');
  });

  it("partage EXACTEMENT le seuil de rarete d'une carte", () => {
    // Le test qui protege une coherence invisible : une carte qui dit
    // « bientot complet » pendant qu'aucune alerte ne part serait
    // incomprehensible pour le spectateur qui a active l'alerte.
    expect(ALMOST_FULL_THRESHOLD_BPS).toBe(SCARCITY_THRESHOLD_BPS);
  });
});

/**
 * INVARIANT PROTEGE
 *   Les heures calmes sont celles du DORMEUR, et leur exception est ETROITE.
 *
 * POURQUOI
 *   `storefront-web` : « la regle des heures calmes a une exception
 *   conditionnee a la detention d'une place — c'est une regle metier du service
 *   de notification, pas un reglage d'interface ».
 */
describe('les heures calmes', () => {
  it('se calcule dans le fuseau du dormeur, pas du serveur', () => {
    // 23 h 30 a Paris (UTC+2) = 21 h 30 UTC. Un serveur qui raisonnerait en UTC
    // reveillerait tout le monde.
    const instant = '2026-09-21T21:30:00.000Z';
    expect(isWithinQuietHours(instant, 120)).toBe(true); // 23 h 30 a Paris
    expect(isWithinQuietHours(instant, -420)).toBe(false); // 14 h 30 a Los Angeles
  });

  it('couvre la nuit aux DEUX bornes, minuit compris', () => {
    // Les bornes sont le seul endroit ou une plage qui enjambe minuit se
    // trompe : `hour >= 23 || hour < 9` doit etre vrai des deux cotes de zero.
    const at = (isoHourUtc: string) => isWithinQuietHours(isoHourUtc, 120);
    expect(at('2026-09-21T20:59:00.000Z')).toBe(false); // 22 h 59
    expect(at('2026-09-21T21:00:00.000Z')).toBe(true); // 23 h 00 — la borne basse
    expect(at('2026-09-21T22:00:00.000Z')).toBe(true); // minuit
    expect(at('2026-09-22T05:00:00.000Z')).toBe(true); // 07 h
    expect(at('2026-09-22T06:59:00.000Z')).toBe(true); // 08 h 59
    expect(at('2026-09-22T07:00:00.000Z')).toBe(false); // 09 h 00 — la borne haute
  });

  it('laisse passer le debut d\'un direct dont on detient une place', () => {
    const night = '2026-09-21T21:30:00.000Z'; // 23 h 30 a Paris
    expect(shouldDeliverNow(night, 120, true).deliver).toBe(true);
    expect(shouldDeliverNow(night, 120, true).reasonCode).toBe(
      'notification.quiet_hours_exception_held_seat',
    );
  });

  it("n'etend PAS l'exception aux autres declencheurs", () => {
    // Un rappel « nouvelle date annoncee » a 3 h du matin reste refuse : c'est
    // tout le sens des heures calmes.
    const night = '2026-09-21T21:30:00.000Z';
    const decision = shouldDeliverNow(night, 120, false);
    expect(decision.deliver).toBe(false);
    expect(decision.reasonCode).toBe('notification.deferred_quiet_hours');
  });
});

/**
 * INVARIANT PROTEGE
 *   Une notification ne porte JAMAIS un montant si le role destinataire n'a pas
 *   `canRevenue`.
 *
 * POURQUOI
 *   L'argument de `studio-mobile` est decisif : une notification s'affiche sur
 *   un ECRAN VERROUILLE. La redaction par role ne s'arrete pas a la charge
 *   utile d'une API.
 */
describe('la redaction dans une notification', () => {
  it("refuse le montant a qui n'a pas le droit d'en connaitre", () => {
    expect(mayCarryAmount(false)).toBe(false);
    expect(mayCarryAmount(true)).toBe(true);
  });
});

/**
 * INVARIANT PROTEGE
 *   Un rappel est une PROMESSE DATEE : il suit un report, et il s'annule avec
 *   une annulation — jamais il ne part a vide.
 */
describe('un rappel suit sa date', () => {
  it('reste valide quand la date n\'a pas bouge', () => {
    expect(reminderStillValid('2026-09-21T18:30:00.000Z', '2026-09-21T19:00:00.000Z')).toBe(true);
  });

  it('cesse d\'etre valide apres un report', () => {
    // Le rappel doit SUIVRE le report, donc l'ancien est invalide et un nouveau
    // se pose. Sans ce test, un rappel partirait pour une date qui n'a plus lieu.
    expect(reminderStillValid('2026-09-21T18:30:00.000Z', '2026-09-28T19:00:00.000Z')).toBe(false);
  });

  it('cesse d\'etre valide quand la date est annulee', () => {
    expect(reminderStillValid('2026-09-21T18:30:00.000Z', null)).toBe(false);
  });
});
