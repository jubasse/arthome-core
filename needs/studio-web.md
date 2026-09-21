# Besoins — studio web (Angular)

> Ce document exprime **ce que le contrat doit porter et garantir** pour la régie web.
> Il ne décrit aucune interface. Les identifiants sont en anglais, le texte en français.
>
> Sources lues : `streaming.md` (intégral), `shared/helpers.js`, `shared/studio-data.js`,
> `shared/catalogue.json`, les sections studio de `shared/fixtures.js`, `shared/i18n/studio.json`,
> `shared/i18n/index.json`, et `mockups/Studio.dc.html` par fragments repérés au `rg`.
> Errata pris en compte : `architecture/corrections-handoff.md`, famille **D** en particulier.

---

## Inventaire des écrans

### Navigation — quinze entrées, filtrées par rôle

L'ordre est fixe (`ORDER`) ; la présence dépend du rôle. Les entrées sont :

`agenda` · `dashboard` · `moderation` · `crew` · `events` · `stream` · `stats` · `tickets` ·
`store` · `replays` · `team` · `payouts` · `journal` · `settings` · `help`

**`team` n'est ouvert à aucun des six personas** : aucune entrée de la table d'accès ne le
contient, et la règle « la console de coordination absorbe la page Équipe » le retire une
seconde fois quand `crew` est présent. La page existe pourtant dans la maquette. Voir
« Incohérences relevées ».

### Hors navigation

| Écran | Ce qu'il introduit |
|---|---|
| `regie` | la conduite du direct : sept onglets, eux-mêmes filtrés par rôle |
| `event` | la fiche d'une date : six volets + une vue d'ensemble, chacun ouvert selon le rôle |
| `wizard` | création d'une date : quatre décisions, dont une irréversible |
| `inbox` | invitations reçues et alertes routées par rôle — ouverte à **tout le monde** |

### Sous-onglets, écran par écran

| Écran | Sous-onglets | Filtrage |
|---|---|---|
| `regie` | `ov` · `feed` · `mod` · `store` · `sales` · `chap` · `log` | `feed`/`chap` techniques, `store`/`sales` financiers, le reste ouvert |
| `event` | `all` (vue d'ensemble) · `public` · `tickets` · `chat` · `tech` · `crew` · `replay` | un volet par ensemble de rôles ; `all` n'apparaît qu'au-delà de trois volets ouverts |
| `moderation` | `chat` · `queue` · `filter` · `sanct` | pas de filtrage interne — la page entière est réservée à `mod` |
| `crew` | `members` · `matrix` · `guests` · `log` | pas de filtrage interne, mais les actions le sont |
| `stats` | `audience` · `series` | `series` compare les dates d'un même spectacle |
| `journal` | filtre par nature : `air` · `mod` · `event` · `access` · `money` | filtre, pas onglet |

### Écrans qui n'introduisent rien de nouveau au contrat

`dashboard`, `agenda`, `store`, `replays`, `help`, `settings` et `team` se servent de formes déjà
décrites ailleurs (agenda d'une chaîne, catalogue boutique, fenêtres de rediffusion, identité de
chaîne, annuaire). Ils sont listés pour la couverture, pas détaillés. Trois exceptions, traitées
plus bas parce qu'elles portent une commande ou une règle propre : le seuil de jauge de `tickets`,
la double validation de `payouts`, et la zone sensible de `settings`.

---

## Les rôles et ce qu'ils ouvrent

### Le fait central : deux vocabulaires de rôle, et une réduction qui perd de l'information

`shared/catalogue.json` déclare **huit** `memberRoles` :

```
artist · production · coordination · director · video · sound · moderation · treasury
```

`studio-data.js` les réduit à **six** personas pour les deux régies :

```
artist → artist   production → prod   coordination → coord
director → regie  video → regie  sound → regie
moderation → mod  treasury → tres
```

**Cette réduction n'est pas réversible, et elle efface un droit.** La table `grants` distingue
précisément ce que la réduction confond : `director` peut inviter `video` et `sound` ; `video` et
`sound` ne peuvent inviter personne. Une fois les trois postes repliés sur `regie`, l'application
ne peut plus savoir si le membre qu'elle affiche a le droit d'inviter.

**Ce que le contrat doit servir, donc : les deux, avec des rôles distincts.**

1. **La matière brute, au vocabulaire à huit valeurs.** Un membre d'une chaîne porte son rôle
   canonique (`director`, pas `regie`), parce que c'est lui qui détermine les droits, et parce que
   c'est lui que porte l'i18n (`enums.memberRole.director`). Le repli à six est une **commodité de
   présentation** et n'a rien à faire sur le fil.
2. **Les droits effectifs, calculés une fois, côté domaine.** Le studio web, le studio mobile et
   les gardes de chaque service liraient sinon la même table trois fois — ce que la décision
   « aucune valeur calculée deux fois » interdit.

### Ce que « droits effectifs » doit contenir exactement

Pour la chaîne courante, et pour chaque chaîne où la personne intervient :

- **les entrées de navigation ouvertes** — l'union des accès de tous les rôles tenus sur cette
  chaîne. La table observée :

| Entrée | `artist` | `prod` | `regie` | `mod` | `coord` | `tres` |
|---|:-:|:-:|:-:|:-:|:-:|:-:|
| `agenda` | | | ● | ● | | |
| `dashboard` | ● | ● | | | | ● |
| `moderation` | | | | ● | | |
| `crew` | ● | ● | | | ● | |
| `events` | ● | ● | ● | | | |
| `stream` | ● | ● | ● | | | |
| `stats` | ● | ● | | | | ● |
| `tickets` | ● | ● | | | | ● |
| `store` | ● | ● | | | | |
| `replays` | ● | ● | ● | | | |
| `team` | — | — | — | — | — | — |
| `payouts` | ● | | | | | ● |
| `journal` | ● | ● | | | ● | ● |
| `settings` | ● | | | | | |
| `help` | ● | ● | ● | ● | ● | ● |

- **les volets de fiche de date ouverts** : `public` et `replay` → `artist`, `prod` ;
  `tickets` → `artist`, `prod`, `tres` ; `chat` → `artist`, `prod`, `mod` ;
  `tech` → `artist`, `prod`, `regie`, `coord` ; `crew` → `artist`, `prod`, `coord`.
- **trois capacités transverses** qui gouvernent des colonnes et des compteurs entiers, pas des
  écrans : `canRevenue` (`artist`, `prod`, `tres`), `canOps` (`artist`, `prod`, `regie`),
  `canTech` (`artist`, `prod`, `regie`).
- **la capacité de décision d'une issue de date** (reporter, annuler, dédommager) : réservée au
  propriétaire et à la production. Les autres ne peuvent que **signaler**.
- **les rôles attribuables** — la projection de `grants` sur les rôles tenus, déjà matérialisée
  dans les fixtures sous `member.canInviteRoles`. Servir cette liste matérialisée, pas la table
  `grants` à recomposer.

### Le corollaire, et il est structurant

`canRevenue` ne masque pas une colonne : **il doit décider de ce que la réponse contient.** Une
régie qui reçoit le brut de billetterie dans sa charge utile et ne l'affiche pas est une fuite,
pas une règle. Il faut donc une **projection par rôle côté serveur** : l'agenda d'une chaîne servi
à un `regie` n'a pas de champ `gross`, celui servi à un `tres` n'a pas de clé de flux.

De la même façon, un `mod` doit pouvoir charger le volet `chat` d'une date **sans** charger la
fiche entière, sinon la billetterie transite pour rien. La fiche de date doit être **servie par
volets**, pas servie entière et découpée au rendu.

### Multiplicité — trois points que la maquette exerce et que les fixtures n'exercent pas

1. **Une personne tient plusieurs rôles sur la même chaîne.** La maquette porte un sélecteur de
   second rôle et un `roleKeys` pluriel, avec une navigation qui est l'**union**. Les fixtures ne
   posent qu'un `role` par ligne de membre. Le contrat doit porter un **ensemble** de rôles par
   couple (personne, chaîne).
2. **Une personne travaille sur plusieurs chaînes, avec un rôle différent sur chacune.** C'est
   exactement ce que `chanSets` construit, et c'est le cas normal d'un indépendant
   (`people[].channels`, `runsCalled`). Le contexte « chaîne courante » fait donc partie de toute
   requête du studio, et la liste des chaînes accessibles fait partie du démarrage.
3. **Deux échelles d'accès, non interchangeables.**
   - *membre d'une chaîne* — permanent, portée chaîne, révocable, avec un propriétaire jamais
     retirable (`owner: true`, `removable: false`) ;
   - *renfort affecté à une date* — temporaire, portée **une date**, avec une expiration explicite
     (« expire au salut + 1 h », « expire au tomber du rideau »).
   Ce sont deux objets différents avec deux cycles de vie différents. Les confondre ferait d'une
   révocation de renfort une exclusion de chaîne. Le contrat doit les séparer, et l'affectation
   ponctuelle doit porter **son instant d'expiration**, pas une phrase.

### Ce que le studio fait avec les rôles, au-delà de la navigation

- **Le routage des alertes.** Chaque alerte s'adresse au rôle qui peut agir : débit instable →
  `regie` ; file de modération saturée au-delà de dix messages → `mod` ; poste non affecté à J-1 →
  `coord` ; date à 90 % de la jauge → `prod` ; litige bancaire sous 24 h → `tres` ; transfert de
  propriété → `artist` seul. Le propriétaire reçoit en plus **tout** ce qui concerne sa chaîne.
  → la destination d'une notification est un **rôle**, pas une personne, et elle est décidée
  côté serveur. L'application ne doit pas filtrer une file commune.
- **L'affectation d'un poste.** Affecter quelqu'un à la régie ou à la modération d'une date n'est
  permis que si le rôle est dans les rôles attribuables ; sinon le geste doit être refusé avec un
  motif nommant qui peut le faire.
- **La clé de flux.** Elle ne se délègue que par le propriétaire ou la production, et sa rotation
  invalide l'ancienne immédiatement.

---

## Les formes de données

> `shared/` fait autorité sur le vocabulaire, **pas** sur les formes. Ce qui suit dit ce que le
> contrat doit porter, en signalant là où la fixture est une commodité de maquette.

### Les agrégats que le studio manipule

| Agrégat | Ce que le studio en attend |
|---|---|
| `channel` | l'unité de travail : identité publique, membres et leurs rôles, spectacles, dates, abonnés et gain sur 30 jours, vérification, fuseau de la salle de référence |
| `member` | personne (ou artiste propriétaire), **ensemble** de rôles, propriétaire, retirable, rôles attribuables, date d'entrée |
| `person` | annuaire : identité, indépendant ou non, ville, chaînes, directs conduits (`runsCalled`) |
| `show` | titre, synopsis, distribution, discipline, genre, étiquettes, durée, dépendance à la langue, visuels |
| `date` | l'objet public : instant, salle, jauge, tarifs, régime de tchat, politique de rediffusion, droits territoriaux, issue |
| `publication` | **l'acte de la chaîne** : état, ce qui est engagé, instants d'engagement, transitions verrouillées, liste de contrôle |
| `run` | la conduite : état d'antenne, équipe tenue, caméras, chapitres, incidents, ventes du direct |
| `payout` | brut, commission, TVA, net, retenu, remboursé, avoir, état, échéance, facture |
| `moderationItem` | message visé, motif, signalements, état, qui a tranché, quand |
| `audienceMember` | le spectateur **en tant que personne** d'une chaîne : pseudo, dates suivies, messages, état, ancienneté, abonné |
| `merchItem` | article, spectacle, chaîne, prix, stock, vendus, état |
| `inboxEntry` | nature, chaîne, date visée, instant, lu ou non, texte |
| `healthSample` | un point de mesure du flux : instant, débit, latence, images perdues, spectateurs |

### Sept écarts entre la fixture et ce que le contrat doit porter

1. **Les instants.** `catalogue.json` le dit lui-même : les décalages en minutes sont relatifs à
   l'ouverture de l'application et **rien n'expire**. Inutilisable sur un contrat. Sur le fil :
   **chaînes ISO 8601 en UTC** (D7), imposé de toute façon par zod.
2. **Les fuseaux.** `venue.utcOffsetMin` est un décalage gelé. Le studio affiche **deux horloges**
   — celle de l'opérateur et celle de la salle — et un suffixe « le lendemain » / « la veille »
   quand le passage d'une à l'autre change de jour. Ce calcul est faux avec un décalage figé et
   une date à six mois. Le contrat porte un **identifiant IANA** (`Europe/Paris`) et un instant
   UTC ; le décalage et l'abréviation se dérivent (D3).
3. **Les montants.** Les fixtures portent des euros entiers (`price: 26`, `amount`, `gross`). Le
   contrat porte des **centimes entiers + code devise**, et le studio formate. Le **taux de
   commission** doit être servi, pas redérivé de `commission / gross` : la maquette le redérive
   déjà et retombe sur 12 % par défaut quand le brut est nul.
4. **La TVA.** La fixture applique `billingMarkets[0].vatRate` à **tous** les versements (D4), et
   au brut de billetterie (D5). Or l'écran `payouts` porte un bloc « TVA par pays d'achat » qui
   dit l'inverse : *« le taux applicable est celui du pays de l'acheteur »*. Le contrat ne peut
   pas servir un taux unique par chaîne : il doit servir une **ventilation par marché de
   facturation**, chaque ligne portant son assiette, son taux et son montant, calculés par le
   domaine. Le reste est une question de droit, pas de contrat — voir les questions au backend.
5. **Les identifiants de relation.** `studio-data.js` indexe les équipes, le public et le tchat
   **par nom de chaîne** (`roster['Nom de chaîne']`). C'est une commodité de maquette qui casse au
   premier homonyme et au premier renommage. Le contrat référence par identifiant.
6. **L'audit et les versions.** Absents des fixtures, et indispensables : chaque geste du studio
   est nominatif, horodaté, conservé **24 mois** et exportable. Et le studio est
   **multi-opérateurs simultanés** — la console l'annonce explicitement (« aucun verrou : les N
   personnes en ligne peuvent agir en même temps »). Il faut donc une **version** sur les agrégats
   qu'on modifie à plusieurs (`publication`, `date`, `moderationItem`), pour qu'une commande
   partie d'un état périmé soit refusée avec l'état courant en retour.
