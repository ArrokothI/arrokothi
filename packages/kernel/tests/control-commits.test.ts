/**
 * Correction DEC-9, enforced over the source: recovery-control commits are prebuilt and then applied
 * without construction (contract revision 8; K12C1-R9-HISTORY-01, K12C1-R10-COMMIT-01).
 *
 * Round 6 located "the first mutation" by four callee names and property assignment, so review 10's
 * `this.#mint(...)` and `record.nextAcceptancePosition++` were not mutations to it and both passed
 * every Kernel test. The rule now rests on an effect analysis of the whole zone
 * (`zone-analysis.ts`): every call resolves to zone code, a classified primordial or an inventoried
 * foreign call, and a fixpoint says which pre-existing objects each function's own code may change,
 * through any write operator, `delete`, a mutating primordial or any helper that mutates an argument.
 *
 * For `recoverExecution`, `reportProtocolFailure` and `requestTakeover`:
 * - the body ends in an **apply suffix**: appends of prebuilt locals (or `applyControlCommit`), then
 *   plain writes of prebuilt locals, then the post-commit delivery, then `return` of a prebuilt local;
 * - before the suffix, nothing that can reach accepted state is mutated, except refusal exits
 *   (`return err(this.#refusal(…))`, and the two refusal helpers in their call-then-exit form, whose
 *   own bodies mutate only inside such exits);
 * - every call that can run code outside the zone precedes the first value the suffix commits.
 * `applyControlCommit` is bindings of commit fields, then appends, then plain writes, and nothing
 * else. Hold fields, recovery history, receipts and the acceptance index have fixed writers.
 *
 * The negative controls apply each forbidden shape to an in-memory copy of `coordinator.ts` and
 * analyse it with the same code; each must be reported, and the unmodified source must not be.
 */

import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { basename, resolve } from "node:path";
import ts from "typescript";
import {
  analyseEffects,
  buildZone,
  checkApplyHelper,
  checkControl,
  findConstFunction,
  findMethod,
  foreignCallKey,
  mutatedArguments,
  ownerName,
  ownNodes,
  SOURCE_ROOT,
  summaries,
  typeErrors,
  writeOwners,
  zoneFiles,
  type EffectAnalysis,
  type Zone,
} from "./zone-analysis.ts";
import { EFFECT_OVERRIDES, FOREIGN_CALLS, WRITE_SITES, getterReads } from "./zone-inventory.ts";

const CONTROLS = ["recoverExecution", "reportProtocolFailure", "requestTakeover"] as const;

const analyse = (zone: Zone): EffectAnalysis => analyseEffects(zone, { foreignCalls: new Set(FOREIGN_CALLS.keys()), overrides: EFFECT_OVERRIDES, getterReads: getterReads() });

/** Every DEC-9 finding for one program: control shapes, the commit helper, writers and unclassified calls. */
function violations(zone: Zone, analysis: EffectAnalysis): string[] {
  const out: string[] = [...analysis.unclassified.map((call) => `unclassified call ${call}`)];
  for (const name of CONTROLS) {
    const method = findMethod(zone, "ExecutionCoordinator", name);
    if (method === undefined) out.push(`${name} missing`);
    else out.push(...checkControl(zone, analysis, method).violations);
  }
  const helper = findConstFunction(zone, "applyControlCommit");
  if (helper === undefined) out.push("applyControlCommit missing");
  else out.push(...checkApplyHelper(zone, analysis, helper));
  const owners = writeOwners(zone, analysis, new Map([...WRITE_SITES].map(([field, site]) => [field, site.element])));
  for (const [field, site] of WRITE_SITES) {
    const found = [...(owners.get(field) ?? [])].sort();
    if (JSON.stringify(found) !== JSON.stringify([...site.owners].sort())) out.push(`${field} written by ${found.join(", ")}; expected ${site.owners.join(", ")}`);
  }
  return out;
}

const zone = buildZone();
const analysis = analyse(zone);

