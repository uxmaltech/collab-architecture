# Pattern: Runtime API Isolation

Pattern ID: BO-PAT-005
Status: Active

Context:
Backoffice UI runtime provides internal state and public APIs for component lifecycle, asset loading, and initialization.

Problem:
Application code that accesses internal runtime state creates brittle dependencies and prevents runtime refactoring or upgrades.

Solution:
UI integrations MUST use only the public runtime API. Internal state, private symbols, and undocumented methods MUST NOT be accessed. The runtime MUST expose a stable, versioned public API contract.

Rules Enforced:
- BO-R-008

Enforceable Semantics:
- Public runtime APIs MUST be documented and versioned.
- Application code MUST NOT access properties or methods prefixed with `_` or marked as `@private` in documentation.
- Public APIs MUST include lifecycle events, component registration, asset loading, and scope re-initialization.
- Breaking changes to public APIs MUST follow semver major version increments and provide migration guides.

Consequences:
- Runtime can evolve independently without breaking application code.
- Integrations are auditable and testable against the public API contract.
- Runtime behavior remains predictable across versions.
