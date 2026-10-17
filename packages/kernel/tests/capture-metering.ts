/**
 * Static check that capture observes caller values only through metered helpers (K1.1-correction-03,
 * owner decision-05 item 3: "A maintained static check fails if capture code bypasses them").
 *
 * It reuses `zone-analysis.ts`'s program and checker (the repository's compiler options), not its DEC-8
 * inventory, and applies eleven syntactic rules to `values.ts` only:
 *
 * - SC1 confinement: a binding of an engine observation (`OBSERVATION_PRIMORDIALS`) is referenced only
 *   at module load or inside a declared helper (`HELPERS`).
 * - SC2 charge first: a charged helper charges (`spend`) before its first observation; a listing helper
 *   first tests the stop (`if (state.stopped) return STOPPED;`), then lists, then charges the returned
 *   list's length in the statement right after the listing (KC3-R1-STOP-01).
 * - SC3 no reads in the traversal: `TRAVERSAL` functions hold caller values only as `unknown`/`object`
 *   and contain no type assertion other than `as const`, no `any` and no reference to a global value,
 *   so strict TypeScript rejects any member read of a caller value there.
 * - SC4 loops: every traversal loop either calls a charged helper unconditionally in each iteration or
 *   is bounded by the length of a charged listing in the same function; no `for...of`/`for...in`.
 * - SC5 visit first, Proxy first: `capture` charges its visit unit before anything else, and its first
 *   observation of an object is the Proxy test; only `capture` enters the two container halves.
 * - SC6 visit-covered helpers are called only from the traversal and never inside a loop.
 * - SC7 per-name and string internals: `arrayIndexValue` runs only in a loop bounded by a charged
 *   listing; `scanBoundaryString` is called only by `scanText`.
 * - SC8 the serializer window is not reachable from the traversal or the helpers.
 * - SC9 every loop outside the traversal and the serializer window carries its own cap: its condition
 *   includes a `<` or `<=` comparison against a numeric literal or a `BOUNDARY_LIMITS` member, so its
 *   bound never rests on a guard elsewhere in the function (packet review MS-03).
 * - SC10/SC11 (design 03): one STOPPED return protocol, direct module-level callable bindings,
 *   synchronous lexical control flow, immediate identity tests and one explicit root handler.
 *   Nested callable/class boundaries containing stop-capable calls are unsupported and rejected.
 *   Only spend/charge write stopped/stop/crossing; their exits and return types use the same protocol.
 *
 * This is a bounded syntax guard, not a proof of arbitrary future JavaScript. Declared gaps: aliases,
 * computed properties, .call/.apply, dynamically selected/imported functions, shadowed/reconstructed
 * bindings and escaped state aliases; charge amounts, extra helper work, caller-sized strings and
 * recursion outside the declared traversal. Runtime counts and the bookkeeping/finalization trace
 * cover maintained shapes, not every program using those forms. See design 03 and capture-stop.test.ts.
 */

import { resolve } from "node:path";
import ts from "typescript";

import { buildZone, isFn, ownNodes, SOURCE_ROOT, typeErrors, type Fn } from "./zone-analysis.ts";

export const VALUES_FILE = resolve(SOURCE_ROOT, "values.ts");

/** Module-level bindings of engine operations that observe a caller value or allocate caller-sized state. */
export const OBSERVATION_PRIMORDIALS: ReadonlySet<string> = new Set([
  "PrimordialGetOwnPropertyDescriptor",
  "PrimordialGetOwnPropertyNames",
  "PrimordialGetOwnPropertySymbols",
  "PrimordialGetPrototypeOf",
  "PrimordialArrayIsArray",
  "PrimordialObjectKeys",
  "PrimordialIsProxy",
  "PrimordialIsMap",
  "PrimordialIsSet",
  "PrimordialIsWeakMap",
  "PrimordialIsWeakSet",
  "PrimordialIsDate",
  "PrimordialIsRegExp",
  "PrimordialIsAnyArrayBuffer",
  "PrimordialIsArrayBufferView",
  "PrimordialIsBoxedPrimitive",
  "PrimordialIsNativeError",
  "PrimordialIsPromise",
  "PrimordialIsGeneratorObject",
  "PrimordialIsMapIterator",
  "PrimordialIsSetIterator",
  "PrimordialIsArgumentsObject",
  "PrimordialIsModuleNamespaceObject",
  "PrimordialIsKeyObject",
  "PrimordialIsCryptoKey",
  "PrimordialIsExternal",
  "PrimordialIsRawJSON",
  "PrimordialSetHas",
  "PrimordialSetAdd",
  "PrimordialSetDelete",
  "PrimordialStringCharCodeAt",
  "sizedList",
]);

