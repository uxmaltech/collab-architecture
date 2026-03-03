# Backend CBQ Principles

- CBQ-P-001: Commands and queries are separate paths with separate models and responsibilities.
- CBQ-P-002: Read models are materialized from immutable event or state sources.
- CBQ-P-003: Rebuilds are deterministic and reproducible via scheduled execution.
- CBQ-P-004: Query routes are versioned to preserve backward compatibility.
- CBQ-P-005: Command handling owns validation and invariant enforcement.
- CBQ-P-006: Aggregate snapshots bound replay cost and improve rebuild predictability.
- CBQ-P-007: Soft deletes preserve auditability and referential stability.
- CBQ-P-008: Database connections are environment-driven to support multi-store deployments.

## Related Domains

- **Cross-Layer** (DOM-003): Backend query routes implement cross-layer UI contracts (see CL-R-001, CL-R-005, CL-PAT-001)
- **Backoffice UI** (DOM-001): Consumes backend query endpoints for lists, detail views, and form validation
