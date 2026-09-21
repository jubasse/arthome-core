# Définition de fini

> Ce qu'un service livre pour être « terminé ». Écrit par `backend-contracts`.
>
> **Portée** : les sept services de `arthome-platform`, les deux BFF, et les trois paquets publiés
> de `arthome-core`.
>
> **Frontière avec les deux autres documents** : les règles métier impératives sont dans
> `critical-rules.md` (moins de vingt lignes, relues à chaque session) ; le style, le nommage,
> l'outillage et les portes de qualité de code sont dans `code-conventions.md`. **Ce document ne
> les recopie pas, il y renvoie.**

---

## 0. Les deux principes qui commandent tout ce qui suit

**1. Rien ne s'écrit à la main.** Pour chaque artefact, ce document dit **qui le génère et
quand**. Un artefact écrit à la main est un artefact qui dérivera de sa source — c'est E2, la
faute dominante du projet, appliquée à la documentation.

**2. Une règle sans porte est une intention.** Chaque ligne ci-dessous nomme la commande qui la
vérifie, et toutes se lancent **en local** : le quota d'Actions du compte est épuisé, et aucune
porte de ce document ne suppose un exécuteur distant.

Les deux se rejoignent dans une seule commande par service :

```bash
pnpm --filter <service> run done
```

qui enchaîne, dans cet ordre — du plus rapide et du plus explicatif au plus lent :

```jsonc
{
  "scripts": {
    "done": "pnpm run verify && pnpm run contracts:check && pnpm run test:integration && pnpm run trace:check"
  }
}
```

`verify` est celui de `code-conventions.md` §8.2 — versions, conflit Prettier, formatage, lint,
typage, énumérations, tests unitaires. Ce document ajoute les trois autres.

---

## 1. Les artefacts, et qui les produit

| Artefact | Source | Générateur | Quand | Porte |
|---|---|---|---|---|
| `openapi/<service>.yaml` | schémas zod de `@arthome/contracts` | `z.toJSONSchema()` + un script `contracts:emit` | à chaque `build` du service | §2 |
| `openapi/storefront.yaml`, `openapi/studio.yaml` | idem, côté BFF | idem | idem | §2 |
| `asyncapi/<service>.yaml` | le catalogue `proto/` + `events.md` | script `asyncapi:emit`, depuis les descripteurs `buf` | à chaque `build` | §3 |
| clients TypeScript des cinq surfaces | les deux OpenAPI de BFF | générateur OpenAPI, sortie dans `src/generated/**` | à chaque montée de contrat | §6 |
| types internes BFF → service | `z.infer<typeof …>` | **aucun générateur** | — | §6 |
| `.d.ts` de `@arthome/core`, `@arthome/contracts`, `@arthome/tooling` | TypeScript | `tsc` | à chaque `build` | `code-conventions.md` §2.4 |
| artefacts i18n `/{surface}/{locale}/v{N}.json` | catalogue de `@arthome/core` | travail de CI, publication immuable sur MinIO → CDN | à chaque changement de copie | §7.5 |
| artefacts de taxonomie `/taxonomy/{locale}/v{N}.json` | `@arthome/core` | idem | idem | §7.5 |
| **document JWKS statique** | **quatre** rotations, une par émetteur, plus un assembleur sans secret | 30 j / grâce 24 h (BFF) · 90 j / grâce 7 j (lecture, appareil) | **§7.6** |

> **La règle, formulée une fois** : un artefact généré est **commité**, et la porte vérifie que sa
> régénération ne produit **aucun diff**. Committé sans porte, il dérive ; généré sans être
> commité, on ne peut pas le relire dans une revue ni le comparer à la version précédente.

---

## 2. Un OpenAPI par service, et deux pour les BFF

### 2.1 Ce qui est exigé

