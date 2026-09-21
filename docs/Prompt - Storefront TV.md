# Prompt — Storefront TV (Arthome)

> **Corrigé le 21 septembre 2026.** Deux erreurs de vocabulaire de taxonomie ont
> été rectifiées (le compte des disciplines, et l'emploi de « ballet » et
> « concerts » comme disciplines). Détail dans
> `arthome-core/architecture/corrections-handoff.md`, famille B ; version
> d'origine conservée sous `Prompt - Storefront TV.pre-corrections.md`.

## Contexte global du projet

Arthome est une plateforme de diffusion en direct de spectacle vivant : théâtre, danse, cirque, humour, opéra, comédie musicale, performance, et toutes les disciplines musicales — du rock au classique en passant par le jazz, le rap et les musiques du monde. Billetterie intégrée, boutique de merch, tchat, rediffusions. Les surfaces existantes :

- **Storefront Web** (`Storefront Web.dc.html`) — le site public, desktop, 1440 px
- **Storefront Mobile** (`Storefront Mobile.dc.html`) — le même, adapté mobile, 430 px
- **Studio** (`Studio.dc.html`) — la régie professionnelle, desktop
- **Studio Mobile** (`Studio Mobile.dc.html`) — la régie, 430 px

À créer : **Storefront TV** (`Storefront TV.dc.html`) — l'application de salon, pour téléviseurs connectés, box opérateur, consoles et clés HDMI. C'est la même plateforme, le même compte, le même catalogue — pilotée à la télécommande, à trois mètres de l'écran, souvent à plusieurs dans la pièce.

Le storefront et le studio restent deux produits séparés : **le studio n'existe pas sur TV**. Aucune régie, aucune modération, aucun versement. La TV est une surface de spectateur, rien d'autre.

---

## Direction visuelle — hériter du storefront, pas du studio

Le storefront est chaleureux et éditorial ; le studio est un outil de travail. La TV suit le **storefront**, amplifié : plus de noir, plus de photo, moins de texte.

### Palette exacte (reprise du storefront)

- Fond profond `#0B0A09`, panneaux `#100F0D`, `#17140F`, `#1A1815`
- Surfaces relevées `#1F1C19`, `#221F1B`, `#262320`
- Bordures `#2E2A24`, `#332E28`, `#4A423A`, `#575047`
- Encre principale `#EDE7DC`, secondaire `#C9C0B2`, tertiaire `#9B948A`, atténuée `#857E73`, `#8B857C`, éteinte `#6B6459`
- **LIVE** `oklch(0.62 0.21 27)` — le rouge d'antenne, jamais utilisé pour autre chose
- **ACCENT** `oklch(0.78 0.13 42)` — l'ambre chaud des rappels et des rediffusions
- **OR** `oklch(0.9 0.07 84)` — les places détenues, les mentions de rareté
- **OK** `oklch(0.7 0.13 150)` — confirmations, place valide

Sur TV, le fond doit être **plus sombre que sur le web** : les dalles OLED tirent les gris vers le noir et la pièce est souvent obscure. Aucun blanc pur, aucun aplat au-dessus de `#EDE7DC`.

### Typographie

- **Instrument Serif** — titres de spectacle, noms d'artistes, accroches éditoriales. C'est la signature Arthome.
- **Archivo** — texte courant, boutons, descriptions.
- **JetBrains Mono** — heures, durées, prix, compteurs, codes, libellés de section (9→14 px sur web, **jamais moins de 18 px ici**).

**Échelle 10 pieds — plancher absolu :**

| Rôle | Taille |
|---|---|
| Titre de billboard | 72 → 96 px (Instrument Serif) |
| Titre de page | 48 → 56 px |
| Titre de carte | 26 → 30 px |
| Texte courant, synopsis | 26 px minimum, 28 px conseillé |
| Métadonnée mono | 18 px minimum, letter-spacing 0.12em |
| Libellé de bouton | 24 px minimum |

Aucun texte sous 18 px, jamais, même en mention légale. Une ligne de synopsis ne dépasse pas 68 caractères. Trois lignes maximum, puis coupe.

### Vocabulaire de formes

Le storefront a des angles doux ; la TV les garde : rayon 4 px sur les cartes et les boutons, cercles pour les avatars. Ombres portées franches sous les éléments focalisés uniquement. Pastilles d'état identiques au storefront : bordure 1 px à la couleur de l'état, texte à la même couleur, fond voilé à 14 % via `color-mix(in oklch, <couleur> 14%, transparent)`.

