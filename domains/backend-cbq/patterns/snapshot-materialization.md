# Pattern: Snapshot Materialization

Pattern ID: CBQ-PAT-002
Status: Active
Confidence: provisional

Context:
Aggregates with long histories require efficient rebuild paths.

Problem:
Replaying unbounded event history increases rebuild time and operational risk.

Solution:
Persist periodic snapshots of aggregate state. Materialization jobs start from the most recent snapshot and replay only the delta.

Rules Enforced:
- CBQ-R-005

Enforceable Semantics:
- Snapshots MUST be versioned with the aggregate version number at the time of capture.
- Snapshot frequency MUST be documented per aggregate type (e.g., every N events or every T hours).
- Stale snapshots MUST be pruned according to a documented retention policy.
- Materialization MUST verify snapshot integrity before replaying the delta.

Consequences:
- Rebuild windows are bounded.
- Storage costs are predictable and managed.
