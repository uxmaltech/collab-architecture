// ---------------------------------------------------------------------------
// Text processing — paragraph splitting, token estimation, semantic chunking
// ---------------------------------------------------------------------------

/**
 * Split text into paragraphs (separated by blank lines).
 */
export function splitParagraphs(text) {
  return text
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);
}

/**
 * Rough token estimate based on whitespace-delimited word count.
 */
export function estimateTokens(text) {
  return Math.max(1, text.split(/\s+/).length);
}

/**
 * Split text into chunks of approximately `targetTokens` tokens,
 * preserving paragraph boundaries with `overlapTokens` of overlap.
 */
export function chunkText(text, targetTokens = 350, overlapTokens = 40) {
  const paragraphs = splitParagraphs(text);
  const chunks = [];
  let current = [];
  let currentTokens = 0;

  for (const para of paragraphs) {
    const paraTokens = estimateTokens(para);
    if (currentTokens + paraTokens > targetTokens && current.length) {
      const chunk = current.join('\n\n');
      chunks.push(chunk);
      const overlap = chunk.split(/\s+/).slice(-overlapTokens).join(' ');
      current = overlap ? [overlap, para] : [para];
      currentTokens = estimateTokens(current.join(' '));
    } else {
      current.push(para);
      currentTokens += paraTokens;
    }
  }

  if (current.length) {
    chunks.push(current.join('\n\n'));
  }
  return chunks;
}
