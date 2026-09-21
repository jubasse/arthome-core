import { describe, expect, it } from 'vitest';

import { LanguageDependency } from '../vocabulary/catalog.js';
import { hasLanguageBarrier, isLanguageNeutral, isUnderstandable, type LanguageProfile } from './language.js';

const profile = (over: Partial<LanguageProfile> = {}): LanguageProfile => ({
  spoken: ['fr'],
  subtitles: [],
  surtitles: [],
  dependency: LanguageDependency.ESSENTIAL,
  ...over,
});

/**
 * INVARIANT PROTEGE
 *   Le vocabulaire de `languageDependency` contient `essential`, et c'est la
 *   valeur dont depend la regle.
 *
 * POURQUOI CE TEST EXISTE
 *   D1 — la correction la plus verifiable du dossier. `taxonomy.json` declare
 *   `none | light | helpful`. Or `essential` est ABSENTE du vocabulaire, portee
 *   par cinq spectacles, traduite dans l'i18n, et `helpers.js:437` EN FAIT SON
 *   TEST. Tandis que `light` n'est employee NULLE PART.
 *
 *   Un vocabulaire ferme qui ne contient pas la valeur dont depend la regle la
 *   plus visible de la surface n'est pas un vocabulaire ferme.
 */
describe('la barriere de langue', () => {
  it('ne tient qu\'a `essential`', () => {
    expect(hasLanguageBarrier(profile({ dependency: LanguageDependency.ESSENTIAL }))).toBe(true);
    expect(hasLanguageBarrier(profile({ dependency: LanguageDependency.HELPFUL }))).toBe(false);
    expect(hasLanguageBarrier(profile({ dependency: LanguageDependency.NONE }))).toBe(false);
  });

  it('distingue « sans barriere pour personne » de « suivable par moi »', () => {
    // Deux questions differentes : le filtre « sans barriere de langue » de la
    // recherche ne depend d'AUCUN spectateur.
    expect(isLanguageNeutral(profile({ dependency: LanguageDependency.NONE }))).toBe(true);
    expect(isLanguageNeutral(profile({ dependency: LanguageDependency.HELPFUL }))).toBe(false);
  });
});

/**
 * INVARIANT PROTEGE
 *   « Suivable » se decide sur les langues que JE comprends, et `helpful`
 *   reste suivable sans elles — c'est tout le sens de la valeur intermediaire.
 */
describe('« ce spectacle est-il suivable ? »', () => {
  it('est toujours oui quand la langue ne compte pas', () => {
    const danse = profile({ spoken: [], dependency: LanguageDependency.NONE });
    expect(isUnderstandable(danse, [])).toBe(true);
    expect(isUnderstandable(danse, ['ja'])).toBe(true);
  });

  it('est oui quand je comprends la langue jouee', () => {
    expect(isUnderstandable(profile(), ['fr'])).toBe(true);
    expect(isUnderstandable(profile(), ['FR'])).toBe(true); // la casse ne compte pas
  });

  it('est oui quand un sous-titrage me couvre', () => {
    expect(isUnderstandable(profile({ subtitles: ['en'] }), ['en'])).toBe(true);
    expect(isUnderstandable(profile({ surtitles: ['de'] }), ['de'])).toBe(true);
  });

  it('est NON quand la langue est essentielle et que rien ne me couvre', () => {
    // Le cas qui justifie l'existence de la regle : un texte de theatre joue en
    // francais, sous-titre en anglais, pour un spectateur qui ne lit ni l'un ni
    // l'autre.
    expect(isUnderstandable(profile({ subtitles: ['en'] }), ['ja'])).toBe(false);
  });

  it('reste OUI quand la langue est seulement `helpful`', () => {
    const opera = profile({ dependency: LanguageDependency.HELPFUL, subtitles: ['en'] });
    expect(isUnderstandable(opera, ['ja'])).toBe(true);
  });
});
