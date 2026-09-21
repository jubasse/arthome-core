# ADR — L'accès au direct

**Statut** : accepté. **Date** : 21 septembre 2026. **Auteur** : `backend-domain`.
**Portée** : `streaming`, la périphérie du CDN, et les trois storefronts.
**Maturité** : **provisoire** — le fournisseur média n'est pas choisi, et ses capacités déclarées
changeront la forme du jeton. La *mécanique* ci-dessous, elle, ne dépend d'aucun fournisseur.

---

## 1. Ce qu'il faut tenir, formulé comme une exigence

> **Changer d'adresse IP et vider ses cookies ne doit rien changer.
> Un lien partagé ne doit pas ouvrir le direct à qui n'a pas de droit.**

Et la contrainte qui élimine d'emblée la moitié des réponses habituelles :

> **Toute heuristique fondée sur l'adresse IP ou sur un cookie est contournable et ne compte pas
> comme réponse.** Une IP se partage dans un foyer et change en itinérance ; un cookie se copie.
> Ni l'un ni l'autre ne porte un droit.

Ce qui traite réellement le partage, c'est **la limite de sessions simultanées**, tenue par le plan
de contrôle, avec révocation. Pas l'adresse.

---

## 2. Le problème que le CDN crée

Un CDN devant le LL-HLS signifie que **ce n'est plus notre serveur média qui sert les segments**.
La vérification « cette personne détient une place » ne peut donc plus se faire à la lecture : au
moment où un segment part, aucun de nos processus n'est dans la boucle.

```
@arthome/core       dit si le droit est valide
service streaming   émet un jeton court contre ce droit
client              renouvelle le jeton tant que le droit tient
CDN                 refuse tout ce qui n'est pas signé
```

Le port `PlaybackProvider` doit exposer cette capacité **explicitement** : un fournisseur futur
sans URL signées casserait la règle métier sans qu'on s'en aperçoive.

---

## 3. Les quatre pièces

### 3.1 Le jeton de lecture — signé, court, renouvelé pendant la diffusion

Émis par `streaming`, **contre un droit vérifié**, jamais contre une session.

```
claims
  sub   profileId          did   deviceId
  dat   dateId             sid   playbackSessionId
  qmax  plafond de qualité que le niveau de sécurité matériel autorise
  scope full | preview     jti   identifiant unique, pour la révocation
  exp   +120 s             kid   dans l'en-tête, pour la rotation
```

**Durée : 120 secondes. Intervalle de renouvellement : 45 secondes.**

`storefront-tv` Q9(b) exigeait « ≤ 60 s », et son exigence est satisfaite — mais **elle porte sur
l'intervalle de renouvellement, pas sur la durée du jeton**, et il faut distinguer les deux sous
peine d'écrire une garantie fausse (ce que j'avais fait : voir l'encadré du §3.3) :

| | Borné par | Valeur |
|---|---|---|
| délai avant que **le client** apprenne qu'il n'a plus le droit | l'**intervalle** | ≤ 45 s |
| délai avant que **la périphérie cesse de servir** des segments | la **durée du jeton** | jusqu'à 120 s |

C'est le renouvellement qui porte la limite de sessions simultanées, donc c'est bien l'intervalle
qui doit rester court — au-delà d'une minute, la limite ne limite plus rien. Mais il ne borne que
ce que le client sait, jamais ce que le CDN sert.

**Le renouvellement ne doit pas redémarrer la lecture.** C'est une contrainte sur la **forme** du
jeton, pas sur sa durée : un jeton dans le **chemin** forcerait un rechargement de manifeste et
produirait un micro-gel toutes les N minutes, visible sur un plan fixe de théâtre. Donc :

> **Jamais de jeton dans le chemin d'une URL.** Il vit dans une requête signée ou dans un cookie
> signé, et le chemin du manifeste comme celui des segments reste stable.

**Le refus de renouvellement porte un code, et quatre codes distincts sont nécessaires** — la TV
affiche quatre messages différents :

