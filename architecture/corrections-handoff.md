# Corrections au dossier de passation

> Vingt-sept écarts relevés dans `arthome-design/design_handoff_arthome/` pendant la phase 0 de la session
> « contrats d'interface, architecture backend, authentification » (21 septembre 2026).
>
> **Statut des corrections.** Les écarts des familles **A**, **B** et **C** ont été corrigés
> directement dans les documents du dossier au cours de cette session, sur décision du chef de
> projet. Les originaux sont conservés à côté d'eux sous `*.pre-corrections.md`.
> Les écarts de la famille **D** portent sur `shared/`, qui reste en **lecture seule** : ils ne
> sont pas corrigés ici, ils constituent la liste de courses du portage de `@arthome/core`
> (palier 1). Aucun ne doit être découvert une seconde fois.

---

## Comment lire ce document

Quatre familles, par nature de l'écart :

| Famille | Nature | Traitement |
|---|---|---|
| **A** | Le dossier contredit une décision déjà prise depuis sa rédaction | corrigé dans le dossier |
| **B** | Le dossier se contredit lui-même | corrigé dans le dossier |
| **C** | Le dossier est muet là où le contrat doit trancher | section ajoutée ou renvoi posé |
| **D** | `shared/` porte une donnée fausse, incomplète ou trompeuse | à corriger au portage |

Un écart de la famille **D** mérite une attention particulière : `shared/` fait autorité sur le
**vocabulaire et les règles**, pas sur les **formes**. Plusieurs entrées ci-dessous sont des
formes qui *ressemblent* à des règles éprouvées. Les recopier graverait dans le contrat une
commodité de maquette.

---

## A — Le dossier contredit une décision déjà prise

### A1 — Monorepo contre multi-dépôts

**Où** : `README.md` §3 en entier (titre, arborescence, paragraphe « Monorepo »), §8 palier 0 ;
`PROMPT.md` palier 0 point 1 et ADR-002.

**L'écart** : le dossier décrit un dépôt unique `arthome/` portant `docs/`, `prototypes/`,
`packages/`, `services/`, `apps/`, `infra/`. Le projet est passé en **multi-dépôts** depuis.

**La correction, et la précision qui manquait.** « Multi-dépôts » ne veut **pas** dire « un dépôt
par service ». La forme retenue est :

- `arthome-core` — la vitrine, le domaine (`@arthome/core`), les contrats (`@arthome/contracts`),
  la direction artistique, les ADR ;
- `arthome-platform` — **les sept services ensemble**, plus l'infrastructure ;
- puis **un dépôt par application** (storefront web, storefront mobile, storefront TV, studio web,
  studio mobile).

Cette précision n'est pas cosmétique : c'est parce que les sept services restent dans un seul
dépôt que le cache turbo et l'« exécution par service touché » de `definition-of-done.md` gardent
un sens. Avec sept dépôts, ces deux dispositifs tomberaient.

### A2 — `packages/core` contre deux paquets dans `arthome-core`

**Où** : `README.md` §3, sous-section « `@arthome/core` — le domaine » et l'arborescence.

**L'écart** : le dossier place le domaine dans `packages/core` du monorepo et n'envisage qu'**un
seul** paquet.

**La correction** : le domaine vit dans le dépôt `arthome-core`, et il y a **deux** paquets
publiés séparément :

- `@arthome/core` — le domaine, **zéro dépendance framework**, porté depuis `shared/` ;
- `@arthome/contracts` — les DTO de frontière et le code généré.

La séparation est imposée, pas esthétique : le code Protobuf généré embarque un **runtime**, et le
domaine s'interdit toute dépendance d'exécution. Les mélanger contaminerait `@arthome/core` et
casserait la règle qui fait tout l'intérêt du paquet.

### A3 — « Avro ou Protobuf » contre Protobuf seul

**Où** : `README.md` §3, sous-section « Événements », premier point ;
`PROMPT.md` palier 2 point 3.

**L'écart** : le dossier laisse le choix ouvert entre Avro et Protobuf.

**La correction** : **Protobuf seul**, outillé par `buf` (`buf lint`, `buf breaking`), avec un
registre de schémas propriétaire du format. Le choix n'est plus ouvert — et il a une conséquence
sur les contrats : un événement décodé depuis Kafka n'est **jamais** revalidé par zod, le registre
faisant foi.

### A4 — OpenTelemetry complet contre observabilité simple

