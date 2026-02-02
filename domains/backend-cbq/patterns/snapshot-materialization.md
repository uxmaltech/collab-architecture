# Pattern: Snapshot Materialization

Pattern ID: CBQ-PAT-002
Status: Active

Context:
Aggregates with long histories require efficient rebuild paths.

Problem:
Replaying unbounded event history increases rebuild time and operational risk.

Solution:
Persist periodic snapshots of aggregate state. Materialization jobs start from the most recent snapshot and replay only the delta.

Rules Enforced:
- CBQ-R-005

Consequences:
- Rebuild windows are bounded.
- Storage costs are predictable and managed.
