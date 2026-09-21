# Transport BFF → service, et le contrat des appels synchrones

> **Statut** : accepté · **Date** : 21 septembre 2026 · **Auteur** : `backend-contracts`
> **Décide** : le transport des appels synchrones **BFF → service**, et la forme exacte de ces
> appels dans le transport retenu.
> **Ne décide pas** : le transport inter-services — il n'y en a pas, c'est Kafka et rien d'autre
> (`events.md`). Ni la forme des deux contrats de BFF, qui est dans `openapi/`.

---

## 0. La décision, en une ligne

> **HTTP/1.1 keep-alive, charges utiles JSON, décrites en OpenAPI 3.1 généré depuis zod.
> Un document OpenAPI par service, à côté des deux documents de BFF. Pas de gRPC.**

Et la contrepartie, écrite dans le même souffle parce que sans elle la décision est incomplète :
**un délai explicite voyage en en-tête sur chaque appel** (§5.3), et **chaque service le vérifie**,
exactement comme il devrait vérifier `call.cancelled` en gRPC.

---

## 1. Le nombre sur lequel je tranche — et ce que le compte de `backend-domain` mesure vraiment

`context-map.md` §10 donne un compte honnête et complet :

| | |
|---|---|
| méthodes de lecture distinctes | **60** |
| méthodes d'écriture distinctes | **132** |
| **total** | **192** |
| appels internes **par écran** | **1 à 4, tous parallèles** |
| `home`, `live`, `category`, `artist`, `search` | 4 (un modèle composé + trois surcouches par lot) |
| `player` | **1** |
| `confirm` | **0** |
| **profondeur d'une chaîne d'appels** | **1** |

**192 est un compte de *méthodes*. Ce n'est pas un compte d'*appels*.** Et les deux avantages
réels de gRPC — le **délai propagé** et le **multiplexage d'un flux** — ne paient ni l'un ni
l'autre sur un compte de méthodes. Ils paient sur la **profondeur d'une chaîne** et sur le
**volume d'un appel unitaire**.

Or la profondeur d'une chaîne, dans cette architecture, est **1**, et elle l'est **par
construction** : la règle « aucun appel synchrone entre services » est la première du projet. Un
délai n'a personne à qui se propager. Il n'y a **pas un seul point du système** où un service en
appelle un autre et doit lui transmettre le temps qu'il lui reste.

> **Le nombre qui tranche n'est donc pas 192. C'est 1 — la profondeur, et 4 — le fan-out
> parallèle maximal d'un écran.**

À profondeur 1 et fan-out 4, un `Promise.allSettled` de quatre requêtes HTTP avec quatre
`AbortSignal.timeout` fait, exactement, ce que feraient quatre appels gRPC avec quatre `deadline`.
La latence d'un écran est celle de l'appel le plus lent dans les deux cas.

**Ce que 192 mesure réellement**, c'est le coût de **décrire** et de **générer**. Et là, la
question n'est pas « gRPC ou HTTP », c'est « d'où vient le schéma ». Il vient de zod (décision
acquise), dans les deux cas.

---

## 2. Les quatre critères, pesés

### 2.1 Le délai — l'argument principal de gRPC, et il est plus faible qu'annoncé

`context-map.md` §10.3 l'écrit : *« un appel BFF → service a un délai (`deadline`) qui traverse et
se propage, ce qu'HTTP/JSON n'offre pas nativement »*. C'est exact sur le papier. Trois faits le
réduisent :

1. **Il ne se propage nulle part** : profondeur 1 (§1).
2. **En NestJS, il n'arrête pas le destinataire.** La skill `nestjs-grpc` est formelle (règle 7) :
   *« Nest ne coupe jamais un handler unaire, donc le travail et ses effets de bord survivent à
   `DEADLINE_EXCEEDED` »*. Il faut lire `call.cancelled` **à la main**, dans chaque handler long.
   C'est exactement le même travail que lire un en-tête de délai à la main. Le « gratuit » de gRPC
   ne l'est pas ici.
3. **Ce qu'on veut vraiment, c'est que l'appelant abandonne**, et qu'il le fasse avec un code
   exploitable. `AbortSignal.timeout(ms)` ferme la socket ; le service voit `req.destroyed` /
   `'close'` au même endroit où il aurait lu `call.cancelled`.

**Ce que je garde quand même de l'idée** : le délai n'est pas une durée locale décidée par
l'appelant dans son coin, c'est une **information de contrat**. Il voyage en en-tête, il est écrit
dans `openapi/`, et il fait partie de la définition de fini d'un service (§5.3).

### 2.2 Le typage et la génération — et le piège E2, à l'échelle du système

C'est ici que l'argument bascule, et c'est un argument que le compte ne donne pas.

