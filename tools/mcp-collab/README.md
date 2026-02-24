# Collab MCP Server

MCP server that exposes technical and business context tools for AI agents.

Built with the [Model Context Protocol TypeScript SDK](https://github.com/modelcontextprotocol/typescript-sdk) (`@modelcontextprotocol/sdk@1.26.0`) following v2 recommended patterns.

## Why this architecture

The server was refactored from a single 732-line monolithic file (`server.mjs`) into a modular structure. Each change was driven by a specific problem identified by comparing the original implementation against the [SDK reference examples](https://github.com/modelcontextprotocol/typescript-sdk/tree/main/examples/server/src).

### Problem 1: Single shared transport broke multi-client scenarios

The original server created **one** `StreamableHTTPServerTransport` and **one** `McpServer` at module level. Every HTTP request from every client passed through the same transport and the same server instance. This meant:

- No isolation between clients — two agents connecting simultaneously shared state
- No session tracking — no way to know which client sent which request
- No cleanup — disconnected clients left stale state behind

**Fix:** Per-session transport management. Each `initialize` request creates a new `StreamableHTTPServerTransport` + `McpServer` pair, stored in a `transports` map keyed by session UUID. The `mcp-session-id` header routes subsequent requests to the correct transport. Session cleanup happens automatically via `transport.onclose` and on graceful shutdown.

### Problem 2: Manual HTTP body parsing reimplemented SDK functionality

The original server used raw `node:http` with manual chunk accumulation, JSON parsing, body size limits, and error handling (~60 lines). The SDK already handles all of this through Express integration.

**Fix:** Replaced with `createMcpExpressApp()` from the SDK, which provides an Express 5 app with `express.json()` built in plus DNS rebinding protection for localhost bindings. The entire HTTP layer went from 60 lines to 5.

### Problem 3: No authentication for public-facing deployment

The server had zero authentication. Any client that could reach the endpoint could execute graph queries and ingest data.

**Fix:** Bearer token authentication using a custom `simpleBearerAuth` middleware that validates tokens against API keys from the `MCP_API_KEYS` environment variable. We intentionally avoid the SDK's `requireBearerAuth` because it sends `WWW-Authenticate: Bearer` headers that trigger the full OAuth 2.0 discovery flow in MCP clients (Inspector, Copilot, etc.), making them attempt `POST /register`, `GET /authorize`, etc. The custom middleware validates the same way but returns plain 401 JSON responses without OAuth headers.

Additionally, the server requires `MCP_ENV=local` to be explicitly set when running without API keys — it refuses to start otherwise, preventing accidental unauthenticated deployments.

### Problem 4: No capabilities declared

The `McpServer` was created without declaring any capabilities. This meant clients had no way to know the server supported features like logging, and `sendLoggingMessage()` wouldn't work.

**Fix:** Server factory now declares `{ capabilities: { logging: {} } }`. The SDK automatically advertises `tools`, `resources`, and `prompts` capabilities based on what's registered.

### Problem 5: Duplicated tool handlers for aliases

The backward-compatible aliases (`graph.query` → `architecture.graph.query`, `vector.search` → `architecture.vector.search`) were implemented by copy-pasting entire handler functions. Changing the primary tool's logic required remembering to update the alias too.

**Fix:** Each tool module uses a handler factory function. Both the primary tool and its alias point to the same handler instance — zero duplication.

### Problem 6: No tool annotations

Clients had no way to know which tools were read-only (safe to call speculatively) versus which ones mutated state. The SDK supports `annotations` on tools for exactly this purpose.

**Fix:** All query and search tools are annotated with `readOnlyHint: true, destructiveHint: false, idempotentHint: true`. The `business.rule` ingestion tool has `readOnlyHint: false` to signal it writes data.

### Problem 7: SDK features left unused

The MCP protocol defines three types of server-provided content: **tools** (actions), **resources** (data), and **prompts** (templates). The original server only registered tools, leaving resources and prompts unused.

**Fix:** Added resources for infrastructure introspection (server config, graph schemas) and prompts with common query templates (explore architecture, find business rules, trace dependencies).

### Problem 8: Monolithic 732-line file

Configuration, crypto utilities, NebulaGraph client, Qdrant client, text processing, business logic, tool registration, and HTTP server were all in one file. Any change required scrolling through unrelated code.

**Fix:** Modularized into purpose-specific files under `lib/`, `tools/`, `auth/`, `resources/`, and `prompts/`. Each module has a single responsibility and can be understood in isolation.

## Architecture

```
tools/mcp-collab/
  server.mjs              # Entrypoint: Express app, session management, auth
  config.mjs              # Environment variables and constants
  auth/
    token-verifier.mjs    # Bearer token verification via API keys
  lib/
    hashing.mjs           # Deterministic embeddings, UUID hashing
    context-router.mjs    # V2 context/scope routing
    embeddings/           # V2 embedding drivers (gemini/deterministic)
    nebula.mjs            # NebulaGraph client (docker + nebula-console)
    qdrant.mjs            # Qdrant vector DB client
    text.mjs              # Text chunking and tokenization
    business-parser.mjs   # Business markdown parsing
    graph-builder.mjs     # nGQL INSERT statement builders
  tools/
    index.mjs             # Tool registration orchestrator
    context-scopes-list-v2.mjs
    context-vector-search-v2.mjs
    context-graph-degree-search-v2.mjs
    architecture-graph-query.mjs
    architecture-vector-search.mjs
    business-graph-query.mjs
    business-vector-search.mjs
    business-rule.mjs
  resources/
    index.mjs             # MCP resources (config, graph schemas)
  prompts/
    index.mjs             # MCP prompts (query templates)
```

## Session lifecycle

The server follows the SDK's per-session transport pattern:

```
Client                           Server
  |                                |
  |-- POST /mcp (initialize) ---->| Creates new Transport + McpServer
  |                                | Stores in transports[sessionId]
  |<-- 200 + mcp-session-id ------|
  |                                |
  |-- POST /mcp (tools/list) ---->| Looks up transport by session header
  |   + mcp-session-id header      | Delegates to transport.handleRequest()
  |<-- 200 + tool list ------------|
  |                                |
  |-- GET /mcp ------------------>| Opens SSE stream for server notifications
  |<-- Server-Sent Events --------|
  |                                |
  |-- DELETE /mcp ---------------->| Closes transport, removes from map
  |<-- 200 -----------------------|
```

Each session gets its own `McpServer` instance with all tools, resources, and prompts registered. This ensures complete isolation between clients.

## Tools

**V2 context tools (enabled by default):**
- `context.scopes.list.v2` — list valid contexts/scopes and target stores
- `context.vector.search.v2` — semantic search by `context` + `scope`
- `context.graph.degree.search.v2` — N-hop traversal by seed node

**Legacy V1 tools (disabled by default):**
- `architecture.graph.query` (alias: `graph.query`)
- `architecture.vector.search` (alias: `vector.search`)
- `business.graph.query`
- `business.vector.search`
- `business.rule`

Set `ENABLE_V1_TOOLS=true` to re-enable V1 tool registration.

## Resources

- `collab://config/summary` — current server configuration (Qdrant URL, vector size, collection names, graph spaces)
- `collab://schema/architecture` — tags and edges in the architecture graph space
- `collab://schema/business` — tags and edges in the business graph space

## Prompts

- `explore-architecture` — generates nGQL to list nodes by type
- `find-business-rules` — combines vector search + graph query to find rules by domain
- `trace-dependencies` — traces `DEPENDS_ON` edges forward and backward from a node

## Running

```bash
cp ../../.env.example ../../.env   # create .env with defaults (first time only)

# Start databases + MCP server (background)
make tools-up

# Development mode — foreground with auto-reload on file changes
make tools-dev

# Stop MCP server
make tools-down

# Check server status
make tools-status

# Write Codex client config
make tools-config
```

Or directly via npm (assumes databases are already running):
```bash
npm start          # background-friendly, loads ../../.env if present
npm run dev        # foreground with --watch, loads ../../.env if present
npm run ingest:v2  # ingest V2 sources from docs/*.md into scoped Qdrant collections
npm run ingest:github -- --repo uxmaltech/core --context technical --scope uxmal --mode full
```

Default endpoint: `http://127.0.0.1:7337/mcp`

## Authentication

Authentication is controlled by two environment variables in `.env`:

**Local development (no auth):**
```bash
# .env
MCP_ENV=local
MCP_API_KEYS=
```
All `/mcp` requests pass through without auth. `/health` is always unauthenticated.

**Production (auth required):**
```bash
# .env
MCP_ENV=production
MCP_API_KEYS=codex:my-secret-key,claude:another-key
```

When `MCP_API_KEYS` is set, all `/mcp` endpoints (POST, GET, DELETE) require:
```
Authorization: Bearer <key>
```

**Safety rule:** the server refuses to start if `MCP_API_KEYS` is empty and `MCP_ENV` is not `local`:
```
FATAL: MCP_API_KEYS is empty and MCP_ENV is not "local".
```

The `MCP_API_KEYS` format is validated at startup — missing `:`, empty clientId/key, or multiple `:` in an entry will produce a clear error.

The implementation uses a custom `simpleBearerAuth` middleware instead of the SDK's `requireBearerAuth`. The SDK middleware sends `WWW-Authenticate: Bearer` headers that cause MCP clients (Inspector, Copilot) to initiate a full OAuth 2.0 flow (`POST /register`, `GET /authorize`, etc.). The custom middleware validates tokens identically but returns plain 401 JSON without OAuth headers.

## Configuration

| Variable | Default | Description |
|---|---|---|
| `MCP_ENV` | *(none)* | `local` = allow no auth. Any other value or unset = require `MCP_API_KEYS` |
| `MCP_HOST` | `127.0.0.1` | Bind address |
| `MCP_PORT` | `7337` | Listen port |
| `ENABLE_V1_TOOLS` | `false` | Enables legacy V1 tools (`architecture.*`, `business.*`, `business.rule`). |
| `INDEX_VERSION` | `v2` | Version label stored in V2 payloads/responses. |
| `MCP_API_KEYS` | *(empty)* | API keys for auth (`clientId:key,...`). Empty + `MCP_ENV=local` = no auth |
| `ARCH_SPACE` | `collab_architecture` | NebulaGraph space for technical architecture |
| `BUSINESS_SPACE` | `business_architecture` | NebulaGraph space for business context |
| `ARCH_COLLECTION` | `collab-architecture-canon` | Qdrant collection for technical docs |
| `BUSINESS_COLLECTION` | `business-architecture-canon` | Qdrant collection for business context |
| `NEBULA_SPACE_TECHNICAL` | `technical_architecture` | V2 technical graph space (single space for cross-repo impact). |
| `NEBULA_SPACE_BUSINESS` | `business_architecture` | V2 business graph space. |
| `QDRANT_COLLECTION_TECH_UXMAL` | `tech-uxmal` | V2 technical collection for Uxmal scopes. |
| `QDRANT_COLLECTION_TECH_ENVIAFLORES` | `tech-enviaflores` | V2 technical collection for EnviaFlores scopes. |
| `QDRANT_COLLECTION_BUSINESS` | `business-rules` | V2 business-rules collection. |
| `QDRANT_COLLECTION_INGEST_CURSORS` | `ingest-cursors` | Qdrant collection used to persist GitHub incremental cursors (`last_processed_sha`). |
| `QDRANT_URL` | `http://localhost:6333` | Qdrant HTTP endpoint |
| `QDRANT_VECTOR_SIZE` | `1536` | Embedding vector dimension |
| `EMBED_PROVIDER` | `gemini` (`deterministic` in local) | V2 embedding provider (`gemini` \| `deterministic`). |
| `EMBED_DIM` | `1536` | Embedding vector dimension for V2 drivers/collections. |
| `EMBED_PRICE_PER_1M_TOKENS` | *(empty)* | Optional USD estimate for embedding cost in GitHub ingestion reports. |
| `GEMINI_API_KEY` | *(empty)* | Required when `EMBED_PROVIDER=gemini`. |
| `GEMINI_EMBED_MODEL` | `gemini-embedding-001` | Gemini embedding model name. |
| `GEMINI_BASE_URL` | `https://generativelanguage.googleapis.com/v1beta` | Gemini API base URL. |
| `GEMINI_MAX_BATCH` | `32` | Max texts per Gemini batch call. |
| `GITHUB_TOKEN` | *(empty)* | Required for `ingest:github` (temporary clone + local git diff and file reads). |
| `NEBULA_CONSOLE_IMAGE` | `vesoft/nebula-console:v3.6.0` | Docker image for nebula-console |
| `NEBULA_NETWORK` | `collab-architecture_default` | Docker network for NebulaGraph |
| `NEBULA_ADDR` | `graphd` | NebulaGraph graph service address |
| `NEBULA_PORT` | `9669` | NebulaGraph graph service port |
| `NEBULA_USER` | `root` | NebulaGraph username |
| `NEBULA_PASSWORD` | `nebula` | NebulaGraph password |

## Example: context.vector.search.v2

```json
{
  "context": "technical",
  "scope": "global",
  "query": "strict cqrs separation",
  "limit": 6
}
```

This returns:
1. Matched chunks across V2 scoped collections
2. Collection provenance per match (`tech-uxmal` / `tech-enviaflores` / `business-rules`)
3. Embedding metadata (`provider`, `model`, `dim`) and `index_version`

## GitHub incremental ingestion (CLI)

`ingest:github` ingests repository content into V2 scoped collections using `full` and `delta` modes.
By default (when not using `--dry-run`), it always runs a preflight summary and asks for confirmation before writing embeddings.
Use `--skip-embed-confirm` to bypass that prompt (for CI/non-interactive runs).

Examples:

```bash
# Full bootstrap for one repo
npm run ingest:github -- \
  --repo uxmaltech/core \
  --context technical \
  --scope uxmal \
  --mode full

# Delta update for multiple repos (repeated --repo)
npm run ingest:github -- \
  --repo uxmaltech/core \
  --repo uxmaltech/auth \
  --context technical \
  --scope uxmal \
  --mode delta

# Dry-run with custom extensions and no progress rendering
npm run ingest:github -- \
  --repo enviaflores/ef-storefront-backend \
  --context technical \
  --scope enviaflores \
  --mode delta \
  --include-ext md,ts,js,php \
  --dry-run \
  --no-progress

# Include debug payload for files that were not indexed
npm run ingest:github -- \
  --repo uxmaltech/core \
  --context technical \
  --scope uxmal \
  --mode delta \
  --debug-not-indexed
```

Root Make targets are also available:

```bash
make ingest-github REPOS=uxmaltech/core CONTEXT=technical SCOPE=uxmal MODE=full
make update-github REPOS=uxmaltech/core CONTEXT=technical SCOPE=uxmal
make update-github REPOS=uxmaltech/core CONTEXT=technical SCOPE=uxmal SKIP_EMBED_CONFIRM=true
make update-github REPOS=uxmaltech/core CONTEXT=technical SCOPE=uxmal DEBUG_NOT_INDEXED=true
```

## Legacy note: `business.rule`

`business.rule` remains available only when `ENABLE_V1_TOOLS=true`. It belongs to the legacy V1 toolset and is not part of the default V2 workflow.
