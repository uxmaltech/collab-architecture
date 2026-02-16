// ---------------------------------------------------------------------------
// Tool: business.rule — ingest business context markdown into graph + vectors
// ---------------------------------------------------------------------------

import * as z from 'zod';
import { BUSINESS_SPACE, BUSINESS_COLLECTION, CONFIDENCE_LEVELS } from '../config.mjs';
import { runNebulaQuery } from '../lib/nebula.mjs';
import { ensureCollection, qdrantUpsert } from '../lib/qdrant.mjs';
import { embedDeterministic, normalizePointId } from '../lib/hashing.mjs';
import { chunkText } from '../lib/text.mjs';
import { parseBusinessMarkdown, uniqueList, makeId } from '../lib/business-parser.mjs';
import {
  nowDate,
  ensureConfidence,
  buildInsertNodes,
  buildInsertEdges,
  ensureBusinessSchema
} from '../lib/graph-builder.mjs';

export function register(server) {
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
      },
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false
      }
    },
    async ({ repo, domain, markdown, tags, confidence, capabilities, commands, queries, entities, rules }) => {
      // --- Parse and merge structured data from markdown + explicit params ---
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

      // --- Ensure infrastructure is ready ---
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

      // --- Build graph nodes ---
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

      // --- Insert into graph ---
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

      // --- Chunk and upsert into vector store ---
      const chunks = chunkText(markdown);
      const points = chunks.map((chunk, idx) => {
        const id = `BUSINESS:${repo}:${activeDomain}:${idx}`;
        return {
          id: normalizePointId(id),
          vector: embedDeterministic(chunk),
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

      // --- Return summary ---
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
}
