// ---------------------------------------------------------------------------
// GitHub ingestion orchestration — full/delta ingestion into V2 Qdrant collections
// ---------------------------------------------------------------------------

import crypto from 'node:crypto';

import {
  EMBED_PRICE_PER_1M_TOKENS,
  INDEX_VERSION,
  QDRANT_COLLECTION_INGEST_CURSORS
} from '../config.mjs';
import { getEmbeddingDriver } from './embeddings/index.mjs';
import { normalizePointId } from './hashing.mjs';
import {
  cleanupRepositorySnapshot,
  cloneRepositorySnapshot,
  getBlobSha,
  listDeltaChanges,
  listTreeBlobs,
  readRepoFile
} from './git-repo-client.mjs';
import { ensureCollection, qdrantDeleteByFilter, qdrantScroll, qdrantUpsert } from './qdrant.mjs';
import { chunkTextWithRanges, estimateTokens } from './text.mjs';
import { resolveContextScope, resolveVectorCollections } from './context-router.mjs';
import {
  classifyContentKind,
  detectLanguage,
  extractSymbols,
  resolveEmbeddingProfile,
  selectChunkSymbol
} from './code-metadata/index.mjs';

const CURSOR_VECTOR = [0];
const ALLOWED_MODES = new Set(['full', 'delta']);
const UPSERT_STATUSES = new Set(['added', 'modified', 'changed', 'copied']);

export const DEFAULT_INCLUDE_EXTENSIONS = [
  'md',
  'mdx',
  'txt',
  'rst',
  'yml',
  'yaml',
  'json',
  'ts',
  'tsx',
  'js',
  'jsx',
  'mjs',
  'cjs',
  'scss',
  'php',
  'py',
  'go',
  'java',
  'kt',
  'rb',
  'sql',
  'sh',
  'bash',
  'dockerfile'
];

function nowIso() {
  return new Date().toISOString();
}

function roundCost(value) {
  return Math.round(value * 1_000_000) / 1_000_000;
}

function hashChunkId(value) {
  return crypto.createHash('sha1').update(value, 'utf8').digest('hex').slice(0, 12);
}

function parseRepoOwner(repo) {
  const [owner] = String(repo || '').split('/');
  return owner || '';
}

function normalizeExtensions(inputExtensions) {
  const values = Array.isArray(inputExtensions) && inputExtensions.length
    ? inputExtensions
    : DEFAULT_INCLUDE_EXTENSIONS;

  return new Set(
    values
      .map((value) => String(value || '').trim().toLowerCase().replace(/^\./, ''))
      .filter(Boolean)
  );
}

function isPathAllowed(sourcePath, extensionSet) {
  const normalizedPath = String(sourcePath || '').trim();
  if (!normalizedPath) return false;

  const baseName = normalizedPath.split('/').pop()?.toLowerCase() || '';
  if (!baseName) return false;

  if (extensionSet.has('dockerfile') && baseName.startsWith('dockerfile')) {
    return true;
  }

  const dot = baseName.lastIndexOf('.');
  if (dot < 0) return false;

  const extension = baseName.slice(dot + 1);
  return extensionSet.has(extension);
}

function cursorKey({ repo, branch, context, scope }) {
  return `${repo}|${branch}|${context}|${scope}`;
}

function cursorFilter(key) {
  return {
    must: [{ key: 'key', match: { value: key } }]
  };
}

function repoFilter({ repo, branch, context, scope }) {
  return {
    must: [
      { key: 'source_type', match: { value: 'github' } },
      { key: 'repo', match: { value: repo } },
      { key: 'branch', match: { value: branch } },
      { key: 'context', match: { value: context } },
      { key: 'scope', match: { value: scope } }
    ]
  };
}

function fileFilter({ repo, branch, context, scope, sourcePath }) {
  return {
    must: [
      ...repoFilter({ repo, branch, context, scope }).must,
      { key: 'source_path', match: { value: sourcePath } }
    ]
  };
}

async function readCursor({ repo, branch, context, scope }) {
  const key = cursorKey({ repo, branch, context, scope });
  const points = await qdrantScroll({
    collection: QDRANT_COLLECTION_INGEST_CURSORS,
    filter: cursorFilter(key),
    limit: 1,
    withPayload: true,
    withVectors: false
  });
  return points[0]?.payload?.last_processed_sha || null;
}

