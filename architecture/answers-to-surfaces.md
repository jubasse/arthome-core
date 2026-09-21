# Réponses aux questions des cinq surfaces

> **Quatre-vingt-dix-neuf questions** adressées au backend dans les sections « Ce que je ne peux
> pas obtenir seul » des cinq `needs/`. Chacune reçoit ici une réponse et un renvoi vers le
> document qui la motive. **Aucune n'est laissée sans réponse.** Les trois points que je n'avais
> pas pu satisfaire seul ont été arbitrés depuis (**D-015**, **D-016**, **D-019**) : voir la
> dernière section.
>
> Ce fichier est un **index**, pas une source : la motivation est dans `context-map.md`,
> `data-model.md`, `events.md`, `realtime.md` et les deux ADR. Il existe pour que le temps 3
> puisse contester point par point, et pour que `backend-contracts` trouve vite.

Légende des renvois : **CM** `context-map.md` · **DM** `data-model.md` · **EV** `events.md` ·
**RT** `realtime.md` · **AP** `adr-payments.md` · **AS** `adr-stream-entitlement.md`.

---

## storefront TV — 14 questions

| # | Réponse | Renvoi |
|---|---|---|
| **Q1** Comment la TV apprend qu'un appairage a abouti | **Interrogation périodique conforme à RFC 8628, pas le canal temps réel** — décision d'`adr-auth.md` §5.3, à laquelle je me range après avoir posé l'inverse. Motif : faire entrer une identité d'appareil dans l'espace de noms WebSocket au moment de `signin` élargirait sa surface d'attaque pour gagner quelques centaines de millisecondes. **Ton exigence est tenue quand même** : `pollInterval` servi à **2 s pendant les 60 premières secondes**, puis 5 s — décroissance **servie par le serveur**, donc modérable comme tu le demandes, et trente requêtes au plus par appairage. `slow_down` honoré. | `adr-auth.md` §5.3, CM §8 |
| **Q2** Téléviseur partagé : à quoi l'appairage est lié | Pour les **quatre intentions d'achat**, au **profil qui l'a ouvert** : un téléphone sous une autre identité est **refusé** avec `PAIRING_IDENTITY_MISMATCH`, et le téléphone propose « changer de compte » — un geste de la personne, jamais du système. Une bascule implicite ferait payer le mauvais moyen de paiement et livrerait la place au mauvais compte. **`signin` est l'exception et n'en est pas une** : il n'y a pas de profil ouvreur, l'appairage est lié à l'**appareil**, et une autre identité est le cas nominal — c'est le sens d'« ajouter un compte ». | CM §8, `adr-auth.md` §4 |
| **Q3** Identité d'appareil avant toute session | **Oui**, obtenue au premier lancement (`device_token`, `adr-auth.md` §4/Q3). Elle sert les quatre choses que tu demandes : ouvrir et interroger un appairage, se nommer dans « appareils connectés », être révoquée, porter une limite de débit ailleurs que sur l'adresse IP — qu'un foyer partage. Elle **n'est pas une session** et n'ouvre aucune donnée personnelle ; en particulier elle n'ouvre pas le canal temps réel (voir Q1). | CM §7.1, DM §1.3 |
| **Q4** Durée de validité du code | **Par intention, et servie** — barème d'`adr-auth.md` §4/Q4. Ton objection est retenue : 15 min pour un paiement est long, la jauge affichée n'est plus vraie. Jamais codée sur la surface ; et l'écran d'attente n'affiche pas de compte à rebours. **Exigence que j'ajoute côté `ticketing`** : pour `seat`, la réservation de jauge est posée **à l'ouverture** de l'appairage et expire avec lui — sinon la jauge affichée est fausse pendant toute l'attente. L'invariant est écrit : **`SeatHold.expires_at` est le même instant que l'expiration de l'appairage**, jamais une seconde durée qui dérive. | CM §8, DM §3.2 |
| **Q5** Sélection éditoriale de tête de page pour les 21 disciplines | **Ta préférence est retenue** : le contrat porte les 21 avec famille et rang (obligatoire, la TV groupe en deux blocs), **plus** un champ optionnel `featured_category_ids[]` servi comme une règle, jamais codé en dur. | DM §2.4 |
| **Q6** Les champs par spectateur rendent-ils une rangée non mutualisable | **Ta troisième issue : composer au BFF avec un cache court.** Le corps public est mis en cache (Redis, par surface, TTL court), la surcouche par spectateur est fusionnée à la requête depuis trois lectures **groupées par lot d'identifiants**. Un seul aller-retour pour toi, une unité cacheable pour le serveur. C'est précisément pour cela que le BFF existe. | CM §3, §10.1 |
| **Q7** Qui compose les rangées, et où | `catalog`, dans ses modèles de lecture projetés ; la **règle** de composition et d'ordre vit dans `@arthome/core`. Ta contribution au compte est confirmée : **en lecture, la TV n'exige aucun appel synchrone de plus** — un modèle composé, plus trois surcouches partagées par tous tes écrans. | CM §2, §10.1 |
| **Q8** Préférences par profil ou par appareil | **Deux portées, tranchées champ par champ.** Compte : langue, sous-titres par défaut, description audio, comportement à l'ouverture d'un direct, devise d'affichage, fuseau de lecture. Appareil : qualité, **taille des sous-titres**, **réduction des animations**, aperçu vidéo automatique. Ton raisonnement est repris tel quel. | DM §1.8 |
| **Q9** Jeton de lecture : forme, intervalle, libération | (a) **Oui** — jamais de jeton dans le chemin, donc adoptable sans redémarrer la lecture ; (b) **45 s**, sous ton plafond de 60 s ; (c) **oui** — bail de 90 s qui expire faute de renouvellement, `releasePlayback` accélère mais rien n'en dépend. | AS §3.1, §3.3 |
| **Q10** URL canonique pour partager une date | **Oui, elle existe maintenant** : `Date.canonical_url`, servie, jamais construite par la surface, et `slug` par langue. Elle n'existait nulle part — c'est un manque de premier ordre que tu as relevé. | DM §2.7 |
| **Q11** Plafond de débit du tchat et quota de réactions | **Plafond appliqué côté serveur, par surface : 2 msg/s pour la TV** (6 mobile, 10 web), sélection faite en amont, rattrapage de 20 messages. Quota de réactions **renvoyé avec la réponse** (reste + instant de recharge), une seule en vol. | RT §2.2, §2.3 |
| **Q12** Comportement devant une énumération inconnue | **Déclaré au contrat : conserver la valeur brute et la traiter comme neutre, jamais rejeter.** La sévérité porte sur la **forme**, jamais sur le **membre**. En Protobuf c'est natif ; côté zod, `backend-contracts` doit l'écrire — un `z.enum()` nu ne le fait pas. | CM §13, EV §5.2 |
| **Q13** Entrée sans barillet dans `@arthome/contracts` | **Oui — déjà tranché par le chef (D-012)** sur la base de ta mesure et de celle de `storefront-mobile`. C'est une exigence de `definition-of-done.md`. | D-012 |
| **Q14** Constantes de domaine servies | **Oui, toutes.** Ouverture de salle (30 min), délai d'aperçu (4 s), seuil de rareté, échéance d'annulation (1 h), délai de crédit (un **code**), seuils de notification, fenêtre de priorité (2 h), seuil de provision (10 000), échéance de révision (72 h), plafond de tchat, quota de réactions. Servies dans `ViewerContext`. | CM §14.9 |

