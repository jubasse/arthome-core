// Arthome — pont entre les fixtures partagées et les formes qu'attendent les
// deux régies (Studio et Studio Mobile).
//
// Les maquettes du studio ont été écrites avec leurs propres tables ; ce fichier
// produit exactement les mêmes formes à partir de fixtures.js, pour qu'il n'y ait
// plus qu'une seule source de vérité. Rien d'affiché ici : uniquement du
// remodelage de données.
//
//   const data = buildStudioData(A, fx);
//   data.directory   → [[nom, initiales, pseudo, poste, rôle, activité], …]
//   data.roster      → { 'Nom de chaîne': [[nom, init, mail, rôle, note, retirable], …] }
//   data.audience    → { 'Nom de chaîne': ['pseudo', …] }
//   data.liveChat    → { 'Nom de chaîne': [{ user, text, time, state }, …] }
//   data.chanSets    → { persona: [[nom, image, rôle, àLAntenne, propriétaire], …] }
//
// Les rôles du studio sont plus courts que ceux des fixtures : on garde la
// correspondance ici, une fois pour toutes.

export const ROLE_FROM_FIXTURE = {
  artist: 'artist', production: 'prod', coordination: 'coord',
  director: 'regie', video: 'regie', sound: 'regie',
  moderation: 'mod', treasury: 'tres'
};
export const ROLE_TO_FIXTURE = {
  artist: 'artist', prod: 'production', coord: 'coordination',
  regie: 'director', mod: 'moderation', tres: 'treasury'
};

