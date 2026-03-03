# ADR-001 Canonical Knowledge Representation

Status: Active
Date: 2026-02-02
Confidence: verified

Context:
Collab agents require deterministic reasoning and retrieval over UxmalTech architecture. A single representation is insufficient for both graph reasoning and semantic recall.

Decision:
The canonical representation of architectural knowledge SHALL be stored in files that can be compiled into both a knowledge graph and a vector index. Graph schemas and vector schemas are first-class and versioned.

Consequences:
- Graph reasoning and semantic recall are derived from the same canonical sources.
- Schema changes require explicit governance and version increments.
