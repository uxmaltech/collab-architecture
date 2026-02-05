import * as z from 'zod/v4';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { createServer } from 'node:http';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';

const QDRANT_URL = (process.env.QDRANT_URL || 'http://localhost:6333').replace(/\/$/, '');
const ARCH_COLLECTION = process.env.ARCH_COLLECTION || process.env.QDRANT_COLLECTION || 'collab-architecture-canon';
const BUSINESS_COLLECTION = process.env.BUSINESS_COLLECTION || 'business-architecture-canon';
const VECTOR_SIZE = parseInt(process.env.QDRANT_VECTOR_SIZE || '1536', 10);

const NEBULA_CONSOLE_IMAGE = process.env.NEBULA_CONSOLE_IMAGE || 'vesoft/nebula-console:v3.6.0';
const NEBULA_NETWORK = process.env.NEBULA_NETWORK || 'collab-architecture_default';
const NEBULA_ADDR = process.env.NEBULA_ADDR || 'graphd';
const NEBULA_PORT = process.env.NEBULA_PORT || '9669';
const NEBULA_USER = process.env.NEBULA_USER || 'root';
const NEBULA_PASSWORD = process.env.NEBULA_PASSWORD || 'nebula';
const ARCH_SPACE = process.env.ARCH_SPACE || process.env.NEBULA_SPACE || 'collab_architecture';
const BUSINESS_SPACE = process.env.BUSINESS_SPACE || 'business_architecture';

const MCP_PORT = parseInt(process.env.MCP_PORT || '7337', 10);
const MCP_HOST = process.env.MCP_HOST || '127.0.0.1';

const server = new McpServer({
  name: 'collab-architecture-mcp',
  version: '0.2.0'
});

const CONFIDENCE_LEVELS = ['experimental', 'provisional', 'verified', 'deprecated'];

function nowDate() {
  return new Date().toISOString().slice(0, 10);
}

function embedDeterministic(text, dim = VECTOR_SIZE) {
  const hash = crypto.createHash('sha256').update(text, 'utf8').digest();
  const bytes = Array.from(hash);
  const vector = [];
  while (vector.length < dim) {
    for (const b of bytes) {
      vector.push(b / 255.0);
      if (vector.length >= dim) break;
    }
  }
  return vector;
}

function normalizePointId(pointId) {
  if (typeof pointId === 'number') return pointId;
  if (typeof pointId === 'string') {
    const digest = crypto.createHash('sha256').update(pointId, 'utf8').digest('hex');
    return parseInt(digest.slice(0, 16), 16);
  }
  const digest = crypto.createHash('sha256').update(String(pointId), 'utf8').digest('hex');
  return parseInt(digest.slice(0, 16), 16);
}

function escapeNebula(value) {
  return String(value)
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r')
    .replace(/\t/g, '\\t');
}

function cleanNebulaOutput(output) {
  return output
    .split('\n')
    .filter((line) => !line.startsWith('(root@nebula)'))
    .filter((line) => line.trim() !== 'Bye root!')
    .join('\n')
    .trim();
}

function runNebulaQuery(query) {
  const args = [
    'run',
    '--rm',
    '--network',
    NEBULA_NETWORK,
    NEBULA_CONSOLE_IMAGE,
    '-u',
    NEBULA_USER,
    '-p',
    NEBULA_PASSWORD,
    '-addr',
    NEBULA_ADDR,
    '-port',
    NEBULA_PORT,
    '-e',
    query
  ];
  const result = spawnSync('docker', args, { encoding: 'utf8' });
  if (result.error) {
    throw new Error(result.error.message);
  }
  if (result.status !== 0) {
    throw new Error(result.stderr || result.stdout || `docker exited ${result.status}`);
  }
  return cleanNebulaOutput(result.stdout || '');
}

