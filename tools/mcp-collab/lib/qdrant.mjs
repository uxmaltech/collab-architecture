// ---------------------------------------------------------------------------
// Qdrant vector DB client — collection management, search, upsert
// ---------------------------------------------------------------------------

import { QDRANT_URL, QDRANT_API_KEY, VECTOR_SIZE } from '../config.mjs';
import { embedDeterministic } from './hashing.mjs';

/**
 * Base headers for every Qdrant request.
 * Includes the api-key header only when QDRANT_API_KEY is set.
 */
function qdrantHeaders(extra = {}) {
  const headers = { 'Content-Type': 'application/json', ...extra };
  if (QDRANT_API_KEY) headers['api-key'] = QDRANT_API_KEY;
  return headers;
}

/**
 * Ensure a Qdrant collection exists with the expected vector size.
 * Creates the collection if missing; throws if size mismatches.
 */
export async function ensureCollection(collection) {
  const res = await fetch(`${QDRANT_URL}/collections/${collection}`, {
    headers: qdrantHeaders()
  });
  if (res.status === 200) {
    const json = await res.json();
    const size = json?.result?.config?.params?.vectors?.size;
    if (size && parseInt(size, 10) !== VECTOR_SIZE) {
      throw new Error(
        `Collection ${collection} has vector size ${size}, expected ${VECTOR_SIZE}. ` +
          'Update QDRANT_VECTOR_SIZE or recreate the collection.'
      );
    }
    return;
  }
  if (res.status !== 404) {
    const text = await res.text();
    throw new Error(`Qdrant error: ${res.status} ${text}`);
  }
  const createRes = await fetch(`${QDRANT_URL}/collections/${collection}`, {
    method: 'PUT',
    headers: qdrantHeaders(),
    body: JSON.stringify({
      vectors: {
        size: VECTOR_SIZE,
        distance: 'Cosine'
      }
    })
  });
  if (!createRes.ok) {
    const text = await createRes.text();
    throw new Error(`Failed to create collection ${collection}: ${text}`);
  }
}

/**
 * Semantic search in a Qdrant collection using deterministic embeddings.
 */
export async function qdrantSearch({ query, limit = 5, filter = null, collection }) {
  const vector = embedDeterministic(query, VECTOR_SIZE);
  return qdrantSearchByVector({ vector, limit, filter, collection });
}

/**
 * Semantic search in a Qdrant collection using a precomputed vector.
 */
export async function qdrantSearchByVector({ vector, limit = 5, filter = null, collection }) {
  if (!Array.isArray(vector) || !vector.length) {
    throw new Error('qdrantSearchByVector requires a non-empty vector array.');
  }
  const body = {
    vector,
    limit: Math.min(Math.max(limit, 1), 50),
    with_payload: true,
    with_vectors: false
  };
  if (filter) body.filter = filter;

  const res = await fetch(`${QDRANT_URL}/collections/${collection}/points/search`, {
    method: 'POST',
    headers: qdrantHeaders(),
    body: JSON.stringify(body)
  });
  const json = await res.json();
  if (!res.ok) {
    const msg = json?.status?.error || JSON.stringify(json);
    throw new Error(`Qdrant error: ${res.status} ${msg}`);
  }
  return json.result || [];
}

/**
 * Upsert points into a Qdrant collection (waits for indexing).
 */
export async function qdrantUpsert({ points, collection }) {
  if (!points.length) return;
  const res = await fetch(`${QDRANT_URL}/collections/${collection}/points?wait=true`, {
    method: 'PUT',
    headers: qdrantHeaders(),
    body: JSON.stringify({ points })
  });
  const json = await res.json();
  if (!res.ok) {
    const msg = json?.status?.error || JSON.stringify(json);
    throw new Error(`Qdrant error: ${res.status} ${msg}`);
  }
  return json;
}
