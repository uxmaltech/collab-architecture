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
- tools/mcp-collab/ is the MCP server that exposes graph and vector tools to AI agents.

## MCP Server

The MCP server lives in `tools/mcp-collab/`. It exposes architecture and business context as tools, resources, and prompts for AI agents via the [Model Context Protocol](https://modelcontextprotocol.io/).

### Quick start

```bash
cp .env.example .env    # create local config (defaults work for dev)
make tools-up           # start databases + MCP server (background)
make tools-dev          # alternative: foreground with auto-reload
make ingest-v2          # ingest V2 vector data into scoped Qdrant collections
```

Endpoint: `http://127.0.0.1:7337/mcp`

### Environment variables

All configuration lives in `.env` (git-ignored). Copy `.env.example` to get started.

Key variables:

| Variable | Required | Description |
|---|---|---|
| `MCP_ENV` | Yes | Set to `local` for development (no auth). Omit or set to another value in production to require API keys. |
| `MCP_API_KEYS` | Production | API keys in format `clientId1:key1,clientId2:key2`. When set, all `/mcp` endpoints require `Authorization: Bearer <key>`. |
| `MCP_HOST` | No | Bind address (default: `127.0.0.1`) |
| `MCP_PORT` | No | Listen port (default: `7337`) |

**Safety rule:** the server refuses to start if both `MCP_API_KEYS` is empty and `MCP_ENV` is not `local`. This prevents accidental unauthenticated deployments.

```bash
# Local dev — no auth
MCP_ENV=local

# Production — with auth
MCP_ENV=production
MCP_API_KEYS=codex:my-secret-key,claude:another-key
```

See [tools/mcp-collab/README.md](tools/mcp-collab/README.md) for full documentation on tools, resources, prompts, session lifecycle, and architecture.

### V2 MCP defaults

- V2 tools enabled by default:
  - `context.scopes.list.v2`
  - `context.vector.search.v2`
  - `context.graph.degree.search.v2`
- Legacy V1 tools are opt-in with `ENABLE_V1_TOOLS=true`.
