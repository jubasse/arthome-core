# Temps réel

> Canaux WebSocket, événements qui y transitent, passage à l'échelle de l'adaptateur Redis.
> Socket.IO côté NestJS, adaptateur Redis pour la diffusion entre nœuds.
>
> **La frontière que `streaming.md` pose et qu'on tient : Kafka est le journal durable —
> modération, audit, rejeu, historique. Redis assure la diffusion aux clients connectés.
> Confondre les deux est l'erreur classique.**

---

## 1. Deux passerelles, deux espaces de noms, une connexion par client

```
bff-storefront  ──►  namespace /storefront
bff-studio      ──►  namespace /studio
```

**Un client n'ouvre qu'une connexion.** `storefront-tv` l'exige et le motif est bon : quatre
connexions (incident, tchat, compteur, appairage) coûtent quatre reconnexions à chaque hoquet de
Wi-Fi domestique et quatre fois la mémoire de tampon. Le multiplexage se fait par **salle**, pas
par connexion.

**Les deux espaces de noms sont deux passerelles distinctes**, dans les deux BFF, parce qu'ils
n'ont ni la même authentification (cookie contre porteur), ni le même modèle d'abonnement
(par spectateur contre par personne multi-chaînes), ni la même redaction.

**L'authentification se fait à la poignée de main**, dans un intergiciel d'espace de noms posé en
`afterInit`, jamais dans une garde de passerelle : `handleConnection` ne fait tourner ni garde, ni
tuyau, ni intercepteur, ni filtre — une garde `@UseGuards` sur la passerelle laisserait la
connexion ouverte. Le principal est posé sur `socket.data`, et l'autorisation **par message** se
fait dans une garde WS qui lit `socket.data`.

**L'intergiciel se pose par espace de noms** : un `server.use()` dans un adaptateur personnalisé ne
couvre que `/`.

---

## 2. `/storefront` — les salles

| Salle | Qui la rejoint | Ce qui y transite | Latence |
|---|---|---|---|
| `date:{id}:state` | toute surface affichant cette date | incident levé/résolu, issue déclarée, **bascule d'antenne réelle** (le flux entre ou sort) | **≤ 2 s** |
| `date:{id}:chat` | le lecteur, panneau tchat ouvert | messages, changements d'état de message, régime de tchat | ≤ 2 s, **plafonné à la source** |
| `date:{id}:counters` | le lecteur et les cartes visibles | compteur de spectateurs, jauge, liste d'attente, tarif « séance commencée » | 10 à 30 s |
| `viewer:{profileId}` | toujours | badge de notifications, droits recalculés après un achat, panier modifié ailleurs, révocation | ≤ 2 s |

**L'issue d'un appairage ne passe PAS par ce canal.** J'avais posé une salle
`device:{deviceId}`, rejoignable avant toute session ; `adr-auth.md` §5.3 la refuse et **son
argument l'emporte** : faire entrer une identité d'appareil dans l'espace de noms WebSocket au
moment de `signin` élargirait sa surface d'attaque pour gagner quelques centaines de
millisecondes. L'appairage se lit donc par **interrogation RFC 8628**, avec un `pollInterval`
servi à 2 s pendant les 60 premières secondes puis 5 s — décroissance servie, donc modérable, et
trente requêtes au plus par appairage. **L'espace de noms `/storefront` n'accepte qu'une session,
jamais une identité d'appareil nue.**

### 2.1 Un abonnement par **lot d'identifiants**, jamais un par carte

C'est la contrainte que `storefront-mobile` et `storefront-web` remontent toutes deux, et elle est
structurante. Une liste virtualisée affiche une vingtaine de cartes et en garde autant en tampon ;
chacune porte un compteur de spectateurs. **Vingt abonnements, c'est vingt réveils du processeur
et une batterie vidée** ; une grille de douze cartes qui ouvrirait douze canaux est absurde.

Le protocole :

