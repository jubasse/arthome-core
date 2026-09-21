# Besoins — storefront web (Next.js)

> Surface : **Storefront Web**, Next.js, 1440 px. Catalogue de billetterie **public et
> indexable** : le rendu serveur et la stabilité des URL ne sont pas des préférences
> d'implémentation, ce sont des contraintes de contrat.
>
> Sources lues : `README.md` (corrigé), `shared/helpers.js` (intégral), `shared/catalogue.json`,
> `shared/taxonomy.json`, `shared/fixtures.js` (extraits), `shared/i18n/*` (intégral pour
> `storefront.json`, `system.json`, `index.json`), `mockups/Storefront Web.dc.html` (lu par
> fragments : routeur, état du composant, modèles de vue, jamais en entier),
> `architecture/corrections-handoff.md`.
>
> Ce document **exprime des besoins**. Il ne redécrit aucune maquette : la maquette est la
> conception. Tout ce qui suit change ce que le contrat doit porter ou garantir.

---

## Inventaire des écrans

### Routes de premier niveau — douze, vérifiées dans le routeur de la maquette

Le routeur de `Storefront Web.dc.html` ne connaît que douze valeurs de `page` :
`home · live · browse · categories · category · artists · artist · replay · plans · following ·
account · help`. Le chef en avait relevé douze : le compte est exact, rien ne manque à ce niveau.

| Route | Ce qu'elle sert | Rédigée en détail |
|---|---|---|
| `home` | accueil éditorial : carrousels mêlant sélection publique et rails personnalisés | §Formes, §Temps réel |
| `browse` | **l'explorateur** : recherche plein texte + facettes + quatre onglets de résultats (`best`, `lives`, `replays`, `artists`) | §Formes, §Pagination |
| `categories` | les **21 disciplines**, groupées par les deux univers (`music`, `stage`), dans le rang éditorial `rank` | renvoi : lecture de taxonomie seule |
| `category` | une discipline : cinq onglets (`ov` vue d'ensemble, `live`, `up` à venir, `rep` rediffusions, `art` artistes), ses sous-genres, son propre jeu de filtres, son enregistrement en recherche | §Formes, §Pagination |
| `artists` | annuaire : filtre discipline, tri `az` / `followers`, deux sections (en direct / pas en direct) | renvoi : même forme que `browse` onglet `artists` |
| `artist` | fiche artiste : bio, dates à venir, dates passées, rediffusions, audience moyenne, abonnés | §Formes |
| `live` | **la page d'une date** : lecteur, aperçu gratuit verrouillé, tchat, boutique du spectacle, achat de place, partage, informations | §Formes, §Commandes, §Temps réel |
| `replay` | lecteur de rediffusion : chapitres, vitesse, position reprise, fenêtre restante | §Formes, §Hors ligne |
| `plans` | les formules d'abonnement et leur comparatif | §Formes — **vocabulaire en conflit, voir Incohérences** |
| `following` | artistes suivis et leurs prochaines dates | renvoi : `ArtistSummary` + `DateCard`, rien de neuf |
| `help` | aide et contact : six sujets, formulaire, contact DPO | §Commandes |
| `account` | **onze sections**, ci-dessous | §Formes, §Commandes |

### `account` — onze sections, une seule forme de compte

`upcoming` (places à venir) · `past` (passés et rediffusions) · `faves` (artistes suivis +
spectacles mis de côté) · `alerts` (**recherches enregistrées**) · `orders` (commandes merch) ·
`sub` (abonnement, factures, moyen de paiement) · `profile` · `prefs` (préférences de lecture) ·
`notifs` (réglages de notification + heures calmes) · `security` (mot de passe, 2FA, passkey,
moyens de paiement, appareils connectés) · `privacy` (consentements, cookies, conservation,
droits RGPD, DPO).

**Ces onze sections partagent une seule et même forme de compte.** Elles ne justifient pas onze
appels ni onze schémas : elles justifient **un** agrégat `Account` servi en une fois par le BFF,
plus quatre listes paginées indépendantes (`tickets`, `orders`, `savedSearches`,
`notifications`). Seules `alerts`, `orders` et `privacy` introduisent des formes que rien
d'autre ne porte ; les huit autres sont des projections.

### Superpositions — pas des routes, mais elles ont leur contrat

Elles n'ont pas d'URL dans la maquette, et **c'est un problème à trancher** (voir §Contraintes
Next.js) :

- **panier**, popover à trois temps : `cart` → `pay` → `done` ;
- **achat de place** (modale de tarifs), **authentification** (créer un compte / se connecter /
  continuer sans compte), **partage**, **centre de notifications**, **suggestions de recherche**
  (saisie anticipée), **enregistrement d'une recherche**, **menu de tri**, **menu mobile** ;
- **mini-lecteur persistant** : la lecture survit à la navigation entre routes (`watching`,
  `watchKind`, `pipClosed`). C'est une contrainte de contrat, pas de mise en page — voir
  §Contraintes Next.js.

### Pages de pied de page — à servir, sans modèle de données propre

`CGV` · `confidentialité` · `accessibilité` · `presse` · `statut` · `centre d'aide` ·
`diffuser sur Arthome` · `guide OBS` · `billetterie (artistes)` · `boutique & merch (artistes)`.
Contenu éditorial bilingue, indexable, sans session. Une seule exigence de contrat : **le statut
de service doit être lisible sans session et sans dépendre des mêmes services** que le reste —
sinon la page de statut tombe avec ce qu'elle décrit.

---

## Les formes de données

Chaque forme est décrite une fois, avec la liste de ses écrans consommateurs. La règle
« aucune valeur calculée deux fois » impose que tout ce qui est marqué **[dérivé]** soit servi
par le contrat, jamais recalculé par la surface.

### 1. `DateCard` — la carte d'une date. **La forme la plus consommée du produit**

Consommée par : `home` (tous les rails), `browse`, `category`, `artist`, `following`,
`account/upcoming`, `account/past`, les suggestions de recherche, le panneau de notifications.

Elle doit porter, au minimum :

- identité : `dateId`, `showId`, `artistId`, `venueId`, `slug` de chacun **[stable, indexable]** ;
- temps : **instant UTC ISO 8601** de début, `runtimeMin`, identifiant de zone **IANA** de la
  salle (`Europe/Paris`) — jamais un décalage figé en minutes (errata D3, D7) ;
- état **[dérivé]** : `scheduled | live | replay | ended`, plus `roomOpen` (la salle ouvre
  `roomOpensBeforeMin` = 30 min avant) et `progress` pour un direct en cours ;
- issue **[dérivée, prioritaire sur tout le reste]** : `null | postponed | cancelled |
  interrupted`, avec la date de report quand elle existe ;
- jauge : `seatsAvailable`, `waitlist`, et **le taux de remplissage** — la surface affiche
  « bientôt complet » à partir d'un seuil, ce seuil est une règle du domaine, pas un littéral
  d'interface ;
- tarif : **le tarif le plus bas** en unité canonique (centimes + code devise), et la liste des
  paliers quand la carte ouvre l'achat ;
- promotion **[dérivée]** : voir forme 6 ;
- rediffusion : `policy` (`included | subscription | unit | none`), `windowHours`, et
  **`replayHoursLeft` [dérivé]** quand l'état est `replay` ;
- droits : `worldwide | restricted`, et si restreint, le **code de motif** (`co-production |
  broadcaster | festival`) — jamais la phrase ;
- langue : `spokenLanguage[]`, `subtitles[]`, `surtitles[]`, `languageDependency` ;
- audience : `viewers` quand l'état est `live` — et **uniquement alors** (principe : jamais
  « 0 EN DIRECT ») ;
- taxonomie : `categoryId`, `genreId`, `tagIds[]` ;
- médias : visuel large **et** affiche 3:4, avec dimensions intrinsèques connues.

**Trois besoins que cette forme impose au contrat :**

1. **L'état d'une date change sans requête.** Une carte rendue au serveur à 20 h 29 affiche
   « salle ouverte » ; à 20 h 31 elle doit dire « en direct ». Le contrat doit porter les
   **instants de bascule** (ouverture de salle, début, fin, expiration de rediffusion) pour que
   la surface puisse programmer le changement sans re-solliciter le serveur. Servir un libellé
   d'état sans son instant d'expiration rend toute page rendue au serveur fausse au bout de
   quelques minutes.
