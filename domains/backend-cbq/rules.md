# Backend CBQ Rules

- CBQ-R-001: Commands MUST mutate state and MUST NOT return domain read models.
- CBQ-R-002: Queries MUST be side-effect free and MUST NOT write to primary command stores.
- CBQ-R-003: Read models MUST be materialized from command sources or event streams, not authored directly by queries.
- CBQ-R-004: Read model rebuilds MUST be executed by scheduled cron jobs with deterministic inputs.
- CBQ-R-005: Snapshotting MUST be used for long-lived aggregates to avoid unbounded replay.
- CBQ-R-006: Query routing MUST be versioned and backward-compatible for at least one released version.
- CBQ-R-007: Every command handler MUST publish explicit success or failure outcomes with stable codes.
- CBQ-R-008: Entities MUST implement soft delete by setting `Deleted=true`; physical deletes are not permitted for business tables.
- CBQ-R-009: Business models MUST resolve their database connection via an environment-defined selector (e.g., `DB_BUSINESS_CONNECTION`) with a stable fallback.
