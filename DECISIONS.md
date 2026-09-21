# Journal des arbitrages

> Les décisions rendues par le chef d'orchestre au fil de la session, avec leur raison.
> Une décision qui n'est pas ici n'a pas été rendue.

---

## Phase 0 — 21 septembre 2026

### D-001 — Orchestrateur si existant, sinon skills spécialisées au cas par cas

**La règle, posée par le chef de projet.** Chaque coéquipier charge **l'orchestrateur de sa
technologie avant de décider ou d'écrire quoi que ce soit**. Quand il n'en existe pas, il charge
**les skills spécialisées au cas par cas**, en justifiant son choix.

C'est une règle générale, pas une exception : elle vaudra pour toute pile future dont la banque de
skills n'a pas de porte d'entrée.

**Application aux huit coéquipiers.**

| Coéquipier | Orchestrateur | État |
|---|---|---|
| `storefront-web` | `nextjs-how-to` | existe |
| `studio-web` | `angular-how-to` | existe |
| `studio-mobile` | `ionic-capacitor-how-to` + `angular-how-to` | existent |
| `backend-domain`, `backend-contracts`, `auth` | `nestjs-how-to` | existe |
| `storefront-mobile`, `storefront-tv` | selon la pile — voir ci-dessous | **conditionnel** |

**Le cas des deux surfaces React Native.** Le prompt de mission prévoyait `react-how-to`. Il est
bien installé, mais s'exclut lui-même de React Native : « Router for React 19 **on the web — no
Next, no React Native** […] Not for Next.js (→ nextjs-how-to), Expo or React Native
(→ expo-overview) ». La porte suivante, `expo-overview`, pose sa propre condition : « a bare
React Native project with no `expo` dependency is not Expo work ».

Inventaire de la banque, vérifié :

| Famille | Skills installées | Orchestrateur |
|---|---|---|
| React web | 6 | `react-how-to` |
| Expo / EAS | 26 | `expo-overview` |
| **React Native nu** | **8** | **aucun** |

Donc : en **Expo** (y compris Expo TV), `expo-overview` s'applique et la règle joue normalement.
En **React Native nu**, aucun orchestrateur n'existe et on passe au cas par cas. Le choix Expo /
RN nu **n'est pas fait** et sort du périmètre de cette session.

**Les skills retenues pour le temps 1, au cas par cas.** L'essentiel de la banque React Native
traite de *construire et livrer* ; au temps 1 un spécialiste **exprime un besoin de données** et
n'écrit pas une ligne de code. Quatre skills seulement, chacune parce qu'elle pèse sur le contrat :

- `react-core` — sémantique React ;
- `react-native-tv-best-practices` — moteur de focus, UI à trois mètres, mémoire contrainte,
  lecture. Vise explicitement « react-native-tvos, Expo TV », donc valable dans les deux
  hypothèses de pile ;
- `react-native-best-practices` — virtualisation de listes et mémoire, qui commandent la
  pagination et le volume attendu ;
- `react-server-state` — fraîcheur, cache, invalidation : ce que le client attend du contrat en
  temps réel et hors ligne.

Écartées comme hors périmètre : tests, montées de version, brownfield, EAS, scaffolding de
bibliothèque.

**Resté ouvert, à trancher avant le palier mobile** : Expo ou React Native nu.

### D-002 — L'agent `backend` est scindé en deux

**Le constat.** Tel que prévu, un seul coéquipier produisait neuf livrables longs :
`context-map.md`, `data-model.md`, `events.md` avec `proto/`, `realtime.md`, deux OpenAPI,
`definition-of-done.md`, `critical-rules.md`, `adr-payments.md`, `adr-stream-entitlement.md`.
Point de défaillance unique, et risque réel de dégradation sur les derniers documents.

**La décision.** Deux coéquipiers qui se relaient sur le même palier :

- **`backend-domain`** — carte des contextes, modèle de données par service, catalogue
  d'événements et `proto/`, temps réel, persistance, plus les deux ADR (`adr-payments`,
  `adr-stream-entitlement`) ;
- **`backend-contracts`** — les deux OpenAPI de BFF, le contrat des appels synchrones
  BFF → service et le transport retenu, `definition-of-done.md`, `critical-rules.md`.

`backend-contracts` démarre en lisant ce que `backend-domain` a produit : l'ordre est imposé, les
contrats se déduisent du modèle et non l'inverse.

