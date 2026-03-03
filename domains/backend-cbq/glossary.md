# Backend CBQ Glossary

- Command: A write request that mutates domain state and enforces invariants.
- Query: A read request that returns a materialized view and does not mutate state.
- Read model: A denormalized projection optimized for queries.
- Snapshot: A stored aggregate state used to reduce replay cost.
- Materialization: The process of building read models from command or event sources.
- Versioned routing: Explicit versioning of query endpoints and response shapes.
- Soft delete: Logical deletion using a `Deleted` boolean flag instead of physical row removal.
- Deterministic rebuild: A read model rebuild process with stable, reproducible inputs from persistent sources.
- Explicit outcome: A structured command response with stable success/failure codes and messages.
- DB selector: An environment-defined connection name (e.g., `DB_BUSINESS_CONNECTION`) used by business models to resolve database targets.
