# Carte des contextes

> Écrit pour `backend-contracts`, qui en déduira les deux OpenAPI, le contrat des appels
> synchrones BFF → service, `definition-of-done.md` et `critical-rules.md`.
> Rédigé au temps 2, après lecture des cinq `needs/`, de `DECISIONS.md`, des 79 écarts de
> `corrections-handoff.md`, du dossier de passation corrigé et de `streaming.md`.
>
> **Identifiants en anglais, prose en français.** Tout vocabulaire fermé cité ici est celui qui
> fait autorité au contrat ; les tables parallèles des maquettes (E2) ne sont jamais reprises.

---

## 0. La règle qui commande toutes les autres

Cinq surfaces sur six ont posé, sous des formes différentes, la même question : *« l'état d'une
date est-il servi ou dérivé ? »* — `storefront-tv` (« une réponse qui livre PROGRAMMÉ est périmée
en vol »), `storefront-mobile` (Q1), `storefront-web` (forme 1, besoin 1), `studio-mobile` (§L'horloge).
Elles opposent deux principes du dossier qui semblent incompatibles : *aucune valeur calculée deux
fois*, et *une réponse doit rester juste huit heures après avoir été mise en cache*.

Elles ne sont pas incompatibles. L'arbitrage, qui vaut pour tout le reste de ce document :

> **Une règle vit une fois, dans `@arthome/core`. Elle s'évalue à plusieurs endroits.
> Ce qui est interdit, c'est deux *implémentations*, jamais deux *appels*.**

Conséquences immédiates, et elles courent dans tous les contrats :

1. Le contrat porte **les entrées** de la règle (les instants, les bornes, les politiques) **et**
   son résultat au moment du service, **et** l'instant où ce résultat cesse d'être vrai.
2. Le client n'invente rien : il rappelle la même fonction de `@arthome/core` quand `validUntil`
   est passé. Il ne réécrit pas la règle, il la réexécute.
3. Toute réponse porte `servedAt` (instant serveur) et, quand elle contient une valeur périssable,
   `validUntil`. C'est aussi ce qui règle l'horloge du téléphone : tout décompte affiché se
   calcule contre `servedAt`, jamais contre l'horloge locale.

Les fonctions concernées, nommées ici une fois pour toutes, et qui n'existent qu'à un seul
endroit : `displayStateOf`, `isRoomOpen`, `replayHoursLeft`, `progressOf`, `decideWatch`,
`effectiveRightsOf`, `overlapsWith`, `payoutOf`, `roundMinor`, `normalizeSearchCriteria`,
`nextPublicationTransitions`, `moderationBadgeOf`.

---

## 1. Les sept contextes, et pourquoi il n'y en a pas huit

Les trois familles orphelines de `corrections-handoff.md` (C7 abonnements, C8 boutique,
C9 annuaire et chaînes) sont **rattachées**, pas isolées. Le motif est écrit dans le dossier :
*« un service de plus se paie en exploitation, pour une personne seule »*. Mais un rattachement ne
vaut que s'il suit une frontière de **langage**, pas une frontière de commodité. Chacun est
justifié ci-dessous, et chacun est réfutable par un argument que j'écris aussi.

| Contexte | Langage | Ne possède pas |
|---|---|---|
| `identity` | qui est cette personne, sur quel appareil, et **de quel droit agit-elle** | le contenu, l'argent, la parole |
| `catalog` | ce qui est **publié** et comment on le trouve | la vente, la conduite, la parole |
| `ticketing` | ce que le spectateur **achète** et ce que cet achat **ouvre** | le droit de diffusion, le versement |
| `streaming` | la **conduite du direct** et le **droit de lire maintenant** | la vente, la publication |
| `chat` | la **parole** dans une chaîne et sa police | l'identité globale du compte |
| `payouts` | ce que la plateforme **doit** à une chaîne | l'encaissement |
| `notifications` | **atteindre** une personne hors de l'application | ce qu'il y a à dire |

### 1.1 `identity` — la personne, l'appareil, et le droit d'agir

**Possède.** Le compte (`Account`), ses profils d'appareil (`Profile`, jusqu'à cinq par téléviseur),
les identifiants de connexion, la 2FA, les clés d'accès, les sessions, les appareils
(`Device` — un appareil *est* une session, voir §7.1), les appairages d'appareil (`DevicePairing`),
les préférences de compte et d'appareil, les consentements horodatés et versionnés, les suivis
d'artiste et la liste de souhaits, l'annuaire des intervenants (`Person`), la **chaîne comme
espace de travail** (`Channel` : propriétaire, membres, ensembles de rôles, `grants`, invitations,
accès ponctuels à une date), et la **table des droits effectifs**.

Et — **rattachement rendu au temps 4** — le **journal du studio** : l'audit nominatif sur 24 mois
de tous les gestes, toutes chaînes et tous contextes confondus. Voir §1.9.