`corrections-handoff.md` E2 établit le mode de défaillance dominant du projet : **la table
littérale parallèle**, commise sur huit champs par cinq maquettes malgré un principe explicite.
`code-conventions.md` §5.3 en fait sa section la plus importante et lui donne une porte.
`events.md` §5.3 en tire la règle : *« zod vit à la frontière HTTP, et seulement là. Mélanger les
deux coûterait un second schéma à maintenir pour zéro garantie de plus — et le décalage entre les
deux serait la prochaine table parallèle. »*

Comptons les **déclarations** d'un vocabulaire de frontière, par exemple `ChatMode` :

| | aujourd'hui | avec gRPC sur les 192 méthodes |
|---|---|---|
| union littérale `@arthome/core` | 1 | 1 |
| schéma zod de `@arthome/contracts` | **0** — `z.enum(CHAT_MODES)` **dérive**, il ne déclare pas | 0 |
| `.proto` d'**événement** | 1 — écrit à la main, la duplication que `events.md` assume | 1 |
| `.proto` de **service synchrone** | — | **1 de plus, écrit à la main** |
| **total de déclarations à tenir d'accord** | **2** | **3** |

Choisir gRPC pour la voie synchrone, c'est faire passer de **deux à trois** le nombre de
déclarations manuscrites de chaque vocabulaire fermé du système — et il y en a des dizaines.
C'est **+50 % de surface exposée à la faute dominante du projet**, contre un délai qui ne se
propage nulle part et qui n'arrête pas le destinataire de toute façon.

Et ce n'est pas seulement les énumérations : c'est chaque forme. `PlaybackTicket`, `WatchVerdict`,
`CartQuote`, `PayoutLine` existeraient en zod pour la frontière publique **et** en Protobuf pour la
frontière interne, sur la même donnée, dans le même dépôt.

**En HTTP/JSON, le schéma de la frontière BFF → service est le même objet zod que celui de la
frontière surface → BFF.** Un seul `z.object`, deux documents OpenAPI générés depuis lui. Zéro
déclaration de plus.

> C'est la vraie économie, et elle ne se voit pas dans un compte de méthodes.

### 2.3 L'exploitation par une personne seule

`context-map.md` §10.3 liste honnêtement ce que gRPC coûte ; je le reprends et je chiffre ce que
chaque ligne demande **en plus** d'une pile HTTP déjà nécessaire de toute façon (Traefik, les deux
BFF, les sept services qui exposent déjà un `/health`).

| Coût gRPC | Détail vérifié | Ce qu'il faut écrire ou configurer en plus |
|---|---|---|
| `h2c` à Traefik | HTTP/2 en clair vers les services, ou TLS interne | 7 `serversTransport` + le risque d'un `h2c` qui silencieusement retombe en HTTP/1 |
| pas de `curl` | `grpcurl`, ou la réflexion — **et la réflexion ne s'expose pas en production** (skill, règle 13) | un binaire de plus sur le poste, et un chemin de débogage qui n'existe pas en production |
| sondes | `grpc-health-check` + `HealthImplementation.addToServer` dans `onLoadPackageDefinition`, et la skill précise que **l'extrait de la documentation ne compile pas** (règle 13) | ~20 lignes × 7 services, et un `NOT_SERVING` à poser à l'arrêt |
| arrêt gracieux | `gracefulShutdown: true`, **non documenté** ; le défaut est `forceShutdown()`, qui coupe les appels en vol **à chaque déploiement** (règle 3) | un drapeau qu'on ne découvre qu'en lisant la skill, et un `max_connection_age_ms` + `_grace_ms` (règle 4) |
| équilibrage | Service *headless* + `grpc.service_config` `round_robin` — un ClusterIP **épingle un seul pod** (règle 5) | une configuration Kubernetes que la voie HTTP n'exige pas |
| erreurs | `Grpc*Exception` + `GrpcExceptionFilter`, et **le filtre standard ne journalise pas** : toute erreur inattendue est un `UNKNOWN` silencieux (règles 1–2) | un filtre maison × 7, plus la table de correspondance vers notre enveloppe |
| construction | les `.proto` ne sont pas compilés : `"assets"` dans `nest-cli.json`, sinon **le service démarre et échoue au premier appel** (`code-conventions.md` §6.5) | un piège silencieux de plus |
| limites | `maxReceiveMessageLength` (défaut 4 Mio) sur le récepteur | un réglage à ne pas oublier sur les lectures groupées |

**Huit pièges, dont cinq sont silencieux** — ils ne cassent pas la construction, ils cassent la
production. Pour une personne seule qui exploite sept services, c'est le critère décisif et
`context-map.md` §10.3 le nomme déjà.

À mettre en face, le coût honnête d'HTTP/JSON : **il n'y a pas de générateur de client gratuit
fourni par `buf`**. Mais il y en a un fourni par OpenAPI, et surtout : le client BFF → service est
**typé par le même `z.infer` que le reste du dépôt**, sans génération du tout à l'intérieur de
`arthome-platform`. La génération ne sert que les cinq surfaces, et elles consomment les deux
documents de BFF, pas ceux des services.

