# Catalogue d'événements

> Nom, propriétaire, charge utile, clé de partition, politique de compatibilité.
> Les schémas sont dans `proto/`. **Protobuf seul**, outillé par `buf`.
> Kafka est le **seul** canal inter-services. Un appel synchrone ne va que du BFF vers un service.

---

## 1. Les conventions, avant la liste

### 1.1 Un sujet par **type d'agrégat**, pas par événement

C'est ce que le routeur d'outbox Debezium impose, et c'est aussi ce qui préserve l'ordre.

```
colonne outbox                     conséquence Kafka
──────────────────────────────────────────────────────────────────
aggregatetype = "catalog.date"  →  sujet   arthome.catalog.date
aggregateid   = "<uuid>"        →  CLÉ     (donc partition, donc ordre)
type          = "catalog.date.scheduled.v1"  →  en-tête `type`
payload       = bytes Protobuf encadrés      →  valeur
tracecontext                                 →  en-tête `traceparent`
id                                           →  en-tête `message-id`
```

**Pourquoi un sujet par agrégat et non par événement.** L'ordre Kafka ne tient que **par
partition**. `date.scheduled`, `date.rescheduled` et `date.outcome_declared` portent sur le même
objet : les séparer en trois sujets ferait perdre leur ordre relatif, et un consommateur pourrait
appliquer une issue avant la publication qui la crée. Un sujet par agrégat, clé = identifiant
d'agrégat : l'ordre d'un objet est garanti, et le nombre de sujets reste lisible (**14 sujets**,
pas quatre-vingts).

### 1.2 Plusieurs types de message dans un sujet — `RecordNameStrategy`

Conséquence directe : un sujet porte plusieurs types de message. La stratégie de sujet du registre
est donc **`RecordNameStrategy`** (le sujet du registre = le nom pleinement qualifié du message),
et non `TopicNameStrategy`. Chaque message évolue et se vérifie indépendamment des autres.

C'est une décision non évidente et elle a une conséquence de CI : `buf breaking` tourne **par
fichier** (`use: FILE`), et la porte de compatibilité du registre est posée **par message**.

### 1.3 En-têtes obligatoires sur tout message

| En-tête | Contenu | Pourquoi |
|---|---|---|
| `message-id` | l'`id` de la ligne d'outbox (UUIDv7) | clé de déduplication du consommateur. **Son absence est une erreur permanente**, jamais un identifiant par défaut |
| `type` | `<context>.<aggregate>.<event>.v<N>` | routage du handler dans un sujet multi-types |
| `traceparent` | W3C, **injecté à l'écriture de la ligne d'outbox** | le relais tourne hors de la requête : injecté plus tard, le lien est définitivement perdu |
| `actor-id` | la personne qui a causé le fait, si elle existe | le journal nominatif du studio le lit ; le reconstruire après coup est impossible |
| `occurred-at` | l'instant du fait métier | distinct de l'instant de publication ; un rejeu ne doit pas déplacer un fait |

### 1.4 Livraison

**Au moins une fois, toujours.** Le relais peut planter entre la publication et la marque, la CDC
rejoue, un sujet de reprise duplique. **Tout consommateur est idempotent** : l'identifiant du
message est inséré dans une table `processed_message` **dans la transaction de l'écriture
métier**, avec `orIgnore().returning('id')` — aucune ligne rendue, on saute. Jamais une
déduplication par Redis `SET NX` ni un test-puis-écriture hors transaction : un plantage entre les
deux perd l'effet ou le double.

**Classement des échecs**, appliqué partout :

| Nature | Exemple | Traitement |
|---|---|---|
| permanent | charge utile malformée, violation de schéma, refus métier définitif | **DLQ immédiatement**, on ne rejoue pas |
| transitoire | base indisponible, verrou, dépendance temporairement absente | sujet de reprise avec délai croissant (5 s, 30 s, 5 min), puis DLQ |

**Deux mécanismes de rebut distincts, jamais amalgamés** : la DLQ native de Kafka Connect
(`errors.deadletterqueue.topic.name`) pour les échecs de **connecteur**, et
`arthome.<context>.retry` + `arthome.<context>.dlq` pour les échecs **métier** des consommateurs.
Alerte sur la profondeur des deux.

**Un `groupId` par service consommateur et par module client.** Le défaut de `@nestjs/microservices`
est partagé (`nestjs-group-server`) : le leader du groupe n'assigne que ses propres sujets, et les
sujets des autres services restent non consommés — silencieusement.

