# Pattern: Versioned Query Routing

Pattern ID: CBQ-PAT-003
Status: Active
Confidence: provisional

Context:
Multiple clients depend on stable query responses.

Problem:
Changing query response shapes breaks clients and eliminates safe rollout.

Solution:
Version query routes explicitly and maintain at least one prior version during transitions. Version changes are recorded as architectural decisions.

Rules Enforced:
- CBQ-R-006

Enforceable Semantics:
- Query route URLs MUST include a version segment (e.g., `/api/v{N}/resource`).
- Deprecated query versions MUST return a `Sunset` HTTP header with the retirement date.
- Route registration MUST map version-qualified names (e.g., `qry.entity.list.v2`) to handlers.
- Removing a prior version MUST be preceded by an ADR and recorded in `evolution/changelog.md`.

Consequences:
- Clients can migrate on a predictable schedule.
- Backward compatibility is measurable and enforceable.
