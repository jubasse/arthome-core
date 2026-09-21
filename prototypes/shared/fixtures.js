// Arthome — génération des données fictives.
//
//   import { buildFixtures } from './fixtures.js';
//   const fixtures = buildFixtures({ catalogue });
//
// Deux couches :
//   1. le CATALOGUE RÉDIGÉ (catalogue.json) — seize spectacles écrits à la main,
//      leurs artistes et leurs salles : c'est ce qu'on voit en grand (billboard,
//      fiche, lecteur), donc la qualité y est authorée ;
//   2. le VOLUME GÉNÉRÉ — 12 à 20 artistes par catégorie, 3 à 10 spectacles
//      chacun, tournées et résidences, produit ici avec un tirage déterministe.
//
// Les dates sont posées sur l'horloge réelle à l'appel : tous les cas d'état
// existent à toute heure, et les cinq surfaces voient la même chose.
//
// Trois règles de cohérence tenues par le générateur :
//   · une salle n'accueille jamais deux spectacles en même temps ;
//   · un compte ne détient jamais deux directs qui se chevauchent ;
//   · une tournée garde son spectacle, une résidence garde sa salle.

import {
  minutesUntilNextClock,
  minutesUntilClock,
  seededRandom,
  createArthome
} from './helpers.js';

// ---------------------------------------------------------------------------
// Cas garantis, joués par les spectacles rédigés.
// intent : live-start · live · live-end · room-open · soon · tonight ·
//          tomorrow · next-week · replay · replay-expiring · past
// ---------------------------------------------------------------------------
const SCHEDULE = [
  { id: 'la-mouette-1', show: 'la-mouette', venue: 'criee', intent: 'live', at: [20, 30],
    prices: [26, 18, 45], replay: ['included', 41], chat: 'open', seats: 0, waitlist: 340,
    owned: ['camille'], attributes: ['revival'] },
  { id: 'la-mouette-2', show: 'la-mouette', venue: 'criee', intent: 'tonight', at: [22, 30],
    prices: [26, 18, 45], replay: ['included', 41], seats: 210 },
  { id: 'la-mouette-3', show: 'la-mouette', venue: 'bastille', intent: 'next-week', at: [20, 0],
    prices: [28, 19, 48], replay: ['included', 41], seats: 0, waitlist: 96 },

  { id: 'le-sacre-1', show: 'le-sacre-du-printemps', venue: 'opera-lille', intent: 'room-open', at: [20, 0],
    prices: [32, 22, 55], replay: ['included', 72], chat: 'open', seats: 86,
    owned: ['theo'], attributes: ['new-creation', 'opening-night'] },
  { id: 'le-sacre-2', show: 'le-sacre-du-printemps', venue: 'opera-lille', intent: 'tomorrow', at: [20, 0],
    prices: [32, 22, 55], replay: ['included', 72], seats: 240 },

  { id: 'nocturnes-1', show: 'nocturnes', venue: 'dynamo', intent: 'tonight', at: [22, 15],
    prices: [19, 14, 32], replay: ['included', 48], seats: 12 },
  { id: 'nocturnes-2', show: 'nocturnes', venue: 'dynamo', intent: 'next-week', at: [22, 15],
    prices: [19, 14, 32], replay: ['included', 48], seats: 180 },

  { id: 'carmen-1', show: 'carmen', venue: 'opera-lille', intent: 'replay',
    prices: [38, 26, 60], replay: ['included', 41], seats: 40,
    owned: ['camille', 'theo'], attributes: ['archive'] },
  { id: 'carmen-2', show: 'carmen', venue: 'opera-lille', intent: 'tonight', at: [19, 30],
    prices: [38, 26, 60], replay: ['included', 41], seats: 320 },

  { id: 'plateau-libre-1', show: 'plateau-libre', venue: 'point-virgule', intent: 'soon',
    prices: [22, 16, 38], replay: ['none', 0], chat: 'emoji', seats: 210 },

  { id: 'variations-goldberg-1', show: 'variations-goldberg', venue: 'sainte-marie', intent: 'live',
    prices: [18, 12, 30], replay: ['included', 72], chat: 'read-only', seats: 340,
    owned: ['theo'], incident: { kind: 'hold-screen', atFraction: -0.06, resolved: true, outcome: 'resumed' } },

  { id: 'gravite-1', show: 'gravite', venue: 'prado', intent: 'live-start',
    prices: [24, 17, 40], replay: ['included', 24], chat: 'open', seats: 44,
    owned: ['lea'], attributes: ['open-air'] },
  { id: 'gravite-2', show: 'gravite', venue: 'prado', intent: 'tomorrow', at: [16, 0],
    prices: [24, 17, 40], replay: ['included', 24], seats: 600 },

  { id: 'bal-moderne-1', show: 'bal-moderne', venue: 'tony-garnier', intent: 'tomorrow', at: [21, 0],
    prices: [16, 11, 28], replay: ['included', 72], seats: 150 },

  { id: 'quatre-mains-1', show: 'quatre-mains', venue: 'auditorium-bordeaux', intent: 'replay-expiring',
    prices: [20, 14, 34], replay: ['included', 12], seats: 90 },

  { id: 'la-traversee-1', show: 'la-traversee', venue: 'bastille', intent: 'replay',
    prices: [24, 17, 42], replay: ['included', 96], seats: 120,
    resume: { account: 'camille', fraction: 0.42 } },

  { id: 'set-d-ouverture-1', show: 'set-d-ouverture', venue: 'trianon', intent: 'live-end',
    prices: [29, 20, 48], replay: ['included', 48], chat: 'emoji', seats: 1200,
    owned: ['jonas'], attributes: ['opening-night'] },

  { id: 'giselle-1', show: 'giselle', venue: 'opera-lille', intent: 'tomorrow', at: [20, 0],
    prices: [34, 24, 58], replay: ['included', 72], seats: 0, waitlist: 340,
    owned: ['camille'], outcome: 'postponed', rescheduleDays: 7,
    incident: { kind: 'postponed', atFraction: -1.4, resolved: true, outcome: 'postponed' } },

  { id: 'hamlet-1', show: 'hamlet-ou-presque', venue: 'prospero', intent: 'next-week', at: [20, 0],
    prices: [26, 18, 45], replay: ['included', 72], seats: 300,
    blackout: { territories: ['FR', 'BE'], reason: 'co-production' } },

  { id: 'voix-basses-1', show: 'voix-basses', venue: 'saint-merri', intent: 'replay',
    prices: [15, 10, 26], replay: ['subscription', 200], seats: 60,
    resume: { account: 'theo', fraction: 0.11 } },

  { id: 'ellipse-1', show: 'ellipse', venue: 'cdn-besancon', intent: 'past', daysAgo: 6,
    prices: [21, 15, 36], replay: ['none', 0], seats: 0,
    owned: ['camille'], outcome: 'cancelled',
    incident: { kind: 'cancelled', atFraction: -0.3, resolved: true, outcome: 'cancelled' } },

  { id: 'le-grand-soir-1', show: 'le-grand-soir', venue: 'point-virgule', intent: 'past', daysAgo: 9,
    prices: [22, 16, 38], replay: ['none', 0], seats: 0,
    owned: ['camille'], outcome: 'interrupted',
    incident: { kind: 'interrupted', atFraction: 0.4, resolved: true, outcome: 'credited' } }
];

