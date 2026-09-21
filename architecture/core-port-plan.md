# Plan de portage de `@arthome/core`

> **Un plan, pas du code.** Aucun TypeScript n'est écrit ici : le paquet se compilera avec les
> `tsconfig` que `@arthome/tooling` est en train de poser. Tout le travail de **conception** peut
> se faire maintenant, et c'est lui qui décidera si le paquet reste importable sous Metro.
>
> Sources : `shared/helpers.js` (810 lignes, **153 fonctions**, ~130 membres exportés),
> `shared/fixtures.js`, `shared/studio-data.js`, `shared/catalogue.json`, `shared/taxonomy.json`,
> et mes propres `data-model.md`, `context-map.md`, `events.md`.
>
> **On porte les règles, on remodèle les formes.** Les familles D et E de
> `corrections-handoff.md` sont la liste de courses : §4 dit, règle par règle, ce qui est corrigé
> au passage.

---

## 0. Les quatre contraintes qui commandent tout le reste

| Contrainte | Conséquence immédiate |
|---|---|
| **Zéro dépendance framework** | pas de React, pas d'Angular, pas de Nest, **pas d'API navigateur**, pas de Node spécifique. Le paquet tourne sous Node, Next, **Metro** et Angular |
| **`isolatedDeclarations` sous TS 6.0.3** | **toute surface publique est annotée explicitement** — §6. Ce n'est pas du style, c'est une condition de compilation |
| **zod ne doit pas contaminer le domaine** | **deux entrées de paquet**, `.` sans dépendance et `./schema` avec zod — §2. C'est la décision structurante |
| **Aucune valeur calculée deux fois** | une règle vit **une fois** ici et s'évalue partout ; ce qui est interdit, ce sont deux **implémentations** (`context-map.md` §0) |

**Et une contrainte que `shared/` viole partout, à traiter d'emblée.** `helpers.js` porte trois
états globaux mutables — `locale`, `viewerCountry`, et une horloge `now()` implicite — plus un
index global `byId` sur le jeu de fixtures. Dans un fichier chargé par une maquette, c'est
commode. **Dans un paquet importé par sept services et cinq applications, c'est un défaut** : deux
requêtes concurrentes d'un service NestJS partageraient la même langue et le même pays.

> **Règle de portage n°1 : aucun état global. Toute fonction reçoit son contexte en argument.**

C'est le remodelage le plus mécanique du lot, et le plus envahissant : il touche presque toutes
les 153 fonctions. Il se paie une fois.

---

## 1. L'arborescence — dix-neuf modules

Le dossier de passation propose `taxonomy/`, `catalog/`, `fixtures/`, `i18n/` et
`domain/{booking, replay, payout, permissions, timezone}`. **Je la corrige** : elle date d'avant la
carte des contextes, elle range sous `booking` des choses qui n'y sont pas (le droit de lire, la
modération), et elle n'a nulle part où mettre les vocabulaires fermés — qui sont pourtant le
remède écrit à la faute dominante du projet (E2).

```
@arthome/core/src/
├── kernel/          horloge injectable · erreurs de domaine · types de base
├── vocabulary/      TOUS les vocabulaires fermés + la tolérance à l'inconnu
├── money/           Money · roundMinor · arithmétique en unité mineure
├── time/            instants · VenueClock · fenêtres · IANA
├── taxonomy/        univers · disciplines · genres · étiquettes · attributs · rang
├── catalog/         date · publication · displayState · droits territoriaux · langue
├── ticketing/       jauge · SeatHold · prix · promotions · remises · code de place
├── entitlement/     decideWatch · aperçu · sessions simultanées
├── replay/          politique · fenêtre · expiration · heures restantes
├── payout/          commission · TVA par juridiction · net · retenue
├── permissions/     rôles · grants · droits effectifs · navigation
├── moderation/      trois axes · badge dérivé · préséance · deux compteurs
├── notification/    seuils · heures calmes
├── search/          normalisation des critères · signature
├── media/           renditions déclarées
├── format/          formatage sans Intl, locale explicite
├── i18n/            les CLÉS et le catalogue de référence
├── schema/          ← LA SEULE À DÉPENDRE DE ZOD (§2)
└── fixtures/        jeu déterministe — seconde vie de fixtures.js
```

### Ce que chaque module exporte

