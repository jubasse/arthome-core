# ADR — Authentification, session et appairage d'appareil

> **Statut** : proposé · **Date** : 21 septembre 2026 · **Auteur** : spécialiste `auth`
> **Décide** : le mécanisme d'authentification des cinq surfaces, la forme de session par
> surface, et la **primitive unique d'appairage d'appareil** (RFC 8628) qui sert les cinq
> intentions de la TV.
> **Ne décide pas** : le jeton de lecture du direct (→ `adr-stream-entitlement.md`), mais
> §9 dit comment les deux systèmes s'articulent.

---

## 1. Ce qui a été vérifié en ligne, et non de mémoire

Ma connaissance interne s'arrête en mai 2026. Tout ce qui suit a été relu le
**21 septembre 2026** sur la documentation des éditeurs, sur npm et sur GitHub. Les
capacités décisives ne sont jamais affirmées de mémoire.

| Fait vérifié | Source | Résultat |
|---|---|---|
| better-auth possède un plugin Device Authorization | `better-auth.com/docs/plugins/device-authorization` + `npm view better-auth exports` | **Confirmé.** `./plugins/device-authorization` est exporté par le paquet publié |
| Version et licence de better-auth | npm, 14 sept. 2026 | **1.7.5**, **MIT**, 30 k étoiles, publié il y a une semaine |
| Adaptateur TypeORM pour better-auth | `better-auth.com/docs/adapters/...` | **N'existe pas.** Kysely (défaut), Drizzle, Prisma, Mongo, adaptateur maison |
| Plugin JWT / JWKS de better-auth | `better-auth.com/docs/plugins/jwt` | JWKS servi, `jwksPath`, rotation (`rotationInterval`, `gracePeriod`), `kid`, `definePayload`, `issuer`/`audience`, clé privée chiffrée AES-256-GCM au repos |
| Alphabet du code court de better-auth | doc du plugin | `ABCDEFGHJKLMNPQRSTUVWXYZ23456789` — exclut `0/O` et `1/I`, **mais garde `5`+`S` et `8`+`B`** |
| Surcharge de la génération d'identifiants | `better-auth.com/docs/reference/options` | `advanced.database.generateId` accepte une **fonction** → UUIDv7 possible |
| Plafond de profils simultanés sur un appareil | plugin `multi-session` | `maximumSessions`, **défaut 5**, révocation par session |
| 2FA | plugin `two-factor` | TOTP + OTP + codes de secours, secrets chiffrés, 3 req/10 s intégré |
| Adaptateur NestJS | npm `@thallesp/nestjs-better-auth` | **2.8.0**, MIT, 3 sept. 2026, pairs `@nestjs/core ^11.1.6 \|\| ^12`, `better-auth >=1.5 <2`, `express ^5.1`, Node ≥ 22.22.1 |
| SuperTokens et le device flow | recherche + doc éditeur | **Non implémenté.** Évoqué comme piste de feuille de route, pas comme capacité |
| Keycloak et le device flow | doc Keycloak | Natif, activé et annoncé dans `openid-configuration` par défaut. Apache-2.0 |
| Zitadel et le device flow | `zitadel.com/docs/guides/integrate/login/oidc/device-authorization` | Natif. **AGPL-3.0-only** depuis la v3 |
| Logto et le device flow | `docs.logto.io/quick-starts/device-flow` | Natif, `urn:ietf:params:oauth:grant-type:device_code`. **MPL-2.0** |
| `typeorm` publié | npm, 21 sept. 2026 | **1.1.1** — conforme au `^1.1` acté |
| `jose` publié | npm | **6.2.12**, MIT |

**Deux faits de sécurité datés, trouvés en ligne, qui pèsent sur la décision :**

- **CVE-2026-45337** (better-auth) — le plugin Device Authorization traitait **toute session
  authentifiée comme propriétaire de tout `user_code` en attente** : la garde de propriété sur
  `POST /device/approve` et `/device/deny` court-circuitait tant que `userId` était nul. Corrigé
  en **1.6.11**. Nous sommes en 1.7.5, donc couvert — mais cette CVE **est exactement la
  question Q2 du spécialiste TV**. Elle prouve que le liage de l'appairage à une identité est la
  partie difficile, et qu'elle ne doit pas être déléguée sans vérification propre (§6.3).
- **CVE-2026-88770** (Keycloak) — le device flow de Keycloak délivre encore des jetons pour un
  compte verrouillé par la protection anti-force brute, l'étape de rédemption ne vérifiant pas
  le verrouillage. Le même défaut de classe, chez le candidat réputé le plus mûr.

**Limite connue du plugin better-auth**, relevée en ligne : ni `/device/code` ni `/device/token`
n'accepte de paramètre `resource`/`audience` — le flux rend une **session better-auth opaque**,
pas un JWT restreint à une API. Sans importance ici : dans notre topologie c'est le **BFF** qui
frappe le jeton interne (§8), jamais le client.

---

## 2. Tableau de décision — surfaces × besoins × candidats

### 2.1 Les candidats sur les capacités décisives

