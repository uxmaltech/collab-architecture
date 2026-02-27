#!/usr/bin/env node
// ---------------------------------------------------------------------------
// V2 ingestion script — technical docs into scoped Qdrant collections
// ---------------------------------------------------------------------------

import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

import { INDEX_VERSION, TECHNICAL_SCOPES } from '../config.mjs';
import { chunkText } from '../lib/text.mjs';
import { getEmbeddingDriver } from '../lib/embeddings/index.mjs';
import { resolveVectorCollections } from '../lib/context-router.mjs';
import { ensureCollection, qdrantDeleteByFilter, qdrantUpsert } from '../lib/qdrant.mjs';
import { normalizePointId } from '../lib/hashing.mjs';

const ROOT = process.cwd();
const DEFAULT_TECH_SCOPE = Object.keys(TECHNICAL_SCOPES)[0] || 'uxmaltech';

const TECH_SOURCES = [
  {
    file: 'docs/core-packages.md',
    context: 'technical',
    scope: DEFAULT_TECH_SCOPE,
    organization: 'uxmaltech',
    repo: 'uxmaltech/multi',
    package: 'uxmal-packages',
    domain: 'core-packages'
  },
  {
    file: 'docs/uxmal-architecture.md',
    context: 'technical',
    scope: DEFAULT_TECH_SCOPE,
    organization: 'uxmaltech',
    repo: 'uxmaltech/uxmal-site',
    package: 'uxmal-site',
    domain: 'uxmal-architecture'
  },
];

function today() {
  return new Date().toISOString().slice(0, 10);
}

function sha1(value) {
  return crypto.createHash('sha1').update(value, 'utf8').digest('hex');
}

function parseSourceDate(text) {
  const patterns = [/Fecha de corte:\s*\*\*(\d{4}-\d{2}-\d{2})\*\*/i, /Fecha de corte:\s*(\d{4}-\d{2}-\d{2})/i];
  for (const re of patterns) {
    const match = text.match(re);
    if (match?.[1]) return match[1];
  }
  return today();
}

async function fileExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

function parseArgs(argv) {
  const businessFiles = [];
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === '--business-file' && argv[i + 1]) {
      businessFiles.push(argv[i + 1]);
      i += 1;
    }
  }
  return { businessFiles };
}

function businessSourceFromFile(file) {
  const base = path.basename(file, path.extname(file));
  return {
    file,
    context: 'business',
    scope: 'business',
    organization: 'business',
    repo: 'business/custom',
    package: base,
    domain: base
  };
}

async function buildPoints(source, driver) {
  const absPath = path.resolve(ROOT, source.file);
  const exists = await fileExists(absPath);
  if (!exists) {
    return [];
  }

  const text = await fs.readFile(absPath, 'utf8');
  const chunks = chunkText(text);
  if (!chunks.length) return [];

  const vectors = await driver.embedMany(chunks);
  const sourceDate = parseSourceDate(text);
  const now = today();
  const meta = driver.meta();

  return chunks.map((chunk, idx) => {
    const chunkId = sha1(`${source.file}:${idx}`).slice(0, 12);
    const pointSeed = `V2:${source.context}:${source.scope}:${source.file}:${idx}:${INDEX_VERSION}`;

    return {
      id: normalizePointId(pointSeed),
      vector: vectors[idx],
      payload: {
        context: source.context,
        scope: source.scope,
        organization: source.organization,
        repo: source.repo,
        package: source.package,
        domain: source.domain,
        source_path: source.file,
        chunk_id: chunkId,
        chunk_index: idx,
        text: chunk,
        confidence: 'provisional',
        status: 'ingested',
        source_date: sourceDate,
        embedding_provider: meta.provider,
        embedding_model: meta.model,
        embedding_dim: meta.dim,
        index_version: INDEX_VERSION,
        created: now,
        updated: now
      }
    };
  });
}

async function ingestSource(source, driver) {
  const points = await buildPoints(source, driver);
  if (!points.length) {
    return { file: source.file, collection: null, points: 0, skipped: true };
  }

  const { collections } = resolveVectorCollections(source.context, source.scope);
  const collection = collections[0];

  await ensureCollection(collection);

  // Remove previous chunks for this source to avoid stale data when a
  // document shrinks between ingestion runs.
  await qdrantDeleteByFilter({
    collection,
    filter: {
      must: [
        { key: 'source_path', match: { value: source.file } },
        { key: 'context', match: { value: source.context } },
        { key: 'scope', match: { value: source.scope } }
      ]
    }
  });

  await qdrantUpsert({ collection, points });

  return {
    file: source.file,
    collection,
    points: points.length,
    skipped: false
  };
}

async function main() {
  const { businessFiles } = parseArgs(process.argv.slice(2));
  const driver = getEmbeddingDriver();

  const sources = [
    ...TECH_SOURCES,
    ...businessFiles.map((file) => businessSourceFromFile(file))
  ];

  const report = [];
  for (const source of sources) {
    // eslint-disable-next-line no-await-in-loop
    report.push(await ingestSource(source, driver));
  }

  const summary = {
    tool: 'ingest-v2',
    index_version: INDEX_VERSION,
    embedding: driver.meta(),
    ingested_files: report.filter((r) => !r.skipped).length,
    skipped_files: report.filter((r) => r.skipped).length,
    total_points: report.reduce((acc, r) => acc + r.points, 0),
    details: report
  };

  process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
