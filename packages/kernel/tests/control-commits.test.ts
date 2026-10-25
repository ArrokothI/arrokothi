/**
 * Correction DEC-9, guarded over the source after COORD-REFACTOR-01: decisions are planned whole, then
 * handed to the state owner, which prepares without changing anything and then commits exactly its
 * declared statements (contract revision 9; K12C1-R9-HISTORY-01, K12C1-R10-COMMIT-01; design 01 revision 1).
 *
 * This is a static regression guard, not the rule's evidence: the fault-injection sweep checks the
 * rule at run time (`sweep/fault-child.ts`, `fault-sweep.test.ts`). The guard rests on the effect
 * analysis of the zone (`zone-analysis.ts`): calls resolve to zone code, a classified primordial or an
 * inventoried foreign call; a getter-backed read is a call of the getter; and a fixpoint says which
 * pre-existing objects each function's own code may change.
 *
 * Since the refactor every write of accepted state is in `state.ts`, and the coordinator holds only
 * read-only readers, so a write in a planner is a type error and, at run time, a `TypeError`
 * (`state-types.test.ts`). The guard therefore checks:
 *
 * - **Planners** (the coordinator methods that form plans): before the hand-over to the owner nothing
 *   that can reach accepted state changes — module bindings and getter-mediated changes included —
 *   except a refusal exit; the hand-over hands over and returns values built before it; every plan's
 *   basis is bound as the first read of accepted state after the planner's last callback, with no
 *   callback after it before the hand-over. Every refusal ends the request.
 * - **Owner arms** (`KernelState`'s `#apply<Kind>`): a prepare phase that changes nothing, then exactly
 *   the declared commit statements, in order, each naming the plan field it commits (`COMMITS`).
 * - **Writers**: each record field is written only by its declared arms (`ARM_WRITERS`), and nothing
 *   in the coordinator changes accepted state except by handing a plan over.
 * - **Foreign code**: the inventory of calls outside the zone is exact, and nothing in the owner, its
 *   records or the plan module can run code outside the zone.
 *
 * The negative controls apply each forbidden shape to an in-memory copy of `coordinator.ts` or
 * `state.ts` and analyse it with the same code; each must be reported for the reason it exists, and the
 * unmodified source must not be. The planner-side write forms of the old controls 1–16 are now type
 * errors, so they are applied to the owner's prepare phase, where the same forms still type-check.
 */

import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { basename, resolve } from "node:path";
import ts from "typescript";
import {
  analyseEffects,
  basisArgumentViolations,
  buildZone,
  checkArm,
  checkPlanner,
  findConstFunction,
  findMethod,
  foreignCallKey,
  isApplyCall,
  mutationsOutsideHandOver,
  ownNodes,
  refusalHelperViolations,
  refusalsWithoutExit,
  SOURCE_ROOT,
  stateWriters,
  summaries,
  typeErrors,
  zoneFiles,
  type EffectAnalysis,
  type PlannerShape,
  type Zone,
} from "./zone-analysis.ts";
import { EFFECT_OVERRIDES, FOREIGN_CALLS, getterReads } from "./zone-inventory.ts";

/** Every planner and how it ends. Every function in `coordinator.ts` that hands a plan over is here. */
const PLANNERS: readonly (readonly [string, PlannerShape])[] = [
  ["createExecution", "suffix"],
  ["submitInput", "suffix"],
  ["dispatch", "suffix"],
  ["redeliver", "suffix"],
  ["submitOutcome", "suffix"],
  ["requestTakeover", "suffix"],
  ["recoverExecution", "suffix"],
  ["reportProtocolFailure", "suffix"],
  ["fireTimer", "suffix"],
  ["cancelExecution", "suffix"],
  ["#accept", "suffix"],
  ["#refuseLosing", "suffix"],
  ["#refusal", "suffix"],
  ["#deliver", "delivery"],
  ["settle", "final"],
];

/** Each plan kind's owner arm. */
const ARMS: Readonly<Record<string, string>> = {
  creation: "#applyCreation",
  input: "#applyInput",
  dispatch: "#applyDispatch",
  delivery: "#applyDelivery",
  settlement: "#applySettlement",
  outcome: "#applyOutcome",
  takeover: "#applyTakeover",
  control: "#applyControl",
  refusal: "#applyRefusal",
  expiry: "#applyExpiry",
  timer_discard: "#applyTimerDiscard",
  cancellation: "#applyCancellation",
  losing_outcome: "#applyLosingOutcome",
};

const CREATED = "{authorityContext+basis+creationIdentity+creationRequestId+definitionRevision+executionDeadline+executionId+initial+progressCodec+receipt+runtimeContractRevision+scope}";

