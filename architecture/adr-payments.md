# ADR — Encaissement, commission, TVA, versements

**Statut** : **accepté** — modèle fiscal tranché par **D-015**, devise d'affichage par **D-016**,
quatre arbitrages secondaires par **D-017**.
**Date** : 21 septembre 2026. **Auteur** : `backend-domain`.
**Portée** : `ticketing` (encaisse), `payouts` (calcule le droit), Stripe Connect en **mode test**.

---

> ## ⚠ Avertissement — à lire avant tout le reste
>
> **Le modèle fiscal décrit au §5 est une recommandation d'architecture. Ce n'est pas un avis
> fiscal, et il doit être validé par un conseil avant tout encaissement réel.**
>
> Qui doit la TVA, sur quelle assiette et qui en est redevable sont des **questions de droit**.
> Elles dépendent du statut réel d'Arthome (assujetti ou non, seuils, pays d'établissement), du
> statut des artistes (assujettis ou non, établis en France ou non) et du guichet unique pour les
> ventes hors France. Aucun de ces faits n'est connu à la date de ce document.
>
> **Le risque est nul aujourd'hui** : Stripe tourne en mode test, aucun argent réel ne circule.
> C'est précisément pour cela que la décision est prise maintenant — elle est **réversible sur le
> fond**. Ce qui ne l'est pas, c'est la **forme** : voir l'encadré du §5.0.

---

## 1. Le contexte, et ce que le dossier fixe déjà

`shared/catalogue.json` fixe trois paramètres commerciaux, et ils font autorité :

```
commissionRate    0.12          payoutDelayDays   14
billingMarkets    eur (TVA 5,5 %) · chf (2,6 %) · cad (14,975 %, live: false)
```

Ce qui fait également autorité dans `shared/`, et qu'on porte tel quel :
l'arrondi se fait **à l'unité mineure, sur chaque composante prise séparément** ; un versement est
**retenu** (`held`) tant qu'une issue est ouverte — reportée ou interrompue — et **remboursé**
(`refunded`) si la date est annulée.

**Ce qui ne fait PAS autorité**, et c'est le piège le plus coûteux du dossier (D5) : la formule
`net = brut − 12 % − TVA(brut)` de `fixtures.js`. Elle *ressemble* à une règle métier éprouvée —
elle en a la place, le ton et la précision à l'euro. Elle n'en est pas une : elle produit un nombre
plausible pour une maquette. §5 l'instruit.

**Aucun argent réel ne circule.** Stripe en mode test, gratuit. Cela rend les décisions de ce
document **réversibles sur le fond** et **non réversibles sur la forme** : ce qui se grave
maintenant, c'est la structure des données et la frontière des contextes.

---

## 2. Périmètre PCI — évité, et comment

**Aucun numéro de carte ne transite par Arthome, jamais.**

| Surface | Mécanisme | Motif |
|---|---|---|
| storefront web | **Payment Element** (Stripe.js) | rend le prix, la 3-D Secure et les moyens locaux sans que la carte touche notre domaine |
| storefront mobile | **Checkout hébergé**, ouvert dans un navigateur système | pas de SDK natif de carte à intégrer, et la 3-D Secure fonctionne |
| **storefront TV** | **jamais** | la TV n'accepte aucune saisie au-delà de six caractères : tout paiement passe par **l'appairage d'appareil** (`context-map.md` §8), donc par le téléphone, donc par l'une des deux lignes ci-dessus |
| studio (compte de versement) | **Connect Onboarding hébergé** | la conformité du bénéficiaire est celle de Stripe |

Conséquence : **SAQ-A**, le périmètre le plus étroit. C'est aussi ce qui rend la démonstration
publique possible sans engager quoi que ce soit.

### 2.1 Deux vérifications d'identité, qui n'ont rien à voir — à écrire une fois pour toutes

Elles sont confondues à peu près systématiquement, et la confusion coûte cher parce qu'elle fait
croire qu'une seule suffit.

