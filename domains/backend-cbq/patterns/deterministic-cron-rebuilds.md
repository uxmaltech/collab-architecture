# Pattern: Deterministic Cron-Based Rebuilds

Pattern ID: CBQ-PAT-006
Status: Active

Context:
Read models must be rebuilt regularly to incorporate new events and maintain consistency with command sources.

Problem:
Ad-hoc or manual rebuilds produce inconsistent states and are not auditable. Rebuilds that depend on external or ephemeral inputs are not reproducible.

Solution:
Schedule read model rebuilds as cron jobs with deterministic inputs. All rebuild parameters must be stable and documented. Rebuilds must use only persistent sources (event streams, snapshots, or command stores).

Rules Enforced:
- CBQ-R-004

Enforceable Semantics:
- Rebuild jobs MUST run on a predictable schedule (cron expression) and be independently executable.
- Input parameters MUST be deterministic: version identifiers, snapshot markers, or time ranges from persistent stores.
- Rebuilds MUST NOT depend on in-memory caches, session state, or external APIs that cannot be replayed.
- Each rebuild MUST log its inputs, start time, completion time, and row counts for auditability.

Consequences:
- Rebuilds are reproducible and can be re-run for debugging or disaster recovery.
- Operational teams can audit rebuild history and predict resource usage.
- Rebuild logic is testable in isolation.
