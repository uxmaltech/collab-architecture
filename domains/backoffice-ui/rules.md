# Backoffice UI Rules

- BO-R-001: Backoffice screens MUST be composed in PHP first and MAY enhance with JavaScript only after the PHP render is complete.
- BO-R-002: All JavaScript behavior bindings MUST target `data-uxmal-*` attributes; class or id selectors are not permitted as behavior anchors.
- BO-R-003: GridJS is the standard tabular UI. Any deviation requires an architectural decision and must be recorded in the canon.
- BO-R-004: UI intent and UI behavior MUST be separated. Markup declares intent, and JavaScript implements behavior in separate modules.
- BO-R-005: Backoffice UI MUST not depend on client-side routing for primary navigation.
- BO-R-006: Backoffice UI MUST not inject inline JavaScript in templates.
- BO-R-007: Every interactive element MUST expose a `data-uxmal-*` contract with explicit action and payload keys.
- BO-R-008: UI integrations MUST use only the public UI runtime API; internal runtime state and private symbols MUST NOT be accessed.
- BO-R-009: Component readiness MUST be driven by runtime lifecycle events or explicit wait APIs; polling or timer-based retries MUST NOT be used.
- BO-R-010: Any dynamic DOM injection MUST invoke runtime re-initialization for the affected scope to rebind components, actions, and assets.
- BO-R-011: Server-rendered views MUST declare component asset dependencies; the runtime MUST lazy-load assets from that declaration only.
- BO-R-012: User-supplied or external HTML MUST be sanitized or escaped before rendering; raw HTML injection MUST NOT occur.
