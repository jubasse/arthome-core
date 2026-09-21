# Besoins — studio mobile (Angular + Ionic + Capacitor)

> Ce que le contrat doit porter et garantir pour l'outil de garde. Aucune description d'écran :
> les maquettes sont la conception. Ce document dit **ce dont la surface a besoin**, et pourquoi
> la coquille native et la situation de garde rendent certains besoins non négociables.
>
> Sources lues : `mockups/Studio Mobile.dc.html` (par fragments), `shared/helpers.js`,
> `shared/studio-data.js`, `shared/catalogue.json`, `shared/fixtures.js`, `shared/i18n/studio.json`,
> `README.md` §7, `streaming.md`, `architecture/corrections-handoff.md`.
>
> Orchestrateurs chargés avant toute décision : `ionic-capacitor-how-to`, puis `angular-how-to`
> (D-001). Aucune de leurs règles ne contredit une décision du projet ; là où elles pèsent sur le
> contrat, elles sont citées.

---

## Inventaire des écrans

**Même arbre que le studio web.** Le relevé du chef est exact et complet. Je le confirme et le
complète ci-dessous ; je ne redécris pas les écrans que le studio web couvrira.

### Pages

`agenda` · `dashboard` · `moderation` · `crew` · `events` · `stream` · `stats` · `tickets` ·
`store` · `replays` · `payouts` · `journal` · `settings` · `help` · `regie` · `event` · `wizard` ·
`inbox` — dix-huit, dont quatorze au menu (`ORDER`) et quatre hors menu.

La distinction entre les deux familles n'est pas cosmétique, elle est portée par deux tables
distinctes de la maquette et elle commande l'autorisation :

| Famille | Table | Ce que c'est |
|---|---|---|
| Pages de menu | `ACCESS[role]` | ce qu'un rôle **ouvre**, et ce qui peuple la barre et la feuille |
| Pages contextuelles | `FREE[role]` | `event`, `wizard`, `regie` — atteintes **depuis** une autre page, jamais listées |
| Boîte | en dur | `inbox` est ajoutée à `FREE` pour tous, sans condition de rôle |

### Sous-onglets relevés

| Page | Sous-onglets | Origine |
|---|---|---|
| `moderation` | `live` · `queue` · `filter` · `sanct` | fixes |
| `crew` | `members` · `matrix` · `guests` · `log` | fixes |
| `regie` | `ov` · `chat` · `crew` · `q` | fixes |
| **`event`** | `public` · `tickets` · `chat` · `tech` · `crew` · `replay` | **dérivés du rôle** |
| `events` | `à venir` / `passé` | scission temporelle, pas des onglets |
| `stats` | `audience` / `series`, chacun en graphique ou en table | fixes |

**Le sixième cas est le plus important et manquait au relevé.** Les six onglets de la fiche de date
portent chacun une liste de rôles (`public` : artist, prod — `tickets` : artist, prod, tres —
`chat` : artist, prod, mod — `tech` : artist, prod, regie, coord — `crew` : artist, prod, coord —
`replay` : artist, prod). Une septième entrée, « vue d'ensemble », n'apparaît que si trois onglets
au moins sont ouverts à la personne. **Un écran de détail dont la découpe même dépend des droits
effectifs** : ce n'est pas seulement la navigation racine qui doit connaître les droits avant de
peindre, c'est aussi chaque fiche.

### Feuilles de dialogue

Recensées, parce que chacune est un point de commande et non un ornement : `more` (le reste des
pages), `chan` (sélecteur de chaîne), `account` (compte et fuseau de lecture), `states`, `sort`,
`move` (transition d'état), `dup`, `del`, `banword`, `mute`, `crewdate`, `slot`, `role`, `invite`,
`refund`, `slug`, `danger`, `confirm`.

### Six personas

`artist` · `prod` · `regie` · `mod` · `coord` · `tres`. **Ce sont six projections de huit rôles
réels** (`memberRoles` : artist, production, coordination, director, video, sound, moderation,
treasury). Voir « Incohérences relevées », point 3 : la projection n'est pas sûre pour
l'autorisation.

---

## Ce qui distingue cette surface du studio web

Cinq différences. Aucune n'est une question de taille d'écran ; toutes les cinq changent ce que le
contrat doit porter.

### 1. La racine n'est pas une chaîne, c'est une personne

Le studio web s'ouvre sur une chaîne et y reste. Le studio mobile s'ouvre sur `agenda` — « **vos
gardes, toutes chaînes** » — pour les rôles `regie` et `mod`. Cet écran agrège, **toutes chaînes
confondues**, les dates que la personne doit tenir : titre, chaîne, rôle qu'elle y tient, jour,
heure de salle **et** heure chez elle, état de la date, durée annoncée. Il détecte de surcroît les
**gardes qui se recouvrent** (« deux flux à tenir ce soir »).

**Ce que le contrat doit porter** : un modèle de lecture **centré sur la personne, pas sur la
chaîne**. Une seule requête doit rendre l'intégralité des gardes de la personne sur une fenêtre
temporelle, avec pour chacune l'identifiant de chaîne, l'identifiant de date, le rôle tenu **sur
cette chaîne-là**, l'instant de lever de rideau et le fuseau IANA de la salle. Sans cela, l'écran
d'accueil de l'outil de garde exige N requêtes, une par chaîne, sur le réseau d'une salle.

Le chevauchement doit être **calculé une seule fois** : c'est une règle de domaine (deux gardes se
recouvrent si leurs fenêtres antenne se chevauchent, fenêtre = lever de rideau − ouverture des
portes → fin annoncée). Elle appartient à `@arthome/core`, pas à deux surfaces.

### 2. Quatre onglets au plus, dérivés du rôle — donc les droits avant le premier rendu

La barre du bas se calcule ainsi, dans cet ordre exact :

```
roles      = rôle tenu sur la chaîne courante  ∪  second rôle éventuel
union      = ⋃ ACCESS[r] pour r ∈ roles          « l'accès est l'union des rôles, jamais un rang »
allowed    = ORDER filtré par union              ordre canonique, pas l'ordre d'arrivée
free       = ⋃ FREE[r] + inbox
pref       = ⋃ TAB_PREF[r], dédupliqué           ordre de préférence par rôle
tabs       = pref ∩ (allowed ∪ free), 4 au plus  + une entrée « Plus » toujours présente
```

Trois conséquences pour le contrat, et elles sont lourdes :

**a. Les droits effectifs doivent arriver avant la première peinture.** L'application ne peut pas
dessiner sa navigation puis la corriger : la barre d'onglets est la carte mentale de la personne en
garde, et une barre qui change sous le pouce pendant un direct est une faute. Il faut donc **une
ressource d'amorçage unique**, lue avant l'activation de la première route, qui porte : le compte,
**toutes** les chaînes où la personne a un accès, et pour chacune le **jeu de rôles effectif**.
Une lecture par chaîne est exclue — changer de chaîne recalcule toute la navigation, et un aller-
retour réseau entre le geste et la barre repeinte est inacceptable en garde.

**b. `ACCESS`/`FREE` sont de l'autorisation, `TAB_PREF`/`ORDER` sont de la présentation.**
L'autorisation vient du contrat et ne se devine pas côté client. L'ordre de préférence, lui, est
une table de présentation — mais elle doit être **partagée avec le studio web**, qui ordonne le
même menu : elle vit donc dans `@arthome/core` et non dans le dépôt de l'application. Aucune valeur
calculée deux fois.

**c. Les droits changent pendant que l'application est ouverte.** Une invitation acceptée ajoute une
chaîne au sélecteur ; un accès ponctuel **expire seul au tomber du rideau** ; un rôle peut être
retiré. Le contrat doit permettre à l'application d'**apprendre que sa navigation est périmée** —
un numéro de version des droits, porté sur chaque réponse et poussé sur le canal temps réel. Sans
lui, la personne garde un onglet qui ouvre un 403, et le découvre en pleine garde.

### 3. La redaction par le rôle n'est pas un masquage d'affichage

Deux prédicats gouvernent des pans entiers de contenu :

- **`canRevenue`** = artist ∨ prod ∨ tres. Décide si les **montants existent**. La maquette est
  explicite et le dit à l'écran : « hors de votre droit d'en connaître ». Un régisseur qui escalade
  un incident voit « 340 places concernées », jamais la recette.
- **`canDecide`** = artist ∨ prod. Décide des gestes qui engagent les acheteurs : publier, reporter,
  annuler, dédommager, dupliquer, supprimer, appliquer à la série.

**Ce que le contrat doit garantir** : un champ interdit est **absent de la charge utile**, jamais
présent et nul. La nuance est décisive sur mobile : la charge utile est en clair dans le WebView,
inspectable, et survit dans le cache HTTP du téléphone. Un montant « masqué à l'affichage » est un
montant livré.

Corollaire moins évident : **une clé de tri sur un champ absent doit être refusée**, pas ignorée.
La page `events` trie sur six clés, dont `rev` (recette). Un tri accepté silencieusement sur un
champ redacté trahit l'ordre des valeurs qu'il n'a pas le droit de montrer.

### 4. Le régisseur en salle n'est pas au même endroit que le flux

C'est la différence la plus spécifiquement mobile, et la maquette en fait un bloc entier — « deux
pannes à ne pas confondre » :

| Ce qui se passe | Ce que l'application doit dire | Ce qu'elle doit **surtout** ne pas faire |
|---|---|---|
| La salle n'envoie plus rien | « flux perdu » — relancer l'encodeur | — |
| **Le téléphone a perdu le réseau** | « je ne sais plus » — **la diffusion continue, ne coupez pas** | annoncer que le flux est perdu |
| Le débit s'effondre | « descendre d'un palier » | — |

Un studio web est sur le réseau du bureau ; un studio mobile est sur la 4G d'une salle en sous-sol.
**L'application ne doit jamais inférer l'état du flux de l'état de sa propre connexion.**

**Ce que le contrat doit porter** : chaque mesure d'antenne voyage avec l'**instant où elle a été
mesurée à l'ingest**. L'application affiche alors « débit 8,9 Mb/s, mesuré il y a 3 s » ou
« dernière mesure il y a 2 min » — ce qui est une information honnête — au lieu de « 0 Mb/s », qui
est un mensonge. `streaming.md` pose déjà la règle pour la TV et le web : « masquer ce qui n'est pas
mesuré plutôt qu'afficher zéro : un zéro se lit *parfait*, pas *non mesuré* ». Sur mobile, la même
règle doit couvrir un troisième cas : *mesuré, mais je n'ai pas pu le recevoir*.