| Code | Ce que la surface dit |
|---|---|
| `SEAT_EXPIRED` | votre place a expiré |
| `CONCURRENT_LIMIT_REACHED` | la limite d'écrans simultanés est atteinte |
| `SIGNED_OUT_ELSEWHERE` | vous avez été déconnecté depuis un autre appareil |
| `SERVICE_UNAVAILABLE` | nos serveurs ne répondent pas |

Un code générique en produirait un faux trois fois sur quatre.

**Ce que le jeton emporte en plus, et pourquoi c'est ici** : le protocole et le système de DRM
**choisis par le serveur pour cet appareil**, et le **plafond de qualité** que son niveau de
sécurité matériel autorise. Le parc impose HLS + FairPlay sur tvOS et DASH + Widevine ailleurs,
avec PlayReady sur certaines références ; **un client qui devine se trompe**, et il se trompe sur
les appareils qu'on ne peut pas tester. Une clé HDMI d'entrée de gamme n'offre que du Widevine
logiciel, plafonné en SD : le serveur **dégrade proprement** plutôt que de refuser la lecture, et
la TV **sait** qu'elle a été plafonnée pour ne pas proposer « 4K » dans son panneau de qualité.

**Le DRM sert ici au tiérage d'appareil et de qualité, pas à une promesse anti-copie.** §7 le dit
franchement.

### 3.2 La vérification à la périphérie du CDN — manifeste **et** segments

> **Une URL de segment ne doit pas fuir seule.**

Signer le manifeste et laisser les segments ouverts, c'est ne rien signer : il suffit de recopier
un lien de segment. La signature porte donc sur un **préfixe de chemin**, avec une expiration :

```
/playback/{dateId}/{sessionScope}/*     signé, expire avec le jeton
  ├── master.m3u8
  ├── {rendition}/index.m3u8
  └── {rendition}/seg-000123.m4s        couvert par la MÊME signature de préfixe
```

Deux mécanismes, **déclarés par une capacité du port** parce qu'ils ne sont pas également
disponibles partout :

| Mécanisme | Où | Renouvellement |
|---|---|---|
| **cookies signés** de préfixe | navigateur (storefront web, studio web) | un appel même-origine repose le cookie : **zéro changement d'URL, zéro interruption** |
| **signature en paramètre de requête**, chemin stable | lecteurs natifs (TV, mobile) | le lecteur ré-appose le jeton courant sur chaque requête via son filtre de requêtes |

**Le cas dur, et il faut le nommer** : `AVPlayer` sur tvOS ne partage pas les cookies du WebView et
n'offre pas de filtre de requêtes générique. La réponse est `AVAssetResourceLoaderDelegate`, qui
intercepte les requêtes du lecteur et y appose l'en-tête ou le paramètre courant. C'est du travail
de surface, et **c'est le point à valider sur un appareil réel avant de promettre quoi que ce
soit** : `PlaybackProvider` doit donc déclarer `supportsSignedCookies` et
`supportsQueryTokenRenewal`, et le `PlaybackTicket` dire lequel s'applique à cet appareil.

**Les chemins de flux sont aléatoires et non prédictibles** — `streaming.md` le pose pour le mode
démonstration, et cela vaut partout : un chemin devinable est une signature en moins.

### 3.3 La limite de sessions simultanées — **c'est elle qui traite le partage**

Tenue par le plan de contrôle, **par droit** (le compte et sa formule), pas par appareil ni par
adresse.

```
PlaybackSession   { id, accountId, profileId, deviceId, dateId,
                    leaseExpiresAt = now + 90 s }
```

**Le bail expire faute de renouvellement. Il ne se libère pas par une commande.**
C'est la décision la plus importante de cette section, et elle vient de deux surfaces
indépendamment :

- `storefront-tv` : *« `releasePlayback` ne peut pas être garantie : un téléviseur se débranche,
  une box se coupe »* ;
- `storefront-mobile` : *« le système d'exploitation tue une application sans préavis et sans lui
  laisser le temps de fermer quoi que ce soit. Une session qui ne se ferme que sur un événement du
  client laisse un écran fantôme, et l'utilisateur se voit refuser sa propre seconde lecture. »*

