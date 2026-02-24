// ---------------------------------------------------------------------------
// Tool: context.scopes.list.v2
// ---------------------------------------------------------------------------

import * as z from 'zod';
import { INDEX_VERSION } from '../config.mjs';
import { getScopeCatalog, resolveContextScope } from '../lib/context-router.mjs';

const ANNOTATIONS = {
  readOnlyHint: true,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: false
};

export function register(server) {
  server.registerTool(
    'context.scopes.list.v2',
    {
      title: 'Context Scopes List V2',
      description: 'List valid V2 contexts/scopes and their configured Qdrant/Nebula targets.',
      inputSchema: {
        context: z.enum(['technical', 'business']).optional().describe('Optional context filter')
      },
      annotations: ANNOTATIONS
    },
    async ({ context }) => {
      const catalog = getScopeCatalog();
      const resolvedContext = context ? resolveContextScope(context).context : null;
      const contexts = context
        ? {
            [resolvedContext]: catalog.contexts[resolvedContext]
          }
        : catalog.contexts;

      const summary = {
        tool_version: '2.0',
        index_version: INDEX_VERSION,
        contexts
      };

      return {
        content: [{ type: 'text', text: JSON.stringify(summary, null, 2) }]
      };
    }
  );
}
