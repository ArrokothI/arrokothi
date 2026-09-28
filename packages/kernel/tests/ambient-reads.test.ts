/**
 * The zone's read rule and its control-commit rule, enforced over the source (amendment 02).
 *
 * K1.2-C13 says that after the first caller observation no live prototype is consulted.
 * `boundary.test.ts` enforces that for *writes* and built-in *methods*. K12C1-R9-HISTORY-01 was a
 * *read*: the Kernel read a member its own object might not own, so the read walked on to
 * `Object.prototype`, which caller code can write. Review found it by probing one field; the rules
 * below make the whole class a property of the source, so a new such read fails here.
 *
 * 1. **No ordinary access to an optional member.** A member a type declares optional is one its
 *    object may not own. Using the TypeScript checker, every property access in the zone whose member
 *    is declared optional is listed, reads and writes alike (a write to an unowned member is `[[Set]]`,
 *    which an inherited setter swallows). The only such accesses are fields of engine-built property
 *    descriptors that are owned by construction, each inventoried below with its reason. Kernel
 *    records own every field they declare because the zone builds each with a literal. Caller
 *    envelopes are read through `observeOwn`, and trusted host objects' optional members through
 *    `hostMember`; both take a key string, so neither appears here.
 * 2. **Dynamic-key reads** are inventoried the same way; each follows an own-descriptor check.
 * 3. **No `in` operator** in the zone: it consults the prototype chain.
 * 4. **Recovery-control commits are prebuilt.** In `recoverExecution`, `reportProtocolFailure` and
 *    `requestTakeover`, nothing after the first mutation constructs anything or calls anything but
 *    the prebuilt appends, the commit helper and the post-commit Driver delivery, and the answer
 *    returned is a prebuilt value. `applyControlCommit` appends its history record before any hold
 *    write and calls nothing else. Hold fields and recovery history are written nowhere else.
 */

import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const SOURCE_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../src");

const OPTIONS: ts.CompilerOptions = {
  target: ts.ScriptTarget.ES2023,
  lib: ["lib.es2023.d.ts"],
  module: ts.ModuleKind.NodeNext,
  moduleResolution: ts.ModuleResolutionKind.NodeNext,
  allowImportingTsExtensions: true,
  noEmit: true,
  strict: true,
  types: [],
};

interface Access {
  readonly file: string;
  readonly kind: "read" | "write" | "dynamic" | "in";
  readonly text: string;
  readonly line: number;
  readonly node: ts.Node;
}

const ASSIGNMENTS = new Set([
  ts.SyntaxKind.EqualsToken,
  ts.SyntaxKind.PlusEqualsToken,
  ts.SyntaxKind.MinusEqualsToken,
  ts.SyntaxKind.QuestionQuestionEqualsToken,
  ts.SyntaxKind.BarBarEqualsToken,
  ts.SyntaxKind.AmpersandAmpersandEqualsToken,
]);

const isWrite = (node: ts.Node): boolean => {
  const parent = node.parent;
  if (ts.isBinaryExpression(parent) && parent.left === node && ASSIGNMENTS.has(parent.operatorToken.kind)) return true;
  if ((ts.isPrefixUnaryExpression(parent) || ts.isPostfixUnaryExpression(parent)) && (parent.operator === ts.SyntaxKind.PlusPlusToken || parent.operator === ts.SyntaxKind.MinusMinusToken)) return true;
  return ts.isDeleteExpression(parent);
};

