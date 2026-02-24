// ---------------------------------------------------------------------------
// MCP Prompts — common query templates for agents
// ---------------------------------------------------------------------------

import * as z from 'zod';

/**
 * Register all MCP prompts on the given server instance.
 */
export function registerAllPrompts(server) {
  // --- Explore architecture by node type ---
  server.registerPrompt(
    'explore-architecture',
    {
      title: 'Explore Architecture',
      description: 'Generates an nGQL query to explore nodes in the architecture graph by type.',
      argsSchema: {
        nodeType: z.string().describe('Node type to explore (e.g., Service, Layer, Rule, Decision)')
      }
    },
    async ({ nodeType }) => ({
      messages: [
        {
          role: 'user',
          content: {
            type: 'text',
            text: `Use context.vector.search.v2 to explore "${nodeType}" in technical context:\ncontext=technical\nscope=global\nquery="${nodeType} architecture patterns rules"\nlimit=20`
          }
        }
      ]
    })
  );

  // --- Find business rules by domain ---
  server.registerPrompt(
    'find-business-rules',
    {
      title: 'Find Business Rules',
      description: 'Searches for business rules related to a domain using vector and graph tools.',
      argsSchema: {
        domain: z.string().describe('Business domain to search for (e.g., Orders, Payments)')
      }
    },
    async ({ domain }) => ({
      messages: [
        {
          role: 'user',
          content: {
            type: 'text',
            text: `Search for business rules in "${domain}":\n1. Use context.vector.search.v2 with context=business, scope=business, query="${domain} rules", limit=10.\n2. If the result payload includes graph node IDs, call context.graph.degree.search.v2 with context=business, hops=1 to inspect related nodes and relations.`
          }
        }
      ]
    })
  );

  // --- Trace architecture dependencies ---
  server.registerPrompt(
    'trace-dependencies',
    {
      title: 'Trace Dependencies',
      description: 'Traces dependency chains from a given node in the architecture graph.',
      argsSchema: {
        nodeName: z.string().describe('Name of the node to trace dependencies from')
      }
    },
    async ({ nodeName }) => ({
      messages: [
        {
          role: 'user',
          content: {
            type: 'text',
            text: `Trace dependency chain for "${nodeName}":\n1. Use context.vector.search.v2 with context=technical, scope=global, query="${nodeName}", limit=5 to find candidate seed IDs.\n2. For each candidate seed_id, call context.graph.degree.search.v2 with context=technical, direction=both, hops=2, edge_types=[\"DEPENDS_ON\"].`
          }
        }
      ]
    })
  );
}
