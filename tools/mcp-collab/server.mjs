// ---------------------------------------------------------------------------
// MCP Server entrypoint — Express (HTTP) transport
//
// Follows the SDK v2 recommended patterns from:
// https://github.com/modelcontextprotocol/typescript-sdk
// ---------------------------------------------------------------------------

import crypto from 'node:crypto';

// ---------------------------------------------------------------------------
// Global error handlers — catch unhandled promise rejections and exceptions
// so the process doesn't die silently.
// ---------------------------------------------------------------------------

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  process.exit(1);
});

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { isInitializeRequest } from '@modelcontextprotocol/sdk/types.js';
import { createMcpExpressApp } from '@modelcontextprotocol/sdk/server/express.js';
import express from 'express';
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
// Per-session transport store
// ---------------------------------------------------------------------------

/** @type {Record<string, StreamableHTTPServerTransport>} */
const transports = {};

// --- Auth safety check ---
if (!MCP_AUTH_ENABLED && MCP_ENV !== 'local') {
  console.error(
    'FATAL: MCP_API_KEYS is empty and MCP_ENV is not "local".\n' +
    'Either set MCP_API_KEYS to enable authentication, or set MCP_ENV=local ' +
    'to explicitly run without auth in development.'
  );
  process.exit(1);
}

// --- Auth middleware ---
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

// --- Express app setup ---
const app = createMcpExpressApp({
  host: MCP_HOST,
  // When binding to 0.0.0.0 for public access, you may want to
  // add allowedHosts: ['your-domain.com'] for DNS rebinding protection
});

// Note: createMcpExpressApp already applies express.json() (default limit).
// We add a second parser with a 2 MB limit for large business rule payloads.
// Express will use whichever parser matches first; the larger limit takes effect.
app.use(express.json({ limit: '2mb' }));

// --- Health check (unauthenticated) ---
app.get('/health', (_req, res) => {
  res.status(200).send('ok');
});

// --- POST /mcp — initialization and tool calls ---
app.post('/mcp', authMiddleware, async (req, res) => {
  const sessionId = req.headers['mcp-session-id'];

  try {
    if (sessionId && transports[sessionId]) {
      await transports[sessionId].handleRequest(req, res, req.body);
      return;
    }

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

// --- GET /mcp — SSE stream ---
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

// --- DELETE /mcp — session termination ---
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

// --- Start listening ---
app.listen(MCP_PORT, MCP_HOST, () => {
  console.log(`MCP server listening on http://${MCP_HOST}:${MCP_PORT}/mcp (env: ${MCP_ENV || 'undefined'})`);
  if (MCP_AUTH_ENABLED) {
    console.log('Bearer token authentication is ENABLED');
  } else {
    console.log('Authentication is DISABLED (MCP_ENV=local)');
  }
});

// --- Graceful shutdown ---
const shutdown = async (signal) => {
  console.log(`${signal} received, shutting down MCP server...`);
  for (const sid of Object.keys(transports)) {
    try {
      await transports[sid].close();
      delete transports[sid];
    } catch (err) {
      console.error(`Error closing session ${sid}:`, err);
    }
  }
  try {
    const { closeAllPools } = await import('./lib/nebula.mjs');
    await closeAllPools();
  } catch { /* Nebula may not have been used */ }
  process.exit(0);
};

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
