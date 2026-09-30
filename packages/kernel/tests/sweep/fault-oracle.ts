/**
 * The oracle and exit inventory of the DEC-9 fault-injection sweep (contract revision 10).
 *
 * `fault-child.ts` runs each scenario's target call once with no fault (the *reference*), then once
 * per intercepted operation `k` with an exception thrown at that operation. This module decides
 * whether each run left a decision the contract permits, and whether the scenarios take each exit of
 * the swept methods it finds in the source. It imports no Kernel code: it reads `coordinator.ts` as
 * text and compares observations, so `fault-oracle.test.ts` can hand it altered observations as
 * negative controls, and `oracle-mutants-09.mjs` can disable each of its comparisons (`CHECKS`) in turn.
 *
 * ## What a run is judged on (`Observation`)
 *
 * 1. the **returned value**: the answer, the refusal, or the fault the call threw;
 * 2. the **whole inspection view** of the Execution;
 * 3. the **sequence positions** the next refusal and the next accepted input receive (neither index
 *    is in the view);
 * 4. the **authority** left to the grant the Driver received with the setup exchange's first attempt,
 *    probed with an Outcome presented with it (no grant is in the view either).
 *
 * ## Permitted decisions for a run with a fault
 *
 * First, the fault must have fired (`CHECKS.fired`) at the operation the reference run made at the same
 * position (`CHECKS.sameOperation`). Each permitted outcome is then one fully specified expected
 * observation, and the run passes only when all four parts equal it, compared by `CHECKS.returned`,
 * `view`, `nextRefusal`, `nextAcceptance` and `setupGrant`. `B` is the no-call baseline: the state
 * before the call; in the five safety-callback scenarios, once the fault falls after the callback has
 * run (`CHECKS.callbackRan`: in this run exactly when in the reference run), the state the callback's
 * own nested decision left with no outer call (`Context.callback`).
 *
 * | The call | Expected returned value | Expected state |
 * |---|---|---|
 * | threw | that run's injected fault | `B` |
 * | refused, naming the Execution | the refusal, carrying `B`'s next refusal position and this Execution (`CHECKS.refusalPosition`, `refusalExecution`) | `B` plus exactly that record; the refusal index one further; the acceptance index and grant as in `B` |
 * | refused, naming no Execution | the unknown-destination refusal, position 0 | `B` |
 * | accepted | the reference answer | the reference state |
 * | accepted | the declared alternate call's answer | the alternate call's state |
 *
 * Three exceptions are admitted, only in the scenarios whose uninjected call accepts
 * (`CHECKS.acceptingExit`), and each only for a fault the checker *locates* inside the declared phase:
 * one of the fault's own stack frames is at a statement this module finds in `coordinator.ts`
 * (`sourceModel`). The name of the intercepted method plays no part.
 *
 * - **Takeover delivery** (`CHECKS.deliveredAt`): the fault is inside `#deliver`, which
 *   `requestTakeover` calls after its commit. The expected state is the reference state with the new
 *   delivery row in the form its location implies, and the returned value is the one that location implies:
 *   - absent: the fault was at the row's append, and the call throws it;
 *   - pending: the fault was at the capability's freeze, and the call throws it;
 *   - failed, with the Kernel's fallback reason: the fault was inside the Driver, and the reference
 *     answer is returned.
 * - **Takeover apply window** (`CHECKS.takeoverWindowAt`): the fault is at the clearing record's append,
 *   the second of the takeover's two appends. Expected: that fault, and `B` plus exactly the receipt.
 * - **Outcome apply window** (`CHECKS.outcomeStepAt`, `CHECKS.outcomePrefix`): the fault is at one of
 *   `#accept`'s apply statements. Expected: that fault, and a state that is a prefix of the declared
 *   apply sequence `OUTCOME_APPLY` ending inside that statement. The sweep checks that the sequence
 *   matches the source (`CHECKS.applySequence`) and, from the reference decision, that applying it
 *   whole reproduces the reference state (`CHECKS.applyModel`).
 *
 * With no fault (`k = N + 1`), the run must reproduce the reference answer or refusal and the
 * reference state, and no fault may fire (`CHECKS.quietRepeat`).
 *
 * ## The reference decision (`checkContext`)
 *
 * The comparisons above take the reference as given, so the reference is checked too:
 * - it took the declared kind of exit, with the declared refusal classification (`CHECKS.referenceKind`);
 * - refused: the no-call baseline plus exactly its refusal (`CHECKS.referenceRefusal`);
 * - refused naming no Execution: the no-call state (`CHECKS.referenceUnnamed`);
 * - unchanged: the no-call state (`CHECKS.referenceUnchanged`); an exact replay: the no-call state and
 *   the accepted decision's answer (`CHECKS.referenceReplay`);
 * - accepted, or unchanged: the answer agrees with the retained state (holds, attempt, receipt,
 *   positions and the setup grant; `CHECKS.recoveryAnswer`, `takeoverAnswer`, `outcomeAnswer`), and so
 *   does the declared alternate's.
 *
 * In the safety-callback scenarios the no-call baseline is the callback's own decision, so
 * `referenceRefusal` requires the reference state to be that decision plus exactly the outer refusal.
 *
 * ## Exit inventory (`exitInventory`)
 *
 * The swept methods' exits are found in the source, not listed by hand:
 * - every `return` of `recoverExecution`, `reportProtocolFailure`, `requestTakeover` and
 *   `submitOutcome`;
 * - every refusal `return` of `#openExchange` and `#requireControl`, counted once for each control
 *   that calls the helper.
 *
 * `fault-child.ts` measures with V8 block coverage which of them each reference run executes, with the
 * safety callback's own nested calls excluded; a return counts for a scenario of the control it is
 * listed under (`CHECKS.attributed`). Each scenario must take its declared exit (`CHECKS.declaredExit`),
 * and each exit must be taken by some scenario (`CHECKS.exitReached`).
 */