### Zone sûre (overscan)

Rien d'utile en dehors d'un cadre de **60 px** sur les quatre bords (5 % de 1920×1080). Les images de fond débordent volontiers jusqu'au bord, jamais le texte ni les cibles.

---

## Contraintes techniques

Design Component unique, `Storefront TV.dc.html`. Styles inline exclusivement — pas de classes, pas de feuille de style ; seuls `@font-face`, `@keyframes` et les resets sont admis dans `<helmet>`. `$preview` à **1920 × 1080**.

Aucun trou de valeur (`{{ }}`) pour du texte statique ou du style figé. Toute liste passe par `<sc-for>` avec `hint-placeholder-count`, toute condition par `<sc-if>` avec `hint-placeholder-val`.

Une seule source de vérité : chaque affichage dérive de la donnée, jamais d'un littéral parallèle. Cette règle a coûté une dizaine de corrections sur les autres surfaces — ne pas la rejouer.

---

## Le cœur du sujet : la télécommande

C'est ce qui sépare une vraie app TV d'un site affiché en grand. **Tout se pilote à cinq touches.**

### Moteur de focus

- Un et un seul élément focalisé à l'instant t, **toujours visible sans scroll**.
- Le focus se déplace en croix : ↑ ↓ ← →. Aucune diagonale, aucun saut arbitraire — la cible est le voisin géométrique le plus proche dans l'axe demandé.
- **OK / Entrée** active. **Retour / Échap / Backspace** remonte d'un niveau ; depuis l'accueil, Retour ne fait rien (ou propose de quitter).
- **Lecture/Pause** (Espace) agit partout où quelque chose est lisible, même sans ouvrir les contrôles.
- Aucun état accessible au survol seul : `:hover` n'existe pas sur TV. Tout ce que le web fait au survol se fait **au focus**.
- Aucun curseur, aucune barre de défilement visible.

### Expression visuelle du focus

Trois signaux simultanés, jamais un seul :