// ---------------------------------------------------------------------------
// Réservoirs de noms. Assemblés, jamais tirés au hasard mot à mot :
// chaque catégorie a sa façon de nommer ses artistes et ses spectacles.
// ---------------------------------------------------------------------------
// ---------------------------------------------------------------------------
// Réservoirs authorés. Rien de combinatoire : chaque catégorie a ses artistes
// crédibles, son répertoire (œuvres réelles, qu'une autre maison peut aussi
// jouer) et ses créations (titres originaux, propres à leur compagnie).
// ---------------------------------------------------------------------------
const POOLS = {
  theatre: {
    artists: ['Compagnie du Grand Manège', 'Collectif Terrain Vague', 'Théâtre de l’Ourse', 'Compagnie Sept Lieues',
      'Les Ateliers du Cerf', 'Compagnie Verticale', 'Collectif Chambre Noire', 'Théâtre du Pas de Côté',
      'Compagnie Marée Basse', 'Élise Vandamme', 'Compagnie Braise', 'Collectif Bruit Blanc',
      'Théâtre des Tuiles', 'Compagnie Fil Rouge', 'Marion Delaunay', 'Compagnie L’Ancre',
      'Théâtre de la Ligne 7', 'Collectif Quatre Murs', 'Compagnie Basse Tension', 'Aurélien Sarda'],
    repertoire: ['Le Misanthrope', 'Phèdre', 'Britannicus', 'Antigone', 'La Cerisaie', 'Oncle Vania',
      'Les Trois Sœurs', 'Ivanov', 'Le Malade imaginaire', 'L’Avare', 'Ruy Blas', 'Lorenzaccio',
      'Le Jeu de l’amour et du hasard', 'Les Fausses Confidences', 'La Locandiera', 'Hedda Gabler',
      'Une maison de poupée', 'Mademoiselle Julie', 'Woyzeck', 'Le Songe d’une nuit d’été',
      'Hamlet', 'Macbeth', 'La Tempête', 'Andromaque', 'Tartuffe', 'Dom Juan', 'Cyrano de Bergerac'],
    originals: ['Frontières', 'Le Poids des choses', 'Chambre 12', 'Ceux qui restent', 'Les Mains vides',
      'Ce qui nous tient', 'Vingt-deux heures', 'Le Dernier Train', 'Sans témoin', 'Les Invisibles',
      'Terrain vague', 'Nord', 'Rien de grave', 'La Part du feu', 'Trois maisons']
  },
  dance: {
    artists: ['Ballet de la Loire', 'CCN de Grenoble', 'Compagnie Cadence', 'Collectif Appui',
      'Compagnie Basalte', 'Ballet du Rhône', 'Compagnie Sillage', 'Collectif Plancher',
      'Compagnie Onde', 'Ballet de Provence', 'Compagnie Cinquième Étage', 'Collectif Trame',
      'Compagnie Ligne Claire', 'Ballet des Cévennes', 'Compagnie Ressac', 'Collectif Contretemps',
      'Compagnie Mue', 'Ballet de Garonne', 'Compagnie Souffle Court', 'Collectif Bas-Relief'],
    repertoire: ['Le Lac des cygnes', 'Casse-Noisette', 'Coppélia', 'Don Quichotte', 'La Bayadère',
      'La Sylphide', 'Paquita', 'Raymonda', 'Le Corsaire', 'Roméo et Juliette', 'Petrouchka',
      'L’Oiseau de feu', 'Boléro', 'Les Sylphides', 'La Fille mal gardée'],
    originals: ['Vertige', 'Lignes', 'Terrain', 'Mue', 'Halo', 'Sillon', 'Bloc', 'Écho', 'Trajectoires',
      'Corps sombres', 'Appui', 'Rive', 'Contretemps', 'Plancher', 'Ressac', 'Onde', 'Cadence',
      'Bas-relief', 'Souffle court', 'Deuxième peau']
  },
  circus: {
    artists: ['Cirque Bascule', 'Compagnie Contrepoids', 'Collectif Trapèze Nu', 'Cirque des Marées',
      'Compagnie Sans Filet', 'Collectif Élévation', 'Cirque du Perche', 'Compagnie Prise d’Air',
      'Collectif Vertical', 'Cirque Cerceau', 'Compagnie Mât Nu', 'Collectif Portés Lents',
      'Cirque de la Fabrique', 'Compagnie Chute Douce', 'Collectif Fil Tendu', 'Cirque Nomade',
      'Compagnie Bascule Haute', 'Collectif Ancrage', 'Cirque Rebond', 'Compagnie Trois Mètres'],
    repertoire: [],
    originals: ['Portés', 'Chute libre', 'Le Fil', 'Vertical', 'Suspens', 'Contrepoids', 'Sans filet',
      'Trajectoire', 'Bascule', 'Élévation', 'Prise', 'Appel d’air', 'Le Grand Manège', 'Rebond',
      'Ancrage', 'Cordes', 'Mât', 'Trois mètres', 'Nuit de cirque', 'Les Équilibres']
  },
  comedy: {
    artists: ['Nadia Belkacem', 'Guillaume Ferré', 'Awa Diallo', 'Théo Marceau', 'Clara Bonnet',
      'Samir Haddad', 'Lucie Ravel', 'Bastien Corre', 'Inès Zerrouki', 'Élodie Pons',
      'Hugo Bertin', 'Fanny Delorme', 'Ryad Amrani', 'Céline Vasseur', 'Tarek Mansour',
      'Jade Rimet', 'Nicolas Perreau', 'Sofia Barone', 'Malik Ouedraogo', 'Anaïs Trémel'],
    repertoire: [],
    originals: ['Seul en scène', 'Rien à déclarer', 'Deuxième service', 'Tout va bien', 'Sans filtre',
      'Ce sera long', 'Debout', 'Encore', 'Trois quarts d’heure', 'Chauffage compris', 'Presque prêt',
      'À voix haute', 'Ni vu ni connu', 'Grandes lignes', 'Micro ouvert', 'Dernier rappel',
      'Un peu de tenue', 'Complet', 'La Deuxième Heure', 'Sans notes']
  },
  opera: {
    artists: ['Opéra de Garonne', 'Atelier lyrique de Provence', 'Opéra du Ponant', 'Théâtre lyrique de Loire',
      'Opéra des Cévennes', 'Ensemble lyrique Aurore', 'Opéra de Beauce', 'Compagnie lyrique Sirène',
      'Opéra du Jura', 'Atelier lyrique de Camargue', 'Ilaria Costa', 'Mathilde Auger',
      'Enzo Ferrandi', 'Klara Nowak', 'Diego Salas', 'Anne-Sophie Berger', 'Youn-Ha Kim',
      'Rafael Duarte', 'Opéra de la Sarthe', 'Chœur lyrique du Nord'],
    repertoire: ['Tosca', 'La Traviata', 'Rigoletto', 'Orfeo', 'Didon et Énée', 'Les Noces de Figaro',
      'La Flûte enchantée', 'Norma', 'Lucia di Lammermoor', 'Pelléas et Mélisande', 'Le Barbier de Séville',
      'Alcina', 'Jules César', 'Werther', 'Faust', 'Manon', 'Les Contes d’Hoffmann', 'La Bohème',
      'Madame Butterfly', 'Cosi fan tutte', 'Don Giovanni', 'Fidelio', 'L’Élixir d’amour', 'Le Vaisseau fantôme'],
    originals: ['Le Cri des oiseaux', 'Sirène', 'Quatre nuits', 'La Chambre haute']
  },
  musical: {
    artists: ['Troupe du Grand Hôtel', 'Compagnie Music-hall du Nord', 'Les Chœurs du Ponant',
      'Troupe Étoile Filante', 'Compagnie Salle Comble', 'Les Baladins de Loire', 'Troupe Cabaret Bleu',
      'Compagnie Deux Tickets', 'Les Voix du Port', 'Troupe Lumière Noire', 'Compagnie Rideau Rouge',
      'Les Fanfares de Garonne', 'Troupe Paris-Nord', 'Compagnie Dernière Séance', 'Les Artificiers',
      'Troupe Bal Masqué', 'Compagnie Coulisses', 'Les Enfants du Music-hall', 'Troupe Éclat',
      'Compagnie Belle Époque'],
    repertoire: ['L’Opéra de quat’sous', 'La Belle Hélène', 'La Vie parisienne', 'Orphée aux enfers'],
    originals: ['Grand Hôtel', 'Music-hall', 'Revue de nuit', 'Les Années folles', 'Cabaret du port',
      'Deux tickets', 'La Dernière Séance', 'Chœur de ville', 'Paris-Nord', 'Salle comble',
      'Étoile filante', 'Bal masqué', 'Rideau rouge', 'Belle Époque', 'Coulisses']
  },
  performance: {
    artists: ['Studio Latence', 'Laboratoire Périmètre', 'Collectif Signal', 'Studio Sonde',
      'Collectif Champ Libre', 'Laboratoire Boucle', 'Studio Relevé', 'Collectif Station',
      'Laboratoire Écoute', 'Studio Protocole', 'Alma Ricci', 'Emil Vandenberg', 'Naïma Sissoko',
      'Gaspard Weiss', 'Iris Lindqvist', 'Selim Kaya', 'Faustine Roux', 'Amir Nazari',
      'Zoé Lambert', 'Elias Varga'],
    repertoire: [],
    originals: ['Protocole', 'Durée', 'Salle vide', 'Boucle', 'Signal', 'Sonde', 'Champ', 'Relevé',
      'Station', 'Périmètre', 'Écoute', 'Latence', 'Trois heures', 'Sans public', 'Dispositif',
      'Zone', 'Séance de travail', 'Contretemps sonore']
  },
  classical: {
    artists: ['Orchestre de Loire', 'Orchestre national de Garonne', 'Ensemble Aurore', 'Quatuor Vosges',
      'Orchestre de chambre du Ponant', 'Ensemble Basalte', 'Chœur de Beauce', 'Quatuor Morvan',
      'Orchestre des Cévennes', 'Ensemble Clavecin Bleu', 'Hélène Aubry', 'Viktor Kaczmarek',
      'Jeanne Berthier', 'Tomás Olivares', 'Nils Lindqvist', 'Camille Ferrandi',
      'Orchestre du Jura', 'Ensemble Vent d’Ouest', 'Quatuor Camargue', 'Chœur du Perche'],
    repertoire: ['Symphonie n° 4', 'Symphonie n° 7', 'Symphonie n° 9', 'Les Quatre Saisons', 'Messe en si',
      'Requiem', 'Quatuor « La Jeune Fille et la Mort »', 'Concerto pour piano n° 2',
      'Passion selon saint Jean', 'Vêpres', 'Quintette « La Truite »', 'Nuits d’été', 'Récital Chopin',
      'Récital Schubert', 'Récital Debussy', 'Le Clavier bien tempéré', 'Suites pour violoncelle',
      'Le Carnaval des animaux', 'Boléro', 'Pierre et le Loup', 'Water Music', 'Le Messie',
      'Symphonie fantastique', 'Concerto pour violon', 'Sonates du soir'],
    originals: ['Programme de nuit', 'Cycle Bach', 'Intégrale des sonates', 'Cartes blanches']
  },

  'soul-funk': {
    artists: ['Les Frères Boogie', 'Nouvelle Soul Society', 'Groove Machine', 'Funk Brigade',
      'Les Cuivres du Port', 'Gospel du Nord', 'Disco Ball Orchestra', 'Sweet Hours', 'Boogie Room',
      'Les Voix de Garonne', 'Awa Mercier', 'Elias Bonnet', 'Naïma Faye', 'Victor Olivares',
      'Sonia Duarte', 'Hugo Sissoko', 'Alma Petit', 'Ryad Belkacem', 'Clara Nakamura', 'Tarek Faye'],
    repertoire: ['Revue Motown', 'Hommage à Stax'],
    originals: ['Soul Revue', 'Groove Machine', 'Slow Jam', 'Gospel Night', 'Boogie Room',
      'Funk Assembly', 'Sweet Hours', 'Disco Ball', 'Cuivres à l’avant', 'Nuit soul',
      'Deux heures de groove', 'Sur le temps']
  },
  electronic: {
    artists: ['Kaolin', 'Orbe', 'Nadir', 'Sillage', 'Cobalt', 'Ozone', 'Halo', 'Brume', 'Lisière',
      'Basalte', 'Cyan', 'Écume', 'Givre', 'Indigo', 'Krypton', 'Mistral', 'Noria', 'Onyx',
      'Prisme', 'Quartz'],
    repertoire: [],
    originals: ['Nuit blanche', 'Machines', 'Basse fréquence', 'Modulaire', 'Warehouse', 'Rave d’été',
      'Live A/V', 'Boucle courte', 'Sous-sol', 'Signal fort', 'Dernier train', 'Aube', 'Tunnel',
      'Hangar', 'Cycle', 'Sept heures', 'Résidence', 'Salle blanche']
  },

  rap: {
    artists: ['Selim K', 'Nairo', 'Zed', 'Kayss', 'Amir T', 'Douze', 'Nord-Est', 'Rimet',
      'Vasco', 'Faya', 'Loya', 'Neyma', 'Tarek B', 'Sokri', 'Wali', 'Zeyn', 'Boussa',
      'Marek D', 'Sultane', 'Deux Micros'],
    repertoire: [],
    originals: ['Freestyle 12', 'Sortie d’album', 'Open mic', 'Battle du Nord', 'Deux micros',
      'Session live', 'Studio ouvert', 'Cypher', 'Premier jet', 'Dernière prise', 'Cent mesures',
      'Face B', 'Live et impro', 'Plateau rap']
  },
  pop: {
    artists: ['Lou Vasseur', 'Nina Delorme', 'Camille Ferré', 'Elias Ravel', 'Salomé Berthier',
      'Victor Aubry', 'Naïma Bonnet', 'Hugo Delaunay', 'Iris Petit', 'Sacha Moreau',
      'Zoé Vandamme', 'Théo Barone', 'Faustine Girard', 'Amir Doucet', 'Clara Lemoine',
      'Nils Faye', 'Alma Corre', 'Selim Ravel', 'Louise Nakamura', 'Marin Aubert'],
    repertoire: [],
    originals: ['Nouvel album', 'Chansons d’hiver', 'Acoustique', 'Piano-voix', 'Tournée des villes',
      'Première partie', 'Reprises', 'Été indien', 'Douze titres', 'Sur scène', 'Duos',
      'Cœur léger', 'Nuit douce', 'Le Grand Écart']
  },
  rock: {
    artists: ['Marées Noires', 'Les Fauves du Nord', 'Halo Sombre', 'Bruit Blanc', 'Cavale',
      'Les Grues', 'Novembre Rouge', 'Trois Quarts Nord', 'Les Vitrines', 'Fracas',
      'Orage Léger', 'Les Serres', 'Tôle Froide', 'Passage Nord', 'Les Cendres',
      'Vitesse Douce', 'Les Volières', 'Rue Basse'],
    repertoire: [],
    originals: ['Nouvel album', 'Les nuits blanches', 'Tour de chauffe', 'Retour de scène',
      'Second souffle', 'À guichets ouverts', 'Live intégral', 'Contre-jour', 'Sortie de route',
      'Grand large', 'Verticale', 'Dernier train']
  },
  metal: {
    artists: ['Enclume', 'Sépulture Nord', 'Fer Noir', 'Crypte', 'Lame de Fond',
      'Mille Cendres', 'Onde Sombre', 'Braise', 'Colosse', 'Nuit Fauve',
      'Acier Liquide', 'Hors Sol', 'Le Gouffre', 'Vertèbre', 'Marteau Blanc',
      'Cirrus Noir', 'Basse Terre', 'Écorce'],
    repertoire: [],
    originals: ['Rituel', 'Fonte', 'Sous la terre', 'Antre', 'Charbon', 'Onde de choc',
      'Le Poids du fer', 'Nuit minérale', 'Fracture', 'Cataclysme', 'Racines profondes']
  },
  chanson: {
    artists: ['Camille Ferré', 'Jonas Delorme', 'Ninon Baye', 'Tristan Aubert', 'Solveig Marin',
      'Abel Trégor', 'Louise Vanel', 'Hector Sauvage', 'Mila Roque', 'Étienne Barral',
      'Colombe Nadal', 'Simon Ferré', 'Alba Corti', 'Gaspard Nery', 'Rose Vidal',
      'Julien Mora', 'Anouk Vasseur', 'Léon Tardy'],
    repertoire: [],
    originals: ['Rue de la Paix', 'Le temps qu’il faut', 'Chansons d’ici', 'Plein hiver',
      'Douze histoires', 'Sur le quai', 'Les mots simples', 'Ce qui reste', 'À voix basse',
      'Le dernier tour', 'Petites formes']
  },
  'folk-country': {
    artists: ['Vallée Sèche', 'Route 7', 'Les Frères Baye', 'Grange Ouverte', 'Alma Wilder',
      'Trio Bois Flotté', 'Les Hautes Herbes', 'Nord Sauvage', 'Callie Renard', 'Foin Coupé',
      'Les Rives Basses', 'Attelage', 'Colline Verte', 'Sable Blanc', 'Bertrand Loew',
      'Les Bruyères'],
    repertoire: [],
    originals: ['Vallée sèche', 'Chemins de traverse', 'Route de nuit', 'Grange ouverte',
      'Le vieux pont', 'Terres hautes', 'Passage à gué', 'Les foins', 'Bois flotté',
      'Vent d’ouest']
  },
  rnb: {
    artists: ['Naya Sol', 'Éliott Moore', 'Sïa Mendy', 'Kayo Belle', 'Théo Nkosi',
      'Layla Rives', 'Ines Marra', 'Djino', 'Amara Sy', 'Nour Delva',
      'Sonny Bao', 'Maya Feld', 'Ilan Rey', 'Zora Mensah', 'Kalyn', 'Jude Amar'],
    repertoire: [],
    originals: ['Velours', 'Après minuit', 'Ondes courtes', 'Doux amer', 'Nuit tiède',
      'Contre-temps', 'Peau claire', 'Slow set', 'Maison vide', 'Sucre brûlé']
  },
  'soul-funk': {
    artists: ['Grand Orchestre Cuivré', 'Gospel du Nord', 'Les Frères Motown', 'Fanfare Soul de Lille',
      'Collectif P-Funk Atlantique', 'Chœur Gospel de Garonne', 'Disco Marée', 'Les Cuivres du Sud',
      'Sister Belle', 'Funk Brigade', 'Nord Soul Revue', 'Groove Continental',
      'Chorale Gospel de Lyon', 'Les Étoiles Funk', 'Motown Léger', 'Soul Machine'],
    repertoire: [],
    originals: ['Revue Motown', 'Nuit soul', 'Grand cuivre', 'Groove intégral', 'Gospel de minuit',
      'Disco Marée', 'Sept cuivres', 'Sueur douce', 'Le Grand Groove']
  },
  jazz: {
    artists: ['Sanhu Trio', 'Quartet Nord', 'Ensemble Modal', 'Big Band de la Loire',
      'Trio Verticale', 'Nadia Kerr Quintet', 'Collectif Souffle', 'Manouche du Marais',
      'Quatuor Bleu', 'Orchestre Libre', 'Trio Nuit Claire', 'Bebop Brigade',
      'Ensemble Spirituel', 'Sextet Fusion', 'Voix et Contrebasse', 'Afro Jazz Collectif',
      'Trio Cordes Chaudes', 'Nonette Sud'],
    repertoire: [],
    originals: ['Nocturnes', 'Set d’ouverture', 'Modal', 'Cordes', 'Souffle court',
      'Standards revisités', 'Trois formes', 'Libre', 'Après le set', 'Chambre jazz']
  },
  blues: {
    artists: ['Delta Nord', 'Bayou Léger', 'Les Chiens Errants', 'Slide Atlantique',
      'Hattie Mills', 'Harpe et Caisse', 'Boogie du Port', 'Trio Fer Rouillé',
      'Chicago Loire', 'Les Barreaux', 'Sam Kirby', 'Blues de Fond',
      'Résonateur', 'Douze Mesures', 'Nuit Bleue', 'Les Arpèges Sales'],
    repertoire: [],
    originals: ['Douze mesures', 'Delta', 'Boogie de minuit', 'Slide', 'Fer rouillé',
      'Nuit bleue', 'Barreaux', 'Le long du fleuve', 'Résonateur']
  },
  reggae: {
    artists: ['Racines Dub', 'Sound System Atlantique', 'Les Positifs', 'Dub Station Nord',
      'Ital Brothers', 'Kaya Sound', 'Ska Machine', 'Rockers du Sud',
      'Dancehall Garonne', 'Basse Fondation', 'Les Rastas de Loire', 'Echo Chamber',
      'Riddim Collectif', 'Steppa', 'Dub Poets', 'Zion Léger'],
    repertoire: [],
    originals: ['Racines', 'Dub Session', 'Sound System', 'Steppa', 'Positive Vibes',
      'Echo', 'Rocksteady Night', 'Fondation', 'Riddim']
  },
  world: {
    artists: ['Ensemble Deux Rives', 'Orchestre Caravane', 'Collectif Racines', 'Ensemble Fleuve',
      'Fanfare des Balkans du Nord', 'Ensemble Gnawa de Marseille', 'Orchestre Andalou de Garonne',
      'Collectif Cordes du Sud', 'Ensemble Klezmer du Perche', 'Orchestre Tzigane de Loire',
      'Ensemble Carnatique de Paris', 'Collectif Zouk Atlantique', 'Ensemble Fado du Port',
      'Orchestre Afrobeat de Lyon', 'Collectif Salsa Garonne', 'Ensemble Sahel', 'Trio Oud et Cordes',
      'Fanfare de Camargue', 'Ensemble Qawwali du Nord', 'Collectif Bossa Loire'],
    repertoire: [],
    originals: ['Traversées', 'Cordes du Sud', 'Voix du fleuve', 'Rythmes croisés', 'Fanfare de nuit',
      'Racines', 'Chants de la vallée', 'Caravane', 'Deux rives', 'Fusion', 'Sahel',
      'Nuit andalouse', 'Le Grand Bal', 'Trois langues']
  }
};

