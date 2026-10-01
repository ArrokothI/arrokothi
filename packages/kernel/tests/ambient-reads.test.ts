/**
 * Correction DEC-8, guarded over the source: the zone makes no ordinary access to a member its
 * object may not own (contract revision 9; K12C1-R9-HISTORY-01, K12C1-R10-READ-01).
 *
 * This is a static regression guard, not the rule's evidence: the poisoned-prototype sweep checks
 * the rule at run time (`sweep/run-poison-sweep.ts`, `poison-catalog.test.ts`). Round 6's scanner
 * listed the access shapes it knew, and review 10 found three equivalent reads it never saw. The guard
 * (`zone-analysis.ts`) therefore rejects forms by absence from an allowlist and classifies accesses
 * with the checker; review 11 found forms it still misses (see `zone-analysis.ts` and the contract):
 *
 * 1. **Permitted syntax.** Every executable node kind, operator and assignment target is in an
 *    allowlist; destructuring of any form, iteration, `in`, `instanceof`, coercing equality, `++`/`--`,
 *    `await`/`yield`, `super.x` and the rest are reported by absence.
 * 2. **Member accesses it recognises are classified** by the checker: declared optional, declared by no type
 *    (index signature, `any`), declared by TypeScript's `lib` and reached after load (a built-in
 *    prototype supplies it), computed on a non-list, an index into a list, an object spread, a type
 *    assertion or predicate that introduces members or makes an optional one required, an implicit
 *    conversion of a possible object, a lib global read after load, or a caller envelope used other
 *    than through observation.
 * 3. **Every reported site matches `zone-inventory.ts`** with its reason and count; guarded descriptor
 *    reads keep their `hasOwnValue` precondition, bounded index reads their loop bound, and every
 *    `hostMember` key names an optional member of its holder.
 *
 * The negative controls below give each form the guard recognises its own synthetic source; each
 * must be reported, and a probe of permitted forms must report nothing.
 */

import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { resolve } from "node:path";
import ts from "typescript";
import { analyseAccesses, analyseEffects, buildZone, mutatedArguments, ownerName, SOURCE_ROOT, strip, typeErrors, zoneFiles, type Site } from "./zone-analysis.ts";
import { ACCESS_INVENTORY, EFFECT_OVERRIDES, EXTRA_ENVELOPE_PARAMETERS, FOREIGN_CALLS, getterReads } from "./zone-inventory.ts";

const zone = buildZone();
const sites = analyseAccesses(zone, { extraEnvelopeParameters: EXTRA_ENVELOPE_PARAMETERS });
const key = (site: { file: string; kind: string; mode: string; text: string }): string => `${site.file} ${site.kind}/${site.mode} ${site.text}`;

const enclosingFunction = (node: ts.Node): ts.Node => {
  let current: ts.Node = node;
  while (!ts.isSourceFile(current) && !ts.isFunctionLike(current)) current = current.parent;
  return current;
};