### 5. Deux réglages suivent la personne, pas la chaîne

La maquette l'écrit deux fois : la **disposition de régie** (« par personne, pas par chaîne — votre
choix suit votre compte ») et les **profils d'encodage** (« vos profils voyagent d'une chaîne à
l'autre : le poste change, les réglages restent »).

La maquette les range pourtant dans `localStorage`. Sur la coquille native c'est faux deux fois : le
stockage est lié à l'origine (un changement de schéma l'orpheline), le système peut le vider, et il
ne voyage d'aucune façon d'un appareil à l'autre — donc il ne « suit » aucun compte.

**Ce que le contrat doit porter** : une petite ressource de **préférences d'interface par compte**,
lue à l'amorçage et écrite par commande. Deux entrées identifiées aujourd'hui (disposition de régie,
profils d'encodage nommés), une troisième probable (le fuseau de lecture, voir plus bas). Elle doit
être **additive et tolérante** : une clé inconnue d'une version de l'application ne doit ni la faire
échouer ni être effacée à la prochaine écriture — sinon la version mobile en revue de magasin écrase
les réglages posés depuis le studio web.

---

## Les formes de données

`shared/` fait autorité sur le vocabulaire et les règles, pas sur les formes. Ce que je demande ici
est ce qui manque, pas ce qui existe.

### Ce que toute réponse doit porter

- **Instants ISO 8601 en UTC**, jamais de décalage en minutes (D7). Chaque date porte en outre le
  **fuseau IANA de sa salle** (D3) : la maquette affiche systématiquement l'heure de salle **et**
  l'heure de la personne, et la saisie de l'assistant se fait en heure de salle.
- **Un numéro de version par agrégat lu** (date, publication, message de modération, membre,
  versement). C'est ce qui permet à une commande d'être conditionnelle plutôt qu'aveugle — voir
  « Les commandes ».
- **Un instant de fraîcheur par modèle de lecture** (`asOf`), distinct de la version. En garde, on a
  besoin de savoir de quand date ce qu'on regarde, pas seulement s'il a changé.
- **Les champs d'audit qui manquent à `shared/`** : qui a décidé, quand, depuis quelle surface.
  La maquette promet partout « horodaté et nominatif » — journal de modération, journal des accès,
  journal de la chaîne, incidents. La promesse n'a aujourd'hui aucun champ derrière elle.

### Modèles de lecture propres à cette surface

Je les nomme et je dis ce qu'ils portent ; les modèles partagés avec le studio web (date,
publication, versement, statistiques, boutique, rediffusion) sont de son ressort.

**1. L'amorçage** — une requête, avant la première route. Compte ; liste complète des chaînes avec,
par chaîne : identifiant, nom, visuel, **rôles effectifs**, fuseau IANA de la salle, drapeau « à
l'antenne en ce moment », propriété (`own`) ; la table `grants` **projetée sur les rôles de la
personne** (ce que *cette personne* peut attribuer, pas la table générale) ; les préférences
d'interface ; la version des droits ; le compteur de boîte. Petite, mise en cache, revalidable.

**2. Les gardes** — décrit en §1 plus haut. Fenêtre paramétrable (ce soir / la semaine), toutes
chaînes.

**3. La file de modération** — un élément porte : l'identifiant du **message**, l'identifiant de la
**personne** du public qui l'a écrit, le texte, le motif de signalement (`moderationReasons`), le
nombre de signalements, l'instant, **et la position dans le média** (voir plus bas), plus l'état de
prise en charge : libre, pris par moi, pris par un confrère nommé, **tranché** (avec le verdict et
le nom de qui a tranché). Cet état de prise en charge n'existe nulle part dans `shared/` et c'est
le cœur de l'écran.

**4. L'ancrage média du tchat.** `streaming.md` §5 l'exige déjà pour la rediffusion : un message
porte **sa position dans le média**, pas seulement son heure d'envoi. La régie mobile en a un second
usage : le chronomètre de garde se compte **depuis le lever de rideau**, et le journal de modération
horodate en heure de salle relative à l'antenne. Un message sans position média rend le journal de
modération illisible à la relecture d'une rediffusion.

**5. Les mesures d'antenne** — série temporelle courte : débit montant, latence, images perdues,
spectateurs, **chacune avec son instant de mesure** et, conformément à `streaming.md`, **absente si
non mesurable pour le protocole d'entrée** (le *jitter* et les paquets perdus n'existent pas en
RTMP). Sur mobile, la série doit pouvoir être demandée **courte** : la garde a besoin des trois
dernières minutes, pas de l'historique du direct.

**6. La personne du public** — le public d'une chaîne est une **collection interrogeable par
elle-même**, pas une projection du tchat. La console de sanctions cherche « un spectateur dans
l'audience, même sans avoir écrit ». Elle porte : pseudonyme, état de sanction, dates suivies,
nombre de messages, ancienneté, qualité d'abonné.

**7. Les invitations reçues** — portent un **périmètre** (permanent ou une seule date), la date
concernée le cas échéant, qui invite, le rôle proposé, et une **expiration** (« expire à la date »,
« expire dans 6 jours »). Une invitation acceptée doit faire entrer la chaîne au sélecteur **sans
rechargement** : c'est un changement de droits, donc un incrément de la version des droits.

**8. Les créneaux d'une date** — pour la matrice équipe : par date, par poste (`regie`, `mod`), la
**liste** des personnes affectées (plusieurs sont possibles), et si le créneau est **hors de la main
de qui regarde**. L'affectation du créneau régie est réservée à artist ∨ prod pour une raison que le
contrat doit rendre explicite : **c'est elle qui donne la clé de flux**.

### Ce que `shared/` ne porte pas et dont j'ai besoin

- **La cause d'un incident.** `catalogue.incidentMessages` connaît quatre entrées — `hold-screen`,
  `postponed`, `cancelled`, `interrupted` — qui sont des **issues**, pas des causes. La régie mobile
  en distingue trois de plus, qui n'existent dans aucun vocabulaire : *flux perdu côté salle*,
  *poste de régie déconnecté*, *débit effondré*. Il faut un vocabulaire fermé de causes, distinct du
  vocabulaire d'issues.
- **La source d'un article de boutique.** La maquette affiche Arthome / Shopify / WooCommerce /
  numérique et l'infère de `merch.kind`, ce qui est faux (`print` est un programme imprimé, pas un
  livrable numérique). Il manque un champ de source, et pour les commandes externes, l'adresse vers
  laquelle sortir (« ouvrir chez le marchand »).
- **L'épinglage d'un article pendant le direct** : une commande de studio qui change ce que le
  storefront affiche en direct. Aucune forme aujourd'hui.
- **La provision technique d'une jauge** : la maquette parle d'un seuil de 10 000 spectateurs
  simultanés au-delà duquel l'infrastructure se provisionne à l'avance, avec un malus si le
  prévisionnel dépasse le réel, et de **paliers** qui élargissent une jauge sans jamais la réduire
  après mise en vente. Rien dans `shared/`.
- **La fenêtre de priorité de liste d'attente** (2 h) et le fait qu'ouvrir un palier prévient la
  liste « dans le même geste ».
- **Les contremarques** (presse, partenaires, invités) : émises / allouées, par catégorie.

---

## Les commandes

Toutes portent `Idempotency-Key`. Chez moi la règle compte doublement : un réseau mobile rejoue, et
un utilisateur qui ne voit pas de réponse appuie deux fois.

### Inventaire

| Domaine | Commandes |
|---|---|
| Publication | transition d'état ; dupliquer une date ; supprimer une date ; appliquer à la série ; modifier un champ de la fiche |
| Billetterie | ouvrir un palier de jauge ; rembourser ; autoriser un transfert de place ; répondre à un litige bancaire |
| Modération | prendre en charge / relâcher ; publier ; supprimer ; réduire au silence (avec durée) ; bannir ; lever une sanction ; ajouter/retirer un terme au dictionnaire ; changer le régime de tchat, la sévérité du filtre, le mode lent, la réserve aux détenteurs de place |
| Antenne | déclarer un incident ; diffuser l'écran d'attente et son message ; reprendre la diffusion ; escalader vers la production ; reporter / annuler et rembourser / poursuivre avec dédommagement ; changer le profil de diffusion |
| Diffusion | révéler la clé de flux ; **renouveler la clé de flux** |
| Équipe | inviter ; changer les rôles d'un membre ; retirer un membre ; affecter / retirer d'un créneau ; révoquer un accès ponctuel ; accepter / refuser une invitation |
| Trésorerie | demander le changement de compte bancaire ; générer un export comptable |
| Chaîne | modifier l'identité publique ; changer les valeurs par défaut de diffusion ; transférer la propriété ; supprimer la chaîne |
| Boutique | épingler / retirer un article pendant le direct |
| Compte | changer le fuseau de lecture ; enregistrer une préférence d'interface ; se déconnecter |

### Trois régimes, et il faut les nommer dans le contrat

**a. Commandes conditionnelles — la majorité des gestes de garde.** Elles portent la **version de
l'agrégat** sur laquelle la décision a été prise, et le serveur **refuse** si elle a changé. Le cas
canonique est le verdict de modération : deux modérateurs sont sur la même file, et la maquette est
formelle — « la ligne est close sur son verdict ». Le second verdict ne doit pas écraser le premier,
il doit être **refusé avec le verdict qui a gagné et le nom de qui l'a rendu**, pour que l'écran le
dise. Un rejeu idempotent aveugle produirait exactement le contraire.

**b. Prises en charge — des baux, pas des écritures.** « Prendre en charge » n'est pas trancher. Une
prise en charge doit **expirer d'elle-même** : un modérateur dont le téléphone s'éteint ne doit pas
geler la file. Donc une durée de bail explicite, renouvelée tant que la personne est présente, et
libérée par le serveur à l'expiration. Une prise en charge ne se met **jamais** en file hors ligne :
rejouée à la reconnexion, elle réclamerait une ligne que quelqu'un d'autre a déjà traitée.

