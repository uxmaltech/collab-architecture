# Pattern: PHP-First Rendering

Pattern ID: BO-PAT-001
Status: Active
Confidence: verified

Context:
Backoffice screens require predictable loading and auditability.

Problem:
Client-side rendering introduces uncertainty in data freshness, audit trails, and error handling.

Solution:
Render the primary view using PHP. JavaScript enhances interactivity after the server render completes and MUST bind to runtime lifecycle events. Any dynamic updates must preserve server-authoritative state and trigger runtime re-initialization for the affected scope. Asset dependencies are declared server-side and lazy-loaded by the runtime.

Rules Enforced:
- BO-R-001
- BO-R-004
- BO-R-009
- BO-R-010
- BO-R-011

Enforceable Semantics:
- Server-rendered HTML MUST be complete and functional before any JavaScript executes.
- JavaScript enhancement MUST bind only through `data-uxmal-*` attribute selectors.
- Dynamic DOM injection MUST trigger runtime re-initialization for the affected scope.
- Asset dependencies MUST be declared in the server-rendered view; the runtime MUST lazy-load from that declaration only.

Consequences:
- Pages load with deterministic content and logging.
- JavaScript is limited to enhancement rather than composition.
- Runtime initialization remains deterministic for initial and injected content.
