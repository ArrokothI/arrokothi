/**
 * Static check that capture observes caller values only through metered helpers (K1.1-correction-03,
 * owner decision-05 item 3: "A maintained static check fails if capture code bypasses them").
 *
 * It reuses `zone-analysis.ts`'s program and checker (the repository's compiler options), not its DEC-8
 * inventory, and applies eight syntactic rules to `values.ts` only:
 *
 * - SC1 confinement: a binding of an engine observation (`OBSERVATION_PRIMORDIALS`) is referenced only
 *   at module load or inside a declared helper (`HELPERS`).
 * - SC2 charge first: a charged helper charges (`spend`) before its first observation; a listing helper
 *   charges the returned list's length in the statement right after the listing.
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
 *
 * It is a regression guard for plausible maintainer mistakes, not a soundness proof (K1.2-correction-01
 * amendment 03; 012). Stated gaps: an alias of a primordial made inside a helper and called elsewhere;
 * the size of a charge; extra work inside a helper; caller-sized string building; recursion that avoids
 * `capture`. `capture-work.test.ts` covers them at run time by counting every wrapped engine operation
 * against the meter's units, and pins each charge with exact unit counts.
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
    if (ts.isVariableStatement(statement)) {
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
const chargesEachIteration = (loop: ts.IterationStatement): boolean => {
  const body = loop.statement;
  const statements = ts.isBlock(body) ? body.statements : [body];
  return statements.some(
    (statement) =>
      (ts.isVariableStatement(statement) || ts.isExpressionStatement(statement)) &&
      callsIn(statement).some((call) => (HELPERS.charged as readonly string[]).includes(calleeName(call) ?? "")),
  );
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
 * Runs SC1–SC8 over `values.ts`, or over `override` text in its place, and returns each violation.
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
      const first = statements[0];
      const second = statements[1];
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

  // SC5
  const capture = functions.get("capture");
  if (capture !== undefined) {
    const statements = bodyStatements(capture);
    if (statements[0]?.getText().replace(/\s+/g, " ") !== "if (state.stopped) return REFUSED;") out.push("SC5 capture does not begin with its stop check");
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
  return out;
}