7. **La nullabilité des mesures.** Un débit non mesuré n'est pas un débit nul. `streaming.md` en
   fait une règle d'honnêteté ; la maquette la tient déjà (`upMbps === null` → « non mesuré »).
   Chaque métrique de flux doit pouvoir être **absente**, et le contrat doit distinguer « non
   mesurée sur ce protocole » de « mesurée à zéro ». Le gigue et les paquets perdus n'existent
   qu'en entrée WebRTC ; en RTMP sur TCP ils n'ont pas de sens.

### Les vocabulaires fermés que le studio consomme

Tous doivent voyager en **identifiants**, jamais en phrases, et être résolus par
`enums.<type>.<id>` côté client (décision i18n par codes) :

`publicationState` · `runState` · `payoutState` · `messageState` · `moderationState` ·
`moderationReason` · `memberRole` · `crewRole` · `inboxKind` · `merchState` · `chatMode` ·
`replayPolicy` · `priceTier` · `outcome` · `audience` · `blackoutReason`

Deux d'entre eux ont **deux ou trois jeux de noms concurrents** dans le dossier ; ils sont traités
dans « Incohérences relevées ». Un troisième point, plus subtil : le tableau des événements se
trie **par état**, et l'ordre de tri est l'ordre de la machine à états, pas l'ordre alphabétique.
Le contrat doit donc porter un **rang explicite** sur `publicationState`, sinon chaque surface
réinventera `STATE_ORDER`.

---

## Les commandes

### Les commandes recensées

**Cycle de vie d'une date** — `createDraft` · `moveState` · `openSale` (cas particulier de
`moveState`) · `setPrices` · `setCapacity` · `openCapacityTier` · `setReplayPolicy` ·
`setChatMode` · `runTechnicalCheck` · `rotateStreamKey` · `duplicateDate`.

**Conduite** — `goOnAir` · `cutStream` · `setQualityProfile` · `toggleRenditionInLadder` ·
`addChapter` · `removeChapter` · `raiseIncident` · `publishHoldScreen` (message inclus) ·
`resolveIncident` · `flagIncidentToProduction` · `decideOutcome` (reporter / annuler / poursuivre
avec dédommagement).

**Modération** — `claimQueueItem` · `releaseQueueItem` · `settleQueueItem` (publier / supprimer /
réduire au silence / bannir) · `muteViewer` (durée) · `banViewer` · `liftSanction` ·
`setChatMode` · `setFilterSeverity` · `addBannedWord` · `removeBannedWord` · `setRetroactive` ·
`setSlowMode` · `setHoldersOnly`.

**Équipe et droits** — `inviteMember` · `changeMemberRoles` · `removeMember` ·
`assignCrewToDate` · `unassignCrewFromDate` · `grantDateAccess` · `revokeDateAccess` ·
`acceptInvitation` · `declineInvitation` · `transferOwnership` · `deleteChannel`.

**Billetterie et argent** — `issueComplimentary` · `refundSeat` · `authorizeTransfer` ·
`respondToChargeback` · `requestPayout` · `changeBankDetails` · `closeReconciliationPeriod` ·
`exportAccounting`.

**Boutique et rediffusion** — `upsertMerchItem` · `pinMerchDuringLive` · `connectMerchProvider`
(une seule intégration à la fois) · `reopenReplayWindow`.

**Divers** — `markInboxRead` · `exportJournal` · `exportSchedule`.

Toutes portent `Idempotency-Key`. Toutes produisent une entrée de journal nominative et horodatée.

### La machine à états d'une publication

**Le vocabulaire qui fait autorité est celui de `catalogue.json`** (D2) — `replay-online` dit ce
que `replay` ne dit pas : la rediffusion est **en vente**.

```
draft ──────► reserve ──────► scheduled ──────► technical ──────► live ──────► ended ──────► replay-online
  │                              ▲                   │
  └──────────────────────────────┘                   │
                                 ◄──────────────────-┘
```

| Depuis | Vers | Sens | Retour ? |
|---|---|---|---|
| `draft` | `reserve` | mettre en réserve | oui |
| `draft` | `scheduled` | publier | **non** |
| `reserve` | `scheduled` | ouvrir la vente | **non** |
| `scheduled` | `technical` | lancer les tests techniques | oui |
| `technical` | `scheduled` | arrêter les tests | — |
| `technical` | `live` | passer à l'antenne | — |
| `live` | `ended` | terminer la diffusion | — |
| `ended` | `replay-online` | activer la rediffusion | **non** |
| `replay-online` | — | terminal | — |

**Les deux passages sans retour** et leur motif, qui doit voyager avec le refus :
`draft|reserve → scheduled` — *la publication engage le tarif affiché* ;
`ended → replay-online` — *des spectateurs ont payé pour la rediffusion*.

**Ce que le contrat doit garantir, et non seulement proposer :**

1. **Le serveur refuse la transition inverse.** Ne pas l'offrir dans l'interface n'est pas une
   garantie : c'est une politesse. Le refus porte un **code** (`TRANSITION_IRREVERSIBLE`) et le
   paramètre qui nomme la promesse engagée, pour que le message soit traduit côté client.
2. **La transition est idempotente.** Elle engage un tarif public ou une vente : une double
   soumission ne doit pas produire deux effets. `Idempotency-Key` est obligatoire ici, pas
   recommandé.
3. **La transition est optimiste et versionnée.** Deux personnes peuvent être sur la fiche.
   Une commande partie de `technical` alors que l'état courant est `live` est refusée avec
   `STATE_CONFLICT` et l'état courant.