| | Porte sur | Qui la fait | Ce qu'elle sert |
|---|---|---|---|
| **KYB / KYC de Connect** | **l'ARTISTE** — identité et entreprise du compte connecté | Stripe, dans son parcours d'inscription hébergé | pouvoir **verser** de l'argent à quelqu'un, et savoir à qui |
| **Localisation fiscale** | **le SPECTATEUR** — pays, subdivision, code postal, preuves | **nous**, à l'instant de la vente (§5.0) | savoir **quel taux** appliquer et pouvoir le **justifier dix ans** |

La première est de la conformité **bénéficiaire**, déléguée et hors de notre périmètre. La seconde
est de la conformité **fiscale**, et elle est **irréversible** : personne ne la fait à notre place,
et un fait non capturé à la vente n'existe plus. Avoir l'une ne donne rien de l'autre.

---

## 3. Le modèle Stripe Connect retenu

**Décision : `destination charges` sur le compte plateforme — sans `on_behalf_of` — avec
`application_fee_amount`. Comptes connectés en Express.**

```
PaymentIntent
  ├─ créé sur le compte PLATEFORME               nous sommes le marchand d'enregistrement
  ├─ transfer_data.destination = acct_<chaîne>   le net part vers l'artiste
  └─ application_fee_amount   = commission + TVA due par la plateforme
```

**`on_behalf_of` est retiré, et c'est une correction, pas un réglage.** Il fait de l'artiste le
**marchand d'enregistrement** — il fixe le règlement, la devise et le rattachement fiscal sur le
compte connecté. Or tout le modèle commissionnaire du §5 repose sur l'affirmation inverse : c'est
**Arthome** qui fournit la prestation au spectateur. Le garder aurait mis la configuration Stripe
en contradiction frontale avec le modèle fiscal qu'elle est censée exécuter — et c'est le genre de
contradiction qu'aucun test ne rattrape, parce que les deux moitiés fonctionnent séparément.

**Le coût, à écrire plutôt qu'à découvrir** : Stripe **exige** `on_behalf_of` dès que le compte
connecté sort de la région du compte plateforme. Une chaîne **suisse ou canadienne** ne peut donc
pas être servie par ce montage — elle devra être traitée autrement (compte plateforme local, ou
`separate charges and transfers`) **ou attendre**. `catalogue.json` déclare précisément ces deux
marchés (`chf`, `cad`), et D4 a montré qu'aucun n'a jamais été exercé : la limite est donc théorique
aujourd'hui et réelle au premier artiste non européen.

**Pourquoi ce modèle et pas les deux autres.**

| Modèle | Pourquoi écarté |
|---|---|
| **Direct charges** | l'artiste devient marchand d'enregistrement : nous perdons le contrôle du remboursement, de l'avoir et de la politique d'annulation — or les trois sont rédigés dans notre copie, affichés sur nos trois storefronts, et exécutés par nos commandes. Et le litige bancaire irait à l'artiste, qui n'a ni les preuves ni l'écran pour y répondre. |
| **Separate charges & transfers** | plus souple pour un panier multi-vendeurs, mais il nous oblige à tenir nous-mêmes un grand livre de transferts — exactement ce que la règle « Stripe reste la source de vérité du mouvement d'argent » interdit. |
| **Destination charges** ✓ | un paiement, un transfert, une commission, et Stripe tient le livre. |

**La conséquence structurante, et elle remonte jusqu'au modèle de données** : un
`destination charge` n'admet **qu'une seule destination**. Donc **une commande de marchandise est
mono-vendeur**, et un panier contenant les articles de deux chaînes **se scinde en deux commandes
au paiement**, chacune avec son port, sa commission et son versement. C'est la réponse à
`storefront-web` Q15, et elle a deux justifications indépendantes : le modèle de paiement et le
fait qu'un panier à deux artistes est de toute façon deux expéditions.

**Express plutôt que Standard** : l'inscription est hébergée (indispensable au parcours
`studio-mobile`, qui sort vers un navigateur externe et revient par lien universel), le tableau de
bord du bénéficiaire est fourni, et la plateforme garde la main sur les litiges — ce qu'elle doit,
puisqu'elle est marchand d'enregistrement.

---

## 4. Un port, deux adaptateurs, et le factice par défaut

**Décision structurante, et elle est à moi** : le domaine ne connaît pas Stripe.

