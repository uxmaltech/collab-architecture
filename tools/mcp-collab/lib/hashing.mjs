// ---------------------------------------------------------------------------
// Crypto utilities — deterministic embeddings, UUID hashing, point ID normalization
// ---------------------------------------------------------------------------

import crypto from 'node:crypto';
import { VECTOR_SIZE } from '../config.mjs';

const UUID_RE = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

/**
 * Generate a deterministic embedding vector from text using SHA-256.
 * Produces identical vectors for identical text across runs without requiring
 * an external embedding model.
 */
export function embedDeterministic(text, dim = VECTOR_SIZE) {
  const hash = crypto.createHash('sha256').update(text, 'utf8').digest();
  const bytes = Array.from(hash);
  const vector = [];
  while (vector.length < dim) {
    for (const b of bytes) {
      vector.push(b / 255.0);
      if (vector.length >= dim) break;
    }
  }
  return vector;
}

/**
 * Convert an arbitrary string to a deterministic UUID via SHA-256.
 */
export function hashToUuid(value) {
  const hex = crypto.createHash('sha256').update(value, 'utf8').digest('hex').slice(0, 32);
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

/**
 * Normalize a point ID for Qdrant — accepts integers, UUIDs, or arbitrary strings
 * (the latter are hashed to UUID format).
 */
export function normalizePointId(pointId) {
  if (typeof pointId === 'number') {
    if (!Number.isSafeInteger(pointId) || pointId < 0) {
      throw new Error('Point id must be a safe non-negative integer.');
    }
    return pointId;
  }
  if (typeof pointId === 'string') {
    if (UUID_RE.test(pointId)) return pointId;
    return hashToUuid(pointId);
  }
  return hashToUuid(String(pointId));
}