### 1.5 Ce qui ne passe pas par Kafka

| Donnée | Canal | Motif |
|---|---|---|
| compteur de spectateurs, à la seconde | **Redis** (diffusion Socket.IO) | un échantillon par seconde par direct dans un journal durable est du gâchis. Seul l'**agrégat à la minute** entre dans Kafka |
| mesures de santé du flux, 1 à 2 s | **Redis** | idem ; seuls le pic et la moyenne du run entrent dans Kafka à la fin |
| frappe de recherche, position de lecture | rien | écriture directe, tolérante à la perte |
| invalidation de cache **interne à un service** | rien | c'est une conséquence locale |
| travaux d'arrière-plan **d'un service** | **BullMQ**, interne | BullMQ entre deux services rouvrirait le couplage synchrone que Kafka existe pour interdire |

---

## 2. Le client Kafka — confirmation demandée par la mission

**La décision à confirmer** : le transport intégré de `@nestjs/microservices` repose sur
**KafkaJS 2.2.4**, sans publication depuis le **27 février 2023** et sans mainteneur. Le candidat
proposé est `@confluentinc/kafka-javascript` via un transport personnalisé.

**Ce que j'ai vérifié, et ma réponse : on garde KafkaJS, avec une réserve écrite.**

| Point | Constat |
|---|---|
| fonctionne sur Kafka 4.x | oui, vérifié en exécution sur un nœud unique. « Mettre à jour kafkajs » n'est pas un correctif : 2.2.4 **est** la dernière version |
| ce qui manque | KIP-848 (nouveau protocole de groupe), **appartenance statique** (`groupInstanceId`), **rééquilibrage coopératif** |
| conséquence réelle | KafkaJS rééquilibre en mode **impatient** : **chaque déploiement met le groupe en pause**, le temps du rééquilibrage |
| pièges à ne pas commettre | ne **jamais** configurer `CooperativeStickyAssigner`, `groupInstanceId` ni `groupProtocol` : KafkaJS ne les a pas, et les régler donne l'illusion d'un correctif |

**Pourquoi je ne bascule pas maintenant.** Un transport personnalisé sur
`@confluentinc/kafka-javascript` signifie écrire soi-même un `Server implements
CustomTransportStrategy` et un `ClientProxy` : les décorateurs, `KafkaContext`, les filtres et la
gestion des réponses ne viennent pas gratuitement. Pour une personne seule, c'est un projet dans le
projet — et la conséquence qu'on évite (une pause de groupe de quelques secondes à chaque
déploiement) est, sur une plateforme dont le pic est un spectacle du soir, une gêne de
déploiement, pas une panne. On règle `sessionTimeout` et `rebalanceTimeout`, et on déploie hors
créneau d'antenne.

**Le signal qui ferait changer d'avis, écrit maintenant** : si le rééquilibrage dépasse **30 s** sur
un groupe, ou si un déploiement pendant un direct devient nécessaire, on bascule sur
`@confluentinc/kafka-javascript` **pour les consommateurs seulement** (le client est purement
producteur ailleurs). C'est une décision réversible parce que les schémas et les sujets ne changent
pas.

**Deux réglages à ne pas oublier, qui ne sont pas des détails :**
- `run: { partitionsConsumedConcurrently: N }` — le défaut de KafkaJS est **1** message à la fois.
  Ce n'est pas un défaut de Nest (nest#12703). L'ordre reste garanti par partition.
- **partitions ≥ nombre maximal de répliques**, sinon des pods restent inactifs et un
  redimensionnement automatique sur le processeur ne peut rien y faire.

---

## 3. Les sujets

**Seize sujets, et les trente types d'agrégat qu'ils portent.** Une version antérieure de cette
table en déclarait quatorze et laissait **seize types d'agrégat sans sujet** — donc sans clé, sans
nombre de partitions, sans `groupId` et sans canal AsyncAPI, alors que la définition de fini génère
les canaux **depuis cette table**. Le tableau ci-dessous est exhaustif : **tout message de §4 y
trouve son sujet.**

