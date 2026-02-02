# Backend CBQ Anti-Patterns

- CBQ-AP-001: Query endpoints that write to command stores or modify business state.
- CBQ-AP-002: Command handlers that return read models or derived projections.
- CBQ-AP-003: Read models that are updated by ad-hoc scripts outside scheduled rebuilds.
- CBQ-AP-004: Unversioned query routes that change output shape without a new version.
- CBQ-AP-005: Rebuilding read models from partial data without a documented snapshot policy.
