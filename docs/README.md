# Arthome — dossier de passation

Plateforme de diffusion en direct de spectacle vivant : billetterie, direct,
tchat, rediffusions, boutique, versements aux artistes.

Ce dossier est la référence de départ pour l'implémentation réelle. **À
committer à la racine d'`arthome-core`**, dans `docs/` — chaque session Claude
Code doit pouvoir le relire.

> **Corrigé le 21 septembre 2026.** Ce document a été rédigé avant plusieurs
> décisions structurantes, et il les contredisait. Les écarts sont détaillés dans
> `arthome-core/architecture/corrections-handoff.md` ; la version d'origine est
> conservée à côté sous `README.pre-corrections.md`.
> Les corrections portent sur : le multi-dépôts (§3, §8), les deux paquets de
> `arthome-core` (§3), Protobuf seul (§3), l'observabilité (§3), les usages de
> Redis (§3), et les ADR à écrire (§9). Trois sections ont été ajoutées pour
> combler des silences : authentification, topologie d'entrée et paiement (§3).

---

## 1. Ce que contient ce dossier, et comment le traiter

Deux natures bien distinctes. Les confondre coûterait des semaines.

### `shared/` — à reprendre, pas à réécrire

Du JavaScript sans framework, déjà en production dans les cinq maquettes comme
**source unique de vérité**. Ces fichiers portent la taxonomie, le contenu
rédigé, les règles du domaine et toute la copie bilingue.

| Fichier | Rôle |
|---|---|
| `taxonomy.json` | 21 disciplines, 176 sous-genres, 205 tags, rang éditorial |
| `catalogue.json` | Contenu rédigé : artistes, salles, spectacles de référence, réserve de photos, annuaire des intervenants, barème de commission |
| `fixtures.js` | Génération déterministe du jeu de données complet, sens studio → storefront |
| `helpers.js` | Accesseurs, formatage, horodatage, i18n |
| `studio-data.js` | Remodelage vers les formes attendues par les deux régies |
| `i18n/` | Copie fr/en, découpée par domaine + plans de correspondance |
| `i18n-compile.js` | Compile les dictionnaires dans chaque surface, avec contrôle d'intégrité |

**Le travail attendu** : porter ces fichiers en TypeScript typé dans
`@arthome/core`. Pas les réinventer. Les règles qu'ils portent — état d'une date,
fenêtre de rediffusion, calcul d'un versement, droits par rôle — ont été
éprouvées écran par écran.

⚠ **`shared/` fait autorité sur les règles et le vocabulaire, pas sur les
formes.** Un générateur de fixtures est optimisé pour afficher des maquettes, pas
pour tenir un modèle réparti sur sept contextes. Champs d'audit, versions, états
intermédiaires, multiplicité réelle des relations, nullabilité, médias, plans de
salle : tout cela en est absent, et la réalité sera plus complexe. **On porte les
règles, on remodèle les formes.**

Sept points où `shared/` porte une donnée fausse, incomplète ou trompeuse sont
relevés dans `corrections-handoff.md`, famille D. Deux méritent d'être connus
avant d'ouvrir le fichier :

- le vocabulaire fermé de `languageDependency` ne contient pas `essential`, alors
  que c'est la valeur dont dépend `hasLanguageBarrier` et que cinq spectacles la
  portent ;
- la formule de versement (`net = brut − commission − TVA`) **ressemble** à une
  règle fiscale éprouvée. Ce n'en est pas une : elle produit un nombre plausible
  pour une maquette. Ce qui fait autorité, c'est la commission de 12 %, le délai
  de 14 jours et la politique de retenue — pas l'assiette de la TVA.

`fixtures.js` a une seconde vie après le portage : il reste le **jeu de données
de test et de démonstration**. Déterministe, il produit le même catalogue à
chaque exécution — un socle solide pour les tests d'intégration et les
environnements de recette.

### `mockups/` — des références visuelles à recréer

