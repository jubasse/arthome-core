// Arthome — fonctions communes aux cinq surfaces.
//
//   const A = await loadArthome({ locale: 'fr' });     // fixtures.js, charge tout i18n/
//   const A = createArthome({ taxonomy, fixtures, strings: [actions, player] });
//   A.t('common.actions.watch')            → « Regarder »
//   A.when(d)                              → « ce soir · 21 h 04 »
//   A.stateOf(d)                           → 'live'
//   A.label(A.category('dance'))           → « Danse »
//
// Aucune dépendance, aucun import : les données arrivent en argument.
// Les décalages horaires des fixtures sont en minutes depuis « maintenant »,
// donc tout ce qui est calculé ici l'est au moment de l'appel.

// ---------------------------------------------------------------------------
// Primitives d'horloge et de tirage, utilisables sans instancier l'API :
// fixtures.js s'en sert pour poser les dates sur l'heure réelle.
// ---------------------------------------------------------------------------

// Date réelle correspondant à un décalage en minutes depuis maintenant.
export function dateAtOffset(offsetMin, nowFn) {
  const base = (nowFn ? nowFn() : new Date());
  const d = new Date(base.getTime());
  d.setSeconds(0, 0);
  d.setMinutes(d.getMinutes() + Math.round(offsetMin || 0));
  return d;
}

// Décalage en minutes d'ici à une heure murale (21 h 00 ce soir, demain, etc.).
// dayOffset = 0 aujourd'hui, 1 demain, -1 hier.
export function minutesUntilClock(hour, minute, dayOffset, nowFn) {
  const base = (nowFn ? nowFn() : new Date());
  const target = new Date(base.getTime());
  target.setHours(hour, minute || 0, 0, 0);
  target.setDate(target.getDate() + (dayOffset || 0));
  return Math.round((target - base) / 60000);
}

// Même chose, mais reportée au lendemain si l'heure est déjà passée.
export function minutesUntilNextClock(hour, minute, nowFn) {
  const today = minutesUntilClock(hour, minute, 0, nowFn);
  return today > 0 ? today : minutesUntilClock(hour, minute, 1, nowFn);
}

