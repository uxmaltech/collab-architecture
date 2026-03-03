# ADR-002 Strict CQRS in Backend CBQ

Status: Active
Date: 2026-02-02
Confidence: verified

Context:
Backend services must provide auditable state transitions and scalable read performance without compromising invariants.

Decision:
The Backend CBQ domain SHALL implement strict CQRS separation with independent command and query models, materialized read stores, and versioned query routing.

Consequences:
- Command paths enforce invariants and remain side-effect oriented.
- Query paths are scalable and evolve via versioned contracts.