4. **Le droit de transition est servi avec l'état.** Seuls le propriétaire et la production
   déplacent une date ; une régie voit la fiche et ne la déplace pas. La liste des transitions
   offertes **pour cet opérateur** fait partie de la réponse — sinon chaque surface recalcule la
   table.
5. **La porte de publication est servie, pas recalculée.** La publication n'est possible que si
   sept éléments sont réunis : titre et discipline, affiche, description, au moins un tarif actif,
   jauge, tests techniques passés au moins une fois, régime de tchat. Le contrat sert la liste des
   manquants avec un identifiant par élément (pour l'i18n) — pas un pourcentage, que le client
   calcule.
6. **Le verrou porte sur la transition, pas sur l'état.** Les fixtures encodent
   `lockedTransitions: ['scheduled', 'replay-online']`, une liste d'**états**, et testent
   l'appartenance de l'état courant. La maquette encode des couples `from>to`. Ce sont deux
   sémantiques différentes ; c'est la seconde qui est juste, et c'est elle qui doit être portée.

### Les autres irréversibilités — elles ne sont pas dans la machine à états

- **La politique de rediffusion** se choisit **à la création**, parce que le tarif public en
  dépend. `off` (« aucune rediffusion ») est définitif pour cette date : impossible à activer
  ensuite. Les autres se verrouillent à l'ouverture de la billetterie.
- **La jauge** s'élargit **par paliers**, jamais ne se réduit après la mise en vente.
- **Au-delà de 10 000 places**, l'infrastructure est provisionnée à l'avance : un prévisionnel
  très au-dessus du réel entraîne un malus. Révisable jusqu'à **72 h** avant le direct, puis sur
  demande au support. → le contrat doit porter le seuil, la provision, l'échéance de révision et
  l'exposition au malus **comme des données**, pas comme des constantes recopiées dans cinq
  surfaces.
- **Ouvrir un palier de jauge prévient la liste d'attente dans le même geste**, avec une fenêtre de
  priorité avant l'ouverture publique. C'est **une** commande transactionnelle, pas deux : sinon
  la rareté se dissipe entre les deux appels.
- **Le changement de coordonnées bancaires exige une double validation** — propriétaire *et*
  trésorerie. Ce n'est donc pas une écriture : c'est une **demande en attente d'un second
  accord**, avec son propre cycle de vie et sa propre trace.
- **Le transfert de propriété** exige que le destinataire soit déjà membre et dispose de la double
  authentification. **La suppression d'une chaîne** est refusée tant qu'il reste des dates en
  vente ou des versements en attente. Ces deux préconditions sont des règles du domaine, pas des
  gardes d'interface : le refus doit être servi avec son motif.
- **Une période de rapprochement ne se clôt pas avec un écart non expliqué.**

### Les commandes de modération — un cas à part

La file de modération est **partagée entre plusieurs modérateurs en même temps**. La maquette
implémente déjà l'arbitrage :

- un item peut être **pris en charge** par quelqu'un (`claim`), et relâché ;
- si deux modérateurs tranchent, **le serveur fait foi** : la seconde décision est **refusée** et
  la ligne se referme sur la décision du premier, avec qui a tranché et quel verdict.

Le contrat doit donc porter : la prise en charge comme un **bail court** (sinon un modérateur qui
ferme son navigateur gèle la ligne), le verdict comme une commande **conditionnée à l'état
attendu**, et un refus qui **transporte la décision gagnante** — auteur et verdict — pour que
l'application affiche la vérité au lieu d'un échec.

Verdicts offerts sur un message : publier · supprimer · réduire au silence · bannir. Les deux
derniers **portent sur la personne**, pas sur le message : ils composent avec la sanction de
chaîne. Voir « Incohérences relevées » (D6).

Sanctions sur une personne : silence **sans limite**, 1 min, 10 min, 1 h, **ou une durée libre en
minutes**, et levée. → une sanction porte un **instant d'expiration** (nullable pour « sans
limite »), pas une étiquette.

Le dictionnaire de mots filtrés s'applique **rétroactivement** quand un mot est ajouté en direct,
et l'option est basculable. → ajouter un mot peut **reclasser des messages déjà publiés** : c'est
une commande qui produit des effets sur des objets existants, et le flux temps réel doit les
transporter.

---

## Le temps réel — la conduite du direct

### Ce qui doit être poussé, et à quelle cadence

| Ce qui circule | Cadence attendue | Pourquoi |
|---|---|---|
| **le retour vidéo de plateau** | **sous la seconde** | surveiller le plateau ; c'est le plan média (WHEP), pas le plan de contrôle |
| **état d'antenne** (`on-air` / `idle` / interrompu) | immédiat | il commande tout l'écran |
| **incident ouvert / résolu**, message d'écran d'attente | immédiat | le voile client des spectateurs en dépend |
| **débit, images perdues, latence, spectateurs** | **toutes les 1 à 2 s** | ce sont les trois chiffres sur lesquels on décide de baisser le profil |
| **pic de spectateurs et son heure** | même flux | dérivé de la série, servi avec elle |
| **messages de tchat** | immédiat, en flux | la file de modération en dépend |
| **file de modération** : entrée, prise en charge, verdict | immédiat | plusieurs modérateurs en parallèle |
| **présence de l'équipe en console** | quelques secondes | « couper » rappelle qui d'autre est en ligne |
| **chapitres posés** | immédiat | plusieurs personnes peuvent poser |
| ventes de places et d'articles pendant le direct | 10 à 30 s | information de conduite, pas de décision |
| compteurs de navigation (file, pré-vol, boîte) | 30 s, ou à l'événement | badges |
| recettes, versements, statistiques | à la demande | rien n'y est temps réel |

### Cinq exigences que la maquette impose au canal

1. **L'abonnement est par personne, sur un ensemble de chaînes — pas par page.** Un régisseur ou
   un modérateur indépendant peut être de garde sur **plusieurs directs simultanés** ; la maquette
   affiche un bandeau de tous les flux du soir, signale le chevauchement et annonce « une alerte
   sonore distincte par chaîne ». Un canal ouvert seulement sur la chaîne affichée manquerait
   l'incident de l'autre.
2. **Il faut distinguer « la salle n'envoie plus » de « mon poste a perdu le réseau ».** Ce sont
   deux écrans opposés : dans le premier on bascule l'écran d'attente, dans le second **il ne faut
   surtout rien couper** — la diffusion continue pour les spectateurs. L'application ne peut pas
   faire la différence seule : l'absence de message est identique dans les deux cas. Il faut donc
   une **battue de vie sur le canal lui-même**, distincte des mesures du flux, pour que le studio
   sache si c'est lui qui est sourd.
3. **Chaque message poussé doit être applicable comme un correctif idempotent** : identifiant
   stable de l'entité, nature du changement, et un numéro d'ordre par flux. Un « rafraîchis tout »
   à chaque tick est inexploitable sur une console qui tient une file en cours d'arbitrage.
4. **Le tchat est ancré sur le temps média, pas sur l'heure d'envoi** (`streaming.md`). Les
   chapitres posés en régie le sont aussi : ils sont repris dans la rediffusion. Un chapitre et un
   message doivent donc porter leur **position dans le média**, en plus de leur instant. C'est
   gratuit maintenant, irrattrapable ensuite.
5. **Kafka est le journal, Redis la diffusion.** Le studio lit la diffusion pour l'instant présent
   et le journal pour l'historique, la reprise et l'audit. Une console rouverte à 21 h 40 doit
   pouvoir **rejouer** ce qui s'est passé depuis 20 h 30 : le journal du direct, la file, les
   chapitres et les incidents sont des lectures durables, pas des restes de mémoire tampon.

### Ce que le canal doit porter sur l'état technique

- Le **protocole d'entrée** (`rtmps`, `srt`, `whip`) et les mesures **réellement disponibles pour
  ce protocole** — `streaming.md` est formel : masquer ce qui n'est pas mesuré plutôt qu'afficher
  zéro.
- La **voie de retour de régie effectivement ouverte** : WHEP sous la seconde sur entrée WHIP,
  LL-HLS à quelques secondes sur entrée RTMP. `streaming.md` refuse de créer une branche média
  pour uniformiser un schéma. Le studio doit donc **savoir** laquelle il a, et la latence annoncée
  à l'opérateur doit être la vraie.
- L'**échelle de qualités** servie aux spectateurs et sa répartition, avec la possibilité de
  désactiver une représentation.
- La **latence bout-en-bout** est une mesure **dédiée**, jamais un chiffre natif présenté comme
  tel. Si elle n'est pas mesurée, elle est absente.
- Les **incidents d'infrastructure** remontés comme incidents de domaine — `streaming.md` nomme
  `COMPATIBILITY_WORKER_FAILED`. La régie doit afficher une cause explicite, pas un lecteur qui ne
  démarre jamais.
- Le **délai de grâce à la mise hors ligne** : une coupure réseau de deux secondes en salle ne
  doit pas produire un incident en régie ni un manifeste HLS reparti de zéro. L'état poussé au
  studio est donc l'état **après** amortissement, et le studio doit pouvoir distinguer « accroc
  amorti » de « publieur parti ».

### L'écran d'attente

Ce n'est **pas** une bascule de flux : c'est un **état d'incident publié sur le plan de contrôle**,
que le lecteur affiche par-dessus une vidéo intacte. Le message écrit par la régie **voyage avec
l'état**, dans la langue de rédaction, et le catalogue en fournit des modèles par nature
d'incident (`hold-screen`, `postponed`, `cancelled`, `interrupted`). Conséquence de contrat :
le message est du **contenu** (langue de rédaction, traduction optionnelle), pas une clé i18n.

---

## Hors ligne et reprise

Le studio est un outil de régie : il est ouvert pendant deux heures d'affilée, sur un poste qui
peut perdre le réseau au pire moment. Trois besoins distincts.