```
→ counters:subscribe   { dateIds: [...] }     remplace le lot, ne l'ajoute pas
← counters:snapshot    { [dateId]: {...} }    immédiatement, pour peindre
← counters:tick        { [dateId]: {...} }    toutes les 10 à 15 s, DIFFÉRENTIEL
```

Le lot se **remplace** quand la fenêtre de défilement bouge, **sans rouvrir le canal**. Et le tick
est différentiel : seuls les identifiants dont une valeur a bougé sont émis. Sur une grille stable,
le canal est silencieux.

**Ce que cette salle ne porte PAS, et c'est délibéré** : l'**ouverture de salle** et l'**expiration
d'une rediffusion**. Ce sont des transitions à instant **connu d'avance**, donc dérivables sans
requête — voir §2.4, qui porte l'argument. Une version antérieure de ce tableau les listait ici :
c'était l'unique ligne à contredire §2.4 et §8, et c'est celle qu'on aurait lue en cherchant le
contenu d'une salle.

La « bascule d'antenne » reste, mais au sens strict : `run.state_changed` est un **fait
technique** que rien ne permet de prévoir — le flux entre ou il n'entre pas. `displayState` bascule
alors de `room_open` à `live` chez le client, qui en dérive le reste.

### 2.2 Le plafond du tchat est appliqué **à la source**

`storefront-tv` a raison et son argument vaut pour les trois storefronts : une TV ne peut pas
absorber un flux à haut débit pour en jeter 95 %, chaque message rejeté ayant coûté du parsing et
de l'allocation sur un appareil qui décode déjà de la vidéo.

| Surface | Plafond servi | Rattrapage à l'entrée |
|---|---|---|
| TV | **2 msg/s** | 20 messages |
| mobile | 6 msg/s | 50 messages |
| web | 10 msg/s | 50 messages |