Cinq fichiers HTML qui montrent l'intention : mise en page, comportements,
états, copie exacte. **Ce ne sont pas des composants à porter.** Chaque
application les recrée avec les conventions de sa propre pile.

Fidélité : **haute**. Couleurs, typographie, espacements et transitions sont
définitifs. Le rendu attendu est fidèle au pixel.

⚠ **Dans la disposition actuelle de ce dossier, les maquettes ne s'ouvrent
PAS.** Chacune résout `helpers.js`, `fixtures.js`, `catalogue.json`,
`taxonomy.json` et `i18n/` **à côté de son propre fichier HTML**
(`new URL(p, document.baseURI)`), alors que ces fichiers sont dans `shared/`.
L'import échoue et le `try/catch` l'avale : la maquette rend en état dégradé,
sans dire pourquoi. **`shared/` doit être placé à côté des `.dc.html`** — copie
ou lien symbolique — sinon la galerie du palier 0 sera vide de données. À traiter
au moment de déplacer les maquettes vers `prototypes/`.

Une fois `shared/` à côté d'eux, ces fichiers s'ouvrent directement dans un
navigateur (par un serveur local : les modules ES et `fetch` n'aiment pas
`file://`). Ils sont destinés à
`prototypes/`, publiés sur GitHub Pages (voir §3 et §8).

---

## 2. Les cinq surfaces

| Surface | Fichier | Pile visée | Particularité |
|---|---|---|---|
| **Storefront Web** | `Storefront Web.dc.html` | Next.js | 1440 px. Référencement et rendu serveur décisifs : c'est un catalogue de billetterie |
| **Storefront Mobile** | `Storefront Mobile.dc.html` | React Native | 430 px. Portrait et paysage, cinq onglets bas |
| **Storefront TV** | `Storefront TV.dc.html` | react-native-tvos | 1920×1080. **Tout se pilote à cinq touches** — voir §6 |
| **Studio** | `Studio.dc.html` | Angular | 1440 px. Régie, modération, billetterie, versements |
| **Studio Mobile** | `Studio Mobile.dc.html` | Angular (voir §7) | 430 px. Outil de garde, portrait et paysage |

Le storefront et le studio sont **deux produits séparés**. Le studio n'existe
pas sur TV : la télévision est une surface de spectateur, rien d'autre.

---

## 3. Architecture : multi-dépôts, microservices, événements

Le découpage est volontairement ambitieux : **démontrer une architecture
distribuée est un objectif du projet**, pas un moyen. Un monolithe modulaire
serait plus rapide à livrer mais ne montrerait pas ce qu'il s'agit de montrer.

### Multi-dépôts

Trois natures de dépôt. **« Multi-dépôts » ne veut pas dire « un dépôt par
service »** : les sept services restent ensemble.

```
arthome-core/              le domaine, les contrats, la vitrine
├── README.md              schéma système, galerie, lecture en 30 secondes
├── docs/                  ce dossier de passation, corrigé
├── prototypes/            les cinq maquettes, publiées sur GitHub Pages
├── architecture/          carte des contextes, modèle de données, événements, ADR
├── proto/                 schémas d'événements et services gRPC
├── openapi/               un contrat par BFF
└── packages/
    ├── core/              @arthome/core — le domaine, zéro dépendance framework
    └── contracts/         @arthome/contracts — DTO de frontière et code généré

arthome-platform/          les sept services NestJS et l'infrastructure
├── services/
└── infra/                 docker-compose, Kubernetes, observabilité

arthome-storefront-web/    Next.js          un dépôt par application
arthome-storefront-mobile/ React Native
arthome-storefront-tv/     react-native-tvos
arthome-studio-web/        Angular
arthome-studio-mobile/     Angular + Ionic + Capacitor
```

**Deux paquets, pas un.** Le domaine et les contrats sont publiés séparément sur
GitHub Packages, parce que le code Protobuf généré embarque un **runtime** que
`@arthome/core` s'interdit. Les mélanger contaminerait le domaine et casserait la
règle qui fait tout son intérêt.

