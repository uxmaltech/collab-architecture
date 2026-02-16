// ---------------------------------------------------------------------------
// MCP Server entrypoint — Express + per-session transports + auth
//
// Follows the SDK v2 recommended patterns from:
// https://github.com/modelcontextprotocol/typescript-sdk
// ---------------------------------------------------------------------------

import crypto from 'node:crypto';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { isInitializeRequest } from '@modelcontextprotocol/sdk/types.js';
import { MCP_PORT, MCP_HOST, MCP_AUTH_ENABLED, MCP_ENV } from './config.mjs';
import { tokenVerifier } from './auth/token-verifier.mjs';
import { registerAllTools } from './tools/index.mjs';
import { registerAllResources } from './resources/index.mjs';
import { registerAllPrompts } from './prompts/index.mjs';

// ---------------------------------------------------------------------------
// Server factory — creates a fully configured McpServer per session
// ---------------------------------------------------------------------------

function createMcpServer() {
  const server = new McpServer(
    { name: 'collab-architecture-mcp', version: '0.3.0' },
    { capabilities: { logging: {} } }
  );
  registerAllTools(server);
  registerAllResources(server);
  registerAllPrompts(server);
  return server;
}

// ---------------------------------------------------------------------------
// Per-session transport management
// ---------------------------------------------------------------------------

/** @type {Record<string, StreamableHTTPServerTransport>} */
const transports = {};

// ---------------------------------------------------------------------------
// Auth safety check — refuse to start without auth unless MCP_ENV=local
// ---------------------------------------------------------------------------

if (!MCP_AUTH_ENABLED && MCP_ENV !== 'local') {
  console.error(
    'FATAL: MCP_API_KEYS is empty and MCP_ENV is not "local".\n' +
    'Either set MCP_API_KEYS to enable authentication, or set MCP_ENV=local ' +
    'to explicitly run without auth in development.'
  );
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Auth middleware — enabled when MCP_API_KEYS is set, passthrough in local
// ---------------------------------------------------------------------------

// Custom Bearer middleware — validates API keys without triggering the
// SDK's full OAuth 2.0 flow (which expects /register, /authorize, etc.).
function simpleBearerAuth(verifier) {
  return async (req, res, next) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader) {
        return res.status(401).json({ error: 'Missing Authorization header' });
      }
      const [type, token] = authHeader.split(' ');
      if (type.toLowerCase() !== 'bearer' || !token) {
        return res.status(401).json({ error: "Invalid Authorization header, expected 'Bearer TOKEN'" });
      }
      req.auth = await verifier.verifyAccessToken(token);
      next();
    } catch (err) {
      return res.status(401).json({ error: err.message || 'Authentication failed' });
    }
  };
}

const authMiddleware = MCP_AUTH_ENABLED
  ? simpleBearerAuth(tokenVerifier)
  : (_req, _res, next) => next();

// ---------------------------------------------------------------------------
// Express app setup
//
// createMcpExpressApp provides DNS rebinding protection automatically
// when host is 127.0.0.1 / localhost.
// ---------------------------------------------------------------------------

const { createMcpExpressApp } = await import('@modelcontextprotocol/sdk/server/express.js');
const express = (await import('express')).default;

const app = createMcpExpressApp({
  host: MCP_HOST,
  // When binding to 0.0.0.0 for public access, you may want to
  // add allowedHosts: ['your-domain.com'] for DNS rebinding protection
});

// Note: createMcpExpressApp already applies express.json() (default limit).
// We add a second parser with a 2 MB limit for large business rule payloads.
// Express will use whichever parser matches first; the larger limit takes effect.
app.use(express.json({ limit: '2mb' }));

// ---------------------------------------------------------------------------
// Health check — unauthenticated
// ---------------------------------------------------------------------------

app.get('/health', (_req, res) => {
  res.status(200).send('ok');
});

// ---------------------------------------------------------------------------
// POST /mcp — handles initialization and tool calls
// ---------------------------------------------------------------------------