| Module | Exporte | Ne contient pas |
|---|---|---|
| `kernel` | `Clock` (port), `SystemClock`, `FixedClock` · `DomainError` + son code · `Result` · `Brand<T>` pour les identifiants typés | aucune règle métier |
| `vocabulary` | les **22 vocabulaires fermés** typés, chacun avec sa liste, son type et `parseTolerant()` qui **conserve l'inconnu comme neutre** | des libellés |
| `money` | `Money` · `money()` · `add` · `sub` · `mulRate` · **`roundMinor`** · `compareCurrency` | du formatage |
| `time` | `Instant` (ISO UTC) · `VenueClock` · `offsetForInstant` · `isWithin` · `expiresAt` · `seasonBounds` | de l'affichage |
| `taxonomy` | l'artefact typé · `rankOf` · `familyOf` · `genresOf` · `matchTag` · `resolveTerm` | des requêtes sur un catalogue |
| `catalog` | **`displayStateOf`** · `outcomePrecedence` · `isRoomOpen` · `progressOf` · `isAvailableIn` · `blackoutReasonOf` · `languageProfileOf` · `hasLanguageBarrier` · `isUnderstandable` · **`nextPublicationTransitions`** · `publicationChecklist` · `isTransitionLocked` | les données |
| `ticketing` | `seatsAvailability` · `fillRate` · `isScarce` · **`holdExpiryFor`** · `priceFor` · `applyBestDiscount` · `serviceFeeFor` · **`seatCode`** · `capacityTierRules` · `cancellationDeadline` | Stripe |
| `entitlement` | **`decideWatch`** · `WatchVerdict` · `previewBudgetOf` · `concurrentLimitOf` | l'émission de jetons |
| `replay` | `replayWindowOf` · `replayExpiresAt` · **`replayHoursLeft`** · `isReplayOnSale` | le fichier |
| `payout` | **`payoutOf`** · `commissionOf` · `vatBreakdownOf` · `netOf` · `payoutStateFor` · `dueAtFor` | Stripe, la réconciliation |
| `permissions` | `MemberRole` (8) · **`effectiveRightsOf`** · **`assignableRolesOf`** · `canRevenue` · `canDecide` · `navigationFor` · `openPanesFor` · `tabPreferenceFor` | l'authentification |
| `moderation` | **`moderationBadgeOf`** · `precedenceOf` · `canSettle` · `claimLeaseDuration` · `settlementGuard` | la file |
| `notification` | les **cinq seuils** · `quietHoursApply` · `reminderLeadFor` | l'envoi |
| `search` | **`normalizeSearchCriteria`** · `criteriaSignature` · `migrateCriteria` | l'index |
| `media` | `renditionsFor` · `pickRendition` | des URL de fournisseur |
| `format` | `formatMoney` · `formatNumber` · `formatCompact` · `formatClock` · `formatDuration` · `formatTimecode` · `formatDayLabel` — **tous avec `locale` en argument explicite** | de l'état global |
| `i18n` | le type `MessageKey` · le catalogue de référence · `keysFor(surface)` | des phrases traduites servies dynamiquement |
| `schema` | les schémas zod de base — §2 | des règles |
| `fixtures` | `buildFixtures(seed, clock)` — déterministe | rien d'exporté vers la production |

**Dix-neuf modules, et deux entrées de paquet.**

**Pourquoi `vocabulary` est un module à part et pas un fichier dans chaque domaine.** E2 est la
faute dominante du projet : huit champs, cinq maquettes, une table littérale parallèle à chaque
fois. Le remède n'est pas un principe, c'est **un seul endroit où un vocabulaire est déclaré**, et
un endroit qu'on puisse citer dans une revue. Les vingt-deux :

```
publicationState · runState · dateOutcome · displayState · replayPolicy · chatMode
messageState · moderationItemState · moderationVerdict · moderationReason · audienceSanction
filterSeverity · stateChangeOrigin · memberRole · crewRole · priceTier · planTier · planOpening
payoutState · incidentKind · incidentCause · blackoutReason
```

**Trente-six au total, et non vingt-deux.** Le compte de cette liste était celui des vocabulaires
que `data-model.md` nommait ; l'écriture en a fait apparaître quatorze de plus, tous déjà employés
par un contrat ou un écran : les quatorze entrées de navigation du studio, les six volets d'une
fiche de date, les six surfaces, les trois canaux de notification, les quatre natures de
commande, les états d'abonnement, les verdicts de modération, la portée des droits, les natures
d'appareil, les rôles d'équipe, et les trois vocabulaires fiscaux que le temps 4 a ajoutés.
**Aucun n'est nouveau : ils étaient écrits en toutes lettres et déclarés nulle part.**