**Pourquoi les services restent ensemble.** C'est ce qui donne encore un sens au
cache de tâches et à l'« exécution par service touché » : avec sept dépôts, ces
deux dispositifs tomberaient, et une personne seule paierait sept chaînes de CI
pour un seul système.

Gestionnaire de paquets : **pnpm**. Outillage minimal — pnpm workspaces à
l'intérieur d'`arthome-core` et d'`arthome-platform`, turborepo uniquement pour
le cache de tâches. **Pas de Nx** : ses générateurs, exécuteurs et migrations
deviennent un projet dans le projet.

> La friction Metro/pnpm documentée dans la version d'origine de ce document
> — liens symboliques mal supportés, conflit entre `react-native-tvos` et les
> autres projets Expo d'un même espace de travail — **disparaît avec le
> multi-dépôts** : chaque application mobile a son dépôt, son `node_modules` et
> son lockfile. Le `.npmrc` `node-linker=hoisted` n'a plus d'objet.

### `@arthome/core` — le domaine

```
arthome-core/packages/core/src/
├── taxonomy/      disciplines, genres, tags, rang éditorial
├── catalog/
├── fixtures/      jeu de données déterministe (tests et démonstration)
├── i18n/          clés fr/en + compilation
└── domain/
    ├── booking/       état d'une date, issues, jauge, code de place
    ├── replay/        fenêtre de rediffusion, heures restantes
    ├── payout/        commission, TVA, net à verser, retenue
    ├── permissions/   droits par rôle, invitations
    └── timezone/      heure de salle contre heure du spectateur
```

**Règle stricte : zéro dépendance framework.** Pas de React, pas d'Angular, pas
de Nest, pas d'API navigateur, pas de Node spécifique dans les règles métier. Le
paquet doit fonctionner sous Node, Next, Metro, `react-native-tvos`, Angular et
NativeScript. La sophistication va dans le domaine, jamais dans le
`package.json`.

C'est ce qui rend l'histoire lisible d'un coup d'œil : **le domaine appartient à
Arthome, pas aux frameworks.** React, Angular et NestJS n'en sont que des
consommateurs.

Ce projet en a fait la démonstration pendant la conception : **l'essentiel des
défauts corrigés étaient des valeurs composées à deux endroits** — un code de
place, un compteur d'audience, un libellé d'état, un total de commande. Si une
valeur apparaît sur deux écrans, elle vient de `@arthome/core`. Sans exception.

### Les services

Sept services, découpés par **contexte métier** et non par entité. Un
`artist-service` et un `venue-service` séparés seraient le contresens à
éviter : ils appartiennent au même contexte.

```
identity        comptes, sessions, rôles
catalog         artistes, spectacles, salles, dates — un seul contexte
ticketing       places, commandes, paiements, issues
streaming       sessions de diffusion, clés, incidents, jetons de lecture
chat            messages, modération, régimes
payouts         commission, TVA, versements, trésorerie
notifications   alertes, rappels, courriels
```

⚠ **Trois familles de données n'ont, à ce jour, aucun contexte propriétaire** —
elles existent dans `shared/`, s'affichent sur plusieurs surfaces, et n'entrent
dans aucun des sept contextes ci-dessus :

- les **abonnements** (`plans` : free, pass, premium, avec leurs droits `opens[]`
  et la remise `seatDiscount`), qui **conditionnent l'accès à la lecture** ;
- la **boutique** (`merch` : stock, ventes, état, et des frais de port dans le
  panier du storefront web) ;
- l'**annuaire des intervenants** (`people`, dont des indépendants travaillant
  sur plusieurs chaînes) et les **chaînes** (`channels`, une par artiste, avec
  leurs membres et la table `grants` qui dit qui peut inviter qui) — à cheval
  entre `identity` et `catalog`.

