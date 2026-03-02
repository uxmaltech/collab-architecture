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

## Modes of Operation

This repository supports two operational modes. The canonical `.md` and `.yaml` files are always the source of truth; graph and vector indexes are derived artifacts that can be rebuilt at any time.

**File-only mode** — Agents read `.md` files directly from this repository. Zero infrastructure dependencies. Best for small canons, single-repo projects, or environments where Docker is unavailable.

**Indexed mode** — Agents query NebulaGraph (graph) and Qdrant (vectors) through the MCP server for semantic recall and graph-based reasoning. Best for large canons or multi-repo ecosystems where context windows are insufficient to hold the full canon.

**Disaster recovery:** The `.md` files are canonical. If the graph or vector database is lost, re-run the seed scripts from `collab-architecture-mcp` to rebuild from source files.

**Transition heuristic:** When the canon exceeds ~50,000 tokens (~375 files at current density), consider switching to indexed mode. As of 2026-03-01, the canon contains ~7,300 tokens across 76 files — well within file-only range.

## MCP Server

The MCP server has been extracted to its own repository: [`uxmaltech/collab-architecture-mcp`](https://github.com/uxmaltech/collab-architecture-mcp). See that repo for setup, tools, environment variables, and deployment.

Default MCP endpoint: `http://127.0.0.1:7337/mcp`

## Repository layout

- `schema/` — validation schemas for the knowledge graph, vector records, and cross-layer contracts.
- `domains/` — domain-specific principles, rules, patterns, and anti-patterns.
- `knowledge/` — axioms, decisions, conventions, and global anti-patterns.
- `graph/` — node and edge schemas plus a seed dataset used to initialize reasoning.
- `embeddings/` — ingestion source declarations and vector index configuration (canon only).
- `prompts/` — authoritative prompts for Codex and Collab agents.
- `evolution/` — records how the canon changes over time.
- `governance/` — defines how knowledge enters, is reviewed, and gains confidence.

## Documentation

- [Upgrade Guide](evolution/upgrade-guide.md) — cross-repo upgrade procedures and rollback.