| Sujet | Propriétaire | Clé | Part. | Types d'agrégat portés | Maturité |
|---|---|---|---|---|---|
| `arthome.identity.account` | `identity` | `account_id` | 3 | `account`, `artist` (suivis), `rights_version` | **stable** |
| `arthome.identity.device` | `identity` | `device_id` | 3 | `device`, `device_session` | **stable** |
| `arthome.identity.channel` | `identity` | `channel_id` | 3 | `channel`, `date_access` | **stable** |
| `arthome.catalog.date` | `catalog` | `date_id` | **12** | `date`, **`publication`** | **stable** |
| `arthome.catalog.show` | `catalog` | `show_id` | 3 | `show` | **stable** |
| `arthome.catalog.artist` | `catalog` | `artist_id` | 3 | `artist` | **stable** |
| `arthome.catalog.saved_search` | `catalog` | `account_id` | 3 | `saved_search` | provisoire |
| `arthome.ticketing.date_sales` | `ticketing` | `date_id` | **12** | `date_sales`, **`seat`**, `waitlist` | **stable** |
| `arthome.ticketing.order` | `ticketing` | `order_id` | 6 | `order` | **stable** |
| `arthome.ticketing.account` | `ticketing` | `account_id` | 3 | `subscription`, `credit` | **stable** |
| `arthome.streaming.run` | `streaming` | `date_id` | **12** | `run`, `incident`, `replay`, `chapter`, `viewer_count` | provisoire |
| `arthome.chat.date` | `chat` | `date_id` | **12** | `message`, `date_chat_policy` | provisoire |
| `arthome.chat.moderation` | `chat` | `date_id` | 6 | `moderation` | provisoire |
| `arthome.chat.audience` | `chat` | `channel_id` | 3 | `audience` | provisoire |
| `arthome.payouts.payout` | `payouts` | `channel_id` | 3 | `payout`, `bank_change`, `reconciliation` | provisoire |
| `arthome.notifications.delivery` | `notifications` | `account_id` | 3 | `delivery` | provisoire |

Plus, par contexte : `arthome.<context>.retry` et `arthome.<context>.dlq`.

### 3.1 Pourquoi ces regroupements, et pas un sujet par agrégat

**Un sujet par agrégat aurait cassé la règle même du §1.1.** L'ordre ne tient que par partition, et
la clé est ce qui décide de la partition. Deux regroupements sont donc des **exigences**, pas des
commodités :

- **`catalog.publication` partage le sujet de `catalog.date`, clé `date_id`.** Sur son propre sujet
  avec `publication_id` pour clé, `publication.engaged` **perdrait son ordre relatif** avec
  `date.scheduled` — et c'est exactement le contre-exemple que le §1.1 donne pour refuser un sujet
  par événement : *« un consommateur pourrait appliquer une issue avant la publication qui la
  crée »*. La règle était écrite, puis l'agrégat qui la viole était publié ;
- **`ticketing.seat` partage le sujet de `ticketing.date_sales`, clé `date_id`.** `seat.activated`
  crée le droit de lire (`entitlement_projection`) **et** cause le mouvement de jauge : les deux
  doivent arriver dans l'ordre où ils se sont produits, donc dans la même partition.

Les autres suivent la même logique, appliquée sans exception : un incident, un chapitre, un
échantillon d'audience et un actif de rediffusion sont des **facettes d'un run** — ils vont dans
`arthome.streaming.run`, clé `date_id`. Une politique de tchat et un message portent sur la même
date, et l'ordre compte (un message posté après un passage en `read_only`) — ils vont dans
`arthome.chat.date`.

**Deux renommages que cela impose**, et ils sont sans coût puisque rien n'est construit :
`arthome.ticketing.subscription` devient **`arthome.ticketing.account`** (il porte tout ce qui est
clé `account_id` : abonnement **et** avoir), et `arthome.chat.message` devient
**`arthome.chat.date`** (messages **et** régime de tchat).

**Les quatre sujets à 12 partitions** sont ceux qu'un spectacle populaire concentre. Le nombre
n'est pas magique : c'est la marge qui permet d'ajouter des répliques sans en repartitionner.
Le point chaud et sa mesure sont traités dans `context-map.md` §11(b).

---

## 4. Le catalogue

Charge utile résumée ; le schéma fait foi (`proto/`). Tous les instants sont
`google.protobuf.Timestamp` (UTC) ; tous les montants sont `arthome.common.v1.Money`.

### 4.1 `identity`