| | **better-auth 1.7.5** | **SuperTokens 24.x** | **Passport + maison** | **Keycloak** | **Zitadel v3** | **Logto** |
|---|---|---|---|---|---|---|
| **Device flow natif (RFC 8628)** | **oui**, plugin dédié + intégration `oauthProvider()` | **non** (feuille de route) | non — à écrire | oui | oui | oui |
| Alphabet du code court maîtrisable | oui (`generateUserCode`, `userCodeLength`) | — | total | difficile (serveur) | difficile | difficile |
| TTL par intention | via `expiresIn` + hooks, **à composer** | — | total | non (par realm) | non | non |
| 2FA | TOTP/OTP/codes de secours | oui | à écrire | oui | oui | oui |
| Réinit. mot de passe | intégré | oui | à écrire | oui | oui | oui |
| Social Google/Facebook | intégré | oui | via stratégies | oui | oui | oui |
| Retour OAuth **Capacitor** (`capacitor://localhost`) | plugin `bearer` → jeton hors cookie | oui | à écrire | possible, via AppAuth | possible | possible |
| Retour OAuth **React Native** | `@better-auth/expo` (**exige Expo**) ; sinon `bearer` | SDK RN | à écrire | AppAuth | AppAuth | AppAuth |
| **JWKS + rotation** | plugin `jwt` : `kid`, `rotationInterval`, `gracePeriod` | oui | à écrire | oui | oui | oui |
| Révocation par session / par appareil | `multi-session.revoke` + table `session` | oui | à écrire | oui | oui | oui |
| **≤ 5 profils sur un appareil partagé** | `multi-session`, **défaut 5** | non natif | à écrire | non natif | non natif | non natif |
| **Coexistence TypeORM + PG 18** | pas d'adaptateur TypeORM → **Kysely sur le même PG, schéma séparé** | service séparé + sa base | natif | **base à lui** | **base à lui** | **base à lui** |
| **Charge d'exploitation (1 personne)** | **bibliothèque dans `identity`** : 0 déploiement de plus | 1 conteneur + 1 base | 0 conteneur, **tout le code** | JVM, realms, montées de version, CVE | Go + PG, AGPL | Node + PG |
| Licence | **MIT** | Apache-2.0 + `NOASSERTION` sur le dépôt | — | Apache-2.0 | **AGPL-3.0-only** | MPL-2.0 |

### 2.2 Les surfaces et la forme de session dont chacune a besoin

| Surface | Contrainte dure relevée par son spécialiste | Porteur de session retenu | Stockage |
|---|---|---|---|
| `storefront-web` (Next.js) | une fonction mise en cache **ne peut lire ni cookie ni en-tête** ; l'en-tête a besoin de la session sur toutes les routes | **cookie** `HttpOnly`/`Secure`/`SameSite=Lax`, validé par le BFF storefront | navigateur |
| `studio-web` (Angular) | six/huit rôles, droits qui **bougent en cours de session** | **cookie** `HttpOnly`, BFF studio | navigateur |
| `studio-mobile` (Capacitor) | `capacitor://localhost` est un **contexte tiers sur iOS 14+** → le cookie est mort | **jeton porteur** (`bearer`) | `@capacitor/preferences` (Keychain / Keystore), **jamais `localStorage`** |
| `storefront-mobile` (React Native) | l'OS tue l'application sans préavis ; le jeton ne doit pas survivre en clair | **jeton porteur** | Keychain / Keystore (`expo-secure-store` en Expo, équivalent natif en RN nu) |
| `storefront-tv` (react-native-tvos) | **aucune saisie au-delà de six caractères** ; appareil **partagé** ; pas de session au moment de se connecter | **jeton porteur** + **identité d'appareil préalable** | magasin natif de l'appareil |

La ligne qui commande tout : **trois surfaces sur cinq ne peuvent pas tenir une session par
cookie.** Un candidat qui ne sait faire que le cookie est disqualifié d'office ; un candidat qui
oblige à écrire soi-même la voie « jeton porteur » a un coût caché.

---

## 3. Décision

### D-A1 — **better-auth 1.7.5**, en bibliothèque dans le service `identity`, avec quatre plugins

`better-auth` + `@thallesp/nestjs-better-auth` 2.8.0, et les plugins **`jwt`**, **`bearer`**,
**`two-factor`**, **`multi-session`**, **`device-authorization`**.

**Pourquoi lui, en une phrase** : c'est le seul candidat qui coche *à la fois* le device flow
natif, la session par jeton porteur pour les trois surfaces sans cookie, les cinq profils sur un
appareil partagé, et **zéro déploiement supplémentaire** — le critère qui, pour un projet solo,
pèse autant que la fonctionnalité.

**Ce que cela n'autorise pas.** better-auth authentifie ; il **n'autorise pas**. Les huit rôles,
la table `grants`, les accès ponctuels qui expirent au tomber du rideau restent du domaine
(§7). Le plugin `organization` de better-auth **n'est pas retenu** : son modèle de rôles ne sait
pas exprimer « `director` peut inviter `video` et `sound`, qui n'invitent personne », ni un accès
borné dans le temps.

### D-A2 — Une **primitive unique d'appairage d'appareil**, propriété de `identity`

Le contrat porte **une** commande, **une** forme, **un** automate, **cinq** intentions.

```
POST /pairings        createPairing(intent, payload?, deviceDescriptor) -> DevicePairing
GET  /pairings/{id}   pollPairing(pairingId)                            -> DevicePairingState
DELETE /pairings/{id} cancelPairing(pairingId)                          -> DevicePairingState
```

`intent ∈ { signin, seat, plan, payment-method, merch }`.

**Le raisonnement qui permet l'unification** — et il faut le dire, parce qu'il n'est pas
évident : **quatre des cinq intentions ne sont pas des flux d'autorisation OAuth.** Acheter une
place depuis un téléviseur *déjà connecté* n'est pas une demande de jeton : c'est un
**rendez-vous de transaction**. Seule `signin` est un vrai RFC 8628.

Ce qui est donc unique, c'est **l'automate de rendez-vous** : code court, QR, expiration,
interrogation, `slow_down`, cinq issues. Ce qui diffère, c'est **l'effet de l'approbation**.