**Ce qui ne change pas.** Le périmètre total, la profondeur attendue, et la règle des deux régimes
de stabilité (`stable` pour `identity`, `catalog`, `ticketing` ; `provisoire` pour le reste).

### D-003 — Les cinq surfaces au premier tour

**Le contexte.** L'estimation de la phase 0 donne 2,3 à 3,3 millions de tokens d'agents et trois à
quatre sessions pour les cinq surfaces. Une coupe à trois surfaces (storefront web, studio web,
storefront TV) avait été recommandée par le chef, au motif que mobile et studio mobile sont des
variations de surfaces déjà couvertes et contesteraient la mise en page plutôt que la **forme**
des contrats.

**La décision du chef de projet : les cinq surfaces.** Aucune décision n'est retirée, aucun
contexte n'est laissé de côté.

**Cadence, arbitrée par le chef de projet : les cinq d'un coup.** Cinq coéquipiers en parallèle,
cinq panneaux tmux. Le temps 1 dure celui du plus lent. Une cadence en deux vagues avait été
proposée pour permettre une lecture précoce ; elle est écartée au profit de l'horloge.

### D-004 — Le dossier de passation est corrigé dans cette session

**Le contexte.** Le prompt de mission réservait la réécriture au palier 0, quand le dossier
entrerait dans `arthome-core` comme `docs/` : « pas dans cette session ». La phase 0 ne devait
produire que la liste des écarts.

**La décision du chef de projet : corriger maintenant.** Les cinq spécialistes de surface liront
donc un dossier juste, et non un dossier faux accompagné d'un errata.

**Le périmètre de la correction, arbitré par le chef.** Les **documents** du dossier sont corrigés
(`README.md`, `Prompt - Storefront TV.md`, `PROMPT.md`) — familles A, B et C de
`architecture/corrections-handoff.md`. **`shared/` n'est pas touché** : le prompt le déclare en
lecture seule, et c'est la source que les spécialistes vont lire. Les sept écarts de données
(famille D) restent la liste de courses du portage au palier 1.

**Réversibilité.** `~/Dev/arthome-design` n'est pas un dépôt git. Les originaux ont été copiés en
`*.pre-corrections.md` à côté des documents corrigés, avant toute modification.

### D-005 — `corrections-handoff.md` est écrit avant le temps 1

**La décision.** Le dépôt `arthome-core` est créé (`git init`, aucun remote, aucun push) et la
liste des vingt-sept écarts y est écrite immédiatement. Elle sert trois fois : livrable de la
phase 0, source des corrections apportées au dossier, et liste de courses du portage au palier 1.

**Ce qui n'est pas créé.** Rien d'autre. Pas de `package.json`, pas de TypeScript, pas de
`proto/` ni d'`openapi/` peuplés — seulement les dossiers vides que la structure attend.

### D-006 — Couverture exhaustive, rédaction dédupliquée

**Le constat.** Appliqué à la lettre, « chaque écran, sept dimensions » donne une centaine
d'écrans sur cinq surfaces, dont beaucoup répètent les mêmes données — la section Compte du
storefront web et celle du mobile portent les mêmes onze sous-écrans et la même donnée.

**La décision.** **Couverture exhaustive, rédaction dédupliquée.** Chaque écran est énuméré, rien
n'est oublié. Mais les sept dimensions ne sont rédigées en entier que là où l'écran introduit une
**forme de donnée**, une **commande**, un **besoin temps réel** ou une **contrainte de surface**
nouvelle. Ailleurs, un renvoi d'une ligne vers l'écran qui l'a déjà décrite.

**Pourquoi.** Ce qui fait un contrat, c'est l'ensemble des formes et des commandes — pas
l'énumération. Et l'énumération reste nécessaire pour que le temps 3 puisse contester : « cet
écran n'est pas servi » exige que l'écran ait été nommé.

### D-007 — La contestation du temps 3 reste dans le fichier de sa surface

**Le constat.** Le prompt prévoit que les cinq spécialistes contestent l'offre au temps 3, mais
sa liste de livrables ne connaît que `needs/<surface>.md`. La contestation n'avait pas de
destination.

**La décision.** Chaque spécialiste ajoute une section **« Confrontation »** à son propre
`needs/<surface>.md`. Il en reste **seul auteur**, et le fichier porte l'histoire complète d'une
surface : ce qu'elle demandait, ce qu'on lui a répondu, ce qu'elle conteste. Les arbitrages rendus
par le chef vont dans ce journal.