| Événement | Charge utile | Consommé par | Pourquoi |
|---|---|---|---|
| `identity.account.registered.v1` | `account_id`, `locale`, `country`, `occurred_at` | `notifications` | courriel de bienvenue |
| `identity.account.deletion_requested.v1` | `account_id`, `grace_until` | `ticketing`, `payouts`, `notifications`, `chat`, `streaming` | **saga d'effacement** (`data-model.md` §7.5) |
| `identity.account.anonymised.v1` | `account_id` | tous | dissocier les pseudonymes, figer les factures |
| `identity.device.revoked.v1` | `device_id`, `account_id` | **`streaming`** | invalider les baux de lecture de cet appareil : c'est ce qui fait que « déconnecter cet appareil » coupe la lecture |
| **`identity.device_session.closed.v1`** | `device_id`, `account_id`, **`profile_id`**, `self_initiated` | **`streaming`** | **il manquait.** Révoque les baux du couple (appareil, profil) **et d'eux seuls** — sans lui, `signOutProfile` ne coupait aucune lecture sur un téléviseur partagé, et la seule issue était de révoquer l'appareil, donc les cinq profils |
| `identity.artist.followed.v1` / `.unfollowed.v1` | `account_id`, `artist_id` | `catalog`, `notifications` | compteur d'abonnés ; abonnement d'alerte |
| `identity.channel.created.v1` | `channel_id`, `owner_account_id` | `catalog`, `payouts` | créer l'artiste public ; ouvrir le compte connecté |
| `identity.channel.membership_changed.v1` | `channel_id`, `person_id`, `roles[]`, `action` | `notifications`, `chat` | routage d'alerte par rôle ; droit de modérer |
| `identity.channel.ownership_transferred.v1` | `channel_id`, `from`, `to` | `payouts`, `catalog` | le compte bancaire et la page publique suivent |
| `identity.date_access.granted.v1` / `.revoked.v1` | `channel_id`, `date_id`, `person_id`, `crew_role`, `expires_at` | `streaming`, `chat` | accès à la clé de flux ; droit de trancher une file |
| `identity.rights_version.bumped.v1` | `account_id`, `version` | **temps réel** | l'application apprend que sa navigation est périmée (`studio-mobile` §2c) |

### 4.2 `catalog`

