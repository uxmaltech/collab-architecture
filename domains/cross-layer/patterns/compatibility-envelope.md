# Pattern: Compatibility Envelope

Pattern ID: CL-PAT-004
Status: Active
Confidence: provisional

Context:
Multiple clients consume the same backend contract version.

Problem:
Uncontrolled changes lead to silent client failures.

Solution:
Define and enforce a compatibility envelope that allows additive changes only within a minor version. Breaking changes require a major version with a published migration guide.

Rules Enforced:
- CL-R-002
- CL-R-003

Enforceable Semantics:
- Additive changes (new optional fields, new endpoints) MUST increment the MINOR version only.
- Removing or renaming fields, changing types, or altering semantics MUST increment the MAJOR version.
- A published migration guide MUST accompany every MAJOR version increment.
- Clients MUST NOT depend on undocumented response fields; only fields listed in the contract are guaranteed.

Consequences:
- Clients can rely on stable behavior.
- Migration becomes a planned activity, not incident response.