**Et chacun porte `parseTolerant()`**, qui conserve une valeur inconnue et la traite comme neutre —
jamais un rejet. C'est l'exigence de `storefront-tv` Q12, et c'est la seule chose du contrat qui,
mal faite, produit un écran noir chez des gens qui ne peuvent rien y faire.

---

## 2. Le partage TypeScript pur / zod — la décision structurante

Ce n'est pas seulement « lesquels sont en zod ». **C'est une frontière de paquet**, et c'est elle
qui décide de la facture du client mobile.

```json
"exports": {
  ".":        { "types": "./dist/index.d.ts",        "import": "./dist/index.js" },
  "./schema": { "types": "./dist/schema/index.d.ts", "import": "./dist/schema/index.js" }
}
```

> **L'entrée `.` n'importe zod nulle part, à aucune profondeur.** Une surface qui n'a besoin que
> des règles — la TV qui dérive un `displayState`, le mobile qui calcule des heures restantes —
> **ne tire pas une ligne de zod**.

C'est la même leçon que D-012, appliquée un cran plus tôt : le coût de zod est **fixe et lié à
l'import**, pas marginal et lié au nombre de schémas. Si `@arthome/core` importait zod depuis son
entrée principale, aucune entrée sans barillet de `@arthome/contracts` ne pourrait rattraper la
facture. **Une porte de CI le vérifie** : `import('@arthome/core')` ne doit résoudre aucun module
`zod`.

### Ce qui reste TypeScript pur — zéro dépendance

**Tout ce qui décide.** Un invariant n'a pas besoin d'être validé, il a besoin d'être vrai.

| Famille | Fonctions |
|---|---|
| arrondi et argent | `roundMinor`, `add`, `sub`, `mulRate` — l'arrondi **à l'unité mineure, sur chaque composante prise séparément** |
| code de place | `seatCode` — **émis par le serveur**, jamais dérivé côté client |
| fenêtre de rediffusion | `replayExpiresAt`, `replayHoursLeft`, `isReplayOnSale` |
| versement | `payoutOf`, `commissionOf`, `vatBreakdownOf`, `netOf`, `payoutStateFor`, `dueAtFor` |
| droits par rôle | `effectiveRightsOf`, `assignableRolesOf`, `canRevenue`, `canDecide`, `navigationFor` |
| état et transitions | `displayStateOf`, `nextPublicationTransitions`, `isTransitionLocked`, `publicationChecklist` |
| droit de lire | `decideWatch`, `previewBudgetOf`, `concurrentLimitOf` |
| jauge et prix | `seatsAvailability`, `fillRate`, `isScarce`, `priceFor`, `applyBestDiscount`, `holdExpiryFor` |
| modération | `moderationBadgeOf`, `precedenceOf`, `settlementGuard` |
| temps | `offsetForInstant`, `isWithin`, `seasonBounds`, `isRoomOpen`, `progressOf` |
| recherche | `normalizeSearchCriteria`, `criteriaSignature` |
| formatage | tout `format/` — sans `Intl`, locale en argument |

### Ce qui vit en zod, dans `./schema`

**Uniquement ce qui traverse une frontière et doit être vérifié à l'arrivée.** Les schémas **de
base**, ceux que `@arthome/contracts` étend par `.extend()` et `.pick()` plutôt que de les
redéclarer.

| Schéma | Pourquoi ici et pas dans `contracts` |
|---|---|
| `MoneySchema` | sept services et cinq applications l'échangent ; le redéclarer serait E2 sur la valeur la plus manipulée du système |
| `InstantSchema` | **chaîne ISO 8601 UTC** — `z.date()` est inconvertible en JSON Schema, donc jamais de `z.date()` à une frontière |
| `VenueClockSchema` | `{ venueTimezone, venueUtcOffsetMin }` — les deux voyagent toujours ensemble (D3) |
| `IanaTimeZoneSchema` | validation de forme, pas d'existence : la base IANA n'est pas embarquée |
| les **22 vocabulaires** | `z.enum` strict en **entrée**, `z.union([z.enum, z.string])` en **sortie** — la règle R14 de `backend-contracts` |
| identifiants marqués | `AccountId`, `ProfileId`, `DateId`, `ShowId`, `ArtistId`, `VenueId`, `ChannelId`, `SeatId`, `OrderId` — UUIDv7 validé en forme |
| `SlugSchema`, `LocaleSchema`, `CountryCodeSchema`, `CurrencyCodeSchema` | vocabulaires de frontière |
| `PageCursorSchema` | Base64 opaque sur `(created_at, id)` |
| `BuyerTaxLocationSchema`, `TaxEvidenceSchema` | §5 — nouveaux, et ils traversent |
| `ErrorEnvelopeSchema` | `code`, `params`, `traceId`, **`nature`** |

