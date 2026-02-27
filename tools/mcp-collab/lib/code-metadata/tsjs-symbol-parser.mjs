// ---------------------------------------------------------------------------
// TypeScript/JavaScript AST symbol parser (typescript compiler API)
// ---------------------------------------------------------------------------

import ts from 'typescript';

function scriptKindFromPath(sourcePath) {
  const lowerPath = String(sourcePath || '').toLowerCase();
  if (lowerPath.endsWith('.tsx')) return ts.ScriptKind.TSX;
  if (lowerPath.endsWith('.jsx')) return ts.ScriptKind.JSX;
  if (lowerPath.endsWith('.ts')) return ts.ScriptKind.TS;
  if (lowerPath.endsWith('.mjs') || lowerPath.endsWith('.cjs') || lowerPath.endsWith('.js')) return ts.ScriptKind.JS;
  return ts.ScriptKind.Unknown;
}

function lineRange(sourceFile, node) {
  const start = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile, false)).line + 1;
  const end = sourceFile.getLineAndCharacterOfPosition(node.end).line + 1;
  return { startLine: start, endLine: end };
}

function pushSymbol(target, { kind, name, path, sourceFile, node }) {
  if (!name || !path) return;
  const range = lineRange(sourceFile, node);
  target.push({
    kind,
    name,
    path,
    startLine: range.startLine,
    endLine: range.endLine
  });
}

function symbolNameFromBindingName(nameNode) {
  if (!nameNode) return null;
  if (ts.isIdentifier(nameNode)) return nameNode.text;
  return null;
}

function parseTsJsSymbols(sourceText, sourcePath) {
  const sourceFile = ts.createSourceFile(
    sourcePath || 'unknown.ts',
    sourceText,
    ts.ScriptTarget.Latest,
    true,
    scriptKindFromPath(sourcePath)
  );

  const symbols = [];
  const classStack = [];

  function visit(node) {
    if (ts.isClassDeclaration(node) && node.name?.text) {
      const className = node.name.text;
      const classPath = classStack.length ? `${classStack[classStack.length - 1]}.${className}` : className;

      pushSymbol(symbols, {
        kind: 'class',
        name: className,
        path: classPath,
        sourceFile,
        node
      });

      classStack.push(classPath);
      ts.forEachChild(node, visit);
      classStack.pop();
      return;
    }

    if (ts.isMethodDeclaration(node) && ts.isIdentifier(node.name)) {
      const methodName = node.name.text;
      const owner = classStack[classStack.length - 1] || null;
      const methodPath = owner ? `${owner}.${methodName}` : methodName;

      pushSymbol(symbols, {
        kind: 'method',
        name: methodName,
        path: methodPath,
        sourceFile,
        node
      });
    }

    if (ts.isFunctionDeclaration(node) && node.name?.text) {
      const functionName = node.name.text;
      pushSymbol(symbols, {
        kind: 'function',
        name: functionName,
        path: functionName,
        sourceFile,
        node
      });
    }

    if (ts.isVariableDeclaration(node)) {
      const symbolName = symbolNameFromBindingName(node.name);
      const init = node.initializer;
      if (symbolName && init && (ts.isArrowFunction(init) || ts.isFunctionExpression(init))) {
        pushSymbol(symbols, {
          kind: 'function',
          name: symbolName,
          path: symbolName,
          sourceFile,
          node
        });
      }
    }

    ts.forEachChild(node, visit);
  }

  ts.forEachChild(sourceFile, visit);
  return symbols;
}

export const tsjsSymbolParser = {
  name: 'tsjs-ast',
  supports(language) {
    return language === 'typescript' || language === 'javascript';
  },
  parse({ sourceText, sourcePath }) {
    return parseTsJsSymbols(sourceText, sourcePath);
  }
};