```
@arthome/core  →  PaymentPort      authorize · capture · refund · quote
                  ConnectPort      createAccount · onboardingLink · accountStatus · transfer
                  WebhookPort      verifySignature · parse
                  LedgerPort       listBalanceTransactions   (réconciliation)

ticketing / payouts
   ├── FakePaymentAdapter     PAR DÉFAUT — déterministe, aucun réseau, aucune clé
   └── StripeTestAdapter      Stripe en mode test
```

**Pourquoi le factice est le défaut et non l'inverse.** La démonstration publique du palier 0 et
toute la suite de tests doivent tourner **sans clé et sans réseau**. Un adaptateur factice par
défaut garantit qu'un clone du dépôt fonctionne au premier `docker compose up` ; un adaptateur
Stripe par défaut garantit l'inverse. Et l'adaptateur factice **simule les échecs** : carte
refusée, 3-D Secure abandonnée, webhook en retard, webhook désordonné, litige bancaire. Ce sont
ces chemins-là qu'on ne teste jamais autrement.

**Aucun identifiant propre à Stripe ne traverse le domaine.** `payment_intent_ref` est une chaîne
opaque pour `@arthome/core` ; seul l'adaptateur sait la lire. C'est la même discipline que pour
les ports média de `streaming.md`.

---

## 5. La TVA — la question que D5 laissait ouverte, instruite et non supposée

### 5.0 Le seul choix réellement irréversible, isolé

Avant d'entrer dans le débat fiscal, il faut séparer ce qui se rejoue de ce qui ne se rejoue pas.
C'est la distinction qui compte le plus dans ce document.

> **Le modèle fiscal est un calcul : il se refait. La forme des données est une structure : elle
> ne se refait pas.**
>
> **Le seul choix réellement irréversible de tout ce chapitre est de capturer — ou non — la
> localisation fiscale de l'acheteur, ses preuves, et le taux appliqué à la vente.**

```
irréversible   la LOCALISATION FISCALE de l'acheteur, ses PREUVES,
               et le TAUX APPLIQUÉ conservé sur la ligne          ← ce qu'on grave
réversible     quel taux, quelle assiette, quel redevable         ← ce qui se recalcule
```

**Et la forme est plus exigeante que je ne l'avais écrite.** J'avais gravé une ventilation clée sur
le **marché de facturation**. C'est insuffisant, et la raison est arithmétique plutôt
qu'argumentative :

| Juridiction | Pourquoi un marché — ni même un pays — ne suffit pas |
|---|---|
| **États-Unis** | environ **9 000 juridictions** (État, comté, ville). Un pays ne permet **aucun** calcul ; le **code postal** est indispensable, et les lois *marketplace facilitator* obligent la plateforme à collecter dans **46 États plus le district de Columbia**, quelle que soit sa position contractuelle |
| **Union européenne** | **deux éléments de preuve non contradictoires** sont obligatoires pour une vente B2C — adresse de facturation, adresse IP, pays de la banque, pays de la carte SIM. Et **Stripe Tax privilégie une adresse unique** au lieu de les comparer : la règle de preuve **ne peut pas lui être déléguée** |
| **Royaume-Uni** | l'arrêt **Derby Quad contre HMRC** a jugé que l'exonération des places de théâtre **ne s'étend pas** au direct diffusé. Le taux dépend donc du couple **juridiction × nature de la prestation**, jamais d'une constante par marché |

**Un marché de facturation est une notion de PRIX** — dans quelle devise on vend. **Ce n'est pas
une notion de TAXE**, et les confondre était ma faute. `market_id` est retiré de la ligne de TVA
(numéro réservé) et remplacé par `jurisdiction_code`, `jurisdiction_level` et `supply_kind`.

**Ce que la commande porte désormais** — et c'est la forme à graver :

```
BuyerTaxLocation   country · subdivision · postal_code · city
                   evidence[]  { kind, country, subdivision, source, collected_at }
                   evidence_conflicting        ← deux preuves qui se contredisent : on l'assume
VatLine            jurisdiction_code · jurisdiction_level · supply_kind
                   rate_bps  ← LE TAUX APPLIQUÉ AU MOMENT DE LA VENTE, pas le taux courant
```