app.post('/mcp', authMiddleware, async (req, res) => {
  const sessionId = req.headers['mcp-session-id'];

  try {
    // --- Existing session: reuse transport ---
    if (sessionId && transports[sessionId]) {
      await transports[sessionId].handleRequest(req, res, req.body);
      return;
    }

    // --- New session: must be an initialize request ---
    if (!sessionId && isInitializeRequest(req.body)) {
      const transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: () => crypto.randomUUID(),
        onsessioninitialized: (sid) => {
          console.log(`Session initialized: ${sid}`);
          transports[sid] = transport;
        }
      });

      transport.onclose = () => {
        const sid = transport.sessionId;
        if (sid && transports[sid]) {
          console.log(`Session closed: ${sid}`);
          delete transports[sid];
        }
      };

      const server = createMcpServer();
      await server.connect(transport);
      await transport.handleRequest(req, res, req.body);
      return;
    }

    // --- Invalid request ---
    res.status(400).json({
      jsonrpc: '2.0',
      error: { code: -32000, message: 'Bad Request: No valid session ID or not an initialize request' },
      id: null
    });
  } catch (err) {
    console.error('Error handling MCP POST:', err);
    if (!res.headersSent) {
      res.status(500).json({
        jsonrpc: '2.0',
        error: { code: -32603, message: 'Internal server error' },
        id: null
      });
    }
  }
});

// ---------------------------------------------------------------------------
// GET /mcp — SSE stream for server-initiated messages
// ---------------------------------------------------------------------------

app.get('/mcp', authMiddleware, async (req, res) => {
  const sessionId = req.headers['mcp-session-id'];
  if (!sessionId || !transports[sessionId]) {
    res.status(400).json({
      jsonrpc: '2.0',
      error: { code: -32000, message: 'Invalid or missing session ID' },
      id: null
    });
    return;
  }
  try {
    await transports[sessionId].handleRequest(req, res);
  } catch (err) {
    console.error('Error handling MCP GET:', err);
    if (!res.headersSent) {
      res.status(500).send('Error processing SSE stream');
    }
  }
});

// ---------------------------------------------------------------------------
// DELETE /mcp — session termination
// ---------------------------------------------------------------------------

app.delete('/mcp', authMiddleware, async (req, res) => {
  const sessionId = req.headers['mcp-session-id'];
  if (!sessionId || !transports[sessionId]) {
    res.status(400).json({
      jsonrpc: '2.0',
      error: { code: -32000, message: 'Invalid or missing session ID' },
      id: null
    });
    return;
  }
  try {
    await transports[sessionId].handleRequest(req, res);
  } catch (err) {
    console.error('Error handling MCP DELETE:', err);
    if (!res.headersSent) {
      res.status(500).send('Error processing session termination');
    }
  }
});

// ---------------------------------------------------------------------------
// Start listening
// ---------------------------------------------------------------------------

app.listen(MCP_PORT, MCP_HOST, () => {
  console.log(`MCP server listening on http://${MCP_HOST}:${MCP_PORT}/mcp (env: ${MCP_ENV || 'undefined'})`);
  if (MCP_AUTH_ENABLED) {
    console.log('Bearer token authentication is ENABLED');
  } else {
    console.log('Authentication is DISABLED (MCP_ENV=local)');
  }
});

// ---------------------------------------------------------------------------
// Graceful shutdown
// ---------------------------------------------------------------------------

process.on('SIGINT', async () => {
  console.log('Shutting down MCP server...');
  for (const sid of Object.keys(transports)) {
    try {
      await transports[sid].close();
      delete transports[sid];
    } catch (err) {
      console.error(`Error closing session ${sid}:`, err);
    }
  }
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('Received SIGTERM, shutting down...');
  for (const sid of Object.keys(transports)) {
    try {
      await transports[sid].close();
      delete transports[sid];
    } catch (err) {
      console.error(`Error closing session ${sid}:`, err);
    }
  }
  process.exit(0);
});
