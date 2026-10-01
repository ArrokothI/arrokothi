// Reviewer-only evidence. Execute from repository root; production source is untouched.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';

const text = `export function read(e: { resultingEpoch?: number }) {
  const a = e.resultingEpoch;
  const b = e["resultingEpoch"];
  const { resultingEpoch: c } = e;
  const { "resultingEpoch": d } = e;
  const { ["resultingEpoch"]: f } = e;
  let g: number | undefined;
  ({ resultingEpoch: g } = e);
  return [a,b,c,d,f,g];
}`;
const output = ts.transpileModule(text, {compilerOptions: {module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2023}}).outputText;
const exports = {};
new Function('exports', output)(exports);
const saved = Object.getOwnPropertyDescriptor(Object.prototype, 'resultingEpoch');
let reads = 0;
let actual;
try {
  Object.defineProperty(Object.prototype, 'resultingEpoch', {configurable: true, get() { reads++; return 777; }});
  actual = exports.read({});
} finally {
  if (saved) Object.defineProperty(Object.prototype, 'resultingEpoch', saved);
  else delete Object.prototype.resultingEpoch;
}
assert.deepEqual(actual, [777,777,777,777,777,777]);
assert.equal(reads, 6);
console.log(JSON.stringify({H: '35c6ba0277542236f21f95d695154fa0164feb96', source: text, inheritedGetterReads: reads, actual}, null, 2));

// Enumerate the entire source zone independently of the maintained allowlist. This is a
// navigation aid for manual review, not a semantic proof or a replacement enforcement test.
const inventory = [];
for (const name of fs.readdirSync('packages/kernel/src').filter(x => x.endsWith('.ts')).sort()) {
  const file = path.join('packages/kernel/src', name);
  const source = ts.createSourceFile(file, fs.readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true);
  const sites = [];
  const visit = node => {
    if (ts.isPropertyAccessExpression(node) || ts.isElementAccessExpression(node) ||
        (ts.isBindingElement(node) && ts.isObjectBindingPattern(node.parent)) ||
        (ts.isBinaryExpression(node) && node.operatorToken.kind === ts.SyntaxKind.EqualsToken && ts.isObjectLiteralExpression(node.left))) {
      sites.push({line: source.getLineAndCharacterOfPosition(node.getStart()).line + 1, kind: ts.SyntaxKind[node.kind], text: node.getText()});
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
  inventory.push({file, sites});
}
fs.writeFileSync('docs/development/work/K1.2-correction-01/review-10/source-access-inventory.json', JSON.stringify(inventory, null, 2) + '\n');
console.log(JSON.stringify({files: inventory.length, syntacticSites: inventory.reduce((n,f) => n + f.sites.length, 0)}));
