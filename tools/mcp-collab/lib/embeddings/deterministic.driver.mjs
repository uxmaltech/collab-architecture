// ---------------------------------------------------------------------------
// Embedding driver: deterministic hash fallback
// ---------------------------------------------------------------------------

import { EMBED_DIM } from '../../config.mjs';
import { embedDeterministic } from '../hashing.mjs';

export class DeterministicEmbeddingDriver {
  constructor(dim = EMBED_DIM) {
    this.dim = dim;
  }

  meta() {
    return {
      provider: 'deterministic',
      model: 'sha256-repeat',
      dim: this.dim
    };
  }

  async embedOne(text) {
    return embedDeterministic(text, this.dim);
  }

  async embedMany(texts) {
    return texts.map((text) => embedDeterministic(text, this.dim));
  }
}