import { readFileSync } from "node:fs";
import { isDeepStrictEqual } from "node:util";
import ts from "typescript";
import type { ExecutionView, RefusalRecord } from "../../src/index.ts";

export type Control = "recoverExecution" | "reportProtocolFailure" | "requestTakeover" | "submitOutcome";
export const CONTROLS: readonly Control[] = ["recoverExecution", "reportProtocolFailure", "requestTakeover", "submitOutcome"];

/** A zone stack frame: `file` relative to `packages/kernel/src/`. */
export interface Frame {
  readonly file: string;
  readonly line: number;
  readonly fn: string;
}

/** The injected fault: its operation number, the intercepted method, and the zone frames above it, innermost first. */
export interface Fault {
  readonly operation: number;
  readonly label: string;
  readonly stack: readonly Frame[];
}

export interface State {
  readonly view: ExecutionView;
  readonly nextRefusal: number;
  readonly nextAcceptance: number | string;
  readonly setupGrant: string;
}

export type Returned =
  | { readonly kind: "threw"; readonly operation: number | null; readonly error?: string }
  | { readonly kind: "ok"; readonly value: unknown }
  | { readonly kind: "err"; readonly refusal: RefusalRecord };

export interface Observation {
  readonly returned: Returned;
  readonly state: State;
}

export interface Attempt {
  /** The operation the fault was aimed at; `n + 1` is the run with no fault. */
  readonly k: number;
  readonly fired: boolean;
  readonly counted: number;
  readonly fault: Fault | null;
  /** Whether the Driver's safety callback ran during this call. */
  readonly callbackRan: boolean;
  readonly observation: Observation;
}

/** What the uninjected call must decide. */
export type Expect = "accepted" | "unchanged" | "replayed" | "unnamed" | { readonly refused: string };

export interface Context {
  readonly name: string;
  readonly control: Control;
  readonly expect: Expect;
  readonly executionId: string;
  /** The operations the reference call made. */
  readonly n: number;
  /** The intercepted method of each of those operations, in order. */
  readonly labels: readonly string[];
  /** The no-call state. */
  readonly s0: State;
  /** The uninjected call. */
  readonly reference: Observation;
  /** The declared alternate call, for a decision a contained fault may legitimately reach instead. */
  readonly alternate: Observation | null;
  /** The safety-callback scenarios: the state its nested decision leaves with no outer call, and the operation count when it ran. */
  readonly callback: { readonly state: State; readonly at: number } | null;
  /** The answer of the setup's accepted Outcome, which an exact replay must return. */
  readonly setupAnswer: unknown;
  /** The refusal a request naming no visible Execution receives, from a clean call. */
  readonly unnamedRefusal: RefusalRecord;
  /** The failure reason the Kernel records when a Driver throws a non-string, from a clean call. */
  readonly deliveryFailure: string;
}

export type Verdict =
  | { readonly ok: true; readonly kind: string }
  | { readonly ok: false; readonly violation: string; readonly detail: string };

// -- The source model ---------------------------------------------------------------------------

/** `#accept`'s apply phase, statement by statement, in order (DEC-10; BASELINE's Outcome-acceptance transaction). */
export const OUTCOME_APPLY = [
  ["index", "record.nextAcceptancePosition = acceptancePosition + 1;"],
  ["acknowledge", "for (let index = 0; index < toAcknowledge.length; index += 1) (readAt(toAcknowledge, index) as MailboxEntry).disposition = acknowledgment;"],
  ["end", "for (let index = 0; index < toEnd.length; index += 1) (readAt(toEnd, index) as MailboxEntry).disposition = ending;"],
  ["progress", "record.acceptedProgress = outcome.progress.value;"],
  ["progressRevision", "record.progressRevision = progressRevision;"],
  ["emissions", "appendAllOwn(record.emissions, emissionRecords);"],
  ["result", "if (result !== null) record.result = result;"],
  ["exchanges", "appendOwn(record.exchanges, resolved);"],
  ["acceptedOutcomes", "mapSet(record.acceptedOutcomes, activationId, stored);"],
  ["receipts", "appendOwn(record.receipts, receipt);"],
  ["history", "appendAllOwn(record.recoveryHistory, historyToAppend);"],
  ["activation", "record.activation = null;"],
  ["state", "record.state = nextState;"],
] as const;
export type OutcomeStep = (typeof OUTCOME_APPLY)[number][0];

/** `requestTakeover`'s apply phase and delivery, in order (DEC-9). */
export const TAKEOVER_APPLY = [
  "appendOwn(record.receipts, receipt);",
  "if (cleared !== null) appendOwn(record.recoveryHistory, cleared);",
  "record.nextAcceptancePosition = position + 1;",
  "exchange.submission = submission;",
  "exchange.activation = activation;",
  "exchange.receipt = receipt;",
  "exchange.protocolFailureHold = null;",
  "this.#deliver(exchange);",
  "return answer;",
] as const;

/** `#deliver`'s three statements that can fail, and the delivery row each failure leaves. */
export const DELIVERY_SITES = [
  ["absent", "appendOwn(intent.deliveries, attempt);"],
  ["pending", "const settlement: DeliverySettlement = PrimordialObjectFreeze({"],
  ["failed", "this.#driver.deliver(intent.activation, settlement, intent.submission);"],
] as const;
export type DeliverySite = (typeof DELIVERY_SITES)[number][0];

type Lines = readonly [number, number];