/** Each arm's commit statements, in order: `<form> <field> ← <plan field it comes from>` (D01-CHK-4). */
const COMMITS: Readonly<Record<string, readonly string[]>> = {
  "#applyCreation": [`insert #executions ← ${CREATED}`, `insert #byCreationRequestId ← ${CREATED}`],
  "#applyInput": [
    "write version ← basis",
    "write nextAcceptancePosition ← entry",
    "append mailbox ← {QUEUED+entry}",
    "insert byInputId ← {QUEUED+entry}",
    "append receipts ← entry",
    "append? retiredWaits ← woken",
    "write? wait ← null",
    "write? readiness ← readiness",
    'write? state ← "READY"',
  ],
  "#applyDispatch": [
    "write version ← basis",
    "write activationsMinted ← activationsMinted",
    "write nextAcceptancePosition ← receipt",
    "write activation ← {activation+batch+receipt+submission}",
    'write state ← "RUNNING"',
    "append receipts ← receipt",
    "write readiness ← null",
  ],
  "#applyDelivery": ["write version ← basis", "append deliveries ← {activationId+attempt+writerEpoch}"],
  "#applySettlement": ["write version ← basis", "write status ← status", "write failure ← failure"],
  "#applyOutcome": [
    "write version ← basis",
    "write nextAcceptancePosition ← receipt",
    "each disposition ← acknowledgment",
    "each disposition ← ending",
    "write acceptedProgress ← stored",
    "write progressRevision ← progressRevision",
    "append emissions ← emissions",
    "write? result ← result",
    "append exchanges ← {resolved+state}",
    "insert acceptedOutcomes ← stored",
    "append receipts ← receipt",
    "append recoveryHistory ← history",
    "append? mailbox ← {QUEUED+TIMEOUT_KIND+timeout}",
    "append? retiredWaits ← retired",
    "write registrations ← registrations",
    "write wait ← liveWait",
    "write readiness ← readiness",
    "write activation ← null",
    "write state ← nextState",
  ],
  "#applyTakeover": [
    "write version ← basis",
    "append receipts ← receipt",
    "append? recoveryHistory ← cleared",
    "write nextAcceptancePosition ← receipt",
    "write submission ← submission",
    "write activation ← activation",
    "write receipt ← receipt",
    "write protocolFailureHold ← null",
  ],
  "#applyControl": ["write version ← basis", "append recoveryHistory ← history", "write codeHold ← codeHold", "write protocolFailureHold ← protocolFailureHold"],
  "#applyRefusal": ["write version ← basis", "append refusals ← refusal", "write nextRefusalPosition ← refusal"],
  "#applyExpiry": [
    "write version ← basis",
    "write nextAcceptancePosition ← timeout",
    "append mailbox ← {QUEUED+TIMEOUT_KIND+timeout}",
    "append retiredWaits ← retired",
    "append timerFires ← fire",
    "write wait ← null",
    "write readiness ← readiness",
    'write state ← "READY"',
  ],
  "#applyTimerDiscard": ["write version ← basis", "append timerFires ← fire"],
  "#applyCancellation": [
    "write version ← basis",
    "write nextAcceptancePosition ← record",
    "each disposition ← ending",
    "append? retiredWaits ← retired",
    "append recoveryHistory ← history",
    "append? timerFires ← fire",
    "write cancellation ← {record+state}",
    "write wait ← null",
    "write readiness ← null",
    "write activation ← null",
    'write state ← "CANCELLED"',
  ],
  "#applyLosingOutcome": ["write version ← basis", "append refusals ← refusal", "write nextRefusalPosition ← refusal", "insert losingIndex ← losing"],
};

/**
 * The arms that may write each record field (DEC-9's fixed writers, per operation). A field absent here
 * is set once, when its record is built, and written by nothing.
 */
const ARM_WRITERS: Readonly<Record<string, readonly string[]>> = {
  "#executions": ["#applyCreation"],
  "#byCreationRequestId": ["#applyCreation"],
  mailbox: ["#applyExpiry", "#applyInput", "#applyOutcome"],
  byInputId: ["#applyInput"],
  refusals: ["#applyLosingOutcome", "#applyRefusal"],
  nextRefusalPosition: ["#applyLosingOutcome", "#applyRefusal"],
  receipts: ["#applyDispatch", "#applyInput", "#applyOutcome", "#applyTakeover"],
  nextAcceptancePosition: ["#applyCancellation", "#applyDispatch", "#applyExpiry", "#applyInput", "#applyOutcome", "#applyTakeover"],
  activationsMinted: ["#applyDispatch"],
  state: ["#applyCancellation", "#applyDispatch", "#applyExpiry", "#applyInput", "#applyOutcome"],
  activation: ["#applyCancellation", "#applyDispatch", "#applyOutcome", "#applyTakeover"],
  acceptedProgress: ["#applyOutcome"],
  progressRevision: ["#applyOutcome"],
  acceptedOutcomes: ["#applyOutcome"],
  exchanges: ["#applyOutcome"],
  emissions: ["#applyOutcome"],
  result: ["#applyOutcome"],
  disposition: ["#applyCancellation", "#applyOutcome"],
  recoveryHistory: ["#applyCancellation", "#applyControl", "#applyOutcome", "#applyTakeover"],
  codeHold: ["#applyControl"],
  protocolFailureHold: ["#applyControl", "#applyTakeover"],
  submission: ["#applyTakeover"],
  receipt: ["#applyTakeover"],
  deliveries: ["#applyDelivery"],
  status: ["#applySettlement"],
  failure: ["#applySettlement"],
  registrations: ["#applyOutcome"],
  wait: ["#applyCancellation", "#applyExpiry", "#applyInput", "#applyOutcome"],
  readiness: ["#applyCancellation", "#applyDispatch", "#applyExpiry", "#applyInput", "#applyOutcome"],
  retiredWaits: ["#applyCancellation", "#applyExpiry", "#applyInput", "#applyOutcome"],
  timerFires: ["#applyCancellation", "#applyExpiry", "#applyTimerDiscard"],
  cancellation: ["#applyCancellation"],
  losingIndex: ["#applyLosingOutcome"],
  version: [
    "#applyCancellation",
    "#applyControl",
    "#applyDelivery",
    "#applyDispatch",
    "#applyExpiry",
    "#applyInput",
    "#applyLosingOutcome",
    "#applyOutcome",
    "#applyRefusal",
    "#applySettlement",
    "#applyTakeover",
    "#applyTimerDiscard",
  ],
};