const CITIES = [['Paris', 'FR-IDF'], ['Lyon', 'FR-ARA'], ['Marseille', 'FR-PAC'], ['Lille', 'FR-HDF'],
  ['Bordeaux', 'FR-NAQ'], ['Toulouse', 'FR-OCC'], ['Nantes', 'FR-PDL'], ['Strasbourg', 'FR-GES'],
  ['Rennes', 'FR-BRE'], ['Montpellier', 'FR-OCC'], ['Nice', 'FR-PAC'], ['Grenoble', 'FR-ARA'],
  ['Dijon', 'FR-BFC'], ['Angers', 'FR-PDL'], ['Reims', 'FR-GES'], ['Brest', 'FR-BRE'],
  ['Clermont-Ferrand', 'FR-ARA'], ['Rouen', 'FR-NOR'], ['Caen', 'FR-NOR'], ['Amiens', 'FR-HDF'],
  ['Tours', 'FR-CVL'], ['Orléans', 'FR-CVL'], ['Metz', 'FR-GES'], ['Pau', 'FR-NAQ']];
const VENUE_KINDS = [
  ['Théâtre municipal', 700], ['Scène nationale', 900], ['Le Grand Théâtre', 1200], ['La Halle', 1800],
  ['L’Opéra', 1300], ['Auditorium', 1500], ['La Friche', 600], ['Le Chapiteau', 800],
  ['Le Zénith', 6800], ['L’Arena', 13500], ['Le Stade', 42000], ['La Cartonnerie', 1100],
  ['Le Théâtre du Port', 1000], ['La Chapelle', 380], ['Le Cirque', 950], ['La Cave', 260],
  ['Le Conservatoire', 420], ['La Manufacture', 540], ['Le Silo', 1600], ['Le Kiosque', 300]
];
const CREW_FIRST = ['Ana', 'Karim', 'Léo', 'Maud', 'Nisha', 'Sacha', 'Ysée', 'Bruno', 'Salomé', 'Farid',
  'Jeanne', 'Marek', 'Awa', 'Nils', 'Inès', 'Tom', 'Lise', 'Odilon', 'Rim', 'Malo'];
const CREW_LAST = ['Vieira', 'Bellal', 'Marchand', 'Kessler', 'Rao', 'Manaud', 'Sézille', 'Barrault',
  'Fabre', 'Zaïdi', 'Ferrand', 'Nardin', 'Costa', 'Bréval', 'Escaffre', 'Aït', 'Oyono', 'Regnier'];

const RUNTIME = {
  theatre: [90, 180], dance: [60, 140], circus: [60, 100], comedy: [70, 110], opera: [120, 220],
  musical: [110, 160], performance: [45, 120], classical: [60, 130], jazz: [70, 120],
  blues: [75, 110], reggae: [90, 140], 'soul-funk': [80, 120], electronic: [90, 180],
  rock: [90, 150], metal: [95, 155], rap: [70, 110], rnb: [75, 115], pop: [80, 130],
  chanson: [80, 120], 'folk-country': [80, 120], world: [80, 130]
};
const PRICE = {
  theatre: [26, 18, 45], dance: [30, 21, 52], circus: [24, 17, 40], comedy: [22, 16, 38],
  opera: [42, 29, 68], musical: [38, 26, 60], performance: [18, 13, 30], classical: [28, 19, 46],
  jazz: [24, 17, 40], blues: [22, 16, 36], reggae: [26, 18, 42], 'soul-funk': [26, 18, 42],
  electronic: [29, 20, 48], rock: [34, 24, 55], metal: [36, 25, 58], rap: [30, 21, 50],
  rnb: [32, 22, 52], pop: [38, 26, 60], chanson: [28, 19, 46], 'folk-country': [24, 17, 40],
  world: [24, 17, 40]
};
/* Le tarif d'une date dépend aussi de la salle : un club de 300 places et un
   stade de 40 000 ne demandent pas le même prix pour le même spectacle. */
const VENUE_TIER = (capacity) => capacity >= 15000 ? 1.5
  : capacity >= 5000 ? 1.25
  : capacity >= 1200 ? 1
  : capacity >= 500 ? 0.85
  : 0.7;
/* Photos propres à la discipline d'abord, puis un fond commun de scènes et de
   salles : une page qui n'affiche qu'une discipline doit tenir sans répéter la
   même image toutes les six cartes. Toute la réserve a été passée en revue. */
const GENERIC = ['emptystage', 'lights', 'backlight', 'gignight', 'crowd', 'gigcrowd',
  'openaudience', 'festival', 'smoke', 'confetti', 'micstand', 'smallstage'];
const OWN = {
  theatre: ['curtain', 'auditorium', 'dancers', 'micvintage', 'score'],
  dance: ['ballet', 'dance', 'dancers', 'strings'],
  circus: ['smoke', 'confetti', 'dancers', 'crowdpurple'],
  comedy: ['emptystage', 'micstand', 'micvintage', 'auditorium', 'micred'],
  opera: ['opera', 'strings', 'auditorium', 'curtain', 'score', 'grandpiano', 'cello'],
  musical: ['lights', 'confetti', 'bandstage', 'curtain', 'singer', 'dancers'],
  performance: ['dancers', 'smoke', 'drumstudio', 'emptystage', 'micstand'],
  classical: ['strings', 'grandpiano', 'cello', 'score', 'piano', 'opera', 'auditorium'],
  jazz: ['jazz', 'grandpiano', 'cello', 'drumkit', 'micvintage', 'piano', 'score'],
  blues: ['acoustic', 'guitar', 'micvintage', 'countryband', 'neonsign', 'drumkit'],
  reggae: ['crowdpurple', 'crowdpurple2', 'drumkit', 'micred', 'neonsign'],
  'soul-funk': ['micstand', 'singer', 'micred', 'bandstage', 'jazz', 'piano'],
  electronic: ['dj', 'neonsign', 'pyro', 'crowdpurple', 'crowdpurple2', 'backlight'],
  rock: ['bandstage', 'guitar', 'drumkit', 'neonsign', 'acoustic', 'micred'],
  metal: ['pyro', 'drumkit', 'bandstage', 'neonsign', 'guitar'],
  rap: ['micred', 'micstand', 'micvintage', 'crowdpurple', 'neonsign'],
  rnb: ['singer', 'micvintage', 'micstand', 'crowdpurple', 'grandpiano', 'bandstage'],
  pop: ['confetti', 'singer', 'bandstage', 'crowdpurple2', 'micred'],
  chanson: ['micvintage', 'grandpiano', 'acoustic', 'piano', 'micstand', 'acousticgirl'],
  'folk-country': ['countryband', 'acousticgirl', 'guitar', 'acoustic', 'score', 'drumkit'],
  world: ['jazz', 'drumkit', 'dancers', 'acousticgirl', 'strings']
};
/* La liste effective : le propre, puis le générique, sans doublon. */
const IMAGE = Object.keys(OWN).reduce((acc, k) => {
  acc[k] = OWN[k].concat(GENERIC.filter(g => OWN[k].indexOf(g) < 0));
  return acc;
}, {});