### 1. Savoir qu'on est hors ligne, et le dire sans se tromper

Traité ci-dessus : sans battue de vie sur le canal de contrôle, l'application ne peut pas
distinguer sa propre surdité d'un silence de la salle, et l'opérateur coupe une diffusion saine.
C'est le seul point de ce chapitre qui soit **bloquant**.

### 2. Reprendre sans perdre ni rejouer à tort

À la reconnexion, le studio ne doit pas rejouer une mémoire tampon de métriques périmées. Il doit
**re-demander l'état** de ce qui a une durée de vie longue et **reprendre le flux** de ce qui n'en
a pas :

- **à re-demander** : état d'antenne, incident en cours, file de modération **avec ses prises en
  charge**, sanctions actives, chapitres posés, journal du direct depuis le lever de rideau ;
- **à reprendre depuis le dernier numéro d'ordre reçu** : le tchat et le journal, qui sont des
  flux ordonnés — donc le contrat doit porter un **point de reprise** par flux ;
- **à jeter** : toute mesure de flux antérieure à la reconnexion. Une courbe de débit se
  re-demande, elle ne se rejoue pas.

### 3. Deux classes de commandes, et elles ne se rattrapent pas de la même façon

| Classe | Exemples | Comportement attendu |
|---|---|---|
| **rejouable** | poser un chapitre, ajouter un mot au dictionnaire, écrire une note, enregistrer un brouillon | peut être émise en différé **avec son instant d'origine** — un chapitre posé à 21 h 06 reste à 21 h 06 |
| **périssable** | verdict de modération, couper le flux, transition d'état, décision d'issue | **ne doit jamais** être rejouée en aveugle. Elle repart avec l'état attendu, et le serveur refuse si le monde a changé |

Une file d'attente locale indifférenciée serait dangereuse : un bannissement appliqué trois
minutes plus tard, sur une file déjà arbitrée par un confrère, est un dégât, pas un rattrapage.

### 4. Le brouillon de création

Le `wizard` annonce « brouillon enregistré » avant tout aller-retour serveur. Il faut donc qu'une
date en chantier existe **avant** d'avoir un identifiant serveur, ou que l'application puisse en
proposer un. C'est le point (C5) sur la politique d'identifiants : si l'identifiant est généré par
le domaine plutôt que par défaut de base, le studio peut créer, enregistrer localement et
synchroniser sans réconciliation. Sinon il lui faut une clé de corrélation.

---

## Pagination et volumes

### La décision, et son domaine d'application

**Studio = page + total**, tri déterministe avec départage par identifiant. La maquette le
confirme deux fois : elle affiche « 1–8 SUR N » et énumère les numéros de page. Elle a donc besoin
du **nombre total** et du **nombre de pages**, pas seulement d'un « il y en a d'autres ».

**Mais cette décision ne s'applique pas à tout.** Deux flux sont chronologiques, en croissance
continue pendant un direct, et n'ont pas de « page 3 » qui veuille dire quelque chose :

- **le tchat en direct** — on lit la queue et on remonte ;
- **le journal du direct** et **le journal de la chaîne** — même forme, du plus récent au plus
  ancien, sur 24 mois de conservation.

Pour ces deux-là, il faut une **reprise par curseur descendant**. Compter les messages d'un direct
pour afficher un total est un coût inutile, et le total change entre l'appel et l'affichage.

### Volumes à prévoir, et où ils mordent

| Collection | Volume réaliste | Conséquence |
|---|---|---|
| dates d'une chaîne | dizaines à quelques centaines | page + total, avec filtres et tris serveur |
| annuaire des intervenants | milliers, indépendants compris | recherche **serveur** obligatoire |
| public d'une chaîne | des milliers de pseudos | recherche serveur : la maquette cherche déjà un spectateur **qui n'a pas écrit** |
| messages d'un direct | milliers par heure | curseur, jamais page + total |
| file de modération | dizaines à centaines simultanées | page + total, mais rafraîchie en flux |
| journal | 24 mois | curseur + filtre par nature + export |
| versements | une ligne par date vendue | page + total |
| articles de boutique | dizaines | non paginé |

### Tris et filtres à servir

- **Table des événements** : tri par date, titre, tarif, **état**, remplissage, recette —
  croissant et décroissant ; filtre **multi-états** ; recherche libre sur titre et méta.
  Le tri par état suit l'ordre de la machine à états : voir le rang explicite demandé plus haut.
- **Équipe** : recherche sur nom, courriel, note et rôle ; filtre par rôle avec **compteur par
  rôle** — donc une agrégation servie, pas comptée sur la page courante.
- **Modération** : filtre `tous` / `retenus` / `supprimés`, recherche sur pseudo et texte.
- **Journal** : filtre par nature (`air`, `mod`, `event`, `access`, `money`), et une période.
- **Statistiques** : périodes `7j`, `30j`, `90j`, `saison`, **et une plage personnalisée**.
  « Saison » est une notion métier : le contrat doit en porter les bornes, pas laisser cinq
  surfaces deviner quand commence une saison de spectacle vivant.

### Exports

`payouts` propose journal des ventes CSV, **grand livre FEC**, écritures Sage, écritures Cegid,
factures PDF groupées. `tickets`, `stats` et `journal` proposent les leurs, et `agenda` un export
de calendrier. Sur 24 mois, ce sont des **travaux asynchrones** : la commande crée un export, le
studio suit son avancement et récupère un lien. Un téléchargement synchrone n'est pas tenable, et
la décision « BullMQ interne à un service » dit déjà où ce travail vit.

---

## États d'erreur et de chargement

### Le démarrage

La maquette a un état d'amorçage explicite : tant que les données n'arrivent pas, la régie affiche
un écran d'attente **plutôt que des tables figées**, et retient l'erreur. Le contrat doit donc
offrir une **charge utile d'amorçage courte et rapide** — identité, chaînes accessibles, rôles et
droits effectifs par chaîne, compteurs de navigation — servie séparément du contenu de la page.
Sans cela la barre latérale attend la page la plus lente.

### Les trois refus à distinguer

Le studio doit pouvoir dire trois choses différentes, et l'enveloppe d'erreur unique
(code, paramètres, identifiant de trace) doit le permettre :

1. **« Vous ne gérez pas les accès de cette chaîne »** — droit manquant. Le geste est visible mais
   inerte, avec un motif qui nomme qui peut le faire. La maquette porte déjà ces phrases.
2. **« Cette ressource n'existe pas »** — introuvable.
3. **« Il n'y a rien »** — vide légitime, avec son propre message : « la fenêtre s'ouvre au salut »,
   « le tchat s'ouvrira au lever de rideau », « aucun litige en cours · toutes les places sont
   honorées ». Ce sont des états **positifs**, pas des échecs.

### Les erreurs propres au studio

| Situation | Ce que l'erreur doit porter |
|---|---|
| transition sans retour tentée | code, transition visée, promesse engagée |
| état périmé | code, **état courant**, version courante |
| verdict de modération doublé | code, **qui a tranché**, **quel verdict** |
| rôle non attribuable | code, rôles attribuables depuis ce niveau, à qui s'adresser |
| suppression de chaîne refusée | code, ce qui bloque (dates en vente, versements en attente) |
| clôture de période refusée | code, écart non expliqué |
| publication refusée | code + **liste d'identifiants** des éléments manquants |
| flux refusé à l'ingestion | code distinguant jeton, quota, propriétaire, expiration |

Tous en **codes et paramètres**, jamais en phrases : le studio est bilingue et charge
`studio`, `taxonomy`, `system` **et** `storefront` pour ses libellés partagés.

### Le chargement pendant un direct

Un direct ne se met pas en pause parce qu'une requête est lente. Deux exigences : les métriques
perdues ne se rattrapent pas (on affiche la dernière mesure avec son âge), et une commande de
régie ne doit jamais rester dans un état indéterminé — l'idempotence permet de la rejouer, encore
faut-il que la réponse dise si elle a pris effet.

---

## Contraintes propres au studio

Seulement celles qui contraignent le contrat.

- **Angular 22, sans zone.** La détection de changement est déclenchée par l'écriture d'un signal.
  Un message poussé qui arrive hors du cadre d'Angular ne rafraîchit rien s'il n'atterrit pas dans
  un signal. Conséquence de contrat, et elle est réelle : chaque message doit être **applicable
  comme un correctif ciblé** sur une entité identifiée, pour être écrit dans un magasin d'entités.
  Un flux qui dit « quelque chose a changé, recharge » condamne la console à tout recharger toutes
  les deux secondes, en plein arbitrage de file.
- **Multi-opérateurs sans verrou, assumé.** C'est un choix de conception explicite de la maquette.
  Il déplace l'arbitrage **sur le serveur** : versions, commandes conditionnelles, refus qui
  transportent la décision gagnante. Il n'y a pas de verrou d'édition à prévoir, il y a une
  concurrence optimiste à contractualiser.
- **Tout est nominatif et conservé 24 mois.** Le journal n'est pas un confort : c'est le produit
  d'une décision d'issue à plusieurs milliers d'euros. Chaque commande porte son acteur, et
  l'entrée de journal correspondante est une **lecture servie**, pas une reconstruction client.
- **Deux horloges, toujours.** Heure de l'opérateur et heure de la salle, avec le décalage de jour
  quand il existe. Cela impose l'identifiant IANA de la salle dans presque toutes les formes qui
  portent une date.
- **Bilingue par codes.** L'API renvoie des identifiants d'énumération et leurs paramètres. Deux
  exceptions légitimes, qui sont du **contenu** et non de l'interface : le message d'écran
  d'attente écrit par la régie, et les textes de la boîte. Ils portent leur langue de rédaction.
- **Un BFF par produit.** Le studio compose des vues qui traversent plusieurs contextes — une
  fiche de date mêle catalogue, billetterie, diffusion, modération et équipe. Cette composition
  appartient au BFF studio ; les appels synchrones ne vont que du BFF vers un service.