// Tirage déterministe : même graine, même jeu de données sur les cinq surfaces.
export function seededRandom(seed) {
  let a = (seed >>> 0) || 1;
  return function next() {
    a += 0x6D2B79F5;
    let x = a;
    x = Math.imul(x ^ (x >>> 15), x | 1);
    x ^= x + Math.imul(x ^ (x >>> 7), x | 61);
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}

// Assemble les fichiers thématiques de i18n/ en un seul dictionnaire par langue.
// Accepte, dans l'ordre : un fichier { keys: { clé: { fr, en } } }, un objet
// { fr: {…}, en: {…} } (forme héritée), ou un tableau des deux.
export function mergeStrings(parts, locales) {
  const out = {};
  const known = locales || ['fr', 'en'];
  known.forEach(l => { out[l] = {}; });
  const eat = (part) => {
    if (!part) return;
    if (Array.isArray(part)) { part.forEach(eat); return; }
    if (part.keys) {
      Object.keys(part.keys).forEach(k => {
        const row = part.keys[k];
        Object.keys(row).forEach(l => { if (!out[l]) out[l] = {}; out[l][k] = row[l]; });
      });
      return;
    }
    Object.keys(part).forEach(l => {
      if (!part[l] || typeof part[l] !== 'object') return;
      if (!out[l]) out[l] = {};
      Object.assign(out[l], part[l]);
    });
  };
  eat(parts);
  return out;
}

export function createArthome(options) {
  const taxonomy = options.taxonomy;
  const fixtures = options.fixtures;
  const strings = mergeStrings(options.strings, options.locales);
  const i18nFormat = options.i18nFormat || (options.strings && options.strings.i18nFormat) || {};
  /* Les décalages des dates sont figés au moment où les fixtures ont été
     construites. Les rendre contre une autre horloge — même figée — décalerait
     toute heure murale de l'écart entre les deux instants. On s'accroche donc
     à l'instant exact du tirage. */
  const builtAt = new Date(
    (options.fixtures && options.fixtures.builtAtMs) || Date.now()
  );
  const clockSource = options.now || (() => builtAt);

  let locale = options.locale || i18nFormat.defaultLocale || 'fr';
  const fallback = i18nFormat.defaultLocale || 'fr';
  let viewerCountry = options.viewerCountry || (fixtures.geography && fixtures.geography.viewerCountry) || 'FR';

  const index = (list, key) => {
    const out = {};
    (list || []).forEach(item => { out[item[key || 'id']] = item; });
    return out;
  };
  const byId = {
    venue: index(fixtures.venues),
    artist: index(fixtures.artists),
    show: index(fixtures.shows),
    date: index(fixtures.dates),
    account: index(fixtures.accounts),
    category: index(taxonomy.categories),
    run: index((fixtures.studio || {}).runs, 'dateId'),
    chapter: index((fixtures.studio || {}).chapterVocabulary),
    person: index(fixtures.people),
    channel: index((fixtures.studio || {}).channels),
    publication: index((fixtures.studio || {}).publications, 'dateId'),
    payout: index((fixtures.studio || {}).payouts, 'dateId'),
    health: index((fixtures.studio || {}).healthSamples, 'dateId')
  };

  // ---------------------------------------------------------------- i18n
  function t(key, vars) {
    const dicts = [strings[locale], strings[fallback], taxonomy.i18n && taxonomy.i18n[locale], taxonomy.i18n && taxonomy.i18n[fallback]];
    let value = null;
    for (let i = 0; i < dicts.length && value == null; i++) if (dicts[i]) value = dicts[i][key];
    if (value == null) return key;
    if (!vars) return value;
    return String(value).replace(/\{(\w+)\}/g, (m, name) => (vars[name] == null ? m : vars[name]));
  }
  // Libellé d'une entrée de taxonomie ({ i18n }) ou d'une valeur d'énumération.
  const label = (entry) => (entry && entry.i18n ? t(entry.i18n) : '');
  const enumLabel = (group, id) => (id == null ? '' : t('enums.' + group + '.' + id));

  // Contenu : rédigé dans la langue de la salle, traduit seulement si le champ existe.
  /* Le champ de base est rédigé en français, « …En » porte l'anglais. On rend
     toujours la langue du LECTEUR quand elle existe, et on retombe sur l'autre
     sinon. Un synopsis ne doit pas s'afficher en anglais à un lecteur français
     parce que l'artiste est britannique — ça, c'est la langue de jeu, et elle
     se dit ailleurs (spokenLanguage, subtitles). */
  function content(entity, field) {
    if (!entity) return '';
    const fr = entity[field];
    const en = entity[field + 'En'];
    if (locale === 'en') return en != null && en !== '' ? en : (fr == null ? '' : fr);
    return fr != null && fr !== '' ? fr : (en == null ? '' : en);
  }
  /* Certaines surfaces gardent les deux langues en mémoire pour basculer sans
     recharger : elles lisent le champ dans une langue nommée. */
  function contentIn(entity, field, loc) {
    if (!entity) return '';
    const fr = entity[field];
    const en = entity[field + 'En'];
    if (loc === 'en') return en != null && en !== '' ? en : (fr == null ? '' : fr);
    return fr != null && fr !== '' ? fr : (en == null ? '' : en);
  }
  const labelIn = (entry, loc) => {
    if (!entry || !entry.i18n) return '';
    const dicts = [strings[loc], strings[fallback], taxonomy.i18n && taxonomy.i18n[loc], taxonomy.i18n && taxonomy.i18n[fallback]];
    for (let i = 0; i < dicts.length; i++) if (dicts[i] && dicts[i][entry.i18n] != null) return dicts[i][entry.i18n];
    return t(entry.i18n);
  };
  const titleIn = (show, loc) => contentIn(show, 'title', loc);
  const synopsisIn = (show, loc) => contentIn(show, 'synopsis', loc);
  const castIn = (show, loc) => contentIn(show, 'cast', loc);
  const bioIn = (artist, loc) => contentIn(artist, 'bio', loc);
  const title = (show) => content(show, 'title');
  const synopsis = (show) => content(show, 'synopsis');
  const castOf = (show) => content(show, 'cast');
  const bio = (artist) => content(artist, 'bio');
  // Accepte un identifiant de vocabulaire ou une entrée de chapitre posée en régie.
  const chapterLabel = (idOrEntry) => {
    const id = idOrEntry && idOrEntry.chapter ? idOrEntry.chapter : idOrEntry;
    const c = byId.chapter[id];
    return c ? (locale === 'fr' ? c.label : (c.labelEn || c.label)) : id;
  };

  // ------------------------------------------------------------- horloge
  const isFr = () => locale === 'fr';
  /* Une copie à chaque appel : plusieurs formateurs normalisent leur base avec
     setHours(0,0,0,0), ce qui écraserait l'horloge partagée — et ferait basculer
     toute la couche à minuit dès le premier libellé de jour. */
  const now = () => new Date(clockSource().getTime());
  const nowMinutes = () => { const d = now(); return d.getHours() * 60 + d.getMinutes(); };
  // Date réelle correspondant à un décalage en minutes.
  function dateAt(offsetMin) {
    const d = now();
    d.setSeconds(0, 0);
    d.setMinutes(d.getMinutes() + Math.round(offsetMin || 0));
    return d;
  }
  const pad = (n) => (n < 10 ? '0' + n : String(n));

  // Heure locale du spectateur : « 21 h 04 » / « 9:04 PM ».
  function clock(offsetMin) {
    const d = dateAt(offsetMin);
    return formatTime(d.getHours(), d.getMinutes());
  }
  function formatTime(h, m) {
    if (isFr()) return h + ' h ' + pad(m);
    const h12 = h % 12 === 0 ? 12 : h % 12;
    return h12 + ':' + pad(m) + (h < 12 ? ' AM' : ' PM');
  }
  // Fuseau nommé d'une salle : « CEST », « EDT »… L'été est déterminé par le
  // décalage réel du fuseau à cet instant, pas par le mois.
  const zoneById = {};
  (fixtures.zones || []).forEach(z => { zoneById[z.id] = z; });
  function zoneAbbr(venue) {
    const v = typeof venue === 'string' ? byId.venue[venue] : venue;
    if (!v) return '';
    const z = zoneById[v.timezone];
    if (!z) return '';
    return v.utcOffsetMin === z.utcOffsetMin ? z.abbrSummer : z.abbrWinter;
  }
  const viewerZone = () => {
    const off = -now().getTimezoneOffset();
    const match = (fixtures.zones || []).filter(z => z.utcOffsetMin === off)[0];
    if (match) return Object.assign({ abbr: off === match.utcOffsetMin ? match.abbrSummer : match.abbrWinter }, match);
    // Fuseau inconnu de la table : on le nomme par son décalage, jamais vide.
    const sign = off < 0 ? '−' : '+';
    const abbr = 'UTC' + sign + String(Math.floor(Math.abs(off) / 60)) + (Math.abs(off) % 60 ? ':' + String(Math.abs(off) % 60).padStart(2, '0') : '');
    return { id: 'local', abbr, abbrSummer: abbr, abbrWinter: abbr, utcOffsetMin: off, city: '' };
  };
  // Heure de la salle, quand elle diffère de celle du spectateur.
  function venueClock(offsetMin, venue) {
    const v = typeof venue === 'string' ? byId.venue[venue] : venue;
    if (!v) return clock(offsetMin);
    const viewerOffset = -now().getTimezoneOffset();
    const d = dateAt(offsetMin + (v.utcOffsetMin - viewerOffset));
    return formatTime(d.getHours(), d.getMinutes());
  }
  const venueDiffers = (venue) => {
    const v = typeof venue === 'string' ? byId.venue[venue] : venue;
    return !!v && v.utcOffsetMin !== -now().getTimezoneOffset();
  };

  // Jour nommé, sans formule relative : « samedi 12 octobre ». Pour les phrases
  // où « aujourd’hui » ne veut rien dire (« la date du … »).
  function longDate(offsetMin) {
    const d = dateAt(offsetMin);
    const days = isFr()
      ? ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi']
      : ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const months = isFr()
      ? ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre']
      : ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    return isFr()
      ? days[d.getDay()] + ' ' + d.getDate() + ' ' + months[d.getMonth()]
      : days[d.getDay()] + ' ' + months[d.getMonth()] + ' ' + d.getDate();
  }

  // « aujourd’hui », « ce soir », « demain », « hier », « samedi 12 », « samedi 12 oct. »
  function dayLabel(offsetMin) {
    const target = dateAt(offsetMin);
    const a = new Date(target); a.setHours(0, 0, 0, 0);
    const b = now(); b.setHours(0, 0, 0, 0);
    const days = Math.round((a - b) / 86400000);
    if (days === 0) {
      const evening = nowMinutes() + offsetMin >= 17 * 60 && offsetMin >= 0;
      return t(evening ? 'common.time.tonight' : 'common.time.today');
    }
    if (days === 1) return t('common.time.tomorrow');
    if (days === -1) return t('common.time.yesterday');
    const names = isFr()
      ? ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi']
      : ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const months = isFr()
      ? ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.']
      : ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const base = names[target.getDay()] + ' ' + target.getDate();
    return Math.abs(days) > 6 ? base + ' ' + months[target.getMonth()] : base;
  }

  // « ce soir · 21 h 04 », avec l'heure de salle en second si elle diffère.
  function when(date, withVenue) {
    const d = resolveDate(date);
    if (!d) return '';
    const parts = [dayLabel(d.startOffsetMin), clock(d.startOffsetMin) + ' ' + t('common.time.yourTime')];
    if (withVenue !== false && venueDiffers(d.venue)) {
      const abbr = zoneAbbr(d.venue);
      parts.push(venueClock(d.startOffsetMin, d.venue) + ' ' + t('common.time.venueTime') + (abbr ? ' (' + abbr + ')' : ''));
    }
    return parts.join(' · ');
  }

  // « 42 min », « 2 h 10 », « 3 jours »
  function countdown(offsetMin) {
    const m = Math.max(0, Math.round(offsetMin));
    if (m < 60) return m + ' ' + t('common.units.minutesShort');
    if (m < 1440) {
      const h = Math.floor(m / 60), r = m % 60;
      return isFr() ? (r ? h + ' h ' + pad(r) : h + ' h') : (r ? h + 'h ' + r + 'm' : h + 'h');
    }
    const days = Math.round(m / 1440);
    return isFr() ? days + (days > 1 ? ' jours' : ' jour') : days + (days > 1 ? ' days' : ' day');
  }
  // Durée d'un spectacle : « 2 h 30 » / « 2h 30m »
  function duration(min) {
    const h = Math.floor(min / 60), m = Math.round(min % 60);
    if (isFr()) return h ? (m ? h + ' h ' + pad(m) : h + ' h') : m + ' min';
    return h ? (m ? h + 'h ' + m + 'm' : h + 'h') : m + 'm';
  }
  // Position dans le lecteur : « 1:04:12 » / « 04:12 »
  function timecode(seconds) {
    const s = Math.max(0, Math.round(seconds));
    const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), r = s % 60;
    return (h ? h + ':' + pad(m) : pad(m)) + ':' + pad(r);
  }

  // ---------------------------------------------------------------- nombres
  const NBSP = '\u202F';
  function number(n) {
    const s = String(Math.round(Math.abs(n)));
    const grouped = s.replace(/\B(?=(\d{3})+(?!\d))/g, isFr() ? NBSP : ',');
    return (n < 0 ? '-' : '') + grouped;
  }
  // « 12,8 k » / « 12.8k », « 1,2 M » / « 1.2M »
  function compact(n) {
    const abs = Math.abs(n);
    if (abs < 1000) return number(n);
    const unit = abs >= 1e6 ? 'M' : 'k';
    const v = n / (unit === 'M' ? 1e6 : 1000);
    const s = Math.abs(v) < 100 ? String(Math.round(v * 10) / 10) : String(Math.round(v));
    return isFr() ? s.replace('.', ',') + NBSP + unit : s + unit;
  }
  function price(amount, currency) {
    const cur = currency || 'EUR';
    const symbol = cur === 'EUR' ? '€' : (cur === 'CAD' ? '$' : cur);
    const whole = Math.round(amount) === amount;
    // Milliers groupés : « 20 732 € », jamais « 20732 € ».
    const body = whole
      ? number(amount)
      : (isFr()
          ? number(Math.floor(Math.abs(amount))) + ',' + Math.round((Math.abs(amount) % 1) * 100).toString().padStart(2, '0')
          : amount.toFixed(2));
    return isFr() ? body + NBSP + symbol : symbol + body;
  }
  const priceOf = (date, tier) => {
    const d = resolveDate(date);
    const row = d && (d.prices || []).filter(p => p.tier === (tier || 'full'))[0];
    return row ? price(row.amount, d.currency) : '';
  };
  const priceFrom = (date) => {
    const d = resolveDate(date);
    if (!d) return '';
    const low = Math.min.apply(null, d.prices.map(p => p.amount));
    return price(low, d.currency);
  };

  // ------------------------------------------------------------------ état
  function resolveDate(date) { return typeof date === 'string' ? byId.date[date] : date; }
  const showOf = (date) => { const d = resolveDate(date); return d ? byId.show[d.show] : null; };
  const artistOf = (date) => { const s = showOf(date); return s ? byId.artist[s.artist] : null; };
  const venueOf = (date) => { const d = resolveDate(date); return d ? byId.venue[d.venue] : null; };
  const runOf = (date) => { const d = resolveDate(date); return d ? byId.run[d.id] || null : null; };
  const runtimeOf = (date) => { const s = showOf(date); return s ? s.runtimeMin : 0; };

  // 'scheduled' | 'live' | 'replay' | 'ended'
  function stateOf(date) {
    const d = resolveDate(date);
    if (!d) return 'scheduled';
    if (d.outcome === 'cancelled') return 'ended';
    const start = d.startOffsetMin, end = start + runtimeOf(d);
    if (start > 0) return 'scheduled';
    if (end > 0 && d.outcome !== 'interrupted') return 'live';
    const window = (d.replay && d.replay.windowHours) || 0;
    if (window > 0 && d.replay.policy !== 'none' && end > -window * 60) return 'replay';
    return 'ended';
  }
  const isOnAir = (date) => stateOf(date) === 'live';
  const roomOpensBefore = () => (fixtures.time && fixtures.time.roomOpensBeforeMin) || 30;
  const isRoomOpen = (date) => {
    const d = resolveDate(date);
    return !!d && d.startOffsetMin > 0 && d.startOffsetMin <= roomOpensBefore();
  };
  // Progression 0→1 d'un direct en cours.
  function progressOf(date) {
    const d = resolveDate(date);
    if (!d) return 0;
    const total = runtimeOf(d);
    if (!total) return 0;
    return Math.min(1, Math.max(0, -d.startOffsetMin / total));
  }
  // Heures restantes de rediffusion, ou 0.
  function replayHoursLeft(date) {
    const d = resolveDate(date);
    if (!d || stateOf(d) !== 'replay') return 0;
    const end = d.startOffsetMin + runtimeOf(d);
    return Math.max(0, Math.round((d.replay.windowHours * 60 + end) / 60));
  }
  const outcomeLabel = (date) => { const d = resolveDate(date); return d && d.outcome ? enumLabel('outcome', d.outcome) : ''; };
  const stateLabel = (date) => enumLabel('dateState', stateOf(date));
  const replayLabel = (date) => { const d = resolveDate(date); return d ? enumLabel('replayPolicy', d.replay.policy) : ''; };
  const chatLabel = (date) => { const d = resolveDate(date); return d ? enumLabel('chatMode', d.chatMode) : ''; };

  // « 86 places », « Complet », « Liste d’attente · 340 »
  function seatsLabel(date) {
    const d = resolveDate(date);
    if (!d) return '';
    if (d.outcome) return enumLabel('outcome', d.outcome);
    if (d.seats.available > 0) return number(d.seats.available) + ' ' + t('common.units.seats');
    if (d.seats.waitlist > 0) return t('common.status.waitlist') + ' · ' + number(d.seats.waitlist);
    return t('common.status.soldOut');
  }
  const isSoldOut = (date) => { const d = resolveDate(date); return !!d && d.seats.available === 0; };

  // -------------------------------------------------------------- droits
  // Diffusion mondiale par défaut ; un blackout est l'exception et se justifie.
  const availableIn = (date, country) => {
    const d = resolveDate(date);
    if (!d || !d.rights || d.rights.scope !== 'restricted') return true;
    return d.rights.blackout.indexOf(country || viewerCountry) < 0;
  };
  function blackoutReason(date) {
    const d = resolveDate(date);
    if (!d || !d.rights || !d.rights.reason) return '';
    const list = ((fixtures.geography || {}).rightsPolicy || {}).blackoutReasons || [];
    const row = list.filter(r => r.id === d.rights.reason)[0];
    if (!row) return '';
    return locale === 'fr' ? row.label : (row.labelEn || row.label);
  }
  const rightsNote = (date) => {
    const reason = blackoutReason(date);
    return reason ? t('common.error.blackoutBody', { reason: reason.toLowerCase() }) : '';
  };

  // ------------------------------------------------------------- langue
  // Ce qui gêne réellement un spectateur de spectacle vivant n'est pas le droit
  // mais la compréhension : un concert se regarde sans parler la langue.
  const languageName = (code) => {
    const map = { fr: 'french', en: 'english', de: 'german', es: 'spanish', hy: 'armenian',
      it: 'italian', nl: 'dutch', pt: 'portuguese', wo: 'wolof', ar: 'arabic' };
    return t('attributes.language.' + (map[code] || code));
  };
  const languageDependency = (show) => (show && show.languageDependency) || 'helpful';
  const languageLabel = (show) => enumLabel('languageDependency', languageDependency(show));
  const hasLanguageBarrier = (show) => languageDependency(show) === 'essential';
  // Le spectacle est-il suivable avec les langues que le spectateur comprend ?
  function isUnderstandable(show, spokenLocales) {
    if (!show) return true;
    if (languageDependency(show) === 'none') return true;
    const known = spokenLocales || [locale];
    const spoken = show.spokenLanguage || [];
    if (spoken.some(code => known.indexOf(code) > -1)) return true;
    const subs = (show.subtitles || []).concat(show.surtitles || []);
    return subs.some(code => known.indexOf(code) > -1);
  }
  // Ligne d'information : « Joué en français · Sous-titres FR, EN »
  function languageLine(show) {
    if (!show) return '';
    const parts = [];
    const spoken = show.spokenLanguage || [];
    if (spoken.length) parts.push(t('common.filters.spokenIn', { language: languageName(spoken[0]).toLowerCase() }));
    else parts.push(t('common.filters.noBarrier'));
    const subs = show.subtitles || [];
    if (subs.length) parts.push(t('common.filters.subtitledIn', { languages: subs.map(c => c.toUpperCase()).join(', ') }));
    const sur = show.surtitles || [];
    if (sur.length) parts.push(t('common.filters.surtitledIn', { languages: sur.map(c => c.toUpperCase()).join(', ') }));
    return parts.join(' · ');
  }
  // Filtre de recherche : dates compréhensibles dans une langue donnée.
  const datesInLanguage = (code) => fixtures.dates.filter(d => {
    const s = byId.show[d.show];
    if (!s) return false;
    if (code === 'no-barrier') return languageDependency(s) === 'none';
    return isUnderstandable(s, [code]);
  });
  const marketOf = (date) => {
    const d = resolveDate(date);
    const markets = (fixtures.geography && fixtures.geography.billingMarkets) || [];
    return markets.filter(m => m.id === (d && d.market))[0] || markets[0] || null;
  };

  // ------------------------------------------------------------- comptes
  const ownedDates = (account) => {
    const a = typeof account === 'string' ? byId.account[account] : account;
    return a ? a.ownedDates.map(id => byId.date[id]).filter(Boolean) : [];
  };
  const owns = (account, date) => {
    const a = typeof account === 'string' ? byId.account[account] : account;
    const d = resolveDate(date);
    return !!(a && d && a.ownedDates.indexOf(d.id) > -1);
  };
  const follows = (account, artistId) => {
    const a = typeof account === 'string' ? byId.account[account] : account;
    return !!(a && a.followedArtists.indexOf(artistId) > -1);
  };
  const resumeOf = (account, date) => {
    const a = typeof account === 'string' ? byId.account[account] : account;
    const d = resolveDate(date);
    if (!a || !d) return null;
    return (a.resume || []).filter(r => r.dateId === d.id)[0] || null;
  };
  // Le spectateur peut-il lancer la lecture maintenant ?
  function isWatchable(account, date) {
    const d = resolveDate(date);
    if (!d || !availableIn(d)) return false;
    const state = stateOf(d);
    if (state === 'replay') return d.replay.policy !== 'none';
    if (state === 'live' || isRoomOpen(d)) return owns(account, d);
    return false;
  }
  // Catalogue visible par un compte (filtre du compte enfant).
  function catalogueFor(account) {
    const a = typeof account === 'string' ? byId.account[account] : account;
    if (!a || !a.allowedCategories) return fixtures.dates.slice();
    return fixtures.dates.filter(d => {
      const s = byId.show[d.show];
      return s && a.allowedCategories.indexOf(s.category) > -1;
    });
  }

  // ------------------------------------------------------------ requêtes
  const datesOfShow = (showId) => fixtures.dates.filter(d => d.show === showId).sort((a, b) => a.startOffsetMin - b.startOffsetMin);
  const seriesOf = (date) => { const d = resolveDate(date); return d ? datesOfShow(d.show).filter(x => x.id !== d.id) : []; };
  const datesOfArtist = (artistId) => fixtures.dates.filter(d => { const s = byId.show[d.show]; return s && s.artist === artistId; });
  const liveNow = () => fixtures.dates.filter(d => stateOf(d) === 'live').sort((a, b) => b.viewers - a.viewers);
  const upcoming = () => fixtures.dates.filter(d => stateOf(d) === 'scheduled').sort((a, b) => a.startOffsetMin - b.startOffsetMin);
  const replays = () => fixtures.dates.filter(d => stateOf(d) === 'replay').sort((a, b) => replayHoursLeft(a) - replayHoursLeft(b));
  /* La grille du soir : ce qui se lève d'ici au prochain 2 h du matin, et pas
     avant 17 h. Une répétition de 11 h n'y a rien à faire, et une date de
     demain soir non plus. */
  const tonight = () => {
    const base = now();
    const end = new Date(base.getTime());
    end.setSeconds(0, 0);
    if (end.getHours() >= 2) { end.setDate(end.getDate() + 1); }
    end.setHours(2, 0, 0, 0);
    const limit = Math.round((end - base) / 60000);
    return upcoming().filter(d => {
      if (d.startOffsetMin > limit) return false;
      const hour = dateAt(d.startOffsetMin).getHours();
      return hour >= 17 || hour < 2;
    });
  };
  const datesInCategory = (categoryId) => fixtures.dates.filter(d => { const s = byId.show[d.show]; return s && s.category === categoryId; });
  const datesInGenre = (categoryId, genreId) => datesInCategory(categoryId).filter(d => byId.show[d.show].genre === genreId);
  const datesInRegion = (region) => fixtures.dates.filter(d => { const v = byId.venue[d.venue]; return v && (v.region === region || v.country === region); });
  const datesWithTag = (tagId) => fixtures.dates.filter(d => { const s = byId.show[d.show]; return s && s.tags.indexOf(tagId) > -1; });
  const chatOf = (date) => { const d = resolveDate(date); return d ? fixtures.chat.filter(m => m.dateId === d.id).sort((a, b) => a.atMin - b.atMin) : []; };
  const chatText = (message) => content(message, 'text');

  // ---------------------------------------------------------- taxonomie
  const category = (id) => byId.category[id] || null;
  const genresOf = (categoryId) => { const c = category(categoryId); return c ? c.genres : []; };
  const genre = (categoryId, genreId) => genresOf(categoryId).filter(g => g.id === genreId)[0] || null;
  const tagsOf = (categoryId, genreId) => { const g = genre(categoryId, genreId); return g ? g.tags : []; };
  const tag = (id) => (taxonomy.tags[id] ? Object.assign({ id }, taxonomy.tags[id]) : null);
  const tagLabel = (id) => { const x = tag(id); return x ? t(x.i18n) : id; };
  /* Les disciplines sortent toujours dans leur rang éditorial : du plus grand
     public au plus pointu, familles mêlées. Aucune surface ne réordonne. */
  const categoriesOf = (familyId) => taxonomy.categories
    .filter(c => !familyId || c.family === familyId)
    .slice()
    .sort((x, y) => (x.rank || 99) - (y.rank || 99));
  const attribute = (group, id) => ((taxonomy.attributes[group] || []).filter(a => a.id === id)[0] || null);
  const attributeLabel = (group, id) => { const a = attribute(group, id); return a ? t(a.i18n) : id; };
  const categoryOfShow = (show) => category(show && show.category);
  const genreOfShow = (show) => (show ? genre(show.category, show.genre) : null);

  // Étiquette libre saisie au studio → correspondance dans le vocabulaire fourni.
  function matchTag(input) {
    const needle = String(input || '').trim().toLowerCase();
    if (!needle) return null;
    const slug = needle.replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
    if (taxonomy.tags[slug]) return slug;
    const ids = Object.keys(taxonomy.tags);
    for (let i = 0; i < ids.length; i++) {
      const entry = taxonomy.tags[ids[i]];
      if ((entry.aliases || []).indexOf(slug) > -1 || (entry.aliases || []).indexOf(needle) > -1) return ids[i];
      if (t(entry.i18n).toLowerCase() === needle) return ids[i];
    }
    return null;
  }

  // Saisie libre au studio : étiquette, genre ou catégorie.
  // → { kind: 'tag' | 'genre' | 'category', id, categoryId }
  function resolveTerm(input) {
    const needle = String(input || '').trim().toLowerCase();
    if (!needle) return null;
    const slug = needle.replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
    const tagId = matchTag(needle);
    if (tagId) return { kind: 'tag', id: tagId, categoryId: null };
    for (let i = 0; i < taxonomy.categories.length; i++) {
      const c = taxonomy.categories[i];
      if (c.id === slug || t(c.i18n).toLowerCase() === needle) return { kind: 'category', id: c.id, categoryId: c.id };
      for (let j = 0; j < c.genres.length; j++) {
        const g = c.genres[j];
        if (g.id === slug || t(g.i18n).toLowerCase() === needle) return { kind: 'genre', id: g.id, categoryId: c.id };
      }
    }
    return null;
  }

  // ------------------------------------------------------------- studio
  const studio = fixtures.studio || {};
  const person = (id) => byId.person[id] || null;
  const channel = (id) => byId.channel[id] || null;
  const channelOf = (artistOrId) => {
    const id = typeof artistOrId === 'string' ? artistOrId : (artistOrId && artistOrId.id);
    return byId.channel['channel:' + id] || byId.channel[id] || null;
  };
  const channelOfDate = (date) => { const a = artistOf(date); return a ? channelOf(a.id) : null; };
  const membersOf = (ch) => {
    const c = typeof ch === 'string' ? channel(ch) || channelOf(ch) : ch;
    return c ? c.members : [];
  };
  const crewOf = (date) => { const r = runOf(date); return r ? r.crew : []; };
  const publicationOf = (date) => { const d = resolveDate(date); return d ? byId.publication[d.id] || null : null; };
  const publicationState = (date) => { const p = publicationOf(date); return p ? p.state : null; };
  const publicationLabel = (date) => enumLabel('publicationState', publicationState(date));
  const isLocked = (date) => {
    const p = publicationOf(date);
    return !!p && p.lockedTransitions.indexOf(p.state) > -1;
  };
  const payoutOf = (date) => { const d = resolveDate(date); return d ? byId.payout[d.id] || null : null; };
  const payoutLabel = (date) => { const p = payoutOf(date); return p ? enumLabel('payoutState', p.state) : ''; };
  const healthOf = (date) => { const d = resolveDate(date); return d ? byId.health[d.id] || null : null; };
  const moderationOf = (date) => {
    const d = resolveDate(date);
    return d ? (studio.moderation || []).filter(m => m.dateId === d.id) : [];
  };
  const messageById = (id) => (fixtures.chat || []).filter(m => m.id === id)[0] || null;
  const merchOf = (show) => {
    const id = typeof show === 'string' ? show : (show && show.id);
    return (studio.merch || []).filter(m => m.show === id);
  };
  const inboxOf = (ch) => {
    const c = typeof ch === 'string' ? (channel(ch) || channelOf(ch)) : ch;
    return c ? (studio.inbox || []).filter(i => i.channel === c.id).sort((a, b) => b.atMin - a.atMin) : [];
  };
  const unreadCount = (ch) => inboxOf(ch).filter(i => !i.read).length;
  const draftsOf = (ch) => {
    const c = typeof ch === 'string' ? (channel(ch) || channelOf(ch)) : ch;
    return c ? (studio.drafts || []).filter(x => x.channel === c.id) : [];
  };
  const datesOfChannel = (ch) => {
    const c = typeof ch === 'string' ? (channel(ch) || channelOf(ch)) : ch;
    return c ? c.dates.map(id => byId.date[id]).filter(Boolean).sort((a, b) => a.startOffsetMin - b.startOffsetMin) : [];
  };
  const freelancers = (role) => (fixtures.people || []).filter(p => p.freelance && (!role || p.roles.indexOf(role) > -1));
  // Un rôle peut venir d'une équipe de régie ou d'une chaîne : on essaie les
  // deux tables, sans jamais rendre la clé brute.
  const roleLabel = (role) => {
    if (!role) return '';
    const member = t('enums.memberRole.' + role);
    if (member.indexOf('enums.') !== 0) return member;
    const crew = t('enums.crewRole.' + role);
    return crew.indexOf('enums.') !== 0 ? crew : role;
  };
  // Bilan de trésorerie d'une chaîne.
  function balanceOf(ch) {
    const c = typeof ch === 'string' ? (channel(ch) || channelOf(ch)) : ch;
    if (!c) return null;
    const rows = (studio.payouts || []).filter(p => p.channel === c.id);
    const sum = (key, filter) => rows.filter(filter || (() => true)).reduce((n, p) => n + p[key], 0);
    return {
      currency: rows.length ? rows[0].currency : 'EUR',
      gross: sum('gross'), commission: sum('commission'), vat: sum('vat'),
      paid: sum('net', p => p.state === 'paid'),
      scheduled: sum('net', p => p.state === 'scheduled'),
      held: sum('net', p => p.state === 'held'),
      refunded: sum('refunded'), credited: sum('credited'),
      rows: rows.length
    };
  }

  // --------------------------------------------------------------- public
  const viewersOf = (ch) => {
    const c = typeof ch === 'string' ? (channel(ch) || channelOf(ch)) : ch;
    return c ? (fixtures.audience || []).filter(v => v.channel === c.id) : [];
  };
  const viewer = (id) => (fixtures.audience || []).filter(v => v.id === id)[0] || null;
  const viewerOf = (message) => (message && message.viewer ? viewer(message.viewer) : null);
  const messageState = (m) => (m ? m.state : 'ok');
  const isVisible = (m) => !m || m.state === 'ok' || m.state === 'muted';
  // Qui peut inviter qui : la réponse vient de la table des droits.
  const canInvite = (member, role) => !!member && (member.canInviteRoles || []).indexOf(role) > -1;
  const invitableRoles = (member) => (member ? (member.canInviteRoles || []).slice() : []);
  // Activité d'un intervenant, telle que l'annuaire l'affiche.
  const activityOf = (p) => {
    const x = typeof p === 'string' ? person(p) : p;
    return x ? { channels: (x.channels || []).length, runs: x.runsCalled || 0 } : { channels: 0, runs: 0 };
  };

  // ---------------------------------------------------------- abonnements
  const plans = () => (fixtures.plans || []).map(p => Object.assign({}, p, {
    label: enumLabel('plan', p.id),
    priceLabel: p.priceMonth === 0 ? t('common.plans.free') : price(p.priceMonth) + t('common.plans.perMonth'),
    opensLabels: p.opens.map(o => enumLabel('planOpens', o))
  }));
  const planOf = (account) => plans().filter(p => p.id === (account && account.plan))[0] || plans()[0] || null;

  // ------------------------------------------------------------- appareils
  const devicesOf = (account) => ((account && account.devices) || []).map(d => Object.assign({}, d, {
    label: locale === 'fr' ? d.label : d.labelEn,
    kindLabel: enumLabel('deviceKind', d.kind),
    lastSeenLabel: d.current ? t('common.devices.thisDevice') : when({ startOffsetMin: d.lastSeenMin })
  }));
  const alertsOf = (account) => ((account && account.alerts) || []).map(a => ({
    id: a.id, artist: byId.artist[a.artist], date: byId.date[a.dateId], read: a.read
  })).filter(a => a.artist && a.date);

  // ------------------------------------------------------------- images
  function imageUrl(kind, key, width) {
    const set = kind === 'avatar' ? fixtures.images.avatars : fixtures.images.wide;
    /* Une clé inconnue ne doit pas partir en URL : elle produirait un 404
       silencieux. On retombe sur une image connue, en le signalant. */
    let id = set[key];
    if (!id) {
      if (key && /^photo-/.test(key)) id = key;
      else {
        const fallback = Object.keys(set)[0];
        if (key && typeof console !== 'undefined' && console.warn) {
          console.warn('[arthome] clé d’image inconnue : ' + kind + '/' + key);
        }
        id = set[fallback];
      }
    }
    const recipe = fixtures.images.recipes[kind] || fixtures.images.recipes.wide;
    return recipe.replace('{id}', id).replace('{w}', width || 1500);
  }
  // Photo libre et déterministe pour le catalogue généré.
  function seededImage(seed, width, height) {
    const recipe = fixtures.images.recipes.picsum || 'https://picsum.photos/seed/{seed}/{w}/{h}';
    return recipe.replace('{seed}', encodeURIComponent(seed))
      .replace('{w}', width).replace('{h}', height);
  }
  // L'image d'une discipline, choisie pour elle et non tirée d'une date.
  const categoryImage = (categoryId, width) => {
    const key = ((fixtures && fixtures.categoryImages) || {})[categoryId];
    return key ? imageUrl('wide', key, width || 900) : '';
  };
  const categoryPoster = (categoryId) => {
    const key = ((fixtures && fixtures.categoryImages) || {})[categoryId];
    return key ? imageUrl('poster', key) : '';
  };
  /* Un spectacle sans visuel propre emprunte celui de sa discipline : une
     photo au hasard donnerait un opéra illustré par un bureau. */
  const showImage = (show, width) => {
    if (show && show.image) return imageUrl('wide', show.image, width);
    const byCat = show ? categoryImage(show.category, width || 1500) : '';
    if (byCat) return byCat;
    return show && show.imageSeed
      ? seededImage(show.imageSeed + '-w', width || 1500, Math.round((width || 1500) * 0.5625))
      : imageUrl('wide', null, width);
  };
  const showPoster = (show) => {
    if (show && (show.poster || show.image)) return imageUrl('poster', show.poster || show.image);
    const byCat = show ? categoryPoster(show.category) : '';
    if (byCat) return byCat;
    return show && show.imageSeed ? seededImage(show.imageSeed + '-p', 520, 780) : imageUrl('poster', null);
  };
  const artistAvatar = (artist) => imageUrl('avatar', artist && artist.avatar);

  return {
    // jeu brut, pour les surfaces qui parcourent le catalogue
    fixtures, taxonomy,
    // langue et pays
    get locale() { return locale; },
    setLocale(next) { locale = next; return locale; },
    get viewerCountry() { return viewerCountry; },
    setViewerCountry(next) { viewerCountry = next; return viewerCountry; },
    t, label, enumLabel, content,
    // contenu
    title, synopsis, cast: castOf, bio, chapterLabel, chatText,
    // horloge
    now, nowMinutes, dateAt, clock, venueClock, venueDiffers, dayLabel, longDate, when,
    countdown, duration, timecode,
    // nombres
    number, compact, price, priceOf, priceFrom,
    // état
    stateOf, stateLabel, isOnAir, isRoomOpen, progressOf, replayHoursLeft,
    outcomeLabel, replayLabel, chatLabel, seatsLabel, isSoldOut, roomOpensBefore,
    // droits et langue
    availableIn, rightsNote, blackoutReason, marketOf,
    languageDependency, languageLabel, languageLine, languageName,
    hasLanguageBarrier, isUnderstandable, datesInLanguage,
    // comptes
    ownedDates, owns, follows, resumeOf, isWatchable, catalogueFor,
    // requêtes
    show: (id) => byId.show[id] || null,
    artist: (id) => byId.artist[id] || null,
    venue: (id) => byId.venue[id] || null,
    date: (id) => byId.date[id] || null,
    account: (id) => byId.account[id] || null,
    showOf, artistOf, venueOf, runOf, runtimeOf,
    datesOfShow, seriesOf, datesOfArtist, liveNow, upcoming, replays, tonight,
    datesInCategory, datesInGenre, datesInRegion, datesWithTag, chatOf,
    // public et droits
    viewersOf, viewer, viewerOf, messageState, isVisible, canInvite, invitableRoles, activityOf,
    // abonnements, appareils, fuseaux
    plans, planOf, devicesOf, alertsOf, zoneAbbr, viewerZone,
    // studio
    person, channel, channelOf, channelOfDate, membersOf, crewOf, datesOfChannel,
    publicationOf, publicationState, publicationLabel, isLocked,
    payoutOf, payoutLabel, balanceOf, healthOf, moderationOf, messageById,
    merchOf, inboxOf, unreadCount, draftsOf, freelancers, roleLabel,
    // taxonomie
    category, categoriesOf, genre, genresOf, tag, tagLabel, tagsOf,
    attribute, attributeLabel, categoryOfShow, genreOfShow, matchTag, resolveTerm,
    // images
    imageUrl, seededImage, showImage, showPoster, artistAvatar, categoryImage, categoryPoster,
    // lecture bilingue, pour les surfaces qui basculent sans recharger
    contentIn, labelIn, titleIn, synopsisIn, castIn, bioIn
  };
}


export default createArthome;