describe("correction DEC-8: every access that could reach a member its object does not own is permitted and reasoned", () => {
  test("the zone typechecks under the repository configuration the analysis uses", () => {
    assert.deepEqual(typeErrors(zone), []);
  });

  test("the zone uses only permitted syntax", () => {
    assert.deepEqual(
      sites.filter((site) => site.kind === "syntax").map((site) => `${site.file}:${site.line} ${site.text}`),
      [],
    );
  });

  test("every reported site is inventoried, at its exact count, with a reason", () => {
    const found = new Map<string, number>();
    for (const site of sites) found.set(key(site), (found.get(key(site)) ?? 0) + 1);
    const expected = new Map(ACCESS_INVENTORY.map((entry) => [key(entry), entry.count]));
    const unexpected = sites.filter((site) => !expected.has(key(site))).map((site) => `${site.file}:${site.line} ${site.kind}/${site.mode} ${site.text}`);
    assert.deepEqual(unexpected, [], "a site that may reach an unowned member, outside the inventory (classify it or remove it)");
    assert.deepEqual(Object.fromEntries([...found].sort()), Object.fromEntries([...expected].sort()), "inventoried counts changed");
    for (const entry of ACCESS_INVENTORY) assert.ok(entry.reason.length >= 16, `${key(entry)} carries a reason`);
  });

  test("every guarded descriptor read follows its own-value check in the same function", () => {
    for (const entry of ACCESS_INVENTORY.filter((item) => item.guard !== undefined)) {
      const matching = sites.filter((site) => key(site) === key(entry));
      assert.equal(matching.length, entry.count);
      for (const site of matching) {
        const fn = enclosingFunction(site.node);
        const before = site.node.getSourceFile().text.slice(fn.getStart(), site.node.getStart());
        assert.ok(before.includes(`hasOwnValue(${entry.guard})`), `${site.file}:${site.line} ${entry.text} is not preceded by hasOwnValue(${entry.guard})`);
      }
    }
  });

  test("every bounded index read sits in a loop that keeps its index below the list's own length", () => {
    const analysis = analyseEffects(zone, { foreignCalls: new Set(FOREIGN_CALLS.keys()), overrides: EFFECT_OVERRIDES, getterReads: getterReads() });
    for (const entry of ACCESS_INVENTORY.filter((item) => item.bounded === true)) {
      for (const site of sites.filter((candidate) => key(candidate) === key(entry))) {
        const access = site.node as ts.ElementAccessExpression;
        const index = strip(access.argumentExpression);
        const list = access.expression.getText();
        assert.ok(ts.isIdentifier(index), `${site.file}:${site.line}: the index is a loop variable`);
        let loop: ts.Node | undefined = access.parent;
        while (loop !== undefined && !ts.isForStatement(loop)) loop = loop.parent;
        assert.ok(loop !== undefined && ts.isForStatement(loop), `${site.file}:${site.line}: inside a for loop`);
        const [declaration] = loop.initializer !== undefined && ts.isVariableDeclarationList(loop.initializer) ? loop.initializer.declarations : [];
        assert.ok(declaration !== undefined && declaration.name.getText() === index.text && declaration.initializer !== undefined && ts.isNumericLiteral(declaration.initializer), `${site.file}:${site.line}: ${index.text} starts at a non-negative literal`);
        // Some conjunct of the condition is `i < X.length`, or `i < B` for `const B = X.length > N ? N : X.length`.
        const conjuncts: ts.Expression[] = [];
        const split = (expression: ts.Expression): void => {
          if (ts.isBinaryExpression(expression) && expression.operatorToken.kind === ts.SyntaxKind.AmpersandAmpersandToken) {
            split(expression.left);
            split(expression.right);
          } else conjuncts.push(expression);
        };
        if (loop.condition !== undefined) split(loop.condition);
        const length = `${list}.length`;
        const isBound = (bound: ts.Expression): boolean => {
          if (bound.getText() === length) return true;
          if (!ts.isIdentifier(bound)) return false;
          const declaration = zone.checker.getSymbolAtLocation(bound)?.valueDeclaration;
          if (declaration === undefined || !ts.isVariableDeclaration(declaration) || (declaration.parent.flags & ts.NodeFlags.Const) === 0) return false;
          const minimum = declaration.initializer;
          return (
            minimum !== undefined && ts.isConditionalExpression(minimum) && ts.isBinaryExpression(minimum.condition) &&
            minimum.condition.operatorToken.kind === ts.SyntaxKind.GreaterThanToken && minimum.condition.left.getText() === length &&
            // `X.length > N ? N : X.length` is at most X.length; so is `… ? N + 1 : …` for integer lengths.
            [minimum.condition.right.getText(), `${minimum.condition.right.getText()} + 1`].includes(minimum.whenTrue.getText()) && minimum.whenFalse.getText() === length
          );
        };
        assert.ok(
          conjuncts.some((conjunct) => ts.isBinaryExpression(conjunct) && conjunct.operatorToken.kind === ts.SyntaxKind.LessThanToken && conjunct.left.getText() === index.text && isBound(conjunct.right)),
          `${site.file}:${site.line}: the loop is bounded by ${index.text} < ${length}`,
        );
        assert.equal(loop.incrementor?.getText(), `${index.text} += 1`, `${site.file}:${site.line}: the loop steps by one`);
        const listRoot = list.split(".")[0]!;
        const changes: string[] = [];
        const visit = (node: ts.Node): void => {
          if (ts.isBinaryExpression(node) && node.operatorToken.kind >= ts.SyntaxKind.FirstAssignment && node.operatorToken.kind <= ts.SyntaxKind.LastAssignment) {
            const target = node.left.getText();
            if (target === index.text || target === list || target === listRoot || target === `${list}.length`) changes.push(node.getText());
          }
          if (ts.isCallExpression(node)) {
            for (const argument of mutatedArguments(analysis, node)) if (argument.getText() === list) changes.push(node.getText());
          }
          ts.forEachChild(node, visit);
        };
        visit(loop.statement);
        assert.deepEqual(changes, [], `${site.file}:${site.line}: the loop body leaves ${index.text} and ${list} unchanged`);
      }
    }
  });

  test("every hostMember call names an optional member of its holder's declared type", () => {
    const { checker } = zone;
    const calls: string[] = [];
    for (const source of zone.program.getSourceFiles()) {
      if (!zone.files.includes(source.fileName)) continue;
      const visit = (node: ts.Node): void => {
        if (ts.isCallExpression(node) && node.expression.getText() === "hostMember" && node.arguments.length === 2) {
          const [holder, name] = node.arguments as unknown as [ts.Expression, ts.Expression];
          assert.ok(ts.isStringLiteral(name), `${ownerName(node)}: hostMember takes a literal key`);
          const member = checker.getPropertyOfType(checker.getNonNullableType(checker.getTypeAtLocation(holder)), name.text);
          assert.ok(member !== undefined && (member.flags & ts.SymbolFlags.Optional) !== 0, `${ownerName(node)}: ${name.text} is an optional member of ${holder.getText()}`);
          calls.push(`${ownerName(node)} ${name.text}`);
        }
        ts.forEachChild(node, visit);
      };
      visit(source);
    }
    assert.deepEqual(calls.sort(), ["constructor emissionsPerOutcome", "constructor mailboxCapacity", "mayControlScope controlScopes", "requestTakeover isSafeToReplace"]);
  });
});

