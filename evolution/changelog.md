# Canon Changelog

Evolution policy:
- All canon changes MUST be recorded here with exact IDs and dates.
- Rule changes require an ADR and, when breaking, a migration guide.
- This log is the authoritative timeline used to detect architectural drift.

## 2026-02-02
- Initialized Collab Architecture canon and repository structure.
- Established core domains, axioms, and schemas.

## 2026-02-24
- Added `ADR-003-v2-context-topology` to document V2 tool topology and store partitioning rationale:
  - Qdrant collections by technical scope and business domain.
  - Nebula spaces by context (`technical_architecture`, `business_architecture`).
