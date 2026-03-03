# Domains

Domain folders define domain-specific principles, rules, patterns, and anti-patterns. Content in a domain directory applies to that domain and is authoritative within its scope.

## Active Domains

### [backoffice-ui](backoffice-ui/)
Backoffice user interfaces rendered by PHP with explicit UI contracts.
- **Scope:** UxmalTech backoffice screens and UI components
- **Key Technologies:** PHP, GridJS
- **Primary Patterns:** PHP-First Rendering, data-uxmal-* Contract Binding

### [backend-cbq](backend-cbq/)
Command and query backend architecture with strict separation.
- **Scope:** Backend services implementing CQRS patterns
- **Key Technologies:** Cron (scheduled rebuilds)
- **Primary Patterns:** Strict CQRS Separation, Versioned Query Routing

### [cross-layer](cross-layer/)
Contracts and invariants spanning UI and backend systems.
- **Scope:** UI to backend contracts and compatibility guarantees
- **Primary Patterns:** UI-Backend Contract, Compatibility Envelope
