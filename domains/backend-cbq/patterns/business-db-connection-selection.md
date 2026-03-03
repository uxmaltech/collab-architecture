# Pattern: Business DB Connection Selection via Model Connection Name

Pattern ID: CBQ-PAT-005
Status: Active
Confidence: provisional

Context:
Deployments may switch between different business data stores (for example, local SQLite vs MySQL) depending on environment constraints.

Problem:
Hard-coding database connections in queries or migrations makes environments diverge and breaks portability.

Solution:
Models that represent business tables MUST resolve their connection name from an environment-defined selector.

Rules Enforced:
- CBQ-R-009

Enforceable Semantics:
- Business models MUST implement a connection-name resolver (e.g., `getConnectionName()`) that returns `DB_BUSINESS_CONNECTION` with a stable fallback.
- Queries and commands MUST use those models (or explicitly use the same business connection) so the data plane is consistent.
- Migrations that target business tables MUST run on the business connection.

Consequences:
- Environments can switch business storage without code changes.
- Multi-DB setups remain predictable and testable.