- **Rien n'est calculé deux fois.** Le taux de commission, le rang d'un état, les bornes d'une
  saison, la fenêtre de rediffusion restante, le montant d'un avoir, les droits effectifs : tout
  cela est du domaine. Le studio formate et affiche.

---

## Incohérences relevées

Au-delà de D2, D5 et D6 que l'errata nomme déjà, la lecture a fait apparaître ceci.

1. **`team` est une page morte.** Aucun des six personas ne l'ouvre : elle n'apparaît dans aucune
   ligne de la table d'accès, et une règle la retire une seconde fois quand `crew` est présent. Un
   raccourci de la fiche pointe pourtant vers elle. Soit la page rejoint `crew` pour de bon, soit
   un rôle doit l'ouvrir — à trancher avant d'écrire le contrat de navigation.

2. **Trois vocabulaires pour le régime de tchat.**
   `catalogue`/`helpers` : `open · emoji · read-only · off`.
   Console de régie : `free · emoji · read · off`.
   Page de modération : les mêmes quatre que la console.
   L'i18n ne résout que le premier jeu. C'est le même écart que D2, sur un autre enum.

3. **Deux vocabulaires pour la politique de rediffusion.**
   `helpers`/i18n : `included · none · subscription · unit`.
   Assistant de création : `included · sub · unit · off`.
   `helpers.stateOf` teste littéralement `policy !== 'none'` : une date créée avec `off` ne serait
   jamais reconnue comme sans rediffusion.

4. **Deux vocabulaires pour la sévérité du filtre, dans le même fichier.**
   Réglages de chaîne : `souple · normale · haute`. Page de modération : `basse · moyenne · haute`.
   Le texte d'aide n'est indexé que sur le premier. Aucun des deux n'est dans `shared/`.

5. **Deux listes de contrôle avant publication.** Les fixtures portent
   `checklist { technicalCheck, chaptersPlanned, moderationStaffed, replayPolicySet }`, quatre
   items. La fiche en affiche **sept**, dont trois absents des fixtures (affiche, description,
   jauge) et un absent de la fiche (chapitres prévus). Les deux répondent pourtant à la même
   question : « peut-on publier ? ». Une seule doit survivre au portage.

6. **Verrou d'état contre verrou de transition.** Les fixtures encodent une liste d'**états**
   verrouillés ; la maquette une liste de **couples** `from>to`. Le second est le bon, le premier
   est ce qu'une lecture rapide du domaine reprendrait.

7. **Quatre échelles de sanction, pas deux.** L'errata (D6) en nomme trois — message
   (`messageStates`), personne (`audience[].state`), et la réduction `ok/held` de
   `studio-data.js`. Il en existe une quatrième : `enums.moderationState` ajoute `reported` et
   renomme `ok` en `published`, soit `published · reported · removed · muted · banned`, et c'est
   **elle** que le journal de modération et les sanctions affichent. La file de la console, elle,
   affiche `messageState`. Deux écrans voisins lisent donc deux enums différents pour le même
   objet.

8. **Trois axes d'état sur une même date, sans hiérarchie écrite.** `publicationState` (sept
   valeurs), `runState` (`idle · rehearsal · on-air · interrupted · postponed · cancelled`) et
   `outcome` (`postponed · cancelled · interrupted`, nullable) coexistent, et l'agenda en dérive un
   quatrième repli à quatre valeurs. C'est `outcome` qui décide de l'état d'un versement (retenu,
   remboursé), et `runState` qui décide de l'antenne. Le contrat doit dire lequel fait autorité
   pour quoi, sinon chaque écran choisira.

9. **La TVA de la maquette contredit la TVA des fixtures.** Les fixtures appliquent un taux unique
   au brut ; l'écran des versements affiche une ventilation « par pays d'achat » en affirmant que
   le taux est celui de l'acheteur. C'est le même piège que D5, vu d'un autre angle : la fixture
   produit un nombre plausible, l'écran énonce une règle. Aucun des deux n'est instruit.

10. **Deux défauts de la maquette, sans portée contractuelle mais utiles au portage.** La méthode
    `identityOf` est définie deux fois dans la même classe — la première version, morte, appelle
    `A.subcategory(...)` qui n'existe pas et `A.genre(id)` avec un argument au lieu de deux (la
    taxonomie n'a pas de sous-catégorie : elle a discipline, genre, étiquette).

Aucune de ces incohérences n'a été appliquée : elles sont signalées, pas tranchées.

---

## Ce que je ne peux pas obtenir seul — questions au backend

### Rôles et droits

1. **Le contrat sert-il les droits effectifs, ou la matière brute ?** Ma position : **les deux, et
   la matière brute au vocabulaire à huit rôles.** Le repli à six perd le droit d'invitation de
   `director`. Confirmez-vous que le calcul des droits effectifs vit dans `@arthome/core`, servi
   par le BFF studio, et que le repli à six n'est qu'un libellé ?
2. **Le filtrage par rôle est-il une projection serveur ou un masquage client ?** Une régie doit-
   elle recevoir le brut de billetterie d'une date ? Ma position : non — `canRevenue` décide du
   **contenu** de la réponse, pas de son affichage. Cela implique des formes différentes pour le
   même écran selon le rôle : est-ce acceptable dans le contrat, ou faut-il une forme unique avec
   des champs optionnels ?
3. **Où vit l'accès ponctuel à une date ?** Un renfort indépendant affecté à une date, expirant au
   tomber du rideau, relève-t-il d'`identity`, de `catalog` ou d'un contexte `channels` propre ?
   C'est le point C9 resté ouvert, et le studio ne peut pas avancer sans.
4. **Une invitation acceptée traverse deux contextes.** Elle naît dans une chaîne, elle change des
   droits. Quel service la possède, et quel événement la publie ?

### Machine à états et publication

5. **Un seul jeu de noms** : celui de `catalogue.json` (D2), confirmé ? Et **le rang** de chaque
   état voyage-t-il avec lui, pour le tri par état ?
6. **`publication` est-elle une entité servie séparément de `date`, ou fusionnée ?** Les fixtures
   les séparent et la date pointe vers la publication. Le studio travaille sur la publication ; le
   storefront lit la date. Faut-il deux modèles de lecture distincts ?
7. **Quelle est la liste de contrôle qui fait foi avant publication ?** Quatre items ou sept ?
8. **Quel est le degré de garantie attendu sur les transitions sans retour ?** Refus serveur
   simple, ou refus + trace d'audit de la tentative ? Une tentative de faire marche arrière sur un
   tarif engagé est en soi une information.

### Argent

9. **Qui doit la TVA, sur quelle assiette, et qui en est redevable ?** (D5.) Les fixtures
   l'appliquent au brut de billetterie et la retranchent du net de l'artiste ; l'écran des
   versements affirme que le taux est celui du pays de l'acheteur. Ces deux affirmations ne sont
   pas compatibles. `adr-payments.md` doit trancher avant que le studio n'affiche un net.
10. **Multi-devise : honoré ou reporté ?** (D4.) Trois marchés sont déclarés, un seul est exercé.
    Si le studio doit afficher un versement transfrontalier, il lui faut savoir dans quelle devise
    le solde d'une chaîne est présenté, et ce qui arrive quand une chaîne vend dans deux devises.
11. **La double validation des coordonnées bancaires est-elle un état d'agrégat, ou un flux
    d'approbation à part ?** Elle demande deux acteurs et deux rôles distincts, elle a un délai, et
    elle doit être auditée.
12. **Quelles bornes pour la « saison » ?** Le sélecteur de période l'offre à côté de 7, 30 et 90
    jours. C'est une notion de domaine, et je refuse de la coder dans le studio.
13. **Les exports comptables — FEC, Sage, Cegid — sont-ils du ressort de `payouts` ?** Et le
    rapprochement qui bloque la clôture d'une période : quel service porte cet état ?

### Direct et temps réel

14. **Quel canal, et quelles garanties ?** Une diffusion aux clients connectés par l'adaptateur
    Socket.IO, avec un point de reprise par flux — est-ce bien la forme retenue ? Le studio a
    besoin d'un **numéro d'ordre** pour reprendre, et le tchat comme le journal sont des flux
    durables (Kafka), pas des restes de mémoire tampon (Redis).
15. **La battue de vie du canal de contrôle existe-t-elle ?** C'est la seule façon pour le studio
    de distinguer « la salle n'envoie plus » de « j'ai perdu le réseau », et c'est la différence
    entre basculer un écran d'attente et couper une diffusion saine. Je la considère bloquante.
16. **Quelles métriques sont réellement disponibles par protocole d'entrée, et à quelle cadence
    les remonter ?** `streaming.md` dit que le gigue et les paquets perdus n'ont pas de sens en
    RTMP, et qu'une métrique non mesurée doit être absente, jamais à zéro. Le contrat doit porter
    cette absence — comment ?
17. **La latence bout-en-bout est-elle mesurée côté serveur, ou côté client ?** Si c'est côté
    client, ce n'est pas un champ du contrat, et le studio doit le mesurer lui-même.
18. **La voie de retour de régie disponible pour un direct est-elle servie dans son état ?** WHEP
    sous la seconde ou LL-HLS à quelques secondes : le studio doit le savoir pour ne pas promettre
    à l'opérateur une latence qu'il n'a pas.
19. **Le message d'écran d'attente voyage-t-il avec l'état d'incident**, comme `streaming.md` le
    prescrit, et dans quelle forme — contenu avec sa langue de rédaction, ou modèle identifié ?

### Modération

20. **Comment se composent la sanction sur le message et la sanction sur la personne ?** (D6.) Et
    **une seule pastille s'affiche** : laquelle prime ? Question annexe mais décisive : la personne
    bannie d'une chaîne relève-t-elle de `chat` ou d'`identity` ?
21. **La prise en charge d'un item de file est-elle un bail avec expiration ?** Sans expiration,
    un modérateur qui ferme son navigateur gèle une ligne pendant tout le direct.