**Trois raisons de ne pas s'en remettre au `Customer` de Stripe**, et aucune n'est une préférence :
la facture se conserve **dix ans** quand l'objet Stripe ne vit que tant qu'on reste chez Stripe ;
il faut le taux **historique**, pas le taux courant ; et l'obligation de conservation porte sur
**six éléments** — date, preuves de localisation, nature du produit, taux applicable, montant de
TVA, total. C'est notre registre qui doit les porter.

**Et la conséquence sur le mot « irréversible » est plus dure que ce que j'avais écrit.** Je disais
que reconstruire l'assiette de chaque ligne passée « n'est plus une migration, c'est une
reconstitution comptable ». Avec la localisation fiscale, ce serait **impossible** : une adresse de
facturation, une adresse IP et un pays de carte au moment d'une vente d'il y a deux ans
**n'existent nulle part** si on ne les a pas capturés. On ne reconstitue pas un fait daté qu'on n'a
pas enregistré.

Pourquoi ce n'est pas un détail de modélisation :

- **La ventilation est juste dans les deux modèles fiscaux.** Un modèle à taux unique produit
  simplement une ventilation **à une ligne**. Elle ne présume donc de rien, et elle survit à un
  changement d'avis du conseil fiscal — de même que la localisation de l'acheteur, qui est un
  **fait**, pas une conséquence du modèle retenu.
- **Un champ `vat_amount` scalaire unique aurait figé le défaut.** Le jour où l'on découvre qu'il
  faut ventiler — parce qu'un second marché s'ouvre, ou parce que le taux est celui de l'acheteur —
  il faut **reconstruire l'assiette de chaque ligne passée**, sur des versements déjà payés et des
  factures conservées dix ans. Ce n'est plus une migration, c'est une reconstitution comptable.
- **Et c'est exactement le champ que la fixture invitait à écrire.** `fixtures.js` produit un seul
  nombre, au taux de `billingMarkets[0]`, et il est plausible à l'euro près. C'est le piège
  « forme contre règle » dans sa forme la plus coûteuse : **la fixture fait autorité sur la règle,
  jamais sur la forme**, et ici la forme était le seul enjeu durable.

`studio-web` a trouvé la contradiction entre la fixture et l'écran des versements ; c'est cette
trouvaille qui a rendu la ventilation visible avant qu'il ne soit trop tard.

### 5.1 Ce que les deux sources disent, et pourquoi elles ne peuvent pas avoir raison ensemble

| Source | Affirmation |
|---|---|
| `fixtures.js` | `vat = round(gross × vatRate)` avec **un seul taux** (`billingMarkets[0]`), appliqué au **brut de billetterie**, et **retranché du net de l'artiste** |
| maquette des versements du studio | *« le taux applicable est celui du **pays de l'acheteur** »*, avec une **ventilation par marché** |

`studio-web` a trouvé la contradiction ; D4 ajoute que le multi-devise est **déclaré et jamais
exercé** — `fixtures.js` prend `billingMarkets[0]` pour toutes les dates et tous les versements.
Donc : **aucun écran n'a jamais affiché deux devises, aucune règle n'a jamais été éprouvée sur deux
taux.** Ce que `shared/` porte ici est une intention, pas une règle.

### 5.2 Les trois questions distinctes, qu'il faut séparer pour répondre

1. **Qui fournit la prestation au spectateur** — Arthome, ou l'artiste ?
2. **Quelle est l'assiette** — le billet, ou la commission de 12 % ?
3. **Qui est redevable** — la plateforme, ou l'artiste ?

Elles ne se répondent pas ensemble, et la formule de la fixture n'en tranche aucune.

### 5.3 Deux modèles cohérents, et un seul est compatible avec la conception

**Modèle A — Arthome agit en son nom propre (« commissionnaire »).**
Le spectateur contracte avec Arthome, qui est réputé recevoir puis fournir la prestation.
- Assiette : **le billet entier**.
- Taux : celui du **pays du spectateur**, pour une prestation culturelle à distance (l'assistance
  *virtuelle* à un événement culturel est taxée au lieu de consommation depuis le 1ᵉʳ janvier 2025).