export interface Exit {
  /** `<control> [<helper>] L<line>`. */
  readonly id: string;
  readonly method: string;
  readonly via: Control;
  /** The conditions of the enclosing `if`s, then the returned expression; whitespace collapsed. */
  readonly text: string;
  readonly offset: number;
  readonly line: number;
}

export interface SourceModel {
  readonly outcomeApply: readonly { readonly step: OutcomeStep; readonly lines: Lines | null }[];
  readonly takeoverClearingAppend: Lines | null;
  readonly takeoverDeliverCall: Lines | null;
  readonly deliverySites: readonly { readonly site: DeliverySite; readonly lines: Lines | null }[];
  readonly exits: readonly Exit[];
  /** Mismatches between the declared sequences and the source. */
  readonly problems: readonly string[];
}

const collapse = (text: string): string => text.replace(/\s+/g, " ").trim();

export function sourceModel(coordinatorPath: string): SourceModel {
  const text = readFileSync(coordinatorPath, "utf8");
  const source = ts.createSourceFile(coordinatorPath, text, ts.ScriptTarget.Latest, true);
  const problems: string[] = [];
  const lineOf = (position: number): number => source.getLineAndCharacterOfPosition(position).line + 1;
  const linesOf = (node: ts.Node): Lines => [lineOf(node.getStart(source)), lineOf(node.getEnd())];

  let coordinator: ts.ClassDeclaration | undefined;
  for (const statement of source.statements) {
    if (ts.isClassDeclaration(statement) && statement.name?.text === "ExecutionCoordinator") coordinator = statement;
  }
  const methods = new Map<string, ts.MethodDeclaration>();
  for (const member of coordinator?.members ?? []) {
    if (ts.isMethodDeclaration(member) && (ts.isIdentifier(member.name) || ts.isPrivateIdentifier(member.name))) methods.set(member.name.text, member);
  }
  const method = (name: string): ts.MethodDeclaration | undefined => {
    const found = methods.get(name);
    if (found === undefined) problems.push(`coordinator.ts has no method ${name}`);
    return found;
  };

  // The statements of a method, not entering nested functions.
  const statementsOf = (node: ts.MethodDeclaration): ts.Statement[] => {
    const found: ts.Statement[] = [];
    const visit = (child: ts.Node): void => {
      if (ts.isFunctionLike(child) || ts.isClassLike(child)) return;
      if (ts.isExpressionStatement(child) || ts.isIfStatement(child) || ts.isForStatement(child) || ts.isVariableStatement(child) || ts.isReturnStatement(child)) {
        found.push(child);
      }
      ts.forEachChild(child, visit);
    };
    if (node.body !== undefined) ts.forEachChild(node.body, visit);
    return found;
  };
  const anchored = (name: string, anchor: string): Lines | null => {
    const node = method(name);
    if (node === undefined) return null;
    const matches = statementsOf(node).filter((statement) => collapse(statement.getText(source)).startsWith(collapse(anchor)));
    if (matches.length !== 1) {
      problems.push(`${name}: ${matches.length} statements start with "${anchor}"`);
      return null;
    }
    return linesOf(matches[0] as ts.Statement);
  };
  // A declared sequence must be consecutive top-level statements of the method's body, in order.
  const sequence = (name: string, anchors: readonly string[], then: string | null): void => {
    const node = method(name);
    if (node?.body === undefined) return;
    const body = node.body.statements;
    const start = body.findIndex((statement) => collapse(statement.getText(source)).startsWith(collapse(anchors[0] as string)));
    if (start === -1) {
      problems.push(`${name}: the declared sequence's first statement "${anchors[0]}" is missing`);
      return;
    }
    const expected = then === null ? anchors : [...anchors, then];
    for (let index = 0; index < expected.length; index += 1) {
      const statement = body[start + index];
      const actual = statement === undefined ? "<end of body>" : collapse(statement.getText(source));
      if (!actual.startsWith(collapse(expected[index] as string))) {
        problems.push(`${name}: statement ${index + 1} of the declared sequence is "${actual.slice(0, 100)}", not "${expected[index]}"`);
        return;
      }
    }
  };

  sequence("#accept", OUTCOME_APPLY.map(([, anchor]) => anchor), "return { ...decision, replayed: false };");
  sequence("requestTakeover", TAKEOVER_APPLY, null);
  const outcomeApply = OUTCOME_APPLY.map(([step, anchor]) => ({ step, lines: anchored("#accept", anchor) }));
  const takeoverClearingAppend = anchored("requestTakeover", TAKEOVER_APPLY[1]);
  const takeoverDeliverCall = anchored("requestTakeover", TAKEOVER_APPLY[7]);
  const deliverySites = DELIVERY_SITES.map(([site, anchor]) => ({ site, lines: anchored("#deliver", anchor) }));

  // Exits: the returns of each control, and the refusal returns of the helpers it calls.
  const exits: Exit[] = [];
  const returnsOf = (node: ts.MethodDeclaration): { statement: ts.ReturnStatement; text: string }[] => {
    const found: { statement: ts.ReturnStatement; text: string }[] = [];
    const visit = (child: ts.Node, conditions: readonly string[]): void => {
      if (ts.isFunctionLike(child) || ts.isClassLike(child)) return;
      if (ts.isReturnStatement(child)) {
        found.push({ statement: child, text: collapse(`${conditions.join(" && ")}${conditions.length > 0 ? " → " : ""}${child.getText(source)}`) });
        return;
      }
      if (ts.isIfStatement(child)) {
        const condition = child.expression.getText(source);
        visit(child.thenStatement, [...conditions, condition]);
        if (child.elseStatement !== undefined) visit(child.elseStatement, [...conditions, `!(${condition})`]);
        return;
      }
      ts.forEachChild(child, (grandchild) => visit(grandchild, conditions));
    };
    if (node.body !== undefined) ts.forEachChild(node.body, (child) => visit(child, []));
    return found;
  };
  for (const control of CONTROLS) {
    const node = method(control);
    if (node === undefined) continue;
    const body = node.getText(source);
    const add = (name: string, statement: ts.ReturnStatement, exitText: string): void => {
      const line = lineOf(statement.getStart(source));
      exits.push({ id: `${control}${name === control ? "" : ` ${name}`} L${line}`, method: name, via: control, text: exitText, offset: statement.getStart(source), line });
    };
    for (const { statement, text: exitText } of returnsOf(node)) add(control, statement, exitText);
    for (const helper of ["#openExchange", "#requireControl"]) {
      if (!body.includes(`this.${helper}(`)) continue;
      const helperNode = method(helper);
      if (helperNode === undefined) continue;
      for (const { statement, text: exitText } of returnsOf(helperNode)) {
        if (statement.getText(source).includes("this.#refusal(")) add(helper, statement, exitText);
      }
    }
  }
  return { outcomeApply, takeoverClearingAppend, takeoverDeliverCall, deliverySites, exits, problems };
}

