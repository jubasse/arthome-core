# Modèle de données

> Agrégats et invariants par contexte, modèles de lecture dupliqués et le flux qui les alimente,
> persistance. Écrit pour `backend-contracts` et pour le portage de `@arthome/core` (palier 1).
>
> Règle de lecture : **`shared/` fait autorité sur les règles et le vocabulaire, pas sur les
> formes.** Chaque fois qu'une fixture est une commodité de maquette, c'est dit.

---

## 0. Conventions qui valent partout

| Sujet | Règle | Motif |
|---|---|---|
| instants | `timestamptz`, **toujours UTC**, jamais de décalage en minutes (D7) | une date programmée dans six mois s'affiche à la mauvaise heure après un changement d'heure |
| fuseau | identifiant **IANA** (`Europe/Paris`) sur la salle, jamais `utcOffsetMin` (D3) | idem |
| décalage | **servi, recalculé à chaque service**, pour l'instant de cette date-là | `storefront-mobile` : embarquer une base de fuseaux coûte cher sur cinq applications. Le calcul a lieu **une fois**, côté serveur : la règle « aucune valeur calculée deux fois » est respectée |
| montants | `bigint` en **unité mineure entière** + `char(3)` code devise ISO | jamais de chaîne formatée stockée ni transportée, sauf dans une facture |
| arrondi | `roundMinor()` dans `@arthome/core`, **à l'unité mineure, sur chaque composante prise séparément** | c'est ce que `shared/` porte et qui fait autorité |
| identifiants | **UUIDv7 généré par le domaine** — voir §7.1 | l'agrégat connaît son identifiant avant l'insertion, ce que l'outbox exige et ce que le brouillon du studio exige |
| vocabulaires | énumérations **typées depuis `@arthome/core`**, jamais écrites en dur dans un service ni dans une application | E2 : la faute dominante du projet, commise sur huit champs par cinq maquettes |
| audit | `created_at`, `updated_at`, `version`, et sur tout agrégat modifié par un humain : `last_actor_id`, `last_actor_surface` | la maquette promet partout « horodaté et nominatif » et aucun champ ne le porte |
| version | `integer`, incrémentée par **UPDATE conditionnel**, jamais par `save()` | `@VersionColumn` + `save()` n'a jamais rejeté une écriture périmée ; le studio est multi-opérateurs sans verrou |
| suppression | `deleted_at` là où une ligne est référencée par un journal ou une facture ; suppression physique ailleurs | conservation comptable de 10 ans |

**Nullabilité.** Chaque champ optionnel est déclaré nullable explicitement, et le contrat distingue
**« non mesuré »** de **« mesuré à zéro »** (`streaming.md` en fait une règle d'honnêteté : un zéro
se lit *parfait*, pas *non mesuré*). Cela vaut pour toutes les métriques de flux, et pour le
compteur de spectateurs, **absent** — jamais zéro — quand la date n'est pas à l'antenne.

---

## 1. `identity`

### 1.1 `Account` — agrégat racine

```
Account
  id                 uuid v7, jamais exposé
  public_handle      citext unique, exposé (« @marie.j ») — voir §7.1
  email              citext unique, + email_verified_at
  phone              nullable, + phone_verified_at
  password_hash      argon2id, nullable (compte social seul)
  totp_secret        chiffré, nullable        backup_codes    hachés
  passkeys           table fille
  member_number      généré, affiché
  status             active | suspended | deletion_requested | anonymised
  created_at · updated_at · version
```

**Invariants.** Un compte sans `password_hash` doit avoir au moins un fournisseur social ou une clé
d'accès. `deletion_requested` gèle les achats mais ne supprime rien (§7.5).

### 1.2 `Profile` — entité de l'agrégat `Account`

Jusqu'à cinq par compte (contrainte du téléviseur, mais portée par le compte). Nom, avatar
dimensionné, `kind` (`adult | child`), et pour un profil enfant la **liste des disciplines
autorisées**. Le filtrage du catalogue enfant se fait **côté serveur** : sinon la TV d'un enfant
télécharge le catalogue adulte pour le masquer.

### 1.3 `Device` et `DeviceSession` — deux agrégats, pas un

Coupe retenue, celle d'`adr-auth.md` §4/Q3, qui résout E13 (`devices` a deux formes sous un seul
nom) et l'incohérence 11 de `storefront-mobile` :

- **`Device`** — l'appareil **enregistré**, durable, révocable. Identifiant obtenu au premier
  lancement, **avant toute session**. Nature, libellé, ville dérivée de l'adresse, `last_seen_at`,
  `push_token` nullable (délégué à `notifications`, ici seulement le lien).
- **`DeviceSession`** — le couple **(appareil, profil)**. Un téléviseur de salon en porte jusqu'à
  cinq : c'est ce qui donne un sens à « les autres comptes restent connectés ».

**Invariants.** Fermer une `DeviceSession` déconnecte **un profil** et laisse les autres.
Révoquer le `Device` supprime l'appareil, **toutes** ses sessions, et publie
`identity.device_revoked.v1`, que `streaming` consomme pour invalider ses **baux de lecture** :
un appareil révoqué ne peut plus renouveler un jeton, effet visible ≤ 60 s.

### 1.4 `DevicePairing` — agrégat racine

```
DevicePairing
  id · device_id · profile_id (nullable pour `signin`)
  intent          signin | seat | plan | payment_method | merch
  user_code       char(6), alphabet déclaré par adr-auth.md §5.1 (sans confusables)
  payload         jsonb, opaque à identity, relayé au service cible
  state           pending | approved | denied | expired | cancelled | approved_with_failure
  approved_by_account_id   nullable
  expires_at · created_at · version
```

**Invariants.**
- `user_code` est unique **parmi les appairages `pending` seulement** — index partiel
  `WHERE state = 'pending'`. Un code se réutilise après expiration, sinon l'espace s'épuise.
- Une seule transition depuis `pending`. Un second appel sur un appairage tranché rend l'issue
  d'origine, jamais une erreur (idempotence : la TV et le téléphone peuvent tous deux relancer).
- Le compteur de tentatives est par `user_code` **et** par `device_id`, pas par adresse IP.
- Le résultat de l'intention (place créée, abonnement, moyen de paiement) **n'est pas stocké ici** :
  `identity` relaie le `payload` au service cible, qui exécute et publie. L'appairage porte la
  référence, et `PairingOutcome` est composé par le BFF. Sinon `identity` connaîtrait la
  billetterie.

### 1.5 `Channel` — agrégat racine (la chaîne comme **espace de travail**)

```
Channel
  id · owner_account_id · verified_at (nullable) · created_at · version
  members[]        ChannelMembership
  invitations[]    ChannelInvitation
```

```
ChannelMembership
  id · channel_id · person_id
  roles          set<MemberRole>   ← un ENSEMBLE, jamais un rôle unique
  is_owner       bool              ← jamais retirable
  joined_at · note
```

**Vocabulaire `MemberRole`, huit valeurs, celui de `catalogue.json`** :
`artist · production · coordination · director · video · sound · moderation · treasury`.
Le repli à six personas est **un libellé**, il n'apparaît dans aucune réponse (E6).

**Invariants.**
- `is_owner = true` sur exactement une ligne ; elle n'est jamais supprimable ni modifiable en
  rôles. `transferOwnership` déplace le drapeau, et exige que le destinataire soit **déjà membre**
  et dispose de la **double authentification**.