---

## storefront web — 30 questions

### Pagination, recherche, facettes

| # | Réponse | Renvoi |
|---|---|---|
| **1** Unité de pagination de la recherche | **Le spectacle**, pour les onglets `best`, `lives` et `replays`. Chaque groupe porte la **date représentative retenue** (la première qui satisfait les filtres, selon le tri courant) **et le nombre total de dates du groupe qui satisfont les filtres** — sans ce second nombre, « voir plus de dates (2) » est faux dès qu'un filtre est actif. Le tri « bientôt » est celui de la date représentative, pas du spectacle ; le filtre « ce week-end » s'applique **avant** le regroupement. L'onglet `artists` pagine des artistes. | DM §2.5 |
| **2** Effectif total approximatif à côté du curseur | **Oui.** Le contrat sert `approximateTotal` **et** `totalIsLowerBound` : exact jusqu'à un seuil, « au moins N » au-delà. **Le seuil est une constante de domaine servie**, pas un nombre gravé dans la prose — une version antérieure de cette réponse citait `track_total_hits: 10000`, qui est le nom d'un paramètre Lucene et son défaut : c'était la forme d'un moteur qui fuyait dans le contrat, et « au moins 10 000 » serait devenu une promesse faite au nom d'un fournisseur qu'on aurait remplacé. | CM §14.6 |
| **3** Effectifs par facette | **Oui**, agrégations OpenSearch calculées sur la requête courante, **dans la même réponse** que les résultats. Pas de second appel. | CM §2 |
| **4** Facettes énumérées ou génériques | **Génériques** : `{ facetId, values[{ id, count }] }`, plus un jeu de filtres **structurés** (intervalle de prix, intervalle de dates) qui ne sont pas des énumérations. Ajouter « accessible en fauteuil » n'est alors pas un changement de contrat. Ton argument est retenu. | DM §2.6 |
| **5** Clé d'invalidation par ressource, et qui la nomme | **Le contrat les nomme**, jamais une surface : `date:{id}`, `date:{id}:availability`, `artist:{id}`, `category:{id}`, `account:tickets`, `account:orders`, `home:rails`. Si chaque surface inventait les siennes, elles divergeraient. | RT §5.2 |
| **6** Le storefront est-il notifié de ce qu'il n'a pas causé | **Oui**, par le BFF — Kafka étant interdit hors inter-services, c'est le seul chemin possible, et tu l'avais vu. Deux formes : `GET /changes?since=` (liste d'invalidations, pas les données) et un flux d'invalidations par étiquette que le serveur Next consomme pour appeler `revalidateTag`. | RT §5.2 |
| **7** Fraîcheur garantie par famille | Tableau servi : taxonomie 24 h (artefact) · `category`/`artist`/`plans`/`account` 5 min · `home`/`tickets`/`list`/`replays` 60 s · `live`/jauge/compteur 15 s · jeton de lecture **jamais**. Ce sont des engagements, pas des vœux. | DM §4 |
| **8** Rafraîchissement groupé des compteurs volatils | **Oui** : `counters:subscribe { dateIds: [...] }` sur le canal unique, réponse instantanée puis ticks **différentiels**. Le lot se remplace quand la fenêtre bouge, sans rouvrir le canal. Jamais un canal par carte. | RT §2.1 |

### Argent, commandes, idempotence

| # | Réponse | Renvoi |
|---|---|---|
| **9** `Idempotency-Key` rejouée | **Rend la réponse de la première tentative**, jamais une erreur de doublon. Le magasin est par service : clé + empreinte de la requête + réponse mémorisée + durée de vie **24 h**. C'est la différence entre « rejeu sûr » et « rejeu refusé », et tu as raison que seule la première permet « réessayer ». | CM §14, DM |
| **10** Prix vérifié, code distinct | **Oui** : `PRICE_STALE`, distinct de l'échec de paiement, avec le prix courant en paramètre. Avec cinq motifs de promotion dont un au prorata, l'écart est **structurel**. | AP §8, DM §3.1 |
| **11** Barème des frais de service | **Par place**, et le **barème est servi** par le contrat, jamais une constante d'écran. | DM §3.1, AP §11 |
| **12** Cumul remise d'abonnement / promotion | **Pas de cumul : la plus favorable au spectateur l'emporte**, règle dans `@arthome/core`. Deux remises distinctes sur deux assiettes : `seatDiscount` (10 / 20 %) sur les **places**, 15 % sur les **boutiques** — E1 montre qu'elles ne coïncident dans aucune source. | DM §3.1, AP §11 |
| **13** Panier : compte ou navigateur | **Compte.** La maquette affiche un panier persistant dans l'en-tête, il se monte sur plusieurs sessions, et les trois storefronts le montrent. Conflit entre appareils : par ligne, dernier écrivain gagne, **rang serveur** (un numéro de version, jamais une date de client). | DM §3.5 |
| **14** Devis opposable, combien de temps | **Oui, 15 minutes.** Le total présenté est celui qui sera débité. Le port est calculé **au devis**, pas à l'ajout. | DM §3.5 |
| **15** Commande de marchandise à deux vendeurs | **Deux commandes.** Motif métier (deux expéditions, deux commissions, deux versements) **et** motif technique indépendant : un `destination charge` Stripe n'admet qu'une seule destination. Le panier se scinde **au paiement**. | AP §3, DM §3.4 |

### Boutique et commerce externe

| # | Réponse | Renvoi |
|---|---|---|
| **16** Commandes passées sur une boutique externe | **Un reflet en lecture seule** (`ExternalOrder`), agrégat distinct avec `external_ref`, `external_host`, `state: external`, `synced_at`. **Ce qu'on garantit** : la fraîcheur au moment de `synced_at`, rien de plus. Quand l'hôte ne répond pas, le reflet est servi **avec son âge**, pas en erreur. Ni facture, ni suivi, ni remboursement chez nous, et le contrat l'assume plutôt que de servir des champs vides. | DM §3.4 |
| **17** Variantes de marchandise | **Oui**, `variants[]` — un t-shirt sans taille n'est pas vendable. Et `labelEn` est une **lacune de donnée** à combler au portage, pas une lacune de traduction (E10). | DM §3.4 |

### Billetterie et accès

| # | Réponse | Renvoi |
|---|---|---|
| **18** Qui émet le code de place | **Le serveur**, toujours. Il s'affiche à l'identique sur trois surfaces : la maquette le calcule par hachage, ce qui donnerait **trois codes différents pour la même place** dès qu'une surface change de fonction. | DM §3.3 |
| **19** Quelles entrées pour « une place ouvre le spectacle » | Les cinq, et le **verdict déjà rendu** : `decideWatch` dans `@arthome/core`, évalué **au BFF en indicatif** (pour peindre sans second appel) et **dans `streaming` en autorité** (pour émettre le jeton). Même vocabulaire de refus des deux côtés. | CM §3 |
| **20** L'aperçu gratuit est-il imposé par le jeton | **Oui, et décompté côté serveur, par compte.** Le jeton d'un non-détenteur porte `scope: preview` et `exp = min(now+120 s, now+secondsLeft)`. Recharger la page ne prolonge rien. | AS §4 |
| **21** Qui compte « deux écrans », et que voit le troisième | `streaming`, par **bail de 90 s** qui expire faute de renouvellement. Le troisième reçoit `CONCURRENT_LIMIT_REACHED` **avec la liste des sessions actives** (appareil, ville, instant) pour en libérer une. Jamais une erreur réseau. | AS §3.3 |
| **22** Comment le spectateur retrouve son argent | Trois mécanismes distincts : `cancelled` → **remboursement** vers le moyen d'origine (montant + **code de délai**, jamais la phrase) ; `postponed` → **aucun mouvement**, la place suit ; `interrupted` → **avoir** (`Credit`), une **monnaie interne** qui n'existait nulle part et que le contrat crée. | AP §6, §9 |

### Compte, notifications, données personnelles

| # | Réponse | Renvoi |
|---|---|---|
| **23** Compteur de correspondances d'une recherche enregistrée | **« Nouvelles depuis votre dernière visite »**, incrémenté par le *percolator* de l'index quand une date nouvelle correspond, remis à zéro à la lecture. Dix recherches font alors **zéro** requête de comptage à l'ouverture de la page ; les deux autres options en coûtent dix. | DM §2.5 |
| **24** Survie d'une recherche à une évolution du vocabulaire | `criteria_version` : elle **se rejoue à l'identique** si la migration est possible, sinon elle **se marque `stale` et le dit**. Elle ne disparaît jamais en silence. | DM §2.5 |
| **25** « Déconnecter cet appareil » coupe-t-il la lecture, et en combien de temps | **Oui — mais jusqu'à 120 s, pas 60. Je t'avais donné un nombre faux.** `identity.device.revoked.v1` est consommé par `streaming`, qui révoque les baux ; le **renouvellement** suivant est refusé (≤ 45 s), mais le **jeton déjà en main** reste valide jusqu'à son expiration, et la périphérie du CDN n'en sait rien. Régime courant 45 à 75 s, pire cas 120 s. L'appareil affiche `SIGNED_OUT_ELSEWHERE`, jamais une erreur réseau. | AS §3.3 |
| **26** Périmètre et délai de la suppression de compte | **Asynchrone, saga persistante, 30 jours de grâce, puis anonymisation — jamais suppression.** Les factures gardent leur contenu figé (10 ans), les lignes comptables un identifiant anonymisé, les messages de tchat sont dissociés de la personne sans être supprimés tant que leur rétention court. Tu avais raison : elle ne peut être ni synchrone ni totale. | DM §7.5 |
| **27** Exports asynchrones et suivi | **Oui** : accusé + identifiant de demande, état interrogeable, document livré par **adresse signée de courte durée**. Un FEC n'est pas une réponse HTTP. | DM §6.2, §7.5 |
| **28** Limitation de débit du tchat dans le contrat | **Oui** : `CHAT_RATE_LIMITED` avec le **délai d'attente en paramètre**, pour que tu désactives la saisie proprement au lieu d'enchaîner les refus. | RT §2.2 |

### Transverses

| # | Réponse | Renvoi |
|---|---|---|
| **29** Devise d'affichage ≠ devise de facturation | **Arbitré : la préférence est retirée des écrans au palier 1 (D-016).** Les prix s'affichent dans la **devise du marché de facturation de la date**, formatés côté client selon la locale. Motif retenu : afficher un prix converti qu'on ne peut pas débiter est un mensonge, et D4 a montré qu'aucune règle n'a jamais été éprouvée sur deux taux. **Le retrait est réversible** — §5.6 de l'ADR liste les quatre lignes à écrire pour revenir dessus : source du taux, date de change, arrondi, qui porte l'écart. C'est le seul endroit de la session où le contrat demande à la conception de reculer. | AP §5.6, **D-016** |
| **30** Latence du catalogue de libellés au rendu serveur | **Aucune : le web résout ses codes depuis l'instantané embarqué au build**, jamais par un appel réseau sur le chemin de rendu. Le catalogue dynamique ne sert que mobile et TV. Conséquence assumée, et tu l'avais anticipée : une coquille n'est corrigée sur le web qu'au prochain déploiement — qui prend des minutes. | CM §1.8 |

---

## storefront mobile — 11 questions + 2 subsidiaires

| # | Réponse | Renvoi |
|---|---|---|
| **1** État servi, dérivé, ou les deux | **Les deux, exactement comme tu le demandes** : les bornes (`starts_at`, `runtime_min`, `room_opens_at`, `replay.expires_at`) **et** l'état au moment du service **et** `displayStateValidUntil`. Et l'arbitrage qui rend cela licite : une règle vit une fois dans `@arthome/core`, elle s'évalue à plusieurs endroits — ce qui est interdit, c'est deux **implémentations**, jamais deux **appels**. | CM §0 |
| **2** `servedAt` + durée de validité sur chaque réponse | **Oui, sur toute réponse.** `servedAt` est l'horloge de référence de **tout** compte à rebours de ta surface ; `validUntil` dès qu'une valeur périssable est présente. C'est aussi ce que porte `ws:pulse` toutes les 5 s. | CM §14.2, RT §4 |
| **3** Curseur longue durée ou lecture de delta | **Les deux.** Curseur valide **24 h**, code `CURSOR_TOO_OLD` explicite au-delà. Et `GET /changes?since=<servedAt>` qui rend **une liste d'invalidations, pas les données** — une requête au lieu de douze au retour au premier plan. Ta question la plus coûteuse est traitée par les deux bouts. | RT §5.2, CM §14.5 |
| **4** Le droit de lecture est-il une forme de premier ordre, par date | **Oui.** `WatchVerdict { allowed, reasonCode, fallbackAction, previewSecondsLeft, validUntil }`, servi par date, **revérifié au démarrage de la lecture, jamais hérité du catalogue** — tu as raison que le pays change entre les deux et que sur mobile ce délai se compte en heures. Et le contrat déclare que le droit **ne se met jamais en cache sur disque**. | CM §3, AS §5 |
| **5** Décompte de `multi-screen`, et qui libère une session tuée | **Personne : le bail expire.** 90 s, renouvelé toutes les 45 s. `releasePlayback` accélère, rien n'en dépend. Et tu peux **reprendre ta propre session** identifiée par l'appareil. Ton argument (« une session qui ne se ferme que sur un événement du client laisse un écran fantôme ») est la raison de ce choix. | AS §3.3 |
| **6** Budget d'aperçu compté côté serveur | **Oui, par compte** (pas par appareil : sinon un foyer à quatre appareils obtient quatre aperçus ; pas par date seule : c'est `(compte, date)`). Le reste est servi dans le verdict. | AS §4 |
| **7** Quelles commandes en file hors ligne, et durée de vie de la clé | **Ton classement est confirmé.** Se mettent en file : suivis, liste, préférences, recherches enregistrées, marquage de lecture, position de lecture. Jamais : achat, panier payé, message de tchat (**abandonné**, pas mis en file — un message rejoué dix minutes plus tard n'a plus de sens), consentements, déconnexion d'appareil, changement de formule, session de lecture. **Durée de vie de la clé : 24 h**, ce qui couvre une relance après une nuit. | DM, CM §14 |
| **8** Où vit le panier | **Sur le compte.** La maquette affiche un panier persistant, donc un panier local la ferait mentir. | DM §3.5 |
| **9** Commande chez un tiers : reflet et garantie | Reflet **en lecture seule**, servi **avec son âge**. Hors ligne, il s'affiche avec sa date de fraîcheur. Quand l'hôte ne répond pas : l'âge grandit, rien n'échoue. | DM §3.4 |
| **10** Seuils de notification servis, et le troisième canal | Les cinq seuils vivent dans **`@arthome/core`** et sont **servis** — jamais recopiés, sinon « le web dira 30 minutes, la TV 15, et le mobile aura raison par hasard ». **Le troisième canal : je propose `in_app`, pas `sms`** — un canal SMS a un coût par message, une réglementation propre et un prestataire de plus, pour une valeur que rien n'a éprouvée. **⚠ Proposition, pas constat** : remontée au chef. | DM §6.3 |
| **11** Entrée `mini` de zod sans barillet | **Oui — D-012**, tranché par le chef sur ta mesure et celle de `storefront-tv`. | D-012 |
| **sub. a** Décalage calculé par le serveur en plus de l'IANA | **Oui** : `VenueClock { venue_timezone, venue_utc_offset_min }`, le décalage étant **recalculé à chaque service pour cet instant-là**, jamais stocké. Ce n'est pas un retour à D3 : le calcul a lieu **une fois**, côté serveur, et cinq applications n'embarquent pas de base de fuseaux. | `proto/arthome/common/v1` |
| **sub. b** Taxonomie en artefact versionné immuable, par langue et par surface | **Oui**, même régime que l'i18n : `/taxonomy/{locale}/v{N}.json`, **par tranche et par surface** (le mobile ne charge ni le vocabulaire studio ni la table de touches TV), cache très long, embarqué au build comme repli. | CM §1.8 |

---

## studio web — 29 questions

### Rôles et droits

| # | Réponse | Renvoi |
|---|---|---|
| **1** Droits effectifs ou matière brute | **Les deux, et ta position est retenue intégralement** : la matière brute au vocabulaire à **huit** rôles, les droits effectifs calculés **une fois dans `@arthome/core`** et servis par le BFF studio. Le repli à six est un **libellé**, jamais un droit — il détruit le droit d'invitation de `director`. | CM §1.1 |
| **2** Filtrage par rôle : projection serveur ou masquage client | **Projection serveur — ta position, mot pour mot.** `canRevenue` décide du **contenu**, pas de l'affichage. Oui, cela implique des formes différentes pour le même écran selon le rôle, et c'est **acceptable et voulu** : un champ interdit est **absent**, jamais présent et nul. Corollaire ajouté : **une clé de tri sur un champ absent est refusée** (`SORT_KEY_FORBIDDEN`), jamais ignorée. | CM §2 |
| **3** Où vit l'accès ponctuel à une date | **`identity`**, agrégat `DateAccessGrant` distinct de `ChannelMembership` : portée une date, expiration **servie comme un instant**, révocable sans toucher l'appartenance. C9 est tranché : `identity` possède la chaîne comme **organisation**, `catalog` l'artiste comme **page publique**. | CM §1.1, DM §1.6 |
| **4** Qui possède l'invitation, quel événement la publie | **`identity`**, et `identity.channel.membership_changed.v1` à l'acceptation, suivi de `identity.rights_version.bumped.v1` — c'est lui qui fait entrer la chaîne au sélecteur **sans rechargement**. | EV §4.1 |

### Machine à états et publication

| # | Réponse | Renvoi |
|---|---|---|
| **5** Un seul jeu de noms, et le rang voyage-t-il | **Confirmé** : celui de `catalogue.json` (D2). Et **oui**, `order_rank` voyage avec l'état — sinon chaque surface réinvente `STATE_ORDER`. | DM §2.3 |
| **6** `publication` servie séparément de `date` | **Séparée : deux agrégats dans `catalog`, et deux modèles de lecture distincts.** Le studio travaille sur la publication, le storefront lit la date. La date n'est **jamais** porteuse de `publication` ni de `publishedBy` sur un modèle public (E8). | DM §2.2, §2.3 |
| **7** Quelle liste de contrôle fait foi | **Les sept de la fiche**, pas les quatre des fixtures : les quatre sont un sous-ensemble arbitraire, les sept sont ceux qu'un écran a exercés. « Chapitres prévus » et « modérateur affecté » deviennent des **avertissements non bloquants** — on doit pouvoir publier sans chapitres. Trois des sept sont des **faits projetés** depuis `ticketing` et `streaming`. | DM §2.3 |
| **8** Degré de garantie sur les transitions sans retour | **Refus serveur ET trace d'audit de la tentative.** Tu as raison : « une tentative de faire marche arrière sur un tarif engagé est en soi une information ». Le refus porte `TRANSITION_IRREVERSIBLE` + la transition visée + la **promesse engagée**, en paramètres. Et le verrou porte sur le **couple** `from > to`, pas sur l'état (E5). | DM §2.3 |

### Argent

| # | Réponse | Renvoi |
|---|---|---|
| **9** Qui doit la TVA, sur quelle assiette, qui est redevable | **Instruit, pas supposé.** Recommandation : **modèle « commissionnaire »** — Arthome agit en son nom propre, donc assiette = le **billet entier**, taux = celui du **pays du spectateur**, redevable = **Arthome**. Six indices convergents de la conception l'imposent. **Et la commission porte sur le HT**, pas le TTC, sinon 12 % varieraient avec le pays de l'acheteur. **⚠ C'est une recommandation d'architecture, pas un avis fiscal** : à valider par un conseil avant tout encaissement réel. **Ta trouvaille est retenue** : la forme porte une **ventilation par marché**, juste dans les deux modèles. | AP §5 |
| **10** Multi-devise honoré ou reporté | **Un solde par devise, jamais un solde converti.** Une chaîne qui vend dans deux devises a **deux soldes**. Convertir introduirait un taux, une date de change et un écart de réconciliation inexplicable. Stripe tient un solde par devise ; on le reflète. | AP §5.5 |
| **11** Double validation bancaire : état d'agrégat ou flux à part | **Agrégat à part entière** (`BankAccountChangeRequest`), pas un champ : deux acteurs, deux rôles distincts, un délai, une trace, **et il suspend le virement en cours**. Une écriture ne peut pas porter cela. | DM §6.2 |
| **12** Bornes d'une « saison » | **1ᵉʳ septembre → 31 août**, convention du spectacle vivant. `seasonBounds()` dans `@arthome/core`, servie. Tu as raison de refuser de la coder dans le studio. | DM §6.2 |
| **13** FEC/Sage/Cegid relèvent-ils de `payouts` ; qui porte le rapprochement | **`payouts` pour les deux.** Exports = **travaux asynchrones** (BullMQ **interne à `payouts`**) rendant une adresse signée de courte durée. Et une période **ne se clôt pas avec un écart non expliqué** : `payouts.reconciliation.discrepancy_found.v1` route une alerte vers `treasury`. | DM §6.2, AP §7.5 |

### Direct et temps réel

| # | Réponse | Renvoi |
|---|---|---|
| **14** Quel canal, quelles garanties | **Confirmé** : diffusion par l'adaptateur Socket.IO sur Redis, **numéro d'ordre par flux** (`seq`), et le tchat comme le journal sont **des flux durables Kafka**, pas des restes de mémoire tampon. La reprise WebSocket couvre les minutes ; la lecture HTTP couvre les heures. | RT §3.1, §5 |
| **15** La battue de vie du canal de contrôle existe-t-elle | **Oui — et tu as raison de la juger bloquante.** `ws:pulse` toutes les 5 s. Plus de pulse pendant 15 s = **je suis sourd** ; pulse sans échantillon depuis 30 s = **la salle n'envoie plus**. Deux états, deux écrans, aucune inférence. Et elle sert deux autres besoins : `serverTime` comme horloge de référence, `seq` comme point de reprise. | RT §4 |
| **16** Métriques par protocole, et cadence | **Chaque métrique est nullable, et l'absence a un sens.** Gigue et paquets perdus **omis** en RTMP, pas mis à zéro. Cadence 1 à 2 s. Et chaque échantillon porte **`measured_at` à l'ingest** : le studio affiche « mesuré il y a 3 s » au lieu de « 0 Mb/s », qui est un mensonge. | DM §5.3 |
| **17** Latence bout-en-bout : serveur ou client | **Client**, par `RTCPeerConnection.getStats()` sur la voie WHEP, **soumise** au serveur avec `source: client_submitted`. Si elle n'est pas mesurée, elle est **absente** — jamais un chiffre natif présenté comme bout-en-bout. | DM §5.3 |
| **18** La voie de retour est-elle servie dans l'état | **Oui**, `monitor_path` (`whep` \| `ll_hls`) dans l'état du run. Tu dois le savoir pour ne pas promettre à l'opérateur une latence qu'il n'a pas, et `streaming.md` refuse de créer une branche média pour uniformiser un schéma. | DM §5.3 |
| **19** Le message d'écran d'attente voyage-t-il avec l'état, sous quelle forme | **Oui, comme du CONTENU avec sa langue de rédaction** (`LocalizedText`), pas comme une clé i18n. Le catalogue fournit des **modèles** par nature d'incident, que la régie reprend ou remplace. C'est l'une des deux seules exceptions à « i18n par codes ». | EV §4.4 |

### Modération

| # | Réponse | Renvoi |
|---|---|---|
| **20** Composition sanction message / personne, et qui prime ; où vit la personne bannie | **Trois axes séparés**, jamais empilés : `MessageState` (`published`/`removed`), `ModerationItemState` (`reported`/`claimed`/`settled`), `AudienceSanction` (`none`/`muted`/`banned`). La pastille unique est **dérivée** par `moderationBadgeOf`, préséance : banni > réduit au silence > retiré > publié. **La personne bannie appartient à `chat`**, parce que la sanction est **par chaîne** : la même personne est bannie chez un artiste et bienvenue chez un autre. | CM §1.5 |
| **21** La prise en charge est-elle un bail | **Oui**, `claim_expires_at`, renouvelé tant que la personne est présente, libéré par le serveur. Ton argument est le bon : sans expiration, un modérateur qui ferme son navigateur gèle une ligne pendant tout le direct. | DM §6.1, RT §3.2 |
| **22** Le refus d'un verdict doublé transporte-t-il la décision gagnante | **Oui** : auteur **et** verdict, pour que l'écran dise « X a déjà supprimé ce message » au lieu d'un échec nu. Un refus nu obligerait à un second aller-retour en plein direct. | DM §6.1 |
| **23** Ajouter un mot en direct reclasse-t-il les messages publiés | **Oui, et de façon ASYNCHRONE** — l'ambiguïté que tu signales est tranchée. La commande répond immédiatement avec `reprocessing: true` et le nombre **estimé** ; les nouveaux éléments arrivent par le canal, marqués `origin: retroactive_filter`, ce qui permet au journal de les distinguer d'une décision humaine. Un reclassement synchrone sur des milliers de messages bloquerait la commande en plein direct. | DM §6.1 |
| **24** La recherche porte-t-elle sur les spectateurs qui n'ont pas écrit | **Oui.** `AudienceMember` est **une collection interrogeable par elle-même**, pas une projection du tchat, et elle porte la **présence** sur le direct en cours. | DM §6.1 |

### Capacité et infrastructure

| # | Réponse | Renvoi |
|---|---|---|
| **25** Seuil de 10 000, provision, malus, échéance de 72 h | **Tous des données du contrat**, servies. Tu as raison : constantes, elles seraient recopiées sur cinq surfaces. | DM §3.1 |
| **26** Ouvrir un palier et prévenir la liste : une commande | **Une seule, transactionnelle**, avec la **fenêtre de priorité (2 h) comme paramètre de domaine**. Deux appels laisseraient la rareté se dissiper entre eux. | DM §3.1 |

### Transverse

| # | Réponse | Renvoi |
|---|---|---|
| **27** Où sont générés les identifiants | **Dans le domaine** (`@arthome/core`), UUIDv7, jamais par un défaut de base. Trois motifs, dont **le tien** : le `wizard` annonce « brouillon enregistré » avant tout aller-retour, et un identifiant du domaine le permet sans clé de corrélation. Les deux autres : l'outbox l'exige, et l'ordre temporel remplit bien les index. | DM §7.1 |
| **28** Le catalogue de libellés sert-il aussi le studio | **Oui, même régime d'artefact versionné, servi par surface.** Le studio charge quatre thèmes (`studio`, `taxonomy`, `system`, `storefront`) et son nombre de clés d'énumération est élevé : le découpage par surface existe précisément pour cela. Et **aucun service** ne le sert — c'est un artefact CDN. | CM §1.8 |
| **29** Granularité de la lecture d'une fiche de date | **Un appel à `catalog` pour la fiche et ses volets ouverts, puis un appel par volet chez son propriétaire** (`tickets` → `ticketing`, `chat` → `chat`, `tech` → `streaming`, `crew` → `identity`), la projection étant **dictée par les droits**. Motif : un `mod` doit pouvoir charger le volet `chat` **sans** charger la fiche entière, sinon la billetterie transite pour rien — c'est ton propre argument. | CM §2, §10.1 |

---

## studio mobile — 13 questions

| # | Réponse | Renvoi |
|---|---|---|
| **1** Session porteuse de jeton sur la coquille native | **Oui, à côté de la session par cookie.** Jeton de rafraîchissement lié à l'appareil dans le magasin natif (jamais `localStorage`), jeton d'accès court, **révocation par appareil**, et au retour d'arrière-plan avec jeton expiré : **rafraîchissement silencieux** — une réauthentification en pleine garde est une faute. Le détail appartient à `adr-auth.md` ; la topologie est tranchée ici. | CM §7 |
| **2** Retour depuis un navigateur externe | **Adresse de retour en lien universel, liste blanche stricte** (jamais un motif) ; **état opaque, à usage unique, courte durée**, qui ne porte rien de signifiant. **La ressource de reprise est l'amorçage** (`GET /studio/bootstrap`), plus les **agrégats d'attente côté serveur** (`BankAccountChangeRequest`, état du compte connecté). Ton acquis est repris tel quel : *un paiement confirmé par un paramètre d'URL est un paiement confirmé par le client*. | CM §7, AP §8 |
| **3** Droits effectifs en une requête, et comment apprendre qu'ils ont changé | **Oui, un amorçage unique** : compte, **toutes** les chaînes avec leurs rôles effectifs, `grants` **projetés sur les rôles de la personne**, préférences, version des droits, compteurs. Le changement arrive par **`rights_version`**, porté sur chaque réponse HTTP **et poussé** sur le canal — et le serveur fait quitter les salles d'une chaîne perdue sans attendre une reconnexion. | CM §1.1, RT §3 |
| **4** Régime hors ligne des commandes | **Ton découpage est validé** : se mettent en file les verdicts sur un message nommé et les sanctions sur une personne nommée, **et rien d'autre** ; tout le reste se refuse localement, avec une nature d'erreur **distincte** (`offline_forbidden`). Et **oui**, ces commandes sont **conditionnelles** (version de l'agrégat, refus si un confrère a tranché), jamais idempotentes aveugles. | CM §14.4, DM §6.1 |
| **5** Curseur de reprise, et canal par personne multi-chaînes | **Oui aux deux.** Trois réponses possibles, dont **`resume:too_old` explicite** — sans lui, « le modérateur revient sur une file à laquelle il manque dix messages, et rien ne le lui dit ». Et le canal est **par personne**, portant les événements de toutes les chaînes accessibles, chacun étiqueté de son `channelId` : un régisseur peut avoir deux flux sous sa garde le même soir. | RT §3, §5 |
| **6** Les trois mécanismes de la file, et qui possède la personne bannie | **Les trois sont confirmés** : bail de prise en charge, refus du second verdict avec le nom du gagnant, propagation nominative. **`chat` possède les trois**, y compris la personne bannie — la sanction est par chaîne, et y loger une écriture dans `identity` obligerait chaque verdict à une écriture croisée vers le service le plus sensible du système. | CM §1.5 |
| **7** Pagination d'une collection vivante | **Ta proposition est celle que le chef a déjà tranchée (D-010)** : curseur pour la **file de modération** et le **tchat en direct** — ce sont des flux —, page + total partout ailleurs, et le **journal reste en page + total avec filtre de période obligatoire**. Ton diagnostic (« une pagination par décalage y double et y saute des lignes mécaniquement ») est exactement le motif retenu. | D-010 |
| **8** WHEP sur la coquille native | **Non au palier 5 : le retour de régie WHEP est réservé au studio web ; le studio mobile reçoit LL-HLS**, avec la latence réelle **annoncée** (`monitor_path`) plutôt que promise. Motif : `capacitor://localhost` comme contexte sécurisé dans WKWebView **n'est pas vérifié**, et tu as raison de refuser de le promettre sans appareil réel. **Arbitré par D-019** : la vérification sur appareil réel reste à faire avant toute promesse, et elle conditionne aussi `getUserMedia` et Web Crypto. Ce n'est pas un refus, c'est « pas avant d'avoir mesuré ». | DM §5.3, AS, **D-019** |
| **9** Binaires : affiche et exports | **Oui aux deux formes que tu demandes.** Téléversement par **adresse de dépôt signée** obtenue par une commande JSON, jamais de multipart depuis le WebView. Export = **travail asynchrone** rendant une adresse signée **utilisable sans cookie de session**. Durées proposées : **dépôt 15 min**, **export 60 min** — assez pour une 4G de salle, assez court pour ne pas être un jeton d'accès déguisé. | DM §6.2, §7.5 |
| **10** Notifications : routage, enregistrement, redaction | **Routage par rôle et par chaîne décidé côté serveur** — l'application ne filtre pas une file commune. Enregistrement d'appareil par compte. Charge utile portant chaîne + date + page cible. **Et oui, la redaction s'applique : une notification ne porte jamais un montant si le rôle destinataire n'a pas `canRevenue`.** Ton argument est décisif : une notification s'affiche sur un écran verrouillé. | DM §6.3 |
| **11** Fuseau de lecture et préférences d'interface | **`identity`**, dans `AccountPreferences` — et le fuseau de lecture est **le même champ** que celui du storefront : même compte, un seul porteur. La disposition de régie et les profils d'encodage sont aussi **par compte**, pas dans `localStorage` (qui est lié à l'origine, vidable par le système, et ne voyage d'aucune façon). La ressource est **additive et tolérante** : une clé inconnue d'une version n'est ni rejetée ni effacée à la prochaine écriture — sinon la version mobile en revue de magasin écrase les réglages posés depuis le studio web. | DM §1.8 |
| **12** Vocabulaire des causes d'incident | **Oui, un vocabulaire fermé de CAUSES, séparé des ISSUES.** Six causes, dont tes trois (`venue_feed_lost`, `run_desk_disconnected`, `bitrate_collapsed`) plus `compatibility_worker_failed` que `streaming.md` nomme. Et **oui**, l'écran d'attente automatique (règle de chaîne « 15 s ») produit un incident **de même nature** qu'un déclenchement manuel, distingué par `IncidentTrigger.AUTO`. C'est la bonne réponse au cas « le régisseur est injoignable ». | DM §5.6 |
| **13** Les six formes absentes : lesquelles entrent au contrat | **Les six entrent, mais pas au même palier.** Ce qui est une **règle** entre dans `@arthome/core` au **palier 1** : seuil de provision (10 000), monotonie des paliers de jauge, fenêtre de priorité (2 h), échéance de révision (72 h). Ce qui est une **forme** entre au contrat `ticketing` au **palier 3**, marqué provisoire : contremarques par catégorie, source d'un article et commandes externes, épinglage en direct. | DM §3.1, §3.4 |

---

## Les trois points non satisfaits — arbitrés depuis

Les trois ont été tranchés le 21 septembre 2026. Aucune question de surface ne reste sans réponse.

| Point | Issue |
|---|---|
| **Devise d'affichage** (`storefront-web` Q29) | **D-016 : la préférence est retirée des écrans au palier 1**, et le retrait est **réversible**. La conception recule ; c'est le seul endroit de la session où cela arrive. Les quatre lignes à écrire pour revenir dessus sont au §5.6 de l'ADR. |
| **WHEP sur coquille native** (`studio-mobile` Q8) | **D-019 : non promis.** Le studio mobile reçoit LL-HLS avec sa **latence réelle annoncée**, jamais une sous-seconde promise et non tenue. La mesure sur appareil réel reste à faire — c'est une vérification, pas une opinion. |
| **Modèle fiscal** (`studio-web` Q9, D5) | **D-015 : modèle commissionnaire acté**, commission sur le HT. **La réserve demeure et figure en tête de l'ADR** : ce n'est pas un avis fiscal, et il doit être validé par un conseil avant tout encaissement réel. La **forme** — la ventilation par marché — est gravée et ne dépend pas de cette validation. |

Et les quatre propositions sont **acceptées telles quelles (D-017)** : portée de l'avoir bornée à
la chaîne émettrice, `in_app` comme troisième canal, commande de marchandise mono-vendeur,
non-cumul remise / promotion.