**Ne possède pas.** La face publique de l'artiste (c'est `catalog.Artist`). Le compte Stripe de la
chaîne (c'est `payouts`). Le bannissement d'un spectateur dans une chaîne (c'est `chat`).

**Pourquoi la frontière est là.** `corrections-handoff.md` C9 dit que `people` et `channels` sont
à cheval sur `identity` et `catalog`. Ils le sont parce qu'une chaîne a deux visages, et qu'on les
avait confondus. Je les sépare :

- la chaîne **comme organisation** — qui en est membre, avec quels rôles, qui peut inviter qui,
  qui a une clé de flux : c'est de l'**autorisation**. Une autorisation se vérifie par le jeton
  que le BFF émet, et un jeton ne peut porter que ce qu'`identity` sait. Donc `identity`.
- la chaîne **comme page publique** — nom, biographie, avatar, discipline, abonnés, spectacles,
  dates : c'est du **catalogue**. Donc `catalog.Artist`, en relation 1:1 avec `identity.Channel`
  par `channel_id`.

La preuve que la coupe est juste : aucune commande du studio ne traverse les deux. `inviteMember`,
`changeMemberRoles`, `grantDateAccess`, `transferOwnership` sont des écritures `identity` pures.
`updateChannelIdentity` (nom public, slug, visuel, vérification) est une écriture `catalog` pure —
et c'est bien ce que l'écran Réglages du studio montre : deux blocs qui ne se mélangent jamais.

**`grants` et le repli à six personas (E6).** Le contrat porte les **huit** rôles canoniques
(`artist`, `production`, `coordination`, `director`, `video`, `sound`, `moderation`, `treasury`).
Le repli à six (`artist`, `prod`, `regie`, `mod`, `coord`, `tres`) est **un libellé de
présentation** et ne figure dans aucune réponse : il détruit le droit d'invitation de `director`,
et `studio-web` comme `studio-mobile` l'ont vérifié indépendamment. `identity` sert, pour le couple
(personne, chaîne), un **ensemble** de rôles — une personne en tient plusieurs — et la projection
de `grants` sur ces rôles (`assignableRoles[]`), matérialisée, jamais la table à recomposer.

**Deux échelles d'accès, jamais confondues** (`studio-web`, §Multiplicité) :

| | `ChannelMembership` | `DateAccessGrant` |
|---|---|---|
| portée | la chaîne | **une date** |
| durée | permanente | **expire à un instant servi** |
| révocation | retire de la chaîne | retire de la date seulement |
| propriétaire | `owner: true`, `removable: false` | jamais propriétaire |

Les confondre ferait d'une révocation de renfort une exclusion de chaîne. Ce sont deux agrégats.

#### L'isolation entre chaînes est un **invariant**, pas une commodité

Les régisseurs et les modérateurs **ne sont pas nos salariés** : ce sont des collaborateurs des
artistes ou des indépendants qui travaillent sur plusieurs chaînes — `people` le modélise déjà
ainsi, avec `channels[]` et `runsCalled`, et une date sur douze est tenue par un renfort
indépendant.

Cela change la nature du besoin. Tant qu'on croyait parler d'employés, l'absence de déconnexion et
de révocation d'appareil côté studio (`studio-mobile` C6) était un **défaut d'ergonomie**. Avec des
tiers qui vont d'un artiste à l'autre, c'est un **défaut de protection des données** : un
indépendant verrait la file de modération, les pseudonymes et l'historique des spectateurs de
chaînes qui ne sont pas les siennes.

> **Toute lecture du studio est portée par une chaîne, et le droit se vérifie sur cette
> chaîne-là — jamais sur l'appartenance à une chaîne quelconque.** Aucune lecture de modération,
> d'audience, de journal ou de billetterie ne traverse une frontière de chaîne, même pour un
> propriétaire.

Trois conséquences, qui sont des invariants et non des filtres d'affichage :

- **les collections de `chat` sont indexées par chaîne** — `AudienceMember`, `ModerationItem`,
  `BannedWord`, les sanctions — et une requête sans `channel_id` n'existe pas ;
- **les deux seules lectures par personne** sont `person_duties` (mes gardes) et la boîte. Toutes
  deux ne portent que ce qui concerne **les chaînes où la personne a un accès vivant**, et un accès
  ponctuel expiré au tomber du rideau les retire **sans attendre une reconnexion** ;
- **un accès révoqué se voit dans la seconde** : `identity.rights_version.bumped.v1` fait quitter
  les salles de la chaîne perdue (`realtime.md` §3), et le jeton de service émis par le BFF ne vit
  que 60 s — c'est la borne de fraîcheur de l'autorisation, et elle est écrite.

**Réfutation possible.** On peut soutenir que `Channel` mérite son propre contexte `organisation`.
Je l'écarte parce que la seule chose qu'une chaîne fait sans `identity` est de porter un nom, et
qu'un nom n'est pas un invariant.

### 1.2 `catalog` — ce qui est publié

**Possède.** La taxonomie (2 univers, 21 disciplines, 176 sous-genres, 205 étiquettes, 7 groupes
d'attributs, le **rang éditorial**), l'artiste public, la salle, le spectacle, la **date** comme
objet public, la **publication** comme acte de la chaîne, l'**issue** de la date (`outcome`),
les **droits territoriaux**, la **politique de rediffusion** (la promesse, pas le fichier ni le
prix), les médias en renditions déclarées, l'**index OpenSearch et ses facettes**, les **recherches
enregistrées**, et les **modèles de lecture composés** que les deux BFF lisent (rangées d'accueil,
grille du soir, page de discipline, fiche de date, tableau des événements, agenda de chaîne).

**Ne possède pas.** La jauge, les tarifs, les promotions, la recette (`ticketing`). Le compteur de
spectateurs, la santé du flux, les chapitres, les incidents (`streaming`). Le régime de tchat
(`chat`). Les membres de la chaîne (`identity`).

**Pourquoi l'index lui appartient** (liste du chef, point 9). Les facettes dérivent de la
taxonomie, et la taxonomie est à `catalog`. Un service `search` ne posséderait aucun invariant,
aucune écriture, aucun vocabulaire : seulement une projection. Or un contexte est une frontière de
langage, pas un type d'infrastructure. Deux faits étrangers entrent dans le document indexé —
la disponibilité et le tarif d'appel, qui viennent de `ticketing` — et ils y entrent **par
événement Kafka consommé par l'indexeur de `catalog`**, jamais par une CDC qui lirait la base d'un
autre service. La règle « une base par service » n'est donc pas contournée par la porte de derrière.

**Conséquence, et elle est contraignante** : le connecteur *sink* OpenSearch de Kafka Connect,
que le README cite comme **l'unique argument** écartant Meilisearch, **n'est pas utilisable ici**. Il écrit un
document par message ; notre document est une composition de trois sources. L'index est écrit par
un consommateur `catalog-indexer` interne au service, qui recharge depuis son propre modèle
d'écriture et indexe avec `version_type: external` sur la version de la ligne — un rejeu tardif ne
peut donc jamais écraser une version plus récente. Debezium garde sa place, mais pour **publier
l'outbox**, pas pour alimenter l'index.

#### La comparaison des moteurs se rouvre, et OpenSearch gagne pour une autre raison

Je ne peux pas démolir le seul argument qui écartait Meilisearch sans rouvrir la comparaison. Je la
rouvre donc, et **la décision ne change pas — sa justification, si.**

> **Ce qui tient OpenSearch, ce n'est pas Kafka Connect. C'est le *percolator*.**

Une recherche enregistrée doit se déclencher quand une date **nouvelle** correspond à des critères
**anciens** : c'est une **requête inversée**, et c'est exactement ce qu'est un percolator — on
indexe les requêtes et on interroge avec un document. Toute la réponse à `storefront-web` Q23 en
dépend (`saved_search_percolator`, `catalog.saved_search.matched.v1`, et le fait que dix recherches
enregistrées coûtent **zéro** requête de comptage à l'ouverture de la page Compte).

| | OpenSearch | Meilisearch |
|---|---|---|
| requête inversée | **type `percolator` + requête `percolate`**, hérités d'Elasticsearch 7.10 et conservés au fork | **aucun équivalent** — `facetDistribution` compte des documents, et l'agrégation au sens large reste une demande ouverte |
| licence | **Apache 2.0** | double licenciement depuis : Community en MIT, Enterprise en **Business Source License** |

Sans percolator, il faudrait ré-exécuter N recherches enregistrées à chaque publication de date,
ou dix comptages à chaque ouverture d'une page Compte. C'est la différence entre une
fonctionnalité et une dette.

**Le raisonnement est rétrospectif dans la forme et juste dans le fond**, et je le dis comme tel :
le dossier d'origine a retenu le bon moteur pour un motif qui s'est révélé faux, et j'ai démoli ce
motif sans rouvrir la comparaison — ce qui était un manque. Le motif qui la tranche vraiment était
déjà dans ce document, une section plus bas, sans que personne ne fasse le lien.

**Une réserve consignée, parce qu'elle n'est pas jugée** : `search.allow_expensive_queries` est un
interrupteur qu'un exploitant coupe un jour de surcharge, et **les alertes de recherche enregistrée
s'arrêteraient alors en silence**. Il faut donc une sonde sur ce réglage, pas seulement sur le
retard de l'index. Je n'ai aucun ordre de grandeur sur le nombre de recherches enregistrées
attendu ; le risque est réel, son ampleur ne l'est pas.

**Pourquoi les recherches enregistrées lui appartiennent.** Le vocabulaire des critères est celui
des facettes ; la ré-exécution est une requête d'index ; le compteur de correspondances est un
comptage d'index ; et le déclenchement d'alerte quand une **nouvelle** date correspond est une
requête inversée — c'est exactement ce que fait un *percolator* OpenSearch. Les mettre ailleurs
obligerait à recopier la grammaire des filtres. `notifications` n'en reçoit que la conséquence.

**Réfutation possible.** Une recherche enregistrée est une donnée très personnelle et pourrait
vivre dans `identity`. Je l'écarte : elle serait alors inexécutable sans un appel synchrone vers
`catalog` à chaque comptage, et la grammaire des critères serait déclarée à deux endroits.

### 1.3 `ticketing` — ce que le spectateur achète, et ce que cet achat ouvre

Ce contexte absorbe **C7 (abonnements)** et **C8 (boutique)**. Son langage n'est pas « les
billets » : c'est **le commerce du spectateur et les droits qu'il ouvre**.

**Possède.** La jauge et ses paliers, la liste d'attente et sa fenêtre de priorité, les tarifs
(`full | reduced | support`), les promotions et leurs fenêtres, les frais de service, la
**commande de places** (`SeatOrder`) et la **commande de marchandise** (`MerchOrder`) — deux
commandes distinctes (D-011) —, le panier, le devis opposable, la place détenue et son **code de
place émis par le serveur**, les contremarques, l'**abonnement** (`Subscription`) et le catalogue
des formules avec leurs `opens[]` et leur `seatDiscount`, la **boutique** (articles, variantes,
stock, épinglage en direct), le **reflet en lecture seule** des commandes passées chez un tiers
(E14), l'encaissement Stripe et ses webhooks, les **issues commerciales** (remboursement, avoir),
l'**avoir de compte** (`Credit`), les factures, et le **droit d'achat projeté** que le storefront
lit (`viewer_entitlements`).

**Ne possède pas.** Le calcul du droit à versement et la TVA de l'artiste (`payouts` — voir §1.6).
L'émission du jeton de lecture (`streaming`). L'état de la date (`catalog`).

**Pourquoi les abonnements sont ici et pas dans `identity`.** Un abonnement est **un achat
récurrent** : il a un moyen de paiement, une échéance, une facture, un prorata, une résiliation,
un litige bancaire. Ce sont les invariants de `ticketing`, pas ceux d'`identity`. Et surtout :
`plan.opens[]` et `seatDiscount` conditionnent **le prix affiché** et **le droit de lire**, c'est-
à-dire les deux choses que `ticketing` sert déjà. Les séparer produirait deux intégrations Stripe,
deux magasins d'idempotence, deux politiques de remboursement, et un appel synchrone de plus sur
le chemin critique de la lecture.

**Pourquoi la boutique est ici et pas ailleurs.** Même argument : même client Stripe, même
enveloppe de commande, même flux de versement, même politique de remboursement. La marchandise a
ses propres invariants (stock, variante, expédition) : elle est un **agrégat distinct dans le même
contexte**, avec ses propres tables, jamais un champ de plus sur une commande de places.

**Une conséquence que je rends explicitement** (`storefront-web` Q15) : **une commande de
marchandise est mono-vendeur.** Un panier contenant les articles de deux chaînes **se scinde en
deux commandes au paiement**, chacune avec son port, sa commission et son versement. Motif
technique en plus du motif métier : le modèle Stripe retenu (`destination charges`, voir
`adr-payments.md`) n'admet **qu'une seule destination par paiement**.

**Réfutation possible.** `ticketing` devient le plus gros contexte du système et le plus chaud en
écriture. C'est vrai, et c'est le prix assumé. Le signal qui déclencherait la scission est écrit
au §8 : si `merch` et `subscription` dépassent ensemble 30 % des écritures du service, ou si la
file BullMQ de `ticketing` mêle durablement des travaux d'expédition et de billetterie, on extrait
`shop` — la frontière est déjà propre, les agrégats ne se touchent pas.

### 1.4 `streaming` — la conduite, et le droit de lire maintenant

**Possède.** La conduite (`Run` : état d'antenne, équipe tenue, caméras, profil de diffusion,
échelle de qualités), les **clés de flux** et leur rotation, l'autorisation d'ingestion, les
**mesures de santé** (débit, latence, images perdues, gigue — avec leur instant de mesure et leur
absence quand le protocole ne les fournit pas), le **compteur de spectateurs**, les **chapitres**,
les **incidents** (cause + issue + message de régie) et l'écran d'attente, l'**enregistrement** et
la **rediffusion** comme actif (existence, durée, instant d'expiration), le **jeton de lecture**,
la **session de lecture** et la limite d'écrans simultanés, le **budget d'aperçu gratuit**, et le
**point de reprise** (`ResumePoint`).

**Ne possède pas.** La *politique* de rediffusion (`catalog` : la promesse) ni sa *mise en vente*
(`ticketing` : le prix). `streaming` en possède le **fichier** et l'**instant d'expiration**, qui
se dérive de la fin du direct et de `windowHours` servi par `catalog`.

**Pourquoi le point de reprise est ici.** C'est l'écriture la plus fréquente du système
(`storefront-mobile` : « la plus fréquente de toutes »). La placer dans `identity` ferait du
service le plus froid et le plus sensible du système son chemin d'écriture le plus chaud. Elle est
de la même famille que la session de lecture : même producteur (le lecteur), même tolérance à la
perte, même cycle de vie.

**Pourquoi le droit de lire est ici, et pas dans `ticketing`.** Parce que c'est `streaming` qui
émet le jeton, et qu'un droit qui ne produit pas de jeton n'a pas d'effet. Voir §3, qui traite
`isWatchable` en entier.

### 1.5 `chat` — la parole et sa police

**Possède.** Le message et son **ancrage sur le temps média** (`at_media_sec`, en plus de l'instant
absolu), l'état du message, la **file de modération** et ses baux de prise en charge, les verdicts
et leur préséance, la **sanction sur la personne du public, au sein d'une chaîne**, le
**dictionnaire de mots filtrés** et son effet rétroactif, le régime de tchat de la date
(`chatMode`), le mode lent, la réserve aux détenteurs de place, le **public d'une chaîne** comme
collection interrogeable (`AudienceMember` — y compris ceux qui n'ont jamais écrit), et le
**journal de modération**.

**Ne possède pas.** La suspension globale d'un compte (`identity`) — qui est autre chose.

**La réponse à D6 / E3, et elle est structurante** (liste du chef, point 8). Quatre vocabulaires
existent dans `shared/` pour une même notion. Le défaut de fond n'est pas qu'ils divergent : c'est
que **`reported` est un état de triage logé dans le champ des sanctions**. Le contrat sépare donc
**trois axes**, jamais empilés :

| Axe | Porte sur | Vocabulaire au contrat | Propriétaire |
|---|---|---|---|
| `MessageState` | le message | `published` · `removed` | `chat` |
| `ModerationItemState` | la **ligne de file** | `reported` · `claimed` · `settled` | `chat` |
| `AudienceSanction` | la **personne, dans une chaîne** | `none` · `muted` (avec `expires_at` nullable) · `banned` | `chat` |

`ok` est renommé `published` (c'est le vocabulaire de l'i18n, et le seul qui dise ce qu'il fait).
`muted` et `banned` **disparaissent du message** : ils n'y ont jamais eu de sens, ils portent sur
la personne. Un message d'une personne bannie est `removed` ; la sanction, elle, est sur la
personne.

**La pastille unique** que les surfaces affichent est **une valeur dérivée**, `moderationBadgeOf`,
qui vit dans `@arthome/core` et compose les trois axes dans cet ordre de préséance :
`AudienceSanction.banned` > `AudienceSanction.muted` > `MessageState.removed` > `published`.
Servie, jamais recomposée.

**Pourquoi la personne bannie appartient à `chat` et non à `identity`** (`studio-mobile` Q6). Parce
que la sanction est **par chaîne** : la même personne est bannie chez un artiste et bienvenue chez
un autre. Une sanction par chaîne dans `identity` obligerait chaque verdict de modération — geste
le plus fréquent d'un direct saturé — à une écriture croisée vers le service le plus sensible du
système. Le bannissement porte sur la parole, pas sur le compte.

### 1.6 `payouts` — ce que la plateforme doit

**Possède.** Le **droit à versement** par date et par chaîne (brut, commission, **ventilation de
TVA par marché**, net), l'état du versement (`scheduled | held | paid | refunded | suspended`),
l'échéance (14 jours), la **retenue** tant qu'une issue est ouverte, le compte connecté Stripe de
la chaîne et son parcours d'inscription, la **demande de changement de coordonnées bancaires à
double signature**, la **réconciliation** avec le grand livre Stripe, la clôture de période, et
les **exports comptables** (journal des ventes, FEC, Sage, Cegid, factures groupées).

**Ne possède pas.** L'encaissement — c'est `ticketing`. **Stripe reste la source de vérité du
mouvement d'argent** : `payouts` ne reconstruit jamais son grand livre, il **réconcilie** le sien
avec lui et signale les écarts. Une période ne se clôt pas avec un écart non expliqué.

**Pourquoi c'est un contexte séparé de `ticketing`, alors que j'ai rattaché deux orphelins.**
Parce que ce sont deux langages différents avec deux interlocuteurs différents : `ticketing` parle
au spectateur (jauge, panier, remboursement) ; `payouts` parle à l'artiste et au comptable
(assiette, taux, retenue, écriture comptable, FEC). Et surtout : `payouts` n'a **aucune écriture
sur le chemin d'un achat**. Il consomme, il calcule, il verse. C'est la définition d'un contexte
en aval.

### 1.7 `notifications` — atteindre une personne hors de l'application

**Possède.** L'enregistrement d'appareil pour la poussée (jeton FCM/APNs, plateforme, version,
langue), les préférences par déclencheur et par canal, les **heures calmes** et leur exception
conditionnée à la détention d'une place, le **routage par rôle et par chaîne** pour le studio, la
**boîte du studio** (`inbox`), les rappels datés (`setReminder`), l'envoi, et le journal d'envoi.

**Ne possède pas.** Les **seuils** qui déclenchent une alerte : ils sont du domaine et vivent dans
`@arthome/core` (« 30 minutes avant », « 85 % des places », « 6 heures avant expiration »,
« file au-delà de dix messages », « poste non affecté à J-1 »). `notifications` les lit, ne les
invente pas. Réponse directe à `storefront-mobile` Q10.

**Règle de rédaction** (`studio-mobile` §Notifications) : **une notification ne porte jamais un
montant si le rôle destinataire n'a pas `canRevenue`.** Une notification s'affiche sur un écran
verrouillé.

### 1.8 Ce qui n'est **pas** un contexte : le catalogue de libellés (C6)

**Décision : aucun service.** `@arthome/core` détient les clés et le catalogue de référence ; un
travail de CI publie des **artefacts versionnés immuables** `/{surface}/{locale}/v{N}.json` sur
MinIO puis CDN ; chaque application embarque un **instantané au build** comme repli obligatoire.
La version courante est servie dans la charge utile d'amorçage (`ViewerContext.labelCatalog`),
jamais dans un appel par page.

**Pourquoi pas un service.** Il n'aurait aucun invariant, aucune transaction, aucun événement —
seulement une lecture de fichier statique, déjà mieux faite par un CDN. Le seul besoin réel
(corriger une coquille sans attendre une revue de magasin) est satisfait par la publication d'une
version d'artefact. Le jour où une rédactrice doit éditer la copie depuis le studio, cela devient
un écran du studio qui pousse dans le même pipeline, pas un service de plus.

**Conséquence pour `storefront-web` (Q30).** Le rendu serveur résout les codes i18n **depuis
l'instantané embarqué au build**, jamais par un appel réseau sur le chemin de rendu. Le catalogue
dynamique ne sert que mobile et TV. Une coquille corrigée n'est donc visible sur le web qu'au
prochain déploiement — c'est assumé, et c'est le bon compromis : le web se déploie en minutes.

**Et la taxonomie ?** Même régime (`storefront-mobile`, forme 4) : artefact versionné immuable,
`/taxonomy/{locale}/v{N}.json`, **servi par tranche et par surface** (le mobile ne charge ni le
vocabulaire du studio ni la table de touches TV), cache très long, embarqué au build comme repli.
59,5 Ko bruts / 8,4 Ko gzip : pas un appel d'API.

### 1.9 Le journal du studio appartient à `identity` — rattachement manquant, rendu au temps 4

**Le défaut.** J'ai trié sept contextes et rattaché trois familles orphelines ; **celle-ci m'a
échappé.** Le journal — 24 mois de conservation, une purge, un export, une rétention écrite — était
déclaré nulle part comme agrégat, absent du tableau des modèles de lecture, et composé par le BFF
studio depuis **cinq services** en `page + total`. C'est-à-dire, en une seule ligne, tout ce que ce
document interdit :

- une **jointure au moment de la requête**, sur le seul écran qui contredise frontalement
  `data-model.md` §4 (*« aucun écran n'est servi par une jointure au moment de la requête »*) ;
- un **total impossible** : il faudrait compter par période et par nature dans cinq services,
  appliquer la projection par rôle, trier l'union, puis en extraire la page 3. Aucun des cinq ne
  connaît le total des quatre autres ;
- et **un BFF qui tiendrait une table** pour s'en sortir — la ligne qu'il n'a pas le droit de
  franchir.

**La décision : `identity` possède le journal**, comme un modèle de lecture alimenté **uniquement
par consommation Kafka**.

**Pourquoi `identity`, et pourquoi ce n'est pas un huitième service.** Un journal répond à une
question, et une seule : *qui a fait quoi, quand, depuis quelle surface, sur quelle chaîne*. Le
sujet de la phrase est un **acteur**, et l'acteur est le langage d'`identity`. Et le rattachement
ne coûte **rien aux producteurs** : tout message porte déjà `actor-id` en en-tête (§EV 1.3) et un
`Actor` dans sa charge utile. `identity` n'a donc aucun champ à demander à personne — il consomme
ce qui circule déjà.

Trois conséquences qui règlent les trois défauts d'un coup : **une table, donc un total exact** et
la pagination `page + total` que D-010 prescrit au studio ; **aucune jointure** au moment de la
requête ; **aucune table dans le BFF**.

**Ce que cela met dans `identity`, et que j'assume.** Une entrée de nature `money` porte un
montant. C'est une donnée de `ticketing` projetée dans `identity` — mais le précédent existe et il
est déjà écrit : `channel_dues` y projette déjà des faits de `ticketing` et de `payouts` pour
refuser la suppression d'une chaîne. La **redaction par rôle** s'applique comme partout ailleurs :
sans `canRevenue`, la nature `money` est **absente de la réponse**, jamais présente et nulle.

**Réfutation possible, et elle est sérieuse.** J'ai écarté les points de reprise d'`identity` au
motif qu'ils feraient du service le plus froid le chemin d'écriture le plus chaud. Un journal est
aussi une écriture continue — mais de **quelques dizaines de gestes par jour et par chaîne**, pas
de plusieurs par seconde et par spectateur. Trois ordres de grandeur séparent les deux cas, et
c'est ce qui rend le rattachement acceptable ici et inacceptable là.

---

## 2. Les quatre propriétaires d'une « date » (liste du chef, point 1)

Une date est la chose la plus partagée du système. Elle porte, dans la maquette, huit familles de
champs appartenant à quatre contextes. Voici où passe la frontière, et pourquoi.

| Famille | Propriétaire | Motif de la frontière |
|---|---|---|
| identité, instant UTC, zone IANA de la salle, durée, taxonomie, médias, slug, URL canonique | `catalog` | c'est ce qui est **publié** |
| `rights` (portée + territoires + **code** de motif) | `catalog` | un droit de diffusion est une clause de contrat de spectacle, négociée avec la date |
| `replay.policy` + `windowHours` | `catalog` | c'est la **promesse** faite avant l'achat (principe n°5 du dossier) |
| `outcome` (`cancelled · postponed · interrupted`) | `catalog` | c'est un fait sur la représentation, décidé par la chaîne, affiché sur chaque carte |
| `publication.state` | `catalog` | c'est l'acte de la chaîne |
| `seats`, `prices`, promotions, frais, contremarques, `replay` **en vente** | `ticketing` | c'est ce qui **s'achète** |
| `revenue`, `sold` | `ticketing` (brut) → `payouts` (droit) | donnée de régie, **jamais** sur le modèle public (E8) |
| `run.state`, `viewers`, santé, chapitres, incidents, **actif** de rediffusion et son expiration | `streaming` | c'est ce qui **se diffuse** |
| `chatMode`, mode lent, réserve aux détenteurs | `chat` | c'est ce qui **se dit** |

### Les projections qui servent les écrans

Aucun écran n'appelle quatre services. Chaque écran est servi par **un modèle de lecture déjà
composé**, tenu par le contexte qui possède la majorité de ses invariants, et alimenté pour le
reste par les événements Kafka des trois autres.

| Modèle de lecture | Tenu par | Alimenté par |
|---|---|---|
| `date_card_public` | `catalog` | ses écritures + `ticketing.date_sales.availability_changed.v1`, `ticketing.date_sales.pricing_changed.v1`, `streaming.run.state_changed.v1`, `streaming.viewer_count.sampled.v1`, `streaming.replay.asset_ready.v1`, `chat.date_chat_policy.changed.v1` |
| `date_detail_public` | `catalog` | idem + distribution, chapitres (`streaming.chapter.posted.v1`) |
| `home_rails`, `live_grid`, `category_page`, `artist_page` | `catalog` | composés depuis `date_card_public` + l'index |
| `search_index` (OpenSearch) | `catalog` | idem, via `catalog-indexer` |
| `studio_date_sheet` (par volet) | `catalog` pour `public`/`replay` ; `ticketing` pour `tickets` ; `chat` pour `chat` ; `streaming` pour `tech` ; `identity` pour `crew` | chacun par ses propres écritures |
| `viewer_entitlements` | `ticketing` | ses écritures |
| `viewer_relations` | `identity` | ses écritures |
| `viewer_progress` | `streaming` | ses écritures |
| `channel_agenda`, `events_table` | `catalog` | + `ticketing.date_sales.availability_changed.v1` pour jauge et recette |
| `person_duties` (les gardes, toutes chaînes) | `identity` | + `catalog.date.scheduled.v1`, `streaming.run.state_changed.v1` |

**Le modèle de lecture du studio est projeté par rôle.** `canRevenue` ne masque pas une colonne :
**il décide de ce que la réponse contient**. Une régie qui recevrait le brut de billetterie dans sa
charge utile et ne l'afficherait pas est une fuite, pas une règle — la charge utile est en clair
dans un WebView, inspectable, et elle survit dans le cache HTTP du téléphone. Réponse directe à
`studio-web` Q2 et `studio-mobile` §3. **Corollaire** : une clé de tri sur un champ absent est
**refusée** (`SORT_KEY_FORBIDDEN`), jamais ignorée — un tri accepté en silence sur la recette
trahit l'ordre des valeurs qu'on n'a pas le droit de montrer.

---

## 3. `isWatchable` : la valeur la plus dangereuse du système (liste du chef, point 3)

Cinq sources : possession (`ticketing`), état de la date (`catalog`), droits territoriaux
(`catalog`), politique de rediffusion (`catalog` + `ticketing` pour la mise en vente), formule
d'abonnement (`ticketing`). Affichée sur chaque carte de chaque surface. Candidate n°1 au
« calculé deux fois ».

**L'arbitrage.**

1. **Une seule implémentation** : `decideWatch(inputs): WatchVerdict` dans `@arthome/core`.
   Entrées : possession, état d'abonnement et `opens[]`, état de la date et ses bornes, politique
   et fenêtre de rediffusion, mise en vente de la rediffusion, portée des droits et territoire du
   spectateur, budget d'aperçu restant, nombre de sessions de lecture ouvertes et plafond.
   Sortie : `{ allowed, reasonCode, fallbackAction, previewSecondsLeft, validUntil }`.
2. **Deux sites d'évaluation, une seule autorité.**
   - **À l'affichage** : le BFF storefront assemble les entrées depuis ses trois lectures groupées
     et appelle `decideWatch`. Le résultat est **indicatif et non opposable**, et il est déclaré
     tel dans le contrat. Il sert à peindre la carte sans second aller-retour — ce que la TV exige.
   - **À l'ouverture du lecteur** : `streaming` assemble les mêmes entrées depuis **ses propres
     copies projetées** (alimentées par les événements de `ticketing` et de `catalog`) et appelle
     `decideWatch`. **C'est la seule évaluation qui fait autorité**, parce que c'est la seule qui
     produit un jeton.
3. **Le même vocabulaire de refus des deux côtés.** Une carte qui annonce « abonnement requis » et
   un lecteur qui refuse pour la même raison disent le même code. Vocabulaire fermé :
   `NO_SEAT` · `ROOM_NOT_OPEN` · `OUT_OF_TERRITORY` · `SUBSCRIPTION_REQUIRED` · `NO_REPLAY` ·
   `REPLAY_EXPIRED` · `REPLAY_NOT_ON_SALE` · `PREVIEW_EXHAUSTED` · `CONCURRENT_LIMIT_REACHED` ·
   `DATE_CANCELLED`. Chacun produit un écran différent sur les trois storefronts ; un code
   générique en produirait un faux.
4. **Le droit ne se met jamais en cache côté client** (`storefront-mobile`, besoin n°5). Il expire,
   il dépend du territoire, il dépend de la limite d'écrans. Un droit relu depuis le disque est un
   droit faux. Le contrat le dit, et `validUntil` d'un verdict ne dépasse jamais 60 secondes.
5. **Revérifié au démarrage de la lecture, jamais hérité du catalogue.** Le pays du spectateur
   change entre les deux (déplacement, itinérance, réseau d'entreprise), et sur mobile ce délai se
   compte en heures.

**Ce que cela règle** : `storefront-tv` Q6, `storefront-mobile` Q4, `storefront-web` Q19.

**Ce que cela coûte** : `streaming` doit tenir une copie projetée de la possession et de
l'abonnement. C'est la seule projection du système qui porte une **autorité** et non un affichage,
et je l'accepte parce que l'alternative est un appel synchrone entre services — interdit — ou un
droit décidé par le BFF, qui n'a pas d'autorité.

---

## 4. `publicationState` verrouille des valeurs qu'il ne possède pas (liste du chef, point 2)

Le constat est juste : la publication engage le **tarif** (ticketing), la **mise en vente de la
rediffusion** (ticketing) et le **régime de tchat** (chat). Trois contextes, un agrégat.

**L'arbitrage : la publication ne verrouille rien qu'elle ne possède. Elle publie un fait ; chaque
propriétaire applique son propre verrou.**

```
catalog.Publication  ── publication.engaged.v1 ──►  ticketing   verrouille prices, capacity-shrink
                                                ──►  chat       verrouille chatMode
                                                ──►  streaming  ouvre l'ingestion
```

Concrètement :

- `catalog.Publication` porte l'état, la liste de contrôle, les transitions offertes **pour cet
  opérateur**, et les couples de transition sans retour. Elle ne porte **aucun tarif**.
- `ticketing` refuse `setPrices` sur une date dont il a reçu `publication.engaged` — avec son
  propre code, sa propre trace, son propre message. Il n'a pas besoin de demander à `catalog`.
- `chat` refuse de même `setChatMode` après engagement, sauf restriction (on peut toujours
  **fermer** un tchat en direct ; on ne peut plus l'ouvrir après engagement).
- La **porte de publication** (la liste de contrôle) est servie par `catalog`, mais **trois de ses
  sept éléments sont des faits projetés** : « au moins un tarif actif » et « jauge » viennent de
  `ticketing`, « tests techniques passés » vient de `streaming`. `catalog` les tient à jour par
  événement et **sert la liste des manquants** avec un identifiant par élément — jamais un
  pourcentage, que le client calculerait.

**La liste de contrôle qui fait foi** (`studio-web` Q7, incohérence 5) : **sept éléments**, ceux de
la fiche, pas les quatre des fixtures. Les quatre des fixtures sont un sous-ensemble arbitraire ;
les sept sont ceux qu'un écran a réellement exercés :
`title_and_discipline` · `poster` · `description` · `at_least_one_active_price` · `capacity` ·
`technical_check_passed` · `chat_mode_set`.
« Chapitres prévus » quitte la liste bloquante et devient un **avertissement** : on peut publier
une date sans chapitres, et le studio doit pouvoir le faire.

**Le verrou porte sur la transition, pas sur l'état** (E5, `studio-web` incohérence 6). Le contrat
porte des **couples** `from > to`, pas une liste d'états. Deux couples sans retour, avec leur
promesse engagée, qui voyage avec le refus :

| Couple | Promesse engagée | Code de refus |
|---|---|---|
| `draft\|reserve → scheduled` | *la publication engage le tarif affiché* | `TRANSITION_IRREVERSIBLE` |
| `ended → replay-online` | *des spectateurs ont payé pour la rediffusion* | `TRANSITION_IRREVERSIBLE` |

Et la tentative de marche arrière est **elle-même journalisée** (`studio-web` Q8) : une tentative de
revenir sur un tarif engagé est en soi une information de conduite.

---

## 5. Trois axes d'état sur une date, et leur hiérarchie (liste du chef, point 10 ; E4)

Aucun des trois ne porte l'état affiché, et chaque surface le recomposait à sa façon. Le contrat
écrit la hiérarchie **une fois**, et sert le résultat.

| Axe | Propriétaire | Vocabulaire | Ce qu'il décide |
|---|---|---|---|
| `publication.state` | `catalog` | `draft · reserve · scheduled · technical · live · ended · replay-online` | ce qui est public et ce qui est engagé |
| `run.state` | `streaming` | `idle · rehearsal · on_air · interrupted · ended` | l'antenne, et rien d'autre |
| `date.outcome` | `catalog` | `postponed · cancelled · interrupted` (nullable) | l'argent et le message au spectateur |

**Deux corrections que je rends au passage :**

1. `run.state` **perd** `postponed` et `cancelled`. Ces deux valeurs étaient des échos de
   `outcome` logés dans l'axe technique — la même faute que `reported` dans les sanctions. Une
   régie n'a pas d'état « annulée » : elle a un plateau qui n'envoie rien. `interrupted` reste,
   parce qu'il décrit une antenne réellement coupée, et il **cause** l'issue sans être l'issue.
2. `publication.state` porte un **rang explicite** (`order_rank`), servi avec lui. Le tableau des
   événements du studio trie par état, et l'ordre est celui de la machine à états, pas l'ordre
   alphabétique. Sans rang servi, chaque surface réinvente `STATE_ORDER` (`studio-web` Q5).

**La hiérarchie, écrite :**

> `outcome` prime sur `run.state`, qui prime sur `publication.state`.

Et le contrat sert **une quatrième valeur, dérivée et unique** : `displayState`, produite par
`displayStateOf(publication, run, outcome, instants, now)` dans `@arthome/core`, accompagnée de
`displayStateValidUntil`. Vocabulaire public : `scheduled · room_open · live · replay · ended`,
plus les trois issues qui le remplacent quand elles existent. C'est la seule valeur que les cartes
affichent, et personne ne la recompose.

> **Sur les DEUX produits, et le studio d'abord.** `studio-web` a mesuré 13 occurrences de
> `displayState` côté storefront et **0 côté studio**, ce qui est l'inverse du besoin : **c'est le
> studio qui a trois axes à réconcilier**, et ses libellés d'issue *remplacent* l'état
> (`ANNULÉE ET REMBOURSÉE`, `REPORTÉE · PLACES VALABLES`, `INTERROMPUE · AVOIRS ÉMIS`). Servir
> `state` + `orderRank` + `outcome` et laisser la surface les composer, c'est **exactement la
> seconde implémentation que ce paragraphe interdit** — laissée à la surface où l'erreur n'est pas
> une carte mal étiquetée, mais **une régie qui se trompe d'écran**.
>
> Tout modèle de lecture portant une date porte donc `displayState` et `displayStateValidUntil` :
> côté storefront `date_card_public` et `date_detail_public` ; **côté studio `channel_agenda`,
> `events_table`, `studio_date_sheet` et `person_duties`**. `orderRank` reste servi à côté, parce
> qu'il sert au **tri** par état, qui n'est pas le même besoin que l'affichage.

---

## 6. `outcome` : un événement, quatre conséquences (liste du chef, point 4)

`catalog.date.outcome_declared.v1` est publié une fois, par la chaîne, depuis le studio
(`decideOutcome`, réservé à `artist ∨ production`). Quatre contextes le consomment, et chacun
produit **sa** conséquence, sans se parler :

| Conséquence | Contexte | Détail |
|---|---|---|
| remboursement / avoir | `ticketing` | `cancelled` → remboursement intégral ; `interrupted` → **avoir** sur le compte ; `postponed` → **aucun mouvement**, la place suit la nouvelle date |
| retenue de versement | `payouts` | `held` tant qu'une issue est ouverte ; `refunded` si annulée |
| copie publique | `catalog` | l'issue remplace l'état sur **chaque carte**, pas seulement sur la fiche |
| affichage prioritaire | `catalog` | la date remonte dans « Mes places » et dans la boîte du studio |

**Ce que voit un spectateur dont l'écran était ouvert pendant la transition.** C'est la question
exacte du chef, et elle a une réponse précise, en trois temps :

1. **Dans la seconde** : le canal temps réel pousse `date.outcome` dans la salle `date:{id}:state`.
   Le lecteur **pose le voile d'incident par-dessus la vidéo intacte** — jamais une bascule de
   flux, `streaming.md` est formel — avec le message écrit par la régie, dans sa langue de
   rédaction. Le voile dit l'issue et ce qu'elle implique pour la place.
2. **Le jeton de lecture n'est pas révoqué dans le même geste.** Pour `postponed` et `cancelled`,
   la diffusion est de toute façon terminée ou n'a pas commencé. Pour `interrupted`, la lecture
   **s'arrête au refus du renouvellement suivant** (≤ 45 s) avec le code `DATE_INTERRUPTED`, pas
   par une coupure brutale : un flux coupé sans explication est exactement ce que le principe n°6
   interdit. La périphérie, elle, peut continuer à servir jusqu'à l'expiration du jeton en main
   (120 s) — c'est le client qui s'arrête, pas le CDN.
3. **La conséquence financière arrive ensuite, et elle est visible ailleurs.** Le spectateur ne
   voit pas son remboursement sur l'écran du lecteur : il le voit dans « Mes places », qui porte le
   **montant** et le **code de délai** (jamais la phrase « 3 à 5 jours ouvrés »). Le contrat
   n'invente pas une notification d'argent sur un écran de spectacle.

**Ce qui est interdit** : qu'une surface dérive l'issue d'autre chose que de `outcome`. La maquette
TV et la maquette studio la recomposaient toutes deux, différemment.

---

## 7. Deux systèmes de jetons (liste du chef, point 7)

Deux jetons, deux durées, deux vérificateurs, **jamais interchangeables**.

| | **Session** | **Jeton de service** | **Jeton de lecture** |
|---|---|---|---|
| émis par | BFF | BFF | `streaming` |
| porté par | cookie (web) / porteur (natif) | en-tête interne | requête signée vers le CDN |
| durée | **fixée par `adr-auth.md`** (session 7 j, glissement quotidien) | **60 s** | **120 s** |
| vérifié par | le BFF, contre Redis | chaque service, **par JWKS, localement** | la **périphérie du CDN** |
| révocation | magasin de sessions | expiration seule | bail de session de lecture |

**Aucun service n'appelle `identity` ni ne lit le magasin de sessions.** Le BFF valide la session,
puis émet un jeton signé court qui porte : `sub` (compte), `pro` (profil), `did` (appareil),
`chn[]` (chaînes accessibles) et `rol[]` (rôles effectifs par chaîne) pour le studio, `scope`,
`exp`, et le `traceparent`. Chaque service vérifie par JWKS, en local, sans réseau à chaud (jeu de
clés mis en cache, `kid` dans l'en-tête, **cadences de rotation fixées par `adr-auth.md` §8.1** —
30 j / grâce 24 h pour les deux BFF, 90 j / grâce 7 j pour le jeton de lecture et le
`device_token`. Les « 24 h avec deux clés vivantes » que portait une version antérieure de ce
paragraphe étaient un nombre plausible et faux : voir §7.0 et `adr-stream-entitlement.md` §3.4.

**Trois précisions que les surfaces ont exigées :**

- **Limite de sessions simultanées** : elle n'est pas portée par la session, mais par le **bail de
  session de lecture** (`adr-stream-entitlement.md`). Une session de compte et une session de
  lecture ne comptent pas la même chose.
- **`signOutDevice` doit produire un effet observable sur l'appareil visé** (`storefront-web` Q25).
  Il révoque la session **et** publie `identity.device.revoked.v1`, que `streaming` consomme pour
  **invalider les baux de lecture de cet appareil**. Le téléviseur affiche `SIGNED_OUT_ELSEWHERE`,
  pas une erreur réseau. **Fenêtre d'exposition : jusqu'à 120 s**, pas 60 — la révocation refuse le
  renouvellement suivant, mais le jeton déjà en main reste valide jusqu'à son expiration, et la
  périphérie du CDN n'en sait rien. Régime courant 45 à 75 s. Une version antérieure de ce
  paragraphe disait « ≤ 60 s » : c'était l'intervalle de renouvellement pris pour la garantie
  (`adr-stream-entitlement.md` §3.3).
- **Le studio mobile ne peut pas tenir sa session par cookie** (`studio-mobile` Q1) :
  `capacitor://localhost` est un contexte tiers sur iOS. Le BFF studio offre donc **une session
  porteuse de jeton à côté de la session par cookie** : jeton de rafraîchissement lié à
  l'appareil, conservé dans le magasin natif (`@capacitor/preferences`, jamais `localStorage`),
  jeton d'accès court, révocation par appareil. Le comportement au retour d'arrière-plan avec
  jeton expiré est **le rafraîchissement silencieux** ; une réauthentification en pleine garde est
  une faute. Le détail appartient à `adr-auth.md` ; la topologie est ici.

### 7.0 Le document JWKS n'a pas de contexte propriétaire — et c'est voulu

`adr-auth.md` §8.1 pose le mécanisme : **un document JWKS unique, statique, servi par le CDN**,
portant les clés publiques des quatre émetteurs (BFF storefront, BFF studio, entitlement de
lecture, `device_token`), distinguées par un préfixe de `kid`, en ES256, avec deux cadences de
rotation distinctes. Ce qu'il ne dit pas, et `auth` le remonte lui-même : **qui le possède**.

C'est une question pour cette carte, parce que la réponse conditionne une règle du projet :

> **« Aucun service n'appelle le service d'identité » doit rester vrai *y compris pour la
> découverte des clés*.**

Deux réponses la casseraient, et il faut les écarter explicitement :

| Fausse réponse | Ce qu'elle casse |
|---|---|
| `identity` sert le JWKS | **chaque service appellerait `identity`** à chaque construction de son jeu de clés — c'est la règle violée littéralement, par la porte de la découverte |
| un BFF sert le JWKS | les services dépendraient de **l'entrée**. La dépendance est inversée : un service ne doit rien attendre du BFF |

**Ma proposition — le JWKS est un artefact d'infrastructure, comme l'i18n et la taxonomie (§1.8),
et il n'appartient à aucun contexte.**

- il n'a **aucun invariant, aucune transaction, aucun événement** : c'est un fichier statique, et
  un service qui sert un fichier statique est un service à exploiter pour rien. Même raisonnement
  qu'en C6, et il a déjà servi deux fois ;
- **chaque émetteur ne publie que ses clés publiques** dans un préfixe de stockage objet ; un
  travail de `arthome-platform` les assemble en `/.well-known/jwks.json` et le pousse au CDN.
  **Aucune clé privée ne quitte son émetteur**, et aucun service n'en lit un autre ;
- le CDN met le document en cache agressivement — c'est précisément pourquoi `auth` impose deux
  cadences de rotation et une publication de la nouvelle clé **avant** de signer avec.

**Ce n'est pas tranché : je le propose, `backend-contracts` le traite aussi.** Le point où il faut
s'accorder est le **découpage du travail de rotation** — un seul travail qui engendre les quatre
paires (simple à exploiter pour une personne seule, mais il détient quatre clés privées) contre
quatre rotations indépendantes qui ne publient que du public (rayon d'explosion borné, quatre
choses à surveiller). Je penche pour le second, parce que le premier ferait d'un travail
d'infrastructure le point le plus sensible du système.

### 7.1 Appareil et session : deux objets, et c'est `adr-auth.md` qui les nomme (E13, E15)

`storefront-mobile` relève que la maquette traite appareils et sessions comme deux choses sans
dire laquelle fait foi, et E13 relève que `devices` a deux formes sous un seul nom. **La coupe
retenue est celle d'`adr-auth.md` §4/Q3, et elle est meilleure que celle que j'avais posée :**

- **`Device`** — l'appareil **enregistré**, durable, révocable, identifié avant toute session.
  Nature (`tv · mobile · tablet · desktop · stick · console · box`), libellé, ville dérivée de
  l'adresse, instant de dernière activité, drapeau « cet appareil ».
- **`DeviceSession`** — le couple **(appareil, profil)**. Un téléviseur de salon porte jusqu'à
  cinq profils, donc jusqu'à cinq sessions sur un seul appareil.

Deux gestes, et ils ne font pas la même chose : **« déconnecter un profil »** ferme une
`DeviceSession` — *« les autres comptes restent connectés »*, ce que la TV exige ; **« révoquer
l'appareil »** supprime le `Device`, toutes ses sessions **et ses baux de lecture**.

**Et les deux publient, chacun à son grain** : `identity.device_session.closed.v1` porte
`profile_id` et fait révoquer à `streaming` les baux du couple (appareil, profil) ;
`identity.device.revoked.v1` fait révoquer tous ceux de l'appareil. Sans le premier — qui manquait
— la distinction n'avait aucun effet sur la lecture : `signOutProfile` ne coupait rien, et la seule
issue était de révoquer l'appareil, donc de déconnecter les cinq profils du salon.

**L'identité d'appareil existe avant toute session** — réponse à `storefront-tv` Q3, et c'est un
oui franc. Elle est nécessaire à quatre choses, et ces quatre choses sont toutes demandées par les
surfaces : ouvrir un appairage de connexion, se nommer dans « appareils connectés », être révoquée,
et porter une limite de débit ailleurs que sur l'adresse IP (qu'un foyer partage).

---

## 8. L'appairage d'appareil : une primitive, cinq intentions

`corrections-handoff.md` le pose comme une question ouverte ; `storefront-tv` en a démontré la
nécessité en comptant cinq parcours. **Décision : une seule primitive, dans `identity`, conforme à
RFC 8628.**

```
identity.DevicePairing
  intent      signin | seat | plan | payment_method | merch
  payload     dépend de l'intention, opaque à identity, relayé au service cible
  deviceId    l'identité d'appareil (§7.1)
  profileId   le profil qui a ouvert l'appairage — nullable pour `signin`
```

- `userCode` : **six caractères**, et **l'alphabet exact est déclaré par `adr-auth.md` §5.1** —
  un sous-ensemble sans glyphes confusables, dimensionné au-dessus du seuil d'entropie de la
  §5.1 de RFC 8628. Je ne le redéclare pas ici : deux déclarations d'un même alphabet sont
  exactement la table littérale parallèle que E2 décrit. Ce que le modèle de données impose, en
  revanche : unicité **parmi les appairages en cours seulement** — un code se réutilise une fois
  expiré, sinon l'espace s'épuise — plafond de tentatives par code **et par appareil**, et
  verrouillage après échecs.
- `verificationUri` et `verificationUriComplete` (le QR, code inclus) : **servis tous les deux**,
  jamais fabriqués par la surface.
- **Durée par intention** (`storefront-tv` Q4) : `signin` 15 min (on cherche son téléphone, on fait
  une 2FA) ; `seat` et `merch` **5 min** (au-delà, la jauge affichée n'est plus vraie) ; `plan` et
  `payment_method` 10 min. Servie dans `expiresAt`, jamais codée sur la surface. L'écran d'attente
  **n'affiche pas de compte à rebours** : la TV s'en sert pour renoncer, pas pour inquiéter.
- **Cycle de vie** : `pending → approved | denied | expired | cancelled`, plus
  **`approved_with_failure`** pour les intentions d'achat — le téléphone a terminé mais l'achat a
  échoué (complet entre-temps, paiement refusé). Cinq codes distincts, parce que la TV dit cinq
  choses différentes.
- **Rattachement après redémarrage** : la TV persiste `pairingId` et appelle `attachPairing`
  plutôt que d'en ouvrir un second. Sans cela, un téléviseur redémarré pendant le paiement affiche
  l'accueil pendant que le paiement aboutit dans le vide.
- **Un téléviseur est partagé** (`storefront-tv` Q2). Pour les **quatre intentions d'achat**,
  l'appairage est lié au **profil qui l'a ouvert** : un téléphone qui approuve sous une autre
  identité est **refusé** avec un code distinct (`PAIRING_IDENTITY_MISMATCH`), et le téléphone
  propose « changer de compte » — un geste de la personne, jamais du système. Motif : une bascule
  implicite ferait payer le mauvais moyen de paiement, créditerait les mauvais droits et livrerait
  la place au mauvais compte, dans un salon, au moment précis où deux personnes regardent le même
  écran. **`signin` est l'exception et n'en est pas une** : il n'y a pas de profil ouvreur, donc
  l'appairage est lié à l'**appareil**, et un téléphone connecté sous une autre identité est le
  cas nominal — c'est le sens même d'« ajouter un compte ». Aucun `MISMATCH` n'y est possible.
- **Ce qui n'est pas un appairage** : le QR de la page compte, qui renvoie vers la gestion du
  compte sur téléphone. C'est un **renvoi** (`AccountDeepLink`), rien n'attend, l'écran ne bascule
  pas. Deux formes distinctes au contrat, sinon on implémentera une attente là où il n'y en a pas.

**Comment la TV apprend l'issue** (Q1) : **interrogation périodique conforme à RFC 8628, et pas
le canal temps réel.** C'est la décision d'`adr-auth.md` §5.3, et **je m'y range en retirant celle
que j'avais posée** (une poussée sur une salle `device:{deviceId}`).

Son motif est le bon : au moment de `signin`, faire entrer une identité d'appareil dans l'espace de
noms WebSocket **élargirait sa surface d'attaque pour gagner quelques centaines de millisecondes**.
Et l'exigence de la TV — bascule en deux secondes au plus — est tenue sans cela : `pollInterval`
est servi à **2 s pendant les 60 premières secondes**, puis 5 s. C'est une décroissance **servie
par le serveur**, donc modérable comme `storefront-tv` le demande, et elle coûte au plus **trente
requêtes par appairage**. Contre une salle WebSocket accessible avant toute session, l'échange
n'est pas bon.

`slow_down` est honoré, et la TV n'interroge jamais plus vite que l'intervalle servi.

---

## 9. Topologie d'entrée

```
                    ┌─────────────────────────────────────────────┐
  web · mobile · TV │                  Traefik                    │  TLS, routage par hôte,
  studio web/mobile │  (passerelle d'infrastructure, configurée)  │  limites de débit grossières,
                    └───────┬─────────────────────────┬───────────┘  WebSocket upgrade, affinité
                            │                         │
                 ┌──────────▼────────┐     ┌──────────▼────────┐
                 │  bff-storefront   │     │    bff-studio     │  session, CORS, enveloppe
                 │  + ws /storefront │     │  + ws /studio     │  d'erreur, idempotence,
                 └──────────┬────────┘     └──────────┬────────┘  composition, jeton de service
                            │   appels synchrones (le seul sens autorisé)
        ┌────────┬──────────┼──────────┬──────────┬──────────┬─────────┐
     identity  catalog  ticketing  streaming    chat      payouts  notifications
        └────────┴──────────┴────┬─────┴──────────┴──────────┴─────────┘
                                 │  Kafka — outbox + Debezium — le seul canal inter-services
                                 ▼
                  PostgreSQL ×7 · Redis ×4 usages · OpenSearch · MinIO
```

### Pourquoi une passerelle d'infrastructure **et** deux BFF, dès le départ

La mission demande un argument, pas une préférence. Le voici, en quatre points, dont trois sont
des besoins exprimés par les surfaces :

1. **Le TLS, le routage par hôte et les limites de débit grossières sont de la configuration.**
   Les réécrire en NestJS serait refaire, moins bien, ce qu'un proxy standard fait en dix lignes.
   **Écartée d'avance, et je confirme l'écart** : une passerelle applicative NestJS qui ne ferait
   que redispatcher. Elle n'aurait aucun invariant et deviendrait le goulot partagé.
2. **Le WebSocket a besoin d'elle.** L'adaptateur Redis de Socket.IO relaie les diffusions, pas les
   requêtes de sondage : il faut **soit une affinité de session, soit des clients en transport
   `websocket` seul**. Les deux se règlent au proxy, pas dans l'application.
3. **`storefront-tv` remonte une exigence jusqu'à la passerelle** : *« toute réponse du système, y
   compris en surcharge, doit porter l'enveloppe d'erreur avec son code et son identifiant de
   trace »*. Une passerelle qui renvoie une page HTML brute rend impossible la distinction entre
   « votre connexion » et « nos serveurs », et le spectateur va redémarrer sa box. Traefik doit
   donc être configuré pour servir **une page d'erreur JSON conforme à l'enveloppe** sur les 5xx
   qu'il produit lui-même. C'est une ligne de `definition-of-done.md`, et `backend-contracts`
   doit la porter.
4. **Le CORS ne peut pas être à la passerelle.** Il doit connaître les chaînes littérales
   `capacitor://localhost` et `https://localhost` (`studio-mobile`), renvoyer l'origine telle quelle
   avec des requêtes créditées, et `capacitor://` est un schéma non standard qu'un analyseur d'URL
   rejette. C'est une vérification **par chaîne littérale**, donc applicative, donc au BFF.

**Un BFF par produit**, jamais un seul partagé : les deux produits ont des sessions différentes
(cookie contre porteur), des pagination différentes (curseur contre page + total), des enveloppes
de réponse différentes (projection par rôle contre projection par spectateur) et des cycles de
déploiement différents.

**Ce que les BFF n'ont pas le droit de faire** : porter une règle de domaine. Le prix, la remise,
le droit de lire, l'ordre des rangées, le seuil de rareté, le calcul d'un versement — tout cela est
dans `@arthome/core`, exécuté par le service propriétaire. Le BFF **compose et adapte**. La seule
chose qu'il évalue lui-même est `decideWatch` en mode indicatif (§3), et le contrat le déclare tel.

### Le vrai risque, nommé

Un composant **sans état se réplique** : Traefik, les BFF et les passerelles WebSocket n'ont aucun
état local (session dans Redis, diffusion dans Redis, journal dans Kafka), donc ils montent en
ajoutant des répliques. Le danger n'est pas la charge : **c'est qu'une passerelle devienne
épaisse.** Un BFF qui se met à calculer un prix, à tenir un cache métier ou à joindre trois
services en mémoire devient un monolithe distribué — tout le couplage d'un monolithe, plus la
latence du réseau. La mesure qui déclencherait une action est au §11.

---

## 10. Le compte d'appels synchrones BFF → service

**Compté, pas supposé**, à partir des cinq `needs/`. Un appel synchrone ne va que du BFF vers un
service ; entre services, rien.

### 10.1 En lecture — le compte est bas parce que les modèles sont projetés

| BFF | Méthodes de lecture distinctes | Appels **par écran** |
|---|---|---|
| storefront | **22** | **1 à 4**, tous parallèles |
| studio | **38** | **1 à 3** |
| **total** | **60** | |

Le détail qui compte, écran par écran, sur les écrans les plus lourds :

| Écran | Appels internes | Lesquels |
|---|---|---|
| `home` (TV, web, mobile) | **4** | `catalog.GetHomeRails` + trois surcouches par spectateur, groupées par lots d'identifiants : `ticketing.GetViewerOverlay`, `identity.GetViewerRelations`, `streaming.GetViewerProgress` |
| `live` / `category` / `artist` / `search` | **4** | même schéma : un modèle composé + trois surcouches |
| `title` (fiche de date) | **4** | idem, avec `date_detail_public` |
| `boot` (`ViewerContext`) | **1** | `identity.GetViewerContext` |
| `confirm` (issue d'appairage) | **0** | tout vient de `PairingOutcome` |
| `player` | **1** | `streaming.OpenPlayback` — chapitres, pistes, régime de tchat, incident, reprise, bord du direct, DRM, plafond de qualité : **tout dans la même réponse** |
| `regie` (studio) | **3** | `streaming.GetRunConsole`, `chat.GetModerationQueue`, `identity.GetChannelPresence` |
| `event` (fiche de date, studio) | **1 + 1 par volet ouvert** | `catalog.GetDateSheet` puis le volet chez son propriétaire |
| `payouts` | **1** | `payouts.GetPayouts` |

**Le fan-out maximal est 5, pas 4 — et il faut le dire, parce que le seuil d'alerte est à 4.**
Deux opérations le franchissent au jour de la livraison : `getDateDetail`
(`catalog, ticketing, identity, streaming, chat`) et la lecture du journal de chaîne. La décision
de transport ne s'en trouve pas retournée — 5 n'est pas 12, et la profondeur reste 1 — mais
**la phrase qui la justifie serait fausse**, et c'est elle qu'on relira dans six mois.

Les deux cas ont chacun leur remède, et ce sont des remèdes de modèle de lecture, pas de seuil :

- **le journal** : il passe de cinq services à **un** avec le rattachement du §1.9 ;
- **`getDateDetail`** : le volet `chat` est **appelé et déjà projeté** — `date_detail_public` est
  alimenté par `chat.date_chat_policy.changed.v1` (`data-model.md` §4). L'appel est donc en trop,
  et c'est exactement le geste que le seuil prescrit : *« le modèle de lecture manque »* — sauf
  qu'ici il ne manque pas, on ne s'en sert pas.

Le seuil reste à **4**, et je refuse de le monter à 5 pour couvrir une composition qu'on peut
supprimer. Un seuil qu'on relève pour faire taire une alerte cesse d'être un seuil.

**Les trois surcouches sont un lot, jamais un appel par carte.** Elles prennent une liste
d'identifiants et rendent une table. Et le BFF storefront les met en cache par profil dans Redis
(TTL 30 s, invalidé par les écritures du profil) : en régime établi, `home` retombe à **1 à 2**
appels internes.

**Le compte que `storefront-tv` annonçait est donc confirmé** : *« en lecture, si les modèles sont
projetés, la TV n'en exige aucun »* — aucun de plus, s'entend : un seul modèle composé plus les
surcouches partagées par tous ses écrans.

### 10.2 En écriture — le compte est haut, et c'est structurel

| Contexte | storefront | studio | total |
|---|---:|---:|---:|
| `identity` | 26 | 13 | **39** |
| `catalog` | 5 | 12 | **17** |
| `ticketing` | 14 | 12 | **26** |
| `streaming` | 4 | 15 | **19** |
| `chat` | 3 | 13 | **16** |
| `payouts` | 0 | 5 | **5** |
| `notifications` | 9 | 1 | **10** |
| **total** | **61** | **71** | **132** |

**Total général : 60 lectures + 132 écritures = 192 méthodes synchrones BFF → service.**

### 10.3 Ce que ce compte pesait, et comment le transport a été tranché

J'ai donné le compte et la matière ; **`backend-contracts` a tranché**, comme la mission le
prévoit. La pesée est conservée telle que je l'avais écrite — elle explique pourquoi la décision
n'allait pas de soi — et la décision est consignée à la fin.

**Ce qui plaidait pour gRPC.**
192 méthodes typées, décrites une fois. Les schémas Protobuf existent déjà pour les événements et
l'outillage `buf` est déjà en place : le générateur de clients est gratuit. Un appel BFF → service
a un **délai** (`deadline`) qui traverse et se propage, ce qu'HTTP/JSON n'offre pas nativement —
et sur le chemin critique de `OpenPlayback` (budget ≤ 1 s dans un budget total de 10 s jusqu'à la
première image), ce n'est pas un confort. Les lectures groupées (surcouches par lot d'identifiants)
sont exactement ce que gRPC fait bien.

**Ce que gRPC coûtait à une personne seule.**
`h2c` à configurer dans Traefik (le proxy doit parler HTTP/2 en clair vers les services, ou il faut
du TLS interne). Pas de `curl` : déboguer un appel demande `grpcurl` ou la réflexion, et la
réflexion ne doit pas être exposée en production. Des sondes distinctes : `grpc-health-check` au
lieu d'un `GET /health`. Un arrêt gracieux qui n'est pas celui par défaut (`gracefulShutdown: true`
est non documenté, et le défaut coupe les appels en vol à chaque déploiement). Et un équilibrage
de charge côté client (`round_robin` + `max_connection_age_ms`), parce qu'un Service ClusterIP
épingle un seul pod.

**Ma recommandation était gRPC pour les 60 lectures. `backend-contracts` a tranché l'inverse, et
il a raison — je consigne le résultat et les deux arguments qui m'avaient échappé.**

> **Décision : HTTP/JSON décrit en OpenAPI 3.1, pas de gRPC.**

Ce qui a emporté la décision n'est pas le compte de 192, mais **1 et 4** :

- **profondeur de chaîne : 1, par construction.** Ma propre règle — aucun appel entre services —
  fait qu'un délai n'a **personne à qui se propager**. Or la propagation du `deadline` était mon
  meilleur argument pour gRPC ; il tombe de lui-même. Pire, `nestjs-grpc` établit que **Nest ne
  coupe jamais un handler unaire** : le délai gRPC n'arrête pas le destinataire, c'est le même
  travail à la main qu'en HTTP ;
- **fan-out maximal : 4**, et tous parallèles. On n'est pas dans le régime où le typage d'un
  transport binaire paie.

Et un argument qui touche directement ce que ce document défend depuis le début : gRPC ferait
passer de **deux à trois** les déclarations manuscrites de chaque vocabulaire fermé — l'union dans
`@arthome/core`, le proto d'événement, **plus** un proto de service. Soit **+50 % de surface
exposée à E2**, la faute dominante du projet, pour un gain de latence que le fan-out ne justifie
pas. J'avais listé le coût d'exploitation au paragraphe précédent ; c'est celui-là qui manquait.

---

## 11. Les points chauds, et la mesure qui déclenche une action

Pas de « ça pourrait scaler ». Trois risques réels, chacun avec le seuil qui commande un geste.

### (a) Les jointures au moment de la requête

**Le risque.** Un écran servi par sept appels internes parce que le modèle de lecture manque. C'est
exactement ce que toute cette architecture événementielle existe pour éviter.

| Mesure | Seuil | Geste |
|---|---|---|
| `bff_upstream_calls_per_request` p95 | **> 4** sur un écran de liste | le modèle de lecture manque : le créer dans le contexte majoritaire |
| `bff_request_duration_ms` p95 | **> 400 ms** sur une lecture publique | idem, ou la surcouche n'est pas groupée |
| `read_model_staleness_seconds` p99 (âge du dernier événement appliqué) | **> 30 s** | le consommateur de projection décroche : augmenter `partitionsConsumedConcurrently`, ou le nombre de partitions |
| `search_index_lag_seconds` p99 | **> 60 s** | l'indexeur décroche ; une date publiée n'est pas trouvable |

Rappel de `storefront-web` §4 : la clé de cache de Next inclut l'identifiant de build, donc **un
déploiement vide tout** et la première minute voit passer l'intégralité du trafic de lecture vers
le BFF. C'est un argument indépendant, et décisif, pour que les lectures publiques soient des
modèles servis et non des compositions coûteuses. Si `bff_request_duration_ms` p95 explose dans la
minute qui suit un déploiement du web, c'est ce défaut-là.

### (b) La clé de partition d'un spectacle populaire

**Le risque, nommé précisément.** La clé de partition est l'identifiant d'agrégat (règle
`nestjs-kafka` n°7). Sur un direct très suivi, `dateId` concentre sur **une seule partition** le
tchat, la modération, les achats et les échantillons d'audience de ce spectacle. Une partition est
une file : elle ne se parallélise pas.

| Mesure | Seuil | Geste |
|---|---|---|
| `kafka_consumergroup_lag` sur une **partition unique** de `arthome.chat.date` | **> 10 000 messages ou > 30 s** | passer la clé du sujet `chat` de `date_id` à `date_id#shard`, le nombre de bandes étant **servi dans le contrat** |
| `kafka_consumergroup_lag` sur `arthome.ticketing.order` | **> 30 s** | augmenter les partitions ; la clé reste `date_id` (l'ordre y est un invariant de jauge) |
| déséquilibre `partition_bytes_in` max/médiane | **> 10×** | même diagnostic |

**Pourquoi le bandage est permis sur le tchat et interdit sur la billetterie.** L'ordre d'un tchat
est rétabli côté lecture par `(at_media_sec, seq)` : il n'est pas porté par la partition. L'ordre
des achats sur une date **est** l'invariant de la jauge : il doit rester dans une partition.

**Et le compteur de spectateurs ne passe pas par Kafka à la fréquence de l'échantillon.** Un
échantillon par seconde par direct sur un journal durable est du gâchis. Le compteur circule sur
**Redis** (diffusion), et seul un **agrégat à la minute** entre dans Kafka pour l'historique et les
statistiques. C'est la frontière Kafka/Redis de `streaming.md`, appliquée.

### (c) La diffusion WebSocket d'un direct très suivi

**Le risque.** 20 000 spectateurs dans la salle `date:{id}:chat`, répartis sur N nœuds. L'adaptateur
Redis relaie **chaque message à chaque nœud**, qui l'écrit ensuite sur chacune de ses sockets. Le
coût croît en N × messages, et le canal Redis devient le goulot.

| Mesure | Seuil | Geste |
|---|---|---|
| `socketio_broadcast_lag_ms` p99 (émission → réception client témoin) | **> 500 ms sur 30 s** | activer le plafond serveur par salle (voir ci-dessous), puis bander la salle |
| `redis_pubsub_channel_bytes_per_sec` sur le canal de l'adaptateur | **> 20 Mo/s** | passer à `@socket.io/redis-streams-adapter`, ou bander |
| `ws_connections_per_node` | **> 15 000** | ajouter une réplique (le composant est sans état) |
| `ws_reconnects_per_minute` | **> 5 % des connexions** | l'affinité de session est cassée au proxy |

**Le plafond est appliqué à la source, pas au client.** `storefront-tv` l'exige et a raison : une
TV ne peut pas absorber un flux à haut débit pour en jeter 95 %, chaque message rejeté ayant coûté
du parsing et de l'allocation sur un appareil qui décode déjà de la vidéo. Le serveur applique donc
**un plafond par salle et par surface** (TV : 2 msg/s ; web et mobile : 10 msg/s), avec une
sélection faite en amont, et un historique de rattrapage court à l'entrée (20 messages sur TV,
50 ailleurs). Réponse à `storefront-tv` Q11.

**Le vrai danger n'est aucun des trois.** C'est qu'une passerelle devienne épaisse (§9). La mesure :
si le BFF acquiert une table qu'il écrit lui-même, ou un cache dont l'invalidation devient une
règle métier, il a franchi la ligne. Ce n'est pas une métrique, c'est une revue — et c'est une
ligne de `definition-of-done.md`.

---

## 12. Ce qui relève de CQRS, et ce qui n'en relève pas

Pas par principe. La règle que j'applique : **CQRS là où le modèle d'écriture et les formes de
lecture divergent réellement, et nulle part ailleurs.** Ailleurs, service + repository + DTO.

| Contexte / module | Régime | Justification |
|---|---|---|
| `catalog` — publication, date, issue | **CQRS complet** (bus de commandes, agrégats, projections) | Sept états, deux transitions sans retour, une liste de contrôle alimentée par trois contextes, une concurrence optimiste multi-opérateurs, **et** six modèles de lecture radicalement différents du modèle d'écriture (rangées, index, tuiles, fiche par volet). Le divorce est total. |
| `ticketing` — place, jauge, commande | **CQRS complet** | La jauge est un invariant de concurrence pure ; les lectures sont des projections par spectateur et par chaîne. Et le modèle d'écriture (une commande, un paiement, une issue) n'a rien de la forme lue (une carte de place avec sa fenêtre de rediffusion). |
| `chat` — modération | **CQRS complet** | Verdicts conditionnels, baux, préséance, reclassement rétroactif, et une file lue par plusieurs personnes en même temps. |
| `streaming` — conduite | **commandes seulement**, pas de bus de requêtes | Les écritures sont des commandes de régie avec invariants (on ne passe pas à l'antenne sans contrôle technique). Les lectures sont des séries temporelles courtes : un repository suffit, un bus de requêtes serait de la cérémonie. |
| `identity` — droits et chaînes | **agrégats sans bus** | `Channel` et `ChannelMembership` ont de vrais invariants (le propriétaire n'est jamais retirable ; un rôle attribuable dépend de `grants`), donc des agrégats et des méthodes. Mais une seule forme de lecture, et elle ressemble au modèle d'écriture. Pas de bus. |
| `identity` — préférences, consentements, suivis, liste | **service + repository** | CRUD. Des agrégats ici seraient de la cérémonie sur des tables plates. |
| `payouts` | **service + repository + machine à états** | Le calcul est du domaine pur (`@arthome/core`), la persistance est une ligne par date. La complexité est fiscale, pas structurelle. |
| `notifications` | **service + repository + file** | Aucun invariant croisé. |
| `identity` — appairage | **agrégat, sans bus** | Une machine à états courte (cinq issues) avec une expiration. |

**Ce que je refuse explicitement** : le *event sourcing*. `@nestjs/cqrs` ne persiste rien —
magasin d'événements, instantanés, rejeu et projections seraient à écrire. Pour une personne seule,
c'est un projet dans le projet, et le **journal d'audit nominatif sur 24 mois** que le studio exige
est une table, pas un magasin d'événements. Les deux sont souvent confondus ; ils ne se
remplacent pas.

**Et la règle qui rend tout cela sûr** (`nestjs-cqrs` n°8) : un agrégat publie ses événements
domaine par `commit()` **après** que la transaction soit résolue, jamais dedans — un rollback ne
rappelle pas un événement publié. Les événements d'**intégration**, eux, sont des lignes d'outbox
écrites **dans** la transaction (§ `data-model.md`). Ce sont deux mécanismes, et les confondre est
la faute la plus coûteuse du modèle.

---

## 13. Maturité des contrats

| Contexte | Régime | Motif |
|---|---|---|
| `identity` | **stable** | palier 2. `buf breaking` et `oasdiff` bloquent toute rupture. |
| `catalog` | **stable** | palier 2. |
| `ticketing` | **stable** | palier 3. |
| `streaming` | **provisoire** | palier 5. Le choix du fournisseur média n'est pas fait, et les capacités déclarées (signature de segments, DRM, renditions) **changeront la forme du `PlaybackTicket`**. Figer maintenant, c'est figer contre MediaMTX. |
| `chat` | **provisoire** | palier 5. Quatre vocabulaires de sanction existaient ; j'en tranche trois axes, mais **aucun écran n'a jamais exercé la modération vue du spectateur** (`storefront-mobile` a vérifié : `chatOf` n'est jamais appelée dans sa maquette). Un contrat conçu et non observé ne se fige pas. |
| `payouts` | **provisoire** | palier 3+. **La question fiscale n'est pas tranchée** (`adr-payments.md`, D5) : l'assiette et le redevable de la TVA changeront les champs. La *forme* — une ventilation par marché — est en revanche sûre et ne bougera pas. |
| `notifications` | **provisoire** | palier 6. Le troisième canal n'est pas nommé dans le dossier ; je propose `in_app`, mais c'est une proposition. |

**Règle de lecture pour `backend-contracts`** : un contrat *provisoire* se modifie sans cérémonie
jusqu'à ce que son palier arrive. Un contrat *stable* se modifie par ajout seulement. Les deux
sont générés par la même chaîne ; seule la porte de CI diffère.

**Une exigence qui traverse les deux régimes** (`storefront-tv` Q12, et c'est la question dont
dépend la survie du parc) : **le comportement devant une valeur d'énumération inconnue est
déclaré, et c'est « conserver la valeur brute et la traiter comme neutre », jamais « rejeter ».**
Une revue de magasin TV est lente : une version publiée aujourd'hui tournera dans des salons dans
un an, et le jour où le catalogue gagne une 22ᵉ discipline, ces téléviseurs la recevront. Une
validation stricte par énumération ne dégraderait pas une carte : elle ferait échouer la **page
entière**. La sévérité porte donc sur la **forme** (les champs obligatoires, les types), jamais sur
le **membre** d'un vocabulaire. En Protobuf c'est le comportement natif (un membre inconnu arrive
comme son numéro) ; côté zod, `backend-contracts` doit l'écrire explicitement — un `z.enum()` nu ne
le fait pas.

---

## 14. Ce que `backend-contracts` doit reprendre d'ici

Résumé opérationnel, pour ne pas relire tout le document.

1. **60 méthodes de lecture, 132 d'écriture.** §10 donne la répartition par service. Le transport
   est à lui ; le compte est établi.
2. **Toute réponse porte `servedAt`** ; toute réponse contenant une valeur périssable porte
   `validUntil`. Non négociable : cinq surfaces en dépendent.
3. **Toute réponse porte le résultat *et* les entrées** des règles périssables (état, fenêtre de
   rediffusion, ouverture de salle, jauge, aperçu restant).
4. **Enveloppe d'erreur unique**, jusqu'à la passerelle Traefik incluse, avec `code`, `params`,
   `traceId`, et une **nature** explicite : `refused` (le serveur a dit non définitivement) /
   `unavailable` (réessayer) / `offline_forbidden` (refus local avant envoi). `studio-mobile`
   l'exige et a raison : c'est la décision qu'une personne en garde doit prendre en dix secondes.
5. **Deux régimes de pagination** (D-010), plus les deux exceptions nommées. Curseur en **Base64
   opaque** sur `(created_at, id)`, **durée de vie 24 h**, code `CURSOR_TOO_OLD` qui exige un
   rechargement complet. Le curseur est **bidirectionnel** et **indépendant de la taille de page**
   (`storefront-mobile` : une rotation ne doit pas l'invalider).
6. **Une enveloppe de page porte un total** — exact pour le studio, **approximatif borné** pour la
   recherche storefront. **Le seuil au-delà duquel le total devient une borne inférieure est une
   constante de domaine servie**, jamais un nombre gravé dans la prose : le graver reviendrait à
   exposer la forme d'un moteur dans le contrat, et à promettre au nom d'un fournisseur qu'on
   pourrait remplacer. L'enveloppe porte `approximateTotal` **et** `totalIsLowerBound`.
7. **Projection par rôle côté serveur** pour le studio : un champ interdit est **absent**, jamais
   présent et nul ; une clé de tri sur un champ absent est **refusée**.
8. **Aucun champ de billetterie ni de régie sur un modèle public** (E8) : ni `sold`, ni `revenue`,
   ni `publication`, ni `publishedBy`.
9. **Les constantes de domaine sont servies**, jamais recopiées : ouverture de salle (30 min),
   délai d'aperçu du billboard (4 s), seuil de rareté, échéance d'annulation (1 h), délai de
   crédit (un **code**, pas « 3 à 5 jours ouvrés »), seuils de notification, fenêtre de priorité de
   liste d'attente (2 h), seuil de provision technique (10 000), échéance de révision (72 h),
   plafond de débit du tchat, quota de réactions. Elles vivent dans `@arthome/core` et sont servies
   dans `ViewerContext` (storefront) et dans l'amorçage (studio).
10. **`@arthome/contracts` expose une entrée sans fichier baril** (D-012), et n'importe zod que par
    chemins profonds.
