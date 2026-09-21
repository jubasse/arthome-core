# Arthome taxonomy — reference

## The model

```
UNIVERSE             navigation only, not a taxonomic level
└── Musique · Scène                    (extensible: Exposition, Cinéma…)

DISCIPLINE           mandatory, unique, closed vocabulary
└── Rock · Jazz · Théâtre · Danse…     (+ secondary disciplines internally)

SUBGENRE             0..n, closed vocabulary
└── post-rock · bebop · théâtre documentaire…

TAG                  0..n, flat and canonical list
└── blackgaze · DJ set · plein air · création…

ATTRIBUTES           outside the taxonomy — objective, queryable data
└── country · language · city · duration · minimum age · accessibility ·
    seating · intermission · venue · dates · prices
```

**The four rules:**

- **Discipline** = artistic family.
- **Subgenre** = stable artistic qualification. *What the work **is**.*
- **Tag** = cross-cutting or contextual detail. *How, where, for whom,
  under what conditions you see it.*
- **Attribute** = objective data that the application must be able to query
  reliably, without depending on a stage manager's vigilance.

A discipline is a **form** — never a language, an era or a country. There is no
"Rap FR": that is `discipline = Rap` crossed with `artist.country = FR` or
`language = fr`. The search engine does the translation; the taxonomy stays
clean.

Duplicate labels are deliberate: `music.flamenco` and `dance.flamenco` are two
concepts, not one repeated identifier.

---

## DISCIPLINES AND SUBGENRES

### Musique universe — 14 disciplines

**Rock**
rock classique · rock alternatif · indie · punk · post-punk · emo · garage ·
psychédélique · rock progressif · hard rock · shoegaze · post-rock

**Metal**
heavy metal · thrash · death metal · black metal · doom & stoner · power metal ·
metal progressif · metalcore · deathcore · nu metal ·
metal symphonique & gothique · metal industriel · folk & pagan

**Pop**
pop · synth-pop · indie pop · dream pop · électro-pop · new wave · pop urbaine ·
K-pop · hyperpop

**Chanson**
chanson à texte · nouvelle chanson · slam · chanson jazz · chanson folk ·
chanson théâtrale

**Folk & country**
folk · americana · country · bluegrass · folk-rock · musique traditionnelle
nord-américaine

**Rap**
boom bap · hardcore & gangsta · rap conscient · rap à texte · jazz rap · trap ·
drill · cloud rap · emo rap · afro-trap

**R&B**
R&B contemporain · neo-soul · trap soul · slow jam · afro R&B · new jack swing

**Soul, funk & gospel**
soul · Motown · funk · P-funk · disco · gospel · afrobeat

**Électro**
techno · house · deep house · drum & bass · dubstep · trance · hardstyle ·
ambient · IDM · breakbeat · UK garage · synthwave

**Jazz**
jazz moderne · bebop · hard bop · cool jazz · jazz modal · free jazz ·
jazz vocal · big band · jazz fusion · nu jazz · jazz manouche · afro-jazz

**Blues**
blues acoustique · Delta blues · Chicago blues · blues rock · boogie ·
soul blues · gospel blues

**Reggae & dub**
roots reggae · dub · dancehall · ska · rocksteady · ragga · dub poetry

**Musiques du monde**
afrobeat & highlife · mbalax & musiques ouest-africaines · raï & chaâbi ·
musiques andalouses · salsa & son cubain · cumbia · samba & bossa nova ·
flamenco · fado · musiques celtiques · musiques balkaniques ·
musiques indiennes · musiques d'Asie de l'Est

**Classique**
symphonique · musique de chambre · baroque · musique sacrée · musique chorale ·
musique contemporaine · musique ancienne

### Scène universe — 7 disciplines

**Théâtre**
répertoire classique · théâtre contemporain · théâtre documentaire ·
théâtre d'objets & marionnettes · théâtre musical · improvisation ·
théâtre de rue

**Danse**
ballet classique · néoclassique · danse contemporaine ·
hip-hop & danses urbaines · danse-théâtre · claquettes & danses percussives ·
flamenco · danses traditionnelles · bal · butō · danse africaine