**c. Commandes à double détente.** Trois gestes ne s'appliquent pas immédiatement et créent un
**état d'attente** que le contrat doit porter :

- **le changement de compte bancaire** — part au propriétaire pour contre-signature, et **suspend le
  virement en cours** le temps de la signature ;
- **le transfert de propriété de la chaîne** — double validation ;
- **l'invitation** — en attente jusqu'à la réponse de l'invité, et visible comme telle dans la liste
  des membres.

### Les gardes que le serveur doit poser, et dont il doit dire la raison

L'application ne peut pas les vérifier seule, et ne doit pas essayer :

- supprimer une date est **impossible si des places sont vendues** ;
- supprimer une chaîne est **impossible tant qu'une date est en vente ou qu'un versement est dû** ;
- publier est **bloqué tant qu'il manque un élément** de la liste de contrôle — et le refus doit
  nommer **lesquels**, en paramètres du code d'erreur, puisque l'écran les compte (« publier —
  3 manques ») ;
- la publication est **verrouillée tant que le contrôle technique n'est pas passé** ;
- deux transitions sont **sans retour** et exigent une confirmation dont le texte vient du contrat :
  `draft|reserve → scheduled` (la publication engage le tarif affiché) et `ended → replay-online`
  (des spectateurs ont payé pour la rediffusion) ;
- les **tarifs se verrouillent à la mise en vente**, l'**horaire** à l'antenne ;
- « appliquer à la série » **exclut les tarifs et la jauge** — jamais reportés, chaque date engage
  ses acheteurs.

Ces verrous vivent dans `@arthome/core` et sont **rendus par le contrat**, pas recalculés par
l'application. La maquette les recalcule depuis l'état ; ce serait une seconde implémentation de la
règle, donc une divergence garantie.

### Une commande qui mérite son propre traitement : la clé de flux

C'est un secret affiché sur un téléphone, dans une salle, souvent devant un prestataire. Le contrat
doit garantir : la clé **n'est jamais dans une charge utile de liste** ; sa révélation est une
**commande distincte, auditée et nominative** ; son renouvellement est immédiat et l'ancienne
**cesse aussitôt de diffuser** ; et l'affectation du créneau régie — qui donne accès à la clé — est
réservée à artist ∨ prod. Sur mobile, ajouter : la clé ne doit pas se retrouver dans le cache HTTP
ni dans un instantané d'application pris par le système au passage en arrière-plan.

---

## Le temps réel en situation de garde

### Qui a besoin de quoi, et à quelle latence

| Flux | Pour qui | Latence acceptable | Nature |
|---|---|---|---|
| File de modération | `mod` | **seconde** | ajouts, retraits, prises en charge, verdicts |
| Tchat en direct | `mod`, `regie` | seconde | ajouts, avec état par message |
| Débit du tchat (msg/min) | `mod` | ~5 s | mesure agrégée, pas déduite du flux de messages |
| Mesures d'antenne | `regie` | ~5 s | échantillons datés |
| État d'incident | tous les rôles de la chaîne | **immédiate** | l'écran d'attente est un voile |
| Présence des équipiers | `regie`, `mod` | ~10 s | « modérateur en ligne » / « aucun sur le poste » |
| Gardes et alertes | tous | minute | et par notification quand l'application est fermée |
| Version des droits | tous | immédiate | invalide la navigation |

Le canal est celui du projet : diffusion par l'adaptateur Socket.IO sur Redis, Kafka restant le
journal durable pour la modération et l'audit. Je n'ai pas de besoin qui remette cela en cause.

### Ce que la garde ajoute comme exigences

**1. Un abonnement multi-chaînes.** Un régisseur peut avoir **deux flux sous sa garde le même
soir** ; un modérateur peut couvrir plusieurs chaînes. Le canal doit donc être **par personne**, et
porter les événements de toutes les chaînes où elle a un accès, chacun étiqueté de son identifiant
de chaîne. Un abonnement par chaîne multiplierait les connexions sur un réseau mobile déjà fragile.

**2. Un seuil de bascule qui dépend d'une mesure serveur.** Au-delà de **60 messages par minute**,
la console cesse de montrer le tchat message par message et bascule sur la file. Ce seuil est une
règle du domaine ; la mesure sur laquelle il s'applique doit être **définie dans le contrat** —
fenêtre glissante, unité, fréquence de rafraîchissement. Aujourd'hui la maquette la calcule à partir
du nombre de messages divisé par les heures écoulées, et l'appelle « msg/min » (voir Incohérences,
point 6).

**3. Une reprise, pas un rejeu.** Voir la section suivante : c'est la conséquence la plus lourde de
l'arrière-plan mobile.

**4. Une visibilité de la concurrence.** L'écran de file montre « *X* examine », « *X* a tranché ».
Cela suppose que les prises en charge et les verdicts des autres arrivent sur le même canal, avec le
**nom** de qui agit. C'est une exigence de contrat, pas d'affichage : sans elle, deux modérateurs
travaillent en aveugle l'un de l'autre et se marchent dessus à chaque ligne.

**5. Un effet rétroactif à propager.** Ajouter un terme au dictionnaire « s'applique
rétroactivement : les messages déjà publiés qui le contiennent repassent en file ». C'est un
retraitement serveur qui produit un lot de nouveaux éléments de file. Le contrat doit dire s'il est
synchrone (la commande répond avec le nombre de messages repassés en file) ou asynchrone (la file
grossit toute seule quelques secondes plus tard) — les deux sont défendables, l'ambiguïté ne l'est
pas.

---

## Hors ligne, arrière-plan et reprise

C'est la section où le studio mobile diverge le plus du studio web, et elle se résume à une
question : **qu'est-ce qui se met en file, qu'est-ce qui se refuse ?**

### La règle que je propose

> **Une commande se met en file hors ligne si et seulement si elle porte sur un objet nommé et que
> sa signification ne dépend pas de l'instant où elle s'applique. Tout le reste se refuse.**

### Ce qui se refuse — et pourquoi le refus est le bon comportement

| Commande | Pourquoi elle ne se rejoue pas |
|---|---|
| Publier, reporter, annuler et rembourser, dédommager | la décision est **chiffrée sur l'état du moment** — places vendues, recette. Rejouée trois minutes plus tard, elle décide sur des faits périmés |
| Mettre une rediffusion en ligne | sans retour, et met en vente |
| Diffuser l'écran d'attente, changer son message | c'est une **diffusion vers les spectateurs**. Rejouée après la reprise, elle coupe une antenne qui va bien |
| Renouveler la clé de flux | effet immédiat sur l'ingest ; un rejeu coupe une diffusion en cours |
| Ouvrir un palier de jauge | prévient la liste d'attente et engage l'infrastructure |
| Prendre en charge une ligne de file | c'est un bail : rejoué, il réclame une ligne déjà traitée |
| Changer le compte bancaire, transférer, supprimer la chaîne | double détente, et irréversibles |

Le refus doit être **explicite et distinct d'une erreur réseau** : « ce geste ne peut pas être
préparé hors ligne » n'est pas « ça n'a pas marché, réessayez ». En garde, la différence décide si
l'on réessaie ou si l'on décroche le téléphone d'astreinte.

**Le filet de sécurité correspondant existe déjà et doit être dans le contrat** : le réglage de
chaîne « écran d'attente automatique si le flux se perd plus de 15 s ». C'est **la** réponse juste
au cas « le régisseur est injoignable » — une règle serveur, pas un comportement d'application. Elle
doit être portée par le contrat comme une valeur par défaut de chaîne, et son déclenchement doit
produire un événement d'incident au même titre qu'un déclenchement manuel.

### Ce qui se met en file

Deux familles seulement, et toutes deux conditionnelles :

- **Les verdicts de modération sur un message nommé** (publier, supprimer) — idempotents par nature,
  et **refusés si un confrère a tranché entre-temps**. Le rejeu n'écrase rien ; il découvre.
- **Les sanctions sur une personne nommée** (réduire au silence avec durée, bannir, lever) — de même.
  Une sanction **portée sur la personne** survit à la reconnexion sans ambiguïté, contrairement à
  une sanction déduite d'un message.

Ces deux familles sont précisément celles où la maquette écrit que « prendre en charge n'est pas
trancher : tant que le confrère n'a pas rendu de verdict, **votre sanction s'applique** ». C'est
l'aveu que le verdict porte sur l'objet, pas sur la session.

### Le retour d'arrière-plan

Le système suspend le WebView ; la connexion temps réel meurt **sans événement de fermeture propre**.
Au réveil, l'application doit **se resynchroniser, pas rejouer**.

**Ce que le contrat doit offrir** : un **curseur de reprise** par canal. « Donne-moi tout ce qui est
arrivé sur cette chaîne depuis *ce curseur* », avec trois réponses possibles :

1. voici les événements manqués ;
2. **le trou est trop grand, recharge le modèle de lecture entier** — réponse explicite, jamais un
   silence ;
3. le curseur n'est plus valide (droits changés, chaîne quittée).

Sans la deuxième réponse, le modérateur revient sur une file à laquelle il manque dix messages, et
rien ne le lui dit.

**Ionic aggrave le problème, et il faut le savoir en écrivant le contrat.** Sous `ion-router-outlet`
une page reste dans le DOM après qu'on l'a quittée : elle est réaffichée telle quelle au retour. Le
contrat doit donc offrir une lecture **bon marché de fraîcheur** — une version par modèle de lecture,
interrogeable sans rapatrier le contenu — pour que le retour sur une page se solde par « rien n'a
changé » et non par un rechargement complet sur la 4G d'une salle.

### L'horloge

Le chronomètre de garde, la durée d'une réduction au silence, l'expiration d'une fenêtre de
rediffusion (« expire dans 41 h »), la fenêtre de priorité de liste d'attente (2 h), l'expiration
d'un accès ponctuel : tout cela est compté sur un téléphone dont l'horloge dérive en veille et est
réglable par son porteur.

**Ce que le contrat doit garantir** : tout est un **instant**, jamais une durée restante calculée
par le serveur et envoyée telle quelle. L'application dérive ses décomptes d'un instant serveur et
d'un décalage mesuré. C'est exactement ce que D7 impose déjà — c'est ici que ça compte le plus.

---

## La coquille native : Capacitor

