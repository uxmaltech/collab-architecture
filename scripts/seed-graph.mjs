#!/usr/bin/env node
// ---------------------------------------------------------------------------
// seed-graph.mjs — Apply schema.ngql and data.ngql to a running NebulaGraph
// Works with both local Docker and external servers (no docker required).
//
// Usage:
//   node --env-file=.env scripts/seed-graph.mjs
//   node scripts/seed-graph.mjs  (reads env vars from environment)
// ---------------------------------------------------------------------------

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { createRequire } from 'node:module';
const require = createRequire(new URL('../tools/mcp-collab/package.json', import.meta.url));
const { createClient } = require('@nebula-contrib/nebula-nodejs');

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

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

/**
 * Parse an .ngql file into individual statements, stripping comments and
 * blank lines, splitting on semicolons.
 */
function parseNgql(filePath) {
  const raw = readFileSync(filePath, 'utf8');

  // Strip line comments (-- ...) only outside of quoted strings, then join lines
  const joined = raw
    .split('\n')
    .map(line => line.replace(/--(?=(?:[^"]*"[^"]*")*[^"]*$).*$/, '').trim())
    .filter(Boolean)
    .join(' ');

  // Split on ';' only outside of quoted strings
  const statements = [];
  let current = '';
  let inString = false;
  for (let i = 0; i < joined.length; i++) {
    const ch = joined[i];
    if (ch === '"' && joined[i - 1] !== '\\') {
      inString = !inString;
      current += ch;
    } else if (ch === ';' && !inString) {
      const stmt = current.trim();
      if (stmt) statements.push(stmt);
      current = '';
    } else {
      current += ch;
    }
  }
  const last = current.trim();
  if (last) statements.push(last);

  return statements;
}

/**
 * Execute statements sequentially against the given client, skipping USE.
 */
async function runStatements(client, statements, label) {
  for (const stmt of statements) {
    if (/^USE\s+\w+$/i.test(stmt)) continue;  // handled by pool space
    try {
      await client.execute(stmt);
    } catch (err) {
      fail(`[${label}] Failed on statement:\n    ${stmt}\n    ${err.message}`);
    }
  }
}

// ── Main ────────────────────────────────────────────────────────────────────

async function main() {
  console.log('\n🌱 Seeding NebulaGraph architecture canon\n');
  info(`Target: ${NEBULA_ADDR}:${NEBULA_PORT}  space=${ARCH_SPACE}`);

  // 1. Bootstrap client without a specific space to create the space first
  const bootstrapClient = createClient({
    servers: [`${NEBULA_ADDR}:${NEBULA_PORT}`],
    userName: NEBULA_USER,
    password: NEBULA_PASSWORD,
    space: 'nebula',  // system space always exists
    poolSize: 1,
    executeTimeout: 30_000,
    pingInterval: 0
  });

  // Pre-flight: wait for storage hosts to be ONLINE before attempting CREATE SPACE.
  // On fresh clusters, storaged daemons register asynchronously with metad.
  // The remote server's `console` service handles ADD HOSTS; we just wait here.
  info('Waiting for storage hosts to come ONLINE…');
  let hostsOnline = false;
  for (let i = 0; i < 30; i++) {
    try {
      const result = await bootstrapClient.execute('SHOW HOSTS');
      if (result?.data?.Status?.includes?.('ONLINE')) { hostsOnline = true; break; }
    } catch { /* graphd may not be ready yet */ }
    await new Promise(r => setTimeout(r, 2000));
  }
  if (!hostsOnline) fail('No storage hosts came ONLINE after 60s — ensure storaged is registered (run ADD HOSTS on the server)');
  log('Storage hosts ONLINE');

  info('Creating space if not exists…');
  try {
    await bootstrapClient.execute(
      `CREATE SPACE IF NOT EXISTS ${ARCH_SPACE}(vid_type=FIXED_STRING(32), partition_num=1, replica_factor=1)`
    );
    log('Space ready');
  } catch (err) {
    fail(`Could not create space: ${err.message}`);
  }

  // Wait for space to be available (Nebula needs a moment after CREATE SPACE)
  info('Waiting for space to become active…');
  let ready = false;
  for (let i = 0; i < 30; i++) {
    try {
      await bootstrapClient.execute(`USE ${ARCH_SPACE}`);
      ready = true;
      break;
    } catch {
      await new Promise(r => setTimeout(r, 2000));
    }
  }
  if (!ready) fail('Space did not become active after 60s');
  log('Space active');

  // 2. Client bound to the architecture space
  const client = createClient({
    servers: [`${NEBULA_ADDR}:${NEBULA_PORT}`],
    userName: NEBULA_USER,
    password: NEBULA_PASSWORD,
    space: ARCH_SPACE,
    poolSize: 1,
    executeTimeout: 30_000,
    pingInterval: 0
  });

  // 3. Apply schema
  const schemaFile = resolve(ROOT, 'graph/seed/schema.ngql');
  info(`Applying schema: ${schemaFile}`);
  const schemaStatements = parseNgql(schemaFile);
  await runStatements(client, schemaStatements, 'schema');
  log(`Schema applied (${schemaStatements.length} statements)`);

  // 4. Wait for schema to propagate
  info('Waiting for schema to propagate…');
  let schemaReady = false;
  for (let i = 0; i < 30; i++) {
    try {
      const result = await client.execute('DESCRIBE TAG Node');
      if (result?.data?.Field?.length > 0) { schemaReady = true; break; }
    } catch { /* not ready yet */ }
    await new Promise(r => setTimeout(r, 2000));
  }
  if (!schemaReady) fail('Schema did not propagate after 60s');
  log('Schema ready');

  // 5. Apply seed data
  const dataFile = resolve(ROOT, 'graph/seed/data.ngql');
  info(`Applying data: ${dataFile}`);
  const dataStatements = parseNgql(dataFile);
  await runStatements(client, dataStatements, 'data');
  log(`Data applied (${dataStatements.length} statements)`);

  console.log('\n✅ Seed complete\n');
  process.exit(0);
}

main().catch(err => {
  console.error('\n✖ Unexpected error:', err.message);
  process.exit(1);
});