La sélection est faite en amont (le plus récent, et les messages d'équipe toujours). **Aucun
message retiré n'atteint une surface publique** : la modération est un état côté `chat`, et le flux
servi est déjà filtré. Le studio voit les deux états, le spectateur en voit un.

**Pas de pagination remontante sur un tchat de direct** : personne ne remonte un tchat à la
télécommande, et sur les trois surfaces c'est une fenêtre glissante, pas un défilement infini vers
le passé. L'historique complet se lit sur la **rediffusion**, rejoué par `at_media_sec`.

### 2.3 Le quota de réactions voyage avec la réponse

`sendReaction` rend le quota restant et l'instant de recharge. Motif exprimé par `storefront-tv` et
il est juste : la surface doit **désactiver** le contrôle plutôt que le laisser échouer — une
action inerte est proscrite par le dossier, mais une action qui échoue en silence est pire. Une
seule réaction en vol à la fois.

### 2.4 Ce qui ne passe **pas** par le canal, et pourquoi c'est une exigence

Un téléviseur reste allumé des heures sur le même écran. Entre-temps, une date passe à l'antenne,
une salle ouvre, une rediffusion expire. **La tentation est de pousser ces transitions ; il ne faut
pas.** Le contrat livre les **instants** (ouverture de salle, début, fin, fenêtre de rediffusion,
expiration de promotion, échéance d'annulation, fin du décompte d'aperçu) et les **constantes**, et
la surface programme le changement localement, à la seconde, sans un seul appel.

C'est exactement ce que `displayStateOf` fait déjà dans `@arthome/core` — une règle, deux sites
d'évaluation, aucune réimplémentation. Et c'est la raison pour laquelle le contrat porte des
instants et non des libellés : une réponse qui livre « PROGRAMMÉ » est périmée en vol ; une réponse
qui livre un instant ne l'est jamais.

**Conséquence pratique** : un mode veille qui tourne huit heures ne fait **aucune** requête, et une
TV posée sur l'accueil ne rafraîchit que ce qui bouge vraiment.

---

## 3. `/studio` — l'abonnement est **par personne**, pas par page

C'est la différence la plus structurante avec le storefront, et les deux spécialistes du studio
l'ont demandée indépendamment.

Un régisseur ou un modérateur indépendant peut être **de garde sur plusieurs directs le même
soir** ; la maquette affiche un bandeau de tous les flux du soir, signale le chevauchement et
annonce « une alerte sonore distincte par chaîne ». **Un canal ouvert seulement sur la chaîne
affichée manquerait l'incident de l'autre.** Et sur un réseau mobile déjà fragile, un abonnement
par chaîne multiplierait les connexions.

À la connexion, la passerelle fait rejoindre :

| Salle | Contenu |
|---|---|
| `person:{personId}` | version des droits, boîte, invitations, gardes, alertes routées |
| `channel:{id}` — **une par chaîne accessible** | état d'antenne, incidents, présence de l'équipe, ventes, chapitres, **état de publication d'une date** (§3.3) |
| `channel:{id}:decide` — pour `artist ∨ production` | le même correctif de publication, **avec les transitions offertes recalculées** (§3.3) |
| `channel:{id}:moderation` | file : entrée, prise en charge, relâche, verdict, sanction, reclassement rétroactif |
| `channel:{id}:chat` | messages du direct en cours, avec leur état |
| `channel:{id}:health` | échantillons de santé, 1 à 2 s |

**Les salles se recalculent quand la version des droits change**, et le serveur fait quitter les
salles d'une chaîne perdue **sans attendre une reconnexion** : c'est ce qui évite qu'une personne
dont l'accès ponctuel a expiré au tomber du rideau continue à voir une file.

### 3.1 Chaque message est un **correctif idempotent**, jamais « recharge tout »

Exigence d'Angular sans zone, et elle est réelle : la détection de changement est déclenchée par
l'écriture d'un signal, donc un message poussé doit atterrir dans un magasin d'entités identifié.
Un flux qui dit « quelque chose a changé, recharge » condamnerait la console à tout recharger
toutes les deux secondes, **en plein arbitrage de file**.

Forme imposée à tout message de ces deux espaces de noms :

```
{ entity: "moderation_item", id: "...", op: "upsert" | "remove",
  seq: 41287, channelId: "...", patch: { ... } }
```

`seq` est **monotone par flux et par chaîne**. C'est le point de reprise.

### 3.2 La visibilité de la concurrence est une exigence de contrat

L'écran de file montre « X examine », « X a tranché ». Cela suppose que **les prises en charge et
les verdicts des autres arrivent sur le même canal, avec le nom de qui agit**. Sans cela, deux
modérateurs travaillent en aveugle l'un de l'autre et se marchent dessus à chaque ligne.

Trois mécanismes, confirmés :

1. **La prise en charge est un bail** (`claim_expires_at`), renouvelé tant que la personne est
   présente, libéré par le serveur à l'expiration. Un modérateur qui ferme son navigateur ne gèle
   pas une ligne pendant tout le direct.
2. **Le second verdict est refusé**, et le refus **transporte la décision gagnante** — auteur et
   verdict — pour que l'écran dise la vérité au lieu d'un échec.
3. **La propagation est nominative.**

### 3.3 L'état de publication, et le piège du bouton périmé

**Le défaut corrigé.** La salle ne portait pas l'état de publication, et aucun événement ne
naissait des transitions. Un second opérateur voyait BROUILLON indéfiniment sur une date déjà
publiée, avec ses deux transitions offertes — et découvrait l'engagement en cliquant. La sûreté
était complète, **la fraîcheur était entièrement absente** (`needs/studio-web.md` §F).

Le correctif est la forme ordinaire du §3.1 :

```
{ entity: "publication", id: "<dateId>", op: "upsert", seq, channelId,
  patch: { state, orderRank, version, irreversible, changedBy } }
```

**Mais un correctif qui porterait le nouvel état sans recalculer `offeredTransitions` laisserait un
bouton périmé — le même défaut, déplacé d'un cran.** `studio-web` a raison, et ce n'est pas un
détail : `offeredTransitions` est « calculée **pour cet opérateur** », donc elle ne peut pas voyager
telle quelle dans une diffusion.

**La réponse réutilise la mécanique déjà en place au §3.4** — une salle par classe de droit, filtrée
à l'émission — parce que les transitions ne dépendent pas de la personne mais de `canDecide`
(`artist ∨ production`), donc il n'y a que **deux** classes :

| Salle | Qui la rejoint | `patch.offeredTransitions` |
|---|---|---|
| `channel:{id}` | tous les membres | **absent** — ces rôles n'ont aucun bouton de transition à périmer |
| `channel:{id}:decide` | `artist ∨ production` | **présent**, recalculé pour la classe destinataire |

Deux émissions, aucun calcul par personne, aucun bouton périmé. Et si un jour les transitions
dépendaient d'autre chose que de `canDecide`, le repli est écrit : le correctif devient un
**marqueur « relis cette entité »** pour cette entité-là seulement — jamais un « recharge tout »,
qui condamnerait la console en plein arbitrage de file.

### 3.4 La redaction s'applique au canal aussi

`canRevenue` décide du **contenu** des messages poussés, pas de leur affichage. Une régie qui
recevrait la recette dans un message de canal et ne l'afficherait pas est une fuite. Les salles
`channel:{id}` sont donc **filtrées à l'émission, par rôle** — concrètement, deux salles par
chaîne : `channel:{id}` et `channel:{id}:revenue`, la seconde n'étant rejointe que par les rôles
qui en ont le droit.

---

## 4. La battue de vie — le besoin que `studio-web` déclare bloquant

> « Il faut distinguer *la salle n'envoie plus* de *mon poste a perdu le réseau*. Ce sont deux
> écrans opposés : dans le premier on bascule l'écran d'attente, dans le second **il ne faut
> surtout rien couper** — la diffusion continue pour les spectateurs. »

L'application ne peut pas faire la différence seule : **l'absence de message est identique dans les
deux cas.** `studio-mobile` le redit autrement — un studio web est sur le réseau du bureau, un
studio mobile est sur la 4G d'une salle en sous-sol — et en fait un bloc entier de son document.

**La réponse, et elle sert trois besoins d'un coup :**

```
← ws:pulse  { serverTime: "2026-09-21T20:31:04.118Z", seq: 41287, lag: { health: 1.2 } }
            toutes les 5 secondes, sur les deux espaces de noms
```

1. **Le silence devient diagnostiquable.** Plus de `ws:pulse` pendant 15 s = **c'est moi qui suis
   sourd**. Un `ws:pulse` qui arrive sans échantillon de santé depuis 30 s = **c'est la salle qui
   n'envoie plus**. Deux états, deux écrans, aucune inférence.
2. **`serverTime` est l'horloge de référence de toutes les surfaces.** Le chronomètre de garde, la
   durée d'une réduction au silence, « la rediffusion expire dans 41 h », la fenêtre de priorité de
   liste d'attente, l'expiration d'un accès ponctuel, le décompte d'aperçu gratuit : tout se compte
   contre `serverTime` et un décalage mesuré, jamais contre l'horloge du téléphone — qui dérive en
   veille, saute au changement de fuseau, et est réglable par son porteur.
3. **`seq` donne le point de reprise** sans message supplémentaire.

**C'est aussi la réponse au filet de sécurité que `studio-mobile` réclame** : le réglage de chaîne
« écran d'attente automatique si le flux se perd plus de 15 s » est une **règle serveur**, portée
par le contrat comme valeur par défaut de chaîne, et son déclenchement produit un incident au même
titre qu'un déclenchement manuel (`IncidentTrigger.AUTO`). C'est la bonne réponse au cas « le
régisseur est injoignable » : elle ne dépend pas d'un poste de régie qui pourrait être celui qui a
perdu le réseau.

---

## 5. Reprise : trois réponses possibles, jamais un silence

Le système suspend le WebView d'une application mobile ; la connexion meurt **sans événement de
fermeture propre**. Au réveil, l'application doit **se resynchroniser, pas rejouer**.

```
→ resume  { channelId?, streams: { chat: 41200, moderation: 8812, journal: 3301 } }
```

Trois réponses, et **la deuxième est celle qui manque toujours** :

| Réponse | Sens | Ce que le client fait |
|---|---|---|
| `resume:events` | voici ce que tu as manqué | applique les correctifs dans l'ordre |
| **`resume:too_old`** | **le trou est trop grand, recharge le modèle entier** | recharge — et il le SAIT |
| `resume:invalid` | le curseur n'est plus valide : droits changés, chaîne quittée | recharge l'amorçage |

Sans `resume:too_old`, « le modérateur revient sur une file à laquelle il manque dix messages, et
rien ne le lui dit ». C'est le mot de `studio-mobile`, et c'est exactement le défaut.

**La fenêtre de reprise est bornée** : 30 minutes ou 5 000 événements par flux, selon ce qui arrive
en premier, tenu dans un `Stream` Redis par salle. Au-delà, `resume:too_old`. Le journal durable
reste dans Kafka : une console rouverte à 21 h 40 doit pouvoir **rejouer depuis 20 h 30** — le
journal du direct, la file, les chapitres et les incidents sont des **lectures durables**, pas des
restes de mémoire tampon. La reprise WebSocket couvre les minutes ; la lecture HTTP couvre les
heures.

### 5.1 Ce qu'on re-demande, ce qu'on reprend, ce qu'on jette

| | |
|---|---|
| **à re-demander** (durée de vie longue) | état d'antenne, incident en cours, file **avec ses prises en charge**, sanctions actives, chapitres posés, journal du direct depuis le lever de rideau, **état de publication et transitions offertes**, **présence de l'équipe** (§5.3), **série de santé** (§5.3) |
| **à reprendre depuis le dernier `seq`** | tchat, journal — ce sont des flux ordonnés |
| **à jeter** | toute mesure de flux antérieure à la reconnexion. Une courbe de débit se re-demande, elle ne se rejoue pas |

### 5.2 Le mobile, le retour au premier plan, et la rafale

Un autre besoin, propre au storefront mobile : au retour au premier plan, **toutes les lectures
observées se revalident en même temps** — les mécanismes automatiques de revalidation écoutent des
événements de navigateur qui n'existent pas en React Native et doivent être rebranchés à la main.
Un écran de compte en affiche une demi-douzaine ; une page de catégorie autant.

**Refuser une rafale au retour au premier plan, c'est refuser l'ouverture de l'application.**
Le contrat offre donc, en HTTP et non sur le canal :

```
GET /changes?since=<servedAt>&scope=<profil|chaîne>
→ { invalidated: ["date:xxx", "account:tickets", "home:rails"], servedAt, complete: bool }
```

Il rend **une liste d'invalidations, pas les données**. Le client décide alors quoi recharger, et
en une requête au lieu de douze. `complete: false` signifie « trop de changements, recharge tout » —
la même honnêteté que `resume:too_old`.

C'est aussi la réponse à `storefront-web` Q6 : le storefront **est** notifié des changements qu'il
n'a pas causés, et le chemin passe par le BFF, Kafka étant interdit hors inter-services. Pour le
rendu serveur de Next, le BFF expose en plus un **flux d'invalidations par étiquette** que le
serveur Next consomme pour appeler `revalidateTag`. Les étiquettes sont **nommées par le
contrat**, jamais inventées par une surface — sinon le mobile et la TV en inventeront d'autres.

### 5.3 Un différentiel sans instantané n'est pas un contrat

Deux promesses de ce document n'avaient **aucune lecture** en face, et `studio-web` l'a établi sur
les deux. Le défaut est le même : on pousse un différentiel et on n'expose jamais l'état initial.
Une console ouverte à 21 h 40 n'a alors **rien** à peindre, et le restera jusqu'au prochain
changement.

| Promesse | Où elle était écrite | Ce qui manquait |
|---|---|---|
| **présence de l'équipe** | §8 (« poussé ~10 s »), la salle `channel:{id}`, et `identity.GetChannelPresence` comptée dans les trois appels internes de `regie` (`context-map.md` §10.1) | aucune opération de BFF ne l'exposait, `RunConsole` ne la portait pas |
| **série de santé** | §5.1, colonne « à jeter » : *« une courbe de débit **se re-demande** »* | la série n'était demandable nulle part — le point d'entrée est en écriture seule, et seul le dernier échantillon était servi |

**Ce que le contrat doit porter, et c'est une exigence, pas une préférence :**

1. **Toute salle qui diffuse un différentiel expose un instantané.** C'est la règle générale que
   ces deux cas font apparaître, et elle vaut pour les suivantes.
2. **La présence est une lecture** : qui est en ligne sur cette chaîne, avec son rôle et son
   instant de dernière activité. Ce n'est pas cosmétique — la confirmation de coupure est
   littéralement *« couper met fin à la diffusion pour N spectateurs · **M autres personnes en
   ligne** »*, c'est le garde-fou du geste le plus destructeur de la régie, **dans un studio
   explicitement sans verrou**, et il était vide.
3. **La série de santé est une lecture bornée** : une fenêtre paramétrable (par défaut les trois
   dernières minutes — `studio-mobile` la demandait **courte**), avec le **pic de spectateurs et
   son heure**, qui se dérive de la série et n'est donc obtenable que par elle. Trois chemins la
   traversent tous les soirs : après un `resume:too_old`, après une reconnexion, ou simplement en
   ouvrant la console au milieu d'un direct.

**Les deux lectures sont comptées dans mon inventaire** (`context-map.md` §10.1 :
`identity.GetChannelPresence`, `streaming.GetHealthSeries`) — ce sont les **opérations de BFF** qui
manquaient, et elles appartiennent à `backend-contracts`. Signalé.

---

## 6. Passage à l'échelle de l'adaptateur Redis

### 6.1 Le montage

`@socket.io/redis-adapter`, branché dans un `IoAdapter` étendu, `server.adapter(createAdapter(pub,
sub))` dans `createIOServer`, et `useWebSocketAdapter()` **après la connexion des clients Redis et
avant `listen()`** — un appel plus tard est ignoré en silence.

**L'adaptateur relaie les diffusions, pas les requêtes de sondage.** Il faut donc, au choix :
**une affinité de session à Traefik**, ou des **clients en transport `websocket` seul**. Les deux
storefronts natifs et le studio mobile peuvent imposer `transports: ['websocket']` ; le web ne le
peut pas toujours, donc l'affinité reste nécessaire. C'est un des quatre arguments pour la
passerelle d'infrastructure (`context-map.md` §9).

**Redis est un usage à part entière**, distinct des trois autres : sessions (au BFF seulement),
cache par service, **adaptateur Socket.IO**, BullMQ interne à un service. L'instance de
l'adaptateur n'est **jamais** celle de BullMQ (qui exige `noeviction`) ni celle du cache.

### 6.2 Le vrai risque, nommé

Un composant **sans état se réplique** : toute la mémoire des passerelles est dans Redis (salles,
présence) et dans Kafka (journal). Ajouter une réplique suffit.

**Le danger est ailleurs, et il est double :**

1. **Le fan-out d'un direct très suivi.** 20 000 spectateurs dans `date:{id}:chat`, répartis sur N
   nœuds : l'adaptateur relaie **chaque message à chaque nœud**, qui l'écrit ensuite sur chacune de
   ses sockets. Le coût croît en N × messages, et le canal pub/sub de Redis devient le goulot.
2. **La passerelle qui devient épaisse.** Si elle acquiert un état local, un cache métier ou une
   règle, elle cesse de se répliquer : c'est un monolithe distribué — tout le couplage d'un
   monolithe, plus la latence du réseau.

### 6.3 Les mesures qui déclenchent une action

| Mesure | Seuil | Geste |
|---|---|---|
| `socketio_broadcast_lag_ms` p99, émission → client témoin | **> 500 ms sur 30 s** | activer les plafonds par salle (§2.2), puis **bander** la salle de tchat en `date:{id}:chat#0..7` — l'ordre est rétabli côté client par `(at_media_sec, seq)`, il n'est pas porté par la salle |
| `redis_pubsub_channel_bytes_per_sec` sur le canal de l'adaptateur | **> 20 Mo/s** | passer à `@socket.io/redis-streams-adapter` (qui donne en plus la reprise d'état), ou bander |
| `ws_connections_per_node` | **> 15 000** | ajouter une réplique |
| `ws_reconnects_per_minute` | **> 5 % des connexions** | l'affinité de session est cassée au proxy — ce n'est pas un problème d'application |
| `ws_pulse_gap_seconds` p99 | **> 15 s** | la passerelle est saturée : les deux studios vont afficher « je ne sais plus » à tort, ce qui est le pire résultat possible |

