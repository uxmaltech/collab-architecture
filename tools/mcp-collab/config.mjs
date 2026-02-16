// ---------------------------------------------------------------------------
// Environment configuration — single source of truth for all settings
// ---------------------------------------------------------------------------

export const QDRANT_URL = (process.env.QDRANT_URL || 'http://localhost:6333').replace(/\/$/, '');
export const ARCH_COLLECTION = process.env.ARCH_COLLECTION || process.env.QDRANT_COLLECTION || 'collab-architecture-canon';
export const BUSINESS_COLLECTION = process.env.BUSINESS_COLLECTION || 'business-architecture-canon';
export const VECTOR_SIZE = parseInt(process.env.QDRANT_VECTOR_SIZE || '1536', 10);

export const NEBULA_CONSOLE_IMAGE = process.env.NEBULA_CONSOLE_IMAGE || 'vesoft/nebula-console:v3.6.0';
export const NEBULA_NETWORK = process.env.NEBULA_NETWORK || 'collab-architecture_default';
export const NEBULA_ADDR = process.env.NEBULA_ADDR || 'graphd';
export const NEBULA_PORT = process.env.NEBULA_PORT || '9669';
export const NEBULA_USER = process.env.NEBULA_USER || 'root';
export const NEBULA_PASSWORD = process.env.NEBULA_PASSWORD || 'nebula';
export const ARCH_SPACE = process.env.ARCH_SPACE || process.env.NEBULA_SPACE || 'collab_architecture';
export const BUSINESS_SPACE = process.env.BUSINESS_SPACE || 'business_architecture';

export const MCP_PORT = parseInt(process.env.MCP_PORT || '7337', 10);
export const MCP_HOST = process.env.MCP_HOST || '127.0.0.1';

export const CONFIDENCE_LEVELS = ['experimental', 'provisional', 'verified', 'deprecated'];

// Environment — 'local' allows running without auth, any other value requires MCP_API_KEYS
export const MCP_ENV = (process.env.MCP_ENV || '').toLowerCase();

// Auth — API keys in format 'clientId1:key1,clientId2:key2'
export const MCP_API_KEYS = (process.env.MCP_API_KEYS || '')
  .split(',')
  .filter(Boolean)
  .map((entry) => {
    const [clientId, key] = entry.split(':');
    return { clientId, key, scopes: [] };
  });
export const MCP_AUTH_ENABLED = MCP_API_KEYS.length > 0;
