# Cross-Layer Glossary

- UIContract: A versioned agreement between UI and backend that defines payloads, behaviors, and invariants.
- Compatibility envelope: The set of changes allowed without breaking existing clients.
- Observability fields: Required metadata fields for tracing and auditing cross-layer interactions, including request identifiers, actor information, and timestamps.
- Named-route registry: A centralized mapping that resolves logical route names to versioned backend endpoints.
- Contract client: A wrapper around HTTP libraries that validates request payloads against contract schemas before transmission.