**Le bandage n'est permis que là où l'ordre est rétabli en lecture.** Le tchat, oui : un message
porte `at_media_sec` et `seq`. La file de modération, **non** : l'ordre d'arbitrage y est un
invariant, et la file d'un direct saturé se compte en centaines, pas en dizaines de milliers.

---

## 7. Ce qui ne doit surtout pas passer par le canal

| Donnée | Où elle passe | Motif |
|---|---|---|
| l'issue d'un paiement | **HTTP**, dans la réponse de la commande | une commande rend l'état projeté, pas un accusé ; et un paiement confirmé par un message est un paiement confirmé par le client |
| le jeton de lecture et son renouvellement | **HTTP**, sur le chemin critique | il doit échouer avec un code exploitable, et son budget est ≤ 1 s |
| la position de lecture | **HTTP**, écriture tolérante à la perte | une écriture par tranche de 30 à 60 s ne mérite pas un canal |
| la clé de flux | **HTTP**, `Cache-Control: no-store` | un secret ne transite pas sur un canal multiplexé partagé par une salle |
| les mesures de santé à la seconde | **Redis → canal**, jamais Kafka | un échantillon par seconde et par direct dans un journal durable est du gâchis |
| le compteur de spectateurs à la seconde | **Redis → canal** ; seul l'agrégat à la minute entre dans Kafka | idem |