À rattacher ou à isoler dans `architecture/context-map.md`. Un service de plus se
paie en exploitation, pour une personne seule.

### Aucun appel synchrone entre services

Kafka est le **seul** canal inter-services. Si un appel synchrone existe, il ne
peut aller que **du BFF vers un service** — c'est de l'entrée. **Jamais entre
services**, quel que soit le transport (HTTP, gRPC, TCP Nest).

### Événements

**Kafka** comme épine dorsale, avec les pratiques qui rendent le découpage
crédible plutôt que récité :

- **Schémas d'événements versionnés** — **Protobuf**, outillé par `buf`
  (`buf lint`, `buf breaking`), avec Schema Registry. Le choix entre Avro et
  Protobuf est tranché : c'est Protobuf. Conséquence à tenir : un événement
  décodé depuis Kafka n'est **jamais** revalidé par zod — le registre fait foi.
  C'est le vrai signal technique, bien plus que le nombre de services.
- **Motif outbox** pour la cohérence entre l'écriture en base et la publication :
  l'écriture métier et la ligne d'outbox dans la **même transaction**, publiée
  par Debezium. Jamais un envoi Kafka depuis le code applicatif après un commit.
- **Consommateurs idempotents**, avec clé de déduplication.
- **Kafka Connect avec Debezium** pour la capture de changements PostgreSQL et
  la synchronisation vers l'index de recherche. C'est là qu'il gagne sa place —
  pas en simple tuyau entre deux services.
- **Deux mécanismes de rebut distincts**, à ne pas amalgamer : la DLQ native de
  Kafka Connect (`errors.deadletterqueue.topic.name`) pour les échecs de
  connecteur, et un motif propre aux consommateurs — sujet de reprise avec délai
  croissant, puis sujet de rebut — pour les échecs métier.

### Infrastructure

| Brique | Rôle |
|---|---|
| **PostgreSQL 18** | une base par service. ORM **TypeORM ^1.1** — syntaxe objet uniquement pour `relations`/`select`. Identifiants en **UUIDv7** (`uuidv7()` natif) |
| **Kafka + Kafka Connect** | journal d'événements, CDC Debezium, DLQ |
| **Redis** | **quatre usages séparés** — voir ci-dessous |
| **OpenSearch** | recherche et facettes du catalogue |
| **MinIO** | stockage objet compatible S3 — enregistrements, rediffusions |
| **Observabilité** | simple pour l'instant. **`traceparent` (W3C) propagé dès le premier producteur**, en HTTP **et** en Kafka. OpenTelemetry complet plus tard |

**Les quatre usages de Redis, à ne jamais confondre :**

```
sessions              au BFF SEULEMENT — aucun service ne lit le magasin
cache                 par service, jamais partagé entre services
adaptateur Socket.IO  diffusion aux clients connectés
BullMQ                jobs INTERNES à un service, jamais entre deux services
```

La dernière règle est la plus facile à enfreindre : BullMQ entre deux services
rouvrirait par la porte de derrière le couplage synchrone que Kafka existe pour
interdire.

**Validation : zod, partout.** Configuration, DTO, entrées de formulaire, côté
serveur comme côté client. Découpage par nature et non par couche : les
invariants du domaine restent du TypeScript pur dans `@arthome/core` ; les
schémas de base partagés (Money, ShowId, Locale) vivent dans `core` en zod ; les
DTO de frontière vivent dans `@arthome/contracts` ; la configuration est validée
au démarrage **dans chaque service**, jamais par un schéma d'env centralisé.
zod devient de ce fait une dépendance d'exécution partagée par sept services et
cinq applications : `peerDependency`, version épinglée, et une montée majeure
traitée comme un changement de contrat.

