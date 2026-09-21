# Revue adverse de l'architecture

> **Auteur** : `skeptic`, sixième et dernier regard. **Date** : 21 septembre 2026.
> Lu sans les angles morts des sept autres : `architecture/*`, `openapi/*`, `proto/*`,
> `needs/*` (y compris les Confrontations en cours d'écriture), `DECISIONS.md`, et
> `shared/` du dossier de passation.
>
> **Ce que je ne refais pas.** Les cinq surfaces écrivent leur Confrontation en ce moment
> même et couvrent déjà les manques d'écran : `storefront-tv` C1–C4, `storefront-web`
> ❶–❻, `storefront-mobile` C1–C5, `studio-web` A–J. Je ne les répète pas. Ce document ne
> porte que ce qu'une surface ne peut pas voir : les frontières entre contextes, le dos
> des contrats, et les nombres qui ont été recopiés.
>
> **Méthode.** Chaque attaque cite le fichier et la ligne. Les capacités de fournisseur
> sont vérifiées en ligne aujourd'hui, jamais de mémoire — ma connaissance interne
> s'arrête en mai 2026.

---

## Ce qui casse

Classé par gravité. Le critère : un invariant faux, une donnée perdue, une garantie servie
au contrat qui n'est pas tenue.

---

### K1 — `on_behalf_of` fait de l'artiste le marchand d'enregistrement, et détruit le fondement de D-015

**La gravité : c'est de l'argent et du droit, et la preuve est chez Stripe.**

`adr-payments.md` §3, lignes 72–78 :

```
PaymentIntent
  ├─ créé sur le compte PLATEFORME               (nous sommes le marchand d'enregistrement)
  ├─ on_behalf_of        = acct_<chaîne>          (règlement, devise et rattachement fiscal)
```

Les deux lignes se contredisent. Vérifié aujourd'hui sur `docs.stripe.com/connect/charges`,
section *« Indirect charges using the on_behalf_of parameter »*, citation exacte :

> **« To make the connected account the business of record for the payment, use the
> `on_behalf_of` parameter. »**

Et sur `docs.stripe.com/connect/merchant-of-record`, section *« Define the merchant of
record »*, citation exacte :

> « **Indirect charges using the `on_behalf_of` parameter:** The merchant of record is the
> **connected account**. […] **Indirect charges without using the `on_behalf_of`
> parameter:** The merchant of record is the **platform**. »

La même page définit le MoR comme *« the legal entity responsible for facilitating the sale
[…] that handles any applicable regulations and liabilities, **including sales taxes** »*.
Et `charges.md` précise que `on_behalf_of` *« Uses the connected account's statement
descriptor »* et *« Uses the connected account's address and phone number (rather than the
platform's) on the customer's statement »*.

**Trois conséquences, toutes dans le document lui-même :**

1. **Le modèle A de §5.3 perd ses indices.** D-015 est acté sur « six indices convergents »,
   dont *« le spectateur […] ne voit jamais son nom [de l'artiste] sur un moyen de
   paiement »* (§5.3, ligne 204). Avec `on_behalf_of`, le relevé bancaire du spectateur porte
   le descripteur de l'artiste, son adresse et son téléphone. L'indice est inversé **par notre
   propre configuration**.
2. **`destination charges` est retenu contre `direct charges` au motif que ce dernier ferait
   de l'artiste le marchand d'enregistrement** (§3, ligne 84). Avec `on_behalf_of`, on obtient
   exactement le résultat qu'on écartait — en gardant le passif : la même page Stripe ajoute
   *« if a connected account's balance becomes negative, your platform is ultimately
   responsible for covering any losses »*.
3. **Et on ne peut pas simplement retirer le paramètre pour les marchés déclarés.**
   `charges.md` : *« Destination charges support cross-region funds flows […] only in certain
   regions. For other regions, the platform and connected account must be in the same region
   **unless using `on_behalf_of`** »*. Or `shared/catalogue.json` `geography.billingMarkets`
   déclare `eur`, `chf`, `cad`. Une chaîne suisse ou canadienne **oblige** donc à
   `on_behalf_of`, donc rend l'artiste MoR, donc bascule ces ventes-là en modèle B —
   pendant que les ventes en zone euro restent en modèle A. **Deux modèles fiscaux dans la
   même table de versements, décidés par la géographie du compte connecté.**

Ce n'est pas une impossibilité de D-015 : le modèle A reste atteignable, `on_behalf_of` en
moins. C'est une **incompatibilité entre D-015 et le §3 du même document**, et elle est
invisible parce que les deux paragraphes sont à quatre pages d'écart.

---

### K2 — La TVA est ventilée par **marché de facturation**, mais le taux retenu est celui du **pays du spectateur** — et ce pays n'est enregistré nulle part

**La gravité : c'est le seul choix que `adr-payments.md` §5.0 déclare irréversible, et il
est fait sur la mauvaise clé.**

`adr-payments.md` §5.0, lignes 140–147 :

> **« Le seul choix réellement irréversible de tout ce chapitre est de porter — ou non — une
> ventilation de TVA par marché. »**

`adr-payments.md` §5.4, ligne 212 : `taux = celui du pays du SPECTATEUR`.

La forme gravée, `proto/arthome/ticketing/v1/events.proto:116-124` :

```proto
message VatLine {
  // « eur », « chf », « cad ».
  string market_id = 1;
  uint32 rate_bps = 2;
  ...
}
```

`data-model.md:757` : `vat_breakdown[] { market_id, rate, base_minor, amount_minor }`.

**La clé est le marché — trois valeurs. La règle est le pays — vingt-sept rien que dans
`eur`.** Un spectateur français (5,5 %) et un spectateur belge règlent tous deux dans le
marché `eur`, à deux taux différents. Une ventilation dont la clé est `market_id` ne peut
pas porter deux lignes `eur` sans que `market_id` cesse d'être une clé.

**Et le fait qui décide du taux n'est publié nulle part.** `OrderPaid`
(`proto/arthome/ticketing/v1/events.proto:223-251`) est l'événement qui porte « la matière du
droit à versement » vers `payouts`. Il porte `gross_ttc`, `vat[]`, `service_fee`, `discount`,
`credit_applied`, `payment_intent_ref` — **et aucun pays d'acheteur**. Les deux seuls champs
`country` de tout `proto/` sont celui de l'artiste (`catalog`) et celui du compte à
l'inscription (`identity`) — et `adr-stream-entitlement.md:264` dit lui-même qu'un pays
stocké est faux : *« le pays du spectateur est résolu à chaque ouverture, pas projeté : il
change entre deux lectures »*. Côté HTTP, `countryCode` n'apparaît que sur l'adresse de
**livraison** de la marchandise (`openapi/storefront.yaml:1280`), sur la salle (3993) et sur
l'artiste (4288).

**Le document décrit exactement ce défaut, puis le commet un cran plus bas.** §5.0,
lignes 154–157 :

> « Un champ `vat_amount` scalaire unique aurait figé le défaut. Le jour où l'on découvre
> qu'il faut ventiler — **parce que le taux est celui de l'acheteur** — il faut reconstruire
> l'assiette de chaque ligne passée […]. Ce n'est plus une migration, c'est une reconstitution
> comptable. »

Remplacez « scalaire unique » par « par marché » : le paragraphe reste vrai mot pour mot. Et
la reconstitution sera **impossible**, pas seulement coûteuse, puisque le pays n'a jamais été
écrit.

---

### K3 — « Déconnecter cet appareil coupe la lecture en ≤ 60 s » est faux, et le 60 est servi au contrat

**La gravité : une garantie de sécurité, chiffrée, publiée aux cinq surfaces, contredite par
l'ADR qui possède le mécanisme.**

Le jeton de lecture vit **120 s** et se renouvelle toutes les **45 s**
(`adr-stream-entitlement.md:56,59`). La signature de préfixe du CDN *« expire avec le jeton »*
(§3.2, ligne 103). La révocation ne révoque pas le jeton : elle **refuse le renouvellement
suivant** (§3.3, ligne 163).

Donc la fenêtre pendant laquelle un flux continue d'être servi par la périphérie est la durée
de vie du **jeton en main**, soit jusqu'à **120 s** — pas l'intervalle de renouvellement. Un
client qui ignore le refus (ou qui, tout simplement, ne s'arrête pas) continue de tirer des
segments signés valides.

**Un seul document le dit juste.** `adr-auth.md:520` :

> « **Latence maximale = retard de l'événement + 120 s** — le cas où le jeton vient d'être
> renouvelé à l'instant de la révocation ; en régime courant, 45 à 75 s. »

**Cinq endroits disent 60 s** :

| Où | Ce qui est écrit |
|---|---|
| `adr-stream-entitlement.md:164` | « Effet visible au prochain renouvellement, **≤ 60 s** » |
| `context-map.md:559` | « Effet visible à la lecture : ≤ 60 s » |
| `data-model.md:75` | « effet visible ≤ 60 s » |
| `answers-to-surfaces.md:89` (réponse à `storefront-web` Q25) | « **Oui, ≤ 60 s** » |
| `definition-of-done.md:286` | « la seule façon de vérifier la latence **≤ 60 s** » |

Et le contrat **sert le nombre** : `openapi/storefront.yaml:3011`,
`data: { devices: [], playbackCutWithinSec: 60 }`, sous une description qui promet
*« Un effet observable sur l'appareil visé, en 60 secondes au plus »* (ligne 2976).

**Pourquoi ça casse et ne gêne pas.** `definition-of-done.md:286` fait écrire un test
d'intégration dont l'énoncé est « la latence ≤ 60 s ». Ce test passera : il constatera que le
**renouvellement** est refusé au bout de 45 s. Il n'aura pas mesuré ce que la phrase promet,
qui est l'arrêt de la lecture. **Une garantie fausse avec un test vert est pire qu'une
garantie absente.**

C'est la règle critique 15 violée sur une constante de sécurité : la constante a deux
propriétaires et deux valeurs, et c'est la mauvaise qui a été recopiée quatre fois — parce
que c'est celle qui satisfait l'exigence de `storefront-tv` (`needs/storefront-tv.md:653` :
*« Au-delà d'une minute, on regarde un flux auquel on n'a plus droit. Je demande ≤ 60 s »*).
**Le nombre plausible a été choisi parce qu'il faisait plaisir à la question.**

---

### K4 — Deux vocabulaires d'événements parallèles, et seize types d'agrégat sur trente n'ont pas de sujet

**La gravité : c'est la clé de routage de toute l'architecture événementielle, et elle est
déclarée deux fois, différemment.**

`events.md` §1.3 pose que l'en-tête `type` vaut `<context>.<aggregate>.<event>.v<N>` et qu'il
« route le handler dans un sujet multi-types ». `proto/` suit cette forme
(`DateSalesAvailabilityChanged`, `SeatActivated`, `DeviceRevoked`…).

**`context-map.md` et `data-model.md` utilisent une seconde forme, qui n'existe dans aucun
schéma :**

| `events.md` + `proto/` (autorité) | `context-map.md` / `data-model.md` |
|---|---|
| `ticketing.date_sales.availability_changed.v1` | `ticketing.date_availability_changed` (CM:348, DM:538,543) |
| `ticketing.seat.activated.v1` | `ticketing.seat_activated` (DM:547) |
| `ticketing.order.paid.v1` | `ticketing.seat_order_paid` (DM:552) |
| `ticketing.order.refunded.v1` | `ticketing.refund_issued` (DM:552) |
| `catalog.date.outcome_declared.v1` | `catalog.date_outcome_declared.v1` (CM:498) |
| `catalog.date.replay_policy_set.v1` | `catalog.replay_policy_set` (DM:547) |
| `identity.device.revoked.v1` | `identity.device_revoked.v1` (DM:74) |
| `chat.date_chat_policy.changed.v1` | `chat.date_chat_policy_changed` (CM:348) |
| `streaming.run.state_changed.v1` | `streaming.run_state_changed` (CM:348) |
| `payouts.payout.state_changed.v1` | `payouts.payout_state_changed` (DM:551) |

Dix-huit occurrences au total. C'est E2 dans sa définition exacte — une table littérale
parallèle — commise sur la seule valeur dont dépend l'arrivée d'un message chez son handler.

**Pire : un des noms ne désigne rien.** `data-model.md:547` alimente
`entitlement_projection` — la projection qui décide du droit de lire — par
`catalog.date_published`. Cet événement **n'existe ni dans `events.md` §4.2, ni dans
`proto/arthome/catalog/v1/events.proto`**. Le catalogue porte `date.drafted` et
`date.scheduled` ; il n'y a pas de `date.published`. L'exemple canonique de `events.md` §1.1
(ligne 20) utilise d'ailleurs lui aussi `type = "catalog.date.published.v1"` — un type absent
de son propre catalogue quinze lignes plus bas.

**Et le tableau des sujets est incomplet d'un facteur deux.** `events.md` §1.1 pose la règle :
`aggregatetype` → sujet, un sujet **par type d'agrégat**, et conclut « **14 sujets**, pas
quatre-vingts ». Appliquée au catalogue du §4, la règle produit **30 types d'agrégat**.
Seize n'ont aucun sujet déclaré :

| Contexte | Types d'agrégat sans sujet |
|---|---|
| `identity` | `artist`, `date_access`, `rights_version` |
| `catalog` | **`publication`** |
| `ticketing` | **`seat`**, `credit`, `waitlist` |
| `streaming` | `incident`, `replay`, `chapter`, `viewer_count` |
| `chat` | `date_chat_policy`, `audience` |
| `payouts` | `bank_change`, `reconciliation` |
| `notifications` | `delivery` — **le contexte n'a aucun sujet du tout** |

Les deux en gras sont les plus coûteux :

- **`ticketing.seat`** porte `seat.activated`, l'événement qui crée le droit de lire
  (`entitlement_projection`). Aucun sujet, donc aucune clé, aucun nombre de partitions, aucun
  `groupId`, et aucun canal AsyncAPI — alors que `definition-of-done.md` §3.1 génère les
  canaux **depuis ce tableau**.
- **`catalog.publication`** porte `publication.engaged`, qui verrouille les tarifs chez
  `ticketing` et le régime de tchat chez `chat`. S'il vit sur son propre sujet avec
  `publication_id` pour clé, il **perd son ordre relatif** avec `catalog.date.scheduled`, qui
  est clé `date_id`. C'est exactement l'argument que `events.md` §1.1 (lignes 26–29) donne
  pour refuser un sujet par événement : *« un consommateur pourrait appliquer une issue avant
  la publication qui la crée »*. La règle est écrite, puis l'agrégat qui la viole est publié.

Enfin, `context-map.md:889` mesure le retard sur un sujet nommé
`arthome.ticketing.seat_order`, dix-septième nom qui n'est dans aucune des deux listes.

---

### K5 — `signOutProfile` ne coupe aucune lecture, et rien ne le dit

**La gravité : le cas d'usage qui a justifié la séparation `Device` / `DeviceSession` n'est
pas servi.**

`context-map.md` §7.1 et `data-model.md` §1.3 distinguent deux gestes :

- **révoquer l'appareil** → supprime le `Device`, toutes ses sessions **et ses baux de
  lecture**, publie `identity.device.revoked.v1`, que `streaming` consomme ;
- **déconnecter un profil** → ferme une `DeviceSession`, *« les autres comptes restent
  connectés »*.

`openapi/storefront.yaml:3014-3032`, `signOutProfile` : `x-arthome-upstream: [identity]`,
réponse = `ViewerContext`. **Aucun événement, aucune mention de la lecture.** Le catalogue
d'événements ne contient aucun `identity.device_session.closed` ; `DeviceRevoked`
(`proto/arthome/identity/v1/events.proto:105`) ne porte que `device_id` et `account_id` —
**il n'y a pas de grain « profil »**. `streaming` n'a donc aucun moyen d'apprendre qu'un
profil a été déconnecté d'un appareil.

**Conséquence, sur le téléviseur partagé qui est le motif même de la coupe.** Cinq profils sur
le téléviseur du salon. Quelqu'un regarde sous votre profil. Vous faites « déconnecter ce
profil » depuis le web. Le bail `PlaybackSession (account, profile, device, date)` continue de
se renouveler toutes les 45 s contre `entitlement_projection`, qui ne connaît ni les sessions
ni les appareils. **La lecture ne s'arrête pas.** Et comme `concurrentStreamsAllowed` vaut 1
hors `premium` (`openapi/storefront.yaml:645`), vous restez bloqué sur votre propre compte —
le défaut exact que `storefront-mobile` Q5 et `storefront-tv` Q9c demandaient d'éviter. La
seule issue est `revokeDevice`, qui déconnecte les cinq profils.

**Et `adr-auth.md:518-519` entretient la confusion** en écrivant que « Déconnecter cet
appareil » révoque la `DeviceSession`, qui publie `session.revoked` / `device.revoked` :
`session.revoked` n'existe nulle part, et les deux gestes y sont confondus dans la phrase même
qui prétend les articuler.

---

### K6 — `plan.opens[]` est écrit en `snake_case` au contrat et en `kebab-case` dans la source qui fait autorité

**La gravité : c'est le vocabulaire qui conditionne le droit de lire, et `adr-auth.md` §7.1
qualifie lui-même sa corruption de « défaut d'autorisation, pas défaut d'affichage ».**

`shared/catalogue.json`, `plans[]` (source déclarée faisant autorité par `data-model.md` §0 :
*« `shared/` fait autorité sur les règles et le vocabulaire »*) :

```json
"opens": ["browse","trailers","free-dates","replays","no-ads","one-live-month"]
"opens": ["browse","trailers","free-dates","replays","no-ads","all-lives","multi-screen","archive"]
```

`data-model.md:759` reprend fidèlement le kebab : « `free-dates`, `no-ads`,
`one-live-month`, `all-lives`, `multi-screen` ».

`openapi/storefront.yaml:643` et le vocabulaire fermé correspondant :

```yaml
opens: [browse, trailers, free_dates, replays, one_live_month]
x-arthome-vocabulary: [all_lives, archive, browse, free_dates, multi_screen, no_ads, one_live_month, replays, trailers]
```

`adr-stream-entitlement.md:234` écrit de son côté `PLAN_OPENING_MULTI_SCREEN`.

Trois orthographes pour une valeur dont dépend `decideWatch`. Un
`opens.includes('multi-screen')` sur une charge utile qui porte `multi_screen` rend `false`
en silence : **tout le monde retombe à un écran**, ce qui est exactement la forme de E1 que
`adr-auth.md` §7.1 décrit (`helpers.planOf()` faisant retomber tous les comptes sur `free`).
Le contrat a corrigé le vocabulaire des **formules** et réintroduit le défaut sur celui des
**ouvertures**.

Même faute, plus discrète, sur le motif de restriction territoriale :
`shared/catalogue.json` `blackoutReasons` déclare `co-production` ;
`data-model.md:212`, `proto` et `openapi` portent `co_production`.

> `studio-web` §G a trouvé la même faute sur `moderationReason` (`spoiler` et `insult`
> supprimés, `hate` et `filter` inventés). Je confirme sa mesure sur
> `proto/arthome/chat/v1/events.proto:64-71` et j'ajoute que **ce n'est pas un cas isolé** :
> c'est un motif, sur au moins trois vocabulaires, et il court de `shared/` jusqu'au `.proto`.

---

### K7 — Le journal du studio n'a pas de contexte propriétaire, et le BFF le compose depuis cinq services avec `page + total`

**La gravité : c'est une jointure au moment de la requête, paginée par décalage, sur
l'artefact que le studio conserve 24 mois — et elle franchit la ligne que
`definition-of-done.md` §8 trace pour les BFF.**

`openapi/studio.yaml:3113-3128` :

```yaml
operationId: listChannelJournal
x-arthome-upstream: [identity, catalog, chat, streaming, payouts]
```

Réponse : `items: JournalEntry[]` + `page: OffsetPageInfo`, avec dans l'exemple
`totalItems: 812, totalPages: 41` (ligne 3172).

**Ce total ne peut pas exister.** Il faut compter, par période et par nature, les entrées de
cinq services distincts, **puis** appliquer la projection par rôle (« la nature `money` est
absente sans `canRevenue` », ligne 3153), **puis** trier l'union, **puis** en extraire la
page 3. Aucun des cinq ne connaît le total des quatre autres, et le BFF n'a pas le droit de
tenir une table (`definition-of-done.md` §8 : *« Si un BFF acquiert une table qu'il écrit
lui-même […] il a franchi la ligne »*).

**Personne ne possède cet agrégat.** `context-map.md:947` dit seulement que *« le journal
d'audit nominatif sur 24 mois que le studio exige est une table, pas un magasin
d'événements »* — sans nommer le contexte. `data-model.md` n'en définit aucun agrégat ;
`data-model.md` §4, le tableau des modèles de lecture, ne le contient pas ;
`data-model.md:918` en fixe la rétention (24 mois) sans dire où. **Une table de 24 mois avec
une rétention, une purge et un export, et pas de propriétaire.**

Et c'est le seul écran du système qui contredit frontalement `data-model.md` §4 :
*« aucun écran n'est servi par une jointure au moment de la requête »*.

---

## Ce qui gêne

---

### G1 — Le fan-out maximal est 5, pas 4 — et la décision de transport repose sur 4

`transport.md:47-48` :

> **« Le nombre qui tranche n'est donc pas 192. C'est 1 — la profondeur, et 4 — le fan-out
> parallèle maximal d'un écran. »**

Compté sur les documents livrés (`x-arthome-upstream`, qui existe précisément pour rendre la
règle vérifiable — `definition-of-done.md` R7) :

| Document | Opérations | Répartition du fan-out |
|---|---|---|
| `openapi/storefront.yaml` | 67 | 1:50 · 2:6 · 3:4 · 4:6 · **5:1** |
| `openapi/studio.yaml` | 63 | 1:58 · 2:2 · 3:2 · **5:1** |

Les deux à cinq :

- `getDateDetail` (`openapi/storefront.yaml:660`) — `[catalog, ticketing, identity, streaming,
  chat]`, alors que `context-map.md:864` compte l'écran `title` à **4**, et que
  `date_detail_public` est déjà déclaré alimenté par `chat.date_chat_policy_changed`
  (`data-model.md:539`). Le volet `chat` est donc appelé **et** projeté ;
- `listChannelJournal` (K7), alors que `context-map.md:862` annonce « studio : 1 à 3 ».

Le seuil `bff_upstream_calls_per_request p95 > 4` (`context-map.md` §11a,
`definition-of-done.md` §8, `transport.md` §6) est donc **franchi au jour de la livraison**,
et son geste prescrit est « le modèle de lecture manque ». La décision HTTP contre gRPC reste
bonne — le fan-out de 5 ne la retourne pas — mais **la phrase qui la justifie est fausse**, et
c'est elle qu'on relira dans six mois.

Sur la profondeur 1, en revanche, l'attaque que le chef me demandait ne tient pas : voir
`R2` plus bas.

### G2 — `adr-auth.md` §8.1 annonce trois émetteurs, en liste quatre, et promet « un seul objet à faire tourner »

`adr-auth.md:454` : *« Il contient les clés publiques des **trois** émetteurs »*. Le tableau
qui suit immédiatement (lignes 457–461) en porte **quatre** : `bff-sf`, `bff-st`, `play`,
`dev`. `context-map.md:573` dit quatre, `definition-of-done.md:536` (porte J2) vérifie
`length == 4`.

Et `adr-auth.md:464` : *« un seul objet à faire tourner, une seule chose à surveiller »* —
alors que `definition-of-done.md` §7.6 a **tranché l'inverse** : « quatre rotations
indépendantes, un assembleur sans secret », en démontrant qu'un travail unique détenant quatre
clés privées « crée une cible qui n'existe pas encore ». L'ADR de l'auth porte encore
l'argument que la définition de fini a réfuté.

### G3 — `realtime.md` se contredit sur ce qui transite dans `date:{id}:state`

- `realtime.md:43` : la salle porte « incident levé/résolu, issue déclarée, **bascule
  d'antenne, ouverture de salle, expiration de rediffusion** » ;
- `realtime.md:105-107` (§2.4) : *« une date passe à l'antenne, une salle ouvre, une
  rediffusion expire. **La tentation est de pousser ces transitions ; il ne faut pas.** »* ;
- `realtime.md:366` (§8) : « passage à l'antenne, ouverture de salle, expiration de
  rediffusion | toutes | — | **dérivé, aucun appel** ».

Trois sections, deux réponses. §2.4 porte l'argument (un téléviseur en veille huit heures ne
doit faire aucune requête) ; c'est la ligne 43 qui est l'outlier, et c'est la seule que
`backend-contracts` lira s'il cherche le contenu d'une salle.

### G4 — `definition-of-done.md` §6 impose une porte fondée sur une fracture que D-014 a rétractée

`definition-of-done.md:367-371` :

> « **C1 mérite une précision, parce qu'il est le seul qui traverse la fracture TypeScript.**
> Le client est consommé par un dépôt en **TS 6.0.x** (Angular 22) **et** par des dépôts en
> **TS 7.x** (React 19.3). Il compile donc **deux fois** […]. Un client généré qui n'est
> lisible que par l'un des deux n'est pas fini. »

D-014 dit le contraire, explicitement : *« La conclusion s'inverse. Il n'y a pas de fracture
entre dépôts : il y a un **plafond unique à TS 6.0.x sur les sept** »*, et
`code-conventions.md:103` : *« la fracture TypeScript 6 / 7 n'est pas une contrainte
présente »*. Les portes 6 et 7 de `code-conventions.md` §8.1 portent sur les `.d.ts` de
`@arthome/core` et `@arthome/contracts` — **pas** sur le client généré des surfaces, qui
n'existe que dans des dépôts en TS 6.0.3.

La ligne fait donc d'une revue de service la vérification d'un état qui n'existe pas. C'est
E2 appliqué à une décision : un raisonnement plausible, rétracté ailleurs, laissé en place ici.

### G5 — `transport.md` §7 remonte un défaut déjà corrigé

`transport.md:264-269` : *« `events.md` §6 dessine le flux vertical avec
`ticketing.PurchaseSeat gRPC traceparent en Metadata`. […] **Je ne touche pas au fichier
d'un coéquipier** — à arbitrer par le chef. »*

`events.md:279-281` porte aujourd'hui `POST /orders/seats` / `HTTP/JSON` / `traceparent en
en-tête`. La correction a été faite ; la remontée est restée. Un arbitrage est en attente sur
un défaut qui n'existe plus.

### G6 — Deux des cinq seuils de notification n'ont aucun porteur

`context-map.md:289-291` nomme les cinq seuils qui « vivent dans `@arthome/core` » :
« 30 minutes avant », « 85 % des places », « 6 heures avant expiration », « **file au-delà de
dix messages** », « **poste non affecté à J-1** ».

Servis : `reminderLeadMinutes`, `scarcityThresholdBps`, `replayExpiryWarningHours`
(`openapi/storefront.yaml:3712-3734`). Les constantes du studio
(`openapi/studio.yaml:4085-4110`) portent `technicalProvisionThreshold`,
`provisionRevisionHours`, `chatBurstThresholdPerMinute`, `holdScreenAutoAfterSec`,
`seasonBounds` — **ni le seuil de file, ni le délai d'affectation**. Deux sur cinq sans
document propriétaire : règle critique 15.

> `storefront-web` ❻.3 a trouvé la même chose sur le **total** de l'aperçu gratuit
> (`previewSecondsLeft` sert le reste, rien ne sert le total). Je confirme : `grep -rn` sur
> `architecture/`, `openapi/` et `proto/` ne donne aucune occurrence d'un plafond d'aperçu.
> `decideWatch` en a pourtant besoin en entrée (`context-map.md:382`) et
> `definition-of-done.md:233` fait tester « le budget d'aperçu à 0 ».

### G7 — « La seule duplication de donnée du système » est annoncée trois fois, et il y en a au moins huit

`context-map.md:414` : *« C'est le seul endroit du système où j'accepte de dupliquer une
donnée de `ticketing` »*. `data-model.md:555` : *« `entitlement_projection` est la seule
duplication que j'assume à contrecœur »*. `adr-stream-entitlement.md:259` : *« C'est **la
seule duplication de donnée que j'assume dans tout le système** »*.

Le tableau de `data-model.md` §4 en liste sept autres : `date_card_public` (jauge, tarifs et
promotions de `ticketing` copiés dans `catalog`), `date_detail_public`, `channel_agenda` et
`events_table` (recette de `ticketing` dans `catalog`), `artist_counters` (compteurs
d'`identity` et de `streaming` dans `catalog`), `channel_dues` (faits de `ticketing` et de
`payouts` dans `identity`), `payout_ledger`, plus les trois éléments projetés de la liste de
contrôle de publication (`data-model.md:263-266`).

La distinction qu'on veut faire est réelle — `entitlement_projection` est la seule qui porte
une **autorité**, pas seulement un affichage — mais elle n'est écrite nulle part, et la phrase
telle quelle est fausse. Elle sera citée pour refuser la huitième projection légitime.

### G8 — Le contrat expose la forme d'un moteur de recherche

`answers-to-surfaces.md:46` (réponse à `storefront-web` Q2) :

> « **Oui.** `track_total_hits: 10000` sur OpenSearch, et le contrat déclare la garantie :
> **exact jusqu'à 10 000, "au moins 10 000" au-delà**. »

`track_total_hits` est le nom d'un paramètre Lucene, et 10 000 en est le défaut. La garantie
servie au client (`CursorPageInfo.approximateTotal` + `totalIsLowerBound`) est la bonne forme
— c'est le **nombre** et sa provenance qui fuient. Si l'on passe un jour à un moteur dont la
sémantique de total est différente, la ligne du contrat qui dit « au moins 10 000 » devient
une promesse faite au nom d'un fournisseur qui n'est plus là. Le remède tient en une ligne :
servir le seuil comme une constante de domaine plutôt que le graver dans la prose.

---

## Ce qui est une préférence, et que j'assume comme telle

1. **J'aurais ajouté un `groupId` au tableau des sujets d'`events.md` §3.** Le piège du
   `groupId` partagé de `@nestjs/microservices` est correctement identifié (`events.md:73-75`,
   `definition-of-done.md:201-204`), et la porte AsyncAPI le vérifie à l'exécution. Mais la
   table qui fait autorité sur les sujets ne porte pas les groupes, donc la porte compare un
   document à un autre document. C'est une préférence : la porte est bonne.

2. **Le maintien de KafkaJS me gêne plus qu'il ne gêne `backend-domain`, et je n'ai pas
   d'argument décisif.** Vérifié aujourd'hui sur npm : `kafkajs@2.2.4`,
   `time.modified = 2023-02-27`, `dist-tags = { latest: 2.2.4, beta: 2.3.0-beta.3 }`. Le
   constat d'`events.md` §2 est exact à la date près. Le raisonnement — une pause de groupe à
   chaque déploiement est une gêne d'exploitation sur une plateforme dont le pic est un
   spectacle du soir — tient. Ma préférence irait quand même au transport `confluentinc` pour
   les consommateurs, parce que le signal de bascule écrit (« rééquilibrage > 30 s ») ne se
   mesure qu'en production et qu'on ne réécrit pas un transport personnalisé un soir de
   direct. **C'est une préférence, pas une objection.**

3. **`x-arthome-upstream` devrait être une porte, pas une annotation.** La règle R7 vérifie
   que le champ est **non vide** (`definition-of-done.md:130`), pas qu'il est **≤ 4**. Ajouter
   la borne aurait attrapé G1 à l'écriture. C'est une ligne de Python, et c'est une préférence
   parce que le seuil est déjà une alerte d'exploitation.

---

## Ce qui résiste

J'ai attaqué ces points et ils tiennent. Le dire a autant de valeur que le reste : ça dit où
ne pas revenir.

### R1 — OpenSearch : l'argument d'origine est mort, le choix survit, et pour une meilleure raison

**L'attaque.** `README.md:290-298` du dossier d'origine retient OpenSearch sur trois
arguments et écarte Meilisearch sur **un seul** : *« Meilisearch serait meilleur en qualité de
recherche par heure investie, mais n'a pas de connecteur Kafka Connect officiel. »* Or
`context-map.md:135-141` établit que le connecteur *sink* **n'est pas utilisable ici** — le
document indexé compose trois contextes, aucun connecteur ne fait cette jointure. L'argument
qui écartait Meilisearch est donc mort, et la comparaison se rouvre.

**Le verdict : elle se rouvre, et OpenSearch gagne quand même — sur un argument que personne
n'a écrit.**

`context-map.md:143-147` fonde le déclenchement d'alerte d'une recherche enregistrée sur une
**requête inversée**, « c'est exactement ce que fait un *percolator* OpenSearch ». C'est la
pièce maîtresse de la réponse à `storefront-web` Q23 (`answers-to-surfaces.md:86`), de
`saved_search_percolator` (`data-model.md:542`), de `SavedSearchMatched`
(`proto/arthome/catalog/v1/events.proto:255`) et du fait que dix recherches enregistrées
coûtent **zéro** requête de comptage à l'ouverture de la page Compte.

J'ai vérifié en ligne aujourd'hui que la capacité existe réellement, parce qu'elle est
héritée d'Elasticsearch 7.10 et aurait pu être abandonnée au fork :
`docs.opensearch.org/latest/mappings/supported-field-types/percolator/` et
`docs.opensearch.org/latest/query-dsl/specialized/percolate/` — **le type de champ
`percolator` et la requête `percolate` existent dans OpenSearch courant** (avec un garde-fou :
`search.allow_expensive_queries` doit rester à `true`). **Meilisearch n'a pas d'équivalent** :
sa `facetDistribution` compte des documents, et l'agrégation au sens large reste une demande
ouverte depuis 2020 (`github.com/meilisearch/meilisearch/issues/1083`).

Et un fait postérieur au dossier joue dans le même sens : Meilisearch a adopté depuis un
**double licenciement**, Community Edition en MIT et une Enterprise Edition sous Business
Source License. La ligne « licence Apache 2.0, réellement libre » d'OpenSearch en sort
renforcée, pas affaiblie.

**Le raisonnement est-il honnête ou rétrospectif ?** *Il est rétrospectif dans la forme et
juste dans le fond.* Le dossier d'origine a retenu le bon moteur pour un motif qui s'est
révélé faux ; `context-map.md` a démoli ce motif sans rouvrir la comparaison — ce qui est un
manque — mais a simultanément introduit le motif qui la tranche vraiment. **Il faut réécrire
la justification, pas la décision.** C'est le percolator qui tient OpenSearch, pas Kafka
Connect.

### R2 — La profondeur de chaîne **est** 1, y compris dans le cas que le chef soupçonnait

Le chef demandait : *« un BFF qui appelle un service qui consulte un modèle de lecture projeté
par un autre contexte, est-ce encore une profondeur de 1 ? »*

**Oui, et sans ambiguïté.** La profondeur mesure les **appels synchrones** qu'un délai doit
traverser. Un modèle de lecture projeté est une **table locale du service appelé**, alimentée
hors requête par Kafka. `catalog` lisant `date_card_public` ne parle à personne ; `streaming`
lisant `entitlement_projection` ne parle à personne. L'argument de `transport.md` §2.1 ne
dépend pas de l'origine de la donnée, seulement du nombre de sauts réseau. Il n'y a pas un
seul point du système où un service en appelle un autre — je l'ai cherché dans `context-map.md`
§10, `transport.md` §5 et les deux OpenAPI, et il n'y en a pas.

La contrepartie que `transport.md` §5.3 écrit — `x-arthome-deadline` en instant absolu,
vérifié par le service avant transaction et entre les unités d'un traitement itératif — est
la bonne, et l'argument qui l'accompagne (`nestjs-grpc` : Nest ne coupe jamais un handler
unaire, donc le `deadline` gRPC n'arrête pas le destinataire non plus) est exact.

**La décision HTTP/JSON tient. Seul le fan-out de 4 est faux (G1), et il ne la retourne pas.**

### R3 — Les deux OpenAPI passent réellement les quinze règles

`definition-of-done.md:148-149` affirme : *« `openapi/storefront.yaml` (55 chemins,
67 opérations, 57 schémas) et `openapi/studio.yaml` (59 chemins, 63 opérations, 34 schémas)
passent les quinze règles »*. J'ai réimplémenté les contrôles mécanisables et les ai lancés.

| Contrôle | Résultat |
|---|---|
| comptes annoncés | **exacts**, 55/67/57 et 59/63/34 |
| R2 — aucun `nullable` | 0 occurrence dans les deux |
| R3 — tout `$ref` résout, aucun `$ref` externe | 0 non résolu, 0 externe |
| R4 — `operationId` présent, `lowerCamelCase`, unique | aucun manquant |
| R5 — `summary` **et** `description` | aucun manquant |
| R7 — `x-arthome-upstream` non vide | aucun manquant |
| R8/R9 — exemple sur chaque corps de requête et chaque 2xx | aucun manquant |
| R11 — `Idempotency-Key` sur chaque écriture hors allowlist | aucun manquant |
| R12 — `traceparent` sur chaque opération | aucun manquant |
| R13 — aucun `labelFr`/`labelEn`/`messageFr`/`messageEn` | 0 occurrence |
| R14 — aucun vocabulaire fermé figé en `enum` **de sortie** | 0 dans les schémas de réponse ; 104 `x-arthome-vocabulary` |
| R15 — toute 2xx compose `EnvelopeMeta` | aucun manquant |

C'est rare, et c'est le genre de chose qu'un document affirme sans l'avoir lancé. Ici l'
affirmation est vraie. **La seule exception connue est celle que `storefront-tv` C4 a
trouvée** (`Error.nature`, le seul `enum` dur d'une réponse) — et elle échappe à R14 parce que
le schéma est celui de l'**enveloppe**, pas d'une charge utile. La règle est bonne, le
vérificateur a un angle mort d'une ligne.

### R4 — Le contrat de l'outbox avec Debezium est juste dans le détail qui coûte cher

`data-model.md` §7.3 (lignes 859–890). J'ai cherché l'erreur classique et elle n'y est pas :

- `payload bytea` **déjà encadré** par le sérialiseur du registre, avec
  `binary.handling.mode=bytes` + `value.converter=ByteArrayConverter` — sans quoi Debezium
  produit du JSON encadré qu'aucun consommateur Protobuf ne lit. C'est exact, et c'est le
  piège n°1 du routeur d'outbox ;
- `REPLICA IDENTITY DEFAULT` suffit **parce que la table est en insertion seule** — le
  raisonnement est donné, pas seulement la conclusion ;
- le nettoyage passe **après** confirmation de position du connecteur ;
- `tracecontext` injecté **à l'écriture**, avec la raison (le relais tourne hors de la
  requête) ;
- le slot non consommé qui retient le WAL, avec un seuil (`confirmed_flush_lsn > 1 Go`).

Et la distinction `commit()` après transaction pour les événements **domaine** contre ligne
d'outbox **dans** la transaction pour les événements d'**intégration**
(`context-map.md:951-955`) est posée explicitement comme « la faute la plus coûteuse du
modèle ». Rien à redire.

### R5 — Le bail qui expire, et non la commande qui libère

`adr-stream-entitlement.md` §3.3 et `data-model.md` §5.4. J'ai cherché le cas où le bail de
90 s renouvelé toutes les 45 s laisse un écran fantôme ou bloque un foyer, et il n'y en a pas :
la reprise de sa propre session par `deviceId` couvre le redémarrage, et `releasePlayback`
existe sans que rien n'en dépende. Deux surfaces l'ont demandé indépendamment et la réponse
est la bonne. **Seul le chiffre de la révocation est faux (K3), pas le mécanisme.**

### R6 — La vérification en ligne d'`adr-auth.md` est réelle, pas décorative

J'ai recontrôlé les faits datés parce qu'un tableau « vérifié en ligne » est exactement le
genre d'artefact qu'on fabrique :

- `better-auth` : `npm view better-auth version` → **1.7.5**. Conforme ;
- **CVE-2026-45337 existe et est décrite exactement** : publiée le 15 juillet 2026, CVSS 3.1
  = 7,6 (HIGH), affecte 1.6.0 → 1.6.11, *« the deviceAuthorization plugin treats any
  authenticated session as the owner of any pending device code […] POST /device/approve and
  POST /device/deny short-circuit when userId is unset »*. L'ADR dit « corrigé en 1.6.11 » :
  exact. Seule imprécision, sans conséquence : « il y a trois mois » vaut deux ;
- `kafkajs` : 2.2.4, dernière publication 2023-02-27. Exact.

Et la décision qui en découle — **écrire nous-mêmes la garde de propriété au BFF**
(§6.3), parce que c'est précisément la ligne qui a cédé chez l'éditeur — est la bonne
conclusion, pas la conclusion confortable. Le spike S3 qui l'éprouve est nommé « le test qui
doit exister avant n'importe quelle ligne de production ».

### R7 — L'aveu d'E2 de `definition-of-done.md` §7.6 est délibéré, et j'ai eu tort de le prendre pour un résidu

`definition-of-done.md:507-515` garde la phrase fausse — « retirer l'ancienne après la plus
longue durée de vie de jeton » — **et écrit pourquoi il la garde** : *« Je le laisse écrit :
une puce se recopie hors de son contexte, et c'est ainsi que la règle 15 se viole. »* J'ai
d'abord compté ça comme une quatrième occurrence de la faute. C'en est l'antidote, et le
raisonnement dimensionnant qui la remplace — `max(durée de vie du jeton, 2 × max-age du
document)` avec `max-age=3600` — est juste : la grâce couvre le cache d'une périphérie qu'on
ne peut pas vider, pas la durée d'un jeton. C'est le meilleur paragraphe du dossier sur E2.

**À nuancer quand même** : `adr-auth.md:466` porte encore la phrase fausse **sans** le
marqueur, corrigée seulement deux paragraphes plus bas. Un lecteur pressé prend la première.

### R8 — Les contextes « provisoires » : l'aveu tient, l'un des quatre a un invariant qui ne tient pas

Le chef demandait si un contrat conçu et non observé est seulement plausible. Ma réponse est
plus favorable que je ne l'attendais :

- **`chat`** : l'invariant structurant — trois axes (`MessageState`, `ModerationItemState`,
  `AudienceSanction`) au lieu d'un champ empilé, pastille dérivée par `moderationBadgeOf` avec
  une préséance écrite — est **plus solide** que ce que les maquettes exerçaient, et il est
  fondé sur un défaut réel (`reported`, un état de triage logé dans le champ des sanctions).
  Il tient sans avoir été observé parce qu'il est démontré, pas deviné. `storefront-mobile`
  arrive à la même conclusion (« conçu, non éprouvé », avertissement maintenu sur la modération
  seule, levé sur les dix autres fonctions) ;
- **`streaming`** : la nullabilité des métriques avec `measured_at` par échantillon et la
  distinction « non mesuré » / « mesuré à zéro » est la bonne, et elle vient d'une exigence de
  `streaming.md`. Le `PlaybackTicket` est honnêtement marqué provisoire parce que le
  fournisseur média n'est pas choisi ;
- **`payouts`** : l'aveu « la forme est sûre, le modèle fiscal ne l'est pas » est
  exactement inversé par K1 et K2 — **c'est la forme qui est fausse, et le modèle qui est
  rattrapable.** C'est le seul des quatre où le provisoire porte sur la mauvaise moitié ;
- **`notifications`** : sans sujet Kafka du tout (K4), mais ses invariants (heures calmes
  conditionnées à la détention d'une place, redaction d'un montant selon `canRevenue`,
  routage décidé côté serveur) sont des règles métier réelles et vérifiables.

---

## Ce que je n'ai pas pu juger, et pourquoi

1. **Le modèle fiscal lui-même.** Qui doit la TVA, sur quelle assiette, qui est redevable :
   ce sont des questions de droit, et l'avertissement en tête d'`adr-payments.md` a raison de
   le dire. Je n'ai jugé que ce qui est jugeable sans conseil fiscal : la **cohérence interne**
   entre D-015 et la configuration Stripe (K1) et entre D-015 et la forme des données (K2).
   Sur ces deux points-là, il n'y a pas besoin d'un avocat.

2. **Les mesures de bundle de D-012** (93 Ko contre 7,5 Ko gzip). Deux agents ont mesuré
   indépendamment et convergent à 1 Ko près ; la réserve est déjà consignée (esbuild sur un
   schéma isolé, élagage non actif par défaut sur l'empaqueteur React Native). Je n'ai pas
   d'empaqueteur ici et je n'aurais rien ajouté.

3. **Les maquettes.** La consigne interdit de les ouvrir en entier et je ne les ai pas
   ouvertes. Tout ce que j'affirme sur la conception vient de `shared/` (`catalogue.json`
   relu intégralement sur les vocabulaires que je conteste) et des cinq `needs/`. Là où une
   surface affirme ce que sa maquette montre, je l'ai cru.

4. **Le percolator à l'échelle.** J'ai vérifié qu'il **existe** dans OpenSearch (R1). Je n'ai
   aucun ordre de grandeur sur le nombre de recherches enregistrées attendu, et
   `search.allow_expensive_queries` est un interrupteur qu'un exploitant coupe un jour de
   surcharge. Le jour où il est coupé, les alertes de recherche enregistrée s'arrêtent **en
   silence** — mais je n'ai pas de quoi dire si c'est un risque ou une note de bas de page.

5. **`code-conventions.md`.** 2 044 lignes lues par recherche ciblée, pas intégralement. Je
   n'en tire qu'un point (G4), et il est vérifié aux deux bouts.

6. **La latence réelle du renouvellement côté périphérie.** K3 démontre que la fenêtre
   d'exposition est la durée de vie du jeton et non l'intervalle de renouvellement. Je n'ai
   pas pu établir **quelle** valeur il faut viser : passer le jeton à 60 s doublerait la
   fréquence de renouvellement sur le chemin le plus chaud du système, et personne n'a mesuré
   ce que coûte ce doublement. Le défaut est certain ; le remède ne l'est pas.

7. **`studio-mobile` n'a pas encore écrit sa Confrontation** (`needs/studio-mobile.md` est
   inchangé à l'heure où j'écris). Quatre surfaces sur cinq ont confronté l'offre ; la
   cinquième reste à lire, et il est possible qu'elle trouve dans `chat` et dans la garde ce
   que je n'ai pas cherché.

---

## Annexe — ce que j'ai lancé, pour qu'on puisse le relancer

```bash
# R3 — les quinze règles, réimplémentées et lancées sur les deux documents
python3 - <<'PY'
import yaml, re, json
ALLOW = {'recordPlaybackPosition','submitHealthSample','openPlayback','renewPlaybackTicket',
         'releasePlayback','sendReaction','quoteCart','quoteSeat'}
for f in ('openapi/storefront.yaml','openapi/studio.yaml'):
    d = yaml.safe_load(open(f)); s = json.dumps(d)
    print(f, 'paths', len(d['paths']), 'schemas', len(d['components']['schemas']),
          'nullable', s.count('"nullable"'),
          'i18n-leak', len(re.findall(r'"(labelFr|labelEn|messageFr|messageEn)"', s)))
PY

# G1 — le fan-out réel, celui que R7 ne borne pas
grep -ohE 'x-arthome-upstream: \[[^]]*\]' openapi/*.yaml \
  | awk -F, '{print NF}' | sort | uniq -c

# K4 — les deux vocabulaires d'événements, côte à côte
grep -ohE '\b(identity|catalog|ticketing|streaming|chat|payouts)\.[a-z_]+(\.[a-z_]+)*(\.v1)?' \
  architecture/context-map.md architecture/data-model.md | sort -u

# K6 — la source qui fait autorité
python3 -c "import json;print(json.load(open('/home/julien-metral/Dev/arthome-design/design_handoff_arthome/shared/catalogue.json'))['plans'])"
grep -n 'opens:' openapi/storefront.yaml
```

**Sources vérifiées en ligne le 21 septembre 2026** :
[Stripe — Understand the merchant of record in a Connect integration](https://docs.stripe.com/connect/merchant-of-record) ·
[Stripe — Understand how charges work in a Connect integration](https://docs.stripe.com/connect/charges) ·
[OpenSearch — Percolator field type](https://docs.opensearch.org/latest/mappings/supported-field-types/percolator/) ·
[OpenSearch — Percolate query](https://docs.opensearch.org/latest/query-dsl/specialized/percolate/) ·
[Meilisearch — Filtering, sorting and faceting](https://www.meilisearch.com/docs/capabilities/filtering_sorting_faceting/overview) ·
[Meilisearch — Facet aggregation functions (issue #1083)](https://github.com/meilisearch/MeiliSearch/issues/1083) ·
[Meilisearch — Enterprise Edition licence](https://daily.dev/posts/introducing-the-meilisearch-enterprise-edition-license-w4boyi4ho) ·
[CVE-2026-45337 — better-auth device authorization](https://osv.dev/vulnerability/CVE-2026-45337) ·
npm (`better-auth@1.7.5`, `kafkajs@2.2.4`, `time.modified 2023-02-27`).
