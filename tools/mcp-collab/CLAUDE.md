# MCP Collab Server — Agent Guidelines

This MCP server is built with `@modelcontextprotocol/sdk@1.26.0`.
It exposes technical and business context through tools, resources, and prompts backed by Qdrant and NebulaGraph.

## Key conventions

### Module structure

```
server.mjs          → Entrypoint. Express app, session management, auth.
config.mjs          → All env vars. Single source of truth.
auth/               → Authentication.
lib/                → Pure utilities (no MCP imports).
  embeddings/       → Embedding drivers + factory (gemini, deterministic).
  context-router.mjs→ Context/scope resolution for V2.
tools/              → One file per tool. Each exports register(server).
resources/          → MCP resources. registerAllResources(server).
prompts/            → MCP prompts. registerAllPrompts(server).
scripts/            → Operational scripts (e.g. ingest-v2).
```

### Tool sets and defaults

- V2 tools are enabled by default:
  - `context.scopes.list.v2`
  - `context.vector.search.v2`
  - `context.graph.degree.search.v2`
- V1 tools are opt-in via `ENABLE_V1_TOOLS=true`.

Do not remove V1 unless explicitly requested.

### Embeddings

V2 embeddings are provider-driven:
- `EMBED_PROVIDER=gemini|deterministic`
- `gemini` is default outside local env
- `deterministic` is fallback/dev mode

Use `lib/embeddings/index.mjs` to resolve the driver. Do not call provider APIs directly from tool handlers.

### Qdrant access pattern

- `ensureCollection(collection)` ensures collection + dimension.
- `qdrantSearch(query, ...)` is legacy V1 behavior.
- `qdrantSearchByVector(vector, ...)` is V2 path (vector computed by embedding driver).
- `qdrantUpsert(points, ...)` waits for indexing (`?wait=true`).
- `qdrantDeleteByFilter(filter, ...)` removes old points by payload filters (used by incremental ingestion).
- `qdrantScroll(filter, ...)` reads lightweight cursor/state points.

### NebulaGraph access pattern

`runNebulaQuery` routes by `USE <space>;` and executes statements against the corresponding pooled client.
Always include an explicit `USE <space>;` in tool queries.

### Scope configuration

Technical scopes are env-driven via `MCP_TECHNICAL_SCOPES` (comma-separated, default `uxmaltech`).
Each scope auto-maps to Qdrant collection `technical-{scope}`, overridable by `QDRANT_COLLECTION_TECHNICAL_{SCOPE_UPPER}`.
The `TECHNICAL_SCOPES` map in `config.mjs` is consumed by `context-router.mjs` to build the scope catalog, and by tool schemas to build the valid `scope` enum.
Adding a new technical scope requires only an env var change — zero code changes.

### Config discipline

- Read env vars only in `config.mjs`.
- Do not use `process.env` outside `config.mjs`.
- Do not hardcode scope names in tool schemas — import `SCOPES` from `context-router.mjs`.

### Annotations matter

Always set tool annotations:
- `readOnlyHint`
- `destructiveHint`
- `idempotentHint`
- `openWorldHint`

### Transport

The server uses HTTP (Express) with per-session `StreamableHTTPServerTransport` + `McpServer` pairs. Auth applies when `MCP_API_KEYS` is set. Do not introduce shared transport state across sessions.

### Ingestion workflow (V2)

- Run via `npm run ingest:v2` (or root `make ingest-v2`).
- Current V2 ingestion seeds Qdrant collections from `tools/mcp-collab/docs/*.md`.
- Incremental GitHub ingestion runs via `npm run ingest:github -- ...` (or root `make ingest-github` / `make update-github`).
- `ingest:github` requires explicit non-global scope and uses cursor persistence in `QDRANT_COLLECTION_INGEST_CURSORS`.
- Repository reads for `ingest:github` use temporary local clones + git diff/tree inspection (not GitHub compare/tree/blob API).
- GitHub-ingested chunk payloads include `language`, `content_kind`, `embedding_profile`, `symbol_name`, and `symbol_path`.
- Symbol extraction is parser-driven via an extensible registry in `lib/code-metadata` (built-ins: PHP, TS/JS).
- Non-dry GitHub ingestion always runs a preflight summary and interactive confirmation unless `--skip-embed-confirm` is set.
- Use `--debug excluded|included` when diagnosing extension filters or validating which files will be processed.
- Nebula V2 seed is separate and must be explicitly implemented/executed.

### Testing checklist

1. `node --check` for changed `.mjs` files.
2. Verify V2 tool registration includes exactly 3 V2 tools by default.
3. If `ENABLE_V1_TOOLS=true`, verify V1 tools are additionally registered.
4. Validate `context.vector.search.v2` returns scoped collections.
5. For GitHub ingestion changes, run at least one `ingest:github --dry-run` and verify JSON summary fields/counters.

### Do not

- Put business logic in `server.mjs`.
- Bypass embedding driver factory in V2.
- Hardcode collection/space names in tool handlers.
- Reintroduce V1-only assumptions in V2 docs or prompts.