**Cirque**
cirque contemporain · aérien · acrobatie · jonglage · équilibre & main à main ·
magie & illusion · clown · arts de la rue

**Humour**
stand-up · improvisation · satire & humour politique · humour musical

**Opéra**
grand opéra · bel canto · opéra classique · opéra baroque · opéra contemporain ·
opérette · opéra de chambre

**Comédie musicale**
création originale · jukebox · cabaret & revue · rock opera

**Performance**
pluridisciplinaire · art performance · performance sonore · arts numériques ·
théâtre immersif · conférence-performance · installation vivante ·
danse-performance

---

## TAGS

A **flat and canonical** list. Each tag has a stable technical key, a display
label, aliases and a usage counter:

```
tag
  slug          uk-drill                stable key, never displayed
  label         UK drill                display
  aliases[]     Drill UK · UK Drill     absorbed on input
  category      STYLE                   internal plumbing, invisible
  usageCount    47                      used for sorting and merging
```

The internal `category` creates no visible level. It exists to suggest
accurately: not to offer *blackgaze* because a venue once used it, not to offer
a venue tag on an artist page.

**Who suggests what**

| Source | Suggests |
|---|---|
| Subgenre | style tags |
| Artist | their own artistic tags |
| Venue | plein air · club · église · chapiteau · lieu patrimonial |
| Date | première · dernière date · création · reprise |
| Editor | adds or removes freely |

Everything ends up in **a single collection of badges** on the page, whatever
its provenance. On a page, no threshold: a tag with a single occurrence stays
clickable, that is lateral navigation. In a global list, sort by frequency and
cut off the long tail.

> **The lists below are illustrative, not exhaustive.** The tag vocabulary
> lives in `shared/taxonomy.json`, which is the sole authority on its contents
> and on how many there are; the selection printed here is shorter. Read the
> count from the file, never from this page.

### STYLE — micro-genres

**Rock, metal, punk**
noise rock · math rock · grunge · britpop · cold wave · hardcore · crust ·
screamo · post-hardcore · sludge · grindcore · mathcore · melodic metalcore ·
death mélodique · death technique · brutal death · black atmosphérique ·
blackgaze · funeral doom · viking metal · djent · speed metal · glam ·
metal alternatif

**Électronique**
techno minimale · acid techno · techno de Detroit · dub techno · hard techno ·
tech house · acid house · afro house · disco house · garage house · jungle ·
liquid drum & bass · neurofunk · breakcore · gabber · frenchcore ·
hardcore rave · psytrance · progressive trance · downtempo · drone · glitch ·
footwork · bass music · lo-fi · vaporwave · french touch · electroclash

**Rap, R&B, soul**
phonk · plugg · rage · UK drill · afroswing · g-funk · horrorcore · freestyle ·
battle rap · turntablism · rap instrumental · trip-hop · funk carioca ·
quiet storm · philly soul · deep funk · northern soul · gospel contemporain

**Jazz, blues, classique**
swing · latin jazz · spiritual jazz · jazz électrique · improvisation libre ·
fanfare · jump blues · polyphonie · musique minimaliste · musique spectrale ·
musique répétitive · musique électroacoustique · répertoire lyrique · requiem ·
oratorio · cantate

**Musiques du monde**
gnawa · touareg · afro-cubain · timba · bachata · reggaeton · forró · choro ·
morna · zouk · kompa · maloya · séga · klezmer · rebetiko · qawwali ·
carnatique · hindustani · gamelan · musique bretonne · musique corse ·
polyphonie géorgienne · yodel

### FORM — stage forms

adaptation littéraire · écriture de plateau · théâtre gestuel · mime ·
commedia dell'arte · tragédie · comédie · farce · monologue ·
spectacle sans paroles · marionnette portée · théâtre d'ombres ·
nouveau cirque · cirque équestre · trapèze · corde lisse · tissu aérien ·
mât chinois · roue Cyr · portés acrobatiques · close-up · mentalisme ·
clown blanc · bouffon