- Redevable : **Arthome**.
- L'artiste fournit une prestation **à Arthome**, facturée par auto-facturation.

**Modèle B — Arthome agit comme intermédiaire transparent.**
Le spectateur contracte avec l'artiste ; Arthome ne facture que son service.
- Assiette : **la commission de 12 %** seulement ; l'artiste doit la TVA sur le billet.
- Redevable de la TVA sur le billet : **l'artiste**.

**La conception impose le modèle A, et l'impose clairement.** Six indices convergents :
Arthome affiche le prix, encaisse, émet la facture, tient la politique d'annulation (« jusqu'à 1 h
avant »), exécute le remboursement et émet l'avoir. Le spectateur ne contracte jamais avec
l'artiste, ne voit jamais son nom sur un moyen de paiement, et ne s'adresse jamais à lui pour un
remboursement. **Ce sont les marques d'un commissionnaire, pas d'un intermédiaire transparent.**

**Et le droit l'impose aussi — ce n'est donc pas un choix de commodité, c'est la seule lecture
cohérente des faits.** Trois juridictions, vérifiées, et elles convergent :

| | Ce qui s'applique |
|---|---|
| **Union européenne** | l'**article 28** attrape **sur les faits**, pas sur la rédaction du contrat. Une plateforme qui affiche le prix, encaisse, facture et rembourse est réputée recevoir puis fournir la prestation, quoi qu'elle écrive dans ses conditions |
| **États-Unis** | les lois ***marketplace facilitator*** obligent la plateforme à **collecter et reverser** dans **46 États plus le district de Columbia**, **quelle que soit sa position contractuelle**. Le modèle B n'y est pas une option : il est inapplicable |
| **Royaume-Uni** | HMRC **n'a pas aligné** ses règles sur celles de l'UE : le fournisseur y est taxé **par établissement**. C'est la juridiction où les deux modèles divergent le plus, et où il faudra un avis |

Et le montage est exactement celui qu'une plateforme comparable décrit dans un document déposé
auprès d'un régulateur : le formulaire **10-Q d'Eventbrite** (SEC) énonce que *« the Company is the
merchant of record… remitting these amounts collected, less the Company's fees, to the event
creator »*. Ce n'est pas une autorité juridique, mais c'est la preuve que le montage est **courant
et assumé publiquement** par un acteur du même métier.

**L'avertissement en tête du document reste entier.** « La seule lecture cohérente des faits » n'est
pas « validé » : le statut d'assujetti d'Arthome, celui des artistes, les seuils et le guichet
unique restent à instruire par un conseil. Ce qui change, c'est qu'on ne choisit plus entre deux
modèles — **on constate lequel s'applique**, et on l'écrit.

### 5.4 La recommandation, et la formule

```
gross_ttc     le prix affiché au spectateur — TTC, convention B2C
vat[]         UNE LIGNE PAR MARCHÉ : { market, rate, base, amount }
              taux = celui du pays du SPECTATEUR ; redevable = Arthome
gross_ht      = gross_ttc − Σ vat.amount
commission    = roundMinor(gross_ht × 0,12)        ← ASSIETTE HT, pas TTC
net           = gross_ht − commission
```

**Pourquoi la commission porte sur le HT et non sur le TTC.** Sur le TTC, la rémunération de la
plateforme **varierait avec le pays de l'acheteur** — 12 % d'un billet vendu en Suisse ne serait
pas la même chose que 12 % du même billet vendu en France. Une commission est le prix d'un
service ; elle n'a aucune raison de suivre un taux de TVA étranger. Sur le HT, les 12 % annoncés
aux artistes sont **les mêmes partout**, ce qui est la seule promesse tenable.

**Écart avec la fixture, assumé et documenté** : la fixture calcule sur le TTC et applique un taux
unique. Les deux sont corrigés au portage (palier 1), et le test de non-régression correspondant
est l'un de ceux que le README cite comme « les règles qui font mal ».

### 5.5 L'arbitrage rendu, et la réserve qui l'accompagne