/** The declared helpers, by kind; each kind's coverage argument is in `values.ts`. */
export const HELPERS = {
  /** Constant work, at most once per visit and never in a loop, paid by the visit unit. */
  visit: ["isProxyValue", "isOpenContainer", "openContainer", "closeContainer", "isArrayValue", "prototypeOf", "isBuiltInWithSlots", "observeArrayLength", "allocateElements"],
  /** Charge first (a listing: right after it returns). */
  charged: ["listOwnNames", "listOwnSymbols", "observeElement", "observeDescriptor", "readMember", "scanText"],
  /** Listing helpers: their second statement charges the first statement's list length. */
  listing: ["listOwnNames", "listOwnSymbols"],
  /** Constant work on one listed name, or the string scan behind `scanText`. */
  internal: ["arrayIndexValue", "scanBoundaryString"],
  /** The serializer window: it runs only on an accepted snapshot, never on caller values. */
  serializer: ["toSerializationSafe", "serializerSlots", "chainShape", "inheritedIndexShadows", "prototypeNamedShadows", "withSerializerEnvironment", "encode"],
} as const;

/** The traversal: every function that receives a caller value outside the helpers. */
export const TRAVERSAL: readonly string[] = ["capture", "captureArray", "captureObject", "checkMember"];

const ALLOWED: ReadonlySet<string> = new Set([...HELPERS.visit, ...HELPERS.charged, ...HELPERS.internal, ...HELPERS.serializer]);

/** Top-level functions of a source file by name: declarations and `const name = <function>`. */
const topLevelFunctions = (source: ts.SourceFile): Map<string, Fn> => {
  const out = new Map<string, Fn>();
  for (const statement of source.statements) {
    if (ts.isFunctionDeclaration(statement) && statement.name !== undefined) out.set(statement.name.text, statement);
    if (ts.isVariableStatement(statement) && (statement.declarationList.flags & ts.NodeFlags.Const) !== 0) {
      for (const declaration of statement.declarationList.declarations) {
        if (ts.isIdentifier(declaration.name) && declaration.initializer !== undefined) {
          let initializer: ts.Expression = declaration.initializer;
          while (ts.isParenthesizedExpression(initializer)) initializer = initializer.expression;
          if (isFn(initializer)) out.set(declaration.name.text, initializer);
        }
      }
    }
  }
  return out;
};

/** The top-level function that encloses `node`, or `undefined` at module load. */
const ownerOf = (node: ts.Node, byNode: ReadonlyMap<Fn, string>): string | undefined => {
  let found: string | undefined;
  for (let current: ts.Node | undefined = node.parent; current !== undefined; current = current.parent) {
    if (isFn(current) && byNode.has(current)) found = byNode.get(current);
  }
  return found;
};

const calleeName = (call: ts.CallExpression): string | undefined => {
  let callee: ts.Expression = call.expression;
  while (ts.isParenthesizedExpression(callee) || ts.isNonNullExpression(callee)) callee = callee.expression;
  return ts.isIdentifier(callee) ? callee.text : undefined;
};

const isLoop = (node: ts.Node): node is ts.IterationStatement =>
  ts.isForStatement(node) || ts.isWhileStatement(node) || ts.isDoStatement(node) || ts.isForOfStatement(node) || ts.isForInStatement(node);

/** Whether `node` sits inside a loop of its own function (not counting loops outside the function). */
const insideLoop = (node: ts.Node): boolean => {
  for (let current: ts.Node | undefined = node.parent; current !== undefined; current = current.parent) {
    if (isFn(current)) return false;
    if (isLoop(current)) return true;
  }
  return false;
};

/** Calls in `node` not inside a nested function. */
const callsIn = (node: ts.Node): ts.CallExpression[] => {
  const out: ts.CallExpression[] = [];
  const walk = (current: ts.Node): void => {
    if (isFn(current)) return;
    if (ts.isCallExpression(current)) out.push(current);
    ts.forEachChild(current, walk);
  };
  walk(node);
  return out;
};