describe("correction DEC-9: recovery-control commits are prebuilt and applied without construction", () => {
  test("every call resolves to zone code, a classified primordial or an inventoried foreign call", () => {
    assert.deepEqual(analysis.unclassified, []);
    const keys = new Set<string>();
    for (const fn of analysis.effects.keys()) {
      ownNodes(fn, (node) => {
        if ((ts.isCallExpression(node) || ts.isNewExpression(node)) && node.expression.kind !== ts.SyntaxKind.SuperKeyword && analysis.resolve(node).kind === "unknown") keys.add(foreignCallKey(node));
      });
    }
    assert.deepEqual([...keys].sort(), [...FOREIGN_CALLS.keys()].sort(), "each inventoried foreign call exists, and no other");
  });

  for (const name of CONTROLS) {
    test(`${name}: an apply suffix of prebuilt values, and no accepted-state mutation or foreign call before it`, () => {
      const method = findMethod(zone, "ExecutionCoordinator", name);
      assert.ok(method !== undefined);
      assert.deepEqual(checkControl(zone, analysis, method, ).violations, []);
    });
  }

  test("the recognised apply suffixes are the ones the contract describes", () => {
    const suffix = (name: string): readonly string[] => checkControl(zone, analysis, findMethod(zone, "ExecutionCoordinator", name)!).suffix;
    assert.deepEqual(suffix("recoverExecution"), ["applyControlCommit(record, exchange, commit);", "return answer;"]);
    assert.deepEqual(suffix("reportProtocolFailure"), ["applyControlCommit(record, exchange, commit);", "return answer;"]);
    assert.deepEqual(suffix("requestTakeover"), [
      "appendOwn(record.receipts, receipt);",
      "if (cleared !== null) appendOwn(record.recoveryHistory, cleared);",
      "record.nextAcceptancePosition = position + 1;",
      "exchange.submission = submission;",
      "exchange.activation = activation;",
      "exchange.receipt = receipt;",
      "exchange.protocolFailureHold = null;",
      "this.#deliver(exchange);",
      "return answer;",
    ]);
  });

  test("applyControlCommit appends its prebuilt record before its hold writes and does nothing else", () => {
    const helper = findConstFunction(zone, "applyControlCommit");
    assert.ok(helper !== undefined);
    assert.deepEqual(checkApplyHelper(zone, analysis, helper), []);
  });

  test("hold fields, recovery history, receipts and the acceptance index have fixed writers", () => {
    const owners = writeOwners(zone, analysis, new Map([...WRITE_SITES].map(([field, site]) => [field, site.element])));
    for (const [field, site] of WRITE_SITES) assert.deepEqual([...(owners.get(field) ?? [])].sort(), [...site.owners].sort(), field);
  });

  test("the effect summaries do not depend on the order functions are analysed in", () => {
    // A cycle-cut binding result was once cached as if complete, which made a mutation's target look
    // fresh depending on traversal order; this pins the fix for the whole zone.
    const reversed = analyseEffects(zone, { foreignCalls: new Set(FOREIGN_CALLS.keys()), overrides: EFFECT_OVERRIDES, getterReads: getterReads(), reverse: true });
    assert.deepEqual(Object.fromEntries([...summaries(reversed)].sort()), Object.fromEntries([...summaries(analysis)].sort()));
  });

  test("the refusal helpers change nothing on the path that continues past their exit test", () => {
    // Covered inside checkControl; asserted here directly so a helper change names itself.
    for (const name of ["#requireControl", "#openExchange"]) {
      const method = findMethod(zone, "ExecutionCoordinator", name);
      assert.ok(method !== undefined, name);
      const summary = analysis.effects.get(method);
      assert.ok(summary !== undefined && !summary.mutated.self && !summary.mutated.other, `${name} mutates only through its record parameter, in its refusal exits`);
    }
  });

  test("values.ts: only pushIssue itself mutates an issue list, so every suffix entry owns `occurrences`", () => {
    // The precondition of the inventoried `entry as { occurrences: number }` assertion.
    const leaf = new Set(["appendOwn", "appendAllOwn", "defineAt", "defineData", "truncateOwn"]);
    const mutators = new Set<string>();
    for (const fn of analysis.effects.keys()) {
      if (basename(fn.getSourceFile().fileName) !== "values.ts") continue;
      ownNodes(fn, (node) => {
        const listTyped = (expression: ts.Expression): boolean => /(?:^|\b)ValueIssue\[\]$/.test(zone.checker.typeToString(zone.checker.getTypeAtLocation(expression)));
        if (ts.isCallExpression(node) && (leaf.has(node.expression.getText()) || analysis.resolve(node).kind === "primordial")) {
          for (const argument of mutatedArguments(analysis, node)) if (listTyped(argument)) mutators.add(ownerName(node));
        }
        if (ts.isBinaryExpression(node) && node.operatorToken.kind === ts.SyntaxKind.EqualsToken && (ts.isElementAccessExpression(node.left) || ts.isPropertyAccessExpression(node.left)) && listTyped(node.left.expression)) {
          mutators.add(ownerName(node));
        }
      });
    }
    assert.deepEqual([...mutators].sort(), ["pushIssue"]);
  });
});