### FORMAT — how it is given

solo · duo · trio · quatuor · grand ensemble · big band · orchestre ·
a cappella · acoustique · amplifié · DJ set · live band · set hardware ·
seul en scène · lecture & mise en espace · récital · version concert ·
ciné-concert · concert commenté · bal participatif · plateau partagé ·
open mic · scène ouverte · grande forme · forme légère · instrumental ·
vocal · improvisé · expérimental · orchestral · hybride

### CONTEXT — when, where, in what setting

première · avant-première · création · dernière date · reprise de répertoire ·
tournée · résidence · carte blanche · répétition ouverte ·
captation d'archive · festival · plein air · nocturne · after ·
salle historique · lieu patrimonial · friche · club · cabaret · café-théâtre ·
chapiteau · église · amphithéâtre · hors les murs · en appartement ·
déambulatoire

### AUDIENCE — editorial, alongside the attribute

jeune public · tout public · en famille · public averti · scolaire

### EDITORIAL — recommendation descriptors

festif · planant · intense · dansant · émouvant · contemplatif · politique ·
drôle · sombre · virtuose

> These descriptors are **subjective**. They serve recommendation and
> editorial, never factual filtering, and stay outside the core of the
> taxonomy.

---

## STRUCTURED ATTRIBUTES

Displayed as badges, stored as data. Someone filtering on "wheelchair
accessible" must not be left depending on a forgotten tag.

```
ARTIST
  countries[]        FR · BE
  languages[]        fr · en
  city               home base, if any
  disciplines[]      primary + secondary
  subgenres[]
  tags[]             STYLE only

SHOW
  discipline         mandatory, unique
  secondaryDisciplines[]
  subgenres[]        0..n
  tags[]
  language           language of performance
  runtimeMin
  minimumAge         6 · 12 · 16 · null
  audience           family · all-audiences · adults

DATE
  startsAt · venue · prices · seats
  isPremiere · isFinal · isCreation
  seatingMode        seated · standing · mixed
  intermission       true · false
  accessibility
    wheelchair       true · false
    signLanguage     true · false
    audioDescription true · false
    relaxed          true · false
  surtitles[]        languages
  subtitles[]        languages
  tags[]             CONTEXT and FORMAT specific to this date

VENUE
  city · country · region · timezone · capacity
  venueType          salle · club · église · chapiteau · friche · plein air
  accessibility      permanent, inherited by its dates
```

The event page **aggregates** artist + show + date + venue. The same show given
as a staged version one evening and as a concert version the next carries the
tag on the **date**, not on the show.

---

## What changed, and why

1. **`opéra symphonique` removed from Classique.** An opera is an opera:
   `discipline = Opéra`. An orchestra playing arias with no staging is
   `Classique / symphonique` + the tag *répertoire lyrique*. Otherwise the same
   performance swings from one discipline to the other depending on the mood on
   a Tuesday morning.
2. **Formats move out of the subgenres**: électro live, ciné-concert,
   version concert, seul en scène, duos & troupes, plateau & scène ouverte,
   récital, lecture & mise en espace, grande forme.
3. **Venues move out too**: café-théâtre, cabaret circassien.
4. **`jeune public` becomes the `minimumAge` attribute**, exposed as a
   front-line filter — not buried in the options. The young-audience segment is
   served by the filter just as well as by a shelf.
5. **`bal participatif` becomes `bal`**, and stays a subgenre of Danse: the bal
   has a repertoire, choreographers and a distribution network.
   "Participatif" is the tag.
6. **`variété` is demoted to a tag.** It is an era and a scene — French pop
   of the 60s to the 80s — so it is the same case as "rap fr". **Chanson**,
   on the other hand, remains a discipline: it is a form, defined by the
   primacy of the text, not by the language.
7. **Country and language separated.** A Belgian artist raps in French, a
   French one sings in English.
8. **Slug ≠ label.** `uk-drill` is the key, "UK drill" the display, with
   aliases and merging.