async function writeCursor({ repo, branch, context, scope, lastProcessedSha }) {
  const key = cursorKey({ repo, branch, context, scope });
  const point = {
    id: normalizePointId(`CURSOR:${key}`),
    vector: CURSOR_VECTOR,
    payload: {
      key,
      repo,
      branch,
      context,
      scope,
      last_processed_sha: lastProcessedSha,
      index_version: INDEX_VERSION,
      updated_at: nowIso()
    }
  };

  await qdrantUpsert({
    collection: QDRANT_COLLECTION_INGEST_CURSORS,
    points: [point]
  });
}

function buildBaseRepoDetail({ repo, context, scope, mode }) {
  return {
    repo,
    branch: null,
    head_sha: null,
    mode_effective: mode,
    files_detected_total: 0,
    files_indexable_total: 0,
    files_excluded_total: 0,
    files_changed: 0,
    files_ingested: 0,
    files_deleted: 0,
    files_skipped: 0,
    points_upserted: 0,
    estimated_tokens_total: 0,
    estimated_cost_usd: EMBED_PRICE_PER_1M_TOKENS == null ? null : 0,
    cursor_before: null,
    cursor_after: null,
    status: 'failed',
    error: null,
    warnings: [],
    context,
    scope
  };
}

function estimateCost(tokens) {
  if (EMBED_PRICE_PER_1M_TOKENS == null) return null;
  return roundCost((tokens / 1_000_000) * EMBED_PRICE_PER_1M_TOKENS);
}

async function listFullUnits(snapshot, extensionSet, debugMode = null) {
  const blobs = await listTreeBlobs(snapshot, 'HEAD');

  const units = [];
  const excludedByExtension = [];

  for (const item of blobs) {
    if (!isPathAllowed(item.path, extensionSet)) {
      if (debugMode === 'excluded') {
        excludedByExtension.push({
          path: item.path,
          reason: 'extension_not_allowed'
        });
      }
      continue;
    }
    units.push({
      status: 'full',
      path: item.path,
      previousPath: null,
      blobSha: item.sha,
      deletePaths: []
    });
  }

  return {
    filesDetectedTotal: blobs.length,
    units,
    excludedByExtension
  };
}

async function listDeltaUnits(snapshot, baseSha, headSha, extensionSet, debugMode = null) {
  const files = await listDeltaChanges(snapshot, baseSha, headSha);
  const units = [];
  const excludedByExtension = [];

  for (const file of files) {
    const status = String(file?.status || '').toLowerCase();
    const path = String(file?.path || '').trim();
    const previousPath = String(file?.previousPath || '').trim() || null;
    const matchesCurrent = isPathAllowed(path, extensionSet);
    const matchesPrevious = previousPath ? isPathAllowed(previousPath, extensionSet) : false;
    const isIndexable = matchesCurrent || matchesPrevious;

    if (!isIndexable) {
      if (debugMode === 'excluded') {
        excludedByExtension.push({
          path,
          reason: 'extension_not_allowed'
        });
      }
      continue;
    }

    if (status === 'removed') {
      units.push({
        status,
        path,
        previousPath: null,
        blobSha: null,
        deletePaths: [path]
      });
      continue;
    }

    if (status === 'renamed') {
      const blobSha = matchesCurrent ? await getBlobSha(snapshot, path, headSha) : null;
      units.push({
        status,
        path,
        previousPath,
        blobSha,
        deletePaths: previousPath ? [previousPath] : []
      });
      continue;
    }

    if (UPSERT_STATUSES.has(status)) {
      const blobSha = await getBlobSha(snapshot, path, headSha);
      units.push({
        status,
        path,
        previousPath: null,
        blobSha,
        deletePaths: []
      });
      continue;
    }

    if (debugMode === 'excluded') {
      excludedByExtension.push({
        path,
        reason: `status_not_supported:${status || 'unknown'}`
      });
    }
  }

  return {
    filesDetectedTotal: files.length,
    units,
    excludedByExtension
  };
}