| | `signin` | `seat` · `plan` · `payment-method` · `merch` |
|---|---|---|
| La TV a-t-elle une session en ouvrant ? | **non** | oui (obligatoire) |
| Liage | à l'**appareil** (`device_id`) | au **profil** qui a ouvert |
| Approbation servie par | le plugin `device-authorization` de better-auth | le parcours normal du téléphone (BFF → `ticketing` / `billing`) |
| Effet | une session de plus sur l'appareil | un `outcomeRef` posé sur l'appairage |

**Le flux d'une intention d'achat, qui respecte « aucun appel synchrone entre services » :**

1. TV → BFF storefront → `identity` : `createPairing`. `identity` écrit une ligne
   `device_pairing` et rend le code.
2. Téléphone scanne → ouvre `verificationUriComplete` → BFF → `identity` : lit l'intention et
   la charge utile, **pour les afficher**.
3. Le téléphone confirme et **passe par son parcours d'achat normal** (BFF → `ticketing`), avec
   sa propre `Idempotency-Key`. Aucune duplication de la billetterie.
4. Le BFF pose `approvePairing(pairingId, outcomeRef)` — ou `failPairing(reason)` si
   `ticketing` a refusé.
5. La TV interroge → le BFF lit l'appairage, **compose** `PairingOutcome` à partir de
   `outcomeRef` et le rend complet, pour que l'écran de confirmation s'affiche **sans un appel
   de plus**, comme la TV l'exige.

`identity` ne connaît ni les places ni les paiements : il ne porte que le rendez-vous et un
pointeur opaque. `ticketing` n'implémente **aucun** code court. C'est l'exigence « conçu une
fois, implémenté une fois » tenue sans faire de `identity` un service fourre-tout.

**Le sixième cas est bien un renvoi, pas un appairage.** Le QR de la page compte qui renvoie vers
`arthome.fr/compte` porte le type `handoff` et **n'ouvre aucune ligne** `device_pairing` : rien
n'attend, l'écran ne bascule pas. Le contrat les sépare par le nom, pas par une option.

---

## 4. Les trois questions de la TV, tranchées

### Q3 — **Oui, la TV a une identité d'appareil avant toute session.** C'est une notion du contrat.

Les points d'entrée anonymes « avec le code pour seul secret » sont écartés : ils rendent
impossibles les quatre choses que la TV demande (se nommer dans « appareils connectés », être
révoquée, porter une limite de débit, se rattacher après un redémarrage).

**Mécanisme.** Au premier lancement, la surface appelle `registerDevice(deviceDescriptor)` et
reçoit un **`device_token`** : un JWT **ES256**, `aud: "arthome.device"`, longue durée
(180 jours), **rotation à chaque usage**, portant `device_id` (UUIDv7) et rien d'autre. Il ne
donne accès qu'à : ouvrir un appairage, interroger un appairage, lire l'amorçage public. Il
**n'est pas** une session et ne donne accès à aucune donnée personnelle.

Cela règle aussi **E13** (`devices` a deux formes sous un seul nom) : `Device` est l'appareil
enregistré, durable, révocable ; `DeviceSession` est le couple (appareil, profil). Deux noms,
deux formes.

### Q2 — **Refus avec un code distinct pour les quatre intentions d'achat. Pas de bascule de profil.**

Si le téléphone qui approuve est connecté sous une autre identité que le profil qui a ouvert
l'appairage : `PAIRING_IDENTITY_MISMATCH`, et le téléphone propose explicitement « changer de
compte » — un geste de la personne, jamais du système.

**Pourquoi le refus et non la bascule.** Une bascule implicite fait payer le **mauvais moyen de
paiement**, crédite les **mauvais droits**, et livre la place au mauvais compte — dans un salon,
au moment précis où deux personnes regardent le même écran. Une opération d'argent ne se résout
jamais par un changement d'identité silencieux. Et CVE-2026-45337 montre ce que coûte le
relâchement de cette garde exacte.

**`signin` est l'exception, et ce n'est pas une exception.** Pour `signin`, il n'y a pas de
profil ouvreur : l'appairage est lié à l'**appareil**. Que le téléphone soit connecté sous une
autre identité est le **cas nominal** — c'est même le sens de « ajouter un compte » depuis
l'écran `gate`. Aucun `MISMATCH` n'est donc possible sur `signin`.

### Q4 — **Une durée par intention, servie dans la réponse. Jamais quinze minutes pour un paiement.**

| `intent` | `expiresAt` | Pourquoi |
|---|---|---|
| `signin` | **15 min** | chercher son téléphone, se connecter, faire une 2FA |
| `payment-method` · `plan` · `merch` | **10 min** | pas de jauge à respecter, mais un paiement ne traîne pas |
| **`seat`** | **5 min** | la jauge affichée à la réservation doit rester vraie |

**Et pour `seat`, une exigence de plus, adressée à `backend-domain` :** la durée de l'appairage
doit être **la durée d'un maintien de places** (`hold`) posé par `ticketing` à la création de
l'appairage. Sans cela, la jauge affichée sur la TV est un mensonge pendant cinq minutes, ce qui
est précisément le défaut que la TV signale. Les deux durées sont la même valeur, servie une
seule fois.

Conformément à la maquette, **l'écran d'attente n'affiche pas de compte à rebours** :
`expiresAt` sert à la TV pour renoncer, pas pour angoisser le spectateur.

---

## 5. Les deux exigences de contrat relevées par la TV

### 5.1 L'alphabet du code court est **déclaré dans le contrat**

