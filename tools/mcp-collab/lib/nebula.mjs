// ---------------------------------------------------------------------------
// NebulaGraph client — query execution via native nebula-nodejs client pool
// ---------------------------------------------------------------------------

import { createClient } from '@nebula-contrib/nebula-nodejs';
import {
  NEBULA_ADDR,
  NEBULA_PORT,
  NEBULA_USER,
  NEBULA_PASSWORD,
  ARCH_SPACE
} from '../config.mjs';

// ---------------------------------------------------------------------------
// Connection pools — one per graph space, created lazily on first use
// ---------------------------------------------------------------------------

const pools = new Map();

function getClient(space) {
  if (!pools.has(space)) {
    const client = createClient({
      servers: [`${NEBULA_ADDR}:${NEBULA_PORT}`],
      userName: NEBULA_USER,
      password: NEBULA_PASSWORD,
      space,
      poolSize: 3,
      executeTimeout: 30_000,
      pingInterval: 60_000
    });
    pools.set(space, client);
  }
  return pools.get(space);
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Detect which graph space a query targets by looking for a USE statement.
 * Falls back to ARCH_SPACE if not found.
 */
function detectSpace(query) {
  const match = query.match(/USE\s+(\w+)\s*;/i);
  if (!match) return ARCH_SPACE;
  return match[1];
}

/**
 * Split nGQL statements by semicolon, ignoring semicolons inside quoted strings.
 */
function splitStatements(raw) {
  const input = String(raw || '');
  const statements = [];
  let current = '';
  let inString = false;

  for (let i = 0; i < input.length; i += 1) {
    const ch = input[i];
    if (ch === '"' && input[i - 1] !== '\\') {
      inString = !inString;
      current += ch;
      continue;
    }

    if (ch === ';' && !inString) {
      const stmt = current.trim();
      if (stmt) statements.push(stmt);
      current = '';
      continue;
    }

    current += ch;
  }

  const tail = current.trim();
  if (tail) statements.push(tail);
  return statements;
}

/**
 * Convert the SDK's columnar result ({ data: { Col: [v1,v2], ... } })
 * into a row-oriented array ([{ Col: v1 }, { Col: v2 }, ...]) that is
 * easier for a language model to read and reason about.
 * Returns an empty string for empty result sets (DDL, mutations, etc.).
 */
function formatResult(result) {
  if (result == null) return '';
  const data = result.data;
  if (data == null) return '';
  const cols = Object.keys(data);
  if (cols.length === 0) return '';
  const rowCount = data[cols[0]]?.length ?? 0;
  if (rowCount === 0) return '';
  const rows = [];
  for (let i = 0; i < rowCount; i++) {
    const row = {};
    for (const col of cols) row[col] = data[col][i];
    rows.push(row);
  }
  return JSON.stringify(rows, null, 2);
}

/**
 * Execute a single nGQL statement against the given client.
 * Throws if NebulaGraph returns a non-zero error_code.
 */
async function executeOne(client, statement) {
  const result = await client.execute(statement.trim());
  if (result?.error_code !== 0 && result?.error_code != null) {
    throw new Error(result.error_msg || `NebulaGraph error_code ${result.error_code}`);
  }
  return formatResult(result);
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Escape a string value for safe inclusion in nGQL statements.
 */
export function escapeNebula(value) {
  return String(value)
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r')
    .replace(/\t/g, '\\t');
}

/**
 * Execute one or more nGQL statements against NebulaGraph.
 *
 * Accepts:
 *   - A single nGQL string (may include a "USE <space>;" prefix — it will be
 *     used to route to the correct pool and then stripped before execution)
 *   - Multiple statements separated by newlines (executed sequentially)
 *   - An array of statement strings
 *
 * Returns the combined text output of all statements, or an empty string.
 * Throws on connection errors or query failures.
 */
/**
 * Close all cached connection pools. Call during graceful shutdown.
 */
export async function closeAllPools() {
  for (const [space, client] of pools) {
    try {
      if (typeof client.close === 'function') await client.close();
    } catch (err) {
      console.error(`Error closing Nebula pool for space "${space}":`, err);
    }
  }
  pools.clear();
}

export async function runNebulaQuery(query) {
  const raw = Array.isArray(query) ? query.join('\n') : query;

  // Determine target space from USE statement, then strip all USE lines
  const space = detectSpace(raw);
  const client = getClient(space);

  // Split by ';' so multiline nGQL queries are sent as a single statement.
  // USE <space> lines are stripped (they have no trailing ';' after split).
  const statements = splitStatements(raw)
    .filter((s) => s && !/^USE\s+\w+\s*$/i.test(s));

  const outputs = [];
  for (const stmt of statements) {
    const out = await executeOne(client, stmt);
    if (out) outputs.push(out);
  }
  return outputs.join('\n\n');
}
