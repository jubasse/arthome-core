# Besoins — storefront mobile (React Native)

> Surface : storefront mobile, React Native, portrait et paysage, cinq onglets bas.
> Auteur unique de ce fichier. Rédigé au temps 1. La section **Confrontation** prévue par D-007
> sera ajoutée ici au temps 3.
>
> Ce document exprime **ce que le contrat doit porter ou garantir**. Il ne décrit aucun écran :
> les maquettes sont la conception. Les identifiants sont en anglais, la rédaction en français.
>
> Sources lues : `shared/helpers.js` (en entier), `shared/catalogue.json`, `shared/fixtures.js`
> (sections dates, comptes, tchat, boutique), `shared/taxonomy.json`, `shared/i18n/`,
> `mockups/Storefront Mobile.dc.html` (lu par fragments, jamais en entier),
> `architecture/corrections-handoff.md`, `DECISIONS.md`.
>
> Skills chargées, conformément à D-001 (aucun orchestrateur React Native n'existe) :
> `react-core`, `react-native-best-practices`, `react-server-state`. Aucune ne contredit une
> décision du projet ; trois de leurs constats **contraignent le contrat** et sont repris aux
> sections « Hors ligne, arrière-plan et reprise » et « Contraintes propres à React Native ».

---

## Inventaire des écrans

### Correction à la liste du chef

La liste transmise comptait seize écrans. La lecture de la maquette en donne **douze**. Quatre
entrées n'étaient pas des écrans :

| Entrée de la liste | Ce que c'est réellement | Preuve |
|---|---|---|
| `tiles` | un **mode d'affichage**, `view: 'tiles' \| 'list'` | état initial `view: 'tiles', followView: 'tiles'` |
| `list` | l'autre valeur du même mode | `view === 'list'` |
| `chat` | un **onglet du panneau latéral** de `live` | `tab: 'chat' \| 'store'` |
| `store` | l'autre onglet du même panneau | `goStore: () => setState({ page: 'live', tab: 'store' })` |

La distinction n'est pas cosmétique pour le contrat : un mode d'affichage change la **densité**
d'une liste (donc la taille de page demandée, cf. « Pagination et volumes ») sans changer la forme
servie ; un onglet de panneau partage le **cycle de vie et le canal temps réel** de l'écran qui le
porte, et ne peut donc pas être servi par une lecture indépendante.

### Les douze routes

| Route | Introduit | Renvoi si rien de neuf |
|---|---|---|
| `home` | `DateSummary`, `ArtistSummary`, rails bornés, le point de reprise, la bannière invité | — |
| `browse` | recherche plein texte, facettes, tri, **défilement infini**, `SavedSearch` | — |
| `categories` | la taxonomie complète (21 disciplines en 2 univers, rang éditorial) | — |
| `category` | facettes restreintes à une discipline, sous-genres, quatre sections ancrées (`ov`/`live`/`up`/`rep`/`art`) | formes : `DateSummary`, `ArtistSummary` |
| `artists` | tri par nom ou par audience, filtre par discipline | forme : `ArtistSummary` |
| `artist` | `ArtistDetail`, la politique de rediffusion, la série de dates, la boutique, la feuille de billetterie | — |
| `live` | `PlaybackGrant`, `LiveSession`, `ChatMessage`, `MerchItem`, l'aperçu gratuit, l'incident en cours | — |
| `replay` | `ResumePoint`, chapitres, vitesse, qualité | reste : `live` |
| `plans` | `Plan` et ses ouvertures | — |
| `following` | rien de neuf : `ArtistSummary` scindé en « en direct » / « pas en direct » | formes de `home` |
| `account` | la coquille de onze sous-écrans (`accView: 'menu' \| 'section'`) | — |
| `help` | six sujets d'aide, purement éditoriaux ; aucune donnée métier | aucun besoin propre |

### La section Compte — onze sous-écrans

Confirmés dans `navDefs` : `upcoming` · `past` · `faves` · `alerts` · `orders` · `sub` ·
`profile` · `prefs` · `notifs` · `security` · `privacy`.

| Sous-écran | Introduit | Renvoi |
|---|---|---|
| `upcoming` | mes places à venir | `DateSummary` + `PlaybackGrant` |
| `past` | mes places passées, avec le reste de fenêtre de rediffusion | `DateSummary` |
| `faves` | artistes suivis + bascule d'alerte **par artiste** | `ArtistSummary` |
| `alerts` | `SavedSearch` : renommer, activer, supprimer, canaux | — |
| `orders` | `Order`, y compris la **commande passée chez un tiers** | — |
| `sub` | `Subscription` : échéance, moyen, ancienneté | `Plan` |
| `profile` | `Profile` : nom affiché, identifiant public, courriel vérifié, téléphone, ville | — |
| `prefs` | `Preferences` : langue, qualité, comportement à l'ouverture d'un live, tchat, sous-titres, animations, devise | — |
| `notifs` | `NotificationPrefs` : 5 déclencheurs × 3 canaux + heures calmes | — |
| `security` | mot de passe, 2FA, clé d'accès, moyens de paiement, **sessions actives** | `Device` |
| `privacy` | `Consent` (4 finalités) + cookies (2 catégories) + export et suppression | — |

### Les surfaces superposées — elles portent des commandes, pas des écrans

Feuilles et panneaux qui n'ont pas de route mais **écrivent** : billetterie (`ticketOpen`),
partage (`shareOpen`), authentification (`authOpen`, deux onglets), panier (`cartOpen`, trois
étapes `list` → `pay` → `done`), notifications (`notifsOpen`), filtres (`filtersOpen`), tri
(`sortOpen`), enregistrement d'une recherche (`saveOpen`, deux étapes), confirmation de
suppression (`deleteId`), menu (`menuOpen`), recherche (`searchOpen`), annonce Studio
(`studioOpen`, purement éditorial).

Plus une surface **transverse et persistante** : le **mini-lecteur** (`watching`, `watchKind`,
`pipClosed`). Il survit à la navigation entre routes. C'est la seule chose de cette surface qui
tienne un flux ouvert pendant que l'utilisateur navigue ailleurs — voir « Le temps réel » et
« Hors ligne, arrière-plan et reprise ».

---

## Les formes de données

Chaque forme apparaît une fois, avec ses écrans consommateurs et **ce que `shared/` n'en porte
pas**. Rappel de la règle du dossier : `shared/` fait autorité sur le vocabulaire et les règles,
jamais sur les formes.

### 1. `DateSummary` — la forme de travail de la surface

**Consommée par** : `home` (tous les rails), `browse`, `category`, `artist`, `following`,
`account/upcoming`, `account/past`, les suggestions de recherche, le mini-lecteur.

Elle porte l'identité de la date, son spectacle, son artiste, sa salle, ses places, son prix
d'appel, sa politique de rediffusion, son mode de tchat, son issue éventuelle, ses droits de
diffusion, son compteur de spectateurs, sa position dans une tournée ou une résidence.

**Ce que le contrat doit trancher, et que `shared/` ne tranche pas :**

- **L'état n'est pas un champ, c'est une dérivation temporelle.** `helpers.stateOf()` calcule
  `scheduled | live | replay | ended` à partir de `startsAt`, de la durée et de la fenêtre de
  rediffusion. La décision « aucune valeur calculée deux fois » interdit de le recalculer côté
  client — mais un état figé servi à 14 h 02 est **faux à 14 h 03**, et sur mobile l'application
  peut dormir huit heures avec cette réponse en cache. Ma demande : le contrat porte **les bornes**
  (`startsAt`, `runtimeMin`, `replay.expiresAt`, `roomOpensAt`) **et** l'état calculé au moment du
  service, accompagné de l'instant où cet état cesse d'être vrai. Le client n'invente rien : il
  sait seulement quand redemander.
- **Instants ISO en UTC, pas décalages.** D7 : `startOffsetMin`, `atMin`,
  `rescheduledToOffsetMin` sont des commodités de maquette. Sur le fil : `startsAt`, `endsAt`,
  `expiresAt`, `rescheduledTo`, en chaînes ISO UTC.
- **Fuseau IANA, pas décalage figé.** D3. Mais voir la contrainte Hermes plus bas : je demande
  **en plus** le décalage calculé par le serveur *pour cet instant-là*.
- **Le média est un identifiant, pas une URL.** `helpers.imageUrl(kind, key, width)` compose déjà
  l'URL depuis une recette. Le contrat doit porter l'identifiant et laisser le client demander la
  largeur qu'il affiche. Sur mobile c'est le premier poste de trafic d'une liste.
- **Absents de `shared/`, nécessaires au contrat** : version de l'enregistrement (pour une
  invalidation ciblée), instant de dernière modification, nullabilité explicite de chaque champ
  optionnel, et un **identifiant public stable** (slug) — voir `Deeplink` plus bas.

### 2. `DateDetail`

**Consommée par** : `artist` (feuille de billetterie), `live`, `replay`.

Ajoute au résumé : synopsis, distribution, équipe de régie, chapitres, ligne de langue, autres
dates de la même série, articles de boutique, trois paliers de prix
(`full` / `reduced` / `support`), frais, incident en cours, et le texte de l'incident.

- **La ligne de langue est une règle, pas un champ.** `languageLine()` compose « Joué en français ·
  Sous-titres FR, EN ». `isUnderstandable()` répond « ce spectacle est-il suivable avec les langues
  que je comprends ». Le contrat doit porter les **ingrédients** (`spokenLanguage[]`,
  `subtitles[]`, `surtitles[]`, `languageDependency`) et laisser `@arthome/core` composer.
  Vocabulaire réel de `languageDependency` : **`none | helpful | essential`** (D1) —
  `light` n'existe pas, `essential` est la valeur dont dépend la règle la plus visible.
- **Les prix sont des montants canoniques.** Trois paliers, chacun en centimes entiers + code
  devise. `fixtures.js` les porte en unités entières d'euros : c'est une commodité de maquette de
  plus, à ne pas transporter.

### 3. `ArtistSummary` / `ArtistDetail`

**Consommées par** : `artists`, `artist`, `following`, `account/faves`, `home`, `category`.

Résumé : identité, avatar, discipline, genre, audience, pays, « en direct en ce moment »,
prochaine date, dernier direct. Détail : biographie bilingue, dates à venir groupées, dates
passées, rediffusions, politique de rediffusion, boutique, autres artistes de la discipline.

- **« En direct en ce moment » est une dérivation temporelle** de la même famille que l'état d'une
  date : même traitement, mêmes bornes.
- **La politique de rediffusion est portée par la date, affichée sur l'artiste.** La maquette la
  lit sur l'artiste (`artist.replay`) ; `shared/` la porte sur la date (`date.replay.policy`). Si
  un artiste a deux dates de politiques différentes, la fiche artiste ment. Le contrat doit dire
  si une politique par défaut existe au niveau de l'artiste ou de la chaîne, ou si la fiche doit
  n'afficher qu'une agrégation honnête.

### 4. `Taxonomy` — l'artefact de référence

**Consommée par** : `categories`, `category`, les facettes de `browse`, l'étiquetage de toute
carte.

21 disciplines réparties en 2 univers, 176 genres, 205 étiquettes, avec un **rang éditorial**
(`rank`) qu'aucune surface n'a le droit de recalculer.