const referencesIn = (node: ts.Node, names: ReadonlySet<string>): ts.Identifier[] => {
  const out: ts.Identifier[] = [];
  const walk = (current: ts.Node): void => {
    if (ts.isIdentifier(current) && names.has(current.text)) out.push(current);
    ts.forEachChild(current, walk);
  };
  walk(node);
  return out;
};

const bodyStatements = (fn: Fn): readonly ts.Statement[] =>
  fn.body !== undefined && ts.isBlock(fn.body) ? fn.body.statements : fn.body !== undefined ? [ts.factory.createExpressionStatement(fn.body as ts.Expression)] : [];

/** The names of `const` bindings in `fn` initialized by a call to a listing helper. */
const listingBindings = (fn: Fn): Set<string> => {
  const out = new Set<string>();
  ownNodes(fn, (node) => {
    if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.initializer !== undefined && ts.isCallExpression(node.initializer)) {
      const name = calleeName(node.initializer);
      if (name !== undefined && (HELPERS.listing as readonly string[]).includes(name)) out.add(node.name.text);
    }
  });
  return out;
};

/** Whether a loop is bounded by `<listing>.length` (or a `const` derived from it) in its condition. */
const boundedByListing = (loop: ts.IterationStatement, fn: Fn): boolean => {
  if (!ts.isForStatement(loop) || loop.condition === undefined) return false;
  const listings = listingBindings(fn);
  const derived = new Set<string>();
  ownNodes(fn, (node) => {
    if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.initializer !== undefined) {
      const text = node.initializer.getText();
      for (const listing of listings) if (text.includes(`${listing}.length`)) derived.add(node.name.text);
    }
  });
  let bounded = false;
  const walk = (current: ts.Node): void => {
    if (ts.isPropertyAccessExpression(current) && current.name.text === "length" && ts.isIdentifier(current.expression) && listings.has(current.expression.text)) bounded = true;
    if (ts.isIdentifier(current) && derived.has(current.text)) bounded = true;
    ts.forEachChild(current, walk);
  };
  walk(loop.condition);
  return bounded;
};

/** Whether a direct statement of the loop body calls a charged helper unconditionally. */
/** A literal cap: numeric literals and `BOUNDARY_LIMITS` members joined by arithmetic. */
const isCap = (node: ts.Expression): boolean => {
  if (ts.isParenthesizedExpression(node)) return isCap(node.expression);
  if (ts.isNumericLiteral(node)) return true;
  if (ts.isPropertyAccessExpression(node)) return ts.isIdentifier(node.expression) && node.expression.text === "BOUNDARY_LIMITS";
  return ts.isBinaryExpression(node) && [ts.SyntaxKind.PlusToken, ts.SyntaxKind.AsteriskToken].includes(node.operatorToken.kind) &&
    isCap(node.left) && isCap(node.right);
};

/** Whether a loop's condition is a conjunction one of whose terms compares against a literal cap. */
const capped = (loop: ts.IterationStatement): boolean => {
  const condition = ts.isForStatement(loop) ? loop.condition : ts.isWhileStatement(loop) || ts.isDoStatement(loop) ? loop.expression : undefined;
  const terms: ts.Expression[] = [];
  const split = (node: ts.Expression): void => {
    if (ts.isParenthesizedExpression(node)) split(node.expression);
    else if (ts.isBinaryExpression(node) && node.operatorToken.kind === ts.SyntaxKind.AmpersandAmpersandToken) {
      split(node.left);
      split(node.right);
    } else terms.push(node);
  };
  if (condition !== undefined) split(condition);
  return terms.some((term) => ts.isBinaryExpression(term) &&
    [ts.SyntaxKind.LessThanToken, ts.SyntaxKind.LessThanEqualsToken].includes(term.operatorToken.kind) && isCap(term.right));
};

const chargesEachIteration = (loop: ts.IterationStatement): boolean => {
  const body = loop.statement;
  const statements = ts.isBlock(body) ? body.statements : [body];
  return statements.some(
    (statement) =>
      (ts.isVariableStatement(statement) || ts.isExpressionStatement(statement)) &&
      callsIn(statement).some((call) => (HELPERS.charged as readonly string[]).includes(calleeName(call) ?? "")),
  );
};