**Pourquoi OpenSearch** plutôt qu'Elasticsearch : licence Apache 2.0, réellement
libre, et le connecteur *sink* Elasticsearch de Kafka Connect fonctionne tel quel
— décisif puisque la synchronisation passe par Connect. Son modèle d'agrégations
colle à la taxonomie : facettes sur 21 disciplines, 176 genres, 205 tags, plus
ville, date, tarif et disponibilité. **Penser à l'analyseur `french`** (élisions,
radicaux), sans quoi « l'opéra » et « opéra » ne se trouveront pas.

Meilisearch serait meilleur en qualité de recherche par heure investie, mais n'a
pas de connecteur Kafka Connect officiel.

**La propagation de `traceparent` dès le premier producteur.** L'outillage
d'observabilité est reportable ; la **propagation** ne l'est pas. Un événement
publié sans `traceparent` est définitivement orphelin — on ne le rattache pas
après coup. OpenTelemetry viendra ensuite, et il viendra bien moins cher si
`traceparent` circule déjà. La trace complète
`POST /tickets → ticketing → paiement → calcul de versement → base` impressionne
davantage à la lecture qu'un dossier de manifestes Kubernetes.

### Topologie d'entrée, et les deux BFF

Rien dans la version d'origine de ce document ne reliait les applications aux
services. Il manquait deux briques :

- une **passerelle d'infrastructure** (Traefik, Envoy) pour TLS, routage et
  limites de débit. Router est un travail d'infrastructure ; le réécrire en code
  serait refaire, moins bien, ce qu'un reverse proxy standard fait en
  configuration. **Écartée d'avance** : une passerelle applicative NestJS qui ne
  ferait que redispatcher ;
- **un BFF par produit** (storefront, studio). Il ne garde que ce qui est métier :
  composer les réponses, adapter par surface, et **échanger la session contre un
  jeton signé de courte durée**. C'est ce mécanisme qui fait qu'aucun service
  n'appelle jamais le service d'identité ni ne lit le magasin de sessions — le
  jeton se vérifie par JWKS, localement.

L'usage de gRPC se décide **sur preuve** : compter, à partir des besoins de
chaque surface, le nombre d'appels synchrones BFF → service réellement
nécessaires. En lecture, souvent aucun — si les modèles de lecture sont projetés
là où le BFF les lit. En écriture, souvent oui : « acheter une place » exige une
réponse immédiate. Une poignée de commandes appelle HTTP/JSON décrit en OpenAPI ;
beaucoup d'appels, ou des schémas déjà en Protobuf, appellent gRPC.
→ `architecture/context-map.md`.

### Authentification

Absente de la version d'origine de ce document. Les besoins réels : 2FA,
réinitialisation de mot de passe, **connexion sur téléviseur**, connexions
sociales (Google, Facebook) et par courriel — sur cinq surfaces dont deux sans
clavier utilisable.

Le point décisif : **sur une télévision, le lien magique est le mauvais outil**.
Le standard est le **device flow OAuth (RFC 8628)** — un code court affiché sur
l'écran, saisi sur le téléphone. C'est d'ailleurs le mécanisme que la maquette TV
emploie déjà pour quatre parcours distincts : se connecter, acheter une place,
s'abonner et acheter du merch. **Une seule primitive**, pas quatre.
→ `architecture/adr-auth.md`.

### Paiement et versements

La version d'origine décrivait `ticketing` comme portant « places, commandes,
paiements » sans un mot de plus — alors que `shared/catalogue.json` fixe déjà la
commission (**12 %**) et le délai de versement (**14 jours**).

Le cas canonique est **Stripe Connect** : la plateforme encaisse pour le compte
d'artistes, prélève une commission, reverse. Traité en **mode test**, gratuit et
sans argent réel. Le découpage : `ticketing` encaisse, `payouts` calcule le droit,
et **Stripe reste la source de vérité du mouvement d'argent** — on ne reconstruit
jamais son grand livre, on **réconcilie**. Périmètre PCI évité (Checkout ou
Elements, aucun numéro de carte ne transite). Un port dans le domaine et deux
adaptateurs : un **factice par défaut**, pour que la démonstration publique et
les tests tournent sans clé ni réseau, et un **Stripe en mode test**.
→ `architecture/adr-payments.md`.

