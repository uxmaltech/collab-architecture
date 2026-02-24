// ---------------------------------------------------------------------------
// Tool: context.vector.search.v2
// ---------------------------------------------------------------------------

import * as z from 'zod';
import { INDEX_VERSION } from '../config.mjs';
import { getEmbeddingDriver } from '../lib/embeddings/index.mjs';
import { qdrantSearchByVector } from '../lib/qdrant.mjs';
import { resolveVectorCollections } from '../lib/context-router.mjs';

const ANNOTATIONS = {
  readOnlyHint: true,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: false
};

function mergeFilters(baseFilter, customFilter) {
  if (!customFilter) return baseFilter;

  const keys = ['must', 'should', 'must_not'];
  const merged = {};
  let hasMergedKey = false;

  for (const key of keys) {
    const values = [];
    if (Array.isArray(baseFilter?.[key])) values.push(...baseFilter[key]);
    if (Array.isArray(customFilter?.[key])) values.push(...customFilter[key]);
    if (values.length) {
      merged[key] = values;
      hasMergedKey = true;
    }
  }

  if (customFilter?.min_should != null) {
    merged.min_should = customFilter.min_should;
  }

  if (hasMergedKey || merged.min_should != null) {
    return merged;
  }

  // If customFilter is not in canonical shape, nest it under must.
  return {
    must: [...(baseFilter?.must || []), customFilter]
  };
}

function buildBaseFilter({ context, scope }) {
  const must = [{ key: 'context', match: { value: context } }];

  if (scope !== 'global') {
    must.push({ key: 'scope', match: { value: scope } });
  }

  return { must };
}

function normalizeMatch(hit, collection) {
  const payload = hit.payload || {};
  return {
    id: hit.id,
    score: hit.score,
    text: payload.text || '',
    source_path: payload.source_path || '',
    repo: payload.repo || '',
    package: payload.package || '',
    domain: payload.domain || '',
    context: payload.context || '',
    collection,
    payload
  };
}

export function register(server) {
  server.registerTool(
    'context.vector.search.v2',
    {
      title: 'Context Vector Search V2',
      description: 'Search V2 context collections using configurable embedding providers.',
      inputSchema: {
        context: z.enum(['technical', 'business']).describe('Context to search.'),
        scope: z.enum(['uxmal', 'enviaflores', 'business', 'global']).optional().describe('Scope within context.'),
        query: z.string().min(1).describe('Search text.'),
        limit: z.number().int().min(1).max(50).optional().describe('Max results, default 8.'),
        filters: z.any().optional().describe('Optional additional Qdrant filter object.')
      },
      annotations: ANNOTATIONS
    },
    async ({ context, scope, query, limit = 8, filters }) => {
      const resolved = resolveVectorCollections(context, scope);
      const driver = getEmbeddingDriver();
      const vector = await driver.embedOne(query);
      const baseFilter = buildBaseFilter(resolved);
      const filter = mergeFilters(baseFilter, filters || null);

      const perCollectionLimit = Math.min(Math.max(limit, 1), 50);
      const resultsByCollection = await Promise.all(
        resolved.collections.map(async (collection) => {
          const rows = await qdrantSearchByVector({
            collection,
            vector,
            limit: perCollectionLimit,
            filter
          });
          return rows.map((hit) => normalizeMatch(hit, collection));
        })
      );

      const matches = resultsByCollection
        .flat()
        .sort((a, b) => (b.score || 0) - (a.score || 0))
        .slice(0, perCollectionLimit);

      const response = {
        tool_version: '2.0',
        index_version: INDEX_VERSION,
        embedding: driver.meta(),
        context: resolved.context,
        scope: resolved.scope,
        collections_queried: resolved.collections,
        matches
      };

      return {
        content: [{ type: 'text', text: JSON.stringify(response, null, 2) }]
      };
    }
  );
}
