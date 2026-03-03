# Pattern: UI to Backend Contract

Pattern ID: CL-PAT-001
Status: Active
Confidence: verified

Context:
UI and backend teams require shared, enforceable interfaces.

Problem:
Implicit interfaces drift and produce breaking changes.

Solution:
Define every interaction as a UIContract with semver and explicit guarantees. Both sides must reference the same contract version in code and documentation.

Rules Enforced:
- CL-R-001
- CL-R-002
- CL-R-005

Enforceable Semantics:
- Contract definitions MUST live in `contracts/UIC-NNN-{name}.yaml` following `schema/contracts.schema.yaml`.
- Contracts MUST declare `guarantees`, `invariants`, and `breaking_change_policy` sections.
- Backend endpoints MUST annotate their contract version via route metadata or response headers.
- UI code MUST reference the contract version when constructing requests via the named-route registry.

Consequences:
- Contract changes are tracked and reviewable.
- Compatibility can be enforced mechanically.