### 2.4 Le jour où ça casse, à 20 h 45, pendant un direct

C'est le critère que les tableaux ne portent pas et qui compte le plus ici.

Un incident en cours de diffusion : le studio affiche « nos serveurs », la régie appelle. La
question est « quel service refuse, et avec quel code ». Avec HTTP/JSON, la réponse tient en une
ligne de terminal :

```sh
curl -sS -H "authorization: Bearer $(arthome mint-token streaming)" \
     -H "traceparent: 00-$(openssl rand -hex 16)-$(openssl rand -hex 8)-01" \
     http://streaming.internal/v1/dates/$DATE_ID/run | jq .
```

Avec gRPC, la même question demande `grpcurl`, le descripteur du service (puisque la réflexion
n'est pas exposée en production), et la reconstruction d'une `Metadata`. Ce n'est pas impossible ;
c'est plus long au moment précis où le temps manque, et c'est un chemin qu'on n'a pas répété.

**`storefront-tv` a formulé la même exigence par l'autre bout** : *« toute réponse du système, y
compris en surcharge, doit porter l'enveloppe d'erreur avec son code et son identifiant de
trace »*. Cette exigence remonte jusqu'à Traefik. Avec une voie interne HTTP, Traefik, les BFF et
les sept services parlent **une seule langue d'erreur** — la nôtre. Avec gRPC, il y a la langue de
Traefik (HTTP), celle des BFF (HTTP) et celle des services (16 statuts gRPC), plus une table de
correspondance à tenir dans chaque adaptateur de BFF.

---

## 3. La décision, et ce qu'elle n'est pas

**Retenu : HTTP/1.1 avec keep-alive, JSON, OpenAPI 3.1 généré depuis zod.**

**Ce que ce n'est pas** :

- ce n'est **pas** un rejet de Protobuf. Protobuf reste le format de **tout** ce qui passe par
  Kafka, avec `buf`, le registre et `RecordNameStrategy` — `events.md` ne bouge pas d'une ligne.
  Deux frontières, deux formats, et **chacune n'en a qu'un** ;
- ce n'est **pas** REST au sens « ressources pures ». Une commande métier est une commande :
  `POST /v1/dates/{dateId}/publication/transitions` est un verbe, il est assumé, et son
  `operationId` est `moveDatePublicationState`. On ne tord pas une machine à états en `PATCH` ;
- ce n'est **pas** « HTTP/2 interdit ». Si Traefik et Node négocient HTTP/2 un jour, rien ne
  change au contrat. On ne le **configure** pas aujourd'hui parce qu'on n'en a pas besoin :
  4 requêtes parallèles tiennent dans le pool keep-alive d'un agent HTTP/1.1 sans coût mesurable.

**Le seul endroit où gRPC gagnerait** est celui que `context-map.md` §10.3 nomme : les lectures
groupées par lot d'identifiants. Elles sont traitées en HTTP par **une requête `POST` de lecture**
(§5.6), ce qui est laid dans le vocabulaire REST et parfaitement juste dans le nôtre : un lot de
200 identifiants ne rentre pas dans une chaîne de requête, et la réponse est une table, pas une
liste.

---

## 4. Ce qu'on perd, et comment on le compense

| Perdu avec gRPC écarté | Compensation écrite | Où |
|---|---|---|
| délai natif traversant | en-tête `x-arthome-deadline`, instant RFC 3339, **vérifié par le service** | §5.3 |
| annulation côté destinataire | identique en gRPC (règle 7) : `req.on('close')` au lieu de `call.cancelled` | §5.3 |
| binaire compact | JSON + `content-encoding: gzip` sur les réponses > 1 Kio. Les charges utiles internes sont des modèles de lecture de quelques dizaines de Kio, pas des flux | §5.7 |
| statuts typés | table de correspondance **unique**, dans `@arthome/contracts`, entre code d'erreur de domaine et statut HTTP | §5.5 |
| génération de client par `buf` | génération par OpenAPI pour les cinq surfaces ; `z.infer` à l'intérieur de `arthome-platform`, sans génération | §5.8 |
| streaming bidirectionnel | il n'y en a aucun dans le compte de `backend-domain`. Le temps réel est Socket.IO (`realtime.md`), pas une voie BFF → service | — |

---

## 5. Le contrat des appels synchrones BFF → service

Cette section **est** le contrat. Elle vaut pour les 192 méthodes, et un service qui ne la
respecte pas n'est pas fini (`definition-of-done.md`).

### 5.1 Adressage et forme des chemins

```
http://<service>.internal/v<major>/<ressource>[/<id>][/<sous-ressource>][/<commande>]
```

- `<service>` ∈ `identity · catalog · ticketing · streaming · chat · payouts · notifications` ;
- **jamais de TLS interne** au palier 1 : le réseau du cluster est la frontière de confiance, et
  l'autorisation est portée par le jeton (§5.2), pas par le transport. Le jour où le cluster est
  partagé, `credentials` se pose sans toucher au contrat ;
- `v<major>` est la **version majeure du contrat du service**, indépendante de celle des BFF ;
- une **lecture** est `GET`, sauf lecture par lot (§5.6) ;
- une **commande** est `POST` sur un chemin qui la nomme, ou `PUT`/`PATCH`/`DELETE` quand la
  commande *est* une mise en état (`PUT /v1/follows/{artistId}`, et `storefront-mobile` a raison :
  une relation est une mise en état, jamais une bascule).

**`operationId` est stable et il est la clé de la génération de client.** Forme :
`<verbe><Objet>[<Qualificatif>]`, en `lowerCamelCase`, unique dans tout le document. Il ne change
**jamais** sans changement majeur, même si la méthode TypeScript qui l'implémente est renommée —
la skill `nestjs-openapi` le nomme comme le piège n°1 de la génération de client. Il est donc
**écrit explicitement** (`operationIdFactory` épinglé), jamais dérivé du nom de méthode.

### 5.2 Les en-têtes de requête

| En-tête | Obligatoire | Contenu | Motif |
|---|---|---|---|
| `authorization` | **oui** | `Bearer <JWT ES256 ~60 s>`, frappé par le BFF, `aud: arthome.<service>` | `adr-auth.md` §8. Un jeton frappé pour `ticketing` est **refusé** par `payouts` |
| `traceparent` | **oui** | W3C, créé au BFF, propagé sans modification | `events.md` §1.3 ; c'est lui qu'on injecte dans `outbox_event.tracecontext` |
| `x-arthome-deadline` | **oui** | instant RFC 3339 UTC, `2026-09-21T20:45:13.400Z` | §5.3 |
| `idempotency-key` | **sur toute écriture d'argent ou d'engagement** | UUIDv7 généré **par la surface**, relayé tel quel | §5.4 |
| `x-arthome-actor-surface` | sur toute écriture humaine | `storefront-web · storefront-mobile · storefront-tv · studio-web · studio-mobile · system` | le journal du studio est nominatif **et situé** (`common.proto` `Surface`) |
| `accept-encoding` | recommandé | `gzip` | §5.7 |

**Jamais `x-user-id`, ni `x-roles`, ni aucun en-tête d'identité en clair.** N'importe quel appelant
peut les poser ; la skill `nestjs-bff-gateway` en fait sa règle 7 et `adr-auth.md` §8 la répète.
L'identité est **dans le jeton, et nulle part ailleurs**.

**Et le corollaire, qui est une règle critique** : un service **ne saute jamais son autorisation**
parce que « seul le BFF l'appelle ». Chaque commande porte l'identifiant de la ressource visée, et
le service vérifie la propriété **sur l'instance chargée** — pas seulement le rôle porté par le
jeton, parce qu'un accès ponctuel à une date expire pendant la durée de vie du jeton
(`adr-auth.md` §7).

### 5.3 Le délai — comment il remplace `deadline`

```
x-arthome-deadline: 2026-09-21T20:45:13.400Z
```

**Trois obligations, une par bout :**

1. **Le BFF le calcule** à partir du budget de l'écran (§5.9) et le pose sur chacun des appels
   parallèles. Il arme le même instant en local par `AbortSignal.timeout`, de sorte que
   l'abandon local et l'abandon distant sont le même instant.
2. **Le service le lit** et l'applique en deux points : **avant** d'ouvrir une transaction ou de
   lancer une requête coûteuse, et **entre** les unités d'un traitement itératif. S'il est dépassé,
   il rend `504` avec le code `DEADLINE_EXCEEDED` et **n'écrit rien**.
3. **Le service écoute la fermeture de la socket** (`req.on('close')` avant la fin de la réponse)
   et arrête ce qu'il peut arrêter. C'est exactement le travail que `call.cancelled` demande en
   gRPC (skill `nestjs-grpc`, règle 7) ; la voie HTTP ne le rend ni plus ni moins nécessaire.

**Le délai n'est pas une suggestion et il ne se re-négocie pas.** Un service qui reçoit un délai
déjà passé refuse immédiatement : c'est moins cher qu'un travail dont personne n'attend le
résultat.

**Pourquoi un instant et non une durée.** Une durée (`grpc-timeout: 800m`) suppose que les deux
horloges avancent au même rythme, ce qui est vrai, mais elle perd le temps déjà consommé par le
réseau. Un instant absolu est **la même valeur pour les quatre appels parallèles d'un écran**, ce
qui rend le budget d'écran lisible dans un journal. Les horloges sont disciplinées par NTP avec la
même tolérance de ± 30 s que les jetons (`adr-auth.md` §9.4).

### 5.4 L'idempotence — et la question que `storefront-web` pose (Q9), tranchée

**La décision : une clé rejouée rend la réponse de la première tentative, verbatim. Jamais une
erreur de doublon.**

Le motif est celui de `storefront-web`, et il est juste : **c'est la différence entre une reprise
sûre et une place perdue.** Un rejeu qui échoue transforme un hoquet de réseau en échec d'achat,
alors que l'achat a réussi. Sur mobile, où la bascule Wi-Fi → cellulaire coupe une requête au
milieu sans que le client sache si l'écriture a abouti, c'est le cas **nominal**, pas le cas
dégradé.

**Le magasin, par service** :

```
idempotency_record
  key             text      ← l'en-tête, tel que reçu
  account_id      uuid      ← la clé est scopée au compte : deux comptes ne se collisionnent pas
  fingerprint     text      ← empreinte canonique (méthode + chemin + corps normalisé)
  state           in_flight | completed
  status_code     int       ← mémorisés à la fin de la transaction
  response_body   jsonb
  created_at      timestamptz
  expires_at      timestamptz   ← created_at + 24 h
  PRIMARY KEY (account_id, key)
```

**Les quatre cas, et il n'y en a pas un cinquième :**

| Cas | Réponse | Motif |
|---|---|---|
| clé inconnue | exécution normale ; la ligne `idempotency_record` est écrite **dans la transaction métier** | sans cela, un plantage entre l'écriture et la mémorisation rejoue l'effet |
| clé connue, `completed`, **même empreinte** | la réponse d'origine, **verbatim**, avec `idempotency-replayed: true` | la réponse est la preuve que l'effet a eu lieu |
| clé connue, `completed`, **empreinte différente** | `409` `IDEMPOTENCY_KEY_REUSED`, rien n'est exécuté | la clé promettait un effet ; en servir un autre serait pire que refuser |
| clé connue, `in_flight` | `409` `IDEMPOTENCY_IN_FLIGHT`, paramètre `retryAfterMs` | jamais deux exécutions concurrentes de la même intention |

**Trois précisions qui font la différence :**

- **`24 h` de durée de vie**, alignée sur la file hors ligne de `storefront-mobile` (Q7) : une
  commande mise en file le soir et rejouée le lendemain matin doit retomber sur la même réponse ;
- **une réponse rejouée n'est pas une réponse fraîche.** Le corps est verbatim, donc son `servedAt`
  est celui de la première tentative. La réponse porte en plus un en-tête
  `x-arthome-served-at` **du rejeu**, et le client qui a besoin d'une valeur périssable relit. Un
  rejeu prouve qu'un effet a eu lieu ; il ne promet pas une donnée à jour ;
- **la clé est générée par la surface, avant l'envoi, et persistée avant l'envoi**
  (`storefront-mobile`). Le BFF la relaie **sans la réécrire** : une clé régénérée par le BFF ne
  protège de rien, puisque c'est le client qui rejoue.

**Ce qui ne porte PAS de clé d'idempotence, et c'est une décision** : `recordPlaybackPosition`.
C'est l'écriture la plus fréquente du système ; une clé par tranche de 30 s, par spectateur et par
direct, ferait du magasin d'idempotence la table la plus chaude de `streaming` pour protéger une
écriture dont la perte est sans conséquence. Elle est **dernier écrivain gagne, avec un rang
serveur** (`data-model.md` §5.5).

### 5.5 L'enveloppe de réponse et l'enveloppe d'erreur

**Toute réponse de succès** porte, au niveau racine :

```jsonc
{
  "servedAt": "2026-09-21T20:31:04.118Z",  // TOUJOURS. Tout décompte s'y réfère
  "validUntil": "2026-09-21T20:31:34.118Z", // dès qu'une valeur périssable est présente
  "data": { }                               // ou "items" + "page" pour une collection
}
```

et, quand c'est applicable : `version` (sur tout agrégat qu'une commande conditionnelle pourra
viser) et `lastEventSeq` (sur tout modèle de lecture alimenté par un flux).

