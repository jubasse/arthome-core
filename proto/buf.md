# proto/ — schémas d'événements Arthome

Protobuf seul (A3), outillé par `buf`. **Ces schémas décrivent les événements Kafka.**
Les contrats d'API (OpenAPI, généré depuis zod) et les éventuels services gRPC BFF → service
sont du ressort de `backend-contracts` : voir `architecture/context-map.md` §10.

- Un sujet Kafka par **type d'agrégat** ; plusieurs types de message par sujet
  → stratégie de sujet du registre : **`RecordNameStrategy`**.
- Compatibilité du registre : **`BACKWARD`** (les consommateurs montent d'abord).
- `buf breaking` est bloquant sur `identity`, `catalog`, `ticketing` (**stable**) et
  ignoré sur les quatre autres (**provisoire**) — voir `buf.yaml`.
- **Un numéro de champ n'est jamais réutilisé.** Un champ supprimé passe en `reserved`.
- Toute énumération porte une valeur zéro `_UNSPECIFIED`, traitée comme **neutre** par un
  consommateur, jamais comme une erreur.