- **Besoin propre au mobile** : c'est la donnée la plus volumineuse et la plus stable de la
  surface — **59,5 Ko bruts, 8,4 Ko gzip** mesurés sur `taxonomy.json`. Elle doit être servie
  comme un **artefact versionné immuable**, adressé par version, avec un cache très long, et
  **embarquée au build** comme repli — exactement le régime déjà décidé pour l'i18n. Sans cela,
  un premier démarrage hors ligne ne peut afficher aucune étiquette.
- Elle doit pouvoir être servie **par tranche** : le mobile n'a besoin ni du vocabulaire studio ni
  des tables de touches TV.

### 5. `Money`

Centimes entiers + code devise ISO. Consommée partout où un prix s'affiche.

- Le contrat ne porte **jamais** un symbole ni une position de symbole : `helpers.price()` les
  dérive du code, et cette dérivation appartient à `@arthome/core`.

### 6. `Plan` et `Subscription`

**Consommées par** : `plans`, `account/sub`, et — indirectement — tout écran de lecture, puisque
la formule conditionne l'accès.

`catalogue.json` fait autorité : `free`, `pass`, `premium`, avec `priceMonth`, `opens[]` et
`seatDiscount`. Les neuf ouvertures : `browse`, `trailers`, `free-dates`, `replays`, `no-ads`,
`one-live-month`, `all-lives`, `multi-screen`, `archive`.

- **`multi-screen` est une contrainte d'exécution, pas une ligne de marketing.** « Deux écrans à la
  fois » impose un décompte serveur des lectures simultanées. Voir `LiveSession`.
- `Subscription` (échéance, moyen de paiement, ancienneté) **n'existe nulle part dans `shared/`** :
  la maquette l'affiche en littéral. Forme à créer.

### 7. `PlaybackGrant` — le droit de lire, forme manquante et décisive

**Consommée par** : `live`, `replay`, `account/upcoming`, `account/past`, toute carte qui propose
« Regarder ».

`helpers.isWatchable(account, date)` répond à la question en croisant quatre choses : la
possession d'une place (`account.ownedDates`), l'état de la date, la politique de rediffusion, et
la disponibilité territoriale (`availableIn`).

**C'est une commodité de maquette et elle ne survit pas au mobile.** Elle suppose que le client
détient la liste complète des places du compte. Je ne peux pas transporter ni garder à jour
`ownedDates` en entier : il grandit, il change quand l'application dort, et la décision
territoriale n'appartient pas au client.

**Ma demande** : un droit de lecture **par date**, servi par le backend, portant au minimum :
autorisé ou non ; la raison du refus quand il l'est (pas de place / hors territoire / hors fenêtre
de rediffusion / formule insuffisante / limite d'écrans atteinte) ; l'instant d'expiration du
droit ; et l'action de repli proposée (acheter une place, voir les autres dates, s'abonner).