async function ensureCollection(collection) {
  const res = await fetch(`${QDRANT_URL}/collections/${collection}`);
  if (res.status === 200) {
    const json = await res.json();
    const size = json?.result?.config?.params?.vectors?.size;
    if (size && parseInt(size, 10) !== VECTOR_SIZE) {
      throw new Error(
        `Collection ${collection} has vector size ${size}, expected ${VECTOR_SIZE}. ` +
          'Update QDRANT_VECTOR_SIZE or recreate the collection.'
      );
    }
    return;
  }
  if (res.status !== 404) {
    const text = await res.text();
    throw new Error(`Qdrant error: ${res.status} ${text}`);
  }
  const createRes = await fetch(`${QDRANT_URL}/collections/${collection}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      vectors: {
        size: VECTOR_SIZE,
        distance: 'Cosine'
      }
    })
  });
  if (!createRes.ok) {
    const text = await createRes.text();
    throw new Error(`Failed to create collection ${collection}: ${text}`);
  }
}

async function qdrantSearch({ query, limit = 5, filter = null, collection }) {
  const vector = embedDeterministic(query, VECTOR_SIZE);
  const body = {
    vector,
    limit: Math.min(Math.max(limit, 1), 50),
    with_payload: true,
    with_vectors: false
  };
  if (filter) body.filter = filter;

  const res = await fetch(`${QDRANT_URL}/collections/${collection}/points/search`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  const json = await res.json();
  if (!res.ok) {
    const msg = json?.status?.error || JSON.stringify(json);
    throw new Error(`Qdrant error: ${res.status} ${msg}`);
  }
  return json.result || [];
}

async function qdrantUpsert({ points, collection }) {
  if (!points.length) return;
  const res = await fetch(`${QDRANT_URL}/collections/${collection}/points?wait=true`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ points })
  });
  const json = await res.json();
  if (!res.ok) {
    const msg = json?.status?.error || JSON.stringify(json);
    throw new Error(`Qdrant error: ${res.status} ${msg}`);
  }
  return json;
}

function splitParagraphs(text) {
  return text
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);
}

function estimateTokens(text) {
  return Math.max(1, text.split(/\s+/).length);
}

function chunkText(text, targetTokens = 350, overlapTokens = 40) {
  const paragraphs = splitParagraphs(text);
  const chunks = [];
  let current = [];
  let currentTokens = 0;

  for (const para of paragraphs) {
    const paraTokens = estimateTokens(para);
    if (currentTokens + paraTokens > targetTokens && current.length) {
      const chunk = current.join('\n\n');
      chunks.push(chunk);
      const overlap = chunk.split(/\s+/).slice(-overlapTokens).join(' ');
      current = overlap ? [overlap, para] : [para];
      currentTokens = estimateTokens(current.join(' '));
    } else {
      current.push(para);
      currentTokens += paraTokens;
    }
  }

  if (current.length) {
    chunks.push(current.join('\n\n'));
  }
  return chunks;
}

function extractSectionKey(title) {
  const normalized = title.toLowerCase();
  if (normalized.includes('domain')) return 'domains';
  if (normalized.includes('capabil')) return 'capabilities';
  if (normalized.includes('command')) return 'commands';
  if (normalized.includes('query')) return 'queries';
  if (normalized.includes('entity')) return 'entities';
  if (normalized.includes('rule')) return 'rules';
  return null;
}

function parseBusinessMarkdown(markdown) {
  const result = {
    domains: [],
    capabilities: [],
    commands: [],
    queries: [],
    entities: [],
    rules: []
  };
  let currentKey = null;
  const lines = markdown.split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('#')) {
      const heading = trimmed.replace(/^#+\s*/, '').trim();
      currentKey = extractSectionKey(heading);
      continue;
    }
    const match = trimmed.match(/^[-*+]\s+(.+)$/);
    if (match && currentKey) {
      const item = match[1].trim();
      if (item) result[currentKey].push(item);
    }
  }
  return result;
}

function uniqueList(values) {
  const seen = new Set();
  const out = [];
  for (const value of values) {
    const normalized = value.trim();
    if (!normalized) continue;
    const key = normalized.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(normalized);
  }
  return out;
}

function makeId(prefix, ...parts) {
  const base = parts.filter(Boolean).join('|');
  const digest = crypto.createHash('sha1').update(base, 'utf8').digest('hex').slice(0, 12).toUpperCase();
  return `${prefix}-${digest}`;
}

function buildInsertNodes(nodes, confidence) {
  if (!nodes.length) return null;
  const date = nowDate();
  const values = nodes.map((node) => {
    const summary = node.summary || node.name;
    const content = node.content || '';
    return `"${escapeNebula(node.id)}":(\"${escapeNebula(node.node_type)}\", \"${escapeNebula(node.name)}\", \"${escapeNebula(summary)}\", \"${escapeNebula(content)}\", \"active\", \"${escapeNebula(confidence)}\", \"v1.0.0\", \"${date}\", \"${date}\")`;
  });
  return `INSERT VERTEX Node(node_type, name, summary, content, status, confidence, version, created, updated) VALUES ${values.join(', ')};`;
}

