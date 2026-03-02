# Migration Guide — Monorepo to Ecosystem Split (v2)

This guide documents the transition from the monolithic `collab-architecture` repository (with embedded `tools/mcp-collab/` and `Makefile`) to the three-repo ecosystem.

## Overview

The original `collab-architecture` repository contained canon files, MCP server code, Docker infrastructure, operational scripts, and a 333-line Makefile. As of Phase 4, the codebase is split into three repositories with clear boundaries:

| Repository | Purpose |
|------------|---------|
| `uxmaltech/collab-architecture` | Canon: rules, schemas, graph seeds, governance |
| `uxmaltech/collab-architecture-mcp` | MCP runtime: server, tools, ingestion, Docker |
| `uxmaltech/collab-cli` | CLI: wizard, compose generation, orchestration |

## Before / After — Make Targets to CLI Commands

| Make target | CLI equivalent | Notes |
|-------------|----------------|-------|
| `make status` | `collab infra status` | Shows Qdrant + NebulaGraph container status |
| `make db-up` | `collab infra up` | Starts Qdrant and NebulaGraph via Docker Compose |
| `make db-down` | `collab infra down` | Stops Qdrant and NebulaGraph |
| `make qdrant-up` | `collab infra up` | Combined into single infra command |
| `make qdrant-down` | `collab infra down` | Combined into single infra command |
| `make nebula-up` | `collab infra up` | Combined into single infra command |
| `make nebula-down` | `collab infra down` | Combined into single infra command |
| `make wait-qdrant` | _(automatic)_ | Built into `collab infra up` health checks |
| `make wait-nebula` | _(automatic)_ | Built into `collab infra up` health checks |
| `make seed` | `collab seed` | Runs preflight, then seeds embeddings + graph |
| `make seed-embeddings` | _(via MCP repo)_ | `npm run ingest:v2` in `collab-architecture-mcp` |
| `make seed-graph` | _(via MCP repo)_ | `node scripts/seed-graph.mjs` in `collab-architecture-mcp` |
| `make reset` | _(via MCP repo)_ | Manual: run `reset-graph.mjs` + delete Qdrant collection |
| `make reset-embeddings` | _(removed)_ | Delete Qdrant collection via API or `collab-architecture-mcp` scripts |
| `make reset-graph` | _(via MCP repo)_ | `node scripts/reset-graph.mjs` in `collab-architecture-mcp` |
| `make update` | _(via MCP repo)_ | Re-run seed-embeddings + update-graph |
| `make update-graph` | _(via MCP repo)_ | Re-seed graph data without dropping space |
| `make tools-up` | `collab mcp start` | Starts MCP server container |
| `make tools-dev` | _(via MCP repo)_ | `npm run dev` in `collab-architecture-mcp` for local development |
| `make tools-down` | `collab mcp stop` | Stops MCP server container |
| `make tools-status` | `collab mcp status` | Shows MCP container status |
| `make tools-config` | `collab init` | Generates Codex MCP config snippet during wizard |
| `make ingest-v2` | _(via MCP repo)_ | `npm run ingest:v2` in `collab-architecture-mcp` |
| `make ingest-github` | _(via MCP repo)_ | `npm run ingest:github` in `collab-architecture-mcp` |
| `make update-github` | _(via MCP repo)_ | `npm run ingest:github` with `MODE=delta` |
| `make logs-qdrant` | _(docker)_ | `docker logs -f collab-qdrant` |
| `make logs-nebula` | _(docker)_ | `docker logs -f nebula-graphd` |

## Repo Boundaries — What Lives Where

### collab-architecture (this repo)
- `schema/` — JSON/YAML validation schemas and `version.json`
- `domains/` — domain-specific rules, patterns, anti-patterns
- `knowledge/` — axioms, decisions, conventions
- `graph/` — graph node/edge schemas and `seed/` NGQL files
- `contracts/` — UI contracts
- `prompts/` — agent system prompts
- `governance/` — review process, confidence levels
- `evolution/` — changelog, migration guides

### collab-architecture-mcp
- `server.mjs`, `config.mjs` — MCP server and configuration
- `tools/`, `prompts/`, `resources/` — MCP tool/resource/prompt registrations
- `lib/` — Nebula, Qdrant, embeddings, ingestion, schema validation
- `auth/` — token verification
- `scripts/` — seed-graph, reset-graph, ingest-github, tools-config
- `infra/` — Docker Compose for NebulaGraph
- `tests/` — unit and integration tests
- `.github/workflows/` — CI and integration test pipelines

### collab-cli
- `src/commands/` — init, up, seed, doctor, infra/*, mcp/*, compose/*
- `ecosystem.manifest.json` — version compatibility ranges
- `docs/` — release strategy

## Quick-Start for Transitioning Users

### 1. Install the CLI
```bash
npm install -g @uxmaltech/collab-cli
```

### 2. Initialize your workspace
```bash
cd /path/to/your/workspace
collab init
```
The wizard will ask for your mode (`file-only` or `indexed`), generate Docker Compose files, and optionally start services.

### 3. For indexed mode users
```bash
collab infra up       # Start Qdrant + NebulaGraph
collab mcp start      # Start MCP server
collab doctor         # Verify everything is healthy
```

### 4. For file-only mode users
No infrastructure needed. Agents read `.md` files directly from the canon.

## FAQ

**Q: Do I need to install all three repos locally?**
A: No. Only `collab-architecture` is needed for canon content. The CLI handles MCP and infrastructure orchestration via Docker. Clone `collab-architecture-mcp` only if you need to develop or debug the MCP server itself.

**Q: What happened to the `.env` file?**
A: Environment variables for the MCP server are now managed in `collab-architecture-mcp/.env.example`. The CLI generates Docker Compose files that embed the necessary configuration. The canon repo no longer needs a `.env` file.

**Q: Can I still use `make` commands?**
A: No. The Makefile has been deleted. Use `collab` CLI commands or operate directly in the `collab-architecture-mcp` repo with `npm run` scripts.

**Q: How do I check if my versions are compatible?**
A: Run `collab doctor`. It checks schema version, MCP version, and contract compatibility across all three repos.