/** Every access the rule is about, in the given source files. */
function scan(files: readonly string[]): { readonly accesses: Access[]; readonly program: ts.Program } {
  const program = ts.createProgram(files, OPTIONS);
  const checker = program.getTypeChecker();
  const accesses: Access[] = [];
  for (const source of program.getSourceFiles()) {
    if (!files.includes(source.fileName)) continue;
    const record = (kind: Access["kind"], node: ts.Node): void => {
      const line = source.getLineAndCharacterOfPosition(node.getStart()).line + 1;
      accesses.push({ file: basename(source.fileName), kind, text: node.getText().replace(/\s+/g, " "), line, node });
    };
    const optional = (symbol: ts.Symbol | undefined): boolean => symbol !== undefined && (symbol.flags & ts.SymbolFlags.Optional) !== 0;
    const visit = (node: ts.Node): void => {
      if (ts.isPropertyAccessExpression(node) && optional(checker.getSymbolAtLocation(node.name))) {
        record(isWrite(node) ? "write" : "read", node);
      } else if (ts.isElementAccessExpression(node)) {
        const key = node.argumentExpression;
        if (ts.isStringLiteralLike(key) || ts.isNumericLiteral(key)) {
          if (optional(checker.getSymbolAtLocation(key))) record(isWrite(node) ? "write" : "read", node);
        } else if (!isWrite(node)) {
          // A computed key on something that is not a list: which member is read depends on data.
          const receiver = checker.getTypeAtLocation(node.expression);
          if (!checker.isArrayLikeType(receiver) && !(receiver.flags & ts.TypeFlags.StringLike)) record("dynamic", node);
        }
      } else if (ts.isBindingElement(node) && ts.isObjectBindingPattern(node.parent)) {
        const name = (node.propertyName ?? node.name).getText();
        if (optional(checker.getTypeAtLocation(node.parent).getProperty(name))) record("read", node);
      } else if (ts.isBinaryExpression(node) && node.operatorToken.kind === ts.SyntaxKind.InKeyword) {
        record("in", node);
      }
      ts.forEachChild(node, visit);
    };
    visit(source);
  }
  return { accesses, program };
}

const zoneFiles = (): string[] =>
  readdirSync(SOURCE_ROOT)
    .filter((name) => name.endsWith(".ts"))
    .sort()
    .map((name) => resolve(SOURCE_ROOT, name));

/**
 * The complete inventory: file, kind, spelling and count, with the reason each is own by construction.
 * `guard` names a receiver whose `hasOwnValue(...)` check must precede the read in its function.
 */
const INVENTORY: readonly { file: string; kind: Access["kind"]; text: string; count: number; guard?: string; reason: string }[] = [
  { file: "envelope.ts", kind: "read", text: 'PrimordialGetOwnPropertyDescriptor(issue, "occurrences")?.value', count: 3, reason: "descriptor of a Kernel-built issue's own data field (or none): a data descriptor owns `value`" },
  { file: "envelope.ts", kind: "read", text: 'PrimordialGetOwnPropertyDescriptor(issue, "root")?.value', count: 1, reason: "same: Kernel-built issue, data field" },
  { file: "envelope.ts", kind: "dynamic", text: "(holder as Record<string, unknown>)[key]", count: 1, reason: "observeOwn: reached only after the holder's own descriptor exists" },
  { file: "identity.ts", kind: "dynamic", text: "BOUNDARY_PREFIX[boundary]", count: 1, reason: "module-private literal owning every ReceiptBoundary key; `boundary` is always a Kernel literal" },
  { file: "own-array.ts", kind: "read", text: "(fieldDescriptor as { readonly value?: unknown }).value", count: 1, guard: "fieldDescriptor", reason: "own `value` proven by hasOwnValue" },
  { file: "own-array.ts", kind: "read", text: "descriptor.value", count: 1, guard: "descriptor", reason: "readAt: own `value` proven by hasOwnValue" },
  { file: "own-array.ts", kind: "write", text: "safe.value", count: 1, reason: "null-prototype descriptor under construction: no chain to consult" },
  { file: "own-array.ts", kind: "write", text: "safe.writable", count: 1, reason: "same" },
  { file: "own-array.ts", kind: "write", text: "safe.enumerable", count: 1, reason: "same" },
  { file: "own-array.ts", kind: "write", text: "safe.configurable", count: 1, reason: "same" },
  { file: "own-array.ts", kind: "write", text: "safe.get", count: 1, reason: "same" },
  { file: "own-array.ts", kind: "write", text: "safe.set", count: 1, reason: "same" },
  { file: "values.ts", kind: "read", text: "descriptor.value", count: 4, guard: "descriptor", reason: "engine-built descriptor, own `value` proven by hasOwnValue" },
  { file: "values.ts", kind: "read", text: "lengthDescriptor.value", count: 3, guard: "lengthDescriptor", reason: "same" },
  { file: "values.ts", kind: "read", text: "lengthDescriptorInner.value", count: 2, guard: "lengthDescriptorInner", reason: "same" },
  { file: "values.ts", kind: "read", text: "innerDescriptor.value", count: 1, guard: "innerDescriptor", reason: "same" },
  { file: "values.ts", kind: "read", text: "descriptor.enumerable", count: 1, reason: "every engine-built descriptor owns `enumerable`" },
  { file: "values.ts", kind: "dynamic", text: "(container as Record<string, unknown>)[key]", count: 1, reason: "describedValue: the one ordinary read, after the own data descriptor was taken and compared" },
];