/* Poids de programmation : ce que ces disciplines représentent réellement dans
   une saison française. Un rayon metal ou blues n'a pas le volume d'un rayon
   théâtre, et un catalogue qui l'ignorerait sonnerait faux. */
/* Quelles disciplines relèvent des musiques : sert au choix du vocabulaire
   (titres, synopsis) — le théâtre ne se raconte pas comme un concert. */
const MUSIC_UNIVERSE = ['rock', 'metal', 'pop', 'chanson', 'folk-country', 'rap', 'rnb',
  'soul-funk', 'electronic', 'jazz', 'blues', 'reggae', 'world', 'classical'];

const WEIGHT = {
  theatre: 1.6, dance: 1.2, circus: 0.9, comedy: 1.2, opera: 0.7, musical: 0.6,
  performance: 0.7, classical: 1.1, jazz: 1.0, blues: 0.4, reggae: 0.5,
  'soul-funk': 0.5, electronic: 1.1, rock: 1.3, metal: 0.7, rap: 1.2, rnb: 0.5,
  pop: 1.3, chanson: 1.0, 'folk-country': 0.4, world: 0.9
};

/* Pays et langue : deux axes distincts. Un artiste belge chante en français,
   un français en anglais. Les poids reflètent une programmation française. */
const ORIGINS = [
  ['FR', ['fr'], 0.72], ['BE', ['fr', 'nl'], 0.06], ['CH', ['fr', 'de'], 0.03],
  ['CA', ['fr', 'en'], 0.03], ['GB', ['en'], 0.05], ['US', ['en'], 0.04],
  ['DE', ['de'], 0.02], ['ES', ['es'], 0.02], ['IT', ['it'], 0.01],
  ['SN', ['fr', 'wo'], 0.01], ['ML', ['fr'], 0.01]
];
/* Certaines disciplines sont majoritairement anglophones sur nos scènes. */
const ANGLO = { rock: 0.5, metal: 0.6, 'folk-country': 0.7, blues: 0.7, reggae: 0.4, rnb: 0.45, pop: 0.35 };
const LATIN = { world: 0.5 };
const DEPENDENCY = {
  theatre: 'essential', comedy: 'essential', musical: 'helpful', opera: 'helpful',
  performance: 'helpful', dance: 'none', circus: 'none', classical: 'none',
  jazz: 'none', blues: 'none', reggae: 'none', 'soul-funk': 'none', electronic: 'none',
  rock: 'none', metal: 'none', rap: 'essential', rnb: 'helpful', pop: 'helpful',
  chanson: 'essential', 'folk-country': 'helpful', world: 'none'
};

