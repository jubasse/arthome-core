# Prompts de démarrage — sessions Claude Code

> ## ⚠ Document largement dépassé — ne pas coller tel quel
>
> **Corrigé le 21 septembre 2026.** Ces trois prompts ont été rédigés avant
> plusieurs décisions structurantes et avant la session « contrats d'interface,
> architecture backend, authentification ». Les corrections ponctuelles ci-dessous
> alignent le vocabulaire, mais **l'ordre de travail lui-même a changé** :
>
> - le palier 0 ne monte plus un monorepo, mais le dépôt `arthome-core` ;
> - le palier 1 est désormais précédé de la **session de contrats**, qui produit
>   `architecture/` et les deux OpenAPI — et c'est elle qui dit au palier 1 quelles
>   formes porter ;
> - le palier 2 ne monte plus OpenTelemetry, seulement la propagation de
>   `traceparent` ;
> - les schémas d'événements sont en **Protobuf**, le choix n'est plus ouvert.
>
> **La référence vivante est `README.md` corrigé, plus
> `arthome-core/architecture/`.** Version d'origine de ce document sous
> `PROMPT.pre-corrections.md`.

Trois prompts, pour les trois premiers paliers. Les sessions suivantes n'ont plus
besoin de prompt : il suffit de demander la lecture de
`design_handoff_arthome/README.md`.

---

## Palier 0 — `arthome-core` et la vitrine

À coller après avoir committé `design_handoff_arthome/` dans `docs/` d'`arthome-core`.

---

Je démarre Arthome, une plateforme de diffusion en direct de spectacle vivant :
billetterie, direct, tchat modéré, rediffusions, boutique, versements aux
artistes. C'est un projet personnel, dont l'objectif est de servir de vitrine
technique sur GitHub.

Lis d'abord `design_handoff_arthome/README.md` en entier : architecture, jetons
de design, principes de conception, ordre de travail. Puis `streaming.md`.

**Tâche de cette session** : monter `arthome-core` et la vitrine. Aucun code métier,
aucun service.

1. Structure du dépôt `arthome-core` telle que décrite au §3 du README :
   `docs/`, `prototypes/`, `architecture/`, `proto/`, `openapi/`, et
   `packages/core` + `packages/contracts`. Les services et l'infrastructure
   vivent dans un second dépôt, `arthome-platform` ; chaque application a le sien.

2. Outillage **minimal** : pnpm workspaces, turborepo uniquement pour le cache de
   tâches. **Pas de Nx.** Le `.npmrc` `node-linker=hoisted` n'a plus d'objet :
   en multi-dépôts, chaque application mobile a son dépôt et son lockfile, donc
   la friction Metro/pnpm disparaît avec l'espace de travail partagé qui la
   causait.

3. Déplacer `design_handoff_arthome/mockups/` vers `prototypes/` et configurer
   GitHub Pages. Une page d'index les présente : ce qu'est chaque surface, pour
   qui, sur quel appareil. Les maquettes doivent être cliquables et navigables —
   celle de la TV se pilote aux flèches du clavier.

4. Les premiers ADR, courts et argumentés. Le format compte moins que l'honnêteté
   des arbitrages :
   - ADR-001 React pour le public, Angular pour le studio
   - ADR-002 Multi-dépôts : `arthome-core`, `arthome-platform`, un dépôt par application
   - ADR-003 Un paquet de domaine sans dépendance framework
   - ADR-004 Microservices et Kafka dès le départ — et pourquoi ce choix est
     assumé malgré son coût
   - ADR-005 Plan de contrôle et plan média séparés
   - ADR-006 La TV est une interface à part entière, pas une adaptation

5. Le README doit faire comprendre le produit et l'architecture en moins de
   trente secondes, avec le lien vers la galerie en évidence.

Propose-moi la structure et le plan du README avant d'écrire.

---

## Palier 1 — le domaine `@arthome/core`

---

Je construis `@arthome/core`, le paquet de domaine d'Arthome. Il sera consommé
par cinq applications (Next.js, React Native, react-native-tvos, Angular,
Angular/Ionic) et par sept services NestJS.

Lis `design_handoff_arthome/README.md`, en particulier le §3.

`design_handoff_arthome/shared/` contient du code **déjà éprouvé** : la
taxonomie, le contenu rédigé, les règles du domaine et la copie bilingue. C'est
la source unique de vérité des cinq maquettes de ce projet. Il faut le **porter
en TypeScript typé**, pas le réécrire.

**Tâche de cette session :**

1. Porter `shared/` vers l'arborescence du §3, avec exports par sous-chemin
   (`/taxonomy`, `/i18n`, `/fixtures`). **On porte les règles, on remodèle les
   formes** : voir la famille D de `arthome-core/architecture/corrections-handoff.md`,
   qui liste les sept points où `shared/` doit être corrigé au passage.

2. **Règle stricte : zéro dépendance framework.** Pas de React, pas d'Angular,
   pas de Nest, pas d'API navigateur, pas de Node spécifique dans les règles
   métier. Le paquet doit fonctionner sous Node, Next, Metro, react-native-tvos
   et Angular. Aussi peu de dépendances que possible, tout court.

3. Des tests sur les règles qui font réellement mal : changements de fuseau,
   expiration d'une fenêtre de rediffusion, droits par rôle, TVA et arrondis,
   calcul d'un versement, codes de place, transitions d'état d'une date.

4. CI : lint, typecheck, tests, build.

Ce paquet est ce qu'on ouvrira en premier pour juger la qualité du code.

Propose-moi le découpage des modules avant d'écrire le premier fichier.

---

## Palier 2 — le socle distribué

---

Je monte l'infrastructure d'Arthome et les deux premiers services.

Lis `design_handoff_arthome/README.md` §3.

**Tâche de cette session** : le chemin événementiel de bout en bout, avec deux
services seulement. C'est le palier qui coûte le plus et qui prouve le plus ;
une fois franchi, chaque service suivant sera rapide.

1. `infra/docker-compose.yml` : PostgreSQL, Kafka, Kafka Connect, Schema
   Registry, Redis, OpenSearch, MinIO. Pas de collecteur OpenTelemetry à ce
   stade : observabilité simple, mais `traceparent` (W3C) propagé dès le premier
   producteur, en HTTP et en Kafka.

2. Deux services NestJS : `identity` et `catalog`. Chacun sa base.

3. Le chemin complet, démontrable :
   - écriture en base avec **motif outbox**
   - publication Kafka avec **schéma versionné** en **Protobuf**, outillé par `buf`
   - **Debezium** en capture de changements
   - **connecteur sink** vers OpenSearch, avec l'analyseur `french`
   - **`traceparent` propagé** de la requête HTTP jusqu'à l'indexation, visible
     dans les journaux. Le tableau de bord vient plus tard ; la propagation, non :
     un événement publié sans `traceparent` est définitivement orphelin
   - **DLQ** : celle de Kafka Connect pour les échecs de connecteur, et un motif
     reprise/rebut propre aux consommateurs pour les échecs métier

4. Un consommateur **idempotent**, avec clé de déduplication et un test qui
   rejoue le même événement deux fois.

`catalog` consomme la taxonomie de `@arthome/core` : les facettes de recherche
en dérivent, elles ne sont pas redéclarées.

Propose-moi le schéma des sujets Kafka et le modèle d'événements avant d'écrire.

---

**Point de vigilance valable pour toutes les sessions** : tout ce qui est calculé
deux fois divergera. Avec sept services et cinq applications, la tentation de
recalculer une valeur localement sera permanente. Si une valeur apparaît sur deux
écrans, elle vient de `@arthome/core` — jamais recomposée.
