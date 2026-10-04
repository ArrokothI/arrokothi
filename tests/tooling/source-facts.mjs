// TOOLS-01 source facts (design 05 §4). Parses bytes with the digest-pinned TypeScript 5.9.3 subset;
// never executes what it reads. Usage: node source-facts.mjs <request.json> <result.json>.
// It is a lexical/syntactic guard with stated gaps, not a semantic analyzer (012).
import { readFileSync, writeFileSync } from 'node:fs';
import ts from './node_modules/typescript/lib/typescript.js';

const HOOKS = new Set(['before', 'after', 'beforeEach', 'afterEach']);
const LEAVES = new Set(['test', 'it']);
const SUITES = new Set(['describe', 'suite']);
const MODIFIERS = new Set(['skip', 'only', 'todo']);
const ASSERT_THROWS = new Set(['throws', 'rejects', 'doesNotThrow', 'doesNotReject']);
// SyntaxKind's reverse map names aliases such as FirstLiteralToken; prefer each kind's own name.
const KIND_NAMES = new Map();
for (const [name, value] of Object.entries(ts.SyntaxKind)) {
  if (typeof value === 'number' && (!KIND_NAMES.has(value) || !/^(First|Last)/.test(name))) KIND_NAMES.set(value, name);
}

function scriptKind(path) {
  return /\.(c|m)?js$/.test(path) ? ts.ScriptKind.JS : ts.ScriptKind.TS;
}

function lineColumn(source, offset) {
  const { line, character } = source.getLineAndCharacterOfPosition(offset);
  return { line: line + 1, column: character + 1 };
}

function unwrap(node) {
  while (node && (ts.isParenthesizedExpression(node) || ts.isAsExpression(node) || ts.isNonNullExpression(node) ||
    ts.isSatisfiesExpression(node) || ts.isTypeAssertionExpression(node) || ts.isAwaitExpression(node))) {
    node = node.expression;
  }
  return node;
}

function unwrapTypes(node) {
  while (ts.isParenthesizedExpression(node) || ts.isAsExpression(node) || ts.isSatisfiesExpression(node) ||
         ts.isNonNullExpression(node) || ts.isTypeAssertionExpression(node)) node = node.expression;
  return node;
}

function isFunction(node) {
  return !!node && (ts.isArrowFunction(node) || ts.isFunctionExpression(node));
}

// node:test bindings: named, default and namespace imports. Aliases created by assignment are not
// recognised; the catalog's source cross-check then refuses their file (design 05 A1).
function testBindings(source) {
  const named = new Map();
  const namespaces = new Set();
  for (const statement of source.statements) {
    if (!ts.isImportDeclaration(statement) || !ts.isStringLiteral(statement.moduleSpecifier)) continue;
    if (!['node:test', 'test'].includes(statement.moduleSpecifier.text) || !statement.importClause) continue;
    if (statement.importClause.isTypeOnly) continue;
    if (statement.importClause.name) named.set(statement.importClause.name.text, 'test');
    const bindings = statement.importClause.namedBindings;
    if (bindings && ts.isNamespaceImport(bindings)) namespaces.add(bindings.name.text);
    if (bindings && ts.isNamedImports(bindings)) {
      for (const element of bindings.elements) {
        if (!element.isTypeOnly) named.set(element.name.text, (element.propertyName ?? element.name).text);
      }
    }
  }
  return { named, namespaces };
}

function registrationKind(call, bindings, contexts) {
  let callee = call.expression;
  let modifier = null;
  if (ts.isPropertyAccessExpression(callee) && MODIFIERS.has(callee.name.text)) {
    const inner = callee.expression;
    const innerName = ts.isIdentifier(inner) ? inner.text : ts.isPropertyAccessExpression(inner) ? inner.name.text : null;
    if (innerName !== null && ![...HOOKS].includes(innerName)) {
      modifier = callee.name.text;
      callee = inner;
    }
  }
  let imported = null;
  if (ts.isIdentifier(callee) && bindings.named.has(callee.text)) imported = bindings.named.get(callee.text);
  else if (ts.isPropertyAccessExpression(callee) && ts.isIdentifier(callee.expression)) {
    if (bindings.namespaces.has(callee.expression.text)) imported = callee.name.text;
    else if (callee.name.text === 'test' && contexts.has(callee.expression.text)) imported = 'subtest';
    else if (HOOKS.has(callee.name.text) && contexts.has(callee.expression.text)) imported = 'context-' + callee.name.text;
  }
  if (imported === null) return null;
  const kind = LEAVES.has(imported) ? 'leaf' : imported === 'subtest' ? 'subtest' : SUITES.has(imported) ? 'suite' :
    HOOKS.has(imported) || imported.startsWith('context-') ? 'hook' : null;
  if (kind === null) return null;
  const nameNode = ts.isPropertyAccessExpression(call.expression) ? call.expression.name : call.expression;
  return { kind, binding: imported, modifier, nameNode };
}

function titleOf(call, source) {
  const first = call.arguments[0];
  if (!first || isFunction(unwrap(first)) || ts.isObjectLiteralExpression(first)) return { kind: 'none' };
  if (ts.isStringLiteral(first) || ts.isNoSubstitutionTemplateLiteral(first)) return { kind: 'literal', value: first.text };
  if (ts.isTemplateExpression(first)) return { kind: 'template', text: first.getText(source) };
  return { kind: 'computed', text: first.getText(source) };
}

function callbackOf(call) {
  const last = call.arguments[call.arguments.length - 1];
  return last && isFunction(last) ? last : null;
}

function hasConcurrency(call) {
  return call.arguments.some(argument => ts.isObjectLiteralExpression(argument) && argument.properties.some(
    property => property.name && !ts.isComputedPropertyName(property.name) && property.name.getText() === 'concurrency'));
}