**Toute réponse d'erreur**, du service, du BFF **et de Traefik**, porte exactement ceci :

```jsonc
{
  "error": {
    "code": "TRANSITION_IRREVERSIBLE",       // vocabulaire fermé, i18n par codes
    "nature": "refused",                     // refused | unavailable | offline_forbidden
    "params": { "from": "scheduled", "to": "reserve", "promise": "prices_engaged" },
    "traceId": "4bf92f3577b34da6a3ce929d0e0e4736"
  },
  "servedAt": "2026-09-21T20:31:04.118Z"
}
```

- **`code` est un code, jamais une phrase.** Un échec de validation zod se traduit en
  `SCHEMA_INVALID` avec les chemins de champ en `params` — **jamais** le message anglais de zod ;
- **`traceId` est la partie `trace-id` du `traceparent`**, lisible et recopiable depuis l'écran
  d'erreur. Sur mobile c'est le seul lien entre « mon application a planté » et un journal serveur ;
- **`nature` est ce que `studio-mobile` exige**, et c'est la décision qu'une personne en garde doit
  prendre en dix secondes. **Le serveur n'émet jamais `offline_forbidden`** : c'est la nature d'un
  refus **local**, produit par la surface avant tout envoi. Elle est dans le vocabulaire pour que la
  surface n'ait qu'**une** forme d'erreur à rendre, pas deux.