const OWNER_FILES = new Set(["state.ts", "state-records.ts", "plan.ts"]);

const analyse = (zone: Zone): EffectAnalysis => analyseEffects(zone, { foreignCalls: new Set(FOREIGN_CALLS.keys()), overrides: EFFECT_OVERRIDES, getterReads: getterReads() });

/** Every record field the owner keeps, from `state-records.ts`, with a list's element type, plus the owner's private collections. */
function recordFields(zone: Zone): Map<string, string | undefined> {
  const fields = new Map<string, string | undefined>();
  const source = zone.program.getSourceFiles().find((file) => basename(file.fileName) === "state-records.ts");
  assert.ok(source !== undefined, "state-records.ts is analysed");
  ts.forEachChild(source, (node) => {
    if (!ts.isInterfaceDeclaration(node)) return;
    for (const member of node.members) {
      if (!ts.isPropertySignature(member)) continue;
      const type = zone.checker.getTypeAtLocation(member);
      let element: string | undefined;
      if (zone.checker.isArrayLikeType(type)) {
        const argument = zone.checker.getTypeArguments(type as ts.TypeReference)[0];
        element = argument === undefined ? undefined : (argument.aliasSymbol ?? argument.getSymbol())?.getName();
      }
      fields.set(member.name.getText(), element);
    }
  });
  for (const field of ["#executions", "#byCreationRequestId"]) fields.set(field, undefined);
  return fields;
}

/** Every DEC-9 finding for one program. */
function violations(zone: Zone, analysis: EffectAnalysis): string[] {
  const out: string[] = [...analysis.unclassified.map((call) => `unclassified call ${call}`)];
  for (const [name, shape] of PLANNERS) {
    const planner = findMethod(zone, "ExecutionCoordinator", name) ?? findConstFunction(zone, name);
    if (planner === undefined) out.push(`${name} missing`);
    else out.push(...checkPlanner(zone, analysis, planner, shape).violations);
  }
  out.push(...refusalsWithoutExit(zone));
  const accept = findMethod(zone, "ExecutionCoordinator", "#accept");
  if (accept !== undefined) out.push(...basisArgumentViolations(zone, accept, 5));
  for (const arm of Object.values(ARMS)) {
    const method = findMethod(zone, "KernelState", arm);
    if (method === undefined) {
      out.push(`${arm} missing`);
      continue;
    }
    const check = checkArm(zone, analysis, method);
    out.push(...check.violations);
    if (JSON.stringify(check.commits) !== JSON.stringify(COMMITS[arm])) out.push(`${arm}: commits differ from the declared table: ${JSON.stringify(check.commits)}`);
  }
  const owners = stateWriters(zone, analysis, recordFields(zone), "state.ts");
  for (const [field, found] of owners) {
    const expected = [...(ARM_WRITERS[field] ?? [])].sort();
    const actual = [...found].sort();
    if (JSON.stringify(actual) !== JSON.stringify(expected)) out.push(`${field} written by ${actual.join(", ") || "nothing"}; expected ${expected.join(", ") || "nothing"}`);
  }
  out.push(...mutationsOutsideHandOver(zone, analysis, "coordinator.ts"));
  for (const [fn, summary] of analysis.effects) {
    if (OWNER_FILES.has(basename(fn.getSourceFile().fileName)) && summary.foreign) out.push(`${basename(fn.getSourceFile().fileName)}: ${fn.getText().slice(0, 60)} can run code outside the zone`);
  }
  return out;
}

const zone = buildZone();
const analysis = analyse(zone);