Donc : **bail de 90 s, renouvelé toutes les 45 s par le renouvellement du jeton.** `releasePlayback`
existe et accélère la libération quand le client y arrive, mais **rien n'en dépend**. Un foyer ne
peut pas se retrouver bloqué par des sessions fantômes.

**Le client peut reprendre sa propre session**, identifiée par `deviceId` : rouvrir le lecteur sur
le même appareil réutilise le bail au lieu d'en ouvrir un second.

**Au-delà du plafond** (`PLAN_OPENING_MULTI_SCREEN` : 2 écrans en Premium, 1 sinon), le
renouvellement est refusé avec `CONCURRENT_LIMIT_REACHED` **et la liste des sessions actives** —
appareil, ville, instant d'ouverture — pour que la surface propose d'en **libérer une**. Un refus
nu laisserait le spectateur sans issue, ce que le principe n°8 du dossier interdit.

**Ce que voit le troisième écran** (`storefront-web` Q21) : un refus explicite, la liste, et un
geste. Jamais une erreur réseau, jamais un lecteur qui tourne sans image.

#### La fenêtre d'exposition réelle est de 120 s, pas de 60 s — et j'avais écrit 60

C'est le défaut le plus grave que la revue adverse a trouvé chez moi (`skeptic.md` K3), parce
qu'il porte sur **une garantie de sécurité, chiffrée et publiée aux cinq surfaces**.

> **La révocation ne révoque pas un jeton : elle refuse le renouvellement suivant.** La fenêtre
> pendant laquelle la périphérie continue de servir des segments est donc la durée de vie du
> **jeton en main**, soit **jusqu'à 120 s** — et non l'intervalle de renouvellement.

```
révocation à T                                     jeton en main, émis à T−ε
  │                                                  │
  ├── renouvellement à T+45 s : REFUSÉ               ├── mais il reste valide jusqu'à T−ε+120 s
  │   le client sait                                 │   et le CDN, lui, ne sait rien
  └──────────────────────── exposition réelle ───────┘
       cas favorable  ~45 s        cas défavorable  ~120 s        régime courant  45 à 75 s
```

Un client qui ignore le refus — ou qui, plus simplement, ne s'arrête pas — continue de tirer des
segments **signés valides**. La signature de préfixe expire avec le jeton (§3.2), pas avec la
décision.

**Comment l'erreur s'est produite, parce qu'elle est instructive.** `storefront-tv` Q9(b) demandait
« ≤ 60 s », et j'ai recopié 60 comme si c'était la garantie obtenue. Or son exigence portait sur
l'**intervalle de renouvellement** — c'est lui qui borne le délai avant que le *client* apprenne le
refus — et pas sur la durée d'exposition côté CDN. **J'ai choisi le nombre qui faisait plaisir à la
question**, et il s'est propagé dans quatre documents. C'est la règle critique 15 — une constante à
deux propriétaires et deux valeurs — appliquée cette fois à une garantie de sécurité. Un seul
document était juste : `adr-auth.md:520`.

**Ce que le contrat doit servir**, et c'est à `backend-contracts` de le porter : la valeur exposée
n'est pas « 60 », c'est **`playbackCutWithinSec = 120`**, accompagnée de la valeur courante
attendue (45 à 75 s). Et le test d'intégration doit mesurer **l'arrêt de la lecture**, pas le refus
du renouvellement : un test qui constate le refus à 45 s passe au vert sans avoir vérifié ce que la
phrase promet. **Une garantie fausse avec un test vert est pire qu'une garantie absente.**

#### L'arbitrage rendu : le jeton reste à 120 s

**Décision : on ne raccourcit pas le jeton.** Trois raisons, et la première est la bonne.

1. **Le défaut n'a jamais été la fenêtre, c'était la promesse** — et elle est réparée. Doubler la
   fréquence de renouvellement sur le chemin le plus chaud du système pour faire correspondre un
   mécanisme à une phrase que quelqu'un avait mal écrite serait payer très cher une erreur de
   rédaction.