**La table de correspondance statut ↔ nature, unique, dans `@arthome/contracts` :**

| Statut | `nature` | Codes typiques |
|---|---|---|
| `400` | `refused` | `SCHEMA_INVALID`, `PERIOD_FILTER_REQUIRED` |
| `401` | `refused` | `UNAUTHENTICATED`, `TOKEN_EXPIRED` |
| `403` | `refused` | `FORBIDDEN`, `SORT_KEY_FORBIDDEN`, `RIGHTS_VERSION_STALE`, `PAIRING_IDENTITY_MISMATCH` |
| `404` | `refused` | `NOT_FOUND` |
| `409` | `refused` | `STATE_CONFLICT`, `TRANSITION_IRREVERSIBLE`, `MODERATION_ALREADY_SETTLED`, `PRICE_STALE`, `SOLD_OUT`, `IDEMPOTENCY_KEY_REUSED`, `IDEMPOTENCY_IN_FLIGHT`, `CAPACITY_SHRINK_FORBIDDEN` |
| `410` | `refused` | `CURSOR_TOO_OLD`, `PAIRING_EXPIRED`, `REPLAY_EXPIRED` |
| `429` | `unavailable` | `RATE_LIMITED`, `CHAT_RATE_LIMITED` (param `retryAfterMs`) |
| `500` | `unavailable` | `INTERNAL` — **jamais** le message de l'erreur d'origine |
| `502` | `unavailable` | `UPSTREAM_ERROR` (le BFF, pour un service en échec) |
| `503` | `unavailable` | `SERVICE_UNAVAILABLE` (arrêt en cours, dépendance absente) |
| `504` | `unavailable` | `DEADLINE_EXCEEDED`, `UPSTREAM_TIMEOUT` |

