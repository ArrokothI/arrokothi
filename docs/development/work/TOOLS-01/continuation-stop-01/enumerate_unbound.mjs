// Diagnostic only: enumerate the already unbound members and each repeated assertion statement.
// Usage: node enumerate_unbound.mjs <checkout> <unbound-requests.json>
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';
const root = resolve(process.argv[2]);
const { default: ts } = await import(pathToFileURL(resolve(root, 'node_modules/typescript/lib/typescript.js')));
const requests = JSON.parse(readFileSync(process.argv[3], 'utf8'));
const rows = [];
const locations = (text, value) => {
  const lines = [];
  for (let at = text.indexOf(value); at !== -1; at = text.indexOf(value, at + 1)) {
    lines.push(text.slice(0, at).split('\n').length);
  }
  return lines;
};
for (const request of requests) {
  const bytes = readFileSync(resolve(root, request.file));
  const text = bytes.toString('utf8');
  const source = ts.createSourceFile(request.file, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  const callbacks = [];
  const visit = (node) => {
    if (ts.isCallExpression(node)) {
      const callee = ts.isPropertyAccessExpression(node.expression) ? node.expression.name : node.expression;
      const at = source.getLineAndCharacterOfPosition(callee.getStart(source));
      if (at.line + 1 === request.line && at.character + 1 === request.column) {
        const callback = node.arguments.find(arg => ts.isArrowFunction(arg) || ts.isFunctionExpression(arg));
        if (callback) callbacks.push(callback);
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
  if (callbacks.length !== 1) throw new Error(`${request.member}: ${callbacks.length} callbacks`);
  const assertions = [];
  const walk = (node) => {
    if (ts.isExpressionStatement(node) && ts.isCallExpression(node.expression) &&
        /^(?:assert|t\.assert)(?:\.|\()/.test(node.getText(source))) {
      const statement = node.getText(source);
      const occurrences = locations(text, statement);
      assertions.push({line: text.slice(0, node.getStart(source)).split('\n').length,
                       statement, occurrences: occurrences.length, occurrence_lines: occurrences});
    }
    ts.forEachChild(node, walk);
  };
  walk(callbacks[0].body);
  if (!assertions.length || assertions.some(row => row.occurrences < 2)) {
    throw new Error(`${request.member}: diagnostic assumption changed`);
  }
  rows.push({...request, source_sha256: createHash('sha256').update(bytes).digest('hex'), assertions});
}
console.log(JSON.stringify({members: rows.length, assertion_statements: rows.reduce((sum, row) => sum + row.assertions.length, 0),
  method: 'Pinned member keys from preserved; current declarations from the scratch catalog; TypeScript statement extraction; exact file-wide text occurrence counts; occurrence line numbers split only on LF. Diagnostic scope: direct assert.* / t.assert.* expression statements in these callbacks; no imported-helper analysis.', rows}, null, 2));