22. **Le refus d'un verdict doublé transporte-t-il la décision gagnante ?** La maquette l'exige :
    elle affiche « X a déjà supprimé ce message ». Un refus nu obligerait à un second aller-retour
    en plein direct.
23. **Ajouter un mot au dictionnaire en direct reclasse-t-il les messages déjà publiés ?**
    L'option « rétroactif » existe dans la maquette. Si oui, ces reclassements doivent arriver par
    le flux, et le journal doit les distinguer d'une décision humaine.
24. **La recherche dans le public d'une chaîne porte-t-elle sur tous les spectateurs présents**, y
    compris ceux qui n'ont jamais écrit ? La maquette le fait, et affiche « présent, n'a pas
    écrit ». Cela suppose une présence servie, et pas seulement les auteurs de messages.

### Capacité et infrastructure

25. **Le seuil de 10 000 places, la provision et le malus sont-ils des données de domaine ?** Et
    l'échéance de révision à 72 h ? Si ce sont des constantes, elles seront recopiées dans cinq
    surfaces, ce que le principe n°1 du dossier interdit.
26. **Ouvrir un palier de jauge et prévenir la liste d'attente : une seule commande ?** Avec la
    fenêtre de priorité comme paramètre de domaine ?

### Transverse

27. **Où sont générés les identifiants ?** (C5.) Le studio a besoin d'enregistrer un brouillon
    avant tout aller-retour. Un identifiant généré par le domaine le permet ; un défaut de base
    impose une clé de corrélation.
28. **Le catalogue de libellés dynamique** (C6) sert-il aussi le studio, ou seulement les surfaces
    de magasin ? Le studio charge quatre thèmes (`studio`, `taxonomy`, `system`, `storefront`) et
    le nombre de clés d'énumération y est élevé.
29. **Quelle est la granularité de la lecture d'une fiche de date ?** Un appel par volet, ou un
    appel avec une projection dictée par les droits ? De cette réponse dépend tout le découpage
    des lectures du studio.

---

# Confrontation

> Temps 3. Lu : `answers-to-surfaces.md`, `context-map.md`, `data-model.md`, `events.md`,
> `realtime.md`, `adr-payments.md`, `adr-stream-entitlement.md`, `transport.md`,
> `critical-rules.md`, `DECISIONS.md`, et `openapi/studio.yaml` en entier.
> Les renvois ci-dessous sont vérifiables ligne à ligne.

## La battue de vie existe

`realtime.md` §4 : `ws:pulse` toutes les 5 s sur les deux espaces de noms, et la discrimination est
celle que je demandais — **plus de pulse pendant 15 s = je suis sourd ; pulse sans échantillon de
santé depuis 30 s = la salle n'envoie plus**. Deux états, deux écrans, aucune inférence. Elle est
servie à l'amorçage (`StudioBootstrap.realtime.pulseIntervalSec`), elle porte `serverTime` comme
horloge de référence et `seq` comme point de reprise, et elle a un seuil d'exploitation nommé
(`ws_pulse_gap_seconds` p99 > 15 s, avec le bon commentaire : « les deux studios vont afficher *je
ne sais plus* à tort, ce qui est le pire résultat possible »).

S'y ajoute une réponse que je n'avais pas demandée et qui est meilleure que ma question : l'écran
d'attente automatique après 15 s de flux perdu est une **règle serveur**, portée comme valeur par
défaut de chaîne, et son déclenchement produit un incident au même titre qu'un déclenchement
manuel (`IncidentTrigger.AUTO`). C'est la bonne réponse au cas que je n'avais pas su poser : le
régisseur injoignable — ou le régisseur qui est précisément celui qui a perdu le réseau.

**Ce point est clos. Il n'y a rien à contester dessus.**

---

## Ce qui est satisfait

Bref, parce que c'est l'essentiel du document et que le contester serait malhonnête.

| Besoin | Où | Verdict |
|---|---|---|
| huit rôles, jamais six | préambule `studio.yaml`, `EffectiveRights.roles` | tenu, mot pour mot |
| `canRevenue` décide du **contenu** | préambule, `EventsRow.grossRevenue`, `RunConsole.grossRevenue`, salle `channel:{id}:revenue` | tenu, **et étendu au canal** — ce que je n'avais pas pensé à demander |
| tri sur un champ absent **refusé** | `SORT_KEY_FORBIDDEN` | ajouté par l'offre ; c'est la faille que ma formulation laissait |
| deux échelles d'accès séparées | `ChannelMembership` / `DateAccessGrant`, expiration **en instant** | tenu (mais voir H) |
| `order_rank` avec l'état | `Publication.orderRank` | tenu |
| verrou sur le couple `from > to` | `PublicationTransition` | tenu, incohérence 6 corrigée |
| refus avec la promesse engagée | `TRANSITION_IRREVERSIBLE` + `promiseCode` | tenu |
| tentative de marche arrière journalisée | `listChannelJournal`, description | tenu — j'avais posé la question, la réponse est oui |
| conditionnel + versionné | `expectedVersion` partout, `STATE_CONFLICT` | tenu |
| porte de publication servie en identifiants | `PublicationChecklistItem`, neuf ids, `blocking` | tenu, et mieux : sept bloquants + deux avertissements |
| bail de prise en charge | `claimExpiresAt` | tenu |
| refus du second verdict **avec le gagnant** | `MODERATION_ALREADY_SETTLED` + `settledBy` + `verdict` | tenu |
| reclassement rétroactif asynchrone, distinguable | `reprocessing`, `origin: retroactive_filter` | tenu |
| sanction = un **instant**, jamais une étiquette | `muteUntil`, `sanctionExpiresAt` | tenu |
| recherche du public y compris muets | `searchAudience`, `present` | tenu |
| métriques nullables, absence signifiante | `HealthSample`, `jitterMs`/`lostPackets` omis en RTMP, `measuredAt` à l'ingest | tenu, et le commentaire « un zéro se lit *parfait* » est le bon |
| voie de retour servie | `RunConsole.monitorPath` | tenu |
| « accroc amorti » ≠ « publieur parti » | `afterGracePeriod`, deux champs | tenu |
| écran d'attente = contenu, pas clé i18n | `LocalizedText` | tenu |
| chapitres en position média | `atMediaSec` | tenu |
| correctif idempotent, `seq` par flux | `realtime.md` §3.1 | tenu — et motivé par Angular sans zone, explicitement |
| canal **par personne**, multi-chaînes | `realtime.md` §3 | tenu |
| `resume:too_old` | `realtime.md` §5 | tenu ; c'est `studio-mobile` qui l'a obtenu, il me sert autant |
| seuil 10 000, provision, 72 h, malus | `DateSalesPane.technicalProvision` + `constants` | tenu, en **données** |
| palier + liste d'attente en une commande | `openCapacityTier` | tenu |
| bornes de saison servies | `constants.seasonBounds` | tenu |
| double signature bancaire = agrégat | `BankChangeRequest`, suspend le virement | tenu |
| TVA ventilée par marché, commission sur le HT | `PayoutLine.vat[]`, `grossHt`, `commissionRateBps` | **meilleur que ma demande** |
| un solde par devise | `balances[]` | tenu |
| exports asynchrones, adresse signée | `requestChannelExport` / `getChannelExport` | tenu |
| identifiants dans le domaine | UUIDv7, `createDateDraft` | tenu ; le brouillon du `wizard` tient |
| file et tchat au curseur | `listModerationQueue`, `listStudioChatMessages` | tenu (D-010) |
| `pendingCount` séparé de la page | `CursorPageInfo.pendingCount` | tenu — la pastille ne se compte pas sur la page chargée |

---

## Ce qui ne l'est pas

### A — Cinq entrées de navigation sont déclarables et **ne sont servies par aucune opération**

`EffectiveRights.navigation` a un vocabulaire fermé de quatorze valeurs
(`studio.yaml:3999`). Cinq d'entre elles n'apparaissent **nulle part ailleurs** dans le document
qu'à cet endroit :

| Entrée | Rôles qui l'ouvrent | Ce qui manque | Ce que ça coûte |
|---|---|---|---|
| `dashboard` | `artist`, `production`, `treasury` | tout : les six indicateurs et leurs séries, les rappels, le décompte de la prochaine date | **c'est la page d'atterrissage de trois personas sur six** |
| `stats` | `artist`, `production`, `treasury` | tout : remplissage par date, audience par date, provenance, et l'onglet « comparer les dates d'une série » | l'export `stats_csv` existe : on peut **exporter une statistique qu'on ne peut pas lire** |
| `stream` | `artist`, `production`, `director`/`video`/`sound` | la page : serveur d'ingest, débit montant mesuré, profil recommandé, liste de pré-vol, historique des tests | **une des cinq seules entrées d'une régie**, et la pastille `preflightBadge` n'a aucune source dans `StudioCounters` |
| `replays` | `artist`, `production`, régie | la liste : en ligne / archivées, vues, revenu, fenêtre restante | `reopenReplayWindow` permet de **rouvrir une fenêtre qu'on ne peut pas voir** |
| `tickets` (niveau chaîne) | `artist`, `production`, `treasury` | la page agrégée : répartition par tarif toutes dates, liste d'attente par date, contremarques par catégorie, **demandes en cours** (remboursement, transfert de place, litige bancaire) | les commandes existent (`refundSeat`, `issueComplimentary`), la collection qu'elles traitent n'existe pas |

Ce n'est pas un oubli de détail : c'est **un tiers de la navigation**. Le contrat autorise le BFF à
servir `dashboard` à un artiste, et l'application n'a rien à appeler. Deux corollaires précis :

- **`stream` est la seule page de travail d'un `director` avec `events` et `replays`.** Retirer
  deux des trois lui laisse un tableau d'événements.
