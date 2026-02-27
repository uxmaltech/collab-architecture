// ---------------------------------------------------------------------------
// Embedding driver: Google Gemini
// ---------------------------------------------------------------------------

import {
  EMBED_DIM,
  GEMINI_API_KEY,
  GEMINI_EMBED_MODEL,
  GEMINI_BASE_URL,
  GEMINI_MAX_BATCH
} from '../../config.mjs';

const RETRYABLE_STATUS = new Set([429, 500, 502, 503, 504]);

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function normalizeModel(model) {
  return model.startsWith('models/') ? model : `models/${model}`;
}

function unique(values) {
  return Array.from(new Set(values.filter(Boolean)));
}

function isNotFoundError(err) {
  if (!err) return false;
  if (err.status === 404) return true;
  const msg = String(err.message || '').toLowerCase();
  return msg.includes('not found');
}

function isEmbeddingModel(name) {
  const normalized = name.toLowerCase();
  return normalized.includes('embedding');
}

function supportsMethod(model, method) {
  return Array.isArray(model?.supportedGenerationMethods) && model.supportedGenerationMethods.includes(method);
}

function extractVectorsFromBatch(json) {
  const items = json?.embeddings;
  if (!Array.isArray(items)) return null;
  return items.map((item) => item?.values || item?.embedding?.values || null);
}

function extractVectorFromSingle(json) {
  return json?.embedding?.values || json?.values || null;
}

function ensureDim(vector, dim) {
  if (!Array.isArray(vector)) {
    throw new Error('Gemini returned a non-array embedding vector.');
  }
  if (vector.length !== dim) {
    throw new Error(`Gemini embedding dimension ${vector.length} does not match EMBED_DIM=${dim}.`);
  }
  return vector;
}

async function fetchJsonWithRetry(url, body, apiKey, maxAttempts = 4, method = 'POST') {
  let lastError = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const finalUrl = `${url}${url.includes('?') ? '&' : '?'}key=${encodeURIComponent(apiKey)}`;
    const res = await fetch(finalUrl, {
      method,
      headers: {
        'Content-Type': 'application/json'
      },
      body: body != null ? JSON.stringify(body) : undefined
    });

    if (res.ok) {
      return res.json();
    }

    const text = await res.text();
    const err = new Error(`Gemini API error ${res.status}: ${text}`);
    err.status = res.status;
    err.responseText = text;
    lastError = err;

    if (!RETRYABLE_STATUS.has(res.status) || attempt === maxAttempts) {
      throw err;
    }

    const delay = Math.min(4000, 250 * 2 ** (attempt - 1));
    await sleep(delay);
  }

  throw lastError || new Error('Unknown Gemini API failure.');
}

export class GeminiEmbeddingDriver {
  constructor({
    apiKey = GEMINI_API_KEY,
    model = GEMINI_EMBED_MODEL,
    dim = EMBED_DIM,
    baseUrl = GEMINI_BASE_URL,
    maxBatch = GEMINI_MAX_BATCH
  } = {}) {
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY is required when EMBED_PROVIDER=gemini.');
    }

    this.apiKey = apiKey;
    this.model = normalizeModel(model);
    this.dim = dim;
    this.baseUrl = baseUrl;
    this.maxBatch = Math.max(1, maxBatch);
    this.modelCandidates = unique([
      this.model,
      'models/gemini-embedding-001',
      'models/text-embedding-004',
      'models/embedding-001'
    ]);
    this.discoveredModels = null;
  }

  meta() {
    return {
      provider: 'gemini',
      model: this.model,
      dim: this.dim
    };
  }

  async discoverEmbeddingModels() {
    if (this.discoveredModels) {
      return this.discoveredModels;
    }

    const json = await fetchJsonWithRetry(`${this.baseUrl}/models`, null, this.apiKey, 4, 'GET');
    const models = Array.isArray(json?.models) ? json.models : [];
    const candidates = models
      .filter((m) => isEmbeddingModel(m?.name || ''))
      .filter((m) => supportsMethod(m, 'embedContent') || supportsMethod(m, 'batchEmbedContents'))
      .map((m) => m.name);

    this.discoveredModels = unique(candidates);
    return this.discoveredModels;
  }

  async tryEmbedOneWithModel(text, model) {
    const url = `${this.baseUrl}/${model}:embedContent`;
    const body = {
      model,
      outputDimensionality: this.dim,
      content: {
        parts: [{ text }]
      }
    };

    const json = await fetchJsonWithRetry(url, body, this.apiKey);
    return ensureDim(extractVectorFromSingle(json), this.dim);
  }

  async embedOne(text) {
    const initialCandidates = unique([this.model, ...this.modelCandidates]);
    let lastError = null;

    for (const candidate of initialCandidates) {
      try {
        const vector = await this.tryEmbedOneWithModel(text, candidate);
        this.model = candidate;
        this.modelCandidates = unique([candidate, ...this.modelCandidates]);
        return vector;
      } catch (err) {
        lastError = err;
        if (!isNotFoundError(err)) {
          throw err;
        }
      }
    }

    const discovered = await this.discoverEmbeddingModels();
    for (const candidate of discovered) {
      try {
        const vector = await this.tryEmbedOneWithModel(text, candidate);
        this.model = candidate;
        this.modelCandidates = unique([candidate, ...this.modelCandidates]);
        return vector;
      } catch (err) {
        lastError = err;
      }
    }

    throw new Error(
      `No compatible Gemini embedding model found. Tried: ${unique([...initialCandidates, ...discovered]).join(', ')}. ` +
        `Last error: ${lastError?.message || 'unknown error'}`
    );
  }

  async embedMany(texts) {
    if (!texts.length) return [];

    // Prime model resolution with one text, then batch the rest using current model.
    const firstVector = await this.embedOne(texts[0]);
    if (texts.length === 1) return [firstVector];

    const out = [firstVector];
    for (let i = 1; i < texts.length; i += this.maxBatch) {
      const slice = texts.slice(i, i + this.maxBatch);
      const url = `${this.baseUrl}/${this.model}:batchEmbedContents`;
      const body = {
        requests: slice.map((text) => ({
          model: this.model,
          outputDimensionality: this.dim,
          content: {
            parts: [{ text }]
          }
        }))
      };

      try {
        const json = await fetchJsonWithRetry(url, body, this.apiKey);
        const batch = extractVectorsFromBatch(json);
        if (!batch || batch.length !== slice.length) {
          throw new Error('Gemini batch response shape mismatch.');
        }
        out.push(...batch.map((vector) => ensureDim(vector, this.dim)));
      } catch (_err) {
        // Fallback to single-request mode for this chunk.
        for (const text of slice) {
          // eslint-disable-next-line no-await-in-loop
          out.push(await this.embedOne(text));
        }
      }
    }

    return out;
  }
}