**Écarté** : une synthèse unique écrite par le chef. Elle ferait du chef le filtre de ce qui
remonte, et c'est précisément ce qu'un temps de confrontation existe pour éviter.

### D-008 — Un commit à chaque point d'arrêt

**La décision.** `arthome-core` est committé à la fin de la phase 0, puis à la fin de chacun des
trois temps. Messages en anglais. **Aucun remote, aucun push, jamais** — conforme au prompt.

**Pourquoi.** Huit agents écrivent dans ce dépôt sur trois à quatre sessions. Les commits donnent
la récupérabilité si deux agents se marchent dessus, et rendent lisible ce que chaque temps a
produit.

### D-009 — Cette session définit des contrats, elle ne conçoit pas d'écrans

**Le rappel, posé par le chef de projet.** L'objet de cette session est de définir **les contrats
d'interface, l'architecture backend et l'authentification**. Pas de réaliser les écrans, ni de les
décrire.

**Le risque réel.** Cinq agents qui lisent des maquettes haute fidélité écran par écran dérivent
naturellement vers la description d'interface : mise en page, composants, jetons, animations,
ordre de focus. Ce travail est déjà fait — les maquettes *sont* la conception — et le refaire en
prose produirait cinq documents longs et inutiles au contrat.

**Le test, à recopier dans le prompt de chaque coéquipier.** Une observation entre dans
`needs/<surface>.md` **seulement si elle change ce que le contrat doit porter ou garantir**.

| N'entre pas | Entre |
|---|---|
| « la carte fait 320 × 180, rayon 4 px » | « la carte affiche un compteur de spectateurs qui doit être temps réel à moins de N secondes » |
| « le focus passe à l'échelle 1,08 » | « la TV n'accepte aucune saisie au-delà de six caractères : le paiement doit être un appairage d'appareil » |
| « les squelettes de chargement utilisent l'animation `skel` » | « cet écran doit distinguer *votre connexion* de *nos serveurs* : l'enveloppe d'erreur doit porter cette distinction » |
| « le tchat est un panneau latéral de 420 px » | « un message de tchat porte sa position dans le média, pas son heure d'envoi » |

Formulé autrement : le spécialiste de surface **exprime un besoin**, il ne décrit pas une
solution d'interface. S'il se surprend à écrire un pixel, une couleur ou un nom de composant,
c'est qu'il est sorti du périmètre.

**Ce qui reste légitime** : les contraintes propres à la surface, quand elles contraignent le
contrat — la TV et ses cinq touches, Capacitor et ses liens profonds, Next et le rendu serveur qui
fait de la session son affaire, React Native et son cycle de vie.

---

## Temps 1 — 21 septembre 2026

### D-010 — La pagination reste choisie par le motif d'interface, avec deux exceptions nommées

**La décision d'origine, confirmée.** Storefront = **curseur** (défilement infini, plus fluide
pour le spectateur) ; studio = **page + total** (on épingle une page et on l'envoie à un
collègue). La raison est une affordance d'interface, pas une propriété de la donnée.

**Ce que la recherche a confirmé.** Le cadre que l'industrie recommande est exactement celui-là :
choisir d'abord selon le **motif d'interface**, ensuite selon la donnée, enfin selon le cache.
Curseur pour les flux et le défilement infini ; décalage pour les tableaux de back-office où l'on
veut des numéros de page et des signets. Slack n'a migré d'offset vers curseur que lorsque ses
volumes ont explosé. Et le compromis est précisément celui qui a été pesé : le curseur ne donne
**ni total ni saut de page**, ce que la littérature signale comme problématique pour un
back-office. Épingler et partager une page, c'est `?page=3`.

**Correction d'une erreur du chef.** Le chef avait annoncé « quatre agents contestent cette
décision par quatre chemins ». Relecture faite, **deux seulement** portent sur curseur contre
décalage :

| Agent | Objection | Porte-t-elle sur le mécanisme ? |
|---|---|---|
| `studio-web`, `studio-mobile` | file de modération et tchat grossissent pendant la lecture | **oui** |
| `storefront-web` | la recherche regroupe les dates sous une carte de spectacle | non — c'est l'**unité** paginée |
| `storefront-mobile` | un curseur doit survivre à une nuit | non — c'est la **durée de vie** du curseur |

