# Collab Architecture

Collab Architecture is the canonical architectural memory for UxmalTech systems. It is a knowledge repository that defines how systems are designed, constrained, and evolved inside the Collab ecosystem. It does not contain application source code and it does not describe any single application implementation.

Collab, the multi-agent application, reads this repository as authoritative context before it analyzes or modifies code in other repositories. Developers do not edit or query this repository directly during normal development workflows; they interact with it indirectly through Collab agents that propose changes, enforce rules, and record decisions.

LLM agents use this repository as persistent memory. The canon is structured to support graph-based reasoning and vector-based semantic recall. The graph and vector representations derived from this repository are the source of truth for reasoning, retrieval, and validation. If a rule, pattern, or decision is not present here, it is not part of UxmalTech architecture.

UxmalTech architecture and technology are defined by the contents of this repository. They include domain boundaries, CQRS conventions, UI contracts, and approved technologies. The content is structured to support machine validation and human review, and is versioned to preserve institutional history.

Strict separation is enforced:
- Application source code lives outside this repository.
- Architectural knowledge, rules, and decisions live inside this repository.

Governing rule:
"If it is not in Collab Architecture, it is not a rule yet."

Repository layout:
- schema/ defines validation schemas for the knowledge graph, vector records, and cross-layer contracts.
- domains/ captures domain-specific principles, rules, patterns, and anti-patterns.
- knowledge/ holds axioms, decisions, conventions, and global anti-patterns.
- graph/ contains node and edge schemas plus a seed dataset used to initialize reasoning.
- embeddings/ defines ingestion sources and vector index configuration.
- prompts/ provides authoritative prompts for Codex and Collab agents.
- evolution/ records how the canon changes over time.
- governance/ defines how knowledge enters, is reviewed, and gains confidence.
