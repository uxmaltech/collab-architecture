# Pattern: CRUD Page with GridJS + Modals (Backoffice UI)

Pattern ID: BO-PAT-004
Status: Active
Confidence: provisional

Context:
Backoffice CRUD screens are repetitive: list in a table, create/edit in a modal, remove with confirmation.

Problem:
Ad-hoc CRUD pages diverge in behavior, event naming, and CBQ usage. This increases maintenance cost and makes UI automation brittle.

Solution:
Use a standard composition:
- GridJS table for listing (query endpoint)
- Create modal (form + button)
- Edit modal (form + button)
- Remove modal (confirmation body + button)
- Action column buttons dispatch UI events with minimal payload

Rules Enforced:
- BO-R-001
- BO-R-003
- BO-R-004
- BO-R-007

Enforceable Semantics:
- Listing MUST be implemented with `UI::gridJS(...)->queryEndPoint(...)`.
- Header MUST include an "add" action that dispatches `openCreate*Modal`.
- Row actions MUST dispatch `openEdit*Modal` / `openRemove*Modal` events with stable payload keys.
- Create/Edit/Remove buttons MUST dispatch `create*` / `edit*` / `remove*` events.
- JavaScript MUST bind behavior through the backoffice event bus (boui) and MUST call CBQ endpoints by stable names (`qry.*` / `cmd.*`).

Allowed DOM Access:
- Direct DOM access by `id` MAY be used only for *content slots* inside modals (example: injecting confirmation text).
- DOM access MUST NOT be used as an event-binding mechanism.

Consequences:
- CRUD UX is consistent across domains.
- CBQ names and payload shapes are stable and reviewable.
