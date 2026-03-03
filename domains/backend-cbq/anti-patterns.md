# Backend CBQ Anti-Patterns

- CBQ-AP-001: Query endpoints that write to command stores or modify business state.

  **Rules Violated:**
  - CBQ-R-002 (Queries must be side-effect free)

- CBQ-AP-002: Command handlers that return read models or derived projections.

  **Rules Violated:**
  - CBQ-R-001 (Commands must not return domain read models)

- CBQ-AP-003: Read models that are updated by ad-hoc scripts outside scheduled rebuilds.

  **Rules Violated:**
  - CBQ-R-003 (Read models must be materialized from command sources or event streams)
  - CBQ-R-004 (Rebuilds must be executed by scheduled cron jobs)

- CBQ-AP-004: Unversioned query routes that change output shape without a new version.

  **Rules Violated:**
  - CBQ-R-006 (Query routing must be versioned and backward-compatible)

- CBQ-AP-005: Rebuilding read models from partial data without a documented snapshot policy.

  **Rules Violated:**
  - CBQ-R-005 (Snapshotting must be used for long-lived aggregates)