**Le BFF ne relaie jamais une erreur de service telle quelle** (skill `nestjs-bff-gateway`,
règle 6). Il mappe une **liste blanche** de codes de domaine, qui traversent avec leur `params`, et
tout le reste devient `UPSTREAM_ERROR` / `UPSTREAM_TIMEOUT`, l'original étant journalisé avec le
`traceId`. La liste blanche est dans `@arthome/contracts` : un code qui n'y est pas ne peut pas
atteindre une surface, ce qui interdit à un message interne de fuir.

**Traefik est dans le périmètre.** Il doit servir cette enveloppe sur les 5xx qu'il produit
lui-même (`errors` middleware vers un service statique), avec `nature: "unavailable"` et
`code: "GATEWAY_UNAVAILABLE"`. Une page HTML brute rendrait impossible la distinction « votre
connexion » / « nos serveurs », et `storefront-tv` a raison : le spectateur ira redémarrer sa box.

### 5.6 Les lectures — et la lecture par lot

**Une lecture simple est un `GET`**, cacheable, avec sa fraîcheur déclarée (§5.9).

**Une lecture par lot est un `POST` sur `/batch`**, et c'est assumé :

```http
POST /v1/viewer-overlay/batch
content-type: application/json

{ "profileId": "…", "dateIds": ["…", "…", … ] }   // jusqu'à 200
```

```jsonc
{
  "servedAt": "…",
  "validUntil": "…",
  "data": { "<dateId>": { "owned": true, "watchVerdict": { … } }, … }   // une TABLE, pas une liste
}
```

Trois raisons, dans l'ordre : 200 identifiants ne tiennent pas dans une chaîne de requête ; la
réponse est une **table indexée** que le BFF fusionne par identifiant sans la parcourir ; et un
`GET` avec un corps n'est pas transportable de façon fiable. **Ces lectures ne sont pas
cacheables par HTTP** — elles le sont dans le Redis du BFF, par profil, TTL 30 s, invalidé par les
écritures du profil (`context-map.md` §10.1).

**Ce sont exactement les trois surcouches** de §10.1 : `ticketing.getViewerOverlayBatch`,
`identity.getViewerRelationsBatch`, `streaming.getViewerProgressBatch`. Il n'y en a pas d'autres,
et **il ne doit jamais y en avoir une quatrième sans que le seuil de `context-map.md` §11(a) soit
franchi** : au-delà de quatre appels internes sur un écran de liste, ce n'est pas une surcouche
qui manque, c'est un modèle de lecture.