2. **120 s sur un spectacle de deux heures font 1,6 % de la séance.**
3. **La propriété de sécurité qui compte est tenue à l'ÉMISSION, pas à la révocation.**
   *Un lien partagé n'ouvre pas le direct à qui n'a pas de droit* : cela se joue quand le jeton est
   émis contre un droit vérifié. La révocation traite un tout autre cas — un droit qui a **existé
   puis cessé** : abonnement échu, appareil déconnecté, limite d'écrans franchie, remboursement.
   Aucun ne justifie de doubler la charge du chemin chaud.

**Une addition pour le cas visible, et elle est étiquetée honnêtement.** Quand quelqu'un déconnecte
un appareil depuis son compte et regarde l'écran s'arrêter, 120 s sont longues. Le canal temps réel
existant pousse donc, sur `viewer:{profileId}` et `device:{deviceId}`, un signal demandant au
client d'**arrêter la lecture immédiatement**.

> **⚠ Ce signal n'est PAS une frontière de sécurité.** Un client modifié l'ignore ; la périphérie
> continue de servir jusqu'à 120 s ; **la garantie reste 120 s**. C'est une **courtoisie qui rend
> le cas courant instantané**, jamais un contrôle.

Le dire ainsi n'est pas de la prudence rédactionnelle : ce document rejette d'emblée « toute
heuristique IP ou cookie » parce qu'elle est contournable, et il serait incohérent de présenter
ensuite un signal client comme une protection. Un mécanisme qu'un attaquant peut ignorer se mesure
au confort qu'il apporte, pas à la sécurité qu'il n'apporte pas.

**Ce qui rouvrirait la décision — un seuil, pas une intention.** Si l'on mesure que le
renouvellement à 45 s coûte **moins de 5 % du temps processeur du service `streaming` en pointe**
et **moins de 2 % de latence ajoutée au p95 de `OpenPlayback`**, alors raccourcir le jeton à 60 s
devient gratuit et la fenêtre tombe de 120 à 60 s. **Tant que ce n'est pas mesuré, on ne touche à
rien** — c'est exactement l'erreur qu'on vient de corriger, dans l'autre sens.

**Révocation immédiate, deux chemins :**
- `identity.device.revoked.v1` consommé par `streaming` → les baux de cet appareil passent à
  `revoked`. **Fenêtre d'exposition réelle : jusqu'à 120 s** — voir l'encadré ci-dessous ;
- issue `interrupted` déclarée → les baux de la date sont révoqués avec `DATE_INTERRUPTED`, **à la
  fin du renouvellement en cours**, pas par une coupure brutale : un flux coupé sans explication
  est exactement ce que le principe n°6 interdit.

### 3.4 La rotation des clés

Deux jeux de clés, **jamais le même** :

| Jeu | Vérifié par | Rotation | Grâce |
|---|---|---|---|
| **session / jeton interne** (BFF → services) | chaque service, par JWKS, **en local** | **30 j** | **24 h** |
| **lecture** (entitlement → CDN) | la **périphérie du CDN** | **90 j** | **7 j** |

Cadences et `kid` fixés par `adr-auth.md` §8.1, qui possède la conception des clés. **Une version
antérieure de ce document donnait 24 h aux deux jeux : c'était un nombre plausible et faux**, et
c'est exactement le genre de littéral parallèle que E2 décrit — sur une valeur d'exploitation
cette fois, pas sur un vocabulaire.

**Les séparer est le point.** Une compromission de la clé de lecture ne doit pas donner de
session, et réciproquement. Le jeu de lecture est en plus **par environnement** : une clé de
démonstration publique ne signe jamais rien en production.

### Pourquoi les deux cadences diffèrent — et ce n'est pas un réglage

La rotation est **à recouvrement** : on publie la nouvelle clé, les deux sont acceptées pendant la
fenêtre de grâce, puis l'ancienne est retirée. La question est de savoir **ce que la grâce doit
couvrir**, et c'est là que j'avais tort :