**Trois règles de frontière, à écrire dans le paquet lui-même :**

1. **aucun `z.transform()` dans un schéma de frontière** — inconvertible en JSON Schema, donc
   l'OpenAPI généré mentirait ;
2. **`io: "input"` décrit une requête, la sortie décrit une réponse** — ce sont deux schémas, pas
   un seul lu deux fois ;
3. **un échec de validation se traduit en code**, jamais en message anglais de zod — sinon l'i18n
   fuit à la première erreur de formulaire, et c'est le formulaire de paiement qui la fait fuir.

**Ce qui n'est PAS en zod, et qu'on serait tenté d'y mettre** : les règles. `decideWatch` ne
valide pas son entrée par un schéma — il reçoit des types déjà vérifiés à la frontière et **décide**.
Y mettre zod ferait payer la dépendance à chaque évaluation d'un droit, sur le chemin le plus chaud
du système.

---

## 3. Le tableau de portage — ce qui vient d'où

**Sur ~130 membres exportés de `helpers.js`** : 38 portent une règle, 24 sont du formatage,
31 sont des requêtes sur le jeu de fixtures, 19 sont de la résolution i18n, et le reste est de
l'accès indexé. La proportion compte : **moins d'un tiers du fichier est du domaine**, et c'est ce
tiers qu'on porte.

### 3.1 Porté tel quel — la règle est juste, la forme aussi

| `helpers.js` | `@arthome/core` | Note |
|---|---|---|
| `isRoomOpen` | `catalog.isRoomOpen` | constante `roomOpensBeforeMin` servie, plus recopiée (E11) |
| `progressOf` | `catalog.progressOf` | borne 0–1 |
| `isSoldOut` | `ticketing.seatsAvailability` | devient une **union discriminée**, pas un booléen |
| `matchTag`, `resolveTerm` | `taxonomy.*` | inchangé |
| `categoryOfShow`, `genreOfShow` | `taxonomy.*` | inchangé |
| `number`, `compact`, `duration`, `timecode` | `format.*` | **sans `Intl`, vérifié** : le portage reste sans `Intl`, ce qui est exactement ce qu'il faut pour Metro |

### 3.2 Porté avec correction — la règle est juste, la donnée est fausse

