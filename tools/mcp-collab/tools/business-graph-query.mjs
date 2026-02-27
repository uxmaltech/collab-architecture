// ---------------------------------------------------------------------------
// Tool: business.graph.query
// ---------------------------------------------------------------------------

import * as z from 'zod';
import { BUSINESS_SPACE } from '../config.mjs';
import { runNebulaQuery } from '../lib/nebula.mjs';

export function register(server) {
  server.registerTool(
    'business.graph.query',
    {
      title: 'Business Graph Query',
      description: 'Execute nGQL against the business architecture graph space.',
      inputSchema: {
        query: z.string().describe('nGQL query to execute')
      },
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false
      }
    },
    async ({ query }) => {
      const finalQuery = `USE ${BUSINESS_SPACE};\n${query.trim()}`;
      const output = await runNebulaQuery(finalQuery);
      return { content: [{ type: 'text', text: output || '(no output)' }] };
    }
  );
}