### Internationalisation : catalogue de libellés servi dynamiquement

`i18n-compile.js` compile les dictionnaires dans chaque surface au build. Cela
reste vrai, mais ne suffit plus : corriger une coquille sur mobile ou sur TV
demanderait d'attendre une revue de magasin.

Le modèle retenu : `core` garde les **clés** et le catalogue de référence, un
service sert les **mises à jour par-dessus**, la lecture passe par des
**artefacts versionnés immuables** en CDN (`/i18n/<locale>/v<N>.json`) et non par
un appel à chaque page, et chaque application embarque un **instantané au build**
comme repli obligatoire — jamais un code brut affiché si le service est
indisponible. Les clés sont typées depuis `core`, le catalogue est **additif**,
avec validation ICU à la publication et échappement systématique : une traduction
est un vecteur d'injection.

**i18n par codes** : l'API renvoie des codes et leurs paramètres, jamais des
phrases — enveloppe d'erreur comprise. Un échec de validation zod se traduit en
**code**, jamais en message anglais de zod, sinon l'i18n fuit dès la première
erreur de formulaire. Dates, montants et pluriels sont formatés côté client avec
`Intl`.

**Montants** : une unité canonique (centimes entiers + code devise) en base et
dans les contrats. La règle d'arrondi est du domaine et vit dans `@arthome/core` ;
le formatage est de la présentation. Jamais de chaîne formatée stockée ni
transportée, sauf dans un document (facture).

### Diffusion vidéo

Voir `streaming.md`, dans ce dossier. En résumé : plan de contrôle en NestJS,
plan média délégué (MediaMTX en développement et en démonstration, fournisseur
managé en production), derrière des ports. Trois points où le domaine touche
l'infrastructure y sont traités : lecture signée en périphérie de CDN, écran
d'attente en voile client, fenêtre de rediffusion propriété du domaine.

## 4. Jetons de design

Deux palettes distinctes, assumées : le storefront est chaleureux et éditorial,
le studio est un outil de travail.

### Storefront (web, mobile, TV)

```
Fond          #0B0A09
Panneaux      #100F0D  #17140F  #1A1815
Surfaces      #1F1C19  #221F1B  #262320
Bordures      #2E2A24  #332E28  #4A423A  #575047
Encre         #EDE7DC (principale)  #C9C0B2  #9B948A  #857E73  #8B857C  #6B6459
LIVE          oklch(0.62 0.21 27)   le rouge d'antenne — jamais décoratif
ACCENT        oklch(0.78 0.13 42)   ambre des rappels et rediffusions
OR            oklch(0.9 0.07 84)    places détenues, rareté
OK            oklch(0.7 0.13 150)   confirmations
```

### Studio

```
Fond          #0E0F10
Panneaux      #15171A  #111316
Bordures      #23272C  #2A2F35  #1D2126
Encre         #E6E9EC (principale)  #C6CDD4  #98A0A8  #8B949E  #6E7681  #5B636B  #4A535C
OK            oklch(0.72 0.14 155)
WARN          oklch(0.78 0.13 75)
LIVE          oklch(0.7 0.19 27)
INFO          oklch(0.72 0.11 235)
MUTE          oklch(0.75 0.12 300)
```

**Règle du rouge** : `LIVE` ne sert qu'à l'antenne. Une promotion n'est jamais
rouge. Une pastille d'antenne ne s'affiche que s'il y a effectivement un direct
— jamais « 0 EN DIRECT ».

### Typographie

- **Instrument Serif** — titres de spectacle, noms d'artistes, accroches. La signature Arthome.
- **Archivo** — texte courant, boutons, descriptions.
- **JetBrains Mono** — heures, durées, prix, compteurs, codes, libellés de section.

### Formes