// Every node:test registration with its call and callback nodes, in source order.
function collect(source) {
  const bindings = testBindings(source);
  const found = [];
  const visit = (node, parent, contexts) => {
    let here = parent;
    let inner = contexts;
    if (ts.isCallExpression(node)) {
      const facts = registrationKind(node, bindings, contexts);
      if (facts) {
        const callback = callbackOf(node);
        const record = {
          index: found.length, kind: facts.kind, binding: facts.binding, modifier: facts.modifier,
          location: lineColumn(source, facts.nameNode.getStart(source)), title: titleOf(node, source), parent,
          span: { start: node.getStart(source), end: node.end, ...rangeLines(source, node) },
          callback: callback ? { start: callback.getStart(source), end: callback.end } : null,
          concurrency: hasConcurrency(node),
        };
        found.push({ record, call: node, callback });
        here = record.index;
        if (callback && callback.parameters.length && ts.isIdentifier(callback.parameters[0].name) &&
            (facts.kind === 'leaf' || facts.kind === 'subtest')) {
          inner = new Set(contexts);
          inner.add(callback.parameters[0].name.text);
        }
      }
    }
    ts.forEachChild(node, child => visit(child, here, inner));
  };
  visit(source, null, new Set());
  return { found, bindings };
}

export function registrations(source) {
  const { found, bindings } = collect(source);
  return { registrations: found.map(entry => entry.record),
    bindings: { named: Object.fromEntries(bindings.named), namespaces: [...bindings.namespaces] } };
}

function rangeLines(source, node) {
  return { start_line: lineColumn(source, node.getStart(source)).line, end_line: lineColumn(source, node.end).line };
}

// Tokens of one node from the parse tree (template parts and regular expressions stay whole),
// without trivia or comments, with their ordinal inside the node.
export function nodeTokens(source, node) {
  const tokens = [];
  const visit = (current) => {
    if (current.kind >= ts.SyntaxKind.FirstJSDocNode && current.kind <= ts.SyntaxKind.LastJSDocNode) return;
    const children = current.getChildren(source);
    if (children.length === 0) {
      if (current.kind === ts.SyntaxKind.EndOfFileToken || current.end <= current.getStart(source)) return;
      const literal = (current.kind >= ts.SyntaxKind.FirstLiteralToken && current.kind <= ts.SyntaxKind.LastLiteralToken) ||
        (current.kind >= ts.SyntaxKind.FirstTemplateToken && current.kind <= ts.SyntaxKind.LastTemplateToken);
      tokens.push({ ordinal: tokens.length, kind: KIND_NAMES.get(current.kind), text: current.getText(source),
        ...(literal ? { value: current.text } : {}), start: current.getStart(source), end: current.end });
      return;
    }
    children.forEach(visit);
  };
  visit(node);
  return tokens;
}

function commentRanges(source) {
  const ranges = [];
  const seen = new Set();
  const visit = (node) => {
    if (node.getChildren(source).length === 0 || node.kind === ts.SyntaxKind.EndOfFileToken) {
      for (const range of ts.getLeadingCommentRanges(source.text, node.pos) ?? []) {
        if (!seen.has(range.pos)) { seen.add(range.pos); ranges.push([range.pos, range.end]); }
      }
    }
    node.getChildren(source).forEach(visit);
  };
  visit(source);
  return ranges;
}

