# Pattern: data-uxmal-* Contract Binding

Pattern ID: BO-PAT-002
Status: Active

Context:
Backoffice UI behavior must be deterministic and machine-discoverable.

Problem:
Implicit bindings through CSS selectors or DOM traversal are fragile and non-auditable.

Solution:
Declare intent using `data-uxmal-*` attributes in markup. JavaScript modules bind behavior only through those attributes and never through class or id selectors.

Rules Enforced:
- BO-R-002
- BO-R-007

Consequences:
- Behavior is traceable and can be validated by static analysis.
- UI contracts remain stable across CSS refactors.