Rayon 4 px sur cartes et boutons, cercles pour les avatars. Pastilles d'état :
bordure 1 px à la couleur de l'état, texte à la même couleur, fond voilé à 14 %
via `color-mix(in oklch, <couleur> 14%, transparent)`.

### Planchers de taille

| Surface | Minimum |
|---|---|
| Storefront web / studio | 12 px, mono 9 px pour les libellés de section |
| Mobile | cibles tactiles 44 px minimum |
| **TV** | **18 px absolu**, texte courant 26 px, titre de carte 26→30 px, bouton 24 px |

---

## 5. Principes de conception à ne pas perdre

Ils ont coûté cher à établir. Les réintroduire serait une régression.

1. **Une seule source de vérité.** Chaque affichage dérive de la donnée, jamais
   d'un littéral parallèle. Aucun compteur, aucune pastille, aucun code écrit en dur.
2. **Le rouge d'antenne ne sert qu'à l'antenne.**
3. **Une place détenue ouvre le spectacle.** Ne jamais proposer « prendre ma
   place » à qui l'a déjà. Le verrou d'aperçu ne s'applique qu'aux non-détenteurs.
4. **Les états d'issue priment sur tout le reste** : annulée et remboursée,
   reportée avec places valables, interrompue avec avoirs. En rouge, avec
   l'explication en clair et ce que le spectateur doit en faire.
5. **La politique de rediffusion est lisible avant l'achat** — c'est elle qui
   justifie l'écart de tarif.
6. **Jamais de spinner muet.** Un incident dit toujours si le problème vient du
   spectateur ou de la salle.
7. **Squelettes de chargement**, jamais de page blanche.
8. **États vides explicites**, avec une action qui sort de l'impasse.
9. **Deux fuseaux** : l'heure du spectateur d'abord, l'heure de salle en second
   quand elle diffère.
10. **Les actions inertes sont proscrites.** Un état d'interface répond toujours.
    Ne restent inertes que les appels à un service externe.

---

## 6. Le storefront TV — le sujet à part

`Prompt - Storefront TV.md` (dans ce dossier) contient le cahier des charges
complet. L'essentiel :

**Tout se pilote à cinq touches.** C'est ce qui sépare une vraie application TV
d'un site affiché en grand.

- Un et un seul élément focalisé, toujours visible sans défilement
- Déplacement en croix, vers le voisin géométrique le plus proche dans l'axe demandé
- Trois signaux de focus simultanés : échelle 1,08 · cerne 3 px + ombre portée ·
  révélation du titre et de la métadonnée
- **Mémoire de focus** : revenir sur une page retrouve la carte quittée
- `:hover` n'existe pas. Tout ce que le web fait au survol se fait au focus
- Aucune saisie au-delà de six caractères : QR code vers le téléphone
- Touches couleur : rouge tchat · vert sous-titres · jaune qualité · bleu infos
- Le lecteur est une page, pas une modale. Sur TV, une modale **est** une page
- Zone sûre : rien d'utile hors d'un cadre de 60 px sur les quatre bords

Le moteur de focus de la maquette est fonctionnel et documenté dans le fichier.
C'est la partie à étudier de près avant d'écrire la version `react-native-tvos`.

---

## 7. Le studio mobile

**Angular + Ionic + Capacitor.** NativeScript est écarté : investir dans une
sixième chaîne d'outillage pour démontrer un sixième framework, alors que Next,
React Native, Angular et Nest établissent déjà le signal technique, a un mauvais
rendement.

Capacitor fournit l'enveloppe native, Ionic la coquille — navigation, gestes,
transitions. La maquette `Studio Mobile.dc.html` gère déjà portrait et paysage.

**Imposer les jetons Arthome via les variables CSS d'Ionic.** Sans cela son thème
par défaut écrasera l'identité visuelle, et le studio mobile ne ressemblera plus
au studio web. Ionic sert la mécanique, pas l'apparence.

---

## 8. Ordre de travail — livrer par paliers présentables

Le risque principal n'est pas technique : c'est de passer six mois sans rien de
publiable. Chaque palier doit se tenir seul.