| `helpers.js` | Devient | Ce qui est corrigé |
|---|---|---|
| `stateOf` | **`catalog.displayStateOf`** | **E4** : trois axes sans hiérarchie. La nouvelle fonction compose `publication.state`, `run.state` et `outcome` avec la préséance écrite — `outcome` > `run` > `publication` — et rend **`{ state, validUntil }`** |
| `replayHoursLeft` | `replay.replayHoursLeft` | **E2** : `sub`/`off` de la maquette mobile ne sont pas du vocabulaire ; `helpers.stateOf` testait `policy !== 'none'`, donc une date créée avec `off` n'aurait jamais été reconnue sans rediffusion |
| `languageDependency`, `hasLanguageBarrier` | `catalog.languageProfileOf`, `hasLanguageBarrier` | **D1** : le vocabulaire déclaré `none \| light \| helpful` ne contient pas `essential` — la valeur dont dépend la règle, portée par cinq spectacles et traduite dans l'i18n. `light` n'est employé nulle part. Le vocabulaire réel est **`none \| helpful \| essential`** |
| `availableIn`, `blackoutReason` | `catalog.isAvailableIn`, `blackoutReasonOf` | **E8** : `blackoutReasons[]` porte `label`/`labelEn` — du texte rédigé **dans la donnée**. La fonction rend un **code**, jamais une phrase |
| `venueClock`, `venueDiffers`, `zoneAbbr` | `time.offsetForInstant`, `VenueClock` | **D3** : `venue.utcOffsetMin` est un décalage **gelé** ; l'abréviation était déduite en le comparant à une table. Un décalage figé ne survit pas à un changement d'heure, et une date à six mois s'affiche fausse. Identifiant **IANA** + instant UTC, décalage **recalculé au service** |
| `plans`, `planOf` | `vocabulary.PlanTier` + `entitlement.planOpeningsOf` | **E1, le plus grave** : quatre vocabulaires disjoints, et `planOf()` fait `filter(...)[0] \|\| plans()[0]` — **aucun compte de référence ne trouve le sien, tous retombent sur `free`**. Comme `plan.opens[]` conditionne l'accès à la lecture, c'est un **défaut d'autorisation**, pas d'affichage. Un seul jeu : `free \| pass \| premium`, en **kebab-case sur le fil** |
| `canInvite`, `invitableRoles` | `permissions.assignableRolesOf` | **E6** : `studio-data.js` rabat huit rôles sur six personas et **détruit le droit d'invitation de `director`**. Le domaine porte les **huit** ; les six sont un libellé |
| `messageState`, `isVisible` | `moderation.moderationBadgeOf` | **E3 / D6** : quatre échelles, et `reported` — un état de **triage** — logé dans le champ des sanctions. Trois axes séparés, préséance écrite, badge dérivé |
| `publicationState`, `isLocked` | `catalog.nextPublicationTransitions`, `isTransitionLocked` | **E5** : les fixtures verrouillent des **états**, la maquette des **transitions**. C'est la seconde qui est juste — publier engage le tarif, mettre en ligne met en vente. Le verrou porte sur un **couple `from > to`** |
| `payoutOf`, `balanceOf` | `payout.payoutOf` | **D5** : `net = brut − 12 % − TVA(brut)` n'est **pas une règle fiscale**, c'est un nombre plausible pour une maquette. Remodelé au §4 |
| `imageUrl`, `seededImage` | `media.renditionsFor` | La recette `{id}?w={w}` est une **commodité de maquette**. Un fond 4K décodé pour une vignette coûte autant qu'un plein écran : le contrat porte des **renditions déclarées** aux tailles réellement affichées |
| `seatsLabel` | `ticketing.seatsAvailability` + i18n | la fonction rendait une **phrase** (« 86 places », « Complet ») ; elle rend désormais un état, et le libellé est une clé |
| `devicesOf` | `permissions` / hors domaine | **E13** : `devices` est un **entier** dans `catalogue.json` et une **liste** dans `fixtures.js`. Deux formes, un nom. Tranché : `Device` + `DeviceSession` |

### 3.3 Remodelé, pas porté — la forme ne survit pas

| `helpers.js` | Pourquoi la forme tombe |
|---|---|
| **`isWatchable(account, date)`** | suppose que le client **détient la liste complète des places du compte**. Intenable : elle grandit, elle change pendant que l'application dort, et la décision territoriale n'appartient pas au client. Devient **`decideWatch(inputs): WatchVerdict`** — cinq entrées, un verdict, un code de refus, une action de repli, une expiration |
| `ownedDates`, `owns`, `follows`, `resumeOf` | des lectures sur un jeu global. Deviennent des **entrées** de `decideWatch` ou des modèles de lecture de service |
| `catalogueFor` | le filtrage du profil enfant se fait **côté serveur** : sinon la TV d'un enfant télécharge le catalogue adulte pour le masquer |
| `t`, `label`, `enumLabel`, `content`, `title`, `synopsis`, `bio`, `chatText` | de la **résolution i18n** sur un état global de langue. `core` garde les **clés** ; la résolution est côté surface, sur l'artefact versionné |
| `now`, `nowMinutes`, `dateAt` | **D7** : `startOffsetMin` et `atMin` sont des décalages relatifs à l'ouverture de l'application, et `catalogue.json` le dit lui-même : *« nothing here expires »*. Excellent pour une maquette, **inutilisable sur un contrat**. Deviennent des **instants ISO** + une **horloge injectable** |
| `setLocale`, `setViewerCountry` | état global mutable — voir §0 |
| `show()`, `artist()`, `date()`, `datesOfShow`, `liveNow`, `tonight`, `datesInCategory`… (31 membres) | des **requêtes sur les fixtures**. Elles ne sont pas du domaine : elles deviennent des requêtes de dépôt dans les services, et survivent telles quelles dans `fixtures/` pour les tests |
| `publicationOf`, `payoutOf` (accès), `healthOf`, `moderationOf`, `merchOf`, `inboxOf` | idem — accès indexé, pas règle |