describe("correction DEC-9 after COORD-REFACTOR-01: decisions are planned whole and committed only by the state owner", () => {
  test("every call resolves to zone code, a classified primordial or an inventoried foreign call; the owner reaches none", () => {
    assert.deepEqual(analysis.unclassified, []);
    const keys = new Set<string>();
    for (const fn of analysis.effects.keys()) {
      ownNodes(fn, (node) => {
        if ((ts.isCallExpression(node) || ts.isNewExpression(node)) && node.expression.kind !== ts.SyntaxKind.SuperKeyword && analysis.resolve(node).kind === "unknown") keys.add(foreignCallKey(node));
      });
    }
    assert.deepEqual([...keys].sort(), [...FOREIGN_CALLS.keys()].sort(), "each inventoried foreign call exists, and no other");
    const owner = [...analysis.effects].filter(([fn]) => OWNER_FILES.has(basename(fn.getSourceFile().fileName)));
    assert.ok(owner.length > 20, "the owner's functions are analysed");
    assert.deepEqual(owner.filter(([, summary]) => summary.foreign).map(([fn]) => fn.getText().slice(0, 60)), [], "nothing in the owner, its records or the plans can run code outside the zone");
  });

  for (const [name, shape] of PLANNERS) {
    test(`${name}: nothing changes before the hand-over, the basis is bound after the last callback, and only prebuilt values are handed over`, () => {
      const planner = findMethod(zone, "ExecutionCoordinator", name) ?? findConstFunction(zone, name);
      assert.ok(planner !== undefined);
      assert.deepEqual(checkPlanner(zone, analysis, planner, shape).violations, []);
    });
  }

  test("every function in coordinator.ts that hands a plan over is a declared planner", () => {
    const found = new Set<string>();
    for (const fn of analysis.effects.keys()) {
      if (basename(fn.getSourceFile().fileName) !== "coordinator.ts") continue;
      ownNodes(fn, (node) => {
        if (isApplyCall(zone.checker, node)) found.add(fn.kind === ts.SyntaxKind.ArrowFunction && ts.isVariableDeclaration(fn.parent) ? fn.parent.name.getText() : (fn as ts.MethodDeclaration).name?.getText() ?? "<anonymous>");
      });
    }
    const declared = new Set(PLANNERS.map(([name]) => name));
    assert.deepEqual([...found].filter((name) => !declared.has(name)), [], "an undeclared function applies a plan");
    assert.ok(found.size >= 9, "the declared planners apply plans themselves");
  });

  test("the recognised hand-overs are the ones design 01 describes", () => {
    const suffix = (name: string): readonly string[] => checkPlanner(zone, analysis, findMethod(zone, "ExecutionCoordinator", name)!, "suffix").suffix;
    assert.deepEqual(suffix("recoverExecution"), ["this.#state.apply(plan);", "return answer;"]);
    assert.deepEqual(suffix("reportProtocolFailure"), ["this.#state.apply(plan);", "return answer;"]);
    assert.deepEqual(suffix("requestTakeover"), ["this.#state.apply(plan);", "this.#deliver(exchange);", "return answer;"]);
    assert.deepEqual(suffix("redeliver"), ["this.#deliver(intent);", "return answer;"]);
    assert.deepEqual(suffix("submitOutcome"), ["return ok(this.#accept(record, intent, capture.outcome, caller, reading, basis));"]);
    assert.deepEqual(suffix("fireTimer"), ["this.#state.apply(plan);", "this.#requestCancellation(cancellation === null ? null : cancellation.request);", "return answer;"]);
    assert.deepEqual(suffix("cancelExecution"), ["this.#state.apply(plan);", "this.#requestCancellation(request);", "return answer;"]);
    assert.deepEqual(suffix("#refuseLosing"), ["this.#state.apply(plan);", "return refusal;"]);
    assert.deepEqual(suffix("#refusal"), ["this.#state.apply(plan);", "return refusal;"]);
  });

  test("every refusal ends its request, and #accept takes its basis from its caller's own binding", () => {
    assert.deepEqual(refusalsWithoutExit(zone), []);
    assert.deepEqual(basisArgumentViolations(zone, findMethod(zone, "ExecutionCoordinator", "#accept")!, 5), []);
    for (const [name, shape] of [["#requireControl", "null"], ["#openExchange", "result"]] as const) {
      const method = findMethod(zone, "ExecutionCoordinator", name);
      assert.ok(method !== undefined, name);
      assert.deepEqual(refusalHelperViolations(analysis, method, shape), [], `${name} changes nothing on the path that continues past its exit test`);
    }
  });

  test("apply sends each plan kind to exactly one arm", () => {
    const apply = findMethod(zone, "KernelState", "apply");
    assert.ok(apply !== undefined);
    const routed = new Map<string, string>();
    ownNodes(apply, (node) => {
      if (!ts.isIfStatement(node)) return;
      const condition = node.expression;
      if (!ts.isBinaryExpression(condition) || condition.left.getText() !== "plan.kind" || !ts.isStringLiteral(condition.right)) return;
      const calls: string[] = [];
      const visit = (child: ts.Node): void => {
        if (ts.isCallExpression(child)) calls.push(child.expression.getText());
        ts.forEachChild(child, visit);
      };
      visit(node.thenStatement);
      assert.equal(calls.length, 1, `plan.kind ${condition.right.text} makes one call`);
      assert.ok(!routed.has(condition.right.text), `plan.kind ${condition.right.text} is routed once`);
      routed.set(condition.right.text, calls[0]!.replace(/^this\./, ""));
    });
    assert.deepEqual(Object.fromEntries([...routed].sort()), Object.fromEntries(Object.entries(ARMS).sort()));
  });

  for (const arm of Object.values(ARMS)) {
    test(`${arm}: prepares without changing anything, then commits exactly its declared statements`, () => {
      const method = findMethod(zone, "KernelState", arm);
      assert.ok(method !== undefined);
      const check = checkArm(zone, analysis, method);
      assert.deepEqual(check.violations, []);
      assert.deepEqual(check.commits, COMMITS[arm]);
    });
  }

  test("each record field has fixed arms, and the coordinator changes accepted state only by handing plans over", () => {
    const fields = recordFields(zone);
    assert.ok(fields.size > 40, "the record fields are derived from state-records.ts");
    const owners = stateWriters(zone, analysis, fields, "state.ts");
    for (const field of Object.keys(ARM_WRITERS)) assert.ok(fields.has(field), `${field} is a record field`);
    for (const [field, found] of owners) assert.deepEqual([...found].sort(), [...(ARM_WRITERS[field] ?? [])].sort(), field);
    assert.deepEqual(mutationsOutsideHandOver(zone, analysis, "coordinator.ts"), []);
  });

  test("the effect summaries do not depend on the order functions are analysed in", () => {
    // A cycle-cut binding result was once cached as if complete, which made a mutation's target look
    // fresh depending on traversal order; this pins the fix for the whole zone.
    const reversed = analyseEffects(zone, { foreignCalls: new Set(FOREIGN_CALLS.keys()), overrides: EFFECT_OVERRIDES, getterReads: getterReads(), reverse: true });
    assert.deepEqual(Object.fromEntries([...summaries(reversed)].sort()), Object.fromEntries([...summaries(analysis)].sort()));
  });
});