// -- Helpers ------------------------------------------------------------------------------------

const inLines = (frame: Frame, lines: Lines | null): boolean =>
  lines !== null && frame.file === "coordinator.ts" && frame.line >= lines[0] && frame.line <= lines[1];

const threw = (operation: number): Returned => ({ kind: "threw", operation });

const withView = (state: State, patch: Partial<ExecutionView>): State => ({ ...state, view: { ...state.view, ...patch } });

const withRefusal = (base: State, refusal: RefusalRecord): State => ({
  view: { ...base.view, refusals: [...base.view.refusals, refusal] },
  nextRefusal: base.nextRefusal + 1,
  nextAcceptance: base.nextAcceptance,
  setupGrant: base.setupGrant,
});

/** The view's mailbox with its derived lists recomputed from the entries' dispositions. */
const withMailbox = (state: State, mailbox: ExecutionView["mailbox"]): State => {
  const ids = (kind: string): string[] => mailbox.filter((entry) => entry.disposition.kind === kind).map((entry) => entry.eventId);
  return withView(state, { mailbox, queued: ids("queued"), acknowledged: ids("acknowledged"), terminalDispositions: ids("terminal") });
};

/** "accepted at N" → "accepted at N + 1": the acceptance index advanced once more before the probe. */
const shiftedGrant = (grant: string): string => {
  const match = /^accepted at (\d+)$/.exec(grant);
  return match === null ? `unshiftable setup grant (${grant})` : `accepted at ${Number(match[1]) + 1}`;
};

// -- The comparisons ----------------------------------------------------------------------------

/**
 * Every comparison the oracle makes, by name. `oracle-mutants-09.mjs` replaces each entry in turn
 * with `() => true` and requires the negative controls in `fault-oracle.test.ts` to notice.
 */
