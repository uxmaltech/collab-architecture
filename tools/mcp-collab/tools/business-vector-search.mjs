// ---------------------------------------------------------------------------
// Tool: business.vector.search
// ---------------------------------------------------------------------------

import * as z from 'zod';
import { BUSINESS_COLLECTION } from '../config.mjs';
import { qdrantSearch } from '../lib/qdrant.mjs';

export function register(server) {
  server.registerTool(
    'business.vector.search',
    {
      title: 'Business Vector Search',
      description: 'Search the business architecture vector collection.',
      inputSchema: {
        query: z.string().describe('Search text to embed and query'),
        limit: z.number().int().min(1).max(50).optional().describe('Max results, default 5'),
        filter: z.any().optional().describe('Optional Qdrant filter object')
      },
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false
      }
    },
    async ({ query, limit, filter }) => {
      const results = await qdrantSearch({ query, limit, filter, collection: BUSINESS_COLLECTION });
      return { content: [{ type: 'text', text: JSON.stringify(results, null, 2) }] };
    }
  );
}