const normalized = (node: ts.Node): string => node.getText().replace(/\s+/g, " ");

const unparenthesized = (node: ts.Node): ts.Node => {
  let current = node;
  while (current.parent !== undefined && ts.isParenthesizedExpression(current.parent)) current = current.parent;
  return current;
};

/** The root that turns a stop into the root's refusal; its callers see an `Acceptance`, never a stop. */
const STOP_ROOT = "acceptMetered";

/** `spend`, `charge` and, by fixpoint over the file's call graph, every function that calls one (SC10). */
export function stopCapable(functions: ReadonlyMap<string, Fn>): Set<string> {
  const out = new Set(["spend", "charge"]);
  const callees = new Map<string, Set<string>>();
  for (const [name, fn] of functions) {
    const names = new Set<string>();
    if (fn.body !== undefined) {
      for (const call of callsIn(fn.body)) { const name = calleeName(call); if (name !== undefined) names.add(name); }
    }
    callees.set(name, names);
  }
  for (let changed = true; changed; ) {
    changed = false;
    for (const [name, names] of callees) {
      if (out.has(name) || name === STOP_ROOT) continue;
      if ([...names].some((callee) => out.has(callee))) {
        out.add(name);
        changed = true;
      }
    }
  }
  return out;
}

/** Whether `node` is what its function returns: a `return` operand or a concise arrow body. */
const isReturned = (node: ts.Node): boolean => {
  const parent = node.parent;
  if (parent === undefined) return false;
  if (ts.isReturnStatement(parent) && parent.expression === node) return true;
  if (ts.isArrowFunction(parent) && parent.body === node) return true;
  // A branch of a returned conditional is returned as well.
  if (ts.isConditionalExpression(parent) && (parent.whenTrue === node || parent.whenFalse === node)) return isReturned(unparenthesized(parent));
  return false;
};

const isStopValue = (node: ts.Expression): boolean => {
  let current: ts.Expression = node;
  while (ts.isParenthesizedExpression(current)) current = current.expression;
  return ts.isIdentifier(current) && current.text === "STOPPED";
};

/** The sole stop return, alone or as the only statement of a block. */
const returnsStop = (statement: ts.Statement | undefined): boolean => {
  if (statement === undefined) return false;
  const only = ts.isBlock(statement) && statement.statements.length === 1 ? statement.statements[0]! : statement;
  return ts.isReturnStatement(only) && only.expression !== undefined && isStopValue(only.expression);
};

/** The statement that follows `statement` in its enclosing block or source file, if any. */
const nextStatement = (statement: ts.Statement): ts.Statement | undefined => {
  const parent = statement.parent;
  const list = ts.isBlock(parent) || ts.isSourceFile(parent) || ts.isModuleBlock(parent) ? parent.statements : undefined;
  if (list === undefined) return undefined;
  const at = list.indexOf(statement);
  return at >= 0 ? list[at + 1] : undefined;
};

/** Only strict identity with the unique sentinel is a stop test. */
const stopTest = (expression: ts.Expression, operand: ts.Node): boolean => {
  let node = expression;
  while (ts.isParenthesizedExpression(node)) node = node.expression;
  return ts.isBinaryExpression(node) && node.operatorToken.kind === ts.SyntaxKind.EqualsEqualsEqualsToken &&
    node.left === operand && isStopValue(node.right);
};

/** Nearest callable, including methods/accessors (never attribute an inner return to its parent). */
const lexicalCallable = (node: ts.Node): ts.Node | undefined => {
  for (let current = node.parent; current !== undefined; current = current.parent) {
    if (ts.isFunctionLike(current)) return current;
  }
  return undefined;
};

