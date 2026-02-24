# MCP Collab Server — Agent Guidelines

This MCP server is built with `@modelcontextprotocol/sdk@1.26.0`.
It exposes technical and business context through tools, resources, and prompts backed by Qdrant and NebulaGraph.

## Key conventions

### Module structure

```
server.mjs          → Entrypoint only. Express app, session routing, auth.
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

### NebulaGraph access pattern

`runNebulaQuery` routes by `USE <space>;` and executes statements against the corresponding pooled client.
Always include an explicit `USE <space>;` in tool queries.

### Config discipline

- Read env vars only in `config.mjs`.
- Do not use `process.env` outside `config.mjs`.

### Annotations matter

Always set tool annotations:
- `readOnlyHint`
- `destructiveHint`
- `idempotentHint`
- `openWorldHint`

### Session/transport architecture

Each MCP client session gets its own `StreamableHTTPServerTransport` + `McpServer` pair.
Do not introduce shared transport state across sessions.

### Ingestion workflow (V2)

- Run via `npm run ingest:v2` (or root `make ingest-v2`).
- Current V2 ingestion seeds Qdrant collections from `tools/mcp-collab/docs/*.md`.
- Nebula V2 seed is separate and must be explicitly implemented/executed.

### Testing checklist

1. `node --check` for changed `.mjs` files.
2. Verify V2 tool registration includes exactly 3 V2 tools by default.
3. If `ENABLE_V1_TOOLS=true`, verify V1 tools are additionally registered.
4. Validate `context.vector.search.v2` returns scoped collections.

### Do not

- Put business logic in `server.mjs`.
- Bypass embedding driver factory in V2.
- Hardcode collection/space names in tool handlers.
- Reintroduce V1-only assumptions in V2 docs or prompts.