- **OpenAPI 3.1.1**, un document par service et un par BFF. Les documents de BFF sont dans
  `openapi/` de `arthome-core` (c'est le contrat public) ; ceux des services vivent dans
  `arthome-platform`, à côté du service qu'ils décrivent.
- **Généré depuis zod**, jamais écrit à la main. Trois pièges, et ils sont dans le générateur :
  - **`z.date()` et `z.transform()` sont inconvertibles.** Les instants sont des chaînes ISO
    `date-time` ; **aucun schéma de frontière ne porte de transformation**. Un `z.transform()`
    découvert dans un schéma de frontière fait **échouer la génération**, il ne l'ignore pas ;
  - **`io: "input"` décrit une requête, `io: "output"` décrit une réponse.** Se tromper produit
    une documentation fausse dans les deux sens ;
  - **un vocabulaire fermé n'a pas la même forme en entrée et en sortie.** En **entrée**,
    `z.enum(VALUES)` strict. En **sortie**, `z.union([z.enum(VALUES), z.string()])`, documenté par
    `x-arthome-vocabulary` — une valeur inconnue est **conservée brute et traitée comme neutre**,
    jamais rejetée. Un `z.enum()` nu en sortie ferait échouer la **page entière** d'un téléviseur
    le jour où le catalogue gagne une 22ᵉ discipline.
- **`operationId` stables et explicites.** `operationIdFactory` est épinglé ; l'identifiant est
  écrit, jamais dérivé d'un nom de méthode. Renommer une méthode TypeScript ne doit **jamais**
  renommer une fonction de client généré.
- **Enveloppe d'erreur en composant partagé.** Toute réponse 4xx/5xx référence
  `#/components/responses/*` ou `#/components/schemas/ErrorEnvelope`. Aucune forme d'erreur locale.
- **Exemples sur les requêtes et sur les réponses.** Toute opération ayant un corps de requête
  porte un exemple ; toute réponse 2xx porte un exemple. Un contrat sans exemple se lit deux fois
  plus lentement et se teste deux fois moins.
- **Maturité déclarée** : `x-arthome-maturity: stable | provisional` sur **chaque** opération.
- **Service amont déclaré** : `x-arthome-upstream: [<service>…]` sur chaque opération d'un BFF.
  C'est ce qui rend vérifiable la règle « au plus quatre appels internes par écran ».

### 2.2 La porte anti-dérive

```bash
pnpm --filter <service> run contracts:emit -- --out /tmp/openapi.regen.yaml
diff -u openapi/<service>.yaml /tmp/openapi.regen.yaml    # doit être vide
```

En pratique, dans le script :

```jsonc
{ "contracts:check": "pnpm run contracts:emit && git diff --exit-code -- openapi/ asyncapi/" }
```

**Un service dont le document régénéré diffère du document commité n'est pas fini.** C'est la
même discipline que la porte n°8 de `code-conventions.md` sur les `.d.ts`.

### 2.3 La porte de conformité aux règles du projet

Un vérificateur en Python, sans dépendance hors PyYAML, à committer en
**`tools/check-openapi.py`** dans `arthome-core` et exposé comme `bin` de `@arthome/tooling` :

```bash
python3 tools/check-openapi.py openapi/*.yaml
```

Quinze règles, chacune parce qu'elle a une conséquence :

| # | Règle | Ce qu'elle empêche |
|---|---|---|
| R1 | `openapi` vaut 3.1.x | les formes 3.0 (`nullable`, `exclusiveMinimum` booléen) qui ne se convertissent pas |
| R2 | pas de `nullable`, `exclusiveMinimum` numérique | un document 3.0 déguisé en 3.1 |
| R3 | tout `$ref` résout, aucun `$ref` externe | un contrat qui ne se lit pas seul |
| R4 | `operationId` présent, `lowerCamelCase`, unique | un client généré qui se renomme tout seul |
| R5 | `summary` **et** `description` sur chaque opération | un contrat qu'il faut expliquer à l'oral |
| R6 | `x-arthome-maturity` ∈ {stable, provisional} | une rupture non gardée sur un contexte stable |
| R7 | `x-arthome-upstream` non vide | un appel interne non compté |
| R8 | exemple sur tout corps de requête | un contrat non testable |
| R9 | au moins une 2xx, avec exemple | idem |
| R10 | toute 4xx/5xx passe par l'enveloppe partagée | une seconde forme d'erreur |
| R11 | `Idempotency-Key` sur toute écriture, **sauf allowlist assumée** | un double achat sur un réseau qui bascule |
| R12 | `traceparent` sur chaque opération | une trace qui s'arrête à la frontière |
| R13 | aucun champ `labelFr`/`labelEn`/`messageFr`/`messageEn` | une fuite d'i18n **dans la donnée** (E8) |
| R14 | un vocabulaire de **sortie** n'est jamais un `enum` figé | un téléviseur qui rejette une valeur inconnue |
| R15 | toute réponse 2xx compose `EnvelopeMeta` | une réponse sans `servedAt`, donc sans horloge de référence |

**L'allowlist de R11 est écrite dans le vérificateur, avec son motif** : `recordPlaybackPosition`
et `submitHealthSample` sont des écritures tolérantes à la perte — une clé par tranche de 30 s, par
spectateur et par direct ferait du magasin d'idempotence la table la plus chaude du système pour
protéger une écriture sans conséquence. `openPlayback`, `renewPlaybackTicket`, `releasePlayback` et
`sendReaction` n'ont pas d'effet cumulatif ; `quoteCart` et `quoteSeat` sont des lectures déguisées
en `POST`. **Toute addition à cette liste est une décision, et elle porte son motif dans le code.**

**État au 21 septembre 2026** : `openapi/storefront.yaml` (55 chemins, 67 opérations, 57 schémas)
et `openapi/studio.yaml` (59 chemins, 63 opérations, 34 schémas) passent les quinze règles.

### 2.4 La porte de non-rupture

| Contexte | Régime | Commande |
|---|---|---|
| `identity`, `catalog`, `ticketing` | **stable** | `oasdiff breaking <base> <head>` — **exit non nul bloque** |
| `streaming`, `chat`, `payouts`, `notifications` | **provisoire** | `oasdiff changelog <base> <head>` — journalisé, non bloquant |

On retire la ligne d'exception **le jour où le palier du contexte est livré**, jamais avant. C'est
la même coupe que `buf.yaml` pour les événements, avec la même règle de sortie.

---

## 3. Un AsyncAPI par service — la vraie documentation publique

**C'est la partie que l'on oublie, et c'est la plus importante ici.** Six des sept services
n'exposent presque pas d'HTTP : leur surface publique, celle que les autres contextes consomment,
est **événementielle**. Un service documenté par son seul OpenAPI est un service dont on ne sait
pas ce qu'il **dit**.

### 3.1 Ce que le document porte

| Section | Contenu | Source |
|---|---|---|
| `channels` | un canal par **sujet Kafka**, c'est-à-dire par **type d'agrégat** — `arthome.catalog.date`, pas `arthome.catalog.date.published` | `events.md` §3 |
| `operations` | `send` pour les sujets que ce service publie, `receive` pour ceux qu'il consomme | le code, vérifié §3.2 |
| `messages` | **plusieurs par canal** — c'est la conséquence directe de `RecordNameStrategy` | `proto/` |
| `payload` | le schéma Protobuf, référencé par nom pleinement qualifié | `proto/` |
| `bindings.kafka` | `key` (l'identifiant d'agrégat, donc la partition, donc l'ordre), `partitions`, `groupId`, `schemaIdLocation: payload` | `events.md` §1.1, §3 |
| `headers` | les cinq obligatoires : `message-id`, `type`, `traceparent`, `actor-id`, `occurred-at` | `events.md` §1.3 |
| `x-arthome-compatibility` | `BACKWARD`, et la maturité du contexte | `events.md` §5 |
| `x-arthome-retry` | `arthome.<context>.retry` et `.dlq`, distincts de la DLQ de connecteur | `events.md` §1.4 |

### 3.2 La porte qui rend le document vrai

Un AsyncAPI généré depuis `proto/` décrit les **messages**, pas les **abonnements**. Sans
vérification, il promettrait un canal que personne ne consomme. Donc, deux contrôles :

```bash
# 1. les messages du document existent dans les descripteurs buf
buf build proto -o /tmp/image.bin && pnpm run asyncapi:check-messages

# 2. les `receive` du document correspondent aux @EventPattern réellement enregistrés
pnpm --filter <service> run asyncapi:check-subscriptions
```

Le second se fait **à l'exécution**, sur un contexte Nest compilé : on démarre l'application en
mode `standalone`, on lit les métadonnées `@EventPattern` du `DiscoveryService`, et on compare au
document. **C'est le seul moyen honnête** : un décorateur commenté ne se voit pas dans un fichier
`.proto`.

**Et le piège qui justifie ce contrôle** : le `groupId` par défaut de `@nestjs/microservices` est
partagé. Le leader du groupe n'assigne que ses propres sujets, et **les sujets des autres services
restent non consommés, silencieusement**. Le document AsyncAPI déclare le `groupId` ; le contrôle
vérifie qu'il est unique par service **et par module client**.

### 3.3 Porte de non-rupture, côté événements

```bash
buf lint proto                                        # bloquant partout
buf breaking proto --against '.git#branch=main'       # bloquant sur identity, catalog, ticketing
```

Les quatre contextes provisoires sont dans `ignore` de `buf.yaml` ; la ligne se retire au palier.
Et les cinq règles Protobuf qui ne se négocient **jamais**, même en provisoire, sont dans
`events.md` §5.2 — la première (« ne jamais réutiliser un numéro de champ ») est la seule faute
Protobuf qui **corrompt des données en silence**.

---

## 4. Tests unitaires

### 4.1 Les règles de `@arthome/core` — pures, sans Nest

Ce sont elles qui composent les valeurs que `corrections-handoff.md` a trouvées divergentes
partout. Elles se testent **sans conteneur, sans Nest, sans simulacre** : ce sont des fonctions.

**Testées exhaustivement sur leurs bornes**, parce qu'une borne est exactement ce qu'une maquette
ne teste jamais :

| Fonction | Bornes qui doivent être couvertes |
|---|---|
| `displayStateOf` | la seconde d'ouverture de salle, la seconde de bascule à l'antenne, l'expiration de rediffusion, et **la préséance de l'issue sur les deux autres axes** |
| `decideWatch` | les **dix** codes de refus, un par un ; le budget d'aperçu à 0 ; le plafond d'écrans à N et N+1 |
| `isRoomOpen`, `replayHoursLeft`, `progressOf` | avant, pendant, après, et l'instant exact |
| `payoutOf`, `roundMinor` | l'arrondi **sur chaque composante prise séparément**, un brut nul, une ventilation de TVA à deux marchés, et le fait que **la commission porte sur le HT** |
| `effectiveRightsOf` | une personne à **plusieurs rôles** sur la même chaîne (l'union, jamais un rang) ; `director` qui invite `video` ; `video` qui n'invite personne |
| `moderationBadgeOf` | les quatre valeurs et leur **ordre de préséance** |
| `overlapsWith` | deux gardes qui se touchent d'une seconde |
| `normalizeSearchCriteria` | deux critères équivalents dans un ordre différent → **la même signature** |
| `seasonBounds` | le 31 août et le 1er septembre |
| `nextPublicationTransitions` | les deux couples sans retour, pour chacun des huit rôles |

**Aucun simulacre pour ce qui vient de `@arthome/core`** : le domaine est pur et déterministe,
le simuler reviendrait à tester le simulacre. Les `fixtures/` déterministes sont le jeu de données
**de référence** ; un test qui recompose à la main une donnée que `fixtures` sait produire est une
table littérale parallèle.

### 4.2 Les handlers, avec leurs ports simulés

Un handler de commande se teste avec des **ports** simulés (`useValue`), jamais avec une base. Ce
qui est vérifié : l'invariant est appliqué, l'erreur de domaine porte le **bon code**, et
l'événement d'intégration est **écrit dans l'unité de travail** — pas publié.

**Ce que ces tests ne prouvent pas, et qu'il ne faut pas leur demander** : que la transaction tient.
C'est l'objet du §5.

---

## 5. Tests d'intégration — trois niveaux

> **L'objectif n'est pas d'en avoir beaucoup. C'est d'avoir toujours les mêmes**, rendus bon marché
> par un harnais partagé. Sept services qui réécrivent chacun leur plomberie de conteneurs, c'est
> sept fois la même soirée perdue et sept comportements différents le jour où ça casse.

### 5.1 Le socle — obligatoire pour **tout** service, sans exception

Quatre tests. Un service qui n'a pas les quatre n'est pas fini.

| # | Test | L'invariant qu'il protège |
|---|---|---|
| **S1** | les migrations s'appliquent sur un **vrai PostgreSQL 18**, depuis zéro, dans l'ordre | `synchronize: true` est interdit partout, y compris en développement : la seule preuve que le schéma est celui qu'on croit est qu'il se construise par ses migrations |
| **S2** | **l'écriture métier et la ligne d'outbox dans la même transaction** : on force un échec **après** l'insertion d'outbox et **avant** le commit, et on vérifie que **ni l'une ni l'autre** n'existe | jamais `save()` puis `emit()` — un plantage entre les deux perd l'événement, un rollback après l'émission l'invente |
| **S3** | un consommateur **rejoue deux fois le même événement** (même `message-id`) et l'effet est **identique** | la livraison est « au moins une fois », toujours. La déduplication est une ligne `processed_message` **dans la transaction métier**, avec `orIgnore().returning()` — jamais un `SET NX` Redis ni un test-puis-écriture hors transaction |
| **S4** | une **projection** de modèle de lecture : un événement entre, la table dénormalisée sort, et `last_event_seq` avance | c'est ce pour quoi toute l'architecture événementielle existe. Une projection qui ne s'applique pas est un écran vide sans erreur |

**S2 est le test le plus important du système.** C'est la faute la plus coûteuse du modèle, et
c'est la seule qui ne se voit ni en lecture de code, ni en test unitaire, ni en production avant le
premier incident.

### 5.2 Au cas par cas — seulement là où le service le justifie

| Test | Services concernés | Pourquoi ici et pas partout |
|---|---|---|
| **mapping de recherche** : une date publiée est trouvable par sa facette, et un rejeu tardif **n'écrase pas** une version plus récente (`version_type: external`) | `catalog` | c'est le seul service qui écrit un index, et le rejeu tardif est un défaut silencieux |
| **calcul d'argent de bout en bout** : commande → TVA ventilée par marché → commission sur le HT → net, à l'unité mineure près | `ticketing`, `payouts` | ce sont « les règles qui font mal » ; la fixture d'origine calculait sur le TTC à taux unique |
| **émission et révocation d'un jeton de lecture** : un jeton émis, un `device_revoked` consommé, le **renouvellement suivant refusé**, et l'**expiration du jeton en main** mesurée — voir ci-dessous | `streaming` | c'est ce qui fait que « déconnecter cet appareil » coupe réellement la lecture |

> **Ce que ce test doit mesurer, et qui a failli lui échapper.** Son énoncé était « la latence
> ≤ 60 s », et il aurait passé au vert en constatant que le **renouvellement** est refusé au bout
> de 45 s. Ce n'est pas ce que la phrase promet. La révocation ne révoque pas le jeton **en
> main** : la signature de préfixe du CDN expire avec lui, donc la périphérie continue de servir
> des segments parfaitement valides jusqu'à **120 s**. Le test doit donc mesurer **l'instant où un
> segment cesse d'être servi**, pas l'instant où un renouvellement est refusé — sinon on obtient
> une garantie fausse avec un test vert, ce qui est pire qu'une garantie absente.
>
> C'est la règle 15 violée sur une constante de sécurité : la constante avait deux propriétaires et
> deux valeurs, et c'est la mauvaise qui a été recopiée — **parce que c'était celle qui satisfaisait
> la question posée par la surface**. Le contrat sert désormais `playbackCutWithinSec: 120`.

### 5.3 Une seule fois pour tout le système — le parcours doré

**Acheter une place, du storefront au versement.** Sous `docker compose`, **à la demande**, pas à
chaque PR.

```
POST /v1/orders/seats            → 201, place créée, seat_code émis par le serveur
  la jauge a décrémenté dans la MÊME transaction que la place
  deux lignes d'outbox écrites dans cette transaction
Debezium publie                  → arthome.ticketing.date_sales · arthome.ticketing.order
catalog-projector consomme       → la jauge bouge sur date_card_public
catalog-indexer consomme         → la facette bouge dans OpenSearch
streaming-entitlement consomme   → le droit existe dans entitlement_projection
payouts-ledger consomme          → la ligne de versement existe, échéance J+14 depuis la FIN
POST /v1/playback/{id}/open      → 200, jeton émis contre le droit fraîchement projeté
```

**Un seul `traceparent` relie les sept étapes**, et c'est ce qu'on assert (§7).

**Pourquoi à la demande et non à chaque PR** : il démarre sept services, Kafka, Debezium,
OpenSearch et MinIO. Le lancer à chaque PR d'une personne seule, c'est l'abandonner en trois
semaines. Le lancer avant chaque palier, c'est le garder.

### 5.4 Les trois garde-fous — sans eux, rien de ce qui précède ne tient

**(a) Un harnais de test partagé**, publié depuis `@arthome/tooling`, et **aucun service n'écrit sa
plomberie de conteneurs**.

```ts
// @arthome/tooling/testing
withMigratedDb(service)     // un conteneur PG par run, une BASE par fichier, migrations appliquées
givenEvent(topic, message)  // produit un message Protobuf encadré, avec ses cinq en-têtes
expectOutbox(type)          // lit outbox_event et assert le type, la clé d'agrégat, le tracecontext
resetBetweenTests()         // TRUNCATE … RESTART IDENTITY CASCADE — jamais dropSchema par test
```

Trois règles d'isolation qui viennent de l'expérience et pas de la théorie :
**un conteneur par magasin et par run**, démarré en `globalSetup`, jamais par test ; **une base par
fichier** et un index Redis par worker, pour que les fichiers tournent en parallèle ; **`TRUNCATE`
entre les tests**, jamais `dropSchema` ni `FLUSHALL`. Et `.withReuse()` est **interdit en
intégration continue** — le réemploi est activé par défaut côté Node, et il transforme un test
rouge en test vert la deuxième fois.

**(b) Exécution par service touché**, via le cache Turborepo — le seul usage de Turbo dans ce
projet, et il est là pour cela : `test:integration` déclare `dependsOn: ["^build"]`, et un service
dont rien n'a changé ne relance pas ses conteneurs.

**(c) Un plafond assumé : de l'ordre de dix tests d'intégration par service**, et **chaque test
nomme dans son titre l'invariant qu'il protège**.

```
✓ « l'écriture de la place et la ligne d'outbox sont dans la même transaction »
✗ « testOrderService »
```

> **Un test qui ne sait pas nommer son invariant est un test unitaire déguisé**, et il coûte cent
> fois son prix. Le plafond n'est pas une limite de qualité : c'est ce qui garantit que la suite
> reste lançable en une minute, donc qu'elle sera lancée.

### 5.5 Ce qu'on ne teste **pas** en intégration

| Non testé | Pourquoi |
|---|---|
| le framework | NestJS injecte, route et valide. Le tester, c'est tester la bibliothèque de quelqu'un d'autre |
| les règles de domaine déjà couvertes dans `core` | elles sont pures ; les repasser dans un conteneur coûte mille fois plus pour la même assertion |
| **tout ce qui simule Kafka en profondeur** | **si c'est un simulacre, ce n'est plus un test d'intégration.** Un faux courtier qui livre dans l'ordre, une seule fois, ne prouve rien sur un système qui livre au moins une fois, parfois en désordre. Soit un vrai Kafka, soit un test unitaire de handler — jamais l'entre-deux, qui donne la confiance sans la preuve |

---

## 6. Tests de contrat

Trois, et ils protègent trois choses différentes.

| # | Test | Commande | Ce qu'il empêche |
|---|---|---|---|
| **C1** | le **client généré compile** contre le contrat publié | `pnpm --filter <surface> run typecheck` après régénération | un contrat qui change de forme sans que personne ne le voie avant le déploiement de la surface |
| **C2** | `buf breaking` sur les événements | `buf breaking proto --against '.git#branch=main'` | une rupture Protobuf sur un contexte stable |
| **C3** | `oasdiff` sur l'OpenAPI | `oasdiff breaking <base> <head>` | une rupture HTTP sur un contexte stable |

**C1 compile une fois, pas deux — et cette ligne disait le contraire.** Elle imposait de compiler
le client généré sous TS 6.0.x **et** sous TS 7.x, « parce qu'il traverse la fracture ». Il n'y a
pas de fracture : `code-conventions.md` §1.3 l'a instruite et l'a **rétractée**. Le plancher de
React 19.3 n'est pas 7.0.2 — `react-native` n'a aucun pair `typescript` et `@types/react` se
contente de TS 5.1 ; le `7.0.2` relevé était un constat de registre, pas une contrainte. Le seul
plancher dur est le **plafond** d'Angular (`<6.1`), rejoint par NestJS, dont `nest build` échoue
sur TS 7.0. **Les sept dépôts sont sous un plafond unique à TS 6.0.x.**

Le client généré vit donc dans des dépôts qui sont tous du même côté, et **une compilation
suffit**. Faire d'une revue de service la vérification d'un état qui n'existe pas, c'est E2
appliqué à une décision : un raisonnement plausible, rétracté ailleurs, laissé en place ici.

Ce qui reste vrai, et qui n'est pas la même chose : les **portes 6 et 7** de
`code-conventions.md` §8.1 compilent les `.d.ts` de `@arthome/core` et `@arthome/contracts` sous
les deux versions. Elles portent sur les **paquets publiés**, pas sur le client des surfaces, et
elles existent parce que la fracture **arrivera** — `typescript@7.0.2` est déjà `latest` et un
`pnpm add typescript` distrait l'installe.

**Et `@arthome/contracts` expose une entrée sans fichier baril** (D-012), mesuré à 7,7 Ko gzip
contre 92 Ko. La porte : le paquet n'a **aucun `index.ts` réexportant tout**, et n'importe zod que
par chemins profonds. Une seule ligne de réexport annule la mesure.

---

## 7. Les obligations d'exécution

Un service peut passer toutes les portes ci-dessus et être inexploitable. Ce qui suit est la
différence entre « ça marche » et « ça marche en production ».

### 7.1 La trace distribuée, visible de bout en bout

**Exigée, et vérifiée.** `trace:check` lance le parcours doré et assert **un seul `traceparent`**
de la requête HTTP jusqu'à l'indexation :

```
requête HTTP au BFF          traceparent créé
 └─ appel BFF → service      traceparent en en-tête
     └─ TRANSACTION
         ├─ écriture métier
         └─ INSERT outbox_event  tracecontext = traceparent   ← injecté À L'ÉCRITURE
     └─ COMMIT
Debezium                     → en-tête Kafka traceparent
consommateur de projection   → même trace
consommateur d'indexation    → même trace
```

**`traceparent` est injecté dans `outbox_event.tracecontext` au moment de l'écriture, pas plus
tard.** Le relais tourne hors de la requête : injecté après coup, le lien est définitivement perdu,
et c'est irrattrapable. C'est la seule chose de ce document qui, mal faite, ne se répare pas — elle
se réécrit.

**Ce que la trace doit montrer, et qu'on assert** : sept conséquences, un seul appel synchrone,
aucune communication entre services. C'est **cette trace**, et non le nombre de services, qui est
le signal technique du projet.

### 7.2 Santé et arrêt

| Point d'entrée | Contenu | Vérifié par |
|---|---|---|
| `GET /health/live` | le processus répond | sonde de redémarrage |
| `GET /health/ready` | base joignable, **migrations à niveau**, consommateur Kafka **dans son groupe** | sonde de routage |
| `GET /health/ready` pendant l'arrêt | **`503` immédiatement**, avant de fermer quoi que ce soit | test d'intégration S-ready |

`app.enableShutdownHooks()`, et l'ordre est : `ready` → 503, attendre la fenêtre de purge, fermer le
serveur HTTP, **puis** arrêter le consommateur Kafka, **puis** fermer la base. L'inverse coupe des
requêtes en vol à chaque déploiement.

**Les migrations sont un travail de déploiement distinct**, exécuté **une fois, à un exemplaire**,
et qui doit réussir **avant** que la nouvelle version démarre. `migrationsRun: true` ferait migrer
N répliques en même temps, et TypeORM n'a **aucun verrou de migration**. Sur le JavaScript compilé,
jamais sous `tsx` — qui ne fournit pas les métadonnées de décorateur.

### 7.3 L'enveloppe d'erreur, jusqu'à Traefik inclus

**C'est une ligne de ce document, et elle vient de `storefront-tv`** : *« toute réponse du système,
y compris en surcharge, doit porter l'enveloppe d'erreur avec son code et son identifiant de
trace »*.

Traefik produit ses propres 5xx — service injoignable, file d'attente pleine, délai dépassé. Une
page HTML brute rendrait impossible la distinction entre « **votre** connexion » et « **nos**
serveurs », et le spectateur irait redémarrer sa box.

**Exigé** : un middleware `errors` sur les statuts `500-599`, pointant vers un service statique qui
sert

```json
{ "error": { "code": "GATEWAY_UNAVAILABLE", "nature": "unavailable", "params": {},
             "traceId": "<X-Request-Id>" },
  "servedAt": "…" }
```

**Vérifié** : un test qui arrête un BFF et assert que la réponse de Traefik parse contre
`ErrorEnvelope`. Sans ce test, la configuration existera et sera fausse — c'est exactement le genre
de chose qu'on n'exerce jamais.

### 7.4 Ce qui ne doit pas fuir

| Obligation | Vérifiée par |
|---|---|
| `Cache-Control: no-store` sur la clé de flux, le jeton de lecture et tout verdict de droit | test d'intégration, en-tête assert |
| la clé de flux **n'apparaît dans aucune charge utile de liste** | test d'intégration sur `getRunConsole` |
| un champ interdit par le rôle est **absent**, jamais présent et nul | test d'intégration sur deux rôles, `expect(body).not.toHaveProperty('grossRevenue')` |
| un tri sur un champ absent est **refusé**, jamais ignoré | test d'intégration, `SORT_KEY_FORBIDDEN` |
| aucun IBAN complet dans un événement | test unitaire sur le schéma de l'événement |
| **aucune clé privée dans le document JWKS publié** | §7.6, porte J1 |

### 7.5 Artefacts publiés sur CDN

Les catalogues i18n et de taxonomie sont des **artefacts versionnés immuables**, publiés par un
travail de CI sur MinIO puis CDN. Trois obligations :

- **immuables** : `/{surface}/{locale}/v{N}.json` n'est jamais réécrit. Une correction publie
  `v{N+1}` ;
- **chaque application embarque un instantané au build**, comme repli **obligatoire**. C'est la
  seule chose qui garantit qu'aucun code brut n'atteindra jamais un écran — et sur mobile, où une
  revue de magasin est lente, c'est une **condition d'exploitation**, pas une commodité ;
- la version courante est servie dans la charge utile d'amorçage, **jamais par un appel par page**,
  et elle **ne bloque jamais le premier rendu**.

### 7.6 Le document JWKS — quatre rotations, un assembleur

**Arbitrage rendu**, en accord avec `context-map.md` §7.0 de `backend-domain`, qui pose le cadre et
me laisse le découpage :

> **Quatre rotations indépendantes, une par émetteur, chacune ne publiant que sa clé publique.
> Un seul assembleur, qui n'a aucun secret. L'asymétrie est le point.**

`backend-domain` penchait pour ce découpage ; je le tranche, et voici les trois raisons, dont la
deuxième n'avait pas été dite.

1. **Un travail unique détenant quatre clés privées deviendrait le composant le plus sensible du
   système** — et ce serait un travail d'infrastructure, pas un service. Il concentrerait la
   signature des deux BFF, celle du jeton de lecture (à laquelle la **périphérie du CDN** fait
   confiance pour tout accès au média) et celle du `device_token`. Aujourd'hui ces quatre secrets
   vivent à quatre endroits avec quatre rayons d'explosion ; les réunir **crée une cible qui
   n'existe pas encore**.
2. **La simplification serait illusoire, parce que les deux cadences diffèrent déjà.** 30 j /
   grâce 24 h pour les BFF, 90 j / grâce 7 j pour la lecture et l'appareil. Un travail unique
   porterait de toute façon deux calendriers et deux fenêtres de grâce : ce ne serait pas *un*
   travail, ce serait *un travail à quatre branches*. On paierait le risque sans acheter la
   simplicité.
3. **Une clé privée ne quitte jamais son émetteur** — c'est la même discipline que les ports de
   paiement et de média. Un générateur central devrait **distribuer** des clés privées, ce qui est
   exactement le geste qu'on ne veut jamais faire.

**Le contre-argument — « quatre choses à surveiller » — s'answère sans fusionner.** Ce qu'il faut
surveiller n'est pas quatre travaux : c'est **un seul nombre**, l'âge de la clé la plus ancienne du
document publié, comparé à sa cadence. L'assembleur est l'endroit naturel de ce contrôle, et il
échoue bruyamment si un émetteur a cessé de publier.

**Les quatre règles d'exploitation qui rendent ce découpage sûr.** Elles sont ici parce que trois
d'entre elles, mal faites, ne se voient qu'en production.

- **Publier avant de signer, retirer après — et « après » est un maximum, pas une durée.** La
  nouvelle clé publique entre dans le document **avant** que son émetteur commence à signer avec ;
  l'ancienne n'est retirée qu'après **`max(durée de vie du jeton, 2 × max-age du document)`**, plus
  marge. Sans recouvrement, une rotation coupe **toutes** les lectures en cours.
  **Ce point disait « après la plus longue durée de vie de jeton », et c'était faux** — la même
  formulation que portait `adr-auth` §8.1 avant correction. Prise seule, elle dimensionne la
  rétention sur 120 secondes quand l'arête sert l'ancien document pendant une heure, et produit
  donc exactement le rejet de jetons valides que le point suivant décrit. Je le laisse écrit :
  une puce se recopie hors de son contexte, et c'est ainsi que la règle 15 se viole.
- **La fenêtre de grâce doit couvrir le cache du CDN, pas seulement la durée du jeton** — et c'est
  le vrai mécanisme derrière les deux cadences, que je n'ai vu écrit nulle part. La périphérie met
  le document en cache pendant des heures : publier la nouvelle clé puis signer soixante secondes
  plus tard ne sert à rien, l'arête sert encore l'ancien document et **rejette des jetons
  parfaitement valides**. D'où une valeur de contrat : le document est servi avec
  `Cache-Control: max-age=3600`, et **toute fenêtre de grâce est ≥ 2 × max-age**. La plus courte
  (24 h) garde un facteur 24 : c'est confortable, et c'est délibéré.
- **Une rotation en échec ne retire jamais une clé.** L'assembleur ne fait qu'**unir** ce que les
  émetteurs publient. Le retrait est une étape **séparée et explicite**, conditionnée à la fenêtre
  de grâce. Un assembleur qui reconstruit le document « à l'identique de ce qu'il voit » supprime
  la clé d'un émetteur temporairement muet — et invalide tous ses jetons en vol.
- **L'assembleur vit dans `arthome-platform`, hors des sept services.** Il ne lit la base
  d'aucun service, ne consomme aucun sujet, et n'expose aucun point d'entrée : il lit quatre
  préfixes de stockage objet et pousse un fichier.

**Trois portes, et la première coûte une ligne.**

| # | Porte | Commande | Ce qu'elle empêche |
|---|---|---|---|
| **J1** | **aucune clé privée publiée** | `curl -s $JWKS_URL \| jq -e '[.keys[] \| has("d")] \| any \| not'` | la faute catastrophique : un `d` dans un JWK publié, c'est la signature du système donnée au monde. Une ligne, à lancer après **chaque** publication |
| **J2** | les quatre émetteurs sont présents | `jq -e '[.keys[].kid] \| map(split("-")[0]) \| unique \| length == 4'` — préfixes `bff-sf`, `bff-st`, `play`, `dev` | un émetteur muet dont les jetons seront refusés au prochain redémarrage d'un service |
| **J3** | aucune clé n'a dépassé cadence + grâce | contrôle de l'assembleur, alerte | une rotation en panne silencieuse — le mode de défaillance le plus probable des trois |

**Et la porte de recette, qui est un test et non un contrôle** : une rotation complète en
environnement de recette, avec un jeton signé par l'**ancienne** clé qui **doit encore être
accepté** pendant toute la fenêtre de grâce, et refusé après. C'est le spike S4 d'`adr-auth.md`
§11, et il doit entrer dans la suite de non-régression — pas rester dans le spike.

---

## 8. La ligne de revue : un BFF qui devient épais

Ce n'est pas une métrique, et c'est pour cela qu'elle est ici plutôt que dans une alerte.

> **Si un BFF acquiert une table qu'il écrit lui-même, ou un cache dont l'invalidation devient une
> règle métier, il a franchi la ligne.**

Un BFF qui se met à calculer un prix, une remise, un droit, un ordre de rangée, un seuil de rareté
ou un versement est devenu un **monolithe distribué** : tout le couplage d'un monolithe, plus la
latence du réseau. Ce n'est pas le risque de charge qui compte — un composant sans état se
réplique ; c'est celui-là.

**La seule règle qu'un BFF évalue lui-même est `decideWatch` en mode indicatif**, et le contrat le
déclare tel (`advisory: true`). Toute autre évaluation est un défaut de revue.

Trois mesures accompagnent la revue, et chacune commande un geste précis :

| Mesure | Seuil | Geste |
|---|---|---|
| `bff_upstream_calls_per_request` p95 sur un écran de liste | **> 4** | le modèle de lecture manque : le créer dans le contexte majoritaire |
| `bff_request_duration_ms` p95 sur une lecture publique | **> 400 ms** | idem, ou la surcouche n'est pas groupée par lot |
| `read_model_staleness_seconds` p99 | **> 30 s** (et **> 5 s** pour `entitlement_projection`) | le consommateur de projection décroche |

---

## 9. Ce que je remonte

**1. Le document JWKS a maintenant un découpage, il lui manque une main.** `backend-domain` a posé
le cadre (`context-map.md` §7.0 : artefact d'infrastructure, sans contexte propriétaire, parce que
`identity` le servant violerait littéralement « aucun service n'appelle `identity` », et un BFF le
servant inverserait la dépendance). **J'ai tranché le découpage au §7.6** : quatre rotations
indépendantes, un assembleur sans secret, trois portes.

Ce qui reste au chef, et c'est une ligne de calendrier, plus une question d'architecture :
**l'assembleur et ses trois portes appartiennent au palier 2**, avec le `wal_level = logical` et
les sept connecteurs Debezium — c'est le premier palier où plus d'un émetteur existe. Avant lui,
un seul émetteur signe et la question ne se pose pas. **Le nommer maintenant et le construire au
palier 2** est la bonne cadence ; le construire plus tôt serait de l'outillage pour un seul
émetteur, plus tard serait le découvrir le jour d'une rotation ratée.

**2. Le générateur de client des cinq surfaces.** Personne n'a été désigné pour choisir l'outil,
l'épingler et décider où le client publié vit. Ma recommandation : `src/generated/**` dans chaque
dépôt de surface — déjà exempté du lint par `code-conventions.md` §4.5 — et **pas** un paquet
publié. Un client généré n'est pas un contrat, c'est une commodité de surface ; le publier créerait
une quatrième chose à faire tourner, pour une personne seule.

---

## 10. La liste à recopier dans la revue d'un service

Quatorze lignes. Un service qui n'en coche pas quatorze n'est pas fini.

- [ ] `pnpm run verify` passe (`code-conventions.md` §8.2)
- [ ] `openapi/<service>.yaml` **régénéré identique** au document commité
- [ ] `python3 tools/check-openapi.py` passe les quinze règles
- [ ] `asyncapi/<service>.yaml` régénéré identique, et ses `receive` correspondent aux
      `@EventPattern` réellement enregistrés
- [ ] `buf lint` passe ; `buf breaking` passe si le contexte est **stable**
- [ ] `oasdiff breaking` passe si le contexte est **stable**
- [ ] les règles `@arthome/core` du service sont testées **sur leurs bornes**
- [ ] les quatre tests du **socle** existent et passent (S1 migrations, S2 outbox transactionnel,
      S3 rejeu idempotent, S4 projection)
- [ ] les tests d'intégration **au cas par cas** du service existent, s'il en relève
- [ ] au plus **dix** tests d'intégration, chacun **nommant son invariant**
- [ ] aucun test d'intégration ne simule Kafka
- [ ] `GET /health/live` et `/health/ready` existent, et `ready` rend **503 dès le début de
      l'arrêt**
- [ ] les migrations tournent dans un **travail de déploiement distinct**, une seule fois
- [ ] la trace est **visible de la requête HTTP à l'indexation**, avec un seul `traceparent`

---

## 11. Les outils qui ne sont pas installés

`buf`, `oasdiff` et un linter OpenAPI **ne sont pas installés sur ce poste**, et rien de ce document
ne les a exécutés. Les documents d'`openapi/` ont été validés par un analyseur YAML et par le
vérificateur du §2.3, écrit pour ce projet.

**Commandes d'installation proposées — non exécutées.** Les versions ne sont volontairement pas
épinglées ici : les épingler sans les avoir relevées aujourd'hui reviendrait à écrire une table
littérale parallèle de plus. C'est `code-conventions.md` §7 qui gouverne l'épinglage.

```bash
# buf — schémas et compatibilité Protobuf
pnpm add -Dw @bufbuild/buf          # le paquet npm embarque le binaire

# oasdiff — rupture et journal de changements OpenAPI
docker run --rm -v "$PWD:/specs" tufin/oasdiff breaking \
  /specs/openapi/storefront.base.yaml /specs/openapi/storefront.yaml
# (variante sans Docker : go install github.com/oasdiff/oasdiff@latest)

# linter OpenAPI — style et complétude du document
pnpm add -Dw @redocly/cli && pnpm exec redocly lint openapi/*.yaml
```

**Quand le quota d'Actions reviendra**, le fichier de workflow appellera `pnpm run done` et rien
d'autre. C'est pour cela que tout est derrière une seule commande : la CI distante n'ajoutera pas
une seconde définition de ce qui est vérifié, et il n'y aura donc jamais deux listes à tenir
d'accord.