**Où** : `README.md` §3, tableau « Infrastructure » (ligne « OpenTelemetry + Grafana … dès le
premier service ») et le paragraphe « Le traçage distribué dès le premier service » ;
`PROMPT.md` palier 2 points 1 et 3.

**L'écart** : le dossier exige une chaîne OpenTelemetry complète dès le premier service.

**La correction** : **observabilité simple** pour l'instant. Ce qui est exigé dès le premier
producteur, en revanche, est non négociable : **`traceparent` (W3C) propagé**, dans les en-têtes
HTTP **et** dans les en-têtes Kafka. OpenTelemetry complet viendra ensuite, et il viendra bien
moins cher si `traceparent` circule déjà.

La nuance compte : l'outillage est reportable, la **propagation** ne l'est pas. Un événement
publié sans `traceparent` est définitivement orphelin.

### A5 — `node-linker=hoisted` devenu sans objet

**Où** : `README.md` §3, paragraphe « Le point de friction connu » ; `PROMPT.md` palier 0 point 2.

**L'écart** : le dossier prescrit un `.npmrc` avec `node-linker=hoisted` par espace de travail
mobile, pour contourner le mauvais support des liens symboliques de pnpm par Metro.

**La correction** : en multi-dépôts, chaque application mobile a **son dépôt, son `node_modules`
et son lockfile**. La friction Metro/pnpm disparaît avec l'espace de travail partagé qui la
causait, de même que le conflit documenté entre `react-native-tvos` et les autres projets Expo
d'un même workspace. Le paragraphe est supprimé.

### A6 — « Pourquoi un monolithe modulaire d'abord »

**Où** : `README.md` §9, troisième puce.

**L'écart** : le §9 propose d'écrire un ADR « pourquoi un monolithe modulaire d'abord », en
contradiction frontale avec le §3 (« démontrer une architecture distribuée est un objectif du
projet »), le §4 (sept services) et l'intégralité du palier 2.

**La correction** : la puce est supprimée. Aucun monolithe modulaire n'est prévu à aucun moment.

### A7 — « Pourquoi le multi-dépôts » dans un document qui prescrit un monorepo

