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

const operations = {
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