**Le corollaire, et c'est une ligne de `definition-of-done.md`** : une lecture par lot ne prend
**jamais** un identifiant à la fois. Un service qui expose `getViewerOverlay(dateId)` sans son lot
sera appelé par carte, et le BFF deviendra épais.

### 5.7 Négociation, compression, taille

- `content-type: application/json; charset=utf-8`, toujours. Pas de négociation de format : un
  seul format, c'est une chose de moins qui diverge ;
- **`gzip` sur toute réponse de plus de 1 Kio.** Les modèles de lecture composés (`home` = 60 à
  100 cartes ≈ 50 à 90 Kio bruts) descendent sous 15 Kio ; c'est l'ordre de grandeur que la TV peut
  tenir sur un démarrage à froid de 5 s ;
- **plafond de corps en entrée : 1 Mio**, sauf `/batch` (2 Mio). Un service qui reçoit plus refuse
  en `413` `PAYLOAD_TOO_LARGE` ;
- **aucun binaire ne traverse cette voie.** Une affiche, un export FEC, une facture passent par
  une **adresse signée de courte durée** obtenue par une commande JSON (`data-model.md` §7.5,
  `studio-mobile` Q9 : dépôt 15 min, export 60 min). Pas de `multipart` depuis un WebView, pas de
  PDF dans une réponse d'API.

### 5.8 Le client, côté BFF

Un **adaptateur par service**, et rien d'autre ne parle HTTP dans un BFF. Chaque adaptateur :

1. **borne l'appel** — `AbortSignal.timeout` aligné sur `x-arthome-deadline`, plus serré pour une
   partie facultative (skill `nestjs-bff-gateway`, règle 5) ;
2. **lance en parallèle** — `Promise.allSettled`, jamais `Promise.all` : une surcouche facultative
   qui échoue **dégrade** la réponse et se nomme dans la charge utile
   (`degraded: ["viewerProgress"]`), elle ne coule pas l'écran (règle 4). Le modèle composé, lui,
   est **obligatoire** : son échec est l'échec de la requête ;
3. **mappe l'erreur** (§5.5), et **journalise l'originale** — Nest ne journalise jamais une
   `HttpException` ;
4. **ne rejoue rien.** La reprise est à **une seule couche**, et c'est la surface : elle a la clé
   d'idempotence, elle sait si l'utilisateur attend encore, et un rejeu de BFF sur une écriture
   dupliquerait un travail que le service a peut-être terminé.

**Ce qu'un adaptateur ne fait pas** : calculer un prix, une remise, un droit, un ordre de rangée,
un seuil. `decideWatch` en mode **indicatif** est la seule règle qu'un BFF évalue, et le contrat le
déclare `advisory: true` sur le champ (`context-map.md` §3).

**Typage.** À l'intérieur de `arthome-platform`, le client d'un service est typé par le
`z.infer<typeof …>` de `@arthome/contracts` — **aucune génération**. Les cinq surfaces, elles,
génèrent leur client depuis `openapi/storefront.yaml` ou `openapi/studio.yaml`.

### 5.9 Budgets et fraîcheur — ce que le contrat promet

**Budgets de latence** (p95, du BFF au service, délai compris) :

| Chemin | Budget | Motif |
|---|---|---|
| `streaming.openPlayback` | **≤ 1 s** | dans un budget total de ~10 s jusqu'à la première image (`storefront-tv`) |
| lecture publique composée (`home`, `live`, `category`, `artist`) | **≤ 400 ms** | seuil d'alerte de `context-map.md` §11(a) |
| lecture par lot (surcouche) | ≤ 150 ms | quatre en parallèle sous le budget de l'écran |
| écriture d'argent | ≤ 2 s | une transaction, une jauge, un magasin d'idempotence |
| recherche | **≤ 200 ms** | sinon le retour visuel de la frappe TV décroche (`storefront-tv`) |

**Fraîcheur garantie par famille** — `data-model.md` §4, reprise ici parce que c'est le BFF qui la
pose en `cache-control` et la surface qui la mappe sur son cache client :

| Famille | Fraîcheur | `cache-control` posé par le BFF |
|---|---|---|
| taxonomie, libellés | artefact immuable | `public, max-age=86400, immutable` |
| `category`, `artist`, `plans`, `account` | 5 min | `private, max-age=300` |
| `home`, `tickets`, `list`, `replays` | 60 s | `private, max-age=60` |
| `live`, jauge, compteur | 15 s | `private, max-age=15` |
| `PlaybackTicket`, `WatchVerdict`, clé de flux | **jamais** | **`no-store`** |

`no-store` sur la clé de flux et le jeton de lecture n'est pas une optimisation : c'est ce qui les
tient hors du cache HTTP du téléphone et hors de l'instantané d'application pris par le système au
passage en arrière-plan (`data-model.md` §5.2).

### 5.10 Santé et arrêt