2. **Le tarif d'une date en cours n'est pas constant.** Le tarif « séance commencée » est réduit
   *au prorata du temps restant*. C'est une valeur qui dépend de l'instant de lecture : elle
   doit venir du contrat avec sa date de validité, ou être recalculable par `@arthome/core` à
   partir de paramètres servis. Elle ne peut pas être une chaîne figée.
3. **Deux fuseaux, dont un inconnu du serveur.** L'heure du spectateur d'abord, l'heure de salle
   en second quand elle diffère. Le serveur ne connaît pas la zone du spectateur au premier
   rendu. Le contrat doit donc porter **l'instant UTC et la zone IANA de la salle**, et rien
   d'autre : c'est la seule forme qui laisse la surface résoudre les deux heures sans
   contradiction entre rendu serveur et rendu client.

### 2. `ShowDetail` — le spectacle

Consommée par : `live`, `artist`, `replay`, les modales d'achat.

Titre, synopsis, distribution, **dans les deux langues quand elles existent** (`title` /
`titleEn` — la règle est de rendre la langue du *lecteur*, pas celle de la salle), durée,
discipline, sous-genre, étiquettes, attributs, politique de rediffusion, visuel et affiche,
`contentLanguage`.

**Besoin** : le contrat doit dire quelle langue est disponible pour chaque champ traduit, pas
seulement quelle langue est demandée. La surface bascule de langue sans recharger : elle a
besoin des deux versions, ou d'un moyen de les obtenir sans perdre l'état.

### 3. `ArtistSummary` / `ArtistDetail`

Consommée par : `artists`, `artist`, `following`, `browse` (onglet `artists`), `home` (rail
« artistes que vous pourriez suivre »), fiche d'une date.

Nom, avatar, discipline, ville, pays, **nombre d'abonnés**, biographie bilingue, date d'arrivée
sur la plateforme, **audience moyenne**, dernier direct, `isLive` **[dérivé]**, `isFollowed`
**[dépend de la session]**, dates à venir, rediffusions disponibles.

**Besoin** : `followers` et `avgViewers` sont des compteurs agrégés qui s'affichent sur quatre
écrans. Ils ne doivent exister qu'à un seul endroit, avec une fraîcheur déclarée. Un compteur
d'abonnés faux de 3 % n'est pas grave ; un compteur qui diffère entre la fiche et la liste l'est.

### 4. `VenueRef`

Consommée partout où une date apparaît. Nom, ville, pays, région, **zone IANA**, capacité,
type de salle.

**Besoin** : `utcOffsetMin` doit disparaître du contrat (errata D3). La capacité est nécessaire
au taux de remplissage — mais ce taux étant **[dérivé]**, la surface n'a pas besoin de la
capacité : elle a besoin du taux. Servir la capacité et laisser calculer, c'est recréer la
valeur composée à deux endroits que le projet interdit.

### 5. `PriceTier`

Vocabulaire fermé, tranché par `shared` : **`full | reduced | support`** (`enums.priceTier`).
Montant en unité canonique + code devise. Chaque palier a un libellé par code i18n et un
descriptif.

**Besoin** : le prix payé n'est pas le prix du palier. Le récapitulatif d'achat porte
`palier + frais de service + remise d'abonnement − promotion = total`. **Les quatre lignes
doivent venir du contrat**, calculées par le serveur, jamais recomposées par la surface — c'est
exactement le cas « un total de commande composé à deux endroits » que le dossier cite comme
défaut typique. Le storefront web affiche un frais de service par place ; son barème est une
règle métier, pas une constante d'interface.

### 6. `Promotion`

Cinq motifs relevés, avec des règles distinctes : `pre-sale` (jusqu'à J-7), `preview-night`
(avant-première), `discovery-rate` (première diffusion d'un artiste), `final-date` (dernière de
série, jusqu'au lever de rideau), `late-rate` (séance commencée, **au prorata**).

Une promotion porte : le motif (code), le prix barré, le prix courant, **la fenêtre de validité**,
et une note explicative par code i18n.

**Besoin** : une promotion n'est jamais décorative — elle change le prix payé. Elle doit être
**attachée à la date côté serveur**, avec sa fenêtre, et le prix courant doit être celui que la
commande acceptera. Un prix promotionnel affiché puis refusé au paiement est le pire défaut
possible sur une billetterie. Corollaire : la commande d'achat doit **rejeter** un prix attendu
qui ne correspond plus, avec un code d'erreur distinct de « échec de paiement ».

### 7. `TaxonomyRef` et facettes

2 univers, **21 disciplines**, **176 sous-genres**, **205 étiquettes**, 7 groupes d'attributs.
La taxonomie est une donnée de référence : quasi immuable, partagée par les cinq surfaces,
volumineuse (≈ 400 entrées avec leurs libellés).

**Trois besoins :**

1. **Le rang éditorial `rank` fait autorité et aucune surface ne réordonne.** Il doit être servi
   avec la taxonomie.
2. **Les valeurs de filtre doivent être des identifiants stables**, jamais des indices de tableau.
   La maquette filtre sur `fCats: [1]`, `fSubs: [0, 1]` — des positions. C'est une commodité de
   maquette qui ne survit ni à une URL partageable, ni à une recherche enregistrée, ni à
   l'insertion d'une discipline. Le contrat doit porter `categoryId`, `genreId`, `tagId`.
3. **Les facettes ne doivent pas être énumérées dans le contrat.** La surface web expose
   aujourd'hui neuf filtres (discipline, sous-genre, tarif, date, statut, bientôt complet, a des
   dates, en promotion, expire bientôt), là où la taxonomie déclare sept groupes d'attributs
   facetables de plus (`audience`, `minimumAge`, `seatingMode`, `intermission`, `accessibility`,
   `venueType`, `languageDependency`). Si les filtres sont écrits un par un dans le schéma,
   ajouter « accessible en fauteuil » est un changement de contrat. **Besoin : une forme de
   facette générique** — identifiant de facette, valeurs, effectifs — plus un jeu de filtres
   *structurés* (intervalle de prix, intervalle de dates) qui, eux, ne sont pas des énumérations.

### 8. `SearchResultPage` — et le problème du regroupement

Consommée par : `browse`, `category`, `artist`, `following`.

La surface **ne rend pas une liste plate de dates**. Elle regroupe les dates d'un même spectacle
sous une seule carte : « 3 DATES · voir plus de dates (2) ». Le regroupement se fait sur
(artiste, spectacle) et se replie/déplie côté client.

**C'est le besoin le plus structurant de la page de recherche**, et il est en tension directe
avec la décision « storefront = curseur » :

- si l'API pagine des **dates**, le client ne peut pas regrouper correctement : la deuxième date
  d'un spectacle peut tomber dans la page suivante, et la carte se dédouble ;
- si l'API pagine des **spectacles** avec leurs dates imbriquées, le regroupement est juste, mais
  le filtre « ce week-end » porte sur une date, pas sur un spectacle, et le tri « bientôt » doit
  être celui de la *première date retenue*, pas du spectacle.

**Besoin : le contrat doit trancher l'unité de pagination de la recherche**, et servir, pour
chaque groupe, la date représentative retenue **et** le nombre total de dates du groupe qui
satisfont les filtres. Sans ce second nombre, le libellé « voir plus de dates (2) » est faux dès
qu'un filtre est actif.

### 9. `Ticket` — une place détenue

Consommée par : `account/upcoming`, `account/past`, `home` (rail « vos places »), `live` (la
pastille « VOTRE PLACE · ATH-…»).

`ticketId`, date, spectacle, artiste, **code de place**, palier acheté, état **[dérivé]**
(`upcoming | house-open | live | past`), accès rediffusion et sa fenêtre, facture, droit
d'annulation et son échéance.

**Besoin, trois fois :**

1. **Le code de place s'affiche sur le web, le mobile et la TV.** Il doit être **émis par le
   serveur**, jamais dérivé d'un identifiant côté client. La maquette le calcule par hachage —
   commodité de maquette qui, portée telle quelle, donnerait trois codes différents pour la même
   place si une surface change de fonction de hachage.
2. **« Une place détenue ouvre le spectacle. »** Principe n°3 du dossier. La forme doit donc
   permettre de répondre, sans second appel : *cette personne peut-elle lancer la lecture de
   cette date, maintenant ?* La réponse combine détention, état de la date, fenêtre de
   rediffusion, droits territoriaux et formule d'abonnement. C'est une règle de `@arthome/core`,
   mais ses **entrées** doivent toutes être dans la réponse.
3. **L'annulation a une échéance** (« annulation jusqu'à 1 h avant le début »). L'échéance doit
   être servie comme un instant, pas comme une phrase.