**Le modèle A est acté par D-015**, avec la commission sur le HT, sur les six indices convergents
du §5.3. La forme, elle, est gravée et ne dépend pas de l'issue de la validation juridique — §5.0.

> **Mais le modèle A reste une recommandation d'architecture, pas un avis fiscal.**
> Qui doit la TVA, sur quelle assiette et qui en est redevable sont des questions de droit, et
> elles dépendent du statut réel d'Arthome (assujetti ou non, seuils, pays d'établissement), du
> statut des artistes (assujettis ou non, français ou non) et du guichet unique pour les ventes
> hors France. **Elles doivent être validées par un conseil avant tout encaissement réel.**

**Multi-devise (D4, `studio-web` Q10)** : le solde d'une chaîne est présenté **dans la devise de
son compte connecté**, et une chaîne qui vend dans deux devises a **deux soldes**, jamais un solde
converti. Motif : convertir, c'est introduire un taux de change, donc une date de change, donc un
écart de réconciliation qu'on ne saurait pas expliquer. Stripe tient un solde par devise ; on le
reflète, on ne l'agrège pas.

### 5.6 La devise d'affichage est retirée au palier 1 (D-016)

`storefront-web` Q29 demandait si la devise d'affichage choisie par le spectateur et la devise de
facturation d'une date peuvent différer. **Elles le peuvent en théorie, et le contrat ne les
confond pas** — mais la préférence **disparaît des écrans au palier 1**.

**Motif** : afficher un prix converti qu'on ne peut pas débiter est un mensonge, et D4 a montré
qu'**aucune règle n'a jamais été éprouvée sur deux taux** — trois marchés sont déclarés, un seul
est exercé par le générateur. Les prix s'affichent donc dans la **devise du marché de facturation
de la date**, formatés côté client selon la locale.

**Le retrait est réversible**, et voici exactement ce qu'il faudra écrire pour revenir dessus :

| À trancher | Pourquoi ça bloque aujourd'hui |
|---|---|
| **source du taux** | un taux inventé est un prix inventé |
| **date de change** | celui du jour de l'affichage, de la commande, ou du versement ? Les trois donnent trois montants |
| **arrondi** | à quelle unité, et dans quel sens — le spectateur ou la plateforme |
| **qui porte l'écart** | entre le converti affiché et le débité réel, quelqu'un paie la différence |

Tant que ces quatre lignes ne sont pas écrites, la préférence ne peut produire qu'un affichage
**indicatif** — et un prix indicatif sur une billetterie est le pire défaut possible, celui que
`storefront-web` nomme lui-même à propos des promotions.

---

## 6. L'avoir de compte — une monnaie interne, et sa conséquence comptable

`storefront-web` l'a relevé : l'avoir (`credited`) apparaît dans la copie — *« interrompue, avoirs
émis »* — et **nulle part ailleurs dans le dossier**. Ce n'est pas un détail : c'est un **passif**.

```
Credit  { account_id, channel_id, amount, origin: interrupted_date, expires_at: +12 mois }
```

**Le piège, et il faut l'écrire avant de le rencontrer.** Quand un spectateur paie avec un avoir,
Stripe reçoit **moins**. Mais l'artiste de la date achetée doit être payé **en entier** : il n'est
pour rien dans l'incident d'un autre spectacle. La plateforme finance donc cette part **sur ses
propres fonds**.

**La règle recommandée, qui borne le risque** : un avoir est **émis pour une issue
`interrupted`** et **redéployable sur la même chaîne seulement**. La retenue de versement déjà en
place sur cette chaîne couvre alors l'engagement : on retient ce qu'on devra re-verser. Un avoir
utilisable partout exigerait une provision de trésorerie qu'un projet solo ne tiendra pas.