| Événement | Charge utile | Consommé par |
|---|---|---|
| `catalog.date.drafted.v1` | `date_id`, `channel_id`, `show_id`, `venue_id` | `ticketing` (ouvrir `DateSales`), `streaming` (préparer le run) |
| `catalog.date.scheduled.v1` | + `starts_at`, `venue_timezone`, `runtime_min`, `replay_policy`, `replay_window_hours`, `rights` | `ticketing`, `streaming`, `chat`, `notifications`, `identity` (gardes) |
| **`catalog.publication.state_changed.v1`** | `date_id`, `from_state`, `to_state`, `version`, `irreversible`, `changed_by` | **temps réel du studio** (salle `channel:{id}`), journal. **Il manquait** : sans lui, `draft→reserve`, `scheduled↔technical` et `ended→replay-online` ne produisaient rien, et l'écran d'un second opérateur mentait indéfiniment |
| `catalog.publication.engaged.v1` | `date_id`, `engaged[]` (`prices`, `replay`, `chat_mode`) | **`ticketing`** verrouille les tarifs · **`chat`** verrouille le régime |
| `catalog.date.rescheduled.v1` | `date_id`, `new_starts_at`, `previous_starts_at` | `ticketing` (les places suivent), `notifications` (**les rappels suivent**), `streaming` |
| `catalog.date.outcome_declared.v1` | `date_id`, `outcome`, `declared_by`, `declared_at`, `message` + `content_language` | **quatre conséquences** : `ticketing` (rembourse ou crédite), `payouts` (retient), `catalog` (copie publique), `notifications` (prévient) |
| `catalog.date.replay_policy_set.v1` | `date_id`, `policy`, `window_hours` | `streaming` (expiration de l'actif), `ticketing` (mise en vente) |
| `catalog.date.rights_changed.v1` | `date_id`, `scope`, `territories[]`, `reason_code` | `streaming` (le droit de lire) |
| `catalog.show.published.v1` / `.updated.v1` | `show_id`, taxonomie, langues | `ticketing` (boutique), index |
| `catalog.artist.updated.v1` | `artist_id`, `channel_id`, face publique | `notifications` |
| `catalog.saved_search.matched.v1` | `account_id`, `saved_search_id`, `date_id` | **`notifications`** — déclenché par le *percolator* |

### 4.3 `ticketing`

| Événement | Charge utile | Consommé par |
|---|---|---|
| `ticketing.date_sales.availability_changed.v1` | `date_id`, `seats_available`, `waitlist_count`, `lowest_price`, `fill_rate`, `sold_out` | **`catalog`** (carte publique, index, agenda studio), `notifications` (« bientôt complet » à 85 %) |
| `ticketing.date_sales.pricing_changed.v1` | `date_id`, `tiers[]`, `promotions[]` | `catalog` (carte, liste de contrôle) |
| `ticketing.date_sales.capacity_set.v1` | `date_id`, `capacity_total`, `tiers[]` | `catalog` (liste de contrôle), `streaming` (provision technique) |
| `ticketing.seat.activated.v1` | `seat_id`, `date_id`, `account_id`, `tier`, `seat_code` | **`streaming`** (`entitlement_projection`), `notifications` (rappel à T−30) |
| `ticketing.seat.cancelled.v1` | `seat_id`, `date_id`, `account_id`, `reason` | `streaming`, `payouts` |
| `ticketing.order.paid.v1` | `order_id`, `kind` (`seat`\|`merch`), `channel_id`, `date_id?`, `gross`, `vat_breakdown[]`, `fees` | **`payouts`** (c'est la matière du droit à versement) |
| `ticketing.order.refunded.v1` | `order_id`, `amount`, `reason` | `payouts` |
| `ticketing.credit.issued.v1` | `credit_id`, `account_id`, `channel_id`, `amount`, `origin_ref` | `payouts` (l'avoir est un passif), `notifications` |
| `ticketing.subscription.changed.v1` | `account_id`, `plan_id`, `state`, `opens[]`, `seat_discount`, `period_end` | **`streaming`** (le droit de lire), `catalog` (prix affiché) |
| `ticketing.waitlist.notified.v1` | `date_id`, `account_ids[]`, `priority_until` | `notifications` |

### 4.4 `streaming`

| Événement | Charge utile | Consommé par |
|---|---|---|
| `streaming.run.technical_check_passed.v1` | `date_id`, `passed_at`, `protocol` | **`catalog`** (liste de contrôle → déverrouille la publication) |
| `streaming.run.started.v1` | `date_id`, `started_at`, `protocol`, `monitor_path` | **`catalog`** (`technical → live`), `chat` (ouvre le tchat), `notifications` (« artiste suivi en direct ») |
| `streaming.run.ended.v1` | `date_id`, `ended_at`, `peak_viewers`, `avg_viewers`, `duration_sec` | **`catalog`** (`live → ended`), `chat` (ferme), **`payouts`** (l'échéance de 14 jours court depuis ici), `identity` (`runs_called`) |
| `streaming.run.state_changed.v1` | `date_id`, `state`, `cause?` | `catalog` (carte publique) |
| `streaming.incident.raised.v1` / `.resolved.v1` | `date_id`, `kind`, `cause`, `message`, `content_language`, `triggered_by` (`manual`\|`auto`) | `catalog`, `notifications` (routé vers `regie`) |
| `streaming.replay.asset_ready.v1` | `date_id`, `duration_sec`, `available_from`, `expires_at` | **`catalog`** (la carte peut dire « rediffusion »), `ticketing` (mise en vente), `notifications` (« expire dans 6 h ») |
| `streaming.replay.expired.v1` | `date_id` | `catalog`, `ticketing` |
| `streaming.chapter.posted.v1` / `.removed.v1` | `date_id`, `chapter_id`, `vocab_id`, `at_media_sec` | `catalog` (fiche, rediffusion) |
| `streaming.viewer_count.sampled.v1` | `date_id`, `minute`, `viewers` | `catalog` (carte), statistiques. **Une fois par minute, pas par seconde** |

### 4.5 `chat`, `payouts`, `notifications`

| Événement | Propriétaire | Consommé par |
|---|---|---|
| `chat.date_chat_policy.changed.v1` | `chat` | `catalog` (la carte porte `chatMode`), temps réel |
| `chat.message.posted.v1` | `chat` | journal durable, rejeu de rediffusion, audit. **Pas la diffusion** — elle passe par Redis |
| `chat.message.state_changed.v1` | `chat` | temps réel (un message retiré doit disparaître de l'écran), journal |
| `chat.moderation.settled.v1` | `chat` | journal nominatif du studio |
| `chat.audience.sanctioned.v1` / `.lifted.v1` | `chat` | temps réel, journal |
| `payouts.payout.state_changed.v1` | `payouts` | `identity` (`channel_dues` : refuser la suppression d'une chaîne), `notifications` |
| `payouts.bank_change.requested.v1` / `.countersigned.v1` | `payouts` | `notifications` (routé vers `artist` **et** `treasury`) |
| `payouts.reconciliation.discrepancy_found.v1` | `payouts` | `notifications` (routé vers `treasury`) |
| `notifications.delivery.failed.v1` | `notifications` | journal ; nettoyage des jetons morts |

---

## 5. Politique de compatibilité

### 5.1 La règle

| Régime | Contextes | Porte de CI | Ce qui est permis |
|---|---|---|---|
| **stable** | `identity`, `catalog`, `ticketing` | `buf breaking --against '.git#branch=main'` **bloquant** | ajout de champ optionnel, ajout de valeur d'énumération, ajout de message. **Rien d'autre** |
| **provisoire** | `streaming`, `chat`, `payouts`, `notifications` | `buf lint` bloquant, `buf breaking` **en avertissement** | tout, jusqu'à l'arrivée du palier |

**Un contrat écrit pour une fonctionnalité construite dans six mois n'a reçu aucun retour du réel.
Le dire est plus honnête que de le figer.** Le passage de *provisoire* à *stable* est un geste
explicite : on retire la ligne d'exception du fichier de CI, le jour où le palier du contexte est
livré.

### 5.2 Les règles Protobuf qui ne se négocient pas, même en provisoire

1. **Ne jamais réutiliser un numéro de champ.** Un champ supprimé passe en `reserved`. C'est la
   seule faute Protobuf qui corrompt des données en silence.
2. **Ne jamais changer le type d'un champ**, ni le nom d'une valeur d'énumération. Une rupture de
   forme est un **nouveau type versionné à côté de l'ancien**, jusqu'à ce que les consommateurs
   aient migré.
3. **Toute énumération a une valeur zéro `_UNSPECIFIED`**, et un consommateur qui la reçoit doit la
   traiter comme **neutre**, jamais comme une erreur. C'est le même principe que le comportement
   exigé par `storefront-tv` devant une valeur inconnue — et en Protobuf, c'est natif : un membre
   inconnu arrive sous la forme de son numéro et ne fait rien échouer.
4. **Lire tolérant** : on ignore les champs inconnus, on ne « ferme » jamais un message.
5. **Le registre est en mode `BACKWARD`** : les **consommateurs montent d'abord**. C'est le bon
   choix ici parce qu'un producteur est un service que je déploie, et un consommateur peut être un
   projecteur dont le retard se voit.

### 5.3 Ce que zod ne fait pas ici

**Un événement décodé depuis Kafka n'est jamais revalidé par zod.** Le registre fait foi. zod vit
à la frontière HTTP, et seulement là. Mélanger les deux coûterait un second schéma à maintenir
pour zéro garantie de plus — et le décalage entre les deux serait la prochaine table parallèle
(E2).

---

## 6. Le flux qu'il faut pouvoir suivre du doigt

Le cas d'usage vertical que le dossier veut montrer à un lecteur, avec `traceparent` de bout en
bout :

```
POST /orders/seats                      bff-storefront   traceparent créé
  └─ POST /v1/orders/seats → ticketing  HTTP/JSON        traceparent en en-tête
       └─ TRANSACTION
            ├─ UPDATE date_sales SET seats_available = seats_available - 1   (invariant)
            ├─ INSERT seat (seat_code émis par le serveur)
            ├─ INSERT order
            ├─ INSERT processed_idempotency_key (clé + empreinte + réponse mémorisée)
            └─ INSERT outbox_event ×2   tracecontext = traceparent
       └─ COMMIT                        ← rien n'est publié avant
  ◄─ 201 { seat, date à jour }          la commande rend l'état projeté, pas un accusé

Debezium lit le WAL ──► arthome.ticketing.date_sales   clé date_id
                   └──► arthome.ticketing.order        clé order_id

catalog-projector      consomme availability_changed → date_card_public  (la jauge bouge)
catalog-indexer        consomme availability_changed → OpenSearch        (la facette bouge)
streaming-entitlement  consomme seat.activated       → entitlement_projection (le droit existe)
payouts-ledger         consomme order.paid           → payout_ledger     (le droit à versement)
notifications          consomme seat.activated       → rappel à T−30 min

Redis pub/sub ──► salle `date:{id}:state` ──► la jauge bouge sur les écrans ouverts
```

Sept conséquences, un seul appel synchrone, aucune communication entre services, et une trace
unique qui les relie toutes. C'est cette trace — et non le nombre de services — qui est le signal
technique du projet.
