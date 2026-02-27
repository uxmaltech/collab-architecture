// ---------------------------------------------------------------------------
// Environment configuration — single source of truth for all settings
// ---------------------------------------------------------------------------

export const QDRANT_URL = (process.env.QDRANT_URL || 'http://localhost:6333').replace(/\/$/, '');
export const QDRANT_API_KEY = process.env.QDRANT_API_KEY || '';

// Embeddings V2
export const EMBED_DIM = parseInt(process.env.EMBED_DIM || process.env.QDRANT_VECTOR_SIZE || '1536', 10);
export const EMBED_PROVIDER_DEFAULT = (process.env.MCP_ENV || '').toLowerCase() === 'local' ? 'deterministic' : 'gemini';
export const EMBED_PROVIDER = (process.env.EMBED_PROVIDER || EMBED_PROVIDER_DEFAULT).toLowerCase();
export const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
export const GEMINI_EMBED_MODEL = process.env.GEMINI_EMBED_MODEL || 'gemini-embedding-001';
export const GEMINI_BASE_URL = (process.env.GEMINI_BASE_URL || 'https://generativelanguage.googleapis.com/v1beta').replace(/\/$/, '');
export const GEMINI_MAX_BATCH = parseInt(process.env.GEMINI_MAX_BATCH || '32', 10);
export const GITHUB_TOKEN = process.env.GITHUB_TOKEN || '';
export const QDRANT_COLLECTION_INGEST_CURSORS = process.env.QDRANT_COLLECTION_INGEST_CURSORS || 'ingest-cursors';

const rawEmbeddingPrice = process.env.EMBED_PRICE_PER_1M_TOKENS;
export const EMBED_PRICE_PER_1M_TOKENS = rawEmbeddingPrice == null || rawEmbeddingPrice === ''
  ? null
  : parseFloat(rawEmbeddingPrice);

if (EMBED_PRICE_PER_1M_TOKENS != null && (!Number.isFinite(EMBED_PRICE_PER_1M_TOKENS) || EMBED_PRICE_PER_1M_TOKENS < 0)) {
  console.error(
    `FATAL: Invalid EMBED_PRICE_PER_1M_TOKENS "${rawEmbeddingPrice}". ` +
      'Use a non-negative decimal value (example: 0.13).'
  );
  process.exit(1);
}

if (!['gemini', 'deterministic'].includes(EMBED_PROVIDER)) {
  console.error(
    `FATAL: Unsupported EMBED_PROVIDER "${EMBED_PROVIDER}". ` +
      'Valid values: gemini, deterministic.'
  );
  process.exit(1);
}

// Backward compatibility alias — older modules reference VECTOR_SIZE
export const VECTOR_SIZE = EMBED_DIM;

// V1 collections (legacy)
export const ARCH_COLLECTION = process.env.ARCH_COLLECTION || process.env.QDRANT_COLLECTION || 'collab-architecture-canon';
export const BUSINESS_COLLECTION = process.env.BUSINESS_COLLECTION || 'business-architecture-canon';

// V2 technical scopes (env-driven, extensible)
// MCP_TECHNICAL_SCOPES: comma-separated scope names (default: uxmaltech)
// Each scope resolves to env QDRANT_COLLECTION_TECHNICAL_{SCOPE_UPPER} or defaults to technical-{scope}
const rawTechnicalScopes = (process.env.MCP_TECHNICAL_SCOPES || 'uxmaltech')
  .split(',').map(s => s.trim().toLowerCase()).filter(Boolean);

export const TECHNICAL_SCOPES = Object.fromEntries(
  rawTechnicalScopes.map(scope => {
    const envKey = `QDRANT_COLLECTION_TECHNICAL_${scope.toUpperCase()}`;
    const collection = process.env[envKey] || `technical-${scope}`;
    return [scope, collection];
  })
);

// V2 collections
export const QDRANT_COLLECTION_BUSINESS = process.env.QDRANT_COLLECTION_BUSINESS || 'business-rules';

export const NEBULA_CONSOLE_IMAGE = process.env.NEBULA_CONSOLE_IMAGE || 'vesoft/nebula-console:v3.6.0';
export const NEBULA_NETWORK = process.env.NEBULA_NETWORK || 'collab-architecture_default';
export const NEBULA_ADDR = process.env.NEBULA_ADDR || 'graphd';
export const NEBULA_PORT = process.env.NEBULA_PORT || '9669';
export const NEBULA_USER = process.env.NEBULA_USER || 'root';
export const NEBULA_PASSWORD = process.env.NEBULA_PASSWORD || 'nebula';

// V2 spaces
export const NEBULA_SPACE_TECHNICAL = process.env.NEBULA_SPACE_TECHNICAL || 'technical_architecture';
export const NEBULA_SPACE_BUSINESS = process.env.NEBULA_SPACE_BUSINESS || 'business_architecture';

// V1 spaces (legacy aliases)
export const ARCH_SPACE = process.env.ARCH_SPACE || process.env.NEBULA_SPACE || NEBULA_SPACE_TECHNICAL;
export const BUSINESS_SPACE = process.env.BUSINESS_SPACE || NEBULA_SPACE_BUSINESS;

export const INDEX_VERSION = process.env.INDEX_VERSION || 'v2';

export const MCP_PORT = parseInt(process.env.MCP_PORT || '7337', 10);
export const MCP_HOST = process.env.MCP_HOST || '127.0.0.1';
export const ENABLE_V1_TOOLS = (process.env.ENABLE_V1_TOOLS || 'false').toLowerCase() === 'true';

export const CONFIDENCE_LEVELS = ['experimental', 'provisional', 'verified', 'deprecated'];

// Environment — 'local' allows running without auth, any other value requires MCP_API_KEYS
export const MCP_ENV = (process.env.MCP_ENV || '').toLowerCase();

// Auth — API keys in format 'clientId1:key1,clientId2:key2'
const rawApiKeys = process.env.MCP_API_KEYS || '';

// Validate MCP_API_KEYS format if provided
if (rawApiKeys) {
  const entries = rawApiKeys.split(',').filter(Boolean);
  for (const entry of entries) {
    if (!entry.includes(':')) {
      console.error(
        `FATAL: Invalid MCP_API_KEYS format.\n` +
          `Invalid entry: "${entry}"\n` +
          `Expected format: "clientId:key" (e.g., "test:mysecretkey")\n` +
          `Multiple keys: "client1:key1,client2:key2"`
      );
      process.exit(1);
    }
    const [clientId, key] = entry.split(':');
    if (!clientId || !key) {
      console.error(
        `FATAL: Invalid MCP_API_KEYS format.\n` +
          `Entry has empty clientId or key: "${entry}"\n` +
          `Both clientId and key must be non-empty.\n` +
          `Example: "test:mysecretkey"`
      );
      process.exit(1);
    }
    if (entry.split(':').length > 2) {
      console.error(
        `FATAL: Invalid MCP_API_KEYS format.\n` +
          `Entry contains multiple colons: "${entry}"\n` +
          `Format must be: "clientId:key" (single colon only)\n` +
          `If your key contains special characters, ensure it doesn't include ':'`
      );
      process.exit(1);
    }
  }
}

export const MCP_API_KEYS = rawApiKeys
  .split(',')
  .filter(Boolean)
  .map((entry) => {
    const [clientId, key] = entry.split(':');
    return { clientId, key, scopes: [] };
  });
export const MCP_AUTH_ENABLED = MCP_API_KEYS.length > 0;
