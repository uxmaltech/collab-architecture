// ---------------------------------------------------------------------------
// Language symbol parser registry — extensible parser lookup by language
// ---------------------------------------------------------------------------

const PARSERS = [];

/**
 * Register a language symbol parser.
 * Parser contract:
 * - name: string
 * - supports(language: string): boolean
 * - parse({ sourceText, sourcePath, language }): SymbolInfo[]
 */
export function registerLanguageSymbolParser(parser) {
  if (!parser || typeof parser !== 'object') {
    throw new Error('registerLanguageSymbolParser requires a parser object.');
  }
  if (typeof parser.name !== 'string' || !parser.name.trim()) {
    throw new Error('Parser must define a non-empty name.');
  }
  if (typeof parser.supports !== 'function') {
    throw new Error(`Parser "${parser.name}" must implement supports(language).`);
  }
  if (typeof parser.parse !== 'function') {
    throw new Error(`Parser "${parser.name}" must implement parse({ sourceText, sourcePath, language }).`);
  }

  const existingIndex = PARSERS.findIndex((entry) => entry.name === parser.name);
  if (existingIndex >= 0) {
    PARSERS[existingIndex] = parser;
    return;
  }

  PARSERS.push(parser);
}

/**
 * Return parser for the given language or null when unsupported.
 */
export function getLanguageSymbolParser(language) {
  return PARSERS.find((parser) => parser.supports(language)) || null;
}

/**
 * List registered parser names.
 */
export function listLanguageSymbolParsers() {
  return PARSERS.map((parser) => parser.name);
}
