#!/usr/bin/env node
// ---------------------------------------------------------------------------
// Ingest GitHub changes into scoped V2 collections (full/delta)
// ---------------------------------------------------------------------------

import process from 'node:process';
import { createInterface } from 'node:readline/promises';

import { DEFAULT_INCLUDE_EXTENSIONS, ingestGithubBatch } from '../lib/ingest-github.mjs';

function printHelp() {
  const defaults = DEFAULT_INCLUDE_EXTENSIONS.join(',');
  process.stdout.write(
    [
      'Usage:',
      '  npm run ingest:github -- --repo owner/name --context technical --scope uxmaltech --mode full',
      '',
      'Required:',
      '  --repo <owner/name>       Repeatable repository argument.',
      '  --context <technical|business>',
      '  --scope <name>            Scope name matching MCP_TECHNICAL_SCOPES (e.g. uxmaltech).',
      '  --mode <full|delta>',
      '',
      'Optional:',
      '  --branch <name>           Uses repo default branch when omitted.',
      '  --include-ext <csv>       File extensions to index.',
      '  --from-sha <sha>          Base SHA for delta mode.',
      '  --dry-run                 Estimate only (no writes, no embedding API calls).',
      '  --debug <excluded|included>  Print excluded/included file path list before processing.',
      '  --skip-embed-confirm      Skip the default preflight confirmation before writes.',
      '  --no-progress             Disable progress output.',
      '  --help                    Show this help.',
      '',
      `Default extensions: ${defaults}`
    ].join('\n') + '\n'
  );
}

function parseArgs(argv) {
  const args = {
    repos: [],
    context: null,
    scope: null,
    mode: null,
    branch: null,
    includeExtensions: [],
    fromSha: null,
    dryRun: false,
    debug: null,
    skipEmbedConfirm: false,
    noProgress: false
  };

  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];

    if (token === '--help' || token === '-h') {
      args.help = true;
      continue;
    }

    if (token === '--dry-run') {
      args.dryRun = true;
      continue;
    }

    if (token === '--no-progress') {
      args.noProgress = true;
      continue;
    }
    if (token === '--skip-embed-confirm') {
      args.skipEmbedConfirm = true;
      continue;
    }
    const value = argv[i + 1];
    if (value == null) {
      throw new Error(`Missing value for argument ${token}.`);
    }

    switch (token) {
      case '--repo':
        args.repos.push(value);
        i += 1;
        break;
      case '--context':
        args.context = value.toLowerCase();
        i += 1;
        break;
      case '--scope':
        args.scope = value.toLowerCase();
        i += 1;
        break;
      case '--mode':
        args.mode = value.toLowerCase();
        i += 1;
        break;
      case '--branch':
        args.branch = value;
        i += 1;
        break;
      case '--include-ext':
        args.includeExtensions.push(
          ...value
            .split(',')
            .map((item) => item.trim())
            .filter(Boolean)
        );
        i += 1;
        break;
      case '--from-sha':
        args.fromSha = value;
        i += 1;
        break;
      case '--debug':
        args.debug = value.toLowerCase();
        i += 1;
        break;
      default:
        throw new Error(`Unknown argument: ${token}`);
    }
  }

  return args;
}

function buildProgressHandlers({ enabled, includeDebugList = false }) {
  const interactive = enabled && process.stderr.isTTY;
  const milestonesByRepo = new Map();

  const writeProgress = (repo, processed, total) => {
    const safeTotal = total || 0;
    const percent = safeTotal === 0 ? 100 : Math.floor((processed / safeTotal) * 100);
    if (interactive) {
      const width = 20;
      const completed = Math.round((percent / 100) * width);
      const bar = `[${'#'.repeat(completed)}${'-'.repeat(width - completed)}]`;
      process.stderr.write(`\r${bar} ${String(percent).padStart(3)}% (${processed}/${safeTotal}) repo=${repo}`);
      if (processed >= safeTotal) {
        process.stderr.write('\n');
      }
      return;
    }

    if (!enabled) return;

    const reached = [0, 25, 50, 75, 100].filter((m) => m <= percent);
    const last = reached.length ? reached[reached.length - 1] : 0;
    const prev = milestonesByRepo.get(repo) ?? -1;
    if (last > prev) {
      milestonesByRepo.set(repo, last);
      process.stderr.write(`progress repo=${repo} ${last}% (${processed}/${safeTotal})\n`);
    }
  };

  return {
    onRepoStart: (info) => {
      process.stderr.write(
        `repo=${info.repo} mode=${info.mode_effective} branch=${info.branch} detected=${info.files_detected_total} ` +
          `indexable=${info.files_indexable_total} excluded=${info.files_excluded_total}\n`
      );
      if (includeDebugList && info.debug_mode && Array.isArray(info.debug_paths)) {
        process.stderr.write(`debug repo=${info.repo} type=${info.debug_mode} count=${info.debug_paths.length}\n`);
        for (const filePath of info.debug_paths) {
          process.stderr.write(`  - ${filePath}\n`);
        }
      }
    },
    onRepoProgress: ({ repo, processed, total }) => {
      writeProgress(repo, processed, total);
    }
  };
}

