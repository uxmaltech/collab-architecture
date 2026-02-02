# Pattern: UI to Backend Contract

Pattern ID: CL-PAT-001
Status: Active

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

Consequences:
- Contract changes are tracked and reviewable.
- Compatibility can be enforced mechanically.
