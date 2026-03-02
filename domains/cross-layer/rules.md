# Cross-Layer Rules

- CL-R-001: Every UI to backend interaction MUST map to a named and versioned UIContract entry.
- CL-R-002: Breaking changes require a new major version and a migration guide.
- CL-R-003: Error codes and payloads MUST be stable within a contract version.
- CL-R-004: Observability fields (request_id, actor_id, timestamp) MUST be present in all cross-layer payloads.
- CL-R-005: UI behavior MUST reference backend contract versions explicitly when invoking queries or commands.
- CL-R-006: UI-to-backend requests MUST be executed via the named-route registry and contract client; direct HTTP calls that bypass contract validation MUST NOT be used.
