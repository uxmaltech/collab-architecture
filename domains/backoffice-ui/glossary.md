# Backoffice UI Glossary

- PHP-first UI: Server-rendered HTML produced by PHP as the primary view, with optional JavaScript enhancement.
- data-uxmal-* contract: A standardized DOM attribute that declares UI intent and payload for JavaScript bindings.
- Intent: The declarative description of an action or state in markup.
- Behavior: The executable JavaScript logic bound to intent via data-uxmal-* attributes.
- GridJS table: The canonical tabular component used for backoffice lists and reporting.
- Runtime API: The public, versioned interface exposed by the UI runtime for component lifecycle, asset loading, and initialization.
- Lifecycle events: Runtime-emitted events that signal component readiness, DOM changes, or initialization completion.
- Asset dependencies: Server-declared JavaScript or CSS resources required by a component, lazy-loaded by the runtime.
- HTML sanitization: The process of removing or escaping unsafe HTML elements and scripts from user-supplied or external content.