1. **Échelle** — la carte focalisée passe à 1,08, ses voisines restent à 1,0, transition 160 ms `cubic-bezier(.2,.7,.2,1)`.
2. **Cerne** — bordure 3 px `#EDE7DC` (ou LIVE si la carte est à l'antenne), plus une ombre `0 18px 48px rgba(0,0,0,.7)`.
3. **Révélation** — le titre et la métadonnée n'apparaissent en clair que sous la carte focalisée ; les autres restent en encre atténuée.

Le focus ne clignote pas, ne pulse pas. Seule la pastille d'antenne pulse (`pulseLive`, 1,6 s).

### Mémoire de focus

En revenant sur une page déjà visitée, le focus **retrouve la carte quittée**, et le carrousel sa position. C'est la différence entre une app qui se laisse traverser et une app qui punit.

### Défilement

- Vertical : la rangée focalisée se cale au même endroit de l'écran (« sticky row »), les autres glissent sous elle. Jamais de saut brutal.
- Horizontal : la carte focalisée reste à gauche de l'écran après les trois premières, avec un aperçu de la suivante qui dépasse du bord — le spectateur doit voir qu'il reste du contenu.
- Défilement animé sur 220 ms. Au maintien d'une touche, accélération et suppression de l'animation (sinon on décroche du doigt).

### Raccourcis à honorer

`↑ ↓ ← →` navigation · `OK` activer · `Retour` remonter · `Lecture/Pause` · `◀◀ ▶▶` reculer/avancer de 10 s, maintien = ×4 ·  `Rouge` ouvrir le tchat en direct · `Vert` sous-titres · `Jaune` qualité et pistes · `Bleu` informations sur la date. Une aide des touches s'ouvre par un appui long sur OK et se referme par Retour.

**Sur mobile et desktop, ces raccourcis n'ont pas lieu d'être : ici, ils sont l'interface.**

---

## Structure de l'application

### Barre latérale gauche, repliée par défaut

72 px de large, icônes seules. Quand le focus y entre (par ←), elle s'étend à 320 px en 180 ms et révèle les libellés, avec un voile dégradé sur le contenu à droite. Entrées : Rechercher, Accueil, En direct, Catégories, Artistes, Mes places, Ma liste, Rediffusions, Abonnements, Compte. Aucun sous-menu : un niveau, dix entrées maximum.

L'avatar du profil est en haut de la barre, la roue crantée du compte en bas — mêmes conventions que les autres surfaces.

### Pages

`home` · `search` · `live` (le direct, page dédiée) · `categories` · `category` · `artists` · `artist` · `title` (fiche d'une date ou d'un spectacle) · `player` (lecteur plein écran) · `tickets` (mes places) · `list` (ma liste) · `replays` · `plans` · `account` · `help`

Le lecteur est une page à part entière, pas une modale : elle prend tout l'écran et Retour en sort.

---

## Écran par écran

### 1. Accueil

**Billboard** en haut, plein cadre, hauteur 62 % de l'écran : image du spectacle en fond, dégradé `linear-gradient(90deg, #0B0A09 0%, rgba(11,10,9,.82) 42%, transparent 78%)` vers la droite et un second vers le bas. Dessus :

- Kicker mono — `EN DIRECT DANS 42 MIN` / `À L'ANTENNE` / `NOUVEAU` / `DERNIÈRES PLACES`
- Titre en Instrument Serif 88 px
- Ligne de métadonnée : discipline · durée · salle · fuseau du spectateur
- Trois lignes de synopsis maximum
- Deux à trois boutons : **Regarder** / **Réserver une place** / **Plus d'informations**, plus une icône « + Ma liste »
- Si la date est à l'antenne : pastille LIVE clignotante et compteur de spectateurs

Après 4 secondes sans interaction, le billboard lance un **aperçu vidéo muet** (extrait ou captation d'archive) qui se fond par-dessus l'image. Toute pression sur une touche l'interrompt. Réglage `autoplayPreview` pour le couper.

**Carrousels** ensuite, dans cet ordre :

1. **Reprendre** — ce qui a été commencé, avec la barre de progression et le temps restant
2. **À l'antenne en ce moment** — cartes 16/9 avec pastille rouge et compteur
3. **Vos places** — les dates achetées à venir, avec le compte à rebours ; la carte devient « Entrer dans la salle » 30 min avant le lever de rideau
4. **Ce soir sur Arthome** — la grille du jour, ordonnée par heure locale du spectateur
5. **Parce que vous suivez [artiste]** — recommandation nommée, jamais anonyme
6. **Rediffusions qui expirent bientôt** — avec la fenêtre restante en ambre
7. Deux à trois rangées par discipline

Chaque rangée porte son titre en Archivo 30 px et, à droite, un compteur mono discret. Cartes 16/9 de 320 × 180 px, sauf les rangées d'artistes (portraits ronds 160 px) et la rangée « affiches » (2/3 vertical, 240 × 360 px) — la variété de format est ce qui empêche l'écran de ressembler à un tableur.

### 2. Recherche

Clavier à l'écran **à gauche** (grille QWERTY ou AZERTY selon la langue), résultats en grille **à droite**, mis à jour à chaque lettre. Une recherche à la télécommande coûte cher : proposer d'emblée, sous le clavier, les recherches récentes et les disciplines, et une entrée « Rechercher à la voix » (bouton micro, état d'écoute animé). Aucun bouton « Valider » : les résultats vivent en direct.

### 3. En direct

La page des directs du moment et du jour. En tête, celui qui est à l'antenne, en grand, avec aperçu vidéo. Dessous, la **grille horaire de la soirée** : une ligne par heure, en heure locale du spectateur, avec mention du fuseau de la salle quand il diffère (« 21h00 chez vous · 22h00 à la salle »). Les dates complètes portent « COMPLET », celles en liste d'attente « LISTE D'ATTENTE · 340 ».

### 4. Fiche d'une date

Plein écran, image de fond, contenu sur la moitié gauche :

- Titre, artiste (focalisable → page artiste), discipline, durée, jour et heure **dans le fuseau du spectateur**, avec l'heure de salle en second
- État de la date, repris du studio : `PROGRAMMÉ`, `EN DIRECT`, `TERMINÉ`, `REDIFFUSION EN LIGNE`, plus les états d'issue `ANNULÉE ET REMBOURSÉE`, `REPORTÉE · PLACES VALABLES`, `INTERROMPUE · AVOIRS ÉMIS` — ces derniers priment sur tout le reste, en rouge, avec l'explication en clair et ce que le spectateur doit en faire
- Synopsis complet, distribution, langue et sous-titres
- **Barre d'action** : Regarder / Réserver / Bande-annonce / + Ma liste / Partager
- Ce que donne la place : accès au direct, rediffusion incluse ou non, durée de la fenêtre — la politique de rediffusion doit être **lisible avant l'achat**, c'est ce qui justifie l'écart de tarif
- Rangée « Autres dates de ce spectacle » (la série), avec les dates complètes marquées
- Rangée « Du même artiste »

### 5. Réserver une place — le parcours par QR

**On ne saisit pas un numéro de carte à la télécommande.** Le paiement se fait sur le téléphone :

1. Écran de réservation : récapitulatif de la date, choix du tarif (plein, réduit, soutien) à la télécommande, choix du nombre de places
2. Écran de paiement : **QR code** à gauche, à scanner ; à droite, un code court à six caractères et l'adresse `arthome.fr/tv` pour ceux qui préfèrent taper
3. L'écran attend, avec un état d'attente animé et sans compte à rebours anxiogène ; quand le paiement aboutit sur le téléphone, la TV bascule seule sur la confirmation
4. Confirmation : « Votre place est réservée », rappel de l'heure locale, bouton « Ajouter à Ma liste » et « Revenir à l'accueil »

Même mécanique pour la connexion (`Se connecter` = QR + code court), l'abonnement, et l'achat de merch. Sur TV, tout ce qui demande à écrire passe par le téléphone.

> **Note d'architecture, ajoutée le 21 septembre 2026.** Ces quatre parcours — se connecter, acheter une place, s'abonner, acheter du merch — emploient **le même mécanisme** : un code court affiché sur un écran, repris sur un autre appareil, et un écran qui attend puis bascule seul. C'est exactement le **device flow OAuth (RFC 8628)**.
>
> Il doit donc être conçu **une seule fois**, comme une primitive d'appairage d'appareil, et non quatre fois par quatre équipes. C'est aussi le critère qui départagera les candidats à l'authentification : lequel implémente le device flow **nativement**. Voir `architecture/adr-auth.md`.

### 6. Lecteur

Plein écran, aucun élément permanent sauf, en direct, la pastille rouge et le compteur en haut à droite (opacité 0,6).

**Contrôles** : masqués par défaut, révélés par OK ou par une flèche, masqués de nouveau après 4 secondes. Ils tiennent en une bande basse :

- Barre de progression avec les **chapitres posés en régie** (ouverture, tableaux, entracte, salut) — sur un direct, la barre affiche la portion déjà écoulée et la latence
- Temps écoulé / durée, en mono
- Boutons : Lecture/Pause, −10 s, +10 s, Chapitres, Sous-titres, Pistes audio et qualité, Tchat, Informations
- En direct, un bouton **Revenir au direct** apparaît dès que le spectateur a reculé

**Tchat en direct** : panneau latéral droit de 420 px, ouvert par la touche rouge, qui rétrécit la vidéo au lieu de la recouvrir. **Lecture seule sur TV** — on n'écrit pas au clavier virtuel pendant un spectacle. Deux gestes possibles : des **réactions** (six emojis choisis à la croix directionnelle) et « Écrire depuis mon téléphone » (QR). Le régime de tchat vient de la date : libre, emojis et phrases préparées, lecture seule, coupé — et l'écran le dit quand il est restreint.

**Incidents, repris du studio** : quand la régie diffuse un écran d'attente, le lecteur l'affiche en plein cadre, avec le message écrit par la régie, sans jargon technique, et ce que ça implique pour la place. Trois issues possibles, annoncées telles quelles : reprise, report (place valable), annulation (remboursement en 3 à 5 jours). Jamais de spinner muet : le spectateur doit toujours savoir si le problème vient de chez lui ou de la salle.

**Fin de spectacle** : écran de sortie avec les saluts en fond, la rediffusion si elle est incluse (« Disponible pendant 41 h »), la boutique du spectacle (QR), et la prochaine date de la série.

### 7. Mes places

Les places détenues, à venir en premier, en cartes larges : affiche, titre, jour, heure locale et heure de salle, état. Trois états d'accès : **à venir** (compte à rebours), **salle ouverte** (bouton Entrer, 30 min avant), **passée** (rediffusion si elle existe). Une place reportée le dit et affiche la nouvelle date ; une place remboursée le dit et affiche le délai de crédit.

### 8. Ma liste, Artistes, Catégories

- **Ma liste** — grille simple, tri par ajout, retrait par appui long sur OK
- **Artistes** — grille de portraits ronds, avec le nombre de dates à venir ; la fiche artiste a son propre billboard, sa biographie, ses dates, ses rediffusions, et un bouton Suivre qui déclenche les notifications
- **Catégories** — les **21 disciplines** en tuiles typographiques (pas de photo : le nom en Instrument Serif sur aplat teinté), groupées par les deux univers — **Musique** (14 disciplines) et **Scène** (7) — qui existent précisément pour structurer une longue liste. Les tuiles sortent dans le **rang éditorial** déclaré par `taxonomy.json` (`rank`, du plus grand public au plus pointu, familles mêlées) : aucune surface ne le recalcule. Puis les sous-genres en rangées.
  Vingt et une tuiles ne tiennent pas sur un écran de télévision comme neuf : c'est une contrainte de mise en page qui remonte jusqu'au modèle de lecture servi à la TV. Si une sélection éditoriale plus courte est voulue en tête de page, elle doit être écrite comme une règle, jamais codée en dur.

### 9. Abonnements

Trois formules maximum, en colonnes, avec ce que chacune ouvre. L'achat passe par QR. Ne jamais afficher de tableau comparatif dense : trois colonnes, cinq lignes chacune, tout au-dessus de 24 px.

### 10. Compte et profils

Sélection de profil **à l'ouverture de l'app** (jusqu'à cinq, avatars ronds, un profil enfant possible avec catalogue filtré). Dans le compte : identité, abonnement en cours, moyens de paiement (lecture seule, modifiables par QR), appareils connectés, langue, sous-titres par défaut, taille des sous-titres, description audio, réduction des animations, et déconnexion.

### 11. Veille

Après 8 minutes sans interaction hors lecture, un **mode ambiant** : affiches du catalogue en plein écran, lentement fondues l'une dans l'autre, horloge discrète en bas, titre du spectacle en Instrument Serif. Toute touche en sort et rend le focus là où il était.

---

## États à ne pas oublier

- **Chargement** — squelettes de cartes (animation `skel`), jamais de page blanche ni de spinner seul
- **Vide** — « Rien dans Ma liste pour l'instant », avec une action qui sort de l'impasse
- **Réseau perdu** — bandeau haut, message qui distingue « votre connexion » de « nos serveurs »
- **Pas de place** — la carte le dit avant l'ouverture du lecteur, jamais après
- **Contenu géo-bloqué** — dit en clair, avec la raison

---

## Réglages à exposer (props du composant)

`lang` (fr, en) · `profile` (visiteur, abonné, détenteur de place, profil enfant) · `onAir` (booléen) · `autoplayPreview` (booléen) · `focusScale` (1.0 → 1.12) · `chatMode` (libre, emojis, lecture seule, coupé) · `replayPolicy` (incluse, abonnement, unité, aucune) · `incident` (aucun, écran d'attente, reportée, annulée) · `safeArea` (booléen, pour visualiser le cadre d'overscan) · `remote` (croix simple, croix + touches couleur)

---

## Pièges à éviter

1. **Le site en grand** — si l'écran ressemble au storefront web zoomé, c'est raté. Moins d'éléments, plus grands, plus espacés.
2. **Le survol** — aucune information, aucune action ne doit dépendre de `:hover`.
3. **La saisie** — tout ce qui demande d'écrire plus de six caractères passe par QR ou par la voix.
4. **Le texte petit** — 18 px est un plancher, pas une cible.
5. **Le focus perdu** — à tout instant, un élément focalisé, visible, et une sortie par Retour.
6. **Le focus oublié** — revenir en arrière doit ramener le focus exactement d'où on est parti.
7. **La densité** — pas plus de trois rangées visibles à la fois, pas plus de six informations par carte.
8. **Les modales** — sur TV, une modale est une page. Pas de fenêtre flottante à fermer avec une croix.
9. **Les littéraux parallèles** — tout compteur, toute pastille dérive de la donnée.
10. **Les couleurs hexadécimales dans les tables d'état** — tout en oklch, ou `color-mix` pour le voile.
11. **Le rouge décoratif** — le rouge LIVE ne sert qu'à l'antenne. Une promotion n'est jamais rouge.
12. **Les actions inertes** — un état d'interface doit répondre. Ne restent inertes que les appels à un service externe : paiement réel, envoi d'e-mail, contact du support.