async function processUpsertUnit({
  repo,
  branch,
  context,
  scope,
  collection,
  headSha,
  unit,
  dryRun,
  driver,
  snapshot
}) {
  const sourcePath = unit.path;
  const blobSha = unit.blobSha;

  if (!blobSha) {
    return {
      ingested: false,
      skipped: true,
      deleted: 0,
      pointsUpserted: 0,
      estimatedTokens: 0,
      warning: `Missing blob SHA for file "${sourcePath}".`
    };
  }

  const sourceText = await readRepoFile(snapshot, sourcePath);
  if (!sourceText || !sourceText.trim()) {
    return {
      ingested: false,
      skipped: true,
      deleted: 0,
      pointsUpserted: 0,
      estimatedTokens: 0,
      warning: `Empty content for file "${sourcePath}".`
    };
  }

  const chunks = chunkTextWithRanges(sourceText);
  if (!chunks.length) {
    return {
      ingested: false,
      skipped: true,
      deleted: 0,
      pointsUpserted: 0,
      estimatedTokens: 0,
      warning: `No chunks produced for file "${sourcePath}".`
    };
  }

  const language = detectLanguage(sourcePath);
  const symbolResult = extractSymbols({
    language,
    sourceText,
    sourcePath
  });
  const symbols = symbolResult.symbols || [];
  const contentKind = classifyContentKind({
    sourcePath,
    language,
    symbols
  });
  const embeddingProfile = resolveEmbeddingProfile(context);

  const estimatedTokens = chunks.reduce((total, chunk) => total + estimateTokens(chunk.text), 0);
  const owner = parseRepoOwner(repo);

  if (dryRun) {
    return {
      ingested: true,
      skipped: false,
      deleted: 1,
      pointsUpserted: chunks.length,
      estimatedTokens,
      warning: symbolResult.warning || null
    };
  }

  await qdrantDeleteByFilter({
    collection,
    filter: fileFilter({ repo, branch, context, scope, sourcePath })
  });

  const vectors = await driver.embedMany(chunks.map((chunk) => chunk.text));
  const now = nowIso();
  const points = chunks.map((chunk, index) => {
    const chunkId = hashChunkId(`${repo}:${branch}:${sourcePath}:${index}:${blobSha}`);
    const seed = `V2:github:${context}:${scope}:${repo}:${branch}:${sourcePath}:${index}:${blobSha}:${INDEX_VERSION}`;
    const chunkSymbol = selectChunkSymbol({
      symbols,
      chunkStartLine: chunk.startLine,
      chunkEndLine: chunk.endLine
    });

    return {
      id: normalizePointId(seed),
      vector: vectors[index],
      payload: {
        source_type: 'github',
        context,
        scope,
        organization: owner,
        repo,
        branch,
        source_path: sourcePath,
        blob_sha: blobSha,
        commit_sha: headSha,
        chunk_id: chunkId,
        chunk_index: index,
        text: chunk.text,
        chunk_start_line: chunk.startLine,
        chunk_end_line: chunk.endLine,
        language,
        content_kind: contentKind,
        embedding_profile: embeddingProfile,
        symbol_name: chunkSymbol?.name || null,
        symbol_path: chunkSymbol?.path || null,
        symbol_parser: symbolResult.parser || null,
        index_version: INDEX_VERSION,
        embedding_provider: driver.meta().provider,
        embedding_model: driver.meta().model,
        embedding_dim: driver.meta().dim,
        updated: now,
        created: now
      }
    };
  });

  await qdrantUpsert({ collection, points });

  return {
    ingested: true,
    skipped: false,
    deleted: 1,
    pointsUpserted: points.length,
    estimatedTokens,
    warning: symbolResult.warning || null
  };
}

async function processDeleteOnlyUnit({ repo, branch, context, scope, collection, unit, dryRun }) {
  const path = unit.path;
  if (!path) {
    return {
      deleted: 0,
      skipped: true,
      warning: 'Delete unit without path.'
    };
  }

  if (!dryRun) {
    await qdrantDeleteByFilter({
      collection,
      filter: fileFilter({ repo, branch, context, scope, sourcePath: path })
    });
  }

  return {
    deleted: 1,
    skipped: false,
    warning: null
  };
}

