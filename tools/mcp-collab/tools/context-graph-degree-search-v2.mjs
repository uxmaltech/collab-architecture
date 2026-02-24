// ---------------------------------------------------------------------------
// Tool: context.graph.degree.search.v2
// ---------------------------------------------------------------------------

import * as z from 'zod';
import { INDEX_VERSION } from '../config.mjs';
import { escapeNebula, runNebulaQuery } from '../lib/nebula.mjs';
import { resolveContextScope, resolveGraphSpace } from '../lib/context-router.mjs';

const ANNOTATIONS = {
  readOnlyHint: true,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: false
};
const NODE_FIELDS_CACHE = new Map();

function parseRows(output) {
  if (!output) return [];
  try {
    const parsed = JSON.parse(output);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function quotedIds(ids) {
  return ids.map((id) => `"${escapeNebula(id)}"`).join(', ');
}

async function getNodeFields(space) {
  if (NODE_FIELDS_CACHE.has(space)) {
    return NODE_FIELDS_CACHE.get(space);
  }

  const rows = parseRows(await runNebulaQuery(`USE ${space}; DESCRIBE TAG Node;`));
  const fields = new Set();
  for (const row of rows) {
    const key = Object.keys(row).find((k) => k.toLowerCase() === 'field');
    if (!key) continue;
    fields.add(String(row[key]));
  }
  NODE_FIELDS_CACHE.set(space, fields);
  return fields;
}

function maybeSelect(fieldExpr, alias, enabled) {
  return enabled ? `${fieldExpr} AS ${alias}` : `"" AS ${alias}`;
}

function runNeighborQuery({ space, frontierIds, incoming, rowLimit, supportsScope, supportsContext }) {
  const where = incoming ? `id(dst) IN [${quotedIds(frontierIds)}]` : `id(src) IN [${quotedIds(frontierIds)}]`;
  const scopeSelect = maybeSelect('src.Node.scope', 'from_scope', supportsScope);
  const scopeSelect2 = maybeSelect('dst.Node.scope', 'to_scope', supportsScope);
  const contextSelect = maybeSelect('src.Node.context', 'from_context', supportsContext);
  const contextSelect2 = maybeSelect('dst.Node.context', 'to_context', supportsContext);

  const query =
    `USE ${space}; ` +
    `MATCH (src:Node)-[e]->(dst:Node) ` +
    `WHERE ${where} ` +
    `RETURN id(src) AS from_id, id(dst) AS to_id, type(e) AS edge_type, ` +
    `src.Node.node_type AS from_type, dst.Node.node_type AS to_type, ` +
    `src.Node.name AS from_name, dst.Node.name AS to_name, ` +
    `${scopeSelect}, ${scopeSelect2}, ${contextSelect}, ${contextSelect2} ` +
    `LIMIT ${rowLimit};`;
  return runNebulaQuery(query);
}

function passesEdgeType(row, allowedEdgeTypes) {
  if (!allowedEdgeTypes?.length) return true;
  return allowedEdgeTypes.includes(row.edge_type);
}

function passesNodeType(row, incoming, allowedNodeTypes) {
  if (!allowedNodeTypes?.length) return true;
  const nodeType = incoming ? row.from_type : row.to_type;
  return allowedNodeTypes.includes(nodeType);
}

function passesScope(row, scope, supportsScope) {
  if (!scope || scope === 'global') return true;
  if (!supportsScope) return true;
  return row.from_scope === scope && row.to_scope === scope;
}

function passesContext(row, context, supportsContext) {
  if (!supportsContext) return true;
  const fromOk = !row.from_context || row.from_context === context;
  const toOk = !row.to_context || row.to_context === context;
  return fromOk && toOk;
}

function toNeighborId(row, incoming) {
  return incoming ? row.from_id : row.to_id;
}

function toNeighborNode(row, incoming) {
  return incoming
    ? {
        id: row.from_id,
        node_type: row.from_type,
        name: row.from_name,
        scope: row.from_scope,
        context: row.from_context
      }
    : {
        id: row.to_id,
        node_type: row.to_type,
        name: row.to_name,
        scope: row.to_scope,
        context: row.to_context
      };
}

async function loadSeed(space, seedId, supportsScope, supportsContext) {
  const scopeSelect = maybeSelect('n.Node.scope', 'scope', supportsScope);
  const contextSelect = maybeSelect('n.Node.context', 'context', supportsContext);

  const query =
    `USE ${space}; ` +
    `MATCH (n:Node) WHERE id(n) == "${escapeNebula(seedId)}" ` +
    `RETURN id(n) AS id, n.Node.node_type AS node_type, n.Node.name AS name, ` +
    `${scopeSelect}, ${contextSelect} LIMIT 1;`;
  const rows = parseRows(await runNebulaQuery(query));
  return rows[0] || null;
}

export function register(server) {
  server.registerTool(
    'context.graph.degree.search.v2',
    {
      title: 'Context Graph Degree Search V2',
      description: 'Traverse context graphs by N degrees from a seed node.',
      inputSchema: {
        context: z.enum(['technical', 'business']).describe('Graph context.'),
        seed_id: z.string().min(1).describe('Seed node id (VID).'),
        hops: z.number().int().min(1).max(4).optional().describe('Traversal depth, default 2.'),
        direction: z.enum(['out', 'in', 'both']).optional().describe('Traversal direction, default both.'),
        edge_types: z.array(z.string()).optional().describe('Optional edge type filter.'),
        node_types: z.array(z.string()).optional().describe('Optional neighbor node_type filter.'),
        scope: z.enum(['uxmaltech', 'enviaflores', 'business', 'global']).optional().describe('Optional scope filter.'),
        max_nodes_per_hop: z.number().int().min(1).max(200).optional().describe('Max new nodes per hop, default 50.')
      },
      annotations: ANNOTATIONS
    },
    async ({
      context,
      seed_id,
      hops = 2,
      direction = 'both',
      edge_types,
      node_types,
      scope,
      max_nodes_per_hop = 50
    }) => {
      const { context: normalizedContext, scope: normalizedScope } = resolveContextScope(context, scope);
      const { space } = resolveGraphSpace(normalizedContext);
      const nodeFields = await getNodeFields(space);
      const supportsScope = nodeFields.has('scope');
      const supportsContext = nodeFields.has('context');

      const seed = await loadSeed(space, seed_id, supportsScope, supportsContext);
      if (!seed) {
        throw new Error(`Seed node "${seed_id}" was not found in space ${space}.`);
      }

      const visitedNodes = new Set([seed_id]);
      const visitedEdges = new Set();
      const levels = [];
      let frontier = [seed_id];
      let truncated = false;

      for (let level = 1; level <= hops; level += 1) {
        if (!frontier.length) break;

        const rowLimit = Math.max(max_nodes_per_hop * 8, 100);
        const directionList = direction === 'both' ? [false, true] : direction === 'in' ? [true] : [false];

        const rawRows = [];
        for (const incoming of directionList) {
          // eslint-disable-next-line no-await-in-loop
          const output = await runNeighborQuery({
            space,
            frontierIds: frontier,
            incoming,
            rowLimit,
            supportsScope,
            supportsContext
          });
          const rows = parseRows(output).map((row) => ({ ...row, incoming }));
          rawRows.push(...rows);
        }

        const levelNodesMap = new Map();
        const levelEdges = [];

        for (const row of rawRows) {
          if (!passesEdgeType(row, edge_types)) continue;
          if (!passesNodeType(row, row.incoming, node_types)) continue;
          if (!passesScope(row, normalizedScope, supportsScope)) continue;
          if (!passesContext(row, normalizedContext, supportsContext)) continue;

          const edgeKey = `${row.from_id}|${row.edge_type}|${row.to_id}`;
          if (!visitedEdges.has(edgeKey)) {
            visitedEdges.add(edgeKey);
            levelEdges.push({
              from: row.from_id,
              to: row.to_id,
              edge_type: row.edge_type,
              direction: row.incoming ? 'in' : 'out',
              from_name: row.from_name,
              to_name: row.to_name
            });
          }

          const neighborId = toNeighborId(row, row.incoming);
          if (visitedNodes.has(neighborId)) continue;
          levelNodesMap.set(neighborId, toNeighborNode(row, row.incoming));
        }

        const newNodes = Array.from(levelNodesMap.values());
        const limitedNodes = newNodes.slice(0, max_nodes_per_hop);
        if (limitedNodes.length < newNodes.length) {
          truncated = true;
        }

        for (const node of limitedNodes) {
          visitedNodes.add(node.id);
        }

        levels.push({
          level,
          nodes: limitedNodes,
          edges: levelEdges
        });

        frontier = limitedNodes.map((node) => node.id);
      }

      const response = {
        tool_version: '2.0',
        index_version: INDEX_VERSION,
        seed,
        context: normalizedContext,
        scope: normalizedScope,
        space,
        levels,
        stats: {
          visited_nodes: visitedNodes.size,
          visited_edges: visitedEdges.size,
          truncated,
          supports_scope_filter: supportsScope,
          supports_context_filter: supportsContext
        }
      };

      return {
        content: [{ type: 'text', text: JSON.stringify(response, null, 2) }]
      };
    }
  );
}
