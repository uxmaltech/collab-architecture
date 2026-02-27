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
 * Split text into paragraph units preserving line ranges.
 */
export function splitParagraphsWithRanges(text) {
  const lines = String(text || '').split('\n');
  const paragraphs = [];
  let index = 0;

  while (index < lines.length) {
    while (index < lines.length && !lines[index].trim()) {
      index += 1;
    }
    if (index >= lines.length) break;

    const start = index;
    const body = [];
    while (index < lines.length && lines[index].trim()) {
      body.push(lines[index]);
      index += 1;
    }

    paragraphs.push({
      text: body.join('\n').trim(),
      startLine: start + 1,
      endLine: index
    });
  }

  return paragraphs.filter((entry) => entry.text);
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
export function chunkTextWithRanges(text, targetTokens = 350, overlapTokens = 40) {
  const paragraphs = splitParagraphsWithRanges(text);
  const chunks = [];
  let current = [];
  let currentTokens = 0;

  function pushCurrentChunk() {
    if (!current.length) return;
    chunks.push({
      text: current.map((item) => item.text).join('\n\n'),
      startLine: current[0].startLine,
      endLine: current[current.length - 1].endLine
    });
  }

  for (const paragraph of paragraphs) {
    const paragraphTokens = estimateTokens(paragraph.text);
    if (currentTokens + paragraphTokens > targetTokens && current.length) {
      pushCurrentChunk();

      // Keep paragraph-level overlap from previous chunk.
      const overlap = [];
      let overlapTokenCount = 0;
      for (let index = current.length - 1; index >= 0; index -= 1) {
        overlap.unshift(current[index]);
        overlapTokenCount += estimateTokens(current[index].text);
        if (overlapTokenCount >= overlapTokens) break;
      }

      current = overlap.length ? [...overlap, paragraph] : [paragraph];
      currentTokens = current.reduce((sum, item) => sum + estimateTokens(item.text), 0);
      continue;
    }

    current.push(paragraph);
    currentTokens += paragraphTokens;
  }

  pushCurrentChunk();
  return chunks.filter((chunk) => chunk.text && chunk.text.trim());
}

/**
 * Backward-compatible chunk list (text only).
 */
export function chunkText(text, targetTokens = 350, overlapTokens = 40) {
  return chunkTextWithRanges(text, targetTokens, overlapTokens).map((chunk) => chunk.text);
}