L'alphabet par défaut de better-auth, `ABCDEFGHJKLMNPQRSTUVWXYZ23456789`, **ne suffit pas** : il
exclut bien `0/O` et `1/I`, mais **conserve `5` avec `S` et `8` avec `B`** — les deux confusions
que la TV nomme explicitement. Nous le remplaçons par `generateUserCode`.

```
PAIRING_CODE_ALPHABET = "ACDEFHJKLMNPQRTUVWXY23456789"   // 28 symboles
PAIRING_CODE_LENGTH   = 6
```

Retirés du jeu par défaut : **`B`** (vs `8`), **`S`** (vs `5`), **`Z`** (vs `2`), **`G`** (vs
`6`). `L` reste : sans `1` ni `I` dans le jeu, il n'est plus ambigu. On garde le **chiffre** et
on retire la **lettre**, parce qu'un chiffre est aussi moins ambigu à dire à voix haute — un
code de téléviseur se lit souvent à quelqu'un d'autre dans la pièce.

- **28⁶ ≈ 4,8 × 10⁸**, soit **28,8 bits** — au-dessus du seuil que la §5.1 de la RFC 8628 juge
  acceptable **dès lors qu'un plafond de tentatives existe**, ce qui est le cas (§6.2).
- L'alphabet retenu est un **sous-ensemble strict** de celui de better-auth : la normalisation
  décrite par la documentation (insensible à la casse, espaces et ponctuation de lisibilité
  ignorés) continue donc de s'appliquer. *À confirmer par le spike (§11), c'est une lecture de la
  documentation et non une mesure.*
- L'unicité est exigée **parmi les appairages en cours seulement**. Un code expiré redevient
  disponible, sinon l'espace s'épuise. `deviceCode`/`userCode` portent un index unique dans
  better-auth ; l'unicité partielle demande un **index unique partiel PostgreSQL** sur
  `status = 'pending'`.

### 5.2 La durée de validité est **servie**, jamais copiée

`expiresAt` est un **instant ISO en UTC** dans `DevicePairing`, conformément à la règle du
projet. Elle n'est plus jamais un littéral de maquette (**E12** clos). La TV n'a rien à savoir,
et la politique se change sans revue de magasin.

**Une exception à la règle « les dates voyagent en chaînes ISO », et il faut l'écrire** : à
l'*intérieur* d'un JWT, `exp`, `iat` et `nbf` restent des **secondes numériques**, parce que la
RFC 7519 l'impose et qu'aucun vérifieur ne lira autre chose. La règle ISO gouverne les charges
utiles d'API, pas l'intérieur d'un jeton. Tolérance d'horloge déclarée : **± 30 s**
(`clockTolerance` de `jose`).

### 5.3 Ce que le contrat doit porter en plus, et qui manquait

- **Cinq issues, cinq codes**, comme la TV l'exige : `pending` → `approved` | `denied` |
  `expired` | `cancelled`, plus **`approved_with_failure`** pour « le téléphone a fini, l'achat a
  échoué ». Un code unique produirait un message faux quatre fois sur cinq.
- **`pollInterval`** servi (défaut better-auth : 5 s), et `slow_down` honoré. La TV ne doit
  jamais interroger plus vite : quelques milliers de téléviseurs en attente sont une charge que
  le serveur doit pouvoir modérer.
- **Le rattachement après redémarrage** : `pairingId` est persisté par la TV, et
  `pollPairing(pairingId)` doit fonctionner **avec le seul `device_token`**, sans session. C'est
  le cas qu'on oublie, et il est servi par construction puisque l'appairage est lié à l'appareil.
- **Q1 — comment la TV apprend que c'est fait** : **interrogation périodique conforme à la
  RFC 8628**, pas le canal temps réel. Motif : le canal ne connaît pas encore d'identité au
  moment de `signin`, et l'y faire entrer élargirait sa surface d'attaque pour gagner quelques
  centaines de millisecondes. Pour tenir l'exigence « bascule en deux secondes au plus », on sert
  `pollInterval: 2s` **pendant les 60 premières secondes** puis 5 s. C'est une décroissance
  servie par le serveur, donc modérable, et elle coûte au plus 30 requêtes par appairage.

---

## 6. Sessions, jetons et révocation, surface par surface

### 6.1 Trois porteurs, un seul émetteur

- **Session opaque better-auth** — émise par `identity`, écrite dans sa base. Portée par
  **cookie** (`storefront-web`, `studio-web`) ou par **jeton porteur** (`studio-mobile`,
  `storefront-mobile`, `storefront-tv`), selon le plugin `bearer`, qui rend le jeton dans
  l'en-tête `set-auth-token` et le reçoit en `Authorization: Bearer`.
- **`device_token`** — §4/Q3.
- **Jeton interne** — frappé par le **BFF**, ~60 s, `aud` par service (§8).

**Réponse à `studio-mobile` sur le retour d'arrière-plan avec jeton expiré** :
**rafraîchissement silencieux**, jamais de réauthentification. Une réauthentification en pleine
garde est une faute d'exploitation. La réauthentification n'est exigée que pour les **opérations
sensibles** (changer la clé de flux, transférer la propriété d'une chaîne, ajouter un moyen de
versement), et elle est alors demandée *au moment de l'opération*, pas au retour d'écran.
Durées : session 7 jours (`session.expiresIn`), glissement quotidien (`session.updateAge`).

**Réponse à `storefront-mobile` sur ce qui survit à une mise à mort** : le jeton porteur survit
**chiffré par le magasin natif** (Keychain / Keystore), jamais en clair. Le **droit de lecture ne
survit jamais** — il est rendu par le service d'entitlement à chaque lecture (§9). Une
application rouverte après une semaine renouvelle silencieusement si la session est encore
vivante, et ne renvoie à l'écran de connexion que si elle ne l'est plus.

