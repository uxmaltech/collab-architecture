# Knowledge

The knowledge directory holds global axioms, decisions, conventions, and anti-patterns that apply across all domains. Each file is atomic and enforceable.

## Index

### Axioms
Fundamental architectural principles that cannot be violated:
- [AX-001](axioms/AX-001-authoritative-canon.md) — Authoritative Canon
- [AX-002](axioms/AX-002-separation-of-code-and-canon.md) — Separation of Code and Canon
- [AX-003](axioms/AX-003-traceable-architecture.md) — Traceable Architecture

### Decisions (ADRs)
Architectural decisions that document choices and their rationale:
- [ADR-001](decisions/ADR-001-canonical-representation.md) — Canonical Knowledge Representation
- [ADR-002](decisions/ADR-002-strict-cqrs-backend.md) — Strict CQRS in Backend CBQ
- [ADR-003](decisions/ADR-003-non-canonical-tables.md) — Non-Canonical Tables for Small Static Lists
- [ADR-005](decisions/ADR-005-v2-context-topology.md) — V2 Context Topology (Tools + Stores)

### Conventions
Naming, versioning, and structural conventions:
- [CN-001](conventions/CN-001-naming.md) — Canonical Naming
- [CN-002](conventions/CN-002-versioning.md) — Canonical Versioning

### Anti-Patterns
Global anti-patterns that must be avoided:
- [AP-001](anti-patterns/AP-001-architecture-in-code.md) — Architecture Embedded Only in Code
- [AP-002](anti-patterns/AP-002-implicit-contracts.md) — Implicit Contracts
- [AP-003](anti-patterns/AP-003-unreviewed-exceptions.md) — Unreviewed Exceptions
