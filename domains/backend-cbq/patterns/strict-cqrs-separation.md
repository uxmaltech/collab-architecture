# Pattern: Strict CQRS Separation

Pattern ID: CBQ-PAT-001
Status: Active
Confidence: verified

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

Enforceable Semantics:
- Command handlers MUST live in a dedicated namespace separate from query handlers.
- Command handler methods MUST accept a typed command DTO and return a structured outcome; they MUST NOT return read models.
- Query handler methods MUST accept query parameter DTOs and return read model DTOs; they MUST NOT inject or reference command repositories.
- Shared mutable state between command and query paths MUST NOT exist; communication flows through event streams or materialized stores only.

Consequences:
- Write consistency improves and read performance scales independently.
- Monitoring can distinguish command latency from query latency.
