# Backoffice UI Anti-Patterns

- BO-AP-001: Binding JavaScript behaviors to CSS classes or DOM ids instead of `data-uxmal-*` contracts.

  **Rules Violated:**
  - BO-R-002 (All JavaScript behavior bindings must target data-uxmal-* attributes)
  - BO-R-007 (Every interactive element must expose a data-uxmal-* contract)

- BO-AP-002: Replacing GridJS tables with custom table frameworks without a recorded architectural decision.

  **Rules Violated:**
  - BO-R-003 (GridJS is the standard tabular UI)

- BO-AP-003: Mixing PHP template logic with inline JavaScript behavior definitions.

  **Rules Violated:**
  - BO-R-004 (UI intent and behavior must be separated)
  - BO-R-006 (Backoffice UI must not inject inline JavaScript in templates)

- BO-AP-004: Client-side rendering of primary backoffice screens when PHP can render the same view.

  **Rules Violated:**
  - BO-R-001 (Backoffice screens must be composed in PHP first)

- BO-AP-005: Implicit behavior triggered by global event listeners without a declared `data-uxmal-*` contract.

  **Rules Violated:**
  - BO-R-002 (All JavaScript behavior bindings must target data-uxmal-* attributes)
  - BO-R-007 (Every interactive element must expose a data-uxmal-* contract)

- BO-AP-006: Accessing internal UI runtime state or private symbols from application code.

  **Rules Violated:**
  - BO-R-008 (UI integrations must use only the public UI runtime API)

- BO-AP-007: Polling or timer-based readiness checks instead of lifecycle events or explicit wait APIs.

  **Rules Violated:**
  - BO-R-009 (Component readiness must be driven by runtime lifecycle events or explicit wait APIs)