### 3.4 `fixtures.js` — sa seconde vie

`buildFixtures(seed, clock)` : **déterministe**, même catalogue à chaque exécution, mais il produit
désormais des **instants** et non des décalages. La conversion en décalages relatifs, si elle sert
encore à une démonstration, devient une **commodité de présentation** et non une forme transportée.

Trois usages : les tests d'intégration des sept services, le jeu de démonstration publique, et le
mode `FakePaymentAdapter` qui doit tourner **sans clé et sans réseau**.

---

## 4. Ce qui est nouveau — rien dans `shared/` ne le porte

Ces règles ont été **conçues** pendant cette session, pas observées. Elles n'ont aucune fixture
derrière elles, et c'est un avertissement autant qu'une liste.

| Nouveau | Ce que c'est | Pourquoi ça n'existait pas |
|---|---|---|
| **`displayStateOf`** | la quatrième valeur, dérivée et unique, des trois axes d'état | chaque surface recomposait la hiérarchie à sa façon — la définition même d'une valeur calculée deux fois (E4) |
| **`decideWatch`** | le verdict de lecture à cinq entrées | `isWatchable` supposait un client omniscient |
| **`holdExpiryFor`** | **`SeatHold.expiresAt` est le MÊME instant que l'expiration de l'intention d'achat** — 15 min pour un paiement, 5 min pour un appairage TV | rien ne réservait la jauge : la TV affichait « 12 places » pendant toute l'attente du téléphone |
| **`seatCode`** | l'émission serveur du code de place | la maquette le **hachait côté client** : trois surfaces, trois fonctions de hachage, trois codes pour la même place |
| **`vatBreakdownOf` + `BuyerTaxLocation`** | ventilation par **juridiction**, preuves de localisation, **taux appliqué à la vente** | la fixture applique `billingMarkets[0]` à tout. Et un marché de facturation est une notion de **prix**, jamais de **taxe** |
| **`payoutOf` remodelé** | commission sur le **HT**, TVA au taux du pays du spectateur, redevable = la plateforme | D5 : la formule de la fixture produit un nombre plausible et ne répond à aucune des trois questions fiscales |
| **les deux compteurs de modération** | `version` porte le **bail**, `decisionVersion` porte le **règlement** — seul un verdict l'incrémente | un compteur unique ne peut pas exprimer « refuse si tranché, accepte si seulement réclamé », et il annulait la file hors ligne du mobile |
| **`precedenceOf` (modération auto)** | un humain renverse une décision automatique, **jamais l'inverse** ; l'origine **survit** au règlement | rien à construire aujourd'hui ; la forme doit pouvoir accueillir un acteur non humain sans changement de contrat |
| **`normalizeSearchCriteria` + `criteriaSignature`** | la déduplication « déjà enregistrée », calculée **une fois** | la maquette la calculait côté client, sur deux écrans, et elle déclenche une écriture |
| **`migrateCriteria` + `criteriaVersion`** | une recherche enregistrée **se rejoue ou se déclare périmée**, jamais ne disparaît en silence | rien ne versionnait la grammaire des filtres |
| **`seasonBounds`** | 1ᵉʳ septembre → 31 août | notion de domaine que cinq surfaces auraient devinée |
| **les cinq seuils de notification** | 30 min · 85 % · 6 h · file > 10 · poste non affecté à J-1 | écrits dans des textes d'écran, recopiés par surface |
| **`capacityTierRules`** | paliers monotones, seuil de provision (10 000), échéance de révision (72 h), fenêtre de priorité (2 h) | absent de `shared/` ; six formes affichées par la maquette sans porteur |
| **`parseTolerant`** | conserver une valeur d'énumération inconnue et la traiter comme **neutre** | la survie du parc TV en dépend |
| **`concurrentLimitOf`** | `multi-screen` est une **contrainte d'exécution**, pas une ligne de marketing | aucun décompte n'existait |

---

## 5. Les tests qui font mal — et l'invariant que chacun protège