**Palier 0 — la vitrine, avant toute ligne d'application**
`arthome-core` : son README avec le schéma système, ce dossier de passation dans
`docs/`, les premiers ADR, et les cinq maquettes publiées sur GitHub Pages en
galerie cliquable. Une après-midi de travail pour une démonstration vivante —
dont une interface TV pilotable à la télécommande. **Le meilleur rapport
signal/temps disponible aujourd'hui.**

Deux précisions ajoutées depuis : les maquettes doivent être **découpées par
écran** avant d'être utilisables par un agent — les fichiers actuels font jusqu'à
560 Ko, bien plus qu'un context pack ne peut porter. Et `corrections-handoff.md`
sert de liste de courses pour finir d'aligner ce dossier.

**Palier 1 — le domaine**
`@arthome/core` : portage en TypeScript typé, tests sur les règles qui font mal
(fuseaux, expiration de rediffusion, droits, TVA et arrondis, versements, codes
de place, transitions d'état), CI. **On porte les règles, on remodèle les
formes** — voir la famille D de `corrections-handoff.md`, qui liste les sept
points où `shared/` doit être corrigé au passage.

**Palier 2 — le socle distribué**
`docker-compose` complet : PostgreSQL, Kafka, Kafka Connect avec Debezium,
Redis, OpenSearch, MinIO. Deux services seulement — `identity` et `catalog` —
mais le chemin événementiel de bout en bout : outbox dans la transaction, schéma
Protobuf versionné, CDC vers l'index, et `traceparent` propagé de la requête
HTTP jusqu'à l'indexation.

C'est le palier qui coûte le plus et qui prouve le plus. Une fois franchi, chaque
service suivant est rapide.

**Palier 3 — un produit de bout en bout**
`ticketing`, puis `storefront-web` en Next.js. Un déploiement, un lien vivant.
Le cas d'usage complet : acheter une place, du storefront jusqu'au versement.

**Palier 4 — la démonstration d'architecture**
`studio-web` en Angular, consommant le même `@arthome/core`. Deux piles
hétérogènes, un seul domaine. C'est le palier qui distingue ce projet.

**Palier 5 — la diffusion**
`streaming` et `chat`, MediaMTX en docker-compose, le mode démonstration
interactive avec publication WHIP depuis le navigateur. Voir `streaming.md`.

**Palier 6 — Kubernetes, puis le mobile si l'envie tient**
Les surfaces non développées ne sont pas un manque : les maquettes du palier 0
montrent le travail de conception sans engager des mois de développement.

## 9. Ce qui fait signal auprès d'un recruteur

À traiter comme des livrables, pas comme de la décoration.

- **Une démonstration accessible en moins de trente secondes** — captures, lien
  vivant, produit compris d'un coup d'œil.
- **Un schéma d'architecture lisible**, avec les dépendances *et leurs raisons*.
- **Des ADR courts** sur les choix contestables : pourquoi React côté public et
  Angular côté studio, pourquoi le multi-dépôts, pourquoi un domaine partagé,
  pourquoi la TV est une interface à part, pourquoi aucun appel synchrone entre
  services, et le choix d'authentification.
- **Un cas d'usage suivi verticalement** — acheter une place : storefront →
  contrat d'API → domaine billetterie → code de place → paiement → commission et
  TVA → versement artiste → base → studio. Avec les tests correspondants.
- **Une section « ce que je n'ai délibérément pas construit »**, avec les
  arbitrages assumés. C'est ce qui distingue le plus nettement un profil senior.

---

## 10. Autres documents de ce dossier

- `PROMPT.md` — les textes à coller dans les premières sessions Claude Code
- `streaming.md` — plan média, protocoles, fournisseurs, mode démonstration
- `Prompt - Storefront TV.md` — cahier des charges complet de la TV
- `Taxonomie - projet.md` — la réflexion sur le découpage des disciplines et genres
