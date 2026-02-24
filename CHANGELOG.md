# Changelog

## [0.3.2] — 2026-02-24

Incremental GitHub ingestion for V2 collections, with per-repo counting, estimated embedding cost, and repository progress rendering.

### Added

- **`scripts/ingest-github.mjs`** — new CLI ingestion command with `full` and `delta` modes.
- **`lib/git-repo-client.mjs`** — temporary clone and local git inspection helpers (default branch resolution, commit availability, tree listing, diff, blob SHA/path reads).
- **`lib/ingest-github.mjs`** — ingestion orchestrator with pre-scan metrics, scoped collection routing, delete-then-upsert behavior, and per-repo summary output.
- **`make ingest-github` / `make update-github`** — root-level entrypoints to run full or delta ingestion from the repository root.
- **Debug reporting for non-indexed files** — optional `--debug-not-indexed` (`DEBUG_NOT_INDEXED=true` in make) includes excluded/skipped file paths and reasons in output JSON.

### Changed

- **`lib/qdrant.mjs`** — added `qdrantDeleteByFilter` and `qdrantScroll`; `ensureCollection` now supports explicit vector size for specialized collections.
- **`config.mjs`** — added `GITHUB_TOKEN`, `QDRANT_COLLECTION_INGEST_CURSORS`, and optional `EMBED_PRICE_PER_1M_TOKENS` validation.
- **`tools/mcp-collab/package.json`** — added `ingest:github` script and aligned env-file loading to preserve CLI argument forwarding.
- **`scripts/ingest-github.mjs`** — non-dry runs now always execute preflight summary + confirmation before writes; can be bypassed with `--skip-embed-confirm` for automation.

### Documentation

- Updated `README.md`, `tools/mcp-collab/README.md`, `.env.example`, `AGENTS.md`, and `tools/mcp-collab/CLAUDE.md` with GitHub ingestion commands, env vars, and operational guidance.

## [0.3.1] — 2026-02-19

Fixes for seeding and MCP connectivity against an external NebulaGraph cluster (Coolify/Tailscale). All changes are backwards-compatible with the local Docker stack (`EXTERNAL_SERVICES=false`).

### Fixed

- **`seed-graph.mjs` — SDK response format** — the `@nebula-contrib/nebula-nodejs` SDK returns a columnar format (`{ data: { ColumnName: [v1, v2] } }`), not an array of objects. Fixed `SHOW HOSTS` and `DESCRIBE TAG` checks to use `result?.data?.Status?.includes('ONLINE')` and `result?.data?.Field?.length > 0` respectively.
- **`seed-graph.mjs` — `;` inside strings** — `parseNgql` was splitting on all semicolons, breaking `INSERT VERTEX` statements whose string values contain `;` (e.g. `scope=...; owners=...`). Replaced with a character-by-character parser that respects quoted strings.
- **`seed-graph.mjs` — storage hosts pre-flight** — added a wait loop before `CREATE SPACE` that polls `SHOW HOSTS` until at least one storage host is `ONLINE`. Prevents the "Host not enough!" error on fresh clusters where storaged registers asynchronously.
- **`tools/mcp-collab/Makefile` — missing `--env-file` in `up` target** — `make tools-up` was launching `node server.mjs` without loading `.env`, so `NEBULA_ADDR` fell back to the default `graphd` instead of the external host. Now consistent with the `dev` target.
- **`lib/nebula.mjs` — silent NebulaGraph errors** — `executeOne` now checks `result.error_code` and throws with the real error message instead of returning the error object silently to the model.
- **`lib/nebula.mjs` — model-unfriendly response format** — `formatResult` now converts the columnar SDK result into a row-oriented array (`[{ Col: val }, ...]`) that is easier for a language model to read.

### Added

- **`make reset`** — drops the `collab_architecture` space from NebulaGraph and deletes the Qdrant collection. Resets to pre-seed state. Works with both `EXTERNAL_SERVICES=true` and `false`.
- **`make reset-graph`** — NebulaGraph reset only (`DROP SPACE IF EXISTS`). Uses Node script for external, `nebula-console` Docker for local.
- **`make reset-embeddings`** — Qdrant reset only (HTTP `DELETE /collections/:name`).
- **`scripts/reset-graph.mjs`** — Node script backing `make reset-graph` for the external services path.

## [0.3.0] — 2026-02-16

Full refactor of MCP server. The 732-line monolith (`tools/mcp-collab/server.mjs`) was rewritten as a modular architecture of 18 files following SDK v2 patterns (`@modelcontextprotocol/sdk@1.26.0`).

### Architecture

- **Modularization** — server.mjs went from 732 to ~260 lines. Logic extracted to `lib/` (6 modules), `tools/` (6 modules), `auth/`, `resources/`, `prompts/` and `config.mjs`.
- **Per-session transports** — each client gets its own `StreamableHTTPServerTransport` + `McpServer`, fully isolating sessions. Previously all clients shared a single transport.
- **Delegated Makefile** — root Makefile delegates `tools-up`/`tools-down`/`tools-status` to `tools/mcp-collab/Makefile` via `$(MAKE) -C`.

### Authentication

- **Bearer token auth** — `simpleBearerAuth` middleware that validates tokens against API keys configured in `MCP_API_KEYS`. Does not use the SDK's `requireBearerAuth` because it sends OAuth headers (`WWW-Authenticate: Bearer`) that trigger the full OAuth flow in MCP clients (Inspector, Copilot, etc.).
- **`MCP_ENV` safety check** — server refuses to start if `MCP_API_KEYS` is empty and `MCP_ENV` is not `local`. This prevents accidental deployments without authentication.
- **Format validation** — `MCP_API_KEYS` is validated at startup: detects missing `:`, empty clientId or key, and multiple `:`.

### Environment variables

- **Centralized `.env`** — all variables live in a single `.env` at the root. Make loads it with `-include .env` + `export`. Node loads it with `--env-file` when using `npm start`/`npm run dev`.
- **`.env.example`** — template tracked in git with all default values.
- **`config.mjs`** — single source of truth for Node configuration. Reads `process.env` with defaults as last line of defense.

### Tools

- **Tool annotations** — all tools declare `readOnlyHint`, `destructiveHint`, `idempotentHint`. Query/search tools are read-only; `business.rule` is write.
- **Alias deduplication** — `graph.query` and `architecture.graph.query` (and their vector search equivalents) share the same handler instead of duplicating code.

### MCP Resources and Prompts

- **Resources**: `collab://config/summary`, `collab://schema/architecture`, `collab://schema/business`.
- **Prompts**: `explore-architecture`, `find-business-rules`, `trace-dependencies`.

### Capabilities

- **Logging** — server declares `{ capabilities: { logging: {} } }`, enabling `server.sendLoggingMessage()` to connected clients.

### Developer experience

- **`make tools-dev`** — development mode with `--watch` (auto-restart on file changes). Runs in foreground.
- **Error diagnostics** — when `make tools-up` fails, shows the last 20 log lines directly in terminal.
- **`npm start` / `npm run dev`** — package.json scripts with conditional `.env` loading.
- **`CLAUDE.md`** — guide for AI agents working in the MCP directory.

## [0.2.0] — 2025-12-XX

- `business.rule` tool for business rule ingestion into graph + vectors.
- `business.graph.query` and `business.vector.search` tools.
- `tools-down` target in Makefile.

## [0.1.0] — 2025-11-XX

- Initial MCP server with `architecture.graph.query` and `architecture.vector.search`.
- Aliases `graph.query` and `vector.search`.
- Integration with NebulaGraph and Qdrant.