function buildInsertEdges(edgeType, edges, confidence) {
  if (!edges.length) return null;
  const date = nowDate();
  const values = edges.map((edge) => {
    const rationale = edge.rationale || '';
    return `"${escapeNebula(edge.from)}"->"${escapeNebula(edge.to)}":(\"${escapeNebula(rationale)}\", \"${escapeNebula(confidence)}\", \"${date}\", \"${date}\")`;
  });
  return `INSERT EDGE ${edgeType}(rationale, confidence, created, updated) VALUES ${values.join(', ')};`;
}

async function ensureBusinessSchema() {
  const statements = [
    `CREATE SPACE IF NOT EXISTS ${BUSINESS_SPACE}(vid_type=FIXED_STRING(32), partition_num=1, replica_factor=1);`,
    `USE ${BUSINESS_SPACE};`,
    'CREATE TAG IF NOT EXISTS Node(node_type string, name string, summary string, content string, status string, confidence string, version string, created string, updated string);',
    'CREATE EDGE IF NOT EXISTS APPLIES_TO(rationale string, confidence string, created string, updated string);',
    'CREATE EDGE IF NOT EXISTS IMPLEMENTS(rationale string, confidence string, created string, updated string);',
    'CREATE EDGE IF NOT EXISTS DEPENDS_ON(rationale string, confidence string, created string, updated string);',
    'CREATE EDGE IF NOT EXISTS DEFINED_IN(rationale string, confidence string, created string, updated string);',
    'CREATE EDGE IF NOT EXISTS OWNS(rationale string, confidence string, created string, updated string);',
    'CREATE EDGE IF NOT EXISTS USES_ENTITY(rationale string, confidence string, created string, updated string);'
  ];
  runNebulaQuery(statements.join('\n'));
}

function ensureConfidence(value) {
  if (!value) return 'provisional';
  if (CONFIDENCE_LEVELS.includes(value)) return value;
  return 'provisional';
}

server.registerTool(
  'architecture.graph.query',
  {
    title: 'Architecture Graph Query',
    description: 'Execute nGQL against the technical canon graph space.',
    inputSchema: {
      query: z.string().describe('nGQL query to execute')
    }
  },
  async ({ query }) => {
    const finalQuery = `USE ${ARCH_SPACE};\n${query.trim()}`;
    const output = runNebulaQuery(finalQuery);
    return { content: [{ type: 'text', text: output || '(no output)' }] };
  }
);

server.registerTool(
  'business.graph.query',
  {
    title: 'Business Graph Query',
    description: 'Execute nGQL against the business architecture graph space.',
    inputSchema: {
      query: z.string().describe('nGQL query to execute')
    }
  },
  async ({ query }) => {
    const finalQuery = `USE ${BUSINESS_SPACE};\n${query.trim()}`;
    const output = runNebulaQuery(finalQuery);
    return { content: [{ type: 'text', text: output || '(no output)' }] };
  }
);

server.registerTool(
  'architecture.vector.search',
  {
    title: 'Architecture Vector Search',
    description: 'Search the technical canon vector collection.',
    inputSchema: {
      query: z.string().describe('Search text to embed and query'),
      limit: z.number().int().min(1).max(50).optional().describe('Max results, default 5'),
      filter: z.any().optional().describe('Optional Qdrant filter object')
    }
  },
  async ({ query, limit, filter }) => {
    const results = await qdrantSearch({ query, limit, filter, collection: ARCH_COLLECTION });
    return { content: [{ type: 'text', text: JSON.stringify(results, null, 2) }] };
  }
);

server.registerTool(
  'business.vector.search',
  {
    title: 'Business Vector Search',
    description: 'Search the business architecture vector collection.',
    inputSchema: {
      query: z.string().describe('Search text to embed and query'),
      limit: z.number().int().min(1).max(50).optional().describe('Max results, default 5'),
      filter: z.any().optional().describe('Optional Qdrant filter object')
    }
  },
  async ({ query, limit, filter }) => {
    const results = await qdrantSearch({ query, limit, filter, collection: BUSINESS_COLLECTION });
    return { content: [{ type: 'text', text: JSON.stringify(results, null, 2) }] };
  }
);

// Backwards-compatible aliases
server.registerTool(
  'graph.query',
  {
    title: 'Graph Query (Alias)',
    description: 'Alias for architecture.graph.query.',
    inputSchema: {
      query: z.string().describe('nGQL query to execute')
    }
  },
  async ({ query }) => {
    const finalQuery = `USE ${ARCH_SPACE};\n${query.trim()}`;
    const output = runNebulaQuery(finalQuery);
    return { content: [{ type: 'text', text: output || '(no output)' }] };
  }
);

