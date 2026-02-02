# Pattern: Versioned Query Routing

Pattern ID: CBQ-PAT-003
Status: Active

Context:
Multiple clients depend on stable query responses.

Problem:
Changing query response shapes breaks clients and eliminates safe rollout.

Solution:
Version query routes explicitly and maintain at least one prior version during transitions. Version changes are recorded as architectural decisions.

Rules Enforced:
- CBQ-R-006

Consequences:
- Clients can migrate on a predictable schedule.
- Backward compatibility is measurable and enforceable.