export const CHECKS = {
  // The four parts of a complete decision (the returned value, the view, the two positions, the grant).
  returned: (expected: Observation, observed: Observation): boolean => isDeepStrictEqual(expected.returned, observed.returned),
  view: (expected: Observation, observed: Observation): boolean => isDeepStrictEqual(expected.state.view, observed.state.view),
  nextRefusal: (expected: Observation, observed: Observation): boolean => expected.state.nextRefusal === observed.state.nextRefusal,
  nextAcceptance: (expected: Observation, observed: Observation): boolean => expected.state.nextAcceptance === observed.state.nextAcceptance,
  setupGrant: (expected: Observation, observed: Observation): boolean => expected.state.setupGrant === observed.state.setupGrant,
  // A recorded refusal occupies the next position of this Execution.
  refusalPosition: (refusal: RefusalRecord, base: State): boolean => refusal.position === base.nextRefusal,
  refusalExecution: (refusal: RefusalRecord, executionId: string): boolean => refusal.executionId === executionId,
  // The located exceptions belong to the scenarios whose uninjected call accepts.
  acceptingExit: (context: Context, control: Control): boolean => context.control === control && context.expect === "accepted",
  // Fault bookkeeping.
  fired: (attempt: Attempt): boolean => attempt.fired,
  sameOperation: (attempt: Attempt, label: string | undefined): boolean => attempt.fault !== null && attempt.fault.label === label,
  quietRepeat: (attempt: Attempt): boolean => !attempt.fired,
  callbackRan: (attempt: Attempt, after: boolean): boolean => attempt.callbackRan === after,
  // Locations, from the fault's own stack.
  deliveredAt: (model: SourceModel, fault: Fault | null, site: DeliverySite): boolean => {
    if (fault === null) return false;
    const call = fault.stack.findIndex((frame) => inLines(frame, model.takeoverDeliverCall));
    const inner = call > 0 ? fault.stack[call - 1] : undefined;
    const lines = model.deliverySites.find((entry) => entry.site === site)?.lines ?? null;
    return inner !== undefined && inLines(inner, lines);
  },
  takeoverWindowAt: (model: SourceModel, fault: Fault | null): boolean =>
    fault !== null && fault.stack.some((frame) => inLines(frame, model.takeoverClearingAppend)),
  outcomeStepAt: (model: SourceModel, fault: Fault | null, step: OutcomeStep): boolean => {
    const lines = model.outcomeApply.find((entry) => entry.step === step)?.lines ?? null;
    return fault !== null && fault.stack.some((frame) => inLines(frame, lines));
  },
  outcomePrefix: (prefixes: readonly Observation[], observed: Observation): boolean => prefixes.some((expected) => decided(expected, observed)),
  applySequence: (model: SourceModel): boolean => model.problems.length === 0,
  applyModel: (context: Context, whole: State): boolean => decided({ returned: context.reference.returned, state: whole }, context.reference),
  // The reference decision.
  referenceKind: (context: Context): boolean => {
    const returned = context.reference.returned;
    const expect = context.expect;
    if (typeof expect === "object") return returned.kind === "err" && returned.refusal.classification === expect.refused && returned.refusal.executionId !== null;
    if (expect === "unnamed") return returned.kind === "err" && returned.refusal.executionId === null;
    return returned.kind === "ok";
  },
  referenceRefusal: (context: Context): boolean => {
    const returned = context.reference.returned;
    if (returned.kind !== "err") return false;
    const base = context.callback?.state ?? context.s0;
    return CHECKS.refusalPosition(returned.refusal, base) && CHECKS.refusalExecution(returned.refusal, context.executionId) &&
      decided({ returned, state: withRefusal(base, returned.refusal) }, context.reference);
  },
  referenceUnnamed: (context: Context): boolean => decided({ returned: { kind: "err", refusal: context.unnamedRefusal }, state: context.s0 }, context.reference),
  referenceUnchanged: (context: Context): boolean => isDeepStrictEqual(context.reference.state, context.s0),
  referenceReplay: (context: Context): boolean =>
    decided({ returned: { kind: "ok", value: { ...(context.setupAnswer as object), replayed: true } }, state: context.s0 }, context.reference),
  recoveryAnswer: (context: Context, decision: Observation, changed: boolean): boolean => {
    if (decision.returned.kind !== "ok") return false;
    const answer = decision.returned.value as { activationId: string; writerEpoch: number; recoveryHolds: unknown; changed: boolean };
    const state = decision.state;
    const before = context.s0;
    const activation = state.view.activation;
    if (activation === null || answer.changed !== changed) return false;
    if (answer.activationId !== activation.activationId || answer.writerEpoch !== activation.writerEpoch) return false;
    if (!isDeepStrictEqual(answer.recoveryHolds, state.view.recoveryHolds)) return false;
    // An idempotent answer's state is `referenceUnchanged`'s to check.
    if (!changed) return true;
    // A hold decision changes the holds and appends one history record; it consumes no position and leaves the attempt's grant usable.
    return !isDeepStrictEqual(state.view.recoveryHolds, before.view.recoveryHolds) &&
      isDeepStrictEqual(state.view.recoveryHistory.slice(0, -1), before.view.recoveryHistory) &&
      state.view.recoveryHistory.length === before.view.recoveryHistory.length + 1 &&
      isDeepStrictEqual(state.view.receipts, before.view.receipts) &&
      state.nextRefusal === before.nextRefusal && state.nextAcceptance === before.nextAcceptance && state.setupGrant === before.setupGrant;
  },
  takeoverAnswer: (context: Context, decision: Observation): boolean => {
    if (decision.returned.kind !== "ok") return false;
    const answer = decision.returned.value as { activationId: string; supersededEpoch: number; writerEpoch: number; baseProgressRevision: number; batch: unknown; receipt: { position: number } };
    const state = decision.state;
    const before = context.s0.view.activation;
    const after = state.view.activation;
    if (before === null || after === null || typeof context.s0.nextAcceptance !== "number") return false;
    return answer.activationId === before.activationId && answer.activationId === after.activationId &&
      answer.supersededEpoch === before.writerEpoch && answer.writerEpoch === before.writerEpoch + 1 && answer.writerEpoch === after.writerEpoch &&
      answer.baseProgressRevision === before.baseProgressRevision && answer.baseProgressRevision === after.baseProgressRevision &&
      isDeepStrictEqual([...(answer.batch as readonly string[])], [...after.batch]) && isDeepStrictEqual([...after.batch], [...before.batch]) &&
      state.view.receipts.length === context.s0.view.receipts.length + 1 &&
      isDeepStrictEqual(answer.receipt, state.view.receipts.at(-1)) && isDeepStrictEqual(answer.receipt, after.receipt) &&
      answer.receipt.position === context.s0.nextAcceptance && state.nextAcceptance === context.s0.nextAcceptance + 1 &&
      state.nextRefusal === context.s0.nextRefusal && state.setupGrant === "stale_exchange";
  },
  outcomeAnswer: (context: Context, decision: Observation): boolean => {
    if (decision.returned.kind !== "ok") return false;
    const answer = decision.returned.value as {
      receipt: { position: number };
      activationId: string;
      nextState: string;
      progressRevision: number;
      acknowledged: readonly string[];
      emissionIds: readonly string[];
      resultId: string | null;
      terminalDispositions: readonly string[];
      replayed: boolean;
    };
    const before = context.s0.view;
    const after = decision.state.view;
    const added = (list: readonly string[], base: readonly string[]): string[] => list.filter((id) => !base.includes(id));
    if (before.activation === null || typeof context.s0.nextAcceptance !== "number") return false;
    return answer.replayed === false && answer.activationId === before.activation.activationId &&
      after.receipts.length === before.receipts.length + 1 && isDeepStrictEqual(answer.receipt, after.receipts.at(-1)) &&
      answer.receipt.position === context.s0.nextAcceptance &&
      answer.nextState === after.state && answer.progressRevision === after.progressRevision && after.progressRevision === before.progressRevision + 1 &&
      isDeepStrictEqual([...answer.acknowledged], added(after.acknowledged, before.acknowledged)) &&
      isDeepStrictEqual([...answer.acknowledged], [...before.activation.batch]) &&
      isDeepStrictEqual([...answer.emissionIds], after.emissions.slice(before.emissions.length).map((emission) => emission.emissionId)) &&
      answer.resultId === (after.result === null ? null : after.result.resultId) &&
      isDeepStrictEqual([...answer.terminalDispositions], added(after.terminalDispositions, before.terminalDispositions)) &&
      after.activation === null && decision.state.nextRefusal === context.s0.nextRefusal &&
      decision.state.nextAcceptance === (after.state === "READY" ? context.s0.nextAcceptance + 1 : "terminal_destination") &&
      decision.state.setupGrant === "duplicate_conflict";
  },
  // Exits.
  declaredExit: (declared: readonly Exit[], executed: (exit: Exit) => boolean): boolean => declared.length === 1 && executed(declared[0] as Exit),
  attributed: (exit: Exit, run: ReferenceExits): boolean => exit.via === run.control && run.executed(exit.offset),
  exitReached: (takenBy: readonly string[]): boolean => takenBy.length > 0,
};