### 6.2 Limitation de débit

better-auth apporte : 5 requêtes sur `/device` par fenêtre de vie du code, 3 req/10 s sur les
points d'entrée 2FA, `slow_down` sur l'interrogation. **Insuffisant pour nous** : ces plafonds
sont par session ou par adresse, or un salon derrière un NAT partage son adresse. Nous ajoutons,
au BFF, un plafond **par `device_id`** (`@nestjs/throttler` + Redis, qui est déjà au BFF) et un
**verrouillage après N tentatives de code erroné**, par code et par appareil. C'est la défense
que les 28,8 bits d'entropie supposent.

### 6.3 La garde de propriété, écrite par nous

Au vu de CVE-2026-45337, `approvePairing` et `denyPairing` **ne sont pas exposés tels quels**.
Le BFF interpose une garde qui vérifie explicitement, avant de déléguer :

1. l'appairage est `pending` et non expiré ;
2. `intent = signin` → le porteur est une session valide quelconque (cas nominal) ;
3. sinon → `session.user.id` **est** le `owner_profile_id` de l'appairage, sous peine de
   `PAIRING_IDENTITY_MISMATCH`.

C'est cinq lignes, et c'est la ligne qui a fait la CVE. On ne délègue pas la garde qui a déjà
cédé une fois chez l'éditeur.

### 6.4 Les cinq sorties vers un navigateur externe (`studio-mobile`)

Ce que `studio-mobile` demande est adopté intégralement et devient une règle de contrat :

- **liste blanche stricte** d'adresses de retour (liens universels `applinks` / App Links), des
  chaînes littérales, **jamais un motif** ;
- **état opaque, à usage unique, de courte durée** (10 min), émis avant le départ et vérifié au
  retour — il ne porte **rien de signifiant**, l'URL de retour transitant par le système ;
- **l'état d'attente vit côté serveur**, jamais en mémoire d'application : « changement de compte
  en attente de signature », « connexion du compte de versement en cours ». Le système peut tuer
  l'application pendant le détour ; au retour, **le lien profond dit où aller, le backend dit ce
  qui a changé**. Un paiement confirmé par un paramètre d'URL est un paiement confirmé par le
  client.

L'état opaque est servi par le plugin **`one-time-token`** de better-auth, qui existe déjà.

### 6.5 Le téléviseur partagé

`multi-session` avec `maximumSessions: 5` — qui est déjà le défaut — porte exactement les trois
règles que la TV énonce : jusqu'à cinq profils sur l'appareil, les droits portés par le
**profil** jamais par l'appareil, et une **déconnexion par profil** (`multi-session.revoke`) qui
laisse les autres comptes connectés. Révoquer l'**appareil** est une commande distincte, qui
supprime le `Device` et toutes ses `DeviceSession` d'un coup.

### 6.6 CORS pour la coquille native

La liste d'autorisation du BFF studio contient les **chaînes littérales** `capacitor://localhost`
et `https://localhost`, plus les origines de développement. Une entrée `localhost` nue n'en couvre
aucune, `Access-Control-Allow-Origin: *` est illégal avec des requêtes créditées, et un cadre qui
normalise `Origin` par un analyseur d'URL rejettera `capacitor://` — la comparaison porte donc sur
la chaîne brute. Détails et réglages → `nestjs-web-security`.

---

## 7. Autorisation : les huit rôles restent au domaine

**Le repli à six personas n'est pas sûr pour l'autorisation** (E6). L'autorisation se fait sur les
**huit** valeurs de `memberRoles`, vérifiées dans `shared/catalogue.json` :
`artist · production · coordination · director · video · sound · moderation · treasury`.
La table `grants` du catalogue le confirme : `director` peut inviter `video` et `sound` ; `video`,
`sound`, `moderation` et `treasury` n'invitent personne. Le repli à six confond `director`,
`video` et `sound` sous `regie` et **efface ce droit**. Six est un **libellé**, jamais une clé
d'autorisation.

**Où vit quoi**

| Notion | Propriétaire | Pourquoi |
|---|---|---|
| Compte, mot de passe, 2FA, social, sessions, appareils | `identity` (better-auth) | authentification |
| Membre d'une chaîne, **ensemble** de rôles par (personne, chaîne), `grants` | domaine (`channels`) | c'est de la donnée métier qui change sans reconnexion |
| **Renfort affecté à une date**, avec `expiresAt` | domaine | portée une date, cycle de vie propre — confondre les deux ferait d'une révocation de renfort une exclusion de chaîne |
| Droits effectifs (navigation, volets, `canRevenue`/`canOps`/`canTech`, `canInviteRoles`) | calculés **une fois** dans `@arthome/core`, servis par le BFF studio | « aucune valeur calculée deux fois » |

**Les droits bougent en cours de session — et c'est réglé par la durée du jeton interne.** Le
jeton frappé par le BFF vivant ~60 s, **la fraîcheur maximale de l'autorisation est de 60
secondes**. C'est la bonne réponse au studio web : une invitation acceptée est effective en moins
d'une minute, sans reconnexion et sans que personne n'interroge `identity`.

