# Backend CBQ Principles

- CBQ-P-001: Commands and queries are separate paths with separate models and responsibilities.
- CBQ-P-002: Read models are materialized from immutable event or state sources.
- CBQ-P-003: Rebuilds are deterministic and reproducible via scheduled execution.
- CBQ-P-004: Query routes are versioned to preserve backward compatibility.
- CBQ-P-005: Command handling owns validation and invariant enforcement.