> **La fenêtre de grâce doit couvrir le cache du CDN, pas la durée de vie du jeton.**

Une grâce dimensionnée sur les 120 s d'un jeton — ce que ce document disait — ne sert à rien. La
périphérie met le document JWKS en cache **pendant des heures** : publier la nouvelle clé puis
signer avec soixante secondes plus tard laisse l'arête servir l'ancien document, et **elle rejette
alors des jetons parfaitement valides**. Le spectateur voit sa lecture s'arrêter sans raison, et
la cause est invisible côté serveur — le jeton *est* bon.

D'où une valeur de contrat, due à `backend-contracts` :

```
Cache-Control: max-age=3600   sur le document JWKS
grâce  ≥  2 × max-age         pour TOUTE clé, quel que soit son émetteur
```

La plus courte des deux grâces (24 h) garde donc un facteur 24, délibérément. Et la cadence de
lecture est plus lente que celle des BFF **pour cette raison précise**, pas par prudence vague :
c'est elle qui traverse un cache qu'on ne contrôle pas.

**Deux règles d'exploitation qui vont avec, et qui ne se voient qu'en production :**

1. **Une rotation en échec ne retire jamais une clé.** L'assembleur du document JWKS ne fait
   qu'**unir** ce que les émetteurs publient ; le retrait est une étape **séparée**, conditionnée à
   la grâce. Un assembleur qui reconstruirait « à l'identique de ce qu'il voit » supprimerait la
   clé d'un émetteur temporairement muet et **invaliderait tous ses jetons en vol**.
2. **Aucune clé privée ne figure jamais dans le document publié.** La porte est d'une ligne et se
   lance après *chaque* publication — un `d` dans un JWK publié, c'est la signature du système
   donnée au monde (`definition-of-done.md` §7.6, porte J1).

---

## 4. L'aperçu gratuit — imposé par le jeton, pas par le client

Le non-détenteur voit les premières minutes puis le verrou. **Un aperçu que l'on prolonge en
rechargeant la page n'est pas un aperçu** (`storefront-web` Q20), et une application réinstallée
remettrait un compteur client à zéro (`storefront-mobile` Q6).

```
PreviewBudget  (accountId, dateId) → secondsUsed        décompté SERVEUR
```

Le jeton d'un non-détenteur est émis avec `scope: preview` et
`exp = min(now + 120 s, now + secondsLeft)`. Quand le budget est épuisé, le renouvellement est
refusé avec `PREVIEW_EXHAUSTED`, et la surface pose son verrou — avec l'action qui sort de
l'impasse, jamais un écran mort.

**La portée est le compte, pas l'appareil** : sinon un foyer à quatre appareils obtient quatre
aperçus. Et le budget est **servi** dans le verdict de droit, pour que la surface puisse afficher
le décompte sans le compter elle-même.

---

## 5. Ce que `streaming` doit savoir pour décider — et pourquoi il le sait

`decideWatch` a cinq entrées, qui appartiennent à trois contextes. **Aucun appel synchrone entre
services n'étant permis**, `streaming` tient une **projection locale** alimentée par Kafka :

| Entrée | Source | Arrive par |
|---|---|---|
| possession d'une place | `ticketing` | `ticketing.seat.activated.v1` / `.cancelled` |
| formule et `opens[]`, plafond d'écrans | `ticketing` | `ticketing.subscription.changed.v1` |
| état de la date et ses bornes | `catalog` | `catalog.date.scheduled.v1` / `.rescheduled` / `.outcome_declared` |
| politique et fenêtre de rediffusion | `catalog` | `catalog.date.replay_policy_set.v1` |
| droits territoriaux | `catalog` | `catalog.date.rights_changed.v1` |

C'est **la seule projection du système qui porte une autorité** — les sept autres
(`data-model.md` §4) alimentent un affichage, celle-ci décide d'un droit — et elle est assumée
parce que les deux alternatives sont pires : un appel synchrone entre services est interdit, et un
droit décidé par le BFF n'a aucune autorité — il ne produit pas de jeton.