**Mais soixante secondes ne suffisent pas pour un accès qui expire.** Un renfort dont l'accès
expire « au tomber du rideau » peut survivre jusqu'à 60 s dans un jeton déjà frappé. Donc, règle
ferme : le jeton porte les **rôles** (grossier, stable) ; le service vérifie l'**accès borné dans
le temps sur la ressource chargée** (fin, daté). CASL 7 (`createMongoAbility`, vérification sur
l'instance avec `subject()`), jamais une vérification de type seule.

**`canRevenue` décide du contenu, pas de l'affichage.** Une régie qui reçoit le brut de
billetterie et ne l'affiche pas est une fuite. La projection est **serveur**, et une notification
ne porte **jamais** un montant si le rôle destinataire n'a pas `canRevenue` — elle s'affiche sur
un écran verrouillé.

**Chaque commande est autorisable seule.** Une action serveur Next.js est une route POST
publique : la protection de la page qui l'appelle n'est pas une frontière. Chaque commande
d'écriture porte l'identifiant de la ressource visée, et le contrat dit quelle propriété est
vérifiée. Et **aucun service ne saute son autorisation** parce que « seul le BFF l'appelle ».

### 7.1 E1 — pourquoi les formules cassées touchent l'authentification

`plan.opens[]` conditionne l'accès à la lecture, et **quatre vocabulaires disjoints** coexistent :
`plans[]` dit `free`/`pass`/`premium`, `accounts[].plan` dit `season`/`monthly`/`none`, les
maquettes web et TV en inventent quatre autres. `helpers.planOf()` faisant
`… || plans()[0]`, **les quatre comptes de référence retombent silencieusement sur `free`**.

**Conséquence pour cet ADR, et elle est ferme : le jeton interne ne porte aucune revendication
de formule.** Pas de `plan`, pas de `opens[]`, pas d'`entitlements`. Motifs :

1. mettre un vocabulaire cassé dans un jeton fige le défaut dans un artefact signé ;
2. une formule change à la seconde (résiliation, échec de prélèvement) et ne supporte pas 60 s de
   latence sur une décision d'argent ;
3. le droit de lecture appartient à `adr-stream-entitlement.md`, qui le résout **à l'émission du
   jeton de lecture**, sur la donnée fraîche.

Le jeton d'authentification dit **qui**. Il ne dit jamais **ce à quoi la personne a droit de
regarder**.

### 7.2 UUIDv7 et la date de création

Un UUIDv7 révèle sa date de création. Décision, volontairement étroite :

- `sub` d'un jeton = UUIDv7 de l'utilisateur : **acceptable**. Un jeton est court, déjà
  authentifié, et n'est pas une URL publique.
- **Aucun identifiant de personne physique n'apparaît dans une URL publique.** Les pages de
  partage, les profils publics et les QR portent un **slug** ou un identifiant public distinct.
  Les artistes sont des entités publiques : leur date de création n'est pas un secret.
- better-auth génère par défaut une chaîne base62. On impose l'UUIDv7 par
  `advanced.database.generateId`, **vérifié** comme acceptant une fonction.

---

## 8. Topologie : ce que le BFF frappe, ce que les services vérifient

Conforme aux décisions contraignantes, sans exception demandée.

```
surface ──(cookie | Bearer)──► BFF ──(JWT ES256, ~60 s, aud=<service>)──► service
                                │                                          │
                                └─ valide la session (Redis + identity)     └─ vérifie par JWKS,
                                   frappe le jeton interne                     localement, jose
```

- **Le BFF, et lui seul, valide la session.** Aucun service n'appelle `identity` ni ne lit le
  magasin de sessions. Redis reste **au BFF seulement**.
- **Le BFF frappe le jeton interne** : `jose`, **ES256**, `iss` = le BFF, `aud` = le service
  visé, `sub` = `user_id`, revendications minimales (rôles par chaîne, `device_id`), `exp` 60 s.
  Un jeton frappé pour `ticketing` est **refusé** par `billing`.
- **Chaque service vérifie localement** avec `createRemoteJWKSet` construit **une fois** (pas par
  requête), `algorithms`, `issuer` et `audience` **épinglés** — sans épinglage, tout jeton signé
  par la clé passe. Jamais `x-user-id` en en-tête : n'importe quel appelant peut le poser.
- **`traceparent` (W3C) est propagé** de la surface au service, en passant par le BFF.

### 8.1 Le point sensible : où vit le JWKS

Un service qui va chercher le JWKS chez un BFF réintroduit une dépendance vers l'entrée.
**Décision : un document JWKS unique, statique, servi par le CDN**, écrit par un travail de
rotation de clés. Il contient les clés publiques des **trois** émetteurs, distinguées par un
préfixe de `kid` :

| Émetteur | `kid` | `aud` | Rotation |
|---|---|---|---|
| BFF storefront | `bff-sf-<date>` | `arthome.<service>` | 30 j, grâce 24 h |
| BFF studio | `bff-st-<date>` | `arthome.<service>` | 30 j, grâce 24 h |
| Entitlement (lecture) | `play-<date>` | `arthome.cdn` | **90 j, grâce 7 j** |
| `identity` (device_token) | `dev-<date>` | `arthome.device` | 90 j, grâce 7 j |

Aucun appel de service à service, un seul objet à faire tourner, une seule chose à surveiller —
ce qui compte quand on est seul à l'exploiter. Publier la nouvelle clé **avant** de signer avec,
retirer l'ancienne **après** la plus longue durée de vie de jeton.

**ES256 partout, pas EdDSA.** better-auth signe en EdDSA par défaut ; nous imposons `ES256`.
Deux raisons vérifiées : `@nestjs/jwt` (jsonwebtoken 9) **ne sait pas** vérifier EdDSA, et la
périphérie du CDN qui doit vérifier le jeton de lecture s'appuie sur WebCrypto, où le support
d'Ed25519 est plus récent et plus inégal que celui de P-256. Un seul algorithme pour les quatre
émetteurs, c'est une chose de moins qui diverge.

---

## 9. Articulation avec `adr-stream-entitlement.md`

C'est la question explicitement posée. **Deux systèmes de jetons, quatre points de contact.**

| | Session / jeton interne (cet ADR) | Jeton de lecture (`adr-stream-entitlement`) |
|---|---|---|
| **Qui émet** | session : `identity` · jeton interne : le **BFF** | le service d'**entitlement** |
| **Qui vérifie** | le BFF (session) · chaque service (JWKS) | la **périphérie du CDN** |
| **Durée** | session 7 j · interne **60 s** | **≤ 60 s** (exigence Q9b de la TV) |
| **Porte** | qui vous êtes, vos rôles | ce que vous avez le droit de lire, sur quel appareil |
| **Algorithme** | **ES256** | **ES256** — même famille, obligatoire pour la périphérie |
| **Clés** | `kid` `bff-*` | `kid` `play-*` — **même document JWKS**, cadence de rotation **plus lente** |

**Quatre points de contact, écrits :**

1. **La rotation est commune, la cadence ne l'est pas.** Même document, même travail, même
   convention de `kid`. Mais la périphérie du CDN met le JWKS en cache agressivement, parfois des
   heures : une clé de lecture tourne **tous les 90 jours avec 7 jours de grâce**, quand une clé
   de BFF tourne tous les 30 jours avec 24 h. Aligner les deux cadences ferait rejeter des jetons
   valides en périphérie. **C'est le piège principal de cette articulation.**
2. **La révocation passe par le renouvellement, pas par une liste de refus.** Un jeton de lecture
   de 60 s ne se révoque pas : on **cesse de le renouveler**. « Déconnecter cet appareil » révoque
   la `DeviceSession` dans `identity`, qui publie `session.revoked` / `device.revoked` ;
   l'entitlement consomme l'événement et refuse le renouvellement suivant. **Latence maximale =
   retard de l'événement + 60 s.** C'est la réponse chiffrée à la question 25 de
   `storefront-web` (« déconnecter cet appareil coupe-t-il la lecture, et en combien de temps ? »)
   et à `DeviceSession` de la TV.
3. **Le bail expire, il ne se ferme pas.** La limite de sessions simultanées repose sur un **bail
   qui expire**, jamais sur un appel de fin que la TV ou un mobile tué par l'OS ne pourra pas
   toujours passer. C'est exactement Q9c de la TV et la question 5 de `storefront-mobile`
   (« qui libère une session tuée ? »). La session de lecture est identifiée par le `device_id`
   de cet ADR, ce qui permet à une personne de **reprendre sa propre session** au lieu d'être
   bloquée par son propre écran fantôme.
4. **Les horloges.** Tous les émetteurs sont disciplinés par NTP ; tolérance déclarée **± 30 s**
   des deux côtés ; `exp`/`iat` numériques (RFC 7519) dans les jetons, ISO dans les charges
   utiles d'API. Une périphérie de CDN dont l'horloge dérive rejette silencieusement : la
   tolérance doit être écrite dans les deux ADR, avec la même valeur.

**Et la frontière, dite une fois** : cet ADR répond **qui êtes-vous** ; `adr-stream-entitlement`
répond **avez-vous le droit de lire ceci, maintenant, ici, sur cet écran**. Le second consomme le
`sub` et le `device_id` du premier ; le premier ne connaît ni les territoires, ni les formules,
ni les écrans simultanés (§7.1).

---

## 10. Risques assumés

| # | Risque | Gravité | Ce qui le contient |
|---|---|---|---|
| **R1** | **Le plugin Device Authorization est jeune, et il a déjà eu une CVE d'autorisation** (CVE-2026-45337, corrigée en 1.6.11). Le liage à l'identité — notre Q2 — est précisément ce qui a cédé. | **élevée** | La garde de propriété est **écrite par nous** au BFF (§6.3), pas déléguée. Spike S3. Veille sur les avis de sécurité de l'éditeur, qui publie un bulletin mensuel. |
| **R2** | **Pas d'adaptateur TypeORM.** better-auth écrit dans PostgreSQL par Kysely : **deux outils de migration sur une base**. | moyenne | Schéma **`auth`** dédié pour better-auth, **`public`** pour TypeORM. Aucune entité TypeORM ne mappe une table better-auth ; le domaine ne tient qu'un `user_id`. Deux commandes de migration dans la même recette de déploiement, jamais entrelacées. |
| **R3** | **`@thallesp/nestjs-better-auth` est un adaptateur communautaire** (2.8.0, MIT, un mainteneur). Il impose `bodyParser: false` et pose une garde globale. | moyenne | La dépendance est **fine** : elle monte un routeur et un garde. En cas d'abandon, monter `auth.handler` à la main coûte une journée, pas une migration. `@AllowAnonymous()` sur santé et webhooks — à ne pas oublier, la garde est globale. |
| **R4** | **`@better-auth/expo` exige Expo**, et le choix Expo / React Native nu **n'est pas fait** (D-001). | moyenne | La voie retenue est le plugin **`bearer`**, qui ne dépend d'aucun des deux : le client stocke le jeton où il veut. `@better-auth/expo` reste une commodité si Expo est choisi, pas un prérequis. **Cette décision ne présuppose pas le choix de pile.** |
| **R5** | **Quatre intentions sur cinq ne sont pas du RFC 8628**, et je les fais passer par le même automate. Un lecteur pressé y verra un détournement du standard. | moyenne | C'est délibéré et écrit (§3, D-A2) : la **forme** est celle de la RFC parce que le client TV doit être unique ; seul `signin` emprunte le **protocole**. Les quatre autres n'émettent aucun jeton OAuth. |
| **R6** | **La limite de débit par adresse est inopérante** : un salon derrière un NAT, un opérateur en CGNAT. | faible | Plafond par **`device_id`** (§6.2), rendu possible par la décision Q3. C'est la raison pratique qui tranche Q3, en plus des quatre raisons de la TV. |
| **R7** | **28,8 bits d'entropie sur six caractères** est confortable mais pas énorme. | faible | Fenêtres courtes (5–15 min), unicité **partielle** aux seuls appairages en cours, plafond de tentatives et verrouillage. La RFC 8628 §5.1 admet cette entropie **sous condition de limitation de débit** — la condition est tenue. |
| **R8** | **Je fais de `identity` le propriétaire de l'appairage**, y compris pour des intentions d'achat. | faible | `identity` ne porte qu'un rendez-vous et un **pointeur opaque** ; il ignore places, formules et paiements. L'alternative — `ticketing` propriétaire — obligerait `identity` à l'appeler pour `signin`, ce que « aucun appel synchrone entre services » interdit. |

**Le risque principal que j'assume est R1** : je retiens, sur le point le plus décisif du
document, un composant dont la mise en œuvre de ce point précis a été vulnérable il y a trois
mois. Je l'assume parce que les alternatives sont pires — SuperTokens ne sait pas faire, Keycloak
porte **la même classe de défaut, non corrigée** (CVE-2026-88770), et le faire à la main revient
à écrire soi-même le code qui a produit ces deux CVE — mais je ne l'assume qu'avec la garde de
§6.3 écrite chez nous.

---

## 11. Le spike minimal qui confirme la décision

**Un seul spike, deux à trois jours, un seul service NestJS jetable.** Il ne valide pas
better-auth en général : il valide les **quatre points sur lesquels la décision pourrait casser**.

**S1 — La coexistence, qui est le risque d'architecture.** `identity` jetable : NestJS 12 +
`@thallesp/nestjs-better-auth` 2.8.0 + better-auth 1.7.5 sur **PostgreSQL 18**, better-auth dans
le schéma `auth` par son CLI, **deux entités TypeORM ^1.1** dans `public` avec leurs migrations.
*Succès* : les deux jeux de migrations tournent dans les deux ordres sans conflit ;
`advanced.database.generateId` produit bien des **UUIDv7** dans les tables better-auth ; une
jointure `public.channel_member → auth.user` fonctionne. *Échec ⇒ retomber sur Logto (MPL-2.0,
base à lui, device flow natif), qui est le second de ce classement.*

**S2 — L'appairage bout en bout, avec les cinq issues.** `deviceAuthorization` configuré avec
`generateUserCode` (alphabet §5.1, 6 caractères), `expiresIn` **par intention**, `interval`
dégressif. Un faux client TV en Node interroge ; un faux téléphone approuve, refuse, laisse
expirer, annule, et **approuve puis échoue**. *Succès* : les cinq issues sont distinguables par
un code, `slow_down` est reçu, la bascule tient **sous deux secondes**, et un `pairingId`
persisté se **rattache après redémarrage** du faux client. *À mesurer aussi* : qu'un code en
minuscules, avec un espace au milieu, soit bien accepté — c'est la lecture de documentation que
j'ai signalée comme non mesurée (§5.1).

**S3 — La garde qui a fait la CVE.** Deux comptes. Le compte A ouvre un appairage `seat` ; le
compte B, **authentifié**, tente `approve` avec le `user_code` de A. *Succès* :
`PAIRING_IDENTITY_MISMATCH`, et **rien n'est créé**. Puis le même essai en `intent = signin` :
*succès* = accepté, parce que c'est le cas nominal. **C'est le test qui doit exister avant
n'importe quelle ligne de production**, et il doit entrer dans la suite de non-régression, pas
rester dans le spike.

**S4 — La chaîne de vérification, en une page.** Le BFF valide la session, frappe un JWT
**ES256** de 60 s avec `aud: "arthome.ticketing"` ; un faux service le vérifie avec `jose` et
`createRemoteJWKSet` contre un **document JWKS statique**, `algorithms`/`issuer`/`audience`
épinglés. *Succès* : le jeton passe ; le **même jeton présenté à un faux `billing` est refusé** ;
une rotation de `kid` avec période de grâce ne casse rien. *Échec sur la rotation ⇒ le §8.1 est à
revoir avant d'écrire quoi que ce soit.*

**Ce que le spike n'a pas à prouver** : 2FA, réinitialisation de mot de passe et connexions
sociales. Ce sont des fonctions établies de tous les candidats ; les éprouver coûterait des jours
sans rien trancher.

---

## 12. Ce que je remonte au chef

Aucune impossibilité technique : **aucune décision contraignante n'est rouverte.** Trois points
qui appellent un arbitrage et qui ne sont pas à moi.

1. **La durée d'appairage `seat` doit être la durée d'un `hold` de places** (§4/Q4). Cela engage
   `ticketing`, pas `identity`. Sans ce maintien, la jauge affichée sur la TV est fausse pendant
   toute la durée du code — le défaut exact que la TV signale.
2. **Une exception écrite à la règle « les dates voyagent en chaînes ISO »** : l'intérieur d'un
   JWT reste en secondes numériques (RFC 7519). Ce n'est pas une entorse, c'est une frontière —
   mais elle doit figurer dans `critical-rules.md`, sinon quelqu'un la « corrigera ».
3. **Le document JWKS statique servi par le CDN** (§8.1) est une pièce d'infrastructure que
   personne ne possède aujourd'hui. Elle est la condition pour que « aucun service n'appelle le
   service d'identité » reste vrai *y compris pour la découverte des clés*. À attribuer.