Vérifié contre `@capacitor/core` 8.5.2 et `@ionic/angular` 9 via `ionic-capacitor-how-to`. Ce qui
suit ne concerne pas l'apparence — les jetons Arthome via les variables CSS d'Ionic sont hors de mon
périmètre, comme indiqué.

### Les origines

L'application est **servie depuis le téléphone**, pas depuis un serveur :

| Plateforme | Origine que le BFF reçoit |
|---|---|
| Android | `https://localhost` |
| iOS | `capacitor://localhost` |
| Développement | l'origine du serveur de développement |

**Ce que le contrat doit garantir** : la liste d'autorisation CORS du BFF studio contient les **deux
chaînes littérales**, plus les origines de développement. Une entrée `localhost` nue n'en couvre
aucune. `Access-Control-Allow-Origin: *` est **illégal** avec des requêtes créditées : l'origine
doit être renvoyée telle quelle. Et `capacitor://` est un schéma non standard : un cadre serveur qui
normalise l'en-tête `Origin` par un analyseur d'URL le rejettera — la vérification doit porter sur
la chaîne littérale.

Le schéma Android ne doit **jamais** être changé : il change l'origine, orpheline tout ce qui est
stocké dessous, et se lit comme une déconnexion massive et silencieuse de tous les utilisateurs à la
mise à jour.

### La session : le point où le studio mobile ne peut pas faire comme le studio web

iOS 14 et au-delà bloquent les cookies tiers par défaut, et une page servie depuis
`capacitor://localhost` qui appelle le BFF **est en contexte tiers**. Le studio web tient sa session
par cookie ; **le studio mobile ne le peut pas**, sauf à passer par `WKAppBoundDomains` — dix
domaines au maximum, et qui verrouille la navigation de l'application entière.

**Ce que le contrat doit offrir** : une **session porteuse de jeton** pour la coquille native, à
côté de la session par cookie du web. Concrètement, ce que je demande à `adr-auth.md` :

- un jeton de rafraîchissement lié à l'appareil, conservé dans `@capacitor/preferences` (magasin
  natif : `UserDefaults` / `SharedPreferences`), **jamais dans `localStorage`** — que le système peut
  vider et qu'un changement d'origine orpheline ;
- un jeton d'accès court, échangé par le BFF contre le jeton signé de service comme prévu ;
- une **révocation par appareil**, parce que l'appareil est un téléphone qui se perd, et que la
  personne qui le tient est en garde sur des chaînes qui ne lui appartiennent pas ;
- le comportement attendu au **retour d'arrière-plan avec un jeton expiré** : rafraîchir
  silencieusement, ou exiger une réauthentification ? En garde, une réauthentification au mauvais
  moment est une faute. La réponse doit être écrite, pas implicite.

### Les liens profonds : les cinq sorties vers un navigateur externe

L'application quitte sa coquille dans cinq cas, tous relevés dans la maquette :

| Sortie | Ce qu'elle fait | Ce qui doit être garanti au retour |
|---|---|---|
| **`arthome.fr/compte`** | identité, **moyens de paiement**, places achetées — « le compte est partagé avec le site public » | l'application doit **relire son amorçage** : le nom, l'adresse, la langue peuvent avoir changé |
| **OAuth** (Google, Facebook) et 2FA | connexion | échange de code, état opaque, session posée dans le magasin natif |
| **Onboarding du compte de versement** (Stripe Connect) | le prestataire impose son propre parcours web | l'état du compte a changé côté prestataire : l'application doit **redemander**, jamais croire l'URL |
| **Page publique** d'une date, **documentation** de la plateforme | lecture seule | rien à rapatrier |
| **Site du marchand** (Shopify, WooCommerce) | « le suivi, l'échange et le remboursement se font sur le site du marchand » | rien à rapatrier, mais l'application doit savoir qu'elle n'en tient que le compte |

**Ce que le contrat doit garantir sur ces retours** — et c'est le point le plus spécifiquement
Capacitor de tout ce document :

1. **Une adresse de retour déclarée par l'application**, sous la forme d'un lien universel
   (`applinks` iOS / App Links Android) vers un domaine du projet, qui rouvre l'application. Le
   backend doit accepter cette adresse comme redirection légitime et la valider strictement — une
   liste blanche, pas un motif.
2. **Un état opaque, à usage unique et de courte durée**, émis par le backend avant le départ et
   vérifié au retour. Il ne doit **rien porter de signifiant** : sur mobile, l'URL de retour
   transite par le système, peut être journalisée, et peut être ouverte par une autre application.
3. **Le retour ne doit jamais être la source de vérité.** Le système a pu tuer l'application pendant
   le passage au navigateur : au retour, le WebView est une page neuve, l'état de l'application est
   perdu, et seul le lien profond et le magasin natif subsistent. Donc : le lien profond dit
   **où** aller et **quel** état reprendre ; c'est le backend qui dit **ce qui a changé**. Un
   paiement confirmé par un paramètre d'URL est un paiement confirmé par le client.
4. **Un parcours de reprise doit être rejouable.** Si l'application est tuée entre le départ et le
   retour, la personne doit pouvoir reprendre là où elle en était depuis la boîte ou l'écran
   concerné, sans redémarrer le parcours. Cela suppose que l'état d'attente soit **côté serveur**
   (« demande de changement de compte en attente de signature », « connexion du compte de versement
   en cours »), pas dans la mémoire de l'application.
5. `allowNavigation` sert **uniquement** à autoriser la redirection d'authentification à revenir
   dans le WebView. Ce n'est ni un contrôle CORS ni une frontière de sécurité, et il ne doit pas
   servir à contourner une liste d'autorisation mal réglée.

Une sixième sortie, plus discrète : la **ligne d'astreinte** (« appeler »). C'est une navigation
`tel:` depuis le WebView — elle ne revient pas, mais elle doit être prévue comme une ouverture
native et non comme un lien.

### Téléversements et téléchargements

Deux charges binaires existent, et toutes deux sont contraintes par la coquille :

- **L'affiche d'une date** : visuel 16/9, deux mégaoctets au maximum.
- **Les exports comptables** : journal des ventes en CSV, grand livre FEC, écritures Sage/Cegid,
  factures groupées en PDF — « fichiers générés à la demande ».

Le piège : si `CapacitorHttp` est activé pour contourner CORS — il est **désactivé par défaut**, et
il faut le dire, parce que la croyance inverse est répandue — alors sur natif le corps d'une requête
ne peut être **qu'une chaîne ou du JSON**. `FormData`, `Blob` et `ArrayBuffer` sont web seulement.
Un téléversement multipart cesse silencieusement de fonctionner sur l'appareil tout en marchant dans
le navigateur.

**Ce que le contrat doit offrir**, et qui est robuste dans les deux cas :

- **Téléversement** : une commande JSON qui rend une **adresse de dépôt signée et de courte durée**,
  puis un dépôt direct. Aucun multipart depuis le WebView.
- **Téléchargement** : un export est un **travail asynchrone** — il faut le dire, un FEC n'est pas
  une réponse HTTP — qui rend, une fois prêt, une **adresse signée de courte durée**, utilisable par
  un transfert natif **sans cookie de session**. Un export protégé par cookie est intéléchargeable
  sur la coquille native.
- Dans les deux cas, l'expiration de l'adresse signée doit être assez longue pour une 4G de salle et
  assez courte pour ne pas être un jeton d'accès déguisé. La valeur est à trancher, pas à deviner.

### Notifications

La garde doit pouvoir être réveillée application fermée : « file de modération saturée »,
« aucun modérateur affecté à J-1 », « débit instable », « litige bancaire sous 24 h ». La maquette
route déjà chaque alerte **vers un rôle** et annonce une **alerte sonore distincte par chaîne**.

**Ce que le contrat doit porter** : un enregistrement d'appareil par compte (jeton FCM, plateforme,
version, langue) ; un routage d'alerte **par rôle et par chaîne** décidé côté serveur ; une charge
utile qui porte l'identifiant de chaîne, l'identifiant de date et la page à ouvrir, **de sorte que
l'ouverture de la notification pose l'application sur la bonne chaîne, la bonne page et le bon
sous-onglet** — le même mécanisme de lien profond que ci-dessus, appliqué à l'interne.

Et une règle qui découle de la redaction : **une notification ne porte jamais un montant** si le
rôle destinataire n'a pas `canRevenue`. Une notification s'affiche sur un écran verrouillé.

### Ce que le contrat n'a pas à porter mais que je note pour mémoire

- Aucun agent de service (`service worker`) sur la coquille native : le WebView sert déjà le paquet
  localement, un agent ajoute une seconde couche de cache périmée. S'il existe pour une version web
  du studio, il doit être enregistré **seulement** sur la plateforme web.
- `android/` et `ios/` sont des projets natifs générés **mais versionnés**.
- Point non résolu, à vérifier sur un appareil réel avant de s'y fier : `capacitor://localhost` est-il
  un **contexte sécurisé** dans WKWebView ? Cela conditionne Web Crypto et `getUserMedia`. Voir la
  question 8 au backend : le retour de régie WebRTC/WHEP est le point exposé.

---

## Pagination et volumes

La décision du projet s'applique : **studio = page + total**, tri déterministe avec départage par
identifiant. Ce que la surface ajoute :

### Les totaux comptent plus que les pages

La barre d'onglets porte des pastilles (`agenda` : gardes ce soir, `events` : dates,
`moderation` : messages en file), la boîte porte un compteur, la bande de statistiques d'un écran
affiche « en file : 14 », « invitations : 2 », « dates à couvrir : 3 ». **Aucun de ces nombres ne
doit exiger de rapatrier une page.** Le contrat doit les porter dans l'amorçage et les tenir à jour
par le canal temps réel. Sinon la barre du bas coûte cinq requêtes à chaque ouverture.

### Les volumes observés

| Collection | Page en maquette | Volume réel plausible |
|---|---|---|
| Dates d'une chaîne | 6 | dizaines à centaines par saison |
| Membres d'une équipe | 4 | dizaines |
| File de modération | 5 (plafonnée) | **des centaines pendant un direct saturé** |
| Tchat en direct | tout | des milliers |
| Public d'une chaîne | tout, cherchable | des milliers |
| Journal, gardes | 12, tout | dizaines |

Des pages petites, donc, et c'est délibéré : un pouce ne parcourt pas cent lignes.

