# Collab MCP Server

This MCP server exposes technical and business context tools for Codex.

## Tools

Technical canon:
- `architecture.graph.query` (alias: `graph.query`)
- `architecture.vector.search` (alias: `vector.search`)

Business context:
- `business.graph.query`
- `business.vector.search`
- `business.rule` (ingest Markdown into business graph + vector store)

## Example: business.rule

```json
{
  "repo": "uxmaltech/backoffice-ui",
  "domain": "backoffice-ui",
  "markdown": "# Domain\n- Backoffice UI\n\n# Capabilities\n- Order Management\n\n# Commands\n- CreateOrder\n- CancelOrder\n\n# Queries\n- ListOrders\n\n# Entities\n- Order\n\n# Rules\n- Orders must be auditable.\n",
  "tags": ["orders", "backoffice"],
  "confidence": "provisional"
}
```

The tool will:
- Create/update the business graph space `business_architecture`
- Upsert semantic chunks into the Qdrant collection `business-architecture-canon`

## Running

- Start everything: `make tools-up`
- Write Codex config: `make tools-config`

Default MCP endpoint: `http://127.0.0.1:7337/mcp`

## Configuration

Environment variables used by the server:
- `ARCH_SPACE`, `BUSINESS_SPACE`
- `ARCH_COLLECTION`, `BUSINESS_COLLECTION`
- `QDRANT_URL`, `QDRANT_VECTOR_SIZE`
- `NEBULA_*` connection parameters
- `MCP_HOST`, `MCP_PORT`