Ce droit doit être **revérifié au démarrage de la lecture**, jamais hérité d'une lecture de
catalogue : le pays du spectateur peut changer entre les deux (déplacement, itinérance, réseau
d'entreprise), et sur mobile ce délai se compte en heures.

### 8. `LiveSession` — la session de lecture

**Consommée par** : `live`, `replay`, le mini-lecteur.

Absente de `shared/`. Nécessaire dès lors que `multi-screen` limite le nombre d'écrans simultanés.

**Ma demande, et c'est le besoin le plus propre à ma surface** : une session de lecture ouverte
explicitement, entretenue par un battement, et **expirée par le serveur au bout d'un délai**. La
raison est le cycle de vie : le système d'exploitation tue une application mobile sans préavis et
sans lui laisser le temps de fermer quoi que ce soit. Une session qui ne se ferme que sur un
événement du client laisse un écran fantôme, et l'utilisateur se voit refuser sa propre seconde
lecture. Le délai d'expiration doit être **court au regard de la limite**, et le contrat doit
permettre au client de **reprendre** une session qu'il a lui-même laissée derrière lui, identifiée
par l'appareil.

Elle porte aussi : les variantes de qualité disponibles et leur débit, la piste de sous-titres,
et l'instant serveur (voir « horloge » plus bas).

### 9. `ResumePoint`

**Consommée par** : `replay`, le rail « Reprendre » (`discovery.rail.resume` existe déjà dans le
vocabulaire partagé), `account/past`, le mini-lecteur.

`fixtures.js` la porte comme `{ dateId, positionSec }`. Le contrat doit y ajouter l'instant de la
dernière écriture et l'appareil d'origine — sans quoi deux appareils qui lisent la même
rediffusion se marchent dessus silencieusement.

### 10. `ChatMessage`

**Consommée par** : l'onglet tchat de `live`.

`fixtures.js` : identifiant, date, spectateur, auteur, rôle, position, état
(`ok | removed | muted | banned`), texte bilingue, langue de rédaction.

- **La position d'un message est une position dans le média, pas une heure d'envoi.** `atMin` est
  relatif au lever de rideau. C'est la bonne règle et elle doit être portée telle quelle, en
  secondes depuis le début, **en plus** de l'instant absolu — parce qu'une reprise de lecture en
  rediffusion doit pouvoir rejouer le tchat au bon endroit.
- Trois modes de tchat côté date (`open | read-only | emoji | off`) et un mode côté spectateur
  (préférence). Le contrat doit dire lequel l'emporte. La maquette laisse le spectateur choisir
  `free | emoji | off` par-dessus le mode de la date, ce qui n'a de sens que dans le sens
  restrictif.
- D6 reste ouvert : l'état du **message** et l'état de la **personne dans la chaîne** sont deux
  échelles non reliées. Ma surface n'affiche qu'une pastille : il ne peut y avoir qu'un
  propriétaire de la vérité.

### 11. `MerchItem`, `CartLine`, `Order`

**Consommées par** : l'onglet boutique de `live`, `artist`, le panier, `account/orders`.

`MerchItem` : identifiant, spectacle, chaîne, libellé, nature, prix, stock, état
(`on-sale | out-of-stock`).

`Order` porte une distinction que je n'ai vue nulle part ailleurs dans le dossier et qui est
structurante : **la commande peut ne pas être la nôtre**. Quatre plateformes tierces sont
nommées (`shopify`, `woocommerce`, `prestashop`, `drupal`) plus un mode `api`, avec une référence
marchande et un hôte externes, et un texte qui dit explicitement que « le suivi, l'échange et le
remboursement se font sur le site de l'artiste ».

**Ma demande** : le contrat doit distinguer une commande **exécutée par la plateforme** d'un
**reflet en lecture seule** d'une commande tenue ailleurs, et dire ce qu'il garantit du second —
fraîcheur, complétude, et ce qui se passe quand l'hôte externe ne répond pas. Le mobile est la
surface où ce reflet sera le plus souvent consulté hors ligne.

### 12. `SavedSearch` — la recherche enregistrée

**Consommée par** : `browse`, `category`, `account/alerts`, le panneau de notifications.

C'est la forme la plus exigeante de la surface, et elle n'existe pas dans `shared/`. Elle porte
un nom, une portée (`search` ou `category`), la discipline visée, la requête textuelle, **l'état
complet du filtre** (disciplines, sous-genres, tranches de prix, fenêtre de date, statut,
« bientôt complet », « a des dates », « expire bientôt », « en promotion »), le tri, deux canaux
d'alerte, un interrupteur d'activité et une date de création.

**Ce que le contrat doit garantir** : une représentation du filtre **stable et versionnée**. Une
recherche enregistrée survit à des mois et à des montées de version de l'application ; si la
grammaire du filtre change, une recherche enregistrée hier doit soit se rejouer à l'identique,
soit dire honnêtement qu'elle ne le peut plus. Une sérialisation opaque de l'état d'écran, comme
celle de la maquette, ne le permet pas.

**Conséquence propre au mobile** : l'alerte est le point d'entrée d'une notification poussée. Le
contrat doit donc relier la recherche enregistrée à la notification qu'elle déclenche, et la
notification doit porter de quoi ouvrir le bon écran **sans réseau au moment de l'ouverture**
(voir `Deeplink`).

### 13. `Notification` et `NotificationPrefs`

**Consommées par** : le panneau de notifications, `account/notifs`, `account/faves`.

Cinq déclencheurs, chacun avec une règle chiffrée déjà écrite dans la maquette : un artiste suivi
passe en direct (« dès l'ouverture du flux ») ; rappel avant un direct pour lequel j'ai une place
(« 30 minutes avant ») ; nouvelle date annoncée (« dès la mise en vente ») ; un événement
enregistré est bientôt complet (« à partir de 85 % des places vendues ») ; fin de disponibilité
d'une rediffusion (« 6 heures avant expiration »).

Trois canaux par déclencheur, plus des **heures calmes** globales. Plus une bascule d'alerte
**par artiste suivi**, indépendante.

**Ma demande** : ces cinq seuils sont des **règles de domaine**, pas des textes d'interface. Ils
doivent vivre dans `@arthome/core` et être servis, pas recopiés dans chaque surface — sinon le web
dira 30 minutes, la TV 15, et le mobile aura raison par hasard. Et le troisième canal n'est nommé
nulle part : voir « Incohérences relevées ».

### 14. `Preferences`, `Profile`, `Device`, `Consent`

- `Preferences` : langue d'interface, qualité par défaut, comportement à l'ouverture d'un direct
  (`peek | muted | off`), état du tchat, sous-titres, animations réduites, devise. Elles doivent
  **suivre le compte**, pas l'appareil — sauf la qualité, qui dépend du réseau de l'appareil.
  Le contrat doit trancher lesquelles sont par compte et lesquelles par appareil.
- `Profile` : nom affiché (visible dans le tchat), **identifiant public** (`arthome.live/@…`),
  courriel avec son état de vérification, téléphone, ville, ancienneté, numéro de membre.
- `Device` / `Session` : nature, libellé, ville, dernière activité, « cet appareil », et la
  commande de déconnexion à distance. `helpers.devicesOf()` existe et porte déjà la règle ;
  la maquette mobile ne l'emploie pas (voir « Incohérences »).
- `Consent` : quatre finalités (`audience`, `perso`, `partners`, `ads`) et deux catégories de
  traceurs (`stats`, `player`), dont une catégorie essentielle non désactivable. Plus l'export
  des données et la suppression du compte.

### 15. `Incident`

Quatre natures : `hold-screen`, `postponed`, `cancelled`, `interrupted`, chacune avec un message
rédigé bilingue dans `catalogue.json`. Trois issues de date : `cancelled`, `postponed`,
`interrupted`, avec leurs conséquences commerciales déjà écrites (annulée et remboursée ·
reportée, places valables · interrompue, avoirs émis).

Un incident doit arriver **en temps réel** sur un écran de lecture ouvert, et **au réveil** sur un
écran qui dormait. Voir la section suivante.

### 16. `Deeplink` — forme transverse, propre au mobile

La maquette expose deux identifiants publics : `arthome.live/vartan/nocturnes-ii` pour une date
partagée, `arthome.live/@marie.j` pour un profil.

**Ma demande** : un identifiant public stable, résoluble en un seul appel, **sans catalogue en
cache**. C'est la forme d'entrée de trois parcours que seul le mobile connaît : l'ouverture depuis
une notification poussée, l'ouverture depuis un lien partagé, et la reprise à froid après une mise
à mort par le système. Dans les trois cas l'application démarre sans rien, et le premier appel
doit rendre de quoi peindre l'écran cible en entier.

### 17. `Page<T>` — l'enveloppe de pagination

`{ items[], nextCursor, prevCursor, servedAt }`. Voir « Pagination et volumes ».

---

## Les commandes

Chaque commande qui écrit, avec son effet et ce que le contrat doit garantir. La colonne
**« file hors ligne »** est le besoin propre à ma surface : elle dit si la commande peut être mise
en attente sur l'appareil et rejouée au retour du réseau.

| Commande | Effet | File hors ligne | Garantie demandée |
|---|---|---|---|
| Acheter une place (palier choisi) | crée une possession, débite | **jamais** | idempotence stricte ; la clé est générée **avant** l'envoi et **persistée** ; le droit de lecture doit être immédiatement conséquent |
| Payer le panier | crée un `Order` | **jamais** | idem ; le panier doit être vidé par la réponse, pas par une temporisation locale |
| Ajouter / modifier / retirer une ligne de panier | modifie le panier | oui | le contrat doit dire **où vit le panier** : sur l'appareil ou sur le compte. S'il vit sur le compte, il faut une résolution de conflit entre deux appareils ; s'il vit sur l'appareil, il ne survit pas à une réinstallation et la maquette ment |
| Suivre / ne plus suivre un artiste | modifie `followedArtists` | oui | commutative, rejouable ; l'état final l'emporte, pas la succession |
| Basculer l'alerte d'un artiste | modifie une préférence par artiste | oui | idem |
| Créer une recherche enregistrée | crée une `SavedSearch` | oui | idempotence par clé, sinon un rejeu crée deux alertes identiques |
| Renommer / activer / supprimer une recherche | modifie une `SavedSearch` | oui | une suppression rejouée sur une entrée déjà supprimée doit réussir, pas échouer |
| Basculer un canal d'alerte | modifie une `SavedSearch` | oui | idem |
| Envoyer un message de tchat | publie un message modéré | **jamais** | un message rejoué dix minutes plus tard n'a plus de sens : il doit être **abandonné**, pas mis en file. Le contrat doit dire si le serveur horodate ou si le client fournit sa position |
| Marquer les notifications comme lues | modifie un état de lecture | oui | monotone : on ne dé-lit pas |
| Modifier le profil | écrit `Profile` | oui | concurrence à trancher : dernier écrivain, ou version optimiste ? |
| Modifier les préférences | écrit `Preferences` | oui | idem, champ par champ plutôt que document entier |
| Modifier les préférences de notification et les heures calmes | écrit `NotificationPrefs` | oui | idem |
| Modifier consentements et cookies | écrit `Consent` | **non** | un consentement a une valeur probatoire : il doit être horodaté par le serveur, avec la version du texte acceptée |
| Déconnecter un appareil / une session | révoque | **non** | c'est une commande de sécurité : elle doit échouer bruyamment plutôt que d'être rejouée à l'aveugle |
| S'inscrire / se connecter | crée une session | **non** | hors périmètre de ce fichier, traité par `adr-auth` |
| Changer de formule | modifie `Subscription` | **non** | engage de l'argent |
| Exporter mes données / supprimer mon compte | déclenche un traitement long | **non** | asynchrone : le contrat doit rendre un accusé et un moyen de suivre, pas une réponse immédiate |
| Poser une position de lecture | écrit un `ResumePoint` | oui | **la plus fréquente de toutes** : voir la cadence demandée plus bas |
| Ouvrir / entretenir / fermer une session de lecture | crée et maintient `LiveSession` | **non** | expiration serveur obligatoire, cf. `LiveSession` |
| Partager | ne modifie rien côté serveur | — | mais doit produire un lien résoluble, cf. `Deeplink` |

### Deux besoins transverses sur les commandes

**L'idempotence compte doublement ici.** Un réseau mobile ne tombe pas franchement : il bascule du
Wi-Fi au cellulaire au milieu d'une requête, et le client ne sait pas si l'écriture a abouti. La
clé `Idempotency-Key` doit donc être **générée avant l'envoi et écrite sur le disque avant**, pas
en mémoire : une mise à mort par le système entre l'envoi et la réponse ne doit pas produire un
second achat au redémarrage. Le contrat doit aussi dire **combien de temps** une clé reste valide
côté serveur — une file hors ligne peut rejouer une écriture plusieurs heures plus tard.

**L'horloge du client ne peut pas arbitrer.** Toute stratégie de résolution de conflit fondée sur
un horodatage fourni par le téléphone est fausse : l'horloge d'un mobile dérive, saute au
changement de fuseau, et l'utilisateur peut la régler. Si le contrat veut un « dernier écrivain
gagne », le rang doit venir du serveur — un numéro de version, pas une date du client.

---

## Le temps réel

Ce qui change pendant qu'un écran est ouvert, et la fraîcheur que le contrat doit garantir. La
valeur de N n'est pas de mon ressort ; ce qui l'est, c'est de dire quelles classes existent et
qu'elles n'ont pas la même exigence.

| Ce qui change | Où | Exigence |
|---|---|---|
| Compteur de spectateurs | une de `home`, cartes de rails, `live`, mini-lecteur | la moins exigeante : une valeur vieille de quelques dizaines de secondes ne trompe personne. **Mais elle est affichée sur des dizaines de cartes à la fois** — voir la contrainte de lot plus bas |
| Bascule d'état d'une date (`scheduled` → `live` → `replay` → `ended`) | partout | la plus exigeante : elle change le bouton d'action. Un spectateur qui appuie sur « Regarder » trois secondes après la fin doit recevoir une erreur honnête, pas un lecteur vide |
| Ouverture de salle (30 minutes avant) | `artist`, `account/upcoming`, notification | dérivable des bornes si `roomOpensAt` est servi |
| Places restantes, complet, liste d'attente | `artist`, feuille de billetterie, `browse` | exigeante au moment de l'achat, tolérante ailleurs. Le contrat doit garantir que **la vérité est au moment de la commande**, pas à l'affichage |
| Messages de tchat | onglet tchat de `live` | flux continu tant que l'écran est au premier plan |
| Incident (attente, interruption, report, annulation) | `live`, `replay`, `account/upcoming` | **doit interrompre**, y compris un écran de lecture en cours et un écran qui dormait |
| Expiration d'une rediffusion | `replay`, `account/past`, notification | dérivable de `expiresAt` |
| Stock d'un article de boutique | onglet boutique de `live`, `artist` | tolérante ; la vérité est au paiement |

### Les trois besoins que cela pose au contrat

**Un seul canal par écran, jamais un par élément.** Une liste virtualisée affiche une vingtaine de
cartes et en garde autant en mémoire tampon ; chacune porte un compteur de spectateurs. Vingt
abonnements, c'est vingt réveils du processeur et une batterie vidée. Le contrat doit permettre de
s'abonner à **un lot d'identifiants** sur un canal unique, et de modifier ce lot quand la fenêtre
de défilement bouge — sans rouvrir le canal.

**Le canal doit pouvoir être suspendu et repris, pas seulement ouvert et fermé.** Quand
l'application passe en arrière-plan, le bon comportement n'est pas de fermer (on perdrait la
reprise) ni de laisser ouvert (le système le coupera de toute façon). Le contrat doit offrir une
**reprise depuis un point** : « voici où j'en étais, dis-moi ce qui a changé depuis ». Sans cela,
la reprise est un rechargement complet.

**Le temps réel et la lecture ne sont pas le même canal.** Le mini-lecteur survit à la navigation :
il faut un flux de lecture qui continue pendant que l'écran affiche autre chose, et un canal
d'écran qui suit la navigation. Les deux ne peuvent pas partager un cycle de vie.

---

## Hors ligne, arrière-plan et reprise

**C'est la section où ma surface apporte ce qu'aucune autre n'apportera.** Le web a un onglet qui
reste chargé ; la TV a une alimentation secteur et un réseau stable. Le mobile a un processus que
le système tue, un réseau qui tombe pour de vrai, et une application qu'on rouvre huit heures plus
tard sur le même écran.

### Les six transitions que le contrat doit survivre

1. **Premier plan → arrière-plan.** L'utilisateur reçoit un appel, change d'application. Les
   canaux temps réel vont être coupés par le système, les requêtes en vol vont être annulées.
2. **Arrière-plan → premier plan, quelques secondes plus tard.** Presque rien n'a changé. Tout
   recharger est un gâchis pur.
3. **Arrière-plan → premier plan, huit heures plus tard.** Tout ce qui portait un état temporel
   est faux. Le catalogue affiché est périmé, les places « à venir » sont passées, les
   rediffusions ont expiré.
4. **Mise à mort par le système, puis relance à froid.** Toute mémoire vive est perdue. Ce qui
   n'a pas été écrit sur le disque n'existe plus.
5. **Relance à froid depuis une notification ou un lien partagé.** L'application démarre
   directement sur un écran profond, sans catalogue, sans taxonomie en mémoire, parfois sans
   réseau.
6. **Bascule Wi-Fi ↔ cellulaire.** Elle se produit au milieu d'une requête, sans transition
   propre. Toute écriture en vol est dans un état indéterminé.

### Besoin n° 1 — chaque réponse doit dire quand elle a été produite et jusqu'à quand elle vaut

C'est la demande la plus structurante de ce document.

Au retour d'arrière-plan, le client doit décider **seul** quoi rafraîchir. Il ne peut le faire que
si chaque réponse porte deux choses : l'**instant serveur** auquel elle a été produite, et la
**durée au-delà de laquelle elle ne doit plus être affichée sans avertissement**.

L'instant serveur résout en outre le problème de l'horloge : tout compte à rebours affiché
(« il reste 42 min », « l'aperçu se termine dans 4 min 12 », « la rediffusion expire dans 6 h »)
doit être calculé contre l'horloge du serveur, pas contre celle du téléphone. Sans instant
serveur, une horloge décalée de vingt minutes fait mentir tous les écrans de la surface — et
l'utilisateur qui vient de changer de fuseau est exactement celui qui ouvre l'application dans un
train.

### Besoin n° 2 — le curseur doit survivre à une nuit, ou le contrat doit offrir un delta

Constat technique vérifié, et c'est le plus coûteux du lot. La bibliothèque de cache serveur
retenue pour cette famille de clients rafraîchit une liste à défilement infini **page par page,
depuis la première, en séquence**. Une liste de quarante pages parcourue la veille produit donc,
au retour au premier plan, **quarante allers-retours enchaînés** avant que le premier pixel ne
soit à jour. Sur un réseau cellulaire, c'est inacceptable ; en itinérance, c'est facturé.

Deux issues, dont le contrat doit en choisir au moins une :

- **un curseur qui reste valide longtemps** — plusieurs heures au minimum — de sorte que le client
  puisse borner le nombre de pages gardées et recharger seulement celles qu'il affiche ;
- **une lecture de delta** : « voici mon curseur et l'instant de ma dernière lecture, dis-moi ce
  qui a changé ».

La seconde est de loin préférable pour ma surface, et elle sert aussi le besoin n° 1 : une
application réveillée demande ce qui a changé, pas tout.

Corollaire : le client doit pouvoir **revenir en arrière** dans une liste dont il a jeté les
premières pages. Le curseur doit donc être **bidirectionnel**.

### Besoin n° 3 — la revalidation au retour au premier plan est une rafale, pas une requête

Les mécanismes automatiques de revalidation de cette famille de bibliothèques écoutent des
événements de navigateur qui **n'existent pas** en React Native : la reprise de focus et la
détection de connexion doivent être rebranchées à la main sur le cycle de vie de l'application et
sur l'état du réseau. La conséquence pour le contrat n'est pas un détail d'implémentation : au
moment précis où l'application revient au premier plan, **toutes les lectures observées se
revalident en même temps**. Un écran de compte en affiche facilement une demi-douzaine ; une page
de catégorie autant.

Le contrat doit donc offrir, au choix : une **lecture groupée** (plusieurs ressources en un
appel), ou un point d'entrée « **qu'est-ce qui a changé depuis T ?** » qui rende une liste
d'invalidations plutôt que les données. Sans l'un des deux, chaque retour au premier plan est une
rafale que la limitation de débit finira par refuser — et refuser une rafale au retour au premier
plan, c'est refuser l'ouverture de l'application.

### Besoin n° 4 — la reprise de lecture, trois cas distincts

**Direct.** On ne reprend pas un direct, on le rejoint là où il en est. La position se calcule
depuis l'instant de début et l'horloge serveur. Le contrat doit dire si un direct rejoint en cours
est servi depuis le début (ce que la maquette suggère : « le spectacle a commencé il y a 18
minutes, rejoignez-le où il en est ») ou depuis le bord du direct, et si la fenêtre de rattrapage
existe avant la fin.

**Rediffusion.** La position est un `ResumePoint`. Deux questions pour le contrat : **à quelle
cadence** le client l'écrit — c'est la commande la plus fréquente de la surface, et l'écrire à
chaque seconde sur un réseau cellulaire est déraisonnable — et **ce qui se passe** quand
l'application est tuée entre deux écritures. Ma demande : une écriture à intervalle raisonnable,
**plus une écriture forcée au passage en arrière-plan**, et un contrat qui accepte une position
légèrement antérieure plutôt que de perdre la reprise.

**Aperçu gratuit.** La maquette accorde un budget d'aperçu (4 min 12 dans le texte, 252 secondes
dans l'état). Ce budget **ne peut pas être compté par le client** : une application réinstallée,
ou simplement tuée, remettrait le compteur à zéro. Il doit être décompté par le serveur, par
compte ou par appareil selon ce que le contrat décide, et le droit de lecture doit porter ce qu'il
en reste. C'est la seule façon de rendre l'aperçu honnête sur mobile.

### Besoin n° 5 — ce qui doit survivre à une mise à mort, et ce qui ne doit pas

**Doit survivre, donc doit être écrit sur le disque** : le panier (ou l'identifiant du panier
serveur) ; la clé d'idempotence d'une écriture en vol ; la file des commandes hors ligne ; la
position de lecture ; le brouillon de message de tchat ; le filtre et le tri en cours ; la
recherche enregistrée en train d'être nommée ; le curseur de la liste consultée ; le dernier écran
et son argument.

**Ne doit pas survivre, ou doit survivre chiffré** : le jeton de session — et le contrat doit dire
sa durée de vie et le mécanisme de renouvellement, parce qu'une application rouverte après une
semaine trouvera un jeton mort et ne doit pas pour autant renvoyer l'utilisateur à un écran de
connexion s'il existe un moyen de le renouveler silencieusement.

**Ne doit jamais survivre** : le droit de lecture. Il expire, il dépend du territoire, il dépend de
la limite d'écrans. Un droit relu depuis le disque est un droit faux.

### Besoin n° 6 — ce que l'application montre vraiment sans réseau

**Aucun téléchargement de spectacle n'apparaît dans la maquette mobile.** Le seul mot
« télécharger » qui s'y trouve concerne une facture de commande. Je le signale parce que c'est
contre-intuitif pour une application mobile de spectacle, et que le chef voudra peut-être
trancher : s'il n'y a pas de lecture hors ligne, alors hors ligne signifie **catalogue en cache,
en lecture seule**, et rien d'autre.

Dans ce cas, le contrat doit permettre à l'application d'afficher, sans réseau : le dernier
catalogue vu, mes places, mes commandes, mes artistes suivis, mes recherches enregistrées — chacun
**avec sa date de fraîcheur visible**. Et l'enveloppe d'erreur doit permettre de dire « c'est
vieux » sans dire « c'est cassé ».

Ce qui n'est **pas** consultable hors ligne doit être annoncé comme tel plutôt que d'échouer : un
droit de lecture, un stock, des places restantes, un compteur de spectateurs.

### Besoin n° 7 — le premier démarrage hors ligne doit rendre quelque chose

La maquette pose un écran de démarrage bloquant qui n'affiche qu'un message d'erreur brut si le
chargement échoue. Sur mobile, ce cas est courant : première ouverture dans le métro, après une
mise à jour depuis le magasin.

La décision d'un **instantané i18n embarqué au build** couvre déjà la copie. Je demande le même
régime pour **la taxonomie**, et pour la même raison : sans elle, aucune étiquette de discipline
ne peut s'afficher, et l'écran d'accueil est illisible même si le catalogue est en cache.

Mesures : le sous-ensemble i18n utile au mobile (storefront + taxonomie + système, deux langues,
1 126 clés) pèse **117 Ko bruts / 25 Ko gzip** ; une seule langue en pèse environ 54 Ko bruts.
`taxonomy.json` pèse **59,5 Ko bruts / 8,4 Ko gzip**. L'instantané embarqué complet et bilingue
approche donc 177 Ko bruts — assez pour peser sur le temps de démarrage s'il est chargé d'un bloc.
**Ma demande** : le contrat doit servir ces artefacts **par langue et par surface**, pas en un
dictionnaire unique, pour que l'instantané embarqué puisse n'emporter que ce qui sert.

---

## Pagination et volumes

La décision est posée : **curseur** pour le storefront, tri déterministe, départage par
identifiant. Ce que ma surface y ajoute :

**La taille de page est décidée par le client, et elle change en cours de route.** En paysage la
coquille double de largeur et la grille passe de une à plusieurs colonnes : la même liste affiche
deux à quatre fois plus d'éléments par écran. Le contrat doit donc accepter une **taille de page
variable et bornée**, fournie par le client à chaque page.

**La taille de page ne peut pas faire partie de l'identité du curseur.** Sinon, une rotation en
cours de liste invalide le curseur et réémet des éléments déjà servis, ou en saute. Le curseur doit
désigner une **position dans l'ordre**, pas un rang multiplié par une taille de page.

**Le curseur doit être bidirectionnel.** Une liste virtualisée borne ce qu'elle garde en mémoire,
et le rafraîchissement d'une liste infinie repart de la première page : sans possibilité de
remonter, une liste longue est soit gardée en entier — au prix de la mémoire — soit irrécupérable
au retour en arrière.

**Une carte doit être rendable sans seconde requête.** La virtualisation monte et démonte des
éléments en continu pendant le défilement ; si une carte déclenche un appel pour compléter ce qui
lui manque, un défilement rapide produit une tempête de requêtes et un défilement lent produit des
cartes vides. Tout ce qu'affiche une carte doit être dans la page qui l'a servie.

**Les listes de cette surface ne sont pas toutes infinies.** Les rails de l'accueil, les sections
d'une discipline, les dates d'un artiste sont des listes **bornées** que la maquette pagine par
pas avec un bouton « Voir plus · N restants » — elle connaît donc le **reste**. Le contrat doit
dire s'il rend un total, un « il y en a d'autres », ou rien : les trois donnent trois interfaces
différentes, et seul le premier permet d'annoncer le reste. Seul `browse` est à défilement infini.

**Volumes de référence constatés** : 21 disciplines, 176 genres, 205 étiquettes ; une trentaine de
salles ; un catalogue de dates généré dont la taille n'est pas bornée par les fixtures. Les
facettes de `browse` se combinent librement (disciplines × sous-genres × cinq tranches de prix ×
cinq fenêtres de date × trois statuts × quatre drapeaux) : le contrat doit dire si une combinaison
qui ne rend rien est une réponse vide normale ou une erreur, et si le nombre de résultats est
connu avant la première page.

**Le poids d'une page compte plus ici qu'ailleurs.** Sur un réseau cellulaire, une page de
catalogue est facturée. Deux demandes : que l'image soit un identifiant dimensionnable plutôt
qu'une URL figée, et que le contrat permette de demander une **forme réduite** d'une carte — la
grille en paysage affiche plus de cartes mais pas plus d'informations par carte.

---

## États d'erreur et de chargement

Le vocabulaire est **déjà écrit dans `shared/i18n/system.json`**, et il tranche une distinction que
l'enveloppe d'erreur doit rendre possible :

- « Votre appareil n'atteint plus le réseau. **Les serveurs Arthome répondent normalement.** »
- « Le problème vient de chez nous, **pas de votre connexion.** Nous y travaillons. »

**Ce que cela exige du contrat.** Un code applicatif ne suffit pas : le premier cas est celui où
**aucune réponse n'est jamais arrivée**, et seul le client peut le constater. Le second est une
réponse serveur en bonne et due forme. L'enveloppe doit donc distinguer, de façon exploitable sans
lire un texte :

- une panne du serveur, annoncée par le serveur lui-même ;
- un refus métier (pas de place, hors territoire, fenêtre fermée, formule insuffisante, limite
  d'écrans atteinte) — chacun avec ses **paramètres** et son **action de repli** ;
- une limitation de débit, avec le délai avant nouvelle tentative — sans quoi une rafale de
  revalidation au retour au premier plan se transforme en boucle ;
- une expiration de session, qui doit être distinguable d'un refus de droit : la première se
  renouvelle silencieusement, la seconde s'affiche.

Et le client ajoute, seul, un cinquième état : **pas de réseau**. Il ne doit jamais être présenté
comme une panne de la plateforme.

**Le blackout territorial a sa propre forme.** `common.error.blackoutBody` est paramétré par la
raison (`{reason}`), et le texte promet que « les autres dates de ce spectacle restent
accessibles ». L'erreur doit donc porter la raison **et** de quoi tenir cette promesse : les autres
dates. Une erreur qui promet une issue sans la porter oblige le client à une seconde requête
au pire moment.

**Les états vides ne sont pas des erreurs.** `common.empty.list`, `.live`, `.search`, `.tickets`
existent déjà. Une liste vide est une réponse réussie.

**Un état supplémentaire, propre au mobile, que les autres surfaces n'auront pas.** Une lecture
peut être **en attente de réseau** : ni en cours, ni en erreur, ni servie. L'utilisateur doit voir
la différence entre « on charge » et « on attend que tu retrouves du réseau ». Rien à demander au
backend pour cela — sauf de ne pas obliger le client à inventer une erreur pour l'exprimer.

**La trace doit revenir au client.** La décision porte déjà un identifiant de trace dans
l'enveloppe. Sur mobile c'est le seul lien exploitable entre « mon application a planté » et un
journal serveur : l'utilisateur ne peut pas ouvrir une console. Il doit pouvoir lire ou copier cet
identifiant depuis l'écran d'erreur.

---

## Contraintes propres à React Native

Seulement celles qui contraignent le contrat.

### 1. zod — mesure, comme demandé

Mesuré sur **zod 4.6.5**, empaqueté avec esbuild en mode production, sur un schéma réaliste
(une page de catalogue : date, spectacle, salle, places, trois paliers de prix, politique de
rediffusion, droits, curseur).

| Entrée | Élagage actif | Minifié | Gzip |
|---|---|---|---|
| `import { z } from "zod"` (classique) | oui | **446 Ko** | **93 Ko** |
| `import { z } from "zod"` (classique) | non | 446 Ko | 93 Ko |
| `import * as z from "zod/mini"` | oui | **22 Ko** | **7,5 Ko** |
| `import * as z from "zod/mini"` | non | 421 Ko | 85 Ko |
| plancher : `z.string()` seul, entrée classique | oui | 446 Ko | 93 Ko |
| plancher : `z.string()` seul, `zod/mini` | oui | 9,6 Ko | 3,6 Ko |

**Trois constats, dont deux sont des demandes.**

- **L'entrée classique ne s'élague pas.** Un seul `z.string()` coûte le paquet entier. La raison est
  identifiée : l'entrée classique rend joignables **64 fichiers de traduction** des messages
  d'erreur, soit 341 Ko de source sur environ 850 Ko au total. Pour un projet dont la décision est
  **i18n par codes avec instantané embarqué**, ces 64 tables sont du poids mort intégral : nous
  n'afficherons jamais un message d'erreur rédigé par zod.
- **L'économie de `zod/mini` dépend entièrement de l'élagage du paquet.** Sans élagage — et
  l'empaqueteur de React Native ne l'active pas par défaut — `zod/mini` retombe à 85 Ko gzip, c'est-à-dire
  au niveau de l'entrée classique. Le gain de 93 Ko à 7,5 Ko n'est pas acquis : il est
  **conditionnel**.
- **Demande au paquet de contrats.** `@arthome/contracts` doit exposer une **entrée `mini`** et
  n'importer zod que par des chemins profonds, jamais par un fichier baril qui réexporte tout.
  Sans cela, le choix de l'entrée est confisqué au client mobile, et la décision « zod valide tout »
  coûte 93 Ko gzip de bundle à la surface la plus contrainte du projet. Je ne conteste pas la
  décision : je demande qu'elle soit livrée sous une forme que le mobile puisse payer.

### 2. Formatage côté client — la dépendance `Intl` n'est pas acquise

La décision est : montants en unité canonique, formatage côté client. Bonne nouvelle vérifiée :
`helpers.js` formate **sans `Intl`** — `price`, `number`, `compact`, `clock`, `dayLabel`,
`longDate`, `duration`, `timecode` sont tous écrits à la main, avec les noms de jours et de mois en
dur dans les deux langues. Le portage vers `@arthome/core` peut donc rester sans `Intl`, ce qui est
exactement ce qu'il faut : le moteur JavaScript de React Native n'offre pas partout une
implémentation `Intl` complète, et le polyfill coûte plusieurs centaines de kilo-octets.

**Ce que cela contraint dans le contrat** : le code devise ISO doit voyager, jamais un symbole ni
une position de symbole ; et le contrat ne doit **jamais** supposer que le client sait formater une
devise qu'il ne connaît pas. Si un jour un marché non prévu apparaît, c'est `@arthome/core` qui
doit être mis à jour, pas le contrat qui doit se mettre à envoyer des chaînes déjà formatées.

### 3. Fuseaux horaires — IANA, plus le décalage calculé

D3 impose un identifiant IANA et un instant UTC, et la règle d'affichage est bonne : heure du
spectateur d'abord, heure de salle ensuite quand elle diffère.

**La contrainte** : la base de fuseaux complète n'est pas garantie côté client React Native, et
l'embarquer coûte cher en bundle. **Ma demande** : le contrat porte l'identifiant IANA *et* le
décalage en minutes **calculé par le serveur pour l'instant de cette date-là**. Ce n'est pas un
retour au décalage figé de D3 : c'est une valeur **servie**, recalculée à chaque service, jamais
stockée. Cela respecte « aucune valeur calculée deux fois » — le calcul a lieu une fois, côté
serveur — et cela évite d'embarquer une base de fuseaux dans cinq applications.

### 4. Listes virtualisées — deux conséquences déjà dites, une troisième

Rappel : une carte doit être complète dans sa page, et un compteur temps réel ne peut pas être une
requête par carte. Troisième conséquence : **le nombre d'éléments gardés en mémoire est borné**,
donc le contrat ne peut pas supposer que le client détient tout ce qu'il a déjà lu. Toute
opération qui suppose « le client a déjà la liste » — par exemple un calcul de droit à partir des
places possédées — est fausse sur cette surface.

### 5. Le coût d'un réveil

Chaque canal ouvert, chaque sondage, chaque notification silencieuse réveille le processeur. Trois
demandes déjà formulées plus haut, rassemblées ici parce qu'elles sont toutes de nature mobile :
abonnement **par lot d'identifiants** sur un canal unique ; **reprise depuis un point** plutôt que
rechargement ; **lecture groupée ou delta** au retour au premier plan.

### 6. Mise à mort par le système — la clé d'idempotence avant l'envoi

Déjà dit dans « Les commandes », répété ici parce que c'est la contrainte la plus spécifiquement
mobile du document : la clé doit être écrite sur le disque **avant** que la requête parte. C'est le
seul moyen qu'un achat interrompu par une mise à mort ne devienne pas deux achats au redémarrage.
Le contrat doit en conséquence garantir une **fenêtre de validité de la clé** assez longue pour
couvrir une relance — et dire ce qu'il rend quand la clé est rejouée : la réponse d'origine, pas un
conflit.

### 7. Volume de données consommé — une préférence l'annonce déjà

La maquette annonce « la 4K consomme environ 12 Go par heure » et laisse choisir une qualité par
défaut. Le contrat de lecture doit donc porter les **variantes disponibles et leur débit**, pour
deux raisons : que le client puisse honorer la préférence, et qu'il puisse avertir avant de lancer
une lecture coûteuse sur un réseau cellulaire. Une lecture qui négocie sa qualité toute seule ne
permet ni l'un ni l'autre.

### 8. Deux listes de dimensions différentes pour la même donnée

Le passage en paysage élargit la coquille et multiplie les colonnes. Cela n'a aucune conséquence
de mise en page pour le contrat — mais deux conséquences déjà énoncées : **taille de page
variable** et **curseur indépendant de la taille de page**. Je les rappelle ici parce qu'elles sont
la seule raison pour laquelle l'orientation figure dans ce document.

---

## Incohérences relevées

Écarts rencontrés **en plus** des vingt-sept déjà consignés dans `corrections-handoff.md`. Je ne
les applique pas. Sept des onze sont la même faute — une table littérale parallèle à `shared/` —
c'est-à-dire exactement ce que D2 décrit pour les états de publication, et ce que le principe
n° 1 du dossier interdit.

1. **Les formules sont une table parallèle.** La maquette mobile affiche trois formules nommées
   `free` / `unit` / `sub`, à « Gratuit » / « dès 7 € » / « 14 € par mois ». `catalogue.json`
   déclare `free` / `pass` / `premium` à 0 / 12 / 24 par mois, avec `opens[]` et `seatDiscount`.
   La maquette n'appelle **jamais** `A.plans()` : vérifié, zéro occurrence. Le contrat doit suivre
   `catalogue.json`.

2. **Le vocabulaire des formules déborde la donnée.** `i18n/storefront.json` porte six valeurs
   `enums.plan.*` — `free`, `pass`, `premium`, `monthly`, `season`, `none` — alors que
   `catalogue.json.plans` n'en déclare que trois. `monthly`, `season` et `none` ne sont référencés
   par aucune donnée. Soit le vocabulaire anticipe des formules non écrites, soit il est mort ;
   le contrat doit trancher avant de figer l'énumération.

3. **La politique de rediffusion est une troisième table parallèle.** La maquette emploie `sub` et
   `off` là où l'énumération partagée dit `subscription` et `none`. Elle ajoute même une cinquième
   valeur de pilotage, `artiste`, qui signifie « prends celle de l'artiste » et n'appartient pas au
   vocabulaire.

4. **La fenêtre de rediffusion est dite trois fois, différemment.** `fixtures.js` en génère cinq
   valeurs (24, 41, 48, 72 et 96 heures) ; le texte de la maquette affirme « 72 h » en dur dans la
   description de la politique incluse ; la règle de notification annonce « 6 heures avant
   expiration ». La durée doit venir de `replay.windowHours`, jamais d'une chaîne de copie — or
   c'est bien la **copie** qui porte ici la valeur, ce qui la rend intraduisible et infalsifiable.

5. **Les devises ne s'accordent pas.** La préférence de devise offre `eur` / `usd` / `chf` ;
   `catalogue.json.billingMarkets` déclare `eur` / `chf` / `cad`. `usd` n'existe nulle part
   ailleurs ; `cad` manque à l'écran. À rapprocher de D4 : un seul marché est réellement exercé
   par le générateur, donc aucune de ces listes n'a jamais été éprouvée.

6. **Deux remises, sur deux assiettes différentes, et aucune ne correspond.** L'écran d'abonnement
   promet « 15 % sur la boutique des artistes ». `catalogue.json` porte `seatDiscount` — une remise
   sur les **places** — à 0,1 pour `pass` et 0,2 pour `premium`. Ni le taux ni l'assiette ne
   coïncident.

7. **Le tchat mobile n'est pas branché sur `shared/`.** La maquette tient huit messages littéraux
   dans son état et en ajoute au hasard toutes les 4,2 secondes ; elle n'appelle jamais
   `A.chatOf(date)` — vérifié, zéro occurrence. Conséquence pour le contrat : les quatre états de
   message (`ok`, `removed`, `muted`, `banned`) **n'ont jamais été éprouvés sur cette surface**. La
   modération vue du spectateur mobile reste à concevoir, pas à observer.

8. **Le troisième canal de notification n'est nommé nulle part.** La grille de préférences offre
   trois canaux par déclencheur mais aucun en-tête ne les nomme. Les deux seuls noms de canal du
   dossier sont `PUSH` et `E-MAIL`, dans les recherches enregistrées. Le profil suggère le
   troisième sans le dire : le champ téléphone porte la mention « pour les SMS de rappel ». À
   trancher, parce qu'un canal SMS a un coût et une réglementation propres.

9. **L'abonnement du compte est entièrement littéral.** Échéance de renouvellement, moyen de
   paiement et ancienneté sont écrits en dur ; aucun des trois n'existe dans `fixtures.accounts`,
   qui ne porte que `memberSinceOffsetMin` et `plan`. La forme `Subscription` est à créer de
   toutes pièces.

10. **Deux notions d'aperçu sous des noms voisins.** `catalogue.json.time.previewIdleSec` vaut 4 et
    n'est employé nulle part dans la maquette mobile ; le budget d'aperçu réellement affiché vaut
    252 secondes et n'a aucune source partagée — il est écrit à la fois dans l'état et dans le
    texte français de la copie. Deux valeurs sans propriétaire.

11. **Appareils et sessions sont traités comme deux choses.** L'écran de sécurité affiche trois
    sessions littérales, alors que `fixtures.accounts[].devices` existe et que `helpers.devicesOf()`
    les rend déjà avec leur nature, leur libellé bilingue, leur ville et leur dernière activité.
    Le contrat doit dire si un appareil et une session sont la même chose — la réponse détermine
    ce que fait le bouton « Déconnecter ».

**Remarque générale, qui vaut avertissement pour le temps 3.** J'ai vérifié l'emploi de seize
fonctions de `shared/helpers.js` dans la maquette mobile : **quatorze ne sont jamais appelées** —
`isWatchable`, `availableIn`, `rightsNote`, `languageLine`, `hasLanguageBarrier`, `seatsLabel`,
`progressOf`, `viewersOf`, `messageState`, `devicesOf`, `alertsOf`, `resumeOf`, `plans`, et `chatOf`
(point 7 ci-dessus). Les deux seules réellement employées sont `isRoomOpen` et `replayHoursLeft`.
La surface
mobile exerce donc beaucoup moins de règles partagées que le storefront web ne le fera. Cela
signifie que, pour cette surface, les droits territoriaux, la barrière de langue, les places
restantes, la reprise de lecture, les appareils et les abonnements **n'ont pas été éprouvés à
l'écran** : le contrat les concernant doit être conçu, pas observé. Je le signale parce que c'est
exactement le genre de silence qu'on prend pour un accord.

---

## Ce que je ne peux pas obtenir seul — questions au backend

Onze questions, par ordre d'impact sur ma surface. Les quatre premières bloquent la conception du
client ; les autres la contraignent.

1. **L'état d'une date est-il servi, dérivé, ou les deux ?** Je demande les deux : les bornes
   (`startsAt`, `runtimeMin`, `roomOpensAt`, `replay.expiresAt`) **et** l'état au moment du service
   accompagné de l'instant où il cesse d'être vrai. Si le contrat ne sert que l'état, une
   application réveillée après une nuit affiche des états faux et ne sait pas qu'ils le sont. S'il
   ne sert que les bornes, le client recalcule et viole « aucune valeur calculée deux fois ».

2. **Chaque réponse portera-t-elle un instant serveur et une durée de validité ?** Sans instant
   serveur, tout compte à rebours de ma surface est à la merci d'une horloge de téléphone qui
   dérive ou saute. Sans durée de validité, le client ne peut pas décider seul quoi rafraîchir au
   retour d'arrière-plan, et rafraîchira tout.

3. **Un curseur reste-t-il valide plusieurs heures, ou y aura-t-il une lecture de delta ?** C'est
   la question la plus coûteuse du document. Sans réponse favorable, un retour au premier plan sur
   une liste longue produit des dizaines d'allers-retours enchaînés sur un réseau cellulaire. Une
   lecture « qu'est-ce qui a changé depuis T ? » réglerait du même coup la rafale de revalidation
   décrite au besoin n° 3.

4. **Le droit de lecture est-il une forme de premier ordre, servie par date ?** `helpers.isWatchable`
   suppose que le client détient toutes les places du compte : c'est intenable sur mobile. J'ai
   besoin d'un droit par date, avec sa raison de refus, son expiration et son action de repli — et
   revérifié au démarrage de la lecture, pas hérité du catalogue.

5. **Comment `multi-screen` est-il décompté, et qui libère une session tuée ?** Le système
   d'exploitation tue une application sans préavis ; une session qui ne se ferme que sur un
   événement du client laisse un écran fantôme et bloque l'utilisateur sur son propre compte. Je
   demande une session de lecture à battement, avec **expiration serveur** et possibilité de
   reprendre sa propre session identifiée par l'appareil.

6. **Le budget d'aperçu gratuit est-il compté côté serveur ?** S'il est compté côté client, une
   réinstallation — ou une simple mise à mort — le remet à zéro. Et est-il par compte, par
   appareil, ou par date ?

7. **Quelles commandes acceptent d'être mises en file hors ligne, et combien de temps une clé
   d'idempotence reste-t-elle valide ?** J'ai proposé un classement dans « Les commandes » ; il
   demande à être confirmé. La durée de validité de la clé est l'inconnue qui décide si une file
   hors ligne est utilisable : une file qui rejoue deux heures plus tard une clé expirée crée des
   doublons.

8. **Où vit le panier : sur l'appareil ou sur le compte ?** S'il vit sur le compte, il faut une
   résolution de conflit entre deux appareils. S'il vit sur l'appareil, il ne survit pas à une
   réinstallation, et la maquette — qui affiche un panier persistant dans l'en-tête — le laisse
   croire.

9. **Une commande passée chez un tiers est-elle un reflet en lecture seule, et que garantit-on de
   sa fraîcheur ?** Quatre plateformes externes sont nommées. Le mobile est la surface où ce reflet
   sera le plus souvent consulté hors ligne : il faut savoir ce qu'on promet quand l'hôte externe
   ne répond pas.

10. **Les cinq seuils de notification sont-ils des règles de domaine servies, ou des constantes
    recopiées par surface ?** « 30 minutes avant », « 85 % des places », « 6 heures avant
    expiration ». Recopiées, elles divergeront. Et quel est le **troisième canal** ?

11. **`@arthome/contracts` exposera-t-il une entrée `mini` de zod, sans fichier baril ?** Mesure à
    l'appui : 93 Ko gzip en entrée classique, 7,5 Ko en entrée `mini` élaguée, et 85 Ko si
    l'élagage n'est pas actif. Je ne rouvre pas la décision zod ; je demande qu'elle soit livrée
    sous une forme que la surface la plus contrainte du projet puisse payer.

**Deux questions subsidiaires, moins urgentes mais à ne pas perdre.**

- **Le contrat portera-t-il le décalage horaire calculé par le serveur, en plus de l'identifiant
  IANA ?** Sans lui, chaque application embarque une base de fuseaux. Avec lui, la règle de D3 est
  respectée et le calcul n'a lieu qu'une fois.
- **La taxonomie sera-t-elle servie comme un artefact versionné immuable, par langue et par
  surface ?** 59,5 Ko bruts pour la taxonomie, 117 Ko pour l'i18n bilingue du storefront : un
  instantané embarqué qui emporterait tout pèserait sur le démarrage de l'application.

---

# Confrontation

> Temps 3. J'ai lu `answers-to-surfaces.md`, `context-map.md`, `realtime.md`, `transport.md`,
> `critical-rules.md`, `DECISIONS.md` et surtout `openapi/storefront.yaml` — mon contrat. Je
> conteste sur pièces : chaque reproche cite le document, la section ou la ligne.
>
> L'index des réponses annonce mes treize questions tenues. **Onze le sont réellement**, et
> plusieurs le sont mieux que je ne demandais. Deux ne le sont pas, et j'ajoute trois défauts
> que l'index ne pouvait pas voir parce qu'ils ne répondent à aucune de mes questions : ils
> répondent à mes **écrans**.

---

## 1. Ce qui est satisfait — bref, parce que c'est l'essentiel

Mes trois besoins structurants sont devenus des règles du projet, et je le dis avant de taper.

**`servedAt` et `validUntil`** sont la **règle critique n° 9** (`critical-rules.md`), reprises sur
`EnvelopeMeta` (`storefront.yaml` l. 3536) avec la formulation que j'avais demandée : « un décompte
se calcule contre `servedAt`, jamais contre l'horloge du client ». `degraded[]` s'y ajoute, que je
n'avais pas demandé et qui règle le cas « la surcouche par spectateur a échoué, la carte est servie
quand même ».

**Le bail de lecture** (`PlaybackTicket`, l. 4589) : 90 s de bail, 120 s de jeton, renouvellement à
45 s, et la phrase exacte que je cherchais — « `releasePlayback` accélère, **rien n'en dépend** ».
Mon argument sur l'écran fantôme est cité comme le motif du choix. `qualityCap` est **déclaré**,
donc je ne proposerai pas « 4K » quand l'appareil est plafonné ; `drmSystem` est choisi par le
serveur, ce qui m'épargne de deviner sur des appareils que je ne peux pas tester.

**La pagination** : trois demandes, trois accordées, et mieux rédigées que les miennes. Le curseur
(l. 3367) est opaque sur `(created_at, id)`, **bidirectionnel**, **indépendant de la taille de
page** — « ce qui est exactement ce qu'une rotation d'écran produit » —, valide 24 h, avec
`CURSOR_TOO_OLD` et `params.maxAgeHours` (l. 3500). `CursorPageInfo` (l. 3568) porte
`approximateTotal` **borné** et `totalIsLowerBound`, ce qui rend « Voir plus · N restants » honnête
sans promettre un comptage qu'un index ne donne pas. Et `emptyReason` + `emptyActionCode` : l'état
vide n'est pas une erreur, et il porte une issue.

**Le temps réel** : `counters:subscribe` par **lot d'identifiants**, lot remplacé sans rouvrir le
canal, tick **différentiel** (`realtime.md` §2.1) — ma demande mot pour mot. Une seule connexion,
multiplexage par salle. Et §2.4 tranche dans le bon sens : les transitions programmées ne sont
**pas** poussées, le contrat livre les instants et la surface programme la bascule localement.

**Le reste, en vrac** : `WatchVerdict` comme forme de premier ordre, `advisory: true` sur la carte
et opposable à l'ouverture, `validUntil` ≤ 60 s, **jamais sur disque** · idempotence UUIDv7
« générée **et persistée avant l'envoi** », 24 h, rejeu = réponse d'origine + `Idempotency-Replayed`
(l. 3353) · `DomainConstants` (l. 3705) sert mes trois seuils — `reminderLeadMinutes` 30,
`scarcityThresholdBps` 8500, `replayExpiryWarningHours` 6 · `SavedSearch` (l. 4878) avec
`criteriaVersion`, `criteriaSignature` et `stale`, sur des **identifiants stables et jamais des
indices de tableau**, plus `newMatchesSinceLastVisit` qui m'économise dix comptages à l'ouverture ·
`VenueClock` IANA + décalage servi · `Money { amountMinor, currencyCode }` · `Device.sessions[]`,
qui tranche enfin l'ambiguïté que j'avais relevée · `traceId` recopiable depuis l'écran d'erreur,
avec mon argument cité · `LabelArtifactRef` et `taxonomyArtifact` par tranche et par surface ·
l'entrée `mini` de zod (**D-012**).

Et deux gains que je n'avais pas vus : `quietHours.bypassWhenTicketHeld` (l. 4934) — « on ne rate
pas un spectacle qu'on a payé parce qu'il commence à 23 h 15 » —, et `availability.fillRateBps`
qui sert le **taux** et non la capacité, coupant court au calcul en double.

**`/v1/me/progress/{dateId}` (l. 1601) reprend ma demande à la virgule** : battement de 30 à 60 s,
**écriture forcée au passage en arrière-plan**, écriture tardive acceptée même après
`releasePlayback`, dernier écrivain gagne **avec un rang serveur**, et l'absence de clé
d'idempotence justifiée plutôt que subie. Je n'ai rien à redire.

---

## 2. Ce qui ne l'est pas

### C1 — Un de mes cinq onglets bas n'est servi par aucune lecture

**C'est l'écran non servi.** `following` est l'un des cinq onglets permanents de ma surface, et
`account/faves` en est la projection dans le compte. Aucun des cinquante-trois points d'entrée de
`openapi/storefront.yaml` ne rend l'ensemble des artistes qu'un spectateur suit.

Le constat, vérifié trois fois :

- `/v1/artists` (l. 460) accepte `categoryId`, `sort` et `liveOnly`. **Pas de `followedOnly`.**
- `AccountScreen` (l. 4993) porte profil, abonnement, avoirs, moyens de paiement, sécurité,
  appareils, préférences, préférences de notification, consentements, suppression. **Aucun suivi.**
- `/v1/me/follows/{artistId}` (l. 2354) est un **PUT et un DELETE**. La commande existe, la lecture
  n'existe pas.
- Recherche de `followedOnly`, `faves`, `favoris`, `followedArtists` sur `storefront.yaml` **et**
  sur les treize documents de `architecture/` : **zéro occurrence**.

**L'objection prévisible ne tient pas.** `Rail.kind` (l. 4192) contient `followed`, donc l'accueil
porte une rangée « parce que vous suivez ». Mais un rail est une liste de `DateCard` **bornée et
composée par le serveur**, et ma page Suivi a deux sections : les artistes suivis **en direct**, et
les artistes suivis **qui ne le sont pas**, « classés par nom · dernier live ». Un artiste suivi
**qui n'a aucune date annoncée n'a aucune `DateCard`** — il est donc invisible d'un rail, alors
qu'il est précisément le contenu de ma seconde section. Une rangée d'accueil ne sert pas un écran.

**Et le contrat se contredit lui-même sur ce point.** `CursorPageInfo.emptyReason` (l. 3595) porte
la valeur **`no_followed_artist_live`**. Un code d'état vide a été écrit pour une liste qu'aucun
point d'entrée ne sait produire. C'est la preuve interne que l'écran a été pensé puis perdu.

**Le parcours précis, deux fois cassé.** Onglet « Suivi » : je n'ai rien à appeler, et je ne peux
pas peindre. Compte → « Mes favoris (N) » : le N n'est calculable par aucun appel. Et la bascule
d'alerte **par artiste suivi**, qui est un contrôle de cet écran, n'a ni lecture ni écriture —
`/v1/me/reminders/{dateId}` (l. 2427) pose un rappel **par date**, ce qui est une autre notion :
un rappel est une promesse datée sur une date précise, une alerte d'artiste est un abonnement
permanent à ses annonces. Le déclencheur `newEvent` (« nouvelle date annoncée par un artiste
suivi ») existe pourtant dans `NotificationPreferences`, mais rien ne permet de le régler artiste
par artiste comme ma surface le propose.

**Ce que je demande** : `GET /v1/me/follows`, paginé au curseur, rendant pour chaque entrée un
`ArtistSummary` plus `nextDate: DateCard | null`, `lastLiveAt` et `alertsEnabled` — les trois
choses que ma page affiche et que rien d'autre ne porte. Plus `followedCount` dans `AccountScreen`
(voir C5). Plus une écriture d'alerte par artiste, ou la décision explicite que suivre et être
alerté sont le même geste — auquel cas `/v1/me/follows/{artistId}` doit le dire, car sa
description affirme aujourd'hui l'inverse (« **Suivre et être alerté sont deux réglages** »,
l. 2360) sans offrir le second.

### C2 — Aucun point d'entrée ne résout un lien public : trois ouvertures à froid sont cassées

Le contrat **sert** un identifiant public partout : `DateCard.slug` et `DateCard.canonicalUrl`
(l. 3968 et 3956, « servie, jamais construite par la surface »), `ArtistSummary.slug` (l. 4286),
`NotificationEntry.deepLink` (l. 4921). Et il ne l'accepte **nulle part** : `DateId` (l. 3402) et
`ArtistId` (l. 3411) sont `format: uuid`. Les cinq occurrences de `slug` dans le fichier sont
toutes en sortie. Il n'existe ni `GET /v1/dates/by-slug/{slug}`, ni `GET /v1/resolve?url=`.
`/v1/account-deep-link` (l. 2117) va dans l'autre sens : il **produit** un lien vers le compte.

C'était la **forme 16** de mes besoins, nommée « un identifiant public stable, résoluble en un seul
appel, **sans catalogue en cache** ». Elle n'a pas été traitée, et elle n'était pas une de mes
treize questions — c'est pourquoi l'index ne la voit pas.

**Les trois parcours, tous propres au mobile :**

1. **Notification poussée.** « Compagnie Verticale passe en direct », 20 h 58. L'application a été
   tuée depuis des heures. L'utilisateur tape la notification : je démarre à froid avec une URL
   `https://arthome.fr/fr/d/nuit-blanche-2026-09-21` et **rien d'autre**. Je ne peux pas l'ouvrir.
   C'est le parcours qui justifie l'existence même des notifications.
2. **Lien partagé.** Un ami envoie l'URL par messagerie. Même impasse.
3. **Relance après une mise à mort sur un écran profond.** J'ai persisté « dernier écran et son
   argument », comme mon besoin n° 5 le prévoit. Si j'ai persisté un UUID, il n'est pas partageable
   et il n'est pas ce que la notification transporte ; si j'ai persisté l'URL, je ne sais pas la
   résoudre.

**Et le trou dépasse ma surface.** `DateCard.canonicalUrl` précise que c'est « ce que la TV encode
dans un QR pour l'action Partager, puisqu'il n'y a ni presse-papiers ni messagerie utile sur un
téléviseur ». Le téléphone qui scanne ce QR est **le mien**, et il ne sait pas l'ouvrir. Le
parcours de partage de la TV s'arrête sur mon écran d'accueil.

**Ce que je demande** : un point d'entrée de résolution, prenant une URL canonique ou un couple
(type, slug), rendant le `DateCard` ou l'`ArtistSummary` complet, **accessible sans session**
(un lien partagé s'ouvre souvent en visiteur) et **en un seul aller-retour**.

### C3 — `/v1/changes` ne couvre pas le scénario des huit heures, sur trois points

Ma question 3 était « la plus coûteuse du document ». La réponse est excellente sur le principe —
`/v1/changes` rend « une liste d'invalidations, **pas les données** », une requête au lieu de
douze — et incomplète sur trois détails qui décident de son utilité réelle.

**(a) Aucune fenêtre de rétention n'est énoncée.** `realtime.md` §5 borne la reprise WebSocket à
« 30 minutes ou 5 000 événements par flux », ce qui est parfaitement dimensionné pour un hoquet de
réseau et **inutile pour mon cas** : huit heures d'arrière-plan sont deux ordres de grandeur
au-delà. Le §5 ajoute « la reprise WebSocket couvre les minutes ; la lecture HTTP couvre les
heures » — mais cette phrase est écrite à propos du **journal durable du studio dans Kafka**, dans
un paragraphe sur la console de régie, et **ne dit rien de `/changes`**. Ni le point d'entrée
(l. 238) ni `ChangeFeed` (l. 3858) ne disent jusqu'où `since` peut remonter. Si la réponse à
`since = maintenant − 8 h` est `complete: false`, alors « recharge tout » sur un réseau cellulaire
est **exactement** le coût que ma question existait pour éviter, et je l'aurai payé en une requête
au lieu de quarante — ce qui est un progrès, mais pas la réponse.

**(b) Le vocabulaire d'étiquettes est plus étroit que ce que le canal temps réel transporte.** La
salle `viewer:{profileId}` (`realtime.md` §2) porte « badge de notifications, droits recalculés
après un achat, **panier modifié ailleurs**, révocation ». `ChangeFeed.invalidated` (l. 3870) porte
huit étiquettes : `date:{id}`, `date:{id}:availability`, `artist:{id}`, `category:{id}`,
`account:tickets`, `account:orders`, `account:subscription`, `home:rails`.

**Ni le panier ni les notifications n'y figurent.** Or ce sont les deux pastilles de mon en-tête,
présentes sur **tous** mes écrans, et le panier « vit sur le compte » (`Cart`, l. 4444) — donc le
web peut le modifier pendant que mon application dort. Au retour après huit heures le canal
WebSocket est mort depuis longtemps : `/changes` est mon **seul** chemin, et il ne peut pas me dire
que mon panier a changé. Manquent aussi `account:saved-searches`, `account:watchlist`,
`account:preferences` et `account:devices` — un appareil révoqué depuis le web doit m'atteindre.

**(c) `since` est un instant unique, alors que je détiens N réponses à N instants différents.**
Mon accueil date de T1, mon compte de T2, ma catégorie de T3. Un seul `since` m'oblige à envoyer
**le plus ancien**, ce qui maximise l'ensemble de changements rendu et donc la probabilité de
`complete: false`. C'est une pénalité mécanique, et elle frappe d'autant plus fort que
l'application est restée longtemps fermée — c'est-à-dire précisément dans le cas visé.

**Ce que je demande** : une fenêtre de rétention **énoncée dans le contrat** et alignée sur la
durée de vie du curseur (24 h) ; les six étiquettes manquantes au vocabulaire ; et un `since`
acceptable **par étiquette**, pour ne pas faire payer à l'accueil la vétusté du compte.

### C4 — La reprise de sa propre session de lecture est promise dans l'index, absente du contrat

`answers-to-surfaces.md`, mobile Q5, écrit : « tu peux **reprendre ta propre session** identifiée
par l'appareil ». Je ne la trouve pas.

`POST /v1/playback/{dateId}/open` (l. 1395) prend bien un `deviceId` dans son corps, mais **sa
description ne dit nulle part** qu'un `open` sur un `deviceId` détenant déjà un bail sur la même
date le récupère ou le remplace. Et `ActivePlaybackSession` (l. 4719), servie avec le refus
`CONCURRENT_LIMIT_REACHED` « pour que la surface propose d'en libérer une », porte `sessionId`,
`deviceLabel`, `city` et `openedAt` — **pas `deviceId`**, pas de `isCurrentDevice`. Je ne peux donc
pas reconnaître laquelle des sessions listées est la mienne. Deux téléphones d'un même foyer
étiquetés « Téléphone » sont indiscernables.

**Le parcours précis.** Le système tue l'application à la dixième seconde d'un bail de 90 s.
L'utilisateur retape l'icône aussitôt — c'est le geste le plus courant après une disparition
inexpliquée. `PlaybackTicket` est `Cache-Control: no-store`, et le contrat a raison de l'exiger :
je n'ai donc **plus le `sessionId`**, et je ne peux ni renouveler ni libérer. Je rappelle `open`,
je reçois `CONCURRENT_LIMIT_REACHED`, et je dois afficher à l'utilisateur une liste où je lui
demande de libérer **son propre téléphone, sans pouvoir le lui désigner**.

**Et ce n'est pas un désagrément, c'est un blocage.** `ViewerContext` porte
`concurrentStreamsAllowed`, et les exemples du contrat lui-même le fixent : ligne 219 et ligne 645,
`plan: { tier: pass, ..., concurrentStreamsAllowed: 1 }`. Un abonné `pass` — la formule médiane,
donc la plus répandue — est donc **verrouillé hors de son propre appareil pendant quatre-vingts
secondes** après chaque mise à mort du système, sans issue qu'il puisse comprendre.

Le bail à 90 s est la bonne réponse et je l'ai obtenue. **Ce qui manque est le dernier mètre**, et
il est d'autant plus regrettable que le reste du raisonnement est juste.

**Ce que je demande** : que `open` sur un `deviceId` détenant déjà un bail sur la **même date**
le **reprenne** — même session, bail prolongé, pas de refus —, et que `ActivePlaybackSession` porte
`deviceId` et `isCurrentDevice` pour que le refus reste lisible dans les autres cas.

### C5 — Le menu du compte coûte six appels pour six pastilles, et l'en-tête deux de plus à froid

`transport.md` l. 31 annonce « appels internes **par écran** : 1 à 4, tous parallèles ». C'est
l'éventail du BFF vers les services, et il est bon. **Ce n'est pas ce que je paie.** Le nombre
d'allers-retours **du client vers le BFF** n'est budgété nulle part, et c'est le seul qui se compte
en latence cellulaire — à 150 ms d'aller-retour, quatre appels font six cents millisecondes avant
que le premier écran soit juste.

**Le menu du compte.** `AccountScreen` (l. 4993) se présente comme « **un** agrégat pour les onze
sections » et tient magnifiquement cette promesse sur le **contenu**. Mais le menu affiche un
**effectif par section** — à venir, passés, favoris, recherches enregistrées, commandes,
notifications non lues — et `AccountScreen` **n'en porte aucun**. Pour peindre six pastilles je
dois appeler `/v1/me/account`, `/v1/me/tickets?window=upcoming`, `/v1/me/tickets?window=past`,
`/v1/me/saved-searches`, `/v1/me/orders` et `/v1/me/notifications` : **six allers-retours**, et le
septième — les favoris — n'existe pas du tout (C1). Un agrégat qui évite dix appels de contenu et
en impose six de comptage n'a gagné que la moitié de son pari.

**L'en-tête, à chaque démarrage à froid.** Deux pastilles y vivent sur **tous** mes écrans : les
notifications non lues et le panier. `ViewerContext` (l. 3810) est explicitement « le budget entier
de l'écran d'amorçage » et porte deviceId, profils, compte, formule, préférences, constantes,
catalogue de libellés, taxonomie et point d'entrée temps réel — **mais ni `unreadCount` ni le
nombre de lignes du panier**. Un démarrage à froid complet coûte donc `POST /v1/devices` (premier
lancement) + `GET /v1/viewer-context` + `GET /v1/home` + `GET /v1/me/notifications` +
`GET /v1/cart` = **cinq allers-retours** avant que mon premier écran soit entièrement juste, dont
deux uniquement pour deux nombres.

**Ce que je demande** : un objet `counts` sur `AccountScreen`, et `unreadNotifications` +
`cartLineCount` sur `ViewerContext`. Ce sont des compteurs déjà projetés — `unreadCount` est
d'ailleurs déjà servi comme « global, pas celui de la page » par `/v1/me/notifications` (l. 2702),
donc la valeur existe. Le coût serveur est nul, le gain client est de quatre allers-retours sur le
parcours le plus fréquent de l'application.

---

## 3. Ce qui est satisfait autrement — et si ça me va

### S1 — La langue n'est servie que sur la fiche : ça ne me va qu'à moitié

`DateCard` porte `languageDependency` (l. 4079) avec le vocabulaire **`none | helpful | essential`**
— D1 appliqué, `light` écarté, ma remontée du temps 1 tenue. Mais `spokenLanguages`,
`subtitleLanguages` et `surtitleLanguages` ne sont que sur `DateDetail` (l. 4109-4111).

Conséquence : une **carte** ne peut pas afficher « Joué en français · Sous-titres FR, EN », et
`isUnderstandable(spectacle, mes langues)` n'est pas évaluable sur une liste. Or ce n'est pas un
détail de fiche : c'est un élément de **décision** — un spectateur qui ne parle pas français écarte
une carte sur cette ligne, et la barrière de langue est la règle la plus visible de la surface
(c'est le raisonnement de `helpers.js` lui-même : « ce qui gêne réellement un spectateur de
spectacle vivant n'est pas le droit mais la compréhension »).

Sur les **facettes**, en revanche, la conception est bonne et je n'ai rien à redire : `Facet`
(l. 4313) est générique, « jamais une énumération de facettes au contrat », donc une facette de
langue peut apparaître sans changement de contrat. **Ça me va pour la recherche, pas pour la
carte.** Trois tableaux de codes ISO à deux lettres coûtent quelques dizaines d'octets.

### S2 — Le troisième canal est `in_app`, pas SMS : ça me va

J'avais relevé que rien ne nommait le troisième canal et que le profil suggérait le SMS (« pour les
SMS de rappel »). Le contrat tranche `push | email | in_app` (`SavedSearch.channels` l. 4906,
`NotificationPreferences.triggers` l. 4930), avec mon propre argument — coût par message,
réglementation propre, prestataire de plus, valeur non éprouvée. **C'est le bon choix.** Une
conséquence à consigner : le champ téléphone du profil perd la justification qu'il affichait, et
`phoneVerified` reste dans `AccountScreen` sans usage déclaré.

### S3 — Le mode de tchat : résolu par recadrage, et mieux

Ma question était « le mode de la date ou la préférence du spectateur, lequel l'emporte ? ». Le
contrat ne la tranche pas, il la dissout : `chatMode` sur la date (`open | emoji | read_only | off`)
est le **régime**, et `ViewerPreferences.account.chatOpenByDefault` est une préférence de
**panneau**. Ce sont deux choses, et ma maquette les confondait. **Ça me va, et c'est plus propre
que ce que je décrivais.**

### S4 — `nature` n'a pas de membre pour « pas de réseau » : réserve

`Error.nature` (l. 3613) vaut `refused | unavailable | offline_forbidden`, et
`offline_forbidden` est une trouvaille : un refus **local, jamais émis par le serveur**, au
vocabulaire « pour que la surface n'ait qu'une seule forme d'erreur à rendre ». C'est exactement
l'esprit de ma demande.

Mais il signifie « **cette commande** est interdite hors ligne », pas « **cette lecture** attend le
réseau ». Mon cinquième état — celui où aucune réponse n'est jamais arrivée, que le client est seul
à pouvoir constater, et qui ne doit surtout pas s'afficher comme une panne de la plateforme —
n'a pas de nom. Chaque surface va l'inventer. C'est la faute que la **règle critique n° 15**
décrit : « une constante d'exploitation a un document propriétaire ; ailleurs on y renvoie, jamais
on ne la recopie ». Demande minime : ajouter `network_unreachable` au vocabulaire, marqué
client-seul comme l'est déjà `offline_forbidden`.

### S5 — Le débit n'est servi nulle part : réserve, et c'est la même faute

`qualityCap` est un plafond, `ViewerPreferences.device.defaultQuality` est une préférence
(`auto | low | medium | high`), `dataSaver` est un booléen. **Rien ne porte le débit d'une variante
ni une estimation de consommation.** Or ma surface affiche « la 4K consomme environ 12 Go par
heure » pour justifier ce réglage, et `DomainConstants` (l. 3705) ne porte pas ce nombre. Il
finira donc codé en dur sur ma surface, puis recopié différemment sur la TV — c'est le onzième
exemplaire de la faute que j'ai cataloguée onze fois au temps 1, et elle est interdite par la règle
critique n° 15. Demande : un débit ou une consommation approximative par variante dans
`PlaybackTicket`, ou une constante de domaine.

### S6 — Un refus territorial sans issue vers les autres dates

`rights.reasonCode` est un **code** (`co_production | broadcaster | festival`, l. 4066) et non une
phrase : ma remontée est tenue, et la fuite d'i18n de `shared/` est corrigée. `WatchVerdict` porte
`reasonParams` pour « le territoire, la formule requise, l'instant d'expiration ».

Mais ma copie promet, mot pour mot : « Cette date fait exception : {raison}. **Les autres dates de
ce spectacle restent accessibles.** » Et `fallbackAction` (l. 3930) vaut
`buy_seat | join_waitlist | subscribe | watch_preview | see_replay_policy | none` : **aucun code ne
dit « voir les autres dates »**. `DateDetail.seriesDates` existe (l. 4136) mais n'est pas joignable
depuis un refus reçu sur une carte. Mon besoin disait : « une erreur qui promet une issue sans la
porter oblige le client à une seconde requête au pire moment ». C'est le cas ici. Demande : un
`see_other_dates` au vocabulaire, et les identifiants de la série dans `reasonParams`.

---

## 4. Mon avertissement du temps 1, confronté

J'avais vérifié que **quatorze des seize fonctions** de `shared/helpers.js` ne sont jamais appelées
par ma maquette, et écrit que leur contrat devait être « **conçu, pas observé** ». Voici ce qui a
été conçu, et mon verdict.

| Fonction jamais exercée | Ce qui a été conçu | Verdict |
|---|---|---|
| `isWatchable` | `WatchVerdict`, dix codes de refus, `fallbackAction`, `validUntil` ≤ 60 s | **tient** |
| `availableIn`, `rightsNote` | `rights.scope` / `blackoutCountries` / `reasonCode` + `OUT_OF_TERRITORY` avec `reasonParams` | **tient, sauf l'issue** (S6) |
| `languageLine`, `hasLanguageBarrier` | `languageDependency` sur la carte, les langues sur la fiche seule | **tient à moitié** (S1) |
| `seatsLabel`, `isSoldOut` | `availability` : `seatsAvailable`, `waitlistCount`, `fillRateBps`, `soldOut` | **tient, et mieux** |
| `progressOf` | `liveEdgeSec` + `startsAt` + `runtimeMin`, dérivé contre `servedAt` | **tient** |
| `viewersOf` | `viewers` nullable — « absent, jamais zéro » — plus `counters:tick` différentiel | **tient** |
| `devicesOf` | `Device` + `sessions[]`, appareil et session enfin distingués ; ma remarque citée en `context-map.md` l. 610 | **tient** |
| `alertsOf` | `NotificationEntry` + `SavedSearch` + `newMatchesSinceLastVisit` | **tient, sauf l'alerte par artiste** (C1) |
| `resumeOf` | `resumePoint`, `viewerProgress`, `/v1/me/progress` avec sa cadence | **tient entièrement** |
| `plans` | `Plan`, `Subscription`, `concurrentStreamsAllowed` servi | **tient** |
| `messageState`, `chatOf` | `badge` **dérivé** par `moderationBadgeOf`, préséance écrite, trois axes séparés côté modèle, messages retirés filtrés à la source | **conçu, non éprouvé** |

**Onze tiennent, deux tiennent à moitié, une reste ouverte.** Et `context-map.md` l. 967 marque
`chat` **provisoire** en citant explicitement ma vérification — « aucun écran n'a jamais exercé la
modération vue du spectateur ; un contrat conçu et non observé ne se fige pas ». C'est la bonne
réponse à mon avertissement : ne pas prétendre qu'il est levé. **Je maintiens l'avertissement sur
la modération seule, et je le lève sur les dix autres.**

---

## 5. Les questions sans réponse

Sept, par ordre d'impact.

1. **Jusqu'où `since` peut-il remonter sur `/v1/changes` ?** Aucune fenêtre n'est écrite. À huit
   heures, est-ce `complete: false` ? (C3a) — **bloquant pour la conception du cache client**.
2. **Un `open` sur un `deviceId` qui détient déjà un bail sur la même date le reprend-il ?** (C4)
   — bloquant pour un abonné `pass`, dont le contrat fixe lui-même `concurrentStreamsAllowed: 1`.
3. **Quelle est la limite d'écrans de `free` ?** `multi_screen` n'est dans les `opens[]` que de
   `premium`, les exemples fixent `pass` à 1, et `free` n'est illustré nulle part.
4. **Suivre et être alerté : un geste ou deux ?** `/v1/me/follows/{artistId}` affirme que ce sont
   deux réglages et n'offre que le premier. (C1)
5. **Le débit par variante, ou une consommation approximative ?** (S5)
6. **`network_unreachable` au vocabulaire de `nature` ?** (S4)
7. **`see_other_dates` au vocabulaire de `fallbackAction` ?** (S6)

Les questions 4 à 7 sont des ajouts de vocabulaire, pas des changements de forme : elles coûtent
une ligne chacune et évitent que cinq surfaces inventent cinq réponses.
