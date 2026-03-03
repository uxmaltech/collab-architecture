# Cross-Layer Glossary

- UIContract: A versioned agreement between UI and backend that defines payloads, behaviors, and invariants.
- Compatibility envelope: The set of changes allowed without breaking existing clients.
- Observability fields: Required metadata fields (`request_id`, `actor_id`, `timestamp`) used for tracing and auditing cross-layer interactions.
- Named-route registry: A centralized mapping that resolves logical route names to versioned backend endpoints.
- Contract client: A wrapper around HTTP libraries that validates request payloads against contract schemas before transmission.