- **`replays` est ouvert à la régie** et à personne d'autre côté technique : c'est là qu'on voit
  qu'une fenêtre ferme dans vingt-quatre heures, ce que `inboxPool` annonce déjà (`replay-expiring`).

Deux entrées de plus sont **à moitié servies** : `settings` a un `PATCH /channels/{id}/identity` et
**aucun GET** — l'écran n'a rien à lire avant d'écrire — et le bloc « diffusion par défaut, appliqué
aux nouvelles dates » n'a pas de porteur ; `store` a son catalogue mais pas le bloc « intégration
marchande, une seule à la fois ».

### B — Cinq des six volets de la fiche de date n'existent pas

`DateSheet.openPanes` a pour vocabulaire `[public, tickets, chat, tech, crew, replay]`. Une seule
opération de volet est écrite : `GET /v1/dates/{dateId}/panes/tickets`.

Le motif est pourtant énoncé deux fois, et c'est **mon argument qui y est cité** : *« un modérateur
doit pouvoir charger le volet `chat` sans charger la fiche entière, sinon la billetterie transite
pour rien »*. Le volet `chat` n'existe pas. Concrètement :

- un `moderation` ouvre une fiche, reçoit `openPanes: [chat]`, et **ne peut appeler aucun volet** ;
- un `coordination` reçoit `openPanes: [tech, crew]` — **aucun des deux n'existe** ;
- un `director` reçoit `openPanes: [tech]` — inexistant. La réponse 29 nomme pourtant les quatre
  propriétaires : `tickets → ticketing`, `chat → chat`, `tech → streaming`, `crew → identity`.

La règle est écrite, la mécanique est décrite, un seul des quatre chemins est posé.

### C — La présence de l'équipe est **poussée sans jamais être servie**

Trois documents la promettent et aucun ne la donne :

- `realtime.md` §8 : « présence de l'équipe | studio | ~10 s | **poussé** » ;
- `realtime.md` §3 : la salle `channel:{id}` porte « présence de l'équipe » ;
- `context-map.md` §10.1 : l'écran `regie` compte **trois** appels internes, dont
  `identity.GetChannelPresence`.

**Aucune opération du BFF ne l'expose**, `RunConsole` ne la porte pas, et la liste « à re-demander »
de `realtime.md` §5.1 ne la mentionne pas. Un différentiel sans instantané n'est pas un contrat :
une console ouverte à 21 h 40 affiche zéro personne en ligne et le restera jusqu'à ce que quelqu'un
arrive ou parte.

Ce n'est pas cosmétique. La confirmation de coupure est littéralement *« couper met fin à la
diffusion pour N spectateurs · **M autres personnes en ligne** »* — c'est le garde-fou du geste le
plus destructeur de la régie, dans un studio explicitement **sans verrou**, et il est vide.

### D — La courbe de santé « se re-demande » et n'est demandable nulle part

`realtime.md` §5.1, colonne « à jeter » : *« toute mesure de flux antérieure à la reconnexion. Une
courbe de débit **se re-demande**, elle ne se rejoue pas. »*

`/v1/dates/{dateId}/run/health-samples` est **POST seul** (`submitHealthSample`), et
`RunConsole.lastSample` est **un** échantillon. Il n'existe aucune lecture de la série.

Conséquence, sur trois chemins qui arrivent tous les soirs : après un `resume:too_old`, après une
reconnexion, ou simplement en ouvrant la console au milieu d'un direct, la courbe de débit et le
**pic de spectateurs avec son heure** sont inobtenables. Deux documents de la même offre se
contredisent, et c'est celui qui promet qui n'a pas d'opération.

### E — `displayState` est servi au storefront et **pas** au studio

`context-map.md` §5 (E4) : *« le contrat sert une quatrième valeur, dérivée et unique :
`displayState` … C'est la seule valeur que les cartes affichent, et **personne ne la recompose**. »*

Compte : **13 occurrences dans `storefront.yaml`, 0 dans `studio.yaml`.**

Or c'est le studio qui a trois axes à réconcilier, pas le storefront. Le tableau des événements,
l'agenda, les gardes et le tableau de bord affichent tous le composé — y compris les libellés
d'issue qui **remplacent** l'état (`ANNULÉE ET REMBOURSÉE`, `REPORTÉE · PLACES VALABLES`,
`INTERROMPUE · AVOIRS ÉMIS`). `EventsRow` sert `state` + `orderRank` + `outcome` et laisse le client
les composer.

C'est exactement la seconde implémentation que la règle critique n°2 interdit — et elle est laissée
à la surface où une erreur n'est pas une carte mal étiquetée mais une régie qui se trompe d'écran.

### F — L'événement pendant une transition : **sûr, et l'écran ment quand même**

C'est ma question, et la réponse est à moitié là.

**La moitié qui est là — la sûreté — est complète.** `expectedVersion` sur toute transition,
`STATE_CONFLICT` avec l'état **et** la version courants, `TRANSITION_IRREVERSIBLE` avec la promesse,
`acknowledgedPromiseCode` obligatoire sur un passage sans retour, `Idempotency-Key` obligatoire, et
la tentative journalisée. Rien ne se corrompt, jamais. Je n'ai aucune réserve là-dessus.

**La moitié qui manque — la fraîcheur — est entièrement absente, et quatre faits l'établissent :**

1. `events.md` §4.2 ne contient **aucun** `catalog.publication.state_changed.v1`. Il y a
   `date.drafted`, `date.scheduled` et `publication.engaged`. Donc `draft → reserve`,
   `scheduled → technical`, `technical → scheduled` et `ended → replay-online` **ne produisent aucun
   événement** ;
2. la salle `channel:{id}` porte « état d'antenne, incidents, présence de l'équipe, ventes,
   chapitres » — **pas l'état de publication** ;
3. ni `DateSheet` ni `EventsRow` ne portent de `validUntil` — la règle critique n°9 ne s'applique
   donc pas à eux ;
4. le `GET /changes?since=` de `realtime.md` §5.2 est écrit pour le **storefront mobile** et
   n'existe pas dans `studio.yaml`.

Le scénario, précisément. 18 h 04. A et B sont tous deux sur la fiche de « Nuit blanche »,
version 7, état `draft`. A publie : version 8, `scheduled`, tarifs engagés, **sans retour**.

> **L'écran de B continue d'afficher BROUILLON, avec ses deux transitions offertes — « Mettre en
> réserve » et « Publier » — indéfiniment.**

B clique « Publier », croyant franchir le premier une porte irréversible, et l'apprend par un
message d'erreur. Rien n'est cassé. Mais B vient de tenter d'engager un tarif public, la tentative
part au journal à son nom, et il découvre après coup qu'elle était déjà engagée. Et le tableau
`listChannelEvents` de B compte toujours cette date sous `BROUILLON` dans le filtre d'états, pour
tout le monde qui ne recharge pas.

**Ce que je demande est petit, et la machinerie existe déjà.** Un `catalog.publication.state_changed.v1`
(`from`, `to`, `version`, `actor`) routé vers `channel:{id}` comme un correctif ordinaire
`{ entity: "publication", id, op: "upsert", seq, patch }` — la forme est déjà spécifiée en
`realtime.md` §3.1, seule l'entité manque à la liste.

Avec **une précision** que l'offre rend nécessaire : `offeredTransitions` est « calculée pour cet
opérateur ». Un correctif qui porterait le nouvel état sans recalculer les transitions **pour le
destinataire** laisserait un bouton périmé — le même défaut, déplacé d'un cran. Le correctif doit
donc soit porter les transitions du destinataire, soit être un marqueur « relis cette entité » pour
cette entité-là seulement.

### G — Les motifs de modération sont une **table parallèle** — celle que le contrat reproche aux maquettes

| `shared/catalogue.json` `moderationReasons` (authored, et le seul que l'i18n résout) | `studio.yaml`, `settleModerationItem` et `sanctionAudienceMember` |
|---|---|
| `spam` | `spam` |
| `insult` | — |
| `spoiler` | — |
| `off-topic` | `off_topic` |
| `harassment` | `harassment` |
| — | `hate` |
| — | `filter` |

Deux motifs authorés disparaissent, deux inventés apparaissent. **`spoiler` — « Divulgue le
spectacle » — est le seul motif propre au spectacle vivant**, il est traduit dans
`shared/i18n/studio.json` (`enums.moderationReason.spoiler`), et il n'a plus d'émetteur. `insult`
est employé par les fixtures.

Et `filter` n'est pas un motif : c'est une **origine**. Le contrat porte déjà l'origine ailleurs et
correctement (`origin: human_verdict | retroactive_filter`) ; la mettre aussi dans `reason` donne
deux axes à un champ — précisément le reproche que l'offre adresse à `reported` dans les sanctions
et à `postponed` dans `run.state`.

La règle critique n°10 (« une valeur d'énumération inconnue est conservée brute et traitée comme
neutre ») ne sauve rien ici : le problème n'est pas qu'on reçoive `spoiler` sans le comprendre,
c'est que **plus personne ne pourra l'émettre**.

Le préambule de `studio.yaml` dit : *« les tables parallèles des deux maquettes de studio ne sont
jamais reprises »*. Ici c'est le contrat qui tient une table parallèle contre `shared/`, sur le seul
enum dont `shared/` fait autorité sans ambiguïté — il n'avait aucun concurrent.

### H — `crew` n'a aucune lecture d'affectation, et les deux échelles d'accès sont reconfondues à l'écriture

Trois défauts qui se cumulent sur la même page, celle du persona `coordination` — dont la
navigation entière est `crew · journal · help`.

1. **`/v1/dates/{dateId}/crew` est POST seul.** Aucun GET. L'onglet **matrice** (dates × postes,
   « postes couverts », « manque RÉGIE et MODÉRATION ») et la liste « CE SOIR — pré-vol à passer sur
   chaque flux » n'ont aucun chemin de lecture. `listDuties` donne **mes** gardes ;
   `EffectiveRights.dateGrants` donne **mes** accès. Ni l'un ni l'autre ne donne la couverture de la
   chaîne. Sans elle, `coordination` a une page sur trois qui fonctionne.
