# ADR — Encaissement, commission, TVA, versements

**Statut** : accepté pour la *forme*, **ouvert sur le fond fiscal** (§5).
**Date** : 21 septembre 2026. **Auteur** : `backend-domain`.
**Portée** : `ticketing` (encaisse), `payouts` (calcule le droit), Stripe Connect en **mode test**.

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

---

## 3. Le modèle Stripe Connect retenu

**Décision : `destination charges` sur le compte plateforme, avec `on_behalf_of` et
`application_fee_amount`. Comptes connectés en Express.**

```
PaymentIntent
  ├─ créé sur le compte PLATEFORME               (nous sommes le marchand d'enregistrement)
  ├─ on_behalf_of        = acct_<chaîne>          (règlement, devise et rattachement fiscal)
  ├─ transfer_data.destination = acct_<chaîne>    (le net part vers l'artiste)
  └─ application_fee_amount   = commission + TVA due par la plateforme
```

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

## 5. La TVA — la question que D5 laisse ouverte, instruite et non supposée

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

### 5.5 Ce que je remonte au chef, et ce qui ne peut pas être décidé ici

> **Le modèle A est une recommandation d'architecture, pas un avis fiscal.**
> Qui doit la TVA, sur quelle assiette et qui en est redevable sont des questions de droit, et
> elles dépendent du statut réel d'Arthome (assujetti ou non, seuils, pays d'établissement), du
> statut des artistes (assujettis ou non, français ou non) et du guichet unique pour les ventes
> hors France. **Elles doivent être validées par un conseil avant tout encaissement réel.**

Ce qui est **sûr et non réversible**, et que je grave donc maintenant : **la forme porte une
ventilation par marché**, chaque ligne avec son assiette, son taux et son montant. Elle est juste
dans les deux modèles — un modèle à taux unique produit une ventilation à une ligne — et elle
réconcilie l'écran du studio avec la donnée. **Un champ `vat_amount` scalaire unique aurait été le
vrai choix irréversible**, et c'est celui que la fixture invitait à faire.

**Multi-devise (D4, `studio-web` Q10)** : le solde d'une chaîne est présenté **dans la devise de
son compte connecté**, et une chaîne qui vend dans deux devises a **deux soldes**, jamais un solde
converti. Motif : convertir, c'est introduire un taux de change, donc une date de change, donc un
écart de réconciliation qu'on ne saurait pas expliquer. Stripe tient un solde par devise ; on le
reflète, on ne l'agrège pas.

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
2. **La place est créée à `paid`, jamais avant.** Entre `pending` et `paid`, la jauge porte une
   **réservation à durée de vie** (15 min) qui décrémente `seats_available` : sans elle, deux
   spectateurs achètent la dernière place ; avec une réservation sans expiration, un panier
   abandonné gèle une place pour toujours.
3. **Le prix est vérifié à la confirmation**, pas seulement à l'affichage. Refus `PRICE_STALE`,
   **distinct** de l'échec de paiement, avec le prix courant en paramètre. Avec cinq motifs de
   promotion dont un calculé au prorata du temps écoulé, l'écart entre le prix affiché et le prix
   valide est **structurel**.

---

## 9. Les cas d'issue, et ce que le spectateur retrouve

Une issue déclarée dans le studio (`catalog.date_outcome_declared.v1`) produit quatre conséquences
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

## 11. Ce qui reste à trancher par le chef

1. **Le modèle fiscal (§5.5)** — le A est recommandé et argumenté, il n'est pas validé.
   **C'est l'arbitrage principal que je remonte.**
2. **La portée de l'avoir (§6)** — « même chaîne » est recommandé pour borner l'engagement de
   trésorerie. Élargir est possible, mais il faut alors dire qui provisionne.
3. **Les frais de service** (`storefront-web` Q11) — j'ai posé **par place**, et le barème est
   servi par le contrat. Il faut un barème, pas une constante d'écran.
4. **Le cumul remise d'abonnement / promotion** (`storefront-web` Q12) — j'ai posé **la plus
   favorable au spectateur, jamais le cumul**. C'est la règle la plus simple à expliquer et la
   seule qui ne produise pas de prix négatif sur une avant-première à tarif de découverte.
