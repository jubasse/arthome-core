# Besoins — storefront TV (react-native-tvos)

> Surface : téléviseurs connectés, box opérateur, consoles, clés HDMI. 1920 × 1080,
> pilotage à cinq touches, distance de lecture trois mètres, parc hétérogène,
> mémoire comptée. Le studio n'existe pas ici : la TV est une surface de
> spectateur.
>
> Ce document exprime **ce que le contrat doit porter ou garantir**. Il ne décrit
> aucune mise en page : la maquette `Storefront TV.dc.html` et
> `Prompt - Storefront TV.md` sont la conception et font foi.
>
> Sources lues : cahier des charges TV intégral, `README.md`, `streaming.md`,
> `shared/helpers.js` (en entier), `taxonomy.json`, `catalogue.json`, `fixtures.js`
> (sections dates / comptes / tchat / publications), `i18n/` dont `tv-keymap.json`,
> `architecture/corrections-handoff.md`, `DECISIONS.md`. Maquette lue par fragments.
>
> Skills chargées (D-001, faute d'orchestrateur React Native) :
> `react-native-tv-best-practices` (principale), `react-native-best-practices`,
> `react-server-state`, `react-core`. Aucune ne contredit une décision du projet ;
> une seule la **précise** de façon contraignante — voir *Le coût de zod*.

---

## Inventaire des écrans

Vingt-deux écrans. Les colonnes disent où chacun **introduit** quelque chose ;
un écran sans introduction est servi par une forme déjà décrite ailleurs
(D-006 : couverture exhaustive, rédaction dédupliquée).

| Écran | Rôle | Introduit une forme | Introduit une commande | Temps réel | Appels |
|---|---|---|---|---|---|
| `boot` (pré-écran) | amorçage, avant toute langue connue | `ViewerContext` | — | — | **1** |
| `gate` | choix du profil à l'ouverture | `ProfileSummary` | `selectProfile` (local) | — | 0 |
| `signin` | connexion par appairage | `DevicePairing` | `createPairing`, `cancelPairing` | attente du verdict | 1 + attente |
| `home` | billboard + carrousels | `HomeScreen`, `Rail`, `DateCard` | `toggleList` | compteur, passage à l'antenne | **1** |
| `search` | clavier à l'écran + résultats vivants | `SearchResults` | — (lecture) | — | 1 par état de requête |
| `live` | direct du moment + grille horaire du soir | `LiveScreen`, `ScheduleSlot` | — | compteur, bascule d'état | **1** |
| `categories` | les 21 disciplines, groupées par univers | `CategoryTile` | — | — | **1** |
| `category` | une discipline, en rangées de sous-genres | `CategoryScreen` | — | — | **1** |
| `artists` | grille de portraits | `ArtistCard` | — | — | 1 + curseur |
| `artist` | fiche d'un artiste | `ArtistDetail` | `followArtist` / `unfollow` | — | **1** |
| `title` | fiche d'une date ou d'un spectacle | `DateDetail` | `toggleList`, `share` | compteur si à l'antenne | **1** |
| `book` | tarif et nombre de places | — (dérive de `DateDetail`) | `refreshAvailability` | jauge | 0 ou 1 |
| `pay` | QR + code court, écran d'attente | `DevicePairing` (même forme) | `createPairing` | attente du verdict | 1 + attente |
| `confirm` | issue du parcours d'achat | `PairingOutcome` | — | — | **0** |
| `player` | lecteur plein écran | `PlaybackTicket`, `Chapter`, `Track`, `ChatMessage`, `IncidentState` | `renewPlaybackTicket`, `saveProgress`, `sendReaction`, `releasePlayback` | **incident, tchat, compteur, latence** | **1** + renouvellements |
| `dateinfo` | informations sur la date, depuis le lecteur | — (dérive de `PlaybackTicket`) | — | — | **0** |
| `tickets` | mes places | `TicketCard` | `cancelBooking` | salle ouverte, issue | **1** |
| `list` | ma liste | — (`DateCard`) | `toggleList` | — | **1** |
| `replays` | rediffusions, celles qui expirent d'abord | — (`DateCard`) | — | fenêtre restante | **1** |
| `plans` | abonnements | `PlanCard` | `createPairing` (intention `plan`) | — | **1** |
| `account` | identité, abonnement, moyens de paiement, appareils, réglages | `AccountScreen`, `DeviceSession`, `ViewerPreferences` | `revokeDevice`, `updatePreferences`, `signOutProfile` | — | **1** |
| `help` | aide des touches | — (embarquée) | — | — | **0** |
| `ambient` | veille après 8 min d'inactivité hors lecture | — (réemploi des affiches en main) | — | — | **0** |

**Écrans de second rang, qui ne sont pas des pages mais consomment du contrat** :
panneaux du lecteur (chapitres, sous-titres, pistes et qualité, tchat,
informations), écran d'incident, écran de fin de spectacle avec la boutique du
spectacle. Sur TV une modale *est* une page, mais aucun de ces panneaux ne doit
déclencher un appel : tout est livré avec le `PlaybackTicket`.

**Écrans absents de la maquette et pourtant déclarés** : `plans`. Le cahier des
charges et la barre latérale le prévoient ; la maquette n'expose que huit entrées
et aucune page d'abonnements, alors que l'intention de paiement `plan` existe bien
dans le parcours de confirmation. Voir *Incohérences relevées*, point 2.

**Réglages de démonstration qui sont en réalité des états du contrat.** La maquette
expose douze props. Sept sont de la donnée servie, pas un réglage d'auteur :

| Prop | Ce que c'est réellement |
|---|---|
| `profile` | le profil sélectionné sur cet appareil, et ses droits (dont le catalogue filtré du profil enfant) |
| `signedIn` | l'existence d'une session d'appareil |
| `onAir` | dérivé de l'état des dates servies, jamais un booléen d'application |
| `chatMode` | **propriété de la date** (`open`, `emoji`, `read-only`, `off`), décidée en régie |
| `replayPolicy` | **propriété de la date** (`included`, `subscription`, `unit`, `none`) + fenêtre en heures |
| `incident` | **état poussé par le plan de contrôle** (aucun, écran d'attente, reportée, annulée) |
| `lang` | la langue d'interface du profil, et le repli i18n embarqué |

Les cinq autres (`heroMotion`, `autoplayPreview`, `focusScale`, `remote`,
`safeArea`) sont de la présentation ou une préférence locale, sauf
`autoplayPreview` qui est une **préférence de profil** persistée côté serveur
(voir `updatePreferences`).

---

## Les formes de données

### La règle qui commande tout : la carte doit se suffire

À trois mètres, une carte porte six informations au maximum, et chacune d'elles
est une **pastille dérivée de la donnée**, jamais un littéral. Le contrat doit
donc livrer, sur la carte elle-même, tout ce qui alimente une pastille — sans
quoi la TV devra soit faire un second appel, soit recalculer, soit inventer.

Mais la même carte ne doit **pas** porter le synopsis, la distribution, la
biographie ni le jeu de médias complet : sur une TV à 1 Go, une rangée virtualisée
qui garde des objets gras en mémoire provoque des évictions d'images et des
rechargements en boucle pendant la navigation au doigt. D'où **deux tailles
explicitement nommées et disjointes**, et l'interdiction pour la petite de porter
les champs de la grande.

### `DateCard` — la projection universelle

C'est la forme la plus servie de toute la surface : elle est le contenu de chaque
rangée d'accueil, de chaque grille, de chaque résultat de recherche.

Ce qu'elle doit porter, et pourquoi :

- **identité** : identifiant de la date, identifiant du spectacle, identifiant de
  l'artiste, identifiant de la discipline et du sous-genre ;
- **titre et nom d'artiste** déjà dans la langue du spectateur (règle `content()`
  de `helpers.js` : on rend la langue du lecteur quand elle existe, on retombe sur
  l'autre sinon — la langue de jeu se dit ailleurs) ;
- **instant de début en chaîne ISO UTC**, plus l'**identifiant de zone IANA de la
  salle**. Jamais un décalage en minutes, jamais une heure murale formatée. La TV
  compose les deux horloges (heure du spectateur d'abord, heure de salle en second
  quand elle diffère) ;
- **durée** en minutes ;
- **état** dans le vocabulaire unique retenu au contrat, et **issue** si elle
  existe (`cancelled`, `postponed`, `interrupted`), plus la **nouvelle date** en
  cas de report. L'issue prime sur l'état à l'affichage : le contrat doit livrer
  les deux, pas un état pré-fusionné ;
- **jauge** : places disponibles et liste d'attente. Ce sont deux nombres, et le
  libellé (« 86 places » / « Complet » / « Liste d'attente · 340 ») se dérive ;
- **politique de rediffusion** + **fenêtre en heures** + **heures restantes**
  quand la rediffusion est en ligne. Les heures restantes sont une valeur
  décroissante : elles se **dérivent** de l'instant de fin et de la fenêtre, donc
  le contrat livre les deux entrées, pas le résultat. Ce point est directement la
  règle « aucune valeur calculée deux fois » : si le serveur livrait le nombre
  d'heures, il serait faux dès la minute suivante ;
- **droits** : le contenu est-il diffusable dans le territoire du spectateur, et
  sinon le **code** de raison ;
- **accès du spectateur** : détient-il une place, peut-il lancer la lecture
  maintenant, et sinon **pourquoi** (pas de place, salle pas encore ouverte, hors
  territoire, abonnement requis, aucune rediffusion). C'est le champ le plus
  coûteux du contrat — voir la question Q6 ;
- **reprise** : position en secondes si le profil a commencé cette date ;
- **compteur de spectateurs**, présent **seulement** si la date est à l'antenne.
  Jamais zéro : la règle du dossier interdit « 0 EN DIRECT », donc le champ doit
  être absent et non nul ;
- **médias** : un descripteur de visuel en 16/9 et un en affiche 2/3, chacun
  **déjà décliné aux tailles réellement affichées**. Pas une recette d'URL avec un
  gabarit de largeur. Motif de mémoire, pas de confort : un fond 4K décodé pour
  une vignette coûte autant qu'un plein écran, et c'est le premier levier de
  pression mémoire d'une UI TV.

Ce que `DateCard` ne doit **pas** porter : synopsis, distribution, biographie,
liste des autres dates, prix détaillés par tarif, et surtout aucune donnée de
billetterie (montants vendus, recette). Le jeu de démonstration actuel expose
`prices[].sold`, `prices[].revenue`, `seats.sold`, `publication` et `publishedBy`
sur l'objet que lit le storefront — voir *Incohérences relevées*, point 5.

### `DateDetail`

`DateCard` plus : synopsis complet, distribution, langue parlée, sous-titres,
surtitres, **dépendance à la langue** (`none | helpful | essential` — le
vocabulaire réel, cf. errata D1), attributs transverses (public, âge minimum,
placement, entracte, accessibilité, type de salle), salle avec sa ville et son
pays, prix par tarif en **unité canonique + code devise**, remise d'abonnement
applicable, et la **politique de rediffusion en clair avant l'achat** — c'est
elle qui justifie l'écart de tarif, le dossier en fait un principe.

S'y ajoutent trois rangées de `DateCard` **composées par le serveur** : les autres
dates de la série, les autres dates du même artiste, et une suggestion dans la
même discipline. Elles font partie de la même réponse (budget d'un appel).

### `Rail` et `HomeScreen`

Une rangée porte : un identifiant stable (la mémoire de focus s'y accroche), un
**code de titre** ou un titre paramétré (« Parce que vous suivez {artiste} » —
la recommandation est nommée, jamais anonyme : le paramètre est donc dans le
contrat), un **compte total**, une forme de carte (`wide`, `poster`, `portrait`),
une éventuelle couleur d'état sémantique exprimée en **code** et non en couleur,
et la première page de ses cartes avec son curseur.

Le **compte total** n'est pas décoratif : chaque rangée affiche un compteur à
droite de son titre. Si la rangée est paginée, `items.length` est faux — le
compteur serait un littéral parallèle. Le contrat doit donc porter `total` dans
l'enveloppe de page.

`HomeScreen` = un billboard (une `DateDetail` allégée : de quoi afficher le
kicker, le titre, trois lignes de synopsis, la métadonnée, et deux ou trois
actions) + la liste ordonnée des rangées. **L'ordre des rangées appartient au
serveur.** Le cahier des charges le fixe (reprendre, à l'antenne, vos places, ce
soir, parce que vous suivez, rediffusions qui expirent, deux à trois rangées par
discipline, affiches, artistes à suivre) : c'est une règle éditoriale, elle ne se
recalcule pas sur cinq surfaces.

### `CategoryTile`

Vingt et une disciplines, dans le **rang éditorial déclaré par `taxonomy.json`**
(`rank`, du plus grand public au plus pointu, familles mêlées), avec leur famille
(`music`, `stage`), leur code i18n, leur nombre de dates et leur nombre de dates à
l'antenne. Aucune surface ne réordonne.

Vingt et une tuiles ne tiennent pas sur un écran comme neuf. Deux issues, et c'est
au contrat de trancher : soit il porte les 21 avec leur famille et leur rang, et
la TV les groupe en deux blocs parcourus verticalement ; soit il porte en plus une
**sélection éditoriale courte de tête de page**, écrite comme une règle et servie,
jamais codée en dur. Je demande la première par défaut et la seconde comme champ
optionnel — voir Q5.

### `CategoryScreen`

Un hero choisi par le serveur (une date à l'antenne, sinon la prochaine, sinon une
rediffusion) et des **rangées par sous-genre déjà choisies et déjà ordonnées par
le serveur**. La maquette calcule aujourd'hui un « intérêt » par sous-genre à
partir des spectateurs, des vues de rediffusion et des places vendues, puis
retient les sous-genres à deux dates ou plus et regroupe la traîne. C'est un
classement éditorial calculé sur une surface : la règle « aucune valeur calculée
deux fois » l'interdit, et les places vendues n'ont rien à faire sur un client
public. Le serveur doit livrer les rangées faites.

**Conséquence structurante** : à cinq touches, un filtre à facettes est
inutilisable — on ne peut pas ouvrir un panneau, cocher trois cases et penser à le
refermer. La TV transforme donc les facettes en rangées. Elle **ne consomme pas
l'API de facettes** du catalogue. C'est une divergence de forme, pas de contenu,
et elle justifie que le BFF storefront serve deux modèles de lecture pour la même
discipline.

### `ArtistCard` / `ArtistDetail`

Carte : identifiant, nom, portrait déjà dimensionné, discipline, nombre
d'abonnés, **nombre de dates à venir**, et l'état de suivi du profil. Fiche :
biographie dans la langue du spectateur, visuel de billboard, rangée des dates à
venir, rangée des rediffusions, état de suivi.

### `TicketCard`

`DateCard` plus : le tarif détenu, l'instant d'ouverture de salle (dérivé de
`startsAt` et de la constante d'ouverture — 30 minutes aujourd'hui, qui doit venir
du contrat et non d'une constante recopiée cinq fois), et pour chaque issue ce que
le spectateur doit en faire : nouvelle date pour un report, **montant et délai
de crédit** pour un remboursement, **montant de l'avoir** pour une interruption.
Ces montants sont en unité canonique ; le délai (« 3 à 5 jours ouvrés ») est une
politique : un **code**, pas une phrase.

L'ordre d'affichage est une règle : à l'antenne et salle ouverte d'abord, puis à
venir (un report figure à sa nouvelle date), puis rediffusions disponibles, puis
issues fermées, puis passées. Elle appartient au domaine.

### `PlaybackTicket`

La forme la plus critique de la surface, et celle qui doit arriver **en un seul
aller-retour**. Elle porte :

- l'**URL de manifeste** et le **jeton de lecture signé**, court, avec son instant
  d'expiration et l'intervalle de renouvellement attendu ;
- le **protocole et le système de DRM retenus pour cet appareil**, choisis par le
  serveur à partir d'un descripteur d'appareil que la TV envoie. La TV ne choisit
  pas : le parc impose HLS + FairPlay sur tvOS et DASH + Widevine ailleurs, avec
  PlayReady sur certaines références, et un client qui devine se trompera ;
- le **plafond de qualité** que le niveau de sécurité matériel autorise. Une clé
  HDMI d'entrée de gamme n'offre que du Widevine logiciel, plafonné en SD : le
  serveur doit dégrader proprement plutôt que refuser la lecture, et la TV doit
  savoir qu'elle a été plafonnée pour ne pas proposer « 4K » dans le panneau de
  qualité ;
- les **chapitres posés en régie** (position en secondes + code de vocabulaire) ;
- les **pistes de sous-titres et audio disponibles**, dont description audio, avec
  leurs codes de langue ;
- le **régime de tchat de la date** ;
- l'**état d'incident courant** ;
- la **position de reprise** du profil ;
- pour un direct : la **position du bord du direct** et la **latence mesurée**.
  La barre affiche la portion écoulée et la latence, et le bouton « Revenir au
  direct » n'apparaît que si le spectateur a reculé — les deux se dérivent du
  bord, qui doit donc être servi ;
- pour la fin de spectacle : la disponibilité et la durée de la rediffusion, la
  **prochaine date de la série**, et l'existence d'une boutique du spectacle.

Aucun de ces éléments ne justifie un appel séparé : un panneau de sous-titres qui
met 600 ms à se remplir est un défaut visible à trois mètres.

### `ChatMessage`

Identifiant, identifiant de la date, pseudonyme d'auteur, rôle, texte, langue du
texte, et **position dans le média** — pas l'heure d'envoi. C'est la forme que
`fixtures.js` porte déjà (`atMin` relatif au début du spectacle) et elle est juste :
sur une rediffusion, un message doit réapparaître au moment du spectacle où il a
été écrit, pas à l'heure où on le regarde.

La TV **ne doit jamais recevoir** un message retiré ou masqué. La modération est
un état côté `chat` ; la surface publique reçoit le flux déjà filtré. Le studio
voit les quatre états, la TV en voit un.

### `DevicePairing` et `PairingOutcome`

Voir la section dédiée.

### `ViewerContext`, `ProfileSummary`, `ViewerPreferences`, `DeviceSession`

`ViewerContext` est la réponse d'amorçage : les profils connectés sur **cet
appareil** (jusqu'à cinq), les droits du profil sélectionné, ses préférences, la
version du catalogue de libellés, et les constantes de domaine que la TV dérive
(ouverture de salle, délai d'aperçu du billboard, seuils de rareté). Une
constante recopiée sur cinq surfaces finira par diverger.

`ProfileSummary` : identifiant, nom, avatar dimensionné, type de profil, et pour
un profil enfant la **liste des disciplines autorisées**. Le filtrage du catalogue
enfant se fait **côté serveur** : sinon la TV d'un enfant télécharge le catalogue
adulte pour le masquer.

`ViewerPreferences` : langue d'interface, sous-titres par défaut, taille de
sous-titres, description audio, réduction des animations, aperçu vidéo
automatique. Question ouverte : ces préférences sont-elles portées par le profil
(et suivent le spectateur d'un téléviseur à l'autre) ou par l'appareil (et
restent dans le salon) ? La réduction des animations et la taille des
sous-titres plaident pour l'appareil, la langue pour le profil. Voir Q8.

`DeviceSession` : identifiant, type d'appareil (`tv`, `mobile`, `tablet`,
`desktop`, `stick`, `console`, `box`), libellé, ville, dernière activité, et
« est-ce cet appareil ». La page compte permet de déconnecter un appareil à
distance : c'est une commande, et elle doit invalider les jetons de lecture en
cours de cet appareil, pas seulement sa session.

### Règles transverses de forme

1. **Instants ISO en UTC + identifiant de zone IANA.** Jamais un décalage figé :
   une date programmée dans six mois s'afficherait à la mauvaise heure après un
   changement d'heure. La TV compose les deux horloges.
2. **Montants en unité canonique entière + code devise.** Le formatage est de la
   présentation, il se fait sur la TV avec sa langue.
3. **i18n par codes.** Aucune phrase dans une réponse d'API, enveloppe d'erreur
   comprise. Une seule exception assumée : le **message d'incident écrit par la
   régie**, qui est du contenu rédigé et non un libellé — il voyage donc avec sa
   langue, comme un synopsis. Le code de raison de géo-blocage, lui, doit être un
   code : le jeu actuel porte des libellés rédigés.
4. **Vocabulaires fermés, avec un comportement défini pour une valeur inconnue.**
   Voir *Contraintes propres à la TV*, point 5. C'est la contrainte la plus
   spécifique à cette surface.
5. **Additif seulement.** Un champ retiré casse un parc que je ne peux pas mettre
   à jour.

---

## Les commandes

Toutes portent `Idempotency-Key`. Toutes répondent par l'**enveloppe d'erreur
unique** : code, paramètres, identifiant de trace.

**Règle propre à la TV : une commande renvoie l'état projeté, pas un accusé.**
Un `204` oblige la TV à refaire un appel pour repeindre l'écran, donc à payer un
second aller-retour sur un réseau domestique médiocre, donc à afficher un écran
qui se remplit en deux temps. Chaque commande ci-dessous renvoie la ou les cartes
qu'elle modifie.

| Commande | Effet | Renvoie | Notes propres à la TV |
|---|---|---|---|
| `createPairing` | ouvre un appairage pour une intention | `DevicePairing` | cœur de la surface, section dédiée |
| `cancelPairing` | ferme un appairage en attente | — | déclenchée par Retour ; la TV quitte souvent sans attendre |
| `bookSeat` | réserve n places à un tarif | `TicketCard` + `DateCard` à jour | **n'est jamais appelée par la TV** : elle passe par l'appairage |
| `joinWaitlist` | inscrit sur liste d'attente | `TicketCard` + `DateCard` | idem, par appairage |
| `cancelBooking` | annule une place | `TicketCard` + `DateCard` | la maquette annonce « annulation jusqu'à 1 h avant » : c'est une **règle de domaine** qui doit venir du contrat, pas d'une mention d'écran |
| `subscribe` / `changePlan` | souscrit ou change de formule | `AccountScreen` | par appairage |
| `addPaymentMethod` | enregistre un moyen de paiement | `AccountScreen` | par appairage ; la TV n'affiche les moyens qu'en lecture |
| `buyMerch` | achète un article de la boutique | — | par appairage, depuis l'écran de fin de spectacle |
| `toggleList` | ajoute ou retire de Ma liste | `DateCard` à jour | retrait par appui long sur OK ; doit être instantané à l'écran et réconcilié ensuite |
| `followArtist` / `unfollowArtist` | suit un artiste | `ArtistCard` à jour | **déclenche les notifications** : le contrat doit dire si suivre crée un abonnement de notification ou si c'est un second réglage |
| `saveProgress` | enregistre la position de lecture | — | voir fréquence ci-dessous |
| `sendReaction` | envoie une réaction pendant un direct | quota restant | voir limite de débit ci-dessous |
| `renewPlaybackTicket` | renouvelle le jeton de lecture | `PlaybackTicket` partiel | voir *Le temps réel* |
| `releasePlayback` | libère une session simultanée | — | **ne peut pas être garantie** : un téléviseur se débranche |
| `revokeDevice` | déconnecte un appareil | `AccountScreen` | doit invalider aussi ses jetons de lecture |
| `signOutProfile` | déconnecte un profil de cet appareil | `ViewerContext` | « les autres comptes restent connectés » : la déconnexion est **par profil**, pas par appareil |
| `updatePreferences` | change une préférence | `ViewerPreferences` | portée à trancher (Q8) |

### Trois commandes méritent un débit explicite dans le contrat

**`saveProgress`.** La rangée « Reprendre » est la première de l'accueil, et une
reprise fausse se voit. Mais une TV qui écrit sa position toutes les cinq secondes
pendant trois heures produit 2 000 écritures par spectacle et par foyer. Il faut
que le contrat fixe la cadence (je propose : sur pause, sur sortie, sur fin, et
un battement long — 30 à 60 s), et surtout qu'il accepte une **écriture tardive
en arrière-plan** : la TV peut être coupée à tout moment, la dernière position
écrite doit être prise même si elle arrive après un `releasePlayback`.

**`sendReaction`.** Le tchat est en lecture seule sur TV, mais les réactions
écrivent. Six emojis, choisis à la croix directionnelle, sur un direct qui peut
réunir des milliers de spectateurs. Il faut une **limite de débit déclarée dans
le contrat** — pas seulement appliquée — parce que la TV doit *désactiver* la
commande plutôt que la laisser échouer : une action inerte est proscrite par le
dossier, mais une action qui échoue silencieusement est pire. Je demande : un
quota par spectateur et par date, renvoyé avec la réponse (combien il en reste,
quand il se recharge), et une seule réaction en vol à la fois.

**La recherche.** Ce n'est pas une commande mais elle a le même problème. Le
clavier à l'écran produit un caractère par pression de touche et les résultats
vivent en direct, sans bouton « Valider ». Sans discipline, c'est une requête par
lettre. Ce que j'impose côté client : pas de requête sous deux caractères,
anti-rebond d'environ 250–300 ms, une seule requête en vol avec annulation de la
précédente. Ce que je demande au contrat : que la requête soit **annulable** et
qu'elle réponde en moins de 200 ms, faute de quoi le retour visuel de la frappe
décroche de la frappe.

### Une commande qui n'existe pas et qui devrait

L'action **Partager** est présente sur la fiche d'une date. Aucune commande ne la
sert, et dans la maquette elle mène par erreur à l'écran de paiement. Sur TV,
partager ne peut pas vouloir dire copier un lien : il n'y a pas de presse-papiers
utile ni de messagerie. La seule forme sensée est un **QR vers la page publique de
la date** — donc une URL canonique servie par le contrat, pas construite par la
surface. Voir Q10.

---

## L'appairage d'appareil

C'est la section la plus importante du document, et la plus spécifique à cette
surface.

### Le constat : une primitive, pas quatre — et il y en a cinq

Le cahier des charges annonce quatre parcours par QR + code court : se connecter,
acheter une place, s'abonner, acheter de la marchandise. La maquette en expose en
réalité **cinq intentions** de paiement et de connexion :

| Intention | Déclenchée depuis | Ce que la TV attend en retour |
|---|---|---|
| `signin` | `signin`, `gate` (ajouter un compte) | un profil de plus sur cet appareil, et la session |
| `seat` | `book` → `pay` | la place réservée, et la date à jour |
| `plan` | `plans` | l'abonnement actif, et les droits recalculés |
| `payment-method` | `account` | le moyen de paiement enregistré |
| `merch` | écran de fin de spectacle | l'achat confirmé |

Plus un sixième cas qui **n'en est pas un** et qu'il ne faut pas confondre : le QR
de la page compte, qui renvoie vers la gestion du compte sur téléphone. Celui-là
est un **renvoi**, pas un appairage : rien n'attend, l'écran ne bascule pas. Le
contrat doit distinguer les deux, sinon on implémentera une attente là où il n'y
en a pas.

Les cinq vrais parcours partagent exactement la même mécanique : un code court
affiché sur un écran, repris sur un autre appareil, un écran qui attend et
bascule seul. C'est le **device flow OAuth (RFC 8628)**, et le dossier l'a déjà
identifié comme tel. Conçu cinq fois, il sera implémenté cinq fois.

### Ce que je demande : une commande, une intention

```
createPairing(intent, payload?, deviceDescriptor) → DevicePairing
```

- `intent` : l'une des cinq valeurs ci-dessus ;
- `payload` : ce que l'intention exige — pour `seat`, l'identifiant de la date, le
  tarif et le nombre de places ; pour `plan`, l'identifiant de la formule ; pour
  `merch`, l'article ; vide pour `signin` et `payment-method` ;
- `deviceDescriptor` : ce que la TV sait d'elle-même, et qui doit servir à nommer
  l'appareil dans la liste des appareils connectés.

`DevicePairing` porte, dans la forme de RFC 8628 :

- `pairingId` — l'identifiant opaque que la TV **persiste sur l'appareil** ;
- `userCode` — six caractères ;
- `verificationUri` — l'adresse courte à taper (`arthome.fr/tv` dans la maquette) ;
- `verificationUriComplete` — l'URI encodée dans le QR, code déjà inclus, pour que
  le téléphone n'ait rien à saisir ;
- `expiresAt` — instant ISO ;
- `pollInterval` — le rythme minimal de vérification.

**Le QR et le code court sont deux vues du même appairage, pas deux mécanismes.**
Le contrat en livre les deux formes ; la TV n'en fabrique aucune.

### L'alphabet du code : c'est une exigence de contrat, pas de design

Six caractères lus à trois mètres sur un écran, puis tapés sur un téléphone. Les
codes de la maquette (`H4T9RD`, `K7QM2P`) mélangent chiffres et lettres, avec les
confusions classiques : `0`/`O`, `1`/`I`/`L`, `5`/`S`, `8`/`B`. Ce n'est pas une
question de police de caractères : quelle que soit la typographie, un spectateur
qui tape `O` au lieu de `0` échoue et recommence, et sur TV recommencer coûte un
retour au début du parcours.

Le contrat doit donc **déclarer l'alphabet**, pas le laisser à chaque client.
Un alphabet de 23 à 26 symboles non ambigus sur six positions donne de l'ordre de
10^8 combinaisons. C'est assez pour un code éphémère, et trop peu pour être
laissé sans défense : il faut un plafond de tentatives par code et par adresse, un
verrouillage après échecs, et l'unicité du code **parmi les appairages en cours
seulement** — un code doit pouvoir être réutilisé une fois expiré, sinon l'espace
s'épuise.

### La durée de validité : quinze minutes, mais pour quoi ?

La maquette annonce « CODE VALABLE 15 MINUTES ». Cette valeur n'existe nulle part
dans `shared/` : c'est un littéral de maquette, et le contrat doit se l'approprier.

Je conteste qu'une seule durée convienne aux cinq intentions. Quinze minutes pour
une connexion est raisonnable : le spectateur cherche son téléphone, se connecte,
peut-être fait une 2FA. Quinze minutes pour un **paiement** est long : pendant ce
temps la date peut se remplir, et l'écran de réservation affichait une jauge qui
n'est plus vraie. Je demande une durée **par intention**, servie dans la réponse
(`expiresAt`) et jamais codée sur la surface — de sorte que la TV n'ait rien à
savoir et que la politique reste modifiable sans revue de magasin.

À la maquette de la TV près d'un point, qui est juste et qu'il faut garder :
**l'écran d'attente ne montre pas de compte à rebours.** Un décompte anxiogène
pousse à abandonner. Le contrat porte `expiresAt` ; la TV s'en sert pour savoir
quand renoncer, pas pour l'afficher.

### Comment la TV apprend que c'est fait

Trois mécanismes possibles, et c'est au backend de trancher (Q1) :

1. **Interrogation périodique**, conforme à RFC 8628, avec `pollInterval` et la
   réponse `slow_down`. Simple, sans état de connexion à maintenir, robuste à une
   coupure Wi-Fi passagère. Mais la latence perçue est celle de l'intervalle.
2. **Le canal temps réel existant**, celui du tchat et des incidents. Meilleure
   latence, mais pendant la connexion la TV **n'a pas encore de session** : le
   canal devrait accepter une identité d'appareil, ce qui élargit sa surface.
3. **Un flux serveur dédié** sur la durée de l'appairage.

Mon exigence, quelle que soit la réponse : **la TV bascule en deux secondes au
plus** après la fin du parcours sur le téléphone. Au-delà, le spectateur pense
que ça n'a pas marché et il recommence — ce qui crée un second appairage pour le
même achat. Et la TV ne doit jamais interroger plus vite que `pollInterval` : le
contrat doit pouvoir la ralentir, parce que quelques milliers de téléviseurs qui
attendent tous un paiement sont une charge que le serveur doit pouvoir modérer.

### Le cycle de vie, et les quatre issues

`pending` → `approved` | `denied` | `expired` | `cancelled`.

Les quatre doivent être **distinguables par un code**, parce que la TV dit quatre
choses différentes : « réessayez », « vous avez refusé sur votre téléphone », « le
code a expiré, en voici un autre », « vous avez annulé ». Un seul code d'échec
produirait un message faux trois fois sur quatre.

À quoi s'ajoute une cinquième issue, propre aux intentions d'achat :
`approved_with_failure` — le téléphone a bien terminé mais l'achat a échoué
(complet entre-temps, paiement refusé). Le contrat doit la porter distinctement,
parce que la TV ne doit pas afficher « Votre place est réservée ».

### Si le téléphone abandonne

Trois cas, trois comportements attendus du contrat :

- **le téléphone ne vient jamais** : l'appairage expire ; la TV le sait par
  `expired` et propose un nouveau code sans repartir du début du parcours (le
  tarif et le nombre de places choisis à la télécommande doivent survivre, c'est
  le travail pénible) ;
- **le spectateur quitte l'écran sur la TV** (Retour) : la TV appelle
  `cancelPairing`. Si elle n'y arrive pas — réseau coupé — l'appairage doit
  expirer seul ;
- **l'application TV redémarre** : c'est le cas qu'on oublie. La TV a persisté
  `pairingId` ; elle doit pouvoir **se rattacher** à l'appairage en cours plutôt
  que d'en ouvrir un second. Sans cela, un téléviseur qui a redémarré pendant que
  le spectateur payait affichera l'accueil pendant que le paiement aboutit dans le
  vide.

### Ce que porte l'issue

Pour chaque intention, `PairingOutcome` doit livrer **le résultat, pas un accusé**,
et il doit être assez complet pour que l'écran de confirmation s'affiche **sans
un seul appel de plus**. Pour `seat` : la place créée, la date à jour, et de quoi
écrire la ligne « Rendez-vous [jour] à [heure] chez vous ; la salle ouvre 30
minutes avant » — donc l'instant et la zone, pas la phrase. Pour `plan` : les
droits recalculés, parce qu'ils conditionnent immédiatement la lecture. Pour
`payment-method` : le moyen enregistré en lecture seule. Pour `signin` : le profil
ajouté et la session.

### Deux points que la TV seule peut voir

**Un téléviseur est partagé.** Le téléphone qui approuve n'est pas forcément
celui du profil qui a lancé l'appairage : dans un salon, c'est un cas courant, pas
un cas limite. L'appairage doit donc être **lié au profil qui l'a ouvert**, et le
contrat doit dire ce qui se passe si le téléphone est connecté sous une autre
identité : refus avec un code distinct, ou bascule du profil sur la TV ? Les deux
se défendent ; il faut choisir (Q2).

**La connexion n'a pas de session.** Pour l'intention `signin`, la TV appelle
`createPairing` sans être authentifiée. Il lui faut donc une **identité
d'appareil** obtenue au premier lancement, ou bien des points d'entrée anonymes où
le code est le seul secret. La première option est meilleure — elle permet de
nommer l'appareil dans « appareils connectés », de le révoquer, et de limiter le
débit par appareil plutôt que par adresse — mais elle crée une notion
supplémentaire. À trancher (Q3).

---

## Le temps réel

Quatre besoins seulement, et ils n'ont pas la même urgence. Les confondre coûterait
un canal permanent là où un instant servi suffit.

| Besoin | Tolérance | Mécanisme |
|---|---|---|
| **État d'incident** | ≤ 2 s | **poussé, obligatoire** |
| Issue d'un appairage | ≤ 2 s | poussé ou interrogé (Q1) |
| Messages de tchat | ≤ 2 s | poussé, plafonné |
| Compteur de spectateurs | 10 à 30 s | poussé au fil du flux, ou interrogé |
| Passage à l'antenne, ouverture de salle, expiration d'une rediffusion | — | **dérivé, aucun appel** |
| Jauge de places | 30 à 60 s à l'affichage | dérivé, corrigé par la commande |

### Ce qui n'a pas besoin de temps réel, et pourquoi c'est une exigence

Un téléviseur reste allumé des heures sur le même écran. Entre-temps, une date
passe à l'antenne, une salle ouvre, une rediffusion expire. La tentation est de
pousser ces transitions. **Il ne faut pas** : si le contrat livre les instants
(début, fin, fenêtre de rediffusion) et les constantes (ouverture de salle), la
TV dérive l'état localement, à la seconde, sans un seul appel. C'est exactement ce
que fait déjà `stateOf()` dans `helpers.js`, et c'est la raison pour laquelle le
contrat doit porter des **instants et pas des libellés** — une réponse qui livre
« PROGRAMMÉ » est périmée en vol ; une réponse qui livre un instant ne l'est jamais.

La conséquence pratique : un mode veille qui tourne huit heures ne fait **aucune**
requête, et une TV posée sur l'accueil ne rafraîchit que ce qui bouge vraiment.

### L'incident est le seul besoin non négociable

Quand la régie diffuse un écran d'attente, le spectateur regarde une image figée
en se demandant si le problème vient de chez lui ou de la salle. Le dossier en
fait un principe : jamais de spinner muet. Le plan de contrôle publie l'état, le
lecteur pose le voile par-dessus la vidéo intacte — `streaming.md` le dit
explicitement, et c'est la bonne solution : basculer le flux amont serait lent.

Ce que l'état doit porter : le genre (écran d'attente, reportée, annulée,
interrompue), le **message écrit par la régie** avec sa langue, l'instant, et ce
que ça implique pour la place. Quand l'incident se résout, l'état change et le
lecteur retire le voile — la TV ne doit pas avoir à redemander un
`PlaybackTicket`, sinon la reprise se paie d'un rechargement de flux.

### Le tchat : plafonné à la source

Une date à forte audience produit plus de messages que la TV n'en affiche —
elle en montre moins d'une dizaine. Une TV ne peut pas absorber un flux à haut
débit pour en jeter 95 % : chaque message rejeté a coûté du parsing et de
l'allocation sur un appareil qui décode déjà de la vidéo.

Je demande donc un **plafond appliqué côté serveur** : N messages par seconde
maximum sur le canal servi à la TV, avec une sélection faite en amont, et un
historique de rattrapage court à l'entrée (20 messages, pas davantage). Et le flux
est **déjà modéré** : aucun message retiré ne doit atteindre la surface.

### Ce que le lecteur exige du jeton de lecture

`streaming.md` pose le mécanisme : `@arthome/core` dit si la place est valide, le
service `streaming` demande un jeton court au fournisseur, le client le renouvelle
tant que la place tient, le CDN refuse tout ce qui n'est pas signé. Ce que cela
exige de **mon** lecteur, concrètement :

1. **Renouveler sans coupure.** Le jeton doit être renouvelé avant expiration, et
   le renouvellement doit produire une URL que le lecteur peut adopter **sans
   redémarrer la lecture**. Un jeton dont le renouvellement force un rechargement
   de manifeste produit un micro-gel toutes les N minutes, visible sur un plan
   fixe de théâtre. C'est une contrainte sur la **forme** du jeton (dans une
   requête signée, pas dans le chemin), pas sur sa durée.
2. **Échouer en disant pourquoi.** Si le renouvellement est refusé, la TV doit
   distinguer « votre place a expiré », « la limite d'écrans simultanés est
   atteinte », « vous avez été déconnecté depuis un autre appareil » et « nos
   serveurs ne répondent pas ». Quatre messages différents à l'écran, donc quatre
   codes dans l'enveloppe.
3. **Un intervalle de renouvellement court.** C'est le renouvellement qui porte la
   limite de sessions simultanées : si un autre appareil prend la place, la TV ne
   l'apprendra qu'au renouvellement suivant. Au-delà d'une minute, on regarde un
   flux auquel on n'a plus droit. Je demande ≤ 60 s.
4. **Une libération par expiration, pas par commande.** `releasePlayback` ne peut
   pas être garantie : un téléviseur se débranche, une box se coupe. La limite de
   sessions simultanées doit donc reposer sur un **bail qui expire faute de
   renouvellement**, et non sur une libération explicite. Sinon un foyer se retrouve
   bloqué par des sessions fantômes, et la seule issue visible pour le spectateur
   sera « déconnecter un appareil » dans la page compte.
5. **Un seul flux à la fois.** Un décodeur de téléviseur ne décode souvent qu'un
   flux haute définition : l'aperçu vidéo du billboard et la lecture ne peuvent
   pas coexister. Conséquence de contrat : l'aperçu du billboard doit être servi
   en **rendition légère** et déclaré comme tel, et la TV doit pouvoir le démonter
   avant d'ouvrir le lecteur.

### Un seul canal, pas quatre

La TV ne doit ouvrir qu'**un canal temps réel**, multiplexé par sujet, et le
refermer en quittant le lecteur. Quatre connexions (incident, tchat, compteur,
appairage) coûtent quatre reconnexions à chaque hoquet de Wi-Fi domestique et
quatre fois la mémoire de tampon. Si le canal ne peut pas servir l'appairage faute
de session, alors l'appairage passe par interrogation — mais les trois autres
partagent un canal.

---

## Budget d'appels par écran

### La règle

**Un écran = un aller-retour. Deux au maximum, et jamais pour peindre la même
zone de l'écran.**

Trois raisons, dont une seule est esthétique :

1. À trois mètres, un écran qui se remplit par morceaux est illisible : on ne
   balaie pas une télévision du regard comme un téléphone à trente centimètres.
2. Le Wi-Fi d'un téléviseur est le pire du foyer — appareil au fond du salon,
   souvent en 2,4 GHz. Chaque requête supplémentaire est une occasion de plus de
   caler, et certains systèmes TV tuent une requête bloquée au bout de quelques
   secondes sans prévenir.
3. Un téléviseur ne travaille pas en arrière-plan entre deux sessions : **chaque
   ouverture est un démarrage à froid** qui paie l'addition complète. Le budget de
   démarrage sur une clé d'entrée de gamme est de l'ordre de 5 s, dont le contrat
   ne doit pas consommer la moitié.

### Ce que le contrat doit empêcher, et qui se produit aujourd'hui

La maquette charge **l'intégralité du catalogue** et filtre côté client. Les
chiffres, mesurés sur le jeu déterministe de `fixtures.js` :

| Entité | Volume | Poids JSON |
|---|---|---|
| dates | **1 814** | **1,79 Mo** |
| spectacles | 1 315 | ~1,1 Mo |
| artistes | 213 | — |
| salles | 69 | — |
| public (tchat) | 934 | — |
| une date | — | ~890 octets |

1,8 Mo de JSON à parser et à garder en mémoire sur un appareil qui dispose de
300 à 500 Mo pour tout, vidéo comprise, c'est un plantage ou une éviction d'images
en boucle. C'est acceptable dans une maquette ; c'est la chose que le contrat doit
rendre impossible.

**Règle : la TV ne filtre jamais le catalogue.** Elle demande un modèle de lecture
déjà composé, déjà ordonné, déjà tronqué. Toutes les compositions que la maquette
fait aujourd'hui côté client — les rangées d'accueil, la grille du soir, les
rangées par sous-genre, le classement de Mes places, le choix du billboard, le
filtrage du profil enfant — appartiennent au serveur.

### Le budget, écran par écran

| Écran | Appels | Ce que cela exige du contrat |
|---|---|---|
| `boot` | **1** | `ViewerContext` complet : profils de l'appareil, droits, préférences, constantes de domaine, version du catalogue de libellés. Les libellés eux-mêmes viennent de l'instantané embarqué — le contrôle de version ne bloque pas l'affichage |
| `gate` | **0** | les profils sont arrivés à l'amorçage |
| `home` | **1** | billboard + 10 à 13 rangées, 6 à 8 cartes visibles chacune, curseur par rangée. 60 à 100 cartes ≈ 50 à 90 Ko : tenable. La composition et l'ordre sont serveur |
| `live` | **1** | le direct en tête + la grille du soir **déjà groupée par heure locale du spectateur**. Le groupement dépend du fuseau : la TV l'envoie, le serveur groupe |
| `categories` | **1** | les 21 tuiles avec famille, rang, nombre de dates et nombre de directs. **Pas un appel par tuile** |
| `category` | **1** | hero + rangées de sous-genres déjà choisies et ordonnées |
| `artists` | **1** + curseur | 213 artistes : une première page suffit à remplir la grille |
| `artist` | **1** | fiche + dates à venir + rediffusions, dans la même réponse |
| `title` | **1** | fiche + série + même artiste + suggestions. **Appelé en pré-chargement** (voir ci-dessous), donc il doit être bon marché et porter une validation de cache |
| `book` | **0 ou 1** | la date est déjà en main. Un seul appel légitime : rafraîchir la jauge et le prix avant de montrer un total |
| `pay` | **1** + attente | `createPairing`, puis l'attente |
| `confirm` | **0** | tout vient de `PairingOutcome`. C'est l'exigence la plus stricte du parcours : une confirmation qui charge est une confirmation qu'on ne croit pas |
| `player` | **1** + renouvellements | `PlaybackTicket` complet. Chapitres, pistes, régime de tchat, incident, reprise, bord du direct : **tout dans la même réponse**. Budget : échange de droit et de jeton ≤ 1 s, sur un budget total de ~10 s jusqu'à la première image |
| `dateinfo` | **0** | dérivé du `PlaybackTicket` |
| `tickets` | **1** | déjà ordonné par le serveur |
| `list`, `replays` | **1** chacun | curseur |
| `plans` | **1** | trois formules, leurs droits, la remise sur les places |
| `account` | **1** | identité, abonnement, moyen de paiement, appareils, préférences |
| `search` | 1 par état de requête | voir plus bas |
| `help` | **0** | embarqué |
| `ambient` | **0** | réemploi des affiches déjà en main. Ce mode tourne des heures : il ne doit rien demander |

### Pré-chargement : oui, mais borné

Le confort TV veut qu'on précharge la fiche de la carte focalisée pour que OK
ouvre instantanément. Mais un pré-chargement agressif sur un appareil à mémoire
contrainte provoque exactement ce qu'il prétend éviter : images en cache + JSON +
tampon vidéo, puis éviction et rechargement.

Ma position : **au plus l'élément focalisé, et seulement après stabilisation du
focus** (le spectateur qui maintient une touche traverse une rangée en une
seconde ; précharger chaque carte traversée serait vingt requêtes pour rien). Ce
que cela exige du contrat : que `title` soit bon marché, et qu'il porte de quoi
valider un cache — sans quoi le pré-chargement se paie deux fois.

### Fraîcheur : elle appartient au contrat, pas aux cinq surfaces

Si le contrat ne dit pas combien de temps une réponse reste bonne, cinq surfaces
inventeront cinq politiques et la TV inventera la pire, faute de pouvoir mesurer.
Je demande une **indication de fraîcheur par modèle de lecture**, que la TV mappe
directement sur la fraîcheur de son cache client :

| Modèle | Fraîcheur demandée |
|---|---|
| taxonomie, disciplines | 24 h |
| `category`, `artist`, `plans` | 5 min |
| `home`, `tickets`, `list`, `replays` | 60 s |
| `live` | 15 s |
| `account` | 5 min |
| `PlaybackTicket` | jamais mis en cache |

### Le corollaire : les commandes renvoient l'état

Déjà dit dans *Les commandes*, mais c'est ici qu'il pèse : une commande qui ne
renvoie rien transforme chaque action en **deux** allers-retours et fait repeindre
l'écran en deux temps. Sur TV, c'est la différence entre une application et un
site affiché en grand.

---

## Pagination et volumes

**Curseur partout** (décision projet), tri déterministe avec départage par
identifiant. Trois précisions que la surface impose :

**1. La taille de page n'est pas la même selon la forme.** Une rangée horizontale
en montre six à huit et doit pouvoir avancer sans à-coup : 20 par page convient.
Une grille (recherche, artistes, Ma liste) en montre davantage : 30. La taille doit
donc être un **paramètre de requête avec un maximum serveur**, pas une constante
figée par surface — sinon la TV paiera le format du web ou du mobile.

**2. L'enveloppe de page doit porter un total.** Chaque rangée affiche un compteur
à côté de son titre. Avec une page de 20 sur une rangée de 60, `items.length` est
faux et le compteur devient un littéral parallèle — exactement ce que le principe
n°1 du dossier interdit. `total` (ou une borne déclarée telle) est donc une
exigence, pas un confort.

**3. Les volumes réels, mesurés.**

| Ensemble | Volume |
|---|---|
| disciplines | 21 (14 Musique, 7 Scène) |
| sous-genres | 176 |
| étiquettes | 205 |
| dates | 1 814 |
| spectacles | 1 315 |
| artistes | 213 |
| salles | 69 |
| profils par appareil | 5 au maximum |
| appareils par compte | 1 à 4 observés, sans plafond déclaré |

Seuls les 21 tuiles de disciplines sont servies intégralement, parce que c'est un
écran entier et un ensemble borné. Tout le reste est paginé.

**4. Ce que la virtualisation exige du contrat.** Une rangée TV est virtualisée :
seules quelques cartes existent en mémoire à un instant donné, et l'usage veut
qu'on garde des identifiants dans les éléments de liste et qu'on aille chercher le
détail à la demande. Cela confirme la séparation `DateCard` / `DateDetail` et
interdit à la carte de grossir : chaque champ ajouté à `DateCard` est multiplié par
le nombre de cartes gardées en mémoire, sur toutes les rangées.

**5. Le tchat.** Historique de rattrapage court à l'entrée (20 messages), puis flux
plafonné. Pas de pagination remontante : personne ne remonte un tchat de direct à
la télécommande.

**6. Le mode veille.** Il itère sur des affiches. Il doit réemployer celles déjà en
main — une réserve de huit suffit — et **ne rien demander**. Un mode ambiant qui
pagine est un mode ambiant qui réveille le Wi-Fi toutes les sept secondes pendant
la nuit.

---

## États d'erreur et de chargement

### La distinction que l'enveloppe doit porter

Le dossier l'impose et la copie de la TV l'applique déjà : le message doit
distinguer « **votre** connexion » de « **nos** serveurs ». Un client ne peut pas
faire cette distinction depuis un délai d'attente : les deux se ressemblent.

Ce que j'en tire pour le contrat :

- un échec **de transport** (pas de réponse, DNS, socket) est interprété par la TV
  comme « votre connexion » ;
- **toute** réponse du système, y compris en surcharge, doit porter l'enveloppe
  d'erreur avec son code et son identifiant de trace — c'est ce qui permet de dire
  « nos serveurs ». Une passerelle qui renvoie une page d'erreur brute rend la
  distinction impossible : la TV affichera « votre connexion » alors que c'est
  faux, et le spectateur ira redémarrer sa box.

Cette contrainte remonte donc jusqu'à la passerelle d'infrastructure, pas
seulement au BFF.

### Les codes d'erreur que cette surface doit savoir distinguer

Chacun produit un écran différent. Un code générique en produirait un faux.

| Situation | Ce que la TV doit dire |
|---|---|
| pas de place pour cette date | dit **avant** l'ouverture du lecteur, jamais après |
| salle pas encore ouverte | avec le temps restant, dérivé |
| hors territoire | en clair, **avec la raison** |
| abonnement requis | avec ce que la formule ouvre |
| aucune rediffusion pour cette date | distinct de « rediffusion expirée » |
| rediffusion expirée | distinct du précédent |
| complet | distinct de « liste d'attente » |
| limite d'écrans simultanés atteinte | avec la possibilité de libérer |
| place expirée pendant la lecture | distinct d'une erreur réseau |
| appairage expiré / refusé / annulé | trois messages distincts |
| achat approuvé mais échoué | ne jamais afficher « réservée » |

### Le géo-blocage

`rights.scope` et la liste de territoires suffisent à décider ; la **raison** doit
être un code, pas une phrase. Le jeu actuel porte des libellés rédigés en français
et en anglais dans la donnée (`blackoutReasons`), alors que tout le reste passe par
`enums.*`. C'est une fuite d'i18n : voir *Incohérences relevées*, point 4.

### L'amorçage : le cas où la TV n'a rien, pas même une langue

Il existe un instant, avant la première réponse, où la TV ne connaît ni le profil,
ni la langue, ni les libellés. Si l'appel d'amorçage échoue, elle doit quand même
afficher un message lisible — pas un code brut, pas un écran vide.

C'est ce qui rend l'**instantané i18n embarqué au build obligatoire**, et pas
seulement souhaitable. Mesuré sur le jeu actuel : les trois fichiers que le
storefront charge (`storefront`, `taxonomy`, `system`) représentent **1 126 clés,
54 Ko bruts, 15,6 Ko compressés** pour une langue. C'est négligeable devant le
bundle, et c'est la seule chose qui garantit qu'aucun code brut n'atteindra jamais
l'écran — ce qui compte d'autant plus ici qu'une revue de magasin TV est lente et
qu'un défaut de libellé resterait affiché des semaines.

Le catalogue servi dynamiquement se superpose ensuite, par artefacts versionnés
immuables. Il ne doit **jamais** bloquer le premier rendu.

### Chargement et vide

Les squelettes et les états vides sont de la présentation et n'appellent rien du
contrat, à une exception près : l'**action qui sort de l'impasse** (« Voir les
catégories », « Parcourir ») est un choix éditorial. Elle doit être un **code
d'action** servi avec l'état vide, pas une phrase, et pas une constante recopiée
sur cinq surfaces.

### Rejeu et idempotence

Un téléviseur perd le réseau plus souvent qu'un téléphone. Toute commande rejouée
après un hoquet doit être sûre : c'est l'objet de `Idempotency-Key`, et c'est
particulièrement vrai des commandes déclenchées par appairage, où le téléphone et
la TV peuvent tous deux relancer.

---

## Contraintes propres à la TV

Seulement celles qui contraignent le contrat.

### 1. Aucune saisie au-delà de six caractères

Tout ce qui demande à écrire passe par l'appairage. Cela vide de la surface :
l'inscription, le mot de passe, la 2FA, la carte bancaire, l'adresse de livraison
de la boutique, l'écriture dans le tchat, le formulaire de support. Le contrat
n'a donc **aucune commande d'écriture de texte libre** à servir à la TV, sauf la
recherche — et la recherche n'écrit rien.

Corollaire souvent oublié : la **recherche vocale** est prévue par le cahier des
charges. Si elle est retenue, elle produit une chaîne comme le clavier et emprunte
le même point d'entrée. Rien de nouveau au contrat, mais il faut le confirmer
plutôt que de l'inventer plus tard.

### 2. Cinq touches : les facettes deviennent des rangées

Déjà dit sous `CategoryScreen`, répété ici parce que c'est la divergence de forme
la plus structurante entre la TV et le web : **la TV ne consomme pas l'API de
facettes.** Elle consomme des rangées composées. Le BFF storefront doit donc servir
deux modèles de lecture pour le même contenu, et c'est un choix assumé, pas un
accident.

### 3. Trois mètres : un aller-retour, six informations

Le budget d'appels en découle (section dédiée), et le plafond de six informations
par carte borne `DateCard`. Ce n'est pas une contrainte esthétique déguisée : un
champ de plus sur la carte est un champ de plus × le nombre de cartes gardées en
mémoire.

### 4. Mémoire comptée

Chiffres de référence : beaucoup d'appareils du parc ont 1 à 1,5 Go **au total**,
dont l'application reçoit 300 à 500 Mo ; un décodage 4K en consomme 100 à 200 à
lui seul. Trois exigences en découlent, toutes portées par le contrat :

- **médias en renditions déclarées**, aux tailles réellement affichées — pas de
  gabarit de largeur que le client remplit ;
- **cartes maigres**, détails à la demande ;
- **tailles de page bornées côté serveur**, pour qu'un paramètre client ne puisse
  pas demander 500 éléments.

### 5. Parc hétérogène : le vocabulaire fermé doit tolérer l'inconnu

C'est la contrainte la plus spécifique de cette surface, et elle est de premier
ordre.

Une revue de magasin TV est lente, et le parc se met à jour mal : une version
publiée aujourd'hui tournera encore dans des salons dans un an. Le jour où le
catalogue gagne une 22ᵉ discipline, une nouvelle issue de date, un nouveau régime
de tchat ou un nouveau droit d'abonnement, **les téléviseurs anciens le
recevront**.

Or la validation stricte par énumération **rejette** une valeur inconnue. Un
schéma qui refuse un membre de vocabulaire inédit ne dégrade pas l'affichage d'une
carte : il fait échouer la validation de la **page entière**, et la TV n'affiche
plus rien. Une date ajoutée avec une nouvelle valeur d'issue viderait l'accueil
d'une partie du parc.

**Exigence** : pour chaque vocabulaire fermé, le contrat doit déclarer le
comportement attendu devant une valeur inconnue — et ce comportement doit être
« conserver la valeur brute et la traiter comme neutre », jamais « rejeter ».
Concrètement, côté client, les énumérations transportées sont validées de façon
tolérante et l'i18n retombe sur un libellé générique plutôt que sur un code brut.
Cela ne dispense pas de valider : cela déplace la sévérité du **membre** vers la
**forme**.

C'est la seule chose de ce document qui, si elle est mal faite, produit un écran
noir chez des gens qui ne peuvent rien y faire.

### 6. Le coût de zod, mesuré

Mesure demandée explicitement. Réalisée sur **zod 4.6.5**, agrégée par esbuild
(`--bundle --minify --format=esm`), puis compressée en `gzip -9`. Le jeu de
schémas « réaliste » reprend les DTO TV de ce document : une page curseur de
cartes de date, avec identifiants, instants ISO, quatre énumérations, montants et
URL.

| Forme d'import | Minifié | Compressé |
|---|---|---|
| `import { z } from 'zod'` — **un** schéma trivial | 453 056 o | **92 097 o** |
| `import { z } from 'zod'` — 3 schémas, ~20 champs | 453 677 o | **92 364 o** |
| `import { object, string } from 'zod'` — un schéma | 84 276 o | 24 732 o |
| `import * as z from 'zod/mini'` — un schéma trivial | 12 379 o | **4 440 o** |
| `import * as z from 'zod/mini'` — 3 schémas, ~20 champs | 22 996 o | **7 682 o** |

Trois lectures, et elles changent une décision de conditionnement :

1. **Le coût est fixe, pas marginal.** Entre un schéma trivial et vingt champs
   répartis sur trois schémas, l'écart est de 267 octets compressés. Ajouter des
   DTO ne coûte rien ; **importer `z` coûte tout**. On ne peut donc pas « limiter
   le nombre de schémas sur la TV » pour réduire la facture : ça ne marchera pas.
2. **L'espace de noms `z` est le coupable.** Le même schéma via des imports nommés
   tombe de 92 Ko à 24,7 Ko compressés. C'est un cas d'école d'import barillet, et
   il se corrige sans changer de bibliothèque.
3. **`zod/mini` divise par vingt.** 4,4 Ko contre 92 Ko compressés à l'entrée, et
   7,7 Ko contre 92,4 Ko sur un jeu réaliste.

92 Ko compressés — plus de 450 Ko à analyser et à compiler au démarrage — sur une
clé HDMI dont le budget de démarrage à froid est de quelques secondes, c'est une
dépense que rien ne justifie : la TV ne fait que **décoder** des réponses. Elle n'a
besoin ni des messages d'erreur riches, ni de la surface complète de l'API. Et les
messages laconiques de `zod/mini` (« Invalid input ») ne sont pas une perte ici,
puisque la décision « i18n par codes » interdit de toute façon d'afficher un
message de bibliothèque.

**Ce que je demande**, sans remettre en cause la décision « zod valide tout,
l'OpenAPI est généré depuis zod » :

- que `@arthome/contracts` expose une **entrée alternative sans barillet** pour les
  clients contraints — la même source de schémas, exportée par symboles nommés ou
  en `zod/mini` — et que le générateur d'OpenAPI, qui tourne côté outillage, garde
  la forme complète ;
- ou, à défaut, que les applications aient l'interdiction écrite d'importer `z`
  et l'obligation d'importer les symboles utilisés.

La décision n'est pas contredite ; c'est son **conditionnement** qui doit tenir
compte de la surface la plus contrainte. C'est exactement ce que cette mesure
était censée établir.

### 7. Un appareil partagé, des profils individuels

La TV n'a pas de « l'utilisateur » : elle a un salon. Trois conséquences de
contrat :

- les droits sont portés par le **profil**, jamais par l'appareil ;
- le catalogue du profil enfant est filtré **côté serveur** ;
- la déconnexion est **par profil** — « les autres comptes restent connectés ».
  Révoquer l'appareil est une commande distincte, et elle vit dans la page compte.

### 8. Le lecteur et le jeton signé

Traité sous *Le temps réel*. Le point qui remonte le plus haut : le
`PlaybackTicket` doit porter le protocole, le système de DRM et le plafond de
qualité **choisis par le serveur pour cet appareil**. Un parc qui va de la clé
HDMI à faible sécurité matérielle au boîtier haut de gamme ne se sert pas d'un
seul paquet de flux, et un client qui devine se trompera sur les appareils que je
ne peux pas tester.

---

## Incohérences relevées

Relevées en lisant `shared/` et la maquette TV. **Aucune n'est appliquée** ; elles
sont signalées. Les sept écarts de la famille D de `corrections-handoff.md` sont
connus et non répétés ici, à l'exception de D1 que j'ai effectivement rencontré
(`languageDependency` : le vocabulaire déclaré `none | light | helpful` ne contient
pas `essential`, qui est pourtant la valeur dont dépend `hasLanguageBarrier` et que
cinq spectacles portent ; `light` n'est employé nulle part).

**1. Trois vocabulaires d'abonnement, disjoints — et une règle qui tombe en
silence.** C'est l'écart le plus sérieux que j'aie trouvé, et il n'est pas dans
l'errata.

| Source | Valeurs | Prix |
|---|---|---|
| `catalogue.json` → `plans[]` | `free`, `pass`, `premium` | 0, 12, 24 |
| `catalogue.json` → `accounts[].plan` | `season`, `monthly`, `none` | — |
| maquette TV, page compte | `saison`, `mecene` | 14, 39 |

`i18n/storefront.json` traduit les **six** identifiants, ce qui masque le
problème. Conséquence directe : `helpers.planOf(account)` fait
`plans().filter(p => p.id === account.plan)[0] || plans()[0]` — aucun compte ne
correspond jamais, **tous retombent sur `free`**. La page compte et la page
abonnements de la TV afficheraient donc la mauvaise formule pour tout le monde, et
les droits `opens[]` qui conditionnent l'accès à la lecture seraient ceux de la
formule gratuite. Un seul vocabulaire doit faire foi au contrat.

**2. La page `plans` est déclarée et absente.** Le cahier des charges TV décrit une
page Abonnements (§9) et une barre latérale à dix entrées dont « Abonnements » et
« Compte » (§ structure). La maquette n'expose que huit entrées de navigation et
aucune page d'abonnements — alors que l'intention de paiement `plan` existe bien
dans l'écran de confirmation. Un parcours d'achat sans point de départ.

**3. Le décalage du spectateur n'existe pas dans la donnée.** La maquette TV
calcule l'heure de salle par `venue.utcOffsetMin - fx.geography.viewerUtcOffsetMin`.
Ce second champ **n'existe nulle part** dans `catalogue.json` ni dans
`fixtures.js` : il vaut donc 0, et « l'heure à la salle » est en réalité calculée
contre UTC, pas contre le spectateur. L'écart est dans la maquette et non dans
`shared/`, mais il démontre une lacune de contrat : **la surface n'a aucune entrée
pour le fuseau du spectateur**, alors que la règle « deux fuseaux » est un principe
du dossier. La TV doit envoyer son identifiant de zone IANA et recevoir celui de
la salle.

**4. Les raisons de géo-blocage sont rédigées, pas codées.**
`geography.rightsPolicy.blackoutReasons[]` porte `label` et `labelEn` — du texte
rédigé dans la donnée — alors que tout le reste du vocabulaire passe par
`enums.*` et `A.enumLabel()`. `helpers.blackoutReason()` lit d'ailleurs ces champs
directement. C'est une fuite d'i18n dans le modèle, et elle est exactement du
genre que la décision « i18n par codes » existe pour interdire.

**5. L'objet public d'une date porte des données de billetterie et de studio.**
Une date générée expose `prices[].sold`, `prices[].revenue`, `seats.sold`,
`publication` et `publishedBy`. C'est cohérent pour un générateur qui construit
studio-d'abord, mais ce sont des recettes et des références de régie sur l'objet
que lit un client public. Le contrat du storefront ne doit pas les porter.

**6. Le classement éditorial des sous-genres est calculé sur la surface.** La page
discipline de la TV ordonne ses rangées par un « intérêt » qu'elle calcule
elle-même à partir de `viewers`, `replayViews` et `seats.sold`. C'est un classement
éditorial produit par un client — contre « aucune valeur calculée deux fois » — et
il s'appuie sur une donnée de billetterie (point 5). Le serveur doit livrer
l'ordre.

**7. `devices` a deux formes sous un seul nom.** `catalogue.json` déclare
`accounts[].devices` comme un **nombre** (3, 2, 1, 1) ; `fixtures.js` le remplace
par une **liste** d'objets. `helpers.devicesOf()` ne fonctionne que sur la seconde.
Deux formes sous un identifiant, ce qui est précisément le genre de collision que
le portage doit trancher.

**8. La durée de validité du code n'existe que dans une chaîne de copie.**
« CODE VALABLE 15 MINUTES » est un libellé d'interface. Aucune donnée partagée ne
porte cette durée, et le code affiché est un littéral (`H4T9RD`, `K7QM2P`). La
durée est une politique : elle appartient au contrat, servie dans la réponse
d'appairage.

**9. L'alphabet du code court n'est déclaré nulle part**, et les deux codes de la
maquette contiennent des glyphes confusables (`0`/`O`, `1`/`I`, `5`/`S`, `8`/`B`).
Voir la section appairage : c'est une exigence de contrat.

**10. L'action Partager ne mène nulle part.** Sur la fiche d'une date, elle est
câblée vers l'écran de paiement. Sans conséquence de conception, mais elle révèle
qu'**aucune commande de partage n'a jamais été définie** — et sur TV, partager ne
peut raisonnablement vouloir dire qu'un QR vers l'URL publique de la date, donc une
URL canonique servie par le contrat.

**11. Ouverture de salle et délai d'aperçu sont des constantes de donnée.**
`roomOpensBeforeMin: 30` et `previewIdleSec: 4` vivent dans `catalogue.json`, ce
qui est juste. La maquette TV, elle, recopie 30 minutes dans plusieurs libellés et
480 000 ms pour la veille. Ces constantes doivent arriver par le contrat
(`ViewerContext`), sinon elles divergeront entre cinq surfaces le jour où l'une
d'elles change.

---

## Ce que je ne peux pas obtenir seul

Questions adressées au backend. Chacune bloque une décision de ma surface.

**Q1 — Comment la TV apprend-elle qu'un appairage a abouti ?** Interrogation
périodique conforme à RFC 8628, canal temps réel partagé, ou flux dédié ? Mon
exigence est la bascule en deux secondes au plus et un rythme d'interrogation que
le serveur puisse ralentir. Si c'est le canal temps réel, il doit accepter une
identité d'**appareil** — car pendant la connexion, la TV n'a pas encore de
session. *Bloque : l'architecture de l'écran d'attente, et le budget de connexions
de la surface.*

**Q2 — Un téléviseur est partagé : à quoi l'appairage est-il lié ?** Si le
téléphone qui scanne est connecté sous une autre identité que le profil qui a
ouvert l'appairage sur la TV — cas courant dans un salon — que se passe-t-il ?
Refus avec un code distinct, ou bascule du profil sur la TV ? *Bloque : le
comportement de `pay` et de `signin`, et le message affiché.*

**Q3 — La TV a-t-elle une identité d'appareil avant toute session ?** Il lui en
faut une pour ouvrir un appairage de connexion, pour se nommer dans « appareils
connectés », pour être révoquée, et pour porter une limite de débit. Est-ce une
notion du contrat, ou les points d'entrée d'appairage sont-ils anonymes avec le
code pour seul secret ? *Bloque : le premier lancement, et `revokeDevice`.*

**Q4 — Quelle durée de validité, et par quoi est-elle portée ?** Une durée unique
pour les cinq intentions, ou une durée par intention ? Quinze minutes pour un
paiement me paraît long : la jauge affichée à la réservation n'est plus vraie.
Dans tous les cas, elle doit être servie et non codée. *Bloque : le comportement de
renouvellement et le message d'expiration.*

**Q5 — Les 21 disciplines : le contrat porte-t-il une sélection éditoriale de tête
de page ?** Le rang de `taxonomy.json` suffit à ordonner, mais 21 tuiles ne
tiennent pas sur un écran comme 9. Soit la TV groupe par univers et se parcourt
verticalement, soit le contrat porte en plus une sélection courte, **écrite comme
une règle et servie**. Je préfère la première, avec la seconde en champ optionnel.
*Bloque : la forme de `categories`.*

**Q6 — Les champs par spectateur rendent-ils une rangée non mutualisable ?** La
carte doit porter « détient une place », « peut regarder maintenant » et « position
de reprise », sinon la TV ne peut pas respecter le principe « ne jamais proposer
une place à qui l'a déjà » — et l'apprendre exigerait un second appel, ce que mon
budget interdit. Mais ces champs sont propres au spectateur, donc une rangée
composée n'est plus mutualisable en périphérie. Trois issues : accepter un cache
par spectateur ; séparer un corps public et une surcouche fine par spectateur (au
prix d'un second aller-retour que je refuse par défaut) ; ou composer au BFF avec
un cache court. Laquelle ? *Bloque : la forme de `DateCard` et tout le budget
d'appels.*

**Q7 — Qui compose les rangées, et où ?** Les rangées d'accueil, la grille du soir
groupée par heure **locale du spectateur**, les rangées par sous-genre déjà
ordonnées, le classement de Mes places : je demande que tout cela vienne fait. Cela
suppose des modèles de lecture projetés là où le BFF les lit — ou un BFF qui
compose à la volée. Le dossier annonce que l'usage de gRPC se décidera sur preuve,
en comptant les appels synchrones BFF → service : voici ma contribution au compte.
En lecture, si les modèles sont projetés, la TV n'en exige **aucun**. *Bloque :
`home`, `live`, `category`, `tickets`.*

**Q8 — Les préférences sont-elles portées par le profil ou par l'appareil ?**
Langue d'interface, sous-titres par défaut, taille des sous-titres, description
audio, réduction des animations, aperçu vidéo automatique. La taille des
sous-titres et la réduction des animations dépendent du téléviseur et de la pièce ;
la langue dépend de la personne. Une seule portée, ou deux ? *Bloque :
`updatePreferences` et `ViewerContext`.*

**Q9 — Le jeton de lecture : quelle forme, quel intervalle, quelle libération ?**
Trois points précis : (a) le renouvellement produit-il une URL adoptable **sans
redémarrer la lecture** ? (b) l'intervalle est-il assez court — ≤ 60 s — pour que
la limite de sessions simultanées soit effective ? (c) la libération d'une session
repose-t-elle sur un bail qui expire, plutôt que sur un appel de fin que la TV ne
pourra pas toujours passer ? *Bloque : l'architecture du lecteur.*

**Q10 — Quelle URL canonique pour partager une date ?** Sur TV, partager ne peut
être qu'un QR vers la page publique. Cette URL doit être servie par le contrat et
non construite par la surface. Existe-t-elle ? *Bloque : l'action Partager, qui
n'est aujourd'hui câblée nulle part.*

**Q11 — Quel plafond de débit sur le tchat servi à une TV, et quel quota de
réactions ?** Je demande un plafond appliqué **côté serveur** — la TV ne peut pas
absorber un flux pour en jeter 95 % — et un quota de réactions **renvoyé dans la
réponse**, pour que la TV désactive le contrôle au lieu de le laisser échouer.
*Bloque : le panneau de tchat du lecteur.*

**Q12 — Le contrat déclare-t-il le comportement attendu devant une valeur
d'énumération inconnue ?** C'est la question dont dépend la survie du parc : une
validation stricte fait échouer une page entière quand le catalogue gagne une
22ᵉ discipline ou une nouvelle issue. J'ai besoin que le contrat écrive
« conserver et traiter comme neutre », et que la sévérité porte sur la forme et
non sur le membre. *Bloque : la stratégie de validation client, et indirectement
la question zod.*

**Q13 — `@arthome/contracts` peut-il exposer une entrée sans barillet pour les
clients contraints ?** Mesure à l'appui : `import { z } from 'zod'` coûte 92 Ko
compressés (453 Ko à analyser au démarrage) et ce coût est **fixe** ; les mêmes
schémas via `zod/mini` coûtent 7,7 Ko. Sur la surface la plus contrainte du projet,
c'est la différence entre un démarrage à froid confortable et un démarrage
laborieux — pour une bibliothèque dont la TV n'utilise que le décodage. La décision
« zod partout » n'est pas contestée ; c'est le **conditionnement** que je demande à
adapter. *Bloque : le budget de démarrage de la surface.*

**Q14 — Les constantes de domaine sont-elles servies ?** Ouverture de salle
(30 min), délai d'aperçu du billboard (4 s), seuil de « dernières places », délai
d'annulation d'une réservation (« jusqu'à 1 h avant »), délai de crédit d'un
remboursement (« 3 à 5 jours ouvrés »). Toutes sont aujourd'hui recopiées dans des
libellés d'écran. Si elles ne viennent pas du contrat, elles divergeront entre cinq
surfaces. *Bloque : `ViewerContext`, `tickets`, `book`.*
