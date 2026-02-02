# Backend CBQ Glossary

- Command: A write request that mutates domain state and enforces invariants.
- Query: A read request that returns a materialized view and does not mutate state.
- Read model: A denormalized projection optimized for queries.
- Snapshot: A stored aggregate state used to reduce replay cost.
- Materialization: The process of building read models from command or event sources.
- Versioned routing: Explicit versioning of query endpoints and response shapes.