/** All four parts equal. */
function decided(expected: Observation, observed: Observation): boolean {
  return CHECKS.returned(expected, observed) && CHECKS.view(expected, observed) && CHECKS.nextRefusal(expected, observed) &&
    CHECKS.nextAcceptance(expected, observed) && CHECKS.setupGrant(expected, observed);
}

/** Which of the four parts differ, for a violation's detail. */
export function differing(expected: Observation, observed: Observation): string {
  const parts: string[] = [];
  if (!isDeepStrictEqual(expected.returned, observed.returned)) parts.push("returned value");
  if (!isDeepStrictEqual(expected.state.view, observed.state.view)) {
    const keys = Object.keys(expected.state.view).filter((key) => !isDeepStrictEqual((expected.state.view as unknown as Record<string, unknown>)[key], (observed.state.view as unknown as Record<string, unknown>)[key]));
    parts.push(`view (${keys.join(", ")})`);
  }
  if (expected.state.nextRefusal !== observed.state.nextRefusal) parts.push(`next refusal position (${observed.state.nextRefusal}, expected ${expected.state.nextRefusal})`);
  if (expected.state.nextAcceptance !== observed.state.nextAcceptance) parts.push(`next acceptance (${observed.state.nextAcceptance}, expected ${expected.state.nextAcceptance})`);
  if (expected.state.setupGrant !== observed.state.setupGrant) parts.push(`setup grant (${observed.state.setupGrant}, expected ${expected.state.setupGrant})`);
  return parts.length === 0 ? "none" : parts.join("; ");
}

// -- The declared Outcome apply sequence, as states ----------------------------------------------

/**
 * For each step of `OUTCOME_APPLY`, the states before each of its elements and after the last,
 * starting from the no-call state and taking each changed value from the reference state. A fault
 * at a step leaves the state before one of that step's elements (a list append or a disposition
 * install is all or nothing); plain writes call nothing and so cannot be where a fault lands.
 */
export function outcomeLadder(context: Context): { readonly step: OutcomeStep; readonly states: readonly State[] }[] {
  const s0 = context.s0;
  const s1 = context.reference.state;
  const ladder: { step: OutcomeStep; states: State[] }[] = [];
  let state = s0;
  const changedTo = (kind: string): number[] =>
    s1.view.mailbox.flatMap((entry, index) => (s0.view.mailbox[index]?.disposition.kind === "queued" && entry.disposition.kind === kind ? [index] : []));
  for (const [step] of OUTCOME_APPLY) {
    const elements: ((current: State) => State)[] = [];
    switch (step) {
      case "index":
        elements.push((current) => ({
          ...current,
          nextAcceptance: typeof current.nextAcceptance === "number" ? current.nextAcceptance + 1 : `unadvanceable (${current.nextAcceptance})`,
          setupGrant: shiftedGrant(current.setupGrant),
        }));
        break;
      case "acknowledge":
      case "end":
        for (const index of changedTo(step === "acknowledge" ? "acknowledged" : "terminal")) {
          elements.push((current) =>
            withMailbox(current, current.view.mailbox.map((entry, at) => (at === index ? { ...entry, disposition: (s1.view.mailbox[index] as (typeof s1.view.mailbox)[number]).disposition } : entry))),
          );
        }
        break;
      case "progress":
        elements.push((current) => withView(current, { acceptedProgress: s1.view.acceptedProgress }));
        break;
      case "progressRevision":
        elements.push((current) => withView(current, { progressRevision: s1.view.progressRevision }));
        break;
      case "emissions":
        for (let added = 1; added <= s1.view.emissions.length - s0.view.emissions.length; added += 1) {
          elements.push((current) => withView(current, { emissions: s1.view.emissions.slice(0, s0.view.emissions.length + added) }));
        }
        break;
      case "result":
        elements.push((current) => withView(current, { result: s1.view.result }));
        break;
      case "exchanges":
        elements.push((current) => withView(current, { exchanges: s1.view.exchanges.slice(0, s0.view.exchanges.length + 1) }));
        break;
      case "acceptedOutcomes":
        // From here a proposal for this Activation is a replay or a conflict, whatever else has landed.
        elements.push((current) => ({ ...current, setupGrant: s1.setupGrant }));
        break;
      case "receipts":
        elements.push((current) => withView(current, { receipts: s1.view.receipts.slice(0, s0.view.receipts.length + 1) }));
        break;
      case "history":
        for (let added = 1; added <= s1.view.recoveryHistory.length - s0.view.recoveryHistory.length; added += 1) {
          elements.push((current) => withView(current, { recoveryHistory: s1.view.recoveryHistory.slice(0, s0.view.recoveryHistory.length + added) }));
        }
        break;
      case "activation":
        elements.push((current) =>
          withView(current, {
            activation: s1.view.activation,
            recoveryHolds: s1.view.recoveryHolds,
            mailbox: current.view.mailbox.map((entry, index) => ({ ...entry, reserved: s1.view.mailbox[index]?.reserved ?? entry.reserved })),
          }),
        );
        break;
      case "state":
        elements.push((current) => ({ ...withView(current, { state: s1.view.state }), nextAcceptance: s1.nextAcceptance }));
        break;
    }
    const states: State[] = [state];
    for (const element of elements) {
      state = element(state);
      states.push(state);
    }
    ladder.push({ step, states });
  }
  return ladder;
}