/** Why a direct stop-capable call is outside the approved grammar. */
const unconsumedStop = (call: ts.CallExpression): string | undefined => {
  const node = unparenthesized(call);
  if (isReturned(node)) return undefined;
  const comparison = node.parent;
  if (comparison !== undefined && ts.isBinaryExpression(comparison) && stopTest(comparison, node)) {
    const test = unparenthesized(comparison);
    const parent = test.parent;
    if (parent !== undefined && ts.isConditionalExpression(parent) && parent.condition === test) {
      return isReturned(unparenthesized(parent)) && isStopValue(parent.whenTrue) ? undefined : "its conditional stop arm is not STOPPED";
    }
    if (parent !== undefined && ts.isIfStatement(parent) && parent.expression === test && returnsStop(parent.thenStatement)) return undefined;
    return "its identity test does not immediately return STOPPED";
  }
  const parent = node.parent;
  if (parent !== undefined && ts.isVariableDeclaration(parent) && parent.initializer === node && ts.isIdentifier(parent.name)) {
    const statement = parent.parent.parent;
    if (ts.isVariableStatement(statement) && statement.declarationList.declarations.length === 1 &&
        (statement.declarationList.flags & ts.NodeFlags.Const) !== 0) {
      const next = nextStatement(statement);
      if (next !== undefined && ts.isIfStatement(next)) {
        const condition = next.expression;
        if (ts.isBinaryExpression(condition) && ts.isIdentifier(condition.left) && condition.left.text === parent.name.text &&
            stopTest(condition, condition.left) && returnsStop(next.thenStatement)) return undefined;
      }
    }
  }
  return "its result is not immediately tested by identity or tail-returned";
};

/** The root consumes precisely one direct capture and explicitly maps its sentinel to refusal. */
const rootHandlesStop = (fn: Fn, calls: readonly ts.CallExpression[], capable: ReadonlySet<string>): boolean => {
  const owned = calls.filter((call) => lexicalCallable(call) === fn && capable.has(calleeName(call) ?? ""));
  if (owned.length !== 1 || calleeName(owned[0]!) !== "capture") return false;
  const call = owned[0]!;
  const binding = call.parent;
  if (!ts.isVariableDeclaration(binding) || binding.initializer !== call || !ts.isIdentifier(binding.name)) return false;
  const statement = binding.parent.parent;
  if (!ts.isVariableStatement(statement) || statement.declarationList.declarations.length !== 1 ||
      (statement.declarationList.flags & ts.NodeFlags.Const) === 0) return false;
  const next = nextStatement(statement);
  if (next === undefined || !ts.isVariableStatement(next) || next.declarationList.declarations.length !== 1 ||
      (next.declarationList.flags & ts.NodeFlags.Const) === 0) return false;
  const selection = next.declarationList.declarations[0]!.initializer;
  if (selection === undefined || !ts.isConditionalExpression(selection)) return false;
  const condition = selection.condition;
  return ts.isBinaryExpression(condition) && ts.isIdentifier(condition.left) && condition.left.text === binding.name.text &&
    stopTest(condition, condition.left) && ts.isIdentifier(selection.whenTrue) && selection.whenTrue.text === "REFUSED" &&
    ts.isIdentifier(selection.whenFalse) && selection.whenFalse.text === binding.name.text;
};

const isGlobalValue = (checker: ts.TypeChecker, identifier: ts.Identifier): boolean => {
  const parent = identifier.parent;
  if (ts.isPropertyAccessExpression(parent) && parent.name === identifier) return false;
  if (ts.isPropertyAssignment(parent) && parent.name === identifier) return false;
  if (ts.isTypeReferenceNode(parent) || ts.isQualifiedName(parent)) return false;
  const symbol = checker.getSymbolAtLocation(identifier);
  const declarations = symbol?.declarations ?? [];
  return declarations.length > 0 && declarations.every((declaration) => declaration.getSourceFile().isDeclarationFile);
};

/**
 * Runs SC1–SC11 over `values.ts`, or over `override` text in its place, and returns each violation.
 * An override that does not typecheck is itself reported, so a negative control cannot pass vacuously.
 */