La restriction est **réversible** (on peut l'élargir plus tard) ; l'ignorer ne l'est pas — on
découvrirait le trou à la première réconciliation.

---

## 7. Les webhooks : les règles de Kafka, appliquées à un système qu'on ne contrôle pas

Un webhook Stripe est un événement d'intégration dont on ne possède ni le producteur, ni l'ordre,
ni le nombre de livraisons. Les quatre disciplines sont donc les mêmes, plus une.

### 7.1 Signature

Vérification **sur le corps brut**, avant tout parsage — donc `rawBody: true` à la création de
l'application et un contrôleur qui lit le tampon, jamais l'objet déjà désérialisé. Un corps
reformaté invalide la signature. Tolérance d'horloge de 5 minutes ; au-delà, rejet.

### 7.2 Idempotence

`event.id` inséré dans `processed_stripe_event` **dans la transaction de l'écriture métier**, avec
`orIgnore().returning('id')` : aucune ligne rendue, on saute. Stripe rejoue jusqu'à trois jours.
C'est exactement la règle du consommateur idempotent, et elle ne change pas parce que le producteur
est externe.

### 7.3 Livraison désordonnée

**Stripe ne garantit aucun ordre.** `payment_intent.succeeded` peut arriver après
`charge.refunded`. Deux disciplines :

1. **Le webhook écrit un fait, il ne décide jamais.** Il enregistre « Stripe dit que l'intention X
   est dans l'état Y à l'instant T », et le domaine réagit.
2. **Une transition n'est appliquée que si elle avance.** Chaque état Stripe porte un rang ;
   un événement dont le rang est inférieur à l'état courant est journalisé et **ignoré**. Quand le
   doute subsiste, on **relit l'objet chez Stripe** plutôt que de croire la charge utile — c'est
   d'ailleurs ce que Stripe recommande, et c'est la seule façon d'être juste sur un désordre.

### 7.4 Rejeu et échecs

Un webhook non traitable **n'est jamais acquitté en silence** : réponse 2xx (pour que Stripe
arrête de rejouer) **et** ligne dans une DLQ applicative avec la charge utile brute, plus une
alerte. Répondre 5xx pendant une heure fait basculer l'endpoint en échec chez Stripe, et on perd
tout le reste.

### 7.5 La cinquième discipline, propre à un système externe

**La réconciliation est la seule vérité.** On ne reconstruit jamais le grand livre de Stripe :
une tâche quotidienne lit `balance_transactions` et **compare** à `payout_ledger`. Tout écart
produit `payouts.reconciliation.discrepancy_found.v1`, routé vers le rôle `treasury`, et
**une période ne se clôt pas avec un écart non expliqué**.

C'est ce qui rend acceptable de ne pas être parfait sur les webhooks : un événement manqué se voit
à la réconciliation du lendemain, pas six mois plus tard.

---

## 8. Les états de commande face aux états Stripe

| Notre état | Déclencheur | État Stripe correspondant |
|---|---|---|
| `pending` | commande créée, intention créée | `requires_payment_method` · `requires_confirmation` |
| `awaiting_action` | 3-D Secure en cours | `requires_action` |
| `processing` | confirmée, en cours | `processing` |
| **`paid`** | **`payment_intent.succeeded` reçu et vérifié** | `succeeded` |
| `failed` | échec définitif | `canceled` · dernier `last_payment_error` |
| `refunded` / `partially_refunded` | remboursement confirmé | `charge.refunded` |
| `disputed` | litige bancaire ouvert | `charge.dispute.created` |

**Trois règles qui ne se négocient pas :**

1. **Notre état n'avance jamais sur un retour de navigateur.** `studio-mobile` le formule
   parfaitement, et cela vaut pour le spectateur : *« un paiement confirmé par un paramètre d'URL
   est un paiement confirmé par le client »*. Le retour dit **où** aller ; le backend dit **ce qui
   a changé**.
2. **La place est créée à `paid`, jamais avant.** Entre `pending` et `paid`, la jauge porte un
   **`SeatHold`** qui décrémente `seats_available` : sans lui, deux spectateurs achètent la
   dernière place ; sans expiration, un panier abandonné gèle une place pour toujours.
   **Et le hold n'a pas de durée à lui : il expire à l'instant exact où expire l'intention d'achat
   qui l'a créé** — 15 min pour un paiement web ou mobile, **5 min pour un appairage TV**, celle
   de l'appairage. C'est ce qui empêche la jauge affichée sur un téléviseur d'être fausse pendant
   toute l'attente du téléphone (`data-model.md` §3.2).