// -- Classification -----------------------------------------------------------------------------

const pass = (kind: string): Verdict => ({ ok: true, kind });
const fail = (violation: string, detail = ""): Verdict => ({ ok: false, violation, detail });

/** The state a takeover leaves when its delivery fails at `site`, after the commit. */
const withDelivery = (context: Context, site: DeliverySite): State => {
  const s1 = context.reference.state;
  const activation = s1.view.activation;
  if (activation === null) return s1;
  const earlier = activation.deliveries.slice(0, -1);
  const own = activation.deliveries.at(-1);
  if (own === undefined) return s1;
  const deliveries =
    site === "absent" ? earlier : site === "pending" ? [...earlier, { ...own, status: "pending" as const, failure: null }] : [...earlier, { ...own, status: "failed" as const, failure: context.deliveryFailure }];
  return withView(s1, { activation: { ...activation, deliveries } });
};

/** A takeover that clears a hold, stopped between its two appends: the receipt and nothing else. */
const receiptOnly = (context: Context): State =>
  withView(context.s0, { receipts: context.reference.state.view.receipts.slice(0, context.s0.view.receipts.length + 1) });

/** Judges one run. The caller formats the location into the message. */
export function classify(context: Context, model: SourceModel, attempt: Attempt, ladder = outcomeLadder(context)): Verdict {
  const observed = attempt.observation;
  if (attempt.k > context.n) {
    if (!CHECKS.quietRepeat(attempt)) return fail("a fault fired past the reference count");
    return decided(context.reference, observed)
      ? pass("completed")
      : fail("the call without a fault reached a different decision than the reference run", differing(context.reference, observed));
  }
  if (!CHECKS.fired(attempt)) return fail(`the fault did not fire (the call made ${attempt.counted} operations)`);
  if (!CHECKS.sameOperation(attempt, context.labels[attempt.k - 1])) {
    return fail(`this run's operation ${attempt.k} was ${attempt.fault?.label}, not the reference run's ${context.labels[attempt.k - 1]}`);
  }
  const afterCallback = context.callback !== null && attempt.k > context.callback.at;
  if (context.callback !== null && !CHECKS.callbackRan(attempt, afterCallback)) {
    return fail(`the safety callback ${attempt.callbackRan ? "ran" : "did not run"}, unlike the reference run at this operation`);
  }
  const base = afterCallback && context.callback !== null ? context.callback.state : context.s0;
  const returned = observed.returned;

  if (returned.kind === "threw") {
    const noCall: Observation = { returned: threw(attempt.k), state: base };
    if (decided(noCall, observed)) return pass(afterCallback ? "threw after the safety callback: its decision only" : "threw: no-call state");
    if (CHECKS.acceptingExit(context, "requestTakeover")) {
      for (const site of ["absent", "pending"] as const) {
        if (CHECKS.deliveredAt(model, attempt.fault, site) && decided({ returned: threw(attempt.k), state: withDelivery(context, site) }, observed)) {
          return pass(`threw while delivering after the commit: delivery row ${site}`);
        }
      }
      if (CHECKS.takeoverWindowAt(model, attempt.fault) && decided({ returned: threw(attempt.k), state: receiptOnly(context) }, observed)) {
        return pass("threw inside the declared takeover apply window: receipt appended, clearing record not");
      }
    }
    if (CHECKS.acceptingExit(context, "submitOutcome") && CHECKS.applySequence(model)) {
      for (const { step, states } of ladder) {
        if (!CHECKS.outcomeStepAt(model, attempt.fault, step)) continue;
        const prefixes = states.slice(0, -1).map((state) => ({ returned: threw(attempt.k), state }));
        if (CHECKS.outcomePrefix(prefixes, observed)) return pass("threw inside the declared Outcome apply window: a permitted prefix");
      }
    }
    if (returned.operation !== attempt.k) return fail(`threw something other than the injected fault: ${returned.error ?? `fault ${returned.operation}`}`);
    return fail("threw and left a state no complete decision explains", differing(noCall, observed));
  }

  if (returned.kind === "err") {
    const refusal = returned.refusal;
    if (refusal.executionId === null) {
      const unnamed: Observation = { returned: { kind: "err", refusal: context.unnamedRefusal }, state: base };
      return decided(unnamed, observed)
        ? pass("refused without naming the Execution: nothing recorded")
        : fail("refused without naming the Execution and left a state other than the no-call state", differing(unnamed, observed));
    }
    const recorded: Observation = { returned, state: withRefusal(base, refusal) };
    if (CHECKS.refusalPosition(refusal, base) && CHECKS.refusalExecution(refusal, context.executionId) && decided(recorded, observed)) {
      return pass(afterCallback ? "refused after the safety callback: its decision and exactly one refusal" : "refused: exactly one refusal recorded");
    }
    return fail(
      "refused and left a state other than the no-call state plus that refusal",
      `refusal position ${refusal.position} (expected ${base.nextRefusal}), Execution ${String(refusal.executionId)}; ${differing(recorded, observed)}`,
    );
  }

  if (decided(context.reference, observed)) return pass("accepted after a contained fault: the uninjected decision");
  if (context.alternate !== null && decided(context.alternate, observed)) return pass("accepted after a contained fault: the declared alternate");
  if (CHECKS.acceptingExit(context, "requestTakeover") && CHECKS.deliveredAt(model, attempt.fault, "failed") && decided({ returned: context.reference.returned, state: withDelivery(context, "failed") }, observed)) {
    return pass("accepted; the Driver's delivery failed after the commit");
  }
  return fail("accepted with an answer or state other than the uninjected decision or the declared alternate", differing(context.reference, observed));
}

