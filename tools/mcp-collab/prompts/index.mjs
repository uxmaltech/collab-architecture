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
            text: `Use the architecture.graph.query tool to run:\nMATCH (n:Node) WHERE n.Node.node_type == "${nodeType}" RETURN n.Node.name AS name, n.Node.summary AS summary LIMIT 20`
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
            text: `Search for business rules in the "${domain}" domain:\n1. Use business.vector.search with query "${domain} rules" to find relevant business rules.\n2. Then use business.graph.query to explore relationships:\n   MATCH (n:Node)-[e]->(m:Node) WHERE n.Node.node_type == "BusinessRule" AND m.Node.name == "${domain}" RETURN n.Node.name AS rule, type(e) AS relation, m.Node.name AS target LIMIT 20`
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
            text: `Trace the dependency chain for "${nodeName}":\n1. Use architecture.graph.query to find direct dependencies:\n   MATCH (n:Node)-[e:DEPENDS_ON]->(m:Node) WHERE n.Node.name == "${nodeName}" RETURN n.Node.name AS source, m.Node.name AS dependency, e.rationale AS reason\n2. Then trace reverse dependencies (what depends on it):\n   MATCH (n:Node)-[e:DEPENDS_ON]->(m:Node) WHERE m.Node.name == "${nodeName}" RETURN n.Node.name AS dependent, m.Node.name AS dependency, e.rationale AS reason`
          }
        }
      ]
    })
  );
}