// -- Negative controls ----------------------------------------------------------------

const COORDINATOR = resolve(SOURCE_ROOT, "coordinator.ts");
const SOURCE = readFileSync(COORDINATOR, "utf8");
const TAKEOVER_POSITION = 'const position = record.nextAcceptancePosition;\n    const receipt = mintReceipt("dispatch_intent", position, record.executionId);';
const TAKEOVER_SUBMISSION = "const submission = mintSubmission(record.executionId, named.activationId, writerEpoch);";
const TAKEOVER_APPEND = "    appendOwn(record.receipts, receipt);\n    if (cleared !== null)";
const TAKEOVER_ANSWER = `    const answer = ok({
      activationId: named.activationId,
      supersededEpoch: currentEpoch,
      writerEpoch,
      baseProgressRevision: activation.baseProgressRevision,
      batch: exchange.batch,
      receipt,
    });
`;

/**
 * Each mutant: its name, the replacements (each `find` must occur exactly once), and a fragment the
 * reported violations must contain, so each is caught for the reason it exists.
 */
const MUTANTS: readonly { readonly name: string; readonly edits: readonly (readonly [string, string])[]; readonly reason: string }[] = [
  // Review 10's two regressions, exactly as the review applied them.
  { name: "review 10: takeover receipt minted through this.#mint", edits: [['const receipt = mintReceipt("dispatch_intent", position, record.executionId);', 'const receipt = this.#mint("dispatch_intent", record);']], reason: "requestTakeover: mutates before its apply step: this.#mint" },
  { name: "review 10: takeover index advanced by a postfix increment", edits: [[TAKEOVER_POSITION, TAKEOVER_POSITION.replace("record.nextAcceptancePosition;", "record.nextAcceptancePosition++;")]], reason: "requestTakeover: mutates before its apply step: record.nextAcceptancePosition++" },
  // Every other write form, in an initializer or a statement.
  { name: "compound assignment in an initializer", edits: [[TAKEOVER_POSITION, TAKEOVER_POSITION.replace("record.nextAcceptancePosition;", "(record.nextAcceptancePosition += 1) - 1;")]], reason: "mutates before its apply step: record.nextAcceptancePosition += 1" },
  { name: "plain write moved before the builds", edits: [[TAKEOVER_POSITION, `${TAKEOVER_POSITION}\n    record.nextAcceptancePosition = position + 1;`]], reason: "mutates before its apply step: record.nextAcceptancePosition = position + 1" },
  { name: "element write with a literal key", edits: [[TAKEOVER_POSITION, `${TAKEOVER_POSITION}\n    record["nextAcceptancePosition"] = position + 1;`]], reason: 'mutates before its apply step: record["nextAcceptancePosition"]' },
  { name: "logical assignment", edits: [[TAKEOVER_POSITION, `${TAKEOVER_POSITION}\n    exchange.receipt ??= receipt;`]], reason: "mutates before its apply step: exchange.receipt ??= receipt" },
  { name: "delete of a Kernel field", edits: [[TAKEOVER_POSITION, `${TAKEOVER_POSITION}\n    delete (exchange as { receipt?: unknown }).receipt;`]], reason: "mutates before its apply step: delete" },
  // Mutation through helpers, aliases, containers, closures and callbacks.
  { name: "an early append through a const alias", edits: [[TAKEOVER_POSITION, `${TAKEOVER_POSITION}\n    const receiptsAlias = record.receipts;\n    appendOwn(receiptsAlias, receipt);`], [TAKEOVER_APPEND, "    if (cleared !== null)"]], reason: "mutates before its apply step: appendOwn(receiptsAlias, receipt)" },
  { name: "an early append through a fresh container holding a Kernel list", edits: [[TAKEOVER_POSITION, `${TAKEOVER_POSITION}\n    const plan = { list: record.receipts };\n    appendOwn(plan.list, receipt);`], [TAKEOVER_APPEND, "    if (cleared !== null)"]], reason: "mutates before its apply step: appendOwn(plan.list, receipt)" },
  { name: "an early write through a let alias", edits: [[TAKEOVER_SUBMISSION, `${TAKEOVER_SUBMISSION}\n    let target = exchange;\n    target.submission = submission;`]], reason: "mutates before its apply step: target.submission = submission" },
  { name: "an early write through a binding set by logical assignment", edits: [[TAKEOVER_SUBMISSION, `${TAKEOVER_SUBMISSION}\n    let target: ActivationRecord | undefined;\n    target ??= exchange;\n    target.submission = submission;`]], reason: "mutates before its apply step: target.submission = submission" },
  { name: "an early truncation through an object whose constructor keeps a Kernel list", edits: [["const mapSet = <K, V>(map: Map<K, V>, key: K, value: V): void => {", "class ListHolder {\n  readonly list: Receipt[];\n  constructor(list: Receipt[]) {\n    this.list = list;\n  }\n}\n\nconst mapSet = <K, V>(map: Map<K, V>, key: K, value: V): void => {"], [TAKEOVER_POSITION, `${TAKEOVER_POSITION}\n    const holder = new ListHolder(record.receipts);\n    holder.list.length = 0;`]], reason: "mutates before its apply step: holder.list.length = 0" },
  { name: "an early write inside a local closure", edits: [[TAKEOVER_SUBMISSION, `${TAKEOVER_SUBMISSION}\n    const retire = (): void => {\n      exchange.submission = submission;\n    };\n    retire();`]], reason: "mutates before its apply step: retire()" },
  { name: "an early append inside a callback handed to a helper", edits: [[TAKEOVER_POSITION, `${TAKEOVER_POSITION}\n    mapOwn([receipt], (item) => {\n      appendOwn(record.receipts, item);\n      return item;\n    });`], [TAKEOVER_APPEND, "    if (cleared !== null)"]], reason: "mutates before its apply step: mapOwn" },
  { name: "an early Map mutation", edits: [[TAKEOVER_POSITION, `${TAKEOVER_POSITION}\n    mapSet(record.byInputId, "probe", readAt(record.mailbox, 0) as MailboxEntry);`]], reason: "mutates before its apply step: mapSet" },
  { name: "an early freeze of a Kernel list", edits: [[TAKEOVER_POSITION, `${TAKEOVER_POSITION}\n    PrimordialObjectFreeze(exchange.deliveries);`]], reason: "mutates before its apply step: PrimordialObjectFreeze(exchange.deliveries)" },
  { name: "a builder that also changes module state", edits: [["const mintSubmission = (executionId: string, activationId: string, writerEpoch: number): SubmissionGrant =>\n  PrimordialObjectFreeze({ executionId, activationId, writerEpoch });", "let grantsMinted = 0;\nconst mintSubmission = (executionId: string, activationId: string, writerEpoch: number): SubmissionGrant => {\n  grantsMinted += 1;\n  return PrimordialObjectFreeze({ executionId, activationId, writerEpoch });\n};"]], reason: "mutates before its apply step: mintSubmission" },
  { name: "a refusal recorded without exiting", edits: [[TAKEOVER_POSITION, `this.#refusal("stale_exchange", "probe", record);\n    ${TAKEOVER_POSITION}`]], reason: 'mutates before its apply step: this.#refusal("stale_exchange", "probe", record)' },
  { name: "a refusal helper whose result is not tested", edits: [["    const control = this.#requireControl(caller, record);\n    if (control !== null) return err(control);\n\n    const issues: LocatedIssue[] = [];\n    const named = captureAttempt(request, issues);", "    this.#requireControl(caller, record);\n\n    const issues: LocatedIssue[] = [];\n    const named = captureAttempt(request, issues);"]], reason: "requestTakeover: mutates before its apply step: this.#requireControl" },
  { name: "a refusal helper that mutates on its continuing path", edits: [["    if (mayControlScope(caller, record.scope)) return null;", "    if (mayControlScope(caller, record.scope)) {\n      record.nextRefusalPosition += 0;\n      return null;\n    }"]], reason: "#requireControl mutates outside a refusal exit" },
  { name: "a Kernel list widened to unknown, cast to string and appended to through a helper", edits: [[TAKEOVER_POSITION, `${TAKEOVER_POSITION}\n    const widened: unknown = record.receipts;\n    const disguised = widened as string;\n    const launder = (text: string): void => {\n      appendOwn(text as unknown as Receipt[], receipt);\n    };\n    launder(disguised);`], [TAKEOVER_APPEND, "    if (cleared !== null)"]], reason: "mutates before its apply step: launder(disguised)" },
  { name: "a Kernel object handed to foreign code", edits: [["PrimordialReflectApply(establish, this.#driver, [exchange.activation])", "PrimordialReflectApply(establish, this.#driver, [exchange.activation, record])"]], reason: "unclassified call requestTakeover PrimordialReflectApply(establish, this.#driver, [exchange.activation, record])" },
  { name: "an unclassified call before the commit", edits: [[TAKEOVER_POSITION, `(exchange.activation as unknown as () => void)();\n    ${TAKEOVER_POSITION}`]], reason: "unclassified call requestTakeover" },
  // Ordering of construction, foreign code and the apply steps.
  { name: "the answer built inside the apply step", edits: [[TAKEOVER_ANSWER, ""], [TAKEOVER_APPEND, `    appendOwn(record.receipts, receipt);\n${TAKEOVER_ANSWER}    if (cleared !== null)`]], reason: "requestTakeover: mutates before its apply step: appendOwn(record.receipts, receipt)" },
  { name: "foreign code run after the decision is being built", edits: [[TAKEOVER_ANSWER, `${TAKEOVER_ANSWER}    hostMember(caller, "controlScopes");\n`]], reason: "runs code outside the zone after its decision is being built" },
  { name: "the Driver handed the attempt before it is recorded", edits: [["    this.#deliver(exchange);\n\n    return answer;", "    return answer;"], [TAKEOVER_APPEND, "    this.#deliver(exchange);\n    appendOwn(record.receipts, receipt);\n    if (cleared !== null)"]], reason: "mutates before its apply step: this.#deliver(exchange)" },
  { name: "round 6 H3: holds written before their history append", edits: [["  const stored = commit.history;\n  appendOwn(record.recoveryHistory, stored);\n  exchange.codeHold = commit.codeHold;\n  exchange.protocolFailureHold = commit.protocolFailureHold;", "  exchange.codeHold = commit.codeHold;\n  exchange.protocolFailureHold = commit.protocolFailureHold;\n  const stored = commit.history;\n  appendOwn(record.recoveryHistory, stored);"]], reason: "applyControlCommit: statement outside bindings → appends → writes" },
  { name: "round 6 H7: recovery answer projected after the commit", edits: [["    const answer = ok({ activationId: pinned.activationId, writerEpoch: pinned.writerEpoch, recoveryHolds: holdsOf(commit), changed: true });\n    applyControlCommit(record, exchange, commit);\n    return answer;", "    applyControlCommit(record, exchange, commit);\n    return ok({ activationId: pinned.activationId, writerEpoch: pinned.writerEpoch, recoveryHolds: holdsOf(exchange), changed: true });"]], reason: "recoverExecution: does not end by returning a prebuilt local" },
  { name: "a protocol hold written before its record is built", edits: [["    const reason = `the response of the attempt", "    exchange.protocolFailureHold = null;\n    const reason = `the response of the attempt"]], reason: "reportProtocolFailure: mutates before its apply step: exchange.protocolFailureHold = null" },
  // Writers of the retained fields.
  { name: "a hold written outside the commit paths", edits: [["    appendOwn(intent.deliveries, attempt);", "    intent.codeHold = null;\n    appendOwn(intent.deliveries, attempt);"]], reason: "codeHold written by #deliver" },
  { name: "recovery history mutated through an alias outside the commit paths", edits: [["    return ok(intent);\n  }", "    const history = record.recoveryHistory;\n    appendAllOwn(history, []);\n    return ok(intent);\n  }"]], reason: "recoveryHistory written by #accept, #openExchange" },
];

describe("correction DEC-9 negative controls: every forbidden shape is reported", () => {
  test("the unmodified source is the clean control", () => {
    assert.deepEqual(violations(zone, analysis), []);
  });

  for (const mutant of MUTANTS) {
    test(mutant.name, () => {
      let text = SOURCE;
      for (const [find, replacement] of mutant.edits) {
        assert.equal(text.split(find).length, 2, `anchor occurs exactly once: ${find.slice(0, 60)}`);
        text = text.replace(find, () => replacement);
      }
      const mutated = buildZone(zoneFiles(), new Map([[COORDINATOR, text]]), zone);
      assert.deepEqual(typeErrors(mutated), [], "the mutant is valid TypeScript, so only the rule can reject it");
      const found = violations(mutated, analyse(mutated));
      assert.ok(found.some((violation) => violation.includes(mutant.reason)), `expected "${mutant.reason}"; reported: ${found.join(" | ") || "nothing"}`);
    });
  }
});