### La tension qu'il faut arbitrer : la file de modération n'est pas une page

Une file de modération **grandit pendant qu'on la lit**. Une pagination par décalage y double des
lignes et en saute d'autres — mécaniquement, pas exceptionnellement. Le tchat en direct a le même
problème.

Je **n'ouvre pas** la décision « studio = page + total ». Je signale qu'elle ne peut pas s'appliquer
telle quelle à deux collections vivantes, et je propose la distinction la plus étroite possible :

- **Collections stables** — dates, membres, versements, rediffusions, journal, boutique, accès
  ponctuels, public : **page + total**, comme décidé ;
- **Collections vivantes** — file de modération, tchat en direct : **curseur** pour remonter dans
  l'historique, **canal temps réel** pour la tête, **total séparé** pour la pastille.

À trancher par le chef. Si la décision est « page + total partout », le contrat doit alors dire ce
qui se passe quand une ligne est insérée entre deux pages — et l'application devra vivre avec.

### Le tri

`events` trie sur six clés : date, titre, état, tarif, jauge, recette — avec direction. Deux
exigences : l'état trie selon l'**ordre canonique de la machine à états**, pas alphabétiquement
(c'est une donnée du domaine, pas de la surface) ; et le tri par recette est **refusé** aux rôles
sans `canRevenue`, comme dit plus haut.

`events` porte aussi une scission temporelle (à venir / passé) et un filtre multi-états. Les deux
doivent être des paramètres du contrat, pas un filtrage après rapatriement — la scission « passé »
porte sur l'ensemble de l'historique de la chaîne.

---

## États d'erreur et de chargement

### L'enveloppe

Celle du projet : code, paramètres, identifiant de trace. **i18n par codes**, avec instantané
embarqué au build comme repli obligatoire. C'est vital ici et il faut le dire crûment : **une revue
de magasin est lente**. Si un code d'erreur nouveau arrive du backend avant que l'application ne
soit mise à jour, la personne en garde doit voir une phrase, pas `moderation.verdict.conflict`. Le
repli embarqué et le catalogue servi dynamiquement (C6) sont, sur mobile, une **condition
d'exploitation**, pas une commodité.

### La distinction qui manque à l'enveloppe, et que la garde exige

Trois natures d'échec, aujourd'hui indistinguables :

| Nature | Ce que la personne doit faire | Exemple |
|---|---|---|
| **Refusé** — le serveur a dit non, définitivement | ne pas réessayer, comprendre pourquoi | un confrère a tranché ; il manque trois éléments pour publier |
| **Indisponible** — le réseau a dit non | réessayer, ou préparer hors ligne si c'est permis | 4G de sous-sol |
| **Impossible hors ligne** — refus local, avant tout envoi | attendre le réseau, ou escalader | annuler et rembourser |

Le contrat doit porter cette nature explicitement dans l'enveloppe. Sans elle, l'application ne peut
pas choisir entre « réessayer », « expliquer » et « décrocher le téléphone d'astreinte », et c'est
précisément la décision que la garde doit prendre en dix secondes.

### Les codes que je demande, au-delà des génériques

- droits périmés / accès révoqué / chaîne quittée ;
- déjà tranché par *X* (avec le verdict, en paramètre) ;
- prise en charge perdue ou expirée ;
- curseur de reprise trop ancien — recharge complète exigée ;
- publication bloquée : liste des éléments manquants en paramètres ;
- suppression refusée : places vendues (avec le nombre) ;
- transition verrouillée, avec la raison ;
- versement suspendu : changement de compte en attente de signature ;
- palier de jauge refusé : provision technique ;
- clé de flux : renouvellement pendant un direct.

### Le chargement

Le premier rendu doit attendre **une seule chose** : l'amorçage. La maquette le fait déjà — elle
refuse de rendre quoi que ce soit avant que la couche de données ait répondu, « les tables ne sont
jamais lues à vide ». C'est le bon comportement, et il impose sa contrainte au contrat : **l'amorçage
doit être petit et rapide**, parce que rien n'est peint tant qu'il n'est pas là. Tout le reste —
mesures, file, statistiques — arrive après, par écran.

L'échec de l'amorçage est un écran d'échec à part entière, avec l'identifiant de trace : c'est le
seul moment où la personne peut encore lire un numéro et le dicter au support.

---

## Incohérences relevées

Au-delà de D2 et D6, que je confirme et précise, huit points relevés dans mes sources. Je ne les
applique pas.

**1. D2, aggravé sur ma surface.** La maquette du studio mobile porte **la même table parallèle** que
celle du studio web (`draft | hidden | sched | tech | live | done | replay`) — et va plus loin :
elle porte en plus **ses propres libellés français en dur** et une table de traduction anglaise
maison, au lieu de passer par `enums.publicationState.*` qui existe et est traduit. Deux
vocabulaires parallèles **et** deux i18n parallèles. Le contrat fixe les noms de `catalogue.json`,
comme tranché.

**2. D6, et il y a un quatrième vocabulaire.** Recensement complet sur mes sources :

| Source | Valeurs | Porte sur |
|---|---|---|
| `catalogue.json.messageStates` | `ok` `removed` `muted` `banned` | le message |
| `fixtures.js` `audience[].state` | `ok` `muted` `banned` | la personne |
| `fixtures.js` `moderation[].state` | **`reported`** `removed` `muted` `banned` | la ligne de file |
| `studio-data.js` | `ok` `held` | la régie |
| `i18n/studio.json` `enums.moderationState` | **`published`** `removed` `muted` `banned` `reported` | ? |

Deux remarques qui s'ajoutent à D6. D'abord `reported` n'est **pas une sanction** : c'est un état de
triage, et il occupe le même champ que des sanctions — c'est pour cela que la file se construit en
filtrant `state === 'reported'`, ce qui n'est pas un filtre d'état mais un filtre de nature.
Ensuite l'i18n dit `published` là où `catalogue.json` dit `ok` : **la table de traduction ne
correspond exactement à aucun des quatre vocabulaires**. Il faut séparer trois axes — la nature de
la ligne (signalée / tranchée), l'état du message, l'état de la personne — et non les empiler dans
un champ.

**3. La projection en six personas n'est pas sûre pour l'autorisation.** `studio-data.js` rabat
`director`, `video` et `sound` sur un seul `regie`. Or `grants` les distingue : `director` peut
inviter `video` et `sound` ; `video` et `sound` ne peuvent inviter personne. Autoriser sur le rôle
court accorde à un régisseur son un droit d'invitation qu'il n'a pas. **Le contrat doit porter le
rôle réel et les droits effectifs ; les six personas sont de la présentation.**

**4. `TAB_PREF` nomme une page que `ACCESS` refuse.** `TAB_PREF.regie` contient `regie`, absent de
`ACCESS.regie` ; cela ne fonctionne que parce que `FREE.regie` le rattrape. Une table de préférence
qui nomme une page que la table d'accès ne donne pas est un piège : le jour où `FREE` change, un
onglet disparaît sans qu'on comprenne pourquoi. Les onglets doivent se dériver d'**une seule** liste
de pages ouvertes.

**5. L'état affiché d'une date est une composition de trois champs, et aucun ne la porte.**
`publication.state` ne connaît ni `cancelled`, ni `postponed`, ni `interrupted` : ces trois-là vivent
sur `date.outcome` et sur `run.state`. La maquette les affiche pourtant **par-dessus** l'état de
publication (« annulée et remboursée », « reportée · places valables », « interrompue · avoirs
émis »). Le contrat doit dire lequel de ces champs fait foi pour la pastille, ou exposer un état
dérivé unique — sinon chaque surface composera à sa manière.

**6. Le débit du tchat est mesuré dans une unité, comparé dans une autre.** `studio-data` /
la maquette calculent `nombre de messages ÷ heures écoulées` et l'étiquettent « MSG/MIN » ; le seuil
qui fait basculer la console est à **60 msg/min**. Une fenêtre, une unité et une fréquence de
rafraîchissement doivent être fixées par le contrat.

**7. Deux débits différents portent le même nom.** L'écran de diffusion mêle le débit **mesuré à
l'ingest** (série de santé, observation serveur) et un bouton « mesurer le débit montant » qui
mesure la liaison **du téléphone**. Le téléphone n'est pas l'encodeur : il est dans la salle, parfois
sur un autre réseau. Le contrat doit distinguer une mesure serveur d'une mesure soumise par un
client, et dire laquelle alimente la liste de pré-vol.

**8. La liste de pré-vol mélange des faits serveur et des cases à cocher locales.** Quatre entrées
sont des faits (`publication.checklist` : contrôle technique, chapitres, modérateur affecté,
politique de rediffusion) ; deux sont des bascules locales (« marquer fait »). Une liste qui bloque
la publication ne peut pas avoir de cases que le client coche pour lui-même. Elle doit être
**entièrement serveur**, chaque entrée portant sa raison et son état.

**9. Le fuseau de lecture de la personne n'a pas de porteur.** La maquette le prend en propriété
d'entrée et le laisse modifier dans la feuille « Mon compte ». Or il change l'affichage de **toutes**
les heures de toutes les chaînes. C'est un réglage de compte, au même titre que les deux autres
relevés en §5 — mais contrairement à eux, il est partagé avec le storefront, où le même compte
achète des places. Où vit-il ?

---

## Ce que je ne peux pas obtenir seul — questions au backend

**1. La session sur la coquille native.** Le studio web tient sa session par cookie ; le studio
mobile ne le peut pas (`capacitor://localhost` est un contexte tiers sur iOS). Le BFF studio
offre-t-il une **session porteuse de jeton** à côté de la session par cookie, avec jeton de
rafraîchissement lié à l'appareil, révocation par appareil, et un comportement écrit pour le retour
d'arrière-plan avec jeton expiré ? Sans réponse, la surface n'a pas d'authentification.
→ `adr-auth.md`

**2. Le retour depuis un navigateur externe.** Cinq parcours sortent de l'application (compte
partagé `arthome.fr/compte`, OAuth, onboarding du compte de versement chez le prestataire, page
publique, site du marchand). Quelle adresse de retour le backend accepte-t-il, sous quelle forme
d'état opaque, et **quelle ressource l'application interroge-t-elle au retour pour savoir ce qui a
changé** ? Je pose comme acquis que rien de signifiant ne doit voyager dans l'URL de retour ; je
demande la ressource de reprise. → `adr-auth.md`, `adr-payments.md`