---

## 8. Latences promises, par besoin

Récapitulatif opposable, que `backend-contracts` peut reprendre tel quel.

| Besoin | Surface | Latence | Mécanisme |
|---|---|---|---|
| incident levé / résolu | storefront ×3, studio | **≤ 2 s** | poussé, **non négociable** — le voile client en dépend |
| issue de date déclarée | storefront ×3, studio | ≤ 2 s | poussé |
| issue d'appairage | TV | **≤ 2 s** | **interrogation RFC 8628**, `pollInterval` servi à 2 s puis 5 s — **pas le canal** (`adr-auth.md` §5.3) |
| message de tchat | storefront, studio | ≤ 2 s | poussé, plafonné à la source |
| état d'un message (retiré, auteur sanctionné) | storefront, studio | ≤ 2 s | poussé |
| file de modération | studio | **≤ 1 s** | poussé, nominatif |
| état d'antenne | studio | immédiat | poussé |
| mesures de santé | studio | 1 à 2 s | poussé, avec `measured_at` |
| présence de l'équipe | studio | ~10 s | poussé |
| version des droits | studio | immédiat | poussé — elle invalide la navigation |
| compteur de spectateurs | storefront ×3 | 10 à 30 s | poussé par lot, différentiel |
| jauge, liste d'attente | storefront ×3 | 15 à 60 s | poussé par lot ; **la vérité est au moment de la commande**, pas à l'affichage |
| badge de notifications | storefront | 30 à 60 s | poussé sur `viewer:{id}` |
| ventes pendant un direct | studio | 10 à 30 s | poussé, salle `:revenue` |
| passage à l'antenne, ouverture de salle, expiration de rediffusion | **toutes** | — | **dérivé, aucun appel** |
| jauge affichée sur une page rendue au serveur | web | — | dérivé de `validUntil` |