// -- Negative controls ----------------------------------------------------------------

const COORDINATOR = resolve(SOURCE_ROOT, "coordinator.ts");
const STATE = resolve(SOURCE_ROOT, "state.ts");
const SOURCES: Readonly<Record<string, string>> = { [COORDINATOR]: readFileSync(COORDINATOR, "utf8"), [STATE]: readFileSync(STATE, "utf8") };

const TAKEOVER_PREPARE = "    const cleared = plan.cleared;\n    const position = receipt.position;";
const TAKEOVER_BUILD = "    const writerEpoch = currentEpoch + 1;";
const TAKEOVER_BASIS = "    const basis = record.version;\n\n    // -- K1.2-DEC-19 revalidation";
const CONTROL_COMMIT = "    appendOwn(record.recoveryHistory, stored);\n    exchange.codeHold = codeHold;\n    exchange.protocolFailureHold = protocolFailureHold;";
const at = (file: string, find: string, replacement: string): readonly [string, string, string] => [file, find, replacement];
const prepare = (line: string): readonly [string, string, string] => at(STATE, TAKEOVER_PREPARE, `${TAKEOVER_PREPARE}\n    ${line}`);

/**
 * Each mutant: its name, the replacements (each `find` must occur exactly once in its file), and a
 * fragment the reported violations must contain, so each is caught for the reason it exists.
 */