const initialsOf = (name) => name.split(/[\s’']+/).map(w => w[0]).filter(Boolean).join('').slice(0, 2).toUpperCase();
const handleOf = (name) => '@' + name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 18);

export function buildStudioData(A, fx) {
  const studio = fx.studio || {};
  const channels = studio.channels || [];
  const byId = {};
  (fx.people || []).forEach(p => { byId[p.id] = p; });

  // ---------------------------------------------------------------- chaînes
  // La chaîne principale est celle qui est à l'antenne : une régie doit avoir
  // quelque chose à conduire. Les suivantes sont celles dont la prochaine date
  // est la plus proche.
  const live = A.liveNow();
  const liveChannelIds = live.map(d => d.publishedBy);
  const nextOf = (c) => {
    const dates = c.dates.map(id => A.date(id)).filter(d => d && d.startOffsetMin > 0)
      .sort((a, b) => a.startOffsetMin - b.startOffsetMin);
    return dates.length ? dates[0].startOffsetMin : Infinity;
  };
  const onAirChannels = channels.filter(c => liveChannelIds.indexOf(c.id) > -1);
  const offAir = channels.filter(c => liveChannelIds.indexOf(c.id) < 0 && c.dates.length)
    .sort((a, b) => nextOf(a) - nextOf(b));
  // Quatre chaînes suffisent au récit : une seule à l'antenne, trois autres
  // hors antenne et de disciplines différentes.
  const picked = [];
  const takenCategories = {};
  const take = (c) => {
    if (!c || picked.indexOf(c) > -1) return false;
    const artist = A.artist(c.artist);
    if (!artist) return false;
    if (takenCategories[artist.category]) return false;
    takenCategories[artist.category] = true; picked.push(c); return true;
  };
  take(onAirChannels[0]);
  offAir.forEach(c => { if (picked.length < 4) take(c); });
  offAir.forEach(c => { if (picked.length < 4 && picked.indexOf(c) < 0) picked.push(c); });

  const imageOf = (channel) => {
    const artist = A.artist(channel.artist);
    const dates = channel.dates.map(id => A.date(id)).filter(Boolean);
    const withShow = dates.map(d => A.show(d.show)).filter(Boolean)[0];
    return (withShow && A.showImage(withShow, 900)) || (artist && A.artistAvatar(artist)) || '';
  };
  const isOnAir = (channel) => liveChannelIds.indexOf(channel.id) > -1;

  // ------------------------------------------------------------- équipes


  // -------------------------------------------------------------- annuaire
  // Les indépendants d'abord : c'est eux qu'on cherche quand il manque un poste.
  const directory = (fx.people || []).filter(p => p.freelance).map(p => {
    const act = A.activityOf(p);
    const role = ROLE_FROM_FIXTURE[(p.roles || [])[0]] || 'regie';
    return [
      p.name, p.initials || initialsOf(p.name), handleOf(p.name),
      A.roleLabel((p.roles || [])[0]) + ' · ' + p.city, role,
      act.channels + ' chaînes · ' + act.runs + ' directs'
    ];
  });

  // ----------------------------------------------------- dates et personas
  const dateLabels = picked.length
    ? picked[0].dates.map(id => A.date(id)).filter(Boolean)
      .sort((a, b) => a.startOffsetMin - b.startOffsetMin)
      .map(d => A.title(A.show(d.show)) + ' · ' + A.dayLabel(d.startOffsetMin))
    : [];

  // Une personne ne voit que les chaînes où elle a un rôle : on compose donc un
  // jeu par persona, en cherchant qui, dans les équipes réelles, porte ce rôle.
  const chanSets = {};
  const PERSONAS = { artiste: 'artist', production: 'prod', regie: 'regie', moderation: 'mod', coordination: 'coord', tresorerie: 'tres' };
  const holdsRole = (c, want) => c.members.some(m => (ROLE_FROM_FIXTURE[m.role] || null) === want);
  Object.keys(PERSONAS).forEach(persona => {
    const want = PERSONAS[persona];
    // On ne montre une chaîne que si la personne y tient vraiment ce rôle.
    let rows = picked.filter(c => holdsRole(c, want))
      .map(c => [c.name, imageOf(c), want, isOnAir(c), want === 'artist']);
    // Aucune des quatre ne l'emploie à ce poste : on va chercher ailleurs, en
    // gardant la chaîne à l'antenne en tête si elle convient.
    if (!rows.length) {
      const elsewhere = channels.filter(c => holdsRole(c, want))
        .sort((a, b) => (isOnAir(b) ? 1 : 0) - (isOnAir(a) ? 1 : 0) || nextOf(a) - nextOf(b))
        .slice(0, 2);
      rows = elsewhere.map(c => [c.name, imageOf(c), want, isOnAir(c), want === 'artist']);
    }
    chanSets[persona] = rows;
  });

  const roster = {};
  const memberRow = (m) => {
    const person = m.person ? byId[m.person] : null;
    const role = ROLE_FROM_FIXTURE[m.role] || null;
    const note = m.owner
      ? 'Propriétaire, ne peut être retiré'
      : person && person.freelance
        ? 'Indépendant · ' + (person.channels || []).length + ' chaînes'
        : A.roleLabel(m.role);
    return [m.name, m.initials || initialsOf(m.name), m.email, role, note, !!m.removable];
  };
  // Toutes les chaînes citées quelque part dans le studio.
  const cited = picked.slice();
  Object.keys(chanSets).forEach(k => chanSets[k].forEach(row => {
    const c = channels.filter(x => x.name === row[0])[0];
    if (c && cited.indexOf(c) < 0) cited.push(c);
  }));
  cited.forEach(c => { roster[c.name] = c.members.map(memberRow); });

  // ---------------------------------------------------------------- public
  const audience = {};
  cited.forEach(c => { audience[c.name] = A.viewersOf(c).map(v => v.handle); });

  // ----------------------------------------------------------------- tchat
  const liveChat = {};
  cited.forEach(c => {
    const date = c.dates.map(id => A.date(id)).filter(d => d && A.isOnAir(d))[0]
      || c.dates.map(id => A.date(id)).filter(Boolean).sort((a, b) => b.startOffsetMin - a.startOffsetMin)[0];
    if (!date) { liveChat[c.name] = []; return; }
    liveChat[c.name] = A.chatOf(date).map(m => ({
      user: (A.viewerOf(m) || {}).handle || m.author,
      text: A.chatText(m),
      time: A.clock(date.startOffsetMin + m.atMin),
      // La régie ne voit que deux états : publié, ou retenu pour arbitrage.
      state: m.state === 'ok' ? 'ok' : 'held'
    }));
  });

  // ---------------------------------------------------------------- fuseaux
  const zones = {};
  (fx.zones || []).forEach(z => { zones[z.id] = [z.abbrSummer, z.utcOffsetMin / 60, z.city]; });
  const channelZone = {};
  cited.forEach(c => {
    const date = c.dates.map(id => A.date(id)).filter(Boolean)[0];
    const venue = date ? A.venue(date.venue) : null;
    channelZone[c.name] = (venue && venue.timezone) || 'Europe/Paris';
  });

  // ------------------------------------------------------------------ droits
  const grants = {};
  Object.keys(ROLE_TO_FIXTURE).forEach(short => {
    const full = ROLE_TO_FIXTURE[short];
    const allowed = (fx.grants || {})[full] || [];
    const mapped = allowed.map(r => ROLE_FROM_FIXTURE[r]).filter(Boolean);
    const unique = mapped.filter((r, i) => mapped.indexOf(r) === i && r !== short);
    if (unique.length) grants[short] = unique;
  });

  return {
    channels: picked, cited, directory, roster, audience, liveChat,
    chanSets, dateLabels, zones, channelZone, grants
  };
}

export default buildStudioData;
