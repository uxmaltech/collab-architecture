// ---------------------------------------------------------------------------
// Git repository client — temporary clone + local git inspection
// ---------------------------------------------------------------------------

import { execFile } from 'node:child_process';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';

import { GITHUB_TOKEN } from '../config.mjs';

const execFileAsync = promisify(execFile);
const GIT_MAX_BUFFER = 20 * 1024 * 1024;

function requireGithubToken() {
  if (!GITHUB_TOKEN) {
    throw new Error('GITHUB_TOKEN is required for ingest:github.');
  }
}

function parseRepo(repo) {
  const normalized = String(repo || '').trim();
  const parts = normalized.split('/');
  if (parts.length !== 2 || !parts[0] || !parts[1]) {
    throw new Error(`Invalid repo "${repo}". Expected format: owner/name.`);
  }
  return {
    owner: parts[0],
    name: parts[1],
    fullName: `${parts[0]}/${parts[1]}`
  };
}

function remoteUrl(fullName) {
  return `https://github.com/${fullName}.git`;
}

async function runGit(args, { cwd = null, useAuth = false } = {}) {
  requireGithubToken();
  const commandArgs = useAuth
    ? ['-c', `http.extraheader=Authorization: Bearer ${GITHUB_TOKEN}`, ...args]
    : args;

  try {
    const { stdout } = await execFileAsync('git', commandArgs, {
      cwd: cwd || undefined,
      maxBuffer: GIT_MAX_BUFFER
    });
    return stdout.trimEnd();
  } catch (err) {
    const stderr = String(err?.stderr || '').trim();
    const detail = stderr || err.message || 'unknown git error';
    throw new Error(`git ${args.join(' ')} failed: ${detail}`);
  }
}

export async function getRepoDefaultBranch(repo) {
  const { fullName } = parseRepo(repo);
  const output = await runGit(['ls-remote', '--symref', remoteUrl(fullName), 'HEAD'], { useAuth: true });
  const line = output
    .split('\n')
    .find((item) => item.startsWith('ref:') && item.includes('\tHEAD'));

  if (!line) {
    throw new Error(`Could not resolve default branch for repo "${fullName}".`);
  }

  const match = line.match(/^ref:\s+refs\/heads\/([^\s]+)\s+HEAD$/);
  if (!match?.[1]) {
    throw new Error(`Unexpected default branch response for repo "${fullName}".`);
  }

  return match[1];
}

export async function cloneRepositorySnapshot(repo, branchInput = null) {
  const { fullName } = parseRepo(repo);
  const branch = branchInput || (await getRepoDefaultBranch(fullName));
  const cloneDir = await mkdtemp(path.join(os.tmpdir(), 'mcp-collab-git-'));

  try {
    await runGit(
      ['clone', '--depth', '1', '--single-branch', '--branch', branch, remoteUrl(fullName), cloneDir],
      { useAuth: true }
    );
    const headSha = await runGit(['rev-parse', 'HEAD'], { cwd: cloneDir });
    return {
      repo: fullName,
      branch,
      headSha: String(headSha || '').trim(),
      repoDir: cloneDir
    };
  } catch (err) {
    await rm(cloneDir, { recursive: true, force: true });
    throw err;
  }
}

export async function cleanupRepositorySnapshot(snapshot) {
  if (!snapshot?.repoDir) return;
  await rm(snapshot.repoDir, { recursive: true, force: true });
}

export async function ensureCommitAvailable(snapshot, sha) {
  const commit = String(sha || '').trim();
  if (!commit) return;

  try {
    await runGit(['cat-file', '-e', `${commit}^{commit}`], { cwd: snapshot.repoDir });
    return;
  } catch {
    await runGit(['fetch', '--depth', '1', 'origin', commit], {
      cwd: snapshot.repoDir,
      useAuth: true
    });
  }
}

export async function listTreeBlobs(snapshot, ref = 'HEAD') {
  const output = await runGit(['ls-tree', '-r', ref], { cwd: snapshot.repoDir });
  if (!output.trim()) return [];

  return output
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const match = line.match(/^\d+\s+blob\s+([0-9a-f]{40})\t(.+)$/);
      if (!match) return null;
      return {
        sha: match[1],
        path: match[2]
      };
    })
    .filter(Boolean);
}

export async function listDeltaChanges(snapshot, baseSha, headSha = 'HEAD') {
  await ensureCommitAvailable(snapshot, baseSha);
  const output = await runGit(['diff', '--name-status', '--find-renames', `${baseSha}..${headSha}`], {
    cwd: snapshot.repoDir
  });
  if (!output.trim()) return [];

  return output
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const cols = line.split('\t');
      const rawStatus = cols[0] || '';
      const code = rawStatus.charAt(0).toUpperCase();

      if (code === 'R') {
        return {
          status: 'renamed',
          previousPath: cols[1] || null,
          path: cols[2] || null
        };
      }

      const statusMap = {
        A: 'added',
        M: 'modified',
        D: 'removed',
        C: 'copied'
      };

      return {
        status: statusMap[code] || 'changed',
        previousPath: null,
        path: cols[1] || null
      };
    })
    .filter((item) => item.path);
}

export async function getBlobSha(snapshot, filePath, ref = 'HEAD') {
  try {
    const out = await runGit(['rev-parse', `${ref}:${filePath}`], { cwd: snapshot.repoDir });
    return String(out || '').trim() || null;
  } catch {
    return null;
  }
}

export async function readRepoFile(snapshot, sourcePath) {
  const absPath = path.resolve(snapshot.repoDir, sourcePath);
  const repoDirWithSep = snapshot.repoDir.endsWith(path.sep) ? snapshot.repoDir : `${snapshot.repoDir}${path.sep}`;
  if (!absPath.startsWith(repoDirWithSep)) {
    throw new Error(`Refusing to read path outside repository: ${sourcePath}`);
  }

  return readFile(absPath, 'utf8');
}
