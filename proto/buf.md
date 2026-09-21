# proto/ — Arthome event schemas

Protobuf only (A3), tooled with `buf`. **These schemas describe the Kafka events.**
The API contracts (OpenAPI, generated from zod) and any BFF → service gRPC services
belong to `backend-contracts`: see `architecture/context-map.md` §10.

- One Kafka topic per **aggregate type**; several message types per topic
  → registry subject strategy: **`RecordNameStrategy`**.
- Registry compatibility: **`BACKWARD`** (consumers upgrade first).
- `buf breaking` is blocking on `identity`, `catalog`, `ticketing` (**stable**) and
  ignored on the four others (**provisional**) — see `buf.yaml`.
- **A field number is never reused.** A deleted field becomes `reserved`.
- Every enumeration carries a `_UNSPECIFIED` zero value, treated as **neutral** by a
  consumer, never as an error.