Quatre objections avaient été rangées sous une étiquette qui n'en couvrait que deux.

**Les deux exceptions, et pas une de plus.** La **file de modération** et le **tchat en direct**
passent au curseur. Motif : ce sont des flux, pas des tableaux, même hébergés dans le studio — une
pagination par décalage y duplique et y saute mécaniquement, puisque des lignes s'insèrent pendant
la lecture. La règle reste « selon le motif d'interface » ; ces deux collections ont le motif d'un
flux.

**Le journal reste en page + total.** `studio-web` le demandait au curseur, pour cause de décalage
profond sur 24 mois de conservation. Écarté : personne ne pagine jusqu'au 50 000ᵉ élément d'un
journal, on filtre par période d'abord. **Décalage + filtre de période obligatoire** garde les
numéros de page — donc l'affordance voulue — et reste rapide. Passer au curseur échangerait un
problème qu'on n'a pas contre la perte de ce qu'on voulait.

**Deux sujets orthogonaux, renvoyés au backend comme questions** et non tranchés ici :
l'**unité** de pagination de la recherche (spectacles ou dates), et la **durée de vie d'un
curseur**, avec un code explicite « trop ancien, recharge tout ».

**Une pratique confirmée**, qui rejoint une décision déjà prise : Stripe, GitHub et Slack encodent
le curseur en **Base64 opaque** sur une clé de tri composite (`created_at` + identifiant). C'est
le « tri déterministe avec départage par identifiant » déjà acté.

### D-011 — Deux commandes distinctes : places et marchandise

**Le constat.** Le chef avait donné aux spécialistes une instruction fausse — un panier portant
« places **et** marchandise ». `storefront-web` a vérifié plutôt que de le croire :
`ticketing.cart.head` et `.title` valent « Panier merch », l'état vide dit « Le merch s'ajoute
depuis la boutique d'un live », et l'achat d'une place est un parcours séparé en modale.

**La décision.** Le contrat porte **deux commandes distinctes**. C'est ce que la conception montre
réellement sur les trois storefronts, et les deux n'ont ni les mêmes garanties (une place a une
jauge, un code, une fenêtre d'annulation), ni le même prestataire d'expédition, ni le même
destinataire de versement.

**Écarté** : la commande mixte. Elle est sans doute inévitable un jour — acheter une place et le
t-shirt du spectacle en un paiement — mais **aucune maquette ne la montre**. La graver maintenant
reviendrait à mettre dans le contrat une intention que rien n'a éprouvée, ce que la mission
interdit explicitement.

**À relier** : les commandes externes (E14) et la boutique (C8) attendent toujours un contexte
propriétaire.

### D-012 — `@arthome/contracts` expose une entrée sans barillet

**Les mesures.** Deux agents ont mesuré indépendamment, et convergent :

| Entrée | `storefront-mobile` | `storefront-tv` |
|---|---|---|
| `zod` classique | 93 Ko gzip | 92 Ko gzip |
| `zod/mini` élagué | 7,5 Ko | 7,7 Ko |

**La cause, identifiée par `storefront-mobile`** : l'entrée classique rend joignables **64 fichiers
de traduction** des messages d'erreur (341 Ko de source), poids mort intégral pour un projet en
**i18n par codes** — qui interdit de toute façon d'afficher un message de bibliothèque.
`storefront-tv` ajoute que le coût est **fixe, pas marginal** : 267 octets d'écart entre un schéma
trivial et un schéma de vingt champs. On ne peut donc pas s'en tirer en limitant le nombre de
schémas sur les surfaces contraintes ; le coupable est l'espace de noms `z`, un import barillet.

**La décision.** `@arthome/contracts` **expose une entrée sans fichier baril**, et c'est une
exigence de `definition-of-done.md`. Aucun des deux agents ne rouvre la décision zod elle-même, et
elle n'est pas rouverte.

**Réserve consignée** : les deux mesures portent sur un schéma isolé compilé par esbuild, pas sur
un bundle applicatif réel, et le gain de `zod/mini` est **conditionnel à un élagage que
l'empaqueteur React Native n'active pas par défaut**. À revérifier sur un vrai bundle au palier
mobile. La concordance des deux mesures à 1 Ko près rend l'ordre de grandeur sûr.
