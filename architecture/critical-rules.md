# Règles critiques Arthome — à relire à chaque session

> Style, nommage, outillage → `code-conventions.md`. Ce qui fait un lot fini → `definition-of-done.md`.

1. **Aucun appel synchrone entre services** : le BFF appelle un service, un service ne parle qu'à Kafka. BullMQ reste interne à un service.
2. **Toute valeur affichée deux fois vient de `@arthome/core`** : deux *appels* sont permis, deux *implémentations* jamais.
3. **Écriture métier et ligne d'outbox dans la même transaction**, par le même `manager` — jamais `save()` puis `emit()`. Un consommateur déduplique sur `message-id` **dans cette même transaction**.
4. **Jeton vérifié par JWKS en local**, `algorithms`/`issuer`/`audience` épinglés : aucun service n'appelle `identity`, jamais d'`x-user-id`. Le JWKS est **un document statique servi par le CDN**, seule source de clés — **aucune clé privée n'y entre, et une clé publiée avant d'être retirée**.
5. **Chaque service autorise lui-même, sur l'instance chargée** — jamais « seul le BFF m'appelle » : un accès ponctuel expire pendant la vie d'un jeton.
6. **Les dates voyagent en chaînes ISO 8601 UTC.** *Exception : à l'intérieur d'un JWT, `exp`/`iat`/`nbf` restent des secondes numériques (RFC 7519) — ce n'est pas une faute, ne pas « corriger ».*
7. **Montants en unité mineure entière + code devise ISO.** Le formatage est du client et ne voyage jamais.
8. **i18n par codes** : aucune phrase d'interface dans une charge utile. Une erreur porte `code`, `params`, `traceId` et `nature` (`refused` / `unavailable` / `offline_forbidden`).
9. **Toute réponse porte `servedAt`** ; toute valeur périssable porte `validUntil`. Un décompte se calcule contre `servedAt`, jamais contre l'horloge du client.
10. **Une valeur d'énumération inconnue est conservée brute et traitée comme neutre**, jamais rejetée : la sévérité porte sur la forme, jamais sur le membre.
11. **Un champ interdit par le rôle est absent de la réponse**, jamais présent et nul ; un tri sur un champ absent est **refusé**, jamais ignoré.
12. **Une clé d'idempotence rejouée rend la réponse d'origine**, jamais une erreur de doublon.
13. **`traceparent` propagé** de la surface au service, **et injecté dans `outbox_event.tracecontext` au moment de l'écriture** — injecté plus tard, le lien est perdu.
14. **Migrations additives seulement sur les tables capturées par la CDC** : un renommage de colonne casse la réplication en silence.
15. **Une constante d'exploitation a un document propriétaire** — cadence, durée, seuil, plafond : ailleurs on y **renvoie**, jamais on ne la recopie. Un nombre plausible recopié est faux en silence, aucun test ne le contredit, et c'est E2 sur un nombre.