export function buildFixtures(options) {
  const opts = options || {};
  const catalogue = opts.catalogue;
  if (!catalogue) throw new Error('buildFixtures : catalogue.json manquant');
  const taxonomy = opts.taxonomy || null;      // facultatif : élargit les genres visés
  const nowFn = opts.now || (() => new Date());
  // Époque : l'horloge arrondie au palier inférieur (2 h par défaut).
  // Toutes les dates se placent par rapport à elle, jamais par rapport à
  // l'instant exact du chargement — deux surfaces ouvertes à quelques minutes
  // d'écart, ou un rechargement, voient donc le même calendrier. Seule la
  // progression d'un direct avance, ce qui est le comportement attendu.
  const grain = opts.epochGrainMin == null ? 120 : opts.epochGrainMin;
  const epochAt = () => {
    const d = new Date(nowFn().getTime());
    d.setSeconds(0, 0);
    if (grain > 0) {
      const minutes = d.getHours() * 60 + d.getMinutes();
      const floored = Math.floor(minutes / grain) * grain;
      d.setHours(Math.floor(floored / 60), floored % 60);
    }
    return d;
  };
  const nowFloor = () => { const d = new Date(nowFn().getTime()); d.setSeconds(0, 0); return d; };
  const epochShift = Math.round((epochAt() - nowFloor()) / 60000);   // ≤ 0, en minutes pleines
  const rand = seededRandom(opts.seed == null ? 20260909 : opts.seed);
  const scale = opts.scale === 'light' ? 0.4 : 1;

  const between = (min, max) => min + rand() * (max - min);
  const intBetween = (min, max) => Math.floor(between(min, max + 1));
  const pick = (list) => list[Math.floor(rand() * list.length) % list.length];
  const slug = (s) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[’']/g, '').replace(/[^A-Za-z0-9]+/g, '-').replace(/^-+|-+$/g, '').toLowerCase();

  const market = (catalogue.geography.billingMarkets || [])[0] || { id: 'eur', currency: 'EUR' };
  const roomOpens = (catalogue.time && catalogue.time.roomOpensBeforeMin) || 30;

  // Hachage stable d'une chaîne de caractères : sert aux choix qui doivent
  // rester identiques d'un chargement à l'autre sans toucher au tirage.
  const hash = (str) => {
    let h = 2166136261;
    for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = (h * 16777619) >>> 0; }
    return h;
  };


  // ===========================================================================
  // CÔTÉ STUDIO — ce que les chaînes décident et publient
  // ===========================================================================

  // ------------------------------------------------------------- annuaire
  // Les personnes existent une fois et sont référencées partout : équipe de
  // régie, membres d'une chaîne, modération, annuaire des indépendants.
  const people = [];
  const personByName = {};
  const personById = {};
  const addPerson = (name, roles, city, freelance, dayRate) => {
    const id = 'person:' + slug(name);
    if (personByName[name]) return personByName[name];
    const p = { id, name, roles: roles.slice(), city, freelance: !!freelance };
    if (dayRate) p.dayRateEur = dayRate;
    people.push(p); personByName[name] = id; personById[id] = p;
    return id;
  };
  (catalogue.peoplePool || []).forEach(([name, roles, city]) => addPerson(name, roles, city, false));
  (catalogue.freelancePool || []).forEach(([name, roles, city, rate]) => addPerson(name, roles, city, true, rate));
  const CAP = { channels: 8, runs: 60 };
  const load = {};
  const loadOf = (id) => (load[id] = load[id] || { channels: {}, channelCount: 0, runs: 0 });
  const HOME_CITIES = ['Paris', 'Lyon', 'Marseille', 'Lille', 'Bordeaux', 'Nantes', 'Toulouse', 'Rennes',
    'Strasbourg', 'Nice', 'Montpellier', 'Dijon', 'Grenoble', 'Reims', 'Angers', 'Rouen', 'Caen', 'Brest'];
  let recruited = 0;
  // Trouve quelqu'un pour un poste, ou recrute : l'annuaire grandit avec le
  // catalogue au lieu de faire tenir cinquante chaînes à la même personne.
  const findPerson = (role, wantFreelance, channelId) => {
    const free = people.filter(p => {
      if (p.roles.indexOf(role) < 0 || !!p.freelance !== !!wantFreelance) return false;
      const l = loadOf(p.id);
      return l.runs < CAP.runs && (l.channels[channelId] || l.channelCount < CAP.channels);
    });
    let p = free.length ? free[Math.floor(between(0, free.length)) % free.length] : null;
    if (!p) {
      recruited++;
      const base = pick(CREW_FIRST) + ' ' + pick(CREW_LAST);
      let unique = base, n = 2;
      while (personByName[unique]) { unique = base + ' ' + n; n++; }
      const id = addPerson(unique, [role], pick(HOME_CITIES), wantFreelance, wantFreelance ? intBetween(280, 720) : 0);
      p = personById[id];
      p.email = slug(p.name).replace(/-/g, '.') + (p.freelance ? '@independant.fr' : '@arthome.fr');
      p.initials = p.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
      p.channels = []; p.runsCalled = 0;
    }
    const l = loadOf(p.id);
    if (!l.channels[channelId]) { l.channels[channelId] = true; l.channelCount++; }
    l.runs++;
    return p;
  };

  people.forEach(p => {
    p.email = slug(p.name).replace(/-/g, '.') + (p.freelance ? '@independant.fr' : '@arthome.fr');
    p.initials = p.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
    // Renseignés une fois les chaînes et les dates connues.
    p.channels = []; p.runsCalled = 0;
  });


  // ---------------------------------------------------------------- salles
  const venues = catalogue.venues.slice();
  const venueById = {}; venues.forEach(v => { venueById[v.id] = v; });
  CITIES.forEach((city, ci) => {
    const count = intBetween(1, 3);
    for (let k = 0; k < count; k++) {
      const kind = VENUE_KINDS[(ci * 3 + k) % VENUE_KINDS.length];
      const name = kind[0] + ' de ' + city[0];
      const id = slug(name);
      if (venueById[id]) continue;
      const v = { id, name: kind[0], city: city[0], country: 'FR', region: city[1],
        timezone: 'Europe/Paris', utcOffsetMin: 120,
        capacity: Math.round(kind[1] * between(0.85, 1.15)) };
      venues.push(v); venueById[id] = v;
    }
  });
  const bigVenues = venues.filter(v => v.capacity >= 6000);
  const smallVenues = venues.filter(v => v.capacity < 6000);
  const midVenues = venues.filter(v => v.capacity >= 1000 && v.capacity < 6000);
  // Les grandes jauges sont réservées aux musiques amplifiées et au grand
  // format ; la scène dramatique reste dans les salles.
  const ARENA_CATEGORIES = ['electronic', 'rock', 'metal', 'rap', 'rnb', 'pop', 'soul-funk', 'reggae'];
  const stadiums = venues.filter(v => v.capacity >= 20000);
  const arenas = bigVenues.filter(v => v.capacity < 20000);
  // Un stade ne se remplit qu'avec une audience de stade.
  const venuePool = (categoryId, big, followers) => {
    if (big && ARENA_CATEGORIES.indexOf(categoryId) > -1) {
      if (followers > 700000 && stadiums.length) return stadiums;
      if (arenas.length) return arenas;
    }
    if (big && midVenues.length) return midVenues;
    return smallVenues;
  };


  // -------------------------------------------------------------- artistes
  const categories = taxonomy
    ? taxonomy.categories.map(c => ({ id: c.id, genres: c.genres.map(g => g.id) }))
    : Object.keys(NAMING).map(id => ({ id, genres: [null] }));

  const artists = catalogue.artists.slice();
  const artistById = {}; artists.forEach(a => { artistById[a.id] = a; });
  const usedNames = {}; artists.forEach(a => { usedNames[a.name] = true; });

  const avatarKeys = Object.keys(catalogue.images.avatars);
  categories.forEach(cat => {
    const pool = (POOLS[cat.id] || POOLS.theatre).artists;
    const authored = artists.filter(a => a.category === cat.id).length;
    const weight = WEIGHT[cat.id] != null ? WEIGHT[cat.id] : 1;
    const target = Math.min(pool.length + authored,
      Math.max(3, Math.round(intBetween(9, 15) * scale * weight)));
    let cursor = 0;
    for (let i = authored; i < target && cursor < pool.length; i++) {
      let name = null;
      while (cursor < pool.length && !name) {
        if (!usedNames[pool[cursor]]) name = pool[cursor];
        cursor++;
      }
      if (!name) break;
      usedNames[name] = true;
      let id = slug(name);
      if (artistById[id]) id = id + '-' + (i + 1);
      const tier = rand();
      const a = {
        id, name,
        avatar: avatarKeys[(i * 3 + cat.id.length) % avatarKeys.length],
        category: cat.id,
        genre: cat.genres[i % cat.genres.length] || null,
        followers: Math.round((ARENA_CATEGORIES.indexOf(cat.id) > -1
          ? (tier > 0.9 ? between(400000, 1600000)
            : tier > 0.72 ? between(90000, 380000)
            : tier > 0.4 ? between(14000, 86000)
            : between(1200, 12000))
          : (tier > 0.92 ? between(90000, 240000)
            : tier > 0.7 ? between(28000, 86000)
            : tier > 0.38 ? between(6000, 26000)
            : between(700, 5600)))),
        ...(() => {
          /* Une discipline anglophone tire davantage hors de France ; une
             discipline patrimoniale reste française. */
          const anglo = ANGLO[cat.id] || 0;
          const latin = LATIN[cat.id] || 0;
          const r = rand();
          let origin = ORIGINS[0];
          if (r < anglo) {
            const pool2 = ORIGINS.filter(o => o[1].indexOf('en') > -1);
            origin = pool2[Math.floor(between(0, pool2.length)) % pool2.length];
          } else if (r < anglo + latin) {
            const pool2 = ORIGINS.filter(o => ['es', 'it'].some(l => o[1].indexOf(l) > -1));
            origin = pool2.length ? pool2[Math.floor(between(0, pool2.length)) % pool2.length] : ORIGINS[0];
          } else {
            let acc = 0; const draw = rand();
            for (const o of ORIGINS) { acc += o[2]; if (draw <= acc) { origin = o; break; } }
          }
          const langs = origin[1];
          return {
            country: origin[0],
            countries: [origin[0]],
            languages: langs.slice(0, 1 + (rand() < 0.2 && langs.length > 1 ? 1 : 0)),
            contentLanguage: langs[0]
          };
        })(),
        bio: null, bioEn: null,
        generated: true
      };
      artists.push(a); artistById[id] = a;
    }
  });


  // ------------------------------------------------------------- chaînes
  // Une chaîne par artiste : c'est l'unité de travail du studio.
  const MEMBER_ROLES = catalogue.memberRoles || ['artist', 'production', 'director', 'sound', 'moderation'];
  const channels = artists.map(artist => {
    const id = 'channel:' + artist.id;
    // Le propriétaire, puis l'équipe permanente tirée de l'annuaire.
    const GRANTS = catalogue.grants || {};
    const grantsFor = (role) => (GRANTS[role] || []).slice();
    const members = [{
      id: id + ':member:1', person: null, artist: artist.id, name: artist.name,
      email: slug(artist.name).replace(/-/g, '.') + '@arthome.fr',
      initials: artist.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase(),
      role: 'artist', owner: true, removable: false,
      canInvite: grantsFor('artist').length > 0, canInviteRoles: grantsFor('artist'),
      joinedDaysAgo: intBetween(120, 1400)
    }];
    const teamSize = artist.followers > 240000 ? intBetween(4, 7) : intBetween(2, 4);
    const wanted = MEMBER_ROLES.filter(r => r !== 'artist');
    for (let i = 0; i < teamSize; i++) {
      const role = wanted[(i + artist.id.length) % wanted.length];
      const p = findPerson(role, false, id);
      if (members.some(m => m.person === p.id)) continue;
      members.push({
        id: id + ':member:' + (members.length + 1), person: p.id, artist: null, name: p.name,
        email: p.email, initials: p.initials,
        role, owner: false, removable: true,
        canInvite: grantsFor(role).length > 0, canInviteRoles: grantsFor(role),
        joinedDaysAgo: intBetween(20, 900)
      });
    }
    return {
      id, artist: artist.id, name: artist.name,
      members,
      // Renseignés après publication : une chaîne ne connaît son catalogue
      // qu'une fois ses spectacles créés et ses dates publiées.
      shows: [], dates: [],
      followers: artist.followers,
      // Abonnés gagnés sur les trente derniers jours : ce que le studio affiche.
      followersGained30d: Math.max(0, Math.round(artist.followers * between(0.004, 0.03))),
      verified: artist.followers > 40000,
      createdDaysAgo: intBetween(200, 1600)
    };
  });
  const channelByArtist = {}; channels.forEach(c => { channelByArtist[c.artist] = c; });


  // ----------------------------------------------------------- spectacles
  const shows = catalogue.shows.slice();
  const showById = {}; shows.forEach(s => { showById[s.id] = s; });
  const usedTitles = {}; shows.forEach(s => { usedTitles[s.title] = true; });
  const claimedOriginals = {};   // une création n'appartient qu'à une compagnie
  /* Compose un titre inédit quand la réserve rédigée d'une discipline est
     épuisée. Le français impose l'accord : l'article suit le genre du nom,
     l'adjectif aussi, une préposition appelle un déterminant, et « Le » devant
     une voyelle s'élide. Sans ces règles, on obtient « Le braise » ou
     « Sous nuit ». */
  const composeTitle = (artist, seedIndex) => {
    const universe = MUSIC_UNIVERSE.indexOf(artist.category) > -1 ? 'music' : 'stage';
    const bank = (catalogue.titleWords || {})[universe] || (catalogue.titleWords || {}).music;
    if (!bank || !bank.nouns || !bank.nouns.length) return artist.name + ' — ' + (seedIndex + 1);

    const cap = (w) => w.charAt(0).toUpperCase() + w.slice(1);
    const plural = (w) => (/[sxz]$/.test(w) ? w : w + 's');
    // Article défini, accordé et élidé.
    const theOf = (n) => (n.elide ? 'L’' + n.w : (n.g === 'f' ? 'La ' : 'Le ') + n.w);
    // Article indéfini, accordé.
    const oneOf = (n) => (n.g === 'f' ? 'Une ' : 'Un ') + n.w;

    for (let attempt = 0; attempt < 60; attempt++) {
      const salt = artist.id + ':' + seedIndex + ':' + attempt;
      const noun = bank.nouns[hash(salt + 'n') % bank.nouns.length];
      const shape = hash(salt + 's') % 5;
      let candidate;
      if (shape === 0) {
        candidate = cap(theOf(noun));
      } else if (shape === 1) {
        candidate = cap(oneOf(noun));
      } else if (shape === 2) {
        // Pluriel : l'article ne s'élide pas, le nom prend sa marque.
        candidate = 'Les ' + plural(noun.w);
      } else if (shape === 3) {
        const pair = bank.adjs[hash(salt + 'a') % bank.adjs.length];
        candidate = cap(noun.w) + ' ' + (noun.g === 'f' ? pair[1] : pair[0]);
      } else {
        // Une préposition appelle un déterminant, et le second nom diffère
        // toujours du premier.
        const other = bank.nouns.filter(x => x.w !== noun.w);
        const second = other[hash(salt + 'n2') % other.length];
        // Après une préposition, le déterminant reste en minuscule.
        const low = (w) => w.charAt(0).toLowerCase() + w.slice(1);
        candidate = hash(salt + 'p') % 2 === 0
          ? bank.preps[hash(salt + 'pp') % bank.preps.length] + ' ' + low(theOf(noun))
          : cap(noun.w) + ' et ' + low(theOf(second));
      }
      if (!claimedOriginals[candidate] && !usedTitles[candidate]) return candidate;
    }
    return artist.name + ' — ' + (seedIndex + 1);
  };
  const imageCursor = {};        // position dans la liste de photos de chaque discipline
  const synopsisCursor = {};     // position dans la réserve de synopsis de chaque discipline

  artists.filter(a => a.generated).forEach((artist, ai) => {
    const pool = POOLS[artist.category] || POOLS.theatre;
    const range = RUNTIME[artist.category] || [90, 140];
    const images = IMAGE[artist.category] || ['lights'];
    const dep = DEPENDENCY[artist.category] || 'helpful';
    const count = Math.max(3, Math.round(intBetween(3, 10) * scale));
    const mine = {};

    for (let i = 0; i < count; i++) {
      // Le répertoire se partage entre les maisons ; une création est unique.
      const wantRepertoire = pool.repertoire.length > 0 && rand() < 0.55;
      let title = null;
      /* Une œuvre du répertoire se joue chez plusieurs maisons ; une création
         n'appartient qu'à sa compagnie. Le distinguer explicitement évite de
         lire un partage légitime comme un doublon. */
      let fromRepertoire = false;
      if (wantRepertoire) {
        for (let k = 0; k < pool.repertoire.length && !title; k++) {
          const candidate = pool.repertoire[(ai * 7 + i * 3 + k) % pool.repertoire.length];
          if (!mine[candidate] && !usedTitles[candidate]) { title = candidate; fromRepertoire = true; }
        }
      }
      // Une création n'appartient qu'à une compagnie, sans exception : deux
      // troupes ne signent pas la même pièce. La réserve rédigée est petite,
      // alors on compose au-delà plutôt que de réattribuer.
      if (!title) {
        for (let k = 0; k < pool.originals.length && !title; k++) {
          const candidate = pool.originals[(ai * 5 + i * 3 + k) % pool.originals.length];
          if (mine[candidate] || claimedOriginals[candidate] || usedTitles[candidate]) continue;
          title = candidate;
        }
        if (!title) title = composeTitle(artist, i);
        claimedOriginals[title] = artist.id;
      }
      if (!title && pool.repertoire.length) {
        for (let k = 0; k < pool.repertoire.length && !title; k++) {
          const candidate = pool.repertoire[(ai + i + k) % pool.repertoire.length];
          if (!mine[candidate]) { title = candidate; fromRepertoire = true; }
        }
      }
      if (!title) break;
      mine[title] = true;

      let id = slug(artist.id + '-' + title);
      if (showById[id]) id = id + '-' + (i + 1);
      const s = {
        id, title, artist: artist.id, repertoire: fromRepertoire,
        category: artist.category,
        /* Un artiste ne joue pas toujours le même style : la plupart de ses
           spectacles portent son genre, certains un genre voisin de sa
           discipline. C'est ce qui donne au catalogue une couverture réelle
           des sous-genres, au lieu d'un genre par artiste. */
        genre: (() => {
          const cat = categories.filter(c => c.id === artist.category)[0];
          const pool = cat ? cat.genres : [];
          if (!pool.length) return artist.genre || null;
          /* Plus une discipline compte de styles au regard de ses artistes,
             plus le catalogue doit vagabonder pour tous les couvrir. */
          const arts = Math.max(1, artists.filter(x => x.category === artist.category).length);
          const stick = Math.max(0.3, Math.min(0.7, arts / pool.length * 0.55));
          if (artist.genre && rand() < stick) return artist.genre;
          return pool[Math.floor(between(0, pool.length)) % pool.length];
        })(),
        tags: [],
        // Répartition déterministe sur l'identifiant : deux spectacles voisins
        // d'une même discipline ne tombent pas sur la même photo.
        /* Répartition tournante sur toute la liste de la discipline : deux
           cartes voisines ne peuvent pas tomber sur la même photo tant que la
           liste n'est pas épuisée. */
        image: images[(imageCursor[artist.category] = (imageCursor[artist.category] || 0) + 1) % images.length],
        poster: images[(imageCursor[artist.category] + 1 + hash(id + ':pos') % (images.length - 1)) % images.length],
        imageSource: 'picsum', imageSeed: id,
        runtimeMin: Math.round(between(range[0], range[1]) / 5) * 5,
        contentLanguage: artist.contentLanguage || 'fr',
        languageDependency: dep,
        spokenLanguage: dep === 'none' ? [] : (artist.languages || ['fr']).slice(0, 1),
        // Sous-titres : la langue de jeu, plus une autre. Jamais deux fois la même.
        subtitles: dep === 'none' ? [] : (() => {
          const lang = artist.contentLanguage || 'fr';
          return [lang, lang === 'fr' ? 'en' : 'fr'];
        })(),
        surtitles: dep === 'helpful' && (artist.contentLanguage || 'fr') !== 'fr' ? ['fr'] : [],
        // Le synopsis suit l'univers : une phrase de plateau n'a rien à dire
        // d'un set de metal.
        ...(() => {
          const fam = (taxonomy && (taxonomy.categories.filter(c => c.id === artist.category)[0] || {}).family) || 'stage';
          const pool = (catalogue.synopsisPool || {})[fam] || (catalogue.synopsisPool || {}).stage || { fr: [], en: [] };
          const n = (pool.fr || []).length || 1;
          /* Répartition tournante par discipline, comme pour les photos : le
             hachage regroupait les collisions, et une page qui n'affiche
             qu'une discipline répétait la même phrase quatre fois. */
          const k = (synopsisCursor[artist.category] = (synopsisCursor[artist.category] || 0) + 1) % n;
          return { synopsis: (pool.fr || [])[k] || null, synopsisEn: (pool.en || [])[k] || null };
        })(),
        cast: null,
        audience: artist.category === 'circus' || artist.category === 'musical' ? 'family' : 'all-audiences',
        generated: true
      };
      if (taxonomy) {
        const c = taxonomy.categories.filter(x => x.id === s.category)[0];
        const g = c && c.genres.filter(x => x.id === s.genre)[0];
        // Le genre ne possède pas ses tags : il en suggère.
        if (g) s.tags = (g.suggests || []).slice(0, intBetween(2, 4));
      }
      shows.push(s); showById[id] = s;
    }
  });


  // ---------------------------------------------------------------- dates
  // Une salle n'accueille qu'un spectacle à la fois : on réserve les créneaux.
  // Deux ressources sont exclusives : la salle et l'artiste. Aucune des deux
  // ne peut être à deux endroits en même temps.
  const booked = {};
  function free(key, start, end) {
    const slots = booked[key] || (booked[key] = []);
    for (let i = 0; i < slots.length; i++) {
      if (start < slots[i][1] && slots[i][0] < end) return false;
    }
    return true;
  }
  function reserve(venueId, start, runtime, artistId) {
    const end = start + runtime + 45;                 // marge de plateau
    if (!free('v:' + venueId, start, end)) return false;
    if (artistId && !free('a:' + artistId, start, end)) return false;
    booked['v:' + venueId].push([start, end]);
    if (artistId) booked['a:' + artistId].push([start, end]);
    return true;
  }

  const dates = [];
  // Une intention est ancrée soit sur l'HEURE MURALE — c'est le calendrier,
  // il doit être stable dans le palier — soit sur MAINTENANT : un direct doit
  // toujours être vu au milieu du spectacle, une salle toujours ouvrir dans
  // dix-huit minutes. Ces dernières ne sont donc pas quantifiées.
  const RELATIVE = ['live-start', 'live', 'live-end', 'room-open', 'soon', 'replay', 'replay-expiring', 'past'];
  const anchorOf = (intent) => (RELATIVE.indexOf(intent) > -1 ? 'now' : 'epoch');

  function placeStart(row, runtime) {
    const at = row.at || [20, 30];
    switch (row.intent) {
      case 'live-start': return -Math.max(4, Math.round(runtime * 0.06));
      case 'live': return -Math.round(runtime * 0.34);
      case 'live-end': return -Math.round(runtime * 0.86);
      case 'room-open': return Math.max(6, Math.round(roomOpens * 0.6));
      case 'soon': return Math.round(between(48, 78));
      case 'tonight': return minutesUntilNextClock(at[0], at[1], epochAt);
      case 'tomorrow': return minutesUntilClock(at[0], at[1], 1, epochAt);
      case 'next-week': return minutesUntilClock(at[0], at[1], 7, epochAt);
      case 'replay': return -(runtime + Math.round(row.replay[1] * 60 * 0.42));
      case 'replay-expiring': return -(runtime + row.replay[1] * 60 - 180);
      case 'past': return -((row.daysAgo || 4) * 1440 + runtime);
      default: return minutesUntilNextClock(at[0], at[1], nowFn);
    }
  }

  function makeDate(spec) {
    const show = showById[spec.show];
    const venue = venueById[spec.venue];
    const artist = artistById[show.artist];
    const runtime = show.runtimeMin;
    /* Une date porte d'abord son INSTANT ABSOLU. C'est la seule valeur stable :
       un décalage n'a de sens que rapporté à une base, et il y en avait deux
       (l'époque pour les dates calendaires, maintenant pour les cas relatifs)
       qui ne s'annulaient jamais.
         - ancrage « epoch »  : l'heure murale, figée dans le palier → base = époque
         - ancrage « now »    : un direct est toujours vu au même endroit du
                                spectacle → base = maintenant
       Le décalage rendu se recalcule ensuite depuis cet instant, contre la même
       base que la couche de lecture. */
    const baseMs = spec.anchor === 'now' ? nowFloor().getTime() : epochAt().getTime();
    const startsAtMs = baseMs + spec.start * 60000;
    const start = Math.round((startsAtMs - nowFloor().getTime()) / 60000);
    const live = start <= 0 && start + runtime > 0 && spec.outcome !== 'cancelled';
    /* Le tarif suit la discipline ET la jauge : le même spectacle ne se vend pas
       au même prix dans un club de 300 places et dans un stade. */
    const prices = spec.prices || (() => {
      const base = PRICE[show.category] || [26, 18, 45];
      const tier = VENUE_TIER(venue.capacity);
      const jitter = 0.94 + (hash(spec.id + ':price') % 13) / 100;
      return base.map(p => Math.max(5, Math.round(p * tier * jitter)));
    })();
    const available = spec.seats == null
      ? Math.round(venue.capacity * between(0.02, 0.45))
      : spec.seats;
    return {
      id: spec.id, show: spec.show, venue: spec.venue,
      // Une date n'existe pas d'elle-même : elle est la projection publique
      // d'une publication décidée par une chaîne du studio.
      publication: 'publication:' + spec.id,
      publishedBy: 'channel:' + show.artist,
      startOffsetMin: start,
      startsAt: new Date(startsAtMs).toISOString(),
      startsAtMs,
      // Placement d'origine et son ancrage : « epoch » pour une date
      // calendaire (heure murale figée dans le palier), « now » pour un cas
      // relatif (un direct est toujours vu au même endroit du spectacle).
      // Les arbitrages de conflit se font ici, pour ne pas dépendre de la
      // minute de chargement.
      plannedOffsetMin: spec.start,
      anchor: spec.anchor || 'epoch',
      seats: { available, waitlist: spec.waitlist || 0 },
      replayViews: 0,
      viewers: live ? Math.max(140, Math.round(
        (artist ? artist.followers : 12000) * between(0.015, 0.075) + venue.capacity * between(0.15, 0.6)
      )) : 0,
      prices: [
        { id: spec.id + ':price:full', tier: 'full', amount: prices[0] },
        { id: spec.id + ':price:reduced', tier: 'reduced', amount: prices[1] },
        { id: spec.id + ':price:support', tier: 'support', amount: prices[2] }
      ],
      currency: market.currency, market: market.id,
      replay: { policy: spec.replay ? spec.replay[0] : 'included', windowHours: spec.replay ? spec.replay[1] : 48 },
      chatMode: spec.chat || 'open',
      outcome: spec.outcome || null,
      rescheduledToOffsetMin: spec.rescheduleDays ? start + spec.rescheduleDays * 1440 : null,
      attributes: spec.attributes || [],
      rights: spec.blackout
        ? { scope: 'restricted', blackout: spec.blackout.territories, reason: spec.blackout.reason }
        : { scope: 'worldwide', blackout: [], reason: null },
      tour: spec.tour || null,
      generated: !!spec.generated
    };
  }

  // 1. les cas garantis, d'abord : ils ont priorité sur les créneaux
  SCHEDULE.forEach(row => {
    const show = showById[row.show];
    if (!show) return;
    const anchor = anchorOf(row.intent);
    const raw = placeStart(row, show.runtimeMin);
    reserve(row.venue, raw, show.runtimeMin, show.artist);
    dates.push(makeDate(Object.assign({}, row, { start: raw, anchor })));
  });

  // 2. le volume : une date isolée, une tournée, ou une résidence
  const CURTAINS = [[19, 0], [19, 30], [20, 0], [20, 30], [21, 0]];
  let liveQuota = Math.round(intBetween(9, 16) * scale);
  const liveByCategory = {};

  shows.filter(s => s.generated).forEach((show, si) => {
    const artist = artistById[show.artist];
    const runtime = show.runtimeMin;
    const big = artist.followers > 240000;
    const roll = rand();
    const kind = big && roll < 0.35 ? 'residency' : roll < 0.62 ? 'tour' : 'single';
    const count = kind === 'residency' ? intBetween(2, 4) : kind === 'tour' ? intBetween(2, 6) : 1;
    const homeVenue = pick(venuePool(show.category, big, artist.followers));

    // Un direct pour certains spectacles, réparti entre les catégories.
    const wantsLive = liveQuota > 0 && (liveByCategory[show.category] || 0) < 2 && rand() < 0.12;

    for (let i = 0; i < count; i++) {
      const venue = kind === 'residency' ? homeVenue
        : (i === 0 ? homeVenue : pick(venuePool(show.category, big && rand() < 0.4, artist.followers)));
      const curtain = CURTAINS[(si + i) % CURTAINS.length];
      let start, anchor = 'epoch';
      if (wantsLive && i === 0) {
        start = -Math.round(runtime * between(0.08, 0.82));
        anchor = 'now';
      } else if (kind === 'residency') {
        start = minutesUntilClock(curtain[0], curtain[1], 1 + i, epochAt);
      } else {
        const day = i === 0 ? intBetween(-18, 12) : intBetween(1, 26);
        start = minutesUntilClock(curtain[0], curtain[1], day, epochAt);
      }
      if (!reserve(venue.id, start, runtime, show.artist)) continue;

      const past = start + runtime <= 0;
      const window = show.category === 'comedy' ? 0 : [24, 41, 48, 72, 96][(si + i) % 5];
      const spec = {
        id: show.id + '-' + (i + 1), show: show.id, venue: venue.id, start, anchor,
        // Pas de tarif imposé : makeDate le calcule d'après la discipline ET la
        // jauge de la salle.
        replay: window ? ['included', window] : ['none', 0],
        chat: show.category === 'classical' || show.category === 'opera' ? 'read-only' : 'open',
        seats: past ? 0 : null,
        waitlist: !past && rand() < 0.12 ? intBetween(40, 620) : 0,
        tour: kind === 'single' ? null : { kind, index: i + 1, of: count },
        generated: true
      };
      if (spec.waitlist) spec.seats = 0;
      dates.push(makeDate(spec));
      if (wantsLive && i === 0) {
        liveQuota--;
        liveByCategory[show.category] = (liveByCategory[show.category] || 0) + 1;
      }
    }
  });


  // Les cas garantis ont réservé en premier ; on écarte les dates générées
  // qui les recouvrent encore, plutôt que de laisser une salle en conflit.
  (function resolveClashes() {
    const drop = {};
    const sweep = (keyOf) => {
      const groups = {};
      dates.forEach(d => {
        if (drop[d.id]) return;
        const k = keyOf(d);
        (groups[k] = groups[k] || []).push(d);
      });
      Object.keys(groups).forEach(k => {
        const list = groups[k].sort((a, b) => a.plannedOffsetMin - b.plannedOffsetMin);
        for (let i = 1; i < list.length; i++) {
          const prev = list[i - 1], cur = list[i];
          if (drop[prev.id] || drop[cur.id]) continue;
          const end = prev.plannedOffsetMin + showById[prev.show].runtimeMin + 45;
          if (cur.plannedOffsetMin < end) drop[cur.generated ? cur.id : prev.id] = true;
        }
      });
    };
    sweep(d => 'v:' + d.venue);                        // une salle à la fois
    sweep(d => 'a:' + showById[d.show].artist);        // un plateau à la fois
    for (let i = dates.length - 1; i >= 0; i--) if (drop[dates[i].id]) dates.splice(i, 1);
  })();

  const dateById = {}; dates.forEach(d => { dateById[d.id] = d; });
  const stateOf = (d) => {
    const runtime = showById[d.show].runtimeMin;
    const start = d.startOffsetMin;
    if (d.outcome === 'cancelled') return 'ended';
    if (start > 0) return 'scheduled';
    if (start + runtime > 0 && d.outcome !== 'interrupted') return 'live';
    const window = (d.replay && d.replay.windowHours) || 0;
    if (window && d.replay.policy !== 'none' && start + runtime > -window * 60) return 'replay';
    return 'ended';
  };
  const overlaps = (a, b) => {
    const ra = showById[a.show].runtimeMin, rb = showById[b.show].runtimeMin;
    return a.startOffsetMin < b.startOffsetMin + rb && b.startOffsetMin < a.startOffsetMin + ra;
  };


  // La chaîne connaît alors son catalogue et son calendrier.
  channels.forEach(c => {
    c.shows = shows.filter(s => s.artist === c.artist).map(s => s.id);
    c.dates = dates.filter(d => showById[d.show].artist === c.artist).map(d => d.id);
  });
  // Et l'annuaire son activité : sur combien de chaînes, pour combien de directs.
  channels.forEach(c => c.members.forEach(m => {
    if (!m.person) return;
    const p = personById[m.person];
    if (!p) return;
    if (p.channels.indexOf(c.id) < 0) p.channels.push(c.id);
  }));

  // ----------------------------------------------------------------- régie
  // Ventilation des places vendues par tarif. C'est la seule origine de la
  // recette : le total des lignes fait le brut, à l'euro près.
  dates.forEach(d => {
    const cap = venueById[d.venue].capacity;
    const sold = Math.max(0, cap - d.seats.available);
    const shares = [between(0.6, 0.74), between(0.14, 0.22)];
    let placed = 0;
    d.prices.forEach((p, i) => {
      const count = i === d.prices.length - 1 ? sold - placed : Math.round(sold * shares[i]);
      placed += count;
      p.sold = count;
      p.revenue = count * p.amount;
    });
    d.seats.sold = sold;
    d.revenue = d.prices.reduce((n, p) => n + p.revenue, 0);
  });

  const runs = dates.map(d => {
    const row = SCHEDULE.filter(r => r.id === d.id)[0];
    const show = showById[d.show];
    const venue = venueById[d.venue];
    const runtime = show.runtimeMin;
    const state = d.outcome === 'postponed' ? 'postponed'
      : d.outcome === 'cancelled' ? 'cancelled'
      : d.outcome === 'interrupted' ? 'interrupted'
      : stateOf(d) === 'live' ? 'on-air'
      : d.startOffsetMin > 0 && d.startOffsetMin <= 90 ? 'rehearsal'
      : 'idle';
    const pattern = catalogue.chapterPatterns[catalogue.showPatterns[d.show] || patternFor(show.category)] || [];
    const chapters = state === 'postponed' || state === 'cancelled'
      ? []
      : pattern.map(([vocabId, fraction], ci) => ({
          id: d.id + ':chapter:' + (ci + 1),
          chapter: vocabId,
          atMin: Math.round(runtime * fraction)
        }));
    const sold = d.seats.sold;
    const revenue = d.revenue;
    const sales = { sold, waitlist: d.seats.waitlist, revenue };
    if (d.outcome === 'cancelled') sales.refunded = revenue;
    if (d.outcome === 'interrupted') sales.credited = revenue;

    const incidents = [];
    if (row && row.incident) {
      const source = pick(catalogue.incidentMessages[row.incident.kind] || []);
      const atMin = Math.round(runtime * row.incident.atFraction);
      incidents.push({
        id: d.id + ':incident:1', kind: row.incident.kind, atMin,
        resolvedAtMin: row.incident.resolved ? atMin + Math.round(between(4, 14)) : null,
        outcome: row.incident.outcome, contentLanguage: 'fr',
        message: source ? source.message : '', messageEn: source ? source.messageEn : ''
      });
    } else if (state === 'on-air' && rand() < 0.08) {
      const source = pick(catalogue.incidentMessages['hold-screen']);
      const atMin = -Math.round(runtime * 0.05);
      incidents.push({
        id: d.id + ':incident:1', kind: 'hold-screen', atMin,
        resolvedAtMin: atMin + Math.round(between(3, 11)), outcome: 'resumed',
        contentLanguage: 'fr', message: source.message, messageEn: source.messageEn
      });
    }

    // L'équipe référence l'annuaire : un même régisseur se retrouve d'une
    // date à l'autre, et le studio peut ouvrir sa fiche.
    const crew = (catalogue.crewPool[d.show]
      ? catalogue.crewPool[d.show].map(([role, name]) => ({ role, person: personByName[name] || null, name }))
      : ['director', 'video', 'sound', 'moderation'].slice(0, intBetween(1, 4)).map(role => {
          // Un renfort indépendant reste exceptionnel : une date sur douze.
          const freelance = hash(d.id + ':' + role) % 12 === 0;
          const p = findPerson(role, freelance, 'channel:' + show.artist);
          return { role, person: p.id, name: p.name };
        })
    ).map((m, mi) => Object.assign({ id: d.id + ':crew:' + (mi + 1) }, m));

    return {
      id: 'run:' + d.id,
      dateId: d.id, channel: 'channel:' + show.artist, state, crew,
      cameras: state === 'postponed' || state === 'cancelled' ? 0 : intBetween(1, 8),
      bitrateKbps: state === 'on-air' ? Math.round(between(5200, 12000) / 100) * 100 : 0,
      latencySec: state === 'on-air' ? intBetween(8, 15) : 0,
      chatMode: state === 'on-air' ? d.chatMode : 'off',
      chapters, sales, incidents
    };
  });

  function patternFor(categoryId) {
    if (categoryId === 'theatre' || categoryId === 'comedy' || categoryId === 'performance') return 'play';
    if (categoryId === 'dance' || categoryId === 'opera' || categoryId === 'musical') return 'ballet';
    if (categoryId === 'classical') return 'recital';
    if (categoryId === 'circus') return 'circus';
    return 'concert';
  }

  // Une rediffusion se regarde après coup : une part des places vendues, plus
  // un public venu de la fenêtre de rediffusion.
  dates.forEach(d => {
    const st = stateOf(d);
    if (st !== 'replay' && st !== 'ended') return;
    const venue = venueById[d.venue];
    const sold = Math.max(0, venue.capacity - d.seats.available);
    d.replayViews = Math.round(sold * between(0.35, 1.4) + between(40, 900));
  });

  const runByDate = {}; runs.forEach(r => { runByDate[r.dateId] = r; });
  // Chaque poste tenu compte pour une date conduite, et rattache la personne
  // à la chaîne : un indépendant apparaît ainsi dans l'annuaire avec son vrai
  // volume de travail.
  runs.forEach(r => r.crew.forEach(c => {
    if (!c.person) return;
    const p = personById[c.person];
    if (!p) return;
    p.runsCalled += 1;
    if (p.channels.indexOf(r.channel) < 0) p.channels.push(r.channel);
  }));


  // ------------------------------------------------------------ publication
  // L'acte de publication : ce qu'une chaîne a décidé et engagé. La date
  // publique n'en est que la projection, et pointe ici par son champ
  // « publication ». Deux passages sont sans retour : publier engage le
  // tarif, mettre la rediffusion en ligne la met en vente.
  const publications = dates.map(d => {
    const start = d.startOffsetMin;
    const runtime = showById[d.show].runtimeMin;
    const st = stateOf(d);
    const state = st === 'live' ? 'live'
      : st === 'replay' ? 'replay-online'
      : st === 'ended' ? 'ended'
      : start <= 90 ? 'technical'
      : 'scheduled';
    return {
      id: 'publication:' + d.id,
      dateId: d.id, channel: 'channel:' + showById[d.show].artist,
      // Ce que la chaîne a engagé sur cette date. Les valeurs elles-mêmes
      // vivent sur la date : on ne les recopie pas, on dit ce qui est verrouillé.
      engaged: ['prices', 'replay', 'chatMode'],
      state,
      publishedAtOffsetMin: -Math.round(between(6, 40) * 1440),
      pricesLockedAt: -Math.round(between(6, 40) * 1440),
      replayOnlineAtOffsetMin: state === 'replay-online' ? start + runtime + intBetween(5, 40) : null,
      lockedTransitions: ['scheduled', 'replay-online'],
      checklist: {
        technicalCheck: state === 'technical' || state === 'live' || start < 0,
        chaptersPlanned: (runByDate[d.id] || {}).chapters ? runByDate[d.id].chapters.length > 0 : false,
        moderationStaffed: (runByDate[d.id] || { crew: [] }).crew.some(c => c.role === 'moderation'),
        replayPolicySet: true
      }
    };
  });

  // Projets non publiés : ce qui attend dans le studio.
  const drafts = [];
  shows.forEach((s, si) => {
    /* Un projet en chantier existe aussi chez les compagnies rédigées : la
       réserve n'est pas réservée au volume généré. */
    if (s.generated ? si % 23 : si % 3) return;
    const venue = smallVenues[si % smallVenues.length];
    drafts.push({
      id: 'draft:' + s.id,
      channel: 'channel:' + s.artist, show: s.id, venue: venue.id,
      state: si % 46 ? 'draft' : 'reserve',
      intendedStartOffsetMin: minutesUntilClock(20, 30, intBetween(20, 90), epochAt),
      missing: si % 46 ? ['prices', 'technical-check'] : ['technical-check'],
      updatedOffsetMin: -intBetween(60, 14 * 1440)
    });
  });


  // ------------------------------------------------------------- versements
  const commissionRate = (catalogue.commerce || {}).commissionRate || 0.12;
  const payoutDelay = (catalogue.commerce || {}).payoutDelayDays || 14;
  const vatRate = ((catalogue.geography.billingMarkets || [])[0] || {}).vatRate || 0.055;
  const payouts = runs.filter(r => r.sales.revenue > 0).map(r => {
    const d = dateById[r.dateId];
    const gross = d.revenue;
    const commission = Math.round(gross * commissionRate);
    const vat = Math.round(gross * vatRate);
    const held = d.outcome === 'postponed' || d.outcome === 'interrupted';
    const refunded = d.outcome === 'cancelled';
    const start = d.startOffsetMin;
    const paid = start + showById[d.show].runtimeMin + payoutDelay * 1440 < 0;
    return {
      id: 'payout:' + r.dateId,
      dateId: r.dateId, channel: r.channel,
      currency: d.currency,
      gross, commission, vat,
      net: refunded ? 0 : gross - commission - vat,
      refunded: refunded ? gross : 0,
      credited: d.outcome === 'interrupted' ? gross : 0,
      state: refunded ? 'refunded' : held ? 'held' : paid ? 'paid' : 'scheduled',
      dueOffsetMin: start + showById[d.show].runtimeMin + payoutDelay * 1440,
      invoice: 'invoice:' + r.dateId
    };
  });


  // ------------------------------------------------- santé du flux (courbes)
  const healthSamples = runs.filter(r => r.state === 'on-air').map(r => {
    const d = dateById[r.dateId];
    const elapsed = Math.max(1, -d.startOffsetMin);
    const step = Math.max(1, Math.round(elapsed / 24));
    const series = [];
    for (let atMin = -elapsed; atMin <= 0; atMin += step) {
      series.push({
        atMin,
        bitrateKbps: Math.round(r.bitrateKbps * between(0.88, 1.06) / 100) * 100,
        latencySec: Math.max(4, Math.round(r.latencySec * between(0.8, 1.25))),
        droppedPct: Math.round(between(0, 1.4) * 10) / 10,
        viewers: Math.max(60, Math.round(d.viewers * between(0.45, 1.02)))
      });
    }
    return { id: 'health:' + r.dateId, dateId: r.dateId, channel: r.channel, series };
  });


  // ------------------------------------------------------------- modération
  const moderation = [];


  // ------------------------------------------------------------- public
  // Un spectateur existe comme personne du public : c'est lui qu'on réduit au
  // silence ou qu'on bannit, pas seulement son message.
  const audience = [];
  channels.forEach((c, ci) => {
    const size = Math.min(14, 3 + Math.round(c.followers / 40000));
    for (let i = 0; i < size; i++) {
      const pool = catalogue.chatPool.filter(x => x.role !== 'crew' && x.role !== 'staff');
      const src = pool[(ci * 5 + i * 3) % pool.length];
      const handle = src.author;
      const id = c.id + ':viewer:' + (i + 1);
      const bad = rand();
      audience.push({
        id, channel: c.id, handle,
        datesAttended: Math.max(1, Math.round(between(1, Math.max(2, c.dates.length)))),
        messages: intBetween(0, 40),
        state: bad > 0.97 ? 'banned' : bad > 0.9 ? 'muted' : 'ok',
        firstSeenDaysAgo: intBetween(2, 900),
        subscriber: rand() < 0.4
      });
    }
  });
  const audienceOfChannel = {};
  audience.forEach(v => { (audienceOfChannel[v.channel] = audienceOfChannel[v.channel] || []).push(v); });

  // ----------------------------------------------------------------- tchat
  const chat = [];
  dates.forEach(d => {
    if (stateOf(d) !== 'live' || d.chatMode === 'off') return;
    const elapsed = -d.startOffsetMin;
    const count = Math.max(2, Math.min(6, Math.round(elapsed / 12)));
    for (let i = 0; i < count; i++) {
      const source = catalogue.chatPool[(i * 3 + d.id.length) % catalogue.chatPool.length];
      const pool = audienceOfChannel['channel:' + showById[d.show].artist] || [];
      const viewer = pool.filter(v => v.handle === source.author)[0]
        || pool[(i * 2 + d.id.length) % Math.max(1, pool.length)] || null;
      chat.push({
        id: d.id + ':msg:' + (i + 1), dateId: d.id,
        viewer: viewer ? viewer.id : null,
        state: viewer && viewer.state === 'banned' ? 'banned' : (i % 11 === 0 ? 'removed' : i % 17 === 0 ? 'muted' : 'ok'),
        author: source.author, role: source.role,
        atMin: -Math.round(elapsed * (1 - (i + 1) / (count + 1))),
        contentLanguage: 'fr', text: source.text, textEn: source.textEn
      });
    }
  });

  // La file de modération référence les messages par identifiant.
  chat.forEach((m, mi) => {
    if (mi % 7) return;
    const reason = (catalogue.moderationReasons || [['spam', 'Spam', 'Spam']])[mi % (catalogue.moderationReasons || [1]).length];
    const state = m.state !== 'ok' ? m.state : 'reported';
    moderation.push({
      id: 'moderation:' + m.id,
      message: m.id, dateId: m.dateId,
      channel: 'channel:' + showById[dateById[m.dateId].show].artist,
      state, reason: reason[0], reports: intBetween(1, 5),
      atMin: m.atMin + intBetween(1, 4),
      handledBy: state === 'reported' ? null : (runByDate[m.dateId].crew.filter(c => c.role === 'moderation')[0] || {}).person || null
    });
  });


  // --------------------------------------------------------------- boutique
  const merch = [];
  const hasLiveDate = {};
  dates.forEach(d => { if (stateOf(d) === 'live' || stateOf(d) === 'replay') hasLiveDate[d.show] = true; });
  shows.forEach((s, si) => {
    if (si % 6 && !hasLiveDate[s.id] && s.generated) return;
    const family = ['classical', 'jazz', 'blues', 'reggae', 'soul-funk', 'electronic', 'rock', 'metal', 'rap', 'rnb',
      'pop', 'chanson', 'folk-country', 'world'].indexOf(s.category) > -1
      ? 'music' : s.category === 'circus' ? 'circus' : 'stage';
    const rows = (catalogue.merchPool.common || []).concat(catalogue.merchPool[family] || []);
    const items = rows.slice(0, intBetween(2, rows.length)).map(([label, price, kind], ii) => {
      const stock = intBetween(0, 180);
      return {
        id: 'merch:' + s.id + ':' + (ii + 1),
        show: s.id, channel: 'channel:' + s.artist,
        label, kind, price, currency: market.currency,
        stock, sold: intBetween(0, 240),
        state: stock === 0 ? 'out-of-stock' : 'on-sale'
      };
    });
    merch.push.apply(merch, items);
  });


  // ------------------------------------------------------------------ boîte
  const inbox = [];
  channels.forEach((c, ci) => {
    // Toute chaîne a sa boîte : certaines vides, la plupart avec deux ou trois
    // demandes en attente. Une chaîne sans boîte n'existe pas.
    const count = c.dates.length ? intBetween(1, 4) : intBetween(0, 1);
    for (let i = 0; i < count; i++) {
      const row = catalogue.inboxPool[(ci + i) % catalogue.inboxPool.length];
      const dateRef = c.dates.length ? c.dates[(ci + i) % c.dates.length] : null;
      inbox.push({
        id: 'inbox:' + c.id.split(':')[1] + ':' + (i + 1),
        channel: c.id, kind: row[0],
        dateId: dateRef,
        atMin: -intBetween(20, 6 * 1440),
        read: rand() < 0.45,
        contentLanguage: 'fr', text: row[1], textEn: row[2]
      });
    }
  });


  // ===========================================================================
  // CÔTÉ STOREFRONT — ce que le public voit de tout cela
  // ===========================================================================

  // -------------------------------------------------------------- comptes
  // Un compte n'achète que ce que le studio a publié : les places se tirent
  // dans les dates issues des publications, jamais dans un calendrier parallèle.
  // Contrainte : jamais deux directs simultanés dans les places d'un compte.
  const accounts = catalogue.accounts.map(base => {
    const curated = SCHEDULE.filter(r => (r.owned || []).indexOf(base.id) > -1).map(r => r.id);
    const owned = curated.slice();
    const held = () => owned.map(id => dateById[id]).filter(Boolean);
    const allowed = base.allowedCategories || null;
    const candidates = dates.filter(d => {
      if (owned.indexOf(d.id) > -1) return false;
      const show = showById[d.show];
      if (allowed && allowed.indexOf(show.category) < 0) return false;
      return true;
    });
    const target = allowed ? intBetween(3, 6) : intBetween(6, 14);
    for (let i = 0; i < candidates.length && owned.length < target; i++) {
      const d = candidates[Math.floor(between(0, candidates.length)) % candidates.length];
      if (owned.indexOf(d.id) > -1) continue;
      if (stateOf(d) === 'live' && held().some(h => stateOf(h) === 'live' && overlaps(h, d))) continue;
      owned.push(d.id);
    }
    const resume = SCHEDULE.filter(r => r.resume && r.resume.account === base.id).map(r => ({
      dateId: r.id, positionSec: Math.round(showById[r.show].runtimeMin * 60 * r.resume.fraction)
    }));
    owned.forEach(id => {
      const d = dateById[id];
      if (!d || resume.length >= 4) return;
      if (stateOf(d) === 'replay' && rand() < 0.3) {
        resume.push({ dateId: id, positionSec: Math.round(showById[d.show].runtimeMin * 60 * between(0.08, 0.72)) });
      }
    });
    const followed = base.followedArtists.slice();
    const pool = artists.filter(a => a.generated);
    while (followed.length < (allowed ? 3 : intBetween(4, 9)) && pool.length) {
      const a = pool[Math.floor(between(0, pool.length)) % pool.length];
      if (allowed && allowed.indexOf(a.category) < 0) continue;
      if (followed.indexOf(a.id) < 0) followed.push(a.id);
    }
    const watchlist = base.watchlist.slice();
    const showPool = shows.filter(s => !allowed || allowed.indexOf(s.category) > -1);
    while (watchlist.length < intBetween(4, 10) && showPool.length) {
      const s = showPool[Math.floor(between(0, showPool.length)) % showPool.length];
      if (watchlist.indexOf(s.id) < 0) watchlist.push(s.id);
    }
    // Appareils connectés : une liste, pas un compte — la TV les affiche et
    // permet la déconnexion à distance.
    const deviceCount = intBetween(1, 4);
    const devices = [];
    for (let i = 0; i < deviceCount; i++) {
      const row = catalogue.devicePool[(i * 3 + base.id.length) % catalogue.devicePool.length];
      if (devices.some(dv => dv.label === row[1])) continue;
      devices.push({
        id: 'device:' + base.id + ':' + (i + 1),
        kind: row[0], label: row[1], labelEn: row[2],
        current: i === 0, lastSeenMin: i === 0 ? 0 : -intBetween(20, 40 * 1440),
        city: base.city || 'Paris'
      });
    }
    // Recherches récentes : dérivées de ce que le compte suit réellement.
    const recentSearches = followed.slice(0, 3).map(id => artistById[id].name)
      .concat(watchlist.slice(0, 2).map(id => (showById[id] ? showById[id].title : null)).filter(Boolean))
      .slice(0, 5);
    // Alertes des artistes suivis : la prochaine date de chacun.
    const alerts = followed.slice(0, 4).map(aid => {
      const next = dates.filter(d => showById[d.show].artist === aid && d.startOffsetMin > 0)
        .sort((x, y) => x.startOffsetMin - y.startOffsetMin)[0];
      return next ? { id: 'alert:' + base.id + ':' + aid, artist: aid, dateId: next.id, read: rand() < 0.5 } : null;
    }).filter(Boolean);
    /* Un compte porte aussi son ancienneté et son numéro : le storefront les
       affiche, ils ne peuvent pas être inventés côté écran. */
    const joined = -intBetween(120, 1200) * 1440;
    return Object.assign({}, base, {
      ownedDates: owned, resume, followedArtists: followed, watchlist,
      devices, recentSearches, alerts,
      phone: '+33 6 ' + [0, 1, 2, 3].map(k => String(10 + (hash(base.id + ':tel:' + k) % 90))).join(' '),
      memberSinceOffsetMin: joined
    });
  });

  return {
    version: 7,
    generatedAt: nowFn().toISOString(),
    epoch: epochAt().toISOString(),
    epochGrainMin: grain,
    // L'instant de référence du tirage. La couche de lecture doit s'y accrocher :
    // les décalages ont été calculés depuis lui, les rendre contre une autre
    // horloge décalerait toute heure murale.
    builtAtMs: nowFloor().getTime(),
    note: 'Generated by fixtures.js against the real clock, studio-first: people and channels exist, channels create shows and publish dates, the run desk and the books follow, and only then does the storefront read the published catalogue (accounts, seats, chat). Authored content comes from catalogue.json. Never hand-edit.',
    dataFlow: ['people', 'venues', 'artists', 'channels', 'shows', 'dates (published)', 'runs', 'publications', 'payouts', 'health', 'moderation', 'chat', 'merch', 'inbox', 'accounts'],
    time: catalogue.time,
    geography: catalogue.geography,
    categoryImages: catalogue.categoryImages || {},
    venues, artists, shows, dates, accounts, people,
    plans: catalogue.plans, zones: catalogue.geography.zones, grants: catalogue.grants,
    audience,
    studio: {
      chapterVocabulary: catalogue.chapterVocabulary,
      memberRoles: catalogue.memberRoles,
      publicationStates: catalogue.publicationStates,
      commerce: Object.assign({ vatRate }, catalogue.commerce),
      channels, runs, publications, drafts, payouts, healthSamples, moderation, merch, inbox
    },
    chat,
    images: catalogue.images,
    stats: {
      venues: venues.length, artists: artists.length, shows: shows.length, dates: dates.length,
      live: dates.filter(d => stateOf(d) === 'live').length,
      tours: Object.keys(dates.filter(d => d.tour && d.tour.kind === 'tour')
        .reduce((acc, d) => { acc[d.show] = 1; return acc; }, {})).length,
      residencies: Object.keys(dates.filter(d => d.tour && d.tour.kind === 'residency')
        .reduce((acc, d) => { acc[d.show] = 1; return acc; }, {})).length,
      showsPerArtist: (() => {
        const counts = artists.map(a => shows.filter(s => s.artist === a.id).length);
        return { min: Math.min.apply(null, counts), max: Math.max.apply(null, counts) };
      })(),
      people: people.length, channels: channels.length, drafts: drafts.length,
      payouts: payouts.length, moderation: moderation.length, merch: merch.length, inbox: inbox.length,
      audience: audience.length, abroadVenues: venues.filter(v => v.country !== 'FR').length,
      recruited
    }
  };
}