server.registerTool(
  'vector.search',
  {
    title: 'Vector Search (Alias)',
    description: 'Alias for architecture.vector.search.',
    inputSchema: {
      query: z.string().describe('Search text to embed and query'),
      limit: z.number().int().min(1).max(50).optional().describe('Max results, default 5'),
      filter: z.any().optional().describe('Optional Qdrant filter object')
    }
  },
  async ({ query, limit, filter }) => {
    const results = await qdrantSearch({ query, limit, filter, collection: ARCH_COLLECTION });
    return { content: [{ type: 'text', text: JSON.stringify(results, null, 2) }] };
  }
);

server.registerTool(
  'business.rule',
  {
    title: 'Business Rule Ingestion',
    description: 'Ingest business context Markdown into the business vector collection and graph space.',
    inputSchema: {
      repo: z.string().describe('Source repo or system'),
      domain: z.string().optional().describe('Business domain name'),
      markdown: z.string().describe('Markdown content describing business context'),
      tags: z.array(z.string()).optional().describe('Optional tags'),
      confidence: z.enum(CONFIDENCE_LEVELS).optional().describe('Confidence level'),
      capabilities: z.array(z.string()).optional(),
      commands: z.array(z.string()).optional(),
      queries: z.array(z.string()).optional(),
      entities: z.array(z.string()).optional(),
      rules: z.array(z.string()).optional()
    }
  },
  async ({ repo, domain, markdown, tags, confidence, capabilities, commands, queries, entities, rules }) => {
    const parsed = parseBusinessMarkdown(markdown);
    const mergedDomains = uniqueList([domain || '', ...parsed.domains]);
    const mergedCapabilities = uniqueList([...(capabilities || []), ...parsed.capabilities]);
    const mergedCommands = uniqueList([...(commands || []), ...parsed.commands]);
    const mergedQueries = uniqueList([...(queries || []), ...parsed.queries]);
    const mergedEntities = uniqueList([...(entities || []), ...parsed.entities]);
    const mergedRules = uniqueList([...(rules || []), ...parsed.rules]);

    if (!mergedRules.length) {
      const fallback = markdown.split(/\n/).find((line) => line.trim()) || markdown.trim();
      if (fallback) mergedRules.push(fallback.slice(0, 240));
    }

    const activeDomain = mergedDomains[0] || 'General';
    const confidenceLevel = ensureConfidence(confidence);
    const date = nowDate();
    const tagList = uniqueList(tags || []);

    await ensureCollection(BUSINESS_COLLECTION);
    let schemaReady = false;
    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        ensureBusinessSchema();
        schemaReady = true;
        break;
      } catch (err) {
        if (attempt === 2) throw err;
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }
    if (!schemaReady) {
      throw new Error('Business schema is not ready.');
    }

    const nodes = [];
    const edgesByType = {
      APPLIES_TO: [],
      DEFINED_IN: [],
      IMPLEMENTS: [],
      DEPENDS_ON: [],
      OWNS: [],
      USES_ENTITY: []
    };

    const repoId = makeId('BREPO', repo);
    nodes.push({
      id: repoId,
      node_type: 'Repository',
      name: repo,
      summary: `Business context source: ${repo}`,
      content: `repo=${repo}`
    });

    const domainId = makeId('BDOM', activeDomain);
    nodes.push({
      id: domainId,
      node_type: 'Domain',
      name: activeDomain,
      summary: `Business domain ${activeDomain}`,
      content: `repo=${repo};tags=${tagList.join(',')}`
    });

    for (const capability of mergedCapabilities) {
      const capabilityId = makeId('BCAP', repo, activeDomain, capability);
      nodes.push({
        id: capabilityId,
        node_type: 'Capability',
        name: capability,
        summary: capability,
        content: `repo=${repo};domain=${activeDomain}`
      });
      edgesByType.OWNS.push({
        from: capabilityId,
        to: domainId,
        rationale: 'Capability owned by domain.'
      });
    }

    for (const command of mergedCommands) {
      const commandId = makeId('BCMD', repo, activeDomain, command);
      nodes.push({
        id: commandId,
        node_type: 'Command',
        name: command,
        summary: command,
        content: `repo=${repo};domain=${activeDomain}`
      });
      if (mergedCapabilities.length) {
        const capabilityId = makeId('BCAP', repo, activeDomain, mergedCapabilities[0]);
        edgesByType.IMPLEMENTS.push({
          from: commandId,
          to: capabilityId,
          rationale: 'Command implements capability.'
        });
      }
      for (const entity of mergedEntities) {
        const entityId = makeId('BENT', repo, activeDomain, entity);
        edgesByType.USES_ENTITY.push({
          from: commandId,
          to: entityId,
          rationale: 'Command uses entity.'
        });
      }
    }

    for (const queryItem of mergedQueries) {
      const queryId = makeId('BQR', repo, activeDomain, queryItem);
      nodes.push({
        id: queryId,
        node_type: 'Query',
        name: queryItem,
        summary: queryItem,
        content: `repo=${repo};domain=${activeDomain}`
      });
      if (mergedCapabilities.length) {
        const capabilityId = makeId('BCAP', repo, activeDomain, mergedCapabilities[0]);
        edgesByType.IMPLEMENTS.push({
          from: queryId,
          to: capabilityId,
          rationale: 'Query implements capability.'
        });
      }
      for (const entity of mergedEntities) {
        const entityId = makeId('BENT', repo, activeDomain, entity);
        edgesByType.USES_ENTITY.push({
          from: queryId,
          to: entityId,
          rationale: 'Query uses entity.'
        });
      }
    }

    for (const entity of mergedEntities) {
      const entityId = makeId('BENT', repo, activeDomain, entity);
      nodes.push({
        id: entityId,
        node_type: 'Entity',
        name: entity,
        summary: entity,
        content: `repo=${repo};domain=${activeDomain}`
      });
    }

    for (const rule of mergedRules) {
      const ruleId = makeId('BR', repo, activeDomain, rule);
      nodes.push({
        id: ruleId,
        node_type: 'BusinessRule',
        name: rule.slice(0, 120),
        summary: rule.slice(0, 240),
        content: `repo=${repo};domain=${activeDomain};rule=${rule}`
      });
      edgesByType.APPLIES_TO.push({
        from: ruleId,
        to: domainId,
        rationale: 'Business rule applies to domain.'
      });
      edgesByType.DEFINED_IN.push({
        from: ruleId,
        to: repoId,
        rationale: 'Business rule defined in repository.'
      });
    }

    const nodeInsert = buildInsertNodes(nodes, confidenceLevel);
    const edgeStatements = Object.entries(edgesByType)
      .map(([edgeType, edges]) => buildInsertEdges(edgeType, edges, confidenceLevel))
      .filter(Boolean);

    const nebulaStatements = [
      `USE ${BUSINESS_SPACE};`,
      nodeInsert,
      ...edgeStatements
    ].filter(Boolean);

    runNebulaQuery(nebulaStatements.join('\n'));

    const chunks = chunkText(markdown);
    const points = chunks.map((chunk, idx) => {
      const id = `BUSINESS:${repo}:${activeDomain}:${idx}`;
      return {
        id: normalizePointId(id),
        vector: embedDeterministic(chunk, VECTOR_SIZE),
        payload: {
          repo,
          domain: activeDomain,
          tags: tagList,
          type: 'business_rule',
          chunk_index: idx,
          text: chunk,
          confidence: confidenceLevel,
          created: date,
          updated: date
        }
      };
    });

    await qdrantUpsert({ points, collection: BUSINESS_COLLECTION });

    const edgeCount = Object.values(edgesByType).reduce((acc, edges) => acc + edges.length, 0);
    const summary = {
      repo,
      domain: activeDomain,
      nodes: nodes.length,
      edges: edgeCount,
      vector_chunks: points.length,
      business_space: BUSINESS_SPACE,
      business_collection: BUSINESS_COLLECTION
    };

    return {
      content: [{ type: 'text', text: JSON.stringify(summary, null, 2) }]
    };
  }
);

const transport = new StreamableHTTPServerTransport({
  sessionIdGenerator: () => crypto.randomUUID()
});

await server.connect(transport);

const httpServer = createServer(async (req, res) => {
  if (req.url && req.url.startsWith('/mcp')) {
    if (req.method === 'POST') {
      let body = '';
      req.on('data', (chunk) => {
        body += chunk;
      });
      req.on('end', async () => {
        let parsedBody;
        if (body.trim().length > 0) {
          try {
            parsedBody = JSON.parse(body);
          } catch (err) {
            res.statusCode = 400;
            res.end('Invalid JSON body');
            return;
          }
        }
        await transport.handleRequest(req, res, parsedBody);
      });
      return;
    }
    await transport.handleRequest(req, res);
    return;
  }

  if (req.url === '/health') {
    res.statusCode = 200;
    res.end('ok');
    return;
  }

  res.statusCode = 404;
  res.end('not found');
});

httpServer.listen(MCP_PORT, MCP_HOST, () => {
  console.log(`MCP server listening on http://${MCP_HOST}:${MCP_PORT}/mcp`);
});
