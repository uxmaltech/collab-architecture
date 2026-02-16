// ---------------------------------------------------------------------------
// Tool: architecture.graph.query + alias graph.query
// ---------------------------------------------------------------------------

import * as z from 'zod';
import { ARCH_SPACE } from '../config.mjs';
import { runNebulaQuery } from '../lib/nebula.mjs';

const ANNOTATIONS = {
  readOnlyHint: true,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: false
};

const INPUT_SCHEMA = {
  query: z.string().describe('nGQL query to execute')
};

function makeHandler(space) {
  return async ({ query }) => {
    const finalQuery = `USE ${space};\n${query.trim()}`;
    const output = runNebulaQuery(finalQuery);
    return { content: [{ type: 'text', text: output || '(no output)' }] };
  };
}

export function register(server) {
  const handler = makeHandler(ARCH_SPACE);

  server.registerTool(
    'architecture.graph.query',
    {
      title: 'Architecture Graph Query',
      description: 'Execute nGQL against the technical canon graph space.',
      inputSchema: INPUT_SCHEMA,
      annotations: ANNOTATIONS
    },
    handler
  );

  server.registerTool(
    'graph.query',
    {
      title: 'Graph Query (Alias)',
      description: 'Alias for architecture.graph.query — executes nGQL against the technical canon graph space.',
      inputSchema: INPUT_SCHEMA,
      annotations: ANNOTATIONS
    },
    handler
  );
}
