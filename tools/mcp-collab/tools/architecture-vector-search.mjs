// ---------------------------------------------------------------------------
// Tool: architecture.vector.search + alias vector.search
// ---------------------------------------------------------------------------

import * as z from 'zod';
import { ARCH_COLLECTION } from '../config.mjs';
import { qdrantSearch } from '../lib/qdrant.mjs';

const ANNOTATIONS = {
  readOnlyHint: true,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: false
};

const INPUT_SCHEMA = {
  query: z.string().describe('Search text to embed and query'),
  limit: z.number().int().min(1).max(50).optional().describe('Max results, default 5'),
  filter: z.any().optional().describe('Optional Qdrant filter object')
};

function makeHandler(collection) {
  return async ({ query, limit, filter }) => {
    const results = await qdrantSearch({ query, limit, filter, collection });
    return { content: [{ type: 'text', text: JSON.stringify(results, null, 2) }] };
  };
}

export function register(server) {
  const handler = makeHandler(ARCH_COLLECTION);

  server.registerTool(
    'architecture.vector.search',
    {
      title: 'Architecture Vector Search',
      description: 'Search the technical canon vector collection.',
      inputSchema: INPUT_SCHEMA,
      annotations: ANNOTATIONS
    },
    handler
  );

  server.registerTool(
    'vector.search',
    {
      title: 'Vector Search (Alias)',
      description: 'Alias for architecture.vector.search — searches the technical canon vector collection.',
      inputSchema: INPUT_SCHEMA,
      annotations: ANNOTATIONS
    },
    handler
  );
}