- `inviteMember(role)` n'est permis que si `role ∈ assignableRolesOf(roles)`, projection de
  `grants` sur les rôles tenus. Sinon refus avec le code et **la liste des rôles attribuables
  depuis ce niveau**, et à qui s'adresser.
- Supprimer une chaîne est refusé tant qu'il reste une date en vente ou un versement dû — faits
  projetés depuis `ticketing` et `payouts`, tenus en local, jamais demandés en synchrone.

### 1.6 `DateAccessGrant` — agrégat racine (le renfort ponctuel)

Portée **une date**, avec `expires_at` **explicite et servi** (« expire au salut + 1 h » est une
phrase d'écran ; le contrat porte l'instant). `crew_role` (`director | video | sound | moderation`),
jamais un `MemberRole` complet. Révocable sans toucher à l'appartenance à la chaîne.

**Invariant structurant** : l'affectation du créneau `director` est ce qui **donne accès à la clé
de flux**. Elle est donc réservée à `artist ∨ production`, et le contrat rend cette raison
explicite plutôt que de la laisser deviner.

### 1.7 `Person` — l'annuaire

Identité professionnelle : nom, ville, indépendant ou non, rôles tenus, `channels[]`,
`runs_called`. **`runs_called` est un modèle de lecture**, pas un champ écrit à la main : il
s'incrémente sur `streaming.run_ended.v1`.

### 1.8 Préférences, consentements, relations

- `AccountPreferences` — **portée compte** : langue d'interface, sous-titres par défaut,
  description audio, comportement à l'ouverture d'un direct (`peek | muted | off`), tchat
  ouvert/fermé, devise d'**affichage**, **fuseau de lecture**.
- `DevicePreferences` — **portée appareil** : qualité par défaut, taille des sous-titres,
  réduction des animations, aperçu vidéo automatique, disposition de régie, profils d'encodage
  nommés.

  **Réponse à `storefront-tv` Q8 et `storefront-mobile` §14 : deux portées, et le contrat le dit
  champ par champ.** La taille des sous-titres et la réduction des animations dépendent du
  téléviseur et de la pièce ; la langue et le fuseau dépendent de la personne. Une portée unique
  se tromperait la moitié du temps. Le fuseau de lecture du studio est **le même champ** que celui
  du storefront : même compte, un seul porteur (`studio-mobile` incohérence 9).

  **La ressource de préférences est additive et tolérante** : une clé inconnue d'une version de
  l'application n'est ni rejetée ni effacée à la prochaine écriture. Sinon la version mobile en
  revue de magasin écrase les réglages posés depuis le studio web. L'écriture est **champ par
  champ**, jamais document entier.
- `Consent` — quatre finalités (`audience`, `perso`, `partners`, `ads`) et deux catégories de
  traceurs. **Horodaté par le serveur et versionné avec la version du texte accepté** : un
  consentement sans version ni date ne vaut rien. `ads` est à `false` par défaut, et **ce défaut
  est une décision du contrat**, pas un réglage.
- `ArtistFollow`, `WatchlistEntry` — relations plates, déclaratives. **Ce sont des mises en état,
  pas des bascules** : deux envois du même « suivre » laissent un seul suivi ; une bascule sur un
  réseau douteux inverse le résultat.

  **`followArtist` crée-t-il un abonnement de notification ?** (`storefront-tv`). Non : deux
  réglages distincts. `ArtistFollow` est une relation de catalogue ; l'alerte est un drapeau
  **par artiste suivi** porté par `notifications`. La maquette mobile montre les deux séparément,
  et les confondre rendrait impossible de suivre un artiste sans être notifié.

---

## 2. `catalog`

### 2.1 `Show` — agrégat racine

Titre et synopsis **dans les deux langues quand elles existent**, distribution, discipline, **liste
de sous-genres** (§2.6), étiquettes, durée, `languageDependency`, visuels.

### 2.2 `Date` — agrégat racine

```
Date
  id · show_id · venue_id · channel_id
  slug                  stable, par langue (§2.7)
  starts_at             timestamptz UTC
  runtime_min           dénormalisé depuis le spectacle (il se fige à la publication)
  rights                scope (worldwide | restricted) · territories[] · reason_code
  replay_policy         included | subscription | unit | none
  replay_window_hours   int
  outcome               nullable : postponed | cancelled | interrupted
  rescheduled_to        nullable timestamptz
  outcome_declared_at · outcome_declared_by
  created_at · updated_at · version
```

**Invariants.**
- `replay_policy = 'none'` est **définitif** pour cette date : on ne peut pas activer ensuite une
  rediffusion qu'on a promis de ne pas faire, le tarif public en dépendait. Les autres valeurs se
  verrouillent à l'ouverture de la billetterie.
- `outcome` n'est jamais réécrit ni effacé : une issue déclarée est un fait.
- `rescheduled_to` n'existe que si `outcome = 'postponed'`.
- `reason_code` est un **code** (`co_production | broadcaster | festival`), jamais une phrase.
  Le jeu actuel porte `label`/`labelEn` rédigés dans la donnée : c'est une fuite d'i18n (E8).

**Ce qui n'est pas sur cette table, et que la fixture y met** : `prices`, `seats`, `revenue`,
`sold`, `viewers`, `chatMode`, `publication`, `publishedBy`. Recopier la forme de la fixture
graverait un modèle de lecture dans le contrat d'écriture.

### 2.3 `Publication` — agrégat racine

```
Publication
  id · date_id · channel_id
  state           draft | reserve | scheduled | technical | live | ended | replay-online
  order_rank      int, servi avec l'état  ← le tri par état du studio suit la machine, pas l'alphabet
  published_at · prices_locked_at · replay_online_at
  checklist       7 éléments, chacun avec son état et sa source
  last_actor_id · last_actor_surface · version
```

**La machine, et ce qui la fait avancer.**

| Depuis → vers | Déclencheur | Sans retour |
|---|---|---|
| `draft → reserve` | commande studio | non |
| `reserve → draft` | commande studio | — |
| `draft \| reserve → scheduled` | commande studio | **oui** — *la publication engage le tarif affiché* |
| `scheduled → technical` | commande studio | non |
| `technical → scheduled` | commande studio | — |
| `technical → live` | **`streaming.run_started.v1` consommé** | — |
| `live → ended` | **`streaming.run_ended.v1` consommé** | — |
| `ended → replay-online` | commande studio, gardée | **oui** — *des spectateurs ont payé pour la rediffusion* |

**Ce point est la réponse au « agrégat à cheval sur trois contextes ».** `Publication` ne commande
pas l'antenne : elle l'**apprend**. La commande « passer à l'antenne » va à `streaming`, qui seul
sait si le flux entre. Deux transitions sur huit sont donc causées par un événement, et
`Publication` reste un agrégat d'un seul contexte.

**Invariants.**
- Le verrou porte sur le **couple** `from > to`, pas sur l'état (E5). Refus : `TRANSITION_IRREVERSIBLE`
  + la transition visée + la promesse engagée, en paramètres.
- Toute transition est **conditionnée à la version** : partie de `technical` alors que l'état
  courant est `live`, elle est refusée par `STATE_CONFLICT` **avec l'état et la version courants**.
  Le studio est multi-opérateurs sans verrou : l'arbitrage est sur le serveur.
- Toute transition porte `Idempotency-Key` — **obligatoire, pas recommandé** : elle engage un tarif
  public ou une vente.
- Les transitions offertes sont servies **pour cet opérateur**, calculées par
  `nextPublicationTransitions(state, effectiveRights)`. Sinon chaque surface recalcule la table.

