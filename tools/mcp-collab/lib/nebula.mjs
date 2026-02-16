// ---------------------------------------------------------------------------
// NebulaGraph client — query execution via docker + nebula-console
// ---------------------------------------------------------------------------

import { spawnSync } from 'node:child_process';
import {
  NEBULA_CONSOLE_IMAGE,
  NEBULA_NETWORK,
  NEBULA_ADDR,
  NEBULA_PORT,
  NEBULA_USER,
  NEBULA_PASSWORD
} from '../config.mjs';

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
 * Strip nebula-console prompt lines and "Bye" messages from output.
 */
export function cleanNebulaOutput(output) {
  return output
    .split('\n')
    .filter((line) => !line.startsWith('(root@nebula)'))
    .filter((line) => line.trim() !== 'Bye root!')
    .join('\n')
    .trim();
}

/**
 * Execute an nGQL query via `docker run --rm nebula-console`.
 * Throws on timeout (30 s) or non-zero exit.
 */
export function runNebulaQuery(query) {
  const args = [
    'run',
    '--rm',
    '--network',
    NEBULA_NETWORK,
    NEBULA_CONSOLE_IMAGE,
    '-u',
    NEBULA_USER,
    '-p',
    NEBULA_PASSWORD,
    '-addr',
    NEBULA_ADDR,
    '-port',
    NEBULA_PORT,
    '-e',
    query
  ];
  const result = spawnSync('docker', args, { encoding: 'utf8', timeout: 30_000 });
  if (result.error) {
    if (result.error.code === 'ETIMEDOUT') {
      throw new Error('Nebula query timed out.');
    }
    throw new Error(result.error.message);
  }
  if (result.status !== 0) {
    throw new Error(result.stderr || result.stdout || `docker exited ${result.status}`);
  }
  return cleanNebulaOutput(result.stdout || '');
}