**Fraîcheur tolérée : ≤ 5 s.** Au-delà, l'alerte `read_model_staleness_seconds` de
`context-map.md` §11 se déclenche. Et le pays du spectateur est **résolu à chaque ouverture**, pas
projeté : il change entre deux lectures (déplacement, itinérance, réseau d'entreprise), et sur
mobile ce délai se compte en heures.

**Le droit est revérifié au démarrage de la lecture, jamais hérité du catalogue.** Le verdict servi
sur une carte est **indicatif et non opposable**, et le contrat le déclare tel.

---

## 6. L'ingestion — l'autre bout du même problème

Le droit de **lire** et le droit de **diffuser** sont deux choses, mais la discipline est la même :
une vérification synchrone **avant** d'accepter quoi que ce soit.

| Mécanisme | Rôle |
|---|---|
| **authentification HTTP externe** du serveur média → API NestJS | **synchrone, AVANT acceptation du flux** : jeton, session, propriétaire, expiration, quota |
| crochets `runOnOnline` / `runOnOffline` / `runOnRead` | **cycle de vie seulement** : ils signalent l'état, ils ne décident de rien |
| métriques Prometheus | surveiller et couper, **jamais autoriser** |

**Les crochets ne servent pas à autoriser** — `streaming.md` est explicite, et le motif est concret :
`runOnConnect` est un événement de cycle de vie, donc **un flux peut entrer avant d'être refusé**.

**La clé de flux est un secret affiché sur un téléphone, dans une salle, souvent devant un
prestataire.** D'où quatre garanties, déjà posées dans `data-model.md` §5.2 : jamais dans une
charge utile de liste, révélation par une commande distincte et auditée, renouvellement immédiat
avec arrêt instantané de l'ancienne, et `Cache-Control: no-store` — la clé ne doit se retrouver ni
dans le cache HTTP du téléphone ni dans un instantané d'application pris par le système au passage
en arrière-plan.

---

## 7. La limite assumée

> **Rien de ce qui précède n'empêche un enregistrement d'écran.**

Un spectateur qui filme son téléviseur, ou qui capture son écran avec un logiciel, obtient une
copie. Aucune signature de segment, aucune limite de sessions et aucune rotation de clé n'y change
quoi que ce soit : ces mécanismes protègent **l'accès**, pas la **copie**.

Seul un **DRM** avec chemin média protégé et sortie contrôlée (HDCP) le ferait, et encore : contre
une caméra pointée sur un écran, rien ne le fait.

**Le DRM est hors de proportion ici**, et pour trois raisons qu'on peut écrire :

1. **Le coût.** Une licence Widevine/PlayReady/FairPlay, un serveur de licences, un empaquetage
   chiffré par rendition et un plan de test sur un parc de téléviseurs hétérogène — pour une
   plateforme de spectacle vivant tenue par une personne seule.
2. **Le rendement.** La valeur d'une captation de spectacle vivant est très largement dans
   l'instant : le direct, le tchat, le public. Une copie basse définition d'un plan fixe de théâtre
   n'entame ni la billetterie ni la rediffusion.
3. **Le vrai risque n'est pas la copie, c'est le partage de compte** — et c'est exactement ce que
   la limite de sessions simultanées traite, sans DRM et sans heuristique d'adresse.

**Ce qu'on garde du DRM malgré tout** : le champ `drm_system` et le plafond `qmax` du
`PlaybackTicket`. Ils ne sont pas là pour empêcher la copie ; ils sont là parce que **le parc
l'exige** — un lecteur qui devine son système de DRM se trompe, et une clé HDMI qui n'a que du
Widevine logiciel doit recevoir du SD plutôt qu'un refus.

C'est ce genre d'arbitrage — **une architecture composable, instanciée au minimum viable, avec un
paragraphe expliquant ce qui n'a délibérément pas été déployé et pourquoi** — que `streaming.md`
demande d'écrire, et qui envoie un signal plus fort qu'une tentative inachevée de tout monter.