async function processRepo({
  repo,
  context,
  scope,
  mode,
  branchInput,
  fromSha,
  dryRun,
  extensionSet,
  onRepoStart,
  onRepoProgress,
  collection,
  driver,
  debug = null
}) {
  const detail = buildBaseRepoDetail({ repo, context, scope, mode });
  let snapshot = null;

  try {
    snapshot = await cloneRepositorySnapshot(repo, branchInput);
    const branch = snapshot.branch;
    const headSha = snapshot.headSha;
    detail.branch = branch;
    detail.head_sha = headSha;

    let cursorBefore = null;
    if (mode === 'delta') {
      if (fromSha) {
        cursorBefore = fromSha;
      } else {
        try {
          cursorBefore = await readCursor({ repo, branch, context, scope });
        } catch (err) {
          if (!dryRun) throw err;
          detail.warnings.push(`Cursor lookup skipped in dry-run: ${err.message}`);
          cursorBefore = null;
        }
      }
      detail.cursor_before = cursorBefore;
      if (!cursorBefore && !fromSha) {
        detail.mode_effective = 'full';
      }
    }

    if (mode === 'full') {
      detail.mode_effective = 'full';
    }

    let filesDetectedTotal = 0;
    let units = [];

    if (detail.mode_effective === 'full') {
      const full = await listFullUnits(snapshot, extensionSet, debug);
      filesDetectedTotal = full.filesDetectedTotal;
      units = full.units;
      if (debug === 'excluded') {
        detail.debug_paths = full.excludedByExtension.map((item) => item.path);
      } else if (debug === 'included') {
        detail.debug_paths = units.map((item) => item.path);
      }
    } else {
      const delta = await listDeltaUnits(snapshot, cursorBefore || fromSha, headSha, extensionSet, debug);
      filesDetectedTotal = delta.filesDetectedTotal;
      units = delta.units;
      if (debug === 'excluded') {
        detail.debug_paths = delta.excludedByExtension.map((item) => item.path);
      } else if (debug === 'included') {
        detail.debug_paths = units.map((item) => item.path);
      }
    }

    detail.files_detected_total = filesDetectedTotal;
    detail.files_indexable_total = units.length;
    detail.files_excluded_total = Math.max(0, filesDetectedTotal - units.length);
    detail.files_changed = units.length;

    if (typeof onRepoStart === 'function') {
      onRepoStart({
        repo,
        branch,
        mode_effective: detail.mode_effective,
        files_detected_total: detail.files_detected_total,
        files_indexable_total: detail.files_indexable_total,
        files_excluded_total: detail.files_excluded_total,
        debug_mode: debug,
        debug_paths: detail.debug_paths || []
      });
    }

    if (detail.mode_effective === 'full' && !dryRun) {
      await qdrantDeleteByFilter({
        collection,
        filter: repoFilter({ repo, branch, context, scope })
      });
    }

    if (typeof onRepoProgress === 'function') {
      onRepoProgress({ repo, processed: 0, total: units.length });
    }

    let processed = 0;

    for (const unit of units) {
      try {
        if (unit.status === 'removed') {
          const result = await processDeleteOnlyUnit({
            repo,
            branch,
            context,
            scope,
            collection,
            unit,
            dryRun
          });
          detail.files_deleted += result.deleted;
          if (result.skipped) detail.files_skipped += 1;
          if (result.warning) detail.warnings.push(result.warning);
        } else {
          // Handle rename cleanup before ingesting new path.
          for (const deletePath of unit.deletePaths || []) {
            if (!deletePath) continue;
            if (!dryRun) {
              // eslint-disable-next-line no-await-in-loop
              await qdrantDeleteByFilter({
                collection,
                filter: fileFilter({ repo, branch, context, scope, sourcePath: deletePath })
              });
            }
            detail.files_deleted += 1;
          }

          const result = await processUpsertUnit({
            repo,
            branch,
            context,
            scope,
            collection,
            headSha,
            unit,
            dryRun,
            driver,
            snapshot
          });

          if (result.ingested) detail.files_ingested += 1;
          if (result.skipped) detail.files_skipped += 1;
          detail.files_deleted += result.deleted;
          detail.points_upserted += result.pointsUpserted;
          detail.estimated_tokens_total += result.estimatedTokens;
          if (result.warning) detail.warnings.push(result.warning);
        }
      } catch (err) {
        detail.files_skipped += 1;
        detail.warnings.push(`File "${unit.path}": ${err.message}`);
      } finally {
        processed += 1;
        if (typeof onRepoProgress === 'function') {
          onRepoProgress({ repo, processed, total: units.length });
        }
      }
    }

    detail.estimated_cost_usd = estimateCost(detail.estimated_tokens_total);

    if (!dryRun) {
      await writeCursor({
        repo,
        branch,
        context,
        scope,
        lastProcessedSha: headSha
      });
      detail.cursor_after = headSha;
    } else {
      detail.cursor_after = detail.cursor_before;
    }

    detail.status = 'success';
    detail.error = null;
    return detail;
  } finally {
    await cleanupRepositorySnapshot(snapshot);
  }
}