2. **Aucune liste des accès ponctuels d'une chaîne.** `revokeDateAccess` révoque par `grantId` —
   un identifiant qu'aucune lecture ne donne. L'onglet « accès ponctuels » n'a pas de source.
3. **`expiresAt` est requis sur `grantDateAccess`.** Le préambule dit que les deux échelles ne
   doivent jamais être confondues ; l'unique endpoint d'écriture impose l'échelle **ponctuelle** aux
   deux. Affecter un membre permanent de la chaîne au poste `sound` d'une date exige donc d'inventer
   un instant d'expiration pour quelqu'un qui ne part pas.

Et ce n'est pas isolé : `moderator_assigned` est l'un des neuf éléments de la liste de contrôle,
`datesToCover` est un compteur servi. **Les deux se calculent sur une couverture que le studio ne
peut jamais lire.**

### I — Un modérateur hors antenne n'a aucune surface d'écriture

`filterSeverity`, `slowModeSec`, `holdersOnly` et `retroactiveFilter` vivent tous les quatre sur
`PUT /v1/dates/{dateId}/chat-policy` — **par date**, avec l'`expectedVersion` d'une date.

Hors antenne, il n'y a pas de date à désigner. Et la maquette dit exactement le contraire, en toutes
lettres : *« le dictionnaire, la sévérité et les sanctions restent modifiables hors antenne — ils
s'appliqueront au prochain direct »*. Le dictionnaire est correctement au niveau chaîne
(`/v1/channels/{id}/moderation/banned-words`) ; la sévérité, le mode lent et la réserve aux
détenteurs ne le sont pas.

Il manque un régime de tchat **par défaut de chaîne**, et la règle d'héritage qui dit ce qu'une
nouvelle date en reprend. C'est aussi le porteur naturel du bloc « diffusion par défaut » de
`settings`, qui n'en a pas.

### J — `agenda` et `inbox` sont des écrans de **personne**, rangés dans un tableau de **chaîne**

`EffectiveRights.navigation` est par chaîne. Mais `agenda` est servi par `GET /v1/me/duties`, qui
est **par personne** et explicitement « toutes chaînes confondues » ; `inbox` par `GET /v1/inbox`,
de même — et la description dit « ouverte à tout le monde, quel que soit le rôle ».

Une personne sur trois chaînes reçoit donc la même entrée trois fois — ou zéro fois. **C'est zéro
dans l'exemple du contrat lui-même** (`studio.yaml:2445`) :

```
roles: [video]
navigation: [events, stream, replays, help]
```

`agenda` est absent, alors que la table des six personas donne à `regie` exactement
`agenda · events · stream · replays · help`. Pour un `moderation`, la même omission laisse
`moderation · help`. **La page d'atterrissage des deux personas de terrain est soit dupliquée, soit
perdue, selon la lecture — et rien ne dit laquelle.** Le compteur `dutiesTonight` est pourtant
servi, ce qui suppose que les gardes comptent.

Le correctif est petit : une `navigation` au niveau personne à côté de celle au niveau chaîne.

---

## Combien d'allers-retours

Le compte est bon dans l'ensemble, et je le dis avant de critiquer : l'amorçage en **un** appel, qui
porte l'identité, toutes les chaînes avec leurs droits effectifs, les constantes de domaine, le
catalogue de libellés et les compteurs, est exactement ce qu'il fallait. Rien n'est peint avant lui,
et il est petit. Trois réserves.

**1. La fiche de date : 1 + 1 par volet ouvert, soit sept appels pour un artiste.** J'ai demandé le
service par volet et je le maintiens — un `moderation` fait 2 appels au lieu de 7, et la
billetterie ne transite jamais pour rien. Mais le cas fréquent est l'artiste, et c'est le pire :
sept allers-retours pour un écran, contre les « 1 à 3 par écran » que `context-map.md` §10.1 annonce
pour le studio. Ce que j'accepterais sans rien perdre : `GET /dates/{id}/sheet?panes=public,tickets`,
composé au BFF pour **les volets demandés seulement**. Le nombre suit alors le rôle au lieu de
suivre le maximum, et la garantie « un volet fermé n'est jamais chargé » est intacte.

**2. La régie : quatre appels avant de peindre, sur l'écran où le temps compte le plus.**
`context-map.md` compte trois appels **internes** ; depuis l'application c'est
`GET /run` + `GET /moderation/queue` + `GET /chat/messages` + la présence (qui n'existe pas).
`RunConsole` agrège déjà le protocole, l'échelle de qualités, l'incident, les chapitres et le débit
de tchat : y ajouter la présence et les N derniers échantillons de santé — qui manquent tous les
deux, voir C et D — ramènerait la console à **deux**.

**3. Le studio n'a pas de `/changes`.** Le storefront reçoit une liste d'invalidations en un appel
au retour au premier plan. Le studio, qui est l'application qu'on laisse ouverte deux heures pendant
qu'une autre personne modifie les mêmes objets, n'a rien. C'est le même besoin, sur la surface où
il est le plus aigu.

---

## Ce qui est satisfait autrement, et si ça me va

**`live` et `ended` retirés de la commande de transition — meilleur que ce que je demandais, et je
l'adopte.** *« La publication ne commande pas l'antenne, elle l'apprend »* : seul `streaming` sait
si le flux entre, et `Publication` reste l'agrégat d'un seul contexte. Une conséquence à écrire
quelque part, parce qu'elle n'est nulle part : la fiche de date offre « Passer à l'antenne » et
« Terminer la diffusion » comme des boutons, et ils vont désormais à `PUT /run/state`, pas à
`/publication/transitions`. `offeredTransitions` ne les contiendra **jamais**. La fiche doit le
savoir, sinon deux boutons disparaissent sans que personne comprenne pourquoi.

**Le journal reste en page + total avec période obligatoire — j'avais tort, l'argument est
meilleur que le mien.** Le filtre de période est la vraie affordance ; le curseur m'aurait coûté les
numéros de page que je réclamais par ailleurs. Rien à ajouter.

**`run.state` perd `postponed` et `cancelled`** — juste, et la phrase est la bonne : une régie n'a
pas d'état « annulée », elle a un plateau qui n'envoie rien.

**La sévérité de filtre en `low | medium | high`** est un cinquième vocabulaire par rapport aux deux
que j'avais relevés — mais il est unique, canonique et anglais, et les miens étaient locaux à la
maquette. Accepté sans réserve.

**`team` a disparu du vocabulaire de navigation.** C'est la bonne décision et elle va dans le sens
de mon incohérence n°1. Mais elle n'est écrite nulle part : ni dans `answers-to-surfaces.md`, ni
dans `DECISIONS.md`. `studio-mobile` peut encore porter un écran `team`. **Une ligne suffirait.**

**La TVA, les versements et la devise** sont plus rigoureux que ma demande :
`grossTtc → vat[] par marché → grossHt → commission sur le HT → net`, un solde par devise, jamais
agrégé, et l'avertissement en tête de l'ADR. Je n'ai rien à ajouter, sauf ceci : `PayoutLine` porte
la ventilation, mais l'écran porte aussi un **rapprochement** (« places encaissées », « rapproché
avec le relevé », « écart à expliquer ») et un bloc **litiges**.
`closeReconciliationPeriod` est un POST sans GET, et rien ne liste les litiges : on clôt une période
dont on ne peut pas lire l'écart, alors que l'offre elle-même dit qu'un écart non expliqué bloque la
clôture.

---

## Les questions sans réponse

1. **`catalog.publication.state_changed.v1` : existera-t-il, et atteindra-t-il `channel:{id}` ?**
   Et son correctif porte-t-il `offeredTransitions` recalculées **pour le destinataire** ?
2. **Quelle lecture pour la série de santé**, et sur quelle fenêtre ? `realtime.md` §5.1 dit qu'elle
   « se re-demande » ; aucune opération ne la sert.
3. **Quelle opération expose `identity.GetChannelPresence` ?** `context-map.md` §10.1 la compte,
   `studio.yaml` ne la publie pas.
4. **Cinq entrées de navigation, cinq opérations manquantes** — `dashboard`, `stats`, `stream`,
   `replays`, `tickets` au niveau chaîne. Sont-elles à écrire, ou à **retirer du vocabulaire**
   jusqu'à ce qu'elles existent ? Servir une entrée qu'aucun appel ne suit est pire que ne pas la
   servir.
5. **Les cinq volets manquants** — `public`, `chat`, `tech`, `crew`, `replay`.
6. **`displayState` pour le studio : servi, ou le studio est-il autorisé à le recomposer ?**
   La règle critique n°2 dit non.
7. **`moderationReason` : `spoiler` et `insult` reviennent-ils, et `filter` quitte-t-il `reason`
   pour `origin` ?**
8. **Un régime de tchat par défaut au niveau chaîne**, et la règle d'héritage d'une nouvelle date.
9. **Une lecture de la couverture d'équipe par date**, une liste des accès ponctuels d'une chaîne,
   et `expiresAt` peut-il être nul pour un membre permanent affecté à un poste ?
10. **Une `navigation` au niveau personne** pour `agenda` et `inbox` — ou la règle qui dit comment
    les lire dans un tableau par chaîne.
11. **Le contrat WebSocket sera-t-il lisible par une machine ?** zod valide tout, l'OpenAPI est
    généré, et la surface au budget de latence le plus serré n'a que de la prose. Une AsyncAPI, ou
    des messages Protobuf, éviteraient que cinq surfaces retapent `{ entity, id, op, seq, patch }`
    à la main.
12. **Une lecture du rapprochement et des litiges**, sans laquelle `closeReconciliationPeriod` clôt
    à l'aveugle.
13. **`GET /changes?since=` est-il ouvert au BFF studio ?**
14. **Un GET des réglages de chaîne**, et le porteur du bloc « diffusion par défaut ».