**La règle que j'ai imposée dans la définition de fini s'applique d'abord ici : un test nomme
l'invariant qu'il protège.** Un test qui décrit ce que fait le code ne sert à rien le jour où le
code change ; un test qui nomme une promesse survit au refactoring.

### 5.1 Ceux que le dossier d'origine nommait

| Test | Invariant protégé | Le cas qui fait mal |
|---|---|---|
| **Fuseaux** | *une date programmée dans six mois s'affiche à la bonne heure* | une date le **lendemain d'un changement d'heure**, dans une salle d'un autre fuseau que le spectateur, avec un décalage de jour (« la veille » / « le lendemain »). C'est le cas qui a fait échouer D3, et un décalage gelé le rate toujours |
| **Expiration de rediffusion** | *la fenêtre est calculée depuis la fin du direct, jamais depuis le début* | une date **interrompue** : la fenêtre part-elle de l'interruption ou de la fin annoncée ? Plus une fenêtre de 200 h qui traverse un changement d'heure |
| **Droits par rôle** | *le repli à six personas ne crée jamais un droit* | une personne tenant `video` **et** `moderation` sur la même chaîne : la navigation est l'**union**, et `assignableRolesOf` doit rendre **vide** — ni `video` ni `moderation` ne peuvent inviter |
| **TVA et arrondis** | *chaque composante est arrondie séparément, à l'unité mineure* | un panier de trois places à un tarif qui ne tombe pas juste, dans **deux juridictions** — la somme des arrondis n'est pas l'arrondi de la somme, et c'est là qu'on perd un centime |
| **Versements** | *la commission porte sur le HT, jamais sur le TTC* | la **même place vendue en France et en Suisse** : la commission doit être **identique**, sinon les 12 % annoncés aux artistes varient avec le pays de l'acheteur |
| **Codes de place** | *le serveur émet, le client n'invente jamais* | le même `seatId` traité par trois surfaces doit rendre le **même code servi** — et le test doit échouer si quelqu'un réintroduit un hachage client |
| **Transitions d'état** | *deux transitions sont sans retour* | `scheduled → draft` et `replay-online → ended` doivent être **refusées** avec la promesse engagée en paramètre ; et la **tentative** doit être journalisée |

### 5.2 Ceux que la session a fait émerger

| Test | Invariant protégé | Le cas qui fait mal |
|---|---|---|
| **Préséance des trois axes** | *`outcome` prime sur `run`, qui prime sur `publication`* | une date `publication: live`, `run: on_air`, `outcome: cancelled` — l'issue doit gagner. Combinaison absurde en apparence, **produite par un ordre de consommation Kafka** |
| **`validUntil` de `displayState`** | *un état servi porte l'instant où il cesse d'être vrai* | un état servi **une seconde avant** l'ouverture de salle : `validUntil` doit valoir cet instant-là, pas `now + 60 s` |
| **`decideWatch`, les cinq entrées** | *un seul verdict, le même vocabulaire de refus des deux côtés* | **table de vérité complète** : possession × état × territoire × politique de rediffusion × formule. Et le cas qui compte : détenteur d'une place, **hors territoire** → `OUT_OF_TERRITORY`, pas `NO_SEAT` |
| **`SeatHold` et l'appairage** | *un seul instant, porté par deux objets* | un appairage `seat` qui expire doit libérer la jauge **au même instant**, et `seatsAvailable` doit **remonter** sans qu'aucune surface ne demande rien |
| **Les deux compteurs de modération** | *un verdict est accepté pendant qu'un autre tient le bail* | `claim` → `release` → verdict hors ligne à `expectedVersion` d'avant : **accepté**. Puis un verdict après un verdict : **refusé, avec le gagnant** |
| **`parseTolerant`** | *une valeur inconnue est conservée et neutre, jamais rejetée* | une **22ᵉ discipline** et une issue inédite dans la même charge utile : la page entière doit rendre. C'est la seule chose qui, mal faite, produit un écran noir chez des gens qui ne peuvent rien y faire |
| **`criteriaSignature`** | *la même recherche produit la même signature, quel que soit l'ordre des filtres* | deux disciplines et trois étiquettes **dans deux ordres différents** → une seule signature. Sinon « déjà enregistrée » ment et on crée deux alertes |
| **Remise contre promotion** | *la plus favorable au spectateur, jamais le cumul* | une avant-première à tarif de découverte pour un abonné `premium` : le cumul donnerait un **prix négatif** |
| **`roundMinor` et l'avoir** | *un avoir ne crée jamais de monnaie* | un remboursement partiel suivi d'un avoir sur le reliquat : la somme doit être **exactement** le montant payé, au centime |
| **Ordre de consommation** | *un consommateur ne voit jamais une issue avant la publication qui la crée* | `publication.engaged` et `date.scheduled` sur la **même partition**, rejoués dans le désordre → le projecteur doit rester juste |
| **Horloge injectable** | *aucune règle ne lit l'heure système* | toute fonction de `time/`, `replay/` et `catalog/` doit être **déterministe sous `FixedClock`**. Un test qui passe à 23 h 59 et échoue à 00 h 01 a trouvé un `Date.now()` oublié |

