// Loaded from a temporary copy containing only the registry's pinned TypeScript files.
import ts from './node_modules/typescript/lib/typescript.js';
import assert from 'node:assert/strict';

const source = `import { test } from 'node:test';
type Input = { length: number };
const input: Input = { length: 33554432 };
test('parser fixture', () => { const other = 16777216; return input.length; });`;
const file = ts.createSourceFile('fixture.ts', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
assert.equal(file.parseDiagnostics.length, 0);
assert.equal(file.statements.length, 4);
assert.ok(ts.isImportDeclaration(file.statements[0]));
assert.ok(ts.isTypeAliasDeclaration(file.statements[1]));
assert.ok(ts.isVariableStatement(file.statements[2]));
assert.ok(ts.isCallExpression(file.statements[3].expression));
const scanner = ts.createScanner(ts.ScriptTarget.Latest, false, ts.LanguageVariant.Standard, source);
const numbers = [];
let ordinal = 0;
for (let token = scanner.scan(); token !== ts.SyntaxKind.EndOfFileToken; token = scanner.scan()) {
  if (token === ts.SyntaxKind.NumericLiteral) {
    numbers.push({ ordinal, value: scanner.getTokenValue(), start: scanner.getTokenPos(), end: scanner.getTextPos() });
  }
  ordinal++;
}
assert.deepEqual(numbers.map(x => x.value), ['33554432', '16777216']);
assert.ok(numbers[0].ordinal < numbers[1].ordinal);
for (const token of numbers) assert.equal(source.slice(token.start, token.end), token.value);
console.log(JSON.stringify({ version: ts.version, statements: file.statements.length, numbers }));
