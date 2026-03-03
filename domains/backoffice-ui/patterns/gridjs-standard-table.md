# Pattern: GridJS Standard Table

Pattern ID: BO-PAT-003
Status: Active
Confidence: verified

Context:
Backoffice applications require a consistent tabular experience with sorting, pagination, and export.

Problem:
Inconsistent table implementations create operational risk and maintenance overhead.

Solution:
Use GridJS as the single approved tabular UI component. Table customization must remain within GridJS extension points.

Rules Enforced:
- BO-R-003

Enforceable Semantics:
- Tables MUST be initialized via a server-side builder with a query endpoint binding.
- Server-side pagination, sorting, and search MUST be enabled by default; disabling requires justification per ADR-003.
- Column definitions MUST use typed column descriptors, not raw HTML formatters.
- Tables exceeding the ADR-003 static threshold (100 rows) MUST use canonical GridJS with server-side pagination.

Consequences:
- Tables are consistent across domains.
- Shared support tooling can depend on a single table API.