describe("correction DEC-8 at runtime: the unsupported-surface error owns its name (SELF-R7-UNSUPPORTED-01)", () => {
  test("an accessor installed on Error.prototype.name receives nothing, and the error still names itself", async () => {
    const { ExecutionCoordinator, UnsupportedKernelSurfaceError } = await import("../src/index.ts");
    const original = Object.getOwnPropertyDescriptor(Error.prototype, "name");
    assert.ok(original !== undefined);
    const received: unknown[] = [];
    Object.defineProperty(Error.prototype, "name", {
      configurable: true,
      get: () => "Error",
      set: (value: unknown) => void received.push(value),
    });
    let thrown: unknown;
    try {
      const coordinator = new ExecutionCoordinator({ driver: { driverId: "probe", deliver: () => undefined } });
      assert.throws(() => coordinator.cancelExecution(), (error: unknown) => {
        thrown = error;
        return true;
      });
    } finally {
      Object.defineProperty(Error.prototype, "name", original);
    }
    assert.deepEqual(received, [], "the Kernel's write reached no ambient accessor");
    assert.ok(thrown instanceof UnsupportedKernelSurfaceError);
    assert.deepEqual(Object.getOwnPropertyDescriptor(thrown, "name")?.value, "UnsupportedKernelSurfaceError");
  });
});

// -- Negative controls ----------------------------------------------------------------