const enclosingFunction = (node: ts.Node): ts.Node => {
  let current: ts.Node = node;
  while (!ts.isSourceFile(current) && !ts.isFunctionLike(current)) current = current.parent;
  return current;
};

describe("amendment 02 rule 1–3: no Kernel access reaches a member its object may not own", () => {
  const { accesses } = scan(zoneFiles());

  test("every optional-member, dynamic-key and `in` access in the zone is inventoried", () => {
    const found = new Map<string, number>();
    for (const access of accesses) {
      const key = `${access.file} ${access.kind} ${access.text}`;
      found.set(key, (found.get(key) ?? 0) + 1);
    }
    const expected = new Map(INVENTORY.map((entry) => [`${entry.file} ${entry.kind} ${entry.text}`, entry.count]));
    const unexpected = accesses
      .filter((access) => !expected.has(`${access.file} ${access.kind} ${access.text}`))
      .map((access) => `${access.file}:${access.line} ${access.kind} ${access.text}`);
    assert.deepEqual(unexpected, [], "an access that may consult a prototype, outside the inventory (classify it or remove it)");
    assert.deepEqual(Object.fromEntries(found), Object.fromEntries(expected), "inventoried counts changed");
  });

  test("every guarded descriptor read follows its own-value check in the same function", () => {
    for (const entry of INVENTORY.filter((item) => item.guard !== undefined)) {
      const sites = accesses.filter((access) => access.file === entry.file && access.text === entry.text);
      for (const site of sites) {
        const fn = enclosingFunction(site.node);
        const before = site.node.getSourceFile().text.slice(fn.getStart(), site.node.getStart());
        assert.ok(before.includes(`hasOwnValue(${entry.guard})`), `${entry.file}:${site.line} ${entry.text} is not preceded by hasOwnValue(${entry.guard})`);
      }
    }
  });

  test("the scan is not vacuous: it finds review 09's read and each other forbidden form", () => {
    const directory = mkdtempSync(join(tmpdir(), "k12c1-ambient-reads-"));
    try {
      const probe = join(directory, "probe.ts");
      writeFileSync(
        probe,
        [
          "interface Entry { readonly writerEpoch: number; readonly resultingEpoch?: number }",
          "interface Caller { readonly controlScopes?: readonly string[] }",
          "export const read = (entry: Entry): boolean => entry.resultingEpoch === undefined;",
          "export const optional = (caller: Caller | null): unknown => caller?.controlScopes;",
          "export const destructured = ({ resultingEpoch }: Entry): unknown => resultingEpoch;",
          "export const inherited = (entry: object): boolean => \"resultingEpoch\" in entry;",
          "export const dynamic = (entry: Record<string, unknown>, key: string): unknown => entry[key];",
          "export const required = (entry: Entry): number => entry.writerEpoch;",
          "",
        ].join("\n"),
      );
      const found = scan([probe]).accesses.map((access) => `${access.kind} ${access.text}`);
      assert.deepEqual(found, [
        "read entry.resultingEpoch",
        "read caller?.controlScopes",
        "read resultingEpoch",
        "in \"resultingEpoch\" in entry",
        "dynamic entry[key]",
      ]);
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });
});

describe("amendment 02 rule 4: recovery-control commits are prebuilt and applied without construction", () => {
  const { program } = scan(zoneFiles());
  const source = program.getSourceFile(resolve(SOURCE_ROOT, "coordinator.ts"));
  assert.ok(source !== undefined);

  const find = (predicate: (node: ts.Node) => boolean): ts.Node[] => {
    const out: ts.Node[] = [];
    const visit = (node: ts.Node): void => {
      if (predicate(node)) out.push(node);
      ts.forEachChild(node, visit);
    };
    visit(source);
    return out;
  };
  const method = (name: string): ts.MethodDeclaration => {
    const found = find((node) => ts.isMethodDeclaration(node) && node.name.getText() === name);
    assert.equal(found.length, 1, `one ${name}`);
    return found[0] as ts.MethodDeclaration;
  };
  const calleeText = (call: ts.CallExpression): string => call.expression.getText();
  const MUTATING_CALLS = new Set(["appendOwn", "appendAllOwn", "applyControlCommit", "mapSet"]);
  const isMutation = (node: ts.Node): boolean =>
    (ts.isCallExpression(node) && MUTATING_CALLS.has(calleeText(node))) ||
    (ts.isBinaryExpression(node) && ASSIGNMENTS.has(node.operatorToken.kind) && ts.isPropertyAccessExpression(node.left));
  const descendants = (root: ts.Node): ts.Node[] => {
    const out: ts.Node[] = [];
    const visit = (node: ts.Node): void => {
      out.push(node);
      ts.forEachChild(node, visit);
    };
    ts.forEachChild(root, visit);
    return out;
  };
  const ALLOWED_AFTER = new Set(["appendOwn", "applyControlCommit", "this.#deliver"]);
  const CONSTRUCTION = new Set([
    ts.SyntaxKind.ObjectLiteralExpression,
    ts.SyntaxKind.ArrayLiteralExpression,
    ts.SyntaxKind.TemplateExpression,
    ts.SyntaxKind.NoSubstitutionTemplateLiteral,
    ts.SyntaxKind.NewExpression,
    ts.SyntaxKind.ArrowFunction,
    ts.SyntaxKind.FunctionExpression,
  ]);

  for (const name of ["recoverExecution", "reportProtocolFailure", "requestTakeover"]) {
    test(`${name}: after the first mutation, nothing is built, read from the caller or called but the apply steps`, () => {
      const body = method(name).body;
      assert.ok(body !== undefined);
      const nodes = descendants(body);
      const first = nodes.find(isMutation);
      assert.ok(first !== undefined, `${name} mutates somewhere`);
      const violations: string[] = [];
      for (const node of nodes) {
        if (node.getStart() < first.getStart()) continue;
        if (CONSTRUCTION.has(node.kind)) violations.push(`constructs ${node.getText().slice(0, 60)}`);
        if (ts.isCallExpression(node) && !ALLOWED_AFTER.has(calleeText(node))) violations.push(`calls ${calleeText(node)}`);
        if (ts.isReturnStatement(node) && (node.expression === undefined || !ts.isIdentifier(node.expression))) {
          violations.push(`returns a value built after mutation: ${node.getText().slice(0, 60)}`);
        }
      }
      assert.deepEqual(violations, [], `${name} builds or runs code between its first and last mutation`);
    });
  }

  test("applyControlCommit appends the prebuilt record before any hold write and calls nothing else", () => {
    const found = find((node) => ts.isVariableDeclaration(node) && node.name.getText() === "applyControlCommit");
    assert.equal(found.length, 1);
    const initializer = (found[0] as ts.VariableDeclaration).initializer;
    assert.ok(initializer !== undefined && ts.isArrowFunction(initializer));
    const nodes = descendants(initializer.body);
    const calls = nodes.filter(ts.isCallExpression);
    assert.deepEqual(calls.map(calleeText), ["appendOwn"], "one call: the history append");
    const writes = nodes.filter((node) => ts.isBinaryExpression(node) && ASSIGNMENTS.has(node.operatorToken.kind));
    assert.ok(writes.length >= 2, "both hold writes are there");
    for (const write of writes) assert.ok(write.getStart() > (calls[0] as ts.Node).getStart(), `${write.getText()} precedes the append`);
    assert.equal(nodes.filter((node) => CONSTRUCTION.has(node.kind)).length, 0, "the apply step constructs nothing");
  });

  test("hold fields and recovery history are written only by the commit paths", () => {
    const owner = (node: ts.Node): string => {
      let current: ts.Node = node;
      while (!ts.isSourceFile(current)) {
        if (ts.isMethodDeclaration(current)) return current.name.getText();
        if (ts.isVariableDeclaration(current) && current.initializer !== undefined && ts.isArrowFunction(current.initializer)) return current.name.getText();
        current = current.parent;
      }
      return "<module>";
    };
    const holdWrites = find(
      (node) => ts.isBinaryExpression(node) && ASSIGNMENTS.has(node.operatorToken.kind) && ts.isPropertyAccessExpression(node.left) && ["codeHold", "protocolFailureHold"].includes(node.left.name.getText()),
    ).map(owner);
    assert.deepEqual([...new Set(holdWrites)].sort(), ["applyControlCommit", "requestTakeover"]);
    const historyAppends = find((node) => ts.isCallExpression(node) && MUTATING_CALLS.has(calleeText(node)) && (node.arguments[0]?.getText() ?? "") === "record.recoveryHistory").map(owner);
    assert.deepEqual([...new Set(historyAppends)].sort(), ["#accept", "applyControlCommit", "requestTakeover"]);
  });
});
