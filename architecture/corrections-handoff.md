# Corrections au dossier de passation

> Vingt-sept écarts de phase 0, plus cinquante-deux relevés au temps 1, dans dans `arthome-design/design_handoff_arthome/` pendant la phase 0 de la session
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

## E — Écarts relevés par les cinq spécialistes de surface (temps 1)

**Cinquante-deux écarts nouveaux**, relevés indépendamment par les cinq spécialistes en lisant
leur maquette contre `shared/`. Consolidés ici par thème et non par surface : plusieurs ont été
trouvés par deux, trois ou quatre agents séparément, et cette convergence est elle-même une
information — elle distingue un accident d'une faute structurelle.

Aucun n'est corrigé : ils portent sur `shared/` et sur les maquettes, qui restent en lecture
seule. C'est la suite de la liste de courses du portage (palier 1), et la matière que les agents
du temps 2 doivent avoir lue.

### E1 — Les abonnements sont cassés, et cela conditionne l'accès à la lecture

*Trouvé par `storefront-web`, `storefront-tv`, `storefront-mobile`.*

**Quatre vocabulaires disjoints** pour la même notion :

| Source | Valeurs |
|---|---|
| `catalogue.json` → `plans[]` | `free` (0 €) · `pass` (12 €) · `premium` (24 €) |
| `catalogue.json` → `accounts[].plan` | `season` · `monthly` · `none` |
| `i18n/storefront.json` → `enums.plan.*` | les six réunies |
| maquette web | `free` · `unit` (7 €) · `sub` (14 €) |
| maquette TV | `saison` (14 €) · `mécène` (39 €) |

**La conséquence est un défaut d'autorisation, vérifié.** `helpers.planOf()` fait
`plans().filter(p => p.id === account.plan)[0] || plans()[0]`. Aucun des quatre comptes de
référence ne porte un identifiant présent dans `plans[]` : **tous retombent silencieusement sur
`free`**. Or `plan.opens[]` porte `replays`, `one-live-month`, `all-lives`, `multi-screen`,
`archive` — c'est-à-dire les droits de lecture. L'i18n traduit les six valeurs, ce qui masque
entièrement le problème à l'écran.

S'y ajoutent : les droits `opens[]` ne coïncident pas entre les sources, et **deux remises sur
deux assiettes différentes** (`seatDiscount` 10/20 % sur les places dans la donnée, 15 % sur la
boutique dans la maquette mobile).

### E2 — La faute D2 se répète sur huit champs

*Trouvé par les cinq. `storefront-mobile` classe 7 de ses 11 écarts dans cette seule famille.*

D2 signalait deux vocabulaires concurrents pour l'état d'une publication. Ce n'était pas un
accident : c'est le mode de défaillance dominant du dossier. Une maquette tient une table
littérale parallèle à `shared/`, et les deux divergent.

| Champ | Vocabulaires concurrents |
|---|---|
| état de publication (D2) | `catalogue.json` contre les deux maquettes de studio |
| régime de tchat | **trois** — dont une famille de copie `chat.*` (`free`) doublant `enums.chatMode.*` (`open`) |
| politique de rediffusion | **trois** — `sub`/`unit` dans la maquette mobile contre `subscription`/`none` |
| fenêtre de rediffusion | **trois** formulations, dont une dans la copie traduisible |
| sévérité du filtre de tchat | deux, **dans le même fichier** |
| liste de contrôle avant publication | deux — 4 entrées dans les fixtures, 7 dans la fiche de date |
| devises | `eur`/`usd`/`chf` proposés, `cad` déclaré et manquant |
| abonnement du compte | entièrement littéral dans la maquette mobile |

**Conséquence pour les contrats** : chaque énumération de frontière doit être déclarée une fois,
dans `@arthome/core`, et typée. Une valeur d'énumération écrite en dur dans une application est la
faute la plus fréquente de ce projet, et elle est silencieuse.

### E3 — Les sanctions : quatre échelles, et l'i18n n'en suit aucune

*Trouvé par `studio-web` et `studio-mobile`. Étend D6, qui n'en comptait que trois.*