**3. Les droits effectifs en une requête.** L'amorçage que je décris — compte, toutes les chaînes
avec les rôles effectifs par chaîne, les `grants` projetés, les préférences, la version des droits,
les compteurs — est-il un modèle de lecture du BFF studio ? Et **comment l'application apprend-elle
que ses droits ont changé** pendant qu'elle est ouverte (invitation acceptée, rôle retiré, accès
ponctuel expiré au tomber du rideau) ? → `context-map.md`, l'OpenAPI du BFF studio

**4. Le régime hors ligne des commandes.** Je propose : se met en file ce qui porte sur un objet
nommé et ne dépend pas de l'instant — verdicts sur un message, sanctions sur une personne, et rien
d'autre ; tout le reste se refuse localement. Le backend valide-t-il ce découpage ? Et accepte-t-il
que ces commandes soient **conditionnelles** (version de l'agrégat, refus si un confrère a tranché)
plutôt qu'idempotentes aveugles ? → `realtime.md`, `critical-rules.md`

**5. Le curseur de reprise.** Au retour d'arrière-plan, l'application doit pouvoir demander « tout
ce qui est arrivé depuis ce curseur » et recevoir, le cas échéant, un **« trop ancien, recharge
tout »** explicite. Ce mécanisme existe-t-il dans le plan temps réel, par chaîne et par personne ?
Et le canal peut-il être **par personne, multi-chaînes**, plutôt qu'un abonnement par chaîne ?
→ `realtime.md`

**6. La concurrence sur la file de modération.** Trois mécanismes sont à confirmer : le **bail** de
prise en charge (durée, renouvellement, libération automatique) ; le **refus du second verdict** avec
le nom de qui a tranché ; et la **propagation nominative** des prises en charge et des verdicts aux
autres modérateurs. Qui possède ces trois-là — `chat`, ou un contexte de modération distinct ? La
question croise D6 : le message appartient à `chat`, la personne bannie d'une chaîne appartient à
qui ? → `context-map.md`, D6

**7. La pagination d'une collection vivante.** « Studio = page + total » est une décision, et je ne
la rouvre pas. Je signale qu'une file de modération grossit pendant qu'on la lit et qu'une
pagination par décalage y double et y saute des lignes mécaniquement. Curseur pour les deux
collections vivantes (file, tchat) et page + total partout ailleurs, ou bien une autre réponse ?
→ arbitrage du chef, puis `critical-rules.md`

**8. Le retour de régie WebRTC/WHEP sur la coquille native.** `streaming.md` prévoit un retour de
régie sous la seconde en WHEP. Deux inconnues : est-ce **attendu sur le studio mobile** ou réservé
au studio web ? Et si oui, `capacitor://localhost` est-il un contexte sécurisé dans WKWebView —
ce qui conditionne `RTCPeerConnection`, et la mesure de latence bout-en-bout par
`RTCPeerConnection.getStats()` que `streaming.md` nomme explicitement ? Cela demande une
vérification sur appareil réel avant d'être promis. → `adr-stream-entitlement.md`, `streaming.md`

**9. Les binaires : affiche et exports.** Je demande un **téléversement par adresse de dépôt signée**
obtenue par une commande JSON (pas de multipart depuis le WebView) et un **export en travail
asynchrone** rendant une adresse signée de courte durée, utilisable **sans cookie de session** par un
transfert natif. Le backend suit-il, et quelles durées de validité ? → l'OpenAPI du BFF studio

**10. Les notifications.** Routage d'alerte **par rôle et par chaîne** décidé côté serveur,
enregistrement d'appareil par compte, charge utile portant chaîne + date + page cible. Et la règle
de redaction s'applique-t-elle à la charge utile de notification — c'est-à-dire, un montant est-il
exclu d'une notification destinée à un rôle sans `canRevenue` ? Une notification s'affiche sur un
écran verrouillé. → `notifications`, `adr-auth.md`

**11. Le fuseau de lecture et les préférences de compte.** Trois réglages suivent la personne et non
la chaîne : fuseau de lecture, disposition de régie, profils d'encodage. Le premier est partagé avec
le storefront (même compte). Qui les possède — `identity`, ou une ressource de préférences au BFF ?
Et la ressource est-elle **additive** (une clé inconnue d'une version mobile survit à une écriture) ?
→ `context-map.md`

**12. Le vocabulaire manquant des causes d'incident.** `catalogue.incidentMessages` porte quatre
**issues** (`hold-screen`, `postponed`, `cancelled`, `interrupted`). La régie mobile distingue trois
**causes** qui n'existent nulle part : flux perdu côté salle, poste de régie déconnecté, débit
effondré. Peut-on avoir un vocabulaire fermé de causes, séparé des issues ? Et le déclenchement
automatique de l'écran d'attente (règle de chaîne « si le flux se perd plus de 15 s ») produit-il un
incident de même nature qu'un déclenchement manuel ? → `data-model.md`, `streaming.md`

**13. Ce que `shared/` ne porte pas et que je ne peux pas inventer.** La provision technique d'une
jauge et son seuil de 10 000 spectateurs simultanés ; les paliers de jauge et le fait qu'ils ne se
réduisent jamais après mise en vente ; la fenêtre de priorité de liste d'attente (2 h) ; les
contremarques par catégorie ; la source d'un article de boutique et les commandes issues d'une
intégration externe ; l'épinglage d'un article pendant le direct. Six formes absentes, toutes
affichées par la maquette. Lesquelles entrent au contrat du palier 1 ?
→ `data-model.md`, `context-map.md` (C8)

---

# Confrontation

> Temps 3. Lecture de `answers-to-surfaces.md`, `adr-auth.md`, `context-map.md`, `data-model.md`,
> `events.md`, `realtime.md`, `transport.md`, `critical-rules.md`, `openapi/studio.yaml` et
> `DECISIONS.md`. **Sur pièces** : l'index des réponses est une promesse, le YAML est la preuve.
> Chaque contestation ci-dessous est vérifiable par une ligne du contrat, citée.

---

## Ce qui est satisfait

Court, parce que c'est massif. Sur mes treize questions, l'essentiel est tenu — et plusieurs fois
mieux que ce que je demandais.

**L'amorçage existe et il est meilleur que ma demande.** `GET /v1/bootstrap` porte la personne,
**toutes** ses chaînes avec `roles` au vocabulaire à huit, `assignableRoles` **matérialisés**,
`dateGrants` avec leur instant d'expiration, `rightsVersion`, `counters`, `constants`,
`labelCatalog` et `realtime`. Et `datePanes` par chaîne **plus** `openPanes` par date : les volets
de la fiche que j'avais trouvés dérivés du rôle sont servis, pas déduits.

**La session native est tranchée dans mon sens.** `adr-auth.md` §2.2 : « `capacitor://localhost`
est un **contexte tiers sur iOS 14+** → le cookie est mort », jeton porteur dans
`@capacitor/preferences`, jamais `localStorage`, rafraîchissement silencieux au retour
d'arrière-plan. §6.6 reprend mot pour mot les deux chaînes littérales de CORS et la comparaison
sur la chaîne brute. §6.4 adopte intégralement les cinq sorties : liste blanche de chaînes
littérales, état opaque à usage unique de 10 minutes, **état d'attente côté serveur**, et ma
phrase telle quelle — *un paiement confirmé par un paramètre d'URL est un paiement confirmé par le
client*.

**Le reste, en une ligne chacun.** Les trois natures d'erreur (`refused` / `unavailable` /
`offline_forbidden`) sont dans l'enveloppe et dans `critical-rules.md` §8. La file hors ligne est
bornée à mes deux familles. Les baux de prise en charge existent. Le second verdict est refusé
**avec le gagnant**. Les trois axes de modération sont séparés. Mes deux exceptions de pagination
sont accordées (D-010) avec `pendingCount` séparé pour la pastille. `resume:too_old` existe. Le
canal est **par personne**, multi-chaînes. `measuredAt` est à l'ingest. Le dépôt signé est à
15 min, l'export à 60. Le vocabulaire de causes d'incident existe, séparé des issues, avec
`IncidentTrigger.AUTO`. Et `critical-rules.md` §9 grave mon exigence d'horloge : « un décompte se
calcule contre `servedAt`, jamais contre l'horloge du client ».

Je n'y reviens pas. Ce qui suit est ce qui ne tient pas.

---

## Ce qui n'est pas satisfait

Douze points. Les quatre premiers sont graves : chacun casse un mécanisme que le contrat déclare
par ailleurs tenir.

### C1 — Quatre de mes dix-huit pages n'ont aucun porteur de droit, dont la page de garde

`EffectiveRights.navigation` a un vocabulaire **fermé** de quatorze entrées :

```
[agenda, dashboard, moderation, crew, events, stream, stats, tickets, store,
 replays, payouts, journal, settings, help]
```

Mes quatre pages contextuelles — `regie`, `wizard`, `event`, `inbox` — n'y sont pas, et **aucun
autre champ ne les autorise**. `canOps`, `canTech` et `canDecideOutcome` existent, mais aucun
texte du contrat ne dit qu'ils ouvrent `regie` ou `wizard`.

**La conséquence est mesurable** : la barre du bas d'un régisseur ne peut pas contenir `regie` —
sa page de garde, celle qu'il ouvre quand le flux tombe. Elle contiendrait `agenda`, `stream`,
`events` et rien d'autre.

Et le chemin par lequel on y est arrivé mérite d'être dit. J'avais signalé, et l'errata a retenu
en **E6**, que « `TAB_PREF.regie` nomme une page que `ACCESS` refuse ». La résolution a été de
**retirer la page du vocabulaire** plutôt que de réconcilier les deux tables. On a supprimé la
destination principale de la garde pour faire disparaître l'incohérence qui la signalait.

Ce n'est pas un oubli de chemins : `/v1/dates/{dateId}/run`, `/run/state`, `/run/health-samples`,
`/incidents`, `/stream-key/*` existent tous et servent la régie très bien. C'est **le droit** qui
manque, pas la donnée.

### C2 — La barre de quatre onglets ne se dérive pas de `navigation`, et la preuve est arithmétique

`navigation` est décrite comme servie « dans l'**ordre canonique** ». C'est `ORDER`. Or la barre
n'est pas `ORDER` tronqué à quatre : c'est `TAB_PREF`, un ordre **par rôle**, différent.

Pour `artist`, `ORDER ∩ ACCESS` donne dans l'ordre :

```
dashboard · crew · events · stream · stats · tickets · store · replays · payouts · journal · settings · help
        ↑ les quatre premières : dashboard, crew, events, stream
TAB_PREF.artist                 : dashboard, events, crew, tickets
```

**Deux différences sur quatre.** Prendre les quatre premières entrées de `navigation` met
`stream` dans la barre d'un artiste et en sort `tickets` — la billetterie, ce qu'un artiste
regarde le plus. Pour `prod`, `regie` et `tres`, l'écart est du même ordre.

J'avais demandé que `TAB_PREF` vive dans `@arthome/core`, parce que le studio web ordonne le même
menu et que `critical-rules.md` §2 l'impose — « toute valeur affichée deux fois vient de
`@arthome/core` : deux *appels* sont permis, deux *implémentations* jamais ». Recherche faite sur
tout le dépôt : **`TAB_PREF` n'apparaît qu'une seule fois**, dans `corrections-handoff.md`, comme
l'errata E6. Elle n'est ni dans le contrat, ni nommée comme appartenant au domaine. Deux surfaces
vont donc l'implémenter deux fois, et c'est exactement le cas que la règle 2 interdit.

### C3 — L'optimistic lock de la modération confond le bail et la décision, et annule la file hors ligne

C'est ma contestation la plus grave, et elle se démontre avec les **exemples du contrat
lui-même**.

```
POST /moderation/items/{id}/claim    → data: { state: claimed,  …, version: 2 }
DELETE /moderation/items/{id}/claim  → data: { state: reported, …, version: 3 }
POST /moderation/items/{id}/verdict  ← body: { verdict: mute, …, expectedVersion: 2 }
```

Poser puis relâcher un bail — **sans rien trancher** — fait passer la version de 1 à 3. Donc :

> Un modérateur lit la file à `version: 1`. Le réseau tombe. Il tranche ; le verdict part en file
> hors ligne avec `expectedVersion: 1`. Pendant ce temps un confrère prend la ligne en charge
> puis la relâche, **sans verdict**. À la reconnexion, le verdict est refusé.

La file hors ligne est **la seule concession accordée au mobile**, et le bail la vide de son
contenu. Sur un direct à 60 messages par minute, les lignes changent de bail sans arrêt.

Le défaut est plus profond qu'un compteur mal placé. La règle réelle de la maquette est une
**supersession** : « prendre en charge n'est pas trancher — tant que le confrère n'a pas rendu de
verdict, **votre sanction s'applique** ». Un verdict doit donc être **accepté** pendant qu'un
autre tient le bail. Un compteur unique ne peut pas exprimer « refuse si tranché, accepte si
seulement réclamé ».

Et le contrat se contredit sur ce point : le **seul** 409 documenté sur `/verdict` est
`MODERATION_ALREADY_SETTLED`. De deux choses l'une — soit `expectedVersion` est réellement
vérifié, et il manque un `STATE_CONFLICT` non documenté qui refusera des verdicts légitimes ;
soit il ne l'est pas, et `expectedVersion` est décoratif alors que le contrat en fait sa garantie
de conditionnalité.

**Correctif demandé** : conditionner le verdict sur l'**axe du règlement** — `settledAt` nul, ou
un `decisionVersion` que **seul un verdict incrémente** — et laisser `version` porter le bail.
Deux axes séparés, ce qui est précisément la doctrine que le contrat applique déjà, et bien, aux
trois états de modération.

### C4 — `RIGHTS_VERSION_STALE` est inémettable, et c'est exactement le cas de la transition

Le contrat pose la doctrine en toutes lettres : trois codes distincts — `FORBIDDEN`,
`RIGHTS_VERSION_STALE`, `CHANNEL_ACCESS_REVOKED` — « parce que la personne doit savoir s'il faut
recharger, appeler, ou renoncer ». La réponse porte `X-Arthome-Rights-Version`.

Mais **aucun paramètre de requête ne porte la version que le client détient**. La liste complète
des paramètres réutilisables du document est : `Traceparent`, `Surface`, `IdempotencyKey`,
`ChannelId`, `DateId`, `Page`, `PageSize`, `SortBy`, `SortDir`, `Cursor`, `Limit`. Rien d'autre.

Le serveur ne peut donc pas distinguer « tu n'as jamais eu ce droit » de « tu l'avais il y a deux
cents millisecondes ». Deux des trois codes sont hors d'atteinte, et il ne reste que `FORBIDDEN` —
c'est-à-dire l'indistinction que les trois codes existaient pour supprimer.

**C'est précisément la question posée** : un événement arrive pendant une transition. Sous
`ion-router-outlet` la page est déjà poussée, la requête est déjà partie. Elle revient en 403. Si
le code est `FORBIDDEN`, l'application renvoie l'opérateur à l'accueil comme s'il n'avait jamais
eu le droit ; si c'est `RIGHTS_VERSION_STALE`, elle recharge l'amorçage et **retrouve sa place**.
La différence, en garde, est entre « je continue » et « j'ai perdu mon écran ».

Il manque un en-tête de requête — `If-Rights-Version`, symétrique de celui de la réponse.

**Et il y a deux horloges de révocation, pas une.** `realtime.md` §3 : « le serveur fait quitter
les salles d'une chaîne perdue **sans attendre une reconnexion** » — immédiat. Le préambule de
`studio.yaml` : « la fraîcheur maximale de l'autorisation est de **60 secondes**, durée du jeton
interne frappé par le BFF ». Pendant une minute, la console est muette mais la commande passe
encore. Laquelle fait foi à l'écran ? Le contrat ne le dit pas, et un modérateur qui voit sa file
se figer pendant que ses verdicts aboutissent ne comprendra ni l'un ni l'autre.

### C5 — Quatre commandes exigent un `reauthToken` que rien n'émet

`stream-key/reveal`, `stream-key/rotate`, `ownership-transfer` et la suppression de chaîne
déclarent `required: [reauthToken]`. **Aucun point d'entrée du BFF studio ne le frappe.**
`adr-auth.md` §6.1 renvoie au plugin `one-time-token` de better-auth — un détail d'implémentation
d'`identity`, pas un contrat de surface. Le contrat exige un jeton qu'il n'offre pas.

Et la question de fond n'est pas tranchée pour la coquille native : **par quel facteur ?**
Renouveler la clé de flux est le geste d'urgence du régisseur — « le geste à faire après chaque
prestataire », et celui qu'on fait quand on soupçonne une clé fuitée pendant un direct. Si la
réauthentification est un mot de passe à taper dans une salle noire, à une main, la garantie se
paie en antenne noire. Si c'est la biométrie de l'appareil, il faut le dire, et dire ce qui se
passe quand elle échoue.

### C6 — Aucune gestion d'appareil, aucune révocation, aucune déconnexion

La réponse à ma question 1 promet « **révocation par appareil** ». Le contrat du studio n'offre
ni `/me/sessions`, ni `/me/devices`, ni révocation, **ni déconnexion**. La feuille « Mon compte »
de la maquette porte pourtant « SE DÉCONNECTER », et c'est la seule sortie qu'un opérateur a.

`adr-auth.md` §6.5 ne donne la révocation d'appareil qu'au **téléviseur partagé** — `Device` et
`DeviceSession` sont les notions de l'appairage RFC 8628, pas celles d'une session porteuse de
jeton sur un téléphone. Sans notion d'appareil attachée à la session mobile, « révoquer ce
téléphone » n'a pas de référent.

Ce que cela vaut concrètement : un téléphone oublié dans une salle ouvre une console de
modération et la révélation d'une clé de flux **sur des chaînes qui n'appartiennent pas à son
porteur** — un indépendant intervient sur plusieurs chaînes, c'est la prémisse de toute cette
surface. Le contrat n'offre aucun geste, ni à la personne, ni au propriétaire de la chaîne.

### C7 — Aucun enregistrement de jeton de notification

Ma question 10 est répondue « routage par rôle et par chaîne décidé côté serveur, enregistrement
d'appareil par compte, charge utile portant chaîne + date + page cible ». Le routage serveur est
acquis — `escalate` rend `routedToRoles`. Mais il n'existe **ni point d'entrée ni schéma** pour
déclarer un jeton FCM : recherche faite sur `push`, `fcm`, `apns`, `deviceToken` dans
`studio.yaml`, aucune occurrence hors du préambule sur la redaction.

Sans lui, la garde ne peut pas être réveillée application fermée. C'est la moitié de la raison
d'être d'un outil de garde : « file de modération saturée », « aucun modérateur affecté à J-1 »,
« débit instable » sont des alertes qui arrivent quand l'application n'est pas au premier plan.
La redaction des montants dans la charge utile est promise ; la charge utile n'a pas de
destinataire.

### C8 — `GET /changes` n'existe que sur le BFF storefront

`realtime.md` §5.2 décrit exactement le mécanisme dont j'ai besoin :

```
GET /changes?since=<servedAt>&scope=… → { invalidated: [...], servedAt, complete: bool }
```

Il rend **une liste d'invalidations, pas les données**, et `complete: false` signifie « recharge
tout » — la même honnêteté que `resume:too_old`. Le document l'attribue à « un besoin propre au
storefront mobile ».

Il est dans `openapi/storefront.yaml`. Il n'est **pas** dans `openapi/studio.yaml`.

C'est pourtant le besoin que j'avais nommé, et pour une raison qui n'existe que chez moi : sous
`ion-router-outlet`, une page **reste dans le DOM** après qu'on l'a quittée et se réaffiche telle
quelle au retour. Il faut une lecture bon marché de fraîcheur, sinon chaque retour sur une page
est soit un affichage périmé, soit un rechargement complet sur la 4G d'une salle. Le studio a
`servedAt` et `rightsVersion` par réponse, mais rien qui dise en un appel « voici ce qui a
changé » pour les six lectures d'un écran. Le mécanisme est écrit, motivé, spécifié par un autre —
et non branché chez moi.

### C9 — Deux pages sont nommées dans `navigation` et n'ont aucun point d'entrée

`dashboard` et `stats` figurent dans le vocabulaire de `navigation` et dans l'exemple servi par
l'amorçage. Il n'existe dans `studio.yaml` **ni chemin, ni schéma** qui les serve : la liste
complète des schémas ne contient aucun agrégat de mesure, et la seule trace de statistiques est
`stats_csv` comme type d'export comptable.

Ce n'est pas une page secondaire. **`dashboard` est la première entrée de `TAB_PREF` pour
`artist`, `prod` et `tres`** — l'onglet par défaut de trois personas sur six. Tel quel, trois
personas ouvrent l'application sur un écran que le contrat ne remplit pas.

### C10 — Le motif « un appel par volet » n'est implémenté que pour un volet sur six

`GET /dates/{dateId}/sheet` sert `openPanes`, et sert mieux que ma demande : **par date** plutôt
que par chaîne. La description pose le motif : « un appel pour la fiche, puis **un appel par volet
ouvert, chez son propriétaire** », avec mon propre argument en justification — « un modérateur
doit pouvoir charger le volet `chat` **sans** charger la fiche entière, sinon la billetterie
transite pour rien ».

Seul `/v1/dates/{dateId}/panes/tickets` existe. Il n'y a pas de volet `chat`, `tech`, `crew`,
`replay` ni `public`.

L'argument est donc **défait par sa propre mise en œuvre** : un `mod` dont le seul volet est
`chat` doit appeler `/sheet` — ne serait-ce que pour apprendre quels volets lui sont ouverts —
puis n'a nulle part où aller. Des chemins voisins existent (`/dates/{id}/crew`, `/run`,
`/chat-policy`, `/replay-policy`) et couvrent peut-être la matière, mais alors le motif annoncé
est faux et la surface ne sait pas quel chemin appeler pour quel volet.