**La liste de contrôle, sept éléments, et trois viennent d'ailleurs :**

| Élément | Source |
|---|---|
| `title_and_discipline`, `poster`, `description` | `catalog`, ses propres champs |
| `at_least_one_active_price`, `capacity` | **projetés** depuis `ticketing.pricing_changed.v1` et `ticketing.capacity_set.v1` |
| `technical_check_passed` | **projeté** depuis `streaming.technical_check_passed.v1` |
| `chat_mode_set` | **projeté** depuis `chat.date_chat_policy_changed.v1` |

Servie comme une **liste d'identifiants manquants**, jamais un pourcentage. « Chapitres prévus »
et « modérateur affecté » deviennent des **avertissements non bloquants** : on doit pouvoir publier
une date sans chapitres.

### 2.4 `Venue`, `Artist`, `Taxonomy`

`Venue` : nom, ville, pays, région, **zone IANA**, capacité, type de salle. `utcOffsetMin`
disparaît (D3).

`Artist` : la **face publique** de la chaîne, 1:1 avec `identity.Channel` par `channel_id`. Nom,
biographie bilingue, avatar, discipline, pays, date d'arrivée. `followers` et `avg_viewers` sont
des **compteurs projetés** (§4), avec une fraîcheur déclarée : un compteur faux de 3 % n'est pas
grave, un compteur qui diffère entre la fiche et la liste l'est.

`Taxonomy` : 2 univers, 21 disciplines, 176 sous-genres, 205 étiquettes, 7 groupes d'attributs,
et le **rang éditorial** (`rank`) qui fait autorité — **aucune surface ne réordonne**. Servie comme
**artefact versionné immuable**, par langue et par surface, pas comme une table d'API.

### 2.5 `SavedSearch` — agrégat racine

```
SavedSearch
  id · account_id
  scope           search | category           category_id nullable
  name            libre, nullable
  query_text · criteria (jsonb normalisé) · criteria_version (int) · criteria_signature (text)
  tab · sort · channels[] (push | email | in_app) · active · created_at
```

**Trois invariants qui répondent aux trois besoins des surfaces.**
1. **Les valeurs de filtre sont des identifiants stables**, jamais des indices de tableau. La
   maquette filtre sur `fCats: [1]` — une position. Une position ne survit ni à une URL
   partageable, ni à une recherche enregistrée, ni à l'insertion d'une discipline.
2. **`criteria_version`** : quand la grammaire des filtres change, une recherche d'hier
   **s'exécute encore** si la migration est possible, sinon elle se marque `stale` et le dit.
   Elle ne disparaît jamais en silence. Réponse à `storefront-web` Q24.
3. **`criteria_signature`** est produite par `normalizeSearchCriteria()` dans `@arthome/core` —
   une seule fois, jamais côté client. C'est elle qui répond « déjà enregistrée » sur deux écrans
   et qui déduplique à l'écriture.

**Le compteur de correspondances** (`storefront-web` Q23) : ni temps réel, ni recalculé à chaque
affichage de la page Compte. **« Nouvelles depuis votre dernière visite »**, tenu par un compteur
incrémenté par le *percolator* quand une date nouvelle correspond, remis à zéro à la lecture. Dix
recherches par compte font alors **zéro** requête de comptage à l'ouverture de la page. Les deux
autres options coûtent dix agrégations par affichage, pour une information dont personne ne
mesurera l'exactitude.

### 2.6 Le sous-genre est **multiple** (E9, `storefront-web` incohérence 5)

`taxonomy.json` le déclare « optionnel, multiple », `catalogue.json` le porte au singulier, et le
filtre de recherche du web est une multi-sélection. **Le contrat tranche : `genre_ids[]`.** Un
spectacle qui est à la fois « contemporain » et « répertoire » existe ; le singulier l'interdisait.

Et **`attributes` porte en réalité des étiquettes** : `revival`, `new-creation`, `opening-night`,
`open-air`, `archive` sont des *tags* au sens de `tagPolicy`, pas des valeurs des sept groupes
d'attributs. Collision de nom entre deux notions : le contrat les sépare en `tag_ids[]` et
`attributes{}`.

### 2.7 L'URL canonique et les slugs

**Il n'existe pas d'URL canonique pour une date**, et c'est un manque de premier ordre : c'est ce
qu'on partage, ce qu'on met en favori, ce vers quoi pointent un rappel et une notification, ce
qu'on indexe. La maquette web adresse la page par artiste et résout « la date courante » à
l'arrivée — donc le partage, les rappels et le référencement pointent tous vers une cible qui
change.

**Le contrat porte** : `Date.slug` et `Show.slug`, stables, **par langue** (`slug_fr`, `slug_en`),
et une **`canonical_url` servie**, jamais construite par la surface. C'est elle que la TV encode
dans un QR pour l'action Partager (`storefront-tv` Q10, E15), et c'est elle que le web utilise
pour ses liens alternatifs croisés.

---

## 3. `ticketing`

### 3.1 `DateSales` — agrégat racine (la face commerciale d'une date)

```
DateSales
  date_id (racine) · channel_id · market_id · currency
  capacity_total · capacity_tiers[]  (ouverts par paliers, jamais réduits après mise en vente)
  seats_available · waitlist_count
  price_tiers[]     full | reduced | support, montant en unité mineure
  service_fee_rule  barème servi, pas une constante d'écran
  promotions[]      motif · prix barré · prix courant · fenêtre de validité
  replay_unit_price nullable, quand replay_policy = 'unit'
  prices_locked_at  nullable
  complimentaries[] émises / allouées, par catégorie
  technical_provision  seuil, provision, échéance de révision, exposition au malus
  version
```

**Invariants.**
- La jauge **s'élargit par paliers, jamais ne se réduit** après la mise en vente.
- `seats_available` ne descend jamais sous zéro : la décrémentation et la création de la place sont
  **dans la même transaction**. C'est l'invariant de concurrence le plus dur du système.
- **Ouvrir un palier prévient la liste d'attente dans le même geste** : une seule commande
  transactionnelle, avec la **fenêtre de priorité (2 h) comme paramètre de domaine**. Deux appels
  laisseraient la rareté se dissiper entre eux.
