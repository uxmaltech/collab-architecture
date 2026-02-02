# Pattern: Compatibility Envelope

Pattern ID: CL-PAT-002
Status: Active

Context:
Multiple clients consume the same backend contract version.

Problem:
Uncontrolled changes lead to silent client failures.

Solution:
Define and enforce a compatibility envelope that allows additive changes only within a minor version. Breaking changes require a major version with a published migration guide.

Rules Enforced:
- CL-R-002
- CL-R-003

Consequences:
- Clients can rely on stable behavior.
- Migration becomes a planned activity, not incident response.