function printPreflightSummary(summary) {
  const totalChunks = summary.totals_chunks ?? summary.totals_points_upserted ?? 0;
  process.stderr.write(
    [
      '',
      'Preflight summary (no writes):',
      `  repos_total=${summary.repos_total} success=${summary.repos_success} failed=${summary.repos_failed}`,
      `  totals_detected=${summary.totals_files_detected} totals_indexable=${summary.totals_files_indexable}`,
      `  totals_chunks=${totalChunks} totals_estimated_tokens=${summary.totals_estimated_tokens} totals_estimated_cost_usd=${summary.totals_estimated_cost_usd ?? 'null'}`,
      ''
    ].join('\n')
  );

  for (const detail of summary.details || []) {
    process.stderr.write(
      `  - repo=${detail.repo} mode=${detail.mode_effective} branch=${detail.branch || 'n/a'} ` +
        `status=${detail.status} detected=${detail.files_detected_total} indexable=${detail.files_indexable_total} ` +
        `tokens=${detail.estimated_tokens_total} cost=${detail.estimated_cost_usd ?? 'null'}\n`
    );
    if (detail.status !== 'success' && detail.error) {
      process.stderr.write(`    error=${detail.error}\n`);
    }
  }
}

function printBatchTotals(summary, { label = 'Run totals' } = {}) {
  const totalChunks = summary.totals_chunks ?? summary.totals_points_upserted ?? 0;
  process.stderr.write(
    [
      '',
      `${label}:`,
      `  chunks=${totalChunks}`,
      `  tokens=${summary.totals_estimated_tokens ?? 0}`,
      `  estimated_cost_usd=${summary.totals_estimated_cost_usd ?? 'null'}`,
      ''
    ].join('\n')
  );
}

async function askForConfirmation() {
  if (!process.stdin.isTTY || !process.stdout.isTTY) {
    throw new Error(
      'Interactive confirmation is required before indexing. Re-run with --skip-embed-confirm in non-interactive mode.'
    );
  }

  const rl = createInterface({
    input: process.stdin,
    output: process.stdout
  });

  try {
    const answer = await rl.question('Proceed with indexing? [y/N] ');
    return ['y', 'yes'].includes(String(answer || '').trim().toLowerCase());
  } finally {
    rl.close();
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    printHelp();
    return;
  }

  if (!args.repos.length) throw new Error('At least one --repo is required.');
  if (!args.context) throw new Error('--context is required.');
  if (!args.scope) throw new Error('--scope is required.');
  if (!args.mode) throw new Error('--mode is required.');

  const runHandlers = buildProgressHandlers({
    enabled: !args.noProgress,
    includeDebugList: args.dryRun && Boolean(args.debug)
  });
  const preflightHandlers = buildProgressHandlers({
    enabled: false,
    includeDebugList: Boolean(args.debug)
  });

  if (!args.dryRun) {
    const preflight = await ingestGithubBatch({
      repos: args.repos,
      context: args.context,
      scope: args.scope,
      mode: args.mode,
      branch: args.branch,
      includeExtensions: args.includeExtensions.length ? args.includeExtensions : null,
      fromSha: args.fromSha,
      dryRun: true,
      debug: args.debug,
      onRepoStart: preflightHandlers.onRepoStart
    });

    printPreflightSummary(preflight);

    if (preflight.repos_failed > 0) {
      throw new Error('Preflight detected failures. Fix errors or run with --dry-run to inspect details.');
    }

    if (!args.skipEmbedConfirm) {
      const accepted = await askForConfirmation();
      if (!accepted) {
        process.stdout.write(
          `${JSON.stringify(
            {
              tool: 'ingest-github',
              status: 'cancelled',
              reason: 'User declined confirmation prompt.',
              preflight
            },
            null,
            2
          )}\n`
        );
        return;
      }
    }
  }

  const summary = await ingestGithubBatch({
    repos: args.repos,
    context: args.context,
    scope: args.scope,
    mode: args.mode,
    branch: args.branch,
    includeExtensions: args.includeExtensions.length ? args.includeExtensions : null,
    fromSha: args.fromSha,
    dryRun: args.dryRun,
    debug: args.debug,
    onRepoStart: runHandlers.onRepoStart,
    onRepoProgress: runHandlers.onRepoProgress
  });

  if ((summary.repos_total || 0) > 1) {
    printBatchTotals(summary, {
      label: args.dryRun ? 'Dry-run totals' : 'Run totals'
    });
  }

  process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
  if (summary.repos_failed > 0) {
    process.exitCode = 1;
  }
}

main().catch((err) => {
  process.stderr.write(`${err.message}\n`);
  process.exit(1);
});
