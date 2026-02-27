// ---------------------------------------------------------------------------
// Embedding driver factory
// ---------------------------------------------------------------------------

import { EMBED_PROVIDER } from '../../config.mjs';
import { assertEmbeddingDriver } from './driver.interface.mjs';
import { DeterministicEmbeddingDriver } from './deterministic.driver.mjs';
import { GeminiEmbeddingDriver } from './gemini.driver.mjs';

let singleton = null;

export function createEmbeddingDriver(provider = EMBED_PROVIDER) {
  const normalized = String(provider || '').toLowerCase();

  if (normalized === 'deterministic') {
    const driver = new DeterministicEmbeddingDriver();
    assertEmbeddingDriver(driver);
    return driver;
  }

  if (normalized === 'gemini') {
    const driver = new GeminiEmbeddingDriver();
    assertEmbeddingDriver(driver);
    return driver;
  }

  throw new Error(`Unsupported embedding provider: ${provider}`);
}

export function getEmbeddingDriver() {
  if (!singleton) {
    singleton = createEmbeddingDriver();
  }
  return singleton;
}
