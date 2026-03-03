# Backoffice UI Principles

- BO-P-001: Server-rendered PHP is the default UI composition layer for backoffice screens.
- BO-P-002: UI intent is expressed in markup and data attributes; behavior is bound by dedicated JavaScript modules.
- BO-P-003: Standard UI components are preferred over custom widgets when a canonical component exists.
- BO-P-004: UI contracts are explicit, versioned, and shared with backend contracts.
- BO-P-005: Backoffice usability favors clarity and auditability over visual novelty.

## Related Domains

- **Cross-Layer** (DOM-003): Defines UI-to-backend contracts that backoffice UI consumes (see CL-P-001, CL-R-001, CL-PAT-001)
- **Backend CBQ** (DOM-002): Provides query endpoints for backoffice lists and detail views via cross-layer contracts
