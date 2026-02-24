// ---------------------------------------------------------------------------
// PHP AST symbol parser (php-parser)
// ---------------------------------------------------------------------------

import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const PhpParser = require('php-parser');

function lineFromLoc(loc, fallback = null) {
  if (!loc) return fallback;
  if (Number.isInteger(loc.start?.line)) return loc.start.line;
  return fallback;
}

function endLineFromLoc(loc, fallback = null) {
  if (!loc) return fallback;
  if (Number.isInteger(loc.end?.line)) return loc.end.line;
  return fallback;
}

function nodeName(value) {
  if (!value) return null;
  if (typeof value === 'string') return value;
  if (typeof value.name === 'string') return value.name;
  return null;
}

function normalizeNamespaceName(value) {
  if (!value) return null;
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) {
    const names = value
      .map((part) => {
        if (typeof part === 'string') return part;
        if (part && typeof part.name === 'string') return part.name;
        return '';
      })
      .filter(Boolean);
    return names.length ? names.join('\\') : null;
  }
  if (typeof value.name === 'string') return value.name;
  if (typeof value.resolution === 'string') return value.resolution;
  return null;
}

function pushSymbol(target, { kind, name, path, loc }) {
  if (!name || !path) return;
  target.push({
    kind,
    name,
    path,
    startLine: lineFromLoc(loc),
    endLine: endLineFromLoc(loc)
  });
}

function walkNode(node, state, symbols) {
  if (!node || typeof node !== 'object') return;

  const kind = node.kind;

  if (kind === 'namespace') {
    const namespaceName = normalizeNamespaceName(node.name) || state.namespace;
    const childState = { ...state, namespace: namespaceName };
    const children = Array.isArray(node.children) ? node.children : [];
    for (const child of children) {
      walkNode(child, childState, symbols);
    }
    return;
  }

  if (kind === 'class' || kind === 'interface' || kind === 'trait' || kind === 'enum') {
    const className = nodeName(node.name);
    if (!className) return;
    const classPath = state.namespace ? `${state.namespace}\\${className}` : className;

    pushSymbol(symbols, {
      kind: 'class',
      name: className,
      path: classPath,
      loc: node.loc
    });

    const body = Array.isArray(node.body) ? node.body : [];
    const childState = {
      ...state,
      classStack: [...state.classStack, classPath]
    };

    for (const child of body) {
      walkNode(child, childState, symbols);
    }
    return;
  }

  if (kind === 'method') {
    const methodName = nodeName(node.name);
    if (!methodName) return;
    const owner = state.classStack[state.classStack.length - 1] || null;
    const path = owner ? `${owner}::${methodName}` : methodName;

    pushSymbol(symbols, {
      kind: 'method',
      name: methodName,
      path,
      loc: node.loc
    });
    return;
  }

  if (kind === 'function') {
    const functionName = nodeName(node.name);
    if (!functionName) return;
    const path = state.namespace ? `${state.namespace}\\${functionName}` : functionName;

    pushSymbol(symbols, {
      kind: 'function',
      name: functionName,
      path,
      loc: node.loc
    });
    return;
  }

  // Generic descent for unknown nodes with nested object/array children.
  for (const value of Object.values(node)) {
    if (!value) continue;
    if (Array.isArray(value)) {
      for (const entry of value) {
        walkNode(entry, state, symbols);
      }
      continue;
    }
    if (typeof value === 'object' && value.kind) {
      walkNode(value, state, symbols);
    }
  }
}

const engine = new PhpParser.Engine({
  parser: {
    php7: true,
    suppressErrors: true,
    extractDoc: false
  },
  ast: {
    withPositions: true
  }
});

export const phpSymbolParser = {
  name: 'php-ast',
  supports(language) {
    return language === 'php';
  },
  parse({ sourceText, sourcePath }) {
    const ast = engine.parseCode(sourceText, sourcePath);
    const symbols = [];

    const rootChildren = Array.isArray(ast?.children) ? ast.children : [];
    const rootState = { namespace: null, classStack: [] };

    for (const node of rootChildren) {
      walkNode(node, rootState, symbols);
    }

    return symbols;
  }
};
