# Cross-Layer Principles

- CL-P-001: UI and backend communicate through explicit, versioned contracts.
- CL-P-002: Contracts are stable across releases and changes are deliberate and recorded.
- CL-P-003: Shared semantics are documented once and reused across domains.
- CL-P-004: Observability is part of the contract, not an afterthought.

## Related Domains

- **Backoffice UI** (DOM-001): Consumes cross-layer contracts for UI-to-backend communication (see BO-P-004, BO-R-003, BO-PAT-002)
- **Backend CBQ** (DOM-002): Provides query and command endpoints that implement cross-layer contracts (see CBQ-P-003, CBQ-PAT-003)
