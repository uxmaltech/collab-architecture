// ---------------------------------------------------------------------------
// Embedding driver interface contract (documentation + runtime checks)
// ---------------------------------------------------------------------------

/**
 * @typedef {{ provider: string, model: string, dim: number }} EmbeddingMeta
 */

/**
 * @typedef {{
 *   embedOne(text: string): Promise<number[]>,
 *   embedMany(texts: string[]): Promise<number[][]>,
 *   meta(): EmbeddingMeta
 * }} EmbeddingDriver
 */

/**
 * Runtime guard to ensure a driver matches the expected interface.
 * @param {unknown} driver
 * @returns {asserts driver is EmbeddingDriver}
 */
export function assertEmbeddingDriver(driver) {
  if (!driver || typeof driver !== 'object') {
    throw new Error('Invalid embedding driver: expected object.');
  }
  if (typeof driver.embedOne !== 'function') {
    throw new Error('Invalid embedding driver: missing embedOne(text).');
  }
  if (typeof driver.embedMany !== 'function') {
    throw new Error('Invalid embedding driver: missing embedMany(texts).');
  }
  if (typeof driver.meta !== 'function') {
    throw new Error('Invalid embedding driver: missing meta().');
  }
}