### 10. `Order` — et le fait qu'une commande peut ne pas être la nôtre

Consommée par : `account/orders`, `cart` (étape `done`).

`orderRef`, date de commande, vendeur, lignes (libellé, quantité, prix unitaire, total), total,
état, facture, suivi.

**Le besoin que rien d'autre ne porte** : la maquette distingue `source: arthome | shopify |
woocommerce | prestashop | drupal | api`, avec `extRef` (référence marchand) et `extHost`
(domaine de la boutique de l'artiste), et l'avertissement : *« Commande traitée par la boutique
de l'artiste. Le suivi, l'échange et le remboursement se font sur son site. »*

**Donc : la liste des commandes du spectateur est une vue fusionnée sur plusieurs sources de
commerce, dont certaines ne sont pas les nôtres.** Cela change trois choses dans le contrat :

- l'état d'une commande a deux vocabulaires : le nôtre (`prep | shipped | delivered | digital`)
  et celui, opaque, d'une boutique externe (`external`) ;
- une commande externe n'a **ni facture, ni suivi, ni remboursement** chez nous : la forme doit
  l'assumer explicitement plutôt que de servir des champs vides ;
- la réconciliation avec l'artiste et la commission ne peuvent pas porter sur ce que nous n'avons
  pas encaissé.

### 11. `CartLine` et `CartQuote`

Consommée par : le popover panier (trois temps).

**Correction à la mission** : dans la maquette web, **le panier ne porte que de la marchandise**
(`ticketing.cart.head` = « Panier merch », les lignes ne sont créées que par la boutique d'un
spectacle). L'achat d'une place est un parcours **séparé**, en modale, immédiat, hors panier.
Je n'invente pas un panier mixte que la conception ne montre pas — mais je signale l'écart au
chef (voir Incohérences) parce qu'il change la nature de la commande.

Ce que le panier impose quand même :

- **une commande n'est pas mono-vendeur** : chaque ligne porte son vendeur (la chaîne de
  l'artiste). Un panier à deux artistes est deux expéditions, deux commissions, potentiellement
  deux TVA ;
- **les frais de port sont calculés au paiement**, pas à l'ajout (`« Livraison calculée au
  paiement »`). Le contrat a donc besoin d'une commande de **devis de panier** distincte de la
  commande de paiement : sous-total, port, remise d'abonnement (15 % sur les boutiques pour les
  abonnés), total ;
- **le stock est réel** (`on-sale | out-of-stock`) : un article peut devenir indisponible entre
  l'ajout et le paiement. Le devis doit pouvoir invalider une ligne.

### 12. `MerchItem`

`id`, spectacle, chaîne vendeuse, libellé, `kind` (`poster | print | textile | record`), prix,
devise, stock, état.

**Deux manques à combler dans le contrat** : (a) il n'y a **aucune variante** — un t-shirt sans
taille ; (b) `label` n'existe qu'en français, aucun `labelEn`. Une boutique bilingue sur un
catalogue indexable dans deux langues ne peut pas s'en tenir là.

### 13. `SavedSearch` — les recherches enregistrées

Consommée par : `account/alerts`, `browse` (bouton « enregistrer cette recherche » et l'état
« déjà enregistrée »), `category` (enregistrer la discipline), le rail latéral « mes recherches
liées ».

Porte : nom libre (optionnel), **portée** (`search | category`) et la discipline quand la portée
est une catégorie, les mots-clés, **l'état complet des filtres**, l'onglet et le tri, les canaux
d'alerte (`push`, `email`), l'état actif/en pause, la date de création, et **le nombre de
correspondances** (`account.alerts.alertMatches`).

**Trois besoins :**

1. **Une recherche enregistrée est une requête persistée, pas une chaîne.** Le contrat doit
   porter une forme de critères stable, versionnée : si le vocabulaire des filtres change, les
   recherches enregistrées d'hier doivent continuer à s'exécuter ou se signaler périmées.
2. **La déduplication « déjà enregistrée » est une signature de critères.** La maquette la
   calcule côté client. Elle s'affiche sur deux écrans (`browse` et `category`) et détermine une
   écriture : c'est donc une valeur de `@arthome/core`, normalisée une fois, jamais deux.
3. **Le compteur de correspondances suppose que le serveur ré-exécute la recherche.** Dix
   recherches enregistrées par compte, un compteur chacune, sur la page Compte : c'est dix
   requêtes de comptage. À trancher : compteur temps réel, compteur périodique daté, ou
   compteur « nouvelles depuis votre dernière visite » — les trois ont un coût très différent.

### 14. `Notification`

Consommée par : le centre de notifications (en-tête), `account/notifs`.

Type d'événement (`live-start | date-soon | new-date | almost-full | replay-available`), sujet
(artiste ou date), instant, lu/non lu, visuel, action de destination.

**Besoin** : le badge « non lu » s'affiche en permanence dans l'en-tête, sur toutes les routes.
Il est donc **la donnée personnalisée présente sur chaque page**, y compris les pages publiques
indexables. Voir §Contraintes Next.js : c'est lui qui interdit de rendre l'en-tête dans la
coquille statique.

### 15. `Plan` et `Subscription`

`planId`, prix mensuel, droits ouverts (`opens[]`), remise sur les places (`seatDiscount`), et
pour l'abonnement en cours : depuis quand, prochain prélèvement, moyen de paiement, factures.

**Besoin** : `opens[]` **conditionne l'accès à la lecture** et la remise conditionne le prix
affiché. La décision d'accès est du domaine ; mais les droits de la formule courante doivent
être dans la réponse de toute page qui propose de regarder, sinon la surface fait un second appel
sur le chemin critique de la lecture.

### 16. `Device` et `Session`

Appareils connectés (type : `tv | mobile | tablet | desktop | box | console | stick`, libellé,
ville, dernière activité, session courante), sessions actives avec navigateur et horodatage.

**Besoin** : « déconnecter cet appareil » doit produire un effet **observable sur l'appareil
visé**, pas seulement dans la liste. C'est une écriture qui doit se propager — voir §Commandes.
Le droit « deux écrans à la fois » (`multi-screen`) de la formule Premium implique par ailleurs
un **compte de lectures concurrentes**, donc une donnée de session côté lecture.

### 17. `Profile`, `Preferences`, `NotificationPrefs`, `Consents`

Profil (nom, pseudo, courriel, téléphone, ville). Préférences de lecture : qualité, **ce que l'on
voit en arrivant sur un direct** (`peek | muted | off`), tchat ouvert/fermé, réduction des
animations, langue de sous-titrage, devise d'affichage. Notifications : cinq familles × trois
canaux, plus les **heures calmes** (aucune notification entre 23 h et 9 h, sauf début d'un direct
pour lequel j'ai une place). Consentements : audience, personnalisation, partenaires, publicité.
Cookies : mesure, lecteur tiers, et un bloc « essentiel » non désactivable.

**Besoins** : (a) la **devise d'affichage** est une préférence de compte alors que la devise de
facturation est une propriété du marché de la date — les deux ne peuvent pas être la même valeur
(errata D4) ; (b) la règle des heures calmes a une **exception conditionnée à la détention d'une
place** : c'est une règle métier du service de notification, pas un réglage d'interface ; (c) les
consentements doivent être **horodatés et versionnés** — un consentement sans version ni date ne
vaut rien juridiquement, et `account.privacy.updated` est déjà affiché.

### 18. `PlaybackGrant` — le droit de lire

Consommée par : `live`, `replay`, le mini-lecteur.

**Besoin** : la lecture est signée en périphérie de CDN (`streaming.md`). La surface a besoin
d'un jeton de lecture à durée limitée, d'une échéance, et d'une manière de le **renouveler sans
interrompre la lecture**. Trois cas particuliers au storefront web :

1. **L'aperçu gratuit** : le non-détenteur voit les premières minutes puis le verrou. Le décompte
   (252 s dans la maquette, 5 minutes annoncées dans la copie) doit être **imposé par le jeton**,
   pas par le client. Un aperçu que l'on prolonge en rechargeant la page n'est pas un aperçu.
2. **Le mini-lecteur** survit à la navigation. Le jeton ne doit pas être ré-émis à chaque
   changement de route, sinon la lecture se coupe à chaque clic.
3. **Le blocage territorial** est un refus de lecture, pas un échec technique : il a son propre
   code et son motif.

### 19. `ChatMessage`

Auteur, texte, état (`ok | removed | muted | banned`), instant, couleur d'auteur.
Régime du tchat par date : **`open | emoji | off | read-only`** (`enums.chatMode`).

**Besoins** : (a) le tchat est **modéré** : un message peut être retiré après publication, donc
l'état d'un message déjà affiché doit pouvoir changer ; (b) l'écriture est fermée à trois
conditions distinctes — visiteur sans compte, détenteur sans place, régime `read-only`/`off` —
et la surface doit **dire laquelle**, donc le refus porte un code, pas un booléen ; (c) le régime
`emoji` restreint l'envoi à un vocabulaire fermé de réactions et de phrases préparées : c'est une
validation serveur, pas un clavier restreint.

### 20. `ReplayChapter` et `ResumePoint`

Chapitres posés en régie : identifiant de vocabulaire de chapitre + minute. Point de reprise :
date, position, instant de dernière lecture.

**Besoin** : le point de reprise alimente le rail « Reprendre » de l'accueil **et** la position
d'ouverture du lecteur, sur trois surfaces. Il doit être écrit par le client à intervalle
raisonnable et lu comme une donnée de compte — c'est une écriture fréquente, à faible valeur
unitaire : elle appelle un traitement séparé du reste des commandes (pas d'idempotence stricte,
tolérance à la perte).

### 21. `Incident` et `Outcome`

`kind` : `hold-screen | postponed | interrupted | cancelled`. Résolution, instant, message
éditorial bilingue.

**Besoin** : principe n°4 du dossier — « les états d'issue priment sur tout le reste ». Le
contrat doit donc les porter **sur la carte**, pas seulement sur la fiche : une date annulée qui
apparaît dans un rail doit se présenter comme annulée. Et chaque issue emporte une conséquence
distincte pour le spectateur, déjà rédigée : remboursement intégral (3 à 5 jours ouvrés), avoir
sur le compte Arthome, place valable sans démarche à la nouvelle date. **Ce sont trois
mécanismes financiers différents**, et le contrat doit dire lequel s'applique et où le spectateur
le retrouve.

### 22. `Invoice`

Factures d'abonnement et de commandes, exportables, **conservées 10 ans**
(`account.invoiceNote`, `account.privacy.retentionText`).

**Besoin** : c'est la seule exception à la règle « jamais de chaîne formatée transportée » — un
document de facturation porte des montants formatés et figés. Le contrat doit le dire, et servir
un document, pas un modèle à recomposer.

---

## Les commandes

Toute commande porte `Idempotency-Key`. Toute réponse d'erreur suit l'enveloppe unique
(code, paramètres, identifiant de trace). Les commandes sont regroupées par garantie exigée.

### A. Commandes d'argent — idempotence stricte, effet observable immédiat

| Commande | Effet attendu | Garanties propres |
|---|---|---|
| `purchaseSeat` | une place détenue pour une date, à un palier | **Un double clic ne crée jamais deux places.** Le prix attendu (palier + promotion + remise) est envoyé et **vérifié** : s'il a changé, refus avec un code distinct de l'échec de paiement. Rejet distinct si la jauge est épuisée entre l'affichage et la validation. |
| `contributeFreeSeat` | place gratuite + contribution libre à la compagnie | Montant **ouvert**, saisi par le spectateur. Minimum et maximum sont des règles du domaine, pas des attributs d'un champ de saisie. |
| `joinWaitlist` | inscription en liste d'attente | Idempotente par nature : deux envois laissent une inscription. Doit dire le **rang** ou refuser de le dire, mais pas rester muette. |
| `cancelSeat` | annulation d'une place | **Échéance : 1 h avant le début.** Le refus après échéance a son propre code. Emporte un remboursement. |
| `quoteCart` | devis : sous-total, port, remise d'abonnement, total | Lecture, mais **le devis doit être opposable** : le total présenté est celui qui sera débité. Durée de validité explicite. |
| `checkoutCart` | commande de marchandise | Idempotence stricte. Peut échouer partiellement (une ligne en rupture) : le contrat doit dire si la commande est refusée en bloc ou amputée. |
| `subscribe` / `changePlan` / `cancelSubscription` | formule d'abonnement | Effet **immédiatement visible** sur les droits de lecture et sur les prix affichés : un changement de formule change la remise sur toutes les cartes de la session. |

**Le besoin commun** : ces sept commandes changent ce qu'affichent des pages déjà rendues. Le
contrat doit dire, pour chacune, **quelles lectures deviennent fausses** — c'est la condition
pour que la surface invalide juste ce qu'il faut (voir §Contraintes Next.js).

### B. Commandes de relation — idempotence par intention

`followArtist` / `unfollowArtist` · `addToWatchlist` / `removeFromWatchlist` (« ma liste ») ·
`setReminder` (« me rappeler ») · `saveSearch` · `renameSearch` · `pauseSearch` / `resumeSearch`
· `deleteSearch` · `setSearchChannels` (push, courriel) · `saveCategory` (recherche de portée
catégorie).

Elles sont **déclaratives** : « suivi » est un état, pas un incrément. Deux envois du même
« suivre » laissent un seul suivi. Le contrat doit donc les exprimer comme des **mises en état**,
pas comme des bascules — une bascule sur un réseau douteux inverse le résultat.

**`setReminder` a un besoin propre** : le rappel est annoncé à 30 minutes avant le lever de
rideau. Un rappel est une promesse datée : si la date est reportée, le rappel doit suivre le
report, et si elle est annulée, le rappel doit être annulé et non envoyé à vide.

### C. Commandes de compte et de sécurité

`signUp` · `signIn` · `signOut` · `signOutDevice` · `changePassword` · `enable2FA` /
`regenerateBackupCodes` · `addPasskey` · `addPaymentMethod` / `removePaymentMethod` ·
`updateProfile` · `updatePreferences` · `updateNotificationPrefs` · `setQuietHours` ·
`updateConsents` · `updateCookiePrefs`.

**`signOutDevice` est la seule qui doit se propager hors de la session courante** : déconnecter
un téléviseur depuis le web doit couper la lecture sur ce téléviseur. Le contrat doit dire au
bout de combien de temps, et ce que voit l'appareil déconnecté.

**`updateConsents`** doit horodater et versionner. Et le consentement « publicité » est à `false`
par défaut dans la maquette : ce défaut est une décision, pas un réglage — il appartient au
contrat.

### D. Commandes de données personnelles — RGPD

`exportMyData` · `exportInvoices` · `deleteAccount` · `contactDPO`.

**`deleteAccount` a une conséquence métier écrite** : *« La suppression annule les places non
utilisées. »* C'est donc une commande **financière** autant que personnelle : elle déclenche des
remboursements, elle touche des versements d'artistes potentiellement déjà calculés, et elle se
heurte à la conservation comptable de 10 ans des factures. Elle ne peut pas être synchrone et
elle ne peut pas être totale.

`exportMyData` et `exportInvoices` sont **asynchrones** : la surface doit pouvoir suivre une
demande en cours et récupérer un document quand il est prêt.

### E. Commandes de lecture et de tchat

`sendChatMessage` · `sendReaction` (régime `emoji`) · `reportMessage` · `recordPlaybackPosition`
· `openPlayback` (obtention du jeton) · `renewPlayback`.

`sendChatMessage` : besoin d'une **limitation de débit exprimée dans le contrat** (un code
d'erreur dédié, avec le délai d'attente en paramètre), parce que la surface doit désactiver la
saisie proprement plutôt que d'enchaîner les refus.

`recordPlaybackPosition` : écriture fréquente, tolérante à la perte. Elle ne doit **pas** passer
par le même régime d'idempotence que l'achat — sinon la clé d'idempotence devient un coût par
minute de lecture, par spectateur.

### F. Commande d'assistance

`contactSupport` : six sujets (`ticketing-refund`, `playback-quality`, `replay`,
`store-shipping`, `account-signin`, `personal-data`), message libre. Réponse annoncée sous 24 h
ouvrées, *« les demandes liées à un live en cours sont traitées en priorité »*.

**Besoin** : le sujet route le message vers un interlocuteur, et la priorité dépend de l'état
d'une date. Le contrat doit donc accepter un **contexte** (date, place, commande) attaché à la
demande, sans quoi la priorisation annoncée est impossible.

---

## Le temps réel

Trois régimes distincts, à ne pas confondre — ils n'ont ni le même coût ni la même garantie.

### Régime 1 — poussé, sous la seconde. Seulement sur la page d'une date en direct

| Donnée | Latence acceptable | Pourquoi |
|---|---|---|
| Messages de tchat | < 1 s | C'est une conversation. Au-delà, les réponses arrivent avant les questions. |
| Changement d'état d'un message (retiré, auteur réduit au silence) | < 2 s | Un message retiré qui reste affiché est un échec de modération. |
| Incident en cours (`hold-screen`, interruption) | < 2 s | Principe n°6 : jamais de spinner muet. L'écran d'attente doit arriver avant que le spectateur conclue que c'est sa connexion. |
| Bascule `roomOpen` → `live` → `ended` | < 2 s | Le bouton « rejoindre » doit exister quand la salle ouvre. |

### Régime 2 — rafraîchi, de l'ordre de la dizaine de secondes

| Donnée | Latence acceptable | Écrans |
|---|---|---|
| Compteur de spectateurs | 10 à 30 s | `live`, cartes de `home`, `browse`, `category`, `artist`. **Il s'affiche sur des cartes de liste** : un compteur par carte, sur une grille de douze, ne peut pas être un abonnement par carte. |
| Jauge (`seatsAvailable`, « bientôt complet », « complet ») | 15 à 60 s | Mêmes écrans. Une date affichée disponible puis refusée à l'achat est acceptable une fois ; systématiquement, non. |
| Liste d'attente | 60 s | `live`, cartes. |
| Tarif « séance commencée » (prorata) | 60 s | Il décroît avec le temps. |
| Badge de notifications non lues | 30 à 60 s | En-tête, **toutes les routes**. |

**Le besoin structurant ici** : ces valeurs vivent sur des **cartes de liste**, pas sur une page
de détail. Le contrat doit permettre de rafraîchir **un lot** de compteurs pour un lot
d'identifiants, en un appel, et non d'ouvrir une souscription par carte. Sans cela, une grille
de douze cartes ouvre douze canaux.

### Régime 3 — à l'échéance, sans requête

Ce qui change à un instant **connu d'avance** ne doit jamais être interrogé : il doit être servi
avec son échéance, et la surface programme le changement.

- ouverture de salle (T−30 min), début, fin de représentation ;
- **expiration de la fenêtre de rediffusion** (`replayHoursLeft`, jusqu'à 200 h) ;
- expiration d'une promotion (`pre-sale` à J-7, `final-date` au lever de rideau) ;
- échéance d'annulation d'une place (T−1 h) ;
- fin du décompte d'aperçu gratuit ;
- validité d'un devis de panier, d'un jeton de lecture, d'un code d'achat.

**Besoin : chaque valeur dont la validité expire doit voyager avec son instant d'expiration.**
C'est la seule manière de rendre au serveur une page qui restera juste. C'est aussi ce qui
permet de choisir une durée de cache : une page dont le prochain changement est dans 4 heures
n'a pas le même régime qu'une page dont le prochain changement est dans 90 secondes.

### Ce qui n'a pas besoin d'être temps réel, et qu'il faut se retenir de rendre tel

Nombre d'abonnés d'un artiste, audience moyenne, nombre de correspondances d'une recherche
enregistrée, stock de marchandise (l'état `on-sale`/`out-of-stock` suffit, le nombre exact non),
position de lecture d'un autre appareil.

---

## Hors ligne et reprise

Le storefront web n'est pas une application hors ligne. Mais **quatre choses doivent survivre à
une perte de réseau ou à un rechargement**, et ce sont des exigences de contrat, pas
d'implémentation.

1. **Le panier.** Il est monté avant le paiement, par ajouts successifs depuis la boutique d'un
   direct, potentiellement sur plusieurs sessions. **Besoin : le panier est-il une donnée de
   compte ou une donnée de navigateur ?** S'il est côté compte, il se retrouve sur le mobile et
   la TV et il survit à tout ; s'il est local, il ne survit pas à un changement d'appareil et
   il faut le dire. La question est adressée au backend.

2. **Un achat en vol.** Réseau coupé entre l'envoi et la réponse : la surface ne sait pas si la
   place existe. **Besoin : la même `Idempotency-Key` rejouée doit rendre le résultat de la
   première tentative**, pas une erreur de doublon — c'est la différence entre « rejeu sûr » et
   « rejeu refusé », et seule la première permet à la surface de proposer « réessayer ».

3. **La position de lecture.** Perdue en cas de coupure si elle n'est écrite qu'à la fin. Besoin
   d'une écriture périodique, et d'une tolérance au conflit entre appareils (la maquette annonce
   explicitement « reprise de lecture entre appareils »). Dernier écrit gagne est acceptable ici,
   mais il faut le décider.

4. **L'état de recherche.** Requête, filtres, tri, onglet, page atteinte. Il doit vivre **dans
   l'URL** : c'est la condition d'un lien partageable, d'un retour arrière juste, et d'un rendu
   serveur. Conséquence de contrat déjà notée : les valeurs de filtre doivent être des
   identifiants stables et courts.

**Le brouillon de message de tchat** mérite une mention : il est perdu à chaque navigation dans
la maquette. C'est acceptable — mais alors le contrat n'a rien à en dire, et c'est une décision.

### Les quatre familles d'erreur, et la distinction que la surface doit pouvoir faire

`shared/i18n/system.json` les a déjà nommées, et le principe n°6 les impose :

| Famille | Message | Ce que la surface doit pouvoir dire |
|---|---|---|
| **Réseau du spectateur** | « Votre appareil n'atteint plus le réseau. Les serveurs Arthome répondent normalement. » | le problème vient de vous |
| **Nos serveurs** | « Le problème vient de chez nous, pas de votre connexion. » | le problème vient de nous |
| **Droits territoriaux** | « Non diffusé dans votre pays » + le motif | ni l'un ni l'autre : c'est un droit |
| **Autorisation** | « Vous n'avez pas de place pour cette date » | ni l'un ni l'autre : c'est un achat manquant |

**Besoin : l'enveloppe d'erreur doit permettre cette distinction à la lecture du code seul.**
Un 500 générique ne la permet pas, et un 403 sans motif non plus. Les codes doivent séparer au
minimum : indisponibilité de service, refus de droit territorial (avec le motif en paramètre),
absence de titre d'accès, jauge épuisée, prix périmé, échéance dépassée, limitation de débit.

---

## Pagination et volumes

Décision de cadre : **storefront = curseur, défilement infini, tri déterministe avec départage
par identifiant.** Ce que la surface web exige en plus, ou en tension :

| Liste | Régime | Pas | Volume attendu | Besoin propre |
|---|---|---|---|---|
| Résultats de `browse` (lives) | curseur | **12 groupes** | quelques centaines à quelques milliers de dates | Pagination sur des **groupes**, pas des dates. Voir forme 8. |
| Résultats de `browse` (replays) | curseur | 12 groupes | idem | |
| Résultats de `browse` (artists) | curseur | 12 | ordre de la centaine | tri `az` et `followers` |
| `category` — vue d'ensemble | tranche fixe | **8 par section** | 5 sections | Pas de pagination : une vue d'ensemble se borne. |
| `category` — onglets `live`/`up`/`rep`/`art` | curseur | 12 | dizaines à centaines | |
| Rails de `home` | tranche fixe | 5 à 12 | une douzaine de rails | **Aucune pagination.** Un rail est un extrait. |
| `categories` | pas de pagination | 21 | fixe | Tout tient. |
| Dates d'un artiste | tranche + « toutes les dates (N) » | 1 visible, N annoncé | dizaines | Le **N doit être servi**. |
| Tchat d'un direct | fenêtre glissante + queue temps réel | ~50 à l'ouverture | milliers par direct | Un historique borné, pas un défilement infini vers le passé. |
| `account/upcoming` et `past` | curseur | ~20 | dizaines | |
| `account/orders` | curseur | ~20 | quelques dizaines | fusionne plusieurs sources (forme 10) |
| `account/alerts` | pas de pagination | 10 dans la maquette | quelques dizaines | Plafond à décider. |
| Notifications | curseur | ~20 | centaines | Un badge « non lu » **global** en plus. |
| Appareils / sessions | pas de pagination | 3 à 10 | fixe | |

### Le point de friction, à trancher

**La surface affiche « Voir plus · N restants ».** Un curseur ne donne pas de reste. Trois
sorties possibles, et il faut en choisir une explicitement :

1. servir un **effectif total approximatif** à côté du curseur (ce que fait naturellement un
   moteur de recherche à facettes, et Arthome en a un) ;
2. changer la copie pour « voir plus » sans nombre, et perdre une information que la conception
   a jugée utile ;
3. servir seulement un « il reste des résultats » booléen.

La première est la seule compatible avec la conception, et elle est gratuite si la recherche
passe par le moteur de recherche — **c'est une question au backend, pas une décision de
surface**.

**Les effectifs de facettes posent la même question** : afficher « Danse (42) » à côté d'un
filtre suppose un comptage par facette, sur la requête courante, à chaque frappe.

---

## États d'erreur et de chargement

Ce qui relève du contrat, et non de la mise en page.

1. **Squelettes, jamais de page blanche** (principe n°7) : la surface doit pouvoir rendre une
   carte *avant* d'avoir ses compteurs. **Besoin : séparer ce qui peut être rendu au serveur
   tout de suite (titre, visuel, date, tarif de base) de ce qui arrive ensuite (compteur de
   spectateurs, jauge, promotion en cours, état personnalisé).** Si les deux arrivent dans la
   même réponse, la page entière attend la partie volatile — et le référencement paie pour du
   temps réel dont le robot n'a rien à faire.

2. **États vides explicites, avec une action qui sort de l'impasse** (principe n°8). Quinze
   états vides distincts sont rédigés dans `shared/i18n` — aucun n'est générique. **Besoin : la
   réponse doit dire *pourquoi* la liste est vide** : aucun résultat pour la requête, aucun
   résultat avec ces filtres, rien dans cette discipline pour l'instant, aucun artiste suivi en
   direct, aucune commande. Une liste vide sans motif oblige la surface à deviner, et à se
   tromper.

3. **Les actions inertes sont proscrites** (principe n°10). Toute commande doit rendre soit un
   effet, soit un code d'erreur exploitable. Aucune ne peut rendre un succès vide.

4. **L'échec partiel doit être exprimable.** Une page `live` dont le tchat est indisponible n'est
   pas une page en erreur : le spectacle continue. **Besoin : un même écran doit pouvoir
   composer des réponses dont certaines ont échoué**, chacune avec son code, sans que l'échec
   d'une région emporte la page. C'est ce qui permet d'afficher « le tchat est momentanément
   indisponible » au lieu de perdre le direct.

5. **Le chargement initial du catalogue est un état de premier ordre.** La maquette porte un
   écran d'amorçage avec sa propre erreur. Sur une page indexable, cet état ne doit **jamais**
   être ce que voit un robot.

---

## Contraintes propres à Next.js

Seulement celles qui contraignent le contrat. J'ai chargé `nextjs-how-to` d'abord, comme demandé.
**Signalement exigé par cette skill** : trois de ses lignes de routage indiquent « aucune skill
installée » pour l'accès aux données, le choix de bibliothèque d'authentification et le cache —
ce document ne s'appuie donc pas sur une skill spécialisée pour ces trois sujets, seulement sur
la documentation embarquée et sur les règles de l'orchestrateur. Aucune skill ne contredit les
décisions du projet.

### 1. Le robot ne voit pas la coquille statique

Sous le modèle « Cache Components », **les robots d'indexation contournent la coquille
pré-rendue et reçoivent un rendu dynamique complet**, détecté à l'agent utilisateur. Sur un
catalogue de billetterie dont l'indexation est décisive, cela a une conséquence de contrat
directe :

> **Le chemin de lecture non authentifié d'une page de catalogue doit être complet, autonome et
> à latence bornée.** Il ne peut pas dépendre d'un préchauffage, d'un cache local d'instance, ni
> d'un second aller-retour pour compléter la page.

Concrètement : une page de date, une page d'artiste, une page de discipline doivent être servies
**en un appel**, sans session, avec tout ce qui est indexable — et la personnalisation arrive
ensuite, séparément.

### 2. La coquille statique ne peut pas lire la session — et l'en-tête en a besoin

Dans une fonction mise en cache, ni les cookies, ni les en-têtes, ni les paramètres de route ne
sont lisibles : ils doivent être extraits à l'extérieur et passés en arguments, où ils entrent
dans la clé de cache. Or l'en-tête du storefront porte, sur **toutes** les routes : le badge de
notifications non lues, le compteur du panier, l'état de session (visiteur / connecté / abonné),
et les artistes suivis.

**Besoin de contrat : les lectures publiques et les lectures personnalisées doivent être
séparables.** Un modèle de lecture qui mélange « la date » et « est-ce que *vous* la suivez » ne
peut être mis en cache ni pour le robot, ni pour deux personnes différentes. La séparation
demandée :

- **public, cacheable, indexable** : la date, le spectacle, l'artiste, la salle, la taxonomie, les
  tarifs de base, la politique de rediffusion ;
- **volatile, public** : compteur de spectateurs, jauge, promotion en cours ;
- **personnel** : détention d'une place, suivi, liste, panier, notifications, droits de formule,
  point de reprise.

C'est la même séparation qui rend possibles les squelettes (§États) — elle sert deux besoins à
la fois.

### 3. L'invalidation doit avoir une clé, et un signal

Le modèle de cache de Next 16 invalide par **étiquette**, avec deux appels distincts :
`updateTag` quand la personne doit voir sa propre écriture immédiatement, `revalidateTag(tag,
profil)` quand une légère obsolescence est acceptable — et ce second appel **saute délibérément
le re-rendu immédiat**. Le second argument n'est pas optionnel.

Deux besoins en découlent, et ils sont adressés au backend :

1. **Une clé d'invalidation par ressource.** Après `purchaseSeat`, la surface doit invalider : la
   date (jauge), les places du compte, l'accueil personnalisé. Elle a besoin de savoir **quelles
   étiquettes** correspondent, et ces étiquettes ne peuvent pas être inventées par la surface —
   sinon le mobile et la TV en inventeront d'autres.
2. **Un signal pour ce que la surface n'a pas écrit elle-même.** Une date passe en direct, une
   promotion expire, un artiste publie une rediffusion : aucune commande du web n'en est la
   cause. Sans signal, la page reste fausse jusqu'à l'expiration du cache. **Question : le
   storefront reçoit-il une notification de changement (canal serveur, webhook), ou doit-il se
   contenter d'une durée de fraîcheur ?** Kafka étant réservé à l'inter-services, le BFF est le
   seul point possible.

### 4. Aucune entrée de cache ne survit à un déploiement

La clé de cache inclut l'identifiant de build. Un déploiement vide donc tout, et la première
minute après une mise en ligne voit passer l'intégralité du trafic de lecture vers le BFF.
**Besoin : les lectures publiques doivent être des modèles de lecture servis, pas des
compositions coûteuses.** C'est un argument de plus, indépendant, en faveur de la projection des
modèles de lecture là où le BFF les lit.

### 5. Toute commande est un point d'entrée POST public

Une action serveur est une route POST publique : la redirection de la page ne la protège pas, et
la couche de proxy ne peut pas servir de frontière d'autorisation (quatre contournements connus).
**Besoin : chaque commande doit être autorisable seule**, à partir de la session et de ses seuls
arguments — jamais « parce que la page qui l'appelle était protégée ». Concrètement, chaque
commande d'écriture porte l'identifiant de la ressource visée et le contrat dit quelle propriété
est vérifiée (cette place est-elle la vôtre, cette recherche enregistrée est-elle la vôtre, ce
message est-il le vôtre).

Corollaire sur l'idempotence : **la clé doit être engendrée côté serveur au moment où le
formulaire est rendu**, pas côté client — sinon elle est falsifiable et deux onglets produisent
la même clé pour deux achats différents.

### 6. Les URL, l'indexation et ce qui manque aujourd'hui

- **Il n'existe pas d'URL canonique pour une date.** La maquette adresse la page `live` par
  artiste, et résout « la date courante » à l'arrivée (en direct d'abord, sinon la prochaine).
  Or une date est ce que l'on partage, ce que l'on met en favori, ce vers quoi pointe un rappel
  et une notification, ce que l'on indexe. **Besoin : un identifiant public et un `slug` stable
  par date et par spectacle**, sans quoi le partage, les notifications, les rappels et le
  référencement pointent tous vers « la prochaine date », qui change.
- **Les superpositions n'ont pas d'URL.** Panier, achat, authentification, partage. Au minimum
  l'achat doit être adressable : c'est la cible d'un rappel et d'un lien de campagne.
- **Deux langues, deux arborescences.** L'API rend des codes, la surface les résout. Pour
  l'indexation il faut une URL par langue et des liens alternatifs croisés. **Besoin : les
  `slug` doivent exister par langue**, ou être neutres — mais la décision doit être prise une
  fois, pas par surface.
- **Les filtres doivent tenir dans une URL courte et stable.** Voir forme 7.

### 7. Le rendu serveur ne connaît pas le fuseau du spectateur

« L'heure du spectateur d'abord » est un principe. Le serveur ne peut pas l'honorer au premier
rendu sans se tromper une fois sur deux, et une heure rendue au serveur puis corrigée au client
est une divergence visible. **Besoin déjà énoncé en forme 1, répété ici parce que c'est Next qui
le rend contraignant : le contrat porte un instant UTC et une zone IANA, jamais une heure
formatée ni un décalage.** La résolution de l'heure du spectateur est du ressort du client ;
l'heure de salle, elle, est rendue au serveur et reste juste.

### 8. Le mini-lecteur survit à la navigation

La lecture continue quand on change de page. Cela impose une hiérarchie où le lecteur n'est pas
démonté entre deux routes. Ce qui touche le contrat : **le jeton de lecture ne doit pas être lié
à la route**, et son renouvellement ne doit pas dépendre d'un montage de page.

### 9. Images

Les visuels sont distants. **Besoin : dimensions intrinsèques et hôte stable dans le contrat.**
Sans dimensions, la mise en page saute au chargement — ce qui coûte en référencement autant qu'en
confort. Sans hôte connu d'avance, l'optimisation d'image de Next refuse le domaine.

### 10. La montée de version de zod est un changement de contrat

Rappel du dossier, qui pèse ici : zod est une dépendance d'exécution partagée par sept services
et cinq applications, épinglée. Sur la surface web, elle valide aussi les entrées de formulaire.
**Besoin : un échec de validation doit se traduire en code i18n**, jamais en message anglais de
zod — sinon l'internationalisation fuit dès la première erreur de formulaire, et c'est le
formulaire de paiement qui la fait fuir en premier.

---

## Ce que je ne peux pas obtenir seul → questions au backend

Par ordre d'impact sur le contrat.

### Pagination, recherche, facettes

1. **Quelle est l'unité de pagination de la recherche : la date ou le spectacle ?** La surface
   regroupe les dates d'un même spectacle sous une carte unique et annonce « N dates ». Paginer
   des dates casse le regroupement aux frontières de page ; paginer des spectacles rend le tri
   « bientôt » et le filtre « ce week-end » ambigus. Cette question détermine la forme de
   `SearchResultPage` et, avec elle, la page la plus utilisée du produit.
2. **Le curseur peut-il être accompagné d'un effectif total, même approximatif ?** La copie dit
   « Voir plus · N restants ». Si la réponse est non, la conception doit changer ; si c'est oui,
   dire quelle précision est garantie.
3. **Les effectifs par facette sont-ils servis, et sur quelle requête ?** « Danse (42) » à côté
   d'un filtre suppose un comptage sur la requête courante, recalculé à chaque changement.
4. **Comment le contrat exprime-t-il les facettes : énumérées ou génériques ?** Sept groupes
   d'attributs sont déclarés dans la taxonomie et jamais exercés (voir Incohérences). Si les
   filtres sont écrits un par un, chacun d'eux sera un changement de contrat.

### Cache et fraîcheur — la question la plus urgente pour Next

5. **Quelle est la clé d'invalidation d'une ressource, et qui la nomme ?** La surface doit
   invalider ses lectures après une écriture et à la réception d'un changement. Si chaque surface
   invente ses étiquettes, elles divergeront.
6. **Le storefront est-il notifié des changements qu'il n'a pas causés** (une date passe en
   direct, une promotion expire, une rediffusion est publiée), ou doit-il se contenter d'une
   durée de fraîcheur ? Kafka étant interdit hors inter-services, la réponse passe forcément par
   le BFF.
7. **Quelle fraîcheur le BFF garantit-il par famille de lecture ?** Catalogue, jauge, compteur de
   spectateurs, promotion : j'ai proposé des latences en §Temps réel, mais ce sont des besoins,
   pas des engagements.
8. **Le rafraîchissement des compteurs volatils peut-il être groupé** — un appel pour douze
   identifiants — plutôt qu'un canal par carte ?

### Argent, commandes, idempotence

9. **Une `Idempotency-Key` rejouée rend-elle le résultat de la première tentative, ou une
   erreur ?** Seule la première réponse permet à la surface de proposer « réessayer » après une
   coupure. C'est la différence entre une reprise sûre et une place perdue.
10. **Le prix envoyé avec l'achat est-il vérifié côté serveur, et le refus a-t-il un code
    distinct de l'échec de paiement ?** Avec cinq motifs de promotion dont un calculé au prorata
    du temps écoulé, l'écart entre le prix affiché et le prix valide est structurel, pas
    accidentel.
11. **Quel est le barème des frais de service, et à quel niveau s'applique-t-il** — par place,
    par commande, par vendeur ? La surface affiche une ligne « frais de service » dans le
    récapitulatif.
12. **La remise d'abonnement sur les places (`seatDiscount`) et la remise de 15 % sur les
    boutiques : qui les calcule, et se cumulent-elles avec une promotion ?** Trois écrans
    affichent un prix remisé ; si la règle de cumul n'est pas dans le domaine, elle sera écrite
    trois fois.
13. **Le panier est-il une donnée de compte ou de navigateur ?** S'il est côté compte, il doit
    suivre sur mobile et TV ; s'il est local, la conception doit le dire au spectateur.
14. **Le devis de panier est-il opposable, et pour combien de temps ?** Les frais de port sont
    calculés au paiement : il y a donc un instant où le total est fixé, et il faut savoir lequel.
15. **Une commande de marchandise à deux vendeurs : une commande ou deux ?** Deux expéditions,
    deux commissions, éventuellement deux marchés de facturation. La réponse change la forme
    `Order` et les versements.

### Boutique et commerce externe

16. **Comment le storefront lit-il les commandes passées sur une boutique externe** (Shopify,
    WooCommerce, PrestaShop, Drupal, API) ? La section « Mes commandes » les affiche à côté des
    nôtres, avec une référence marchand et un domaine. S'agit-il d'une synchronisation, d'un lien
    déclaratif posé par l'artiste, ou d'une reprise ponctuelle ? Le point est absent de la carte
    des contextes, comme la boutique elle-même (errata C8).
17. **La marchandise a-t-elle des variantes ?** Un t-shirt sans taille n'est pas vendable. Et
    `label` n'existe qu'en français.

### Billetterie et accès

18. **Qui émet le code de place, et sous quelle forme ?** Il s'affiche à l'identique sur trois
    surfaces : il ne peut pas être dérivé côté client.
19. **La règle « une place détenue ouvre le spectacle » : quelles entrées la surface reçoit-elle
    pour la trancher sans second appel ?** Détention, état de la date, fenêtre de rediffusion,
    droits territoriaux, droits de formule — cinq entrées, un seul verdict.
20. **L'aperçu gratuit est-il imposé par le jeton de lecture** (durée, non renouvelable pour un
    même spectateur), ou seulement par le client ? Dans le second cas, il suffit de recharger la
    page.
21. **La limite « deux écrans à la fois » de la formule Premium : qui la compte, et que voit le
    troisième écran ?**
22. **Une place annulée, remboursée ou créditée : comment le spectateur retrouve-t-il son
    argent ?** Trois issues, trois mécanismes distincts déjà rédigés (remboursement sous 3 à
    5 jours, avoir sur le compte Arthome, place valable à la nouvelle date). L'avoir sur compte
    est une monnaie interne — elle n'apparaît nulle part ailleurs dans le dossier.

### Compte, notifications, données personnelles

23. **Le compteur de correspondances d'une recherche enregistrée : temps réel, périodique, ou
    « nouvelles depuis votre dernière visite » ?** Dix recherches par compte, un compteur chacune,
    sur une seule page.
24. **Une recherche enregistrée est une requête persistée : comment survit-elle à une évolution
    du vocabulaire de filtres ?** Elle doit s'exécuter encore, ou se signaler périmée.
25. **« Déconnecter cet appareil » coupe-t-il la lecture en cours sur cet appareil, et en combien
    de temps ?**
26. **La suppression de compte annule les places non utilisées.** Elle est donc financière :
    remboursements, versements d'artistes potentiellement déjà calculés, conservation comptable
    de 10 ans des factures. Quel est le périmètre réel de la suppression, et quel est son délai ?
27. **Les exports (données, factures) sont-ils asynchrones, et comment la surface suit-elle une
    demande en cours ?**
28. **Le tchat a-t-il une limitation de débit exprimée dans le contrat**, avec un délai d'attente
    en paramètre ? Sans cela la surface ne peut qu'enchaîner les refus.

### Transverses

29. **La devise d'affichage choisie par le spectateur et la devise de facturation d'une date
    peuvent-elles différer ?** L'errata D4 note que le multi-devise est déclaré mais jamais
    exercé ; la préférence de compte existe pourtant dans l'interface.
30. **Quelle latence le catalogue de libellés servi dynamiquement garantit-il au rendu
    serveur ?** Le storefront web résout les codes i18n **au serveur** pour être indexable. Si
    le catalogue est un appel réseau sur le chemin de rendu, il devient une dépendance critique
    de chaque page publique. L'instantané embarqué au build est le repli obligatoire — mais alors
    une correction de coquille n'est visible sur le web qu'au prochain déploiement, et le besoin
    qui motivait le catalogue dynamique (mobile et TV) ne concerne pas cette surface.

---

## Incohérences relevées

Aucune n'a été appliquée. Les sept de la famille **D** de `corrections-handoff.md` ont été
rencontrées comme annoncé et sont traitées ci-dessus (vocabulaire `languageDependency`, deux
vocabulaires d'état de publication, fuseaux gelés, marché unique, formule de versement, deux
niveaux de sanction, décalages en minutes). Ce qui suit est **en plus**.

1. **Le panier du storefront web ne porte pas de places.** La mission décrit un panier portant
   « des places **et** de la marchandise, avec frais de port ». Dans la maquette, les lignes de
   panier ne sont créées que par la boutique d'un spectacle (`ticketing.cart.head` = « Panier
   merch », `ticketing.cart.emptyHint` = « Le merch s'ajoute depuis la boutique d'un live »), et
   l'achat d'une place est un parcours séparé, en modale, sans passage par le panier. Les frais
   de port sont bien là, sur la marchandise. **L'écart change la nature de la commande** : soit
   le contrat prévoit une commande mixte que la conception ne montre pas, soit il prévoit deux
   commandes distinctes. À trancher par le chef.

2. **Trois vocabulaires de formules, incompatibles.** `catalogue.json` déclare `free` (0),
   `pass` (12 €), `premium` (24 €). L'i18n déclare six valeurs : `free`, `pass`, `premium`,
   `monthly`, `season`, `none`. La page `plans` du web en affiche trois autres : `free`, `unit`
   (« place à l'unité, dès 7 € »), `sub` (« abonnement, 14 € / mois »). Et le compte de
   référence porte `plan: "season"`, qui n'existe dans aucune des listes de `plans`. Le contrat
   doit fixer un seul jeu, et distinguer ce qui est une **formule** de ce qui est un **mode
   d'achat** (la place à l'unité n'est pas un abonnement).

3. **Les droits de formule ne coïncident pas non plus.** `catalogue.json` utilise neuf valeurs
   d'`opens[]` (`browse`, `trailers`, `free-dates`, `replays`, `no-ads`, `one-live-month`,
   `all-lives`, `multi-screen`, `archive`), alors que `corrections-handoff.md` C7 n'en cite que
   six. Ce n'est pas un écart du dossier mais une imprécision de la note : les neuf sont bien
   dans la donnée.

4. **`chatMode` : `open` ou `free` ?** `catalogue.json` et l'i18n disent `open | emoji | off |
   read-only` ; la maquette web tient une table parallèle `free | emoji | off`. C'est
   exactement le défaut D2 (deux vocabulaires pour la même machine à états), sur un autre champ.
   Le vocabulaire de `catalogue.json` doit faire autorité.

5. **Le sous-genre : un ou plusieurs ?** `taxonomy.json` déclare le sous-genre « optionnel,
   **multiple**, vocabulaire fermé ». `catalogue.json` porte un champ `genre` **singulier**, et
   `helpers.js` le lit au singulier — mais le filtre de recherche du web est multi-sélection.
   Le contrat doit trancher la multiplicité réelle.

6. **Le champ `attributes` d'une date porte en fait des étiquettes.** Les valeurs observées sont
   `revival`, `new-creation`, `opening-night`, `open-air`, `archive` — c'est-à-dire des *tags*
   au sens de `tagPolicy` (« a tag sits on the date as readily as on the show »), et non des
   valeurs des sept groupes d'`attributes` de la taxonomie. Collision de nom entre deux notions
   distinctes, à corriger au portage.

7. **Six des sept groupes d'attributs sont déclarés et jamais portés.** `minimumAge`,
   `seatingMode`, `intermission`, `accessibility`, `venueType` ne sont posés par aucun
   spectacle, aucune date, aucune salle ; seul `audience` l'est, et par une règle grossière
   (cirque et comédie musicale → `family`, tout le reste → `all-audiences`). Même piège que D4 :
   une intention déclarée dans la donnée, jamais éprouvée par un écran. `accessibility` en
   particulier est une promesse d'accessibilité affichée nulle part.

8. **Les étiquettes ne sont portées par aucun spectacle de référence.** `shows[].tags` est vide
   partout dans `catalogue.json` ; seules les fixtures générées en posent. Les 205 étiquettes
   existent donc comme vocabulaire, sans aucun usage éprouvé — ce qui affaiblit la navigation
   latérale par pastilles que `tagPolicy` décrit.

9. **`i18n/index.json` déclare des effectifs de clés faux** : 243 annoncées pour
   `storefront.json` (671 réelles), 627 pour `taxonomy.json` (437 réelles). Sans conséquence
   pour l'outil de compilation, qui vérifie contre le plan de correspondance et non contre ces
   nombres — mais un fichier d'index qui ment sur son contenu se recopiera dans un contrat.

10. **Le libellé de marchandise n'existe qu'en français.** `merchPool` ne porte pas de
    `labelEn`, et la maquette utilise le même champ pour les deux langues. Sur un catalogue
    bilingue indexé dans les deux langues, c'est une lacune de donnée, pas de traduction.

11. **La capacité de salle sert de base au taux de remplissage, et la maquette la contredit.**
    Le taux est calculé à partir de `venue.capacity`, mais le libellé « places restantes » y
    applique une constante de 2000 places indépendante de la salle. Commodité de maquette, mais
    elle montre que le taux de remplissage et le nombre de places restantes sont aujourd'hui
    deux valeurs indépendantes : le contrat doit n'en servir qu'une source.