// Point d'entrée unique d'une surface : charge les trois fichiers, génère les
// données et rend l'API liée.
//   const A = await loadArthome({ locale: 'fr' });
export async function loadArthome(options) {
  const opts = options || {};
  const base = opts.base || './';
  const get = async (path) => {
    const res = await fetch(base + path);
    if (!res.ok) throw new Error('Arthome: ' + path + ' (' + res.status + ')');
    return res.json();
  };
  const [taxonomy, catalogue, index] = await Promise.all([
    get('taxonomy.json'), get('catalogue.json'), get('i18n/index.json')
  ]);
  // Un seul thème peut suffire : passer { themes: ['actions', 'player'] } n'en
  // charge que deux. Par défaut, tout ce que l'index déclare.
  const wanted = opts.themes
    ? index.files.filter(f => opts.themes.indexOf(f.file.replace('.json', '')) > -1)
    : index.files;
  const parts = await Promise.all(wanted.map(f => get('i18n/' + f.file)));
  const fixtures = (opts.buildFixtures || buildFixtures)({ catalogue, taxonomy, now: opts.now });
  return createArthome({
    taxonomy, fixtures,
    strings: parts, locales: index.locales, i18nFormat: index,
    locale: opts.locale || index.defaultLocale,
    viewerCountry: opts.viewerCountry, now: opts.now
  });
}

export default buildFixtures;