`catalogue.messageStates` (`ok`…) · `audience[].state` (la personne dans une chaîne) ·
`moderation[].state` (qui introduit **`reported`**) · `studio-data.js` (`ok` / `held` pour la
régie) · et `i18n/studio.json` → `enums.moderationState.*` qui dit `published` là où le catalogue
dit `ok`, et ne correspond à aucune des quatre.

Le défaut de fond : **`reported` est un état de triage logé dans le champ des sanctions**. Trois
axes à séparer au contrat — nature de la ligne (signalée, prise en charge, tranchée), état du
message, état de la personne.

S'y ajoute une règle de conduite que seule la maquette porte : *« Prendre en charge n'est pas
trancher : tant que le confrère n'a pas rendu de verdict, votre sanction s'applique. »* C'est une
**supersession**, donc un bail sur une ligne de file et une règle de préséance — à porter au
contrat, et la raison pour laquelle les commandes de modération doivent être **conditionnelles**
et non idempotentes aveugles.

### E4 — Trois axes d'état sur une même date, sans hiérarchie écrite

*Trouvé par `studio-web` et `studio-mobile`.*

`publication.state` (sept valeurs), `run.state` (six), `date.outcome` (trois). L'état affiché
d'une date est la **composition des trois**, et aucun ne la porte. Chaque surface recompose donc
la hiérarchie à sa façon — la définition même d'une valeur calculée deux fois.

### E5 — Le verrou porte sur des états, la maquette le pose sur des transitions

*Trouvé par `studio-web`.*

Les fixtures encodent `lockedTransitions: ['scheduled', 'replay-online']` — une liste d'**états**.
La maquette traite ces deux passages comme des **transitions sans retour**. C'est la seconde
sémantique qui est juste : publier engage le tarif, mettre la rediffusion en ligne la met en
vente. Le serveur doit **refuser** l'inverse avec un code et la promesse engagée.

### E6 — Les rôles : le repli à six détruit un droit

*Trouvé par `studio-web` et `studio-mobile`.*

`studio-data.js` rabat les huit `memberRoles` sur six personas, écrasant `director`, `video` et
`sound` en `regie`. Or `grants` les distingue : `director` peut inviter `video` et `sound`, les
deux autres ne peuvent inviter personne. **La projection à six n'est pas sûre pour
l'autorisation** — c'est un libellé, jamais un droit.

Deux défauts de navigation dans la même famille : `TAB_PREF.regie` nomme une page que `ACCESS`
refuse ; et **`team` est une page morte**, absente de la table d'accès des six personas (la ligne
qui la fait absorber par `crew` est elle-même du code mort).

### E7 — Le fuseau du spectateur n'a aucun porteur

*Trouvé par `storefront-tv` et `studio-mobile`.*

« Deux fuseaux : l'heure du spectateur d'abord, l'heure de salle en second » est un principe du
dossier. Pourtant la maquette TV lit `fixtures.geography.viewerUtcOffsetMin`, qui **n'existe nulle
part** dans `shared/` : il vaut `undefined`, et l'heure de salle est donc calculée contre UTC. La
surface n'a aucune entrée pour le fuseau du spectateur. Croise D3 (les fuseaux gelés en décalage
fixe).

### E8 — Le modèle public fuit de la donnée de régie

*Trouvé par `storefront-tv`.*

L'objet date que lit un client public porte `prices[].sold`, `prices[].revenue`, `seats.sold`,
`publication`, `publishedBy` : des recettes et des références de studio. Deux fuites voisines :
les raisons de géo-blocage portent `label`/`labelEn` — du texte rédigé **dans la donnée**, alors
que tout le reste passe par `enums.*` ; et le classement éditorial des sous-genres est **calculé
sur la surface**, à partir de cette donnée de billetterie.

### E9 — La taxonomie est déclarée plus riche qu'elle n'est portée

*Trouvé par `storefront-web`.*

Le sous-genre est déclaré « optionnel, multiple » et porté au singulier ; le champ `attributes`
d'une date porte en réalité des **étiquettes** ; **six des sept groupes d'attributs** sont
déclarés et jamais portés — dont `accessibility`, que le dossier présente comme un filtre de
premier plan qui ne doit « pas dépendre de la vigilance d'un régisseur » ; et `shows[].tags` est
vide dans tout le catalogue rédigé.

