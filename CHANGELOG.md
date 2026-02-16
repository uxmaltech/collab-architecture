# Changelog

## [0.3.0] — 2026-02-16

Refactor completo del MCP server. El monolito de 732 lineas (`tools/mcp-collab/server.mjs`) se reescribio como una arquitectura modular de 18 archivos siguiendo los patrones v2 del SDK (`@modelcontextprotocol/sdk@1.26.0`).

### Arquitectura

- **Modularizacion** — server.mjs paso de 732 a ~260 lineas. Logica extraida a `lib/` (6 modulos), `tools/` (6 modulos), `auth/`, `resources/`, `prompts/` y `config.mjs`.
- **Per-session transports** — cada cliente recibe su propio `StreamableHTTPServerTransport` + `McpServer`, aislando sesiones completamente. Antes todos los clientes compartian un unico transport.
- **Makefile delegado** — root Makefile delega `tools-up`/`tools-down`/`tools-status` a `tools/mcp-collab/Makefile` via `$(MAKE) -C`.

### Autenticacion

- **Bearer token auth** — middleware `simpleBearerAuth` que valida tokens contra API keys configuradas en `MCP_API_KEYS`. No usa el `requireBearerAuth` del SDK porque ese envia headers OAuth (`WWW-Authenticate: Bearer`) que disparan el flujo completo OAuth en clientes MCP (Inspector, Copilot, etc.).
- **`MCP_ENV` safety check** — el servidor rechaza arrancar si `MCP_API_KEYS` esta vacio y `MCP_ENV` no es `local`. Esto previene deployments accidentales sin autenticacion.
- **Validacion de formato** — `MCP_API_KEYS` se valida al arrancar: detecta falta de `:`, clientId o key vacios, y multiples `:`.

### Variables de entorno

- **`.env` centralizado** — todas las variables viven en un `.env` en la raiz. Make lo carga con `-include .env` + `export`. Node lo carga con `--env-file` cuando se usa `npm start`/`npm run dev`.
- **`.env.example`** — template trackeado en git con todos los valores por defecto.
- **`config.mjs`** — fuente unica de verdad para configuracion en Node. Lee `process.env` con defaults como ultima linea de defensa.

### Tools

- **Tool annotations** — todos los tools declaran `readOnlyHint`, `destructiveHint`, `idempotentHint`. Query/search tools son read-only; `business.rule` es de escritura.
- **Deduplicacion de aliases** — `graph.query` y `architecture.graph.query` (y sus equivalentes de vector search) comparten el mismo handler en vez de duplicar codigo.

### MCP Resources y Prompts

- **Resources**: `collab://config/summary`, `collab://schema/architecture`, `collab://schema/business`.
- **Prompts**: `explore-architecture`, `find-business-rules`, `trace-dependencies`.

### Capabilities

- **Logging** — servidor declara `{ capabilities: { logging: {} } }`, habilitando `server.sendLoggingMessage()` hacia clientes conectados.

### Developer experience

- **`make tools-dev`** — modo desarrollo con `--watch` (reinicio automatico al editar archivos). Ejecuta en foreground.
- **Diagnostico de errores** — cuando `make tools-up` falla, muestra las ultimas 20 lineas del log directamente en terminal.
- **`npm start` / `npm run dev`** — scripts en package.json con carga condicional de `.env`.
- **`CLAUDE.md`** — guia para agentes AI que trabajan en el directorio del MCP.

## [0.2.0] — 2025-12-XX

- `business.rule` tool para ingesta de reglas de negocio en grafo + vectores.
- `business.graph.query` y `business.vector.search` tools.
- Target `tools-down` en Makefile.

## [0.1.0] — 2025-11-XX

- Server MCP inicial con `architecture.graph.query` y `architecture.vector.search`.
- Aliases `graph.query` y `vector.search`.
- Integracion con NebulaGraph y Qdrant.
