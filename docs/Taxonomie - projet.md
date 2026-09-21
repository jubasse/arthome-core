# Taxonomie Arthome — référence

## Le modèle

```
UNIVERS              navigation seulement, pas un niveau taxonomique
└── Musique · Scène                    (extensible : Exposition, Cinéma…)

DISCIPLINE           obligatoire, unique, vocabulaire fermé
└── Rock · Jazz · Théâtre · Danse…     (+ disciplines secondaires en interne)

SOUS-GENRE           0..n, vocabulaire fermé
└── post-rock · bebop · théâtre documentaire…

TAG                  0..n, liste plate et canonique
└── blackgaze · DJ set · plein air · création…

ATTRIBUTS            hors taxonomie — données objectives, interrogeables
└── pays · langue · ville · durée · âge minimum · accessibilité ·
    placement · entracte · salle · dates · prix
```

**Les quatre règles :**

- **Discipline** = famille artistique.
- **Sous-genre** = qualification artistique stable. *Ce que l'œuvre **est**.*
- **Tag** = précision transversale ou contextuelle. *Comment, où, pour qui,
  dans quelles conditions on le voit.*
- **Attribut** = donnée objective que l'application doit pouvoir interroger de
  façon fiable, sans dépendre de la vigilance d'un régisseur.

Une discipline est une **forme** — jamais une langue, une époque ni un pays.
« Rap FR » n'existe pas : c'est `discipline = Rap` croisé avec
`artist.country = FR` ou `language = fr`. Le moteur de recherche fait la
traduction ; la taxonomie reste propre.

Les doublons de libellé sont assumés : `music.flamenco` et `dance.flamenco`
sont deux concepts, pas un identifiant répété.

---

## DISCIPLINES ET SOUS-GENRES

### Univers Musique — 14 disciplines

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

### Univers Scène — 7 disciplines

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

Liste **plate et canonique**. Chaque tag a une clé technique stable, un libellé
d'affichage, des alias et un compteur d'usage :

```
tag
  slug          uk-drill                clé stable, jamais affichée
  label         UK drill                affichage
  aliases[]     Drill UK · UK Drill     absorbés à la saisie
  category      STYLE                   plomberie interne, invisible
  usageCount    47                      sert au tri et à la fusion
```

La `category` interne ne crée aucun niveau visible. Elle sert à suggérer
juste : ne pas proposer *blackgaze* parce qu'une salle l'a employé, ne pas
proposer un tag de lieu sur une fiche artiste.

**Qui suggère quoi**

| Source | Suggère |
|---|---|
| Sous-genre | tags de style |
| Artiste | ses tags artistiques |
| Salle | plein air · club · église · chapiteau · lieu patrimonial |
| Date | première · dernière date · création · reprise |
| Éditeur | ajoute ou retire librement |

Tout finit dans **une seule collection de pastilles** sur la fiche, quelle que
soit la provenance. Sur une fiche, aucun seuil : un tag à une occurrence reste
cliquable, c'est de la navigation latérale. Dans une liste globale, tri par
fréquence et coupe de la traîne.

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

### FORM — formes de scène

adaptation littéraire · écriture de plateau · théâtre gestuel · mime ·
commedia dell'arte · tragédie · comédie · farce · monologue ·
spectacle sans paroles · marionnette portée · théâtre d'ombres ·
nouveau cirque · cirque équestre · trapèze · corde lisse · tissu aérien ·
mât chinois · roue Cyr · portés acrobatiques · close-up · mentalisme ·
clown blanc · bouffon

### FORMAT — comment c'est donné

solo · duo · trio · quatuor · grand ensemble · big band · orchestre ·
a cappella · acoustique · amplifié · DJ set · live band · set hardware ·
seul en scène · lecture & mise en espace · récital · version concert ·
ciné-concert · concert commenté · bal participatif · plateau partagé ·
open mic · scène ouverte · grande forme · forme légère · instrumental ·
vocal · improvisé · expérimental · orchestral · hybride

### CONTEXT — quand, où, dans quel cadre

première · avant-première · création · dernière date · reprise de répertoire ·
tournée · résidence · carte blanche · répétition ouverte ·
captation d'archive · festival · plein air · nocturne · after ·
salle historique · lieu patrimonial · friche · club · cabaret · café-théâtre ·
chapiteau · église · amphithéâtre · hors les murs · en appartement ·
déambulatoire

### AUDIENCE — éditorial, en complément de l'attribut

jeune public · tout public · en famille · public averti · scolaire

### EDITORIAL — descripteurs de recommandation

festif · planant · intense · dansant · émouvant · contemplatif · politique ·
drôle · sombre · virtuose

> Ces descripteurs sont **subjectifs**. Ils servent la recommandation et
> l'éditorial, jamais le filtrage factuel, et restent hors du cœur de la
> taxonomie.

---

## ATTRIBUTS STRUCTURÉS

Affichés comme des pastilles, stockés comme des données. Une personne qui
filtre « accessible PMR » ne doit pas dépendre d'un tag oublié.

```
ARTISTE
  countries[]        FR · BE
  languages[]        fr · en
  city               base éventuelle
  disciplines[]      principale + secondaires
  subgenres[]
  tags[]             STYLE uniquement

SPECTACLE
  discipline         obligatoire, unique
  secondaryDisciplines[]
  subgenres[]        0..n
  tags[]
  language           langue de jeu
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
  surtitles[]        langues
  subtitles[]        langues
  tags[]             CONTEXT et FORMAT propres à cette date

LIEU
  city · country · region · timezone · capacity
  venueType          salle · club · église · chapiteau · friche · plein air
  accessibility      permanente, héritée par ses dates
```

La fiche événement **agrège** artiste + spectacle + date + lieu. Un même
spectacle donné en version scénique un soir et en version concert le lendemain
porte le tag sur la **date**, pas sur le spectacle.

---

## Ce qui a changé, et pourquoi

1. **`opéra symphonique` retiré de Classique.** Un opéra est un opéra :
   `discipline = Opéra`. Un orchestre qui joue des airs sans mise en scène,
   c'est `Classique / symphonique` + tag *répertoire lyrique*. Sinon la même
   représentation bascule d'une discipline à l'autre selon l'humeur du mardi
   matin.
2. **Les formats sortent des sous-genres** : électro live, ciné-concert,
   version concert, seul en scène, duos & troupes, plateau & scène ouverte,
   récital, lecture & mise en espace, grande forme.
3. **Les lieux sortent aussi** : café-théâtre, cabaret circassien.
4. **`jeune public` devient l'attribut `minimumAge`**, exposé comme filtre de
   premier plan — pas enterré dans les options. La filière jeune public est
   servie par le filtre aussi bien que par un rayon.
5. **`bal participatif` devient `bal`**, et reste un sous-genre de Danse : le
   bal a un répertoire, des chorégraphes et un réseau de diffusion.
   « Participatif » est le tag.
6. **`variété` descend en tag.** C'est une époque et une scène — de la pop
   française des années 60-80 — donc le même cas que « rap fr ». La
   **chanson**, elle, reste une discipline : c'est une forme, définie par la
   primauté du texte, pas par la langue.
7. **Pays et langue séparés.** Un artiste belge rappe en français, un français
   chante en anglais.
8. **Slug ≠ label.** `uk-drill` est la clé, « UK drill » l'affichage, avec
   alias et fusion.
