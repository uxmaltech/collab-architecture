# Backoffice UI Rules

- BO-R-001: Backoffice screens MUST be composed in PHP first and MAY enhance with JavaScript only after the PHP render is complete.
- BO-R-002: All JavaScript behavior bindings MUST target `data-uxmal-*` attributes; class or id selectors are not permitted as behavior anchors.
- BO-R-003: GridJS is the standard tabular UI. Any deviation requires an architectural decision and must be recorded in the canon.
- BO-R-004: UI intent and UI behavior MUST be separated. Markup declares intent, and JavaScript implements behavior in separate modules.
- BO-R-005: Backoffice UI MUST not depend on client-side routing for primary navigation.
- BO-R-006: Backoffice UI MUST not inject inline JavaScript in templates.
- BO-R-007: Every interactive element MUST expose a `data-uxmal-*` contract with explicit action and payload keys.