| Point d'entrée | Ce qu'il dit | Qui le lit |
|---|---|---|
| `GET /health/live` | le processus répond | l'orchestrateur (redémarrage) |
| `GET /health/ready` | base joignable, migrations à niveau, consommateur Kafka dans son groupe | l'orchestrateur (routage) |
| `GET /health/ready` pendant l'arrêt | **`503` immédiatement**, avant de fermer quoi que ce soit | c'est ce qui vide le pool de Traefik avant la première socket coupée |

`app.enableShutdownHooks()`, et l'ordre est : `ready` → 503, attendre la fenêtre de purge, fermer
le serveur HTTP, **puis** arrêter le consommateur Kafka, **puis** fermer la base.

C'est trois points d'entrée HTTP qu'un service expose de toute façon, contre `grpc-health-check` et
son `HealthImplementation.addToServer` — dont la skill signale que l'extrait de la documentation ne
compile pas. C'est un des huit pièges du §2.3, et le plus visible à chaque déploiement.

### 5.11 Versionnement et maturité — la distinction portée dans les contrats

| Contexte | Régime | Porte de CI sur son OpenAPI |
|---|---|---|
| `identity`, `catalog`, `ticketing` | **stable** | `oasdiff breaking` **bloquant** : ajout seulement |
| `streaming`, `chat`, `payouts`, `notifications` | **provisoire** | `oasdiff` en **avertissement**, `oasdiff changelog` journalisé |

C'est la même coupe que `buf.yaml` pour les événements, avec la même règle de sortie : on retire
la ligne d'exception **le jour où le palier du contexte est livré**, jamais avant.

**Ce que « stable » autorise, et rien d'autre** : ajouter un point d'entrée, ajouter une propriété
**optionnelle** à une réponse, ajouter une valeur à une énumération, ajouter un paramètre
**optionnel**. Tout le reste est un `v2` du service, servi **à côté** du `v1` jusqu'à ce que les
deux BFF aient migré.

**Et la règle qui rend une énumération extensible sans casser un téléviseur** (`storefront-tv`
Q12, `context-map.md` §13) : une valeur d'énumération inconnue est **conservée brute et traitée
comme neutre**, jamais rejetée. Côté zod, un `z.enum()` nu **ne le fait pas** — il faut
`z.union([z.enum(VALUES), z.string()])` en **sortie** (lecture tolérante), et `z.enum(VALUES)` en
**entrée** (écriture stricte). Les deux ne sont pas le même schéma, et `io: "input"` / `io:
"output"` de `z.toJSONSchema()` est exactement ce qui les sépare. Se tromper produit une
documentation fausse dans les deux sens.

---

## 6. Le signal qui ferait changer d'avis, écrit maintenant

Une décision de transport sans condition de révision est une préférence. Voici les trois, et elles
sont mesurables :

| Mesure | Seuil | Geste |
|---|---|---|
| `bff_upstream_calls_per_request` p95 sur un écran de liste | **> 4 soutenu** | ce n'est **pas** un signal de transport : c'est un modèle de lecture qui manque (`context-map.md` §11a). On le crée **avant** de rouvrir cette décision |
| profondeur d'une chaîne d'appels synchrones | **> 1** | la règle « aucun appel synchrone entre services » a cédé. **Rétablir la règle**, et seulement si c'est impossible, rouvrir gRPC — car c'est le seul cas où le délai propagé paie |
| taille p95 d'une réponse de lecture composée, gzip appliqué | **> 300 Kio** | le coût de sérialisation JSON commence à peser sur la TV. Mesurer avant de conclure : c'est plus probablement un modèle de lecture trop large |

**Ce qui ne serait pas un signal** : « il y a maintenant 250 méthodes ». Le compte de méthodes n'a
jamais été l'argument (§1).

---

## 7. Deux points que je remonte, sans les corriger

1. **`events.md` §6 dessine le flux vertical avec `ticketing.PurchaseSeat  gRPC  traceparent en
   Metadata`.** C'est une anticipation de `backend-domain` sur une décision que `context-map.md`
   §10.3 lui laissait explicitement. Le flux est juste dans tout le reste ; seules deux lignes
   nomment le transport. Elles deviennent :
   `POST /v1/orders/seats  ·  HTTP/JSON  ·  traceparent en en-tête`. **Je ne touche pas au fichier
   d'un coéquipier** — à arbitrer par le chef.
2. **Le générateur de client n'a pas de propriétaire.** Les cinq surfaces consomment
   `openapi/storefront.yaml` ou `openapi/studio.yaml` ; personne n'a été désigné pour choisir
   l'outil, l'épingler et décider où le client généré est publié (un paquet de plus dans
   `arthome-core` ? un dossier `src/generated/**` par surface, déjà exempté du lint par
   `code-conventions.md` §4.4 ?). Ma recommandation est la seconde — un client généré n'est pas un
   contrat, c'est une commodité de surface, et le publier créerait une troisième chose à faire
   tourner. À attribuer.
