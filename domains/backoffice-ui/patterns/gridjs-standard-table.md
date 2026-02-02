# Pattern: GridJS Standard Table

Pattern ID: BO-PAT-003
Status: Active

Context:
Backoffice applications require a consistent tabular experience with sorting, pagination, and export.

Problem:
Inconsistent table implementations create operational risk and maintenance overhead.

Solution:
Use GridJS as the single approved tabular UI component. Table customization must remain within GridJS extension points.

Rules Enforced:
- BO-R-003

Consequences:
- Tables are consistent across domains.
- Shared support tooling can depend on a single table API.
