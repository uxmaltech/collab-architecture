# Pattern: data-uxmal-* Contract Binding

Pattern ID: BO-PAT-002
Status: Active
Confidence: verified

Context:
Backoffice UI behavior must be deterministic and machine-discoverable.

Problem:
Implicit bindings through CSS selectors or DOM traversal are fragile and non-auditable.

Solution:
Declare intent using `data-uxmal-*` attributes in markup. JavaScript modules bind behavior only through those attributes and never through class or id selectors.

Rules Enforced:
- BO-R-002
- BO-R-007

Enforceable Semantics:
- Interactive elements MUST declare `data-uxmal-action` (action name) and `data-uxmal-payload` (JSON payload keys) attributes.
- Action names MUST follow dot-namespaced convention (e.g., `entity.create`, `entity.edit`).
- JavaScript binding MUST use attribute selectors only; class or id selectors MUST NOT be used for behavior binding.
- Elements with `data-uxmal-action` MUST NOT also have inline event attributes (onclick, onsubmit, etc.).

Consequences:
- Behavior is traceable and can be validated by static analysis.
- UI contracts remain stable across CSS refactors.