### C11 — `Duty` ne porte pas le fuseau de la salle

`DateSheet` porte `venueClock { venueTimezone, venueUtcOffsetMin }`. `Duty` porte `dateId`,
`channelId`, `channelName`, `title`, `crewRole`, `startsAt`, `runState`, `overlapsWith`,
`accessExpiresAt` — et pas le fuseau.

Or l'écran de garde, qui est l'**écran d'accueil de cette surface**, affiche pour chaque garde
l'heure de salle **et** l'heure de la personne. C'est la doctrine du dossier (« heure du
spectateur d'abord, heure de salle en second »), c'est D3, c'est E7 — et c'est un besoin explicite
de mon document, cité dans la réponse qui m'est faite.

Rendre l'heure de salle sur la liste de gardes demande donc un appel par garde : **exactement le
N+1 que l'amorçage existe pour tuer**, et sur le seul écran qu'un régisseur ouvre en arrivant dans
une salle. Manque aussi `runtimeMin`, que la ligne affiche (« durée annoncée »). La **règle** est
sauve — `overlapsWith` est servi et calculé dans `@arthome/core`, ce qui est juste — mais pas
l'affichage.

### C12 — Sept trous d'écran, nommés

Moins graves, mais chacun est une page ou un geste de la maquette sans contrepartie :