// The literal (string, template or regular expression) that strictly contains an offset, if any.
function literalAround(source, offset) {
  let found = null;
  const visit = (node) => {
    if (node.getStart(source) >= offset || node.end <= offset) {
      if (!(node.getStart(source) <= offset && offset < node.end)) return;
    }
    if ((ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node) || ts.isTemplateExpression(node) ||
        ts.isRegularExpressionLiteral(node)) && node.getStart(source) < offset) {
      found = KIND_NAMES.get(node.kind);
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
  return found;
}

function isStatementLike(node) {
  const parent = node.parent;
  if (!parent) return false;
  if ('statements' in parent && Array.isArray(parent.statements) && parent.statements.includes(node)) return true;
  return ts.isArrowFunction(parent) && parent.body === node; // a concise arrow body
}

// The one statement whose text is exactly the anchor; otherwise the reason it is not one.
export function anchorStatement(source, anchor) {
  const text = source.text;
  const occurrences = [];
  for (let index = text.indexOf(anchor); index !== -1; index = text.indexOf(anchor, index + 1)) occurrences.push(index);
  if (occurrences.length !== 1) return { error: occurrences.length ? 'ambiguous anchor' : 'anchor not found', matches: occurrences.length };
  const [start] = occurrences;
  const end = start + anchor.length;
  const inComment = commentRanges(source).some(([from, to]) => from <= start && start < to);
  const inLiteral = literalAround(source, start);
  if (inComment || inLiteral) {
    return { error: 'anchor starts inside ' + (inComment ? 'a comment' : 'a literal'), not_observable: true, start };
  }
  let match = null;
  const visit = (node) => {
    if (node.getStart(source) === start && node.end === end && isStatementLike(node)) match = node;
    if (node.getStart(source) <= start && end <= node.end) ts.forEachChild(node, visit);
  };
  visit(source);
  if (!match) return { error: 'anchor is not one statement', start };
  return { statement: match, start, end };
}

// ---------------------------------------------------------------------------------------------
// Design 05 §2.3: items, alignment, inert classification and the lexical reference closure.

function tokenText(source, node, holes = new Map()) {
  const out = [];
  const visit = (current) => {
    if (holes.has(current)) { out.push(holes.get(current)); return; }
    if (current.kind >= ts.SyntaxKind.FirstJSDocNode && current.kind <= ts.SyntaxKind.LastJSDocNode) return;
    const children = current.getChildren(source);
    if (children.length === 0) {
      const text = current.getText(source);
      if (text) out.push(text);
      return;
    }
    children.forEach(visit);
  };
  visit(node);
  return out.join(' ');
}

// Identifiers in reference positions: binding names (declarations, parameters, imports) and
// property names are not references. Type positions count: matching is lexical (design 05 §2.3).
function identifiers(node, skip = new Set()) {
  const names = new Set();
  const named = (current) => current.name && (ts.isComputedPropertyName(current.name) ? visit(current.name) : undefined);
  const visit = (current) => {
    if (!current || skip.has(current)) return;
    if (ts.isIdentifier(current)) { names.add(current.text); return; }
    if (ts.isPropertyAccessExpression(current)) { visit(current.expression); return; }
    if (ts.isQualifiedName(current)) { visit(current.left); return; }
    if (ts.isImportDeclaration(current)) return;
    if (ts.isVariableDeclaration(current) || ts.isParameter(current)) {
      bindingDefaults(current.name, visit);
      visit(current.type); visit(current.initializer);
      return;
    }
    if (ts.isFunctionDeclaration(current) || ts.isFunctionExpression(current) || ts.isClassDeclaration(current) ||
        ts.isClassExpression(current)) {
      ts.forEachChild(current, child => { if (child !== current.name) visit(child); });
      return;
    }
    if (ts.isPropertyAssignment(current)) { named(current); visit(current.initializer); return; }
    if (ts.isMethodDeclaration(current) || ts.isPropertyDeclaration(current) || ts.isGetAccessorDeclaration(current) ||
        ts.isSetAccessorDeclaration(current) || ts.isPropertySignature(current) || ts.isMethodSignature(current) ||
        ts.isEnumMember(current)) {
      named(current);
      ts.forEachChild(current, child => { if (child !== current.name) visit(child); });
      return;
    }
    ts.forEachChild(current, visit);
  };
  visit(node);
  return names;
}

function bindingDefaults(name, visit) {
  if (ts.isIdentifier(name)) return;
  for (const element of name.elements) {
    if (ts.isOmittedExpression(element)) continue;
    if (element.propertyName && ts.isComputedPropertyName(element.propertyName)) visit(element.propertyName);
    visit(element.initializer);
    bindingDefaults(element.name, visit);
  }
}

function bindingNames(name, out = []) {
  if (ts.isIdentifier(name)) out.push(name.text);
  else for (const element of name.elements) if (!ts.isOmittedExpression(element)) bindingNames(element.name, out);
  return out;
}

function exported(node) {
  return !!(ts.canHaveModifiers(node) && ts.getModifiers(node)?.some(m => m.kind === ts.SyntaxKind.ExportKeyword));
}

function typeOnly(statement) {
  if (ts.isTypeAliasDeclaration(statement) || ts.isInterfaceDeclaration(statement)) return true;
  if (ts.canHaveModifiers(statement) && ts.getModifiers(statement)?.some(m => m.kind === ts.SyntaxKind.DeclareKeyword)) return true;
  if (ts.isImportDeclaration(statement)) return !!statement.importClause?.isTypeOnly;
  if (ts.isExportDeclaration(statement)) return statement.isTypeOnly;
  return false;
}

// Names every same-file declaration binds, for the lexical closure. Scope is ignored on purpose.
function declarations(source) {
  const byName = new Map();
  const add = (name, node) => { if (!byName.has(name)) byName.set(name, []); byName.get(name).push(node); };
  const visit = (node) => {
    if (ts.isVariableDeclaration(node)) bindingNames(node.name).forEach(name => add(name, node));
    else if ((ts.isFunctionDeclaration(node) || ts.isClassDeclaration(node) || ts.isEnumDeclaration(node)) && node.name) add(node.name.text, node);
    else if (ts.isImportClause(node) && node.name) add(node.name.text, node.parent);
    else if (ts.isNamespaceImport(node) || ts.isImportSpecifier(node)) add(node.name.text, node);
    ts.forEachChild(node, visit);
  };
  visit(source);
  return byName;
}

function inertExpression(node, known) {
  node = node && unwrapTypes(node);
  if (!node) return true;
  switch (node.kind) {
    case ts.SyntaxKind.StringLiteral: case ts.SyntaxKind.NumericLiteral: case ts.SyntaxKind.BigIntLiteral:
    case ts.SyntaxKind.NoSubstitutionTemplateLiteral: case ts.SyntaxKind.RegularExpressionLiteral:
    case ts.SyntaxKind.TrueKeyword: case ts.SyntaxKind.FalseKeyword: case ts.SyntaxKind.NullKeyword:
    case ts.SyntaxKind.ArrowFunction: case ts.SyntaxKind.FunctionExpression:
      return true;
    case ts.SyntaxKind.PrefixUnaryExpression:
      return (node.operator === ts.SyntaxKind.MinusToken || node.operator === ts.SyntaxKind.PlusToken) &&
        (ts.isNumericLiteral(node.operand) || ts.isBigIntLiteral(node.operand));
    case ts.SyntaxKind.Identifier:
      return node.text === 'undefined' || known.has(node.text);
    case ts.SyntaxKind.ArrayLiteralExpression:
      return node.elements.every(element => ts.isOmittedExpression(element) ||
        (!ts.isSpreadElement(element) && inertExpression(element, known)));
    case ts.SyntaxKind.ObjectLiteralExpression:
      return node.properties.every(property => {
        if (property.name && ts.isComputedPropertyName(property.name)) return false;
        if (ts.isPropertyAssignment(property)) return inertExpression(property.initializer, known);
        if (ts.isShorthandPropertyAssignment(property)) return !property.objectAssignmentInitializer && known.has(property.name.text);
        return ts.isMethodDeclaration(property) || ts.isGetAccessorDeclaration(property) || ts.isSetAccessorDeclaration(property);
      });
    default:
      return false;
  }
}

// Value-module requests in order: the import edges that evaluate modules.
function moduleRequests(source) {
  const requests = [];
  for (const statement of source.statements) {
    // Type stripping erases `import type` only; an import of type-only specifiers still loads its module.
    if (ts.isImportDeclaration(statement) && !statement.importClause?.isTypeOnly) {
      requests.push(statement.moduleSpecifier.text);
    } else if (ts.isExportDeclaration(statement) && statement.moduleSpecifier && !statement.isTypeOnly) {
      requests.push(statement.moduleSpecifier.text);
    }
  }
  return requests;
}

// Items of one revision: load-time statements (top level and directly in suite callbacks, leaf
// callbacks cut out), registration heads, hooks, and leaf callbacks (design 05 §2.3 rule 3).
function itemize(source) {
  const { found } = collect(source);
  const owner = new Map(found.filter(entry => entry.callback).map(entry => [entry.callback, entry]));
  const byCall = new Map(found.map(entry => [entry.call, entry]));
  const items = [];
  const scopeKey = (scope) => scope.map(index => tokenText(source, found[index].call, new Map([[found[index].callback, '<suite>']]))).join(' / ');
  const unit = (statement, scope) => {
    const holes = new Map();
    let hook = false;
    let head = null;
    const leaves = [];
    const suites = [];
    const visit = (node) => {
      if (ts.isCallExpression(node) && byCall.get(node)?.record.kind === 'hook') hook = true;
      if (owner.has(node)) {
        const entry = owner.get(node);
        if (entry.record.kind === 'suite') { holes.set(node, '<suite>'); suites.push(entry); return; }
        if (entry.record.kind === 'leaf' || entry.record.kind === 'subtest') {
          holes.set(node, '<callback>');
          leaves.push(entry);
          return;
        }
      }
      ts.forEachChild(node, visit);
    };
    visit(statement);
    const expression = ts.isExpressionStatement(statement) ? unwrap(statement.expression) : null;
    if (expression && ts.isCallExpression(expression)) head = byCall.get(expression) ?? null;
    const kind = hook ? 'hook' : head && head.record.kind !== 'hook' ? 'head' : 'load';
    items.push({ kind, scope, scope_key: scopeKey(scope), node: statement, start: statement.getStart(source),
      text: tokenText(source, statement, hook ? new Map([...holes].filter(([node]) => owner.get(node).record.kind === 'suite')) : holes),
      registration: head ? head.record.index : null, leaves: leaves.map(entry => entry.record.index) });
    for (const entry of leaves) {
      items.push({ kind: 'leaf-callback', scope, scope_key: scopeKey(scope), node: entry.callback,
        start: entry.callback.getStart(source), text: tokenText(source, entry.callback), registration: entry.record.index,
        leaves: [entry.record.index] });
    }
    for (const entry of suites) {
      const body = entry.callback.body;
      const inner = [...scope, entry.record.index];
      if (ts.isBlock(body)) body.statements.forEach(child => unit(child, inner));
      else items.push({ kind: 'load', scope: inner, scope_key: scopeKey(inner), node: body, start: body.getStart(source),
        text: tokenText(source, body), registration: null, leaves: [] });
    }
  };
  source.statements.forEach(statement => unit(statement, []));
  items.sort((a, b) => a.start - b.start);
  return { found, items };
}

function align(left, right) {
  const key = item => item.kind + '\u0000' + item.scope_key + '\u0000' + item.text;
  const a = left.map(key), b = right.map(key);
  const table = Array.from({ length: a.length + 1 }, () => new Uint32Array(b.length + 1));
  for (let i = a.length - 1; i >= 0; i--) {
    for (let j = b.length - 1; j >= 0; j--) {
      table[i][j] = a[i] === b[j] ? table[i + 1][j + 1] + 1 : Math.max(table[i + 1][j], table[i][j + 1]);
    }
  }
  const matched = new Map();
  for (let i = 0, j = 0; i < a.length && j < b.length;) {
    if (a[i] === b[j]) { matched.set(i, j); i++; j++; }
    else if (table[i + 1][j] >= table[i][j + 1]) i++;
    else j++;
  }
  return matched;
}

function readsOwnName(entry) {
  const parameter = entry.callback?.parameters[0];
  if (!parameter || !ts.isIdentifier(parameter.name)) return false;
  let reads = false;
  const visit = (node) => {
    if (ts.isPropertyAccessExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === parameter.name.text &&
        (node.name.text === 'name' || node.name.text === 'fullName')) reads = true;
    ts.forEachChild(node, visit);
  };
  visit(entry.callback.body);
  return reads;
}

// Classify one differing item; names are those it binds (imports: those the other revision lacks).
function classify(source, item, found, otherImportNames, requestsEqual, callbackChanged) {
  const node = item.node;
  if (item.kind === 'leaf-callback') return { inert: false, reason: 'changed leaf callback', names: [] };
  if (item.kind === 'hook') return { inert: false, reason: 'hook', names: [] };
  if (item.kind === 'head') {
    const entry = found[item.registration];
    const call = unwrap(node.expression);
    const known = knownNames(source);
    const inert = call.arguments.every(argument => argument === entry.callback || inertExpression(argument, known));
    if (!inert) return { inert: false, reason: 'registration head with an effectful argument', names: [] };
    if (!callbackChanged(entry) && readsOwnName(entry)) return { inert: false, reason: 'callback reads its name', names: [] };
    return { inert: true, reason: 'registration head', names: [] };
  }
  if (typeOnly(node)) return { inert: true, reason: 'type-only declaration', names: [] };
  if (ts.isFunctionDeclaration(node)) {
    return { inert: true, reason: 'function declaration', names: node.name ? [node.name.text] : [], exported: exported(node) };
  }
  if (ts.isVariableStatement(node)) {
    const scoped = node.declarationList.flags & ts.NodeFlags.BlockScoped;
    if (scoped === ts.NodeFlags.Using || scoped === ts.NodeFlags.AwaitUsing) return { inert: false, reason: 'using declaration', names: [] };
    const known = knownNames(source);
    const names = [];
    for (const declaration of node.declarationList.declarations) {
      if (!ts.isIdentifier(declaration.name)) return { inert: false, reason: 'destructuring declaration', names: [] };
      if (!inertExpression(declaration.initializer, known)) return { inert: false, reason: 'effectful initializer', names: [] };
      names.push(declaration.name.text);
    }
    return { inert: true, reason: 'declaration', names, exported: exported(node) };
  }
  if (ts.isImportDeclaration(node)) {
    if (!requestsEqual) return { inert: false, reason: 'import changes module requests', names: [] };
    const names = [];
    const clause = node.importClause;
    if (clause?.name) names.push(clause.name.text);
    if (clause?.namedBindings && ts.isNamespaceImport(clause.namedBindings)) names.push(clause.namedBindings.name.text);
    // A type-only specifier binds no value: it is erased like a type-only declaration.
    if (clause?.namedBindings && ts.isNamedImports(clause.namedBindings)) {
      clause.namedBindings.elements.filter(e => !e.isTypeOnly).forEach(e => names.push(e.name.text));
    }
    return { inert: true, reason: 'import keeping module requests', names: names.filter(name => !otherImportNames.has(name)) };
  }
  return { inert: false, reason: 'effectful statement', names: [] };
}

const knownCache = new WeakMap();
function knownNames(source) {
  if (!knownCache.has(source)) knownCache.set(source, new Set(declarations(source).keys()));
  return knownCache.get(source);
}

function importNames(source) {
  const names = new Set();
  for (const statement of source.statements) {
    const clause = ts.isImportDeclaration(statement) ? statement.importClause : null;
    if (!clause) continue;
    if (clause.name) names.add(clause.name.text);
    if (clause.namedBindings && ts.isNamespaceImport(clause.namedBindings)) names.add(clause.namedBindings.name.text);
    if (clause.namedBindings && ts.isNamedImports(clause.namedBindings)) {
      clause.namedBindings.elements.filter(e => !e.isTypeOnly).forEach(e => names.add(e.name.text));
    }
  }
  return names;
}

// Live code of a prefix: load-time code outside function bodies, plus prefix leaf and hook callbacks,
// closed under the full text of every same-file declaration whose name it contains (lexical).
function referenced(source, roots) {
  const byName = declarations(source);
  const names = new Set();
  const pending = [];
  const add = (set) => { for (const name of set) if (!names.has(name)) { names.add(name); pending.push(name); } };
  for (const root of roots) add(root);
  while (pending.length) {
    const name = pending.pop();
    for (const declaration of byName.get(name) ?? []) add(identifiers(declaration));
  }
  return names;
}

function functionBodies(node) {
  const skip = new Set();
  const visit = (current) => {
    if ((ts.isFunctionDeclaration(current) || ts.isFunctionExpression(current) || ts.isArrowFunction(current) ||
         ts.isMethodDeclaration(current) || ts.isGetAccessorDeclaration(current) || ts.isSetAccessorDeclaration(current)) && current.body) {
      skip.add(current.body);
      return;
    }
    ts.forEachChild(current, visit);
  };
  visit(node);
  return skip;
}

function dynamicEvaluation(source) {
  let found = false;
  const visit = (node) => {
    if (ts.isWithStatement(node) || (ts.isIdentifier(node) && (node.text === 'eval' || node.text === 'Function'))) found = true;
    ts.forEachChild(node, visit);
  };
  visit(source);
  return found;
}

function isPrefixItem(item, member, memberScope, earlier, found, allEarlier) {
  if (item.kind === 'load' || item.kind === 'head') return true;
  const leafEarlier = (index) => allEarlier || earlier(index);
  if (item.kind === 'leaf-callback') return item.registration === member || leafEarlier(item.registration);
  // A hook runs for its scope: in the prefix when that scope encloses the member or holds an earlier leaf.
  const encloses = (scope, chain) => scope.every((index, depth) => chain[depth] === index);
  if (encloses(item.scope, memberScope)) return true;
  return found.some(entry => (entry.record.kind === 'leaf' || entry.record.kind === 'subtest') &&
    entry.record.index !== member && leafEarlier(entry.record.index) && encloses(item.scope, scopeOf(found, entry.record.index)));
}

function scopeOf(found, index) {
  const chain = [];
  for (let parent = found[index].record.parent; parent !== null; parent = found[parent].record.parent) {
    if (found[parent].record.kind === 'suite') chain.unshift(parent);
  }
  return chain;
}

// Design 05 §2.3: for each leaf at the pin whose span text is unchanged at C, the blocking prefix
// differences. allEarlier is the A10 fallback (and a concurrency option): every leaf is earlier.
export function prefix(pinText, currentText, path, allEarlierByFloor) {
  const sides = [pinText, currentText].map(text => ts.createSourceFile(path, text, ts.ScriptTarget.Latest, true, scriptKind(path)));
  const [pin, current] = sides;
  const views = sides.map(itemize);
  const matched = align(views[0].items, views[1].items);
  const reverse = new Map([...matched].map(([left, right]) => [right, left]));
  const concurrency = views.some(view => view.found.some(entry => entry.record.concurrency));
  const allEarlier = allEarlierByFloor || concurrency;
  const requestsEqual = JSON.stringify(moduleRequests(pin)) === JSON.stringify(moduleRequests(current));
  const dynamic = sides.map(dynamicEvaluation);
  const imports = sides.map(importNames);
  const differences = [
    ...views[0].items.map((item, index) => ({ side: 0, item, index })).filter(entry => !matched.has(entry.index)),
    ...views[1].items.map((item, index) => ({ side: 1, item, index })).filter(entry => !reverse.has(entry.index)),
  ];
  const callbackChanged = (side) => (entry) => differences.some(difference => difference.side === side &&
    difference.item.kind === 'leaf-callback' && difference.item.registration === entry.record.index);
  for (const difference of differences) {
    const side = difference.side;
    difference.facts = classify(sides[side], difference.item, views[side].found, imports[1 - side], requestsEqual, callbackChanged(side));
  }
  const spanText = (source, entry) => source.text.slice(entry.call.getStart(source), entry.call.end);
  const members = [];
  for (const entry of views[0].found) {
    if (entry.record.kind !== 'leaf') continue;
    const text = spanText(pin, entry);
    const candidates = views[1].found.filter(other => other.record.kind === 'leaf' && spanText(current, other) === text);
    const member = { pin: entry.record.location, title: entry.record.title, span_identical: candidates.length === 1 };
    if (candidates.length !== 1) {
      member.blocking = [{ reason: candidates.length ? 'span text occurs more than once at C' : 'span changed or removed' }];
      members.push(member);
      continue;
    }
    const counterpart = candidates[0];
    member.current = counterpart.record.location;
    const indices = [entry.record.index, counterpart.record.index];
    const blocking = [];
    for (const side of [0, 1]) {
      const view = views[side];
      const source = sides[side];
      const index = indices[side];
      const chain = scopeOf(view.found, index);
      const earlier = (other) => view.found[other].call.getStart(source) < view.found[index].call.getStart(source);
      const inPrefix = view.items.filter(item => isPrefixItem(item, index, chain, earlier, view.found, allEarlier));
      const roots = [];
      for (const item of inPrefix) {
        if (item.kind === 'load' || item.kind === 'head') roots.push(identifiers(item.node, functionBodies(item.node)));
        else roots.push(identifiers(item.node));
      }
      const live = referenced(source, roots);
      for (const difference of differences.filter(d => d.side === side && inPrefix.includes(d.item))) {
        const facts = difference.facts;
        const hit = facts.names.filter(name => live.has(name));
        if (!facts.inert || facts.exported || dynamic[side] && facts.names.length || hit.length) {
          blocking.push({ side: side ? 'current' : 'pin', kind: difference.item.kind, reason: !facts.inert ? facts.reason :
            facts.exported ? 'exported declaration' : dynamic[side] ? 'dynamic evaluation in file' : 'referenced: ' + hit.join(', '),
            line: lineColumn(source, difference.item.start).line, excerpt: difference.item.text.slice(0, 160) });
        }
      }
    }
    member.blocking = blocking;
    members.push(member);
  }
  return { path, concurrency, all_earlier: allEarlier, module_requests_equal: requestsEqual,
    differences: differences.map(d => ({ side: d.side ? 'current' : 'pin', kind: d.item.kind, inert: d.facts.inert,
      reason: d.facts.reason, names: d.facts.names, line: lineColumn(sides[d.side], d.item.start).line })),
    members };
}

// ---------------------------------------------------------------------------------------------
// Design 05 P1-T anchors (D05-02, D05-CHK-01 to -03).

function assertBindings(source) {
  const names = new Set();
  for (const statement of source.statements) {
    if (!ts.isImportDeclaration(statement) || !ts.isStringLiteral(statement.moduleSpecifier)) continue;
    if (!['node:assert', 'node:assert/strict', 'assert', 'assert/strict'].includes(statement.moduleSpecifier.text)) continue;
    const clause = statement.importClause;
    if (clause?.name) names.add(clause.name.text);
    if (clause?.namedBindings && ts.isNamespaceImport(clause.namedBindings)) names.add(clause.namedBindings.name.text);
    if (clause?.namedBindings && ts.isNamedImports(clause.namedBindings)) clause.namedBindings.elements.forEach(e => names.add(e.name.text));
  }
  return names;
}

function sameFileFunctions(source) {
  const names = new Map();
  const visit = (node) => {
    if (ts.isFunctionDeclaration(node) && node.name && node.body) names.set(node.name.text, node);
    if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.initializer && isFunction(unwrapTypes(node.initializer))) {
      names.set(node.name.text, unwrapTypes(node.initializer));
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
  return names;
}

function calleeRoot(expression) {
  while (ts.isPropertyAccessExpression(expression)) expression = expression.expression;
  return ts.isIdentifier(expression) ? expression.text : null;
}

// The assertion call an anchor statement makes: assert.*, <context>.assert.*, or a same-file helper.
function assertionCall(source, statement, asserts, helpers) {
  let found = null;
  const visit = (node) => {
    if (found) return;
    if (ts.isCallExpression(node)) {
      const callee = node.expression;
      const root = calleeRoot(callee);
      const contextAssert = ts.isPropertyAccessExpression(callee) && ts.isPropertyAccessExpression(callee.expression) &&
        callee.expression.name.text === 'assert';
      if ((root !== null && asserts.has(root)) || contextAssert || (ts.isIdentifier(callee) && helpers.has(callee.text))) {
        found = node;
        return;
      }
    }
    if (isFunction(node)) return; // a call inside a nested function does not run with the statement
    ts.forEachChild(node, visit);
  };
  visit(statement);
  return found;
}

function throwGuard(statement) {
  if (!ts.isIfStatement(statement)) return null;
  const then = statement.thenStatement;
  const only = ts.isBlock(then) && then.statements.length === 1 ? then.statements[0] : then;
  return ts.isThrowStatement(only) ? statement.expression : null;
}

// D05-CHK-01: inside a try block within the span, or a function passed to assert.throws-style calls
// or to a promise .catch, an assertion that did not run can still count as executed.
function caughtRegion(node, spanStart, spanEnd) {
  for (let current = node; current && current.pos >= 0; current = current.parent) {
    const parent = current.parent;
    if (!parent) break;
    if (parent.getStart() < spanStart || parent.end > spanEnd) break;
    if (ts.isTryStatement(parent) && parent.tryBlock === current) return 'try block';
    if (ts.isCallExpression(parent) && parent.arguments.includes(current) && isFunction(current)) {
      const callee = parent.expression;
      const name = ts.isPropertyAccessExpression(callee) ? callee.name.text : ts.isIdentifier(callee) ? callee.text : null;
      if (name !== null && (ASSERT_THROWS.has(name) || name === 'catch')) return 'function passed to ' + name;
    }
  }
  return null;
}

// One anchor of a suite target (design 05 P1-T): `span` is the target registration's span when the
// anchor is in the target's file, and null in another file (an operation in production code).
export function anchorFacts(source, anchor, role, span) {
  const located = anchorStatement(source, anchor);
  if (located.error) return { role, error: located.error, not_observable: !!located.not_observable, matches: located.matches };
  const statement = located.statement;
  const within = (range) => range.start <= located.start && located.end <= range.end;
  const leafSpans = collect(source).found.filter(entry => entry.record.kind === 'leaf' || entry.record.kind === 'subtest')
    .map(entry => entry.record.span);
  const scope = span && within(span) ? 'span' : leafSpans.some(within) ? 'other_test' : 'module';
  const facts = { role, start: located.start, end: located.end, line: lineColumn(source, located.start).line, scope,
    tokens: nodeTokens(source, statement).map(({ ordinal, kind, text, value }) =>
      ({ ordinal, kind, text, ...(value !== undefined ? { value } : {}) })) };
  if (role !== 'assertion') {
    facts.offset = located.start;
    return facts;
  }
  const helpers = sameFileFunctions(source);
  const guard = throwGuard(statement);
  const call = guard ? null : assertionCall(source, statement, assertBindings(source), helpers);
  if (!guard && !call) return { ...facts, error: 'no assertion call or throw guard' };
  facts.offset = (guard ?? call).getStart(source);
  let region = span && scope === 'span' ? caughtRegion(statement, span.start, span.end) : null;
  if (span && scope !== 'span') {
    // The anchor lives in a same-file helper: judge every call of that helper inside the span.
    for (const [name, helper] of helpers) {
      if (!(helper.getStart(source) <= located.start && located.end <= helper.end)) continue;
      const visit = (node) => {
        if (ts.isCallExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === name &&
            span.start <= node.getStart(source) && node.end <= span.end) region ??= caughtRegion(node, span.start, span.end);
        ts.forEachChild(node, visit);
      };
      visit(source);
    }
  }
  if (region) facts.not_observable = region;
  return facts;
}

function parse(path, text) {
  return ts.createSourceFile(path, text, ts.ScriptTarget.Latest, true, scriptKind(path));
}

// Import bindings and value-module requests (design 05 §2.3 rule 6; the static import closure).
function imports(source) {
  const bindings = [];
  for (const statement of source.statements) {
    if (!ts.isImportDeclaration(statement) || !ts.isStringLiteral(statement.moduleSpecifier)) continue;
    const module = statement.moduleSpecifier.text;
    const clause = statement.importClause;
    const typeOnly = !!clause?.isTypeOnly;
    if (clause?.name) bindings.push({ local: clause.name.text, imported: 'default', module, type_only: typeOnly });
    if (clause?.namedBindings && ts.isNamespaceImport(clause.namedBindings)) {
      bindings.push({ local: clause.namedBindings.name.text, imported: '*', module, type_only: typeOnly });
    }
    if (clause?.namedBindings && ts.isNamedImports(clause.namedBindings)) {
      for (const element of clause.namedBindings.elements) {
        bindings.push({ local: element.name.text, imported: (element.propertyName ?? element.name).text, module,
          type_only: typeOnly || element.isTypeOnly });
      }
    }
  }
  const dynamic = [];
  const visit = (node) => {
    if (ts.isCallExpression(node) && node.expression.kind === ts.SyntaxKind.ImportKeyword) {
      const argument = node.arguments[0];
      dynamic.push(argument && ts.isStringLiteralLike(argument) ? argument.text : null);
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
  return { requests: moduleRequests(source), bindings, dynamic };
}

// For the hold register (design 05 D05-CHK-05): each registration's text and the names it references,
// and every same-file function-like declaration's text and references, so helpers are followed.
function helpers(source) {
  const { found } = collect(source);
  const functions = {};
  const add = (name, node) => {
    functions[name] ??= [];
    functions[name].push({ text: node.getText(source), references: [...identifiers(node)], exported: exported(node.parent?.parent ?? node) || exported(node) });
  };
  const visit = (node) => {
    if (ts.isFunctionDeclaration(node) && node.name) add(node.name.text, node);
    if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.initializer &&
        (isFunction(unwrapTypes(node.initializer)) || ts.isClassExpression(unwrapTypes(node.initializer)))) add(node.name.text, node);
    if (ts.isClassDeclaration(node) && node.name) add(node.name.text, node);
    ts.forEachChild(node, visit);
  };
  visit(source);
  const exportedNames = [];
  for (const statement of source.statements) {
    if (ts.isExportDeclaration(statement) && statement.exportClause && ts.isNamedExports(statement.exportClause) && !statement.moduleSpecifier) {
      for (const element of statement.exportClause.elements) exportedNames.push({ exported: element.name.text, local: (element.propertyName ?? element.name).text });
    }
  }
  return {
    registrations: found.map(({ record, call }) => ({ index: record.index, kind: record.kind, location: record.location,
      title: record.title, parent: record.parent, text: call.getText(source), references: [...identifiers(call)] })),
    functions, exports: exportedNames,
  };
}

// ---------------------------------------------------------------------------------------------
// Design 05 D04-CHK-03 structural census: a runner's member container, never executed. Elements of
// its array-literal declaration and of top-level literal pushes are members, each labelled by its
// first string (an array element) or its `id` (an object element). Every other top-level statement
// that mentions the container is classified `reads`, `modifies` (an element's contents) or `adds`.

function elementLabel(node) {
  node = unwrapTypes(node);
  const text = (value) => value && (ts.isStringLiteral(value) || ts.isNoSubstitutionTemplateLiteral(value)) ? value.text : null;
  if (ts.isArrayLiteralExpression(node)) return text(node.elements[0] && unwrapTypes(node.elements[0]));
  if (ts.isObjectLiteralExpression(node)) {
    for (const property of node.properties) {
      if (ts.isPropertyAssignment(property) && !ts.isComputedPropertyName(property.name) &&
          (property.name.text === 'id' || property.name.text === 'name')) return text(unwrapTypes(property.initializer));
    }
  }
  return null;
}

function rootName(node) {
  while (ts.isElementAccessExpression(node) || ts.isPropertyAccessExpression(node) || ts.isParenthesizedExpression(node)) {
    node = node.expression;
  }
  return ts.isIdentifier(node) ? node.text : null;
}

function depth(node) {
  let count = 0;
  while (ts.isElementAccessExpression(node) || ts.isPropertyAccessExpression(node)) { count += 1; node = node.expression; }
  return count;
}

function container(source, name) {
  const element = (node) => ({ label: elementLabel(node), line: lineColumn(source, node.getStart(source)).line });
  let declaration = null;
  const statements = [];
  const constants = [];
  for (const statement of source.statements) {
    if (ts.isVariableStatement(statement)) {
      for (const declared of statement.declarationList.declarations) {
        if (!ts.isIdentifier(declared.name)) continue;
        const initializer = declared.initializer && unwrapTypes(declared.initializer);
        if (initializer && (ts.isStringLiteral(initializer) || ts.isNoSubstitutionTemplateLiteral(initializer))) {
          constants.push({ name: declared.name.text, line: lineColumn(source, declared.getStart(source)).line });
        }
        if (declared.name.text === name && declaration === null) {
          declaration = { line: lineColumn(source, declared.getStart(source)).line,
            kind: initializer && ts.isArrayLiteralExpression(initializer) ? 'array' : 'computed',
            elements: initializer && ts.isArrayLiteralExpression(initializer) ?
              initializer.elements.filter(item => !ts.isOmittedExpression(item)).map(element) : [] };
          if (declaration.kind === 'array' && initializer.elements.some(item => ts.isSpreadElement(item))) declaration.kind = 'computed';
          continue;
        }
      }
    }
    if (declaration === null || !identifiers(statement).has(name)) continue;
    let adds = false, modifies = false;
    const visit = (node) => {
      if (ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression) &&
          ts.isIdentifier(node.expression.expression) && node.expression.expression.text === name &&
          ['push', 'unshift', 'splice', 'fill', 'copyWithin', 'pop', 'shift', 'reverse', 'sort'].includes(node.expression.name.text)) adds = true;
      if (ts.isBinaryExpression(node) && node.operatorToken.kind >= ts.SyntaxKind.FirstAssignment &&
          node.operatorToken.kind <= ts.SyntaxKind.LastAssignment) {
        const targets = ts.isArrayLiteralExpression(node.left) ? node.left.elements : [node.left];
        for (const target of targets) {
          if (rootName(target) !== name) continue;
          if (ts.isIdentifier(target) || depth(target) === 1) adds = true;
          else modifies = true;
        }
      }
      ts.forEachChild(node, visit);
    };
    visit(statement);
    const line = lineColumn(source, statement.getStart(source)).line;
    const call = ts.isExpressionStatement(statement) && ts.isCallExpression(statement.expression) ? statement.expression : null;
    const literalPush = adds && call && ts.isPropertyAccessExpression(call.expression) &&
      ts.isIdentifier(call.expression.expression) && call.expression.expression.text === name &&
      call.expression.name.text === 'push' && call.arguments.every(argument => !ts.isSpreadElement(argument));
    if (literalPush) statements.push({ line, class: 'adds', literal: true, elements: call.arguments.map(element) });
    else statements.push({ line, class: adds ? 'adds' : modifies ? 'modifies' : 'reads', literal: false });
  }
  return { name, declaration, statements, constants };
}

// A top-level `for (... of [ ... ])` whose iterable is an array literal: its elements are members too.
function loopElements(source, line) {
  for (const statement of source.statements) {
    if (!ts.isForOfStatement(statement) || lineColumn(source, statement.getStart(source)).line !== line) continue;
    const iterable = unwrapTypes(statement.expression);
    if (!ts.isArrayLiteralExpression(iterable)) return { loop: line, elements: null };
    return { loop: line, elements: iterable.elements.map(node => ({ label: elementLabel(node), line: lineColumn(source, node.getStart(source)).line })) };
  }
  return { loop: line, elements: null };
}

const operations = {
  imports: (request) => imports(parse(request.path, request.text)),
  container: (request) => container(parse(request.path, request.text), request.name),
  loop: (request) => loopElements(parse(request.path, request.text), request.line),
  helpers: (request) => helpers(parse(request.path, request.text)),
  prefix: (request) => prefix(request.pin, request.current, request.path, request.all_earlier === true),
  registrations: (request) => {
    const source = parse(request.path, request.text);
    return { diagnostics: source.parseDiagnostics.length, ...registrations(source) };
  },
  anchors: (request) => {
    const source = parse(request.path, request.text);
    return { anchors: request.anchors.map(({ role, anchor }) => anchorFacts(source, anchor, role, request.span ?? null)) };
  },
};

const requests = JSON.parse(readFileSync(process.argv[2], 'utf8'));
const results = requests.map((request) => {
  const operation = operations[request.op];
  if (!operation) throw new Error('unknown source-facts operation: ' + request.op);
  return operation(request);
});
writeFileSync(process.argv[3], JSON.stringify({ typescript: ts.version, results }) + '\n');
