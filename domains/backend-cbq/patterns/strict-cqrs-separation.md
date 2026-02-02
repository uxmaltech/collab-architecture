# Pattern: Strict CQRS Separation

Pattern ID: CBQ-PAT-001
Status: Active

Context:
Backend services must protect invariants while serving high-volume queries.

Problem:
Mixing reads and writes in the same path leads to accidental side effects and inconsistent models.

Solution:
Separate command handlers and query handlers at the module boundary. Commands write to authoritative stores; queries read from materialized views only.

Rules Enforced:
- CBQ-R-001
- CBQ-R-002
- CBQ-R-003

Consequences:
- Write consistency improves and read performance scales independently.
- Monitoring can distinguish command latency from query latency.