const MUTANTS: readonly { readonly name: string; readonly edits: readonly (readonly [string, string, string])[]; readonly reason: string }[] = [
  // Controls 1–7: every write form, now in an owner arm's prepare phase.
  { name: "1–2: an increment before the commit", edits: [prepare("const probe = (record.nextAcceptancePosition += 1) - 1;")], reason: "#applyTakeover: mutates before its commit" },
  { name: "3: a plain write moved before the builds", edits: [at(STATE, TAKEOVER_PREPARE, `    const cleared = plan.cleared;\n    record.nextAcceptancePosition = receipt.position + 1;\n    const position = receipt.position;`)], reason: "#applyTakeover: statement outside the prepare → commit grammar" },
  { name: "4: an element write with a literal key", edits: [prepare('const probe = (record["nextAcceptancePosition"] = 0);')], reason: "#applyTakeover: mutates before its commit" },
  { name: "5: a logical assignment", edits: [prepare("const probe = (exchange.receipt ??= receipt);")], reason: "#applyTakeover: mutates before its commit" },
  { name: "6: a delete of a record field", edits: [prepare("const probe = delete (exchange as { receipt?: unknown }).receipt;")], reason: "#applyTakeover: mutates before its commit" },
  // Controls 8–16 and 21: aliases, containers, closures, callbacks, maps, freezes and casts.
  { name: "8: an early append through a const alias", edits: [prepare("const receiptsAlias = record.receipts;\n    const probe = appendOwn(receiptsAlias, receipt);")], reason: "#applyTakeover: mutates before its commit" },
  { name: "9: an early append through a fresh container holding a record list", edits: [prepare("const holder = { list: record.receipts };\n    const probe = appendOwn(holder.list, receipt);")], reason: "#applyTakeover: mutates before its commit" },
  { name: "10–11: an early write through an alias", edits: [prepare("const target = exchange;\n    const probe = (target.submission = plan.submission);")], reason: "#applyTakeover: mutates before its commit" },
  { name: "13: an early write inside a local closure", edits: [prepare("const retire = (): void => {\n      exchange.submission = submission;\n    };\n    const probe = retire();")], reason: "#applyTakeover: mutates before its commit" },
  { name: "14: an early append inside a callback handed to a helper", edits: [prepare("const probe = mapOwn([receipt], (item) => {\n      appendOwn(record.receipts, item);\n      return item;\n    });")], reason: "#applyTakeover: mutates before its commit" },
  { name: "15: an early Map mutation", edits: [prepare('const probe = mapSet(record.byInputId, "probe", readAt(record.mailbox, 0) as MailboxEntry);')], reason: "#applyTakeover: mutates before its commit" },
  { name: "16: an early freeze of a record list", edits: [prepare("const probe = PrimordialObjectFreeze(exchange.deliveries);")], reason: "#applyTakeover: mutates before its commit" },
  { name: "21: a record list widened to unknown, cast to string and appended to through a helper", edits: [prepare("const widened: unknown = record.receipts;\n    const disguised = widened as string;\n    const launder = (text: string): void => {\n      appendOwn(text as unknown as Receipt[], receipt);\n    };\n    const probe = launder(disguised);")], reason: "#applyTakeover: mutates before its commit" },
  { name: "owner module state changed while preparing", edits: [at(STATE, "const STALE_PLAN =", "let applied = 0;\nconst STALE_PLAN ="), prepare("const probe = (applied += 1);")], reason: "#applyTakeover: mutates before its commit" },
  // Control 17: a builder that also changes module state.
  { name: "17: a builder that also changes module state", edits: [at(COORDINATOR, "const mintSubmission = (executionId: string, activationId: string, writerEpoch: number): SubmissionGrant =>\n  PrimordialObjectFreeze({ executionId, activationId, writerEpoch });", "let grantsMinted = 0;\nconst mintSubmission = (executionId: string, activationId: string, writerEpoch: number): SubmissionGrant => {\n  grantsMinted += 1;\n  return PrimordialObjectFreeze({ executionId, activationId, writerEpoch });\n};")], reason: "requestTakeover: mutates before its hand-over: mintSubmission" },
  // Controls 18–20: refusals that do not end the request.
  { name: "18: a refusal recorded without exiting", edits: [at(COORDINATOR, TAKEOVER_BUILD, `    this.#refusal("stale_exchange", "probe", record);\n${TAKEOVER_BUILD}`)], reason: "a refusal recorded without exiting" },
  { name: "19: a refusal helper whose result is not tested", edits: [at(COORDINATOR, "    const control = this.#requireControl(caller, record);\n    if (control !== null) return err(control);\n\n    const issues: LocatedIssue[] = [];\n    const named = captureAttempt(request, issues);", "    this.#requireControl(caller, record);\n\n    const issues: LocatedIssue[] = [];\n    const named = captureAttempt(request, issues);")], reason: "requestTakeover: this.#requireControl is not followed by its exit test" },
  { name: "20: a refusal helper that changes state on its continuing path", edits: [at(COORDINATOR, "    if (mayControlScope(caller, record.scope)) return null;", '    if (mayControlScope(caller, record.scope)) {\n      this.#state.apply(PrimordialObjectFreeze({ kind: "refusal", executionId: record.executionId, basis: record.version, refusal: mintRefusal("unauthorized_control", "probe", 0, null) }));\n      return null;\n    }')], reason: "#requireControl mutates outside a refusal exit" },
  // Controls 22–23: foreign code.
  { name: "22: a record handed to foreign code", edits: [at(COORDINATOR, "PrimordialReflectApply(establish, this.#driver, [exchange.activation])", "PrimordialReflectApply(establish, this.#driver, [exchange.activation, record])")], reason: "unclassified call requestTakeover PrimordialReflectApply(establish, this.#driver, [exchange.activation, record])" },
  { name: "23: an unclassified call before the hand-over", edits: [at(COORDINATOR, TAKEOVER_BUILD, `    (exchange.activation as unknown as () => void)();\n${TAKEOVER_BUILD}`)], reason: "unclassified call requestTakeover" },
  // Controls 24 and 28: answers built after the hand-over.
  { name: "24: a value built after the hand-over", edits: [at(COORDINATOR, "    this.#state.apply(plan);\n    this.#deliver(exchange);\n    return answer;", "    this.#state.apply(plan);\n    const late = ok(1);\n    this.#deliver(exchange);\n    return answer;")], reason: "requestTakeover: statement outside the hand-over → delivery → return suffix" },
  { name: "28 (round 6 H7): a recovery answer projected after the hand-over", edits: [at(COORDINATOR, "    const answer = ok({ activationId: pinned.activationId, writerEpoch: pinned.writerEpoch, recoveryHolds: holdsOf(commit), changed: true });", "    const answer = ok({ activationId: pinned.activationId, writerEpoch: pinned.writerEpoch, recoveryHolds: holdsOf(commit), changed: true });\n    const projected = (): typeof answer => answer;"), at(COORDINATOR, "    this.#state.apply(plan);\n    return answer;\n  }\n\n  /**\n   * Holds the unresolved exchange", "    this.#state.apply(plan);\n    return projected();\n  }\n\n  /**\n   * Holds the unresolved exchange")], reason: "recoverExecution: hand-over answer projected() is not a local" },
  // Control 25: a callback after the decision's basis.
  { name: "25: foreign code run after the basis is bound", edits: [at(COORDINATOR, TAKEOVER_BASIS, `    const basis = record.version;\n    hostMember(caller, "controlScopes");\n\n    // -- K1.2-DEC-19 revalidation`)], reason: "requestTakeover: runs code outside the zone after binding its basis" },
  { name: "25: the basis bound before the safety callback", edits: [at(COORDINATOR, TAKEOVER_BASIS, "\n    // -- K1.2-DEC-19 revalidation"), at(COORDINATOR, "    let safe = false;\n    try {", "    const basis = record.version;\n    let safe = false;\n    try {")], reason: "requestTakeover: binds its basis before its last callback" },
  { name: "25: a plan's basis read when the plan is assembled", edits: [at(COORDINATOR, '      kind: "takeover",\n      executionId: record.executionId,\n      basis,', '      kind: "takeover",\n      executionId: record.executionId,\n      basis: record.version,')], reason: "requestTakeover: a plan's basis is not the planner's bound basis" },
  { name: "25: accepted state read after the last callback, before the basis", edits: [at(COORDINATOR, '    const content = acceptInputContent(request, "");\n', '    const content = acceptInputContent(request, "");\n    const early = record.mailboxLength;\n')], reason: "submitInput: reads accepted state after its last callback and before binding its basis: record.mailboxLength" },
  { name: "25: #accept handed a basis that is not its caller's binding", edits: [at(COORDINATOR, "return ok(this.#accept(record, intent, capture.outcome, caller, reading, basis));", "return ok(this.#accept(record, intent, capture.outcome, caller, reading, record.version));")], reason: "submitOutcome: passes #accept a basis that is not its own binding" },
  // Control 26: the Driver handed the attempt before it is recorded.
  { name: "26: the Driver handed the attempt before the decision is applied", edits: [at(COORDINATOR, "    this.#state.apply(plan);\n    this.#deliver(exchange);\n    return answer;", "    this.#deliver(exchange);\n    this.#state.apply(plan);\n    return answer;")], reason: "requestTakeover: statement outside the hand-over → delivery → return suffix" },
  // Control 27 (round 6 H3): holds written before their history append.
  { name: "27: holds written before their history append", edits: [at(STATE, CONTROL_COMMIT, "    exchange.codeHold = codeHold;\n    exchange.protocolFailureHold = protocolFailureHold;\n    appendOwn(record.recoveryHistory, stored);")], reason: "#applyControl: commits differ from the declared table" },
  // D01-CHK-4: each coupled commit dropped while its binding is kept.
  { name: "a dropped history append (binding kept)", edits: [at(STATE, CONTROL_COMMIT, "    exchange.codeHold = codeHold;\n    exchange.protocolFailureHold = protocolFailureHold;")], reason: "#applyControl: commits differ from the declared table" },
  { name: "a dropped hold write (binding kept)", edits: [at(STATE, CONTROL_COMMIT, "    appendOwn(record.recoveryHistory, stored);\n    exchange.protocolFailureHold = protocolFailureHold;")], reason: "#applyControl: commits differ from the declared table" },
  { name: "a dropped receipt append (binding kept)", edits: [at(STATE, "    appendOwn(record.receipts, receipt);\n    if (cleared !== null)", "    if (cleared !== null)")], reason: "#applyTakeover: commits differ from the declared table" },
  { name: "a dropped grant write (binding kept)", edits: [at(STATE, "    exchange.submission = submission;\n", "")], reason: "#applyTakeover: commits differ from the declared table" },
  // Review 01, CR1-R1-CREATION-01: the Execution map is published first, as B did, and is the listing.
  { name: "the creation-key index published before the Execution map", edits: [at(STATE, "    mapSet(this.#executions, executionId, record);\n    mapSet(this.#byCreationRequestId, creationRequestIdKey(creationRequestId), record);", "    mapSet(this.#byCreationRequestId, creationRequestIdKey(creationRequestId), record);\n    mapSet(this.#executions, executionId, record);")], reason: "#applyCreation: commits differ from the declared table" },
  // Review 01: a closure's change to a list its function built is local; to anything older it is not.
  { name: "an early append, inside a callback, through an alias of a record list", edits: [prepare("const list = record.receipts;\n    const probe = mapOwn([receipt], (item) => {\n      appendOwn(list, item);\n      return item;\n    });")], reason: "#applyTakeover: mutates before its commit" },
  { name: "an early append, inside a callback, to a record list a fresh container holds", edits: [prepare("const holder = { list: record.receipts };\n    const probe = mapOwn([receipt], (item) => {\n      appendOwn(holder.list, item);\n      return item;\n    });")], reason: "#applyTakeover: mutates before its commit" },
  { name: "the listing walk writes the Execution map through a captured alias, seen at the coordinator's call", edits: [at(STATE, "    const visible: string[] = [];\n    // `Map.forEach`", "    const visible: string[] = [];\n    const all = this.#executions;\n    // `Map.forEach`"), at(STATE, "        if (mayReachScope(caller, record.scope)) appendOwn(visible, record.executionId);", "        if (mayReachScope(caller, record.scope)) mapSet(all, record.executionId, record);")], reason: "visibleExecutions: changes accepted state outside a hand-over" },
  { name: "the listing walk appends to a record list", edits: [at(STATE, "        if (mayReachScope(caller, record.scope)) appendOwn(visible, record.executionId);", "        if (mayReachScope(caller, record.scope)) appendOwn(record.receipts, record.creationReceipt);")], reason: "receipts written by" },
  // Controls 29–31: holds and history written in the wrong place.
  { name: "29: a protocol hold written while preparing", edits: [at(STATE, "    const stored = plan.history;", "    const stored = plan.history;\n    const probe = (exchange.protocolFailureHold = null);")], reason: "#applyControl: mutates before its commit" },
  { name: "30: a hold written by the wrong arm", edits: [at(STATE, "    appendOwn(exchange.deliveries, attempt);", "    appendOwn(exchange.deliveries, attempt);\n    exchange.codeHold = null;")], reason: "codeHold written by #applyControl, #applyDelivery" },
  { name: "31: recovery history changed through an alias outside the arms", edits: [at(STATE, "  const open = record.activation;\n  if (open !== null", "  appendAllOwn(record.recoveryHistory, []);\n  const open = record.activation;\n  if (open !== null")], reason: "recoveryHistory written by #applyCancellation, #applyControl, #applyOutcome, #applyTakeover, deliveriesOf" },
  // D01-CHK-2: getters.
  { name: "a reader getter that writes its record", edits: [at(STATE, "  get version(): number {\n    return this.#record.version;\n  }", "  get version(): number {\n    this.#record.version = this.#record.version;\n    return this.#record.version;\n  }")], reason: "version written by" },
  { name: "a changing getter read by a planner before its hand-over", edits: [at(STATE, "  get mailboxLength(): number {\n    return this.#record.mailbox.length;\n  }", "  get mailboxLength(): number {\n    appendAllOwn(this.#record.mailbox, []);\n    return this.#record.mailbox.length;\n  }")], reason: "submitInput: mutates before its hand-over: record.mailboxLength" },
  { name: "a getter that returns a live record list, which a planner changes", edits: [at(STATE, "  get mailboxLength(): number {", "  get liveRefusals(): RefusalRecord[] {\n    return this.#record.refusals;\n  }\n\n  get mailboxLength(): number {"), at(COORDINATOR, '    const content = acceptInputContent(request, "");\n    // The last caller observation is above: the decision below is planned against this version.\n    const basis = record.version;\n', '    const content = acceptInputContent(request, "");\n    // The last caller observation is above: the decision below is planned against this version.\n    const basis = record.version;\n    appendAllOwn(record.liveRefusals, []);\n')], reason: "submitInput: mutates before its hand-over: appendAllOwn(record.liveRefusals, [])" },
];

describe("correction DEC-9 negative controls: every forbidden shape is reported", () => {
  test("the unmodified source is the clean control", () => {
    assert.deepEqual(violations(zone, analysis), []);
  });

  for (const mutant of MUTANTS) {
    test(mutant.name, () => {
      const texts = new Map(Object.entries(SOURCES));
      for (const [file, find, replacement] of mutant.edits) {
        const text = texts.get(file)!;
        assert.equal(text.split(find).length, 2, `anchor occurs exactly once in ${basename(file)}: ${find.slice(0, 60)}`);
        texts.set(file, text.replace(find, () => replacement));
      }
      const changed = new Map([...texts].filter(([file, text]) => text !== SOURCES[file]));
      const mutated = buildZone(zoneFiles(), changed, zone);
      assert.deepEqual(typeErrors(mutated).filter((error) => !/'(probe|late|early|applied|grantsMinted)' is declared but/.test(error)), [], "the mutant is valid TypeScript, so only the rule can reject it");
      const found = violations(mutated, analyse(mutated));
      assert.ok(found.some((violation) => violation.includes(mutant.reason)), `expected "${mutant.reason}"; reported: ${found.join(" | ") || "nothing"}`);
    });
  }
});