/** Checks the reference decision itself, once per scenario. Returns violations. */
export function checkContext(context: Context, model: SourceModel): string[] {
  const violations: string[] = [];
  const expect = context.expect;
  if (!CHECKS.referenceKind(context)) {
    violations.push(`the uninjected call did not take its declared exit (${typeof expect === "object" ? `refused ${expect.refused}` : expect}): ${JSON.stringify(context.reference.returned).slice(0, 300)}`);
    return violations;
  }
  if (typeof expect === "object" && !CHECKS.referenceRefusal(context)) violations.push("the uninjected refusal left a state other than the no-call baseline plus exactly that refusal");
  if (expect === "unnamed" && !CHECKS.referenceUnnamed(context)) violations.push("the uninjected refusal naming no Execution changed the Execution or returned another refusal");
  if (expect === "unchanged" && !(CHECKS.referenceUnchanged(context) && CHECKS.recoveryAnswer(context, context.reference, false))) {
    violations.push("the uninjected idempotent answer changed the state or disagrees with it");
  }
  if (expect === "replayed" && !CHECKS.referenceReplay(context)) violations.push("the uninjected exact replay changed the state or did not return the accepted decision");
  if (expect === "accepted") {
    const decisions = context.alternate === null ? [context.reference] : [context.reference, context.alternate];
    for (const decision of decisions) {
      const which = decision === context.reference ? "uninjected" : "alternate";
      if (context.control === "recoverExecution" || context.control === "reportProtocolFailure") {
        if (!CHECKS.recoveryAnswer(context, decision, true)) violations.push(`the ${which} recovery answer disagrees with the state it left`);
      } else if (context.control === "requestTakeover") {
        if (!CHECKS.takeoverAnswer(context, decision)) violations.push(`the ${which} takeover answer disagrees with the state it left`);
      } else if (!CHECKS.outcomeAnswer(context, decision)) violations.push(`the ${which} Outcome answer disagrees with the state it left`);
    }
    if (context.control === "submitOutcome") {
      if (!CHECKS.applySequence(model)) violations.push(`the declared apply sequences do not match coordinator.ts: ${model.problems.join("; ")}`);
      const whole = outcomeLadder(context).at(-1)?.states.at(-1) ?? context.s0;
      if (!CHECKS.applyModel(context, whole)) {
        violations.push(`the declared Outcome apply sequence does not reproduce the uninjected decision: ${differing(context.reference, { returned: context.reference.returned, state: whole })}`);
      }
    }
    if (context.control === "requestTakeover" && !CHECKS.applySequence(model)) violations.push(`the declared apply sequences do not match coordinator.ts: ${model.problems.join("; ")}`);
  }
  return violations;
}

// -- Exit inventory -----------------------------------------------------------------------------

export interface ReferenceExits {
  readonly name: string;
  readonly control: Control;
  readonly exit: readonly [method: string, snippet: string];
  /** Whether the reference run executed the return at this source offset (the scenario's own call only). */
  readonly executed: (offset: number) => boolean;
}

export interface Inventory {
  readonly exits: readonly { readonly id: string; readonly text: string; readonly takenBy: readonly string[] }[];
  readonly scenarios: readonly { readonly name: string; readonly declared: string | null }[];
  readonly violations: readonly string[];
}

export function exitInventory(model: SourceModel, runs: readonly ReferenceExits[]): Inventory {
  const violations: string[] = [];
  const scenarios: { name: string; declared: string | null }[] = [];
  for (const run of runs) {
    const [method, snippet] = run.exit;
    const declared = model.exits.filter((exit) => exit.via === run.control && exit.method === method && exit.text.includes(collapse(snippet)));
    const exit = declared.length === 1 ? (declared[0] as Exit) : null;
    scenarios.push({ name: run.name, declared: exit === null ? null : exit.id });
    if (!CHECKS.declaredExit(declared, (candidate) => run.executed(candidate.offset))) {
      violations.push(
        declared.length !== 1
          ? `${run.name}: its declared exit (${method}: "${snippet}") matches ${declared.length} returns`
          : `${run.name}: the uninjected call did not execute its declared exit ${exit?.id}`,
      );
    }
  }
  const exits = model.exits.map((exit) => {
    const takenBy = runs.filter((run) => CHECKS.attributed(exit, run)).map((run) => run.name);
    if (!CHECKS.exitReached(takenBy)) violations.push(`no scenario's uninjected call takes ${exit.id}: ${exit.text.slice(0, 160)}`);
    return { id: exit.id, text: exit.text, takenBy };
  });
  for (const problem of model.problems) violations.push(`source model: ${problem}`);
  return { exits, scenarios, violations };
}

/** Whether the innermost V8 block-coverage range around `offset` executed. */
export const coverageExecuted = (ranges: readonly { readonly startOffset: number; readonly endOffset: number; readonly count: number }[]) => (offset: number): boolean => {
  let best: { startOffset: number; endOffset: number; count: number } | undefined;
  for (const range of ranges) {
    if (range.startOffset <= offset && offset < range.endOffset && (best === undefined || range.endOffset - range.startOffset <= best.endOffset - best.startOffset)) best = range;
  }
  return best !== undefined && best.count > 0;
};
