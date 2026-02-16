# MCP Collab Server — Agent Guidelines

This is a Model Context Protocol (MCP) server built with `@modelcontextprotocol/sdk@1.26.0`.
It exposes technical architecture and business context through tools, resources, and prompts
for AI agents to query NebulaGraph and Qdrant.

## Key conventions

### Module structure

```
server.mjs          → Entrypoint only. Express app, session routing, auth. No business logic here.
config.mjs          → All env vars. Single source of truth. Import from here, never read process.env elsewhere.
auth/               → Authentication. tokenVerifier implements OAuthTokenVerifier from the SDK.
lib/                → Pure utilities. No MCP imports. No server references. Testable in isolation.
tools/              → One file per tool (or tool + alias pair). Each exports register(server).
resources/          → MCP resources. Exports registerAllResources(server).
prompts/            → MCP prompts. Exports registerAllPrompts(server).
```

### Adding a new tool

1. Create `tools/my-tool.mjs` with this pattern:

```js
import * as z from 'zod';

export function register(server) {
  server.registerTool(
    'my-tool.name',
    {
      title: 'Human-Readable Title',
      description: 'What this tool does — agents read this to decide when to call it.',
      inputSchema: {
        param: z.string().describe('What this param is for')
      },
      annotations: {
        readOnlyHint: true,       // true for queries, false for mutations
        destructiveHint: false,    // true only if it deletes data
        idempotentHint: true,      // true if calling twice produces same result
        openWorldHint: false
      }
    },
    async ({ param }) => {
      // Implementation
      return { content: [{ type: 'text', text: result }] };
    }
  );
}
```

2. Register it in `tools/index.mjs`:

```js
import { register as registerMyTool } from './my-tool.mjs';
// ...
export function registerAllTools(server) {
  // ... existing tools ...
  registerMyTool(server);
}
```

### Adding a tool alias (backward compatibility)

Use the same handler instance for both names. Never copy-paste the handler:

```js
function makeHandler(collection) {
  return async ({ query }) => { /* ... */ };
}

export function register(server) {
  const handler = makeHandler(COLLECTION);
  server.registerTool('new.name', { /* ... */ }, handler);
  server.registerTool('old.name', { /* ... */ }, handler);  // same handler reference
}
```

### Transport architecture

Each MCP client session gets its own `StreamableHTTPServerTransport` + `McpServer` pair.
The `transports` map in `server.mjs` tracks active sessions by UUID. This is the SDK's
recommended pattern — never create a single shared transport.

- `POST /mcp` without `mcp-session-id` header + `initialize` method → creates new session
- `POST /mcp` with `mcp-session-id` header → routes to existing session's transport
- `GET /mcp` with `mcp-session-id` → SSE stream for server-to-client notifications
- `DELETE /mcp` with `mcp-session-id` → terminates session and cleans up transport
- `GET /health` → always returns `ok`, no auth required

### Authentication

Controlled by `MCP_API_KEYS` env var. When empty (default), auth middleware is a passthrough.

The verifier in `auth/token-verifier.mjs`:
- Must throw `InvalidTokenError` from `@modelcontextprotocol/sdk/server/auth/errors.js` for invalid tokens (produces 401)
- Must return `expiresAt` as seconds-since-epoch (the SDK validates this is a number and not expired)
- For static API keys, set `expiresAt` to one year in the future on each call

### Annotations matter

Always set `annotations` on tools. Agents use these to decide:
- `readOnlyHint: true` → safe to call speculatively for exploration
- `readOnlyHint: false` → agent should confirm with user before calling
- `idempotentHint: true` → safe to retry on failure

### Schemas use Zod

Input schemas use `zod` (imported as `* as z from 'zod'`). The SDK converts them to
JSON Schema automatically. Use `.describe()` on every field — agents read these descriptions.

### Config is centralized

All environment variables are read in `config.mjs` and exported as named constants.
Never use `process.env` directly in other modules. This makes it easy to see all
configuration in one place and to test modules with mock config.

### NebulaGraph access pattern

Queries run via `docker run --rm nebula-console` (synchronous, 30s timeout).
Always prepend `USE <space>;` before any nGQL query. The `runNebulaQuery` function
in `lib/nebula.mjs` handles escaping and output cleanup.

### Qdrant access pattern

Uses the HTTP REST API via `fetch`. No SDK client library.
- `ensureCollection` creates collection if missing, validates vector size if exists
- `qdrantSearch` embeds query text deterministically (SHA-256, not neural) then searches
- `qdrantUpsert` waits for indexing (`?wait=true`)

### Deterministic embeddings

This server uses SHA-256 based embeddings instead of a neural model. The same text
always produces the same vector. This means:
- No external API dependency for embeddings
- Reproducible across runs
- But: no semantic similarity — only exact or near-exact text matches work well

### Testing the server

```bash
# Start (no auth)
node server.mjs

# Start (with auth)
MCP_API_KEYS=test:mykey node server.mjs

# Health check
curl http://127.0.0.1:7337/health

# Initialize session
curl -X POST http://127.0.0.1:7337/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-03-26","capabilities":{},"clientInfo":{"name":"test","version":"1.0"}}}'

# With auth enabled, add: -H "Authorization: Bearer mykey"
```

### Do not

- Put business logic in `server.mjs` — it's only routing and session management
- Read `process.env` outside `config.mjs`
- Create tools with `readOnlyHint` missing — always specify annotations
- Share a single transport across sessions — each session needs its own
- Duplicate handler code for aliases — use a factory function
- Use `express.json()` without considering that `createMcpExpressApp` already applies one
