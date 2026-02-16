// ---------------------------------------------------------------------------
// Business markdown parsing — extract structured concepts from markdown
// ---------------------------------------------------------------------------

import crypto from 'node:crypto';

/**
 * Map a heading title to a business concept category.
 */
export function extractSectionKey(title) {
  const normalized = title.toLowerCase();
  if (normalized.includes('domain')) return 'domains';
  if (normalized.includes('capabil')) return 'capabilities';
  if (normalized.includes('command')) return 'commands';
  if (normalized.includes('query')) return 'queries';
  if (normalized.includes('entity')) return 'entities';
  if (normalized.includes('rule')) return 'rules';
  return null;
}

/**
 * Parse business-context markdown into structured lists of domains,
 * capabilities, commands, queries, entities, and rules.
 */
export function parseBusinessMarkdown(markdown) {
  const result = {
    domains: [],
    capabilities: [],
    commands: [],
    queries: [],
    entities: [],
    rules: []
  };
  let currentKey = null;
  const lines = markdown.split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('#')) {
      const heading = trimmed.replace(/^#+\s*/, '').trim();
      currentKey = extractSectionKey(heading);
      continue;
    }
    const match = trimmed.match(/^[-*+]\s+(.+)$/);
    if (match && currentKey) {
      const item = match[1].trim();
      if (item) result[currentKey].push(item);
    }
  }
  return result;
}

/**
 * Deduplicate a list of strings (case-insensitive, preserves first casing).
 */
export function uniqueList(values) {
  const seen = new Set();
  const out = [];
  for (const value of values) {
    const normalized = value.trim();
    if (!normalized) continue;
    const key = normalized.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(normalized);
  }
  return out;
}

/**
 * Generate a stable deterministic ID from a prefix and parts via SHA-256.
 */
export function makeId(prefix, ...parts) {
  const base = parts.filter(Boolean).join('|');
  const digest = crypto.createHash('sha256').update(base, 'utf8').digest('hex').slice(0, 12).toUpperCase();
  return `${prefix}-${digest}`;
}
