/** Scoped AST guard for B1-4. It checks the byte codec, identity/envelope helpers and their local
 * dependencies. It is a syntax/closure guard, not a proof of arbitrary future JavaScript.
 */
import ts from "typescript";
import { resolve } from "node:path";
import { buildZone, typeErrors } from "./zone-analysis.ts";
export const CODEC_FILES = ['canonical-bytes.ts','values.ts','value-types.ts','envelope.ts','own-array.ts'].map(name => resolve(import.meta.dirname, '../src', name));
const functionLike = (n: ts.Node): boolean => ts.isFunctionDeclaration(n) || ts.isFunctionExpression(n) || ts.isArrowFunction(n) || ts.isMethodDeclaration(n) || ts.isGetAccessor(n) || ts.isSetAccessor(n) || ts.isConstructorDeclaration(n);
const typePosition = (n: ts.Node): boolean => {
  for (let p: ts.Node | undefined = n; p !== undefined; p = p.parent) {
    if (ts.isTypeNode(p) || ts.isInterfaceDeclaration(p) || ts.isTypeAliasDeclaration(p) || ts.isImportDeclaration(p) || ts.isExportDeclaration(p)) return true;
    if (ts.isStatement(p) || functionLike(p)) return false;
  }
  return false;
};
const isReference = (n: ts.Identifier): boolean => {
  const p = n.parent;
  if ((ts.isPropertyAccessExpression(p) && p.name === n) || (ts.isPropertyAssignment(p) && p.name === n) ||
    (ts.isBindingElement(p) && (p.name === n || p.propertyName === n)) ||
    ((ts.isVariableDeclaration(p) || ts.isParameter(p) || ts.isFunctionDeclaration(p) || ts.isFunctionExpression(p) || ts.isMethodDeclaration(p)) && p.name === n)) return false;
  return !typePosition(n);
};
export function intrinsicViolations(overrides: ReadonlyMap<string, string> = new Map()): string[] {
  const zone = buildZone(CODEC_FILES, overrides);
  const failures = typeErrors(zone);
  for (const file of CODEC_FILES) {
    const source = zone.program.getSourceFile(file)!;
    const report = (node: ts.Node, message: string) => failures.push(`${source.fileName}:${source.getLineAndCharacterOfPosition(node.getStart()).line + 1}: ${message}`);
    function visit(node: ts.Node, body: boolean): void {
      const inside = body || functionLike(node);
      if (inside && !typePosition(node)) {
        if (ts.isCallExpression(node) && (node.expression.kind === ts.SyntaxKind.ImportKeyword || ts.isPropertyAccessExpression(node.expression) || ts.isElementAccessExpression(node.expression))) report(node, 'dynamic import or call-time method lookup');
        if (ts.isPropertyAccessExpression(node) && (node.name.text === 'prototype' || (ts.isIdentifier(node.expression) && node.expression.text.startsWith('Primordial')))) report(node, 'call-time intrinsic member lookup');
        if (ts.isIdentifier(node) && isReference(node) && node.text !== 'undefined') {
          let symbol = ts.isShorthandPropertyAssignment(node.parent) ? zone.checker.getShorthandAssignmentValueSymbol(node.parent) : zone.checker.getSymbolAtLocation(node);
          if (symbol !== undefined && (symbol.flags & ts.SymbolFlags.Alias) !== 0) symbol = zone.checker.getAliasedSymbol(symbol);
          if (symbol === undefined || symbol.declarations === undefined || symbol.declarations.some(d => d.getSourceFile().isDeclarationFile)) report(node, `call-time global/unresolved binding ${node.text}`);
        }
      }
      ts.forEachChild(node, child => visit(child, inside));
    }
    visit(source, false);
    for (const statement of source.statements) {
      if (!ts.isImportDeclaration(statement) || !ts.isStringLiteral(statement.moduleSpecifier)) continue;
      const target = statement.moduleSpecifier.text;
      if (target === 'node:util') continue;
      if (!target.startsWith('.') || !CODEC_FILES.includes(resolve(import.meta.dirname, '../src', target))) report(statement, `unscoped dependency ${target}`);
    }
  }
  return failures;
}