- Au-delà de **10 000 places**, l'infrastructure se provisionne à l'avance ; un prévisionnel très
  au-dessus du réel entraîne un malus ; révisable jusqu'à **72 h** avant. **Seuil, provision,
  échéance et exposition sont des données du contrat**, pas des constantes recopiées sur cinq
  surfaces (`studio-web` Q25, `studio-mobile` #13).
- Les tarifs se verrouillent à la mise en vente (`publication.engaged` consommé) ; l'horaire se
  verrouille à l'antenne.
- « Appliquer à la série » **exclut les tarifs et la jauge** : chaque date engage ses propres
  acheteurs.

**Le prix payé n'est pas le prix du palier.** Le récapitulatif est composé **côté serveur** :
`palier + frais de service − remise d'abonnement − promotion = total`. Les quatre lignes viennent
du contrat. C'est exactement le cas « un total composé à deux endroits » que le dossier cite comme
défaut typique.

**Réponses que cela rend** :
- `storefront-web` Q11 — les **frais de service sont par place**, et le barème est servi. Le
  storefront web affiche une ligne « frais de service » dans son récapitulatif : elle doit être
  calculable une seule fois.
- `storefront-web` Q12 — la remise d'abonnement sur les places (`seatDiscount`, 10 % / 20 %) et la
  remise boutique (15 %) sont **deux remises sur deux assiettes** ; elles ne se confondent pas
  (E1). **Elles ne se cumulent pas avec une promotion** : on applique **la plus favorable au
  spectateur**, et cette règle est dans `@arthome/core`. Sinon elle sera écrite trois fois.
- `storefront-web` Q10 — le prix envoyé avec l'achat est **vérifié** ; le refus a un code
  **distinct** de l'échec de paiement : `PRICE_STALE`, avec le prix courant en paramètre. Avec cinq
  motifs de promotion dont un calculé au prorata du temps écoulé, l'écart entre le prix affiché et
  le prix valide est **structurel, pas accidentel**.
- Le tarif « séance commencée » (`late-rate`) est **au prorata du temps restant** : il ne peut pas
  être une chaîne figée. Le contrat porte **la règle et ses paramètres**, et sert le prix courant
  avec sa `validUntil` (60 s).

### 3.2 `SeatHold` — la réservation de jauge, et sa durée

Remontée par `auth` et elle engage `ticketing` : **la durée d'un appairage `seat` doit être la
durée d'un `hold` de places**, sinon la jauge affichée sur la TV est fausse pendant tout le temps
de l'attente. Le cas est concret : la TV montre « 12 places », le spectateur part chercher son
téléphone, et pendant cinq minutes rien ne garantit que ces douze places existent encore.

```
SeatHold
  id · date_id · account_id · profile_id · tier · quantity
  origin        checkout | pairing        origin_ref  (session de paiement | pairing_id)
  expires_at    timestamptz
  state         active | consumed | expired | released
```

**L'invariant, et c'est lui la réponse :**

> **`SeatHold.expires_at` est le MÊME instant que l'expiration de l'intention d'achat qui l'a
> créé.** Un seul instant, porté par les deux objets, jamais deux durées qui dérivent.

| Origine | Intention | `expires_at` du hold |
|---|---|---|
| paiement web ou mobile | session de paiement | **15 min** |
| appairage TV, `intent = seat` | `DevicePairing` | **5 min** — celle de l'appairage |

Le hold est posé **à l'ouverture de l'appairage**, pas à son approbation : c'est à l'instant où la
TV affiche le code que la jauge doit devenir vraie. Et cela **justifie après coup la durée de 5 min
retenue pour `seat`** (`adr-auth.md` §4/Q4) : une durée d'appairage est un engagement de jauge, et
quinze minutes d'engagement par spectateur hésitant videraient une salle populaire sans qu'aucune
place ne soit vendue.

**Deux conséquences que `backend-contracts` doit porter :**

1. `seats_available` servi au public est **net des holds actifs** — sinon deux spectateurs
   achètent la dernière place ;
2. l'expiration d'un hold republie `ticketing.date_sales.availability_changed.v1`, donc la jauge
   **remonte** sur toutes les surfaces sans qu'aucune n'ait rien demandé.

### 3.3 `Seat` — entité, et `SeatOrder` — agrégat racine

```
Seat
  id · date_id · account_id · profile_id (nullable) · tier
  seat_code       émis par le SERVEUR                    ← jamais dérivé côté client
  state           held | active | cancelled | refunded | transferred | credited
  cancel_deadline timestamptz servi                      ← jamais la phrase « jusqu'à 1 h avant »
  order_id
```

**Le code de place est émis par le serveur** (`storefront-web` Q18). Il s'affiche à l'identique sur
le web, le mobile et la TV. La maquette le calcule par hachage : porté tel quel, il donnerait
**trois codes différents pour la même place** dès qu'une surface change de fonction de hachage.
Format servi, jamais recomposé.

### 3.4 `MerchOrder` — agrégat racine, et `MerchItem`

`MerchItem` : identifiant, spectacle, chaîne, libellé **bilingue** (E10 : `merchPool` n'a pas de
`labelEn`, lacune de donnée à combler au portage), nature, **variantes** (un t-shirt sans taille
n'est pas vendable — `storefront-web` Q17), prix, stock, état (`on_sale | out_of_stock`), **source**
(`arthome | shopify | woocommerce | prestashop | drupal | api`), et l'adresse marchand pour les
sources externes.

**Invariant, rendu au §context-map 1.3 : une `MerchOrder` est mono-vendeur.** Un panier à deux
chaînes se scinde en deux commandes au paiement.

**`ExternalOrder` — un agrégat distinct, et c'est important.** Une commande passée sur la boutique
propre de l'artiste est un **reflet en lecture seule** : ni facture, ni suivi, ni remboursement chez
nous, et le contrat l'assume explicitement plutôt que de servir des champs vides. Il porte
`external_ref`, `external_host`, `state: 'external'` (vocabulaire opaque), `synced_at` et
`sync_source`. **Ce que nous garantissons** : la fraîcheur au moment de `synced_at`, rien de plus ;
quand l'hôte externe ne répond pas, le reflet est servi avec son âge, pas en erreur. Réponses à
`storefront-web` Q16 et `storefront-mobile` Q9.

### 3.5 `Cart` — agrégat racine

**Le panier vit sur le compte, pas sur le navigateur** (`storefront-web` Q13, `storefront-mobile`
Q8). Motifs : la maquette affiche un panier persistant dans l'en-tête, il se monte sur plusieurs
sessions depuis la boutique d'un direct, et les trois storefronts le montrent. Un panier local ne
survivrait ni à une réinstallation ni à un changement d'appareil, et il faudrait le dire au
spectateur.

Conflit entre deux appareils : **par ligne, dernier écrivain gagne, et le rang vient du serveur**
— un numéro de version, jamais une date du téléphone (dont l'horloge dérive et saute).

**Le devis est opposable** (`storefront-web` Q14) : `CartQuote` porte sous-total, port, remise,
total et **`valid_until` (15 min)**. Le total présenté est celui qui sera débité. Au-delà, un
nouveau devis. Les frais de port sont calculés **au devis**, pas à l'ajout.

### 3.6 `Subscription` et `Plan`

`Plan` : le vocabulaire qui fait autorité est celui de `catalogue.json` — **`free` (0), `pass` (12),
`premium` (24)**, avec `opens[]` (neuf valeurs : `browse`, `trailers`, `free-dates`, `replays`,
`no-ads`, `one-live-month`, `all-lives`, `multi-screen`, `archive`) et `seat_discount`.

**E1 est l'écart le plus grave du dossier, et il faut l'énoncer comme tel.** Quatre vocabulaires
disjoints coexistent, `helpers.planOf()` fait retomber **tous** les comptes sur `free`, et
`plan.opens[]` conditionne l'accès à la lecture. **C'est un défaut d'autorisation, pas un défaut
d'affichage.** Le contrat fixe un seul jeu, et distingue ce qui est une **formule** (`free`, `pass`,
`premium`) de ce qui est un **mode d'achat** (la place à l'unité, qui n'est pas un abonnement).
`monthly`, `season`, `none` sont retirés du vocabulaire : ils ne sont référencés par aucune donnée.

`Subscription` **n'existe nulle part dans `shared/`** — la maquette l'affiche en littéral. Forme à
créer : `plan_id`, `state` (`active | past_due | cancelled | trialing`), `started_at`,
`current_period_end`, `payment_method_ref`, `cancel_at_period_end`, factures.

**`multi-screen` est une contrainte d'exécution, pas une ligne de marketing** : « deux écrans à la
fois » impose un décompte serveur, tenu par `streaming` (§5.4). `ticketing` publie le plafond ;
`streaming` le fait respecter.

### 3.7 `Credit` — l'avoir de compte

`storefront-web` le relève : l'avoir apparaît dans la copie et nulle part ailleurs dans le dossier.
C'est **une monnaie interne**, donc un passif, donc un agrégat.

```
Credit
  id · account_id · channel_id (portée)  · amount_minor · currency
  origin        interrupted_date | goodwill
  origin_ref    date_id
  state         issued | partially_used | used | expired
  expires_at    12 mois
```

**Portée recommandée, et c'est une décision à confirmer** : l'avoir est émis pour une issue
`interrupted` et **redéployable sur la même chaîne seulement**. Motif comptable, expliqué dans
`adr-payments.md` §6 : un avoir utilisé ailleurs obligerait la plateforme à financer la part d'un
autre artiste sur ses propres fonds. La restriction est réversible ; l'ignorer ne l'est pas.

### 3.8 `viewer_entitlements` — modèle de lecture (§4)

---

## 4. Les modèles de lecture dupliqués, et par quel flux ils sont alimentés

C'est ici que l'architecture événementielle gagne sa place : **aucun écran n'est servi par une
jointure au moment de la requête.** Chaque modèle ci-dessous est une table dénormalisée, écrite par
un consommateur idempotent, lue en une requête.

| Modèle | Tenu par | Écrit par ses propres commandes | Alimenté par (Kafka) |
|---|---|---|---|
| `date_card_public` | `catalog` | date, publication, issue, droits, médias, taxonomie | `ticketing.date_availability_changed` (jauge, liste d'attente, tarif d'appel, promotion) · `ticketing.pricing_changed` · `streaming.run_state_changed` · `streaming.viewer_count_sampled` (agrégat à la minute) · `streaming.replay_asset_ready` (existence + expiration) · `chat.date_chat_policy_changed` |
| `date_detail_public` | `catalog` | + synopsis, distribution, langues, attributs, salle | + `streaming.chapter_posted` · `ticketing.pricing_changed` (les trois paliers) |
| `home_rails` · `live_grid` · `category_page` · `artist_page` | `catalog` | composition et ordre par `@arthome/core` | dérivés de `date_card_public` + index |
| `search_index` (OpenSearch) | `catalog` | via `catalog-indexer` | idem, `version_type: external` |
| `saved_search_percolator` | `catalog` | requêtes enregistrées | déclenche `catalog.saved_search_matched` |
| `channel_agenda` · `events_table` | `catalog` | date, publication | + `ticketing.date_availability_changed` (jauge, recette) |
| `viewer_entitlements` | `ticketing` | places, abonnement, avoir | — (ses propres écritures) |
| `viewer_relations` | `identity` | suivis, liste | — |
| `viewer_progress` | `streaming` | points de reprise | — |
| `entitlement_projection` | **`streaming`** | — | `ticketing.seat_activated` · `ticketing.seat_cancelled` · `ticketing.subscription_changed` · `catalog.date_published` · `catalog.date_outcome_declared` · `catalog.replay_policy_set` |
| `person_duties` (les gardes, toutes chaînes) | `identity` | appartenances, accès ponctuels | + `catalog.date_scheduled` · `streaming.run_state_changed` |
| `artist_counters` (abonnés, audience moyenne) | `catalog` | — | `identity.artist_followed` / `unfollowed` · `streaming.run_ended` |
| `channel_dues` (dates en vente, versements dus) | `identity` | — | `ticketing.*` · `payouts.payout_state_changed` — sert le refus de suppression de chaîne |
| `moderation_queue` | `chat` | signalements, verdicts | — |
| `payout_ledger` | `payouts` | — | `ticketing.seat_order_paid` · `ticketing.refund_issued` · `catalog.date_outcome_declared` · `streaming.run_ended` (l'échéance court depuis la fin) |
| `inbox` | `notifications` | — | tous les contextes, routés par rôle |

**`entitlement_projection` est la seule duplication que j'assume à contrecœur.** `streaming` tient
une copie de la possession, de l'abonnement et de l'état de la date, parce qu'il est le seul à
pouvoir décider d'un droit et le seul à émettre un jeton. L'alternative serait un appel synchrone
entre services — interdit — ou un droit décidé par le BFF, qui n'a pas d'autorité. La fraîcheur
tolérée est ≤ 5 s ; au-delà, l'alerte du §11 de `context-map.md` se déclenche.

**Le retard est borné et visible.** Chaque modèle de lecture porte `last_event_at` et
`last_event_seq` ; le BFF sert `servedAt` et le contrat déclare la fraîcheur par famille :

| Famille | Fraîcheur garantie |
|---|---|
| taxonomie, disciplines | artefact immuable, 24 h |
| `category`, `artist`, `plans`, `account` | 5 min |
| `home`, `tickets`, `list`, `replays` | 60 s |
| `live`, jauge, compteur de spectateurs | 15 s |
| `PlaybackTicket`, verdict de droit | **jamais mis en cache** |

Ce tableau répond à `storefront-tv` (fraîcheur par modèle de lecture) et à `storefront-web` Q7.

---

## 5. `streaming`

### 5.1 `Run` — agrégat racine

```
Run
  id · date_id · channel_id
  state           idle | rehearsal | on_air | interrupted | ended
  ingest_protocol rtmps | srt | whip          ← décide des métriques disponibles
  monitor_path    whep | ll_hls               ← décide de la latence promise à l'opérateur
  quality_ladder[]  renditions actives/désactivées
  cameras · started_at · ended_at · version
```

**`run.state` perd `postponed` et `cancelled`** : c'étaient des échos de `outcome` logés dans l'axe
technique. Une régie n'a pas d'état « annulée » ; elle a un plateau qui n'envoie rien.

**Invariants.** `idle → on_air` est refusé si le contrôle technique n'est jamais passé. Le passage
à l'antenne publie `streaming.run_started.v1`, que `catalog` consomme pour avancer la publication.
**Un délai de grâce à la mise hors ligne** : une coupure réseau de deux secondes en salle ne produit
ni incident ni manifeste HLS reparti de zéro. L'état poussé au studio est l'état **après**
amortissement, et le studio distingue « accroc amorti » de « publieur parti » — deux champs, pas un.

### 5.2 `StreamKey` — agrégat racine

**Un secret affiché sur un téléphone, dans une salle, souvent devant un prestataire.** Le contrat
garantit quatre choses (`studio-mobile`) :
- la clé **n'est jamais dans une charge utile de liste** ;
- sa révélation est une **commande distincte, auditée et nominative** ;
- son renouvellement est immédiat et **l'ancienne cesse aussitôt de diffuser** ;
- elle ne doit se retrouver ni dans le cache HTTP, ni dans un instantané d'application pris par le
  système au passage en arrière-plan — donc réponse `Cache-Control: no-store`, et pas de clé dans
  un modèle de lecture.

### 5.3 `HealthSample` — série temporelle

```
HealthSample
  run_id · measured_at (l'instant de mesure À L'INGEST, pas à la réception)
  up_kbps · latency_ms · dropped_pct · jitter_ms · lost_packets · viewers
  source   ingest_server | client_submitted     ← deux débits, deux noms
```

**Chaque métrique est nullable, et l'absence a un sens** (`studio-web` Q16). Le gigue et les paquets
perdus **n'existent qu'en entrée WebRTC** ; en RTMP sur TCP ils n'ont pas de sens, et le contrat les
**omet** plutôt que de servir zéro. `studio-mobile` ajoute un troisième cas que le contrat doit
porter : *mesuré, mais je ne l'ai pas reçu* — d'où `measured_at` sur chaque échantillon, qui permet
d'afficher « débit 8,9 Mb/s, mesuré il y a 3 s » ou « dernière mesure il y a 2 min » au lieu de
« 0 Mb/s », qui est un mensonge.

**La latence bout-en-bout est une mesure dédiée** (`studio-web` Q17), jamais un chiffre natif
présenté comme tel. Elle est mesurée **côté client de régie** par `RTCPeerConnection.getStats()`
sur la voie WHEP, et **soumise** au serveur — d'où `source: client_submitted`. Si elle n'est pas
mesurée, elle est **absente**. Et **deux débits différents ne portent jamais le même nom**
(`studio-mobile` incohérence 7) : `ingest_up_kbps` (observation serveur) et `device_up_kbps`
(mesure de la liaison du téléphone, qui n'est pas l'encodeur). Seul le premier alimente la liste de
pré-vol.

**La voie de retour de régie est servie dans l'état du run** (`studio-web` Q18) : WHEP sous la
seconde sur entrée WHIP, LL-HLS à quelques secondes sur entrée RTMP. Le studio doit le **savoir**
pour ne pas promettre à l'opérateur une latence qu'il n'a pas. `streaming.md` refuse de créer une
branche média pour uniformiser un schéma : le contrat porte donc la vérité, pas l'uniformité.

### 5.4 `PlaybackSession` — agrégat racine (le bail)

```
PlaybackSession
  id · account_id · profile_id · device_id · date_id
  state        active | released | expired | revoked
  lease_expires_at    now + 90 s, renouvelé par le renouvellement du jeton
  quality_cap · drm_system · protocol
  opened_at · last_renewed_at
```

**C'est le bail qui porte la limite d'écrans simultanés, pas une commande de libération.**
`releasePlayback` ne peut pas être garantie : un téléviseur se débranche, une box se coupe, le
système tue une application mobile sans préavis. Une session qui ne se ferme que sur un événement
du client laisse un écran fantôme, et l'utilisateur se voit refuser sa propre seconde lecture.
Réponses à `storefront-tv` Q9(c) et `storefront-mobile` Q5 : **expiration serveur obligatoire**, et
le client peut **reprendre sa propre session** identifiée par l'appareil.

### 5.5 `ReplayAsset`, `PreviewBudget`, `ResumePoint`

`ReplayAsset` : existence, durée, `available_from`, **`expires_at` calculé** depuis la fin du run et
`replay_window_hours` servi par `catalog`. La **politique** appartient à `catalog` ; le **fichier**
et son expiration appartiennent à `streaming`. `RecordingProvider` stocke et supprime ; c'est
`@arthome/core` qui décide de la durée, sinon la politique de rediffusion finirait encodée dans un
cycle de vie de stockage, hors de portée des tests.

**Enregistrer le flux maître à l'entrée**, pas seulement les variantes HLS : on peut ainsi
régénérer proprement les rediffusions.

`PreviewBudget` : `(account_id, date_id) → seconds_used`. **Décompté côté serveur**
(`storefront-web` Q20, `storefront-mobile` Q6) : un aperçu que l'on prolonge en rechargeant la page
n'est pas un aperçu, et une application réinstallée remettrait un compteur client à zéro. La portée
est **le compte, pas l'appareil** — sinon un foyer à quatre appareils obtient quatre aperçus.

`ResumePoint` : `(profile_id, date_id) → position_sec`, `written_at`, `device_id`.
**Dernier écrivain gagne, et le rang vient du serveur** — un numéro de version, jamais une date du
client. Cadence demandée au contrat : **sur pause, sur sortie, sur fin, et un battement de 30 à
60 s**, plus une **écriture forcée au passage en arrière-plan**. Le contrat accepte une **écriture
tardive** : la dernière position doit être prise même si elle arrive après un `releasePlayback` —
une TV peut être coupée à tout moment.
Ce n'est **pas** une commande d'argent : elle ne passe pas par le régime d'idempotence stricte,
sinon la clé devient un coût par minute de lecture et par spectateur.

### 5.6 `Incident` — cause et issue sont deux vocabulaires

`catalogue.incidentMessages` porte quatre entrées qui sont des **issues**, pas des causes. La régie
mobile en distingue trois de plus qui n'existent nulle part. Le contrat sépare :

| `IncidentCause` (nouveau) | `IncidentKind` (l'issue visible du spectateur) |
|---|---|
| `venue_feed_lost` · `run_desk_disconnected` · `bitrate_collapsed` · `compatibility_worker_failed` · `provider_error` · `manual` | `hold_screen` · `postponed` · `cancelled` · `interrupted` |

Réponse à `studio-mobile` Q12. Et le **déclenchement automatique de l'écran d'attente** — règle de
chaîne « si le flux se perd plus de 15 s » — produit **un incident de même nature qu'un
déclenchement manuel**, avec `cause = venue_feed_lost` et `triggered_by = 'auto'`. C'est la bonne
réponse au cas « le régisseur est injoignable », et c'est une règle serveur, pas un comportement
d'application.

**Le message d'écran d'attente est du contenu, pas une clé i18n** (`studio-web` Q19) : il est écrit
par la régie, il voyage **avec sa langue de rédaction**, comme un synopsis. C'est la seule exception
assumée à « i18n par codes », avec les textes de la boîte. Le catalogue fournit des **modèles** par
nature d'incident, que la régie peut reprendre ou remplacer.

---

## 6. `chat`, `payouts`, `notifications` — l'essentiel

### 6.1 `chat`

```
ChatMessage
  id · date_id · channel_id · audience_member_id · author_handle · author_role
  at_media_sec   int   ← POSITION DANS LE MÉDIA, pas l'heure d'envoi
  sent_at        timestamptz
  seq            bigint, monotone par date  ← le point de reprise du flux
  state          published | removed
  content_language · text
```

**L'ancrage média est la décision la plus irrattrapable du contexte** (`streaming.md` §5). Sans
lui, le tchat rejoué sur une rediffusion est décalé de tout ce que le spectateur a mis à lancer la
lecture. Les deux sont portés — `at_media_sec` **et** `sent_at` — parce que le studio horodate en
heure de salle et que le journal de modération en a besoin.

`ModerationItem` : `state` (`reported | claimed | settled`), `reason`, `reports_count`,
`claimed_by` + **`claim_expires_at`** (un bail court : un modérateur qui ferme son navigateur ne
gèle pas une ligne pendant tout le direct), `verdict`, `settled_by`, `settled_at`.
**Le second verdict est refusé et transporte la décision gagnante** — auteur et verdict — pour que
l'écran affiche « X a déjà supprimé ce message » au lieu d'un échec nu. Réponses à `studio-web`
Q21, Q22 et `studio-mobile` Q6.

`AudienceMember` : le public d'une chaîne est **une collection interrogeable par elle-même**, pas
une projection du tchat — la console cherche « un spectateur présent, qui n'a pas écrit »
(`studio-web` Q24). Pseudonyme, sanction (`none | muted(expires_at) | banned`), dates suivies,
nombre de messages, ancienneté, qualité d'abonné, **présence** sur le direct en cours.

**Une sanction porte un instant d'expiration** (nullable pour « sans limite »), jamais une
étiquette : 1 min, 10 min, 1 h et la durée libre sont des instants calculés une fois.

`BannedWord` : ajouter un mot **en direct** reclasse les messages déjà publiés si l'option
rétroactive est active. **Le contrat tranche l'ambiguïté que `studio-mobile` signale** : le
traitement est **asynchrone**, et la commande répond immédiatement avec `reprocessing: true` et le
nombre **estimé** de messages concernés ; les nouveaux éléments de file arrivent par le canal temps
réel, marqués `origin: 'retroactive_filter'` pour que le journal les distingue d'une décision
humaine. Motif : un reclassement synchrone sur des milliers de messages bloquerait la commande en
plein direct.

**Le débit du tchat est mesuré par le serveur, dans une unité déclarée** (`studio-mobile` #6, E15) :
fenêtre glissante de **60 secondes**, unité **messages par minute**, rafraîchie toutes les **5 s**.
Le seuil de bascule de la console (60 msg/min) est une règle de domaine et se lit contre cette
mesure-là — pas contre « nombre de messages ÷ heures écoulées », qui n'est pas la même chose.

### 6.2 `payouts`

```
PayoutLine
  id · channel_id · date_id · currency
  gross_ttc_minor
  vat_breakdown[]     { market_id, rate, base_minor, amount_minor }   ← ventilation PAR MARCHÉ
  gross_ht_minor      = gross_ttc − Σ vat.amount
  commission_rate     SERVI, jamais redérivé de commission / gross
  commission_minor    = roundMinor(gross_ht × rate)
  net_minor           = gross_ht − commission
  refunded_minor · credited_minor
  state               scheduled | held | paid | refunded | suspended
  due_at              fin du direct + 14 jours
  stripe_transfer_id · reconciled_at · discrepancy_minor
```

**La ventilation par marché est la forme, et elle est sûre.** `studio-web` a trouvé que l'écran des
versements ventile la TVA « par pays d'achat » alors que la fixture applique un taux unique au
brut : ce sont deux affirmations incompatibles, et **aucune des deux n'est instruite**. La forme
retenue porte la ventilation **quel que soit le modèle fiscal retenu** : un modèle à taux unique
produit une ventilation à une ligne. Le modèle lui-même est traité dans `adr-payments.md` §5, avec
la question de droit posée et non supposée.

**Le taux de commission est servi**, pas redérivé de `commission / gross` — la maquette le redérive
et retombe sur 12 % par défaut quand le brut est nul.

**`state` est piloté par `outcome`** : `held` tant qu'une issue est ouverte (reportée, interrompue),
`refunded` si la date est annulée, `suspended` tant qu'un changement de coordonnées bancaires
attend sa contre-signature.

`BankAccountChangeRequest` — agrégat à part entière, **pas un champ** (`studio-web` Q11) : deux
acteurs, deux rôles distincts (propriétaire **et** trésorerie), un délai, une trace, et il
**suspend le virement en cours** le temps de la signature. Une écriture ne peut pas porter cela.

`ReconciliationPeriod` : ne se clôt pas avec un écart non expliqué. `AccountingExport` : un travail
asynchrone (BullMQ **interne à `payouts`**) qui rend une **adresse signée de courte durée**,
utilisable **sans cookie de session** — un export protégé par cookie est intéléchargeable sur la
coquille native (`studio-mobile` Q9).

**Les bornes d'une « saison »** (`studio-web` Q12) sont une notion de domaine : `seasonBounds(date)`
dans `@arthome/core`, **1er septembre → 31 août**, convention du spectacle vivant. Servies, jamais
devinées par cinq surfaces.

### 6.3 `notifications`

`PushRegistration` (appareil × compte × plateforme × jeton × langue), `NotificationPreference`
(5 déclencheurs × 3 canaux), `QuietHours` (23 h → 9 h, **avec l'exception conditionnée à la
détention d'une place** — c'est une règle métier, pas un réglage d'interface), `Reminder`
(**daté : si la date est reportée le rappel suit, si elle est annulée le rappel est annulé et non
envoyé à vide**), `InboxEntry`, `AlertRoute` (rôle × chaîne → destinataires, décidé côté serveur ;
l'application ne filtre pas une file commune).

**Le troisième canal, que personne ne nomme** (`storefront-mobile` incohérence 8, E15) : la grille
offre trois canaux, deux seulement sont nommés (`push`, `email`), et le champ téléphone porte la
mention « pour les SMS de rappel ». **Je propose `in_app`** et non `sms`. Motif : un canal SMS a un
coût par message, une réglementation propre (consentement, horaires, désinscription) et un
prestataire de plus, pour une valeur que rien n'a éprouvée. `in_app` est gratuit, déjà servi par le
centre de notifications existant, et ne promet rien qu'on ne tienne. **À confirmer par le chef** :
c'est une proposition, pas un constat.

---

## 7. Persistance

### 7.1 Identifiants (C5)

**UUIDv7 généré dans le domaine**, par `@arthome/core`, **jamais par un défaut de base**. Trois
motifs, dont deux sont des besoins exprimés :

1. **L'outbox l'exige** : l'agrégat doit connaître son identifiant avant l'insertion, puisque la
   ligne d'outbox porte `aggregateid` et s'écrit dans la même transaction.
2. **Le studio l'exige** (`studio-web` Q27) : le `wizard` annonce « brouillon enregistré » avant
   tout aller-retour serveur. Un identifiant généré par le domaine permet de créer, enregistrer
   localement et synchroniser sans réconciliation. Un défaut de base imposerait une clé de
   corrélation de plus.
3. L'ordre temporel de l'UUIDv7 donne des index B-tree bien remplis, ce qu'un v4 ne donne pas.

**Un UUIDv7 révèle sa date de création**, et il faut en tirer une règle plutôt que de le noter.

| Type d'objet | Identifiant interne | Identifiant exposé |
|---|---|---|
| date, spectacle, artiste, salle | UUIDv7 | **le même**, plus un `slug` — la date de création d'une date n'est pas un secret |
| compte, profil, personne | UUIDv7, **jamais exposé** | `public_handle` (`@marie.j`), opaque et choisi |
| session de lecture, appairage, jeton | UUIDv7 **interne** | un identifiant opaque distinct, aléatoire — sinon l'instant d'ouverture d'un appairage fuite et aide à deviner le code |
| commande, facture | UUIDv7 | une **référence lisible** (`ATH-2026-00042`), qui est aussi ce que le support lit au téléphone |

`uuidv7()` natif de PostgreSQL 18 reste disponible comme **défaut de secours** sur les tables
techniques (outbox, journaux) où aucun domaine ne pré-génère.

### 7.2 Une base par service, et des migrations par service

- **Sept bases PostgreSQL 18, une par service.** Aucun service ne lit la base d'un autre, aucun
  connecteur CDC ne traverse une frontière de contexte.
- **Migrations par service, jamais de runner partagé.** Chaque service a son `DataSource`, ses
  migrations, son historique.
- **Exécutées par un job dédié, jamais au démarrage de l'application.** `migrationsRun: true`
  ferait migrer N répliques en même temps, et TypeORM n'a aucun verrou de migration. Le job est
  une étape de déploiement distincte, qui tourne **une fois**, à un seul exemplaire, et qui doit
  réussir avant que la nouvelle version démarre.
- **Sur le JavaScript compilé** (`typeorm migration:run -d dist/data-source.js`) : `tsx` ne fournit
  pas les métadonnées de décorateur et produit `ColumnTypeUndefinedError`.
- `synchronize: true` est interdit partout, y compris en développement partagé.

### 7.3 La table d'outbox — le contrat entre TypeORM et le routeur Debezium

Une par service, même forme partout. C'est un contrat d'infrastructure : le nom des colonnes est
celui qu'attend le *Debezium Outbox Event Router*.

```sql
CREATE TABLE outbox_event (
  id              uuid        PRIMARY KEY,              -- UUIDv7, devient le message-id
  aggregatetype   text        NOT NULL,                 -- « catalog.date » → nom du sujet Kafka
  aggregateid     text        NOT NULL,                 -- → CLÉ de partition Kafka
  type            text        NOT NULL,                 -- « catalog.date.published.v1 » → en-tête
  payload         bytea       NOT NULL,                 -- Protobuf DÉJÀ encadré pour le registre
  tracecontext    text        NULL,                     -- traceparent W3C, injecté à l'écriture
  actor_id        text        NULL,                     -- nominatif, exigé par le journal du studio
  created_at      timestamptz NOT NULL DEFAULT now()
);
```

**Trois précisions qui font la différence entre « ça marche » et « ça marche en production ».**

1. **La charge utile est déjà au format de fil.** Le producteur sérialise avec le sérialiseur du
   registre de `@arthome/contracts`, donc les octets écrits contiennent l'octet magique,
   l'identifiant de schéma et les index de message. Debezium se contente de les transporter
   (`binary.handling.mode=bytes`, `value.converter=ByteArrayConverter`). Sans cela, Debezium
   produirait du JSON encadré et aucun consommateur Protobuf ne saurait le lire.
2. **Rien n'est jamais mis à jour ni lu par l'application.** L'application **insère seulement**,
   dans la transaction métier. C'est la CDC qui lit le WAL. Conséquence heureuse : `REPLICA
   IDENTITY DEFAULT` suffit (la clé primaire), puisqu'il n'y a ni `UPDATE` ni `DELETE` capturés.
3. **Le nettoyage est un travail à part** — `DELETE FROM outbox_event WHERE created_at < now() -
   interval '7 days'`, exécuté par une tâche du service. Il doit passer **après** que le connecteur
   a confirmé sa position, sinon on supprime des lignes non encore publiées.

**Et la règle qui rend tout cela sûr** : l'écriture métier et la ligne d'outbox sont dans la
**même transaction**, par le **même `manager`**. Jamais `save()` puis `emit()` : un plantage entre
les deux perd l'événement, un rollback après l'émission l'invente.

### 7.4 Ce que la CDC impose aux migrations

C'est le point où une migration anodine casse la production, et il mérite d'être écrit
explicitement dans `critical-rules.md`.

| Contrainte | Conséquence pratique |
|---|---|
| `wal_level = logical` | paramètre serveur, redémarrage requis ; à poser au palier 2 |
| **un slot de réplication et une publication par connecteur** | sept connecteurs Debezium, sept slots, sept publications. Un slot par service, nommé `arthome_<service>_outbox` |
| un slot non consommé **retient le WAL** | un connecteur arrêté fait grossir le disque jusqu'à saturation. **Mesure : décalage de `confirmed_flush_lsn` > 1 Go → alerte**, et jamais de slot laissé derrière après un test |
| `REPLICA IDENTITY` | `DEFAULT` sur `outbox_event` suffit (insertions seules). Pour toute table capturée par ailleurs — il n'y en a pas aujourd'hui — `FULL` serait nécessaire et coûteux |
| **un renommage de colonne casse la réplication** | la publication référence les colonnes ; le connecteur échoue ou perd la colonne en silence |

**La règle qui en découle, et elle n'est pas négociable sur `outbox_event`** :

> **Migrations additives seulement sur les tables capturées.** Un renommage se fait en quatre
> temps : ajouter la colonne, remplir, écrire dans les deux, puis supprimer l'ancienne **dans une
> version ultérieure**, après avoir vérifié la position du connecteur.

La même discipline vaut pour les index : `CREATE INDEX CONCURRENTLY` hors transaction, donc hors
du mécanisme de transaction de TypeORM — une migration dédiée, marquée comme telle.

### 7.5 Rétention et effacement

| Donnée | Conservation | Mécanisme d'effacement |
|---|---|---|
| messages de tchat | **24 mois** (alignés sur le journal du studio) | purge mensuelle par partition de date ; le message est supprimé, l'**entrée de journal de modération** reste avec l'identifiant du message et non son texte |
| journal du studio, journal des accès | **24 mois** | purge par période ; export avant purge |
| échantillons de santé | **90 jours** en détail, agrégats horaires conservés | table partitionnée par mois, `DROP PARTITION` |
| points de reprise | 24 mois sans lecture | purge |
| sessions de lecture | 30 jours | purge |
| appairages | 7 jours après issue | purge |
| **factures** | **10 ans** | jamais supprimées — obligation comptable |
| lignes de versement, écritures comptables | **10 ans** | idem |
| compte supprimé | **anonymisé, pas supprimé** | voir ci-dessous |

**La suppression de compte est une commande financière autant que personnelle**
(`storefront-web` Q26). La copie dit : *« La suppression annule les places non utilisées. »* Elle
déclenche donc des remboursements, elle touche des versements d'artistes potentiellement déjà
calculés, et elle se heurte à la conservation comptable de dix ans. Elle **ne peut pas être
synchrone et ne peut pas être totale.**

Le déroulé, et c'est un flux de saga persistant, pas un appel :

1. `identity` passe le compte en `deletion_requested` et publie `identity.account_deletion_requested.v1`.
   Les connexions sont bloquées, **le compte n'est pas encore effacé**.
2. `ticketing` annule les places non utilisées, rembourse selon la politique, clôt l'abonnement au
   terme, et publie son accusé. `payouts` recalcule les lignes touchées.
3. Un **délai de grâce de 30 jours** court. Le compte est réactivable sur simple connexion pendant
   ce délai — c'est ce qui rend l'irréversible acceptable.
4. Au terme : `identity` **anonymise** — `email`, `phone`, `name`, `public_handle`, avatars,
   appareils, adresses IP et pseudonymes de tchat remplacés par des valeurs non réversibles ;
   `status = 'anonymised'`. Les **factures gardent leur contenu figé** (c'est un document, la seule
   exception assumée à « jamais de chaîne formatée transportée »), et les lignes comptables gardent
   un identifiant de compte anonymisé.
5. Les **messages de tchat** sont dissociés de la personne (`audience_member_id` mis à null,
   pseudonyme remplacé) mais **pas supprimés** tant que leur rétention de 24 mois court : ils font
   partie d'un journal de modération nominatif dont un artiste peut avoir besoin.

**Les exports (données, factures) sont asynchrones** (`storefront-web` Q27) : la commande rend un
accusé et un identifiant de demande, l'état est interrogeable, et le document arrive par une
**adresse signée de courte durée**. Un FEC ou un export RGPD n'est pas une réponse HTTP.

---

## 8. Ce qu'une réponse porte toujours

Récapitulatif, pour `backend-contracts`.

```
servedAt        instant serveur — TOUT compte à rebours s'y réfère, jamais à l'horloge du client
validUntil      présent dès qu'une valeur périssable est dans la réponse
version         sur tout agrégat qu'une commande conditionnelle pourra viser
lastEventSeq    sur tout modèle de lecture alimenté par un flux, pour la reprise
```

et, sur toute erreur :

```
code            vocabulaire fermé, i18n par codes
params          les paramètres du message (jamais la phrase)
traceId         lisible et copiable depuis l'écran d'erreur — sur mobile c'est le seul lien
                entre « mon application a planté » et un journal serveur
nature          refused | unavailable | offline_forbidden
```