export function meteringViolations(override?: string): string[] {
  const zone = buildZone([VALUES_FILE], override === undefined ? new Map() : new Map([[VALUES_FILE, override]]));
  const errors = typeErrors(zone);
  if (errors.length > 0) return errors.map((error) => `typecheck: ${error}`);
  const source = zone.program.getSourceFile(VALUES_FILE);
  if (source === undefined) return ["values.ts is missing from the program"];
  const checker = zone.checker;
  const functions = topLevelFunctions(source);
  const byNode = new Map<Fn, string>([...functions].map(([name, fn]) => [fn, name]));
  const out: string[] = [];
  for (const name of [...ALLOWED, ...TRAVERSAL]) if (!functions.has(name)) out.push(`declared function ${name} is missing`);

  // SC1
  for (const reference of referencesIn(source, OBSERVATION_PRIMORDIALS)) {
    const parent = reference.parent;
    if (ts.isVariableDeclaration(parent) && parent.name === reference) continue;
    if (ts.isImportSpecifier(parent)) continue;
    const owner = ownerOf(reference, byNode);
    if (owner !== undefined && !ALLOWED.has(owner)) out.push(`SC1 ${owner} uses ${reference.text} outside the metered helpers`);
  }

  // SC2
  for (const name of HELPERS.charged) {
    const fn = functions.get(name);
    if (fn === undefined) continue;
    const statements = bodyStatements(fn);
    if ((HELPERS.listing as readonly string[]).includes(name)) {
      const gate = statements[0];
      const gated = gate !== undefined && normalized(gate) === "if (state.stopped) return STOPPED;";
      if (!gated) out.push(`SC2 ${name} lists without first testing the stop`);
      const first = statements[gated ? 1 : 0];
      const second = statements[gated ? 2 : 1];
      const listed =
        first !== undefined && ts.isVariableStatement(first) ? first.declarationList.declarations[0] : undefined;
      const listedName = listed !== undefined && ts.isIdentifier(listed.name) ? listed.name.text : undefined;
      const lists = listed?.initializer !== undefined && referencesIn(listed.initializer, OBSERVATION_PRIMORDIALS).length > 0;
      const charges =
        second !== undefined &&
        listedName !== undefined &&
        callsIn(second).some((call) => calleeName(call) === "spend" && call.getText().includes(`${listedName}.length`));
      if (!lists || !charges) out.push(`SC2 ${name} does not charge its listing's length right after it returns`);
      continue;
    }
    const observing = statements.findIndex(
      (statement) =>
        referencesIn(statement, OBSERVATION_PRIMORDIALS).length > 0 ||
        callsIn(statement).some((call) => calleeName(call) === "scanBoundaryString"),
    );
    const firstElementRead = statements.findIndex((statement) => {
      let found = false;
      const walk = (current: ts.Node): void => {
        if (ts.isElementAccessExpression(current)) found = true;
        if (!isFn(current)) ts.forEachChild(current, walk);
      };
      walk(statement);
      return found;
    });
    const firstWork = [observing, firstElementRead].filter((index) => index >= 0).reduce((a, b) => Math.min(a, b), Number.POSITIVE_INFINITY);
    const spendAt = statements.findIndex((statement) => callsIn(statement).some((call) => calleeName(call) === "spend"));
    if (spendAt < 0 || (Number.isFinite(firstWork) && spendAt >= firstWork)) out.push(`SC2 ${name} observes before it charges`);
  }

  // SC3 and SC4
  for (const name of TRAVERSAL) {
    const fn = functions.get(name);
    if (fn === undefined) continue;
    ownNodes(fn, (node) => {
      if ((ts.isAsExpression(node) || ts.isTypeAssertionExpression(node)) && node.type.getText() !== "const") {
        out.push(`SC3 ${name} asserts a type: ${node.getText().replace(/\s+/g, " ").slice(0, 80)}`);
      }
      if (node.kind === ts.SyntaxKind.AnyKeyword) out.push(`SC3 ${name} uses any`);
      if (ts.isIdentifier(node) && isGlobalValue(checker, node)) out.push(`SC3 ${name} references the global ${node.text}`);
      if (ts.isForOfStatement(node) || ts.isForInStatement(node)) out.push(`SC4 ${name} uses for...of/in`);
      if (ts.isForStatement(node) || ts.isWhileStatement(node) || ts.isDoStatement(node)) {
        if (!chargesEachIteration(node) && !boundedByListing(node, fn)) out.push(`SC4 ${name} has an unmetered loop: ${node.getText().split("\n")[0]}`);
      }
    });
    // Parameters and locals typed `any` are covered above; a parameter typed with a member-bearing
    // object type would let a read through: the traversal's caller-value parameters must be `unknown`/`object`.
    for (const parameter of fn.parameters) {
      const text = parameter.type?.getText();
      if (ts.isIdentifier(parameter.name) && ["value", "container"].includes(parameter.name.text) && text !== "unknown" && text !== "object") {
        out.push(`SC3 ${name} types its caller value as ${text}`);
      }
    }
  }

  // SC9
  for (const [name, fn] of functions) {
    if (TRAVERSAL.includes(name) || (HELPERS.serializer as readonly string[]).includes(name)) continue;
    ownNodes(fn, (node) => {
      if (ts.isForOfStatement(node) || ts.isForInStatement(node)) out.push(`SC9 ${name} uses for...of/in`);
      else if ((ts.isForStatement(node) || ts.isWhileStatement(node) || ts.isDoStatement(node)) && !capped(node)) {
        out.push(`SC9 ${name} has a loop without its own cap: ${node.getText().split("\n")[0]}`);
      }
    });
  }

  // SC5
  const capture = functions.get("capture");
  if (capture !== undefined) {
    const statements = bodyStatements(capture);
    if (statements[0] === undefined || normalized(statements[0]) !== "if (state.stopped) return STOPPED;") out.push("SC5 capture does not begin with its stop check");
    const second = statements[1];
    if (second === undefined || !callsIn(second).some((call) => calleeName(call) === "spend" && call.getText().includes('"visit"'))) {
      out.push("SC5 capture does not charge its visit unit before any other work");
    }
    const calls = callsIn(capture.body as ts.Node);
    const proxyAt = calls.find((call) => calleeName(call) === "isProxyValue")?.getStart();
    const observations = new Set([
      ...HELPERS.visit.filter((helper) => helper !== "isProxyValue"),
      ...HELPERS.charged.filter((helper) => helper !== "scanText"),
      "captureArray",
      "captureObject",
    ]);
    const firstObservation = calls.filter((call) => observations.has(calleeName(call) ?? "")).map((call) => call.getStart()).sort((a, b) => a - b)[0];
    if (proxyAt === undefined || (firstObservation !== undefined && firstObservation < proxyAt)) out.push("SC5 capture observes an object before its Proxy test");
  }

  // SC5 (container halves), SC6, SC7, SC8: every call site in the file, nested functions included
  const allCalls: ts.CallExpression[] = [];
  const collect = (node: ts.Node): void => {
    if (ts.isCallExpression(node)) allCalls.push(node);
    ts.forEachChild(node, collect);
  };
  collect(source);
  for (const call of allCalls) {
    const callee = calleeName(call);
    if (callee === undefined) continue;
    const owner = ownerOf(call, byNode);
    if ((callee === "captureArray" || callee === "captureObject") && owner !== "capture") out.push(`SC5 ${owner ?? "module"} enters ${callee} without capture`);
    if ((HELPERS.visit as readonly string[]).includes(callee)) {
      if (owner === undefined || !TRAVERSAL.includes(owner)) out.push(`SC6 ${owner ?? "module"} calls the visit-covered ${callee}`);
      else if (insideLoop(call)) out.push(`SC6 ${owner} calls the visit-covered ${callee} inside a loop`);
    }
    if (callee === "arrayIndexValue") {
      let loop: ts.Node | undefined = call.parent;
      while (loop !== undefined && !isLoop(loop) && !isFn(loop)) loop = loop.parent;
      const fn = owner !== undefined ? functions.get(owner) : undefined;
      if (loop === undefined || !isLoop(loop) || fn === undefined || !boundedByListing(loop, fn)) out.push(`SC7 ${owner ?? "module"} calls arrayIndexValue outside a listing-bounded loop`);
    }
    if (callee === "scanBoundaryString" && owner !== "scanText") out.push(`SC7 ${owner ?? "module"} calls scanBoundaryString directly`);
    if ((HELPERS.serializer as readonly string[]).includes(callee) && owner !== undefined && !(HELPERS.serializer as readonly string[]).includes(owner) && owner !== "finishAcceptance") {
      out.push(`SC8 ${owner} reaches the serializer window through ${callee}`);
    }
  }

  // SC10: every call of a stop-capable function returns at once when the root stops.
  const capable = stopCapable(functions);
  for (const required of ["record", "refuse", "listOwnNames", "listOwnSymbols", "observeElement", "observeDescriptor", "readMember", "scanText", "checkMember", "capture", "captureArray", "captureObject"]) {
    if (!capable.has(required)) out.push(`SC10 ${required} is expected to be stop-capable but calls no stop-capable function`);
  }
  for (const call of allCalls) {
    const callee = calleeName(call);
    if (callee === undefined || !capable.has(callee)) continue;
    const owner = ownerOf(call, byNode);
    const fn = owner === undefined ? undefined : functions.get(owner);
    if (fn === undefined || lexicalCallable(call) !== fn) {
      out.push(`SC10 unsupported callable boundary for ${callee}`);
      continue;
    }
    if (owner === STOP_ROOT) continue;
    const why = unconsumedStop(call);
    if (why !== undefined) out.push(`SC10 ${owner ?? "module"} calls the stop-capable ${callee} but ${why}: ${normalized(call).slice(0, 80)}`);
  }

  const root = functions.get(STOP_ROOT);
  if (root === undefined || !rootHandlesStop(root, allCalls, capable)) out.push("SC10 root does not handle exactly one capture stop");
  for (const name of capable) {
    const fn = functions.get(name);
    if (fn === undefined) { out.push(`SC10 missing stop producer ${name}`); continue; }
    if (fn.modifiers?.some((modifier) => modifier.kind === ts.SyntaxKind.AsyncKeyword) ||
        ("asteriskToken" in fn && fn.asteriskToken !== undefined)) out.push(`SC10 ${name} is not a synchronous callable`);
    if (!fn.type || !/\b(?:typeof STOPPED|Visited)\b/.test(normalized(fn.type))) out.push(`SC10 ${name} return type omits STOPPED`);
    const nested = (node: ts.Node): void => {
      if (ts.isFunctionLike(node) || ts.isClassDeclaration(node) || ts.isClassExpression(node)) {
        out.push(`SC10 ${name} contains an unsupported nested callable/class`);
        return;
      }
      ts.forEachChild(node, nested);
    };
    if (fn.body !== undefined && ts.isBlock(fn.body)) ts.forEachChild(fn.body, nested);
  }
  for (const name of ["spend", "charge", "record"]) {
    const fn = functions.get(name);
    if (fn === undefined) continue;
    if (fn.type === undefined || normalized(fn.type) !== "true | typeof STOPPED") out.push(`SC10 ${name} must return true | typeof STOPPED`);
    ownNodes(fn, (node) => {
      if (ts.isReturnStatement(node) && (node.expression === undefined ||
          (node.expression.kind !== ts.SyntaxKind.TrueKeyword && !isStopValue(node.expression)))) out.push(`SC10 ${name} has an alternative stop result`);
    });
    if (name !== "record") {
      const body = bodyStatements(fn);
      if (body[0] === undefined || normalized(body[0]) !== "if (state.stopped) return STOPPED;") out.push(`SC10 ${name} has an alternative entry gate`);
      // Both writers' crossing branch ends with the same sentinel; success is only after that branch.
      const crossing = body.find((statement) => ts.isIfStatement(statement) &&
        referencesIn(statement.thenStatement, new Set(["pushIssue"])).length > 0);
      if (crossing === undefined || !ts.isIfStatement(crossing) || !ts.isBlock(crossing.thenStatement) ||
          !returnsStop(crossing.thenStatement.statements.at(-1)!)) out.push(`SC10 ${name} crossing does not return STOPPED`);
    }
  }

  // SC11: only the two stop transitions write the stop state.
  const writes = (node: ts.Node): void => {
    const target =
      ts.isBinaryExpression(node) && node.operatorToken.kind >= ts.SyntaxKind.FirstAssignment && node.operatorToken.kind <= ts.SyntaxKind.LastAssignment
        ? node.left
        : (ts.isPrefixUnaryExpression(node) || ts.isPostfixUnaryExpression(node)) &&
            (node.operator === ts.SyntaxKind.PlusPlusToken || node.operator === ts.SyntaxKind.MinusMinusToken)
          ? node.operand
          : undefined;
    if (target !== undefined && ts.isPropertyAccessExpression(target) && ["stopped", "stop", "crossing"].includes(target.name.text)) {
      const owner = ownerOf(node, byNode);
      if (owner !== "spend" && owner !== "charge") out.push(`SC11 ${owner ?? "module"} writes the stop state: ${normalized(node).slice(0, 80)}`);
    }
    ts.forEachChild(node, writes);
  };
  writes(source);
  return out;
}
