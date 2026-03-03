# Pattern: Soft Delete with `Deleted` Flag

Pattern ID: CBQ-PAT-004
Status: Active
Confidence: provisional

Context:
Many business tables come from legacy or external schemas and do not include standard Laravel soft deletes.

Problem:
Hard deletes destroy auditability and break historical references. Mixed delete approaches create inconsistent query semantics.

Solution:
Use a boolean `Deleted` column as the canonical soft-delete mechanism.

Rules Enforced:
- CBQ-R-008

Enforceable Semantics:
- Tables MUST include `Deleted` boolean default `false`.
- Commands that "remove" entities MUST set `Deleted=true` (no physical delete).
- Queries MUST exclude deleted rows using `(Deleted = 0 OR Deleted IS NULL)` to support legacy rows that predate the flag.
- New rows MUST set `Deleted=false` explicitly.

Consequences:
- Auditability and referential stability improve.
- Cross-domain queries can assume consistent deletion semantics.
