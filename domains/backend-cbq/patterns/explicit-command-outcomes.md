# Pattern: Explicit Command Outcomes

Pattern ID: CBQ-PAT-007
Status: Active

Context:
Commands may succeed, fail with validation errors, or fail due to infrastructure issues. Clients must distinguish between these cases.

Problem:
Implicit or inconsistent error handling makes clients guess at failure causes and prevents reliable observability.

Solution:
Every command handler MUST publish an explicit outcome with a stable code, message, and optional context. Success outcomes include confirmation codes; failure outcomes include stable error codes and actionable messages.

Rules Enforced:
- CBQ-R-007

Enforceable Semantics:
- Command handlers MUST return a structured outcome with `success: boolean`, `code: string`, and `message: string`.
- Success codes MUST follow a stable namespace (e.g., `COMMAND_SUCCESS`, `ENTITY_CREATED`).
- Failure codes MUST distinguish validation errors (e.g., `VALIDATION_FAILED`) from invariant violations (e.g., `DUPLICATE_KEY`) and infrastructure errors (e.g., `DATABASE_UNAVAILABLE`).
- Error codes MUST remain stable across versions; new codes may be added but existing codes MUST NOT change semantics.
- Outcomes MAY include additional context (e.g., `entity_id`, `validation_errors`) but MUST NOT leak internal state.

Consequences:
- Clients can handle failures deterministically.
- Observability pipelines can classify and alert on specific failure modes.
- Command semantics are documented by the outcome codes.
