#!/usr/bin/env node
// ---------------------------------------------------------------------------
// reset-graph.mjs — Drop the architecture space from a running NebulaGraph
// Works with both local Docker and external servers (no docker required).
//
// Usage:
//   node --env-file=.env scripts/reset-graph.mjs
//   node scripts/reset-graph.mjs  (reads env vars from environment)
// ---------------------------------------------------------------------------

import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';
const require = createRequire(new URL('../tools/mcp-collab/package.json', import.meta.url));
const { createClient } = require('@nebula-contrib/nebula-nodejs');

const __dirname = dirname(fileURLToPath(import.meta.url));

// ── Config from environment ─────────────────────────────────────────────────
const NEBULA_ADDR     = process.env.NEBULA_ADDR     || 'localhost';
const NEBULA_PORT     = parseInt(process.env.NEBULA_PORT || '9669', 10);
const NEBULA_USER     = process.env.NEBULA_USER     || 'root';
const NEBULA_PASSWORD = process.env.NEBULA_PASSWORD || 'nebula';
const ARCH_SPACE      = process.env.ARCH_SPACE      || process.env.NEBULA_SPACE || 'collab_architecture';

// ── Helpers ─────────────────────────────────────────────────────────────────
function log(msg)  { console.log(`  ✔ ${msg}`); }
function info(msg) { console.log(`  → ${msg}`); }
function fail(msg) { console.error(`  ✖ ${msg}`); process.exit(1); }

// ── Main ────────────────────────────────────────────────────────────────────
async function main() {
  console.log('\n🗑️  Resetting NebulaGraph architecture space\n');
  info(`Target: ${NEBULA_ADDR}:${NEBULA_PORT}  space=${ARCH_SPACE}`);

  const client = createClient({
    servers: [`${NEBULA_ADDR}:${NEBULA_PORT}`],
    userName: NEBULA_USER,
    password: NEBULA_PASSWORD,
    space: 'nebula',  // system space — always exists
    poolSize: 1,
    executeTimeout: 30_000,
    pingInterval: 0
  });

  info(`Dropping space ${ARCH_SPACE} if exists…`);
  try {
    await client.execute(`DROP SPACE IF EXISTS ${ARCH_SPACE}`);
    log(`Space ${ARCH_SPACE} dropped`);
  } catch (err) {
    fail(`Could not drop space: ${err.message}`);
  }

  console.log('\n✅ Reset complete\n');
  process.exit(0);
}

main().catch(err => {
  console.error('\n✖ Unexpected error:', err.message);
  process.exit(1);
});
