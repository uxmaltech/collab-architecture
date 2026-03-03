# Pattern: Named-Route Registry with Contract Validation

Pattern ID: CL-PAT-003
Status: Active

Context:
UI-to-backend requests must be validated against contract definitions to prevent drift and runtime errors.

Problem:
Direct HTTP calls bypass contract validation and allow requests that violate version constraints or payload schemas.

Solution:
UI-to-backend requests MUST be executed via a named-route registry and contract client. The registry maps named routes to backend endpoints and validates payloads against the contract schema before sending.

Rules Enforced:
- CL-R-006

Enforceable Semantics:
- The named-route registry MUST map logical route names (e.g., `user.list`, `invoice.create`) to versioned backend endpoints.
- Contract client MUST validate request payloads against the contract schema before HTTP transmission.
- Direct `fetch()`, `axios()`, or HTTP library calls MUST NOT be used for cross-layer interactions; use the contract client wrapper.
- Registry MUST support version selection (e.g., `v1`, `v2`) and route resolution at runtime.
- Failed validations MUST be logged with `request_id` and rejected before network transmission.

Consequences:
- Contract violations are caught at client-side before backend invocation.
- Routes are centralized and auditable.
- Migration to new contract versions is explicit and traceable.