### E10 — L'i18n se contredit sur ses propres effectifs

*Trouvé par `storefront-web`, complété par le chef.*

`i18n/index.json` se présente comme le contrôle d'intégrité de la copie. Il est faux sur la moitié
de ses entrées, **et dans les deux sens** :

| Fichier | Annoncé | Réel |
|---|---|---|
| `storefront.json` | 243 | **671** |
| `taxonomy.json` | 627 | **437** |
| `studio.json` | 61 | 61 |
| `system.json` | 18 | 18 |

S'y ajoute : les libellés de marchandise n'existent qu'en français (`merchPool` sans champ
anglais), sur un produit déclaré bilingue.

### E11 — Les constantes de domaine sont recopiées en dur

*Trouvé par `storefront-tv` et `storefront-mobile`.*

`roomOpensBeforeMin: 30` et `previewIdleSec: 4` vivent dans la donnée — et les maquettes les
recopient en littéral. Ces constantes doivent arriver **par le contrat**, sinon elles divergeront
entre cinq surfaces. C'est le principe « aucune valeur calculée deux fois » appliqué aux
constantes.

### E12 — L'appairage d'appareil : sa politique n'est nulle part

*Trouvé par `storefront-tv`.*

« CODE VALABLE 15 MINUTES » n'existe que dans une **chaîne de copie**, et les codes eux-mêmes sont
des littéraux (`H4T9RD`, `K7QM2P`). La durée de validité est une politique : elle appartient au
contrat et doit être servie dans la réponse. De même, **l'alphabet du code n'est déclaré nulle
part** — ce qui est une exigence de contrat et non de typographie, puisqu'un code lu à trois
mètres et ressaisi sur un téléphone ne doit pas mêler `0/O`, `1/I`, `5/S`, `8/B`.

### E13 — `devices` a deux formes sous un seul nom

*Trouvé par `storefront-tv`.*

`catalogue.json` déclare `devices` comme un **entier** (3, 2, 1, 1). `fixtures.js` en fait ensuite
une **liste d'objets**. Deux formes, un identifiant.

### E14 — Les commandes externes n'ont aucun contexte propriétaire

*Trouvé par `storefront-web`.*

« Mes commandes » fusionne les commandes Arthome et celles passées sur la boutique propre de
l'artiste (Shopify, WooCommerce, PrestaShop, Drupal, API), avec référence marchand et domaine,
sans facture, ni suivi, ni remboursement chez nous. À rattacher au même arbitrage que C8 (la
boutique).

### E15 — Écarts de maquette sans portée contractuelle directe

Utiles au portage, sans conséquence sur les contrats : l'action **Partager** est câblée vers
l'écran de paiement (et révèle qu'**aucune commande de partage n'a jamais été définie** — sur TV
elle ne peut vouloir dire qu'un QR vers une **URL canonique servie**) ; la page `plans` de la TV
est spécifiée et absente de la maquette ; taux de remplissage et places restantes sont deux
valeurs indépendantes ; le débit du tchat est mesuré dans une unité et comparé dans une autre ;
deux débits différents portent le même nom sur l'écran de diffusion ; le troisième canal de
notification n'est nommé nulle part ; appareils et sessions sont traités comme deux choses.

### Ce que la famille E apprend

Trois enseignements qui dépassent la liste :

1. **La faute dominante du projet est la table littérale parallèle** (E2). Elle a été commise sur
   au moins huit champs, par cinq maquettes, malgré un principe explicite qui l'interdit. Un
   principe ne suffit pas : il faut que l'énumération soit **typée depuis `core`** et qu'une porte
   de CI le vérifie.
2. **Ce qui n'est jamais appelé n'a jamais été éprouvé.** `storefront-mobile` a vérifié seize
   fonctions de `helpers.js` : **quatorze ne sont jamais appelées** par sa maquette — droits
   territoriaux, barrière de langue, places restantes, reprise, appareils, abonnements, modération
   du tchat. Leur contrat doit être **conçu, pas observé**. Un silence n'est pas un accord.
3. **Quatre agents ont trouvé E1 séparément**, et aucun n'avait été orienté vers lui. La
   convergence de lectures indépendantes est le seul moyen fiable de distinguer un détail d'un
   défaut structurel.

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