| Manque | Ce qui existe à la place |
|---|---|
| **Matrice équipe** — créneaux par date × poste sur N dates | `/dates/{id}/crew`, un appel par date |
| **Journal des accès** (distinct du journal de chaîne) | `/channels/{id}/journal` seulement |
| **Catalogue de rediffusions** au niveau chaîne | `/dates/{id}/replay-window`, par date |
| **Transfert de place** et **litige bancaire** — deux des trois « demandes en cours » | `/seats/{id}/refund` seulement |
| **Profils d'encodage** nommés, qui « voyagent d'une chaîne à l'autre » | `encodingProfileName`, une chaîne — rien ne stocke les profils |
| **Déconnexion** | rien |
| **`help`** | rien, et rien ne dit que c'est un artefact statique |

---

## Ce qui est satisfait autrement, et si ça me va

**WHEP → LL-HLS (D-019) : ça me va, et c'est mieux que ma demande.** Je demandais qu'on ne
promette pas ce qui n'est pas mesuré ; le contrat va plus loin en servant `monitorPath`
(`whep | ll_hls`) dans l'état du run, donc l'application **annonce** la latence qu'elle a au lieu
de la promettre. Je maintiens la réserve telle que D-019 l'écrit : la mesure sur appareil réel
reste à faire, et elle conditionne aussi **Web Crypto** — donc tout ce qu'on voudrait un jour
chiffrer côté client.

**La battue de vie (`ws:pulse`) est une meilleure réponse que la mienne.** Je demandais que chaque
mesure porte son instant de mesure, pour que l'application puisse dire « mesuré il y a 3 s » au
lieu de « 0 Mb/s ». Le contrat le fait (`measuredAt` à l'ingest) **et** ajoute un mécanisme que je
n'avais pas proposé : plus de pulse pendant 15 s = je suis sourd ; pulse sans échantillon depuis
30 s = la salle n'envoie plus. Deux états, deux écrans, aucune inférence — et le même pulse porte
`serverTime` comme horloge de référence et `seq` comme point de reprise. Trois de mes besoins
réglés par un seul mécanisme. Accepté sans réserve.

**`deviceUpKbps` contre `ingestUpKbps` : mon incohérence 7 est réglée.** Deux noms distincts, et
la phrase qui tranche — « seul `ingestUpKbps` alimente la liste de pré-vol ». Le téléphone n'est
pas l'encodeur, et le contrat le dit maintenant.

**La liste de pré-vol passe de quatre à sept éléments**, dont deux deviennent des avertissements
non bloquants. Mon incohérence 8 visait l'inverse — je demandais qu'elle soit entièrement
serveur ; elle l'est, et elle est de surcroît plus juste que ce que je signalais.

**Les trois axes de modération (E3/D6).** `ModerationItemState` = `reported | claimed | settled`,
état du message = `published | removed`, sanction de personne = `none | muted | banned`, et la
pastille unique **dérivée** par `moderationBadgeOf` avec une préséance servie. `reported` a quitté
le champ des sanctions, exactement comme demandé — et la description du schéma reprend mon
diagnostic : « c'est pour cela que la file se construisait en filtrant `state === 'reported'`, ce
qui n'est pas un filtre d'état mais un filtre de nature ». Accepté.

**Deux ajouts que je n'avais pas demandés et qui sont justes.** `atMediaSec` sur la ligne de file
— l'ancrage média porté jusque dans la modération, ce qui rend le journal relisible sur une
rediffusion. Et `origin: human_verdict | retroactive_filter | author_sanctioned`, qui permet au
journal de distinguer un reclassement automatique d'une décision humaine.

**Mon filet de sécurité est devenu une règle serveur.** `holdScreenAutoAfterSec: 15` est servi
dans les constantes, et son déclenchement produit un incident de même nature qu'un déclenchement
manuel, marqué `IncidentTrigger.AUTO`. C'est mieux que ce que je demandais : je proposais que la
règle existe, le contrat la sert **et** la rend auditable.

**Les constantes servies règlent mon incohérence 6 à moitié.** `chatBurstThresholdPerMinute: 60`
est servi, donc le seuil ne sera pas recopié sur deux surfaces. Il manque la **fenêtre** de la
mesure — voir les questions.

**Le fuseau de lecture** est logé dans `AccountPreferences` d'`identity`, **même champ que le
storefront**. Je demandais qui le possède ; la réponse est plus forte que la question, et elle
règle mon incohérence 9.

**`critical-rules.md` §9** grave mon exigence d'horloge en règle critique du projet : « un
décompte se calcule contre `servedAt`, jamais contre l'horloge du client ». Je demandais un
comportement d'application ; c'est devenu une règle de contrat.

**L'escalade : à moitié.** `routedToRoles: [artist, production]` est servi, le routage est
serveur, et le geste existe pour les rôles sans `canDecideOutcome` — c'était mon besoin. Deux
réserves : la maquette annonce « **2 personnes** ont reçu l'alerte », et des **libellés de rôle**
ne disent pas combien d'humains ont été joints ; et le corps de la commande ne porte qu'un `note`
en texte libre, alors que la maquette promet que « le signalement leur arrive avec le relevé
technique ». Si le relevé est attaché côté serveur depuis l'incident, c'est bien — mais il faut
l'écrire, sinon la surface tentera de le mettre dans la note.

---

## Les questions sans réponse

| # | Question |
|---|---|
| **a** | Sous quelle forme le client déclare-t-il la version de droits qu'il détient ? Sans en-tête de requête, `RIGHTS_VERSION_STALE` est inémettable (C4). |
| **b** | Des deux horloges de révocation — canal immédiat, HTTP à 60 s — laquelle fait foi à l'écran ? |
| **c** | Qui frappe le `reauthToken` des quatre commandes sensibles, et **par quel facteur** sur un téléphone en salle ? |
| **d** | Révocation d'appareil et déconnexion : quel point d'entrée du BFF studio ? |
| **e** | Enregistrement du jeton de notification : quel point d'entrée, et la charge utile porte-t-elle bien `channelId` + `dateId` + page cible ? |
| **f** | `regie`, `wizard`, `event`, `inbox` : quel champ porte leur droit ? `canTech` et `canOps` sont-ils prévus pour cela, ou faut-il élargir `navigation` ? |
| **g** | `TAB_PREF` : où vit-elle, puisque deux surfaces l'affichent et que `critical-rules.md` §2 interdit deux implémentations ? |
| **h** | Le verdict est conditionnel **sur quel axe** exactement, et quels 409 le contrat documente-t-il au-delà de `MODERATION_ALREADY_SETTLED` ? |
| **i** | `dashboard` et `stats` : reportés à un palier nommé, ou omis ? Ils sont dans `navigation` et en tête de `TAB_PREF` pour trois personas. |
| **j** | Les cinq volets de fiche sans point d'entrée : servis par les chemins voisins — et lesquels — ou à écrire ? |
| **k** | Quelle est la **fenêtre** de mesure du débit du tchat ? Le seuil est servi, la fenêtre non — et c'est la moitié qui manquait à mon incohérence 6. |
| **l** | `GET /changes` sur le BFF studio : accordé ou refusé ? Le cache de page d'Ionic en dépend. |
| **m** | L'escalade : le relevé technique est-il attaché côté serveur depuis l'incident, et le nombre de personnes réellement jointes est-il rendu ? |