/**
 * Each probe is a small source analysed as if it were in the zone. `expect` lists the kinds (and a
 * spelling fragment) the rules must report; a probe passes only if every expected report is found.
 */
const PROBE_PRELUDE = [
  "interface E { readonly writerEpoch: number; resultingEpoch?: number; method?(): number }",
  "interface R { resultingEpoch: number }",
  "interface Outer { readonly inner: E }",
  "interface Host { readonly namespace: string }",
  "interface Request { readonly activationId: string; readonly nested: { readonly key: string } }",
  "const list: readonly E[] = [];",
  "",
].join("\n");

const PROBES: readonly { readonly name: string; readonly source: string; readonly expect: readonly [Site["kind"], string][] }[] = [
  {
    // Review 10's reproducer, verbatim: all six reads of an optional member.
    name: "review 10: dot, string element, bare, quoted, computed and assignment destructuring",
    source: [
      "interface E6 { resultingEpoch?: number }",
      "export function f(e:E6){",
      "const plain=e.resultingEpoch;",
      'const bracket=e["resultingEpoch"];',
      "const { resultingEpoch: binding }=e;",
      'const { "resultingEpoch": quoted }=e;',
      'const { ["resultingEpoch"]: computed }=e;',
      "let assigned: number | undefined;",
      "({resultingEpoch: assigned}=e);",
      "return [plain,bracket,binding,quoted,computed,assigned];",
      "}",
    ].join("\n"),
    expect: [
      ["optional", "e.resultingEpoch"],
      ["optional", 'e["resultingEpoch"]'],
      ["syntax", "resultingEpoch: binding"],
      ["syntax", '"resultingEpoch": quoted'],
      ["syntax", '["resultingEpoch"]: computed'],
      ["syntax", "{resultingEpoch: assigned}=e"],
    ],
  },
  { name: "nested destructuring", source: "export const f = (o: Outer): unknown => { const { inner: { resultingEpoch } } = o; return resultingEpoch; };", expect: [["syntax", "ObjectBindingPattern"]] },
  { name: "rest destructuring", source: "export const f = (e: E): unknown => { const { ...rest } = e; return rest; };", expect: [["syntax", "ObjectBindingPattern"]] },
  { name: "destructuring with a default", source: "export const f = (e: E): unknown => { const { resultingEpoch = 0 } = e; return resultingEpoch; };", expect: [["syntax", "ObjectBindingPattern"]] },
  { name: "parameter destructuring", source: "export const f = ({ resultingEpoch }: E): unknown => resultingEpoch;", expect: [["syntax", "ObjectBindingPattern"]] },
  { name: "catch-clause destructuring", source: "export function f(): unknown { try { return 1; } catch ({ message }: any) { return message; } }", expect: [["syntax", "ObjectBindingPattern"]] },
  { name: "array destructuring", source: "export const f = (): unknown => { const [first] = list; return first; };", expect: [["syntax", "ArrayBindingPattern"]] },
  { name: "array assignment pattern", source: "export const f = (): unknown => { let first: E | undefined; [first] = list; return first; };", expect: [["syntax", "assignment target ArrayLiteralExpression"]] },
  { name: "for…of (iteration protocol)", source: "export const f = (): number => { let n = 0; for (const e of list) n += e.writerEpoch; return n; };", expect: [["syntax", "ForOfStatement"]] },
  { name: "for…of with destructuring", source: "export const f = (): number => { let n = 0; for (const { writerEpoch } of list) n += writerEpoch; return n; };", expect: [["syntax", "ForOfStatement"], ["syntax", "ObjectBindingPattern"]] },
  { name: "for…in (inherited enumerable keys)", source: "export const f = (e: E): number => { let n = 0; for (const k in e) n += k.length; return n; };", expect: [["syntax", "ForInStatement"]] },
  { name: "array spread", source: "export const f = (): unknown => [...list];", expect: [["syntax", "SpreadElement"]] },
  { name: "call spread", source: "const g = (...items: E[]): number => items.length; export const f = (): number => g(...list);", expect: [["syntax", "SpreadElement"]] },
  { name: "the in operator", source: 'export const f = (e: E): boolean => "resultingEpoch" in e;', expect: [["syntax", "operator InKeyword"]] },
  { name: "instanceof", source: "class A {} export const f = (e: unknown): boolean => e instanceof A;", expect: [["syntax", "operator InstanceOfKeyword"]] },
  { name: "coercing equality", source: "export const f = (e: E | null): boolean => e == null;", expect: [["syntax", "operator EqualsEqualsToken"]] },
  { name: "increment of a member", source: "export const f = (e: E): void => { e.resultingEpoch!++; };", expect: [["syntax", "PostfixUnaryExpression"], ["optional", "e.resultingEpoch"]] },
  { name: "logical assignment to a member", source: "export const f = (e: E): void => { e.resultingEpoch ??= 1; };", expect: [["syntax", "operator QuestionQuestionEqualsToken"], ["optional", "e.resultingEpoch"]] },
  { name: "await (then assimilation)", source: "export async function f(p: Promise<number>): Promise<number> { return await p; }", expect: [["syntax", "AsyncKeyword"], ["syntax", "AwaitExpression"]] },
  { name: "generator", source: "export function* f(): Generator<number> { yield 1; }", expect: [["syntax", "generator"], ["syntax", "YieldExpression"]] },
  { name: "super member access", source: "class A { m(): number { return 1; } } export class B extends A { override m(): number { return super.m(); } }", expect: [["syntax", "super member access"]] },
  { name: "the arguments object", source: "export function f(): number { return arguments.length; }", expect: [["syntax", "arguments object"]] },
  { name: "switch, labels and other unlisted statements", source: "export function f(n: number): number { outer: while (true) { switch (n) { case 1: break outer; default: return n; } } return 0; }", expect: [["syntax", "SwitchStatement"], ["syntax", "LabeledStatement"]] },
  { name: "optional member write and delete", source: "export const f = (e: E): void => { e.resultingEpoch = 1; delete e.resultingEpoch; };", expect: [["optional", "e.resultingEpoch"]] },
  { name: "optional method call", source: "export const f = (e: E): unknown => e.method?.();", expect: [["optional", "e.method"]] },
  { name: "optional member of a union", source: "interface A2 { readonly m: number } interface B2 { readonly m?: number } export const f = (x: A2 | B2): unknown => x.m;", expect: [["optional", "x.m"]] },
  { name: "cast that makes an optional member required", source: "export const f = (e: E): number => (e as R).resultingEpoch + (e as Required<E>).resultingEpoch;", expect: [["assertion", "e as R"], ["assertion", "e as Required<E>"]] },
  { name: "cast that introduces members from unknown", source: "export const f = (u: unknown): number => (u as R).resultingEpoch;", expect: [["assertion", "u as R"]] },
  { name: "type predicate that introduces members", source: "export function isR(value: unknown): value is R { return typeof value === \"object\" && value !== null; }", expect: [["predicate", "value is R"]] },
  { name: "index signature and any", source: "export const f = (e: E): unknown => [(e as unknown as Record<string, number>).resultingEpoch, (e as any).resultingEpoch];", expect: [["unresolved", ".resultingEpoch"]] },
  { name: "computed key on an object, read and write", source: "export const f = (r: Record<string, number>, k: string): void => { r[k] = r[k]! + 1; };", expect: [["dynamic", "r[k]"]] },
  { name: "built-in prototype members after load", source: "export const f = (s: string, xs: readonly number[], g: () => void): unknown => [s.toUpperCase(), xs.at(0), g.call(null)];", expect: [["builtin", "s.toUpperCase"], ["builtin", "xs.at"], ["builtin", "g.call"]] },
  { name: "lib globals read after load", source: "export const f = (x: unknown): unknown => [String(x), JSON.stringify(x), Object.keys({})];", expect: [["global", "String"], ["global", "JSON"], ["global", "Object"]] },
  { name: "implicit conversion of an object", source: "export const f = (e: E): string => `${e}` + (e as unknown as string);", expect: [["coercion", "e"]] },
  { name: "object spread", source: "export const f = (e: E): unknown => ({ ...e });", expect: [["spread", "...e"]] },
  {
    name: "caller envelopes: a member read, an alias, a spread, a return and a hand-off to code that reads it",
    source: [
      "const readsIt = (value: { readonly activationId: string }): string => value.activationId;",
      "export class ProbeCoordinator {",
      "  read(caller: Host, request: Request): unknown { return request.activationId; }",
      "  alias(caller: Host, request: Request): unknown { const r = request; return r; }",
      "  spread(caller: Host, request: Request): unknown { return { ...request }; }",
      "  handOff(caller: Host, request: Request): unknown { return readsIt(request); }",
      "  primitive(caller: Host, id: string): string { return `${id}`; }",
      "}",
    ].join("\n"),
    expect: [["envelope", "request.activationId"], ["envelope", "r = request"], ["envelope", "...request"], ["envelope", "value.activationId"], ["envelope", "id}"]],
  },
];