---

## 6. `isolatedDeclarations` — ce que ça impose concrètement

Les `.d.ts` publiés sont compilés avec `isolatedDeclarations` sous **TS 6.0.3**, plafond commun
aux sept dépôts. Le compilateur doit pouvoir écrire la déclaration **fichier par fichier, sans
inférence entre fichiers**. Trois conséquences, toutes mécaniques :

1. **Toute fonction exportée annote son type de retour.** `export function payoutOf(…)` sans
   annotation **ne compile pas**. Sur ~90 fonctions publiques, c'est du travail mécanique à faire
   d'emblée plutôt qu'à rattraper.
2. **Aucun type public inféré depuis le CORPS d'une fonction.** C'est la formulation juste, et
   elle corrige ce que ce document disait au temps de sa rédaction.

   > **Correction rendue à l'écriture.** Ce paragraphe interdisait
   > `export const ROLES = [...] as const`. **C'était faux sur les deux bouts.**
   > D'abord, `isolatedDeclarations` **autorise** une assertion `as const` sur un littéral : le
   > type y est syntaxiquement calculable, aucune inférence ne traverse un corps de fonction.
   > Ensuite et surtout, `arthome-check-enums` **exige cette forme exacte** — elle découvre les
   > vocabulaires par le motif `export const NOM = ['a','b'] as const`. Interdire la forme aurait
   > **désactivé la porte anti-E2 du projet**.
   >
   > La forme retenue est donc, pour chaque vocabulaire, **trois déclarations** : la liste en
   > `as const` (que la porte découvre), le type dérivé, et un objet de **membres nommés** pour
   > que les règles n'écrivent jamais une chaîne littérale — sans quoi la porte serait
   > intenable à l'usage.
3. **Aucun type anonyme exporté.** Toute forme rendue par une fonction publique est un type
   **nommé et exporté** : `WatchVerdict`, `PayoutBreakdown`, `SeatAvailability`,
   `PublicationTransition`, `DisplayStateResult`. Le paquet y gagne — un type nommé se cite dans
   une revue, un type anonyme se recopie.

**La preuve attendue, et elle est en local** (le quota d'Actions est épuisé) : compiler les `.d.ts`
publiés et les type-vérifier depuis un projet en TS 6.0.3. Un paquet dont les déclarations ne se
lisent que par la version qui les a produites n'est pas fini.

---

## 7. L'ordre de portage

Les modules ont des dépendances entre eux ; les porter dans le désordre oblige à écrire des
bouchons. L'ordre qui n'en demande aucun :

```
1. kernel · vocabulary · money · time          aucune dépendance, tout en dépend
2. taxonomy · media · format · i18n            dépendent de 1
3. catalog · replay · permissions              dépendent de 1 et 2
4. ticketing · moderation · notification · search
5. entitlement · payout                        dépendent de 3 et 4 — les plus exposés
6. schema                                      la SEULE à ajouter zod
7. fixtures                                    dépend de tout, dépendu par rien
```

**`entitlement` et `payout` en dernier des règles**, et c'est délibéré : ce sont les deux qui
composent le plus de choses — cinq entrées pour l'un, une juridiction et un modèle fiscal pour
l'autre — et les deux dont un défaut coûte le plus cher. Les écrire en dernier, c'est les écrire
sur des fondations déjà testées.

**`schema` après toutes les règles**, parce qu'un schéma de frontière décrit une forme que le
domaine a déjà fixée. L'inverse — dessiner les schémas d'abord — produirait des règles dictées par
la forme d'une charge utile, c'est-à-dire exactement le défaut que ce projet passe son temps à
corriger.
