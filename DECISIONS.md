# Journal des arbitrages

> Les décisions rendues par le chef d'orchestre au fil de la session, avec leur raison.
> Une décision qui n'est pas ici n'a pas été rendue.

---

## Phase 0 — 21 septembre 2026

### D-001 — Les deux surfaces React Native n'ont pas d'orchestrateur

**Le constat.** Le prompt de mission prévoit `react-how-to` pour `storefront-mobile` et
`storefront-tv`. Vérification faite, ça ne peut pas fonctionner : `react-how-to` s'exclut
explicitement de React Native (« Not for Next.js, Expo or React Native ») et renvoie vers
`expo-overview` — qui à son tour refuse les projets React Native nus (« a bare React Native
project with no `expo` dependency is not Expo work »). Avec `react-native-tvos`, le projet sera
très probablement en RN nu.

**La décision.** Pour ces deux surfaces seulement, pas d'orchestrateur. Chargement explicite de
`react-core` (sémantique React), `react-native-best-practices`, `react-navigation`, et pour la TV
`react-native-tv-best-practices` — qui couvre le moteur de focus, la croix directionnelle, l'UI à
trois mètres et la lecture sur matériel contraint.

**La règle qui reste.** « L'orchestrateur d'abord, la skill spécialisée ensuite, la décision en
dernier » s'applique partout ailleurs sans exception. Ici l'orchestrateur n'existe pas ; ce n'est
pas une dispense, c'est un manque, et il est consigné comme tel.

**Resté ouvert.** Expo ou React Native nu pour les deux applications mobiles : hors périmètre de
cette session, mais le choix déterminera rétroactivement quel orchestrateur s'applique.

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