**Où** : `README.md` §9, troisième puce (même liste qu'en A6).

**L'écart** : le §9 réclame un ADR « pourquoi le multi-dépôts » alors que le §3 du **même
document** prescrit un monorepo, et que `PROMPT.md` nomme son ADR-002 « Monorepo ».

**La correction** : c'est le §9 qui a raison — il porte la trace de l'arbitrage rendu en cours de
rédaction, que le §3 n'a jamais reçue. Le §3 est aligné sur le §9, et non l'inverse.

Cet écart est le plus instructif du lot : il montre qu'un document long se désynchronise de
lui-même dès qu'une décision change, et que ce sont ses **sections tardives** qui portent l'état
le plus récent.

---

## B — Le dossier se contredit lui-même

### B1 — « Les neuf disciplines » alors qu'il y en a vingt et une

**Où** : `Prompt - Storefront TV.md`, « Écran par écran » §8, entrée **Catégories**.

**L'écart** : « les neuf disciplines en tuiles typographiques ». Le compte réel est **21**
(`taxonomy.json` : 14 en univers Musique, 7 en univers Scène), confirmé par `README.md` §3
(« facettes sur 21 disciplines, 176 genres, 205 tags ») et par `Taxonomie - projet.md`.

**La correction** : la page Catégories de la TV est conçue pour **21 disciplines**, groupées par
les deux univers (Musique, Scène) qui existent précisément pour structurer une longue liste. Si
une sélection éditoriale plus courte est voulue en tête de page, elle doit être écrite comme une
règle — un rang éditorial existe déjà dans `taxonomy.json` (`rank`, du plus grand public au plus
pointu) et aucune surface n'a le droit de le recalculer.

**Pourquoi ça compte pour les contrats** : neuf tuiles tiennent sur un écran de télévision, vingt
et une non. C'est une contrainte de mise en page qui remonte jusqu'au modèle de lecture servi à la
TV — donc jusqu'au contrat.

### B2 — Vocabulaire de disciplines faux en tête du cahier des charges TV

**Où** : `Prompt - Storefront TV.md`, premier paragraphe.

**L'écart** : « théâtre, danse, **ballet**, **concerts**, humour, classique, opéra, jazz, cirque ».
`ballet` (précisément `ballet classique`) est un **sous-genre** de la discipline Danse ;
`concerts` n'est pas une discipline mais un format.

**La correction** : la phrase emploie le vocabulaire de `taxonomy.json`. C'est exactement le
glissement que `Taxonomie - projet.md` s'emploie à prévenir — une discipline est une **forme**,
jamais un format ni une époque.

### B3 — Les usages de Redis, incomplets

**Où** : `README.md` §3, tableau « Infrastructure », ligne Redis : « cache, sessions, diffusion
WebSocket (pub/sub Socket.IO) ».

**L'écart** : il manque **BullMQ**, et surtout la contrainte qui pèse sur les sessions.

**La correction** : quatre usages **séparés**, et deux règles :

- **sessions** — au BFF **seulement**. Aucun service ne lit le magasin de sessions ;
- **cache** — par service, jamais partagé entre services ;
- **adaptateur Socket.IO** — diffusion aux clients connectés ;
- **BullMQ** — jobs **internes à un service**, jamais un canal entre deux services.

La règle qui manquait le plus est la dernière : BullMQ entre deux services rouvrirait par la porte
de derrière le couplage synchrone que Kafka existe pour interdire.

### B4 — Les maquettes ne peuvent pas charger `shared/` — et le dossier promet le contraire

**Où** : disposition du dossier (`mockups/` et `shared/` côte à côte) contre `README.md` §1,
sous-section `mockups/` : « Ces fichiers s'ouvrent directement dans un navigateur ».

**L'écart** : chacune des cinq maquettes porte sa propre méthode `loadArthome()` qui résout ses
dépendances **relativement à son propre fichier HTML** :

```js
const at = (p) => new URL(p, document.baseURI).href;
const [helpers, fixtures] = await Promise.all([
  import(at('helpers.js')), import(at('fixtures.js'))
]);
const [catalogue, taxonomy, index] = await Promise.all([
  get('catalogue.json'), get('taxonomy.json'), get('i18n/index.json')
]);
```

Elle cherche donc `helpers.js`, `fixtures.js`, `catalogue.json`, `taxonomy.json` et `i18n/` dans
`mockups/`. Or `mockups/` ne contient que les cinq `.dc.html` et `support.js` : ces fichiers sont
dans `shared/`. L'import échoue, et le `try { … }` l'avale — la maquette rend en **état dégradé,
sans dire pourquoi**.

**La correction** : `shared/` doit être placé **à côté des `.dc.html`**, par copie ou lien
symbolique. Le README a été corrigé pour le dire, et pour ajouter qu'un serveur local est
nécessaire (les modules ES et `fetch` ne fonctionnent pas sous `file://`).

**Pourquoi c'est bloquant au palier 0** : la galerie GitHub Pages est le livrable du palier 0 et
son meilleur rapport signal/temps. Publiée telle quelle, elle montrerait cinq interfaces vides.
C'est un écart de **packaging**, pas de conception — mais il ruinerait la démonstration.

**Conséquence pour cette session** : les cinq spécialistes de surface **ne peuvent pas ouvrir les
maquettes dans un navigateur** pour observer leurs états. Ils lisent la source, ce que la mission
leur demande de toute façon — donc rien n'est bloqué ici.

---

## C — Le dossier est muet là où le contrat doit trancher

Ces neuf points ne sont pas des erreurs : ce sont des **silences**. Le dossier a été écrit pour
cadrer une conception d'interface, pas un contrat réparti. Chacun est désormais signalé dans le
dossier par un renvoi vers le document qui le traitera.

### C1 — Aucune authentification

Le mot n'apparaît **nulle part** dans les quatre documents. Or il faut : 2FA, réinitialisation de
mot de passe, **connexion sur téléviseur**, connexions sociales (Google, Facebook) et par courriel,
sur cinq surfaces dont deux sans clavier utilisable.
→ `architecture/adr-auth.md`.

### C2 — Aucun BFF, aucune topologie d'entrée

Le dossier va des applications aux services sans rien entre les deux. Il manque : la passerelle
d'infrastructure (TLS, routage, limitation de débit), **un BFF par produit**, et l'échange de la
session contre un jeton signé de courte durée — c'est-à-dire le mécanisme par lequel aucun service
n'appelle jamais le service d'identité.
→ `architecture/context-map.md`, section topologie d'entrée.

### C3 — Aucun paiement

`README.md` §3 décrit `ticketing` comme portant « places, commandes, paiements, issues » et s'en
tient là. Rien sur le prestataire, le périmètre PCI, le traitement des webhooks, la réconciliation,
ni le partage des responsabilités avec `payouts`.

Le silence est d'autant plus notable que `shared/catalogue.json` fixe **déjà** les paramètres
commerciaux : `commissionRate: 0.12`, `payoutDelayDays: 14`, et trois marchés de facturation avec
leurs taux de TVA.
→ `architecture/adr-payments.md`.

### C4 — Aucun ORM, aucune bibliothèque de validation

Deux décisions structurantes, absentes : **TypeORM ^1.1** (la syntaxe `relations`/`select` en
tableau de chaînes a disparu en 1.0 — syntaxe objet uniquement) et **zod 4** comme unique outil de
validation, de la configuration au DTO de frontière.

zod mérite une mention explicite dans le dossier parce qu'il devient une **dépendance d'exécution
partagée par sept services et cinq applications** : `peerDependency`, version épinglée dans
`VERSIONS.md`, et une montée majeure traitée comme un changement de contrat.
→ `architecture/definition-of-done.md` et `architecture/critical-rules.md`.

### C5 — Aucune politique d'identifiants

**UUIDv7**, fourni nativement par `uuidv7()` de PostgreSQL 18. Restent à trancher : **où** il est
généré (défaut de base, ou domaine — souvent préférable avec l'outbox, l'agrégat connaissant son
identifiant avant l'insertion), et le fait qu'**un UUIDv7 révèle sa date de création**, ce qui se
discute pour un identifiant d'utilisateur exposé en URL.
→ `architecture/data-model.md`.

### C6 — L'i18n dynamique : une rupture de modèle non écrite

Le dossier traite la copie comme **compilée au build** (`i18n-compile.js`, « compile les
dictionnaires dans chaque surface, avec contrôle d'intégrité »). La décision prise depuis ajoute un
**catalogue de libellés servi dynamiquement**, pour corriger une coquille sans attendre une revue
de magasin sur mobile et sur TV.

C'est un changement de modèle, pas un détail : `core` garde les clés et le catalogue de référence,
un service sert les mises à jour par-dessus, la lecture passe par des artefacts versionnés
immuables en CDN, et chaque application embarque un **instantané au build** comme repli obligatoire
— jamais un code brut affiché si le service est indisponible.
→ `architecture/context-map.md` (le contexte propriétaire reste à trancher) et `data-model.md`.

### C7 — Les abonnements n'ont aucun contexte propriétaire

`shared/catalogue.json` déclare trois formules (`free`, `pass`, `premium`) avec leurs droits
(`opens[]` : `replays`, `one-live-month`, `all-lives`, `multi-screen`, `archive`, `no-ads`) et une
remise sur les places (`seatDiscount`). Elles s'affichent sur le storefront web, le mobile et la
TV, et elles **conditionnent l'accès à la lecture**.

Aucun des sept contextes annoncés ne les possède.
→ à trancher dans `architecture/context-map.md`.

### C8 — La boutique n'a aucun contexte propriétaire

`merch` porte un stock, des ventes, un état (`on-sale`, `out-of-stock`), et le panier du storefront
web gère des **frais de port**. Même constat qu'en C7 : présent partout, possédé par personne.
→ à trancher dans `architecture/context-map.md`.

### C9 — L'annuaire des intervenants et les chaînes

Deux notions centrales au studio, absentes de la carte des contextes :

- **`people`** — un annuaire d'intervenants, dont des indépendants qui travaillent sur plusieurs
  chaînes, avec leur activité réelle (`channels[]`, `runsCalled`) ;
- **`channels`** — une chaîne par artiste, l'unité de travail du studio, avec ses membres, leurs
  rôles et la table `grants` qui dit **qui peut inviter qui**.

Ces deux notions sont à cheval sur `identity` (les personnes, les rôles, les droits) et `catalog`
(l'artiste, ses spectacles, ses dates). La frontière doit être tracée explicitement.
→ `architecture/context-map.md`.

---

## D — `shared/` : la liste de courses du portage

**Non corrigé dans cette session.** `shared/` est en lecture seule : c'est la source que les cinq
spécialistes de surface vont lire. Ces sept points sont à traiter au **portage de
`@arthome/core`** (palier 1), et à prendre en compte dès maintenant dans la conception des
contrats.

### D1 — `languageDependency` : le vocabulaire fermé est faux

`shared/taxonomy.json` déclare trois valeurs : `none | light | helpful`.

Or la valeur **`essential`** — absente du vocabulaire — est employée partout :

- `shared/catalogue.json` : cinq spectacles la portent ;
- `shared/fixtures.js:458-462` : elle est attribuée par discipline (`theatre`, `comedy`, `rap`,
  `chanson`) ;
- `shared/i18n/storefront.json:1472` : la clé `enums.languageDependency.essential` existe et est
  traduite ;
- `shared/helpers.js:437` : `hasLanguageBarrier` **en fait son test** —
  `languageDependency(show) === 'essential'`.

À l'inverse, `light` n'est employé nulle part dans le projet.

**Le vocabulaire réel est `none | helpful | essential`.** Un vocabulaire fermé qui ne contient pas
la valeur dont dépend la règle la plus visible de la surface n'est pas un vocabulaire fermé. À
corriger dans `taxonomy.json` au portage, et à écrire ainsi dans le contrat.

### D2 — Deux vocabulaires pour l'état d'une publication

Deux tables décrivent la même machine à états, avec des noms différents :

| `shared/catalogue.json` (`publicationStates`) | `mockups/Studio.dc.html` (`EV_MOVES`) |
|---|---|
| `draft` | `draft` |
| `reserve` | `hidden` |
| `scheduled` | `sched` |
| `technical` | `tech` |
| `live` | `live` |
| `ended` | `done` |
| `replay-online` | `replay` |

La maquette du studio tient donc une **table parallèle**, et ne rejoint le vocabulaire partagé
qu'en un seul endroit (`Studio.dc.html:2798`, via `A.enumLabel('publicationState', …)`).

C'est précisément ce que le principe n°1 du dossier interdit — « chaque affichage dérive de la
donnée, jamais d'un littéral parallèle » — et c'est aussi la démonstration de son coût : deux
équipes qui lisent deux tables écriront deux contrats.

**Le contrat doit fixer un seul jeu de noms.** Celui de `catalogue.json` fait autorité : il est
explicite (`replay-online` dit ce que `replay` ne dit pas — la rediffusion est **en vente**), et
c'est lui que porte l'i18n (`enums.publicationState.*`).

### D3 — Les fuseaux sont gelés en décalage fixe

`shared/catalogue.json` stocke `venue.utcOffsetMin` — un décalage figé — et `helpers.js` en déduit
l'abréviation d'été ou d'hiver en comparant ce décalage à celui de la table des zones.

La **règle** est juste et doit être portée telle quelle : heure du spectateur d'abord, heure de
salle en second quand elle diffère. La **forme** est une commodité de maquette : un décalage fixe
ne survit pas à un changement d'heure, et une date programmée dans six mois sera affichée à la
mauvaise heure.

**Dans le contrat** : un identifiant de zone **IANA** (`Europe/Paris`) et un **instant UTC**. Le
décalage se dérive, il ne se stocke pas.

### D4 — Un seul marché de facturation réellement exercé

`shared/catalogue.json` déclare trois marchés : `eur` (TVA 5,5 %), `chf` (2,6 %), `cad`
(14,975 %) — ce dernier marqué `live: false`.

Mais `shared/fixtures.js:498` prend `billingMarkets[0]` pour **toutes** les dates, et
`fixtures.js:1300` prend `billingMarkets[0].vatRate` pour **tous** les versements. Le multi-devise
et le multi-TVA sont déclarés dans la donnée et **jamais exercés** par le générateur.

Conséquence pour les contrats : aucun écran n'a jamais affiché deux devises, aucune règle n'a
jamais été éprouvée sur deux taux. Ce que `shared/` porte ici est une **intention**, pas une règle
éprouvée. Le contrat doit décider s'il l'honore — montant en unité canonique + code devise, ce qui
est déjà la décision — et `adr-payments.md` doit dire ce qu'il advient d'un versement transfrontalier.

### D5 — La formule de versement n'est pas une règle fiscale

`shared/fixtures.js:1297-1324` calcule :

```
commission = round(gross × 0,12)
vat        = round(gross × vatRate)
net        = gross − commission − vat
```

La TVA y est donc appliquée au **brut de billetterie**, et retranchée du net de l'artiste.

**Ce que `shared/` ne tranche pas** : qui doit la TVA, sur quelle assiette — le billet ou la
commission de la plateforme — et qui en est redevable, la plateforme ou l'artiste. Ce sont trois
questions distinctes, et la formule ci-dessus n'en répond à aucune : elle produit un nombre
plausible pour une maquette.

**C'est le piège « forme contre règle » le plus coûteux du dossier.** Le calcul *ressemble* à une
règle métier éprouvée écran par écran — il en a la place, le ton et la précision à l'euro. Il n'en
est pas une. `adr-payments.md` doit l'instruire depuis le droit applicable et le modèle Stripe
Connect, **sans supposer que la fixture fait autorité**.

Ce qui, en revanche, fait bien autorité et doit être porté : la commission est de **12 %**, le
délai de versement de **14 jours**, l'arrondi se fait **à l'unité** sur chaque composante prise
séparément, et un versement est **retenu** (`held`) tant qu'une issue est ouverte — reportée ou
interrompue — **remboursé** (`refunded`) si la date est annulée.

### D6 — Deux niveaux de sanction, non reliés

La modération existe à deux échelles, avec deux vocabulaires et deux propriétaires possibles :

- **sur le message** — `catalogue.json.messageStates` : `ok`, `removed`, `muted`, `banned` ;
- **sur la personne, au sein d'une chaîne** — `fixtures.js` `audience[].state` : `ok`, `muted`,
  `banned`, avec son historique (`datesAttended`, `messages`, `firstSeenDaysAgo`).

Rien ne dit comment les deux se composent, ni ce qui prime. `studio-data.js` réduit d'ailleurs le
tout à deux états pour la régie (`ok` / `held`), ce qui est une troisième échelle.

À trancher : le message appartient à `chat`, mais la personne bannie d'une chaîne relève-t-elle de
`chat` ou d'`identity` ? Une seule pastille s'affiche à l'écran ; il ne peut y avoir qu'un seul
propriétaire de la vérité.

### D7 — Les décalages en minutes sont une commodité de maquette

`shared/catalogue.json` le dit lui-même (`time.note`) : *« startOffsetMin, atMin and
rescheduledToOffsetMin are offsets from the moment the app is opened: negative means already
started. **Nothing here expires.** »*

C'est un choix excellent pour une maquette — tous les états existent à toute heure, et les cinq
surfaces voient la même chose. C'est inutilisable sur un contrat.

**Sur le fil, ce sont des instants ISO 8601 en UTC.** La décision zod l'impose déjà par un autre
chemin : `z.date()` est inconvertible en JSON Schema, donc les dates voyagent en **chaînes ISO**.
Le stockage est en `timestamptz`, en UTC.

`fixtures.js` conserve sa seconde vie après le portage — jeu de données déterministe pour les
tests et la démonstration — mais il produira des **instants**, et la conversion en décalages
relatifs, si elle est encore utile, deviendra une commodité de présentation et non une forme
transportée.

---

## Ce qui reste ouvert

Trois points relevés en phase 0 qui ne sont pas des corrections mais des **questions adressées à
l'équipe**, consignées ici pour qu'elles ne se perdent pas :

1. **Le catalogue de libellés dynamique (C6) : sous-domaine ou service à part ?** Un service de
   plus se paie en exploitation, pour une personne seule.
2. **Les abonnements et la boutique (C7, C8) : rattachés, ou huitième contexte ?** Les rattacher
   force une frontière discutable ; les isoler coûte un service.
3. **Le code court de la TV.** La maquette l'emploie pour quatre parcours distincts — se
   connecter, acheter une place, s'abonner, acheter du merch. C'est le même mécanisme que le
   **device flow OAuth (RFC 8628)**. S'il est conçu deux fois — une fois par `auth`, une fois par
   `ticketing` — il sera implémenté deux fois. À traiter comme une primitive unique.

---

## Ce que cette liste a coûté, et ce qu'elle épargne

Vingt-sept écarts, relevés sans ouvrir une seule maquette en entier. Sept d'entre eux (famille D)
n'auraient été découverts qu'au moment d'écrire le code — c'est-à-dire trop tard pour le contrat.
Un autre (**B4**) n'aurait été découvert qu'en publiant la galerie du palier 0, devant cinq
interfaces vides.

Le plus instructif reste **A7** : un document qui se contredit lui-même entre son §3 et son §9,
parce qu'une décision a changé pendant sa rédaction et que seules les sections tardives l'ont
reçue. C'est l'argument le plus solide en faveur des `critical-rules.md` courtes et recopiées dans
chaque dépôt : un document long finit toujours par mentir sur lui-même.