3. **Le prix est vérifié à la confirmation**, pas seulement à l'affichage. Refus `PRICE_STALE`,
   **distinct** de l'échec de paiement, avec le prix courant en paramètre. Avec cinq motifs de
   promotion dont un calculé au prorata du temps écoulé, l'écart entre le prix affiché et le prix
   valide est **structurel**.

---

## 9. Les cas d'issue, et ce que le spectateur retrouve

Une issue déclarée dans le studio (`catalog.date.outcome_declared.v1`) produit quatre conséquences
sans qu'aucun service n'en appelle un autre.

| Issue | Argent | Versement | Ce que le spectateur voit, et où |
|---|---|---|---|
| **`cancelled`** | **remboursement intégral** vers le moyen d'origine | `refunded` | montant + **code de délai** dans « Mes places » — jamais la phrase « 3 à 5 jours ouvrés », qui est une politique |
| **`postponed`** | **aucun mouvement** | `held` jusqu'à la nouvelle date | « place valable, aucune démarche », la place suit, le rappel se déplace |
| **`interrupted`** | **avoir** sur le compte (§6) | `held` puis ajusté | montant de l'avoir, et où l'utiliser |
| annulation par le spectateur | remboursement si avant l'échéance servie | déduit du brut | échéance servie comme un **instant** |
| litige bancaire | fonds retenus par Stripe | `held` | rien côté spectateur ; le studio répond depuis l'écran `payouts`, sous 24 h |

**Le remboursement rembourse aussi la commission.** Un remboursement intégral rend
`refund_application_fee: true` : nous ne gardons pas 12 % d'un spectacle qui n'a pas eu lieu. Ce
n'est pas seulement décent, c'est ce que la copie promet.

**La suppression de compte est une commande financière** (`storefront-web` Q26) : elle annule les
places non utilisées, donc elle rembourse, donc elle touche des versements peut-être déjà calculés,
et elle se heurte à la conservation comptable de dix ans. Elle est **asynchrone, avec un délai de
grâce de 30 jours**, et elle **anonymise** au lieu de supprimer. Le déroulé complet est dans
`data-model.md` §7.5.

---

## 10. Ce que je ne construis pas, et pourquoi

Pour la section « ce que je n'ai délibérément pas construit » que le README réclame :

- **aucune facturation de TVA transfrontalière réelle** : le guichet unique, les seuils et les
  déclarations sont du travail de comptable, pas d'architecte. La **forme** les accueille ;
- **aucun paiement différé, aucun échelonnement, aucun portefeuille** ;
- **aucun modèle de commande mixte** places + marchandise (D-011) : aucune maquette ne la montre,
  et la graver serait mettre au contrat une intention que rien n'a éprouvée ;
- **aucune reconstruction du grand livre Stripe** : c'est un choix, pas un manque. On réconcilie.

---

## 11. Les arbitrages, rendus

Tous tranchés le 21 septembre 2026. **Rien ne reste ouvert dans ce document, sauf la validation
juridique du §5 — qui n'est pas un arbitrage de projet.**

| Point | Décision | Référence |
|---|---|---|
| Modèle fiscal, commission sur le HT | **modèle commissionnaire**, acté — et **la seule lecture cohérente des faits**, pas un choix de commodité (§5.3) | **D-015** |
| `on_behalf_of` | **retiré** : il ferait de l'artiste le marchand d'enregistrement, en contradiction avec le modèle (§3) | — |
| Clé de la ventilation de TVA | **la juridiction**, pas le marché ; localisation d'acheteur avec preuves (§5.0) | — |
| Devise d'affichage | **retirée au palier 1**, réversible (§5.6) | **D-016** |
| Portée de l'avoir | **la chaîne émettrice** — borne l'engagement de trésorerie | **D-017** |
| Commande de marchandise | **mono-vendeur**, le panier se scinde au paiement | **D-017** |
| Remise et promotion | **pas de cumul** : la plus favorable au spectateur | **D-017** |
| Troisième canal de notification | **`in_app`**, pas `sms` | **D-017** |
| Frais de service | **par place**, barème servi — jamais une constante d'écran | ce document, `data-model.md` §3.1 |