export async function ingestGithubBatch({
  repos,
  context,
  scope,
  mode,
  branch = null,
  includeExtensions = null,
  fromSha = null,
  dryRun = false,
  debug = null,
  onRepoStart,
  onRepoProgress
}) {
  const startedAt = nowIso();
  const normalizedMode = String(mode || '').toLowerCase();
  if (!ALLOWED_MODES.has(normalizedMode)) {
    throw new Error(`Invalid mode "${mode}". Valid values: full, delta.`);
  }
  const normalizedDebug = debug == null ? null : String(debug).trim().toLowerCase();
  if (normalizedDebug && !['excluded', 'included'].includes(normalizedDebug)) {
    throw new Error(`Invalid debug "${debug}". Valid values: excluded, included.`);
  }

  const normalizedContext = resolveContextScope(context, scope).context;
  const normalizedScope = resolveContextScope(context, scope).scope;
  if (normalizedScope === 'global') {
    throw new Error('Scope "global" is not allowed for ingest:github writes.');
  }

  const { collections } = resolveVectorCollections(normalizedContext, normalizedScope);
  if (collections.length !== 1) {
    throw new Error(
      `Expected exactly one target collection for context="${normalizedContext}" scope="${normalizedScope}", got ${collections.length}.`
    );
  }
  const collection = collections[0];
  const extensionSet = normalizeExtensions(includeExtensions);
  const driver = dryRun ? null : getEmbeddingDriver();

  if (!dryRun) {
    await ensureCollection(collection);
    await ensureCollection(QDRANT_COLLECTION_INGEST_CURSORS, { vectorSize: 1, distance: 'Cosine' });
  }

  const details = [];
  for (const repo of repos) {
    try {
      // eslint-disable-next-line no-await-in-loop
      const detail = await processRepo({
        repo,
        context: normalizedContext,
        scope: normalizedScope,
        mode: normalizedMode,
        branchInput: branch,
        fromSha,
        dryRun,
        extensionSet,
        onRepoStart,
        onRepoProgress,
        collection,
        driver,
        debug: normalizedDebug
      });
      details.push(detail);
    } catch (err) {
      const failed = buildBaseRepoDetail({
        repo,
        context: normalizedContext,
        scope: normalizedScope,
        mode: normalizedMode
      });
      failed.status = 'failed';
      failed.error = err.message;
      details.push(failed);
    }
  }

  const reposSuccess = details.filter((item) => item.status === 'success').length;
  const reposFailed = details.length - reposSuccess;
  const totalsChunks = details.reduce((acc, item) => acc + (item.points_upserted || 0), 0);
  const totalsEstimatedTokens = details.reduce((acc, item) => acc + (item.estimated_tokens_total || 0), 0);

  return {
    tool: 'ingest-github',
    mode: normalizedMode,
    context: normalizedContext,
    scope: normalizedScope,
    started_at: startedAt,
    finished_at: nowIso(),
    repos_total: details.length,
    repos_success: reposSuccess,
    repos_failed: reposFailed,
    totals_files_detected: details.reduce((acc, item) => acc + (item.files_detected_total || 0), 0),
    totals_files_indexable: details.reduce((acc, item) => acc + (item.files_indexable_total || 0), 0),
    totals_points_upserted: totalsChunks,
    totals_chunks: totalsChunks,
    totals_estimated_tokens: totalsEstimatedTokens,
    totals_estimated_cost_usd: estimateCost(totalsEstimatedTokens),
    details
  };
}