const CLEAN_PROBE = [
  "interface Clean { readonly a: number; readonly items: readonly number[] }",
  "export const f = (c: Clean, s: string): number => {",
  "  let total = 0;",
  "  for (let index = 0; index < c.items.length; index += 1) total += c.a;",
  "  const text = `${s}:${total}`;",
  "  return text.length > 0 && c.a === 1 ? total : -total;",
  "};",
  "export class ProbeCoordinator {",
  "  handOff(caller: Host, request: Request): boolean { return request === null || typeof request !== \"object\"; }",
  "}",
].join("\n");

describe("correction DEC-8 negative controls: every equivalent form is reported", () => {
  const files = new Map<string, string>();
  PROBES.forEach((probe, index) => files.set(resolve(SOURCE_ROOT, `__probe_${index}.ts`), `${PROBE_PRELUDE}${probe.source}\n`));
  const clean = resolve(SOURCE_ROOT, "__probe_clean.ts");
  files.set(clean, `${PROBE_PRELUDE}${CLEAN_PROBE}\n`);
  const probeZone = buildZone([...files.keys()], files, zone);

  test("the probes are valid TypeScript under the same configuration", () => {
    const errors = typeErrors(probeZone).filter((error) => !/generator|Generator/.test(error));
    assert.deepEqual(errors, []);
  });

  PROBES.forEach((probe, index) => {
    test(probe.name, () => {
      const path = resolve(SOURCE_ROOT, `__probe_${index}.ts`);
      const found = analyseAccesses({ ...probeZone, files: [path] }, { publicClass: "ProbeCoordinator", hostCallerType: "Host" });
      for (const [kind, fragment] of probe.expect) {
        assert.ok(
          found.some((site) => site.kind === kind && site.text.includes(fragment)),
          `expected ${kind} "${fragment}"; reported: ${found.map((site) => `${site.kind}/${site.mode} ${site.text}`).join(" | ")}`,
        );
      }
    });
  });

  test("review 10's six reads are each reported on their own line", () => {
    const found = analyseAccesses({ ...probeZone, files: [resolve(SOURCE_ROOT, "__probe_0.ts")] });
    const prelude = PROBE_PRELUDE.split("\n").length - 1;
    const lines = new Set(found.map((site) => site.line - prelude));
    for (const line of [3, 4, 5, 6, 7, 9]) assert.ok(lines.has(line), `line ${line} of review 10's reproducer is reported`);
  });

  test("the clean control of permitted forms reports nothing", () => {
    const found = analyseAccesses({ ...probeZone, files: [clean] }, { publicClass: "ProbeCoordinator", hostCallerType: "Host" });
    assert.deepEqual(found.map((site) => `${site.line} ${site.kind}/${site.mode} ${site.text}`), []);
  });
});
